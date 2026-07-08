import { Document } from '../model/document/document';
import { buildEvidenceBundle, EvidenceBundle } from './korean-fieldwork-readiness';
import koreanFieldworkConfig from '../../config/Config-KoreanFieldwork.json';
import libraryValuelistsLanguageProjectsKo from '../../config/Library/Valuelists/Language.projects.ko.json';


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

export const KOREAN_FIELDWORK_RELATION_LABELS: Readonly<Record<string, string>> = {
    depicts: '\ub300\uc0c1',
    isCarriedOutOn: '\uc870\uc0ac \ub300\uc0c1',
    isChildOf: '\uc0c1\uc704 \uae30\ub85d',
    isDepictedIn: '\uc5f0\uacb0 \uc790\ub8cc',
    isMapLayerOf: '\uc9c0\ub3c4 \ub300\uc0c1',
    isPresentIn: '\uc18c\uc7ac \uae30\ub85d',
    isRecordedIn: '\uc870\uc0ac \uae30\ub85d',
    liesWithin: '\uc0c1\uc704 \uae30\ub85d',
    resultsIn: '\uc0dd\uc131 \uae30\ub85d'
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

export const KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS: readonly string[] = [
    'preInvestigationPhotoTaken',
    'inProgressPhotoTaken',
    'soilProfilePhotoLinked',
    'measuredDrawingCompleted',
    'preRecoveryFindPhotoTaken',
    'findsRecovered',
    'samplesCollected',
    'penMemoReviewed',
    'completionPhotoTaken'
];

export const KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS: readonly string[] = [
    'trenchSoilCleaned',
    'trenchFeatureChecked',
    'trenchPitOpened',
    'trenchPitProfileDrawn',
    'trenchOverviewPhotoTaken',
    'trenchObliquePhotoTaken',
    'soilProfilePhotoLinked',
    'inProgressPhotoTaken',
    'penMemoReviewed'
];

export const KOREAN_FIELDWORK_FEATURE_INVESTIGATION_CHECKLIST_LABELS: Readonly<Record<string, string>> = {
    preInvestigationPhotoTaken: '\uc870\uc0ac \uc804 \uc0ac\uc9c4',
    inProgressPhotoTaken: '\uc870\uc0ac \uc911 \uc0ac\uc9c4',
    soilProfilePhotoLinked: '\ud1a0\uce35\uc0ac\uc9c4',
    measuredDrawingCompleted: '\uc2e4\uce21 \uc644\ub8cc',
    preRecoveryFindPhotoTaken: '\uc218\uc2b5 \uc804 \uc720\ubb3c\uc0ac\uc9c4',
    findsRecovered: '\uc720\ubb3c \uc218\uc2b5',
    samplesCollected: '\uc2dc\ub8cc \ucc44\ucde8',
    penMemoReviewed: '\ud39c\uba54\ubaa8 \uac80\ud1a0',
    completionPhotoTaken: '\uc870\uc0ac \uc644\ub8cc \uc0ac\uc9c4',
    trenchSoilCleaned: '\ud1a0\uce35 \uc815\ub9ac',
    trenchFeatureChecked: '\uc720\uad6c \ud655\uc778',
    trenchPitOpened: '\ud53c\ud2b8 \uc870\uc0ac',
    trenchPitProfileDrawn: '\ud53c\ud2b8 \ud1a0\uce35\ub3c4',
    trenchOverviewPhotoTaken: '\uc815\ubc29\ud5a5 \uc0ac\uc9c4',
    trenchObliquePhotoTaken: '\uc0ac\uc120 \uc0ac\uc9c4'
};

export const KOREAN_FIELDWORK_RECORD_VALUE_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    featureRecordingStatus: {
        candidate: '\uc870\uc0ac \uc804',
        investigating: '\uc870\uc0ac \uc911',
        confirmed: '\uc644\ub8cc'
    },
    recordCreationTiming: {
        sameDayFieldRecord: '\ub2f9\uc77c \uae30\ub85d',
        duringFieldwork: '\ucd94\uac00 \uae30\ub85d',
        fieldOnlyObservation: '\ud604\uc7a5 \ucd94\uc815',
        handoverStage: '\uc778\uacc4 \ub2e8\uacc4',
        reportStageGenerated: '\ubcf4\uace0 \ub2e8\uacc4',
        postExcavationDerived: '\uc815\ub9ac \ud30c\uc0dd'
    },
    fieldRecordQuality: {
        immediateRecording: '\ud604\uc7a5 \uae30\ub85d',
        observationInterpretationSeparated: '\ud574\uc11d',
        correctionNeeded: '\ubcf4\uc644 \uba54\ubaa8'
    },
    verificationState: {
        observedInField: '\ud604\uc7a5 \ud655\uc778',
        candidate: '\ud655\uc778 \ud6c4\ubcf4',
        inferred: '\ucd94\uc815',
        conflictingEvidence: '\uadfc\uac70 \ucda9\ub3cc',
        notObserved: '\ubbf8\ud655\uc778',
        needsRecheck: '\uc7ac\uac80\ud1a0',
        pendingDecision: '\ucd94\uac00 \ud655\uc778'
    },
    period: {
        undated: '\uc2dc\uae30\ubbf8\uc0c1',
        paleolithic: '\uad6c\uc11d\uae30',
        neolithic: '\uc2e0\uc11d\uae30',
        bronzeAge: '\uccad\ub3d9\uae30',
        earlyIronAge: '\ucd08\uae30\ucca0\uae30',
        protoThreeKingdoms: '\uc6d0\uc0bc\uad6d',
        threeKingdoms: '\uc0bc\uad6d',
        unifiedSilla: '\ud1b5\uc77c\uc2e0\ub77c',
        goryeo: '\uace0\ub824',
        joseon: '\uc870\uc120',
        modernContemporary: '\uadfc\ud604\ub300'
    },
    geometrySource: {
        tabletSketch: '\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58',
        gpsApproximate: 'GPS \ub300\ub7b5 \uc704\uce58',
        aerialLayerTrace: '\ub4dc\ub860 \ubc30\uacbd \ucd94\uc801',
        drawnOnBoundarySketch: '\uacbd\uacc4\ub3c4 \uc704 \uc57d\ub3c4',
        importedShp: 'SHP \uac00\uc838\uc624\uae30',
        importedDxf: 'DXF \uac00\uc838\uc624\uae30',
        surveyedFinal: '\uc815\uc2dd \uce21\ub7c9',
        finalCad: '\ucd5c\uc885 CAD'
    },
    geometryConfidence: {
        rough: '\ub300\ub7b5',
        fieldSketch: '\ud604\uc7a5 \uc2a4\ucf00\uce58',
        aerialAligned: '\ub4dc\ub860 \ubc30\uacbd \ub9de\ucda4',
        surveyed: '\uce21\ub7c9 \ubc18\uc601',
        final: '\ucd5c\uc885'
    },
    featureGeometryEditStatus: {
        roughSketch: '\ub300\ub7b5 \uc2a4\ucf00\uce58',
        needsAerialAlignment: '\ubcf4\uc815 \ud544\uc694',
        adjustedToAerialLayer: '\ub4dc\ub860 \ubc30\uacbd \ub9de\ucda4',
        adjustedToSurveyLine: '\uce21\ub7c9\uc120 \ub9de\ucda4',
        finalAccepted: '\ucd5c\uc885 \ud655\uc815'
    },
    surveyBoundarySource: {
        manualBasemapTrace: '\ubc30\uacbd\uc9c0\ub3c4 \uc218\ub3d9 \ucd94\uc801',
        gpsWalkover: 'GPS \ub2f5\uc0ac \uae30\ub85d',
        csvImport: 'CSV \uac00\uc838\uc624\uae30',
        geoJsonImport: 'GeoJSON \uac00\uc838\uc624\uae30',
        shpImport: 'SHP \uac00\uc838\uc624\uae30',
        dxfImport: 'DXF \uac00\uc838\uc624\uae30',
        officialSurvey: '\uc815\uc2dd \uce21\ub7c9',
        finalCad: '\ucd5c\uc885 CAD'
    },
    surveyBoundaryAccuracy: {
        visualReference: '\ucc38\uace0\uc6a9',
        approximateGps: 'GPS \ub300\ub7b5',
        importedReference: '\uac00\uc838\uc628 \ucc38\uace0\uc790\ub8cc',
        surveyed: '\uce21\ub7c9 \ubc18\uc601',
        final: '\ucd5c\uc885'
    }
};

