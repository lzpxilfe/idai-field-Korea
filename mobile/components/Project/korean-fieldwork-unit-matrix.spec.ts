import {
  Document,
  KoreanFieldworkReadinessIssue,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  getKoreanFieldworkFeatureOverviewItems,
  getKoreanFieldworkUnitMatrixItems,
} from './korean-fieldwork-unit-matrix';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork unit matrix', () => {
  it('summarizes structure, evidence, issues, and next tablet actions by unit', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1', {}, {
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'observedInField',
    });
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {
      liesWithin: ['operation-1'],
    });
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      liesWithin: ['trench-1'],
    }, {
      featureRecordingStatus: 'candidate',
      featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
      fieldRecordQuality: [],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'pendingDecision',
    });
    const photo = createDoc('photo-1', C.PHOTO, '사진 1', {
      depicts: ['feature-1'],
    });

    const items = getKoreanFieldworkUnitMatrixItems(
      createSummary([createIssue('feature-1', 'warning')]),
      [operation, trench, feature, photo]
    );

    expect(items.find((item) => item.id === 'operation-1')).toMatchObject({
      categoryLabel: '조사 구역 기록',
      childStructureCount: 1,
      nextChildCategoryName: C.FEATURE,
    });
    expect(items.find((item) => item.id === 'feature-1')).toMatchObject({
      categoryLabel: '유구',
      evidenceCount: 1,
      issueCount: 1,
      checklistDone: 1,
      checklistTotal: 9,
      nextChildCategoryName: C.FEATURE_SEGMENT,
      photoCategoryName: C.PHOTO,
      tone: 'warning',
    });
  });

  it('uses excavation mode to add features directly below an operation', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1');

    const items = getKoreanFieldworkUnitMatrixItems(
      createSummary([]),
      [operation],
      undefined,
      14,
      'excavation'
    );

    expect(items.find((item) => item.id === 'operation-1')).toMatchObject({
      nextChildCategoryName: C.FEATURE,
    });
  });

  it('tracks trench process checks in trial trench mode', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1');
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {
      liesWithin: ['operation-1'],
    }, {
      featureInvestigationChecklist: [
        'trenchSoilCleaned',
        'trenchFeatureChecked',
      ],
    });

    const items = getKoreanFieldworkUnitMatrixItems(
      createSummary([]),
      [operation, trench],
      undefined,
      14,
      'trialTrench'
    );

    expect(items.find((item) => item.id === 'trench-1')).toMatchObject({
      checklistDone: 2,
      checklistTotal: 9,
      nextChildCategoryName: C.FEATURE,
    });
  });

  it('counts sketch memos in the feature overview evidence label', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
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
        'completionPhotoTaken',
      ],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
      verificationState: 'observedInField',
    });
    const memo = createDoc('memo-1', C.PEN_MEMO, '스케치 메모 1', {
      depicts: ['feature-1'],
    }, {
      penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20}]}]}',
      penMemoTranscriptionStatus: 'reviewed',
    });

    const items = getKoreanFieldworkFeatureOverviewItems(
      createSummary([]),
      [feature, memo]
    );

    expect(items[0]).toMatchObject({
      id: 'feature-1',
      evidenceCount: 1,
      evidenceLabel: '약도·스케치 1',
    });
  });

  it('limits the matrix to the current fieldwork scope', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1');
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {
      liesWithin: ['operation-1'],
    });
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      liesWithin: ['trench-1'],
    });

    const items = getKoreanFieldworkUnitMatrixItems(
      createSummary([]),
      [operation, trench, feature],
      trench
    );

    expect(items.map((item) => item.id)).toEqual(['trench-1', 'feature-1']);
  });

  it('builds an all-feature overview table from feature records only', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1');
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {
      liesWithin: ['operation-1'],
    });
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      liesWithin: ['trench-1'],
    });
    const photo = createDoc('photo-1', C.PHOTO, '사진 1', {
      depicts: ['feature-1'],
    });

    const items = getKoreanFieldworkFeatureOverviewItems(
      createSummary([]),
      [operation, trench, feature, photo]
    );

    expect(items.map((item) => item.id)).toEqual(['feature-1']);
    expect(items[0]).toMatchObject({
      statusLabel: '조사 중',
      evidenceLabel: '사진 1',
      nextActionLabel: '조사 과정 0/9',
    });
  });
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  relations: Record<string, string[]> = {},
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  created: { user: 'test', date: new Date('2026-06-23T00:00:00.000Z') },
  modified: [],
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
  documentId: string,
  severity: KoreanFieldworkReadinessIssue['severity']
): KoreanFieldworkReadinessIssue => ({
  ruleId: 'test-rule',
  documentId,
  identifier: '수혈 1',
  category: C.FEATURE,
  severity,
  message: '확인 필요',
  relatedFields: ['featureInvestigationChecklist'],
  recommendedAction: '현장에서 확인하세요.',
  blocksSave: severity === 'critical',
});
