import { Document } from '../model/document/document';
import { getMunsellCandidateSummaryLabel } from './korean-fieldwork-soil-color';

export type KoreanFieldworkReadinessSeverity = 'info'|'warning'|'critical';

export interface KoreanFieldworkReadinessIssue {
    ruleId: string;
    documentId: string;
    identifier: string;
    category: string;
    severity: KoreanFieldworkReadinessSeverity;
    message: string;
    relatedFields: string[];
    recommendedAction: string;
    blocksSave: boolean;
}

export interface KoreanFieldworkReadinessRule {
    id: string;
    label: string;
    relatedFields: string[];
    evaluate: (document: Document, documents: Document[]) => KoreanFieldworkReadinessIssue[];
}

export interface EvidenceBundle {
    rootDocument: Document;
    featureSegments: Document[];
    layers: Document[];
    photos: Document[];
    soilProfilePhotos: Document[];
    drawings: Document[];
    penMemos: Document[];
    finds: Document[];
    samples: Document[];
    reportPreparationReviews: Document[];
    reportEditorialCrossChecks: Document[];
    issues: KoreanFieldworkReadinessIssue[];
}

export interface KoreanFieldworkTodaySummary {
    dailyLogs: Document[];
    surveyBoundaries: Document[];
    featureCandidates: Document[];
    openIssues: KoreanFieldworkReadinessIssue[];
    issueCountByDocumentId: { [documentId: string]: number };
}

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

interface KoreanFieldworkPenMemoPoint {
    x: number;
    y: number;
}

interface KoreanFieldworkPenMemoStroke {
    points: KoreanFieldworkPenMemoPoint[];
}

export interface TermAuthorityMatch {
    authority: Document;
    aliases: Document[];
    matchedText: string;
}

const CHECKLIST = {
    PRE_INVESTIGATION_PHOTO: 'preInvestigationPhotoTaken',
    IN_PROGRESS_PHOTO: 'inProgressPhotoTaken',
    SOIL_PROFILE_PHOTO: 'soilProfilePhotoLinked',
    COMPLETION_PHOTO: 'completionPhotoTaken',
    MEASURED_DRAWING: 'measuredDrawingCompleted',
    PRE_RECOVERY_FIND_PHOTO: 'preRecoveryFindPhotoTaken',
    FINDS_RECOVERED: 'findsRecovered',
    FIND_RECORDS_LINKED: 'findRecordsLinked',
    SAMPLES_COLLECTED: 'samplesCollected'
};

