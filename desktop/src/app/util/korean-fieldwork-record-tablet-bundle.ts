import {
    Document,
    getKoreanFieldworkFindSpotSummaryText,
    KoreanFieldworkReportHandoffItem,
    KoreanFieldworkReadinessIssue,
    makeKoreanFieldworkReportHandoff,
    normalizeKoreanFieldworkHwpPlainText,
    parseSoilProfileColorSwatchRows
} from 'idai-field-core';
import {
    KoreanFieldworkEvidenceReview,
    getPenMemoSketchSummaryLabel,
    getPenMemoTranscriptionSummaryLabel,
    getPhotoAnnotationSummaryLabel,
    makeKoreanFieldworkEvidenceReview
} from './korean-fieldwork-evidence-review';
import {
    getKoreanFieldworkNotebookEntriesForDocument,
    KoreanFieldworkNotebookEntry
} from './korean-fieldwork-notebook-digest';
import {
    getMunsellCandidateSummaryLabel,
    getSoilColorSampleSourceLabel
} from './korean-fieldwork-soil-color-candidates';


export type KoreanFieldworkTabletRecordBundleTone = 'neutral'|'info'|'warning';
export type KoreanFieldworkTabletHandoffReviewTone = 'neutral'|'success'|'warning';

export const KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD = 'tabletHandoffReviewedAt';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD = 'tabletHandoffReviewedSourceCount';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD = 'tabletHandoffReviewedIssueCount';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SUMMARY_FIELD = 'tabletHandoffReviewedSummary';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD = 'tabletHandoffReviewedFingerprint';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD = 'tabletHandoffSourceReviewedAt';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD
    = 'tabletHandoffSourceReviewedIssueCount';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD = 'tabletHandoffSourceReviewedLabel';
export const KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD
    = 'tabletHandoffSourceReviewedFingerprint';

export interface KoreanFieldworkTabletHandoffReviewState {
    isReviewed: boolean;
    isStale: boolean;
    reviewedAt?: string;
    reviewedAtLabel?: string;
    label: string;
    detail: string;
    tone: KoreanFieldworkTabletHandoffReviewTone;
}

export interface KoreanFieldworkTabletRecordBundleSource {
    id: string;
    label: string;
    detail?: string;
    documentId?: string;
    issueCount: number;
    issueDetails: string[];
    copyText: string;
    fingerprint: string;
    reviewState: KoreanFieldworkTabletHandoffReviewState;
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
    fingerprint: string;
    reviewState: KoreanFieldworkTabletHandoffReviewState;
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

type SoilProfileColorSwatchRow = ReturnType<typeof parseSoilProfileColorSwatchRows>[number];

interface SoilProfileLayerMarker {
    label: string;
    xPercent: number;
    yPercent: number;
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
    const issueCount = issueDetails.length;
    const hwpSectionCount = handoffItem?.copySections
        .filter(section => section.copyText.trim().length > 0)
        .length ?? 0;
    const fingerprint = makeBundleFingerprint(
        title,
        groups,
        issueDetails,
        hwpSectionCount,
        handoffItem?.bodyPreview
    );
    const reviewState = getKoreanFieldworkTabletHandoffReviewState(
        document,
        sourceCount,
        issueCount,
        fingerprint
    );
    const summary = [
        `\uc790\ub8cc ${sourceCount}\uac74`,
        issueCount > 0
            ? `\ud655\uc778 ${issueCount}\uac74`
            : '\ud655\uc778 \uc5c6\uc74c',
        hwpSectionCount > 0 ? `HWP \ubcf5\uc0ac ${hwpSectionCount}\uac1c` : ''
    ].filter(label => label.length > 0).join(' \u00b7 ');

