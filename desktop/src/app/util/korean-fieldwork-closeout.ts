import {
    getKoreanFieldworkRecordFieldValueSummary,
    getKoreanFieldworkTodaySummary,
    Document,
    hasConfirmedKoreanFieldworkImageUpload,
    KoreanFieldworkReadinessIssue
} from 'idai-field-core';
import {
    getPhotoAnnotationSummaryLabel,
    getPenMemoSketchSummaryLabel,
    getPenMemoTranscriptionSummaryLabel
} from './korean-fieldwork-evidence-review';
import { getMunsellCandidateSummaryLabel } from './korean-fieldwork-soil-color-candidates';


export type KoreanFieldworkCloseoutStatus = 'clear'|'needsReview'|'blocked';

export interface KoreanFieldworkCloseoutCounts {
    critical: number;
    warning: number;
    info: number;
}

export interface KoreanFieldworkCloseoutSummary {
    status: KoreanFieldworkCloseoutStatus;
    title: string;
    detail: string;
    counts: KoreanFieldworkCloseoutCounts;
    issues: KoreanFieldworkReadinessIssue[];
}

const SEVERITY_ORDER: Record<KoreanFieldworkReadinessIssue['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2
};

const PHOTO_CATEGORY = 'Photo';
const DRAWING_CATEGORY = 'Drawing';
const PEN_MEMO_CATEGORY = 'PenMemo';
const SOIL_PROFILE_PHOTO_CATEGORY = 'SoilProfilePhoto';
const FIELD_RECORD_QUALITY_REVIEW_CATEGORY = 'FieldRecordQualityReview';
const DIRECT_FIELDWORK_PHOTO_CATEGORIES = new Set([
    'DailyLog',
    'Feature',
    'FeatureGroup',
    'FeatureSegment',
    FIELD_RECORD_QUALITY_REVIEW_CATEGORY,
    'Find',
    'FindCollection',
    'Layer',
    'Operation',
    'Sample',
    'Survey',
    'SurveyBoundary',
    'Trench'
]);
const FIELDWORK_PHOTO_ANNOTATION_FIELDS = ['fieldworkPhotoAnnotationStrokes'];
const SOIL_PROFILE_PHOTO_ANNOTATION_FIELDS = [
    'soilProfilePhotoAnnotationStrokes',
    'soilProfileAnnotationStrokes'
];
const FIELD_RECORD_QUALITY_REVIEW_CLOSED_STAGE = 'closedAfterCorrection';
const FIELD_RECORD_QUALITY_REVIEW_REPORT_FEEDBACK_STAGE = 'postEvaluationFeedback';
const FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS = [
    {
        fieldName: 'reviewedRecordUnit',
        label: '\uac80\ud1a0 \ub300\uc0c1'
    },
    {
        fieldName: 'qualityReviewStage',
        label: '\uac80\ud1a0 \ub2e8\uacc4'
    },
    {
        fieldName: 'qualityCorrectionBasis',
        label: '\uc218\uc815\u00b7\ubcf4\uc644 \uadfc\uac70'
    },
    {
        fieldName: 'reportEvaluationFeedback',
        label: '\ud3c9\uac00 \ud658\ub958'
    }
];
const FIELD_RECORD_QUALITY_REVIEW_REQUIRED_FIELD_NAMES = [
    'reviewedRecordUnit',
    'qualityReviewStage',
    'qualityCorrectionBasis'
];


export function makeKoreanFieldworkCloseoutSummary(documents: Document[],
                                                   maxIssues: number = 4): KoreanFieldworkCloseoutSummary {

    return getKoreanFieldworkCloseoutSummary(
        dedupeIssues([
            ...getKoreanFieldworkCloseoutReviewIssues(documents),
            ...getKoreanFieldworkTodaySummary(documents).openIssues
        ]),
        maxIssues
    );
}


export function getKoreanFieldworkCloseoutSummary(
        issues: KoreanFieldworkReadinessIssue[],
        maxIssues: number = 4
): KoreanFieldworkCloseoutSummary {

    const counts = getIssueCounts(issues);
    const sortedIssues = issues.slice().sort(compareIssues);

    if (counts.critical > 0) {
        return {
            status: 'blocked',
            title: '먼저 볼 항목',
            detail: `오늘 먼저 처리할 항목 ${counts.critical}건이 남아 있습니다.`,
            counts,
            issues: sortedIssues.slice(0, maxIssues)
        };
    }

    if (counts.warning + counts.info > 0) {
        return {
            status: 'needsReview',
            title: '마감 전 확인',
            detail: `이어서 볼 항목 ${counts.warning}건, 살펴볼 항목 ${counts.info}건이 남아 있습니다.`,
            counts,
            issues: sortedIssues.slice(0, maxIssues)
        };
    }

    return {
        status: 'clear',
        title: '마감 가능',
        detail: '현재 조사 구역 기록으로 남은 점검 항목이 없습니다.',
        counts,
        issues: []
    };
}