const REPORT_REVIEW_CATEGORIES = ['ReportPreparationReview', 'ReportEditorialCrossCheck'];
const FEATURE_CATEGORIES = ['Feature', 'FeatureSegment'];
const PHOTO_CATEGORY = 'Photo';
const DRAWING_CATEGORY = 'Drawing';
const PEN_MEMO_CATEGORY = 'PenMemo';
const SOIL_PROFILE_PHOTO_CATEGORY = 'SoilProfilePhoto';
const MEDIA_RELATIONS = ['depicts', 'isDepictedIn', 'isSubjectOf', 'isResultOf'];
const CONTAINMENT_RELATIONS = ['liesWithin', 'isRecordedInFeature', 'isPresentIn'];
const FIELDWORK_IMAGE_UPLOAD_RELATED_FIELDS = [
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
];
const DIRECT_FIELDWORK_PHOTO_CATEGORIES = [
    'DailyLog',
    'Feature',
    'FeatureGroup',
    'FeatureSegment',
    'FieldRecordQualityReview',
    'Find',
    'FindCollection',
    'Layer',
    'Operation',
    'Sample',
    'Survey',
    'SurveyBoundary',
    'Trench'
];
const DIRECT_FIELDWORK_PHOTO_URI_FIELDS = ['fieldworkPhotoUri', 'imageUri', 'fileUri'];
const FIELDWORK_PHOTO_ANNOTATION_FIELDS = ['fieldworkPhotoAnnotationStrokes'];
const SOIL_PROFILE_PHOTO_ANNOTATION_FIELDS = [
    'soilProfilePhotoAnnotationStrokes',
    'soilProfileAnnotationStrokes'
];
const FIELD_RECORD_QUALITY_REVIEW_CATEGORY = 'FieldRecordQualityReview';
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
const FIELD_RECORD_QUALITY_REVIEW_VALUE_LABELS: Record<string, Record<string, string>> = {
    reviewedRecordUnit: {
        operationRecord: '\uc870\uc0ac\uad6c\uc5ed\u00b7\uc791\uc5c5\uae30\ub85d',
        featureGroupRecord: '\uad00\ub828 \uc720\uad6c \uae30\ub85d',
        featureRecord: '\uc720\uad6c \uae30\ub85d',
        featureSegmentRecord: '\ud53c\ud2b8\u00b7\uc720\uad6c \uc138\ubd80 \uae30\ub85d',
        findRecord: '\uc720\ubb3c \uae30\ub85d',
        sampleRecord: '\uc2dc\ub8cc \uae30\ub85d',
        dailyLog: '\uc870\uc0ac\uc77c\uc9c0',
        personalNotebook: '\uac1c\uc778 \uc57c\uc7a5',
        drawing: '\ub3c4\uba74',
        photo: '\uc0ac\uc9c4',
        gisOr3d: 'GIS\u00b73D \uc790\ub8cc',
        reportDraft: '\ubcf4\uace0\uc11c \ucd08\uc548',
        pendingDecision: '\ucd94\uac00 \ud655\uc778'
    },
    qualityReviewStage: {
        sameDayReview: '\ub2f9\uc77c \uac80\ud1a0',
        crossRecorderReview: '\uc870\uc0ac\uc790 \uad50\ucc28\uac80\ud1a0',
        supervisorReview: '\ucc45\uc784\uc870\uc0ac\uc790 \uac80\ud1a0',
        specialistReview: '\uc804\ubb38\uac00 \uac80\ud1a0',
        reportPreparationReview: '\ubcf4\uace0\uc11c \uc791\uc131 \uc804 \uac80\ud1a0',
        postEvaluationFeedback: '\ubcf4\uace0\uc11c \ud3c9\uac00 \ud6c4 \ud658\ub958',
        sourceRecordCorrection: '\uc6d0\uae30\ub85d \ubcf4\uc644',
        closedAfterCorrection: '\ubcf4\uc644 \ud6c4 \uc885\ub8cc',
        pendingDecision: '\ucd94\uac00 \ud655\uc778'
    },
    qualityCorrectionBasis: {
        factInterpretationSeparated: '\uc0ac\uc2e4\u00b7\ud574\uc11d \ubd84\ub9ac',
        correctionReasonLinked: '\uc218\uc815 \uc0ac\uc720 \uc5f0\uacb0',
        originalRecordPreserved: '\uc6d0\uae30\ub85d \ubcf4\uc874',
        changeHistoryRecorded: '\ubcc0\uacbd \uc774\ub825 \uae30\ub85d',
        reviewerNamed: '\uac80\ud1a0\uc790 \uba85\uc2dc',
        sourceMediaChecked: '\uc6d0\uc0ac\uc9c4\u00b7\uc6d0\ub3c4\uba74 \ub300\uc870',
        numberConversionChecked: '\ubc88\ud638 \ubcc0\ud658 \ub300\uc870',
        contradictionRecorded: '\ubaa8\uc21c\uc810 \uae30\ub85d',
        nextFieldworkAction: '\ub2e4\uc74c \ud604\uc7a5\uc870\uce58',
        pendingDecision: '\ucd94\uac00 \ud655\uc778'
    },
    reportEvaluationFeedback: {
        selfEvaluation: '\uae30\uad00 \uc790\uccb4\ud3c9\uac00',
        committeeEvaluation: '\uc704\uc6d0\ud68c \ud3c9\uac00',
        scoreDifference: '\ud3c9\uac00 \uc810\uc218 \ucc28\uc774',
        siteTypeApplicability: '\uc720\uc801\uc720\ud615 \uc801\uc6a9\uc131',
        nonApplicableItem: '\ube44\ud574\ub2f9 \ud3c9\uac00 \ud56d\ubaa9',
        exclusionRationale: '\uc801\uc6a9 \uc81c\uc678 \uadfc\uac70',
        fieldQualityNotSubstituted: '\ud604\uc7a5\uc131 \ub300\uccb4\ubd88\uac00',
        fieldRecordReview: '\uc6d0\uae30\ub85d \uc7ac\uac80\ud1a0',
        expertFieldParticipation: '\uc804\ubb38\uac00 \ud604\uc7a5\ucc38\uc5ec',
        stakeholderCoordination: '\uc774\ud574\uad00\uacc4 \uc870\uc815',
        lowBidRisk: '\uc800\uac00\uc218\uc8fc \uc704\ud5d8',
        formalEvaluationLimit: '\ud615\uc2dd\ud3c9\uac00 \ud55c\uacc4',
        improvementForNextInvestigation: '\ub2e4\uc74c \uc870\uc0ac \uac1c\uc120',
        supplementRequestTracked: '\ubcf4\uc644\uc694\uad6c \ucd94\uc801',
        pendingDecision: '\ucd94\uac00 \ud655\uc778'
    }
};
const CLOSEOUT_SEVERITY_ORDER: Record<KoreanFieldworkReadinessSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2
};
const FIELDWORK_IMAGE_UPLOAD_RULES = [
    {
        categories: ['Photo'],
        uriFields: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
        ruleId: 'fieldwork-photo-upload-missing',
        message: '현장사진 원본 보존 상태가 아직 확인되지 않았습니다.'
    },
    {
        categories: ['SoilProfilePhoto'],
        uriFields: ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri'],
        ruleId: 'soil-profile-photo-upload-missing',
        message: '토층사진 원본 보존 상태가 아직 확인되지 않았습니다.'
    },
    {
        categories: ['Drawing'],
        uriFields: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
        ruleId: 'fieldwork-drawing-upload-missing',
        message: '도면 원본 보존 상태가 아직 확인되지 않았습니다.'
    },
    {
        categories: DIRECT_FIELDWORK_PHOTO_CATEGORIES,
        uriFields: DIRECT_FIELDWORK_PHOTO_URI_FIELDS,
        ruleId: 'fieldwork-attached-photo-upload-missing',
        message: '기록에 직접 붙은 태블릿 사진 원본 보존 상태가 아직 확인되지 않았습니다.'
    }
];

