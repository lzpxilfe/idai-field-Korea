import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
    buildEvidenceBundle,
    Condition,
    Datastore,
    Document,
    EvidenceBundle,
    Field,
    hasConfirmedKoreanFieldworkImageUpload,
    KoreanFieldworkReportHandoffCopySection,
    KoreanFieldworkReportHandoffItem,
    Labels,
    makeKoreanFieldworkReportHandoff,
    ProjectConfiguration,
    KoreanFieldworkFeaturePitLineSummary,
    getKoreanFieldworkFeaturePitLineSummaries,
    KoreanFieldworkFindSpotSummary,
    getKoreanFieldworkFindSpotSummaries,
    getKoreanFieldworkDrawingSurveySummary,
    getKoreanFieldworkRecordFieldValueSummary,
    parseSoilProfileColorSwatchRows,
    SoilProfileColorSwatchRow
} from 'idai-field-core';
import { Routing } from '../../../services/routing';
import {
    createKoreanFieldworkDraftResource,
    getKoreanFieldworkContinuationActions,
    KoreanFieldworkContinuationAction
} from '../../../util/korean-fieldwork-document-drafts';
import {
    getKoreanFieldworkActiveFeatureGuidancePreset,
    getKoreanFieldworkFeatureGuidanceChecklistFields,
    getKoreanFieldworkFeatureGuidanceSelectedAttributeLabels,
    KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS,
    KoreanFieldworkFeatureGuidancePreset
} from '../../../util/korean-fieldwork-feature-guidance';
import {
    canReviseKoreanFieldworkIdentifier,
    getKoreanFieldworkFieldIdentifier,
    getKoreanFieldworkIdentifierRevisionHistory,
    getKoreanFieldworkIdentifierRevisionUpdates,
    getKoreanFieldworkReportIdentifier
} from '../../../util/korean-fieldwork-identifier-revision';
import {
    createDailyJournalSummary,
    KoreanFieldworkDailyJournalSummary,
    getKoreanFieldworkNotebookEntriesForDocument,
    KoreanFieldworkNotebookEntry,
    makeKoreanFieldworkNotebookEntryCopyText
} from '../../../util/korean-fieldwork-notebook-digest';
import {
    getPenMemoSketchSummaries,
    getPenMemoSketchPreview,
    KoreanFieldworkPenMemoSketchSummary,
    KoreanFieldworkPenMemoSketchPreview,
    getPenMemoSketchSummaryLabel,
    getKoreanFieldworkReviewDrawingDocuments,
    getKoreanFieldworkReviewPhotoDocuments,
    getKoreanFieldworkReviewSoilProfilePhotoDocuments,
    getPhotoAnnotationSummaries,
    getPenMemoTranscriptionSummaryLabel,
    getSoilColorCandidateSummaries,
    getSoilColorSwatchSummaries
} from '../../../util/korean-fieldwork-evidence-review';
import {
    KoreanFieldworkRecordActionItem,
    makeKoreanFieldworkRecordActions
} from '../../../util/korean-fieldwork-record-actions';
import {
    KoreanFieldworkTabletRecordBundle,
    KoreanFieldworkTabletRecordBundleGroup,
    KoreanFieldworkTabletRecordBundleSource,
    makeKoreanFieldworkRecordTabletBundle
} from '../../../util/korean-fieldwork-record-tablet-bundle';
import { writeKoreanFieldworkHwpClipboardText } from '../../../util/korean-fieldwork-hwp-clipboard';
import { getKoreanFieldworkBoundaryMethodLabel } from '../../../util/korean-fieldwork-boundary-summary';
import { getKoreanFieldworkEvidenceChips } from '../../../util/korean-fieldwork-record-evidence';
import { getKoreanFieldworkInvestigationModeOption } from '../../../util/korean-fieldwork-project-setup';
import { DoceditComponent } from '../docedit.component';


interface ContextChip {
    label: string;
    tone: 'neutral'|'info'|'success'|'warning'|'danger';
}

interface ContextMetric {
    id: string;
    label: string;
    count: number;
}

interface EvidenceMetric extends ContextMetric {
    canCreate: boolean;
}

interface EvidenceInsight {
    appendText?: string;
    detail: string;
    document?: Document;
    id: string;
    label: string;
    sketchPreview?: KoreanFieldworkPenMemoSketchPreview;
    tone: 'info'|'warning';
}

type FeatureSketchShape = 'point'|'polygon'|'rectangle'|'oval';

interface FeatureSketchPoint {
    x: number;
    y: number;
}

interface FeatureLocationSketch {
    center: FeatureSketchPoint;
    points: FeatureSketchPoint[];
    rotation: number;
    scale: number;
    shape: FeatureSketchShape;
}

interface FeatureSketchSvgPoint {
    label?: string;
    x: number;
    y: number;
}

interface FeatureSketchSvgRect {
    height: number;
    rx: number;
    transform?: string;
    width: number;
    x: number;
    y: number;
}

interface FeatureSketchSvgEllipse {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    transform?: string;
}

interface FeatureSketchSvgPreview {
    boundaryPath?: string;
    ellipse?: FeatureSketchSvgEllipse;
    emptyLabel?: string;
    path?: string;
    points: FeatureSketchSvgPoint[];
    rect?: FeatureSketchSvgRect;
    viewBox: string;
}

interface FeatureLocationSketchPreview {
    location: FeatureSketchSvgPreview;
    shape: FeatureSketchSvgPreview;
    summary: string;
}

interface FeatureGeometryStatusAction {
    icon: string;
    label: string;
    value: string;
}

interface FeatureFreeDrawingPreview {
    emptyLabel?: string;
    path?: string;
    summary: string;
    updatedAt?: string;
    viewBox: string;
}

interface FeaturePitLineSvgLine {
    end: FeatureSketchSvgPoint;
    label: string;
    labelPoint: FeatureSketchSvgPoint;
    start: FeatureSketchSvgPoint;
    text: string;
}

interface FeaturePitLinePreview {
    lines: FeaturePitLineSvgLine[];
    summary: string;
    updatedAt?: string;
    viewBox: string;
}

interface FindSpotSvgPoint extends FeatureSketchSvgPoint {
    text: string;
}

interface FindSpotPreview {
    points: FindSpotSvgPoint[];
    summary: string;
    title: string;
    updatedAt?: string;
    viewBox: string;
}

interface SoilProfileLayerMarker {
    label: string;
    xPercent: number;
    yPercent: number;
}

interface DailyJournalBoundaryMemoPreview {
    importedAt?: string;
    path: string;
    summary: string;
    updatedAt?: string;
    viewBox: string;
}

interface ChecklistSummaryField {
    fieldName: string;
    labels: Readonly<Record<string, string>>;
    prefix: string;
}

const KOREAN_FIELDWORK_CONTEXT_FIELDS = [
    'dailyLogBoundaryMemoImportedAt',
    'dailyLogBoundaryMemoStrokes',
    'dailyLogBoundaryMemoUpdatedAt',
    'dailyLogContent',
    'dailyLogEquipmentCount',
    'dailyLogEquipmentSize',
    'dailyLogEvidenceRole',
    'dailyLogInvestigatorCount',
    'dailyLogLaborerCount',
    'dailyLogReview',
    'dailyLogSafetyEducationPhoto',
    'dailyLogSafetyEducationStretching',
    'dailyLogWorkMemoUpdatedAt',
    'dailyLogWorkerCount',
    'drawingSurveyMethods',
    'drawingThreeDDevices',
    'drawingSurveyStages',
    'drawingSurveyUpdatedAt',
    'featureFreeDrawingStrokes',
    'featureFreeDrawingUpdatedAt',
    'featureSoilPitLine',
    'featureSoilPitLines',
    'featureSoilPitLineUpdatedAt',
    'featureBlockInclusionAssessment',
    'featureBurialProcessAssessment',
    'featureFillInterpretation',
    'featureInvestigationChecklist',
    'featureLifecycleReview',
    'fieldworkImageStoredMd5',
    'fieldworkImageStoredSha256',
    'fieldworkImageStoredSizeBytes',
    'fieldworkImageUploadedAt',
    'fieldworkImageUploadedMd5',
    'fieldworkImageUploadedProject',
    'fieldworkImageUploadedSizeBytes',
    'fieldworkImageUploadedUri',
    'fieldworkImageUploadStatus',
    'fieldworkImageUploadTarget',
    'fieldworkPhotoAnnotationStrokes',
    'featureRecordingStatus',
    'fieldRecordQuality',
    'findSpotItems',
    'findSpotItemsUpdatedAt',
    'longAxisOrientation',
    'mediaEvidenceRole',
    'mediaQualityCheck',
    'operationRoleResponsibility',
    'period',
    'shortAxisOrientation',
    'projectBoundarySummary',
    'projectInvestigationMode',
    'qualityCorrectionBasis',
    'qualityReviewStage',
    'referenceBasemapProvider',
    'recordCreationTiming',
    'reviewedRecordUnit',
    'reportCrossCheck',
    'reportEvaluationFeedback',
    'sourceEvidenceVerification',
    'soilColorAssistStatus',
    'soilColorAssistCandidates',
    'soilMapPredictionVerification',
    'soilParticleFieldCheck',
    'soilProfileAnnotationStrokes',
    'soilProfilePhotoAnnotationStrokes',
    'soilTextureFieldAssessment',
    'surveyBoundaryAccuracy',
    'surveyBoundaryNote',
    'surveyBoundarySource',
    'verificationState'
];

const KOREAN_FIELDWORK_CONTEXT_CATEGORIES = new Set<string>([
    'Operation',
    'Project',
    'Trench',
    'FeatureGroup',
    'Feature',
    'FeatureSegment',
    'Layer',
    'Survey',
    'SurveyBoundary',
    'SourceEvidenceIndex',
    'Find',
    'FindCollection',
    'Sample',
    'Photo',
    'SoilProfilePhoto',
    'Drawing',
    'PenMemo',
    'DailyLog',
    'FieldRecordQualityReview'
]);

const DIRECT_PARENT_RELATIONS = [
    'liesWithin',
    'isRecordedInFeature',
    'depicts',
    'isDepictedIn',
    'isMapLayerOf',
    'isRecordedIn'
];

const CHILD_RELATIONS = ['liesWithin', 'isRecordedIn', 'isRecordedInFeature'];
const LINKED_EVIDENCE_RELATIONS = ['depicts', 'isDepictedIn', 'isMapLayerOf', 'isSubjectOf', 'isResultOf'];
const NOTEBOOK_APPEND_TARGET_FIELDS = ['description', 'featureChecklistNote', 'interpretation', 'shortDescription'];
const FEATURE_CATEGORY_NAME = 'Feature';
const SURVEY_BOUNDARY_CATEGORY_NAME = 'SurveyBoundary';
const FIELD_RECORD_QUALITY_REVIEW_CATEGORY_NAME = 'FieldRecordQualityReview';
const FEATURE_SKETCH_SHAPES = new Set<FeatureSketchShape>(['point', 'polygon', 'rectangle', 'oval']);
const FEATURE_SKETCH_VIEWBOX = '0 0 120 80';
const FEATURE_SKETCH_WIDTH = 120;
const FEATURE_SKETCH_HEIGHT = 80;
const FEATURE_SKETCH_PADDING = 8;
const SOIL_COLOR_SAMPLE_VIEWBOX = '0 0 120 72';
const SOIL_COLOR_SAMPLE_WIDTH = 120;
const SOIL_COLOR_SAMPLE_HEIGHT = 72;
const SOIL_COLOR_SAMPLE_MARKER_RADIUS = 4;
const FEATURE_GEOMETRY_EDIT_STATUS_FIELD = 'featureGeometryEditStatus';
const FEATURE_FREE_DRAWING_STROKES_FIELD = 'featureFreeDrawingStrokes';
const FEATURE_FREE_DRAWING_UPDATED_AT_FIELD = 'featureFreeDrawingUpdatedAt';
const FEATURE_PIT_LINE_UPDATED_AT_FIELD = 'featureSoilPitLineUpdatedAt';
const FIND_SPOT_CATEGORIES = new Set<string>(['Find', 'FindCollection', 'Sample']);
const FIND_SPOT_UPDATED_AT_FIELD = 'findSpotItemsUpdatedAt';
const DAILY_LOG_CATEGORY_NAME = 'DailyLog';
const DAILY_LOG_BOUNDARY_MEMO_IMPORTED_AT_FIELD = 'dailyLogBoundaryMemoImportedAt';
const DAILY_LOG_BOUNDARY_MEMO_STROKES_FIELD = 'dailyLogBoundaryMemoStrokes';
const DAILY_LOG_BOUNDARY_MEMO_UPDATED_AT_FIELD = 'dailyLogBoundaryMemoUpdatedAt';

const FEATURE_RECORDING_STATUS_LABELS: Readonly<Record<string, ContextChip>> = {
    candidate: { label: '조사 전', tone: 'warning' },
    investigating: { label: '조사 중', tone: 'info' },
    confirmed: { label: '완료', tone: 'success' }
};

const RECORD_CREATION_TIMING_LABELS: Readonly<Record<string, ContextChip>> = {
    duringFieldwork: { label: '추가 기록', tone: 'info' },
    sameDayFieldRecord: { label: '당일 기록', tone: 'success' },
    fieldOnlyObservation: { label: '현장 한정', tone: 'warning' },
    handoverStage: { label: '인계 단계', tone: 'info' },
    reportStageGenerated: { label: '보고 단계', tone: 'neutral' },
    postExcavationDerived: { label: '정리 파생', tone: 'neutral' }
};

const VERIFICATION_STATE_LABELS: Readonly<Record<string, ContextChip>> = {
    observedInField: { label: '현장 확인', tone: 'success' },
    candidate: { label: '확인 후보', tone: 'warning' },
    inferred: { label: '추정', tone: 'info' },
    conflictingEvidence: { label: '근거 충돌', tone: 'danger' },
    notObserved: { label: '미확인', tone: 'neutral' },
    needsRecheck: { label: '재검토', tone: 'warning' },
    pendingDecision: { label: '추가 확인', tone: 'warning' }
};

const GEOMETRY_EDIT_STATUS_LABELS: Readonly<Record<string, ContextChip>> = {
    roughSketch: { label: '약도', tone: 'warning' },
    needsAerialAlignment: { label: '보정 필요', tone: 'warning' },
    adjustedToAerialLayer: { label: '드론 배경 맞춤', tone: 'success' },
    adjustedToSurveyLine: { label: '측량선 맞춤', tone: 'success' },
    finalAccepted: { label: '최종 확정', tone: 'success' }
};

const FEATURE_GEOMETRY_STATUS_ACTIONS: readonly FeatureGeometryStatusAction[] = [
    { value: 'roughSketch', label: '약도', icon: 'mdi-map-marker-path' },
    { value: 'needsAerialAlignment', label: '보정 필요', icon: 'mdi-map-marker-alert-outline' },
    { value: 'adjustedToAerialLayer', label: '드론 맞춤', icon: 'mdi-image-filter-hdr' },
    { value: 'adjustedToSurveyLine', label: '측량선 맞춤', icon: 'mdi-ruler-square' },
    { value: 'finalAccepted', label: '최종 확정', icon: 'mdi-check-decagram-outline' }
];