function getIssueCounts(issues: KoreanFieldworkReadinessIssue[]): KoreanFieldworkCloseoutCounts {

    return issues.reduce((counts, issue) => ({
        ...counts,
        [issue.severity]: counts[issue.severity] + 1
    }), {
        critical: 0,
        warning: 0,
        info: 0
    });
}


function getKoreanFieldworkCloseoutReviewIssues(documents: Document[]): KoreanFieldworkReadinessIssue[] {

    return documents.flatMap(document => {
        if (document.resource.category === PHOTO_CATEGORY) {
            return getFieldworkPhotoCloseoutIssues(document);
        }
        if (document.resource.category === SOIL_PROFILE_PHOTO_CATEGORY) {
            return getSoilProfilePhotoCloseoutIssues(document);
        }
        if (document.resource.category === DRAWING_CATEGORY) {
            return getDrawingCloseoutIssues(document);
        }
        if (document.resource.category === PEN_MEMO_CATEGORY) {
            return getPenMemoCloseoutIssues(document);
        }
        if (document.resource.category === FIELD_RECORD_QUALITY_REVIEW_CATEGORY) {
            return [
                ...getFieldRecordQualityReviewCloseoutIssues(document),
                ...getDirectFieldworkPhotoCloseoutIssues(document)
            ];
        }
        if (DIRECT_FIELDWORK_PHOTO_CATEGORIES.has(String(document.resource.category))) {
            return getDirectFieldworkPhotoCloseoutIssues(document);
        }

        return [];
    });
}


function getFieldworkPhotoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    return [
        ...getPhotoReportMetadataCloseoutIssues(
            document,
            'fieldwork-photo-report-metadata-missing',
            '현장사진의 보고서용 원본 정보가 부족합니다.',
            'fieldworkPhotoCapturedAt'
        ),
        ...getPhotoUploadCloseoutIssues(
            document,
            ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
            'fieldwork-photo-upload-missing',
            '현장사진 원본 보존 상태가 아직 확인되지 않았습니다.'
        ),
        ...getPhotoAnnotationCloseoutIssues(
            document,
            FIELDWORK_PHOTO_ANNOTATION_FIELDS,
            'fieldwork-photo-annotation-review',
            '사진 위에 남긴 표시가 보고서용 설명으로 옮겨지지 않았습니다.'
        )
    ];
}


function getDrawingCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    return getPhotoUploadCloseoutIssues(
        document,
        ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
        'fieldwork-drawing-upload-missing',
        '도면 원본 보존 상태가 아직 확인되지 않았습니다.'
    );
}


function getDirectFieldworkPhotoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    return getPhotoUploadCloseoutIssues(
        document,
        ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
        'fieldwork-attached-photo-upload-missing',
        '기록에 직접 붙은 태블릿 사진 원본 보존 상태가 아직 확인되지 않았습니다.'
    );
}


function getFieldRecordQualityReviewCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    const missingFields = getMissingFieldRecordQualityReviewFields(document);
    const qualityReviewStages = getStringListValue(document.resource.qualityReviewStage);
    const isClosed = qualityReviewStages.includes(FIELD_RECORD_QUALITY_REVIEW_CLOSED_STAGE);

    if (isClosed && missingFields.length === 0) return [];

    const detailSummary = getFieldRecordQualityReviewDetailSummary(document);
    const missingLabels = getFieldRecordQualityReviewFieldLabels(missingFields);
    const issueFields = dedupeStrings([
        ...missingFields,
        ...FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS.map(field => field.fieldName),
        'recordCreationTiming',
        'fieldRecordQuality',
        'reportCrossCheck',
        'verificationState'
    ]);

    return [createCloseoutReviewIssue(
        document,
        missingFields.length > 0
            ? 'field-record-quality-review-context-missing'
            : 'field-record-quality-review-follow-up',
        missingFields.length > 0
            ? '\uae30\ub85d \ubcf4\uc644 \uba54\ubaa8\uc5d0 \ubcf4\uace0\uc11c \uc791\uc131\uc5d0 \ud544\uc694\ud55c \uac80\ud1a0 \ub9e5\ub77d\uc774 \ube60\uc838 \uc788\uc2b5\ub2c8\ub2e4.'
            : '\uae30\ub85d \ubcf4\uc644 \uba54\ubaa8\ub97c HWP \uc791\uc131 \uc804\uc5d0 \ud655\uc778\ud574\uc57c \ud569\ub2c8\ub2e4.',
        getFieldRecordQualityReviewRecommendedAction(detailSummary, missingLabels),
        issueFields
    )];
}


