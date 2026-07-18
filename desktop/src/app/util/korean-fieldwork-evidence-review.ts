import {
    buildEvidenceBundle,
    Document,
    EvidenceBundle,
    KoreanFieldworkReadinessIssue
} from 'idai-field-core';
import {
    extractMunsellCandidateOptions,
    getMunsellCandidateSummaryLabel,
    getSoilColorSampleSourceLabel
} from './korean-fieldwork-soil-color-candidates';

export interface KoreanFieldworkEvidenceReview extends EvidenceBundle {
    hasOpenIssues: boolean;
    reportReady: boolean;
    missingEvidenceKinds: string[];
    photoAnnotationSummaries: KoreanFieldworkPhotoAnnotationSummary[];
    pendingPenMemoTranscriptions: Document[];
    penMemoTranscriptionSummaries: KoreanFieldworkPenMemoTranscriptionSummary[];
    penMemoSketchSummaries: KoreanFieldworkPenMemoSketchSummary[];
    soilColorCandidateSummaries: KoreanFieldworkSoilColorCandidateSummary[];
    soilColorSwatchSummaries: KoreanFieldworkSoilColorSwatchSummary[];
}

export interface KoreanFieldworkPenMemoSketchSummary {
    document: Document;
    strokeCount: number;
    pointCount: number;
    pendingTranscription: boolean;
}

export interface KoreanFieldworkPenMemoSketchPreview {
    label: string;
    path: string;
    texts?: KoreanFieldworkSketchPreviewText[];
    viewBox: string;
}

export interface KoreanFieldworkSketchPreviewText {
    text: string;
    x: number;
    y: number;
}

export interface KoreanFieldworkPhotoAnnotationSummary {
    document: Document;
    label: string;
    preview: KoreanFieldworkPenMemoSketchPreview;
    source: 'photo'|'soilProfilePhoto';
    updatedAt?: string;
}

interface KoreanFieldworkPenMemoPoint {
    x: number;
    y: number;
}

interface KoreanFieldworkPenMemoStroke {
    points: KoreanFieldworkPenMemoPoint[];
    tool?: 'eraser'|'pen';
    width?: number;
}

interface KoreanFieldworkPenMemoSegment {
    end: KoreanFieldworkPenMemoPoint;
    start: KoreanFieldworkPenMemoPoint;
    width: number;
}

interface KoreanFieldworkPenMemoInterval {
    end: number;
    start: number;
}

const NORMALIZED_SKETCH_CANVAS_WIDTH = 960;
const DEFAULT_PEN_MEMO_STROKE_WIDTH = 5;
const MAX_PEN_MEMO_STROKE_WIDTH = 24;
const MAX_NORMALIZED_PREVIEW_SOURCE_SEGMENTS = 6000;
const MAX_NORMALIZED_PREVIEW_VISIBLE_SEGMENTS = 8000;
const MAX_NORMALIZED_PREVIEW_ERASER_CHECKS = 250000;
const NORMALIZED_PREVIEW_INTERVAL_EPSILON = 0.000001;
const PEN_MEMO_INFINITE_GRID_COORDINATE_SPACE = 'penMemoInfiniteGridV1';
const PEN_MEMO_INFINITE_GRID_COORDINATE_LIMIT = 10000000;

export interface KoreanFieldworkPenMemoTranscriptionSummary {
    document: Document;
    label: string;
}

export interface KoreanFieldworkSoilColorCandidateSummary {
    candidates: string[];
    document: Document;
    label: string;
    sampleSourceLabel?: string;
}

export interface KoreanFieldworkSoilColorSwatchSummary {
    document: Document;
    entries: string[];
    label: string;
}

const FIELDWORK_PHOTO_ANNOTATION_FIELD = 'fieldworkPhotoAnnotationStrokes';
const FIELDWORK_PHOTO_ANNOTATION_UPDATED_AT_FIELD = 'fieldworkPhotoAnnotationUpdatedAt';
const SOIL_PROFILE_PHOTO_ANNOTATION_FIELDS = [
    'soilProfilePhotoAnnotationStrokes',
    'soilProfileAnnotationStrokes'
];
const SOIL_PROFILE_PHOTO_ANNOTATION_UPDATED_AT_FIELD = 'soilProfilePhotoAnnotationUpdatedAt';