const KOREAN_FIELDWORK_FORM_VALUELISTS = getKoreanFieldworkFormValuelists();
const KOREAN_FIELDWORK_PROJECT_VALUELIST_LANGUAGE =
    libraryValuelistsLanguageProjectsKo as Record<string, { values?: Record<string, { label?: string }> }>;

const KOREAN_FIELDWORK_FEATURE_INVESTIGATION_CHECKLIST_ORDER: readonly string[] = Array.from(new Set([
    ...KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS,
    ...KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS
]));

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


export function getKoreanFieldworkRelationLabel(relationName: string): string {

    return KOREAN_FIELDWORK_RELATION_LABELS[relationName] ?? relationName;
}


export function getKoreanFieldworkReportHandoffCategoryRank(categoryName: string): number {

    return KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORY_RANK[categoryName] ?? Number.MAX_SAFE_INTEGER;
}


export function getKoreanFieldworkChecklistSteps(categoryName: string,
                                                 investigationMode?: string): readonly string[] {

    if (categoryName === KOREAN_FIELDWORK_CATEGORIES.TRENCH && investigationMode === 'trialTrench') {
        return KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS;
    }

    return KOREAN_FIELDWORK_FEATURE_WORKFLOW_CATEGORIES.includes(categoryName)
        ? KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS
        : [];
}


