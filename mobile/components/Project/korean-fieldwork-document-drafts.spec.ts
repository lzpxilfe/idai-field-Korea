import {
  createDraftIdentifier,
  createKoreanFieldworkDraftRelations,
  createKoreanFieldworkDraftResource,
} from './korean-fieldwork-document-drafts';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
  FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
  FEATURE_RECORDING_STATUS_CANDIDATE,
  LAYER_SEQUENCE_MEANING_DEFAULT,
  REFERENCE_BASEMAP_PROVIDER_DEFAULT,
  SOIL_COLOR_ASSIST_STATUS_DEFAULT,
  SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
  SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
  SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  SURVEY_BOUNDARY_SOURCE_DEFAULT,
  SURVEY_BOUNDARY_TYPE_DEFAULT,
} from './Map/korean-fieldwork-drafts';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork document drafts', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates immediately saveable Trench drafts below operation records', () => {
    const operationDoc = createDoc('operation-1', C.OPERATION, {}, '1구역');
    const config = allowRelations({
      [`${C.TRENCH}:${C.OPERATION}`]: ['isRecordedIn', 'liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      operationDoc,
      C.TRENCH,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1구역 트렌치 1',
      category: C.TRENCH,
      relations: {
        isRecordedIn: ['operation-1'],
        liesWithin: ['operation-1'],
      },
      recordCreationTiming: 'duringFieldwork',
      fieldRecordQuality: [],
      featureInvestigationChecklist: [],
    });
  });

  it('keeps FeatureSegment pit/detail drafts linked to their operation and parent feature', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {
      isRecordedIn: ['operation-1'],
    }, '1호 주거지');
    const config = allowRelations({
      [`${C.FEATURE_SEGMENT}:${C.FEATURE}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.FEATURE_SEGMENT,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1호 주거지 피트 1',
      category: C.FEATURE_SEGMENT,
      relations: {
        isRecordedIn: ['operation-1'],
        liesWithin: ['feature-1'],
      },
      featureRecordingStatus: FEATURE_RECORDING_STATUS_CANDIDATE,
      featureGeometryEditStatus: FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
      featureGeometryRevisionHistory: FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
      featureInvestigationChecklist: [],
      featureSoilProfilePhotoCount: 0,
    });
  });

  it('keeps legacy FeatureGroup drafts on the same shared feature workflow defaults', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {
      isRecordedIn: ['operation-1'],
    }, '1호 트렌치');
    const config = allowRelations({
      [`${C.FEATURE_GROUP}:${C.TRENCH}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.FEATURE_GROUP,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1호 트렌치 관련유구 1',
      category: C.FEATURE_GROUP,
      relations: {
        isRecordedIn: ['operation-1'],
        liesWithin: ['trench-1'],
      },
      featureRecordingStatus: FEATURE_RECORDING_STATUS_CANDIDATE,
      featureGeometryEditStatus: FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
      featureGeometryRevisionHistory: FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
      featureInvestigationChecklist: [],
      featureSoilProfilePhotoCount: 0,
    });
  });

  it('starts Feature drafts with the selected Korean feature type', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {
      isRecordedIn: ['operation-1'],
    });
    const config = allowRelations({
      [`${C.FEATURE}:${C.TRENCH}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.FEATURE,
      config,
      { featureType: 'pit' }
    );

    expect(draft).toMatchObject({
      identifier: '수혈-1700000000000',
      category: C.FEATURE,
      relations: {
        isRecordedIn: ['operation-1'],
        liesWithin: ['trench-1'],
      },
      featureType: 'pit',
      featureInterpretationType: ['pitFeature'],
      featureRecordingStatus: FEATURE_RECORDING_STATUS_CANDIDATE,
      featureInvestigationChecklist: [],
    });
  });

  it('uses the entered field feature name as the Feature draft identifier', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {
      isRecordedIn: ['operation-1'],
    });
    const config = allowRelations({
      [`${C.FEATURE}:${C.TRENCH}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.FEATURE,
      config,
      {
        featureType: 'pit',
        identifier: '  1호 수혈  ',
      }
    );

    expect(draft).toMatchObject({
      identifier: '1호 수혈',
      category: C.FEATURE,
      featureType: 'pit',
    });
  });

  it('stores rough feature location sketch metadata in Feature drafts', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {
      isRecordedIn: ['operation-1'],
    });
    const config = allowRelations({
      [`${C.FEATURE}:${C.TRENCH}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.FEATURE,
      config,
      {
        featureGeometryRevisionNote: ' 위치 스케치: 타원, 중심 75%, 50% ',
        featureLocationSketch: ' {"shape":"oval"} ',
        shortDescription: ' 위치 스케치: 타원 ',
      }
    );

    expect(draft).toMatchObject({
      featureGeometryRevisionNote: '위치 스케치: 타원, 중심 75%, 50%',
      featureLocationSketch: '{"shape":"oval"}',
      shortDescription: '위치 스케치: 타원',
    });
  });

  it('stores map feature geometry metadata in Feature drafts', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {
      isRecordedIn: ['operation-1'],
    });
    const config = allowRelations({
      [`${C.FEATURE}:${C.TRENCH}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.FEATURE,
      config,
      {
        featureGeometry: JSON.stringify({
          type: 'Point',
          coordinates: [127, 37],
        }),
        featureGeometryRevisionNote: ' 현재 GPS 위치에서 시작 ',
        geometryConfidence: 'rough',
        geometrySource: 'gpsApproximate',
        identifier: '1호 유구',
      }
    );

    expect(draft).toMatchObject({
      identifier: '1호 유구',
      geometry: {
        type: 'Point',
        coordinates: [127, 37],
      },
      featureGeometryRevisionNote: '현재 GPS 위치에서 시작',
      geometryConfidence: 'rough',
      geometrySource: 'gpsApproximate',
    });
  });

  it('starts kiln Feature drafts with kiln interpretation metadata', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {
      isRecordedIn: ['operation-1'],
    });
    const config = allowRelations({
      [`${C.FEATURE}:${C.TRENCH}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.FEATURE,
      config,
      { featureType: 'kiln' }
    );

    expect(draft).toMatchObject({
      identifier: '가마-1700000000000',
      category: C.FEATURE,
      featureType: 'kiln',
      featureInterpretationType: ['kiln'],
      featureRecordingStatus: FEATURE_RECORDING_STATUS_CANDIDATE,
    });
  });

  it('creates Layer drafts with tablet-friendly sequence defaults', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {
      isRecordedIn: ['operation-1'],
    }, '1호 주거지');
    const config = allowRelations({
      [`${C.LAYER}:${C.FEATURE}`]: ['liesWithin'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.LAYER,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1호 주거지 토층 1',
      category: C.LAYER,
      relations: {
        isRecordedIn: ['operation-1'],
        liesWithin: ['feature-1'],
      },
      layerSequenceNumber: 1,
      layerSequenceMeaning: LAYER_SEQUENCE_MEANING_DEFAULT,
      soilColorAssistStatus: SOIL_COLOR_ASSIST_STATUS_DEFAULT,
    });
  });

  it('creates soil profile photo drafts named from the parent feature', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {}, '1호 주거지');
    const config = allowRelations({
      [`${C.SOIL_PROFILE_PHOTO}:${C.FEATURE}`]: ['depicts'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.SOIL_PROFILE_PHOTO,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1호 주거지 토층사진 1',
      category: C.SOIL_PROFILE_PHOTO,
      relations: { depicts: ['feature-1'] },
      soilProfileAnnotationStrokes: '[]',
      soilProfilePhotoAnnotationStrokes: '[]',
      soilProfileLayerMarkers: '[]',
      soilProfileLayerIds: '[]',
      soilProfileColorSwatches: '',
      soilColorAssistCandidates: '',
      soilColorAssistStatus: SOIL_COLOR_ASSIST_STATUS_DEFAULT,
      soilProfilePhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
      soilProfilePhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
      layerSequenceMeaning: LAYER_SEQUENCE_MEANING_DEFAULT,
    });
  });

  it('numbers the next soil profile photo below the same feature', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {}, '1호 주거지');
    const config = allowRelations({
      [`${C.SOIL_PROFILE_PHOTO}:${C.FEATURE}`]: ['depicts'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.SOIL_PROFILE_PHOTO,
      config,
      {
        existingDocuments: [
          createDoc('profile-1', C.SOIL_PROFILE_PHOTO, { depicts: ['feature-1'] }, '1호 주거지 토층사진 1'),
          createDoc('profile-2', C.SOIL_PROFILE_PHOTO, { depicts: ['feature-1'] }, '1호 주거지 토층사진 2'),
          createDoc('other-profile', C.SOIL_PROFILE_PHOTO, { depicts: ['feature-2'] }, '2호 주거지 토층사진 1'),
        ],
      }
    );

    expect(draft.identifier).toBe('1호 주거지 토층사진 3');
  });

  it('creates regular Photo drafts with fieldwork capture defaults', () => {
    const trenchDoc = createDoc('trench-1', C.TRENCH, {}, '1호 트렌치');
    const config = allowRelations({
      [`${C.PHOTO}:${C.TRENCH}`]: ['depicts'],
    });

    const draft = createKoreanFieldworkDraftResource(
      trenchDoc,
      C.PHOTO,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1호 트렌치 사진 1',
      category: C.PHOTO,
      relations: { depicts: ['trench-1'] },
      fieldworkPhotoAnnotationStrokes: '[]',
      fieldworkPhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
      fieldworkPhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
      mediaEvidenceRole: ['fieldResultRecord'],
    });
  });

  it('creates Drawing drafts named from the parent feature', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {}, '1호 수혈');
    const config = allowRelations({
      [`${C.DRAWING}:${C.FEATURE}`]: ['depicts'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.DRAWING,
      config,
      {
        existingDocuments: [
          createDoc('drawing-1', C.DRAWING, { depicts: ['feature-1'] }, '1호 수혈 도면 1'),
        ],
      }
    );

    expect(draft).toMatchObject({
      identifier: '1호 수혈 도면 2',
      category: C.DRAWING,
      relations: { depicts: ['feature-1'] },
      drawingSketchStrokes: '[]',
      mediaEvidenceRole: ['fieldResultRecord'],
    });
  });

  it('numbers the next regular Photo below the same record', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {}, '1호 수혈');
    const config = allowRelations({
      [`${C.PHOTO}:${C.FEATURE}`]: ['depicts'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.PHOTO,
      config,
      {
        existingDocuments: [
          createDoc('photo-1', C.PHOTO, { depicts: ['feature-1'] }, '1호 수혈 사진 1'),
          createDoc('photo-2', C.PHOTO, { depicts: ['feature-1'] }, '1호 수혈 사진 2'),
          createDoc('other-photo', C.PHOTO, { depicts: ['feature-2'] }, '2호 수혈 사진 1'),
        ],
      }
    );

    expect(draft.identifier).toBe('1호 수혈 사진 3');
  });

  it('creates SurveyBoundary drafts with operation-level boundary defaults', () => {
    const operationDoc = createDoc('operation-1', C.OPERATION, {}, '1구역');
    const config = allowRelations({
      [`${C.SURVEY_BOUNDARY}:${C.OPERATION}`]: ['isRecordedIn'],
    });

    const draft = createKoreanFieldworkDraftResource(
      operationDoc,
      C.SURVEY_BOUNDARY,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1구역 조사경계 1',
      category: C.SURVEY_BOUNDARY,
      relations: { isRecordedIn: ['operation-1'] },
      surveyBoundaryType: SURVEY_BOUNDARY_TYPE_DEFAULT,
      surveyBoundarySource: SURVEY_BOUNDARY_SOURCE_DEFAULT,
      surveyBoundaryAccuracy: SURVEY_BOUNDARY_ACCURACY_DEFAULT,
      referenceBasemapProvider: REFERENCE_BASEMAP_PROVIDER_DEFAULT,
    });
  });

  it('creates PenMemo drafts with empty stroke data', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {}, '1호 수혈');
    const config = allowRelations({
      [`${C.PEN_MEMO}:${C.FEATURE}`]: ['depicts'],
    });

    const draft = createKoreanFieldworkDraftResource(
      featureDoc,
      C.PEN_MEMO,
      config
    );

    expect(draft).toMatchObject({
      identifier: '1호 수혈 메모 1',
      category: C.PEN_MEMO,
      relations: { depicts: ['feature-1'] },
      penMemoStrokes: '[]',
      penMemoTranscriptionStatus: 'pending',
    });
  });

  it('falls back to inherited operation context when no direct relation is configured', () => {
    const featureDoc = createDoc('feature-1', C.FEATURE, {
      isRecordedIn: ['operation-1'],
    });
    const config = allowRelations({});

    expect(
      createKoreanFieldworkDraftRelations(featureDoc, C.FIND, config)
    ).toEqual({
      isRecordedIn: ['operation-1'],
      liesWithin: ['feature-1'],
    });
  });

  it('uses kebab-case identifiers for categories without a dedicated prefix', () => {
    expect(createDraftIdentifier('CustomRecordType')).toBe(
      'custom-record-type-1700000000000'
    );
  });

  it('uses selected feature type labels for temporary feature identifiers', () => {
    expect(createDraftIdentifier(C.FEATURE, 'posthole')).toBe(
      '주혈-1700000000000'
    );
  });
});

const createDoc = (
  id: string,
  category: string,
  relations: Record<string, string[]> = {},
  identifier = id
) => ({
  resource: {
    id,
    identifier,
    category,
    relations,
  },
} as any);

const allowRelations = (allowed: Record<string, string[]>) => ({
  isAllowedRelationDomainCategory: (
    categoryName: string,
    parentCategoryName: string,
    relationName: string
  ) => (allowed[`${categoryName}:${parentCategoryName}`] ?? [])
    .includes(relationName),
} as any);
