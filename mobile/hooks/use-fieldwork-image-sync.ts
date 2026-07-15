import {
  Document,
  ImageVariant,
  SyncStatus,
  base64Encode,
  buildFieldHubFileUrlWithType,
  getFieldHubBaseUrl as getCoreFieldHubBaseUrl,
} from 'idai-field-core';
import * as FileSystem from 'expo-file-system';
import { useEffect, useRef } from 'react';
import { ProjectSettings } from '@/models/preferences';
import type { DocumentRepository } from '@/repositories/document-repository';

export interface FieldworkImageSyncTarget {
  resourceId: string;
  category: string;
  uri: string;
}

interface UseFieldworkImageSyncConfig {
  documents: Document[];
  getUploadedAt?: () => string;
  project: string;
  projectSettings?: ProjectSettings;
  repository?: Pick<DocumentRepository, 'get'|'update'>;
  retryDelayMs?: number;
  syncStatus?: SyncStatus;
}

interface FieldworkImageSyncConnection {
  password: string;
  url: string;
}

export interface FieldworkImageSyncItem extends FieldworkImageSyncTarget {
  document: Document;
  uploadUrl: string;
}

export interface FieldworkImageUploadResult {
  uploadedSizeBytes?: number;
  uploadedMd5?: string;
  storedSizeBytes?: number;
  storedMd5?: string;
  storedSha256?: string;
}

const DIRECT_FIELDWORK_PHOTO_URI_FIELDS = ['fieldworkPhotoUri', 'imageUri', 'fileUri'];
const DIRECT_FIELDWORK_PHOTO_CATEGORIES = [
  'DailyLog',
  'Feature',
  'FeatureSegment',
  'FieldRecordQualityReview',
  'Find',
  'FindCollection',
  'Layer',
  'Operation',
  'Sample',
  'Survey',
  'SurveyBoundary',
  'Trench',
];

const SYNCABLE_PHOTO_URI_FIELDS: Record<string, string[]> = {
  Image: ['imageUri', 'fieldworkPhotoUri', 'fileUri'],
  Photo: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
  Drawing: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
  SoilProfilePhoto: ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri'],
  ...Object.fromEntries(
    DIRECT_FIELDWORK_PHOTO_CATEGORIES.map((category) => [
      category,
      DIRECT_FIELDWORK_PHOTO_URI_FIELDS,
    ])
  ),
};

const SYNC_READY_STATUSES = new Set<SyncStatus>([
  SyncStatus.Connecting,
  SyncStatus.InSync,
  SyncStatus.Pulling,
  SyncStatus.Pushing,
]);
const DEFAULT_RETRY_DELAY_MS = 30000;
const defaultGetUploadedAt = (): string => new Date().toISOString();
const FIELDWORK_IMAGE_UPLOAD_STATUS_UPLOADED = 'uploaded';