export const KOREAN_FIELDWORK_READINESS_RULES: KoreanFieldworkReadinessRule[] = [
    {
        id: 'feature-complete-photo',
        label: '완료된 유구는 완료 사진 확인을 남겨야 함',
        relatedFields: ['featureRecordingStatus', 'featureInvestigationChecklist'],
        evaluate: (document) => {
            if (!isFeatureLike(document)) return [];
            if (document.resource.featureRecordingStatus !== 'confirmed') return [];
            if (hasChecklistValue(document, CHECKLIST.COMPLETION_PHOTO)) return [];

            return [makeIssue(
                document,
                'feature-complete-photo',
                'warning',
                '유구가 확인 상태지만 완료 사진 항목이 체크되지 않았습니다.',
                ['featureRecordingStatus', 'featureInvestigationChecklist'],
                '현장 마감 전 완료 사진을 남겼는지 확인하세요.'
            )];
        }
    },
    {
        id: 'finds-recovered-pre-photo',
        label: '유물 수습 전 사진 확인',
        relatedFields: ['featureInvestigationChecklist'],
        evaluate: (document) => {
            if (!isFeatureLike(document)) return [];
            if (!hasChecklistValue(document, CHECKLIST.FINDS_RECOVERED)) return [];
            if (hasChecklistValue(document, CHECKLIST.PRE_RECOVERY_FIND_PHOTO)) return [];

            return [makeIssue(
                document,
                'finds-recovered-pre-photo',
                'warning',
                '유물 수습은 표시되어 있지만 수습 전 사진 항목이 체크되지 않았습니다.',
                ['featureInvestigationChecklist'],
                '수습 전 사진 상태를 확인하거나 예외 사유를 유구 메모에 남기세요.'
            )];
        }
    },
    {
        id: 'soil-profile-photo-count',
        label: '토층 사진 수와 관련 자료 확인',
        relatedFields: ['featureSoilProfilePhotoCount', 'featureInvestigationChecklist'],
        evaluate: (document, documents) => {
            if (!isFeatureLike(document)) return [];

            const expectedCount = Number(document.resource.featureSoilProfilePhotoCount ?? 0);
            const linkedCount = getLinkedDocuments(document, documents)
                .filter((linkedDocument) => linkedDocument.resource.category === 'SoilProfilePhoto')
                .length;

            if (expectedCount === 0 && !hasChecklistValue(document, CHECKLIST.SOIL_PROFILE_PHOTO)) return [];
            if (linkedCount >= Math.max(expectedCount, 1)) return [];

            return [makeIssue(
                document,
                'soil-profile-photo-count',
                'warning',
                '토층 사진이 필요한 상태지만 관련 토층 사진 기록이 부족합니다.',
                ['featureSoilProfilePhotoCount', 'featureInvestigationChecklist'],
                '유구를 마감하기 전 토층 사진 기록을 만들어 남기세요.'
            )];
        }
    },
    {
        id: 'feature-geometry-needs-aerial-alignment',
        label: '항공 레이어 보정 필요 유구선 확인',
        relatedFields: [
            'featureGeometryEditStatus',
            'featureGeometryReferenceLayerId',
            'featureGeometryRevisionHistory'
        ],
        evaluate: (document) => {
            if (!isFeatureLike(document)) return [];
            if (document.resource.featureGeometryEditStatus !== 'needsAerialAlignment') return [];

            return [makeIssue(
                document,
                'feature-geometry-needs-aerial-alignment',
                'info',
                '유구선이 항공 레이어 보정 필요 상태입니다.',
                [
                    'featureGeometryEditStatus',
                    'featureGeometryReferenceLayerId',
                    'featureGeometryRevisionHistory'
                ],
                '기존 유구 기록은 유지한 채 현재 드론·항공 레이어 기준으로 유구선을 보정하세요.'
            )];
        }
    },
    {
        id: 'sample-purpose',
        label: '시료 채취 목적 확인',
        relatedFields: ['samplePurpose'],
        evaluate: (document) => {
            if (document.resource.category !== 'Sample') return [];
            if (hasValue(document.resource.samplePurpose)) return [];

            return [makeIssue(
                document,
                'sample-purpose',
                'warning',
                '시료의 분석 또는 채취 목적이 비어 있습니다.',
                ['samplePurpose'],
                '인계 전 해당 시료를 채취한 이유를 기록하세요.'
            )];
        }
    },
    {
        id: 'find-label-register',
        label: '유물 라벨·대장 정리 확인',
        relatedFields: ['artifactLabelRegisterLink'],
        evaluate: (document) => {
            if (document.resource.category !== 'Find') return [];
            if (hasValue(document.resource.artifactLabelRegisterLink)) return [];

            return [makeIssue(
                document,
                'find-label-register',
                'info',
                '유물의 라벨·대장 정리 정보가 기록되지 않았습니다.',
                ['artifactLabelRegisterLink'],
                '라벨, 봉투, 유물대장, 이후 목록화 정리 상태를 확인하세요.'
            )];
        }
    },
    {
        id: 'field-only-timing',
        label: '현장 한정 관찰 기록 시점 확인',
        relatedFields: ['fieldOnlyMissingCheck', 'firstExposureRecord', 'recordCreationTiming'],
        evaluate: (document) => {
            if (!hasValue(document.resource.fieldOnlyMissingCheck)
                    && !hasValue(document.resource.firstExposureRecord)) return [];
            if (hasValue(document.resource.recordCreationTiming)) return [];

            return [makeIssue(
                document,
                'field-only-timing',
                'warning',
                '현장에서만 확인 가능한 관찰 내용이 있지만 기록 생성 시점이 비어 있습니다.',
                ['fieldOnlyMissingCheck', 'firstExposureRecord', 'recordCreationTiming'],
                '추후 검토자가 복원 가능성을 판단할 수 있도록 관찰 기록 시점을 표시하세요.'
            )];
        }
    },
    {
        id: 'report-cross-check',
        label: '보고서 작성 전 교차 확인 대상 확인',
        relatedFields: ['reportCrossCheck'],
        evaluate: (document) => {
            if (!REPORT_REVIEW_CATEGORIES.includes(document.resource.category)) return [];
            if (hasValue(document.resource.reportCrossCheck)) return [];

            return [makeIssue(
                document,
                'report-cross-check',
                'warning',
                '보고서 검토 기록에 교차 확인 대상이 없습니다.',
                ['reportCrossCheck'],
                '원고, 사진대장, 도면대장, 유물목록, 시료목록 중 확인 대상을 남기세요.'
            )];
        }
    },
    {
        id: 'fieldwork-image-upload-missing',
        label: '원본 매체 보존 확인',
        relatedFields: FIELDWORK_IMAGE_UPLOAD_RELATED_FIELDS,
        evaluate: (document) => {
            const rule = FIELDWORK_IMAGE_UPLOAD_RULES.find((candidate) =>
                candidate.categories.includes(document.resource.category)
            );
            if (!rule) return [];

            const localUploadSource = rule.uriFields
                .map((fieldName) => getTextValue(document.resource[fieldName]))
                .find(isUploadableLocalUri);
            if (!localUploadSource
                    || hasConfirmedKoreanFieldworkImageUpload(document.resource, localUploadSource)) return [];

            return [makeIssue(
                document,
                rule.ruleId,
                'warning',
                rule.message,
                FIELDWORK_IMAGE_UPLOAD_RELATED_FIELDS,
                '태블릿 또는 프로젝트 백업 위치에 원본 파일이 남아 있는지 확인하고, 보존 위치와 확인 시각을 남기세요.'
            )];
        }
    }
];

