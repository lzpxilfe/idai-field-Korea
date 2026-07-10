import { Document } from 'idai-field-core';
import { getKoreanFieldworkEvidenceChips } from './korean-fieldwork-record-evidence';


export type KoreanFieldworkRecordWorkFilterId =
    'all'
    | 'needsReview'
    | 'pending'
    | 'missingEvidence'
    | 'today';

export interface KoreanFieldworkRecordWorkFilter {
    id: KoreanFieldworkRecordWorkFilterId;
    label: string;
}

export type KoreanFieldworkRecordWorkFilterCounts = Record<KoreanFieldworkRecordWorkFilterId, number>;

export const KOREAN_FIELDWORK_RECORD_WORK_FILTERS: readonly KoreanFieldworkRecordWorkFilter[] = [
    { id: 'all', label: '전체' },
    { id: 'needsReview', label: '확인 필요' },
    { id: 'pending', label: '조사 중' },
    { id: 'missingEvidence', label: '자료 보강' },
    { id: 'today', label: '오늘 작성' }
];

const RECORD_WORK_CATEGORIES = new Set<string>([
    'Operation',
    'Trench',
    'FeatureGroup',
    'Feature',
    'FeatureSegment',
    'Layer'
]);

const PENDING_FEATURE_RECORDING_STATES = new Set([
    'candidate',
    'investigating'
]);

const REVIEW_VERIFICATION_STATES = new Set([
    'conflictingEvidence',
    'needsRecheck',
    'pendingDecision'
]);
const KOREAN_FIELDWORK_TIME_ZONE_OFFSET_MINUTES = 9 * 60;


export function getKoreanFieldworkRecordWorkDocuments(documents: Document[]): Document[] {

    return documents.filter(document => RECORD_WORK_CATEGORIES.has(document.resource.category));
}


export function getKoreanFieldworkRecordWorkFilterCounts(
        documents: Document[],
        allDocuments: Document[],
        issueCountByDocumentId: Record<string, number>,
        now: Date = new Date(),
        tabletProcessingDocumentIds: ReadonlySet<string> = new Set()
): KoreanFieldworkRecordWorkFilterCounts {

    return KOREAN_FIELDWORK_RECORD_WORK_FILTERS.reduce((counts, filter) => ({
        ...counts,
        [filter.id]: documents.filter(document =>
            matchesKoreanFieldworkRecordWorkFilter(
                document,
                filter.id,
                allDocuments,
                issueCountByDocumentId,
                now,
                tabletProcessingDocumentIds
            )
        ).length
    }), createEmptyCounts());
}


export function matchesKoreanFieldworkRecordWorkFilter(
        document: Document,
        filterId: KoreanFieldworkRecordWorkFilterId,
        allDocuments: Document[],
        issueCountByDocumentId: Record<string, number>,
        now: Date = new Date(),
        tabletProcessingDocumentIds: ReadonlySet<string> = new Set()
): boolean {

    switch (filterId) {
        case 'needsReview':
            return (issueCountByDocumentId[document.resource.id] ?? 0) > 0
                || hasReviewVerificationState(document)
                || tabletProcessingDocumentIds.has(document.resource.id);
        case 'pending':
            return hasPendingFieldworkStatus(document);
        case 'missingEvidence':
            return hasMissingEvidence(document, allDocuments);
        case 'today':
            return wasTouchedToday(document, now);
        default:
            return true;
    }
}


function createEmptyCounts(): KoreanFieldworkRecordWorkFilterCounts {

    return {
        all: 0,
        needsReview: 0,
        pending: 0,
        missingEvidence: 0,
        today: 0
    };
}


function hasPendingFieldworkStatus(document: Document): boolean {

    return isTrackedValue(document.resource.featureRecordingStatus, PENDING_FEATURE_RECORDING_STATES);
}


function hasReviewVerificationState(document: Document): boolean {

    return isTrackedValue(document.resource.verificationState, REVIEW_VERIFICATION_STATES);
}


function hasMissingEvidence(document: Document, allDocuments: Document[]): boolean {

    return getKoreanFieldworkEvidenceChips(document, allDocuments)
        .some(chip => chip.count === 0);
}


function wasTouchedToday(document: Document, now: Date): boolean {

    return getDocumentDates(document).some(date => isSameLocalDate(date, now));
}


function getDocumentDates(document: Document): Date[] {

    const dates: Date[] = [];
    const createdDate = toDate((document.created as any)?.date);
    if (createdDate) dates.push(createdDate);

    if (Array.isArray(document.modified)) {
        document.modified.forEach(modification => {
            const modifiedDate = toDate((modification as any)?.date);
            if (modifiedDate) dates.push(modifiedDate);
        });
    }

    return dates;
}


function toDate(value: unknown): Date|undefined {

    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}


function isSameLocalDate(dateA: Date, dateB: Date): boolean {

    return getKoreanFieldworkDateKey(dateA) === getKoreanFieldworkDateKey(dateB);
}

function getKoreanFieldworkDateKey(date: Date): string {

    const koreaDate = new Date(date.getTime() + KOREAN_FIELDWORK_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);

    return [
        koreaDate.getUTCFullYear(),
        pad2(koreaDate.getUTCMonth() + 1),
        pad2(koreaDate.getUTCDate())
    ].join('-');
}


function pad2(value: number): string {

    return value.toString().padStart(2, '0');
}


function isTrackedValue(value: unknown, trackedValues: Set<string>): boolean {

    return typeof value === 'string' && trackedValues.has(value);
}