function getMissingFieldRecordQualityReviewFields(document: Document): string[] {

    const missingFields = FIELD_RECORD_QUALITY_REVIEW_REQUIRED_FIELD_NAMES.filter(fieldName =>
        !getKoreanFieldworkRecordFieldValueSummary(fieldName, document.resource[fieldName])
    );
    const qualityReviewStages = getStringListValue(document.resource.qualityReviewStage);

    if (qualityReviewStages.includes(FIELD_RECORD_QUALITY_REVIEW_REPORT_FEEDBACK_STAGE)
            && !getKoreanFieldworkRecordFieldValueSummary(
                'reportEvaluationFeedback',
                document.resource.reportEvaluationFeedback
            )) {
        missingFields.push('reportEvaluationFeedback');
    }

    return missingFields;
}


function getFieldRecordQualityReviewDetailSummary(document: Document): string[] {

    return FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS
        .map(({ fieldName, label }) => {
            const summary = getKoreanFieldworkRecordFieldValueSummary(
                fieldName,
                document.resource[fieldName]
            );

            return summary ? `${label}: ${summary}` : undefined;
        })
        .filter((summary): summary is string => !!summary);
}


function getFieldRecordQualityReviewFieldLabels(fieldNames: string[]): string[] {

    return fieldNames
        .map(fieldName =>
            FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS.find(field => field.fieldName === fieldName)?.label
        )
        .filter((label): label is string => !!label);
}


function getFieldRecordQualityReviewRecommendedAction(detailSummary: string[],
                                                      missingLabels: string[]): string {

    const detailText = detailSummary.length > 0
        ? `${detailSummary.join('. ')}. `
        : '';

    if (missingLabels.length > 0) {
        return `${detailText}${missingLabels.join(', ')}\uc744 \ucc44\uc6b0\uace0, \ub370\uc2a4\ud06c\ud1b1 HWP \ubcf5\uc0ac \ube14\ub85d\uc5d0\uc11c \uac19\uc740 \ub77c\ubca8\ub85c \ubcf4\uc774\ub294\uc9c0 \ud655\uc778\ud558\uc138\uc694.`;
    }

    return `${detailText}\uc218\uc815 \ub0b4\uc5ed\uc774 \uc6d0\uae30\ub85d\uc744 \uc9c0\uc6b0\uc9c0 \uc54a\uace0 \ubcf4\uace0\uc11c \uc791\uc131\uc6a9 \ubcf5\uc0ac \ube14\ub85d\uacfc \uc77c\uce58\ud558\ub294\uc9c0 \ud655\uc778\ud558\uc138\uc694.`;
}


function getSoilProfilePhotoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    const issues: KoreanFieldworkReadinessIssue[] = getPhotoReportMetadataCloseoutIssues(
        document,
        'soil-profile-photo-report-metadata-missing',
        '토층사진의 보고서용 원본 정보가 부족합니다.',
        'soilProfilePhotoCapturedAt'
    ).concat(getPhotoUploadCloseoutIssues(
        document,
        ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri'],
        'soil-profile-photo-upload-missing',
        '토층사진 원본 보존 상태가 아직 확인되지 않았습니다.'
    )).concat(getPhotoAnnotationCloseoutIssues(
        document,
        SOIL_PROFILE_PHOTO_ANNOTATION_FIELDS,
        'soil-profile-photo-annotation-review',
        '토층사진 위에 남긴 표시가 층위 설명으로 옮겨지지 않았습니다.'
    ));

    if (document.resource.soilColorAssistStatus === 'candidatesAvailable') {
        const candidateSummary = getMunsellCandidateSummaryLabel(document.resource.soilColorAssistCandidates);
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-color-candidates-review',
            '사진에서 읽은 먼셀 후보를 검토해야 합니다.',
            `${candidateSummary ? `${candidateSummary}. ` : ''}사진 후보 중 실제 토색을 선택하거나 직접 먼셀값을 확인하세요.`,
            ['soilColorAssistCandidates', 'soilColorAssistStatus', 'soilProfileColorSwatches']
        ));
    } else if (document.resource.soilColorAssistStatus === 'lowConfidence') {
        const candidateSummary = getMunsellCandidateSummaryLabel(document.resource.soilColorAssistCandidates);
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-color-low-confidence',
            '사진 토색 후보의 신뢰도가 낮습니다.',
            `${candidateSummary ? `${candidateSummary}. ` : ''}현장에서 먼셀값을 직접 확인하고 토색 메모를 보강하세요.`,
            ['soilColorAssistCandidates', 'soilColorAssistStatus', 'soilProfileColorSwatches']
        ));
    }

    if (!hasSoilProfileColorSwatches(document.resource.soilProfileColorSwatches)) {
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-profile-color-swatches-missing',
            '토층사진의 번호별 토색이 아직 기록되지 않았습니다.',
            '사진 위 표시 번호와 대응되는 먼셀값 또는 토색 메모를 남기세요.',
            ['soilProfileColorSwatches']
        ));
    }

    return issues;
}