export function getKoreanFieldworkReadinessIssues(
    documents: Document[],
    rules: KoreanFieldworkReadinessRule[] = KOREAN_FIELDWORK_READINESS_RULES
): KoreanFieldworkReadinessIssue[] {

    return documents.reduce((issues: KoreanFieldworkReadinessIssue[], document) => {
        return issues.concat(...rules.map((rule) => rule.evaluate(document, documents)));
    }, []);
}

export function buildEvidenceBundle(rootDocument: Document, documents: Document[]): EvidenceBundle {

    const relatedDocuments = getRelatedDocuments(rootDocument, documents);
    const issueDocuments = [rootDocument].concat(relatedDocuments);

    return {
        rootDocument,
        featureSegments: filterByCategory(relatedDocuments, 'FeatureSegment'),
        layers: filterByCategory(relatedDocuments, 'Layer'),
        photos: uniqueDocuments(filterByCategory(relatedDocuments, 'Photo')
            .concat(filterDirectFieldworkPhotoEvidenceDocuments(issueDocuments))),
        soilProfilePhotos: filterByCategory(relatedDocuments, 'SoilProfilePhoto'),
        drawings: filterByCategory(relatedDocuments, 'Drawing'),
        penMemos: filterByCategory(relatedDocuments, 'PenMemo'),
        finds: filterByCategory(relatedDocuments, 'Find')
            .concat(filterByCategory(relatedDocuments, 'FindCollection')),
        samples: filterByCategory(relatedDocuments, 'Sample'),
        reportPreparationReviews: filterByCategory(relatedDocuments, 'ReportPreparationReview'),
        reportEditorialCrossChecks: filterByCategory(relatedDocuments, 'ReportEditorialCrossCheck'),
        issues: getKoreanFieldworkReadinessIssues(issueDocuments)
    };
}

export function makeKoreanFieldworkCloseoutSummary(
        documents: Document[],
        maxIssues: number = 4
): KoreanFieldworkCloseoutSummary {

    return getKoreanFieldworkCloseoutSummary(
        dedupeKoreanFieldworkReadinessIssues([
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

    const counts = getCloseoutIssueCounts(issues);
    const sortedIssues = issues.slice().sort(compareCloseoutIssues);

    if (counts.critical > 0) {
        return {
            status: 'blocked',
            title: '\uba3c\uc800 \ubcfc \ud56d\ubaa9',
            detail: `\uc624\ub298 \uba3c\uc800 \ucc98\ub9ac\ud560 \ud56d\ubaa9 ${counts.critical}\uac74\uc774 \ub0a8\uc544 \uc788\uc2b5\ub2c8\ub2e4.`,
            counts,
            issues: sortedIssues.slice(0, maxIssues)
        };
    }

    if (counts.warning + counts.info > 0) {
        return {
            status: 'needsReview',
            title: '\ub9c8\uac10 \uc804 \ud655\uc778',
            detail: `\ubcf4\uc644 \ud56d\ubaa9 ${counts.warning}\uac74, \uc548\ub0b4 \ud56d\ubaa9 ${counts.info}\uac74\uc774 \ub0a8\uc544 \uc788\uc2b5\ub2c8\ub2e4.`,
            counts,
            issues: sortedIssues.slice(0, maxIssues)
        };
    }

    return {
        status: 'clear',
        title: '\ub9c8\uac10 \uac00\ub2a5',
        detail: '\ud604\uc7ac \uc870\uc0ac \uad6c\uc5ed \uae30\ub85d\uc73c\ub85c \ub0a8\uc740 \uc810\uac80 \ud56d\ubaa9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
        counts,
        issues: []
    };
}

export function getKoreanFieldworkCloseoutReviewIssues(documents: Document[]): KoreanFieldworkReadinessIssue[] {

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
        if (DIRECT_FIELDWORK_PHOTO_CATEGORIES.includes(document.resource.category)) {
            return getDirectFieldworkPhotoCloseoutIssues(document);
        }

        return [];
    });
}

export function getKoreanFieldworkTodaySummary(documents: Document[]): KoreanFieldworkTodaySummary {

    const openIssues = getKoreanFieldworkReadinessIssues(documents);

    return {
        dailyLogs: filterByCategory(documents, 'DailyLog'),
        surveyBoundaries: filterByCategory(documents, 'SurveyBoundary'),
        featureCandidates: documents.filter((document) =>
            document.resource.category === 'Feature'
            && document.resource.featureRecordingStatus === 'candidate'
        ),
        openIssues,
        issueCountByDocumentId: openIssues.reduce((index, issue) => {
            index[issue.documentId] = (index[issue.documentId] ?? 0) + 1;
            return index;
        }, {} as { [documentId: string]: number })
    };
}

export function searchTermAuthorities(documents: Document[], query: string): TermAuthorityMatch[] {

    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];

    const authorityIds = new Set(filterByCategory(documents, 'TermAuthority')
        .map((authority) => authority.resource.id));
    const aliasesByAuthorityId = filterByCategory(documents, 'TermAlias')
        .reduce((index, alias) => {
            const authorityId = getRelationTargets(alias)
                .find((targetId) => authorityIds.has(targetId));
            if (!authorityId) return index;

            index[authorityId] = (index[authorityId] ?? []).concat(alias);
            return index;
        }, {} as { [authorityId: string]: Document[] });

    return filterByCategory(documents, 'TermAuthority')
        .map((authority) => {
            const aliases = aliasesByAuthorityId[authority.resource.id] ?? [];
            const searchableTexts = [
                authority.resource.identifier,
                authority.resource.shortDescription,
                authority.resource.termPreferredLabel,
                ...aliases.map((alias) => alias.resource.termAliasText)
            ].filter((value) => typeof value === 'string') as string[];
            const matchedText = searchableTexts.find((text) => normalize(text).includes(normalizedQuery));

            return matchedText ? { authority, aliases, matchedText } : undefined;
        })
        .filter((match): match is TermAuthorityMatch => match !== undefined);
}

