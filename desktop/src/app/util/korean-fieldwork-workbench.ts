import {
    Document,
    getKoreanFieldworkRecordFieldValueSummary,
    getKoreanFieldworkTodaySummary,
    KoreanFieldworkReadinessIssue
} from 'idai-field-core';
import {
    countKoreanFieldworkChecklistDone,
    getKoreanFieldworkChecklistSteps,
    isKoreanFieldworkChecklistRecord
} from './korean-fieldwork-checklist';
import { getPenMemoSketchSummaryLabel } from './korean-fieldwork-evidence-review';
import { getMunsellCandidateSummaryLabel } from './korean-fieldwork-soil-color-candidates';


export type KoreanFieldworkWorkbenchTone = 'danger'|'warning'|'info'|'success'|'neutral';

export interface KoreanFieldworkWorkbenchItem {
    id: string;
    documentId: string;
    identifier: string;
    category: string;
    categoryLabel: string;
    parentPath?: string;
    reasons: string[];
    issueCount: number;
    tone: KoreanFieldworkWorkbenchTone;
    actionLabel: string;
}

const WORKBENCH_CATEGORIES = new Set<string>([
    'Operation',
    'Trench',
    'FeatureGroup',
    'Feature',
    'FeatureSegment',
    'Layer',
    'Photo',
    'Find',
    'FindCollection',
    'Sample',
    'SoilProfilePhoto',
    'Drawing',
    'PenMemo',
    'DailyLog',
    'FieldRecordQualityReview'
]);

const QUALITY_TRACKED_CATEGORIES = new Set<string>([
    'Operation',
    'Trench',
    'FeatureGroup',
    'Feature',
    'FeatureSegment',
    'Layer',
    'Find',
    'FindCollection',
    'Sample',
    'DailyLog',
    'FieldRecordQualityReview'
]);

const FEATURE_WORKFLOW_CATEGORIES = new Set<string>(['Feature', 'FeatureSegment']);
const PHOTO_CATEGORY = 'Photo';
const DRAWING_CATEGORY = 'Drawing';
const FIELD_RECORD_QUALITY_REVIEW_CATEGORY = 'FieldRecordQualityReview';
const PEN_MEMO_CATEGORY = 'PenMemo';
const SOIL_PROFILE_PHOTO_CATEGORY = 'SoilProfilePhoto';

const REVIEW_VERIFICATION_STATES = new Set(['conflictingEvidence', 'needsRecheck']);
const PARENT_RELATIONS = ['liesWithin', 'isRecordedInFeature', 'isPresentIn', 'isRecordedIn', 'depicts', 'isDepictedIn'];

const CATEGORY_ORDER = [
    'Operation',
    'Trench',
    'FeatureGroup',
    'Feature',
    'FeatureSegment',
    'Layer',
    'Photo',
    'Find',
    'FindCollection',
    'Sample',
    'SoilProfilePhoto',
    'Drawing',
    'PenMemo',
    'DailyLog',
    'FieldRecordQualityReview'
];

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
    DailyLog: '작업일지',
    Feature: '유구',
    FeatureGroup: '관련 유구',
    FeatureSegment: '세부 단위',
    FieldRecordQualityReview: '보완 메모',
    Find: '유물',
    FindCollection: '유물 일괄',
    Layer: '토층',
    Operation: '조사 구역 기록',
    PenMemo: '야장 메모',
    Sample: '시료',
    SoilProfilePhoto: '토층사진',
    Trench: '트렌치'
};

const FIELD_RECORD_QUALITY_REVIEW_REASON_FIELDS = [
    {
        fieldName: 'reviewedRecordUnit',
        prefix: '\uac80\ud1a0 \ub300\uc0c1'
    },
    {
        fieldName: 'qualityReviewStage',
        prefix: '\uac80\ud1a0 \ub2e8\uacc4'
    },
    {
        fieldName: 'qualityCorrectionBasis',
        prefix: '\uc218\uc815\u00b7\ubcf4\uc644 \uadfc\uac70'
    },
    {
        fieldName: 'reportEvaluationFeedback',
        prefix: '\ud3c9\uac00 \ud658\ub958'
    }
];


