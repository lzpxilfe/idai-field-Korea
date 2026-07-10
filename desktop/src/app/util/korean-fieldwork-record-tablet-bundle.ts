import {
    Document,
    KoreanFieldworkReportHandoffItem,
    KoreanFieldworkReadinessIssue,
    makeKoreanFieldworkReportHandoff,
    normalizeKoreanFieldworkHwpPlainText
} from 'idai-field-core';
import {
    KoreanFieldworkEvidenceReview,
    makeKoreanFieldworkEvidenceReview
} from './korean-fieldwork-evidence-review';
import {
    getKoreanFieldworkNotebookEntriesForDocument,
    KoreanFieldworkNotebookEntry
} from './korean-fieldwork-notebook-digest';


export type KoreanFieldworkTabletRecordBundleTone = 'neutral'|'info'|'warning';

export interface KoreanFieldworkTabletRecordBundleSource {
    id: string;
    label: string;
    detail?: string;
    documentId?: string;
    issueCount: number;
    issueDetails: string[];
    copyText: string;
    tone: KoreanFieldworkTabletRecordBundleTone;
}

export interface KoreanFieldworkTabletRecordBundleGroup {
    id: string;
    label: string;
    count: number;
    detail: string;
    issueCount: number;
    copyText: string;
    sources: KoreanFieldworkTabletRecordBundleSource[];
    tone: KoreanFieldworkTabletRecordBundleTone;
}

export interface KoreanFieldworkTabletRecordBundle {
    documentId: string;
    title: string;
    summary: string;
    sourceCount: number;
    issueCount: number;
    hwpSectionCount: number;
    groups: KoreanFieldworkTabletRecordBundleGroup[];
    issueDetails: string[];
    copyText: string;
}

interface KoreanFieldworkTabletRecordBundleGroupDefinition {
    id: string;
    label: string;
    tone: KoreanFieldworkTabletRecordBundleTone;
    getDocuments: (review: KoreanFieldworkEvidenceReview) => Document[];
}

const PREVIEW_LIMIT = 3;

const DOCUMENT_GROUPS: readonly KoreanFieldworkTabletRecordBundleGroupDefinition[] = [
    {
        id: 'featureSegments',
        label: '\uc138\ubd80 \uc720\uad6c',
        tone: 'info',
        getDocuments: review => review.featureSegments
    },
    {
        id: 'layers',
        label: '\uce35\uc704',
        tone: 'info',
        getDocuments: review => review.layers
    },
    {
        id: 'photos',
        label: '\uc0ac\uc9c4',
        tone: 'info',
        getDocuments: review => review.photos
    },
    {
        id: 'soilProfilePhotos',
        label: '\ud1a0\uce35\uc0ac\uc9c4',
        tone: 'info',
        getDocuments: review => review.soilProfilePhotos
    },
    {
        id: 'drawings',
        label: '\ub3c4\uba74',
        tone: 'info',
        getDocuments: review => review.drawings
    },
    {
        id: 'penMemos',
        label: '\ud604\uc7a5 \uba54\ubaa8',
        tone: 'info',
        getDocuments: review => review.penMemos
    },
    {
        id: 'finds',
        label: '\uc720\ubb3c',
        tone: 'info',
        getDocuments: review => review.finds
    },
    {
        id: 'samples',
        label: '\uc2dc\ub8cc',
        tone: 'info',
        getDocuments: review => review.samples
    }
];


export function makeKoreanFieldworkRecordTabletBundle(
        document: Document,
        documents: Document[],
        reportHandoffItem?: KoreanFieldworkReportHandoffItem
): KoreanFieldworkTabletRecordBundle|undefined {

    if (!document?.resource?.id) return undefined;

    const review = makeKoreanFieldworkEvidenceReview(document, documents);
    const handoffItem = reportHandoffItem
        ?? makeKoreanFieldworkReportHandoff(documents)
            .items.find(item => item.documentId === document.resource.id);
    const notebookEntries = getKoreanFieldworkNotebookEntriesForDocument(
        document,
        documents,
        Number.MAX_SAFE_INTEGER
    );
    const issueDetailsByDocumentId = getIssueDetailsByDocumentId(review.issues);
    const title = handoffItem?.title ?? getDocumentTitle(document);
    const groups = DOCUMENT_GROUPS
        .map(definition => makeDocumentGroup(definition, review, title, issueDetailsByDocumentId))
        .concat(makeNotebookGroup(notebookEntries, title, issueDetailsByDocumentId) ?? [])
        .filter((group): group is KoreanFieldworkTabletRecordBundleGroup => !!group);

    if (groups.length === 0) return undefined;

    const sourceCount = groups.reduce((sum, group) => sum + group.count, 0);
    const issueDetails = getIssueDetails(review.issues);
    const hwpSectionCount = handoffItem?.copySections
        .filter(section => section.copyText.trim().length > 0)
        .length ?? 0;
    const summary = [
        `\uc790\ub8cc ${sourceCount}\uac74`,
        issueDetails.length > 0
            ? `\ud655\uc778 ${issueDetails.length}\uac74`
            : '\ud655\uc778 \uc5c6\uc74c',
        hwpSectionCount > 0 ? `HWP \ubcf5\uc0ac ${hwpSectionCount}\uac1c` : ''
    ].filter(label => label.length > 0).join(' \u00b7 ');

    return {
        documentId: document.resource.id,
        title,
        summary,
        sourceCount,
        issueCount: issueDetails.length,
        hwpSectionCount,
        groups,
        issueDetails,
        copyText: makeBundleCopyText(title, summary, groups, issueDetails, handoffItem?.bodyPreview)
    };
}