export function makeKoreanFieldworkEvidenceReview(
        rootDocument: Document,
        documents: Document[]
): KoreanFieldworkEvidenceReview {

    const bundle = buildEvidenceBundle(rootDocument, documents);
    const reviewPhotos = getKoreanFieldworkReviewPhotoDocuments(rootDocument, bundle);
    const reviewSoilProfilePhotos = getKoreanFieldworkReviewSoilProfilePhotoDocuments(rootDocument, bundle);
    const reviewDrawings = getKoreanFieldworkReviewDrawingDocuments(rootDocument, bundle);
    const pendingPenMemoTranscriptions = getPendingPenMemoTranscriptionDocuments(bundle.penMemos);
    const penMemoTranscriptionSummaries = getPenMemoTranscriptionSummaries(pendingPenMemoTranscriptions);
    const penMemoSketchSummaries = getPenMemoSketchSummaries(bundle.penMemos);
    const soilColorCandidateSummaries = getSoilColorCandidateSummaries(reviewSoilProfilePhotos);
    const soilColorSwatchSummaries = getSoilColorSwatchSummaries(reviewSoilProfilePhotos);
    const photoAnnotationSummaries = getPhotoAnnotationSummaries(reviewPhotos, reviewSoilProfilePhotos);
    const missingEvidenceKinds = getMissingEvidenceKinds(
        bundle,
        pendingPenMemoTranscriptions,
        reviewPhotos,
        reviewSoilProfilePhotos,
        reviewDrawings
    );
    const issues = bundle.issues.concat(
        getPendingPenMemoTranscriptionIssues(pendingPenMemoTranscriptions)
    );

    return {
        ...bundle,
        photos: reviewPhotos,
        soilProfilePhotos: reviewSoilProfilePhotos,
        drawings: reviewDrawings,
        issues,
        hasOpenIssues: issues.length > 0,
        reportReady: issues.length === 0 && missingEvidenceKinds.length === 0,
        missingEvidenceKinds,
        photoAnnotationSummaries,
        pendingPenMemoTranscriptions,
        penMemoTranscriptionSummaries,
        penMemoSketchSummaries,
        soilColorCandidateSummaries,
        soilColorSwatchSummaries
    };
}

export function getKoreanFieldworkReviewPhotoDocuments(rootDocument: Document,
                                                       bundle: EvidenceBundle): Document[] {

    return prependRootDocumentByCategory(rootDocument, bundle.photos, 'Photo');
}


export function getKoreanFieldworkReviewSoilProfilePhotoDocuments(rootDocument: Document,
                                                                   bundle: EvidenceBundle): Document[] {

    return prependRootDocumentByCategory(rootDocument, bundle.soilProfilePhotos, 'SoilProfilePhoto');
}


export function getKoreanFieldworkReviewDrawingDocuments(rootDocument: Document,
                                                        bundle: EvidenceBundle): Document[] {

    return prependRootDocumentByCategory(rootDocument, bundle.drawings, 'Drawing');
}

export function getIssueSummary(issues: KoreanFieldworkReadinessIssue[]): string[] {

    return issues.map((issue) => `${issue.identifier}: ${issue.recommendedAction}`);
}

export function getPendingPenMemoTranscriptionDocuments(penMemos: Document[]): Document[] {

    return penMemos.filter(document =>
        !hasTextValue(document.resource.penMemoReviewedTranscript)
        && (
            hasTextValue(document.resource.penMemoAutoTranscript)
            || hasPenMemoHandwriting(document.resource.penMemoStrokes)
        )
    );
}


export function getPenMemoSketchSummaries(penMemos: Document[]): KoreanFieldworkPenMemoSketchSummary[] {

    return penMemos.flatMap(document => {
        const stats = getPenMemoStrokeStats(document.resource.penMemoStrokes);
        if (stats.strokeCount === 0) return [];

        return [{
            document,
            strokeCount: stats.strokeCount,
            pointCount: stats.pointCount,
            pendingTranscription: !hasTextValue(document.resource.penMemoReviewedTranscript)
        }];
    });
}


export function getPenMemoTranscriptionSummaries(
        penMemos: Document[]
): KoreanFieldworkPenMemoTranscriptionSummary[] {

    return penMemos.map(document => ({
        document,
        label: getPenMemoTranscriptionSummaryLabel(document)
    }));
}


export function getPenMemoTranscriptionSummaryLabel(document: Document): string {

    const hasAutoTranscript = hasTextValue(document.resource.penMemoAutoTranscript);
    const hasHandwriting = hasPenMemoHandwriting(document.resource.penMemoStrokes);
    const sourceLabel = hasAutoTranscript && hasHandwriting
        ? '태블릿 손글씨·자동 전사'
        : hasAutoTranscript
            ? '자동 전사 검토'
            : '태블릿 손글씨 원자료';
    const sketchSummaryLabel = getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes);

    return [sourceLabel, sketchSummaryLabel]
        .filter(label => label.trim().length > 0)
        .join(' · ');
}


export function getSoilColorCandidateSummaries(
        soilProfilePhotos: Document[]
): KoreanFieldworkSoilColorCandidateSummary[] {

    return soilProfilePhotos.flatMap(document => {
        const candidates = extractMunsellCandidateOptions(document.resource.soilColorAssistCandidates);
        if (candidates.length === 0) return [];
        const label = getMunsellCandidateSummaryLabel(document.resource.soilColorAssistCandidates);
        const sampleSourceLabel = getSoilColorSampleSourceLabel(
            document.resource.soilColorAssistCandidates,
            document.resource.soilProfileColorSwatches
        );

        return [{
            candidates,
            document,
            label: sampleSourceLabel
                ? `${label} · ${sampleSourceLabel}`
                : label,
            ...(sampleSourceLabel ? { sampleSourceLabel } : {})
        }];
    });
}


export function getSoilColorSwatchSummaries(
        soilProfilePhotos: Document[]
): KoreanFieldworkSoilColorSwatchSummary[] {

    return soilProfilePhotos.flatMap(document => {
        const entries = getSoilProfileColorSwatchEntries(document.resource.soilProfileColorSwatches);
        if (entries.length === 0) return [];

        return [{
            document,
            entries,
            label: [
                `층별 토색 ${entries.length}개`,
                entries.slice(0, 3).join(', ')
            ].filter(label => label.trim().length > 0).join(' · ')
        }];
    });
}