export function getKoreanFieldworkFeatureInvestigationChecklistLabel(value: string): string {

    return KOREAN_FIELDWORK_FEATURE_INVESTIGATION_CHECKLIST_LABELS[value] ?? value;
}


export function getKoreanFieldworkFeatureInvestigationChecklistLabels(value: unknown): string[] {

    return getKoreanFieldworkFeatureInvestigationChecklistValues(value)
        .map(getKoreanFieldworkFeatureInvestigationChecklistLabel);
}


export function getKoreanFieldworkFeatureInvestigationChecklistSummary(value: unknown): string|undefined {

    const labels = getKoreanFieldworkFeatureInvestigationChecklistLabels(value);

    return labels.length > 0 ? labels.join(' \u00b7 ') : undefined;
}


export function getKoreanFieldworkRecordValueLabel(fieldName: string, value: string): string {

    return KOREAN_FIELDWORK_RECORD_VALUE_LABELS[fieldName]?.[value]
        ?? getKoreanFieldworkProjectValuelistValueLabel(fieldName, value)
        ?? value;
}


export function isKoreanFieldworkRecordValuelistField(fieldName: string): boolean {

    return KOREAN_FIELDWORK_RECORD_VALUE_LABELS[fieldName] !== undefined
        || KOREAN_FIELDWORK_FORM_VALUELISTS[fieldName] !== undefined;
}


export function getKoreanFieldworkRecordValueLabels(fieldName: string, value: unknown): string[] {

    return getStringListValues(value)
        .map(item => getKoreanFieldworkRecordValueLabel(fieldName, item));
}


export function getKoreanFieldworkRecordFieldValueSummary(fieldName: string, value: unknown): string|undefined {

    const labels = getKoreanFieldworkRecordValueLabels(fieldName, value);

    return labels.length > 0 ? labels.join(' \u00b7 ') : undefined;
}


export function getKoreanFieldworkFeaturePeriodSummary(value: unknown): string|undefined {

    const labels = getKoreanFieldworkPeriodValues(value)
        .map(period => getKoreanFieldworkRecordValueLabel('period', period));

    return labels.length > 0 ? labels.join('~') : undefined;
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


function getKoreanFieldworkFeatureInvestigationChecklistValues(value: unknown): string[] {

    const rawValues = getStringListValues(value);
    const seen = new Set<string>();
    const uniqueValues = rawValues.filter(item => {
        if (seen.has(item)) return false;

        seen.add(item);
        return true;
    });
    const knownValues = KOREAN_FIELDWORK_FEATURE_INVESTIGATION_CHECKLIST_ORDER
        .filter(item => seen.has(item));
    const unknownValues = uniqueValues.filter(item =>
        !KOREAN_FIELDWORK_FEATURE_INVESTIGATION_CHECKLIST_ORDER.includes(item)
    );

    return [...knownValues, ...unknownValues];
}


function getStringListValues(value: unknown): string[] {

    if (value === undefined || value === null) return [];

    if (Array.isArray(value)) {
        return value.flatMap(getStringListValues);
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.inputValue === 'string') return getStringListValues(record.inputValue);
        if (typeof record.value === 'string') return getStringListValues(record.value);

        return [];
    }

    const text = String(value).trim();
    if (!text || text === '[]') return [];

    const parsedValue = parseJsonValue(text);
    if (parsedValue !== undefined) return getStringListValues(parsedValue);

    return text.split(/\r?\n|,\s*/)
        .map(line => line.trim())
        .filter(line => !!line);
}


function getKoreanFieldworkFormValuelists(): Record<string, string> {

    const forms = (koreanFieldworkConfig as {
        forms?: Record<string, { valuelists?: Record<string, string> }>
    }).forms ?? {};

    return Object.values(forms).reduce((result, form) => {
        Object.entries(form.valuelists ?? {}).forEach(([fieldName, valuelistId]) => {
            if (!result[fieldName]) result[fieldName] = valuelistId;
        });

        return result;
    }, {} as Record<string, string>);
}


function getKoreanFieldworkProjectValuelistValueLabel(fieldName: string, value: string): string|undefined {

    const valuelistId = KOREAN_FIELDWORK_FORM_VALUELISTS[fieldName];
    const label = valuelistId
        ? KOREAN_FIELDWORK_PROJECT_VALUELIST_LANGUAGE[valuelistId]?.values?.[value]?.label
        : undefined;

    return label && label.trim() ? label : undefined;
}


function getKoreanFieldworkPeriodValues(value: unknown): string[] {

    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        return trimmedValue ? [trimmedValue] : [];
    }

    if (value === undefined || value === null || Array.isArray(value) || typeof value !== 'object') {
        return [];
    }

    const record = value as Record<string, unknown>;
    const values = [record.value, record.endValue]
        .map(entry => typeof entry === 'string' ? entry.trim() : '')
        .filter(entry => entry.length > 0);

    return values.filter((entry, index) => values.indexOf(entry) === index);
}


function parseJsonValue(value: string): unknown|undefined {

    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}