export function makeKoreanFieldworkWorkbenchItems(documents: Document[],
                                                  limit: number = 6,
                                                  investigationMode?: string): KoreanFieldworkWorkbenchItem[] {

    const summary = getKoreanFieldworkTodaySummary(documents);
    const documentsById = new Map(documents.map(document => [document.resource.id, document]));
    const issuesByDocumentId = groupIssuesByDocumentId(summary.openIssues);

    return documents
        .filter(document => WORKBENCH_CATEGORIES.has(document.resource.category))
        .map(document => makeWorkbenchItem(
            document,
            documentsById,
            issuesByDocumentId.get(document.resource.id) ?? [],
            investigationMode
        ))
        .filter((item): item is KoreanFieldworkWorkbenchItem => !!item)
        .sort(compareWorkbenchItems)
        .slice(0, limit);
}


function makeWorkbenchItem(document: Document,
                           documentsById: Map<string, Document>,
                           issues: KoreanFieldworkReadinessIssue[],
                           investigationMode?: string): KoreanFieldworkWorkbenchItem|undefined {

    const reasons = getWorkbenchReasons(document, issues, investigationMode);
    if (reasons.length === 0) return undefined;

    return {
        id: document.resource.id,
        documentId: document.resource.id,
        identifier: document.resource.identifier || document.resource.id,
        category: document.resource.category,
        categoryLabel: getWorkbenchCategoryLabel(document.resource.category),
        parentPath: getParentPath(document, documentsById),
        reasons,
        issueCount: issues.length,
        tone: getWorkbenchTone(document, issues, reasons, investigationMode),
        actionLabel: getWorkbenchActionLabel(document, reasons)
    };
}


function getWorkbenchReasons(document: Document,
                             issues: KoreanFieldworkReadinessIssue[],
                             investigationMode?: string): string[] {

    const reasons: string[] = [];

    if (issues.length > 0) reasons.push(`확인 ${issues.length}`);

    if (FEATURE_WORKFLOW_CATEGORIES.has(document.resource.category)) {
        const featureRecordingStatus = document.resource.featureRecordingStatus;
        if (featureRecordingStatus === 'candidate') reasons.push('조사 전');
        if (featureRecordingStatus === 'investigating') reasons.push('조사 중');
    }

    if (isKoreanFieldworkChecklistRecord(document.resource.category, investigationMode)) {
        const checklistSteps = getKoreanFieldworkChecklistSteps(document.resource.category, investigationMode);
        const checkedStepCount = countKoreanFieldworkChecklistDone(document, checklistSteps);
        if (checkedStepCount < checklistSteps.length) {
            reasons.push(`과정 ${checkedStepCount}/${checklistSteps.length}`);
        }
    }

    if (document.resource.category === FIELD_RECORD_QUALITY_REVIEW_CATEGORY) {
        reasons.push(...getFieldRecordQualityReviewReasons(document));
    }

    if (document.resource.verificationState === 'pendingDecision') {
        reasons.push('추가 확인');
    } else if (isTrackedValue(document.resource.verificationState, REVIEW_VERIFICATION_STATES)) {
        reasons.push('재확인');
    }

    if (QUALITY_TRACKED_CATEGORIES.has(document.resource.category)
            && getStringArray(document.resource.fieldRecordQuality).length === 0) {
        reasons.push('기록 보완');
    }

    if (document.resource.category === SOIL_PROFILE_PHOTO_CATEGORY) {
        reasons.push(...getSoilProfilePhotoReasons(document));
    }

    if (document.resource.category === PHOTO_CATEGORY) {
        reasons.push(...getPhotoReasons(document, issues));
    }

    if (document.resource.category === DRAWING_CATEGORY) {
        reasons.push(...getDrawingReasons(document, issues));
    }

    if (document.resource.category === PEN_MEMO_CATEGORY) {
        reasons.push(...getPenMemoReasons(document));
    }

    if (QUALITY_TRACKED_CATEGORIES.has(document.resource.category)
            && !hasTextValue(document.resource.recordCreationTiming)) {
        reasons.push('시점 미입력');
    }

    return dedupe(reasons).slice(0, 4);
}