export function getPhotoAnnotationSummaries(
        photos: Document[],
        soilProfilePhotos: Document[]
): KoreanFieldworkPhotoAnnotationSummary[] {

    const photoSummaries = photos.flatMap(document =>
        getPhotoAnnotationSummary(document, FIELDWORK_PHOTO_ANNOTATION_FIELD, 'photo')
    );
    const soilProfilePhotoSummaries = soilProfilePhotos.flatMap(document =>
        getPhotoAnnotationSummary(
            document,
            getFirstFilledStrokeField(document, SOIL_PROFILE_PHOTO_ANNOTATION_FIELDS),
            'soilProfilePhoto'
        )
    );

    return photoSummaries.concat(soilProfilePhotoSummaries);
}


export function getPhotoAnnotationSummaryLabel(value: unknown): string {

    const stats = getPenMemoStrokeStats(value);
    if (stats.strokeCount === 0) return '';
    if (stats.pointCount === 0) return `사진 표시 ${stats.strokeCount}획`;

    return `사진 표시 ${stats.strokeCount}획/${stats.pointCount}점`;
}


export function getPhotoAnnotationSketchPreview(value: unknown): KoreanFieldworkPenMemoSketchPreview|undefined {

    const preview = getPenMemoSketchPreview(value);
    const label = getPhotoAnnotationSummaryLabel(value);

    return preview && label ? { ...preview, label } : undefined;
}


export function getPendingPenMemoTranscriptionIssues(
        penMemos: Document[]
): KoreanFieldworkReadinessIssue[] {

    return penMemos.map(document => {
        const hasAutoTranscript = hasTextValue(document.resource.penMemoAutoTranscript);
        const hasHandwriting = hasPenMemoHandwriting(document.resource.penMemoStrokes);
        const sketchSummaryLabel = getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes);
        const summaryLabel = getPenMemoTranscriptionSummaryLabel(document);
        const summarySentencePrefix = summaryLabel.replace(/[.。]\s*$/, '');

        return {
            severity: 'warning',
            documentId: document.resource.id,
            identifier: document.resource.identifier || document.resource.id,
            category: document.resource.category,
            ruleId: hasAutoTranscript
                ? 'pen-memo-auto-transcript-review'
                : 'pen-memo-handwriting-transcription',
            message: hasAutoTranscript
                ? [
                    '자동 전사된 야장 메모가 검토되지 않았습니다.',
                    hasHandwriting ? sketchSummaryLabel : ''
                ].filter(Boolean).join(' ')
                : [
                    '태블릿 손글씨 야장 메모가 아직 전사되지 않았습니다.',
                    sketchSummaryLabel
                ].filter(Boolean).join(' '),
            relatedFields: hasAutoTranscript
                ? ['penMemoAutoTranscript', 'penMemoReviewedTranscript', 'penMemoTranscriptionStatus']
                : ['penMemoStrokes', 'penMemoReviewedTranscript', 'penMemoTranscriptionStatus'],
            recommendedAction: hasAutoTranscript
                ? [
                    summarySentencePrefix,
                    hasHandwriting
                        ? '자동 전사를 원본 손글씨와 대조하고 검토 전사문으로 확정하세요.'
                        : '자동 전사를 확인하고 검토 전사문으로 확정하세요.'
                ].filter(Boolean).join('. ')
                : [
                    summaryLabel,
                    '태블릿 손글씨 원자료를 읽어 검토 전사문으로 남기세요.'
                ].filter(Boolean).join(' '),
            blocksSave: false
        };
    });
}


function getMissingEvidenceKinds(bundle: EvidenceBundle,
                                 pendingPenMemoTranscriptions: Document[],
                                 reviewPhotos: Document[],
                                 reviewSoilProfilePhotos: Document[],
                                 reviewDrawings: Document[]): string[] {

    const missing: string[] = [];

    if (reviewPhotos.length === 0 && reviewSoilProfilePhotos.length === 0) missing.push('photo');
    if (reviewDrawings.length === 0) missing.push('drawing');
    if (bundle.reportPreparationReviews.length === 0 && bundle.reportEditorialCrossChecks.length === 0) {
        missing.push('reportReview');
    }
    if (pendingPenMemoTranscriptions.length > 0) missing.push('penMemoTranscription');

    return missing;
}


function hasTextValue(value: unknown): boolean {

    return !!getTextValue(value);
}


function getTextValue(value: unknown): string|undefined {

    const text = typeof value === 'string' ? value.trim() : '';

    return text.length > 0 ? text : undefined;
}


function getSoilProfileColorSwatchEntries(value: unknown): string[] {

    if (typeof value !== 'string') return getSoilProfileColorSwatchEntriesFromParsedValue(value);

    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === '[]') return [];

    if (trimmedValue.startsWith('[')) {
        try {
            return getSoilProfileColorSwatchEntriesFromParsedValue(JSON.parse(trimmedValue));
        } catch (_err) {
            // Fall through to line parsing below.
        }
    }

    return trimmedValue
        .split(/\r?\n/)
        .map(line => getNormalizedSoilColorSwatchLine(line))
        .filter((line): line is string => !!line);
}


