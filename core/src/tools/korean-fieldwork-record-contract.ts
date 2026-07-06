import { Document } from '../model/document/document';
import { buildEvidenceBundle, EvidenceBundle } from './korean-fieldwork-readiness';


export const KOREAN_FIELDWORK_CATEGORIES = {
    AERIAL_MAP_LAYER: 'AerialMapLayer',
    DAILY_LOG: 'DailyLog',
    DRAWING: 'Drawing',
    FEATURE: 'Feature',
    FEATURE_GROUP: 'FeatureGroup',
    FEATURE_SEGMENT: 'FeatureSegment',
    FIELD_RECORD_QUALITY_REVIEW: 'FieldRecordQualityReview',
    FIND: 'Find',
    FIND_COLLECTION: 'FindCollection',
    LAYER: 'Layer',
    OPERATION: 'Operation',
    PEN_MEMO: 'PenMemo',
    PHOTO: 'Photo',
    PLACE: 'Place',
    SAMPLE: 'Sample',
    SOIL_PROFILE_PHOTO: 'SoilProfilePhoto',
    SOURCE_EVIDENCE_INDEX: 'SourceEvidenceIndex',
    SURVEY: 'Survey',
    SURVEY_BOUNDARY: 'SurveyBoundary',
    TRENCH: 'Trench'
} as const;

export const KOREAN_FIELDWORK_CATEGORY_LABELS: Readonly<Record<string, string>> = {
    [KOREAN_FIELDWORK_CATEGORIES.AERIAL_MAP_LAYER]: '\ud56d\uacf5\uc0ac\uc9c4 \uc9c0\ub3c4',
    [KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG]: '\uc791\uc5c5\uc77c\uc9c0',
    [KOREAN_FIELDWORK_CATEGORIES.DRAWING]: '\ub3c4\uba74',
    [KOREAN_FIELDWORK_CATEGORIES.FEATURE]: '\uc720\uad6c',
    [KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP]: '\uad00\ub828 \uc720\uad6c',
    [KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT]: '\ud53c\ud2b8',
    [KOREAN_FIELDWORK_CATEGORIES.FIELD_RECORD_QUALITY_REVIEW]: '\uae30\ub85d \ubcf4\uc644 \uba54\ubaa8',
    [KOREAN_FIELDWORK_CATEGORIES.FIND]: '\uc720\ubb3c',
    [KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION]: '\uc720\ubb3c \uc77c\uad04',
    [KOREAN_FIELDWORK_CATEGORIES.LAYER]: '\ud1a0\uce35',
    [KOREAN_FIELDWORK_CATEGORIES.OPERATION]: '\uc870\uc0ac \uad6c\uc5ed \uae30\ub85d',
    [KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO]: '\ud39c\uba54\ubaa8',
    [KOREAN_FIELDWORK_CATEGORIES.PHOTO]: '\uc0ac\uc9c4',
    [KOREAN_FIELDWORK_CATEGORIES.PLACE]: '\uc720\uc801/\uc9c0\uc810',
    [KOREAN_FIELDWORK_CATEGORIES.SAMPLE]: '\uc2dc\ub8cc',
    [KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO]: '\ud1a0\uce35 \ub2e8\uba74 \uc0ac\uc9c4',
    [KOREAN_FIELDWORK_CATEGORIES.SOURCE_EVIDENCE_INDEX]: '\uc6d0\ubb38 \uadfc\uac70 \uc0c9\uc778',
    [KOREAN_FIELDWORK_CATEGORIES.SURVEY]: '\uc9c0\ud45c\uc870\uc0ac',
    [KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY]: '\uc870\uc0ac \uacbd\uacc4',
    [KOREAN_FIELDWORK_CATEGORIES.TRENCH]: '\ud2b8\ub80c\uce58'
};