function getRelatedDocuments(rootDocument: Document, documents: Document[]): Document[] {

    const relatedIds = new Set<string>([rootDocument.resource.id]);
    let changed = true;

    while (changed) {
        changed = false;

        documents.forEach((document) => {
            if (relatedIds.has(document.resource.id)) return;
            if (!hasRelationToAny(document, relatedIds)
                    && !hasAnyRelatedDocumentRelationTo(document.resource.id, relatedIds, documents)) return;

            relatedIds.add(document.resource.id);
            changed = true;
        });
    }

    return documents.filter((document) =>
        document.resource.id !== rootDocument.resource.id
        && relatedIds.has(document.resource.id)
    );
}

function getLinkedDocuments(document: Document, documents: Document[]): Document[] {

    return documents.filter((candidate) =>
        candidate.resource.id !== document.resource.id
        && hasRelationToAny(candidate, new Set([document.resource.id]))
    );
}

function hasAnyRelatedDocumentRelationTo(
    documentId: string,
    relatedIds: Set<string>,
    documents: Document[]
): boolean {

    return documents
        .filter((document) => relatedIds.has(document.resource.id))
        .some((relatedDocument) => getRelationTargets(relatedDocument).includes(documentId));
}

function hasRelationToAny(document: Document, targetIds: Set<string>): boolean {

    return getRelationTargets(document)
        .some((targetId) => targetIds.has(targetId));
}

function getRelationTargets(document: Document): string[] {

    return Object.entries(document.resource.relations ?? {})
        .reduce((targets, [relationName, relationTargets]) => {
            if (!MEDIA_RELATIONS.includes(relationName) && !CONTAINMENT_RELATIONS.includes(relationName)) {
                return targets;
            }
            if (!Array.isArray(relationTargets)) return targets;

            return targets.concat(relationTargets);
        }, [] as string[]);
}

function filterByCategory(documents: Document[], category: string): Document[] {

    return documents.filter((document) => document.resource.category === category);
}

function filterDirectFieldworkPhotoEvidenceDocuments(documents: Document[]): Document[] {

    return documents.filter((document) =>
        DIRECT_FIELDWORK_PHOTO_CATEGORIES.includes(document.resource.category)
        && DIRECT_FIELDWORK_PHOTO_URI_FIELDS
            .map((fieldName) => getTextValue(document.resource[fieldName]))
            .some(isUploadableLocalUri)
    );
}

function uniqueDocuments(documents: Document[]): Document[] {

    const seenDocumentIds = new Set<string>();

    return documents.filter((document) => {
        if (seenDocumentIds.has(document.resource.id)) return false;

        seenDocumentIds.add(document.resource.id);
        return true;
    });
}

function getFieldRecordQualityReviewCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    const missingFields = getMissingFieldRecordQualityReviewFields(document.resource);
    const qualityReviewStages = getStringListValue(document.resource.qualityReviewStage);
    const isClosed = qualityReviewStages.includes(FIELD_RECORD_QUALITY_REVIEW_CLOSED_STAGE);

    if (isClosed && missingFields.length === 0) return [];

    const detailSummary = getFieldRecordQualityReviewDetailSummary(document.resource);
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

function getMissingFieldRecordQualityReviewFields(resource: Record<string, any>): string[] {

    const missingFields = FIELD_RECORD_QUALITY_REVIEW_REQUIRED_FIELD_NAMES.filter(fieldName =>
        !getKoreanFieldworkCloseoutFieldValueSummary(fieldName, resource[fieldName])
    );
    const qualityReviewStages = getStringListValue(resource.qualityReviewStage);

    if (qualityReviewStages.includes(FIELD_RECORD_QUALITY_REVIEW_REPORT_FEEDBACK_STAGE)
            && !getKoreanFieldworkCloseoutFieldValueSummary(
                'reportEvaluationFeedback',
                resource.reportEvaluationFeedback
            )) {
        missingFields.push('reportEvaluationFeedback');
    }

    return missingFields;
}

function getFieldRecordQualityReviewDetailSummary(resource: Record<string, any>): string[] {

    return FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS
        .map(({ fieldName, label }) => {
            const summary = getKoreanFieldworkCloseoutFieldValueSummary(fieldName, resource[fieldName]);

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

function getKoreanFieldworkCloseoutFieldValueSummary(fieldName: string, value: unknown): string|undefined {

    const labels = getStringListValue(value)
        .map(item => FIELD_RECORD_QUALITY_REVIEW_VALUE_LABELS[fieldName]?.[item] ?? item)
        .filter(label => label.trim().length > 0);

    return labels.length > 0 ? labels.join(' \u00b7 ') : undefined;
}

function getFieldworkPhotoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    return [
        ...getPhotoReportMetadataCloseoutIssues(
            document,
            'fieldwork-photo-report-metadata-missing',
            '\ud604\uc7a5\uc0ac\uc9c4\uc758 \ubcf4\uace0\uc11c\uc6a9 \uc6d0\ubcf8 \uc815\ubcf4\uac00 \ubd80\uc871\ud569\ub2c8\ub2e4.',
            'fieldworkPhotoCapturedAt'
        ),
        ...getPhotoUploadCloseoutIssues(
            document,
            ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
            'fieldwork-photo-upload-missing',
            '\ud604\uc7a5\uc0ac\uc9c4 \uc6d0\ubcf8 \ubcf4\uc874 \uc0c1\ud0dc\uac00 \uc544\uc9c1 \ud655\uc778\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
        ),
        ...getPhotoAnnotationCloseoutIssues(
            document,
            FIELDWORK_PHOTO_ANNOTATION_FIELDS,
            'fieldwork-photo-annotation-review',
            '\uc0ac\uc9c4 \uc704 \ud45c\uc2dc\uac00 \ubcf4\uace0\uc11c\uc6a9 \uc124\uba85\uc73c\ub85c \uc815\ub9ac\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
        )
    ];
}


function getDrawingCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    return getPhotoUploadCloseoutIssues(
        document,
        ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
        'fieldwork-drawing-upload-missing',
        '\ub3c4\uba74 \uc6d0\ubcf8 \ubcf4\uc874 \uc0c1\ud0dc\uac00 \uc544\uc9c1 \ud655\uc778\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
    );
}


function getDirectFieldworkPhotoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    return getPhotoUploadCloseoutIssues(
        document,
        DIRECT_FIELDWORK_PHOTO_URI_FIELDS,
        'fieldwork-attached-photo-upload-missing',
        '\uae30\ub85d\uc5d0 \uc9c1\uc811 \ubd99\uc740 \ud0dc\ube14\ub9bf \uc0ac\uc9c4 \uc6d0\ubcf8 \ubcf4\uc874 \uc0c1\ud0dc\uac00 \uc544\uc9c1 \ud655\uc778\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
    );
}


