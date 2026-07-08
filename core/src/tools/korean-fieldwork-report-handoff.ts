import { Document } from '../model/document/document';
import { NewResource } from '../model/document/resource';
import {
    buildEvidenceBundle,
    EvidenceBundle,
    getKoreanFieldworkCloseoutReviewIssues,
    KoreanFieldworkReadinessIssue
} from './korean-fieldwork-readiness';
import {
    getKoreanFieldworkCategoryLabel,
    getKoreanFieldworkReportHandoffCategoryRank,
    getKoreanFieldworkRelationLabel,
    isKoreanFieldworkReportHandoffCategory
} from './korean-fieldwork-record-contract';


export type KoreanFieldworkReportHandoffTone = 'ready'|'review';

export interface KoreanFieldworkReportHandoffItem {
    documentId: string;
    category: string;
    categoryLabel: string;
    identifier: string;
    title: string;
    summary: string;
    details: string[];
    relationDetails: string[];
    evidenceLabel: string;
    evidenceDetails: string[];
    issueLabel: string;
    issueDetails: string[];
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

export type KoreanFieldworkReportHandoffValidationStatus = 'not-applicable'|'ready'|'review';

export interface KoreanFieldworkReportHandoffValidation {
    status: KoreanFieldworkReportHandoffValidationStatus;
    documentId?: string;
    category?: string;
    categoryLabel?: string;
    identifier?: string;
    isReportHandoffCategory: boolean;
    isCopyable: boolean;
    message: string;
    messages: string[];
    relatedFields: string[];
    evidenceCount: number;
    issueCount: number;
    copyText?: string;
}

export function normalizeKoreanFieldworkHwpPlainText(text: string): string {

    const normalized = (text ?? '')
        .normalize('NFC')
        .replace(/\u00a0/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return normalized.replace(/\n/g, '\r\n');
}

interface DetailFieldDefinition {
    label: string;
    fields: string[];
}

interface EvidenceCountDefinition {
    label: string;
    getCount: (bundle: EvidenceBundle) => number;
}

interface EvidenceDetailDefinition {
    label: string;
    getDocuments: (bundle: EvidenceBundle) => Document[];
    getSummary?: (document: Document) => string|undefined;
    fields: string[];
}

const KO = {
    ALL_READY: '\ubc14\ub85c \uc778\uc6a9 \uac00\ub2a5',
    CATEGORY: '\uc720\ud615',
    CHECKED_FOR_DESKTOP: '\ub370\uc2a4\ud06c\ud1b1 \ubcf4\uace0\uc11c \ud0ed \uc804\ub2ec \ud655\uc778',
    DETAILS: '\uae30\ub85d',
    EVIDENCE: '\uc790\ub8cc',
    EVIDENCE_DETAILS: '\uc790\ub8cc \uc0c1\uc138',
    ISSUES: '\ud655\uc778',
    ISSUE_DETAILS: '\ud655\uc778 \uc0c1\uc138',
    RELATIONS: '\uc5f0\uacb0',
    NO_DETAILS: '\uc138\ubd80 \uae30\ub85d \ubcf4\uac15 \ud544\uc694',
    NO_EVIDENCE: '\uc5f0\uacb0 \uc790\ub8cc \uc5c6\uc74c',
    NO_ISSUES: '\ud655\uc778 \uc0ac\ud56d \uc5c6\uc74c',
    NOT_REPORT_HANDOFF: '\ub370\uc2a4\ud06c\ud1b1 \ubcf4\uace0\uc11c \ubcf5\uc0ac \ub300\uc0c1 \uae30\ub85d\uc774 \uc544\ub2d9\ub2c8\ub2e4',
    RECORD: '\uae30\ub85d',
    REPORT_HANDOFF_READY: '\ub370\uc2a4\ud06c\ud1b1 HWP \ubcf5\uc0ac \ube14\ub85d \uc900\ube44\ub428',
    REVIEW_NEEDED: '\ubcf4\uc644 \ud544\uc694',
    SUMMARY: '\uc694\uc57d'
};

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

const RELATION_REQUIRED_CATEGORIES = [
    'Drawing',
    'Feature',
    'FeatureGroup',
    'FeatureSegment',
    'FieldRecordQualityReview',
    'Find',
    'FindCollection',
    'Layer',
    'PenMemo',
    'Photo',
    'Sample',
    'SoilProfilePhoto',
    'Trench'
];

const MEDIA_URI_FIELDS: Readonly<Record<string, string[]>> = {
    Drawing: ['fileUri', 'imageUri', 'fieldworkPhotoUri', 'drawingSketchStrokes'],
    Photo: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
    SoilProfilePhoto: ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri']
};

const SOIL_COLOR_SAMPLE_SOURCE_PATTERN =
    /^\uc0ac\uc9c4 (?:\uc911\uc559\ubd80|\uc120\ud0dd \uc9c0\uc810 \d{1,3}%\/\d{1,3}%) \ud3c9\uade0 RGB \d{1,3}\/\d{1,3}\/\d{1,3}$/;
const RGB_SAMPLE_LOCATION_PATTERN = /RGB\s+(\d{1,3})\/(\d{1,3})\/(\d{1,3})\s+@\s*(\d{1,3})%\/(\d{1,3})%/i;
const SOIL_COLOR_ROW_NUMBER_PATTERN = /^\s*(\d+)\s*:/;

const PEN_MEMO_CONTENT_FIELDS = [
    'description',
    'penMemoAutoTranscript',
    'penMemoReviewedTranscript',
    'penMemoStrokes'
];

const RELATION_DETAIL_ORDER = [
    'liesWithin',
    'depicts',
    'isRecordedIn',
    'isMapLayerOf',
    'isDepictedIn',
    'isPresentIn',
    'isCarriedOutOn',
    'resultsIn'
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

const EVIDENCE_DETAILS: EvidenceDetailDefinition[] = [
    {
        label: '\uc0ac\uc9c4',
        getDocuments: bundle => bundle.photos,
        fields: ['fieldworkPhotoCaption', 'fieldworkPhotoUri', 'imageUri', 'fileUri', 'shortDescription']
    },
    {
        label: '\ud1a0\uce35\uc0ac\uc9c4',
        getDocuments: bundle => bundle.soilProfilePhotos,
        getSummary: getSoilProfilePhotoEvidenceSummary,
        fields: [
            'soilProfilePhotoUri',
            'soilProfileColorSwatches',
            'soilColorAssistCandidates',
            'soilProfileColorNote',
            'soilProfileCaptureNote',
            'shortDescription'
        ]
    },
    {
        label: '\ub3c4\uba74',
        getDocuments: bundle => bundle.drawings,
        fields: ['shortDescription', 'fileUri', 'imageUri', 'fieldworkPhotoUri']
    },
    {
        label: '\ud604\uc7a5\uba54\ubaa8',
        getDocuments: bundle => bundle.penMemos,
        getSummary: getPenMemoEvidenceSummary,
        fields: ['penMemoReviewedTranscript', 'penMemoAutoTranscript', 'description', 'shortDescription']
    },
    {
        label: '\uc720\ubb3c',
        getDocuments: bundle => bundle.finds,
        fields: ['shortDescription', 'description', 'findSpotDescription', 'artifactLabelRegisterLink']
    },
    {
        label: '\uc2dc\ub8cc',
        getDocuments: bundle => bundle.samples,
        fields: ['shortDescription', 'description', 'samplePurpose']
    },
    {
        label: '\ud53c\ud2b8',
        getDocuments: bundle => bundle.featureSegments,
        fields: ['shortDescription', 'description', 'featureGeometryRevisionNote']
    },
    {
        label: '\ud1a0\uce35',
        getDocuments: bundle => bundle.layers,
        fields: ['shortDescription', 'description', 'soilColorMunsellManual', 'soilColorAssistCandidates']
    }
];


export function validateKoreanFieldworkReportHandoffCandidate(
        resource: NewResource|undefined,
        documents: Document[] = []
): KoreanFieldworkReportHandoffValidation {

    const category = getPrintableValue(resource?.category);
    if (!resource || !category || !isKoreanFieldworkReportHandoffCategory(category)) {
        return {
            status: 'not-applicable',
            category,
            categoryLabel: category ? getCategoryLabel(category) : undefined,
            isReportHandoffCategory: false,
            isCopyable: false,
            message: KO.NOT_REPORT_HANDOFF,
            messages: [],
            relatedFields: [],
            evidenceCount: 0,
            issueCount: 0
        };
    }

    const document = makeDraftDocument(resource);
    const reportDocuments = documents
        .filter(candidate => candidate.resource.id !== document.resource.id)
        .concat(document);
    const item = makeKoreanFieldworkReportHandoff(reportDocuments)
        .items.find(candidate => candidate.documentId === document.resource.id);
    const messages = getValidationMessages(resource, item);
    const relatedFields = getValidationRelatedFields(resource, messages);
    const status = !item
        ? 'review'
        : messages.length > 0 || item.issueCount > 0
            ? 'review'
            : 'ready';

    return {
        status,
        documentId: document.resource.id,
        category,
        categoryLabel: getCategoryLabel(category),
        identifier: getDocumentIdentifier(document),
        isReportHandoffCategory: true,
        isCopyable: !!item,
        message: getValidationMessage(status, item, messages),
        messages,
        relatedFields,
        evidenceCount: item?.evidenceCount ?? 0,
        issueCount: (item?.issueCount ?? 0) + messages.length,
        copyText: item?.copyText
    };
}


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
        copyAllText: normalizeKoreanFieldworkHwpPlainText(items.map(item => item.copyText).join('\n\n'))
    };
}


function makeDraftDocument(resource: NewResource): Document {

    const resourceId = getPrintableValue(resource.id)
        ?? `__korean-fieldwork-draft-${getPrintableValue(resource.category) ?? 'record'}__`;

    return {
        _id: resourceId,
        resource: {
            ...resource,
            id: resourceId,
            relations: resource.relations ?? {}
        },
        created: {} as any,
        modified: []
    };
}


function getValidationMessages(
        resource: NewResource,
        item: KoreanFieldworkReportHandoffItem|undefined
): string[] {

    const messages: string[] = [];
    const category = getPrintableValue(resource.category);

    if (!item) {
        messages.push('\ub370\uc2a4\ud06c\ud1b1 \ubcf4\uace0\uc11c \ud0ed\uc5d0\uc11c \ubcf5\uc0ac \ube14\ub85d\uc744 \ub9cc\ub4e4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.');
    }
    if (!getPrintableValue(resource.identifier) && !getPrintableValue(resource.reportIdentifier)) {
        messages.push('\ubcf4\uace0\uc11c\uc5d0\uc11c \uad6c\ubd84\ud560 \uae30\ub85d \ubc88\ud638/\uc774\ub984\uc774 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }
    if (!hasPrintableField(resource, SUMMARY_FIELDS)) {
        messages.push('HWP \ubcf5\uc0ac \ubb38\uc7a5\uc5d0 \ub4e4\uc5b4\uac08 \uc694\uc57d \uae30\ub85d\uc774 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }
    if (category && RELATION_REQUIRED_CATEGORIES.includes(category) && !hasAnyRelation(resource)) {
        messages.push('\uc0c1\uc704 \uc870\uc0ac\uad6c\uc5ed/\uc720\uad6c\ub098 \uadfc\uac70 \ub300\uc0c1\uacfc\uc758 \uad00\uacc4\uac00 \uc5c6\uc5b4 \ub370\uc2a4\ud06c\ud1b1\uc5d0\uc11c \ubb36\uc74c\uc73c\ub85c \ubcf4\uae30 \uc5b4\ub835\uc2b5\ub2c8\ub2e4.');
    }
    if (category && MEDIA_URI_FIELDS[category] && !hasPrintableField(resource, MEDIA_URI_FIELDS[category])) {
        messages.push('\uc0ac\uc9c4/\ub3c4\uba74 \uc6d0\ubcf8 \uacbd\ub85c\ub098 \uc2a4\ucf00\uce58 \ub370\uc774\ud130\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }
    if (category === 'PenMemo' && !hasPenMemoContent(resource)) {
        messages.push('\ud604\uc7a5\uba54\ubaa8 \ub0b4\uc6a9\uc774\ub098 \ud544\uae30 \uc2a4\ud2b8\ub85c\ud06c\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }

    return messages;
}


function getValidationRelatedFields(resource: NewResource, messages: string[]): string[] {

    if (messages.length === 0) return [];

    const category = getPrintableValue(resource.category);
    const fields = [
        'identifier',
        'reportIdentifier',
        'relations',
        ...SUMMARY_FIELDS
    ];

    if (category && MEDIA_URI_FIELDS[category]) fields.push(...MEDIA_URI_FIELDS[category]);
    if (category === 'PenMemo') fields.push(...PEN_MEMO_CONTENT_FIELDS);

    return Array.from(new Set(fields));
}


function getValidationMessage(
        status: KoreanFieldworkReportHandoffValidationStatus,
        item: KoreanFieldworkReportHandoffItem|undefined,
        messages: string[]
): string {

    if (status === 'not-applicable') return KO.NOT_REPORT_HANDOFF;
    if (status === 'ready') return `${KO.CHECKED_FOR_DESKTOP}: ${KO.REPORT_HANDOFF_READY}`;

    const issueCount = (item?.issueCount ?? 0) + messages.length;

    return `${KO.CHECKED_FOR_DESKTOP}: ${KO.REVIEW_NEEDED} ${issueCount}`;
}


function hasPrintableField(resource: NewResource, fieldNames: string[]): boolean {

    return fieldNames.some(fieldName => {
        const value = getPrintableValue(resource[fieldName]);
        return !!value && value !== '[]';
    });
}


function hasPenMemoContent(resource: NewResource): boolean {

    return hasPrintableField(resource, PEN_MEMO_CONTENT_FIELDS.filter(fieldName => fieldName !== 'penMemoStrokes'))
        || hasPenMemoStrokeEvidence(resource.penMemoStrokes);
}


function hasAnyRelation(resource: NewResource): boolean {

    return Object.values(resource.relations ?? {})
        .some(relationTargets => Array.isArray(relationTargets) && relationTargets.length > 0);
}


function makeReportHandoffItem(document: Document, documents: Document[]): KoreanFieldworkReportHandoffItem {

    const bundle = buildEvidenceBundle(document, documents);
    const categoryLabel = getCategoryLabel(document.resource.category);
    const identifier = getDocumentIdentifier(document);
    const summary = getSummary(document, categoryLabel);
    const details = getDetailLines(document);
    const relationDetails = getRelationDetails(document, documents);
    const evidenceLabel = getEvidenceLabel(bundle);
    const evidenceDetails = getEvidenceDetails(bundle);
    const issues = getReportHandoffIssues(bundle);
    const issueDetails = getIssueDetails(issues);
    const issueCount = issues.length;
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
        relationDetails,
        evidenceLabel,
        evidenceDetails,
        issueLabel,
        issueDetails,
        evidenceCount: getEvidenceCount(bundle),
        issueCount,
        copyText: makeCopyText({
            categoryLabel,
            details,
            evidenceDetails,
            evidenceLabel,
            identifier,
            issueDetails,
            issueLabel,
            relationDetails,
            summary
        }),
        tone
    };
}


function makeCopyText({
    categoryLabel,
    details,
    evidenceDetails,
    evidenceLabel,
    identifier,
    issueDetails,
    issueLabel,
    relationDetails,
    summary
}: {
    categoryLabel: string;
    details: string[];
    evidenceDetails: string[];
    evidenceLabel: string;
    identifier: string;
    issueDetails: string[];
    issueLabel: string;
    relationDetails: string[];
    summary: string;
}): string {

    return normalizeKoreanFieldworkHwpPlainText([
        `[${categoryLabel}] ${identifier}`,
        `${KO.SUMMARY}: ${summary}`,
        `${KO.DETAILS}: ${details.length > 0 ? details.join(' / ') : KO.NO_DETAILS}`,
        ...(relationDetails.length > 0 ? [`${KO.RELATIONS}: ${relationDetails.join(' / ')}`] : []),
        `${KO.EVIDENCE}: ${evidenceLabel}`,
        ...(evidenceDetails.length > 0 ? [makeListBlock(KO.EVIDENCE_DETAILS, evidenceDetails)] : []),
        `${KO.ISSUES}: ${issueLabel}`,
        ...(issueDetails.length > 0 ? [makeListBlock(KO.ISSUE_DETAILS, issueDetails)] : [])
    ].join('\n'));
}


function isReportHandoffDocument(document: Document): boolean {

    return !!document?.resource?.id
        && isKoreanFieldworkReportHandoffCategory(document.resource.category);
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


function getRelationDetails(document: Document, documents: Document[]): string[] {

    const documentsById = new Map(documents.map(candidate => [candidate.resource.id, candidate]));
    const relations = document.resource.relations ?? {};

    return Object.keys(relations)
        .filter(relationName => Array.isArray(relations[relationName]) && relations[relationName].length > 0)
        .sort(compareRelationNames)
        .map(relationName => getRelationDetailLine(relationName, relations[relationName], documentsById))
        .filter((line): line is string => line !== undefined);
}


function getRelationDetailLine(
        relationName: string,
        targetIds: string[],
        documentsById: Map<string, Document>
): string|undefined {

    const targets = targetIds
        .map(targetId => getRelatedDocumentLabel(targetId, documentsById))
        .filter((target): target is string => !!target);

    return targets.length > 0
        ? `${getKoreanFieldworkRelationLabel(relationName)}: ${targets.join(', ')}`
        : undefined;
}


function getRelatedDocumentLabel(targetId: string, documentsById: Map<string, Document>): string {

    const targetDocument = documentsById.get(targetId);
    if (!targetDocument) return targetId;

    return `[${getCategoryLabel(targetDocument.resource.category)}] ${getDocumentIdentifier(targetDocument)}`;
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


function getEvidenceDetails(bundle: EvidenceBundle): string[] {

    return EVIDENCE_DETAILS.flatMap(definition =>
        definition.getDocuments(bundle)
            .map(document => getEvidenceDetailLine(document, definition))
    );
}


function getEvidenceDetailLine(document: Document, definition: EvidenceDetailDefinition): string {

    const identifier = getDocumentIdentifier(document);
    const summary = definition.getSummary?.(document)
        ?? getEvidenceDetailSummary(document, definition.fields);

    return summary
        ? `${definition.label} ${identifier}: ${summary}`
        : `${definition.label} ${identifier}`;
}


function getSoilProfilePhotoEvidenceSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue('\uc6d0\ubcf8', getFirstPrintableField(document, [
            'soilProfilePhotoUri',
            'imageUri',
            'fieldworkPhotoUri'
        ])),
        getLabeledEvidenceValue('\uce35\ubcc4 \ud1a0\uc0c9', getPrintableValue(
            document.resource.soilProfileColorSwatches
        )),
        getLabeledEvidenceValue('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58', getSoilColorSampleSourceLabel(
            document.resource.soilColorAssistCandidates,
            document.resource.soilProfileColorSwatches
        )),
        getLabeledEvidenceValue('\ud1a0\uc0c9 \uba54\ubaa8', getPrintableValue(
            document.resource.soilProfileColorNote
        )),
        getLabeledEvidenceValue('\ucd2c\uc601 \uba54\ubaa8', getPrintableValue(
            document.resource.soilProfileCaptureNote
        )),
        getLabeledEvidenceValue('\uc694\uc57d', getPrintableValue(document.resource.shortDescription))
    ].filter((value): value is string => !!value).join(' / ') || undefined;
}


function getPenMemoEvidenceSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue('\uac80\ud1a0 \ud544\uc0ac', getPrintableValue(
            document.resource.penMemoReviewedTranscript
        )),
        getLabeledEvidenceValue('\uc790\ub3d9 \ud544\uc0ac', getPrintableValue(
            document.resource.penMemoAutoTranscript
        )),
        getLabeledEvidenceValue('\uba54\ubaa8', getPrintableValue(document.resource.description)),
        getLabeledEvidenceValue('\uc694\uc57d', getPrintableValue(document.resource.shortDescription)),
        getPenMemoStrokeEvidenceLabel(document.resource.penMemoStrokes)
    ].filter((value): value is string => !!value).join(' / ') || undefined;
}


function getPenMemoStrokeEvidenceLabel(value: any): string|undefined {

    return hasPenMemoStrokeEvidence(value)
        ? '\ud544\uae30 \uc6d0\ubcf8: \uc788\uc74c'
        : undefined;
}


function hasPenMemoStrokeEvidence(value: any): boolean {

    if (value === undefined || value === null) return false;

    if (typeof value === 'string') {
        const text = value.trim();
        if (!text || text === '[]' || text === '{}') return false;

        const parsed = parseJsonValue(text);
        return parsed === undefined ? true : hasPenMemoStrokeEvidence(parsed);
    }

    if (Array.isArray(value)) return value.some(hasStrokeValue);

    if (typeof value === 'object') {
        if (Array.isArray(value.strokes)) return value.strokes.some(hasStrokeValue);

        return Object.keys(value)
            .filter(key => key !== 'version')
            .some(key => hasPenMemoStrokeEvidence(value[key]));
    }

    return !!String(value).trim();
}


function hasStrokeValue(value: any): boolean {

    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.some(hasStrokeValue);

    if (typeof value === 'object') {
        if (Array.isArray(value.points)) return value.points.length > 0;
        return Object.keys(value).some(key => hasStrokeValue(value[key]));
    }

    return !!String(value).trim();
}


function parseJsonValue(value: string): any|undefined {

    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}


function getFirstPrintableField(document: Document, fieldNames: string[]): string|undefined {

    return fieldNames
        .map(fieldName => getPrintableValue(document.resource[fieldName]))
        .find(value => !!value && value !== '[]');
}


function getLabeledEvidenceValue(label: string, value: string|undefined): string|undefined {

    if (!value || value === '[]') return undefined;

    return `${label}: ${value}`;
}


function getSoilColorSampleSourceLabel(value: any, swatchValue?: any): string|undefined {

    const sourceLine = getTextLines(value)
        .map(line => line.trim())
        .find(line => SOIL_COLOR_SAMPLE_SOURCE_PATTERN.test(line));

    return sourceLine ?? getSoilColorSampleLocationFromSwatches(swatchValue);
}


function getSoilColorSampleLocationFromSwatches(value: any): string|undefined {

    const locations = getTextLines(value)
        .map(line => line.trim())
        .map(line => {
            const sampleMatch = line.match(RGB_SAMPLE_LOCATION_PATTERN);
            if (!sampleMatch) return undefined;

            const rowMatch = line.match(SOIL_COLOR_ROW_NUMBER_PATTERN);
            const rowLabel = rowMatch ? `${rowMatch[1]}: ` : '';

            return `${rowLabel}RGB ${sampleMatch[1]}/${sampleMatch[2]}/${sampleMatch[3]} @ `
                + `${sampleMatch[4]}%/${sampleMatch[5]}%`;
        })
        .filter((location): location is string => !!location);

    return locations.length > 0 ? locations.join(', ') : undefined;
}


function getTextLines(value: any): string[] {

    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.flatMap(getTextLines);

    if (typeof value === 'object') {
        if (typeof value.inputValue === 'string') return value.inputValue.split(/\r?\n/);
        if (typeof value.value === 'string') return value.value.split(/\r?\n/);
        return [];
    }

    return String(value).split(/\r?\n/);
}


function getEvidenceDetailSummary(document: Document, fieldNames: string[]): string|undefined {

    const value = fieldNames
        .map(fieldName => getPrintableValue(document.resource[fieldName]))
        .find(item => !!item && item !== '[]');

    return value ? truncate(value, 140) : undefined;
}


function getReportHandoffIssues(bundle: EvidenceBundle): KoreanFieldworkReadinessIssue[] {

    return dedupeIssues(bundle.issues.concat(
        getKoreanFieldworkCloseoutReviewIssues(getReportHandoffIssueDocuments(bundle))
    ));
}


function getReportHandoffIssueDocuments(bundle: EvidenceBundle): Document[] {

    return uniqueDocuments([
        bundle.rootDocument,
        ...bundle.featureSegments,
        ...bundle.layers,
        ...bundle.photos,
        ...bundle.soilProfilePhotos,
        ...bundle.drawings,
        ...bundle.penMemos,
        ...bundle.finds,
        ...bundle.samples,
        ...bundle.reportPreparationReviews,
        ...bundle.reportEditorialCrossChecks
    ]);
}


function getIssueDetails(issues: KoreanFieldworkReadinessIssue[]): string[] {

    return issues.map(issue => [
        getSeverityLabel(issue.severity),
        getPrintableValue(issue.identifier) ?? issue.documentId,
        `(${issue.ruleId})`,
        '-',
        issue.message,
        '/',
        issue.recommendedAction
    ].join(' '));
}


function getSeverityLabel(severity: string): string {

    switch (severity) {
        case 'critical':
            return '\ud544\uc218';
        case 'warning':
            return '\ubcf4\uc644';
        default:
            return '\ucc38\uace0';
    }
}


function makeListBlock(label: string, items: string[]): string {

    return `${label}:\n${items.map(item => `- ${item}`).join('\n')}`;
}


function dedupeIssues(issues: KoreanFieldworkReadinessIssue[]): KoreanFieldworkReadinessIssue[] {

    const seen = new Set<string>();

    return issues.filter(issue => {
        const key = `${issue.documentId}\u001f${issue.ruleId}`;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}


function uniqueDocuments(documents: Document[]): Document[] {

    const seen = new Set<string>();

    return documents.filter(document => {
        if (seen.has(document.resource.id)) return false;

        seen.add(document.resource.id);
        return true;
    });
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

    return getKoreanFieldworkCategoryLabel(categoryName) ?? categoryName ?? KO.CATEGORY;
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

    const rankA = getKoreanFieldworkReportHandoffCategoryRank(itemA.category);
    const rankB = getKoreanFieldworkReportHandoffCategoryRank(itemB.category);

    return rankA - rankB
        || itemA.identifier.localeCompare(itemB.identifier, 'ko')
        || itemA.documentId.localeCompare(itemB.documentId);
}


function compareRelationNames(relationNameA: string, relationNameB: string): number {

    return getRelationRank(relationNameA) - getRelationRank(relationNameB)
        || relationNameA.localeCompare(relationNameB, 'ko');
}


function getRelationRank(relationName: string): number {

    const index = RELATION_DETAIL_ORDER.indexOf(relationName);

    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}


function truncate(value: string, maxLength: number): string {

    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}