function getSoilProfileColorSwatchEntriesFromParsedValue(value: unknown): string[] {

    if (!Array.isArray(value)) return [];

    return value
        .map((entry, index) => getSoilProfileColorSwatchEntryFromParsedValue(entry, index))
        .filter((entry): entry is string => !!entry);
}


function getSoilProfileColorSwatchEntryFromParsedValue(value: unknown, index: number): string|undefined {

    if (typeof value === 'string') return getNormalizedSoilColorSwatchLine(value);
    if (!isRecord(value)) return undefined;

    const munsell = getTextValue(value.munsell);
    const label = getTextValue(value.label);
    const layer = getTextValue(value.layer)
        ?? getTextValue(value.layerNumber)
        ?? getTextValue(value.number)
        ?? `${index + 1}`;
    const colorValue = munsell ?? label;

    return colorValue ? `${layer}: ${colorValue}` : undefined;
}


function getNormalizedSoilColorSwatchLine(value: string): string|undefined {

    const line = value.trim();
    if (!line) return undefined;

    const match = line.match(/^\s*(\d+)\s*:?\s*(.*)$/);
    if (!match) return line;

    const colorValue = match[2]?.trim() ?? '';
    return colorValue ? `${match[1]}: ${colorValue}` : undefined;
}


function hasPenMemoHandwriting(value: unknown): boolean {

    return getPenMemoStrokeStats(value).strokeCount > 0;
}


function getPhotoAnnotationSummary(
        document: Document,
        fieldName: string|undefined,
        source: KoreanFieldworkPhotoAnnotationSummary['source']
): KoreanFieldworkPhotoAnnotationSummary[] {

    if (!fieldName) return [];

    const value = document.resource[fieldName];
    const preview = getPhotoAnnotationSketchPreview(value);
    if (!preview) return [];
    const updatedAt = getPhotoAnnotationUpdatedAt(document, fieldName, source);

    return [{
        document,
        label: getPhotoAnnotationReviewLabel(preview.label, updatedAt),
        preview,
        source,
        ...(updatedAt ? { updatedAt } : {})
    }];
}


function getPhotoAnnotationReviewLabel(annotationLabel: string, updatedAt: string|undefined): string {

    return [
        annotationLabel,
        updatedAt ? `수정 ${updatedAt}` : ''
    ].filter(label => label.trim().length > 0).join(' · ');
}


function getPhotoAnnotationUpdatedAt(
        document: Document,
        fieldName: string,
        source: KoreanFieldworkPhotoAnnotationSummary['source']
): string|undefined {

    if (source === 'photo') {
        return getTextValue(document.resource[FIELDWORK_PHOTO_ANNOTATION_UPDATED_AT_FIELD]);
    }

    return fieldName === 'soilProfilePhotoAnnotationStrokes'
        ? getTextValue(document.resource[SOIL_PROFILE_PHOTO_ANNOTATION_UPDATED_AT_FIELD])
        : undefined;
}


function prependRootDocumentByCategory(rootDocument: Document,
                                       documents: Document[],
                                       categoryName: string): Document[] {

    const candidates = rootDocument.resource.category === categoryName
        ? [rootDocument, ...documents]
        : documents;
    const seenIds = new Set<string>();

    return candidates.filter(document => {
        const id = document.resource.id;
        if (seenIds.has(id)) return false;

        seenIds.add(id);
        return true;
    });
}


function getFirstFilledStrokeField(document: Document, fieldNames: string[]): string|undefined {

    return fieldNames.find(fieldName => getPenMemoStrokes(document.resource[fieldName]).length > 0);
}


export function getPenMemoSketchSummaryLabel(value: unknown): string {

    const stats = getPenMemoStrokeStats(value);
    if (stats.strokeCount === 0) return '';
    if (stats.pointCount === 0) return `스케치 메모 ${stats.strokeCount}획.`;

    return `스케치 메모 ${stats.strokeCount}획/${stats.pointCount}점.`;
}