function getSoilProfilePhotoCloseoutIssues(document: Document): KoreanFieldworkReadinessIssue[] {

    const issues: KoreanFieldworkReadinessIssue[] = [
        ...getPhotoReportMetadataCloseoutIssues(
            document,
            'soil-profile-photo-report-metadata-missing',
            '\ud1a0\uce35\uc0ac\uc9c4\uc758 \ubcf4\uace0\uc11c\uc6a9 \uc6d0\ubcf8 \uc815\ubcf4\uac00 \ubd80\uc871\ud569\ub2c8\ub2e4.',
            'soilProfilePhotoCapturedAt'
        ),
        ...getPhotoUploadCloseoutIssues(
            document,
            ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri'],
            'soil-profile-photo-upload-missing',
            '\ud1a0\uce35\uc0ac\uc9c4 \uc6d0\ubcf8 \ubcf4\uc874 \uc0c1\ud0dc\uac00 \uc544\uc9c1 \ud655\uc778\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
        ),
        ...getPhotoAnnotationCloseoutIssues(
            document,
            SOIL_PROFILE_PHOTO_ANNOTATION_FIELDS,
            'soil-profile-photo-annotation-review',
            '\ud1a0\uce35\uc0ac\uc9c4 \uc704 \ud45c\uc2dc\uac00 \uce35\uc704 \uc124\uba85\uc73c\ub85c \uc815\ub9ac\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
        )
    ];

    if (document.resource.soilColorAssistStatus === 'candidatesAvailable') {
        const candidateSummary = getMunsellCandidateSummaryLabel(
            document.resource.soilColorAssistCandidates
        );
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-color-candidates-review',
            '\uc0ac\uc9c4\uc5d0\uc11c \uc77d\uc740 \uba3c\uc140 \ud6c4\ubcf4\ub97c \uac80\ud1a0\ud574\uc57c \ud569\ub2c8\ub2e4.',
            `${candidateSummary ? `${candidateSummary}. ` : ''}\uc0ac\uc9c4 \ud6c4\ubcf4 \uc911 \uc2e4\uc81c \ud1a0\uc0c9\uc744 \uc120\ud0dd\ud558\uac70\ub098 \uc9c1\uc811 \uba3c\uc140\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.`,
            ['soilColorAssistCandidates', 'soilColorAssistStatus', 'soilProfileColorSwatches']
        ));
    } else if (document.resource.soilColorAssistStatus === 'lowConfidence') {
        const candidateSummary = getMunsellCandidateSummaryLabel(
            document.resource.soilColorAssistCandidates
        );
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-color-low-confidence',
            '\uc0ac\uc9c4 \ud1a0\uc0c9 \ud6c4\ubcf4\uc758 \uc2e0\ub8b0\ub3c4\uac00 \ub0ae\uc2b5\ub2c8\ub2e4.',
            `${candidateSummary ? `${candidateSummary}. ` : ''}\ud604\uc7a5\uc5d0\uc11c \uba3c\uc140\uac12\uc744 \uc9c1\uc811 \ud655\uc778\ud558\uace0 \ud1a0\uc0c9 \uba54\ubaa8\ub97c \ubcf4\uac15\ud558\uc138\uc694.`,
            ['soilColorAssistCandidates', 'soilColorAssistStatus', 'soilProfileColorSwatches']
        ));
    }

    if (!hasEvidenceValue(document.resource.soilProfileColorSwatches)) {
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-profile-color-swatches-missing',
            '\ud1a0\uce35\uc0ac\uc9c4\uc758 \ubc88\ud638\ubcc4 \ud1a0\uc0c9\uc774 \uc544\uc9c1 \uae30\ub85d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.',
            '\uc0ac\uc9c4 \uc704 \ud45c\uc2dc \ubc88\ud638\uc640 \ub300\uc751\ub418\ub294 \uba3c\uc140\uac12 \ub610\ub294 \ud1a0\uc0c9 \uba54\ubaa8\ub97c \uc801\uc73c\uc138\uc694.',
            ['soilProfileColorSwatches']
        ));
    }

    return issues;
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


