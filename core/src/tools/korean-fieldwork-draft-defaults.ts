import {
    KOREAN_FIELDWORK_FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
    KOREAN_FIELDWORK_FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
    KOREAN_FIELDWORK_FEATURE_RECORDING_STATUS_CANDIDATE,
    KOREAN_FIELDWORK_GEOMETRY_CONFIDENCE_ROUGH,
    KOREAN_FIELDWORK_GEOMETRY_SOURCE_AERIAL_LAYER_TRACE,
    KOREAN_FIELDWORK_GEOMETRY_SOURCE_TABLET_SKETCH,
    KOREAN_FIELDWORK_LAYER_SEQUENCE_MEANING_DEFAULT,
    KOREAN_FIELDWORK_RECORD_CREATION_TIMING_DURING_FIELDWORK,
    KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_DEFAULT,
    KOREAN_FIELDWORK_SOIL_COLOR_ASSIST_STATUS_DEFAULT,
    KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
    KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
    KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_DEFAULT,
    KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DEFAULT,
    KOREAN_FIELDWORK_SURVEY_BOUNDARY_TYPE_DEFAULT
} from '../configuration/project-configuration-names';
import { FieldGeometryType } from '../model/document/field-geometry';
import { CategoryForm } from '../model/configuration/category-form';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-record-contract';


export type KoreanFieldworkDraftFieldValues = { [fieldName: string]: unknown };

export interface KoreanFieldworkDraftDefaultOptions {
    boundaryAccuracy?: string;
    boundarySummary?: string;
    boundarySource?: string;
    geometryConfidence?: string;
    geometrySource?: string;
    geometryType?: FieldGeometryType|string;
    includeGeometryDefaults?: boolean;
    referenceBasemapProvider?: string;
}

const C = KOREAN_FIELDWORK_CATEGORIES;
const FEATURE_WORKFLOW_CATEGORIES: readonly string[] = [C.FEATURE, C.FEATURE_GROUP, C.FEATURE_SEGMENT];

export const KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE =
    '\uc704\uc131\uc9c0\ub3c4\ub098 \ud3c9\uba74\ub3c4\ucc98\ub7fc \uc870\uc0ac \uacbd\uacc4 \uc704\uc5d0 \uc720\uad6c \uc704\uce58\uc640 \ud615\ud0dc\ub97c \ubc14\ub85c \uc5b9\uc73c\uba70 \uc2dc\uc791';


export function getKoreanFieldworkDraftFieldDefaults(
        categoryName: string,
        options: KoreanFieldworkDraftDefaultOptions = {}
): KoreanFieldworkDraftFieldValues {

    if (FEATURE_WORKFLOW_CATEGORIES.includes(categoryName)) {
        const includeGeometryDefaults = shouldIncludeGeometryDefaults(options);

        return {
            featureRecordingStatus: KOREAN_FIELDWORK_FEATURE_RECORDING_STATUS_CANDIDATE,
            featureGeometryEditStatus: KOREAN_FIELDWORK_FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
            featureGeometryRevisionHistory: KOREAN_FIELDWORK_FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
            featureInvestigationChecklist: [],
            featureSoilProfilePhotoCount: 0,
            ...(includeGeometryDefaults
                ? {
                    geometrySource: options.geometrySource
                        ?? KOREAN_FIELDWORK_GEOMETRY_SOURCE_TABLET_SKETCH,
                    geometryConfidence: options.geometryConfidence
                        ?? KOREAN_FIELDWORK_GEOMETRY_CONFIDENCE_ROUGH
                }
                : {})
        };
    }

    if (categoryName === C.TRENCH) {
        return {
            featureInvestigationChecklist: [],
            fieldRecordQuality: [],
            recordCreationTiming: KOREAN_FIELDWORK_RECORD_CREATION_TIMING_DURING_FIELDWORK
        };
    }

    if (categoryName === C.LAYER) {
        return {
            layerSequenceNumber: 1,
            layerSequenceMeaning: KOREAN_FIELDWORK_LAYER_SEQUENCE_MEANING_DEFAULT,
            soilColorAssistStatus: KOREAN_FIELDWORK_SOIL_COLOR_ASSIST_STATUS_DEFAULT
        };
    }

    if (categoryName === C.SOIL_PROFILE_PHOTO) {
        return {
            layerSequenceMeaning: KOREAN_FIELDWORK_LAYER_SEQUENCE_MEANING_DEFAULT,
            soilColorAssistCandidates: '',
            soilColorAssistStatus: KOREAN_FIELDWORK_SOIL_COLOR_ASSIST_STATUS_DEFAULT,
            soilProfileAnnotationStrokes: '[]',
            soilProfilePhotoAnnotationStrokes: '[]',
            soilProfileColorSwatches: '',
            soilProfileLayerIds: '[]',
            soilProfileLayerMarkers: '[]',
            soilProfilePhotoQuality: KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
            soilProfilePhotoSizeHintKb: KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT
        };
    }

    if (categoryName === C.PHOTO) {
        return {
            fieldworkPhotoAnnotationStrokes: '[]',
            fieldworkPhotoQuality: KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
            fieldworkPhotoSizeHintKb: KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
            mediaEvidenceRole: ['fieldResultRecord']
        };
    }

    if (categoryName === C.DRAWING) {
        return {
            drawingSketchStrokes: '[]',
            mediaEvidenceRole: ['fieldResultRecord']
        };
    }

    if (categoryName === C.SURVEY_BOUNDARY) {
        const boundarySummary = options.boundarySummary?.trim();

        return {
            ...(boundarySummary
                ? {
                    shortDescription: boundarySummary,
                    surveyBoundaryNote: boundarySummary
                }
                : {}),
            referenceBasemapProvider: options.referenceBasemapProvider
                ?? KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_DEFAULT,
            surveyBoundaryAccuracy: options.boundaryAccuracy
                ?? KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_DEFAULT,
            surveyBoundarySource: options.boundarySource
                ?? KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DEFAULT,
            surveyBoundaryType: KOREAN_FIELDWORK_SURVEY_BOUNDARY_TYPE_DEFAULT
        };
    }

    if (categoryName === C.PEN_MEMO) {
        return {
            penMemoStrokes: '[]',
            penMemoTranscriptionStatus: 'pending'
        };
    }

    return {};
}


