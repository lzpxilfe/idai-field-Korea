import { Document } from '../model/document/document';
import { buildEvidenceBundle, EvidenceBundle } from './korean-fieldwork-readiness';


export type KoreanFieldworkReportHandoffTone = 'ready'|'review';

export interface KoreanFieldworkReportHandoffItem {
    documentId: string;
    category: string;
    categoryLabel: string;
    identifier: string;
    title: string;
    summary: string;
    details: string[];
    evidenceLabel: string;
    issueLabel: string;
    evidenceCount: number;
    issueCount: number;
    copyText: string;
    tone: KoreanFieldworkReportHandoffTone;
}

export interface KoreanFieldworkReportHandoff {
    items: KoreanFieldworkReportHandoffItem[];
    readyCount: number;
    reviewCount: number;
    issueCount: number;
    copyAllText: string;
}

interface DetailFieldDefinition {
    label: string;
    fields: string[];
}

interface EvidenceCountDefinition {
    label: string;
    getCount: (bundle: EvidenceBundle) => number;
}

const KO = {
    ALL_READY: '\ubc14\ub85c \uc778\uc6a9 \uac00\ub2a5',
    CATEGORY: '\uc720\ud615',
    DETAILS: '\uae30\ub85d',
    EVIDENCE: '\uc790\ub8cc',
    ISSUES: '\ud655\uc778',
    NO_DETAILS: '\uc138\ubd80 \uae30\ub85d \ubcf4\uac15 \ud544\uc694',
    NO_EVIDENCE: '\uc5f0\uacb0 \uc790\ub8cc \uc5c6\uc74c',
    NO_ISSUES: '\ud655\uc778 \uc0ac\ud56d \uc5c6\uc74c',
    RECORD: '\uae30\ub85d',
    REVIEW_NEEDED: '\ubcf4\uc644 \ud544\uc694',
    SUMMARY: '\uc694\uc57d'
};

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
    DailyLog: '\uc791\uc5c5\uc77c\uc9c0',
    Drawing: '\ub3c4\uba74',
    Feature: '\uc720\uad6c',
    FeatureGroup: '\uad00\ub828 \uc720\uad6c',
    FeatureSegment: '\ud53c\ud2b8',
    FieldRecordQualityReview: '\uae30\ub85d \ubcf4\uc644 \uba54\ubaa8',
    Find: '\uc720\ubb3c',
    FindCollection: '\uc720\ubb3c \uc77c\uad04',
    Layer: '\ud1a0\uce35',
    Operation: '\uc870\uc0ac \uad6c\uc5ed',
    PenMemo: '\ud604\uc7a5 \uba54\ubaa8',
    Photo: '\uc0ac\uc9c4',
    Sample: '\uc2dc\ub8cc',
    SoilProfilePhoto: '\ud1a0\uce35\uc0ac\uc9c4',
    Survey: '\uc9c0\ud45c\uc870\uc0ac',
    SurveyBoundary: '\uc870\uc0ac \uacbd\uacc4',
    Trench: '\ud2b8\ub80c\uce58'
};

const REPORT_HANDOFF_CATEGORY_RANK: Readonly<Record<string, number>> = {
    Operation: 10,
    Trench: 20,
    FeatureGroup: 30,
    Feature: 40,
    FeatureSegment: 50,
    Layer: 60,
    FindCollection: 70,
    Find: 80,
    Sample: 90,
    SoilProfilePhoto: 100,
    Drawing: 110,
    Photo: 120,
    PenMemo: 130,
    DailyLog: 140,
    FieldRecordQualityReview: 150,
    Survey: 160,
    SurveyBoundary: 170
};

const REPORT_HANDOFF_CATEGORIES = new Set(Object.keys(REPORT_HANDOFF_CATEGORY_RANK));