    return {
        documentId: document.resource.id,
        title,
        summary,
        sourceCount,
        issueCount,
        hwpSectionCount,
        fingerprint,
        reviewState,
        groups,
        issueDetails,
        copyText: makeBundleCopyText(title, summary, groups, issueDetails, reviewState, handoffItem?.bodyPreview)
    };
}


export function getKoreanFieldworkTabletHandoffReviewState(
        document: Document,
        sourceCount?: number,
        issueCount?: number,
        fingerprint?: string
): KoreanFieldworkTabletHandoffReviewState {

    const resource = document?.resource as Record<string, unknown>|undefined;
    const reviewedAt = getTextValue(resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD]);
    const reviewedSourceCount = getNumberValue(resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD]);
    const reviewedIssueCount = getNumberValue(resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD]);
    const reviewedFingerprint = getTextValue(
        resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD]
    );
    const staleReasons = getTabletHandoffStaleReasons(
        sourceCount,
        reviewedSourceCount,
        issueCount,
        reviewedIssueCount,
        fingerprint,
        reviewedFingerprint
    );
    const isStale = !!reviewedAt && staleReasons.length > 0;
    const reviewedAtLabel = reviewedAt ? formatReviewDateLabel(reviewedAt) : undefined;

    if (!reviewedAt) {
        return {
            isReviewed: false,
            isStale: false,
            label: '\ubbf8\ucc98\ub9ac',
            detail: '\ub370\uc2a4\ud06c\ud1b1\uc5d0\uc11c \uc544\uc9c1 \ucc98\ub9ac\ud558\uc9c0 \uc54a\uc74c',
            tone: 'neutral'
        };
    }

    if (isStale) {
        return {
            isReviewed: false,
            isStale: true,
            reviewedAt,
            ...(reviewedAtLabel ? { reviewedAtLabel } : {}),
            label: '\ub2e4\uc2dc \ud655\uc778',
            detail: `\ucc98\ub9ac \ud6c4 \ud0dc\ube14\ub9bf \uc790\ub8cc \ubcc0\uacbd: ${staleReasons.join(' \u00b7 ')}`,
            tone: 'warning'
        };
    }

    const checkedSourceCount = sourceCount ?? reviewedSourceCount ?? 0;
    const checkedIssueCount = issueCount ?? reviewedIssueCount ?? 0;

    return {
        isReviewed: true,
        isStale: false,
        reviewedAt,
        ...(reviewedAtLabel ? { reviewedAtLabel } : {}),
        label: reviewedAtLabel ? `\ucc98\ub9ac\ub428 ${reviewedAtLabel}` : '\ucc98\ub9ac\ub428',
        detail: `\uc790\ub8cc ${checkedSourceCount}\uac74 \u00b7 \ud655\uc778 ${checkedIssueCount}\uac74`,
        tone: 'success'
    };
}


export function createKoreanFieldworkTabletHandoffReviewUpdate(
        document: Document,
        bundle: KoreanFieldworkTabletRecordBundle,
        reviewed: boolean,
        reviewedAt: string = new Date().toISOString()
): Document {

    const updatedDocument = Document.clone(document);
    const resource = updatedDocument.resource as Record<string, unknown>;

    if (reviewed) {
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD] = reviewedAt;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD] = bundle.sourceCount;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD] = bundle.issueCount;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SUMMARY_FIELD] = bundle.summary;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD] = bundle.fingerprint;
    } else {
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SUMMARY_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD];
    }

    return updatedDocument;
}


export function createKoreanFieldworkTabletHandoffSourceReviewUpdate(
        document: Document,
        source: KoreanFieldworkTabletRecordBundleSource,
        reviewed: boolean,
        reviewedAt: string = new Date().toISOString()
): Document {

    const updatedDocument = Document.clone(document);
    const resource = updatedDocument.resource as Record<string, unknown>;

    if (reviewed) {
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD] = reviewedAt;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD] = source.issueCount;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD] = source.label;
        resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD] = source.fingerprint;
    } else {
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD];
        delete resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD];
    }

    return updatedDocument;
}


export function getKoreanFieldworkTabletRecordBundleGroupSourcesForReview(
        group: KoreanFieldworkTabletRecordBundleGroup
): KoreanFieldworkTabletRecordBundleSource[] {

    return group.sources
        .map((source, index) => ({ source, index }))
        .sort((left, right) =>
            getTabletSourceProcessingPriority(left.source)
            - getTabletSourceProcessingPriority(right.source)
            || right.source.issueCount - left.source.issueCount
            || left.index - right.index
        )
        .map(entry => entry.source);
}


