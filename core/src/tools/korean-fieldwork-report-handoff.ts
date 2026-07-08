import { Document } from '../model/document/document';
import { NewResource } from '../model/document/resource';
import {
    buildEvidenceBundle,
    EvidenceBundle,
    getKoreanFieldworkCloseoutReviewIssues,
    KoreanFieldworkReadinessIssue
} from './korean-fieldwork-readiness';
import {
    getKoreanFieldworkFeatureAttributeSummaries
} from './korean-fieldwork-feature-attributes';
import {
    getKoreanFieldworkFeatureTypeLabel,
    getKoreanFieldworkFeatureTypeLabelFromInterpretationType
} from './korean-fieldwork-feature-types';
import { parseSoilProfileColorSwatchRows } from './korean-fieldwork-soil-color';
import {
    getKoreanFieldworkCategoryLabel,
    getKoreanFieldworkFeaturePeriodSummary,
    getKoreanFieldworkFeatureInvestigationChecklistSummary,
    getKoreanFieldworkReportHandoffCategoryRank,
    getKoreanFieldworkRecordFieldValueSummary,
    getKoreanFieldworkRelationLabel,
    isKoreanFieldworkRecordValuelistField,
    isKoreanFieldworkReportHandoffCategory
} from './korean-fieldwork-record-contract';
import {
    KOREAN_FIELDWORK_FIELD_NOTE_HANDWRITING_SUMMARY_LABEL,
    KOREAN_FIELDWORK_FIELD_NOTE_SUMMARY_LABELS,
    KoreanFieldworkFieldNoteSectionId,
    parseKoreanFieldworkFieldNote
} from './korean-fieldwork-field-note';


export type KoreanFieldworkReportHandoffTone = 'ready'|'review';

export type KoreanFieldworkReportHandoffCopySectionId = 'body'|'summary'|'details'|'relations'|'evidence'|'issues';

export interface KoreanFieldworkReportHandoffCopySection {
    id: KoreanFieldworkReportHandoffCopySectionId;
    label: string;
    copyText: string;
    lineCount: number;
}

export interface KoreanFieldworkReportHandoffItem {
    documentId: string;
    category: string;
    categoryLabel: string;
    identifier: string;
    title: string;
    summary: string;
    details: string[];
    relationDetails: string[];
    evidenceLabel: string;
    evidenceDetails: string[];
    issueLabel: string;
    issueDetails: string[];
    evidenceCount: number;
    issueCount: number;
    copySections: KoreanFieldworkReportHandoffCopySection[];
    copyText: string;
    tone: KoreanFieldworkReportHandoffTone;
}

export interface KoreanFieldworkReportHandoff {
    items: KoreanFieldworkReportHandoffItem[];
    readyCount: number;
    reviewCount: number;
    issueCount: number;
    copyAllText: string;
}

export type KoreanFieldworkReportHandoffValidationStatus = 'not-applicable'|'ready'|'review';

export interface KoreanFieldworkReportHandoffValidation {
    status: KoreanFieldworkReportHandoffValidationStatus;
    documentId?: string;
    category?: string;
    categoryLabel?: string;
    identifier?: string;
    isReportHandoffCategory: boolean;
    isCopyable: boolean;
    message: string;
    messages: string[];
    relatedFields: string[];
    evidenceCount: number;
    issueCount: number;
    copyText?: string;
}

const REPORT_HANDOFF_SAVE_MESSAGE_DETAIL_LIMIT = 2;

