import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createKoreanFieldworkProjectSetupResourceUpdates,
  Document,
  getKoreanFieldworkInvestigationMode,
  getKoreanFieldworkInvestigationModeLabel,
  getKoreanFieldworkProjectSetupDefaultsFromDocument,
  KOREAN_FIELDWORK_DEFAULT_INVESTIGATION_MODE,
  KOREAN_FIELDWORK_INVESTIGATION_MODES,
  shouldUseKoreanFieldworkTrenchWorkflow,
  type KoreanFieldworkInvestigationMode,
  type KoreanFieldworkInvestigationModeId,
  type KoreanFieldworkProjectSetupDefaults as CoreKoreanFieldworkProjectSetupDefaults,
} from 'idai-field-core';

export {
  createKoreanFieldworkProjectSetupResourceUpdates,
  getKoreanFieldworkInvestigationMode,
  getKoreanFieldworkInvestigationModeLabel,
  getKoreanFieldworkProjectSetupDefaultsFromDocument,
  KOREAN_FIELDWORK_DEFAULT_INVESTIGATION_MODE,
  KOREAN_FIELDWORK_INVESTIGATION_MODES,
  shouldUseKoreanFieldworkTrenchWorkflow,
};

export type {
  KoreanFieldworkInvestigationMode,
  KoreanFieldworkInvestigationModeId,
};

export type KoreanFieldworkProjectSetupDefaults =
  CoreKoreanFieldworkProjectSetupDefaults & {
    displayName?: string;
  };

export type KoreanFieldworkBoundaryMapTypeId =
  'ROADMAP'
  | 'SKYVIEW'
  | 'HYBRID'
  | 'BLANK';

export interface KoreanFieldworkBoundaryLocation {
  latitude: number;
  longitude: number;
}

export interface KoreanFieldworkProjectBoundaryDraft {
  center?: KoreanFieldworkBoundaryLocation;
  coordinates: KoreanFieldworkBoundaryLocation[];
  mapTypeId?: KoreanFieldworkBoundaryMapTypeId;
}

const STORAGE_KEY_PREFIX = 'koreanFieldwork.investigationMode.v1';
const BOUNDARY_SUMMARY_STORAGE_KEY_PREFIX =
  'koreanFieldwork.boundarySummary.v1';
const PROJECT_BOUNDARY_DRAFT_STORAGE_KEY_PREFIX =
  'koreanFieldwork.projectBoundaryDraft.v1';
const PROJECT_DISPLAY_NAME_STORAGE_KEY_PREFIX =
  'koreanFieldwork.projectDisplayName.v1';
const DEFAULT_INSTITUTION_NAME_STORAGE_KEY =
  'koreanFieldwork.defaultInstitutionName.v1';

export const createKoreanFieldworkInvestigationModeStorageKey = (
  projectId: string
): string => `${STORAGE_KEY_PREFIX}.${projectId}`;

export const createKoreanFieldworkBoundarySummaryStorageKey = (
  projectId: string
): string => `${BOUNDARY_SUMMARY_STORAGE_KEY_PREFIX}.${projectId}`;

export const createKoreanFieldworkProjectBoundaryDraftStorageKey = (
  projectId: string
): string => `${PROJECT_BOUNDARY_DRAFT_STORAGE_KEY_PREFIX}.${projectId}`;

export const createKoreanFieldworkProjectDisplayNameStorageKey = (
  projectId: string
): string => `${PROJECT_DISPLAY_NAME_STORAGE_KEY_PREFIX}.${projectId}`;

export const createKoreanFieldworkDefaultInstitutionNameStorageKey =
  (): string => DEFAULT_INSTITUTION_NAME_STORAGE_KEY;

export const loadKoreanFieldworkInvestigationModeId = async (
  projectId: string
): Promise<KoreanFieldworkInvestigationModeId | undefined> => {
  const storedValue = await AsyncStorage.getItem(
    createKoreanFieldworkInvestigationModeStorageKey(projectId)
  );

  return getKoreanFieldworkInvestigationMode(storedValue)?.id;
};