const DETAIL_FIELDS: DetailFieldDefinition[] = [
    {
        label: '\uc77c\uc790',
        fields: ['date', 'fieldworkDate', 'workDate']
    },
    {
        label: '\ubcf4\uace0\uc11c \ubc88\ud638',
        fields: ['reportIdentifier']
    },
    {
        label: '\uc131\uaca9',
        fields: ['featureType', 'featureInterpretationType']
    },
    {
        label: '\uc2dc\ub300',
        fields: ['period', 'dating']
    },
    {
        label: '\uc870\uc0ac \uc0c1\ud0dc',
        fields: ['featureRecordingStatus', 'recordCreationTiming', 'fieldRecordQuality']
    },
    {
        label: '\uc704\uce58/\ub3c4\uba74',
        fields: [
            'geometrySource',
            'geometryConfidence',
            'featureGeometryEditStatus',
            'featureGeometryRevisionNote',
            'featureLocationSketch',
            'surveyBoundaryAccuracy',
            'surveyBoundarySource'
        ]
    },
    {
        label: '\ud1a0\uce35',
        fields: [
            'layerSequenceNumber',
            'layerSequenceMeaning',
            'soilColorAssistCandidates',
            'soilColorAssistStatus',
            'featureSoilProfilePhotoCount'
        ]
    },
    {
        label: '\uc0ac\uc9c4/\uc790\ub8cc',
        fields: [
            'fieldworkPhotoCaption',
            'fieldworkPhotoUri',
            'soilProfilePhotoUri',
            'imageUri',
            'fileUri',
            'fieldworkPhotoQuality',
            'soilProfilePhotoQuality',
            'mediaEvidenceRole',
            'digitalSourcePreservation',
            'fieldworkImageUploadStatus'
        ]
    },
    {
        label: '\uba54\ubaa8',
        fields: ['description', 'penMemoReviewedTranscript', 'penMemoAutoTranscript']
    }
];

const SUMMARY_FIELDS = [
    'shortDescription',
    'description',
    'penMemoReviewedTranscript',
    'penMemoAutoTranscript',
    'featureGeometryRevisionNote',
    'featureLocationSketch',
    'surveyBoundaryNote',
    'reportPreparationSourceText',
    'reportEditorialIssueText'
];

const EVIDENCE_COUNTS: EvidenceCountDefinition[] = [
    {
        label: '\uc0ac\uc9c4',
        getCount: bundle => bundle.photos.length
    },
    {
        label: '\ud1a0\uce35\uc0ac\uc9c4',
        getCount: bundle => bundle.soilProfilePhotos.length
    },
    {
        label: '\ub3c4\uba74',
        getCount: bundle => bundle.drawings.length
    },
    {
        label: '\ud604\uc7a5\uba54\ubaa8',
        getCount: bundle => bundle.penMemos.length
    },
    {
        label: '\uc720\ubb3c',
        getCount: bundle => bundle.finds.length
    },
    {
        label: '\uc2dc\ub8cc',
        getCount: bundle => bundle.samples.length
    },
    {
        label: '\ud53c\ud2b8',
        getCount: bundle => bundle.featureSegments.length
    },
    {
        label: '\ud1a0\uce35',
        getCount: bundle => bundle.layers.length
    }
];


export function makeKoreanFieldworkReportHandoff(documents: Document[]): KoreanFieldworkReportHandoff {

    const items = documents
        .filter(isReportHandoffDocument)
        .map(document => makeReportHandoffItem(document, documents))
        .sort(compareReportHandoffItems);

    return {
        items,
        readyCount: items.filter(item => item.tone === 'ready').length,
        reviewCount: items.filter(item => item.tone === 'review').length,
        issueCount: items.reduce((count, item) => count + item.issueCount, 0),
        copyAllText: items.map(item => item.copyText).join('\n\n')
    };
}


function makeReportHandoffItem(document: Document, documents: Document[]): KoreanFieldworkReportHandoffItem {

    const bundle = buildEvidenceBundle(document, documents);
    const categoryLabel = getCategoryLabel(document.resource.category);
    const identifier = getDocumentIdentifier(document);
    const summary = getSummary(document, categoryLabel);
    const details = getDetailLines(document);
    const evidenceLabel = getEvidenceLabel(bundle);
    const issueCount = bundle.issues.length;
    const issueLabel = issueCount > 0
        ? `${KO.REVIEW_NEEDED} ${issueCount}`
        : KO.NO_ISSUES;
    const title = `${categoryLabel} ${identifier}`;
    const tone: KoreanFieldworkReportHandoffTone = issueCount > 0 ? 'review' : 'ready';

    return {
        documentId: document.resource.id,
        category: document.resource.category,
        categoryLabel,
        identifier,
        title,
        summary,
        details,
        evidenceLabel,
        issueLabel,
        evidenceCount: getEvidenceCount(bundle),
        issueCount,
        copyText: makeCopyText({
            categoryLabel,
            details,
            evidenceLabel,
            identifier,
            issueLabel,
            summary
        }),
        tone
    };
}