export const KOREAN_FIELDWORK_CATEGORY_ORDER: readonly string[] = [
    KOREAN_FIELDWORK_CATEGORIES.OPERATION,
    KOREAN_FIELDWORK_CATEGORIES.TRENCH,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
    KOREAN_FIELDWORK_CATEGORIES.LAYER,
    KOREAN_FIELDWORK_CATEGORIES.SURVEY,
    KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY,
    KOREAN_FIELDWORK_CATEGORIES.FIND,
    KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION,
    KOREAN_FIELDWORK_CATEGORIES.SAMPLE,
    KOREAN_FIELDWORK_CATEGORIES.DRAWING,
    KOREAN_FIELDWORK_CATEGORIES.PHOTO,
    KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO,
    KOREAN_FIELDWORK_CATEGORIES.AERIAL_MAP_LAYER,
    KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO,
    KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG,
    KOREAN_FIELDWORK_CATEGORIES.FIELD_RECORD_QUALITY_REVIEW,
    KOREAN_FIELDWORK_CATEGORIES.SOURCE_EVIDENCE_INDEX,
    KOREAN_FIELDWORK_CATEGORIES.PLACE
];

export const KOREAN_FIELDWORK_FEATURE_WORKFLOW_CATEGORIES: readonly string[] = [
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT
];

export const KOREAN_FIELDWORK_FEATURE_SEGMENT_PARENT_CATEGORIES: readonly string[] = [
    KOREAN_FIELDWORK_CATEGORIES.OPERATION,
    KOREAN_FIELDWORK_CATEGORIES.TRENCH,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE
];

export const KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES: readonly string[] = [
    KOREAN_FIELDWORK_CATEGORIES.OPERATION,
    KOREAN_FIELDWORK_CATEGORIES.TRENCH,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
    KOREAN_FIELDWORK_CATEGORIES.LAYER
];

export const KOREAN_FIELDWORK_LAYER_TARGET_CATEGORIES: readonly string[] = [
    KOREAN_FIELDWORK_CATEGORIES.TRENCH,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT
];

export const KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_TARGET_CATEGORIES: readonly string[] = [
    KOREAN_FIELDWORK_CATEGORIES.OPERATION,
    KOREAN_FIELDWORK_CATEGORIES.TRENCH,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT
];

export const KOREAN_FIELDWORK_PHOTO_ATTACHMENT_TARGET_CATEGORIES: readonly string[] = [
    ...KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES,
    KOREAN_FIELDWORK_CATEGORIES.FIND,
    KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION,
    KOREAN_FIELDWORK_CATEGORIES.SAMPLE
];

export const KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORY_RANK: Readonly<Record<string, number>> = {
    [KOREAN_FIELDWORK_CATEGORIES.OPERATION]: 10,
    [KOREAN_FIELDWORK_CATEGORIES.TRENCH]: 20,
    [KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP]: 30,
    [KOREAN_FIELDWORK_CATEGORIES.FEATURE]: 40,
    [KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT]: 50,
    [KOREAN_FIELDWORK_CATEGORIES.LAYER]: 60,
    [KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION]: 70,
    [KOREAN_FIELDWORK_CATEGORIES.FIND]: 80,
    [KOREAN_FIELDWORK_CATEGORIES.SAMPLE]: 90,
    [KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO]: 100,
    [KOREAN_FIELDWORK_CATEGORIES.DRAWING]: 110,
    [KOREAN_FIELDWORK_CATEGORIES.PHOTO]: 120,
    [KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO]: 130,
    [KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG]: 140,
    [KOREAN_FIELDWORK_CATEGORIES.FIELD_RECORD_QUALITY_REVIEW]: 150,
    [KOREAN_FIELDWORK_CATEGORIES.SURVEY]: 160,
    [KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY]: 170
};

export const KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORIES: readonly string[] =
    Object.keys(KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORY_RANK);

export type KoreanFieldworkEvidenceBundleKey =
    'featureSegments'
    |'layers'
    |'photos'
    |'soilProfilePhotos'
    |'drawings'
    |'penMemos'
    |'finds'
    |'samples';