function getSoilProfilePhotoReasons(document: Document): string[] {

    const reasons: string[] = [];

    switch (document.resource.soilColorAssistStatus) {
        case 'candidatesAvailable':
            reasons.push('토색 후보');
            reasons.push(getMunsellCandidateSummaryLabel(document.resource.soilColorAssistCandidates));
            break;
        case 'lowConfidence':
            reasons.push('토색 재확인');
            reasons.push(getMunsellCandidateSummaryLabel(document.resource.soilColorAssistCandidates));
            break;
    }

    if (!hasSoilProfileColorSwatches(document.resource.soilProfileColorSwatches)) {
        reasons.push('토색 미기록');
    }

    return reasons.filter(reason => reason.length > 0);
}


function getFieldRecordQualityReviewReasons(document: Document): string[] {

    return FIELD_RECORD_QUALITY_REVIEW_REASON_FIELDS
        .map(({ fieldName, prefix }) => {
            const summary = getKoreanFieldworkRecordFieldValueSummary(
                fieldName,
                document.resource[fieldName]
            );

            return summary ? `${prefix} ${summary}` : undefined;
        })
        .filter((reason): reason is string => !!reason);
}


function getPhotoReasons(document: Document, issues: KoreanFieldworkReadinessIssue[]): string[] {

    if (!isTabletPhotoRecord(document.resource)) return [];

    const reasons: string[] = [];

    if (hasIssue(issues, 'fieldwork-photo-upload-missing')) {
        reasons.push('\uc6d0\ubcf8 \ubcf4\uc874 \ud655\uc778');
    }

    if (isPhotoReportMetadataIncomplete(document.resource)) {
        reasons.push('\uc0ac\uc9c4 \uc815\ubcf4 \ud655\uc778');
    }

    if (needsPhotoAnnotationExplanation(document.resource)) {
        reasons.push('\uc0ac\uc9c4 \ud45c\uc2dc \uc124\uba85');
    }

    return reasons;
}


function getDrawingReasons(document: Document, issues: KoreanFieldworkReadinessIssue[]): string[] {

    if (!isTabletDrawingRecord(document.resource)) return [];

    const reasons: string[] = [];

    if (hasIssue(issues, 'fieldwork-drawing-upload-missing')) {
        reasons.push('\ub3c4\uba74 \uc6d0\ubcf8 \ud655\uc778');
    }

    if (hasSketchEvidence(document.resource.drawingSketchStrokes)) {
        reasons.push('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58 \ud655\uc778');
    }

    return reasons;
}


function getPenMemoReasons(document: Document): string[] {

    const reasons: string[] = [];
    const hasReviewedTranscript = hasTextValue(document.resource.penMemoReviewedTranscript);
    const hasAutoTranscript = hasTextValue(document.resource.penMemoAutoTranscript);
    const hasHandwriting = hasPenMemoHandwriting(document.resource.penMemoStrokes);

    if (!hasReviewedTranscript && hasAutoTranscript && hasHandwriting) {
        reasons.push('태블릿 손글씨·자동 전사');
    } else if (!hasReviewedTranscript && hasAutoTranscript) {
        reasons.push('자동 전사 검토');
    } else if (!hasReviewedTranscript && hasHandwriting) {
        reasons.push('태블릿 손글씨 원자료');
    }

    if (!hasReviewedTranscript && hasHandwriting) {
        reasons.push(getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes));
    }

    return reasons.filter(reason => reason.length > 0);
}


function getWorkbenchTone(document: Document,
                          issues: KoreanFieldworkReadinessIssue[],
                          reasons: string[],
                          investigationMode?: string): KoreanFieldworkWorkbenchTone {

    if (issues.some(issue => issue.severity === 'critical')) return 'danger';
    if (issues.length > 0) return 'warning';
    if (document.resource.category === PEN_MEMO_CATEGORY) {
        if (reasons.some(isPenMemoReviewReason)) return 'warning';
    }
    if (document.resource.category === SOIL_PROFILE_PHOTO_CATEGORY) {
        if (reasons.includes('토색 재확인') || reasons.includes('토색 미기록')) return 'warning';
        if (reasons.includes('토색 후보')) return 'info';
    }
    if (reasons.includes('조사 전') || reasons.includes('조사 중')) return 'info';
    if (document.resource.category === FIELD_RECORD_QUALITY_REVIEW_CATEGORY) {
        return isTrackedValue(document.resource.verificationState, REVIEW_VERIFICATION_STATES)
            ? 'warning'
            : 'info';
    }
    if (isKoreanFieldworkChecklistRecord(document.resource.category, investigationMode)) return 'info';

    return 'neutral';
}