export const loadKoreanFieldworkProjectSetupDefaults = async (
  projectId: string,
  projectDocument?: Document
): Promise<KoreanFieldworkProjectSetupDefaults> => {
  const [
    storedInvestigationModeId,
    storedBoundarySummary,
    storedDisplayName,
    storedInstitutionName,
  ] = await Promise.all([
    loadKoreanFieldworkInvestigationModeId(projectId),
    loadKoreanFieldworkBoundarySummary(projectId),
    loadKoreanFieldworkProjectDisplayName(projectId),
    loadKoreanFieldworkDefaultInstitutionName(),
  ]);
  const documentDefaults =
    getKoreanFieldworkProjectSetupDefaultsFromDocument(projectDocument);
  const setupDefaults: KoreanFieldworkProjectSetupDefaults = {
    investigationModeId:
      storedInvestigationModeId ?? documentDefaults.investigationModeId,
    boundarySummary:
      storedBoundarySummary ?? documentDefaults.boundarySummary,
  };
  const documentDisplayName = getKoreanFieldworkProjectDisplayNameFromDocument(
    projectId,
    projectDocument
  );
  const displayName = storedDisplayName ?? documentDisplayName;
  if (displayName) setupDefaults.displayName = displayName;
  const institutionName = storedInstitutionName ?? documentDefaults.institutionName;
  if (institutionName) setupDefaults.institutionName = institutionName;

  if (!storedInvestigationModeId && setupDefaults.investigationModeId) {
    await saveKoreanFieldworkInvestigationModeId(
      projectId,
      setupDefaults.investigationModeId
    ).catch(() => undefined);
  }
  if (!storedBoundarySummary && setupDefaults.boundarySummary) {
    await saveKoreanFieldworkBoundarySummary(
      projectId,
      setupDefaults.boundarySummary
    ).catch(() => undefined);
  }
  if (!storedDisplayName && setupDefaults.displayName) {
    await saveKoreanFieldworkProjectDisplayName(
      projectId,
      setupDefaults.displayName
    ).catch(() => undefined);
  }
  if (!storedInstitutionName && setupDefaults.institutionName) {
    await saveKoreanFieldworkDefaultInstitutionName(
      setupDefaults.institutionName
    ).catch(() => undefined);
  }

  return setupDefaults;
};

export const saveKoreanFieldworkInvestigationModeId = async (
  projectId: string,
  modeId: KoreanFieldworkInvestigationModeId
) => {
  await AsyncStorage.setItem(
    createKoreanFieldworkInvestigationModeStorageKey(projectId),
    modeId
  );
};

export const loadKoreanFieldworkBoundarySummary = async (
  projectId: string
): Promise<string | undefined> => {
  const storedValue = await AsyncStorage.getItem(
    createKoreanFieldworkBoundarySummaryStorageKey(projectId)
  );
  const boundarySummary = storedValue?.trim();

  return boundarySummary ? boundarySummary : undefined;
};

export const saveKoreanFieldworkBoundarySummary = async (
  projectId: string,
  boundarySummary: string
) => {
  const normalizedSummary = boundarySummary.trim();
  const storageKey = createKoreanFieldworkBoundarySummaryStorageKey(projectId);

  if (normalizedSummary.length === 0) {
    await AsyncStorage.removeItem(storageKey);
    return;
  }

  await AsyncStorage.setItem(storageKey, normalizedSummary);
};

export const loadKoreanFieldworkProjectDisplayName = async (
  projectId: string
): Promise<string | undefined> => {
  const storedValue = await AsyncStorage.getItem(
    createKoreanFieldworkProjectDisplayNameStorageKey(projectId)
  );
  const displayName = storedValue?.trim();

  return displayName && displayName !== projectId ? displayName : undefined;
};

export const saveKoreanFieldworkProjectDisplayName = async (
  projectId: string,
  displayName: string
) => {
  const normalizedDisplayName = displayName.trim();
  const storageKey = createKoreanFieldworkProjectDisplayNameStorageKey(projectId);

  if (normalizedDisplayName.length === 0 || normalizedDisplayName === projectId) {
    await AsyncStorage.removeItem(storageKey);
    return;
  }

  await AsyncStorage.setItem(storageKey, normalizedDisplayName);
};

export const loadKoreanFieldworkProjectBoundaryDraft = async (
  projectId: string
): Promise<KoreanFieldworkProjectBoundaryDraft | undefined> => {
  const storedValue = await AsyncStorage.getItem(
    createKoreanFieldworkProjectBoundaryDraftStorageKey(projectId)
  );
  if (!storedValue) return undefined;

  try {
    return normalizeKoreanFieldworkProjectBoundaryDraft(JSON.parse(storedValue));
  } catch {
    return undefined;
  }
};