export interface KoreanFieldworkEvidenceDefinition {
    id: string;
    label: string;
    bundleKey: KoreanFieldworkEvidenceBundleKey;
    categories: readonly string[];
    createCategoryName?: string;
}

export interface KoreanFieldworkEvidenceChip {
    id: string;
    label: string;
    count: number;
    tone: 'filled'|'empty';
    documents: Document[];
    createCategoryName?: string;
}

export const KOREAN_FIELDWORK_EVIDENCE_DEFINITIONS: readonly KoreanFieldworkEvidenceDefinition[] = [
    {
        id: 'featureSegments',
        label: '\ud53c\ud2b8',
        bundleKey: 'featureSegments',
        categories: KOREAN_FIELDWORK_FEATURE_SEGMENT_PARENT_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT
    },
    {
        id: 'layers',
        label: '\ud1a0\uc0c9 \uba54\ubaa8',
        bundleKey: 'layers',
        categories: KOREAN_FIELDWORK_LAYER_TARGET_CATEGORIES
    },
    {
        id: 'photos',
        label: '\uc0ac\uc9c4',
        bundleKey: 'photos',
        categories: KOREAN_FIELDWORK_PHOTO_ATTACHMENT_TARGET_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.PHOTO
    },
    {
        id: 'soilProfilePhotos',
        label: '\ud1a0\uce35\uc0ac\uc9c4',
        bundleKey: 'soilProfilePhotos',
        categories: KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_TARGET_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO
    },
    {
        id: 'drawings',
        label: '\ub3c4\uba74',
        bundleKey: 'drawings',
        categories: KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.DRAWING
    },
    {
        id: 'sketches',
        label: '\uc57d\ub3c4\u00b7\uc2a4\ucf00\uce58',
        bundleKey: 'penMemos',
        categories: KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO
    },
    {
        id: 'finds',
        label: '\uc720\ubb3c',
        bundleKey: 'finds',
        categories: KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.FIND
    },
    {
        id: 'samples',
        label: '\uc2dc\ub8cc',
        bundleKey: 'samples',
        categories: KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES,
        createCategoryName: KOREAN_FIELDWORK_CATEGORIES.SAMPLE
    }
];


export function getKoreanFieldworkCategoryLabel(categoryName: string): string {

    return KOREAN_FIELDWORK_CATEGORY_LABELS[categoryName] ?? categoryName;
}


export function getKoreanFieldworkReportHandoffCategoryRank(categoryName: string): number {

    return KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORY_RANK[categoryName] ?? Number.MAX_SAFE_INTEGER;
}


export function isKoreanFieldworkReportHandoffCategory(categoryName: string): boolean {

    return KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORY_RANK[categoryName] !== undefined;
}


export function getKoreanFieldworkEvidenceDefinitionsForCategory(
        categoryName: string
): readonly KoreanFieldworkEvidenceDefinition[] {

    return KOREAN_FIELDWORK_EVIDENCE_DEFINITIONS.filter(definition =>
        definition.categories.includes(categoryName)
    );
}


export function getKoreanFieldworkEvidenceChips(document: Document,
                                                documents: Document[]): KoreanFieldworkEvidenceChip[] {

    const definitions = getKoreanFieldworkEvidenceDefinitionsForCategory(document.resource.category);
    if (definitions.length === 0) return [];

    const bundle = buildEvidenceBundle(document, documents);

    return definitions.flatMap(definition => {
        const evidenceDocuments = getEvidenceDocuments(bundle, definition.bundleKey);
        const count = evidenceDocuments.length;
        if (count === 0 && !definition.createCategoryName) return [];

        return [{
            id: definition.id,
            label: definition.label,
            count,
            tone: count > 0 ? 'filled' as const : 'empty' as const,
            documents: evidenceDocuments,
            createCategoryName: definition.createCategoryName
        }];
    });
}


function getEvidenceDocuments(bundle: EvidenceBundle,
                              bundleKey: KoreanFieldworkEvidenceBundleKey): Document[] {

    return bundle[bundleKey];
}