const FEATURE_PERIOD_LABELS: Readonly<Record<string, string>> = {
    paleolithic: '구석기',
    neolithic: '신석기',
    bronzeAge: '청동기',
    earlyIronAge: '초기철기',
    protoThreeKingdoms: '원삼국',
    threeKingdoms: '삼국',
    goguryeo: '고구려',
    baekje: '백제',
    silla: '신라',
    gaya: '가야',
    unifiedSilla: '통일신라',
    balhae: '발해',
    goryeo: '고려',
    joseon: '조선',
    koreanEmpire: '대한제국',
    japaneseColonial: '일제강점기',
    liberationKoreanWar: '해방 전후·한국전쟁기',
    modernContemporary: '근현대',
    mixedPeriod: '복합시기',
    undated: '시기미상'
};

const FEATURE_PERIOD_CATEGORIES = new Set<string>(['FeatureGroup', 'Feature', 'FeatureSegment']);
const MEDIA_REVIEW_CATEGORIES = new Set<string>(['Photo', 'SoilProfilePhoto', 'Drawing']);
const MEDIA_LOCAL_URI_FIELDS: Readonly<Record<string, readonly string[]>> = {
    Drawing: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
    Photo: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
    SoilProfilePhoto: ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri']
};

const OPERATION_ROLE_RESPONSIBILITY_LABELS: Readonly<Record<string, string>> = {
    principalInvestigator: '조사단장',
    responsibleInvestigator: '책임조사원',
    fieldDirector: '현장팀장',
    fieldInvestigator: '조사원',
    juniorInvestigator: '준조사원',
    fieldAssistant: '보조원',
    surveyLead: '측량 담당',
    photographyLead: '사진 담당',
    drawingLead: '도면 담당',
    safetyLead: '안전 담당',
    complaintCommunicationLead: '민원·기관소통 담당',
    artifactProcessingLead: '유물정리 담당',
    sampleCollectionLead: '시료채취 담당',
    dailyLogAuthor: '작업일지 작성자',
    reportPreparationLead: '보고서 담당',
    reviewer: '검토자',
    roleGapIdentified: '역할 공백 확인',
    pendingDecision: '추가 확인'
};

const OPERATION_ROLE_RESPONSIBILITY_WARNING_VALUES = new Set([
    'roleGapIdentified',
    'pendingDecision'
]);

const FEATURE_FILL_INTERPRETATION_LABELS: Readonly<Record<string, string>> = {
    workedSurface: '가공면',
    formationDuringCutting: '가공시 형성층',
    functionalSurface: '기능면',
    useDeposit: '기능시 퇴적층',
    intentionalBackfill: '인위 매립토',
    collapseDeposit: '붕락토',
    naturalInflow: '자연 유입토',
    naturalDeposit: '자연 퇴적층',
    pedogenicHiatus: '토양화 휴지기',
    packingDeposit: '충전토',
    postAbandonmentDeposit: '폐기 후 퇴적층',
    attributionCaution: '귀속 주의',
    pendingDecision: '추가 확인'
};

const FEATURE_LIFECYCLE_REVIEW_LABELS: Readonly<Record<string, string>> = {
    locationFormRecorded: '입지 형태 기록',
    generalFunctionCandidate: '일반 기능 후보',
    culturalLayerRelation: '문화층 관계',
    naturalDepositRelation: '자연퇴적층 관계',
    cutSurface: '가공면',
    useSurface: '기능면',
    individualLayerGroup: '개별층 묶음',
    constructionProcess: '축조 과정',
    useProcess: '사용 과정',
    abandonmentProcess: '폐기 과정',
    burialProcess: '매몰 과정',
    comparativeCase: '유사사례',
    scientificAnalysisData: '자연과학 분석자료',
    findLayerRelationRecorded: '유물-층위 관계 기록',
    depositProcessNarrativeChecked: '퇴적 과정 서술 검토',
    pendingDecision: '추가 확인'
};

const FEATURE_BLOCK_INCLUSION_ASSESSMENT_LABELS: Readonly<Record<string, string>> = {
    blockBearingLayer: '블록 포함층',
    blockMaterialRecorded: '블록 구성물질 기록',
    baseLayerDerived: '기반층 유래',
    transportedFromElsewhere: '타처 운반',
    angularBlock: '각진 블록',
    roundedBlock: '마모 블록',
    collapseDepositCandidate: '붕락층 후보',
    artificialFillCandidate: '인위매립층 후보',
    formationLayerCandidate: '가공시 형성층 후보',
    artifactSpansBlock: '유물 블록 걸침',
    exposureTimingReviewed: '노출시기 검토',
    pendingDecision: '추가 확인'
};

const FEATURE_BURIAL_PROCESS_ASSESSMENT_LABELS: Readonly<Record<string, string>> = {
    rapidBurial: '급격 매몰',
    gradualBurial: '점진 매몰',
    artificialFill: '인위매립층',
    naturalInflow: '자연유입층',
    waterlaidDeposit: '수성퇴적층',
    repeatedCollapse: '붕락층 반복',
    laminaPresent: '라미나 있음',
    hiatusTrace: '휴지기 흔적',
    soilFormationTrace: '토양화 흔적',
    burntSoilInclusion: '소토 혼입',
    charcoalAshInclusion: '탄화재 혼입',
    bulkArtifactBurial: '일괄유물 매몰',
    pendingDecision: '추가 확인'
};

const SOIL_TEXTURE_FIELD_ASSESSMENT_LABELS: Readonly<Record<string, string>> = {
    fingerRubbing: '손가락 비빔',
    ballRibbonTest: '구슬·리본 시험',
    notebookDryingTest: '노트 찍어 말림',
    referenceSampleComparison: '표본시료 대조',
    quantitativeAnalysisNeeded: '정량분석 대조 필요',
    assessmentMethodStandardized: '판정법 통일',
    pendingDecision: '추가 확인'
};

const SOIL_PARTICLE_FIELD_CHECK_LABELS: Readonly<Record<string, string>> = {
    gravelDirectMeasured: '자갈 직접 계측',
    particleSizeChartUsed: '입자 크기표 대조',
    sandSieveChecked: '모래 체질',
    wetSmearChecked: '수분 가미 도말',
    touchTestChecked: '촉감 테스트',
    referenceSampleCompared: '표본시료 대조',
    siltClayMudWordingReviewed: '실트·점토·니 표현 검토',
    laboratoryGrainSizeComparison: '실내 입도분석 대조',
    expertReviewRequested: '전문가 판정 의뢰',
    pendingDecision: '추가 확인'
};

const SOIL_MAP_PREDICTION_VERIFICATION_LABELS: Readonly<Record<string, string>> = {
    soilMapSheetRecorded: '토양도 도엽 기록',
    mapScaleRecorded: '지도 축척 기록',
    soilSeriesMapped: '토양통 매핑',
    greatSoilGroupReclassified: '대토양군 재분류',
    alluvialSoilCandidate: '충적토 후보',
    graySoilCandidate: '회색토 후보',
    redYellowSoilCandidate: '적황색토 후보',
    salineOrganicSoilCandidate: '염류·유기질토 후보',
    soilMapDepthLimitChecked: '토양도 반영깊이 한계 확인',
    buriedMicroLandformNotReflected: '매몰 미지형 미반영',
    surroundingSiteCompared: '주변 유적 대조',
    residentReportCompared: '주민 제보 대조',
    trenchResultSupportsPrediction: '시굴 결과가 예측 지지',
    trenchResultRevisesPrediction: '시굴 결과로 예측 수정',
    siteAbsenceNotConfirmed: '유적 부재 확정 금지',
    preservationPotentialReviewed: '보존능 검토',
    reportFeedbackRequired: '보고서 환류 필요',
    pendingDecision: '추가 확인'
};

const SOURCE_EVIDENCE_VERIFICATION_LABELS: Readonly<Record<string, string>> = {
    pageChecked: '쪽수 대조',
    figureNumberChecked: '그림번호 대조',
    tableNumberChecked: '표번호 대조',
    captionChecked: '캡션 대조',
    caseNameChecked: '사례명 대조',
    originalScriptChecked: '한자·원문 대조',
    numericValueChecked: '수치 대조',
    provenanceChecked: '출전·소장처 대조',
    crossSourceCompared: '교차 출처 대조',
    directPdfChecked: '원PDF 직접 대조',
    formChecked: '양식 대조',
    ocrCorrectionNeeded: 'OCR 교정 필요',
    captionNeedsCheck: '캡션 대조 필요',
    valueListPromotionReady: '값목록 승격 가능',
    uiExposureDeferred: 'UI 노출 보류',
    pendingDecision: '추가 확인'
};

const MEDIA_EVIDENCE_ROLE_LABELS: Readonly<Record<string, string>> = {
    fieldOverview: '현장 전경',
    workStageRecord: '작업단계 기록',
    fieldResultRecord: '현장결과 기록',
    stratigraphicEvidence: '층위 근거',
    featureOutlineEvidence: '유구 윤곽 근거',
    findContextEvidence: '유물 출토맥락 근거',
    sampleLocationEvidence: '시료 위치 근거',
    drawingCorrectionBasis: '도면 교정 근거',
    preservationActionEvidence: '보존조치 근거',
    reportPlateCandidate: '보고서 도판 후보',
    publicOutputCandidate: '공개자료 후보',
    pendingDecision: '추가 확인'
};

const MEDIA_QUALITY_CHECK_LABELS: Readonly<Record<string, string>> = {
    targetPurposeClear: '대상·목적 명확',
    resultProcessRoleSeparated: '결과·과정 구분',
    directionRecorded: '방향 기록',
    scaleIncluded: '축척 포함',
    inFrameRecordBoardIncluded: '주기판·방위·스케일 동시촬영',
    orientationChecked: '방위 기준 확인',
    controlPointLinked: '기준점 연결',
    resolutionOrLineworkReadable: '해상도·선명도 적정',
    lightingConditionSuitable: '조명 조건 적정',
    captureFormatRecorded: '촬영 포맷 기록',
    originalUncroppedPreserved: '원본 무손상 보존',
    registerNumberMatched: '대장번호 일치',
    photoNotebookMatched: '사진야장 대조',
    photoContentLogRecorded: '촬영내용 기록',
    digitalMetadataCrossChecked: '디지털 메타데이터 대조',
    printAnnotationAdded: '인화 사진 주기 기록',
    preRecoveryPhotoTaken: '수습 전 사진',
    multiDirectionPhotoTaken: '다방향 사진',
    overheadOnlyAvoided: '직상방만 촬영 회피',
    obliqueSidePhotoTaken: '사선·측면 사진',
    overviewCloseupPaired: '원경·근경 병행',
    associatedAreaIncluded: '관련 구역 함께 기록',
    interiorOppositeDirectionViews: '내부 양방향 촬영',
    colorMoistureStateCaptured: '색·수분 상태 기록',
    stratigraphyWholePartDetailSet: '토층 전체·분할·세부 사진',
    backlightAvoided: '역광 촬영 회피',
    levelingLinkedForRecovery: '레벨링 연계 위치복원',
    findNumberLocationMatched: '유물번호·위치 일치',
    smallFeatureActualShapeShown: '소형 시설 실제 형상 표시',
    planSectionElevationMatched: '평·단·입면 정합',
    criticalSectionLinesRecorded: '핵심 단면선 기록',
    multiplePlanDrawingsLinked: '복수 평면도 연결',
    planProfileSequenceLinked: '평면·입단면 순서 연결',
    conjecturalLineReasonRecorded: '추정선 사유 기록',
    unexcavatedLineSeparated: '미조사 점선 구분',
    longShortAxisSectionLinked: '장·단축 단면 연결',
    oxidationReductionColorAnnotated: '산화·환원 색표기',
    stageDrawingSeparated: '단계도면 분리',
    separateGridSheetLinked: '별도 방안지 연결',
    tracingOverlayRegistered: '트레이싱지 중첩 등록',
    baseGridLineMaintained: '기준 방안선 유지',
    sheetConnectionMarksRecorded: '도면 연결표시 기록',
    copyDrawingPositionAnnotated: '복사도면 위치주기',
    topBottomSurfaceSeparated: '상면·바닥 분리',
    overlapSequenceAnnotated: '중복 선후관계 표기',
    levelingDatumMatched: 'BM·해발고도 일치',
    levelingColorSeparated: '차수별 레벨 색상 구분',
    fieldCompletionCorrectionRecorded: '현장 완료·보완 이력',
    stageDrawingScaleMismatch: '단계도면 축척 불일치',
    orientationMismatch: '방향 불일치',
    planSectionMismatch: '평·단면 불일치',
    leftRightReversal: '좌우반전',
    invertedScan: '뒤집힌 스캔',
    photoUpsideDown: '사진 상하반전',
    lowResolution: '저해상도',
    focusBlurred: '초점 흔들림',
    originalCropDamage: '원본 크롭 손상',
    fieldResearcherReviewed: '현장조사자 검수',
    rereviewNeeded: '재검수 필요',
    retakeOrRedrawNeeded: '재촬영·재작성 필요',
    pendingDecision: '추가 확인'
};

const REPORT_CROSS_CHECK_LABELS: Readonly<Record<string, string>> = {
    manuscript: '원고',
    drawingRegister: '도면대장',
    photoRegister: '사진대장',
    artifactRegister: '유물대장',
    sampleRegister: '시료목록',
    dailyLog: '조사일지',
    stratigraphicStandard: '기준토층',
    overallStratigraphyFlowDiagram: '전체 층위 흐름도',
    stratigraphicPhotoPlate: '층위 사진 도판',
    layerFindContextConsistency: '층위-유물 맥락 정합성',
    absoluteDateStratigraphyLinked: '연대측정-층위도 연결',
    numberConversionTable: '번호 변환표',
    sourceMediaBackup: '원자료 백업',
    evaluationFeedback: '평가 환류'
};

const RECORD_CONTEXT_CHECKLIST_WARNING_VALUES = new Set([
    'attributionCaution',
    'captionNeedsCheck',
    'expertReviewRequested',
    'focusBlurred',
    'invertedScan',
    'leftRightReversal',
    'lowResolution',
    'ocrCorrectionNeeded',
    'orientationMismatch',
    'originalCropDamage',
    'pendingDecision',
    'photoUpsideDown',
    'planSectionMismatch',
    'quantitativeAnalysisNeeded',
    'reportFeedbackRequired',
    'retakeOrRedrawNeeded',
    'rereviewNeeded',
    'siteAbsenceNotConfirmed',
    'stageDrawingScaleMismatch',
    'trenchResultRevisesPrediction'
]);

const FEATURE_STRATIGRAPHY_INTERPRETATION_FIELDS: readonly ChecklistSummaryField[] = [
    {
        fieldName: 'featureFillInterpretation',
        labels: FEATURE_FILL_INTERPRETATION_LABELS,
        prefix: '내부토'
    },
    {
        fieldName: 'featureLifecycleReview',
        labels: FEATURE_LIFECYCLE_REVIEW_LABELS,
        prefix: '라이프사이클'
    },
    {
        fieldName: 'featureBlockInclusionAssessment',
        labels: FEATURE_BLOCK_INCLUSION_ASSESSMENT_LABELS,
        prefix: '블록'
    },
    {
        fieldName: 'featureBurialProcessAssessment',
        labels: FEATURE_BURIAL_PROCESS_ASSESSMENT_LABELS,
        prefix: '매몰'
    }
];

const FEATURE_STRATIGRAPHY_SOIL_FIELDS: readonly ChecklistSummaryField[] = [
    {
        fieldName: 'soilTextureFieldAssessment',
        labels: SOIL_TEXTURE_FIELD_ASSESSMENT_LABELS,
        prefix: '판정'
    },
    {
        fieldName: 'soilParticleFieldCheck',
        labels: SOIL_PARTICLE_FIELD_CHECK_LABELS,
        prefix: '입자'
    }
];