export function containsKoreanFieldworkTabletRecordBundleSource(
        bundle: KoreanFieldworkTabletRecordBundle,
        source: KoreanFieldworkTabletRecordBundleSource
): boolean {

    return bundle.groups.some(group =>
        group.sources.some(candidate => isKoreanFieldworkTabletRecordBundleSourceMatch(candidate, source))
    );
}


export function wouldKoreanFieldworkTabletRecordBundleBeReviewedAfterSourceReview(
        bundle: KoreanFieldworkTabletRecordBundle,
        toggledSource: KoreanFieldworkTabletRecordBundleSource
): boolean {

    return bundle.groups
        .flatMap(group => group.sources)
        .every(source =>
            isKoreanFieldworkTabletRecordBundleSourceMatch(source, toggledSource)
                || source.reviewState.isReviewed
        );
}


function isKoreanFieldworkTabletRecordBundleSourceMatch(
        left: KoreanFieldworkTabletRecordBundleSource,
        right: KoreanFieldworkTabletRecordBundleSource
): boolean {

    return left.id === right.id
        && left.documentId === right.documentId;
}


function getTabletSourceProcessingPriority(source: KoreanFieldworkTabletRecordBundleSource): number {

    if (source.reviewState?.isStale) return 0;
    if (source.issueCount > 0) return 1;
    if (source.reviewState?.isReviewed !== true) return 2;
    return 3;
}


function getTabletHandoffStaleReasons(
        sourceCount: number|undefined,
        reviewedSourceCount: number|undefined,
        issueCount: number|undefined,
        reviewedIssueCount: number|undefined,
        fingerprint: string|undefined,
        reviewedFingerprint: string|undefined
): string[] {

    return [
        sourceCount !== undefined && reviewedSourceCount !== undefined && sourceCount !== reviewedSourceCount
            ? `\uc790\ub8cc ${reviewedSourceCount}\uac74\uc5d0\uc11c ${sourceCount}\uac74`
            : '',
        issueCount !== undefined && reviewedIssueCount !== undefined && issueCount !== reviewedIssueCount
            ? `\ud655\uc778 ${reviewedIssueCount}\uac74\uc5d0\uc11c ${issueCount}\uac74`
            : '',
        fingerprint !== undefined && reviewedFingerprint !== undefined && fingerprint !== reviewedFingerprint
            ? '\uc6d0\ubcf8/\ubcf8\ubb38 \ub0b4\uc6a9 \ubcc0\uacbd'
            : ''
    ].filter(reason => reason.length > 0);
}


function getKoreanFieldworkTabletHandoffSourceReviewState(
        document: Document,
        issueCount: number,
        fingerprint: string
): KoreanFieldworkTabletHandoffReviewState {

    const resource = document?.resource as Record<string, unknown>|undefined;
    const reviewedAt = getTextValue(resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD]);
    const reviewedIssueCount = getNumberValue(
        resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD]
    );
    const reviewedFingerprint = getTextValue(
        resource?.[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD]
    );
    const staleReasons = [
        reviewedIssueCount !== undefined && reviewedIssueCount !== issueCount
            ? `\ud655\uc778 ${reviewedIssueCount}\uac74\uc5d0\uc11c ${issueCount}\uac74`
            : '',
        reviewedFingerprint !== undefined && reviewedFingerprint !== fingerprint
            ? '\uc6d0\ubcf8/\ubcf8\ubb38 \ub0b4\uc6a9 \ubcc0\uacbd'
            : ''
    ].filter(reason => reason.length > 0);
    const reviewedAtLabel = reviewedAt ? formatReviewDateLabel(reviewedAt) : undefined;

    if (!reviewedAt) {
        return {
            isReviewed: false,
            isStale: false,
            label: '\ubbf8\ucc98\ub9ac',
            detail: '\uc774 \uc6d0\uc790\ub8cc\ub97c \uc544\uc9c1 \ucc98\ub9ac\ud558\uc9c0 \uc54a\uc74c',
            tone: 'neutral'
        };
    }

    if (staleReasons.length > 0) {
        return {
            isReviewed: false,
            isStale: true,
            reviewedAt,
            ...(reviewedAtLabel ? { reviewedAtLabel } : {}),
            label: '\ub2e4\uc2dc \ud655\uc778',
            detail: `\ucc98\ub9ac \ud6c4 \uc6d0\uc790\ub8cc \ubcc0\uacbd: ${staleReasons.join(' \u00b7 ')}`,
            tone: 'warning'
        };
    }

    return {
        isReviewed: true,
        isStale: false,
        reviewedAt,
        ...(reviewedAtLabel ? { reviewedAtLabel } : {}),
        label: reviewedAtLabel ? `\ucc98\ub9ac\ub428 ${reviewedAtLabel}` : '\ucc98\ub9ac\ub428',
        detail: issueCount > 0 ? `\ud655\uc778 ${issueCount}\uac74` : '\ud655\uc778 \uc5c6\uc74c',
        tone: 'success'
    };
}