function getPhotoAnnotationCloseoutIssues(document: Document,
                                          strokeFields: string[],
                                          ruleId: string,
                                          message: string): KoreanFieldworkReadinessIssue[] {

    const annotatedField = strokeFields.find(fieldName =>
        hasTextValue(getPhotoAnnotationSummaryLabel(document.resource[fieldName]))
    );
    if (!annotatedField || hasPhotoAnnotationExplanation(document.resource)) return [];

    const annotationSummary = getPhotoAnnotationSummaryLabel(document.resource[annotatedField]);

    return [createCloseoutReviewIssue(
        document,
        ruleId,
        message,
        `${annotationSummary}. 표시한 위치가 무엇을 뜻하는지 description이나 shortDescription에 남겨 데스크톱 보고 정리에서 놓치지 않게 하세요.`,
        [annotatedField, 'description', 'shortDescription']
    )];
}


function getPhotoUploadCloseoutIssues(document: Document,
                                      uriFields: string[],
                                      ruleId: string,
                                      message: string): KoreanFieldworkReadinessIssue[] {

    const localUploadSource = uriFields
        .map(fieldName => getTextValue(document.resource[fieldName]))
        .find(isUploadableLocalUri);

    if (!localUploadSource
            || hasConfirmedKoreanFieldworkImageUpload(document.resource, localUploadSource)) {
        return [];
    }

    return [createCloseoutReviewIssue(
        document,
        ruleId,
        message,
        '태블릿 또는 프로젝트 백업 위치에 원본 파일이 남아 있는지 확인하고, 보존 위치와 확인 시각을 남기세요.',
        [
            'fieldworkImageUploadStatus',
            'fieldworkImageUploadedAt',
            'fieldworkImageUploadedUri',
            'fieldworkImageUploadTarget',
            'fieldworkImageUploadedProject',
            'fieldworkImageUploadedSizeBytes',
            'fieldworkImageUploadedMd5',
            'fieldworkImageStoredSizeBytes',
            'fieldworkImageStoredMd5',
            'fieldworkImageStoredSha256',
            'digitalSourcePreservation'
        ]
    )];
}


function getPhotoReportMetadataCloseoutIssues(document: Document,
                                             ruleId: string,
                                             message: string,
                                             capturedAtField: string): KoreanFieldworkReadinessIssue[] {

    const missingFields = getMissingPhotoReportMetadataFields(document.resource, capturedAtField);

    if (missingFields.length === 0) return [];

    return [createCloseoutReviewIssue(
        document,
        ruleId,
        message,
        `${getMissingPhotoReportMetadataLabel(missingFields)}를 확인해 원본 파일과 보고서 사진을 대조할 수 있게 남기세요.`,
        missingFields
    )];
}


function getMissingPhotoReportMetadataFields(resource: Record<string, any>,
                                             capturedAtField: string): string[] {

    const missingFields: string[] = [];

    if (!hasTextValue(resource.originalFilename)) missingFields.push('originalFilename');
    if (!hasTextValue(resource[capturedAtField])) missingFields.push(capturedAtField);
    if (!hasPositiveNumberValue(resource.width)) missingFields.push('width');
    if (!hasPositiveNumberValue(resource.height)) missingFields.push('height');

    return missingFields;
}


function getMissingPhotoReportMetadataLabel(fields: string[]): string {

    return fields.map(field => {
        if (field === 'originalFilename') return '원본 파일명';
        if (field === 'width') return '가로 픽셀';
        if (field === 'height') return '세로 픽셀';

        return '촬영시각';
    }).join(', ');
}