export function normalizeKoreanFieldworkHwpPlainText(text: string): string {

    const normalized = (text ?? '')
        .normalize('NFC')
        .replace(/\u00a0/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
        .split('\n')
        .map(line => line.replace(/ {2,}/g, ' ').replace(/ +$/g, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return normalized.replace(/\n/g, '\r\n');
}


export function getKoreanFieldworkReportHandoffSaveMessage(
        baseMessage: string,
        validation: KoreanFieldworkReportHandoffValidation,
        detailLimit: number = REPORT_HANDOFF_SAVE_MESSAGE_DETAIL_LIMIT
): string {

    const message = validation.status === 'not-applicable'
        ? baseMessage
        : [baseMessage, validation.message].filter(value => !!value).join(' ');
    const detailMessage = getKoreanFieldworkReportHandoffValidationDetailMessage(validation, detailLimit);

    return detailMessage ? `${message}\n${detailMessage}` : message;
}


export function getKoreanFieldworkReportHandoffValidationDetailMessage(
        validation: KoreanFieldworkReportHandoffValidation,
        detailLimit: number = REPORT_HANDOFF_SAVE_MESSAGE_DETAIL_LIMIT
): string|undefined {

    if (validation.status !== 'review') return undefined;

    const messages = validation.messages
        .map(message => message.trim())
        .filter(message => message.length > 0);
    if (messages.length === 0) return undefined;

    const normalizedLimit = Math.max(1, Math.floor(detailLimit));
    const visibleMessages = messages.slice(0, normalizedLimit);
    const remainingCount = Math.max(0, messages.length - visibleMessages.length);
    const detailLines = visibleMessages.map(message => `- ${message}`);

    if (remainingCount > 0) {
        detailLines.push(`- \uc678 ${remainingCount}\uac74 \ub354 \ud655\uc778`);
    }

    return `\ubcf4\uc644 \ud56d\ubaa9:\n${detailLines.join('\n')}`;
}

interface DetailFieldDefinition {
    label: string;
    getSummary?: (document: Document) => string|undefined;
    fields: readonly string[];
}

interface EvidenceCountDefinition {
    label: string;
    getCount: (bundle: EvidenceBundle) => number;
}

interface EvidenceDetailDefinition {
    label: string;
    getDocuments: (bundle: EvidenceBundle) => Document[];
    getSummary?: (document: Document) => string|undefined;
    fields: string[];
}

interface LabeledEvidenceFieldDefinition {
    label: string;
    fieldName: string;
}

const KO = {
    ALL_READY: '\ubc14\ub85c \uc778\uc6a9 \uac00\ub2a5',
    BODY: '\ubcf8\ubb38',
    CATEGORY: '\uc720\ud615',
    CHECKED_FOR_DESKTOP: '\ub370\uc2a4\ud06c\ud1b1 HWP \ubcf4\uace0\uc11c \ud0ed \uc804\ub2ec \ud655\uc778',
    DETAILS: '\uae30\ub85d',
    EVIDENCE: '\uc790\ub8cc',
    EVIDENCE_DETAILS: '\uc790\ub8cc \uc0c1\uc138',
    ISSUES: '\ud655\uc778',
    ISSUE_DETAILS: '\ud655\uc778 \uc0c1\uc138',
    RELATIONS: '\uc5f0\uacb0',
    NO_DETAILS: '\uc138\ubd80 \uae30\ub85d \ubcf4\uac15 \ud544\uc694',
    NO_EVIDENCE: '\uc5f0\uacb0 \uc790\ub8cc \uc5c6\uc74c',
    NO_ISSUES: '\ud655\uc778 \uc0ac\ud56d \uc5c6\uc74c',
    NOT_REPORT_HANDOFF: '\ub370\uc2a4\ud06c\ud1b1 \ubcf4\uace0\uc11c \ubcf5\uc0ac \ub300\uc0c1 \uae30\ub85d\uc774 \uc544\ub2d9\ub2c8\ub2e4',
    RECORD: '\uae30\ub85d',
    REPORT_HANDOFF_READY: '\ub370\uc2a4\ud06c\ud1b1 HWP \ubcf5\uc0ac \ube14\ub85d \uc900\ube44\ub428',
    REVIEW_NEEDED: '\ubcf4\uc644 \ud544\uc694',
    SUMMARY: '\uc694\uc57d'
};

const DAILY_LOG_CATEGORY = 'DailyLog';
const FIELD_RECORD_QUALITY_REVIEW_CATEGORY = 'FieldRecordQualityReview';
const DAILY_LOG_DETAIL_FIELDS = [
    'dailyLogInvestigatorCount',
    'dailyLogLaborerCount',
    'dailyLogWorkerCount',
    'dailyLogEquipmentCount',
    'dailyLogEquipmentSize',
    'dailyLogSafetyEducationPhoto',
    'dailyLogSafetyEducationStretching',
    'dailyLogContent',
    'dailyLogEvidenceRole',
    'dailyLogReview',
    'dailyLogBoundaryMemoImportedAt',
    'dailyLogBoundaryMemoUpdatedAt',
    'dailyLogWorkMemoUpdatedAt',
    'dailyLogBoundaryMemoStrokes'
];
const FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS = [
    'reviewedRecordUnit',
    'qualityReviewStage',
    'qualityCorrectionBasis',
    'recordCreationTiming',
    'fieldRecordQuality',
    'reportCrossCheck',
    'reportEvaluationFeedback',
    'verificationState'
];

const FIND_EVIDENCE_SUMMARY_FIELDS: LabeledEvidenceFieldDefinition[] = [
    { label: '\uc694\uc57d', fieldName: 'shortDescription' },
    { label: '\uc124\uba85', fieldName: 'description' },
    { label: '\ucd9c\ud1a0 \uc704\uce58', fieldName: 'findSpotDescription' },
    { label: '\uc720\ubb3c\u00b7\uc2dc\ub8cc \uc5f0\uad6c\ubc94\uc704', fieldName: 'findSampleResearchScope' },
    { label: '\uc720\ubb3c \uad00\ub9ac \uc808\ucc28', fieldName: 'artifactHandlingWorkflow' },
    { label: '\uc720\ubb3c \uc774\uc1a1 \uc548\uc804', fieldName: 'artifactTransportSafety' },
    { label: '\uc784\uc2dc\uc218\uc7a5\uace0 \uc6b4\uc601', fieldName: 'temporaryStorageOperation' },
    { label: '\uc720\ubb3c \ud604\uc7a5\ubcf5\uc6d0 \uc5f0\uacb0', fieldName: 'artifactFieldRestorationLink' },
    { label: '\uc720\ubb3c \uaf2c\ub9ac\ud45c\u00b7\ub300\uc7a5 \uc5f0\uacb0', fieldName: 'artifactLabelRegisterLink' },
    { label: '\uc9c0\ud45c \uc218\uc2b5\uc720\ubb3c \uad00\ub9ac', fieldName: 'surfaceFindHandlingRecord' },
    { label: '\uc6b0\uc5f0\u00b7\uc2e0\uace0 \uc720\ubb3c \ucd9c\ucc98', fieldName: 'chanceFindProvenance' },
    { label: '\uc720\ubb3c \uc218\uc2b5\u00b7\ubcf4\uc874 \uc704\ud5d8', fieldName: 'artifactRecoveryPreservationRisk' },
    { label: '\uae30\uc640\uac00\ub9c8 \ucd9c\ud1a0\ud488 \uc131\uaca9', fieldName: 'tileKilnFindContext' },
    { label: '\uc790\uae30 \uc720\ubb3c \uad00\ucc30', fieldName: 'porcelainFindObservation' }
];

const SAMPLE_EVIDENCE_SUMMARY_FIELDS: LabeledEvidenceFieldDefinition[] = [
    { label: '\uc694\uc57d', fieldName: 'shortDescription' },
    { label: '\uc124\uba85', fieldName: 'description' },
    { label: '\uc2dc\ub8cc \uc885\ub958', fieldName: 'sampleType' },
    { label: '\uc2e4\ud5d8\uc2e4 \ubc88\ud638', fieldName: 'labNumber' },
    { label: '\ubb34\uac8c', fieldName: 'weight' },
    { label: '\ubd80\ud53c', fieldName: 'volume' },
    { label: '\uc2dc\ub8cc \ubaa9\uc801', fieldName: 'samplePurpose' },
    { label: '\uc720\ubb3c\u00b7\uc2dc\ub8cc \uc5f0\uad6c\ubc94\uc704', fieldName: 'findSampleResearchScope' },
    { label: '\uc2dc\ub8cc \ucc44\ucde8\u00b7\ubcf4\uad00', fieldName: 'sampleCollectionHandling' },
    { label: '\uc218\ud608\uac74\ubb3c\uc9c0 \uc790\uc5f0\uacfc\ud559 \uc2dc\ub8cc', fieldName: 'pitDwellingScienceSamplingPlan' },
    { label: '\uc81c\ucca0 \uc2dc\ub8cc \ubd84\uc11d\uacc4\ud68d', fieldName: 'ironSampleAnalysisPlan' },
    { label: '\uae30\uc640\uac00\ub9c8 \ubd84\uc11d \uacc4\ud68d', fieldName: 'tileKilnAnalysisPlan' },
    { label: '\ud1a0\uae30\uac00\ub9c8 \ubd84\uc11d \uacc4\ud68d', fieldName: 'potteryKilnAnalysisPlan' },
    { label: '\uace0\uace0\uc9c0\uc790\uae30 \uc2dc\ub8cc \ub9e5\ub77d', fieldName: 'archaeomagneticSampleContext' },
    { label: '\uce21\uad6c\ubd80\ud0c4\uc694 \ubd84\uc11d \uacc4\ud68d', fieldName: 'charcoalKilnAnalysisPlan' },
    { label: '\uc790\uae30\uc694\uc7a5 \ubd84\uc11d \uacc4\ud68d', fieldName: 'porcelainAnalysisPlan' },
    { label: '\uc778\uace8 \uc218\uc2b5\u00b7\ubd84\uc11d', fieldName: 'humanRemainsRecoveryAnalysis' },
    { label: '\uc778\uace8 DNA \ud604\uc7a5\uad00\ub9ac', fieldName: 'humanDnaFieldControl' },
    { label: '\uc720\uae30\ubb3c\u00b7\ud1a0\uc591 \ubd84\uc11d\uc2dc\ub8cc', fieldName: 'organicSoilAnalysisSample' },
    { label: '\ud30c\uad34\ubd84\uc11d \uacb0\uc815', fieldName: 'destructiveAnalysisDecision' },
    { label: '\ud328\ucd1d \uc2dc\ub8cc \ucc44\ucde8\uc804\ub7b5', fieldName: 'shellMiddenSamplingStrategy' },
    { label: '\uace0\ud658\uacbd \ud504\ub85d\uc2dc \uc2dc\ub8cc', fieldName: 'paleoenvironmentProxySampling' },
    { label: '\uc2dd\ubb3c\uace0\uace0\ud559 \uc2dc\ub8cc \uc124\uacc4', fieldName: 'archaeobotanySampleDesign' },
    { label: '\uc2dd\ubb3c\uc720\uccb4 \ud45c\ubcf8\ucd94\ucd9c', fieldName: 'plantRemainSamplingMethod' },
    { label: '\ud50c\ub85c\ud14c\uc774\uc158 \ucc98\ub9ac\uae30\ub85d', fieldName: 'flotationProcessingRecord' },
    { label: '\ub3d9\ubb3c\uc720\uccb4 \uc218\uc2b5\u00b7\ud45c\ubcf8', fieldName: 'faunalRecoverySampling' },
    { label: '\ub3d9\ubb3c\uc720\uccb4 \ubcf4\uc874\u00b7\ucde8\uae09', fieldName: 'faunalPreservationHandling' }
];

const FIND_SAMPLE_SUMMARY_FIELDS = Array.from(new Set([
    'findSpotDescription',
    'samplePurpose',
    'sampleType',
    'labNumber',
    'weight',
    'volume',
    ...FIND_EVIDENCE_SUMMARY_FIELDS.map(definition => definition.fieldName),
    ...SAMPLE_EVIDENCE_SUMMARY_FIELDS.map(definition => definition.fieldName)
])).filter(fieldName =>
    !['shortDescription', 'description'].includes(fieldName)
);

const DETAIL_FIELDS: DetailFieldDefinition[] = [
    {
        label: '\uc77c\uc790',
        fields: ['date', 'fieldworkDate', 'workDate']
    },
    {
        label: '\ubcf4\uace0\uc11c \ubc88\ud638',
        fields: ['reportIdentifier']
    },
    {
        label: '\uc131\uaca9',
        getSummary: getFeatureTypeDetailSummary,
        fields: ['featureType', 'featureInterpretationType']
    },
    {
        label: '\uc2dc\ub300',
        getSummary: getPeriodDetailSummary,
        fields: ['period', 'dating']
    },
    {
        label: '\uc870\uc0ac \uc0c1\ud0dc',
        getSummary: getInvestigationStatusDetailSummary,
        fields: [
            'featureRecordingStatus',
            'recordCreationTiming',
            'fieldRecordQuality',
            'verificationState',
            'featureInvestigationChecklist'
        ]
    },
    {
        label: '\uc704\uce58/\ub3c4\uba74',
        getSummary: getLocationDrawingDetailSummary,
        fields: [
            'geometrySource',
            'geometryConfidence',
            'featureGeometryEditStatus',
            'featureGeometryRevisionNote',
            'featureLocationSketch',
            'featureFreeDrawingStrokes',
            'surveyBoundaryAccuracy',
            'surveyBoundarySource'
        ]
    },
    {
        label: '\ud1a0\uce35',
        fields: [
            'layerSequenceNumber',
            'layerSequenceMeaning',
            'soilColorAssistCandidates',
            'soilColorAssistStatus',
            'featureSoilProfilePhotoCount'
        ]
    },
    {
        label: '\uc0ac\uc9c4/\uc790\ub8cc',
        getSummary: getMediaDetailSummary,
        fields: [
            'fieldworkPhotoCaption',
            'fieldworkPhotoUri',
            'soilProfilePhotoUri',
            'imageUri',
            'fileUri',
            'originalFilename',
            'fieldworkPhotoCapturedAt',
            'soilProfilePhotoCapturedAt',
            'width',
            'height',
            'drawingSketchStrokes',
            'fieldworkPhotoQuality',
            'soilProfilePhotoQuality',
            'mediaEvidenceRole',
            'digitalSourcePreservation',
            'fieldworkImageUploadStatus'
        ]
    },
    {
        label: '\uc791\uc5c5\uc77c\uc9c0',
        getSummary: getDailyLogDetailSummary,
        fields: DAILY_LOG_DETAIL_FIELDS
    },
    {
        label: '\uae30\ub85d \uac80\ud1a0',
        getSummary: getFieldRecordQualityReviewDetailSummary,
        fields: FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS
    },
    {
        label: '\ud604\uc7a5\uba54\ubaa8',
        getSummary: getFieldNoteDetailSummary,
        fields: ['fieldNote', 'interpretation']
    },
    {
        label: '\uba54\ubaa8',
        fields: ['description', 'penMemoReviewedTranscript', 'penMemoAutoTranscript']
    }
];

const SUMMARY_FIELDS = [
    'shortDescription',
    'description',
    'diaryAbstract',
    'fieldNote',
    'penMemoReviewedTranscript',
    'penMemoAutoTranscript',
    'featureGeometryRevisionNote',
    'featureLocationSketch',
    'featureFreeDrawingStrokes',
    'dailyLogContent',
    'dailyLogBoundaryMemoStrokes',
    'surveyBoundaryNote',
    'reviewedRecordUnit',
    'qualityReviewStage',
    'qualityCorrectionBasis',
    'reportPreparationSourceText',
    'reportEditorialIssueText',
    ...FIND_SAMPLE_SUMMARY_FIELDS
];

const RELATION_REQUIRED_CATEGORIES = [
    'Drawing',
    'Feature',
    'FeatureGroup',
    'FeatureSegment',
    'FieldRecordQualityReview',
    'Find',
    'FindCollection',
    'Layer',
    'PenMemo',
    'Photo',
    'Sample',
    'SoilProfilePhoto',
    'Trench'
];

const MEDIA_URI_FIELDS: Readonly<Record<string, string[]>> = {
    Drawing: ['fileUri', 'imageUri', 'fieldworkPhotoUri', 'drawingSketchStrokes'],
    Photo: ['fieldworkPhotoUri', 'imageUri', 'fileUri'],
    SoilProfilePhoto: ['soilProfilePhotoUri', 'imageUri', 'fieldworkPhotoUri']
};

const SOIL_COLOR_SAMPLE_SOURCE_PATTERN =
    /^\uc0ac\uc9c4 (?:\uc911\uc559\ubd80|\uc120\ud0dd \uc9c0\uc810 \d{1,3}%\/\d{1,3}%) \ud3c9\uade0 RGB \d{1,3}\/\d{1,3}\/\d{1,3}$/;
const RGB_SAMPLE_LOCATION_PATTERN = /RGB\s+(\d{1,3})\/(\d{1,3})\/(\d{1,3})\s+@\s*(\d{1,3})%\/(\d{1,3})%/i;
const SOIL_COLOR_ROW_NUMBER_PATTERN = /^\s*(\d+)\s*:/;

const PEN_MEMO_CONTENT_FIELDS = [
    'description',
    'penMemoAutoTranscript',
    'penMemoReviewedTranscript',
    'penMemoStrokes'
];

const KOREAN_FIELDWORK_LABELLED_RECORD_FIELDS = [
    'featureRecordingStatus',
    'recordCreationTiming',
    'fieldRecordQuality',
    'verificationState',
    'geometrySource',
    'geometryConfidence',
    'featureGeometryEditStatus',
    'surveyBoundaryAccuracy',
    'surveyBoundarySource'
];

const DAILY_LOG_CONTENT_LABELS: Readonly<Record<string, string>> = {
    workDateWeather: '\uc791\uc5c5\uc77c\uc790\u00b7\ub0a0\uc528',
    staffRoles: '\uc870\uc0ac\uc790\u00b7\uc5ed\ud560',
    workArea: '\uc791\uc5c5\uad6c\uc5ed',
    strippingProgress: '\ud45c\ud1a0 \uc9c4\ud589',
    featureProgress: '\uc720\uad6c \uc870\uc0ac \uc9c4\ud589',
    layerDecision: '\uce35\uc704 \ud310\ub2e8',
    findSampleCollection: '\uc720\ubb3c\u00b7\uc2dc\ub8cc \uc218\uc2b5',
    photoDrawingNumbers: '\uc0ac\uc9c4\u00b7\ub3c4\uba74 \ubc88\ud638',
    visitorInstruction: '\ubc29\ubb38\uc790\u00b7\uc9c0\uc2dc\uc0ac\ud56d',
    equipmentIssue: '\uc7a5\ube44 \ubb38\uc81c',
    safetyIssue: '\uc548\uc804 \ubb38\uc81c',
    changeReason: '\ubcc0\uacbd \uc0ac\uc720',
    nextWorkPlan: '\ub2e4\uc74c \uc791\uc5c5\uacc4\ud68d',
    pendingDecision: '\ucd94\uac00 \ud655\uc778'
};

const DAILY_LOG_EVIDENCE_ROLE_LABELS: Readonly<Record<string, string>> = {
    sameDayFactRecord: '\ub2f9\uc77c \uc0ac\uc2e4\uae30\ub85d',
    cumulativeStaffCount: '\ub204\uc801 \uc870\uc0ac\uc6d0 \uc218',
    cumulativeWorkerCount: '\ub204\uc801 \uc778\ubd80 \uc218',
    cumulativeEquipmentCount: '\ub204\uc801 \uc7a5\ube44 \uc218',
    weatherAndRainWork: '\ub0a0\uc528\u00b7\uac15\uc6b0\uc791\uc5c5',
    importantFindNoted: '\uc911\uc694 \uc720\ubb3c\u00b7\uc720\uad6c \uae30\ub85d',
    visitorInstructionNoted: '\ubc29\ubb38\uc790\u00b7\uc9c0\uc2dc\uc0ac\ud56d \uae30\ub85d',
    committeeMeetingNoted: '\ud559\uc220\uc704\uc6d0\ud68c \uae30\ub85d',
    expertReviewMeetingNoted: '\uc804\ubb38\uac00 \uac80\ud1a0\ud68c \uae30\ub85d',
    clientAgencyCommunication: '\ubc1c\uc8fc\ucc98 \uc18c\ud1b5',
    disputeEvidencePotential: '\ubd84\uc7c1 \uc99d\uac70 \uac00\ub2a5\uc131',
    nextPlanBasis: '\ub2e4\uc74c \uc791\uc5c5\uacc4\ud68d \uadfc\uac70',
    pendingDecision: '\ucd94\uac00 \ud655\uc778'
};

const DAILY_LOG_REVIEW_LABELS: Readonly<Record<string, string>> = {
    sameDayWritten: '\ub2f9\uc77c \uc791\uc131',
    factsInterpretationSeparated: '\uc0ac\uc2e4\u00b7\ud574\uc11d \ubd84\ub9ac',
    authorIdentified: '\uc791\uc131\uc790 \ud655\uc778',
    reviewerChecked: '\uac80\ud1a0\uc790 \ud655\uc778',
    photoDrawingCrossChecked: '\uc0ac\uc9c4\u00b7\ub3c4\uba74 \ub300\uc870',
    findListCrossChecked: '\uc720\ubb3c\ubaa9\ub85d \ub300\uc870',
    sampleListCrossChecked: '\uc2dc\ub8cc\ubaa9\ub85d \ub300\uc870',
    numberConversionChecked: '\ubc88\ud638 \ubcc0\ud658\ud45c \ub300\uc870',
    correctionReasonLinked: '\uc218\uc815\uadfc\uac70 \uc5f0\uacb0',
    sourceRecordArchived: '\uc6d0\uae30\ub85d \ubcf4\uc874',
    reportCarryForwardChecked: '\ubcf4\uace0\uc11c \ubc18\uc601 \ud655\uc778',
    pendingDecision: '\ucd94\uac00 \ud655\uc778'
};

const FIELD_NOTE_SECTION_LABELS = KOREAN_FIELDWORK_FIELD_NOTE_SUMMARY_LABELS;
const FIELD_NOTE_HANDWRITING_SUMMARY_LABEL = KOREAN_FIELDWORK_FIELD_NOTE_HANDWRITING_SUMMARY_LABEL;

const RELATION_DETAIL_ORDER = [
    'liesWithin',
    'depicts',
    'isRecordedIn',
    'isMapLayerOf',
    'isDepictedIn',
    'isPresentIn',
    'isCarriedOutOn',
    'resultsIn'
];

const EVIDENCE_COUNTS: EvidenceCountDefinition[] = [
    {
        label: '\uc0ac\uc9c4',
        getCount: bundle => bundle.photos.length
    },
    {
        label: '\ud1a0\uce35\uc0ac\uc9c4',
        getCount: bundle => bundle.soilProfilePhotos.length
    },
    {
        label: '\ub3c4\uba74',
        getCount: bundle => bundle.drawings.length
    },
    {
        label: '\ud604\uc7a5\uba54\ubaa8',
        getCount: bundle => bundle.penMemos.length
    },
    {
        label: '\uc720\ubb3c',
        getCount: bundle => bundle.finds.length
    },
    {
        label: '\uc2dc\ub8cc',
        getCount: bundle => bundle.samples.length
    },
    {
        label: '\ud53c\ud2b8',
        getCount: bundle => bundle.featureSegments.length
    },
    {
        label: '\ud1a0\uce35',
        getCount: bundle => bundle.layers.length
    }
];

const EVIDENCE_DETAILS: EvidenceDetailDefinition[] = [
    {
        label: '\uc0ac\uc9c4',
        getDocuments: bundle => bundle.photos,
        getSummary: getFieldworkPhotoEvidenceSummary,
        fields: [
            'fieldworkPhotoCaption',
            'fieldworkPhotoUri',
            'imageUri',
            'fileUri',
            'fieldworkPhotoAnnotationStrokes',
            'shortDescription'
        ]
    },
    {
        label: '\ud1a0\uce35\uc0ac\uc9c4',
        getDocuments: bundle => bundle.soilProfilePhotos,
        getSummary: getSoilProfilePhotoEvidenceSummary,
        fields: [
            'soilProfilePhotoUri',
            'soilProfilePhotoAnnotationStrokes',
            'soilProfileAnnotationStrokes',
            'soilProfileLayerMarkers',
            'soilProfileColorSwatches',
            'soilColorAssistCandidates',
            'soilProfileColorNote',
            'soilProfileCaptureNote',
            'shortDescription'
        ]
    },
    {
        label: '\ub3c4\uba74',
        getDocuments: bundle => bundle.drawings,
        getSummary: getDrawingEvidenceSummary,
        fields: ['shortDescription', 'fileUri', 'imageUri', 'fieldworkPhotoUri', 'drawingSketchStrokes']
    },
    {
        label: '\ud604\uc7a5\uba54\ubaa8',
        getDocuments: bundle => bundle.penMemos,
        getSummary: getPenMemoEvidenceSummary,
        fields: ['penMemoReviewedTranscript', 'penMemoAutoTranscript', 'description', 'shortDescription']
    },
    {
        label: '\uc720\ubb3c',
        getDocuments: bundle => bundle.finds,
        getSummary: getFindEvidenceSummary,
        fields: FIND_EVIDENCE_SUMMARY_FIELDS.map(definition => definition.fieldName)
    },
    {
        label: '\uc2dc\ub8cc',
        getDocuments: bundle => bundle.samples,
        getSummary: getSampleEvidenceSummary,
        fields: SAMPLE_EVIDENCE_SUMMARY_FIELDS.map(definition => definition.fieldName)
    },
    {
        label: '\ud53c\ud2b8',
        getDocuments: bundle => bundle.featureSegments,
        fields: ['shortDescription', 'description', 'featureGeometryRevisionNote']
    },
    {
        label: '\ud1a0\uce35',
        getDocuments: bundle => bundle.layers,
        fields: ['shortDescription', 'description', 'soilColorMunsellManual', 'soilColorAssistCandidates']
    }
];


export function validateKoreanFieldworkReportHandoffCandidate(
        resource: NewResource|undefined,
        documents: Document[] = []
): KoreanFieldworkReportHandoffValidation {

    const category = getPrintableValue(resource?.category);
    if (!resource || !category || !isKoreanFieldworkReportHandoffCategory(category)) {
        return {
            status: 'not-applicable',
            category,
            categoryLabel: category ? getCategoryLabel(category) : undefined,
            isReportHandoffCategory: false,
            isCopyable: false,
            message: KO.NOT_REPORT_HANDOFF,
            messages: [],
            relatedFields: [],
            evidenceCount: 0,
            issueCount: 0
        };
    }

    const document = makeDraftDocument(resource);
    const reportDocuments = documents
        .filter(candidate => candidate.resource.id !== document.resource.id)
        .concat(document);
    const item = makeKoreanFieldworkReportHandoff(reportDocuments)
        .items.find(candidate => candidate.documentId === document.resource.id);
    const messages = getValidationMessages(resource, item);
    const relatedFields = getValidationRelatedFields(resource, messages);
    const status = !item
        ? 'review'
        : messages.length > 0 || item.issueCount > 0
            ? 'review'
            : 'ready';

    return {
        status,
        documentId: document.resource.id,
        category,
        categoryLabel: getCategoryLabel(category),
        identifier: getDocumentIdentifier(document),
        isReportHandoffCategory: true,
        isCopyable: !!item,
        message: getValidationMessage(status, item, messages),
        messages,
        relatedFields,
        evidenceCount: item?.evidenceCount ?? 0,
        issueCount: (item?.issueCount ?? 0) + messages.length,
        copyText: item?.copyText
    };
}


export function makeKoreanFieldworkReportHandoff(documents: Document[]): KoreanFieldworkReportHandoff {

    const items = documents
        .filter(isReportHandoffDocument)
        .map(document => makeReportHandoffItem(document, documents))
        .sort(compareReportHandoffItems);

    return {
        items,
        readyCount: items.filter(item => item.tone === 'ready').length,
        reviewCount: items.filter(item => item.tone === 'review').length,
        issueCount: items.reduce((count, item) => count + item.issueCount, 0),
        copyAllText: normalizeKoreanFieldworkHwpPlainText(items.map(item => item.copyText).join('\n\n'))
    };
}


function makeDraftDocument(resource: NewResource): Document {

    const resourceId = getPrintableValue(resource.id)
        ?? `__korean-fieldwork-draft-${getPrintableValue(resource.category) ?? 'record'}__`;

    return {
        _id: resourceId,
        resource: {
            ...resource,
            id: resourceId,
            relations: resource.relations ?? {}
        },
        created: {} as any,
        modified: []
    };
}


function getValidationMessages(
        resource: NewResource,
        item: KoreanFieldworkReportHandoffItem|undefined
): string[] {

    const messages: string[] = [];
    const category = getPrintableValue(resource.category);

    if (!item) {
        messages.push('\ub370\uc2a4\ud06c\ud1b1 \ubcf4\uace0\uc11c \ud0ed\uc5d0\uc11c \ubcf5\uc0ac \ube14\ub85d\uc744 \ub9cc\ub4e4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.');
    }
    if (!getPrintableValue(resource.identifier) && !getPrintableValue(resource.reportIdentifier)) {
        messages.push('\ubcf4\uace0\uc11c\uc5d0\uc11c \uad6c\ubd84\ud560 \uae30\ub85d \ubc88\ud638/\uc774\ub984\uc774 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }
    if (!hasPrintableField(resource, SUMMARY_FIELDS)) {
        messages.push('HWP \ubcf5\uc0ac \ubb38\uc7a5\uc5d0 \ub4e4\uc5b4\uac08 \uc694\uc57d \uae30\ub85d\uc774 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }
    if (category && RELATION_REQUIRED_CATEGORIES.includes(category) && !hasAnyRelation(resource)) {
        messages.push('\uc0c1\uc704 \uc870\uc0ac\uad6c\uc5ed/\uc720\uad6c\ub098 \uadfc\uac70 \ub300\uc0c1\uacfc\uc758 \uad00\uacc4\uac00 \uc5c6\uc5b4 \ub370\uc2a4\ud06c\ud1b1\uc5d0\uc11c \ubb36\uc74c\uc73c\ub85c \ubcf4\uae30 \uc5b4\ub835\uc2b5\ub2c8\ub2e4.');
    }
    if (category && MEDIA_URI_FIELDS[category] && !hasPrintableField(resource, MEDIA_URI_FIELDS[category])) {
        messages.push('\uc0ac\uc9c4/\ub3c4\uba74 \uc6d0\ubcf8 \uacbd\ub85c\ub098 \uc2a4\ucf00\uce58 \ub370\uc774\ud130\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }
    if (category === 'PenMemo' && !hasPenMemoContent(resource)) {
        messages.push('\ud604\uc7a5\uba54\ubaa8 \ub0b4\uc6a9\uc774\ub098 \ud544\uae30 \uc2a4\ud2b8\ub85c\ud06c\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
    }

    return messages;
}


function getValidationRelatedFields(resource: NewResource, messages: string[]): string[] {

    if (messages.length === 0) return [];

    const category = getPrintableValue(resource.category);
    const fields = [
        'identifier',
        'reportIdentifier',
        'relations',
        ...SUMMARY_FIELDS
    ];

    if (category && MEDIA_URI_FIELDS[category]) fields.push(...MEDIA_URI_FIELDS[category]);
    if (category === 'PenMemo') fields.push(...PEN_MEMO_CONTENT_FIELDS);
    if (category === DAILY_LOG_CATEGORY) fields.push(...DAILY_LOG_DETAIL_FIELDS);
    if (category === FIELD_RECORD_QUALITY_REVIEW_CATEGORY) {
        fields.push(...FIELD_RECORD_QUALITY_REVIEW_DETAIL_FIELDS);
    }

    return Array.from(new Set(fields));
}


function getValidationMessage(
        status: KoreanFieldworkReportHandoffValidationStatus,
        item: KoreanFieldworkReportHandoffItem|undefined,
        messages: string[]
): string {

    if (status === 'not-applicable') return KO.NOT_REPORT_HANDOFF;
    if (status === 'ready') return `${KO.CHECKED_FOR_DESKTOP}: ${KO.REPORT_HANDOFF_READY}`;

    const issueCount = (item?.issueCount ?? 0) + messages.length;

    return `${KO.CHECKED_FOR_DESKTOP}: ${KO.REVIEW_NEEDED} ${issueCount}`;
}


function hasPrintableField(resource: NewResource, fieldNames: string[]): boolean {

    return fieldNames.some(fieldName => {
        const value = getHandoffPrintableFieldValue(resource, fieldName);
        return !!value && value !== '[]';
    });
}


function getHandoffPrintableFieldValue(resource: NewResource, fieldName: string): string|undefined {

    if (fieldName === 'featureLocationSketch') {
        return getStrokeEvidenceLabel('\uc704\uce58 \uc57d\ub3c4', resource.featureLocationSketch);
    }

    if (fieldName === 'featureFreeDrawingStrokes') {
        return getStrokeEvidenceLabel('\uc790\uc720 \uc2a4\ucf00\uce58', resource.featureFreeDrawingStrokes);
    }

    if (fieldName === 'drawingSketchStrokes') {
        return getStrokeEvidenceLabel('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58', resource.drawingSketchStrokes);
    }

    if (fieldName === 'dailyLogContent') {
        return getDailyLogListLabel(
            '\uc77c\uc9c0 \ub0b4\uc6a9',
            resource.dailyLogContent,
            DAILY_LOG_CONTENT_LABELS
        );
    }

    if (fieldName === 'dailyLogBoundaryMemoStrokes') {
        return getStrokeEvidenceLabel(
            '\uc791\uc5c5\uc77c\uc9c0 \uacbd\uacc4 \uba54\ubaa8',
            resource.dailyLogBoundaryMemoStrokes
        );
    }

    if (fieldName === 'fieldNote') {
        return getFieldNoteSummary(resource.fieldNote);
    }

    if (fieldName === 'featureInvestigationChecklist') {
        return getKoreanFieldworkFeatureInvestigationChecklistSummary(resource.featureInvestigationChecklist);
    }

    if (fieldName === 'period') {
        return getKoreanFieldworkFeaturePeriodSummary(resource.period);
    }

    if (KOREAN_FIELDWORK_LABELLED_RECORD_FIELDS.includes(fieldName)
            || isKoreanFieldworkRecordValuelistField(fieldName)) {
        return getKoreanFieldworkRecordFieldValueSummary(fieldName, resource[fieldName]);
    }

    return getPrintableValue(resource[fieldName]);
}


function hasPenMemoContent(resource: NewResource): boolean {

    return hasPrintableField(resource, PEN_MEMO_CONTENT_FIELDS.filter(fieldName => fieldName !== 'penMemoStrokes'))
        || hasStrokeEvidence(resource.penMemoStrokes);
}


function hasAnyRelation(resource: NewResource): boolean {

    return Object.values(resource.relations ?? {})
        .some(relationTargets => Array.isArray(relationTargets) && relationTargets.length > 0);
}


function makeReportHandoffItem(document: Document, documents: Document[]): KoreanFieldworkReportHandoffItem {

    const bundle = buildEvidenceBundle(document, documents);
    const categoryLabel = getCategoryLabel(document.resource.category);
    const identifier = getDocumentIdentifier(document);
    const summary = getSummary(document, categoryLabel);
    const details = getDetailLines(document);
    const relationDetails = getRelationDetails(document, documents);
    const evidenceLabel = getEvidenceLabel(bundle);
    const evidenceDetails = getEvidenceDetails(bundle);
    const issues = getReportHandoffIssues(bundle);
    const issueDetails = getIssueDetails(issues);
    const issueCount = issues.length;
    const issueLabel = issueCount > 0
        ? `${KO.REVIEW_NEEDED} ${issueCount}`
        : KO.NO_ISSUES;
    const title = `${categoryLabel} ${identifier}`;
    const tone: KoreanFieldworkReportHandoffTone = issueCount > 0 ? 'review' : 'ready';
    const copyTextParts = {
        categoryLabel,
        details,
        evidenceDetails,
        evidenceLabel,
        identifier,
        issueDetails,
        issueLabel,
        relationDetails,
        summary
    };

    return {
        documentId: document.resource.id,
        category: document.resource.category,
        categoryLabel,
        identifier,
        title,
        summary,
        details,
        relationDetails,
        evidenceLabel,
        evidenceDetails,
        issueLabel,
        issueDetails,
        evidenceCount: getEvidenceCount(bundle),
        issueCount,
        copySections: makeCopySections(copyTextParts),
        copyText: makeCopyText(copyTextParts),
        tone
    };
}


interface ReportHandoffCopyTextParts {
    categoryLabel: string;
    details: string[];
    evidenceDetails: string[];
    evidenceLabel: string;
    identifier: string;
    issueDetails: string[];
    issueLabel: string;
    relationDetails: string[];
    summary: string;
}


function makeCopyText({
    categoryLabel,
    details,
    evidenceDetails,
    evidenceLabel,
    identifier,
    issueDetails,
    issueLabel,
    relationDetails,
    summary
}: ReportHandoffCopyTextParts): string {

    return normalizeKoreanFieldworkHwpPlainText([
        `[${categoryLabel}] ${identifier}`,
        `${KO.SUMMARY}: ${summary}`,
        `${KO.DETAILS}: ${details.length > 0 ? details.join(' / ') : KO.NO_DETAILS}`,
        ...(relationDetails.length > 0 ? [`${KO.RELATIONS}: ${relationDetails.join(' / ')}`] : []),
        `${KO.EVIDENCE}: ${evidenceLabel}`,
        ...(evidenceDetails.length > 0 ? [makeListBlock(KO.EVIDENCE_DETAILS, evidenceDetails)] : []),
        `${KO.ISSUES}: ${issueLabel}`,
        ...(issueDetails.length > 0 ? [makeListBlock(KO.ISSUE_DETAILS, issueDetails)] : [])
    ].join('\n'));
}


function makeCopySections({
    categoryLabel,
    details,
    evidenceDetails,
    evidenceLabel,
    identifier,
    issueDetails,
    issueLabel,
    relationDetails,
    summary
}: ReportHandoffCopyTextParts): KoreanFieldworkReportHandoffCopySection[] {

    return [
        makeCopySection('body', KO.BODY, [
            makeBodyCopyText({ categoryLabel, identifier, summary })
        ]),
        makeCopySection('summary', KO.SUMMARY, [
            `[${categoryLabel}] ${identifier}`,
            `${KO.SUMMARY}: ${summary}`
        ]),
        makeCopySection('details', KO.DETAILS, [
            `${KO.DETAILS}: ${details.length > 0 ? details.join(' / ') : KO.NO_DETAILS}`
        ]),
        ...(relationDetails.length > 0
            ? [makeCopySection('relations', KO.RELATIONS, [
                `${KO.RELATIONS}: ${relationDetails.join(' / ')}`
            ])]
            : []),
        makeCopySection('evidence', KO.EVIDENCE, [
            `${KO.EVIDENCE}: ${evidenceLabel}`,
            ...(evidenceDetails.length > 0 ? [makeListBlock(KO.EVIDENCE_DETAILS, evidenceDetails)] : [])
        ]),
        makeCopySection('issues', KO.ISSUES, [
            `${KO.ISSUES}: ${issueLabel}`,
            ...(issueDetails.length > 0 ? [makeListBlock(KO.ISSUE_DETAILS, issueDetails)] : [])
        ])
    ];
}


function makeBodyCopyText({
    categoryLabel,
    identifier,
    summary
}: Pick<ReportHandoffCopyTextParts, 'categoryLabel'|'identifier'|'summary'>): string {

    return `${categoryLabel} ${identifier}: ${summary}`;
}


function makeCopySection(
        id: KoreanFieldworkReportHandoffCopySectionId,
        label: string,
        lines: string[]
): KoreanFieldworkReportHandoffCopySection {

    const copyText = normalizeKoreanFieldworkHwpPlainText(lines.join('\n'));

    return {
        id,
        label,
        copyText,
        lineCount: copyText ? copyText.split('\r\n').length : 0
    };
}


function isReportHandoffDocument(document: Document): boolean {

    return !!document?.resource?.id
        && isKoreanFieldworkReportHandoffCategory(document.resource.category);
}


function getSummary(document: Document, categoryLabel: string): string {

    const mediaSummary = getMediaRecordSummary(document);
    if (mediaSummary) return truncate(mediaSummary, 180);

    const qualityReviewSummary = getFieldRecordQualityReviewSummary(document);
    if (qualityReviewSummary) return truncate(qualityReviewSummary, 180);

    for (const fieldName of SUMMARY_FIELDS) {
        const value = getSummaryFieldValue(document, fieldName);
        if (value) return truncate(value, 180);
    }

    return `${categoryLabel} ${KO.RECORD}`;
}


function getSummaryFieldValue(document: Document, fieldName: string): string|undefined {

    if (fieldName === 'featureLocationSketch') {
        return getStrokeEvidenceLabel('\uc704\uce58 \uc57d\ub3c4', document.resource.featureLocationSketch);
    }

    if (fieldName === 'featureFreeDrawingStrokes') {
        return getStrokeEvidenceLabel('\uc790\uc720 \uc2a4\ucf00\uce58', document.resource.featureFreeDrawingStrokes);
    }

    if (fieldName === 'dailyLogContent') {
        return getDailyLogListLabel(
            '\uc77c\uc9c0 \ub0b4\uc6a9',
            document.resource.dailyLogContent,
            DAILY_LOG_CONTENT_LABELS
        );
    }

    if (fieldName === 'dailyLogBoundaryMemoStrokes') {
        return getStrokeEvidenceLabel(
            '\uc791\uc5c5\uc77c\uc9c0 \uacbd\uacc4 \uba54\ubaa8',
            document.resource.dailyLogBoundaryMemoStrokes
        );
    }

    if (fieldName === 'fieldNote') {
        return getFieldNoteSummary(document.resource.fieldNote);
    }

    if (isKoreanFieldworkRecordValuelistField(fieldName)) {
        return getKoreanFieldworkRecordFieldValueSummary(fieldName, document.resource[fieldName]);
    }

    return getPrintableValue(document.resource[fieldName]);
}


function getDetailLines(document: Document): string[] {

    return DETAIL_FIELDS
        .map(definition => getDetailLine(document, definition))
        .filter((line): line is string => line !== undefined)
        .slice(0, 6);
}


function getDetailLine(document: Document, definition: DetailFieldDefinition): string|undefined {

    const summary = definition.getSummary?.(document);
    if (summary) return `${definition.label}: ${summary}`;

    const values = definition.fields
        .map(fieldName => getHandoffPrintableFieldValue(document.resource, fieldName))
        .filter((value): value is string => !!value);

    if (values.length === 0) return undefined;

    return `${definition.label}: ${values.join(', ')}`;
}


function getMediaRecordSummary(document: Document): string|undefined {

    switch (document.resource.category) {
        case 'Photo':
            return getFieldworkPhotoEvidenceSummary(document);
        case 'SoilProfilePhoto':
            return getSoilProfilePhotoEvidenceSummary(document);
        case 'Drawing':
            return getDrawingEvidenceSummary(document);
        default:
            return undefined;
    }
}


function getMediaDetailSummary(document: Document): string|undefined {

    return getMediaRecordSummary(document);
}


function getFeatureTypeDetailSummary(document: Document): string|undefined {

    const featureTypeLabels = getListValues(document.resource.featureType)
        .map(value => getKoreanFieldworkFeatureTypeLabel(value) ?? value);
    const interpretationLabels = getListValues(document.resource.featureInterpretationType)
        .map(value => getKoreanFieldworkFeatureTypeLabelFromInterpretationType(value) ?? value);
    const featureAttributeSummaries = getKoreanFieldworkFeatureAttributeSummaries(document.resource);
    const featureAttributeSummary = featureAttributeSummaries.length > 0
        ? `\uc720\ud615\ubcc4 \ud655\uc778: ${featureAttributeSummaries.join(', ')}`
        : undefined;

    return Array.from(new Set([...featureTypeLabels, ...interpretationLabels, featureAttributeSummary]))
        .filter(value => !!value && value !== '[]')
        .join(', ') || undefined;
}


function getPeriodDetailSummary(document: Document): string|undefined {

    return [
        getKoreanFieldworkFeaturePeriodSummary(document.resource.period),
        getPrintableValue(document.resource.dating)
    ].filter((value): value is string => !!value).join(', ') || undefined;
}


function getInvestigationStatusDetailSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue(
            '\uc720\uad6c \uc9c4\ud589',
            getKoreanFieldworkRecordFieldValueSummary(
                'featureRecordingStatus',
                document.resource.featureRecordingStatus
            )
        ),
        getLabeledEvidenceValue(
            '\uae30\ub85d \uc2dc\uc810',
            getKoreanFieldworkRecordFieldValueSummary(
                'recordCreationTiming',
                document.resource.recordCreationTiming
            )
        ),
        getLabeledEvidenceValue(
            '\uae30\ub85d \uad6c\ubd84',
            getKoreanFieldworkRecordFieldValueSummary(
                'fieldRecordQuality',
                document.resource.fieldRecordQuality
            )
        ),
        getLabeledEvidenceValue(
            '\ud655\uc778 \uc0c1\ud0dc',
            getKoreanFieldworkRecordFieldValueSummary(
                'verificationState',
                document.resource.verificationState
            )
        ),
        getLabeledEvidenceValue(
            '\ud604\uc7a5\uc2dc\uc810 \ub204\ub77d\uc810\uac80',
            getKoreanFieldworkRecordFieldValueSummary(
                'fieldOnlyMissingCheck',
                document.resource.fieldOnlyMissingCheck
            )
        ),
        getLabeledEvidenceValue(
            '\ucd5c\ucd08 \ub178\ucd9c \uae30\ub85d',
            getKoreanFieldworkRecordFieldValueSummary(
                'firstExposureRecord',
                document.resource.firstExposureRecord
            )
        ),
        getLabeledEvidenceValue(
            '\uc870\uc0ac \ub2e8\uacc4 \ud655\uc778',
            getKoreanFieldworkFeatureInvestigationChecklistSummary(
                document.resource.featureInvestigationChecklist
            )
        )
    ].filter((value): value is string => !!value).join(', ') || undefined;
}


function getLocationDrawingDetailSummary(document: Document): string|undefined {

    return [
        ...[
            'geometrySource',
            'geometryConfidence',
            'featureGeometryEditStatus',
            'featureGeometryRevisionNote',
            'surveyBoundaryAccuracy',
            'surveyBoundarySource'
        ].map(fieldName => getHandoffPrintableFieldValue(document.resource, fieldName)),
        getStrokeEvidenceLabel('\uc704\uce58 \uc57d\ub3c4', document.resource.featureLocationSketch),
        getStrokeEvidenceLabel('\uc790\uc720 \uc2a4\ucf00\uce58', document.resource.featureFreeDrawingStrokes)
    ].filter((value): value is string => !!value).join(', ') || undefined;
}


function getDailyLogDetailSummary(document: Document): string|undefined {

    if (document.resource.category !== DAILY_LOG_CATEGORY) return undefined;

    return [
        getDailyLogPersonnelLabel(document),
        getDailyLogEquipmentLabel(document),
        getDailyLogSafetyLabel(document),
        getDailyLogListLabel('\ub0b4\uc6a9', document.resource.dailyLogContent, DAILY_LOG_CONTENT_LABELS),
        getDailyLogListLabel('\uadfc\uac70', document.resource.dailyLogEvidenceRole, DAILY_LOG_EVIDENCE_ROLE_LABELS),
        getDailyLogListLabel('\uac80\ud1a0', document.resource.dailyLogReview, DAILY_LOG_REVIEW_LABELS),
        getStrokeEvidenceLabel(
            '\uc791\uc5c5\uc77c\uc9c0 \uacbd\uacc4 \uba54\ubaa8',
            document.resource.dailyLogBoundaryMemoStrokes
        ),
        getLabeledEvidenceValue(
            '\uacbd\uacc4 \uac00\uc838\uc634',
            getDateOnlyLabel(document.resource.dailyLogBoundaryMemoImportedAt)
        ),
        getLabeledEvidenceValue(
            '\uacbd\uacc4 \uc218\uc815',
            getDateOnlyLabel(document.resource.dailyLogBoundaryMemoUpdatedAt)
        ),
        getLabeledEvidenceValue(
            '\uc791\uc5c5\uc77c\uc9c0 \uc218\uc815',
            getDateOnlyLabel(document.resource.dailyLogWorkMemoUpdatedAt)
        )
    ].filter((value): value is string => !!value).join(', ') || undefined;
}


function getFieldRecordQualityReviewSummary(document: Document): string|undefined {

    if (document.resource.category !== FIELD_RECORD_QUALITY_REVIEW_CATEGORY) return undefined;

    return [
        getLabeledEvidenceValue(
            '\uac80\ud1a0 \ub300\uc0c1',
            getKoreanFieldworkRecordFieldValueSummary(
                'reviewedRecordUnit',
                document.resource.reviewedRecordUnit
            )
        ),
        getLabeledEvidenceValue(
            '\uac80\ud1a0 \ub2e8\uacc4',
            getKoreanFieldworkRecordFieldValueSummary(
                'qualityReviewStage',
                document.resource.qualityReviewStage
            )
        ),
        getLabeledEvidenceValue(
            '\uc218\uc815\u00b7\ubcf4\uc644 \uadfc\uac70',
            getKoreanFieldworkRecordFieldValueSummary(
                'qualityCorrectionBasis',
                document.resource.qualityCorrectionBasis
            )
        )
    ].filter((value): value is string => !!value).join(', ') || undefined;
}


function getFieldRecordQualityReviewDetailSummary(document: Document): string|undefined {

    if (document.resource.category !== FIELD_RECORD_QUALITY_REVIEW_CATEGORY) return undefined;

    return [
        getFieldRecordQualityReviewSummary(document),
        getLabeledEvidenceValue(
            '\uae30\ub85d \uc2dc\uc810',
            getKoreanFieldworkRecordFieldValueSummary(
                'recordCreationTiming',
                document.resource.recordCreationTiming
            )
        ),
        getLabeledEvidenceValue(
            '\uae30\ub85d \uad6c\ubd84',
            getKoreanFieldworkRecordFieldValueSummary(
                'fieldRecordQuality',
                document.resource.fieldRecordQuality
            )
        ),
        getLabeledEvidenceValue(
            '\ubcf4\uace0\uc11c \ub300\uc870',
            getKoreanFieldworkRecordFieldValueSummary(
                'reportCrossCheck',
                document.resource.reportCrossCheck
            )
        ),
        getLabeledEvidenceValue(
            '\ud3c9\uac00 \ud658\ub958',
            getKoreanFieldworkRecordFieldValueSummary(
                'reportEvaluationFeedback',
                document.resource.reportEvaluationFeedback
            )
        ),
        getLabeledEvidenceValue(
            '\ud655\uc778 \uc0c1\ud0dc',
            getKoreanFieldworkRecordFieldValueSummary(
                'verificationState',
                document.resource.verificationState
            )
        )
    ].filter((value): value is string => !!value).join(', ') || undefined;
}


function getDailyLogPersonnelLabel(document: Document): string|undefined {

    const investigatorCount = getPrintableValue(document.resource.dailyLogInvestigatorCount);
    const laborerCount = getPrintableValue(document.resource.dailyLogLaborerCount);
    const totalCount = getDailyLogPersonnelTotal(
        document.resource.dailyLogInvestigatorCount,
        document.resource.dailyLogLaborerCount,
        document.resource.dailyLogWorkerCount
    );
    const parts = [
        investigatorCount ? `\uc870\uc0ac\uc6d0 ${investigatorCount}\uba85` : undefined,
        laborerCount ? `\uc778\ubd80 ${laborerCount}\uba85` : undefined,
        totalCount ? `\ud22c\uc785 ${totalCount}\uba85` : undefined
    ].filter((value): value is string => !!value);

    return parts.length > 0 ? `\uc778\uc6d0: ${parts.join(' / ')}` : undefined;
}


function getDailyLogPersonnelTotal(investigatorCount: any, laborerCount: any, workerCount: any): number|undefined {

    const explicitWorkerCount = getNumberValue(workerCount);
    if (explicitWorkerCount !== undefined) return explicitWorkerCount;

    const counts = [investigatorCount, laborerCount]
        .map(getNumberValue)
        .filter((value): value is number => value !== undefined);

    return counts.length > 0 ? counts.reduce((sum, value) => sum + value, 0) : undefined;
}


function getDailyLogEquipmentLabel(document: Document): string|undefined {

    const count = getPrintableValue(document.resource.dailyLogEquipmentCount);
    const size = getPrintableValue(document.resource.dailyLogEquipmentSize);
    const parts = [
        count ? `${count}\ub300` : undefined,
        size
    ].filter((value): value is string => !!value);

    return parts.length > 0 ? `\uc7a5\ube44: ${parts.join(' / ')}` : undefined;
}


function getDailyLogSafetyLabel(document: Document): string|undefined {

    const photoLabel = getBooleanCompletionLabel('\uc0ac\uc9c4', document.resource.dailyLogSafetyEducationPhoto);
    const stretchingLabel = getBooleanCompletionLabel(
        '\uccb4\uc870',
        document.resource.dailyLogSafetyEducationStretching
    );
    const parts = [photoLabel, stretchingLabel].filter((value): value is string => !!value);

    return parts.length > 0 ? `\uc548\uc804\uad50\uc721: ${parts.join(' / ')}` : undefined;
}


function getBooleanCompletionLabel(label: string, value: any): string|undefined {

    const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : value;
    if (normalizedValue === true || normalizedValue === 'true') return `${label} \uc644\ub8cc`;
    if (normalizedValue === false || normalizedValue === 'false') return `${label} \ubbf8\ud655\uc778`;

    return undefined;
}


function getDailyLogListLabel(label: string,
                              value: any,
                              labels: Readonly<Record<string, string>>): string|undefined {

    const values = getListValues(value)
        .map(item => labels[item] ?? item)
        .filter(item => !!item && item !== '[]');

    return values.length > 0 ? `${label}: ${values.join(' \u00b7 ')}` : undefined;
}


function getListValues(value: any): string[] {

    if (value === undefined || value === null) return [];

    if (Array.isArray(value)) return value.flatMap(getListValues);

    if (typeof value === 'object') {
        if (typeof value.inputValue === 'string') return getListValues(value.inputValue);
        if (typeof value.value === 'string') return getListValues(value.value);

        return [];
    }

    const text = String(value).trim();
    if (!text || text === '[]') return [];

    const parsed = parseJsonValue(text);
    if (parsed !== undefined) return getListValues(parsed);

    return text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => !!line);
}


function getNumberValue(value: any): number|undefined {

    const text = getPrintableValue(value);
    if (!text) return undefined;

    const numberValue = Number(text);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}


function getDateOnlyLabel(value: any): string|undefined {

    const text = getPrintableValue(value);
    if (!text) return undefined;

    const match = text.match(/\d{4}-\d{2}-\d{2}/);
    return match?.[0] ?? text;
}


function getFieldNoteDetailSummary(document: Document): string|undefined {

    const summaryParts = getFieldNoteSummaryParts(document.resource.fieldNote);
    const interpretation = getLabeledEvidenceValue(
        FIELD_NOTE_SECTION_LABELS.interpretation,
        getPrintableValue(document.resource.interpretation)
    );
    const parts = interpretation
        ? Array.from(new Set([...summaryParts, interpretation]))
        : summaryParts;

    return parts.join(', ') || undefined;
}


function getFieldNoteSummary(value: any): string|undefined {

    return getFieldNoteSummaryParts(value)[0];
}


function getFieldNoteSummaryParts(value: any): string[] {

    const parsed = parseFieldNote(value);
    const sectionParts = ([
        'observation',
        'interpretation',
        'nextWork',
        'evidenceNumbers'
    ] as KoreanFieldworkFieldNoteSectionId[])
        .map(sectionId => getLabeledEvidenceValue(
            FIELD_NOTE_SECTION_LABELS[sectionId],
            getPrintableValue(parsed.sections[sectionId])
        ))
        .filter((item): item is string => !!item);
    const fallback = parsed.fallbackLines.length > 0
        ? getLabeledEvidenceValue('\uba54\ubaa8', parsed.fallbackLines.join(' / '))
        : undefined;
    const handwriting = getFieldNoteHandwritingLabel(parsed);

    return [
        ...sectionParts,
        fallback,
        handwriting
    ].filter((item): item is string => !!item);
}


function parseFieldNote(value: any): {
    fallbackLines: string[];
    hasHandwritingEvidence: boolean;
    handwritingSummary?: string;
    sections: Record<KoreanFieldworkFieldNoteSectionId, string>;
} {

    return parseKoreanFieldworkFieldNote(value, { omitJsonLines: true });
}


function getFieldNoteHandwritingLabel(parsed: ReturnType<typeof parseFieldNote>): string|undefined {

    if (parsed.handwritingSummary) {
        return `${FIELD_NOTE_HANDWRITING_SUMMARY_LABEL}: ${parsed.handwritingSummary}`;
    }

    return parsed.hasHandwritingEvidence
        ? `${FIELD_NOTE_HANDWRITING_SUMMARY_LABEL}: \uc788\uc74c`
        : undefined;
}


function isLikelyJsonText(value: string): boolean {

    const text = value.trim();
    if (!text) return false;
    if (!['{', '['].includes(text[0])) return false;

    return parseJsonValue(text) !== undefined;
}


function getRelationDetails(document: Document, documents: Document[]): string[] {

    const documentsById = new Map(documents.map(candidate => [candidate.resource.id, candidate]));
    const relations = document.resource.relations ?? {};

    return Object.keys(relations)
        .filter(relationName => Array.isArray(relations[relationName]) && relations[relationName].length > 0)
        .sort(compareRelationNames)
        .map(relationName => getRelationDetailLine(relationName, relations[relationName], documentsById))
        .filter((line): line is string => line !== undefined);
}


function getRelationDetailLine(
        relationName: string,
        targetIds: string[],
        documentsById: Map<string, Document>
): string|undefined {

    const targets = targetIds
        .map(targetId => getRelatedDocumentLabel(targetId, documentsById))
        .filter((target): target is string => !!target);

    return targets.length > 0
        ? `${getKoreanFieldworkRelationLabel(relationName)}: ${targets.join(', ')}`
        : undefined;
}


function getRelatedDocumentLabel(targetId: string, documentsById: Map<string, Document>): string {

    const targetDocument = documentsById.get(targetId);
    if (!targetDocument) return targetId;

    return `[${getCategoryLabel(targetDocument.resource.category)}] ${getDocumentIdentifier(targetDocument)}`;
}


function getEvidenceLabel(bundle: EvidenceBundle): string {

    const labels = EVIDENCE_COUNTS
        .map(definition => {
            const count = definition.getCount(bundle);
            return count > 0 ? `${definition.label} ${count}` : undefined;
        })
        .filter((label): label is string => label !== undefined);

    return labels.length > 0 ? labels.join(', ') : KO.NO_EVIDENCE;
}


function getEvidenceDetails(bundle: EvidenceBundle): string[] {

    return EVIDENCE_DETAILS.flatMap(definition =>
        definition.getDocuments(bundle)
            .map(document => getEvidenceDetailLine(document, definition))
    );
}


function getEvidenceDetailLine(document: Document, definition: EvidenceDetailDefinition): string {

    const identifier = getDocumentIdentifier(document);
    const summary = definition.getSummary?.(document)
        ?? getEvidenceDetailSummary(document, definition.fields);

    return summary
        ? `${definition.label} ${identifier}: ${summary}`
        : `${definition.label} ${identifier}`;
}


function getFieldworkPhotoEvidenceSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue('\uc124\uba85', getPrintableValue(document.resource.fieldworkPhotoCaption)),
        getLabeledEvidenceValue('\uc6d0\ubcf8', getFirstPrintableField(document, [
            'fieldworkPhotoUri',
            'imageUri',
            'fileUri'
        ])),
        getPhotoReportMetadataSummary(document, 'fieldworkPhotoCapturedAt'),
        getStrokeEvidenceLabel('\uc0ac\uc9c4 \ud45c\uc2dc', document.resource.fieldworkPhotoAnnotationStrokes),
        getLabeledEvidenceValue('\uc694\uc57d', getPrintableValue(document.resource.shortDescription))
    ].filter((value): value is string => !!value).join(' / ') || undefined;
}


function getSoilProfilePhotoEvidenceSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue('\uc6d0\ubcf8', getFirstPrintableField(document, [
            'soilProfilePhotoUri',
            'imageUri',
            'fieldworkPhotoUri'
        ])),
        getPhotoReportMetadataSummary(document, 'soilProfilePhotoCapturedAt'),
        getStrokeEvidenceLabel('\uc0ac\uc9c4 \ud45c\uc2dc', document.resource.soilProfilePhotoAnnotationStrokes),
        getStrokeEvidenceLabel('\ud1a0\uce35\uc120 \ud45c\uc2dc', document.resource.soilProfileAnnotationStrokes),
        getStrokeEvidenceLabel('\uce35 \ubc88\ud638 \ud45c\uc2dc', document.resource.soilProfileLayerMarkers),
        getLabeledEvidenceValue('\uce35\ubcc4 \ud1a0\uc0c9', getPrintableValue(
            document.resource.soilProfileColorSwatches
        )),
        getLabeledEvidenceValue('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58', getSoilColorSampleSourceLabel(
            document.resource.soilColorAssistCandidates,
            document.resource.soilProfileColorSwatches
        )),
        getLabeledEvidenceValue('\ud1a0\uc0c9 \uba54\ubaa8', getPrintableValue(
            document.resource.soilProfileColorNote
        )),
        getLabeledEvidenceValue('\ucd2c\uc601 \uba54\ubaa8', getPrintableValue(
            document.resource.soilProfileCaptureNote
        )),
        getLabeledEvidenceValue('\uc694\uc57d', getPrintableValue(document.resource.shortDescription))
    ].filter((value): value is string => !!value).join(' / ') || undefined;
}


function getPhotoReportMetadataSummary(document: Document, capturedAtField: string): string|undefined {

    const parts = [
        getLabeledEvidenceValue('\uc6d0\ubcf8 \ud30c\uc77c', getPrintableValue(document.resource.originalFilename)),
        getLabeledEvidenceValue('\ucd2c\uc601', getPhotoCapturedAtLabel(document.resource[capturedAtField])),
        getLabeledEvidenceValue('\ud06c\uae30', getImageSizeLabel(document.resource.width, document.resource.height))
    ].filter((value): value is string => !!value);

    return parts.length > 0 ? parts.join(', ') : undefined;
}


function getPhotoCapturedAtLabel(value: any): string|undefined {

    const text = getPrintableValue(value);
    if (!text) return undefined;

    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
    if (!match) return text;

    return match[2] ? `${match[1]} ${match[2]}` : match[1];
}


function getImageSizeLabel(widthValue: any, heightValue: any): string|undefined {

    const width = getNumberValue(widthValue);
    const height = getNumberValue(heightValue);

    return width !== undefined && height !== undefined
        ? `${width}x${height}`
        : undefined;
}


function getDrawingEvidenceSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue('\uc694\uc57d', getPrintableValue(document.resource.shortDescription)),
        getLabeledEvidenceValue('\uc6d0\ubcf8', getFirstPrintableField(document, [
            'fileUri',
            'imageUri',
            'fieldworkPhotoUri'
        ])),
        getStrokeEvidenceLabel('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58', document.resource.drawingSketchStrokes)
    ].filter((value): value is string => !!value).join(' / ') || undefined;
}


function getPenMemoEvidenceSummary(document: Document): string|undefined {

    return [
        getLabeledEvidenceValue('\uac80\ud1a0 \ud544\uc0ac', getPrintableValue(
            document.resource.penMemoReviewedTranscript
        )),
        getLabeledEvidenceValue('\uc790\ub3d9 \ud544\uc0ac', getPrintableValue(
            document.resource.penMemoAutoTranscript
        )),
        getLabeledEvidenceValue('\uba54\ubaa8', getPrintableValue(document.resource.description)),
        getLabeledEvidenceValue('\uc694\uc57d', getPrintableValue(document.resource.shortDescription)),
        getPenMemoStrokeEvidenceLabel(document.resource.penMemoStrokes)
    ].filter((value): value is string => !!value).join(' / ') || undefined;
}


function getFindEvidenceSummary(document: Document): string|undefined {

    return getLabeledEvidenceFieldSummary(document, FIND_EVIDENCE_SUMMARY_FIELDS);
}


function getSampleEvidenceSummary(document: Document): string|undefined {

    return getLabeledEvidenceFieldSummary(document, SAMPLE_EVIDENCE_SUMMARY_FIELDS);
}


function getLabeledEvidenceFieldSummary(
        document: Document,
        definitions: LabeledEvidenceFieldDefinition[]
): string|undefined {

    return definitions
        .map(definition => getLabeledEvidenceValue(
            definition.label,
            getHandoffPrintableFieldValue(document.resource, definition.fieldName)
        ))
        .filter((value): value is string => !!value)
        .join(' / ') || undefined;
}


function getPenMemoStrokeEvidenceLabel(value: any): string|undefined {

    return getStrokeEvidenceLabel('\ud544\uae30 \uc6d0\ubcf8', value);
}


function getStrokeEvidenceLabel(label: string, value: any): string|undefined {

    return hasStrokeEvidence(value)
        ? `${label}: \uc788\uc74c`
        : undefined;
}


function hasStrokeEvidence(value: any): boolean {

    if (value === undefined || value === null) return false;

    if (typeof value === 'string') {
        const text = value.trim();
        if (!text || text === '[]' || text === '{}') return false;

        const parsed = parseJsonValue(text);
        return parsed === undefined ? true : hasStrokeEvidence(parsed);
    }

    if (Array.isArray(value)) return value.some(hasStrokeValue);

    if (typeof value === 'object') {
        if (Array.isArray(value.strokes)) return value.strokes.some(hasStrokeValue);

        return Object.keys(value)
            .filter(key => key !== 'version')
            .some(key => hasStrokeEvidence(value[key]));
    }

    return !!String(value).trim();
}


function hasStrokeValue(value: any): boolean {

    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.some(hasStrokeValue);

    if (typeof value === 'object') {
        if (Array.isArray(value.points)) return value.points.length > 0;
        return Object.keys(value).some(key => hasStrokeValue(value[key]));
    }

    return !!String(value).trim();
}


function parseJsonValue(value: string): any|undefined {

    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}


function getFirstPrintableField(document: Document, fieldNames: string[]): string|undefined {

    return fieldNames
        .map(fieldName => getPrintableValue(document.resource[fieldName]))
        .find(value => !!value && value !== '[]');
}


function getLabeledEvidenceValue(label: string, value: string|undefined): string|undefined {

    if (!value || value === '[]') return undefined;

    return `${label}: ${value}`;
}


function getSoilColorSampleSourceLabel(value: any, swatchValue?: any): string|undefined {

    const swatchLocationLabel = getSoilColorSampleLocationFromSwatches(swatchValue);
    if (swatchLocationLabel) return swatchLocationLabel;

    const sourceLine = getTextLines(value)
        .map(line => line.trim())
        .find(line => SOIL_COLOR_SAMPLE_SOURCE_PATTERN.test(line));

    return sourceLine;
}


function getSoilColorSampleLocationFromSwatches(value: any): string|undefined {

    const sharedLocations = parseSoilProfileColorSwatchRows(value)
        .map(row => row.sample ? `${row.number}\uce35: ${row.sample.label}` : undefined)
        .filter((location): location is string => !!location);
    if (sharedLocations.length > 0) return sharedLocations.join(', ');

    const locations = getTextLines(value)
        .map(line => line.trim())
        .map(line => {
            const sampleMatch = line.match(RGB_SAMPLE_LOCATION_PATTERN);
            if (!sampleMatch) return undefined;

            const rowMatch = line.match(SOIL_COLOR_ROW_NUMBER_PATTERN);
            const rowLabel = rowMatch ? `${rowMatch[1]}층: ` : '';

            return `${rowLabel}RGB ${sampleMatch[1]}/${sampleMatch[2]}/${sampleMatch[3]} @ `
                + `${sampleMatch[4]}%/${sampleMatch[5]}%`;
        })
        .filter((location): location is string => !!location);

    return locations.length > 0 ? locations.join(', ') : undefined;
}


function getTextLines(value: any): string[] {

    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.flatMap(getTextLines);

    if (typeof value === 'object') {
        if (typeof value.inputValue === 'string') return value.inputValue.split(/\r?\n/);
        if (typeof value.value === 'string') return value.value.split(/\r?\n/);
        return [];
    }

    return String(value).split(/\r?\n/);
}


function getEvidenceDetailSummary(document: Document, fieldNames: string[]): string|undefined {

    const value = fieldNames
        .map(fieldName => getPrintableValue(document.resource[fieldName]))
        .find(item => !!item && item !== '[]');

    return value ? truncate(value, 140) : undefined;
}


function getReportHandoffIssues(bundle: EvidenceBundle): KoreanFieldworkReadinessIssue[] {

    return dedupeIssues(bundle.issues.concat(
        getKoreanFieldworkCloseoutReviewIssues(getReportHandoffIssueDocuments(bundle))
    ));
}


function getReportHandoffIssueDocuments(bundle: EvidenceBundle): Document[] {

    return uniqueDocuments([
        bundle.rootDocument,
        ...bundle.featureSegments,
        ...bundle.layers,
        ...bundle.photos,
        ...bundle.soilProfilePhotos,
        ...bundle.drawings,
        ...bundle.penMemos,
        ...bundle.finds,
        ...bundle.samples,
        ...bundle.reportPreparationReviews,
        ...bundle.reportEditorialCrossChecks
    ]);
}


function getIssueDetails(issues: KoreanFieldworkReadinessIssue[]): string[] {

    return issues.map(formatReportHandoffIssueDetail);
}


function formatReportHandoffIssueDetail(issue: KoreanFieldworkReadinessIssue): string {

    return [
        getSeverityLabel(issue.severity),
        getPrintableValue(issue.identifier) ?? issue.documentId,
        '-',
        issue.message,
        '/',
        issue.recommendedAction
    ].join(' ');
}


function getSeverityLabel(severity: string): string {

    switch (severity) {
        case 'critical':
            return '\ud544\uc218';
        case 'warning':
            return '\ubcf4\uc644';
        default:
            return '\ucc38\uace0';
    }
}


function makeListBlock(label: string, items: string[]): string {

    return `${label}:\n${items.map(item => `- ${item}`).join('\n')}`;
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


function uniqueDocuments(documents: Document[]): Document[] {

    const seen = new Set<string>();

    return documents.filter(document => {
        if (seen.has(document.resource.id)) return false;

        seen.add(document.resource.id);
        return true;
    });
}


function getEvidenceCount(bundle: EvidenceBundle): number {

    return EVIDENCE_COUNTS.reduce((count, definition) => count + definition.getCount(bundle), 0);
}


function getDocumentIdentifier(document: Document): string {

    return getPrintableValue(document.resource.reportIdentifier)
        ?? getPrintableValue(document.resource.identifier)
        ?? getPrintableValue(document.resource.id)
        ?? KO.RECORD;
}


function getCategoryLabel(categoryName: string): string {

    return getKoreanFieldworkCategoryLabel(categoryName) ?? categoryName ?? KO.CATEGORY;
}


function getPrintableValue(value: any): string|undefined {

    if (value === undefined || value === null) return undefined;

    if (Array.isArray(value)) {
        const values = value
            .map(getPrintableValue)
            .filter((item): item is string => !!item);

        return values.length > 0 ? values.join(', ') : undefined;
    }

    if (typeof value === 'object') {
        if (typeof value.inputValue === 'string') return value.inputValue.trim() || undefined;
        if (typeof value.value === 'string') return value.value.trim() || undefined;
        return undefined;
    }

    const text = String(value).replace(/\s+/g, ' ').trim();

    return text.length > 0 ? text : undefined;
}


function compareReportHandoffItems(
        itemA: KoreanFieldworkReportHandoffItem,
        itemB: KoreanFieldworkReportHandoffItem
): number {

    const rankA = getKoreanFieldworkReportHandoffCategoryRank(itemA.category);
    const rankB = getKoreanFieldworkReportHandoffCategoryRank(itemB.category);

    return rankA - rankB
        || itemA.identifier.localeCompare(itemB.identifier, 'ko')
        || itemA.documentId.localeCompare(itemB.documentId);
}


function compareRelationNames(relationNameA: string, relationNameB: string): number {

    return getRelationRank(relationNameA) - getRelationRank(relationNameB)
        || relationNameA.localeCompare(relationNameB, 'ko');
}


function getRelationRank(relationName: string): number {

    const index = RELATION_DETAIL_ORDER.indexOf(relationName);

    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}


function truncate(value: string, maxLength: number): string {

    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}