function getWorkbenchActionLabel(document: Document, reasons: string[]): string {

    if (document.resource.category === PEN_MEMO_CATEGORY
            && reasons.some(isPenMemoReviewReason)) {
        return '메모 검토';
    }

    if (document.resource.category === FIELD_RECORD_QUALITY_REVIEW_CATEGORY) {
        return '\uac80\ud1a0 \uc5f4\uae30';
    }

    if (document.resource.category === PHOTO_CATEGORY) {
        return '\uc0ac\uc9c4 \uac80\ud1a0';
    }

    if (document.resource.category === DRAWING_CATEGORY) {
        return '\ub3c4\uba74 \uac80\ud1a0';
    }

    return document.resource.category === SOIL_PROFILE_PHOTO_CATEGORY
        && reasons.some(reason => reason.startsWith('토색'))
            ? '토색 검토'
            : '기록 열기';
}


function isPenMemoReviewReason(reason: string): boolean {

    return reason.includes('전사') || reason.includes('손글씨 원자료');
}


function compareWorkbenchItems(itemA: KoreanFieldworkWorkbenchItem,
                               itemB: KoreanFieldworkWorkbenchItem): number {

    return getToneRank(itemB.tone) - getToneRank(itemA.tone)
        || itemB.issueCount - itemA.issueCount
        || getCategoryRank(itemA.category) - getCategoryRank(itemB.category)
        || itemA.identifier.localeCompare(itemB.identifier, 'ko');
}


function getToneRank(tone: KoreanFieldworkWorkbenchTone): number {

    switch (tone) {
        case 'danger':
            return 5;
        case 'warning':
            return 4;
        case 'info':
            return 3;
        case 'success':
            return 2;
        default:
            return 1;
    }
}


function getCategoryRank(categoryName: string): number {

    const index = CATEGORY_ORDER.indexOf(categoryName);
    return index === -1 ? CATEGORY_ORDER.length : index;
}


function getWorkbenchCategoryLabel(categoryName: string): string {

    if (categoryName === PHOTO_CATEGORY) return '\uc0ac\uc9c4';
    if (categoryName === DRAWING_CATEGORY) return '\ub3c4\uba74';

    return CATEGORY_LABELS[categoryName] ?? categoryName;
}


function groupIssuesByDocumentId(
        issues: KoreanFieldworkReadinessIssue[]
): Map<string, KoreanFieldworkReadinessIssue[]> {

    return issues.reduce((index, issue) => {
        index.set(issue.documentId, (index.get(issue.documentId) ?? []).concat(issue));
        return index;
    }, new Map<string, KoreanFieldworkReadinessIssue[]>());
}


function getParentPath(document: Document,
                       documentsById: Map<string, Document>): string|undefined {

    const path: string[] = [];
    let currentDocument = document;
    const visitedIds = new Set<string>([document.resource.id]);

    for (let depth = 0; depth < 6; depth++) {
        const parentId = getParentIds(currentDocument).find(id => documentsById.has(id));
        if (!parentId || visitedIds.has(parentId)) break;

        const parent = documentsById.get(parentId)!;
        path.unshift(parent.resource.identifier || parent.resource.id);
        visitedIds.add(parentId);
        currentDocument = parent;
    }

    return path.length > 0 ? path.join(' > ') : undefined;
}


function getParentIds(document: Document): string[] {

    const relations = document.resource.relations ?? {};

    return PARENT_RELATIONS.flatMap(relationName => {
        const targets = relations[relationName];
        return Array.isArray(targets)
            ? targets.filter(target => typeof target === 'string')
            : [];
    });
}


