import {
  getKoreanFieldworkPriorityTasks,
  getKoreanFieldworkQuickActionStates,
  getKoreanFieldworkTodayActionTargets,
} from './korean-fieldwork-today-actions';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork today actions', () => {
  it('targets existing daily log, feature candidate, and first issue document', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const dailyLog = createDoc('daily-log-1', C.DAILY_LOG);
    const candidate = createDoc('feature-1', C.FEATURE, {
      featureRecordingStatus: 'candidate',
    });
    const sample = createDoc('sample-1', C.SAMPLE);
    const summary = createSummary({
      dailyLogs: [dailyLog],
      featureCandidates: [candidate],
      openIssues: [{
        documentId: 'sample-1',
        ruleId: 'sample-purpose',
      }],
    });

    expect(getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation, dailyLog, candidate, sample] as any
    )).toMatchObject({
      primaryOperation: operation,
      dailyLog,
      featureCandidate: candidate,
      issueDocument: sample,
    });
  });

  it('keeps feature quick creation available when a candidate already exists', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const candidate = createDoc('feature-1', C.FEATURE, {
      featureRecordingStatus: 'candidate',
    });
    const summary = createSummary({
      featureCandidates: [candidate],
    });
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation, candidate] as any,
      'excavation'
    );

    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      undefined,
      'excavation'
    ).featureCandidate).toMatchObject({
      label: '유구 추가',
      action: {
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.FEATURE,
      },
    });
  });

  it('uses trench before operation for new feature candidates in trial trench mode', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const featureGroup = createDoc('feature-group-1', C.FEATURE_GROUP);
    const trench = createDoc('trench-1', C.TRENCH);
    const summary = createSummary();

    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation, featureGroup, trench] as any,
      'trialTrench'
    );

    expect(targets.primaryOperation).toBe(operation);
    expect(targets.featureDraftParent).toBe(trench);
  });

  it('skips legacy feature groups when creating feature candidates', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const featureGroup = createDoc('feature-group-1', C.FEATURE_GROUP);

    expect(getKoreanFieldworkTodayActionTargets(
      createSummary() as any,
      [operation, featureGroup] as any
    ).featureDraftParent).toBe(operation);

    expect(getKoreanFieldworkTodayActionTargets(
      createSummary() as any,
      [operation] as any
    ).featureDraftParent).toBe(operation);
  });

  it('keeps 시굴·표본 quick creation on trench setup before 유구 entry', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const summary = createSummary();
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation] as any,
      'trialTrench'
    );

    expect(targets.featureDraftParent).toBeUndefined();
    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      undefined,
      'trialTrench'
    ).featureCandidate).toMatchObject({
      icon: 'grid-on',
      label: '트렌치 추가',
      detail: '트렌치 먼저 추가',
      action: {
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.TRENCH,
      },
      disabled: false,
    });
  });

  it('switches 시굴·표본 quick creation to 유구 확인 after a trench exists', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const trench = createDoc('trench-1', C.TRENCH, {
      relations: { isRecordedIn: ['operation-1'] },
    });
    const summary = createSummary();
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation, trench] as any,
      'trialTrench'
    );

    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      undefined,
      'trialTrench'
    ).featureCandidate).toMatchObject({
      icon: 'add-location-alt',
      label: '유구 확인',
      detail: '트렌치 안에 유구 기록',
      action: {
        type: 'createDocument',
        parentDocumentId: 'trench-1',
        categoryName: C.FEATURE,
      },
      disabled: false,
    });
  });

  it('builds actionable startup tasks for missing tablet field records', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary() as any,
      [operation] as any
    );

    expect(tasks.map((task) => task.id)).toEqual([
      'create-daily-log',
      'create-survey-boundary',
      'create-detected-feature',
    ]);
    expect(tasks[0].action).toEqual({
      type: 'createDocument',
      parentDocumentId: 'operation-1',
      categoryName: C.DAILY_LOG,
    });
    expect(tasks[2].action).toEqual({
      type: 'createDocument',
      parentDocumentId: 'operation-1',
      categoryName: C.FEATURE,
    });
  });

  it('keeps 시굴·표본조사 centered on trench records before feature entry', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary() as any,
      [operation] as any,
      5,
      'trialTrench'
    );

    expect(tasks.map((task) => task.id)).toEqual([
      'create-daily-log',
      'create-survey-boundary',
      'create-trench',
    ]);
    expect(tasks.map((task) => task.id)).not.toContain('create-detected-feature');
    expect(tasks[2]).toMatchObject({
      title: '시굴·표본 트렌치 설정',
      action: {
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.TRENCH,
      },
    });
  });

  it('uses trench children for 시굴·표본 토층사진 and 유구 확인 tasks', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const trench = createDoc('trench-1', C.TRENCH, {
      relations: { isRecordedIn: ['operation-1'] },
    });
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary() as any,
      [operation, trench] as any,
      5,
      'trialTrench'
    );

    expect(tasks.find((task) => task.id === 'create-trench-profile-photo')?.action)
      .toEqual({
        type: 'createDocument',
        parentDocumentId: 'trench-1',
        categoryName: C.SOIL_PROFILE_PHOTO,
      });
    expect(tasks.find((task) => task.id === 'create-detected-feature')?.action)
      .toEqual({
        type: 'createDocument',
        parentDocumentId: 'trench-1',
        categoryName: C.FEATURE,
      });
  });

  it('starts 발굴조사 from detected feature records instead of trench setup', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary() as any,
      [operation] as any,
      5,
      'excavation'
    );

    expect(tasks.map((task) => task.id)).toEqual([
      'create-daily-log',
      'create-survey-boundary',
      'create-detected-feature',
    ]);
    expect(tasks.map((task) => task.id)).not.toContain('create-trench');
    expect(tasks[2]).toMatchObject({
      title: '유구 기록',
      action: {
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.FEATURE,
      },
    });
  });

  it('does not use existing special-case trenches as the default excavation feature parent', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const trench = createDoc('trench-1', C.TRENCH, {
      relations: { isRecordedIn: ['operation-1'] },
    });
    const summary = createSummary();
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation, trench] as any,
      'excavation'
    );
    const tasks = getKoreanFieldworkPriorityTasks(
      summary as any,
      [operation, trench] as any,
      5,
      'excavation'
    );

    expect(targets.featureDraftParent).toBe(operation);
    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      undefined,
      'excavation'
    ).featureCandidate.action).toEqual({
      type: 'createDocument',
      parentDocumentId: 'operation-1',
      categoryName: C.FEATURE,
    });
    expect(tasks.find((task) => task.id === 'create-detected-feature')?.action)
      .toEqual({
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.FEATURE,
      });
  });

  it('keeps 유구 추가 creating a new record after the first 유구 exists', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const feature = createDoc('feature-1', C.FEATURE, {
      relations: { isRecordedIn: ['operation-1'] },
    });
    const summary = createSummary({ featureCandidates: [feature] });
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation, feature] as any,
      'excavation'
    );

    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      undefined,
      'excavation'
    ).featureCandidate).toMatchObject({
      label: '유구 추가',
      detail: '1건 기록 · 새 유구 추가',
      action: {
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.FEATURE,
      },
      disabled: false,
    });
  });

  it('guides 발굴조사 feature records through photos, sectioning, and drawings', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const feature = createDoc('feature-1', C.FEATURE, {
      relations: { liesWithin: ['operation-1'] },
    });
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary({
        dailyLogs: [createDoc('daily-log-1', C.DAILY_LOG)],
        surveyBoundaries: [createDoc('boundary-1', C.SURVEY_BOUNDARY)],
      }) as any,
      [operation, feature] as any,
      5,
      'excavation'
    );

    expect(tasks.map((task) => task.id)).toEqual([
      'create-pre-investigation-photo',
      'create-excavation-section',
      'create-excavation-profile-photo',
      'create-excavation-drawing',
    ]);
    expect(tasks[0].action).toEqual({
      type: 'createDocument',
      parentDocumentId: 'feature-1',
      categoryName: C.PHOTO,
    });
  });

  it('uses trench as the parent for the feature candidate priority task in trial trench mode', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const trench = createDoc('trench-1', C.TRENCH);
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary() as any,
      [operation, trench] as any,
      5,
      'trialTrench'
    );

    expect(tasks.find((task) =>
      task.id === 'create-detected-feature'
    )?.action).toEqual({
      type: 'createDocument',
      parentDocumentId: 'trench-1',
      categoryName: C.FEATURE,
    });
  });

  it('does not restart the project when the current scoped parent is a trial trench', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const trench = createDoc('trench-1', C.TRENCH, {
      relations: { isRecordedIn: ['operation-1'] },
    });
    const profile = createDoc('profile-1', C.SOIL_PROFILE_PHOTO, {
      relations: { isRecordedIn: ['trench-1'] },
    });
    const tasks = getKoreanFieldworkPriorityTasks(
      createSummary({
        dailyLogs: [createDoc('daily-log-1', C.DAILY_LOG)],
        surveyBoundaries: [createDoc('boundary-1', C.SURVEY_BOUNDARY)],
      }) as any,
      [operation, trench, profile] as any,
      5,
      'trialTrench'
    );

    expect(tasks.map((task) => task.id)).toContain('create-detected-feature');
    expect(tasks.map((task) => task.id)).not.toContain('create-trench');
    expect(tasks.find((task) => task.id === 'create-detected-feature')?.action)
      .toEqual({
      type: 'createDocument',
      parentDocumentId: 'trench-1',
      categoryName: C.FEATURE,
    });
  });

  it('keeps quick actions scoped to the current trial trench', () => {
    const trench = createDoc('trench-1', C.TRENCH);
    const summary = createSummary();
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [trench] as any,
      'trialTrench'
    );

    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      trench as any,
      'trialTrench'
    )).toMatchObject({
      dailyLog: {
        detail: '현재 범위에서 작성',
        disabled: true,
      },
      featureCandidate: {
        detail: '트렌치 안에 유구 기록',
        action: {
          type: 'createDocument',
          parentDocumentId: 'trench-1',
          categoryName: C.FEATURE,
        },
        disabled: false,
      },
      closeout: {
        detail: '현재 문제 없음',
        disabled: true,
      },
    });
  });

  it('lets operation scopes create daily logs from the quick action row', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const summary = createSummary();
    const targets = getKoreanFieldworkTodayActionTargets(
      summary as any,
      [operation] as any
    );

    expect(getKoreanFieldworkQuickActionStates(
      summary as any,
      targets,
      operation as any
    ).dailyLog).toMatchObject({
      detail: '바로 작성',
      action: {
        type: 'createDocument',
        parentDocumentId: 'operation-1',
        categoryName: C.DAILY_LOG,
      },
      disabled: false,
    });
  });

  it('adds issue tasks that open the affected document', () => {
    const operation = createDoc('operation-1', C.OPERATION);
    const sample = createDoc('sample-1', C.SAMPLE);
    const summary = createSummary({
      dailyLogs: [createDoc('daily-log-1', C.DAILY_LOG)],
      surveyBoundaries: [createDoc('boundary-1', C.SURVEY_BOUNDARY)],
      openIssues: [{
        documentId: 'sample-1',
        identifier: 'sample-1',
        recommendedAction: '시료 목적을 기록하세요.',
        ruleId: 'sample-purpose',
        severity: 'warning',
      }],
    });

    const tasks = getKoreanFieldworkPriorityTasks(
      summary as any,
      [operation, sample, createDoc('trench-1', C.TRENCH)] as any
    );

    expect(tasks.find((task) =>
      task.id === 'issue-sample-1-sample-purpose'
    )?.action).toEqual({
      type: 'openDocument',
      documentId: 'sample-1',
    });
  });
});

const createSummary = (overrides: Record<string, unknown> = {}) => ({
  dailyLogs: [],
  surveyBoundaries: [],
  featureCandidates: [],
  openIssues: [],
  issueCountByDocumentId: {},
  ...overrides,
});

const createDoc = (
  id: string,
  category: string,
  extraResource: Record<string, unknown> = {}
) => ({
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
    ...extraResource,
  },
});
