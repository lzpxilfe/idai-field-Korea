import {
    CategoryForm,
    FieldGeometryType,
    getKoreanFieldworkConfiguredDraftFieldDefaults,
    getKoreanFieldworkFeatureTraceConfiguredDraftValues,
    isKoreanFieldworkFeatureDraftCategory,
    KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE,
    KoreanFieldworkDraftFieldValues
} from 'idai-field-core';


export { KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE };

export interface KoreanFieldworkDefaultFieldOptions {
    boundaryAccuracy?: string;
    boundarySummary?: string;
    boundarySource?: string;
    geometrySource?: string;
    geometryType?: FieldGeometryType|string;
    referenceBasemapProvider?: string;
}


export function getKoreanFieldworkDefaultFieldValues(
        category: CategoryForm|undefined,
        options: KoreanFieldworkDefaultFieldOptions = {}
): KoreanFieldworkDraftFieldValues {

    return getKoreanFieldworkConfiguredDraftFieldDefaults(category, options);
}


export function isKoreanFieldworkFeatureCategory(category: CategoryForm|undefined): boolean {

    return isKoreanFieldworkFeatureDraftCategory(category);
}


export function getKoreanFieldworkFeatureTraceDraftValues(
        category: CategoryForm|undefined
): KoreanFieldworkDraftFieldValues {

    return getKoreanFieldworkFeatureTraceConfiguredDraftValues(category);
}