function hasIssue(issues: KoreanFieldworkReadinessIssue[], ruleId: string): boolean {

    return issues.some(issue => issue.ruleId === ruleId);
}


function isTabletPhotoRecord(resource: Record<string, unknown>): boolean {

    return hasAnyTextField(resource, ['fieldworkPhotoUri', 'imageUri', 'fileUri'])
        || hasSketchEvidence(resource.fieldworkPhotoAnnotationStrokes);
}


function isTabletDrawingRecord(resource: Record<string, unknown>): boolean {

    return hasAnyTextField(resource, ['fieldworkPhotoUri', 'imageUri', 'fileUri'])
        || hasSketchEvidence(resource.drawingSketchStrokes);
}


function isPhotoReportMetadataIncomplete(resource: Record<string, unknown>): boolean {

    return !hasTextValue(resource.originalFilename)
        || !hasTextValue(resource.fieldworkPhotoCapturedAt)
        || !hasPositiveNumber(resource.width)
        || !hasPositiveNumber(resource.height);
}


function needsPhotoAnnotationExplanation(resource: Record<string, unknown>): boolean {

    return hasSketchEvidence(resource.fieldworkPhotoAnnotationStrokes)
        && !hasTextValue(resource.description)
        && !hasTextValue(resource.shortDescription);
}


function hasAnyTextField(resource: Record<string, unknown>, fieldNames: string[]): boolean {

    return fieldNames.some(fieldName => hasTextValue(resource[fieldName]));
}


function hasPositiveNumber(value: unknown): boolean {

    const numberValue = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value)
            : NaN;

    return Number.isFinite(numberValue) && numberValue > 0;
}


function hasSketchEvidence(value: unknown): boolean {

    if (!hasTextValue(value)) return false;

    const text = (value as string).trim();
    const parsedValue = parseJsonValue(text);
    if (Array.isArray(parsedValue)) return parsedValue.length > 0;
    if (isRecord(parsedValue)) {
        if (Array.isArray(parsedValue.strokes)) return parsedValue.strokes.length > 0;
        if (Array.isArray(parsedValue.points)) return parsedValue.points.length > 0;
    }

    return !['[]', '{}'].includes(text);
}


function parseJsonValue(value: string): unknown|undefined {

    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}


function isRecord(value: unknown): value is Record<string, unknown> {

    return !!value && typeof value === 'object' && !Array.isArray(value);
}


function getStringArray(value: unknown): string[] {

    const values = Array.isArray(value) ? value : parseStringArray(value);

    return values.filter(item => typeof item === 'string');
}


function parseStringArray(value: unknown): unknown[] {

    if (typeof value !== 'string') return [];

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) return [];

    try {
        const parsedValue = JSON.parse(trimmedValue);
        if (Array.isArray(parsedValue)) return parsedValue;
    } catch {
        // Imported checkbox values can arrive as a single plain string.
    }

    return [trimmedValue];
}


function hasTextValue(value: unknown): boolean {

    return typeof value === 'string' && value.trim().length > 0;
}


function hasPenMemoHandwriting(value: unknown): boolean {

    if (typeof value !== 'string') return false;

    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === '[]') return false;

    try {
        const parsedValue = JSON.parse(trimmedValue);
        if (Array.isArray(parsedValue)) return parsedValue.length > 0;
        if (Array.isArray(parsedValue?.strokes)) return parsedValue.strokes.length > 0;
    } catch (_err) {
        return true;
    }

    return false;
}


function hasSoilProfileColorSwatches(value: unknown): boolean {

    if (typeof value !== 'string') return false;

    const trimmedValue = value.trim();

    return trimmedValue.length > 0
        && trimmedValue !== '[]'
        && trimmedValue.split(/\r?\n/).some(line => {
            const match = line.match(/^\s*\d+\s*:?\s*(.*)$/);
            const colorValue = match ? match[1] : line;

            return colorValue.trim().length > 0;
        });
}


function isTrackedValue(value: unknown,
                        trackedValues: Set<string>): boolean {

    return typeof value === 'string' && trackedValues.has(value);
}


function dedupe(values: string[]): string[] {

    const seen = new Set<string>();

    return values.filter(value => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}
