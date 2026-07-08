import {
  getKoreanFieldworkRecordFieldValueSummary,
  KoreanFieldworkReadinessIssue,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';
import { getKoreanFieldworkWorkbenchItems } from './korean-fieldwork-workbench';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork workbench', () => {
  it('prioritizes records that need field decisions and preserves their context path', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1', {}, {
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'observedInField',
    });
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {
      liesWithin: ['operation-1'],
    }, {
      fieldRecordQuality: [],
      recordCreationTiming: '',
      verificationState: 'observedInField',
    });
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      liesWithin: ['trench-1'],
    }, {
      featureRecordingStatus: 'candidate',
      featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
      fieldRecordQuality: [],
      recordCreationTiming: '',
      verificationState: 'pendingDecision',
    });
    const summary = createSummary([createIssue('feature-1')]);

    const items = getKoreanFieldworkWorkbenchItems(
      summary,
      [operation, trench, feature] as any
    );

    expect(items.map((item) => ({
      id: item.id,
      categoryLabel: item.categoryLabel,
      parentPath: item.parentPath,
      reasons: item.reasons,
      tone: item.tone,
    }))).toEqual([
      {
        id: 'feature-1',
        categoryLabel: '유구',
        parentPath: '조사구역 1 > T1',
        reasons: ['확인 1', '조사 전', '과정 1/9', '추가 확인'],
        tone: 'warning',
      },
      {
        id: 'trench-1',
        categoryLabel: '트렌치',
        parentPath: '조사구역 1',
        reasons: ['기록 보완', '시점 미입력'],
        tone: 'neutral',
      },
    ]);
  });

  it('omits records that have no active tablet workbench reason', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1', {}, {
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'observedInField',
    });

    expect(getKoreanFieldworkWorkbenchItems(
      createSummary([]),
      [operation] as any
    )).toEqual([]);
  });

  it('keeps daily logs out of tablet workbench decision cards', () => {
    const dailyLog = createDoc('daily-log-1', C.DAILY_LOG, '6월 30일 일지', {}, {
      fieldRecordQuality: [],
      recordCreationTiming: '',
    });

    expect(getKoreanFieldworkWorkbenchItems(
      createSummary([]),
      [dailyLog] as any
    )).toEqual([]);
  });

  it('counts pen memo review as a tablet workflow step', () => {
    const feature = createDoc('feature-1', C.FEATURE, '유구 1', {}, {
      featureRecordingStatus: 'confirmed',
      featureInvestigationChecklist: [
        'preInvestigationPhotoTaken',
        'inProgressPhotoTaken',
        'soilProfilePhotoLinked',
        'measuredDrawingCompleted',
        'preRecoveryFindPhotoTaken',
        'findsRecovered',
        'samplesCollected',
        'penMemoReviewed',
      ],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'observedInField',
    });

    expect(getKoreanFieldworkWorkbenchItems(
      createSummary([]),
      [feature] as any
    )).toEqual([
      expect.objectContaining({
        id: 'feature-1',
        reasons: ['과정 8/9'],
        tone: 'info',
      }),
    ]);
  });

  it('surfaces field record quality review details with shared Korean labels', () => {
    const qualityReview = createDoc('quality-review-1', C.FIELD_RECORD_QUALITY_REVIEW, 'quality-001', {}, {
      reviewedRecordUnit: ['featureRecord', 'dailyLog'],
      qualityReviewStage: ['sameDayReview', 'sourceRecordCorrection'],
      qualityCorrectionBasis: ['correctionReasonLinked', 'sourceMediaChecked'],
      reportEvaluationFeedback: ['fieldRecordReview', 'supplementRequestTracked'],
      recordCreationTiming: 'duringFieldwork',
      fieldRecordQuality: ['immediateRecording'],
      verificationState: 'observedInField',
    });

    const items = getKoreanFieldworkWorkbenchItems(
      createSummary([]),
      [qualityReview] as any
    );
    const reviewedRecordUnit = getKoreanFieldworkRecordFieldValueSummary(
      'reviewedRecordUnit',
      qualityReview.resource.reviewedRecordUnit
    );
    const reviewStage = getKoreanFieldworkRecordFieldValueSummary(
      'qualityReviewStage',
      qualityReview.resource.qualityReviewStage
    );
    const correctionBasis = getKoreanFieldworkRecordFieldValueSummary(
      'qualityCorrectionBasis',
      qualityReview.resource.qualityCorrectionBasis
    );
    const reportFeedback = getKoreanFieldworkRecordFieldValueSummary(
      'reportEvaluationFeedback',
      qualityReview.resource.reportEvaluationFeedback
    );
    const reasonText = items[0].reasons.join('\n');

    expect(items).toEqual([
      expect.objectContaining({
        id: 'quality-review-1',
        reasons: [
          `\uac80\ud1a0 \ub300\uc0c1 ${reviewedRecordUnit}`,
          `\uac80\ud1a0 \ub2e8\uacc4 ${reviewStage}`,
          `\uc218\uc815\u00b7\ubcf4\uc644 \uadfc\uac70 ${correctionBasis}`,
          `\ud3c9\uac00 \ud658\ub958 ${reportFeedback}`,
        ],
        tone: 'info',
      }),
    ]);
    expect(reasonText).not.toContain('sourceRecordCorrection');
    expect(reasonText).not.toContain('supplementRequestTracked');
  });

  it('uses the investigation mode to surface trial-trench workflow progress', () => {
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {}, {
      featureInvestigationChecklist: [
        'trenchSoilCleaned',
        'trenchPitOpened',
      ],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'observedInField',
    });

    expect(getKoreanFieldworkWorkbenchItems(
      createSummary([]),
      [trench] as any
    )).toEqual([]);

    expect(getKoreanFieldworkWorkbenchItems(
      createSummary([]),
      [trench] as any,
      8,
      'trialTrench'
    )).toEqual([
      expect.objectContaining({
        id: 'trench-1',
        reasons: ['과정 2/9'],
        tone: 'info',
      }),
    ]);
  });
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  relations: Record<string, string[]> = {},
  extraResource: Record<string, unknown> = {}
) => ({
  resource: {
    id,
    identifier,
    category,
    relations,
    ...extraResource,
  },
});

const createSummary = (
  openIssues: KoreanFieldworkReadinessIssue[]
): KoreanFieldworkTodaySummary => ({
  dailyLogs: [],
  surveyBoundaries: [],
  featureCandidates: [],
  openIssues,
  issueCountByDocumentId: openIssues.reduce((index, issue) => {
    index[issue.documentId] = (index[issue.documentId] ?? 0) + 1;
    return index;
  }, {} as Record<string, number>),
});

const createIssue = (
  documentId: string
): KoreanFieldworkReadinessIssue => ({
  ruleId: 'test-rule',
  documentId,
  identifier: '수혈 1',
  category: C.FEATURE,
  severity: 'warning',
  message: '확인 필요',
  relatedFields: ['featureInvestigationChecklist'],
  recommendedAction: '현장에서 확인하세요.',
  blocksSave: false,
});
