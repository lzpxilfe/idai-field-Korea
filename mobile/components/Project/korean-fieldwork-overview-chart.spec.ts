import {
  Document,
  KoreanFieldworkReadinessIssue,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import { getKoreanFieldworkOverviewChartData } from './korean-fieldwork-overview-chart';
import {
  KOREAN_FIELDWORK_INITIAL_OPERATION_ID,
  KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID,
} from './korean-fieldwork-system-records';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork overview chart data', () => {
  it('summarizes investigation units, feature status, process, and review issues', () => {
    const documents = [
      createDoc('boundary-1', C.SURVEY_BOUNDARY, '경계 1'),
      createDoc('operation-1', C.OPERATION, '조사구역 1'),
      createDoc('trench-1', C.TRENCH, 'T1', {
        liesWithin: ['operation-1'],
      }),
      createDoc('feature-group-1', C.FEATURE_GROUP, '유구군 1', {
        liesWithin: ['trench-1'],
      }),
      createDoc('feature-1', C.FEATURE, '수혈 1', {
        liesWithin: ['trench-1'],
      }, {
        featureRecordingStatus: 'candidate',
        featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
      }),
      createDoc('feature-2', C.FEATURE, '수혈 2', {
        liesWithin: ['trench-1'],
      }, {
        featureRecordingStatus: 'confirmed',
        featureInvestigationChecklist: [
          'preInvestigationPhotoTaken',
          'inProgressPhotoTaken',
        ],
      }),
      createDoc('segment-1', C.FEATURE_SEGMENT, '피트 1', {
        liesWithin: ['feature-1'],
      }, {
        featureRecordingStatus: 'investigating',
        featureInvestigationChecklist: ['inProgressPhotoTaken'],
      }),
      createDoc('photo-1', C.PHOTO, '사진 1', {
        depicts: ['feature-1'],
      }),
    ];

    const data = getKoreanFieldworkOverviewChartData(
      createSummary([
        createIssue('feature-1', 'warning'),
        createIssue('feature-2', 'critical'),
      ]),
      documents
    );

    expect(data.totalDocumentCount).toBe(8);
    expect(data.investigationUnitCount).toBe(7);
    expect(data.operationCount).toBe(1);
    expect(data.trenchCount).toBe(1);
    expect(data.featureCount).toBe(2);
    expect(data.featureSegmentCount).toBe(1);
    expect(data.checklistDone).toBe(4);
    expect(data.checklistTotal).toBe(27);
    expect(data.openIssueCount).toBe(2);
    expect(data.criticalIssueCount).toBe(1);
    expect(data.investigationSegments.find((segment) =>
      segment.id === 'operation'
    )).toMatchObject({
      label: '조사',
      count: 1,
      percent: 14,
    });
    expect(data.featureStatusSegments.map((segment) => [
      segment.id,
      segment.count,
    ])).toEqual([
      ['candidate', 1],
      ['investigating', 1],
      ['confirmed', 1],
      ['unclassified', 0],
    ]);
    expect(data.metrics.find((metric) => metric.id === 'review')).toMatchObject({
      value: 2,
      detail: '필수 1건',
      tone: 'danger',
    });
  });

  it('counts tablet evidence documents and directly attached fieldwork photos', () => {
    const documents = [
      createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
        fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg',
      }),
      createDoc('photo-1', C.PHOTO, '사진 1', {}, {
        fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
      }),
      createDoc('drawing-1', C.DRAWING, '도면 1'),
      createDoc('memo-1', C.PEN_MEMO, '메모 1'),
      createDoc('find-1', C.FIND, '유물 1', {}, {
        fieldworkPhotoUri: 'file:///tablet/photos/find-1.jpg',
      }),
    ];

    const data = getKoreanFieldworkOverviewChartData(createSummary([]), documents);

    expect(data.evidenceCount).toBe(6);
    expect(data.photoEvidenceCount).toBe(3);
    expect(data.drawingCount).toBe(1);
    expect(data.penMemoCount).toBe(1);
    expect(data.findSampleCount).toBe(1);
    expect(data.metrics.find((metric) => metric.id === 'evidence')).toMatchObject({
      label: '자료',
      value: 6,
      detail: '사진 3 · 도면/메모 2 · 유물/시료 1',
      tone: 'info',
    });
  });

  it('includes trench checklist progress for trial trench investigations', () => {
    const trench = createDoc('trench-1', C.TRENCH, 'T1', {}, {
      featureInvestigationChecklist: [
        'trenchSoilCleaned',
        'trenchFeatureChecked',
      ],
    });

    const data = getKoreanFieldworkOverviewChartData(
      createSummary([]),
      [trench],
      'trialTrench'
    );

    expect(data.checklistDone).toBe(2);
    expect(data.checklistTotal).toBe(9);
    expect(data.checklistPercent).toBe(22);
  });

  it('does not count initial project boundary records as user records', () => {
    const documents = [
      createDoc(
        KOREAN_FIELDWORK_INITIAL_OPERATION_ID,
        C.OPERATION,
        '프로젝트 경계'
      ),
      createDoc(
        KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID,
        C.SURVEY_BOUNDARY,
        '프로젝트 경계선',
        { isRecordedIn: [KOREAN_FIELDWORK_INITIAL_OPERATION_ID] }
      ),
    ];
    const data = getKoreanFieldworkOverviewChartData(
      createSummary([
        createIssue(KOREAN_FIELDWORK_INITIAL_OPERATION_ID, 'warning'),
      ]),
      documents
    );

    expect(data.totalDocumentCount).toBe(0);
    expect(data.investigationUnitCount).toBe(0);
    expect(data.operationCount).toBe(0);
    expect(data.surveyBoundaryCount).toBe(0);
    expect(data.openIssueCount).toBe(0);
    expect(data.metrics.find((metric) => metric.id === 'investigation'))
      .toMatchObject({
        value: 0,
        detail: '경계 0 · 트렌치 0',
        tone: 'neutral',
      });
  });

  it('does not count map-created setup boundary records as user records', () => {
    const documents = [
      createDoc('setup-operation', C.OPERATION, 'setup operation', {}, {
        projectBoundarySetupState: 'draftBoundary',
        projectBoundarySummary: 'A area',
      }),
      createDoc('setup-boundary', C.SURVEY_BOUNDARY, 'setup boundary', {
        isRecordedIn: ['setup-operation'],
      }),
      createDoc('feature-1', C.FEATURE, 'feature 1', {
        liesWithin: ['setup-operation'],
      }),
    ];

    const data = getKoreanFieldworkOverviewChartData(
      createSummary([]),
      documents
    );

    expect(data.totalDocumentCount).toBe(1);
    expect(data.investigationUnitCount).toBe(1);
    expect(data.operationCount).toBe(0);
    expect(data.surveyBoundaryCount).toBe(0);
    expect(data.featureCount).toBe(1);
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
  created: { user: 'test', date: new Date('2026-06-27T00:00:00.000Z') },
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
  identifier: documentId,
  category: C.FEATURE,
  severity,
  message: '확인 필요',
  relatedFields: ['featureInvestigationChecklist'],
  recommendedAction: '현장에서 확인하세요.',
  blocksSave: severity === 'critical',
});