export function getPenMemoSketchPreview(
        value: unknown,
        options: {
            normalizedCanvasAspectRatio?: number;
            preserveNormalizedCanvas?: boolean;
        } = {}
): KoreanFieldworkPenMemoSketchPreview|undefined {

    const strokes = getPenMemoStrokes(value, !options.preserveNormalizedCanvas);
    const drawableStrokes = strokes.filter(stroke => stroke.tool !== 'eraser');
    if (drawableStrokes.length === 0) return undefined;

    const normalizedCanvasAspectRatio = options.preserveNormalizedCanvas
        ? Math.max(0.05, Math.min(20, options.normalizedCanvasAspectRatio ?? 1))
        : 1;
    const visibleNormalizedSegments = options.preserveNormalizedCanvas
        ? getVisibleNormalizedCanvasSegments(strokes, normalizedCanvasAspectRatio)
        : [];
    const shouldReplayInfiniteGridErasers = !options.preserveNormalizedCanvas
        && isPenMemoInfiniteGridValue(value)
        && strokes.some(stroke => stroke.tool === 'eraser');
    const visibleInfiniteGridSegments = shouldReplayInfiniteGridErasers
        ? getVisibleNormalizedCanvasSegments(strokes, 1)
        : [];
    if (options.preserveNormalizedCanvas && visibleNormalizedSegments.length === 0) {
        return undefined;
    }
    if (shouldReplayInfiniteGridErasers && visibleInfiniteGridSegments.length === 0) {
        return undefined;
    }

    const points = shouldReplayInfiniteGridErasers
        ? visibleInfiniteGridSegments.flatMap(segment => [segment.start, segment.end])
        : drawableStrokes.flatMap(stroke => stroke.points);
    const bounds = options.preserveNormalizedCanvas
        ? { minX: 0, minY: 0, maxX: 10000, maxY: 10000 }
        : getPointBounds(points);
    const previewWidth = 120;
    const previewHeight = 72;
    const padding = 8;
    const drawableWidth = previewWidth - (padding * 2);
    const drawableHeight = previewHeight - (padding * 2);
    const sourceWidth = Math.max(1, bounds.maxX - bounds.minX);
    const sourceHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(
        drawableWidth / (sourceWidth * normalizedCanvasAspectRatio),
        drawableHeight / sourceHeight
    );
    const scaleX = scale * normalizedCanvasAspectRatio;
    const scaleY = scale;
    const scaledWidth = sourceWidth * scaleX;
    const scaledHeight = sourceHeight * scaleY;
    const offsetX = padding + ((drawableWidth - scaledWidth) / 2);
    const offsetY = padding + ((drawableHeight - scaledHeight) / 2);
    const toPreviewPoint = (point: KoreanFieldworkPenMemoPoint) => ({
        x: roundPreviewCoordinate(offsetX + ((point.x - bounds.minX) * scaleX)),
        y: roundPreviewCoordinate(offsetY + ((point.y - bounds.minY) * scaleY))
    });
    const path = options.preserveNormalizedCanvas
        ? visibleNormalizedSegments
            .map(segment => getPreviewStrokePath(
                isSamePenMemoPoint(segment.start, segment.end)
                    ? [toPreviewPoint(segment.start)]
                    : [toPreviewPoint(segment.start), toPreviewPoint(segment.end)]
            ))
            .filter(strokePath => strokePath.length > 0)
            .join(' ')
        : shouldReplayInfiniteGridErasers
            ? visibleInfiniteGridSegments
                .map(segment => getPreviewStrokePath(
                    isSamePenMemoPoint(segment.start, segment.end)
                        ? [toPreviewPoint(segment.start)]
                        : [toPreviewPoint(segment.start), toPreviewPoint(segment.end)]
                ))
                .filter(strokePath => strokePath.length > 0)
                .join(' ')
        : drawableStrokes
            .map(stroke => getPreviewStrokePath(stroke.points.map(toPreviewPoint)))
            .filter(strokePath => strokePath.length > 0)
            .join(' ');

    if (!path) return undefined;

    return {
        label: getPenMemoSketchSummaryLabel(value),
        path,
        viewBox: `0 0 ${previewWidth} ${previewHeight}`
    };
}


function getPenMemoStrokeStats(value: unknown): { strokeCount: number, pointCount: number } {

    if (typeof value !== 'string') return getPenMemoStrokeStatsFromStrokes(getParsedPenMemoStrokes(value));

    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === '[]') return { strokeCount: 0, pointCount: 0 };

    try {
        return getPenMemoStrokeStatsFromStrokes(getParsedPenMemoStrokes(JSON.parse(trimmedValue)));
    } catch (_err) {
        return { strokeCount: 1, pointCount: 0 };
    }
}


function getPenMemoStrokeStatsFromStrokes(strokes: KoreanFieldworkPenMemoStroke[]): {
    strokeCount: number;
    pointCount: number;
} {

    return {
        strokeCount: strokes.length,
        pointCount: strokes.reduce((sum, stroke) => sum + stroke.points.length, 0)
    };
}


function getPenMemoStrokes(
        value: unknown,
        allowInfiniteGridCoordinates: boolean = false
): KoreanFieldworkPenMemoStroke[] {

    if (typeof value !== 'string') {
        return getParsedPenMemoStrokes(value, allowInfiniteGridCoordinates);
    }

    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === '[]') return [];

    try {
        return getParsedPenMemoStrokes(JSON.parse(trimmedValue), allowInfiniteGridCoordinates);
    } catch (_err) {
        return [];
    }
}


function getParsedPenMemoStrokes(
        value: unknown,
        allowInfiniteGridCoordinates: boolean = false
): KoreanFieldworkPenMemoStroke[] {

    const strokesValue = isRecord(value) && Array.isArray(value.strokes)
        ? value.strokes
        : value;
    if (!Array.isArray(strokesValue)) return [];
    const preserveInfiniteGridCoordinates = allowInfiniteGridCoordinates
        && isPenMemoInfiniteGridPayload(value);

    return strokesValue
        .map(stroke => ({
            points: getStrokePoints(stroke, preserveInfiniteGridCoordinates),
            tool: isRecord(stroke) && stroke.tool === 'eraser'
                ? 'eraser' as const
                : 'pen' as const,
            width: getPenMemoStrokeWidth(stroke)
        }))
        .filter(stroke => stroke.points.length > 0);
}


