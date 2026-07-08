import {
    CategoryForm,
    createKoreanFieldworkProjectSetupResourceUpdates as createSharedProjectSetupResourceUpdates,
    Document,
    getKoreanFieldworkInvestigationMode as getSharedInvestigationMode,
    getKoreanFieldworkInvestigationModeLabel as getSharedInvestigationModeLabel,
    getKoreanFieldworkProjectResourceValue as getSharedProjectResourceValue,
    getKoreanFieldworkProjectSetupDefaultsFromDocument as getSharedProjectSetupDefaultsFromDocument,
    isKoreanFieldworkProjectSetupFilledIn as isSharedProjectSetupFilledIn,
    KOREAN_FIELDWORK_DEFAULT_INVESTIGATION_MODE as SHARED_DEFAULT_INVESTIGATION_MODE,
    KOREAN_FIELDWORK_INVESTIGATION_MODES as SHARED_INVESTIGATION_MODES,
    KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD as SHARED_BOUNDARY_SUMMARY_FIELD,
    KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD as SHARED_INVESTIGATION_MODE_FIELD,
    ProjectConfiguration
} from 'idai-field-core';


export interface KoreanFieldworkInvestigationModeOption {
    value: string;
    label: string;
    detail: string;
}

export type { KoreanFieldworkProjectSetupDefaults } from 'idai-field-core';

export const KOREAN_FIELDWORK_DEFAULT_INVESTIGATION_MODE = SHARED_DEFAULT_INVESTIGATION_MODE;
export const KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD = SHARED_INVESTIGATION_MODE_FIELD;
export const KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD = SHARED_BOUNDARY_SUMMARY_FIELD;

export const KOREAN_FIELDWORK_INVESTIGATION_MODES: KoreanFieldworkInvestigationModeOption[] =
    SHARED_INVESTIGATION_MODES.map(mode => ({
        value: mode.id,
        label: mode.label,
        detail: mode.detail
    }));

export const getKoreanFieldworkInvestigationModeLabel = getSharedInvestigationModeLabel;
export const getKoreanFieldworkProjectResourceValue = getSharedProjectResourceValue;
export const getKoreanFieldworkProjectSetupDefaultsFromDocument = getSharedProjectSetupDefaultsFromDocument;
export const createKoreanFieldworkProjectSetupResourceUpdates = createSharedProjectSetupResourceUpdates;
export const isKoreanFieldworkProjectSetupFilledIn = isSharedProjectSetupFilledIn;


export function getKoreanFieldworkInvestigationModeOption(
        modeId: unknown): KoreanFieldworkInvestigationModeOption|undefined {

    const mode = getSharedInvestigationMode(modeId);

    return mode
        ? {
            value: mode.id,
            label: mode.label,
            detail: mode.detail
        }
        : undefined;
}


export function isKoreanFieldworkProject(projectDocument: Document|undefined,
                                         projectConfiguration: ProjectConfiguration): boolean {

    return hasKoreanFieldworkProjectFields(projectConfiguration)
        || !!getKoreanFieldworkProjectResourceValue(projectDocument, KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD)
        || !!getKoreanFieldworkProjectResourceValue(projectDocument, KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD);
}


export function hasKoreanFieldworkProjectFields(projectConfiguration: ProjectConfiguration): boolean {

    try {
        const projectCategory = projectConfiguration.getCategory('Project');

        return !!CategoryForm.getField(projectCategory, KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD)
            && !!CategoryForm.getField(projectCategory, KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD);
    } catch (err) {
        return false;
    }
}
