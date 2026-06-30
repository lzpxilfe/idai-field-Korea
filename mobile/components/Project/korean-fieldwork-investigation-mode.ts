import AsyncStorage from '@react-native-async-storage/async-storage';
import { Document } from 'idai-field-core';

export type KoreanFieldworkInvestigationModeId =
  'trialTrench'
  | 'excavation'
  | 'surfaceSurvey'
  | 'watchingBrief';

export interface KoreanFieldworkInvestigationMode {
  detail: string;
  id: KoreanFieldworkInvestigationModeId;
  label: string;
  primaryAction: string;
  requirements: readonly string[];
}

export interface KoreanFieldworkProjectSetupDefaults {
  boundarySummary?: string;
  institutionName?: string;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
}

export type KoreanFieldworkBoundaryMapTypeId =
  'ROADMAP'
  | 'SKYVIEW'
  | 'HYBRID';

export interface KoreanFieldworkBoundaryLocation {
  latitude: number;
  longitude: number;
}

export interface KoreanFieldworkProjectBoundaryDraft {
  center?: KoreanFieldworkBoundaryLocation;
  coordinates: KoreanFieldworkBoundaryLocation[];
  mapTypeId?: KoreanFieldworkBoundaryMapTypeId;
}

export const KOREAN_FIELDWORK_INVESTIGATION_MODES: readonly KoreanFieldworkInvestigationMode[] = [
  {
    id: 'trialTrench',
    label: '표본·시굴조사',
    detail: '트렌치 단위로 토층과 유구 확인 과정을 기록',
    primaryAction: '트렌치부터 잡기',
    requirements: [
      '트렌치 번호와 위치',
      '토층 정리 여부',
      '유구 확인 여부',
      '피트 조사와 피트 토층도',
      '정방향·사선·토층·유구 사진',
      '최종 트렌치 번호 정리',
    ],
  },
  {
    id: 'excavation',
    label: '발굴조사',
    detail: '제토 뒤 확인한 유구를 조사 단계별로 기록',
    primaryAction: '유구부터 기록',
    requirements: [
      '제토와 유구 성격 파악',
      '유물 성격과 시대 추정',
      '조사 전 사진',
      '조사 중 사진과 토층 확인',
      '스케치·약측·실측 연결',
      '토층사진과 유물 노출 사진',
      '유물 수습과 완료 사진',
      '실측',
    ],
  },
  {
    id: 'surfaceSurvey',
    label: '지표조사',
    detail: '조사 범위와 지표에서 보이는 자료를 빠르게 기록',
    primaryAction: '범위와 산포 기록',
    requirements: [
      '조사 범위',
      '지표 노출 상태',
      '유물 산포와 수습 위치',
      '사진과 위치 기록',
    ],
  },
  {
    id: 'watchingBrief',
    label: '참관·입회조사',
    detail: '공사·입회 현장에서 확인한 변동 사항을 남김',
    primaryAction: '입회 내용 기록',
    requirements: [
      '공사 구간과 입회 범위',
      '확인된 유구·유물 여부',
      '사진과 위치',
      '후속 조치 필요 여부',
    ],
  },
];

const STORAGE_KEY_PREFIX = 'koreanFieldwork.investigationMode.v1';
const BOUNDARY_SUMMARY_STORAGE_KEY_PREFIX =
  'koreanFieldwork.boundarySummary.v1';
const PROJECT_BOUNDARY_DRAFT_STORAGE_KEY_PREFIX =
  'koreanFieldwork.projectBoundaryDraft.v1';
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

export const createKoreanFieldworkDefaultInstitutionNameStorageKey =
  (): string => DEFAULT_INSTITUTION_NAME_STORAGE_KEY;

export const getKoreanFieldworkInvestigationMode = (
  id: unknown
): KoreanFieldworkInvestigationMode | undefined =>
  typeof id === 'string'
    ? KOREAN_FIELDWORK_INVESTIGATION_MODES.find((mode) => mode.id === id)
    : undefined;

export const shouldUseKoreanFieldworkTrenchWorkflow = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): boolean => investigationModeId === undefined || investigationModeId === 'trialTrench';

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
    storedInstitutionName,
  ] = await Promise.all([
    loadKoreanFieldworkInvestigationModeId(projectId),
    loadKoreanFieldworkBoundarySummary(projectId),
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

export const getKoreanFieldworkProjectSetupDefaultsFromDocument = (
  projectDocument: Document | undefined
): KoreanFieldworkProjectSetupDefaults => {
  const resource = projectDocument?.resource as Record<string, unknown> | undefined;
  const boundarySummary = typeof resource?.projectBoundarySummary === 'string'
    ? resource.projectBoundarySummary.trim()
    : undefined;
  const institutionName = typeof resource?.institution === 'string'
    ? resource.institution.trim()
    : undefined;

  return {
    investigationModeId: getKoreanFieldworkInvestigationMode(
      resource?.projectInvestigationMode
    )?.id,
    boundarySummary: boundarySummary || undefined,
    ...(institutionName ? { institutionName } : {}),
  };
};

export const createKoreanFieldworkProjectSetupResourceUpdates = (
  defaults: KoreanFieldworkProjectSetupDefaults
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  const boundarySummary = defaults.boundarySummary?.trim();
  const institutionName = defaults.institutionName?.trim();

  if (defaults.investigationModeId) {
    updates.projectInvestigationMode = defaults.investigationModeId;
  }

  if (institutionName) {
    updates.institution = institutionName;
  }

  if (boundarySummary) {
    updates.projectBoundarySetupState = 'draftBoundary';
    updates.projectBoundarySummary = boundarySummary;
    updates.shortDescription = boundarySummary;
  }

  return updates;
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
  value === 'ROADMAP' || value === 'SKYVIEW' || value === 'HYBRID';