function getVisibleNormalizedCanvasSegments(
        strokes: KoreanFieldworkPenMemoStroke[],
        aspectRatio: number
): KoreanFieldworkPenMemoSegment[] {

    let visibleSegments: KoreanFieldworkPenMemoSegment[] = [];
    let sourceSegmentCount = 0;
    let eraserCheckCount = 0;

    for (const stroke of strokes) {
        const remainingSourceSegments = MAX_NORMALIZED_PREVIEW_SOURCE_SEGMENTS - sourceSegmentCount;
        if (remainingSourceSegments <= 0) break;

        const strokeSegments = getPenMemoStrokeSegments(stroke, remainingSourceSegments);
        sourceSegmentCount += strokeSegments.length;

        if (stroke.tool !== 'eraser') {
            visibleSegments.push(...strokeSegments.slice(
                0,
                MAX_NORMALIZED_PREVIEW_VISIBLE_SEGMENTS - visibleSegments.length
            ));
            continue;
        }

        const erasedSegments: KoreanFieldworkPenMemoSegment[] = [];
        for (const visibleSegment of visibleSegments) {
            if (erasedSegments.length >= MAX_NORMALIZED_PREVIEW_VISIBLE_SEGMENTS) break;

            const remainingEraserChecks = MAX_NORMALIZED_PREVIEW_ERASER_CHECKS - eraserCheckCount;
            if (remainingEraserChecks <= 0) {
                erasedSegments.push(visibleSegment);
                continue;
            }

            const checkedEraserSegments = strokeSegments.slice(0, remainingEraserChecks);
            eraserCheckCount += checkedEraserSegments.length;
            erasedSegments.push(...getNormalizedCanvasSegmentFragments(
                visibleSegment,
                checkedEraserSegments,
                aspectRatio
            ).slice(0, MAX_NORMALIZED_PREVIEW_VISIBLE_SEGMENTS - erasedSegments.length));
        }
        visibleSegments = erasedSegments;
    }

    return visibleSegments;
}


function getPenMemoStrokeSegments(
        stroke: KoreanFieldworkPenMemoStroke,
        limit: number = Number.POSITIVE_INFINITY
): KoreanFieldworkPenMemoSegment[] {

    if (limit <= 0) return [];

    if (stroke.points.length === 1) {
        return [{
            start: stroke.points[0],
            end: stroke.points[0],
            width: stroke.width ?? DEFAULT_PEN_MEMO_STROKE_WIDTH
        }];
    }

    return stroke.points.slice(0, Math.min(stroke.points.length - 1, limit)).map((point, index) => ({
        start: point,
        end: stroke.points[index + 1],
        width: stroke.width ?? DEFAULT_PEN_MEMO_STROKE_WIDTH
    }));
}


function getNormalizedCanvasSegmentFragments(
        segment: KoreanFieldworkPenMemoSegment,
        eraserSegments: KoreanFieldworkPenMemoSegment[],
        aspectRatio: number
): KoreanFieldworkPenMemoSegment[] {

    const erasedIntervals = eraserSegments.flatMap(eraserSegment =>
        getNormalizedCanvasEraserIntervals(segment, eraserSegment, aspectRatio)
    );
    const visibleIntervals = getVisiblePenMemoIntervals(erasedIntervals);

    return visibleIntervals.map(interval => ({
        start: interpolatePenMemoPoint(segment.start, segment.end, interval.start),
        end: interpolatePenMemoPoint(segment.start, segment.end, interval.end),
        width: segment.width
    }));
}


function toNormalizedCanvasPixel(
        point: KoreanFieldworkPenMemoPoint,
        aspectRatio: number
): KoreanFieldworkPenMemoPoint {

    return {
        x: (point.x / 10000) * NORMALIZED_SKETCH_CANVAS_WIDTH,
        y: (point.y / 10000) * (NORMALIZED_SKETCH_CANVAS_WIDTH / aspectRatio)
    };
}


function getNormalizedCanvasEraserIntervals(
        penSegment: KoreanFieldworkPenMemoSegment,
        eraserSegment: KoreanFieldworkPenMemoSegment,
        aspectRatio: number
): KoreanFieldworkPenMemoInterval[] {

    const penStart = toNormalizedCanvasPixel(penSegment.start, aspectRatio);
    const penEnd = toNormalizedCanvasPixel(penSegment.end, aspectRatio);
    const eraserStart = toNormalizedCanvasPixel(eraserSegment.start, aspectRatio);
    const eraserEnd = toNormalizedCanvasPixel(eraserSegment.end, aspectRatio);
    const radius = (penSegment.width + eraserSegment.width) / 2;
    const intervals = [
        getPenMemoCircleIntersectionInterval(penStart, penEnd, eraserStart, radius),
        getPenMemoCircleIntersectionInterval(penStart, penEnd, eraserEnd, radius),
        getPenMemoEraserBodyIntersectionInterval(
            penStart,
            penEnd,
            eraserStart,
            eraserEnd,
            radius
        )
    ].filter((interval): interval is KoreanFieldworkPenMemoInterval => !!interval);

    return mergePenMemoIntervals(intervals);
}


