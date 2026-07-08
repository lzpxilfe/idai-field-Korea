import { Document } from '../model/document/document';

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
        '\uae30\ub85d\uc5d0 \uc9c1\uc811 \ubd99\uc740 \ud604\uc7a5\uc0ac\uc9c4 \uc6d0\ubcf8 \ubcf4\uc874 \uc0c1\ud0dc\uac00 \uc544\uc9c1 \ud655\uc778\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.'
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
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-color-candidates-review',
            '\uc0ac\uc9c4\uc5d0\uc11c \uc77d\uc740 \uba3c\uc140 \ud6c4\ubcf4\ub97c \uac80\ud1a0\ud574\uc57c \ud569\ub2c8\ub2e4.',
            '\uc0ac\uc9c4 \ud6c4\ubcf4 \uc911 \uc2e4\uc81c \ud1a0\uc0c9\uc744 \uc120\ud0dd\ud558\uac70\ub098 \uc9c1\uc811 \uba3c\uc140\uac12\uc744 \ud655\uc778\ud558\uc138\uc694.',
            ['soilColorAssistCandidates', 'soilColorAssistStatus', 'soilProfileColorSwatches']
        ));
    } else if (document.resource.soilColorAssistStatus === 'lowConfidence') {
        issues.push(createCloseoutReviewIssue(
            document,
            'soil-color-low-confidence',
            '\uc0ac\uc9c4 \ud1a0\uc0c9 \ud6c4\ubcf4\uc758 \uc2e0\ub8b0\ub3c4\uac00 \ub0ae\uc2b5\ub2c8\ub2e4.',
            '\ud604\uc7a5\uc5d0\uc11c \uba3c\uc140\uac12\uc744 \uc9c1\uc811 \ud655\uc778\ud558\uace0 \ud1a0\uc0c9 \uba54\ubaa8\ub97c \ubcf4\uac15\ud558\uc138\uc694.',
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

    if (hasTextValue(document.resource.penMemoReviewedTranscript)) return [];

    if (hasTextValue(document.resource.penMemoAutoTranscript)) {
        return [createCloseoutReviewIssue(
            document,
            'pen-memo-auto-transcript-review',
            '\uc790\ub3d9 \ud544\uc0ac\ub41c \ud604\uc7a5\uba54\ubaa8\uac00 \uc544\uc9c1 \uac80\ud1a0\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.',
            '\uc790\ub3d9 \ud544\uc0ac\ubb38\uc744 \uc6d0\ubcf8 \ud544\uae30\uc640 \ub300\uc870\ud558\uace0 \uac80\ud1a0 \ud544\uc0ac\ubb38\uc73c\ub85c \ud655\uc815\ud558\uc138\uc694.',
            ['penMemoAutoTranscript', 'penMemoReviewedTranscript', 'penMemoTranscriptionStatus']
        )];
    }

    if (hasEvidenceValue(document.resource.penMemoStrokes)) {
        return [createCloseoutReviewIssue(
            document,
            'pen-memo-handwriting-transcription',
            '\ud0dc\ube14\ub9bf \ud544\uae30 \ud604\uc7a5\uba54\ubaa8\uac00 \uc544\uc9c1 \ud544\uc0ac\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.',
            '\ud544\uae30 \uc790\ub8cc\ub97c \uc77d\uc5b4 \uac80\ud1a0 \ud544\uc0ac\ubb38\uc73c\ub85c \uc62e\uae30\uc138\uc694.',
            ['penMemoStrokes', 'penMemoReviewedTranscript', 'penMemoTranscriptionStatus']
        )];
    }

    return [];
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
        '\ud45c\uc2dc \uc704\uce58\uc640 \uc758\ubbf8\ub97c \uc124\uba85 \ub610\ub294 \uc694\uc57d\uc5d0 \uc62e\uaca8 HWP \ubcf4\uace0\uc11c \uc791\uc131 \ub54c \ub193\uce58\uc9c0 \uc54a\uac8c \ud558\uc138\uc694.',
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
        '\ud0dc\ube14\ub9bf \ub610\ub294 \ud504\ub85c\uc81d\ud2b8 \ubc31\uc5c5 \uc704\uce58\uc5d0 \uc6d0\ubcf8 \ud30c\uc77c\uc774 \ub0a8\uc544 \uc788\ub294\uc9c0 \ud655\uc778\ud558\uace0 \ubcf4\uc874 \uc704\uce58\ub97c \uae30\ub85d\ud558\uc138\uc694.',
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

    return fields.join(', ');
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