function makeCopyText({
    categoryLabel,
    details,
    evidenceLabel,
    identifier,
    issueLabel,
    summary
}: {
    categoryLabel: string;
    details: string[];
    evidenceLabel: string;
    identifier: string;
    issueLabel: string;
    summary: string;
}): string {

    return [
        `[${categoryLabel}] ${identifier}`,
        `${KO.SUMMARY}: ${summary}`,
        `${KO.DETAILS}: ${details.length > 0 ? details.join(' / ') : KO.NO_DETAILS}`,
        `${KO.EVIDENCE}: ${evidenceLabel}`,
        `${KO.ISSUES}: ${issueLabel}`
    ].join('\n');
}


function isReportHandoffDocument(document: Document): boolean {

    return !!document?.resource?.id
        && REPORT_HANDOFF_CATEGORIES.has(document.resource.category);
}


function getSummary(document: Document, categoryLabel: string): string {

    for (const fieldName of SUMMARY_FIELDS) {
        const value = getPrintableValue(document.resource[fieldName]);
        if (value) return truncate(value, 180);
    }

    return `${categoryLabel} ${KO.RECORD}`;
}


function getDetailLines(document: Document): string[] {

    return DETAIL_FIELDS
        .map(definition => getDetailLine(document, definition))
        .filter((line): line is string => line !== undefined)
        .slice(0, 6);
}


function getDetailLine(document: Document, definition: DetailFieldDefinition): string|undefined {

    const values = definition.fields
        .map(fieldName => getPrintableValue(document.resource[fieldName]))
        .filter((value): value is string => !!value);

    if (values.length === 0) return undefined;

    return `${definition.label}: ${values.join(', ')}`;
}


function getEvidenceLabel(bundle: EvidenceBundle): string {

    const labels = EVIDENCE_COUNTS
        .map(definition => {
            const count = definition.getCount(bundle);
            return count > 0 ? `${definition.label} ${count}` : undefined;
        })
        .filter((label): label is string => label !== undefined);

    return labels.length > 0 ? labels.join(', ') : KO.NO_EVIDENCE;
}


function getEvidenceCount(bundle: EvidenceBundle): number {

    return EVIDENCE_COUNTS.reduce((count, definition) => count + definition.getCount(bundle), 0);
}


function getDocumentIdentifier(document: Document): string {

    return getPrintableValue(document.resource.reportIdentifier)
        ?? getPrintableValue(document.resource.identifier)
        ?? getPrintableValue(document.resource.id)
        ?? KO.RECORD;
}


function getCategoryLabel(categoryName: string): string {

    return CATEGORY_LABELS[categoryName] ?? categoryName ?? KO.CATEGORY;
}


function getPrintableValue(value: any): string|undefined {

    if (value === undefined || value === null) return undefined;

    if (Array.isArray(value)) {
        const values = value
            .map(getPrintableValue)
            .filter((item): item is string => !!item);

        return values.length > 0 ? values.join(', ') : undefined;
    }

    if (typeof value === 'object') {
        if (typeof value.inputValue === 'string') return value.inputValue.trim() || undefined;
        if (typeof value.value === 'string') return value.value.trim() || undefined;
        return undefined;
    }

    const text = String(value).replace(/\s+/g, ' ').trim();

    return text.length > 0 ? text : undefined;
}


function compareReportHandoffItems(
        itemA: KoreanFieldworkReportHandoffItem,
        itemB: KoreanFieldworkReportHandoffItem
): number {

    const rankA = REPORT_HANDOFF_CATEGORY_RANK[itemA.category] ?? Number.MAX_SAFE_INTEGER;
    const rankB = REPORT_HANDOFF_CATEGORY_RANK[itemB.category] ?? Number.MAX_SAFE_INTEGER;

    return rankA - rankB
        || itemA.identifier.localeCompare(itemB.identifier, 'ko')
        || itemA.documentId.localeCompare(itemB.documentId);
}


function truncate(value: string, maxLength: number): string {

    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}
