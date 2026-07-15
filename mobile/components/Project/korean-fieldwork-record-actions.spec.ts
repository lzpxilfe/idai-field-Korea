import { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import { getKoreanFieldworkRecordActionSummary } from './korean-fieldwork-record-actions';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork record actions', () => {
  it('recommends feature records and first evidence for a fieldwork unit by default', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1', {}, {
      fieldRecordQuality: [],
      recordCreationTiming: '',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      operation,
      [operation],
      [C.TRENCH, C.FEATURE, C.PHOTO]
    );

    expect(summary).toMatchObject({
      isTracked: true,
      categoryLabel: '조사 구역 기록',
      structureCount: 0,
      evidenceCount: 0,
      issueCount: 0,
      tone: 'warning',
    });
    expect(summary.actions.map((action) => action.id)).toEqual([
      'create-Feature',
      'create-photos',
    ]);
  });

  it('recommends feature records instead of trenches for excavation operations', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1', {}, {
      fieldRecordQuality: [],
      recordCreationTiming: '',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      operation,
      [operation],
      [C.TRENCH, C.FEATURE, C.PHOTO],
      'excavation'
    );

    expect(summary.actions.map((action) => action.id).slice(0, 2)).toEqual([
      'create-Feature',
      'create-photos',
    ]);
    expect(summary.actions.map((action) => action.id)).not.toContain(
      'create-Trench'
    );
  });

  it('prioritizes readiness issues before creating more records', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
      featureRecordingStatus: 'confirmed',
      featureInvestigationChecklist: [],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature],
      [C.FEATURE_SEGMENT, C.PHOTO]
    );

    expect(summary.issueCount).toBe(1);
    expect(summary.actions[0]).toMatchObject({
      id: 'issue-feature-complete-photo-feature-1',
      type: 'openDocument',
      label: '이 기록 점검',
      tone: 'warning',
      document: feature,
    });
    expect(summary.actions.map((action) => action.id).slice(0, 2)).toEqual([
      'issue-feature-complete-photo-feature-1',
      'create-FeatureSegment',
    ]);
  });

  it('keeps compact card actions in the fieldwork work order', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
      featureRecordingStatus: 'confirmed',
      featureInvestigationChecklist: [
        'preInvestigationPhotoTaken',
        'inProgressPhotoTaken',
      ],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature],
      [C.FEATURE_SEGMENT, C.SOIL_PROFILE_PHOTO, C.PHOTO]
    );

    expect(summary.checklistDone).toBe(2);
    expect(summary.checklistTotal).toBe(9);
    expect(summary.actions.map((action) => action.id).slice(0, 3)).toEqual([
      'issue-feature-complete-photo-feature-1',
      'create-FeatureSegment',
      'create-soilProfilePhotos',
    ]);
  });

  it('keeps feature photo and drawing work in the feature workspace', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
      featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature],
      [C.FEATURE_SEGMENT, C.SOIL_PROFILE_PHOTO, C.PHOTO]
    );

    expect(summary.actions.map((action) => action.id))
      .not.toContain('create-soilProfilePhotos');
    expect(summary.actions.map((action) => action.id))
      .not.toContain('create-photos');
    expect(summary.actions.map((action) => action.id))
      .not.toContain('create-drawings');
  });

  it('uses the latest photo milestone instead of evidence volume for progress', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
      featureInvestigationChecklist: ['inProgressPhotoTaken'],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });
    const photos = Array.from({ length: 5 }, (_, index) =>
      createDoc(`photo-${index}`, C.PHOTO, `사진 ${index + 1}`, {
        depicts: ['feature-1'],
      })
    );

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature, ...photos],
      [C.PHOTO]
    );

    expect(summary).toMatchObject({
      evidenceCount: 5,
      completionPercent: 67,
      photoProgressDone: 1,
      photoProgressTotal: 3,
    });
  });

  it('offers another soil profile photo when pit records outnumber profile photos', () => {
    const feature = createDoc('feature-1', C.FEATURE, '유구 1', {}, {
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });
    const pit = createDoc('pit-1', C.FEATURE_SEGMENT, '피트 1', {
      liesWithin: ['feature-1'],
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature, pit],
      [C.SOIL_PROFILE_PHOTO]
    );

    expect(summary.actions).toContainEqual(expect.objectContaining({
      id: 'create-soilProfilePhotos',
      type: 'createDocument',
      categoryName: C.SOIL_PROFILE_PHOTO,
    }));
  });

  it('uses trial trench checklist progress for trench records in trial mode', () => {
    const trench = createDoc('trench-1', C.TRENCH, '1호 트렌치', {}, {
      featureInvestigationChecklist: [
        'trenchSoilCleaned',
        'trenchFeatureChecked',
      ],
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      trench,
      [trench],
      [C.FEATURE, C.PHOTO],
      'trialTrench'
    );

    expect(summary.checklistDone).toBe(2);
    expect(summary.checklistTotal).toBe(9);
  });

  it('opens existing evidence when there is no missing evidence action to create', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1');
    const photo = createDoc('photo-1', C.PHOTO, '수혈 1 사진', {
      depicts: ['feature-1'],
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature, photo],
      []
    );

    expect(summary.actions).toContainEqual(expect.objectContaining({
      id: 'open-photos',
      type: 'openDocument',
      label: '사진 열기',
      document: photo,
    }));
  });

  it('counts and opens existing sketch memo evidence', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {}, {
      fieldRecordQuality: ['immediateRecording'],
      recordCreationTiming: 'duringFieldwork',
    });
    const memo = createDoc('memo-1', C.PEN_MEMO, '스케치 메모 1', {
      depicts: ['feature-1'],
    }, {
      penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20}]}]}',
      penMemoTranscriptionStatus: 'reviewed',
    });

    const summary = getKoreanFieldworkRecordActionSummary(
      feature,
      [feature, memo],
      []
    );

    expect(summary.evidenceCount).toBe(1);
    expect(summary.actions).toContainEqual(expect.objectContaining({
      id: 'open-sketches',
      type: 'openDocument',
      label: '약도·스케치 열기',
      document: memo,
    }));
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