function makeBundleFingerprint(
        title: string,
        groups: KoreanFieldworkTabletRecordBundleGroup[],
        issueDetails: string[],
        hwpSectionCount: number,
        bodyPreview: string|undefined
): string {

    const payload = JSON.stringify({
        version: 1,
        title,
        hwpSectionCount,
        bodyPreview: bodyPreview ?? '',
        groups: groups.map(group => ({
            id: group.id,
            label: group.label,
            count: group.count,
            detail: group.detail,
            issueCount: group.issueCount,
            sources: group.sources.map(source => ({
                id: source.id,
                label: source.label,
                detail: source.detail ?? '',
                documentId: source.documentId ?? '',
                issueCount: source.issueCount,
                issueDetails: source.issueDetails,
                copyText: source.copyText
            }))
        })),
        issueDetails
    });

    return `v1:${hashFingerprintPayload(payload)}:${payload.length}`;
}


function hashFingerprintPayload(payload: string): string {

    let hash = 0x811c9dc5;

    for (let i = 0; i < payload.length; i++) {
        hash ^= payload.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
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
    const copyText = makeSourceCopyText(label, detail, issueDetails);
    const fingerprint = makeSourceFingerprint(
        document.resource.id,
        label,
        detail,
        issueDetails,
        copyText
    );

    return {
        id: document.resource.id,
        label,
        ...(detail ? { detail } : {}),
        documentId: document.resource.id,
        issueCount: issueDetails.length,
        issueDetails,
        copyText,
        fingerprint,
        reviewState: getKoreanFieldworkTabletHandoffSourceReviewState(document, issueDetails.length, fingerprint),
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
    const copyText = makeSourceCopyText(label, entry.detail, issueDetails);
    const fingerprint = makeSourceFingerprint(
        entry.sourceDocument.resource.id,
        label,
        entry.detail,
        issueDetails,
        copyText
    );

    return {
        id: entry.id,
        label,
        detail: entry.detail,
        documentId: entry.sourceDocument.resource.id,
        issueCount: issueDetails.length,
        issueDetails,
        copyText,
        fingerprint,
        reviewState: getKoreanFieldworkTabletHandoffSourceReviewState(
            entry.sourceDocument,
            issueDetails.length,
            fingerprint
        ),
        tone: issueDetails.length > 0 ? 'warning' : 'info'
    };
}


function makeBundleCopyText(
        title: string,
        summary: string,
        groups: KoreanFieldworkTabletRecordBundleGroup[],
        issueDetails: string[],
        reviewState: KoreanFieldworkTabletHandoffReviewState,
        bodyPreview: string|undefined
): string {

    const lines = [
        `[\ud0dc\ube14\ub9bf \uc790\ub8cc \ubb36\uc74c] ${title}`,
        summary,
        `\ub370\uc2a4\ud06c\ud1b1 \ucc98\ub9ac: ${reviewState.label}`,
        `\ucc98\ub9ac \uc0c1\uc138: ${reviewState.detail}`,
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


function makeSourceFingerprint(
        documentId: string,
        label: string,
        detail: string|undefined,
        issueDetails: string[],
        copyText: string
): string {

    const payload = JSON.stringify({
        version: 1,
        documentId,
        label,
        detail: detail ?? '',
        issueDetails,
        copyText
    });

    return `v1:${hashFingerprintPayload(payload)}:${payload.length}`;
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
        getFindSpotDetail(document),
        getDirectFieldworkPhotoDetail(document),
        getPhotoDetail(document),
        getSoilProfilePhotoDetail(document),
        getDrawingDetail(document),
        getPenMemoDetail(document),
        getDocumentFieldDetails(document)
    ].filter((value): value is string => !!value).join(' \u00b7 ') || undefined;
}


function getFindSpotDetail(document: Document): string|undefined {

    if (!['Find', 'FindCollection', 'Sample'].includes(document.resource.category)) return undefined;

    const summary = getKoreanFieldworkFindSpotSummaryText(document.resource.findSpotItems);
    if (!summary) return undefined;

    return document.resource.category === 'Sample'
        ? `\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: ${summary}`
        : `\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58: ${summary}`;
}


function getDirectFieldworkPhotoDetail(document: Document): string|undefined {

    if (['Photo', 'SoilProfilePhoto', 'Drawing'].includes(document.resource.category)) return undefined;

    const sourceUri = getFirstTextValue(getMediaSourceUriFieldNames(document)
        .map(fieldName => document.resource[fieldName]));
    if (!sourceUri) return undefined;

    return `\uc9c1\uc811 \ucca8\ubd80 \uc0ac\uc9c4: ${getCategoryFallbackLabel(document.resource.category)}`;
}


function getPhotoDetail(document: Document): string|undefined {

    if (document.resource.category !== 'Photo') return undefined;

    return getPhotoAnnotationDetail(
        '\uc0ac\uc9c4 \ud45c\uc2dc',
        document.resource.fieldworkPhotoAnnotationStrokes
    );
}


function getSoilProfilePhotoDetail(document: Document): string|undefined {

    if (document.resource.category !== 'SoilProfilePhoto') return undefined;

    const candidateLabel = getMunsellCandidateSummaryLabel(document.resource.soilColorAssistCandidates);
    const sampleSourceLabel = getSoilColorSampleSourceLabel(
        document.resource.soilColorAssistCandidates,
        document.resource.soilProfileColorSwatches
    );
    const swatchLabel = getSoilProfileColorSwatchDetail(document.resource.soilProfileColorSwatches);
    const colorNote = getTextValue(document.resource.soilProfileColorNote);
    const captureNote = getTextValue(document.resource.soilProfileCaptureNote);

    return [
        getPhotoAnnotationDetail('\uc0ac\uc9c4 \ud45c\uc2dc', document.resource.soilProfilePhotoAnnotationStrokes),
        getPhotoAnnotationDetail('\ud1a0\uce35\uc120 \ud45c\uc2dc', document.resource.soilProfileAnnotationStrokes),
        getSoilProfileLayerMarkerDetail(document.resource.soilProfileLayerMarkers),
        candidateLabel,
        sampleSourceLabel ? `\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: ${sampleSourceLabel}` : undefined,
        swatchLabel ? `\uce35\ubcc4 \ud1a0\uc0c9: ${swatchLabel}` : undefined,
        colorNote ? `\ud1a0\uc0c9 \uba54\ubaa8: ${colorNote}` : undefined,
        captureNote ? `\ucd2c\uc601 \uba54\ubaa8: ${captureNote}` : undefined
    ].filter((value): value is string => !!value).join(' \u00b7 ') || undefined;
}


function getDrawingDetail(document: Document): string|undefined {

    if (document.resource.category !== 'Drawing') return undefined;

    return getSketchDetail('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58', document.resource.drawingSketchStrokes);
}


function getPenMemoDetail(document: Document): string|undefined {

    if (document.resource.category !== 'PenMemo') return undefined;

    const reviewedTranscript = getTextValue(document.resource.penMemoReviewedTranscript);
    const autoTranscript = getTextValue(document.resource.penMemoAutoTranscript);
    const sketchLabel = getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes);

    return [
        sketchLabel || reviewedTranscript || autoTranscript
            ? `\ud544\uae30 \uc0c1\ud0dc: ${getPenMemoTranscriptionSummaryLabel(document)}`
            : undefined,
        reviewedTranscript ? `\uac80\ud1a0 \ud544\uc0ac: ${reviewedTranscript}` : undefined,
        !reviewedTranscript && autoTranscript ? `\uc790\ub3d9 \ud544\uc0ac: ${autoTranscript}` : undefined
    ].filter((value): value is string => !!value).join(' \u00b7 ') || undefined;
}


function getDocumentFieldDetails(document: Document): string|undefined {

    return [
        getLabeledTextDetail('\uc694\uc57d', document.resource.shortDescription),
        getLabeledTextDetail('\uc124\uba85', document.resource.description),
        getLabeledTextDetail('\uc0ac\uc9c4 \uc124\uba85', document.resource.fieldworkPhotoCaption),
        getLabeledTextDetail('\uc6d0\ubcf8 \ud30c\uc77c', document.resource.originalFilename),
        getMediaSourceDetail(document),
        getCapturedAtDetail(document),
        getImageSizeDetail(document),
        getImageUploadDetail(document)
    ].filter((value): value is string => !!value).join(' \u00b7 ') || undefined;
}


function getLabeledTextDetail(label: string, value: unknown): string|undefined {

    const text = getTextValue(value);

    return text ? `${label}: ${text}` : undefined;
}


function getMediaSourceDetail(document: Document): string|undefined {

    const sourceUri = getFirstTextValue(getMediaSourceUriFieldNames(document)
        .map(fieldName => document.resource[fieldName]));

    return sourceUri ? `\uc6d0\ubcf8: ${sourceUri}` : undefined;
}


function getMediaSourceUriFieldNames(document: Document): string[] {

    switch (document.resource.category) {
        case 'SoilProfilePhoto':
            return ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri', 'fileUri'];
        case 'Drawing':
            return ['fileUri', 'imageUri', 'fieldworkPhotoUri'];
        default:
            return ['fieldworkPhotoUri', 'imageUri', 'fileUri', 'soilProfilePhotoUri'];
    }
}


function getCapturedAtDetail(document: Document): string|undefined {

    const capturedAt = getFirstTextValue([
        document.resource.fieldworkPhotoCapturedAt,
        document.resource.soilProfilePhotoCapturedAt
    ]);
    if (!capturedAt) return undefined;

    const match = capturedAt.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
    const label = !match ? capturedAt : (match[2] ? `${match[1]} ${match[2]}` : match[1]);

    return `\ucd2c\uc601: ${label}`;
}


function getImageSizeDetail(document: Document): string|undefined {

    const width = getNumberValue(document.resource.width);
    const height = getNumberValue(document.resource.height);

    return width !== undefined && height !== undefined
        ? `\ud06c\uae30: ${width}x${height}`
        : undefined;
}


function getImageUploadDetail(document: Document): string|undefined {

    const status = getTextValue(document.resource.fieldworkImageUploadStatus);
    const uploadedAt = getTextValue(document.resource.fieldworkImageUploadedAt);
    const uploadedUri = getTextValue(document.resource.fieldworkImageUploadedUri);
    const uploadTarget = getTextValue(document.resource.fieldworkImageUploadTarget);
    const uploadedProject = getTextValue(document.resource.fieldworkImageUploadedProject);
    const uploadedSizeBytes = getNumberValue(document.resource.fieldworkImageUploadedSizeBytes);
    const uploadedMd5 = getTextValue(document.resource.fieldworkImageUploadedMd5);
    const storedSha256 = getTextValue(document.resource.fieldworkImageStoredSha256);
    const details = [
        status ? getImageUploadStatusLabel(status) : undefined,
        uploadedAt ? `\uc2dc\uac01 ${uploadedAt}` : undefined,
        uploadedUri ? `\uc6d0\ubcf8 ${uploadedUri}` : undefined,
        uploadTarget ? `\ub300\uc0c1 ${uploadTarget}` : undefined,
        uploadedProject ? `\ud504\ub85c\uc81d\ud2b8 ${uploadedProject}` : undefined,
        uploadedSizeBytes !== undefined ? `\ud06c\uae30 ${uploadedSizeBytes}B` : undefined,
        uploadedMd5 ? `MD5 ${uploadedMd5}` : undefined,
        storedSha256 ? `SHA256 ${storedSha256}` : undefined
    ].filter((value): value is string => !!value);

    return details.length > 0 ? `\uc774\ubbf8\uc9c0 \uc5c5\ub85c\ub4dc: ${details.join(', ')}` : undefined;
}


function getImageUploadStatusLabel(status: string): string {

    return status === 'uploaded'
        ? '\uc5c5\ub85c\ub4dc \uc644\ub8cc'
        : status;
}


function getFirstTextValue(values: unknown[]): string|undefined {

    return values.map(getTextValue).find((value): value is string => !!value);
}


function getPhotoAnnotationDetail(label: string, value: unknown): string|undefined {

    const summary = getPhotoAnnotationSummaryLabel(value);

    return summary ? `${label}: ${summary}` : undefined;
}


function getSketchDetail(label: string, value: unknown): string|undefined {

    const summary = getPenMemoSketchSummaryLabel(value);

    return summary ? `${label}: ${summary}` : undefined;
}


function getSoilProfileColorSwatchDetail(value: unknown): string|undefined {

    const rowLabels = parseSoilProfileColorSwatchRows(value)
        .map(getSoilProfileColorSwatchRowLabel)
        .filter((label): label is string => !!label);

    if (rowLabels.length === 0) return undefined;

    return rowLabels.length > PREVIEW_LIMIT
        ? `${rowLabels.slice(0, PREVIEW_LIMIT).join(', ')} \uc678 ${rowLabels.length - PREVIEW_LIMIT}\uac74`
        : rowLabels.join(', ');
}


function getSoilProfileColorSwatchRowLabel(row: SoilProfileColorSwatchRow): string|undefined {

    const parts = [
        getTextValue(row.munsell),
        getTextValue(row.note),
        getTextValue(row.sample?.label)
    ].filter((part): part is string => !!part);

    return parts.length > 0
        ? `${row.number}\uce35 ${parts.join(' ')}`
        : undefined;
}


function getSoilProfileLayerMarkerDetail(value: unknown): string|undefined {

    const markers = getSoilProfileLayerMarkers(value);
    if (markers.length === 0) return undefined;

    const markerLabels = markers.map(marker => `${marker.label}\uce35 ${marker.xPercent}%/${marker.yPercent}%`);
    const detail = markerLabels.length > PREVIEW_LIMIT
        ? `${markerLabels.slice(0, PREVIEW_LIMIT).join(', ')} \uc678 ${markerLabels.length - PREVIEW_LIMIT}\uac74`
        : markerLabels.join(', ');

    return `\uce35 \ubc88\ud638 \ud45c\uc2dc: ${detail}`;
}


function getSoilProfileLayerMarkers(value: unknown): SoilProfileLayerMarker[] {

    const markers = parseSoilProfileLayerMarkers(value);

    return markers
        .map((marker, index) => getSoilProfileLayerMarker(marker, index))
        .filter((marker): marker is SoilProfileLayerMarker => !!marker);
}


function parseSoilProfileLayerMarkers(value: unknown): unknown[] {

    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];

    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === '[]') return [];

    try {
        const parsedValue = JSON.parse(trimmedValue);

        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch (_err) {
        return [];
    }
}


function getSoilProfileLayerMarker(value: unknown, index: number): SoilProfileLayerMarker|undefined {

    if (!isRecord(value)) return undefined;

    const xPercent = getPercentValue(value.x);
    const yPercent = getPercentValue(value.y);
    if (xPercent === undefined || yPercent === undefined) return undefined;

    return {
        label: getLayerMarkerLabel(value, index),
        xPercent,
        yPercent
    };
}


function getLayerMarkerLabel(value: Record<string, unknown>, index: number): string {

    const rawLabel = value.label ?? value.number ?? value.layer ?? value.layerNumber;
    const label = rawLabel === undefined || rawLabel === null ? '' : String(rawLabel).trim();

    return label || String(index + 1);
}


function getPercentValue(value: unknown): number|undefined {

    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) return undefined;

    return Math.max(0, Math.min(100, numberValue));
}


function isRecord(value: unknown): value is Record<string, unknown> {

    return typeof value === 'object' && value !== null && !Array.isArray(value);
}


function getTextValue(value: unknown): string|undefined {

    return typeof value === 'string' && value.trim().length > 0
        ? value.trim().replace(/\s+/g, ' ')
        : undefined;
}


function getNumberValue(value: unknown): number|undefined {

    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string' || value.trim().length === 0) return undefined;

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
}


function formatReviewDateLabel(value: string): string {

    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);

    return dateMatch ? dateMatch[0] : value;
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