const SURVEY_PREDICTION_REVIEW_FIELDS: readonly ChecklistSummaryField[] = [
    {
        fieldName: 'soilMapPredictionVerification',
        labels: SOIL_MAP_PREDICTION_VERIFICATION_LABELS,
        prefix: '토양도'
    }
];

const SOURCE_EVIDENCE_VERIFICATION_FIELDS: readonly ChecklistSummaryField[] = [
    {
        fieldName: 'sourceEvidenceVerification',
        labels: SOURCE_EVIDENCE_VERIFICATION_LABELS,
        prefix: '근거'
    }
];

const MEDIA_REVIEW_FIELDS: readonly ChecklistSummaryField[] = [
    {
        fieldName: 'mediaEvidenceRole',
        labels: MEDIA_EVIDENCE_ROLE_LABELS,
        prefix: '역할'
    },
    {
        fieldName: 'mediaQualityCheck',
        labels: MEDIA_QUALITY_CHECK_LABELS,
        prefix: '품질'
    },
    {
        fieldName: 'reportCrossCheck',
        labels: REPORT_CROSS_CHECK_LABELS,
        prefix: '보고'
    }
];

const FIELD_RECORD_QUALITY_REVIEW_SUMMARY_FIELDS = [
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

@Component({
    selector: 'korean-fieldwork-record-context-panel',
    templateUrl: './korean-fieldwork-record-context-panel.html',
    standalone: false
})
export class KoreanFieldworkRecordContextPanelComponent implements OnChanges {

    @Input() document: Document;
    @Input() fieldDefinitions: Field[];

    @Output() onChanged: EventEmitter<void> = new EventEmitter<void>();

    public parentPathLabel: string|undefined;
    public metrics: ContextMetric[] = [];
    public evidenceMetrics: EvidenceMetric[] = [];
    public evidenceInsights: EvidenceInsight[] = [];
    public notebookEntries: KoreanFieldworkNotebookEntry[] = [];
    public continuationActions: KoreanFieldworkContinuationAction[] = [];
    public recordActions: KoreanFieldworkRecordActionItem[] = [];
    public reportHandoffItem: KoreanFieldworkReportHandoffItem|undefined;
    public tabletRecordBundle: KoreanFieldworkTabletRecordBundle|undefined;
    public expandedTabletRecordBundleGroupIds: string[] = [];
    public reportHandoffCopiedId: string|undefined;
    public tabletRecordBundleCopiedId: string|undefined;
    public evidenceInsightCopiedId: string|undefined;
    public notebookEntryCopiedId: string|undefined;
    public identifierRevisionNextValue: string = '';
    public identifierRevisionReason: string = '';

    private createdDocuments: Document[] = [];
    private identifierRevisionDraftKey: string|undefined;
    private projectDocuments: Document[] = [];


    constructor(private datastore: Datastore,
                private labels: Labels,
                private projectConfiguration: ProjectConfiguration,
                private routing: Routing,
                private modalService: NgbModal) {}


    async ngOnChanges() {

        this.initializeIdentifierRevisionDraft();
        await this.refreshContext();
    }


    public shouldShow = () => this.hasKoreanFieldworkContext();


    public getCategoryLabel(): string {

        const category = this.projectConfiguration.getCategory(this.document?.resource?.category);

        return category
            ? this.labels.get(category)
            : this.document?.resource?.category ?? '';
    }


    public getCurrentIdentifier(): string {

        return this.document?.resource?.identifier || this.document?.resource?.id || '';
    }


    public getStatusChips(): ContextChip[] {

        const resource = this.document?.resource as any;
        if (!resource) return [];

        const chips: ContextChip[] = [];
        const orientationChip = this.getAxisOrientationChip(resource);

        this.pushProjectSetupChips(chips, resource);
        this.pushSurveyBoundaryChips(chips, resource);
        if (orientationChip) chips.push(orientationChip);
        this.pushOperationRoleResponsibilityChip(chips, resource);
        this.pushFeatureStratigraphyReviewChips(chips, resource);
        this.pushSurveyPredictionReviewChip(chips, resource);
        this.pushSourceEvidenceVerificationChip(chips, resource);
        this.pushFieldRecordQualityReviewChip(chips, resource);
        this.pushMediaReviewChip(chips, resource);
        this.pushImageUploadChip(chips, resource);
        this.pushFeaturePeriodChip(chips, resource);
        this.pushMappedChip(chips, resource.featureRecordingStatus, FEATURE_RECORDING_STATUS_LABELS);
        this.pushFeatureAttributeChip(chips);
        this.pushMappedChip(chips, resource.verificationState, VERIFICATION_STATE_LABELS);
        this.pushMappedChip(chips, resource.recordCreationTiming, RECORD_CREATION_TIMING_LABELS);
        this.pushMappedChip(chips, resource.featureGeometryEditStatus, GEOMETRY_EDIT_STATUS_LABELS);

        if (Array.isArray(resource.fieldRecordQuality)) {
            chips.push(resource.fieldRecordQuality.length > 0
                ? { label: `기록 구분 ${resource.fieldRecordQuality.length}`, tone: 'success' }
                : { label: '기록 보완', tone: 'warning' });
        }

        return this.dedupeChips(chips).slice(0, 5);
    }


    public hasNotebookEntries = () => this.notebookEntries.length > 0;


    public getNotebookEntries = () => this.notebookEntries;


    public hasContinuationActions = () => this.continuationActions.length > 0;


    public getContinuationActions = () => this.continuationActions;


    public hasRecordActions = () => this.recordActions.length > 0;


    public hasRecordActionEmptyState = () =>
        this.hasKoreanFieldworkContext() && !this.hasRecordActions();


    public getRecordActions = () => this.recordActions;


    public hasTabletRecordBundle = () => !!this.tabletRecordBundle;


    public getTabletRecordBundle = () => this.tabletRecordBundle;


    public isTabletRecordBundleCopied = () =>
        !!this.tabletRecordBundle && this.tabletRecordBundleCopiedId === this.tabletRecordBundle.documentId;


    public isTabletRecordBundleGroupCopied = (group: KoreanFieldworkTabletRecordBundleGroup) =>
        !!this.tabletRecordBundle
        && this.tabletRecordBundleCopiedId === this.getTabletRecordBundleGroupCopyId(
            this.tabletRecordBundle,
            group
        );


    public isTabletRecordBundleSourceCopied = (
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ) => !!this.tabletRecordBundle
        && this.tabletRecordBundleCopiedId === this.getTabletRecordBundleSourceCopyId(
            this.tabletRecordBundle,
            group,
            source
        );


    public getTabletRecordBundleCopyActionLabel = () =>
        this.isTabletRecordBundleCopied() ? '\ubcf5\uc0ac\ub428' : '\ubb36\uc74c \ubcf5\uc0ac';


    public getTabletRecordBundleGroupCopyActionLabel = (group: KoreanFieldworkTabletRecordBundleGroup) =>
        this.isTabletRecordBundleGroupCopied(group) ? '\ubcf5\uc0ac\ub428' : '\ubcf5\uc0ac';


    public getTabletRecordBundleSourceCopyActionLabel = (
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ) => this.isTabletRecordBundleSourceCopied(group, source) ? '\ubcf5\uc0ac\ub428' : '\ubcf5\uc0ac';


    public isTabletRecordBundleGroupExpanded = (group: KoreanFieldworkTabletRecordBundleGroup) =>
        this.expandedTabletRecordBundleGroupIds.includes(group.id);


    public getTabletRecordBundleGroupToggleLabel = (group: KoreanFieldworkTabletRecordBundleGroup) =>
        this.isTabletRecordBundleGroupExpanded(group) ? '\uc811\uae30' : '\ud3bc\uce58\uae30';


    public toggleTabletRecordBundleGroup(group: KoreanFieldworkTabletRecordBundleGroup) {

        this.expandedTabletRecordBundleGroupIds = this.isTabletRecordBundleGroupExpanded(group)
            ? this.expandedTabletRecordBundleGroupIds.filter(groupId => groupId !== group.id)
            : this.expandedTabletRecordBundleGroupIds.concat(group.id);
    }


    public canOpenTabletRecordBundleSource = (source: KoreanFieldworkTabletRecordBundleSource) =>
        !!source.documentId;


    public hasReportHandoffItem = () => !!this.reportHandoffItem;


    public getReportHandoffItem = () => this.reportHandoffItem;


    public isReportHandoffItemCopied = () =>
        !!this.reportHandoffItem && this.reportHandoffCopiedId === this.reportHandoffItem.documentId;


    public isReportHandoffSectionCopied = (section: KoreanFieldworkReportHandoffCopySection) =>
        !!this.reportHandoffItem
        && this.reportHandoffCopiedId === this.getReportHandoffSectionCopyId(this.reportHandoffItem, section);


    public isReportHandoffBodyCopied = () => {
        const bodySection = this.getReportHandoffBodySection();

        return !!bodySection && this.isReportHandoffSectionCopied(bodySection);
    };


    public getReportHandoffCopyActionLabel = () =>
        this.isReportHandoffItemCopied() ? '\ubcf5\uc0ac\ub428' : '\uc804\uccb4';


    public getReportHandoffBodyCopyActionLabel = () =>
        this.isReportHandoffBodyCopied() ? '\ubcf5\uc0ac\ub428' : '\ubcf8\ubb38';


    public getReportHandoffSectionCopyActionLabel = (section: KoreanFieldworkReportHandoffCopySection) =>
        this.isReportHandoffSectionCopied(section) ? '\ubcf5\uc0ac\ub428' : section.label;


    public canCopyEvidenceInsight = (insight: EvidenceInsight) =>
        !!this.getEvidenceInsightCopyText(insight);


    public isEvidenceInsightCopied = (insight: EvidenceInsight) =>
        this.evidenceInsightCopiedId === insight.id;


    public getEvidenceInsightCopyActionLabel = (insight: EvidenceInsight) =>
        this.isEvidenceInsightCopied(insight) ? '복사됨' : '복사';


    public hasEvidenceMetrics = () => this.evidenceMetrics.length > 0;


    public getEvidenceMetrics = () => this.evidenceMetrics;


    public hasEvidenceInsights = () => this.evidenceInsights.length > 0;


    public getEvidenceInsights = () => this.evidenceInsights;


    public hasFeatureLocationSketchPreview = () =>
        this.getFeatureLocationSketchPreview() !== undefined;


    public canShowFeatureGeometryStatusActions = () =>
        this.document?.resource?.category === FEATURE_CATEGORY_NAME
        && !!this.getField(FEATURE_GEOMETRY_EDIT_STATUS_FIELD);


    public getFeatureGeometryStatusActions = () => FEATURE_GEOMETRY_STATUS_ACTIONS;


    public isFeatureGeometryStatusActive(value: string): boolean {

        return ((this.document?.resource as any)?.[FEATURE_GEOMETRY_EDIT_STATUS_FIELD] ?? 'roughSketch') === value;
    }


    public setFeatureGeometryEditStatus(value: string) {

        if (!this.canShowFeatureGeometryStatusActions()
                || !FEATURE_GEOMETRY_STATUS_ACTIONS.some(action => action.value === value)) {
            return;
        }

        const resource = this.document.resource as any;
        if (resource[FEATURE_GEOMETRY_EDIT_STATUS_FIELD] === value) return;

        resource[FEATURE_GEOMETRY_EDIT_STATUS_FIELD] = value;
        this.onChanged.emit();
    }


    public getFeatureLocationSketchPreview(): FeatureLocationSketchPreview|undefined {

        if (this.document?.resource?.category !== FEATURE_CATEGORY_NAME) return undefined;

        const sketch = this.getFeatureLocationSketch();
        if (!sketch) {
            return {
                location: this.makeEmptyFeatureLocationSketchSvg('위치 스케치 필요', true),
                shape: this.makeEmptyFeatureLocationSketchSvg('형태 스케치 필요', false),
                summary: '스케치 필요'
            };
        }

        return {
            location: this.makeFeatureLocationSketchSvg(sketch, true),
            shape: this.makeFeatureLocationSketchSvg(sketch, false),
            summary: this.getFeatureLocationSketchSummary(sketch)
        };
    }


    public hasFeatureFreeDrawingPreview = () =>
        this.getFeatureFreeDrawingPreview() !== undefined;


    public getFeatureFreeDrawingPreview(): FeatureFreeDrawingPreview|undefined {

        if (this.document?.resource?.category !== FEATURE_CATEGORY_NAME) return undefined;

        const preview = getPenMemoSketchPreview(
            this.document.resource[FEATURE_FREE_DRAWING_STROKES_FIELD]
        );
        if (!preview) {
            return {
                emptyLabel: '자유 스케치 필요',
                summary: '자유 스케치 없음',
                updatedAt: this.getFeatureFreeDrawingUpdatedAtLabel(),
                viewBox: '0 0 120 72'
            };
        }

        return {
            path: preview.path,
            summary: this.getFeatureFreeDrawingSummary(),
            updatedAt: this.getFeatureFreeDrawingUpdatedAtLabel(),
            viewBox: preview.viewBox
        };
    }


    public hasFeaturePitLinePreview = () =>
        this.getFeaturePitLinePreview() !== undefined;


    public getFeaturePitLinePreview(): FeaturePitLinePreview|undefined {

        if (!this.document?.resource || !['Feature', 'FeatureSegment'].includes(this.document.resource.category)) {
            return undefined;
        }

        const summaries = getKoreanFieldworkFeaturePitLineSummaries(this.document.resource);
        if (summaries.length === 0) return undefined;

        return {
            lines: summaries.map(summary => this.makeFeaturePitLineSvgLine(summary)),
            summary: `피트선 ${summaries.length}`,
            updatedAt: this.getDateFieldLabel(FEATURE_PIT_LINE_UPDATED_AT_FIELD),
            viewBox: FEATURE_SKETCH_VIEWBOX
        };
    }


    public hasFindSpotPreview = () =>
        this.getFindSpotPreview() !== undefined;


    public getFindSpotPreview(): FindSpotPreview|undefined {

        if (!this.document?.resource || !FIND_SPOT_CATEGORIES.has(this.document.resource.category)) {
            return undefined;
        }

        const summaries = getKoreanFieldworkFindSpotSummaries(this.document.resource.findSpotItems);
        if (summaries.length === 0) return undefined;

        const title = this.getFindSpotPreviewTitle();

        return {
            points: summaries.map(summary => this.makeFindSpotSvgPoint(summary)),
            summary: `${title} ${summaries.length}`,
            title,
            updatedAt: this.getDateFieldLabel(FIND_SPOT_UPDATED_AT_FIELD),
            viewBox: FEATURE_SKETCH_VIEWBOX
        };
    }


    public hasDailyJournalSummary = () =>
        this.getDailyJournalSummary() !== undefined;


    public getDailyJournalSummary(): KoreanFieldworkDailyJournalSummary|undefined {

        if (this.document?.resource?.category !== DAILY_LOG_CATEGORY_NAME) return undefined;

        return createDailyJournalSummary(this.document);
    }


    public hasDailyJournalBoundaryMemoPreview = () =>
        this.getDailyJournalBoundaryMemoPreview() !== undefined;


    public getDailyJournalBoundaryMemoPreview(): DailyJournalBoundaryMemoPreview|undefined {

        if (this.document?.resource?.category !== DAILY_LOG_CATEGORY_NAME) return undefined;

        const preview = getPenMemoSketchPreview(
            this.document.resource[DAILY_LOG_BOUNDARY_MEMO_STROKES_FIELD]
        );
        if (!preview) return undefined;

        return {
            importedAt: this.getDateFieldLabel(DAILY_LOG_BOUNDARY_MEMO_IMPORTED_AT_FIELD),
            path: preview.path,
            summary: preview.label.replace(/^스케치 메모/, '경계 메모'),
            updatedAt: this.getDateFieldLabel(DAILY_LOG_BOUNDARY_MEMO_UPDATED_AT_FIELD),
            viewBox: preview.viewBox
        };
    }


    public getContinuationActionLabel(action: KoreanFieldworkContinuationAction): string {

        const category = this.projectConfiguration.getCategory(action.categoryName);

        return category ? this.labels.get(category) : action.categoryName;
    }


    public getContinuationActionDetail(action: KoreanFieldworkContinuationAction): string {

        switch (action.relationName) {
            case 'liesWithin':
                return '포함 위치: 현재 기록';
            case 'depicts':
                return '사진·도면·메모 같은 근거로 연결';
            case 'isRecordedIn':
                return '현재 조사 구역에 붙이기';
            case 'isMapLayerOf':
                return '지도 레이어로 연결';
            default:
                return '현재 기록에 연결';
        }
    }


    public isFeatureContinuationAction = (action: KoreanFieldworkContinuationAction): boolean =>
        action.categoryName === FEATURE_CATEGORY_NAME;


    public getFeatureContinuationPresets = (): readonly KoreanFieldworkFeatureGuidancePreset[] =>
        KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS;


    public getFeatureContinuationPresetLabel(preset: KoreanFieldworkFeatureGuidancePreset): string {

        return preset.featureType === 'unknown'
            ? '유구로 만들기'
            : preset.label;
    }


    public getFeatureContinuationDetail(action: KoreanFieldworkContinuationAction): string {

        return `${this.getContinuationActionDetail(action)} · 성격을 고른 뒤 시작`;
    }


    public canShowIdentifierRevision = (): boolean =>
        canReviseKoreanFieldworkIdentifier(this.document)
        && [
            'fieldIdentifier',
            'reportIdentifier',
            'identifierRevisionHistory',
            'identifierRevisionNote'
        ].every(fieldName => !!this.getField(fieldName));


    public getIdentifierRevisionFieldIdentifier(): string {

        return this.document ? getKoreanFieldworkFieldIdentifier(this.document) : '';
    }


    public getIdentifierRevisionHistoryCount(): number {

        return this.document
            ? getKoreanFieldworkIdentifierRevisionHistory(this.document).length
            : 0;
    }


    public setIdentifierRevisionNextValue(value: string) {

        this.identifierRevisionNextValue = value;
    }


    public setIdentifierRevisionReason(value: string) {

        this.identifierRevisionReason = value;
    }


    public canApplyIdentifierRevision(): boolean {

        const nextIdentifier = this.normalizeIdentifierInput(this.identifierRevisionNextValue);
        const currentIdentifier = this.normalizeIdentifierInput(this.document?.resource?.identifier);

        return this.canShowIdentifierRevision()
            && nextIdentifier.length > 0
            && nextIdentifier !== currentIdentifier;
    }


    public applyIdentifierRevision() {

        if (!this.document?.resource || !this.canApplyIdentifierRevision()) return;

        const updates = getKoreanFieldworkIdentifierRevisionUpdates(this.document, {
            nextIdentifier: this.identifierRevisionNextValue,
            reason: this.identifierRevisionReason
        });
        if (Object.keys(updates).length === 0) return;

        Object.entries(updates).forEach(([fieldName, value]) => {
            this.document.resource[fieldName] = value;
        });
        this.initializeIdentifierRevisionDraft(true);
        this.onChanged.emit();
    }


    public getNotebookEntryDetail(entry: KoreanFieldworkNotebookEntry): string {

        return entry.nextWork || entry.detail || '야장 내용을 확인하세요.';
    }


    public getNotebookEntryTone(entry: KoreanFieldworkNotebookEntry): 'warning'|'info'|'neutral' {

        if (entry.needsEvidenceNumbers) return 'warning';
        return entry.nextWork ? 'info' : 'neutral';
    }


    public getNotebookEntryActionLabel(entry: KoreanFieldworkNotebookEntry): string {

        return `${entry.sourceLabel} 열기`;
    }


    public isNotebookEntryCopied = (entry: KoreanFieldworkNotebookEntry) =>
        this.notebookEntryCopiedId === entry.id;


    public getNotebookEntryCopyActionLabel = (entry: KoreanFieldworkNotebookEntry) =>
        this.isNotebookEntryCopied(entry) ? '복사됨' : '복사';


    public canApplyNotebookEntry = (entry: KoreanFieldworkNotebookEntry) => {

        const targetField = this.getNotebookAppendTargetField(entry);

        return !!targetField
            && !this.isAppendTextAlreadyApplied(targetField, this.getNotebookAppendText(entry));
    };


    public canApplyEvidenceInsight = (insight: EvidenceInsight) => {

        const targetField = this.getEvidenceInsightAppendTargetField(insight);

        return !!targetField && !this.isEvidenceInsightApplied(insight);
    };


    public isEvidenceInsightApplied(insight: EvidenceInsight): boolean {

        const targetField = this.getEvidenceInsightAppendTargetField(insight);

        return !!targetField
            && !!insight.appendText
            && this.isAppendTextAlreadyApplied(targetField, insight.appendText);
    }


    public canOpenEvidenceInsight = (insight: EvidenceInsight) =>
        !!insight.document;


    public getApplicableEvidenceInsights = (): EvidenceInsight[] =>
        this.evidenceInsights.filter(insight => this.canApplyEvidenceInsight(insight));


    public hasApplicableEvidenceInsights = () =>
        this.getApplicableEvidenceInsights().length > 0;


    public getNotebookEntryApplyTargetLabel(entry: KoreanFieldworkNotebookEntry): string {

        const fieldName = this.getNotebookAppendTargetField(entry);
        if (!fieldName) return '기록';

        const field = this.getField(fieldName);
        return field ? this.labels.get(field) : fieldName;
    }


    public getEvidenceInsightApplyTargetLabel(insight: EvidenceInsight): string {

        const fieldName = this.getEvidenceInsightAppendTargetField(insight);
        if (!fieldName) return '기록';

        const field = this.getField(fieldName);
        return field ? this.labels.get(field) : fieldName;
    }


    public getEvidenceInsightsApplyAllActionLabel(): string {

        const fieldName = this.getNarrativeAppendTargetField();
        const field = fieldName ? this.getField(fieldName) : undefined;
        const fieldLabel = field ? this.labels.get(field) : fieldName ?? '기록';

        return `${fieldLabel}에 자료 ${this.getApplicableEvidenceInsights().length}건 반영`;
    }


    public async openNotebookEntry(entry: KoreanFieldworkNotebookEntry) {

        await this.routing.jumpToResource(entry.sourceDocument);
    }


    public async copyNotebookEntry(entry: KoreanFieldworkNotebookEntry) {

        await writeKoreanFieldworkHwpClipboardText(makeKoreanFieldworkNotebookEntryCopyText(entry));
        this.markNotebookEntryCopied(entry.id);
    }


    public async openEvidenceInsight(insight: EvidenceInsight) {

        if (!insight.document) return;

        await this.routing.jumpToResource(insight.document);
    }


    public applyNotebookEntry(entry: KoreanFieldworkNotebookEntry) {

        if (!this.document?.resource) return;

        const targetField = this.getNotebookAppendTargetField(entry);
        if (!targetField) return;

        const currentValue = this.getStringResourceFieldValue(targetField);
        const nextValue = this.appendNotebookText(currentValue, this.getNotebookAppendText(entry));
        if (currentValue === nextValue) return;

        this.document.resource[targetField] = nextValue;
        this.onChanged.emit();
    }


    public applyEvidenceInsight(insight: EvidenceInsight) {

        if (!this.document?.resource || !insight.appendText) return;

        const targetField = this.getEvidenceInsightAppendTargetField(insight);
        if (!targetField) return;

        const currentValue = this.getStringResourceFieldValue(targetField);
        const nextValue = this.appendNotebookText(currentValue, insight.appendText);
        if (currentValue === nextValue) return;

        this.document.resource[targetField] = nextValue;
        this.onChanged.emit();
    }


    public applyAllEvidenceInsights() {

        if (!this.document?.resource) return;

        const targetField = this.getNarrativeAppendTargetField();
        if (!targetField) return;

        const currentValue = this.getStringResourceFieldValue(targetField);
        const nextValue = this.getApplicableEvidenceInsights()
            .map(insight => insight.appendText)
            .filter((appendText): appendText is string => !!appendText && appendText.trim().length > 0)
            .reduce((value, appendText) => this.appendNotebookText(value, appendText), currentValue);

        if (currentValue === nextValue) return;

        this.document.resource[targetField] = nextValue;
        this.onChanged.emit();
    }


    public async createContinuationRecord(action: KoreanFieldworkContinuationAction) {

        await this.createContinuationDraft(action.categoryName);
    }


    public async createFeatureContinuationRecord(
            action: KoreanFieldworkContinuationAction,
            preset: KoreanFieldworkFeatureGuidancePreset) {

        await this.createContinuationDraft(action.categoryName, preset.featureType);
    }


    public async runRecordAction(action: KoreanFieldworkRecordActionItem) {

        if (action.type === 'openDocument' && action.documentId) {
            await this.routing.jumpToResource(await this.datastore.get(action.documentId));
            return;
        }

        if (action.type === 'createDocument' && action.categoryName) {
            await this.createContinuationDraft(action.categoryName);
        }
    }


    public async copyReportHandoffItem() {

        const item = this.reportHandoffItem;
        if (!item?.copyText) return;

        await writeKoreanFieldworkHwpClipboardText(item.copyText);
        this.markReportHandoffCopied(item.documentId);
    }


    public async copyReportHandoffBody() {

        const bodySection = this.getReportHandoffBodySection();
        if (!bodySection?.copyText) return;

        await this.copyReportHandoffSection(bodySection);
    }


    public async copyReportHandoffSection(section: KoreanFieldworkReportHandoffCopySection) {

        const item = this.reportHandoffItem;
        if (!item || !section.copyText) return;

        await writeKoreanFieldworkHwpClipboardText(section.copyText);
        this.markReportHandoffCopied(this.getReportHandoffSectionCopyId(item, section));
    }


    public async copyTabletRecordBundle() {

        const bundle = this.tabletRecordBundle;
        if (!bundle?.copyText) return;

        await writeKoreanFieldworkHwpClipboardText(bundle.copyText);
        this.markTabletRecordBundleCopied(bundle.documentId);
    }


    public async copyTabletRecordBundleGroup(group: KoreanFieldworkTabletRecordBundleGroup) {

        const bundle = this.tabletRecordBundle;
        if (!bundle || !group.copyText) return;

        await writeKoreanFieldworkHwpClipboardText(group.copyText);
        this.markTabletRecordBundleCopied(this.getTabletRecordBundleGroupCopyId(bundle, group));
    }


    public async copyTabletRecordBundleSource(
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ) {

        const bundle = this.tabletRecordBundle;
        if (!bundle || !source.copyText) return;

        await writeKoreanFieldworkHwpClipboardText(source.copyText);
        this.markTabletRecordBundleCopied(this.getTabletRecordBundleSourceCopyId(bundle, group, source));
    }


    public async openTabletRecordBundleSource(source: KoreanFieldworkTabletRecordBundleSource) {

        if (!source.documentId) return;

        await this.routing.jumpToResource(await this.datastore.get(source.documentId));
    }


    public async copyEvidenceInsight(insight: EvidenceInsight) {

        const copyText = this.getEvidenceInsightCopyText(insight);
        if (!copyText) return;

        await writeKoreanFieldworkHwpClipboardText(copyText);
        this.markEvidenceInsightCopied(insight.id);
    }


    private async createContinuationDraft(categoryName: string, featureType?: string) {

        if (!this.document?.resource?.id) return;

        const draftDocument = {
            resource: createKoreanFieldworkDraftResource(
                this.document,
                categoryName,
                this.projectConfiguration,
                {
                    existingDocuments: this.projectDocuments,
                    featureType
                }
            )
        } as any;
        const modalRef = this.modalService.open(
            DoceditComponent,
            { size: 'lg', backdrop: 'static', keyboard: false, animation: false }
        );
        await modalRef.componentInstance.setDocument(draftDocument);

        try {
            const result = await modalRef.result;
            if (result?.documents) {
                this.mergeRecentlyChangedDocuments(result.documents);
                this.onChanged.emit();
                await this.refreshContext();
            }
        } catch (_) {
            // The continuation draft modal was canceled.
        }
    }


    private async refreshContext() {

        if (!this.document?.resource?.id || !this.hasKoreanFieldworkContext()) {
            this.parentPathLabel = undefined;
            this.metrics = [];
            this.evidenceMetrics = [];
            this.evidenceInsights = [];
            this.notebookEntries = [];
            this.continuationActions = [];
            this.recordActions = [];
            this.reportHandoffItem = undefined;
            this.tabletRecordBundle = undefined;
            this.expandedTabletRecordBundleGroupIds = [];
            this.projectDocuments = [];
            return;
        }

        const documents = await this.getProjectDocuments();
        this.projectDocuments = documents;
        const documentsById = new Map(documents.map(document => [document.resource.id, document]));

        this.parentPathLabel = this.formatParentPath(documentsById);
        this.metrics = [
            {
                id: 'children',
                label: '이어진 기록',
                count: this.countDocumentsTargetingCurrent(documents, CHILD_RELATIONS)
            },
            {
                id: 'linkedEvidence',
                label: '연결',
                count: this.countDocumentsTargetingCurrent(documents, LINKED_EVIDENCE_RELATIONS)
            }
        ];
        this.notebookEntries = getKoreanFieldworkNotebookEntriesForDocument(this.document, documents);
        this.continuationActions = getKoreanFieldworkContinuationActions(
            this.document,
            this.projectConfiguration
        );
        const evidenceBundle = buildEvidenceBundle(this.document, documents);
        this.evidenceMetrics = this.makeEvidenceMetrics(evidenceBundle, documents);
        this.evidenceInsights = this.makeEvidenceInsights(evidenceBundle);
        this.recordActions = makeKoreanFieldworkRecordActions(
            this.document,
            documents,
            this.projectConfiguration,
            4
        );
        const reportHandoff = makeKoreanFieldworkReportHandoff(documents);
        this.reportHandoffItem = reportHandoff.items.find(item => item.documentId === this.document.resource.id);
        this.tabletRecordBundle = makeKoreanFieldworkRecordTabletBundle(
            this.document,
            documents,
            this.reportHandoffItem
        );
        this.expandedTabletRecordBundleGroupIds = this.expandedTabletRecordBundleGroupIds
            .filter(groupId => this.tabletRecordBundle?.groups.some(group => group.id === groupId));
    }


    private async getProjectDocuments(): Promise<Document[]> {

        try {
            const result = await this.datastore.find({});
            const documents = result.documents ?? [];
            const currentDocumentId = this.document.resource.id;
            const documentsWithCurrentState = documents.map(document =>
                document.resource.id === currentDocumentId ? this.document : document
            );
            const documentsWithCreatedDrafts = this.createdDocuments.reduce((result, createdDocument) =>
                result.some(document => document.resource.id === createdDocument.resource.id)
                    ? result.map(document =>
                        document.resource.id === createdDocument.resource.id ? createdDocument : document
                    )
                    : result.concat(createdDocument),
            documentsWithCurrentState);

            return documentsWithCreatedDrafts.some(document => document.resource.id === currentDocumentId)
                ? documentsWithCreatedDrafts
                : documentsWithCreatedDrafts.concat(this.document);
        } catch (_) {
            return [this.document].concat(this.createdDocuments);
        }
    }


    private formatParentPath(documentsById: Map<string, Document>): string|undefined {

        const path: Document[] = [];
        const visitedIds = new Set<string>([this.document.resource.id]);
        let currentDocument = this.document;

        for (let depth = 0; depth < 8; depth++) {
            const parent = this.getPrimaryParent(currentDocument, documentsById);
            if (!parent || visitedIds.has(parent.resource.id)) break;

            path.unshift(parent);
            visitedIds.add(parent.resource.id);
            currentDocument = parent;
        }

        return path.length > 0
            ? path.map(document => document.resource.identifier || document.resource.id).join(' > ')
            : undefined;
    }


    private getPrimaryParent(document: Document, documentsById: Map<string, Document>): Document|undefined {

        const relations = document.resource.relations ?? {};

        for (const relationName of DIRECT_PARENT_RELATIONS) {
            const parent = this.getFirstExistingDocument(relations[relationName], documentsById, document.resource.id);
            if (parent) return parent;
        }

        return undefined;
    }


    private getFirstExistingDocument(relationTargets: unknown,
                                     documentsById: Map<string, Document>,
                                     currentDocumentId: string): Document|undefined {

        if (!Array.isArray(relationTargets)) return undefined;

        const parentId = relationTargets.find(targetId =>
            typeof targetId === 'string'
            && targetId !== currentDocumentId
            && documentsById.has(targetId)
        );

        return parentId ? documentsById.get(parentId) : undefined;
    }


    private countDocumentsTargetingCurrent(documents: Document[], relationNames: string[]): number {

        const currentDocumentId = this.document.resource.id;

        return documents.filter(candidate =>
            candidate.resource.id !== currentDocumentId
            && relationNames.some(relationName => {
                const targets = candidate.resource.relations?.[relationName];
                return Array.isArray(targets) && targets.includes(currentDocumentId);
            })
        ).length;
    }


    private makeEvidenceMetrics(bundle: EvidenceBundle,
                                documents: Document[]): EvidenceMetric[] {

        const evidenceMetrics = getKoreanFieldworkEvidenceChips(this.document, documents)
            .flatMap(chip => {
                const canCreate = this.canCreateEvidenceCategory(chip.createCategoryName);
                if (chip.count === 0 && !canCreate) return [];

                return [{
                    id: chip.id,
                    label: chip.label,
                    count: chip.count,
                    canCreate
                }];
            });
        const penMemoSketchCount = getPenMemoSketchSummaries(bundle.penMemos).length;
        const penMemoMetrics: EvidenceMetric[] = [
            {
                id: 'penMemos',
                label: '야장 메모',
                count: bundle.penMemos.length,
                canCreate: false
            },
            {
                id: 'penMemoSketches',
                label: '스케치 메모',
                count: penMemoSketchCount,
                canCreate: false
            }
        ].filter(metric => metric.count > 0);
        const photoAnnotationCount = getPhotoAnnotationSummaries(
            getKoreanFieldworkReviewPhotoDocuments(this.document, bundle),
            getKoreanFieldworkReviewSoilProfilePhotoDocuments(this.document, bundle)
        ).length;
        const photoAnnotationMetrics: EvidenceMetric[] = photoAnnotationCount > 0
            ? [{
                id: 'photoAnnotations',
                label: '사진 표시',
                count: photoAnnotationCount,
                canCreate: false
            }]
            : [];

        const featurePitLineCount = getKoreanFieldworkFeaturePitLineSummaries(this.document.resource).length;
        const featurePitLineMetrics: EvidenceMetric[] = featurePitLineCount > 0
            ? [{
                id: 'featureSoilPitLines',
                label: '\ud53c\ud2b8\uc120',
                count: featurePitLineCount,
                canCreate: false
            }]
            : [];
        const findSpotCount = getKoreanFieldworkFindSpotSummaries(this.document.resource.findSpotItems).length;
        const findSpotMetrics: EvidenceMetric[] = findSpotCount > 0
            ? [{
                id: 'findSpotItems',
                label: this.document.resource.category === 'Sample'
                    ? '\ucc44\ucde8 \uc704\uce58\uc810'
                    : '\ucd9c\ud1a0 \uc704\uce58\uc810',
                count: findSpotCount,
                canCreate: false
            }]
            : [];

        return evidenceMetrics.concat(featurePitLineMetrics, findSpotMetrics, photoAnnotationMetrics, penMemoMetrics);
    }


    private makeEvidenceInsights(bundle: EvidenceBundle): EvidenceInsight[] {

        const reviewPhotos = getKoreanFieldworkReviewPhotoDocuments(this.document, bundle);
        const reviewSoilProfilePhotos = getKoreanFieldworkReviewSoilProfilePhotoDocuments(this.document, bundle);
        const reviewDrawings = getKoreanFieldworkReviewDrawingDocuments(this.document, bundle);
        const canAppendEvidenceInsight = !!this.getNarrativeAppendTargetField();
        const soilColorCandidateSummaries = getSoilColorCandidateSummaries(reviewSoilProfilePhotos);
        const soilColorCandidateDocumentIds = new Set(
            soilColorCandidateSummaries.map(summary => summary.document.resource.id)
        );
        const soilColorInsights = soilColorCandidateSummaries
            .map(summary => {
                const sketchPreview = this.getSoilColorSampleSketchPreview(summary.document);
                const insight: EvidenceInsight = {
                    detail: `${this.getDocumentLabel(summary.document)} · ${summary.label}`,
                    document: summary.document,
                    id: `soilColor:${summary.document.resource.id}`,
                    ...(sketchPreview ? { sketchPreview } : {}),
                    label: '토색 후보',
                    tone: summary.document.resource.soilColorAssistStatus === 'lowConfidence'
                        ? 'warning' as const
                        : 'info' as const
                };
                const appendText = this.getSoilColorInsightAppendText(summary);

                return canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight;
            });
        const soilColorSwatchInsights = getSoilColorSwatchSummaries(reviewSoilProfilePhotos)
            .filter(summary => !soilColorCandidateDocumentIds.has(summary.document.resource.id))
            .map(summary => {
                const sketchPreview = this.getSoilColorSampleSketchPreview(summary.document);
                const insight: EvidenceInsight = {
                    detail: `${this.getDocumentLabel(summary.document)} · ${summary.label}`,
                    document: summary.document,
                    id: `soilColorSwatches:${summary.document.resource.id}`,
                    ...(sketchPreview ? { sketchPreview } : {}),
                    label: '층별 토색',
                    tone: 'info' as const
                };
                const appendText = this.getSoilColorSwatchInsightAppendText(summary);

                return canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight;
            });
        const soilProfileLayerMarkerInsights = reviewSoilProfilePhotos
            .flatMap(document => {
                const sketchPreview = this.getSoilProfileLayerMarkerSketchPreview(document);
                if (!sketchPreview) return [];

                return [{
                    detail: `${this.getDocumentLabel(document)} · ${sketchPreview.label}`,
                    document,
                    id: `soilLayerMarkers:${document.resource.id}`,
                    label: '층 번호 표시',
                    sketchPreview,
                    tone: 'info' as const
                }];
            });
        const findSampleSpotInsights = bundle.finds.concat(bundle.samples)
            .flatMap(document => {
                const summaries = getKoreanFieldworkFindSpotSummaries(document.resource.findSpotItems);
                if (summaries.length === 0) return [];

                const isSample = document.resource.category === 'Sample';
                const locationLabel = isSample ? '채취 위치점' : '출토 위치점';
                const visibleLocations = summaries.slice(0, 3).map(summary => summary.text);
                const hiddenCount = summaries.length - visibleLocations.length;
                const locationSummary = hiddenCount > 0
                    ? `${visibleLocations.join(', ')} 외 ${hiddenCount}건`
                    : visibleLocations.join(', ');
                const insight: EvidenceInsight = {
                    detail: `${this.getDocumentLabel(document)} · ${locationLabel} ${summaries.length}: ${locationSummary}`,
                    document,
                    id: `findSpot:${document.resource.id}`,
                    label: isSample ? '시료 위치' : '유물 위치',
                    tone: 'info' as const
                };
                const appendText = this.getFindSpotInsightAppendText(document, summaries);

                return [canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight];
            });
        const penMemoSketchInsights = getPenMemoSketchSummaries(bundle.penMemos)
            .map(summary => {
                const sketchPreview = getPenMemoSketchPreview(summary.document.resource.penMemoStrokes);
                const insight: EvidenceInsight = {
                    detail: summary.pendingTranscription
                        ? `${this.getDocumentLabel(summary.document)} · ${getPenMemoTranscriptionSummaryLabel(summary.document)}`
                        : `${this.getDocumentLabel(summary.document)} · ${getPenMemoSketchSummaryLabel(summary.document.resource.penMemoStrokes)}`,
                    document: summary.document,
                    id: `penMemoSketch:${summary.document.resource.id}`,
                    label: summary.pendingTranscription ? '태블릿 야장 전사' : '야장 스케치',
                    ...(sketchPreview ? { sketchPreview } : {}),
                    tone: summary.pendingTranscription ? 'warning' as const : 'info' as const
                };
                const appendText = this.getPenMemoSketchInsightAppendText(summary, sketchPreview);

                return canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight;
            });
        const drawingSketchInsights = reviewDrawings
            .flatMap(document => {
                const sketchPreview = this.getDrawingSketchPreview(document);
                if (!sketchPreview) return [];

                const insight: EvidenceInsight = {
                    detail: `${this.getDocumentLabel(document)} · ${sketchPreview.label}`,
                    document,
                    id: `drawingSketch:${document.resource.id}`,
                    label: '도면 스케치',
                    sketchPreview,
                    tone: 'info' as const
                };
                const appendText = this.getDrawingSketchInsightAppendText(document, sketchPreview);

                return [canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight];
            });
        const drawingSurveyInsights = reviewDrawings
            .flatMap(document => {
                const summary = getKoreanFieldworkDrawingSurveySummary(document.resource);
                if (!summary) return [];

                const insight: EvidenceInsight = {
                    detail: `${this.getDocumentLabel(document)} · ${summary}`,
                    document,
                    id: `drawingSurvey:${document.resource.id}`,
                    label: '도면 실측',
                    tone: 'info' as const
                };
                const appendText = this.getDrawingSurveyInsightAppendText(document, summary);

                return [canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight];
            });
        const photoAnnotationInsights = getPhotoAnnotationSummaries(reviewPhotos, reviewSoilProfilePhotos)
            .map(summary => {
                const insight: EvidenceInsight = {
                    detail: `${this.getDocumentLabel(summary.document)} · ${summary.label}`,
                    document: summary.document,
                    id: `photoAnnotation:${summary.document.resource.id}`,
                    label: summary.source === 'soilProfilePhoto' ? '토층사진 표시' : '사진 표시',
                    sketchPreview: summary.preview,
                    tone: 'info' as const
                };
                const appendText = this.getPhotoAnnotationInsightAppendText(summary);

                return canAppendEvidenceInsight && appendText
                    ? { ...insight, appendText }
                    : insight;
            });

        return [
            ...soilColorInsights,
            ...soilColorSwatchInsights,
            ...soilProfileLayerMarkerInsights,
            ...findSampleSpotInsights,
            ...drawingSketchInsights,
            ...drawingSurveyInsights,
            ...photoAnnotationInsights,
            ...penMemoSketchInsights
        ]
            .map(insight => this.withHiddenEvidenceInsightDocument(insight))
            .filter(insight => insight.detail.trim().length > 0);
    }


    private withHiddenEvidenceInsightDocument(insight: EvidenceInsight): EvidenceInsight {

        const sourceDocument = insight.document;
        if (!sourceDocument) return insight;

        delete insight.document;
        Object.defineProperty(insight, 'document', {
            configurable: true,
            enumerable: false,
            value: sourceDocument
        });

        return insight;
    }


    private getDocumentLabel(document: Document): string {

        return document.resource.identifier || document.resource.id;
    }


    private getSoilColorSampleSketchPreview(document: Document): KoreanFieldworkPenMemoSketchPreview|undefined {

        const rows = parseSoilProfileColorSwatchRows(document.resource.soilProfileColorSwatches)
            .filter(row => !!row.sample?.point);
        if (rows.length === 0) return undefined;

        return {
            label: this.getSoilColorSampleSketchPreviewLabel(rows),
            path: rows.map(row => this.getSoilColorSampleMarkerPath(row)).join(' '),
            viewBox: SOIL_COLOR_SAMPLE_VIEWBOX
        };
    }


    private getSoilColorSampleSketchPreviewLabel(rows: SoilProfileColorSwatchRow[]): string {

        if (rows.length === 1) {
            const row = rows[0];

            return `스포이드 위치 ${row.number}층 ${row.sample?.pointLabel ?? ''}`.trim();
        }

        return `스포이드 위치 ${rows.length}점`;
    }


    private getSoilColorSampleMarkerPath(row: SoilProfileColorSwatchRow): string {

        const point = row.sample?.point;
        if (!point) return '';

        const x = this.roundSvg((point.xPercent / 100) * SOIL_COLOR_SAMPLE_WIDTH);
        const y = this.roundSvg((point.yPercent / 100) * SOIL_COLOR_SAMPLE_HEIGHT);

        return this.getMarkerCrossPath(x, y);
    }


    private getSoilProfileLayerMarkerSketchPreview(document: Document): KoreanFieldworkPenMemoSketchPreview|undefined {

        const markers = this.getSoilProfileLayerMarkers(document.resource.soilProfileLayerMarkers);
        if (markers.length === 0) return undefined;

        const previewMarkers = markers.map(marker => {
            const x = this.roundSvg((marker.xPercent / 100) * SOIL_COLOR_SAMPLE_WIDTH);
            const y = this.roundSvg((marker.yPercent / 100) * SOIL_COLOR_SAMPLE_HEIGHT);

            return {
                label: marker.label,
                x,
                y
            };
        });

        return {
            label: this.getSoilProfileLayerMarkerSketchPreviewLabel(markers),
            path: previewMarkers.map(marker => this.getMarkerCrossPath(marker.x, marker.y)).join(' '),
            texts: previewMarkers.map(marker => ({
                text: marker.label,
                x: marker.x,
                y: this.roundSvg(this.clamp(marker.y - 7, 9, SOIL_COLOR_SAMPLE_HEIGHT - 4))
            })),
            viewBox: SOIL_COLOR_SAMPLE_VIEWBOX
        };
    }


    private getSoilProfileLayerMarkerSketchPreviewLabel(markers: SoilProfileLayerMarker[]): string {

        if (markers.length === 1) {
            const marker = markers[0];

            return `층 번호 위치 ${marker.label}층 ${marker.xPercent}%/${marker.yPercent}%`;
        }

        return `층 번호 위치 ${markers.length}점`;
    }


    private getDrawingSketchPreview(document: Document): KoreanFieldworkPenMemoSketchPreview|undefined {

        const preview = getPenMemoSketchPreview(document.resource.drawingSketchStrokes);
        const label = this.getDrawingSketchSummaryLabel(document);

        return preview && label
            ? { ...preview, label }
            : undefined;
    }


    private getDrawingSketchSummaryLabel(document: Document): string {

        return getPenMemoSketchSummaryLabel(document.resource.drawingSketchStrokes)
            .replace('스케치 메모', '태블릿 스케치')
            .replace(/[.。\s]+$/, '');
    }


    private getMarkerCrossPath(x: number, y: number): string {

        const radius = SOIL_COLOR_SAMPLE_MARKER_RADIUS;

        return [
            `M ${this.roundSvg(x - radius)} ${y} H ${this.roundSvg(x + radius)}`,
            `M ${x} ${this.roundSvg(y - radius)} V ${this.roundSvg(y + radius)}`
        ].join(' ');
    }


    private getSoilProfileLayerMarkers(value: unknown): SoilProfileLayerMarker[] {

        const markers = this.parseSoilProfileLayerMarkers(value);

        return markers
            .map((marker, index) => this.getSoilProfileLayerMarker(marker, index))
            .filter((marker): marker is SoilProfileLayerMarker => !!marker);
    }


    private parseSoilProfileLayerMarkers(value: unknown): unknown[] {

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


    private getSoilProfileLayerMarker(value: unknown, index: number): SoilProfileLayerMarker|undefined {

        if (!this.isPlainRecord(value)) return undefined;

        const xPercent = this.getPercentValue(value.x);
        const yPercent = this.getPercentValue(value.y);
        if (xPercent === undefined || yPercent === undefined) return undefined;

        return {
            label: this.getLayerMarkerLabel(value, index),
            xPercent,
            yPercent
        };
    }


    private getLayerMarkerLabel(value: Record<string, unknown>, index: number): string {

        const rawLabel = value.label ?? value.number ?? value.layer ?? value.layerNumber;
        const label = rawLabel === undefined || rawLabel === null ? '' : String(rawLabel).trim();

        return label || String(index + 1);
    }


    private getPercentValue(value: unknown): number|undefined {

        const numberValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numberValue)) return undefined;

        return this.clamp(numberValue, 0, 100);
    }


    private isPlainRecord(value: unknown): value is Record<string, unknown> {

        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }


    private markReportHandoffCopied(copiedId: string) {

        this.reportHandoffCopiedId = copiedId;
        setTimeout(() => {
            if (this.reportHandoffCopiedId === copiedId) {
                this.reportHandoffCopiedId = undefined;
            }
        }, 1600);
    }


    private markTabletRecordBundleCopied(copiedId: string) {

        this.tabletRecordBundleCopiedId = copiedId;
        setTimeout(() => {
            if (this.tabletRecordBundleCopiedId === copiedId) {
                this.tabletRecordBundleCopiedId = undefined;
            }
        }, 1600);
    }


    private markEvidenceInsightCopied(copiedId: string) {

        this.evidenceInsightCopiedId = copiedId;
        setTimeout(() => {
            if (this.evidenceInsightCopiedId === copiedId) {
                this.evidenceInsightCopiedId = undefined;
            }
        }, 1600);
    }


    private markNotebookEntryCopied(copiedId: string) {

        this.notebookEntryCopiedId = copiedId;
        setTimeout(() => {
            if (this.notebookEntryCopiedId === copiedId) {
                this.notebookEntryCopiedId = undefined;
            }
        }, 1600);
    }


    private getTabletRecordBundleGroupCopyId(
            bundle: KoreanFieldworkTabletRecordBundle,
            group: KoreanFieldworkTabletRecordBundleGroup
    ): string {

        return `${bundle.documentId}::tabletBundle::${group.id}`;
    }


    private getTabletRecordBundleSourceCopyId(
            bundle: KoreanFieldworkTabletRecordBundle,
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ): string {

        return `${this.getTabletRecordBundleGroupCopyId(bundle, group)}::${source.id}`;
    }


    private getReportHandoffSectionCopyId(
            item: KoreanFieldworkReportHandoffItem,
            section: KoreanFieldworkReportHandoffCopySection
    ): string {

        return `${item.documentId}::${section.id}`;
    }


    private getReportHandoffBodySection(): KoreanFieldworkReportHandoffCopySection|undefined {

        return this.reportHandoffItem?.copySections.find(section => section.id === 'body');
    }


    private canCreateEvidenceCategory(categoryName: string|undefined): boolean {

        return !!categoryName
            && this.continuationActions.some(action => action.categoryName === categoryName);
    }


    private hasKoreanFieldworkContext(): boolean {

        return KOREAN_FIELDWORK_CONTEXT_CATEGORIES.has(this.document?.resource?.category)
            && (
                this.fieldDefinitions?.some(field => KOREAN_FIELDWORK_CONTEXT_FIELDS.includes(field.name))
                ?? false
            );
    }


    private getNotebookAppendTargetField(_: KoreanFieldworkNotebookEntry): string|undefined {

        return this.getNarrativeAppendTargetField();
    }


    private getEvidenceInsightAppendTargetField(insight: EvidenceInsight): string|undefined {

        return insight.appendText ? this.getNarrativeAppendTargetField() : undefined;
    }


    private getEvidenceInsightCopyText(insight: EvidenceInsight): string|undefined {

        if (insight.appendText?.trim()) return insight.appendText;

        const lines = [
            insight.label,
            insight.detail
        ].filter(line => line.trim().length > 0);

        return lines.length > 0 ? lines.join('\n') : undefined;
    }


    private getNarrativeAppendTargetField(): string|undefined {

        return NOTEBOOK_APPEND_TARGET_FIELDS.find(fieldName => this.isEditableTextField(fieldName));
    }


    private isEditableTextField(fieldName: string): boolean {

        const field = this.getField(fieldName);

        return !!field
            && field.editable === true
            && ['input', 'textarea', 'text'].includes(field.inputType)
            && Condition.isFulfilled(field.condition, this.document.resource, this.fieldDefinitions, 'field');
    }


    private getNotebookAppendText(entry: KoreanFieldworkNotebookEntry): string {

        const lines = [
            `[${entry.sourceLabel} ${entry.dateLabel}]`,
            this.getNotebookAppendLine('관찰', entry.input.observation || entry.detail),
            this.getNotebookAppendLine(
                '손그림',
                entry.input.observation ? entry.handwritingSummaryLabel : undefined
            ),
            this.getNotebookAppendLine('해석', entry.input.interpretation),
            this.getNotebookAppendLine('다음 작업', entry.nextWork),
            this.getNotebookAppendLine(
                '사진·도면·스케치·유물·시료 번호',
                entry.evidenceNumbers || (entry.needsEvidenceNumbers ? '번호 확인 필요' : '')
            )
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.join('\n');
    }


    private getSoilColorInsightAppendText(
            summary: { candidates: string[]; document: Document; sampleSourceLabel?: string }
    ): string {

        const documentLabel = this.getDocumentLabel(summary.document);
        const candidates = summary.candidates.slice(0, 3).join(', ');
        const swatches = this.getNonEmptyDocumentStringField(summary.document, 'soilProfileColorSwatches');
        const colorNote = this.getNonEmptyDocumentStringField(summary.document, 'soilProfileColorNote');
        const captureNote = this.getNonEmptyDocumentStringField(summary.document, 'soilProfileCaptureNote');
        const lines = [
            `[토층사진 ${documentLabel}]`,
            this.getNotebookAppendLine('토색 후보', candidates),
            this.getNotebookAppendLine('샘플 위치', summary.sampleSourceLabel),
            this.getNotebookAppendLine('토색 번호', swatches),
            this.getNotebookAppendLine('토색 메모', colorNote),
            this.getNotebookAppendLine('촬영 조건', captureNote)
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getSoilColorSwatchInsightAppendText(
            summary: { document: Document; entries: string[] }
    ): string {

        const documentLabel = this.getDocumentLabel(summary.document);
        const colorNote = this.getNonEmptyDocumentStringField(summary.document, 'soilProfileColorNote');
        const captureNote = this.getNonEmptyDocumentStringField(summary.document, 'soilProfileCaptureNote');
        const lines = [
            `[토층사진 ${documentLabel}]`,
            this.getNotebookAppendLine('층별 토색', summary.entries.join('\n')),
            this.getNotebookAppendLine('토색 메모', colorNote),
            this.getNotebookAppendLine('촬영 조건', captureNote)
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getPhotoAnnotationInsightAppendText(
            summary: {
                document: Document;
                label: string;
                preview?: { label: string };
                source: 'photo'|'soilProfilePhoto';
                updatedAt?: string;
            }
    ): string {

        const sourceLabel = summary.source === 'soilProfilePhoto' ? '토층사진' : '사진';
        const documentLabel = this.getDocumentLabel(summary.document);
        const annotationLabel = summary.preview?.label ?? summary.label;
        const photoDescription = this.getNonEmptyDocumentStringField(summary.document, 'description')
            ?? this.getNonEmptyDocumentStringField(summary.document, 'shortDescription');
        const lines = [
            `[${sourceLabel} ${documentLabel} 표시]`,
            this.getNotebookAppendLine('표시 요약', annotationLabel),
            this.getNotebookAppendLine('표시 설명', photoDescription ?? '사진 원본에서 표시 위치 확인 필요'),
            this.getNotebookAppendLine('수정 시각', summary.updatedAt)
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getFindSpotInsightAppendText(document: Document,
                                         summaries: KoreanFieldworkFindSpotSummary[]): string {

        const isSample = document.resource.category === 'Sample';
        const documentLabel = this.getDocumentLabel(document);
        const locationLabel = isSample ? '채취 위치점' : '출토 위치점';
        const recordSummary = this.getNonEmptyDocumentStringField(document, 'shortDescription')
            ?? this.getNonEmptyDocumentStringField(document, 'description');
        const lines = [
            `[${isSample ? '시료' : '유물'} ${documentLabel} ${isSample ? '채취 위치' : '출토 위치'}]`,
            this.getNotebookAppendLine(
                locationLabel,
                summaries.map(summary => summary.text).join(', ')
            ),
            isSample
                ? this.getNotebookAppendLine(
                    '시료 종류',
                    this.getAppendableRecordFieldValue(document, 'sampleType')
                )
                : this.getNotebookAppendLine(
                    '출토 위치',
                    this.getAppendableRecordFieldValue(document, 'findSpotDescription')
                ),
            isSample
                ? this.getNotebookAppendLine(
                    '시료 목적',
                    this.getAppendableRecordFieldValue(document, 'samplePurpose')
                )
                : undefined,
            this.getNotebookAppendLine('요약', recordSummary)
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getPenMemoSketchInsightAppendText(
            summary: KoreanFieldworkPenMemoSketchSummary,
            sketchPreview: KoreanFieldworkPenMemoSketchPreview|undefined
    ): string {

        const document = summary.document;
        const documentLabel = this.getDocumentLabel(document);
        const reviewedTranscript = this.getNonEmptyDocumentStringField(document, 'penMemoReviewedTranscript');
        const autoTranscript = this.getNonEmptyDocumentStringField(document, 'penMemoAutoTranscript');
        const memoDescription = this.getNonEmptyDocumentStringField(document, 'description')
            ?? this.getNonEmptyDocumentStringField(document, 'shortDescription');
        const transcriptLabel = reviewedTranscript
            ? '검토 필사'
            : autoTranscript
                ? '자동 필사'
                : '메모';
        const transcriptText = reviewedTranscript ?? autoTranscript ?? memoDescription;
        const lines = [
            `[메모 ${documentLabel} 손글씨]`,
            this.getNotebookAppendLine(
                '손글씨 원본',
                sketchPreview?.label ?? getPenMemoSketchSummaryLabel(document.resource.penMemoStrokes)
            ),
            this.getNotebookAppendLine(transcriptLabel, transcriptText),
            summary.pendingTranscription
                ? this.getNotebookAppendLine('전사 상태', '검토 전사 필요')
                : undefined
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getDrawingSketchInsightAppendText(document: Document,
                                             sketchPreview: KoreanFieldworkPenMemoSketchPreview): string {

        const documentLabel = this.getDocumentLabel(document);
        const drawingDescription = this.getNonEmptyDocumentStringField(document, 'description')
            ?? this.getNonEmptyDocumentStringField(document, 'shortDescription');
        const drawingSource = this.getNonEmptyDocumentStringField(document, 'fileUri')
            ?? this.getNonEmptyDocumentStringField(document, 'imageUri')
            ?? this.getNonEmptyDocumentStringField(document, 'fieldworkPhotoUri');
        const lines = [
            `[도면 ${documentLabel}]`,
            this.getNotebookAppendLine('스케치 요약', sketchPreview.label),
            this.getNotebookAppendLine('도면 설명', drawingDescription),
            this.getNotebookAppendLine('원본', drawingSource)
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getDrawingSurveyInsightAppendText(document: Document, summary: string): string {

        const documentLabel = this.getDocumentLabel(document);
        const drawingDescription = this.getNonEmptyDocumentStringField(document, 'description')
            ?? this.getNonEmptyDocumentStringField(document, 'shortDescription');
        const drawingSource = this.getNonEmptyDocumentStringField(document, 'fileUri')
            ?? this.getNonEmptyDocumentStringField(document, 'imageUri')
            ?? this.getNonEmptyDocumentStringField(document, 'fieldworkPhotoUri');
        const lines = [
            `[도면 ${documentLabel} 실측]`,
            this.getNotebookAppendLine('도면 실측', summary),
            this.getNotebookAppendLine('도면 설명', drawingDescription),
            this.getNotebookAppendLine('원본', drawingSource)
        ].filter((line): line is string => !!line && line.length > 0);

        return lines.length > 1 ? lines.join('\n') : '';
    }


    private getAppendableRecordFieldValue(document: Document, fieldName: string): string|undefined {

        const summary = getKoreanFieldworkRecordFieldValueSummary(fieldName, document.resource[fieldName]);
        if (summary) return summary;

        const value = document.resource[fieldName];

        if (Array.isArray(value)) {
            const values = value
                .filter((entry): entry is string => typeof entry === 'string')
                .map(entry => entry.trim())
                .filter(entry => entry.length > 0);

            return values.length > 0 ? values.join(', ') : undefined;
        }

        return this.getNonEmptyDocumentStringField(document, fieldName);
    }


    private getNotebookAppendLine(label: string, value: string|undefined): string|undefined {

        const text = typeof value === 'string' ? value.trim() : '';
        return text ? `${label}: ${text}` : undefined;
    }


    private appendNotebookText(currentValue: string, notebookText: string): string {

        const trimmedCurrentValue = currentValue.trimEnd();

        if (trimmedCurrentValue.includes(notebookText)) return trimmedCurrentValue;
        if (!trimmedCurrentValue) return notebookText;

        return `${trimmedCurrentValue}\n${notebookText}`;
    }


    private isAppendTextAlreadyApplied(fieldName: string, appendText: string): boolean {

        return this.getStringResourceFieldValue(fieldName).trimEnd().includes(appendText);
    }


    private mergeRecentlyChangedDocuments(documents: Document[]) {

        documents.forEach(document => {
            const existingIndex = this.createdDocuments.findIndex(createdDocument =>
                createdDocument.resource.id === document.resource.id
            );
            if (existingIndex >= 0) {
                this.createdDocuments[existingIndex] = document;
            } else {
                this.createdDocuments.push(document);
            }
        });
    }


    private getStringResourceFieldValue(fieldName: string): string {

        const value = this.document?.resource?.[fieldName];

        return typeof value === 'string' ? value : '';
    }


    private parseFeatureLocationSketch(value: unknown): FeatureLocationSketch|undefined {

        const rawValue = typeof value === 'string' ? this.parseJsonObject(value) : value;
        if (!this.isRecord(rawValue)) return undefined;

        const shapeValue = rawValue.shape;
        const shape = typeof shapeValue === 'string' && FEATURE_SKETCH_SHAPES.has(shapeValue as FeatureSketchShape)
            ? shapeValue as FeatureSketchShape
            : undefined;
        if (!shape) return undefined;

        const points = Array.isArray(rawValue.points)
            ? rawValue.points.map(point => this.normalizeSketchPoint(point))
                .filter((point): point is FeatureSketchPoint => point !== undefined)
            : [];
        const center = this.normalizeSketchPoint(rawValue.center)
            ?? points[0]
            ?? { x: 50, y: 50 };

        return {
            center,
            points: shape === 'polygon' ? points : (points.length > 0 ? points : [center]),
            rotation: this.normalizeNumber(rawValue.rotation, 0),
            scale: this.clamp(this.normalizeNumber(rawValue.scale, 100), 40, 220),
            shape
        };
    }


    private getFeatureLocationSketch(): FeatureLocationSketch|undefined {

        return this.parseFeatureLocationSketch((this.document.resource as any).featureLocationSketch)
            ?? this.makeFeatureLocationSketchFromGeometry((this.document.resource as any).geometry);
    }


    private makeFeatureLocationSketchFromGeometry(geometry: unknown): FeatureLocationSketch|undefined {

        const coordinatePairs = this.getFeatureGeometryCoordinatePairs(geometry);
        if (coordinatePairs.length === 0) return undefined;

        if (coordinatePairs.length === 1) {
            const center = { x: 50, y: 50 };
            return {
                center,
                points: [center],
                rotation: 0,
                scale: 100,
                shape: 'point'
            };
        }

        const points = this.normalizeBoundaryCoordinatePairs(coordinatePairs, 2);
        if (points.length < 2) return undefined;

        return {
            center: this.getFeatureSketchPointsCenter(points),
            points,
            rotation: 0,
            scale: 100,
            shape: 'polygon'
        };
    }


    private makeFeatureLocationSketchSvg(sketch: FeatureLocationSketch,
                                         locationPreview: boolean): FeatureSketchSvgPreview {

        const points = this.getVisibleFeatureSketchPoints(sketch);
        const projectedPoints = locationPreview
            ? points.map(point => this.projectFeatureSketchPoint(point))
            : this.fitFeatureSketchPoints(points);
        const preview: FeatureSketchSvgPreview = {
            boundaryPath: locationPreview ? this.getFeatureLocationBoundaryPath() : undefined,
            points: [],
            viewBox: FEATURE_SKETCH_VIEWBOX
        };

        if (sketch.shape === 'rectangle' || sketch.shape === 'oval') {
            const center = locationPreview
                ? this.projectFeatureSketchPoint(sketch.center)
                : { x: FEATURE_SKETCH_WIDTH / 2, y: FEATURE_SKETCH_HEIGHT / 2 };
            const scale = sketch.scale / 100;
            const width = this.clamp((locationPreview ? 30 : 58) * scale, locationPreview ? 18 : 32, locationPreview ? 52 : 92);
            const height = this.clamp((locationPreview ? 22 : 38) * scale, locationPreview ? 14 : 24, locationPreview ? 42 : 62);
            const transform = sketch.rotation
                ? `rotate(${sketch.rotation} ${this.roundSvg(center.x)} ${this.roundSvg(center.y)})`
                : undefined;

            if (sketch.shape === 'oval') {
                preview.ellipse = {
                    cx: this.roundSvg(center.x),
                    cy: this.roundSvg(center.y),
                    rx: this.roundSvg(width / 2),
                    ry: this.roundSvg(height / 2),
                    transform
                };
            } else {
                preview.rect = {
                    height: this.roundSvg(height),
                    rx: 3,
                    transform,
                    width: this.roundSvg(width),
                    x: this.roundSvg(center.x - width / 2),
                    y: this.roundSvg(center.y - height / 2)
                };
            }

            preview.points = [{ x: this.roundSvg(center.x), y: this.roundSvg(center.y) }];
            return preview;
        }

        if (sketch.shape === 'polygon' && projectedPoints.length > 1) {
            const pathPrefix = projectedPoints.map((point, index) =>
                `${index === 0 ? 'M' : 'L'} ${this.roundSvg(point.x)} ${this.roundSvg(point.y)}`
            ).join(' ');
            preview.path = projectedPoints.length > 2 ? `${pathPrefix} Z` : pathPrefix;
        }

        preview.points = projectedPoints.map((point, index) => ({
            label: sketch.shape === 'polygon' ? `${index + 1}` : undefined,
            x: this.roundSvg(point.x),
            y: this.roundSvg(point.y)
        }));
        return preview;
    }


    private makeEmptyFeatureLocationSketchSvg(emptyLabel: string,
                                              locationPreview: boolean): FeatureSketchSvgPreview {

        return {
            boundaryPath: locationPreview ? this.getFeatureLocationBoundaryPath() : undefined,
            emptyLabel,
            points: [],
            viewBox: FEATURE_SKETCH_VIEWBOX
        };
    }


    private getFeatureLocationBoundaryPath(): string {

        const surveyBoundaryPoints = this.getSurveyBoundarySketchPoints();
        if (surveyBoundaryPoints.length >= 3) {
            const projectedPoints = surveyBoundaryPoints.map(point => this.projectFeatureSketchPoint(point));
            const path = projectedPoints.map((point, index) =>
                `${index === 0 ? 'M' : 'L'} ${this.roundSvg(point.x)} ${this.roundSvg(point.y)}`
            ).join(' ');

            return `${path} Z`;
        }

        return `M ${FEATURE_SKETCH_PADDING} ${FEATURE_SKETCH_PADDING} H ${FEATURE_SKETCH_WIDTH - FEATURE_SKETCH_PADDING} `
            + `V ${FEATURE_SKETCH_HEIGHT - FEATURE_SKETCH_PADDING} H ${FEATURE_SKETCH_PADDING} Z`;
    }


    private getSurveyBoundarySketchPoints(): FeatureSketchPoint[] {

        const boundaryDocument = this.projectDocuments.find(document =>
            document.resource?.category === SURVEY_BOUNDARY_CATEGORY_NAME
                && this.getBoundaryCoordinatePairs(document.resource.geometry).length >= 3
        );
        if (!boundaryDocument) return [];

        return this.normalizeBoundaryCoordinatePairs(
            this.getBoundaryCoordinatePairs(boundaryDocument.resource.geometry)
        );
    }


    private getBoundaryCoordinatePairs(geometry: unknown): number[][] {

        if (!this.isRecord(geometry)) return [];

        if (geometry.type === 'LineString') {
            return this.getNumericCoordinatePairs(geometry.coordinates);
        }

        if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
            return this.getNumericCoordinatePairs(geometry.coordinates[0]);
        }

        return [];
    }


    private getFeatureGeometryCoordinatePairs(geometry: unknown): number[][] {

        if (!this.isRecord(geometry)) return [];

        if (geometry.type === 'Point') {
            return this.getPointCoordinatePair(geometry.coordinates);
        }

        if (geometry.type === 'MultiPoint') {
            return this.getNumericCoordinatePairs(geometry.coordinates);
        }

        if (geometry.type === 'LineString') {
            return this.getNumericCoordinatePairs(geometry.coordinates);
        }

        if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
            return geometry.coordinates.flatMap(line => this.getNumericCoordinatePairs(line));
        }

        if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
            return this.getNumericCoordinatePairs(geometry.coordinates[0]);
        }

        if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
            return geometry.coordinates.flatMap(polygon =>
                Array.isArray(polygon) ? this.getNumericCoordinatePairs(polygon[0]) : []
            );
        }

        return [];
    }


    private getPointCoordinatePair(value: unknown): number[][] {

        if (!Array.isArray(value) || value.length < 2) return [];
        if (typeof value[0] !== 'number' || !Number.isFinite(value[0])) return [];
        if (typeof value[1] !== 'number' || !Number.isFinite(value[1])) return [];

        return [[value[0], value[1]]];
    }


    private getNumericCoordinatePairs(value: unknown): number[][] {

        if (!Array.isArray(value)) return [];

        return value
            .filter((coordinate): coordinate is unknown[] =>
                Array.isArray(coordinate) && coordinate.length >= 2)
            .map(coordinate => [coordinate[0], coordinate[1]])
            .filter((coordinate): coordinate is number[] =>
                typeof coordinate[0] === 'number'
                    && Number.isFinite(coordinate[0])
                    && typeof coordinate[1] === 'number'
                    && Number.isFinite(coordinate[1]));
    }


    private normalizeBoundaryCoordinatePairs(coordinatePairs: number[][],
                                             minimumPointCount: number = 3): FeatureSketchPoint[] {

        const openPairs = this.getOpenCoordinatePairs(coordinatePairs);
        if (openPairs.length < minimumPointCount) return [];

        const xs = openPairs.map(coordinate => coordinate[0]);
        const ys = openPairs.map(coordinate => coordinate[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const xRange = Math.max(maxX - minX, 0.000001);
        const yRange = Math.max(maxY - minY, 0.000001);
        const padding = 14;
        const drawableSize = 100 - (padding * 2);

        return openPairs.map(coordinate => ({
            x: padding + (((coordinate[0] - minX) / xRange) * drawableSize),
            y: padding + (((maxY - coordinate[1]) / yRange) * drawableSize)
        }));
    }


    private getOpenCoordinatePairs(coordinatePairs: number[][]): number[][] {

        if (coordinatePairs.length < 2) return coordinatePairs;

        const first = coordinatePairs[0];
        const last = coordinatePairs[coordinatePairs.length - 1];

        return first[0] === last[0] && first[1] === last[1]
            ? coordinatePairs.slice(0, -1)
            : coordinatePairs;
    }


    private getFeatureSketchPointsCenter(points: FeatureSketchPoint[]): FeatureSketchPoint {

        if (points.length === 0) return { x: 50, y: 50 };

        return {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length
        };
    }


    private getVisibleFeatureSketchPoints(sketch: FeatureLocationSketch): FeatureSketchPoint[] {

        if (sketch.shape === 'polygon') return sketch.points.length > 0 ? sketch.points : [sketch.center];
        return sketch.points.length > 0 ? sketch.points : [sketch.center];
    }


    private projectFeatureSketchPoint(point: FeatureSketchPoint): FeatureSketchPoint {

        return {
            x: FEATURE_SKETCH_PADDING + (point.x / 100) * (FEATURE_SKETCH_WIDTH - (FEATURE_SKETCH_PADDING * 2)),
            y: FEATURE_SKETCH_PADDING + (point.y / 100) * (FEATURE_SKETCH_HEIGHT - (FEATURE_SKETCH_PADDING * 2))
        };
    }


    private fitFeatureSketchPoints(points: FeatureSketchPoint[]): FeatureSketchPoint[] {

        if (points.length === 0) return [];
        if (points.length === 1) return [{ x: FEATURE_SKETCH_WIDTH / 2, y: FEATURE_SKETCH_HEIGHT / 2 }];

        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);
        const availableWidth = FEATURE_SKETCH_WIDTH - (FEATURE_SKETCH_PADDING * 2);
        const availableHeight = FEATURE_SKETCH_HEIGHT - (FEATURE_SKETCH_PADDING * 2);
        const scale = Math.min(availableWidth / width, availableHeight / height);
        const fittedWidth = width * scale;
        const fittedHeight = height * scale;
        const offsetX = (FEATURE_SKETCH_WIDTH - fittedWidth) / 2;
        const offsetY = (FEATURE_SKETCH_HEIGHT - fittedHeight) / 2;

        return points.map(point => ({
            x: offsetX + ((point.x - minX) * scale),
            y: offsetY + ((point.y - minY) * scale)
        }));
    }


    private getFeatureLocationSketchSummary(sketch: FeatureLocationSketch): string {

        if (sketch.shape === 'polygon') return `점 연결 ${sketch.points.length}점`;
        if (sketch.shape === 'rectangle') return `사각형 · 중심 ${this.formatSketchPoint(sketch.center)}`;
        if (sketch.shape === 'oval') return `타원 · 중심 ${this.formatSketchPoint(sketch.center)}`;
        return `점 · ${this.formatSketchPoint(sketch.center)}`;
    }


    private getFeatureFreeDrawingSummary(): string {

        const summaryLabel = getPenMemoSketchSummaryLabel(
            this.document.resource[FEATURE_FREE_DRAWING_STROKES_FIELD]
        );

        return summaryLabel
            ? summaryLabel.replace(/^스케치 메모/, '자유 스케치')
            : '자유 스케치 없음';
    }


    private getFeatureFreeDrawingUpdatedAtLabel(): string|undefined {

        return this.getDateFieldLabel(FEATURE_FREE_DRAWING_UPDATED_AT_FIELD);
    }


    private makeFeaturePitLineSvgLine(summary: KoreanFieldworkFeaturePitLineSummary): FeaturePitLineSvgLine {

        const start = this.roundFeatureSketchSvgPoint(this.projectFeatureSketchPoint(summary.start));
        const end = this.roundFeatureSketchSvgPoint(this.projectFeatureSketchPoint(summary.end));

        return {
            end,
            label: summary.label,
            labelPoint: {
                x: this.roundSvg((start.x + end.x) / 2),
                y: this.roundSvg(((start.y + end.y) / 2) - 3)
            },
            start,
            text: summary.text
        };
    }


    private roundFeatureSketchSvgPoint(point: FeatureSketchPoint): FeatureSketchSvgPoint {

        return {
            x: this.roundSvg(point.x),
            y: this.roundSvg(point.y)
        };
    }


    private makeFindSpotSvgPoint(summary: KoreanFieldworkFindSpotSummary): FindSpotSvgPoint {

        const point = this.roundFeatureSketchSvgPoint(this.projectFeatureSketchPoint(summary.point));

        return {
            label: `${summary.number}`,
            text: summary.text,
            x: point.x,
            y: point.y
        };
    }


    private getFindSpotPreviewTitle(): string {

        return this.document?.resource?.category === 'Sample'
            ? '채취 위치점'
            : '출토 위치점';
    }


    private getDateFieldLabel(fieldName: string): string|undefined {

        return this.getDateValueLabel(this.document.resource[fieldName]);
    }


    private getDateValueLabel(value: unknown): string|undefined {

        if (typeof value !== 'string' || value.trim().length === 0) return undefined;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value.trim();

        return [
            date.getFullYear(),
            `${date.getMonth() + 1}`.padStart(2, '0'),
            `${date.getDate()}`.padStart(2, '0')
        ].join('-');
    }


    private formatSketchPoint(point: FeatureSketchPoint): string {

        return `${Math.round(point.x)}%, ${Math.round(point.y)}%`;
    }


    private normalizeSketchPoint(value: unknown): FeatureSketchPoint|undefined {

        if (!this.isRecord(value)) return undefined;

        const x = this.normalizeNumber(value.x, NaN);
        const y = this.normalizeNumber(value.y, NaN);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;

        return {
            x: this.clamp(x, 0, 100),
            y: this.clamp(y, 0, 100)
        };
    }


    private parseJsonObject(value: string): unknown {

        try {
            return JSON.parse(value);
        } catch (_) {
            return undefined;
        }
    }


    private isRecord(value: unknown): value is Record<string, any> {

        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }


    private normalizeNumber(value: unknown, fallback: number): number {

        const numberValue = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(numberValue) ? numberValue : fallback;
    }


    private clamp(value: number, min: number, max: number): number {

        return Math.min(max, Math.max(min, value));
    }


    private roundSvg(value: number): number {

        return Math.round(value * 10) / 10;
    }


    private getNonEmptyDocumentStringField(document: Document, fieldName: string): string|undefined {

        const value = document.resource[fieldName];
        if (typeof value !== 'string') return undefined;

        const trimmedValue = value.trim();
        return trimmedValue && trimmedValue !== '[]' ? trimmedValue : undefined;
    }


    private initializeIdentifierRevisionDraft(force: boolean = false) {

        if (!this.document?.resource) return;

        const draftKey = [
            this.document.resource.id,
            this.document.resource.identifier,
            (this.document.resource as any).reportIdentifier
        ].join(':');
        if (!force && draftKey === this.identifierRevisionDraftKey) return;

        this.identifierRevisionDraftKey = draftKey;
        this.identifierRevisionNextValue = getKoreanFieldworkReportIdentifier(this.document);
        this.identifierRevisionReason = '';
    }


    private normalizeIdentifierInput(value: unknown): string {

        return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
    }


    private getField(fieldName: string): Field|undefined {

        return this.fieldDefinitions?.find(field => field.name === fieldName);
    }


    private pushProjectSetupChips(chips: ContextChip[], resource: any) {

        if (resource.category !== 'Operation' && resource.category !== 'Project') return;

        const modeLabel = getKoreanFieldworkInvestigationModeOption(resource.projectInvestigationMode)?.label;
        const boundarySummary = this.getTextResourceValue(resource.projectBoundarySummary);

        if (modeLabel) chips.push({ label: `\uc870\uc0ac ${modeLabel}`, tone: 'info' });
        if (boundarySummary) {
            chips.push({
                label: `\uacbd\uacc4 ${this.shortenChipText(boundarySummary, 18)}`,
                tone: 'success'
            });
        }
    }


    private pushSurveyBoundaryChips(chips: ContextChip[], resource: any) {

        if (resource.category !== 'SurveyBoundary') return;

        const importDetailLabel = this.getSurveyBoundaryImportDetailLabel(resource);
        const boundaryDetailLabel = importDetailLabel
            ?? this.getTextResourceValue(resource.shortDescription)
            ?? this.getTextResourceValue(resource.surveyBoundaryNote);
        const methodLabel = getKoreanFieldworkBoundaryMethodLabel(this.document);

        if (importDetailLabel) {
            chips.push({
                label: `가져온 경계 ${this.shortenChipText(importDetailLabel, 34)}`,
                tone: 'success'
            });
        } else if (boundaryDetailLabel) {
            chips.push({
                label: `경계 ${this.shortenChipText(boundaryDetailLabel, 34)}`,
                tone: 'success'
            });
        }
        if (methodLabel) chips.push({ label: methodLabel, tone: 'info' });
    }


    private getSurveyBoundaryImportDetailLabel(resource: any): string|undefined {

        const source = this.getTextResourceValue(resource.surveyBoundarySource);
        if (source !== 'shpImport' && source !== 'dxfImport' && source !== 'geoJsonImport') return undefined;

        const boundaryLabel = this.getTextResourceValue(resource.shortDescription)
            ?? this.getTextResourceValue(resource.surveyBoundaryNote);
        const importSeparator = ' - ';
        const importDetailStart = boundaryLabel?.lastIndexOf(importSeparator) ?? -1;

        return importDetailStart >= 0
            ? boundaryLabel?.slice(importDetailStart + importSeparator.length).trim()
            : boundaryLabel;
    }


    private shortenChipText(value: string, maxLength: number): string {

        return value.length > maxLength
            ? `${value.slice(0, maxLength - 1)}…`
            : value;
    }


    private getTextResourceValue(value: unknown): string|undefined {

        if (typeof value === 'string') {
            const trimmedValue = value.trim();
            return trimmedValue.length > 0 ? trimmedValue : undefined;
        }

        if (Array.isArray(value)) {
            const firstTextValue = value.find(entry =>
                typeof entry === 'string' && entry.trim().length > 0
            );
            return typeof firstTextValue === 'string'
                ? firstTextValue.trim()
                : undefined;
        }

        return undefined;
    }


    private getAxisOrientationChip(resource: any): ContextChip|undefined {

        const longAxisValue = this.normalizeAxisOrientationValue(resource.longAxisOrientation);
        const shortAxisValue = this.normalizeAxisOrientationValue(resource.shortAxisOrientation);
        const axisLabels = [
            longAxisValue ? `장축 ${longAxisValue}` : undefined,
            shortAxisValue ? `단축 ${shortAxisValue}` : undefined
        ].filter((label): label is string => label !== undefined);
        if (axisLabels.length === 0) return undefined;

        const referenceValue = typeof resource.orientationReference === 'string'
            ? resource.orientationReference.trim()
            : '';
        const label = axisLabels.join(' / ');

        return {
            label: referenceValue ? `${label} · ${referenceValue}` : label,
            tone: 'info'
        };
    }


    private normalizeAxisOrientationValue(value: unknown): string|undefined {

        if (typeof value !== 'string') return undefined;

        const normalizedValue = value.trim().replace(/\s+/g, ' ');
        return normalizedValue.length > 0 ? normalizedValue : undefined;
    }


    private pushMappedChip(chips: ContextChip[],
                           value: unknown,
                           labels: Readonly<Record<string, ContextChip>>) {

        if (typeof value !== 'string') return;
        const chip = labels[value];
        if (chip) chips.push(chip);
    }


    private pushFeaturePeriodChip(chips: ContextChip[], resource: any) {

        if (!FEATURE_PERIOD_CATEGORIES.has(resource.category)) return;

        const periodLabel = this.getFeaturePeriodLabel(resource.period);
        if (!periodLabel) return;

        chips.push({
            label: `시기 ${periodLabel}`,
            tone: periodLabel === FEATURE_PERIOD_LABELS.undated ? 'warning' : 'info'
        });
    }


    private getFeaturePeriodLabel(value: unknown): string|undefined {

        const periodValues = this.getFeaturePeriodValues(value);
        if (periodValues.length === 0) return undefined;

        return periodValues
            .map(periodValue => FEATURE_PERIOD_LABELS[periodValue] ?? periodValue)
            .join('~');
    }


    private getFeaturePeriodValues(value: unknown): string[] {

        if (typeof value === 'string') {
            const trimmedValue = value.trim();
            return trimmedValue ? [trimmedValue] : [];
        }

        if (!this.isRecord(value)) return [];

        const rangeValues = [value.value, value.endValue]
            .map(entry => typeof entry === 'string' ? entry.trim() : '')
            .filter(entry => entry.length > 0);

        return rangeValues.filter((entry, index) => rangeValues.indexOf(entry) === index);
    }


    private pushOperationRoleResponsibilityChip(chips: ContextChip[], resource: any) {

        const values = this.getStringArrayResourceValues(resource.operationRoleResponsibility);
        if (values.length === 0) return;

        const visibleLabels = values
            .slice(0, 3)
            .map(value => OPERATION_ROLE_RESPONSIBILITY_LABELS[value] ?? value);
        const hiddenCount = values.length - visibleLabels.length;
        const labelSuffix = hiddenCount > 0
            ? `${visibleLabels.join(' · ')} +${hiddenCount}`
            : visibleLabels.join(' · ');

        chips.push({
            label: `역할 ${labelSuffix}`,
            tone: values.some(value => OPERATION_ROLE_RESPONSIBILITY_WARNING_VALUES.has(value))
                ? 'warning'
                : 'success'
        });
    }


    private pushFeatureStratigraphyReviewChips(chips: ContextChip[], resource: any) {

        const interpretationSummary = this.getChecklistSummaryLabel(
            resource,
            FEATURE_STRATIGRAPHY_INTERPRETATION_FIELDS
        );
        if (interpretationSummary) {
            chips.push({
                label: this.shortenChipText(`해석 ${interpretationSummary.label}`, 58),
                tone: interpretationSummary.hasWarning ? 'warning' : 'info'
            });
        }

        const soilSummary = this.getChecklistSummaryLabel(
            resource,
            FEATURE_STRATIGRAPHY_SOIL_FIELDS
        );
        if (soilSummary) {
            chips.push({
                label: this.shortenChipText(`토성 ${soilSummary.label}`, 58),
                tone: soilSummary.hasWarning ? 'warning' : 'info'
            });
        }
    }


    private pushSurveyPredictionReviewChip(chips: ContextChip[], resource: any) {

        if (resource.category !== 'Survey') return;

        const predictionSummary = this.getChecklistSummaryLabel(
            resource,
            SURVEY_PREDICTION_REVIEW_FIELDS
        );
        if (!predictionSummary) return;

        chips.push({
            label: this.shortenChipText(`예측 ${predictionSummary.label}`, 58),
            tone: predictionSummary.hasWarning ? 'warning' : 'info'
        });
    }


    private pushSourceEvidenceVerificationChip(chips: ContextChip[], resource: any) {

        if (resource.category !== 'SourceEvidenceIndex') return;

        const verificationSummary = this.getChecklistSummaryLabel(
            resource,
            SOURCE_EVIDENCE_VERIFICATION_FIELDS
        );
        if (!verificationSummary) return;

        chips.push({
            label: this.shortenChipText(`검증 ${verificationSummary.label}`, 58),
            tone: verificationSummary.hasWarning ? 'warning' : 'info'
        });
    }


    private pushFieldRecordQualityReviewChip(chips: ContextChip[], resource: any) {

        if (resource.category !== FIELD_RECORD_QUALITY_REVIEW_CATEGORY_NAME) return;

        const parts = FIELD_RECORD_QUALITY_REVIEW_SUMMARY_FIELDS
            .map(({ fieldName, prefix }) => {
                const summary = getKoreanFieldworkRecordFieldValueSummary(fieldName, resource[fieldName]);

                return summary ? `${prefix} ${summary}` : undefined;
            })
            .filter((part): part is string => !!part);
        if (parts.length === 0) return;

        const hasReviewWarning = resource.verificationState === 'needsRecheck'
            || this.getStringArrayResourceValues(resource.qualityReviewStage).includes('sourceRecordCorrection')
            || this.getStringArrayResourceValues(resource.reportEvaluationFeedback).includes('supplementRequestTracked');

        chips.push({
            label: this.shortenChipText(parts.join(' / '), 58),
            tone: hasReviewWarning ? 'warning' : 'info'
        });
    }


    private pushMediaReviewChip(chips: ContextChip[], resource: any) {

        if (!MEDIA_REVIEW_CATEGORIES.has(resource.category)) return;

        const mediaSummary = this.getChecklistSummaryLabel(resource, MEDIA_REVIEW_FIELDS);
        if (!mediaSummary) return;

        chips.push({
            label: this.shortenChipText(`미디어 ${mediaSummary.label}`, 58),
            tone: mediaSummary.hasWarning ? 'warning' : 'info'
        });
    }


    private pushImageUploadChip(chips: ContextChip[], resource: any) {

        if (!MEDIA_REVIEW_CATEGORIES.has(resource.category)) return;

        const localUri = this.getMediaLocalUri(resource);
        const hasUploadFields = [
            resource.fieldworkImageUploadStatus,
            resource.fieldworkImageUploadedAt,
            resource.fieldworkImageUploadedUri,
            resource.fieldworkImageUploadTarget,
            resource.fieldworkImageUploadedProject,
            resource.fieldworkImageUploadedMd5,
            resource.fieldworkImageUploadedSizeBytes,
            resource.fieldworkImageStoredMd5,
            resource.fieldworkImageStoredSha256,
            resource.fieldworkImageStoredSizeBytes
        ].some(value => value !== undefined && value !== null && `${value}`.trim().length > 0);

        if (hasConfirmedKoreanFieldworkImageUpload(resource, localUri)) {
            const uploadedAtLabel = this.getDateValueLabel(resource.fieldworkImageUploadedAt);
            const hasStoredSha256 = this.getTextResourceValue(resource.fieldworkImageStoredSha256) !== undefined;
            const details = [
                '업로드 확인',
                uploadedAtLabel,
                hasStoredSha256 ? 'SHA256' : undefined
            ].filter((label): label is string => label !== undefined);

            chips.push({ label: `백업 ${details.join(' · ')}`, tone: 'success' });
            return;
        }

        if (localUri || hasUploadFields) {
            chips.push({
                label: hasUploadFields ? '백업 업로드 기록 보완 필요' : '백업 확인 필요',
                tone: 'warning'
            });
        }
    }


    private getMediaLocalUri(resource: any): string|undefined {

        const uriFields = MEDIA_LOCAL_URI_FIELDS[resource.category] ?? [];

        return uriFields
            .map(fieldName => this.getTextResourceValue(resource[fieldName]))
            .find(uri => uri !== undefined && /^(file|content):\/\//.test(uri));
    }


    private getChecklistSummaryLabel(resource: any,
                                     fields: readonly ChecklistSummaryField[]):
            { label: string, hasWarning: boolean }|undefined {

        const summaries = fields
            .map(field => {
                const values = this.getStringArrayResourceValues(resource[field.fieldName]);
                if (values.length === 0) return undefined;

                const visibleLabels = values
                    .slice(0, 2)
                    .map(value => field.labels[value] ?? value);
                const hiddenCount = values.length - visibleLabels.length;
                const label = hiddenCount > 0
                    ? `${field.prefix} ${visibleLabels.join('·')} +${hiddenCount}`
                    : `${field.prefix} ${visibleLabels.join('·')}`;

                return {
                    hasWarning: values.some(value => RECORD_CONTEXT_CHECKLIST_WARNING_VALUES.has(value)),
                    label
                };
            })
            .filter((summary): summary is { label: string, hasWarning: boolean } =>
                summary !== undefined
            );

        if (summaries.length === 0) return undefined;

        return {
            hasWarning: summaries.some(summary => summary.hasWarning),
            label: summaries.map(summary => summary.label).join(' / ')
        };
    }


    private getStringArrayResourceValues(value: unknown): string[] {

        const rawValues = Array.isArray(value)
            ? value
            : this.parseStringArrayResourceValue(value);
        const seenValues = new Set<string>();

        return rawValues
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim())
            .filter(item => {
                if (item.length === 0 || seenValues.has(item)) return false;
                seenValues.add(item);
                return true;
            });
    }


    private parseStringArrayResourceValue(value: unknown): unknown[] {

        if (typeof value !== 'string') return [];

        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) return [];

        try {
            const parsedValue = JSON.parse(trimmedValue);
            if (Array.isArray(parsedValue)) return parsedValue;
        } catch {
            // Imported records may contain one plain checkbox value; keep it visible.
        }

        return [trimmedValue];
    }


    private pushFeatureAttributeChip(chips: ContextChip[]) {

        const preset = getKoreanFieldworkActiveFeatureGuidancePreset(this.document);
        const checklists = getKoreanFieldworkFeatureGuidanceChecklistFields(
            preset,
            this.document,
            this.fieldDefinitions
        );
        if (!preset || checklists.length === 0) return;

        const selectedLabels = getKoreanFieldworkFeatureGuidanceSelectedAttributeLabels(
            this.document,
            checklists
        );

        chips.push(selectedLabels.length > 0
            ? { label: `${preset.label} 핵심 ${this.formatFeatureAttributeLabels(selectedLabels)}`, tone: 'success' }
            : { label: `${preset.label} 핵심 속성 미기록`, tone: 'warning' });
    }


    private formatFeatureAttributeLabels(labels: string[]): string {

        const visibleLabels = labels.slice(0, 3).join('·');
        const hiddenCount = labels.length - 3;

        return hiddenCount > 0 ? `${visibleLabels} 외 ${hiddenCount}` : visibleLabels;
    }


    private dedupeChips(chips: ContextChip[]): ContextChip[] {

        const labels = new Set<string>();

        return chips.filter(chip => {
            if (labels.has(chip.label)) return false;
            labels.add(chip.label);
            return true;
        });
    }
}
