import { Document } from '../model/document/document';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-record-contract';


export interface KoreanFieldworkIdentifierRevision {
    previousIdentifier: string;
    nextIdentifier: string;
    fieldIdentifier: string;
    reason?: string;
    changedAt: string;
}

export interface KoreanFieldworkIdentifierRevisionInput {
    nextIdentifier: string;
    reason?: string;
    now?: Date;
}

const C = KOREAN_FIELDWORK_CATEGORIES;

export const KOREAN_FIELDWORK_IDENTIFIER_REVISION_CATEGORIES: readonly string[] = [
    C.FEATURE_GROUP,
    C.FEATURE,
    C.FEATURE_SEGMENT
];

const IDENTIFIER_REVISION_CATEGORIES = new Set<string>(KOREAN_FIELDWORK_IDENTIFIER_REVISION_CATEGORIES);


export const canReviseKoreanFieldworkIdentifier = (document: Document|undefined): boolean =>
    !!document?.resource?.category && IDENTIFIER_REVISION_CATEGORIES.has(document.resource.category);


export const getKoreanFieldworkFieldIdentifier = (document: Document): string => {

    const resource = getResource(document);

    return getString(resource.fieldIdentifier)
        || getString(resource.identifier)
        || getString(resource.id);
};


export const getKoreanFieldworkReportIdentifier = (document: Document): string => {

    const resource = getResource(document);

    return getString(resource.reportIdentifier)
        || getString(resource.identifier)
        || '';
};


export const getKoreanFieldworkIdentifierRevisionHistory = (
        document: Document
): KoreanFieldworkIdentifierRevision[] => {

    const history = getResource(document).identifierRevisionHistory;

    return Array.isArray(history)
        ? history.filter(isIdentifierRevision)
        : [];
};


export const getKoreanFieldworkIdentifierRevisionUpdates = (
        document: Document,
        input: KoreanFieldworkIdentifierRevisionInput
): Record<string, unknown> => {

    if (!canReviseKoreanFieldworkIdentifier(document)) return {};

    const nextIdentifier = normalizeIdentifier(input.nextIdentifier);
    const currentIdentifier = normalizeIdentifier(document.resource.identifier);
    if (!nextIdentifier || nextIdentifier === currentIdentifier) return {};

    const fieldIdentifier = getKoreanFieldworkFieldIdentifier(document);
    const reason = normalizeIdentifier(input.reason);
    const changedAt = (input.now ?? new Date()).toISOString();
    const history = getKoreanFieldworkIdentifierRevisionHistory(document);
    const nextHistoryEntry: KoreanFieldworkIdentifierRevision = {
        previousIdentifier: currentIdentifier,
        nextIdentifier,
        fieldIdentifier,
        changedAt,
        ...(reason ? { reason } : {})
    };

    return {
        identifier: nextIdentifier,
        fieldIdentifier,
        reportIdentifier: nextIdentifier,
        identifierRevisionHistory: history.concat(nextHistoryEntry),
        ...(reason ? { identifierRevisionNote: reason } : {})
    };
};


function getResource(document: Document): Record<string, unknown> {

    return document.resource as unknown as Record<string, unknown>;
}


function normalizeIdentifier(value: unknown): string {

    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}


function getString(value: unknown): string {

    return typeof value === 'string' ? value.trim() : '';
}


function isIdentifierRevision(value: unknown): value is KoreanFieldworkIdentifierRevision {

    if (!value || typeof value !== 'object') return false;

    const entry = value as Record<string, unknown>;

    return typeof entry.previousIdentifier === 'string'
        && typeof entry.nextIdentifier === 'string'
        && typeof entry.fieldIdentifier === 'string'
        && typeof entry.changedAt === 'string';
}