function getPenMemoTranscriptionSummaryLabel(document: Document): string {

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


function getPenMemoSketchSummaryLabel(value: unknown): string {

    const stats = getPenMemoStrokeStats(value);
    if (stats.strokeCount === 0) return '';
    if (stats.pointCount === 0) return `스케치 메모 ${stats.strokeCount}획.`;

    return `스케치 메모 ${stats.strokeCount}획/${stats.pointCount}점.`;
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


function getParsedPenMemoStrokes(value: unknown): KoreanFieldworkPenMemoStroke[] {

    const strokesValue = isRecord(value) && Array.isArray(value.strokes)
        ? value.strokes
        : value;
    if (!Array.isArray(strokesValue)) return [];

    return strokesValue
        .map(getPenMemoStrokePoints)
        .filter(points => points.length > 0)
        .map(points => ({ points }));
}


function getPenMemoStrokePoints(stroke: unknown): KoreanFieldworkPenMemoPoint[] {

    const points = isRecord(stroke) && Array.isArray(stroke.points)
        ? stroke.points
        : stroke;

    if (!Array.isArray(points)) return [];

    return points
        .map(getPenMemoStrokePoint)
        .filter((point): point is KoreanFieldworkPenMemoPoint => point !== undefined);
}


function getPenMemoStrokePoint(point: unknown): KoreanFieldworkPenMemoPoint|undefined {

    if (!isRecord(point)) return undefined;

    return getFiniteCoordinate(point.x) === undefined || getFiniteCoordinate(point.y) === undefined
        ? undefined
        : {
            x: getFiniteCoordinate(point.x) as number,
            y: getFiniteCoordinate(point.y) as number
        };
}


function hasPenMemoHandwriting(value: unknown): boolean {

    return getPenMemoStrokeStats(value).strokeCount > 0;
}


function toSentencePrefix(value: string): string {

    return value.replace(/[.。]\s*$/, '');
}


function getPhotoAnnotationCloseoutIssues(
        document: Document,
        strokeFields: string[],
        ruleId: string,
        message: string
): KoreanFieldworkReadinessIssue[] {

    const annotatedField = strokeFields.find(fieldName => hasEvidenceValue(document.resource[fieldName]));
    if (!annotatedField || hasPhotoAnnotationExplanation(document.resource)) return [];

    return [createCloseoutReviewIssue(
        document,
        ruleId,
        message,
        '표시 위치와 의미를 description이나 shortDescription에 옮겨 HWP 보고서 작성 때 놓치지 않게 하세요.',
        [annotatedField, 'description', 'shortDescription']
    )];
}


function getPhotoUploadCloseoutIssues(
        document: Document,
        uriFields: string[],
        ruleId: string,
        message: string
): KoreanFieldworkReadinessIssue[] {

    const localUploadSource = uriFields
        .map(fieldName => getTextValue(document.resource[fieldName]))
        .find(isUploadableLocalUri);

    if (!localUploadSource
            || hasConfirmedKoreanFieldworkImageUpload(document.resource, localUploadSource)) return [];

    return [createCloseoutReviewIssue(
        document,
        ruleId,
        message,
        '태블릿 또는 프로젝트 백업 위치에 원본 파일이 남아 있는지 확인하고, 보존 위치와 확인 시각을 남기세요.',
        FIELDWORK_IMAGE_UPLOAD_RELATED_FIELDS
    )];
}


function getPhotoReportMetadataCloseoutIssues(
        document: Document,
        ruleId: string,
        message: string,
        capturedAtField: string
): KoreanFieldworkReadinessIssue[] {

    const missingFields = getMissingPhotoReportMetadataFields(document.resource, capturedAtField);
    if (missingFields.length === 0) return [];

    return [createCloseoutReviewIssue(
        document,
        ruleId,
        message,
        `${getMissingPhotoReportMetadataLabel(missingFields)}\uc744/\ub97c \ud655\uc778\ud574 \uc6d0\ubcf8 \ud30c\uc77c\uacfc \ubcf4\uace0\uc11c \uc0ac\uc9c4\uc744 \ub300\uc870\ud560 \uc218 \uc788\uac8c \ud558\uc138\uc694.`,
        missingFields
    )];
}


function getMissingPhotoReportMetadataFields(resource: Record<string, any>, capturedAtField: string): string[] {

    const missingFields: string[] = [];

    if (!hasTextValue(resource.originalFilename)) missingFields.push('originalFilename');
    if (!hasTextValue(resource[capturedAtField])) missingFields.push(capturedAtField);
    if (getNumberValue(resource.width) === undefined) missingFields.push('width');
    if (getNumberValue(resource.height) === undefined) missingFields.push('height');

    return missingFields;
}


function getMissingPhotoReportMetadataLabel(fields: string[]): string {

    return fields
        .map(field => {
            if (field === 'originalFilename') return '\uc6d0\ubcf8 \ud30c\uc77c\uba85';
            if (field === 'width') return '\uac00\ub85c \ud06c\uae30';
            if (field === 'height') return '\uc138\ub85c \ud06c\uae30';

            return '\ucd2c\uc601\uc2dc\uac01';
        })
        .join(', ');
}


function hasPhotoAnnotationExplanation(resource: Record<string, any>): boolean {

    return hasTextValue(resource.description) || hasTextValue(resource.shortDescription);
}


function isFeatureLike(document: Document): boolean {

    return FEATURE_CATEGORIES.includes(document.resource.category);
}

function hasChecklistValue(document: Document, checklistValue: string): boolean {

    return Array.isArray(document.resource.featureInvestigationChecklist)
        && document.resource.featureInvestigationChecklist.includes(checklistValue);
}

function hasValue(value: any): boolean {

    return Array.isArray(value)
        ? value.length > 0
        : value !== undefined && value !== null && value !== '';
}

function hasEvidenceValue(value: any): boolean {

    if (Array.isArray(value)) return value.length > 0;
    if (value === undefined || value === null) return false;

    if (typeof value === 'object') return Object.keys(value).length > 0;

    const text = String(value).trim();

    return !!text && text !== '[]' && text !== '{}';
}


function hasTextValue(value: unknown): value is string {

    return typeof value === 'string' && value.trim().length > 0;
}


function getTextValue(value: unknown): string|undefined {

    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : undefined;
}

function getNumberValue(value: unknown): number|undefined {

    if (typeof value === 'number' && Number.isFinite(value)) return value;

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }

    return undefined;
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

    return Array.from(new Set(values));
}

function getCloseoutIssueCounts(issues: KoreanFieldworkReadinessIssue[]): KoreanFieldworkCloseoutCounts {

    return issues.reduce((counts, issue) => ({
        ...counts,
        [issue.severity]: counts[issue.severity] + 1
    }), {
        critical: 0,
        warning: 0,
        info: 0
    });
}

function compareCloseoutIssues(issueA: KoreanFieldworkReadinessIssue,
                               issueB: KoreanFieldworkReadinessIssue): number {

    const severityDiff = CLOSEOUT_SEVERITY_ORDER[issueA.severity]
        - CLOSEOUT_SEVERITY_ORDER[issueB.severity];
    if (severityDiff !== 0) return severityDiff;

    return issueA.identifier.localeCompare(issueB.identifier)
        || issueA.ruleId.localeCompare(issueB.ruleId);
}

function dedupeKoreanFieldworkReadinessIssues(
        issues: KoreanFieldworkReadinessIssue[]
): KoreanFieldworkReadinessIssue[] {

    const seen = new Set<string>();

    return issues.filter(issue => {
        const key = `${issue.documentId}\u001f${issue.ruleId}`;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

function isRecord(value: unknown): value is Record<string, any> {

    return typeof value === 'object' && value !== null;
}


function getFiniteCoordinate(value: unknown): number|undefined {

    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(10000, value))
        : undefined;
}


function isUploadableLocalUri(uri: string|undefined): boolean {

    return !!uri && /^(file|content):\/\//.test(uri);
}

export function hasConfirmedKoreanFieldworkImageUpload(resource: Record<string, any>,
                                                       sourceUri?: string): boolean {

    if (!hasFieldworkImageUploadAuditEvidence(resource)) {
        return hasConfirmedDigitalSourcePreservation(resource);
    }

    const uploadedUri = getTextValue(resource.fieldworkImageUploadedUri);
    const uploadTarget = getTextValue(resource.fieldworkImageUploadTarget);
    const uploadedProject = getTextValue(resource.fieldworkImageUploadedProject);
    const resourceId = getTextValue(resource.id);

    return resource.fieldworkImageUploadStatus === 'uploaded'
        && hasValue(resource.fieldworkImageUploadedAt)
        && uploadedUri !== undefined
        && (sourceUri === undefined || uploadedUri === sourceUri)
        && uploadTarget !== undefined
        && uploadedProject !== undefined
        && resourceId !== undefined
        && isConfirmedFieldHubOriginalImageTarget(uploadTarget, uploadedProject, resourceId)
        && hasConfirmedUploadChecksum(resource, sourceUri)
        && hasConfirmedUploadSize(resource, sourceUri)
        && hasConfirmedStoredFileMetadata(resource)
        && hasConfirmedDigitalSourcePreservation(resource);
}

function hasFieldworkImageUploadAuditEvidence(resource: Record<string, any>): boolean {

    return hasValue(resource.fieldworkImageUploadStatus)
        || hasValue(resource.fieldworkImageUploadedAt)
        || hasValue(resource.fieldworkImageUploadedUri)
        || hasValue(resource.fieldworkImageUploadTarget)
        || hasValue(resource.fieldworkImageUploadedProject)
        || getNumberValue(resource.fieldworkImageUploadedSizeBytes) !== undefined
        || hasValue(resource.fieldworkImageUploadedMd5)
        || getNumberValue(resource.fieldworkImageStoredSizeBytes) !== undefined
        || hasValue(resource.fieldworkImageStoredMd5)
        || hasValue(resource.fieldworkImageStoredSha256);
}

function hasConfirmedUploadChecksum(resource: Record<string, any>, sourceUri?: string): boolean {

    return !sourceUri?.startsWith('file://')
        || hasValue(resource.fieldworkImageUploadedMd5);
}

function hasConfirmedUploadSize(resource: Record<string, any>, sourceUri?: string): boolean {

    return !sourceUri?.startsWith('file://')
        || getNumberValue(resource.fieldworkImageUploadedSizeBytes) !== undefined;
}

function hasConfirmedStoredFileMetadata(resource: Record<string, any>): boolean {

    return getNumberValue(resource.fieldworkImageStoredSizeBytes) !== undefined
        && hasValue(resource.fieldworkImageStoredMd5)
        && hasValue(resource.fieldworkImageStoredSha256);
}

function isConfirmedFieldHubOriginalImageTarget(uploadTarget: string,
                                                project: string,
                                                resourceId: string): boolean {

    const expectedTargetSuffix = [
        '',
        'files',
        encodeURIComponent(project),
        `${encodeURIComponent(resourceId)}?type=original_image`
    ].join('/');

    return uploadTarget.endsWith(expectedTargetSuffix);
}

function hasConfirmedDigitalSourcePreservation(resource: Record<string, any>): boolean {

    if (!Array.isArray(resource.digitalSourcePreservation)) return false;

    const requiredValues = resource.category === 'Drawing'
        ? ['originalDrawing', 'webOrServerBackup', 'backupVerified']
        : ['originalPhoto', 'originalImage', 'webOrServerBackup', 'backupVerified'];

    return requiredValues.every(value => resource.digitalSourcePreservation.includes(value));
}

function createCloseoutReviewIssue(
        document: Document,
        ruleId: string,
        message: string,
        recommendedAction: string,
        relatedFields: string[]
): KoreanFieldworkReadinessIssue {

    return {
        ruleId,
        documentId: document.resource.id,
        identifier: document.resource.identifier || document.resource.id,
        category: document.resource.category,
        severity: 'warning',
        message,
        relatedFields,
        recommendedAction,
        blocksSave: false
    };
}


function makeIssue(
    document: Document,
    ruleId: string,
    severity: KoreanFieldworkReadinessSeverity,
    message: string,
    relatedFields: string[],
    recommendedAction: string
): KoreanFieldworkReadinessIssue {

    return {
        ruleId,
        documentId: document.resource.id,
        identifier: document.resource.identifier,
        category: document.resource.category,
        severity,
        message,
        relatedFields,
        recommendedAction,
        blocksSave: false
    };
}

function normalize(text: string): string {

    return text.trim().toLowerCase();
}