function hasPhotoAnnotationExplanation(resource: Record<string, any>): boolean {

    return hasTextValue(resource.description) || hasTextValue(resource.shortDescription);
}


function getPenMemoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    const hasReviewedTranscript = hasTextValue(document.resource.penMemoReviewedTranscript);
    const hasAutoTranscript = hasTextValue(document.resource.penMemoAutoTranscript);
    const hasHandwriting = hasPenMemoHandwriting(document.resource.penMemoStrokes);

    if (hasReviewedTranscript) return [];

    if (hasAutoTranscript) {
        const action = hasHandwriting
            ? '자동 전사를 원본 손글씨와 대조하고 검토 전사문으로 확정하세요.'
            : '자동 전사를 확인하고 검토 전사문으로 확정하세요.';
        return [createCloseoutReviewIssue(
            document,
            'pen-memo-auto-transcript-review',
            [
                '자동 전사된 야장 메모가 검토되지 않았습니다.',
                hasHandwriting ? getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes) : ''
            ].filter(Boolean).join(' '),
            `${toSentencePrefix(getPenMemoTranscriptionSummaryLabel(document))}. ${action}`,
            ['penMemoAutoTranscript', 'penMemoReviewedTranscript', 'penMemoTranscriptionStatus']
        )];
    }

    if (hasHandwriting) {
        return [createCloseoutReviewIssue(
            document,
            'pen-memo-handwriting-transcription',
            [
                '태블릿 손글씨 야장 메모가 아직 전사되지 않았습니다.',
                getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes)
            ].filter(Boolean).join(' '),
            `${getPenMemoTranscriptionSummaryLabel(document)} 태블릿 손글씨 원자료를 읽어 검토 전사문으로 남기세요.`,
            ['penMemoStrokes', 'penMemoReviewedTranscript', 'penMemoTranscriptionStatus']
        )];
    }

    return [];
}


function toSentencePrefix(value: string): string {

    return value.replace(/[.。]\s*$/, '');
}


function createCloseoutReviewIssue(document: Document,
                                   ruleId: string,
                                   message: string,
                                   recommendedAction: string,
                                   relatedFields: string[]): KoreanFieldworkReadinessIssue {

    return {
        severity: 'warning',
        documentId: document.resource.id,
        identifier: document.resource.identifier || document.resource.id,
        category: document.resource.category,
        ruleId,
        message,
        recommendedAction,
        relatedFields,
        blocksSave: false
    };
}


function compareIssues(issueA: KoreanFieldworkReadinessIssue,
                       issueB: KoreanFieldworkReadinessIssue): number {

    const severityDiff = SEVERITY_ORDER[issueA.severity] - SEVERITY_ORDER[issueB.severity];
    if (severityDiff !== 0) return severityDiff;

    return issueA.identifier.localeCompare(issueB.identifier, 'ko')
        || issueA.ruleId.localeCompare(issueB.ruleId);
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


function hasTextValue(value: unknown): value is string {

    return typeof value === 'string' && value.trim().length > 0;
}


function getTextValue(value: unknown): string|undefined {

    return hasTextValue(value) ? value.trim() : undefined;
}


function getStringListValue(value: unknown): string[] {

    if (value === undefined || value === null) return [];

    if (Array.isArray(value)) {
        return value.flatMap(getStringListValue);
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.inputValue === 'string') return getStringListValue(record.inputValue);
        if (typeof record.value === 'string') return getStringListValue(record.value);

        return [];
    }

    const text = String(value).trim();
    if (!text || text === '[]') return [];

    const parsedValue = parseJsonValue(text);
    if (parsedValue !== undefined) return getStringListValue(parsedValue);

    return text.split(/\r?\n|,\s*/)
        .map(item => item.trim())
        .filter(item => !!item);
}


function parseJsonValue(value: string): unknown|undefined {

    if (!/^\s*[\[{"]/.test(value)) return undefined;

    try {
        return JSON.parse(value);
    } catch (_err) {
        return undefined;
    }
}


function dedupeStrings(values: string[]): string[] {

    const seen = new Set<string>();

    return values.filter(value => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}


function isUploadableLocalUri(uri: string|undefined): boolean {

    return !!uri && /^(file|content):\/\//.test(uri);
}


function hasPositiveNumberValue(value: unknown): boolean {

    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    if (typeof value !== 'string') return false;

    const parsedValue = Number(value.trim());

    return Number.isFinite(parsedValue) && parsedValue > 0;
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