function getPenMemoCircleIntersectionInterval(
        lineStart: KoreanFieldworkPenMemoPoint,
        lineEnd: KoreanFieldworkPenMemoPoint,
        center: KoreanFieldworkPenMemoPoint,
        radius: number
): KoreanFieldworkPenMemoInterval|undefined {

    const direction = subtractPenMemoPoints(lineEnd, lineStart);
    const relativeStart = subtractPenMemoPoints(lineStart, center);
    const quadratic = dotPenMemoPoints(direction, direction);
    if (quadratic <= NORMALIZED_PREVIEW_INTERVAL_EPSILON) {
        return dotPenMemoPoints(relativeStart, relativeStart) <= radius ** 2
            ? { start: 0, end: 1 }
            : undefined;
    }

    const linear = 2 * dotPenMemoPoints(relativeStart, direction);
    const constant = dotPenMemoPoints(relativeStart, relativeStart) - (radius ** 2);
    const discriminant = (linear ** 2) - (4 * quadratic * constant);
    if (discriminant < 0) return undefined;

    const root = Math.sqrt(Math.max(0, discriminant));

    return clampPenMemoInterval({
        start: (-linear - root) / (2 * quadratic),
        end: (-linear + root) / (2 * quadratic)
    });
}


function getPenMemoEraserBodyIntersectionInterval(
        lineStart: KoreanFieldworkPenMemoPoint,
        lineEnd: KoreanFieldworkPenMemoPoint,
        eraserStart: KoreanFieldworkPenMemoPoint,
        eraserEnd: KoreanFieldworkPenMemoPoint,
        radius: number
): KoreanFieldworkPenMemoInterval|undefined {

    const lineDirection = subtractPenMemoPoints(lineEnd, lineStart);
    const eraserDirection = subtractPenMemoPoints(eraserEnd, eraserStart);
    const eraserLengthSquared = dotPenMemoPoints(eraserDirection, eraserDirection);
    if (eraserLengthSquared <= NORMALIZED_PREVIEW_INTERVAL_EPSILON) return undefined;

    const relativeStart = subtractPenMemoPoints(lineStart, eraserStart);
    const projectionInterval = getPenMemoLinearValueInterval(
        dotPenMemoPoints(relativeStart, eraserDirection) / eraserLengthSquared,
        dotPenMemoPoints(lineDirection, eraserDirection) / eraserLengthSquared,
        0,
        1
    );
    const eraserLength = Math.sqrt(eraserLengthSquared);
    const distanceInterval = getPenMemoLinearValueInterval(
        crossPenMemoPoints(eraserDirection, relativeStart) / eraserLength,
        crossPenMemoPoints(eraserDirection, lineDirection) / eraserLength,
        -radius,
        radius
    );

    return projectionInterval && distanceInterval
        ? intersectPenMemoIntervals(projectionInterval, distanceInterval)
        : undefined;
}


function getPenMemoLinearValueInterval(
        startValue: number,
        change: number,
        minValue: number,
        maxValue: number
): KoreanFieldworkPenMemoInterval|undefined {

    if (Math.abs(change) <= NORMALIZED_PREVIEW_INTERVAL_EPSILON) {
        return startValue >= minValue && startValue <= maxValue
            ? { start: 0, end: 1 }
            : undefined;
    }

    const first = (minValue - startValue) / change;
    const second = (maxValue - startValue) / change;

    return clampPenMemoInterval({
        start: Math.min(first, second),
        end: Math.max(first, second)
    });
}


function getVisiblePenMemoIntervals(
        erasedIntervals: KoreanFieldworkPenMemoInterval[]
): KoreanFieldworkPenMemoInterval[] {

    const mergedIntervals = mergePenMemoIntervals(erasedIntervals);
    const visibleIntervals: KoreanFieldworkPenMemoInterval[] = [];
    let cursor = 0;

    for (const interval of mergedIntervals) {
        if (interval.start - cursor > NORMALIZED_PREVIEW_INTERVAL_EPSILON) {
            visibleIntervals.push({ start: cursor, end: interval.start });
        }
        cursor = Math.max(cursor, interval.end);
    }
    if (1 - cursor > NORMALIZED_PREVIEW_INTERVAL_EPSILON) {
        visibleIntervals.push({ start: cursor, end: 1 });
    }

    return visibleIntervals;
}


function mergePenMemoIntervals(
        intervals: KoreanFieldworkPenMemoInterval[]
): KoreanFieldworkPenMemoInterval[] {

    const sortedIntervals = intervals
        .map(clampPenMemoInterval)
        .filter((interval): interval is KoreanFieldworkPenMemoInterval => !!interval)
        .sort((first, second) => first.start - second.start);
    const mergedIntervals: KoreanFieldworkPenMemoInterval[] = [];

    for (const interval of sortedIntervals) {
        const previous = mergedIntervals[mergedIntervals.length - 1];
        if (!previous || interval.start > previous.end + NORMALIZED_PREVIEW_INTERVAL_EPSILON) {
            mergedIntervals.push({ ...interval });
        } else {
            previous.end = Math.max(previous.end, interval.end);
        }
    }

    return mergedIntervals;
}


function intersectPenMemoIntervals(
        first: KoreanFieldworkPenMemoInterval,
        second: KoreanFieldworkPenMemoInterval
): KoreanFieldworkPenMemoInterval|undefined {

    return clampPenMemoInterval({
        start: Math.max(first.start, second.start),
        end: Math.min(first.end, second.end)
    });
}