function makeDocumentGroup(
        definition: KoreanFieldworkTabletRecordBundleGroupDefinition,
        review: KoreanFieldworkEvidenceReview,
        title: string,
        issueDetailsByDocumentId: Map<string, string[]>
): KoreanFieldworkTabletRecordBundleGroup|undefined {

    const sources = getUniqueDocuments(definition.getDocuments(review))
        .map(document => makeDocumentSource(document, issueDetailsByDocumentId));
    if (sources.length === 0) return undefined;

    return makeGroup(
        definition.id,
        definition.label,
        definition.tone,
        sources,
        title
    );
}


function makeNotebookGroup(
        entries: KoreanFieldworkNotebookEntry[],
        title: string,
        issueDetailsByDocumentId: Map<string, string[]>
): KoreanFieldworkTabletRecordBundleGroup|undefined {

    const sources = entries.map(entry => makeNotebookSource(entry, issueDetailsByDocumentId));
    if (sources.length === 0) return undefined;

    return makeGroup(
        'notebookEntries',
        '\uc77c\uc9c0/\uae30\ub85d \uba54\ubaa8',
        'info',
        sources,
        title
    );
}


function makeGroup(id: string,
                   label: string,
                   tone: KoreanFieldworkTabletRecordBundleTone,
                   sources: KoreanFieldworkTabletRecordBundleSource[],
                   title: string): KoreanFieldworkTabletRecordBundleGroup {

    const issueCount = sources.reduce((sum, source) => sum + source.issueCount, 0);
    const detail = makeGroupDetail(sources, issueCount);

    return {
        id,
        label,
        count: sources.length,
        detail,
        issueCount,
        copyText: makeGroupCopyText(title, label, sources),
        sources,
        tone: issueCount > 0 ? 'warning' : tone
    };
}


function makeDocumentSource(document: Document,
                            issueDetailsByDocumentId: Map<string, string[]>)
        : KoreanFieldworkTabletRecordBundleSource {

    const label = getDocumentIdentifier(document);
    const detail = getDocumentDetail(document);
    const issueDetails = issueDetailsByDocumentId.get(document.resource.id) ?? [];

    return {
        id: document.resource.id,
        label,
        ...(detail ? { detail } : {}),
        documentId: document.resource.id,
        issueCount: issueDetails.length,
        issueDetails,
        copyText: makeSourceCopyText(label, detail, issueDetails),
        tone: issueDetails.length > 0 ? 'warning' : 'info'
    };
}


function makeNotebookSource(entry: KoreanFieldworkNotebookEntry,
                            issueDetailsByDocumentId: Map<string, string[]>)
        : KoreanFieldworkTabletRecordBundleSource {

    const label = [
        entry.targetLabel,
        entry.sourceLabel,
        entry.dateLabel
    ].filter(value => value.length > 0).join(' \u00b7 ');
    const issueDetails = issueDetailsByDocumentId.get(entry.sourceDocument.resource.id) ?? [];

    return {
        id: entry.id,
        label,
        detail: entry.detail,
        documentId: entry.sourceDocument.resource.id,
        issueCount: issueDetails.length,
        issueDetails,
        copyText: makeSourceCopyText(label, entry.detail, issueDetails),
        tone: issueDetails.length > 0 ? 'warning' : 'info'
    };
}


function makeBundleCopyText(
        title: string,
        summary: string,
        groups: KoreanFieldworkTabletRecordBundleGroup[],
        issueDetails: string[],
        bodyPreview: string|undefined
): string {

    const lines = [
        `[\ud0dc\ube14\ub9bf \uc790\ub8cc \ubb36\uc74c] ${title}`,
        summary,
        bodyPreview ? `HWP \ubcf8\ubb38: ${bodyPreview}` : '',
        '',
        ...groups.map(group => `${group.label} ${group.count}\uac74: ${group.detail}`),
        '',
        issueDetails.length > 0
            ? `\ud655\uc778 \ud544\uc694 ${issueDetails.length}\uac74`
            : '\ud655\uc778 \ud544\uc694 \uc5c6\uc74c',
        ...issueDetails.map(issueDetail => `- ${issueDetail}`)
    ];

    return normalizeKoreanFieldworkHwpPlainText(lines.filter(line => line.length > 0).join('\n'));
}


