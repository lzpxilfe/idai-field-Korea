import { Document } from '../model/document/document';


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

export const KOREAN_FIELDWORK_DEFAULT_INVESTIGATION_MODE: KoreanFieldworkInvestigationModeId = 'trialTrench';
export const KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD = 'projectInvestigationMode';
export const KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD = 'projectBoundarySummary';

export const KOREAN_FIELDWORK_INVESTIGATION_MODES: readonly KoreanFieldworkInvestigationMode[] = [
    {
        id: 'trialTrench',
        label: '시굴·표본조사',
        detail: '트렌치 단위로 조사 과정과 확인 결과를 기록',
        primaryAction: '트렌치부터 잡기',
        requirements: [
            '트렌치 번호와 위치',
            '토층 정리 여부',
            '유구 확인 여부',
            '피트 조사와 피트 토층도',
            '정방향·사선·토층·유구 사진',
            '최종 트렌치 번호 정리'
        ]
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
            '실측'
        ]
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
            '사진과 위치 기록'
        ]
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
            '후속 조치 필요 여부'
        ]
    }
];


export function getKoreanFieldworkInvestigationMode(
        id: unknown
): KoreanFieldworkInvestigationMode|undefined {

    return typeof id === 'string'
        ? KOREAN_FIELDWORK_INVESTIGATION_MODES.find(mode => mode.id === id)
        : undefined;
}


export function getKoreanFieldworkInvestigationModeLabel(modeId: string|undefined): string {

    return getKoreanFieldworkInvestigationMode(modeId)?.label
        ?? modeId
        ?? '';
}


export function shouldUseKoreanFieldworkTrenchWorkflow(
        investigationModeId?: KoreanFieldworkInvestigationModeId
): boolean {

    return investigationModeId === 'trialTrench';
}


export function isKoreanFieldworkProjectSetupFilledIn(
        modeId: string|undefined,
        boundarySummary: string|undefined
): boolean {

    return !!modeId?.trim() && !!boundarySummary?.trim();
}


export function getKoreanFieldworkProjectResourceValue(
        projectDocument: Document|undefined,
        fieldName: string
): string|undefined {

    const value = (projectDocument?.resource as any)?.[fieldName];
    const normalizedValue = typeof value === 'string'
        ? value.trim()
        : undefined;

    return normalizedValue && normalizedValue.length > 0
        ? normalizedValue
        : undefined;
}


export function getKoreanFieldworkProjectSetupDefaultsFromDocument(
        projectDocument: Document|undefined
): KoreanFieldworkProjectSetupDefaults {

    const boundarySummary = getKoreanFieldworkProjectResourceValue(
        projectDocument,
        KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD
    );
    const institutionName = getKoreanFieldworkProjectResourceValue(projectDocument, 'institution');
    const investigationModeId = getKoreanFieldworkInvestigationMode(
        (projectDocument?.resource as any)?.[KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD]
    )?.id;

    return {
        investigationModeId,
        boundarySummary,
        ...(institutionName ? { institutionName } : {})
    };
}


export function createKoreanFieldworkProjectSetupResourceUpdates(
        defaults: KoreanFieldworkProjectSetupDefaults|string,
        boundarySummary?: string
): Record<string, unknown> {

    const setupDefaults = typeof defaults === 'string'
        ? {
            investigationModeId: defaults as KoreanFieldworkInvestigationModeId,
            boundarySummary
        }
        : defaults;
    const normalizedBoundarySummary = setupDefaults.boundarySummary?.trim();
    const normalizedInstitutionName = setupDefaults.institutionName?.trim();
    const updates: Record<string, unknown> = {};

    if (getKoreanFieldworkInvestigationMode(setupDefaults.investigationModeId)) {
        updates[KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD] = setupDefaults.investigationModeId;
    }

    if (normalizedInstitutionName) {
        updates.institution = normalizedInstitutionName;
    }

    if (normalizedBoundarySummary) {
        updates.projectBoundarySetupState = 'draftBoundary';
        updates[KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD] = normalizedBoundarySummary;
        updates.shortDescription = normalizedBoundarySummary;
    }

    return updates;
}