export function getKoreanFieldworkConfiguredDraftFieldDefaults(
        category: CategoryForm|undefined,
        options: KoreanFieldworkDraftDefaultOptions = {}
): KoreanFieldworkDraftFieldValues {

    if (!isKoreanFieldworkDraftDefaultsCategory(category)) return {};

    return getConfiguredDefaults(
        category,
        getKoreanFieldworkDraftFieldDefaults(category.name, options)
    );
}


export function isKoreanFieldworkFeatureDraftCategory(category: CategoryForm|undefined): boolean {

    return !!category
        && FEATURE_WORKFLOW_CATEGORIES.includes(category.name)
        && hasValuelist(category, 'featureRecordingStatus', 'KoreanFieldwork-featureRecordingStatus');
}


export function getKoreanFieldworkFeatureTraceDraftValues(): KoreanFieldworkDraftFieldValues {

    return {
        geometrySource: KOREAN_FIELDWORK_GEOMETRY_SOURCE_AERIAL_LAYER_TRACE,
        geometryConfidence: KOREAN_FIELDWORK_GEOMETRY_CONFIDENCE_ROUGH,
        featureGeometryRevisionNote: KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE,
        shortDescription: KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE
    };
}


export function getKoreanFieldworkFeatureTraceConfiguredDraftValues(
        category: CategoryForm|undefined
): KoreanFieldworkDraftFieldValues {

    if (!isKoreanFieldworkFeatureDraftCategory(category)) return {};

    return getConfiguredDefaults(category, getKoreanFieldworkFeatureTraceDraftValues());
}


function shouldIncludeGeometryDefaults(options: KoreanFieldworkDraftDefaultOptions): boolean {

    return !!options.includeGeometryDefaults
        || !!options.geometrySource
        || !!options.geometryConfidence
        || (!!options.geometryType && options.geometryType !== 'none');
}


function isKoreanFieldworkDraftDefaultsCategory(category: CategoryForm|undefined): boolean {

    if (!category) return false;
    if (isKoreanFieldworkFeatureDraftCategory(category)) return true;

    switch (category.name) {
        case C.TRENCH:
            return hasValuelist(category, 'recordCreationTiming', 'KoreanFieldwork-recordCreationTiming');
        case C.LAYER:
        case C.SOIL_PROFILE_PHOTO:
            return hasValuelist(category, 'layerSequenceMeaning', 'KoreanFieldwork-layerSequenceMeaning');
        case C.PHOTO:
            return !!CategoryForm.getField(category, 'mediaEvidenceRole');
        case C.DRAWING:
            return !!CategoryForm.getField(category, 'drawingSketchStrokes')
                || !!CategoryForm.getField(category, 'mediaEvidenceRole');
        case C.SURVEY_BOUNDARY:
            return hasValuelist(category, 'surveyBoundaryType', 'KoreanFieldwork-surveyBoundaryType');
        case C.PEN_MEMO:
            return !!CategoryForm.getField(category, 'penMemoTranscriptionStatus');
        default:
            return false;
    }
}


function getConfiguredDefaults(category: CategoryForm,
                               defaults: KoreanFieldworkDraftFieldValues): KoreanFieldworkDraftFieldValues {

    return Object.entries(defaults).reduce((result, [fieldName, value]) => {
        if (CategoryForm.getField(category, fieldName)) result[fieldName] = value;
        return result;
    }, {} as KoreanFieldworkDraftFieldValues);
}


function hasValuelist(category: CategoryForm, fieldName: string, valuelistId: string): boolean {

    return CategoryForm.getField(category, fieldName)?.valuelist?.id === valuelistId;
}