function clampPenMemoInterval(
        interval: KoreanFieldworkPenMemoInterval
): KoreanFieldworkPenMemoInterval|undefined {

    const start = Math.max(0, interval.start);
    const end = Math.min(1, interval.end);

    return end >= start ? { start, end } : undefined;
}


function interpolatePenMemoPoint(
        start: KoreanFieldworkPenMemoPoint,
        end: KoreanFieldworkPenMemoPoint,
        ratio: number
): KoreanFieldworkPenMemoPoint {

    return {
        x: start.x + ((end.x - start.x) * ratio),
        y: start.y + ((end.y - start.y) * ratio)
    };
}


function subtractPenMemoPoints(
        first: KoreanFieldworkPenMemoPoint,
        second: KoreanFieldworkPenMemoPoint
): KoreanFieldworkPenMemoPoint {

    return { x: first.x - second.x, y: first.y - second.y };
}


function dotPenMemoPoints(
        first: KoreanFieldworkPenMemoPoint,
        second: KoreanFieldworkPenMemoPoint
): number {

    return (first.x * second.x) + (first.y * second.y);
}


function crossPenMemoPoints(
        first: KoreanFieldworkPenMemoPoint,
        second: KoreanFieldworkPenMemoPoint
): number {

    return (first.x * second.y) - (first.y * second.x);
}


function getPenMemoStrokeWidth(stroke: unknown): number {

    const width = isRecord(stroke)
        && typeof stroke.width === 'number'
        && Number.isFinite(stroke.width)
        ? stroke.width
        : DEFAULT_PEN_MEMO_STROKE_WIDTH;

    return Math.max(1, Math.min(MAX_PEN_MEMO_STROKE_WIDTH, width));
}


function isSamePenMemoPoint(
        first: KoreanFieldworkPenMemoPoint,
        second: KoreanFieldworkPenMemoPoint
): boolean {

    return first.x === second.x && first.y === second.y;
}


function getStrokePoints(
        stroke: unknown,
        preserveInfiniteGridCoordinates: boolean = false
): KoreanFieldworkPenMemoPoint[] {

    const points = isRecord(stroke) && Array.isArray(stroke.points)
        ? stroke.points
        : stroke;

    if (!Array.isArray(points)) return [];

    return points
        .map(point => getStrokePoint(point, preserveInfiniteGridCoordinates))
        .filter((point): point is KoreanFieldworkPenMemoPoint => point !== undefined);
}


function getStrokePoint(
        point: unknown,
        preserveInfiniteGridCoordinates: boolean
): KoreanFieldworkPenMemoPoint|undefined {

    if (!isRecord(point)) return undefined;
    const x = getFiniteCoordinate(point.x, preserveInfiniteGridCoordinates);
    const y = getFiniteCoordinate(point.y, preserveInfiniteGridCoordinates);

    return x === undefined || y === undefined
        ? undefined
        : { x, y };
}


function getFiniteCoordinate(
        value: unknown,
        preserveInfiniteGridCoordinates: boolean
): number|undefined {

    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

    const coordinateLimit = preserveInfiniteGridCoordinates
        ? PEN_MEMO_INFINITE_GRID_COORDINATE_LIMIT
        : 10000;

    return Math.max(
        preserveInfiniteGridCoordinates ? -coordinateLimit : 0,
        Math.min(coordinateLimit, value)
    );
}


function isPenMemoInfiniteGridPayload(value: unknown): boolean {

    return isRecord(value)
        && value.version === 2
        && value.coordinateSpace === PEN_MEMO_INFINITE_GRID_COORDINATE_SPACE;
}


function isPenMemoInfiniteGridValue(value: unknown): boolean {

    if (typeof value !== 'string') return isPenMemoInfiniteGridPayload(value);

    try {
        return isPenMemoInfiniteGridPayload(JSON.parse(value));
    } catch (_err) {
        return false;
    }
}


function getPointBounds(points: KoreanFieldworkPenMemoPoint[]) {

    return points.reduce((bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxX: Math.max(bounds.maxX, point.x),
        maxY: Math.max(bounds.maxY, point.y)
    }), {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY
    });
}


function getPreviewStrokePath(points: KoreanFieldworkPenMemoPoint[]): string {

    if (points.length === 0) return '';
    if (points.length === 1) {
        const point = points[0];

        return `M ${roundPreviewCoordinate(point.x - 2)} ${point.y} L ${roundPreviewCoordinate(point.x + 2)} ${point.y} `
            + `M ${point.x} ${roundPreviewCoordinate(point.y - 2)} L ${point.x} ${roundPreviewCoordinate(point.y + 2)}`;
    }

    const [firstPoint, ...restPoints] = points;

    return [
        `M ${firstPoint.x} ${firstPoint.y}`,
        ...restPoints.map(point => `L ${point.x} ${point.y}`)
    ].join(' ');
}


function roundPreviewCoordinate(value: number): number {

    return Math.round(value * 10) / 10;
}


function isRecord(value: unknown): value is Record<string, unknown> {

    return !!value && typeof value === 'object';
}