function makeGroupCopyText(
        title: string,
        label: string,
        sources: KoreanFieldworkTabletRecordBundleSource[]
): string {

    const lines = [
        `[${label}] ${title}`,
        ...sources.flatMap(source => {
            const firstLine = `- ${source.label}`;
            const issueLines = source.issueDetails.map(issueDetail => `  \ud655\uc778: ${issueDetail}`);

            return [
                firstLine,
                ...(source.detail ? [`  ${source.detail}`] : []),
                ...issueLines
            ];
        })
    ];

    return normalizeKoreanFieldworkHwpPlainText(lines.join('\n'));
}


function makeSourceCopyText(
        label: string,
        detail: string|undefined,
        issueDetails: string[]
): string {

    const lines = [
        `[\ud0dc\ube14\ub9bf \uc6d0\ubcf8] ${label}`,
        detail ?? '',
        ...(
            issueDetails.length > 0
                ? [
                    '\ud655\uc778 \ud544\uc694:',
                    ...issueDetails.map(issueDetail => `- ${issueDetail}`)
                ]
                : []
        )
    ];

    return normalizeKoreanFieldworkHwpPlainText(lines.filter(line => line.length > 0).join('\n'));
}


function getIssueDetails(issues: KoreanFieldworkReadinessIssue[]): string[] {

    return issues
        .map(getIssueDetail)
        .filter((issueDetail, index, issueDetails) =>
            issueDetail.length > 0 && issueDetails.indexOf(issueDetail) === index
        );
}


function getIssueDetailsByDocumentId(issues: KoreanFieldworkReadinessIssue[]): Map<string, string[]> {

    const issueDetailsByDocumentId = new Map<string, string[]>();

    issues.forEach(issue => {
        const details = issueDetailsByDocumentId.get(issue.documentId) ?? [];
        const issueDetail = getIssueDetail(issue);
        if (issueDetail && !details.includes(issueDetail)) {
            issueDetailsByDocumentId.set(issue.documentId, details.concat(issueDetail));
        }
    });

    return issueDetailsByDocumentId;
}


function getIssueDetail(issue: KoreanFieldworkReadinessIssue): string {

    return [
        issue.identifier || issue.documentId,
        issue.recommendedAction || issue.message
    ].filter(value => value.length > 0).join(': ');
}


function makeGroupDetail(sources: KoreanFieldworkTabletRecordBundleSource[], issueCount: number): string {

    const previewLabel = makePreviewLabel(sources.map(source => source.label));

    return issueCount > 0
        ? `${previewLabel} \u00b7 \ud655\uc778 ${issueCount}\uac74`
        : previewLabel;
}


function makePreviewLabel(labels: string[]): string {

    const visibleLabels = labels.slice(0, PREVIEW_LIMIT);
    const hiddenCount = labels.length - visibleLabels.length;

    return hiddenCount > 0
        ? `${visibleLabels.join(', ')} \uc678 ${hiddenCount}\uac74`
        : visibleLabels.join(', ');
}


function getUniqueDocuments(documents: Document[]): Document[] {

    const seenDocumentIds = new Set<string>();

    return documents.filter(document => {
        const documentId = document.resource.id;
        if (!documentId || seenDocumentIds.has(documentId)) return false;

        seenDocumentIds.add(documentId);
        return true;
    });
}


function getDocumentTitle(document: Document): string {

    return [
        getCategoryFallbackLabel(document.resource.category),
        getDocumentIdentifier(document)
    ].filter(value => value.length > 0).join(' ');
}


function getDocumentIdentifier(document: Document): string {

    return getTextValue(document.resource.identifier) ?? document.resource.id;
}


function getDocumentDetail(document: Document): string|undefined {

    return [
        'shortDescription',
        'description',
        'fieldworkPhotoCaption',
        'originalFilename',
        'fieldworkPhotoUri',
        'imageUri',
        'fileUri'
    ]
        .map(fieldName => getTextValue(document.resource[fieldName]))
        .find(value => !!value);
}


function getTextValue(value: unknown): string|undefined {

    return typeof value === 'string' && value.trim().length > 0
        ? value.trim().replace(/\s+/g, ' ')
        : undefined;
}


function getCategoryFallbackLabel(categoryName: string): string {

    switch (categoryName) {
        case 'Feature':
            return '\uc720\uad6c';
        case 'FeatureSegment':
            return '\uc138\ubd80 \uc720\uad6c';
        case 'Layer':
            return '\uce35\uc704';
        case 'Photo':
            return '\uc0ac\uc9c4';
        case 'SoilProfilePhoto':
            return '\ud1a0\uce35\uc0ac\uc9c4';
        case 'Drawing':
            return '\ub3c4\uba74';
        case 'PenMemo':
            return '\ud604\uc7a5 \uba54\ubaa8';
        case 'Find':
        case 'FindCollection':
            return '\uc720\ubb3c';
        case 'Sample':
            return '\uc2dc\ub8cc';
        default:
            return categoryName;
    }
}
