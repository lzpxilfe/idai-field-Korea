import {
  Document,
  ImageVariant,
  base64Encode,
  buildFieldHubFileUrlWithType,
} from 'idai-field-core';
import * as FileSystem from 'expo-file-system';
import { useEffect, useState } from 'react';
import type { ProjectSettings } from '@/models/preferences';

const AERIAL_MAP_LAYER_CATEGORY = 'AerialMapLayer';
const CACHE_DIRECTORY_NAME = 'fieldwork-map-layers';
const DEFAULT_IMAGE_EXTENSION = '.jpg';

const layerDownloadsInFlight = new Map<string, Promise<string | undefined>>();

const LOCAL_LAYER_URI_FIELDS = [
  'aerialLayerImageUri',
  'displayImageUri',
  'imageUri',
  'localImageUri',
  'fileUri',
  'uri',
];

interface UseFieldworkMapLayerImagesConfig {
  documents: Document[];
  project: string;
  projectSettings?: Pick<ProjectSettings, 'connected'|'password'|'url'>;
}

interface FieldworkMapLayerConnection {
  password: string;
  url: string;
}

export interface FieldworkMapLayerCacheDescriptor {
  directoryUri: string;
  fileName: string;
  fileUri: string;
  resourcePrefix: string;
}

const useFieldworkMapLayerImages = ({
  documents,
  project,
  projectSettings,
}: UseFieldworkMapLayerImagesConfig): Document[] => {
  const inputFingerprint = getLayerDocumentsFingerprint(project, documents);
  const [hydratedState, setHydratedState] = useState<{
    documents: Document[];
    fingerprint: string;
  }>({ documents, fingerprint: inputFingerprint });
  const connected = projectSettings?.connected;
  const password = projectSettings?.password;
  const url = projectSettings?.url;

  useEffect(() => {
    let isCancelled = false;
    setHydratedState({ documents, fingerprint: inputFingerprint });

    const connection = connected && password && url
      ? { password, url }
      : undefined;

    void hydrateFieldworkMapLayerImages({
      connection,
      documents,
      project,
    }).then((nextDocuments) => {
      if (!isCancelled) {
        setHydratedState({
          documents: nextDocuments,
          fingerprint: inputFingerprint,
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [connected, documents, inputFingerprint, password, project, url]);

  return hydratedState.fingerprint === inputFingerprint
    ? hydratedState.documents
    : documents;
};

export const hydrateFieldworkMapLayerImages = async ({
  cacheDirectory = FileSystem.documentDirectory,
  connection,
  documents,
  project,
}: {
  cacheDirectory?: string | null;
  connection?: FieldworkMapLayerConnection;
  documents: Document[];
  project: string;
}): Promise<Document[]> => {
  if (!project || !cacheDirectory || documents.length === 0) return documents;

  const hydratedDocuments: Document[] = [];
  for (const document of documents) {
    hydratedDocuments.push(await hydrateFieldworkMapLayerImage({
      cacheDirectory,
      connection,
      document,
      project,
    }));
  }

  return hydratedDocuments;
};

export const hydrateFieldworkMapLayerImage = async ({
  cacheDirectory = FileSystem.documentDirectory,
  connection,
  document,
  project,
}: {
  cacheDirectory?: string | null;
  connection?: FieldworkMapLayerConnection;
  document: Document;
  project: string;
}): Promise<Document> => {
  if (
    document.resource.category !== AERIAL_MAP_LAYER_CATEGORY
    || !document.resource.id
    || !project
    || !cacheDirectory
  ) {
    return document;
  }

  const descriptor = getFieldworkMapLayerCacheDescriptor(
    document,
    project,
    cacheDirectory
  );
  const expectedMd5 = getExpectedLayerMd5(document);

  try {
    await FileSystem.makeDirectoryAsync(descriptor.directoryUri, {
      intermediates: true,
    });
  } catch {
    return document;
  }

  const deviceLocalImage = await getDeviceLocalLayerImage(
    document,
    expectedMd5
  );
  if (
    deviceLocalImage
    && shouldPreferDeviceLocalLayerImage(
      document,
      deviceLocalImage,
      expectedMd5
    )
  ) {
    return document;
  }

  if (await isUsableCachedFile(descriptor.fileUri, expectedMd5)) {
    return withLocalLayerImage(document, descriptor.fileUri);
  }

  await removeFileIfPresent(descriptor.fileUri);

  if (connection) {
    const downloadedUri = await downloadFieldworkMapLayerImageOnce({
      connection,
      descriptor,
      document,
      expectedMd5,
      project,
    });
    if (downloadedUri) return withLocalLayerImage(document, downloadedUri);
  }

  const fallbackUri = await findMostRecentCachedLayerImage(descriptor);
  if (fallbackUri) return withLocalLayerImage(document, fallbackUri);

  return document;
};

export const getFieldworkMapLayerCacheDescriptor = (
  document: Document,
  project: string,
  cacheDirectory: string
): FieldworkMapLayerCacheDescriptor => {
  const directoryUri = appendUriPath(
    cacheDirectory,
    CACHE_DIRECTORY_NAME,
    getSafeCacheSegment(project)
  );
  const resourcePrefix = `${getSafeCacheSegment(document.resource.id)}--`;
  const versionToken = getStableHash(getLayerCacheVersion(document));
  const fileName = `${resourcePrefix}${versionToken}${getLayerImageExtension(document)}`;

  return {
    directoryUri,
    fileName,
    fileUri: `${directoryUri}${fileName}`,
    resourcePrefix,
  };
};

export const buildFieldworkMapLayerDownloadUrl = (
  syncUrl: string,
  project: string,
  resourceId: string
): string => buildFieldHubFileUrlWithType(
  syncUrl,
  project,
  resourceId,
  ImageVariant.ORIGINAL
);

const downloadFieldworkMapLayerImage = async ({
  connection,
  descriptor,
  document,
  expectedMd5,
  project,
}: {
  connection: FieldworkMapLayerConnection;
  descriptor: FieldworkMapLayerCacheDescriptor;
  document: Document;
  expectedMd5?: string;
  project: string;
}): Promise<string | undefined> => {
  const temporaryUri = `${descriptor.fileUri}.download`;

  try {
    await removeFileIfPresent(temporaryUri);
    const result = await FileSystem.downloadAsync(
      buildFieldworkMapLayerDownloadUrl(
        connection.url,
        project,
        document.resource.id
      ),
      temporaryUri,
      {
        headers: {
          Authorization: `Basic ${base64Encode(project + ':' + connection.password)}`,
        },
        md5: true,
      }
    );

    if (result.status < 200 || result.status >= 300) return undefined;
    if (
      expectedMd5
      && (!result.md5 || result.md5.toLowerCase() !== expectedMd5)
    ) {
      return undefined;
    }

    if (await isUsableCachedFile(descriptor.fileUri, expectedMd5)) {
      return descriptor.fileUri;
    }

    await FileSystem.moveAsync({
      from: temporaryUri,
      to: descriptor.fileUri,
    });
    await removeOutdatedLayerCacheFiles(descriptor);
    return descriptor.fileUri;
  } catch {
    return undefined;
  } finally {
    await removeFileIfPresent(temporaryUri);
  }
};

const downloadFieldworkMapLayerImageOnce = (
  options: Parameters<typeof downloadFieldworkMapLayerImage>[0]
): Promise<string | undefined> => {
  const key = options.descriptor.fileUri;
  const existingDownload = layerDownloadsInFlight.get(key);
  if (existingDownload) return existingDownload;

  const download = downloadFieldworkMapLayerImage(options)
    .finally(() => layerDownloadsInFlight.delete(key));
  layerDownloadsInFlight.set(key, download);
  return download;
};

interface DeviceLocalLayerImage {
  md5?: string;
  matchesExpectedChecksum: boolean;
  modificationTime?: number;
  size?: number;
}

const getDeviceLocalLayerImage = async (
  document: Document,
  expectedMd5?: string
): Promise<DeviceLocalLayerImage | undefined> => {
  const resource = document.resource as Record<string, unknown>;
  const uri = LOCAL_LAYER_URI_FIELDS
    .map((fieldName) => getStringValue(resource[fieldName]))
    .find((candidate) => candidate && /^(file|content):\/\//.test(candidate));
  if (!uri) return undefined;

  try {
    let fileInfo;
    try {
      fileInfo = await FileSystem.getInfoAsync(uri, { md5: !!expectedMd5 });
    } catch (error) {
      if (!expectedMd5 || !uri.startsWith('content://')) throw error;
      fileInfo = await FileSystem.getInfoAsync(uri);
    }
    if (!fileInfo.exists || fileInfo.isDirectory) return undefined;

    const md5 = getStringValue(fileInfo.md5)?.toLowerCase();
    return {
      md5,
      matchesExpectedChecksum: !!expectedMd5 && md5 === expectedMd5,
      modificationTime: typeof fileInfo.modificationTime === 'number'
        && fileInfo.modificationTime > 0
        ? fileInfo.modificationTime
        : undefined,
      size: typeof fileInfo.size === 'number' ? fileInfo.size : undefined,
    };
  } catch {
    return undefined;
  }
};

const shouldPreferDeviceLocalLayerImage = (
  document: Document,
  localImage: DeviceLocalLayerImage,
  expectedMd5?: string
): boolean => {
  if (!expectedMd5 || localImage.matchesExpectedChecksum) return true;

  const resource = document.resource as Record<string, unknown>;
  const uploadedMd5 = getStringValue(resource.fieldworkImageUploadedMd5)
    ?.toLowerCase();
  const uploadedSize = getNumberValue(resource.fieldworkImageUploadedSizeBytes);
  const uploadedAt = getStringValue(resource.fieldworkImageUploadedAt);

  if (localImage.md5 && uploadedMd5) {
    if (localImage.md5 === uploadedMd5) return false;
    if (localImage.modificationTime !== undefined && uploadedAt) {
      return isModificationTimeAfterUpload(localImage.modificationTime, uploadedAt);
    }
    return true;
  }
  if (localImage.modificationTime !== undefined && uploadedAt) {
    return isModificationTimeAfterUpload(localImage.modificationTime, uploadedAt);
  }
  if (localImage.size !== undefined && uploadedSize !== undefined) {
    if (localImage.size !== uploadedSize) return true;
  }
  // Some Android providers expose neither checksums nor modification times.
  // Prefer an accessible on-device original so an offline replacement is not
  // hidden behind an older server cache.
  return true;
};

const isModificationTimeAfterUpload = (
  modificationTime: number,
  uploadedAt: string
): boolean => {
  const uploadedAtMs = Date.parse(uploadedAt);
  if (!Number.isFinite(uploadedAtMs)) return false;

  const modificationTimeMs = modificationTime > 1_000_000_000_000
    ? modificationTime
    : modificationTime * 1000;
  return modificationTimeMs > uploadedAtMs;
};

const isUsableCachedFile = async (
  uri: string,
  expectedMd5?: string
): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { md5: !!expectedMd5 });
    if (!fileInfo.exists || fileInfo.isDirectory) return false;
    if (!expectedMd5) return true;

    return getStringValue(fileInfo.md5)?.toLowerCase() === expectedMd5;
  } catch {
    return false;
  }
};

const findMostRecentCachedLayerImage = async (
  descriptor: FieldworkMapLayerCacheDescriptor
): Promise<string | undefined> => {
  try {
    const fileNames = (await FileSystem.readDirectoryAsync(descriptor.directoryUri))
      .filter((fileName) =>
        fileName.startsWith(descriptor.resourcePrefix)
        && !fileName.endsWith('.download')
      );
    const candidates = await Promise.all(fileNames.map(async (fileName) => {
      const uri = `${descriptor.directoryUri}${fileName}`;
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists && !fileInfo.isDirectory
        ? { uri, modifiedAt: fileInfo.modificationTime ?? 0 }
        : undefined;
    }));

    return candidates
      .filter((candidate): candidate is { uri: string; modifiedAt: number } =>
        candidate !== undefined
      )
      .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]?.uri;
  } catch {
    return undefined;
  }
};

const removeOutdatedLayerCacheFiles = async (
  descriptor: FieldworkMapLayerCacheDescriptor
): Promise<void> => {
  try {
    const fileNames = await FileSystem.readDirectoryAsync(descriptor.directoryUri);
    await Promise.all(fileNames
      .filter((fileName) =>
        fileName.startsWith(descriptor.resourcePrefix)
        && fileName !== descriptor.fileName
        && !fileName.endsWith('.download')
      )
      .map((fileName) => removeFileIfPresent(
        `${descriptor.directoryUri}${fileName}`
      )));
  } catch {
    // Cache cleanup is best effort. The freshly downloaded layer remains usable.
  }
};

const removeFileIfPresent = async (uri: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Missing or locked cache files do not prevent an offline fallback.
  }
};

const withLocalLayerImage = (document: Document, uri: string): Document => ({
  ...document,
  resource: {
    ...document.resource,
    aerialLayerImageUri: uri,
  },
});

const getLayerCacheVersion = (document: Document): string => {
  const resource = document.resource as Record<string, unknown>;
  const storedMd5 = getStringValue(resource.fieldworkImageStoredMd5);
  const storedSha256 = getStringValue(resource.fieldworkImageStoredSha256);
  const uploadedMd5 = getStringValue(resource.fieldworkImageUploadedMd5);
  if (storedMd5) return `stored-md5:${storedMd5.toLowerCase()}`;
  if (storedSha256) return `stored-sha256:${storedSha256.toLowerCase()}`;
  if (uploadedMd5) return `uploaded-md5:${uploadedMd5.toLowerCase()}`;

  const revisionGroup = getStringValue(resource.aerialLayerRevisionGroup);
  const revisionNumber = getStringOrNumberValue(resource.aerialLayerRevisionNumber);
  if (revisionGroup || revisionNumber) {
    return `aerial-revision:${revisionGroup ?? ''}:${revisionNumber ?? ''}`;
  }

  return `document-revision:${document._rev ?? 'unversioned'}`;
};

const getExpectedLayerMd5 = (document: Document): string | undefined => {
  const resource = document.resource as Record<string, unknown>;
  return (
    getStringValue(resource.fieldworkImageStoredMd5)
    ?? getStringValue(resource.fieldworkImageUploadedMd5)
  )?.toLowerCase();
};

const getLayerImageExtension = (document: Document): string => {
  const resource = document.resource as Record<string, unknown>;
  const originalFilename = getStringValue(resource.originalFilename);
  const match = originalFilename?.match(/\.(jpe?g|png|webp|gif|tiff?)$/i);
  if (!match) return DEFAULT_IMAGE_EXTENSION;

  return `.${match[1].toLowerCase()}`;
};

const appendUriPath = (baseUri: string, ...segments: string[]): string =>
  `${baseUri.replace(/\/+$/, '')}/${segments.join('/')}/`;

const getSafeCacheSegment = (value: string): string => {
  const readablePart = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';

  return `${readablePart}-${getStableHash(value)}`;
};

const getStableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const getStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const getStringOrNumberValue = (value: unknown): string | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toString()
    : getStringValue(value);

const getNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getLayerDocumentsFingerprint = (
  project: string,
  documents: readonly Document[]
): string => JSON.stringify([
  project,
  documents.map((document) => {
    const resource = document.resource as Record<string, unknown>;
    return [
      document.resource.id,
      document._rev ?? '',
      getStringValue(resource.fieldworkImageStoredMd5) ?? '',
      getStringValue(resource.fieldworkImageStoredSha256) ?? '',
      getStringValue(resource.aerialLayerImageUri) ?? '',
    ];
  }),
]);

export default useFieldworkMapLayerImages;