export const saveKoreanFieldworkProjectBoundaryDraft = async (
  projectId: string,
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft
) => {
  const normalizedBoundaryDraft =
    normalizeKoreanFieldworkProjectBoundaryDraft(boundaryDraft);
  const storageKey =
    createKoreanFieldworkProjectBoundaryDraftStorageKey(projectId);

  if (!normalizedBoundaryDraft) {
    await AsyncStorage.removeItem(storageKey);
    return;
  }

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(normalizedBoundaryDraft)
  );
};

export const removeKoreanFieldworkProjectBoundaryDraft = async (
  projectId: string
) => {
  await AsyncStorage.removeItem(
    createKoreanFieldworkProjectBoundaryDraftStorageKey(projectId)
  );
};

export const removeKoreanFieldworkProjectSetupDefaults = async (
  projectId: string
) => {
  await Promise.all([
    AsyncStorage.removeItem(
      createKoreanFieldworkInvestigationModeStorageKey(projectId)
    ),
    AsyncStorage.removeItem(
      createKoreanFieldworkBoundarySummaryStorageKey(projectId)
    ),
    AsyncStorage.removeItem(
      createKoreanFieldworkProjectBoundaryDraftStorageKey(projectId)
    ),
    AsyncStorage.removeItem(
      createKoreanFieldworkProjectDisplayNameStorageKey(projectId)
    ),
  ]);
};

export const loadKoreanFieldworkDefaultInstitutionName = async (
): Promise<string | undefined> => {
  const storedValue = await AsyncStorage.getItem(
    createKoreanFieldworkDefaultInstitutionNameStorageKey()
  );
  const institutionName = storedValue?.trim();

  return institutionName ? institutionName : undefined;
};

export const saveKoreanFieldworkDefaultInstitutionName = async (
  institutionName: string
) => {
  const normalizedInstitutionName = institutionName.trim();
  const storageKey = createKoreanFieldworkDefaultInstitutionNameStorageKey();

  if (normalizedInstitutionName.length === 0) {
    await AsyncStorage.removeItem(storageKey);
    return;
  }

  await AsyncStorage.setItem(storageKey, normalizedInstitutionName);
};

const normalizeKoreanFieldworkProjectBoundaryDraft = (
  value: unknown
): KoreanFieldworkProjectBoundaryDraft | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;

  const draft = value as Record<string, unknown>;
  const coordinates = normalizeKoreanFieldworkBoundaryLocations(
    draft.coordinates
  );
  if (coordinates.length < 3) return undefined;

  return {
    coordinates,
    ...(isKoreanFieldworkBoundaryLocation(draft.center)
      ? { center: draft.center }
      : {}),
    ...(isKoreanFieldworkBoundaryMapTypeId(draft.mapTypeId)
      ? { mapTypeId: draft.mapTypeId }
      : {}),
  };
};

const normalizeKoreanFieldworkBoundaryLocations = (
  value: unknown
): KoreanFieldworkBoundaryLocation[] =>
  Array.isArray(value)
    ? value.filter(isKoreanFieldworkBoundaryLocation)
    : [];

const isKoreanFieldworkBoundaryLocation = (
  value: unknown
): value is KoreanFieldworkBoundaryLocation => {
  if (typeof value !== 'object' || value === null) return false;

  const location = value as Record<string, unknown>;

  return typeof location.latitude === 'number'
    && Number.isFinite(location.latitude)
    && typeof location.longitude === 'number'
    && Number.isFinite(location.longitude);
};

const isKoreanFieldworkBoundaryMapTypeId = (
  value: unknown
): value is KoreanFieldworkBoundaryMapTypeId =>
  value === 'ROADMAP' || value === 'SKYVIEW' || value === 'HYBRID' || value === 'BLANK';

const getKoreanFieldworkProjectDisplayNameFromDocument = (
  projectId: string,
  projectDocument?: Document
): string | undefined => {
  const identifier = (projectDocument?.resource as any)?.identifier;
  const displayName = typeof identifier === 'string'
    ? identifier.trim()
    : undefined;

  return displayName && displayName !== projectId ? displayName : undefined;
};