const useFieldworkImageSync = ({
  documents,
  getUploadedAt = defaultGetUploadedAt,
  project,
  projectSettings,
  repository,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  syncStatus,
}: UseFieldworkImageSyncConfig): void => {
  const uploadedResults = useRef<Map<string, FieldworkImageUploadResult>>(new Map());
  const inFlight = useRef(false);
  const pendingRun = useRef<(() => void) | undefined>();
  const isMounted = useRef(true);
  const projectConnected = projectSettings?.connected;
  const projectPassword = projectSettings?.password;
  const projectUrl = projectSettings?.url;

  useEffect(() => () => {
    isMounted.current = false;
    pendingRun.current = undefined;
  }, []);

  useEffect(() => {
    if (
      !project
      || !projectConnected
      || !projectUrl
      || !projectPassword
      || !syncStatus
      || !SYNC_READY_STATUSES.has(syncStatus)
    ) {
      return;
    }

    let isCancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (inFlight.current) {
        pendingRun.current = () => {
          void run();
        };
        return;
      }

      inFlight.current = true;
      let pendingUploads = 0;
      let pendingUploadRecords = 0;
      try {
        for (const target of collectFieldworkImageSyncItems(
          documents,
          project,
          projectUrl
        )) {
          if (isCancelled) return;

          const key = getFieldworkImageSyncKey(
            project,
            projectUrl,
            target
          );
          let currentUploadMetadata: FieldworkImageUploadResult | undefined;
          if (target.uri.startsWith('file://')) {
            try {
              currentUploadMetadata = await getFieldworkImageUploadMetadata(target);
            } catch (error) {
              console.error(
                `Failed to inspect fieldwork image ${target.resourceId}:`,
                getFieldworkImageUploadErrorMessage(error, projectPassword)
              );
              continue;
            }
          }
          const uploadAuditRecorded = isFieldworkImageUploadAuditRecorded(
            target.document,
            project,
            target
          );
          const uploadAuditMetadataMismatched = isLocalUploadMetadataMismatched(
            target.document,
            currentUploadMetadata
          );
          if (uploadAuditMetadataMismatched) uploadedResults.current.delete(key);

          if (isFieldworkImageUploadRecordComplete(
            target.document,
            project,
            target,
            currentUploadMetadata
          )) {
            continue;
          }

          if (
            (
              !uploadAuditRecorded
              || uploadAuditMetadataMismatched
              || isServerUploadMetadataMissingOrMismatched(
                target.document,
                target,
                currentUploadMetadata
              )
            )
            && !uploadedResults.current.has(key)
          ) {
            pendingUploads += 1;
            try {
              const uploadResult = await uploadFieldworkImage({
                project,
                projectSettings: {
                  password: projectPassword,
                  url: projectUrl,
                },
                target,
              });
              if (isMounted.current) uploadedResults.current.set(key, uploadResult);
              pendingUploads -= 1;
            } catch (error) {
              console.error(
                `Failed to upload fieldwork image ${target.resourceId}:`,
                getFieldworkImageUploadErrorMessage(error, projectPassword)
              );
              continue;
            }
          }

          if (
            uploadAuditRecorded
            && repository
            && !uploadedResults.current.has(key)
            && isFileUploadMetadataMissing(target.document, target)
          ) {
            try {
              const uploadMetadata = await getFieldworkImageUploadMetadata(target);
              if (isMounted.current) uploadedResults.current.set(key, uploadMetadata);
            } catch (error) {
              console.error(
                `Failed to inspect fieldwork image ${target.resourceId}:`,
                getFieldworkImageUploadErrorMessage(error, projectPassword)
              );
              continue;
            }
          }

          if (repository) {
            pendingUploadRecords += 1;
            try {
              await recordFieldworkImageUpload({
                getUploadedAt,
                project,
                repository,
                target: {
                  ...target,
                  ...uploadedResults.current.get(key),
                },
              });
              pendingUploadRecords -= 1;
            } catch (error) {
              console.error(
                `Failed to record fieldwork image upload ${target.resourceId}:`,
                getFieldworkImageUploadErrorMessage(error, projectPassword)
              );
            }
          }
        }
      } finally {
        inFlight.current = false;
        const runAgain = pendingRun.current;
        if (runAgain && isMounted.current) {
          pendingRun.current = undefined;
          runAgain();
          return;
        }

        if (!isCancelled && isMounted.current && (pendingUploads > 0 || pendingUploadRecords > 0)) {
          retryTimeout = setTimeout(() => {
            void run();
          }, retryDelayMs);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [
    documents,
    getUploadedAt,
    project,
    projectConnected,
    projectPassword,
    projectUrl,
    repository,
    retryDelayMs,
    syncStatus,
  ]);
};

export const collectFieldworkImageSyncTargets = (
  documents: Document[]
): FieldworkImageSyncTarget[] =>
  documents
    .map(getFieldworkImageSyncTarget)
    .filter((target): target is FieldworkImageSyncTarget => target !== undefined);

export const recordFieldworkImageUpload = async ({
  getUploadedAt,
  project,
  repository,
  target,
}: {
  getUploadedAt: () => string;
  project: string;
  repository: Pick<DocumentRepository, 'get'|'update'>;
  target: FieldworkImageSyncItem & FieldworkImageUploadResult;
}): Promise<Document> => {
  const latestDocument = await repository.get(target.resourceId);
  if (!isLatestDocumentStillMatchingUploadTarget(latestDocument, target)) {
    return latestDocument;
  }

  if (isFieldworkImageUploadRecordComplete(
    latestDocument,
    project,
    target,
    target
  )) {
    return latestDocument;
  }

  const updates = getFieldworkImageUploadRecordUpdates(
    latestDocument,
    project,
    target,
    getUploadedAt()
  );

  return repository.update({
    ...latestDocument,
    resource: {
      ...latestDocument.resource,
      ...updates,
    },
  });
};

export const getFieldworkImageUploadRecordUpdates = (
  document: Document,
  project: string,
  target: Pick<FieldworkImageSyncItem & FieldworkImageUploadResult,
    'category'|'uri'|'uploadUrl'|'uploadedSizeBytes'|'uploadedMd5'
    |'storedSizeBytes'|'storedMd5'|'storedSha256'>,
  uploadedAt: string
): Record<string, unknown> => {
  const resource = document.resource as Record<string, unknown>;
  const hasFreshServerStoredResult = typeof target.storedSizeBytes === 'number'
    || !!target.storedMd5
    || !!target.storedSha256;
  const existingUploadedAt = isFieldworkImageUploadAuditRecorded(document, project, target)
    && !hasFreshServerStoredResult
    ? getStringValue(resource.fieldworkImageUploadedAt)
    : undefined;
  const uploadResult: FieldworkImageUploadResult = {
    uploadedSizeBytes: target.uploadedSizeBytes ?? getNumberValue(resource.fieldworkImageUploadedSizeBytes),
    uploadedMd5: target.uploadedMd5 ?? getStringValue(resource.fieldworkImageUploadedMd5),
    storedSizeBytes: target.storedSizeBytes ?? getNumberValue(resource.fieldworkImageStoredSizeBytes),
    storedMd5: target.storedMd5 ?? getStringValue(resource.fieldworkImageStoredMd5),
    storedSha256: target.storedSha256 ?? getStringValue(resource.fieldworkImageStoredSha256),
  };

  return {
    digitalSourcePreservation: mergeDigitalSourcePreservationUploadValues(
      resource.digitalSourcePreservation,
      target.category,
      uploadResult
    ),
    fieldworkImageUploadStatus: FIELDWORK_IMAGE_UPLOAD_STATUS_UPLOADED,
    fieldworkImageUploadedAt: existingUploadedAt ?? uploadedAt,
    fieldworkImageUploadedUri: target.uri,
    fieldworkImageUploadTarget: target.uploadUrl,
    fieldworkImageUploadedProject: project,
    ...(typeof target.uploadedSizeBytes === 'number'
      ? { fieldworkImageUploadedSizeBytes: target.uploadedSizeBytes }
      : {}),
    ...(target.uploadedMd5 ? { fieldworkImageUploadedMd5: target.uploadedMd5 } : {}),
    ...(typeof target.storedSizeBytes === 'number'
      ? { fieldworkImageStoredSizeBytes: target.storedSizeBytes }
      : {}),
    ...(target.storedMd5 ? { fieldworkImageStoredMd5: target.storedMd5 } : {}),
    ...(target.storedSha256 ? { fieldworkImageStoredSha256: target.storedSha256 } : {}),
  };
};

export const uploadFieldworkImage = async ({
  project,
  projectSettings,
  target,
}: {
  project: string;
  projectSettings: FieldworkImageSyncConnection;
  target: FieldworkImageSyncTarget;
}): Promise<FieldworkImageUploadResult> => {
  const uploadMetadata = await getFieldworkImageUploadMetadata(target);

  const result = await FileSystem.uploadAsync(
    buildFieldworkImageUploadUrl(projectSettings.url, project, target.resourceId),
    target.uri,
    {
      headers: {
        Authorization: `Basic ${base64Encode(project + ':' + projectSettings.password)}`,
        'Content-Type': 'application/octet-stream',
      },
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Fieldwork image upload failed with HTTP ${result.status}`);
  }

  return {
    ...uploadMetadata,
    ...getFieldworkImageStoredMetadata((result as { body?: unknown }).body),
  };
};

export const getFieldworkImageUploadMetadata = async (
  target: Pick<FieldworkImageSyncTarget, 'uri'>
): Promise<FieldworkImageUploadResult> => {
  if (!target.uri.startsWith('file://')) return {};

  const fileInfo = await FileSystem.getInfoAsync(target.uri, { md5: true });
  if (!fileInfo.exists || fileInfo.isDirectory) {
    throw new Error(`Local image file is not available: ${target.uri}`);
  }

  return {
    uploadedSizeBytes: typeof fileInfo.size === 'number'
      ? fileInfo.size
      : undefined,
    uploadedMd5: getStringValue(fileInfo.md5),
  };
};

export const getFieldworkImageStoredMetadata = (
  responseBody: unknown
): FieldworkImageUploadResult => {
  const parsedResponseBody = getParsedFieldworkImageUploadResponseBody(responseBody);
  if (!parsedResponseBody) return {};

  return {
    storedSizeBytes: getNumberValue(parsedResponseBody.size_bytes),
    storedMd5: getStringValue(parsedResponseBody.md5),
    storedSha256: getStringValue(parsedResponseBody.sha256),
  };
};

export const buildFieldworkImageUploadUrl = (
  syncUrl: string,
  project: string,
  resourceId: string
): string =>
  buildFieldHubFileUrlWithType(syncUrl, project, resourceId, ImageVariant.ORIGINAL);

export const getFieldworkImageUploadErrorMessage = (
  error: unknown,
  secret?: string
): string => {
  const parts: string[] = [];

  if (error instanceof Error) {
    parts.push(error.message);
  } else if (typeof error === 'string') {
    parts.push(error);
  } else {
    const message = getErrorProperty(error, 'message');
    if (typeof message === 'string') parts.push(message);
  }

  const status = getErrorProperty(error, 'status');
  if (typeof status === 'number' || typeof status === 'string') {
    parts.push(`status ${status}`);
  }

  const code = getErrorProperty(error, 'code');
  if (typeof code === 'number' || typeof code === 'string') {
    parts.push(`code ${code}`);
  }

  return redactSensitiveLogText(
    parts.length > 0 ? parts.join(' ') : 'Unknown upload error',
    secret ? [secret] : []
  );
};

export const getFieldHubBaseUrl = (syncUrl: string, project: string): string =>
  getCoreFieldHubBaseUrl(syncUrl, project);

const getFieldworkImageSyncTarget = (
  document: Document
): FieldworkImageSyncTarget | undefined => {
  const resource = document.resource as Record<string, unknown>;
  const category = getStringValue(resource.category);
  const resourceId = getStringValue(resource.id);
  const uriFields = category ? SYNCABLE_PHOTO_URI_FIELDS[category] : undefined;

  if (!category || !resourceId || !uriFields) return undefined;

  const uri = uriFields
    .map((fieldName) => getStringValue(resource[fieldName]))
    .find(isUploadableLocalUri);

  return uri
    ? { category, resourceId, uri }
    : undefined;
};

const collectFieldworkImageSyncItems = (
  documents: Document[],
  project: string,
  syncUrl: string
): FieldworkImageSyncItem[] =>
  documents.flatMap((document) => {
    const target = getFieldworkImageSyncTarget(document);
    if (!target) return [];

    return [{
      ...target,
      document,
      uploadUrl: buildFieldworkImageUploadUrl(
        syncUrl,
        project,
        target.resourceId
      ),
    }];
  });

const isFieldworkImageUploadRecordComplete = (
  document: Document,
  project: string,
  target: Pick<FieldworkImageSyncItem, 'category'|'uri'|'uploadUrl'>,
  currentUploadMetadata?: FieldworkImageUploadResult
): boolean =>
  isFieldworkImageUploadAuditRecorded(document, project, target)
    && hasUploadTimestamp(document)
    && hasCompleteUploadChecksumMetadata(document, target, currentUploadMetadata)
    && hasCompleteUploadSizeMetadata(document, target, currentUploadMetadata)
    && hasCompleteServerStoredMetadata(document, target)
    && hasDigitalSourcePreservationUploadValues(
      document,
      target.category,
      getDocumentUploadResult(document)
    );

const isFieldworkImageUploadAuditRecorded = (
  document: Document,
  project: string,
  target: Pick<FieldworkImageSyncItem, 'uri'|'uploadUrl'>
): boolean => {
  const resource = document.resource as Record<string, unknown>;

  return resource.fieldworkImageUploadStatus === FIELDWORK_IMAGE_UPLOAD_STATUS_UPLOADED
    && resource.fieldworkImageUploadedUri === target.uri
    && resource.fieldworkImageUploadTarget === target.uploadUrl
    && resource.fieldworkImageUploadedProject === project;
};

const isLatestDocumentStillMatchingUploadTarget = (
  document: Document,
  target: Pick<FieldworkImageSyncItem, 'category'|'resourceId'|'uri'>
): boolean => {
  const latestTarget = getFieldworkImageSyncTarget(document);

  return latestTarget?.category === target.category
    && latestTarget.resourceId === target.resourceId
    && latestTarget.uri === target.uri;
};

const hasUploadTimestamp = (document: Document): boolean =>
  !!getStringValue((document.resource as Record<string, unknown>).fieldworkImageUploadedAt);

const hasCompleteUploadChecksumMetadata = (
  document: Document,
  target: Pick<FieldworkImageSyncItem, 'uri'>,
  currentUploadMetadata?: FieldworkImageUploadResult
): boolean => !target.uri.startsWith('file://')
  || (
    !!getStringValue((document.resource as Record<string, unknown>).fieldworkImageUploadedMd5)
    && (!currentUploadMetadata?.uploadedMd5 || !isLocalUploadMetadataMismatched(document, currentUploadMetadata))
  );

const hasCompleteUploadSizeMetadata = (
  document: Document,
  target: Pick<FieldworkImageSyncItem, 'uri'>,
  currentUploadMetadata?: FieldworkImageUploadResult
): boolean => !target.uri.startsWith('file://')
  || (
    getNumberValue((document.resource as Record<string, unknown>).fieldworkImageUploadedSizeBytes) !== undefined
    && (!currentUploadMetadata || !isLocalUploadMetadataMismatched(document, currentUploadMetadata))
  );

const isFileUploadMetadataMissing = (
  document: Document,
  target: Pick<FieldworkImageSyncItem, 'uri'>
): boolean => target.uri.startsWith('file://')
  && (
    !getStringValue((document.resource as Record<string, unknown>).fieldworkImageUploadedMd5)
    || getNumberValue((document.resource as Record<string, unknown>).fieldworkImageUploadedSizeBytes) === undefined
  );

const hasCompleteServerStoredMetadata = (
  document: Document,
  target?: Pick<FieldworkImageSyncItem, 'uri'>
): boolean => hasServerStoredMetadata(document)
    && (!target?.uri.startsWith('file://')
      || isFieldworkImageBackupVerified(getDocumentUploadResult(document)));

const hasServerStoredMetadata = (document: Document): boolean => {
  const resource = document.resource as Record<string, unknown>;

  return getNumberValue(resource.fieldworkImageStoredSizeBytes) !== undefined
    && !!getStringValue(resource.fieldworkImageStoredMd5)
    && !!getStringValue(resource.fieldworkImageStoredSha256);
};

const isServerUploadMetadataMissingOrMismatched = (
  document: Document,
  target: Pick<FieldworkImageSyncItem, 'uri'>,
  currentUploadMetadata?: FieldworkImageUploadResult
): boolean => {
  if (!hasServerStoredMetadata(document)) return true;

  const storedResult = getDocumentUploadResult(document);
  if (!target.uri.startsWith('file://')) return false;

  return !isFieldworkImageBackupVerified({
    ...storedResult,
    ...currentUploadMetadata,
  });
};

const getFieldworkImageSyncKey = (
  project: string,
  syncUrl: string,
  target: FieldworkImageSyncTarget
): string =>
  [
    getFieldHubBaseUrl(syncUrl, project),
    project,
    target.resourceId,
    target.uri,
  ].join('\u001f');

const getStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const getNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
};

const getParsedFieldworkImageUploadResponseBody = (
  responseBody: unknown
): Record<string, unknown> | undefined => {
  if (!responseBody) return undefined;

  if (typeof responseBody === 'object') {
    return responseBody as Record<string, unknown>;
  }

  if (typeof responseBody !== 'string' || responseBody.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(responseBody);

    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
};

const getDigitalSourcePreservationUploadValues = (
  category: string,
  target?: FieldworkImageUploadResult
): string[] => {
  const values = category === 'Drawing'
    ? ['originalDrawing', 'webOrServerBackup']
    : ['originalPhoto', 'originalImage', 'webOrServerBackup'];

  return isFieldworkImageBackupVerified(target)
    ? [...values, 'backupVerified']
    : values;
};

const isFieldworkImageBackupVerified = (
  target?: FieldworkImageUploadResult
): boolean => {
  const uploadedMd5 = target?.uploadedMd5?.toLowerCase();
  const storedMd5 = target?.storedMd5?.toLowerCase();

  if (
    !uploadedMd5
    || !storedMd5
    || uploadedMd5 !== storedMd5
    || typeof target?.uploadedSizeBytes !== 'number'
    || typeof target?.storedSizeBytes !== 'number'
  ) {
    return false;
  }

  return target.uploadedSizeBytes === target.storedSizeBytes;
};

const getDocumentUploadResult = (document: Document): FieldworkImageUploadResult => {
  const resource = document.resource as Record<string, unknown>;

  return {
    uploadedSizeBytes: getNumberValue(resource.fieldworkImageUploadedSizeBytes),
    uploadedMd5: getStringValue(resource.fieldworkImageUploadedMd5),
    storedSizeBytes: getNumberValue(resource.fieldworkImageStoredSizeBytes),
    storedMd5: getStringValue(resource.fieldworkImageStoredMd5),
    storedSha256: getStringValue(resource.fieldworkImageStoredSha256),
  };
};

const isLocalUploadMetadataMismatched = (
  document: Document,
  currentUploadMetadata: FieldworkImageUploadResult | undefined
): boolean => {
  if (!currentUploadMetadata) return false;

  const resource = document.resource as Record<string, unknown>;
  const recordedMd5 = getStringValue(resource.fieldworkImageUploadedMd5)
    ?? getStringValue(resource.fieldworkImageStoredMd5);
  const recordedSize = getNumberValue(resource.fieldworkImageUploadedSizeBytes)
    ?? getNumberValue(resource.fieldworkImageStoredSizeBytes);

  return (
    !!currentUploadMetadata.uploadedMd5
    && !!recordedMd5
    && currentUploadMetadata.uploadedMd5.toLowerCase() !== recordedMd5.toLowerCase()
  ) || (
    typeof currentUploadMetadata.uploadedSizeBytes === 'number'
    && recordedSize !== undefined
    && currentUploadMetadata.uploadedSizeBytes !== recordedSize
  );
};

const hasDigitalSourcePreservationUploadValues = (
  document: Document,
  category: string,
  target?: FieldworkImageUploadResult
): boolean => {
  const value = (document.resource as Record<string, unknown>).digitalSourcePreservation;
  if (!Array.isArray(value)) return false;

  return getDigitalSourcePreservationUploadValues(category, target)
    .every((requiredValue) => value.includes(requiredValue));
};

const mergeDigitalSourcePreservationUploadValues = (
  existingValue: unknown,
  category: string,
  uploadResult: FieldworkImageUploadResult
): string[] => {
  const existingValues = Array.isArray(existingValue)
    ? existingValue.filter((value): value is string => typeof value === 'string')
    : [];
  const retainedValues = isFieldworkImageBackupVerified(uploadResult)
    ? existingValues
    : existingValues.filter((value) => value !== 'backupVerified');

  return Array.from(new Set([
    ...retainedValues,
    ...getDigitalSourcePreservationUploadValues(category, uploadResult),
  ]));
};

const isUploadableLocalUri = (uri: string | undefined): uri is string =>
  !!uri && /^(file|content):\/\//.test(uri);

const getErrorProperty = (
  value: unknown,
  key: string
): unknown =>
  value && typeof value === 'object' && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;

const redactSensitiveLogText = (
  value: string,
  secrets: string[] = []
): string => {
  let result = value
    .replace(/Basic\s+[A-Za-z0-9+/=._~-]+/gi, 'Basic [redacted]')
    .replace(/(Authorization["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, '$1[redacted]')
    .replace(/(password["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, '$1[redacted]');

  for (const secret of secrets) {
    if (secret) result = result.split(secret).join('[redacted]');
  }

  return result;
};

export default useFieldworkImageSync;
