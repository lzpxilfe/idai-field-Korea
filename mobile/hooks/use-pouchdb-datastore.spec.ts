import { act, renderHook, waitFor } from '@testing-library/react-native';
import usePouchDbDatastore from './use-pouchdb-datastore';

const mockDatastoreInstances: any[] = [];
const mockDbsByName = new Map<string, any>();
const mockCreateDbDeferreds = new Map<string, {
  promise: Promise<void>;
  resolve: () => void;
}>();
const mockLoadProjectSetupDefaults = jest.fn<Promise<any>, any[]>(
  () => Promise.resolve({})
);
const mockLoadProjectBoundaryDraft = jest.fn<Promise<any>, any[]>(
  () => Promise.resolve(undefined)
);
const mockRemoveProjectBoundaryDraft = jest.fn<Promise<any>, any[]>(
  () => Promise.resolve(undefined)
);

jest.mock('pouchdb-core', () => {
  const PouchDB = jest.fn((name: string) => {
    const db = {
      allDocs: jest.fn(),
      close: jest.fn(),
      destroy: jest.fn(),
      get: jest.fn(() => Promise.reject(new Error('not found'))),
      info: jest.fn(() => Promise.resolve({ db_name: name })),
      name,
      put: jest.fn(),
    };
    mockDbsByName.set(name, db);
    return db;
  });
  (PouchDB as any).plugin = jest.fn();
  return PouchDB;
});

jest.mock('@neighbourhoodie/pouchdb-asyncstorage-adapter', () => ({
  default: jest.fn(),
}));

jest.mock('idai-field-core', () => {
  class MockPouchdbDatastore {
    private db: any;
    private mockCreatePouchDb: (name: string) => any;

    public bulkCreate = jest.fn(() => Promise.resolve([]));
    public close = jest.fn(() => this.db?.close?.());
    public getDb = jest.fn(() => this.db);
    public setupChangesEmitter = jest.fn();
    public createDb = jest.fn(async (name: string) => {
      const deferred = mockCreateDbDeferreds.get(name);
      if (deferred) await deferred.promise;
      this.db = this.mockCreatePouchDb(name);
      return this.db;
    });

    constructor(mockCreatePouchDb: (name: string) => any) {
      this.mockCreatePouchDb = mockCreatePouchDb;
      mockDatastoreInstances.push(this);
    }
  }

  return {
    ConfigReader: jest.fn(),
    ConfigurationDocument: {
      getConfigurationDocument: jest.fn(() => Promise.resolve({
        resource: {
          customConfigurationName: 'KoreanFieldwork',
          projectLanguages: ['ko'],
        },
      })),
    },
    IdGenerator: jest.fn(),
    KOREAN_FIELDWORK_CONFIGURATION_NAME: 'KoreanFieldwork',
    PouchdbDatastore: MockPouchdbDatastore,
    SampleDataLoaderBase: jest.fn(() => ({
      go: jest.fn(() => Promise.resolve()),
    })),
  };
});

jest.mock('@/components/Project/korean-fieldwork-investigation-mode', () => ({
  createKoreanFieldworkProjectSetupResourceUpdates: jest.fn(() => ({})),
  loadKoreanFieldworkProjectBoundaryDraft: (...args: any[]) =>
    mockLoadProjectBoundaryDraft(...args),
  loadKoreanFieldworkProjectSetupDefaults: (...args: any[]) =>
    mockLoadProjectSetupDefaults(...args),
  removeKoreanFieldworkProjectBoundaryDraft: (...args: any[]) =>
    mockRemoveProjectBoundaryDraft(...args),
}));

jest.mock('@/components/Project/Map/korean-fieldwork-drafts', () => ({
  createOperationDraft: jest.fn(({ boundarySummary, investigationModeId } = {}) => ({
    resource: {
      identifier: '조사구역',
      category: 'Operation',
      relations: {},
      ...(boundarySummary ? { projectBoundarySummary: boundarySummary } : {}),
      ...(investigationModeId ? { projectInvestigationMode: investigationModeId } : {}),
    },
  })),
  createSurveyBoundaryDraft: jest.fn((parentDoc, center, boundarySummary, options) => ({
    resource: {
      identifier: 'survey-boundary',
      category: 'SurveyBoundary',
      relations: { isRecordedIn: [parentDoc.resource.id] },
      geometry: options.geometry,
      referenceBasemapProvider: options.referenceBasemapProvider,
      surveyBoundaryNote: boundarySummary,
    },
  })),
  getBoundaryGeometryCenter: jest.fn(() => ({ x: 1, y: 2 })),
  projectWgs84BoundaryToSurveyBoundaryGeometry: jest.fn(() => ({
    type: 'LineString',
    coordinates: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  })),
  REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID: 'kakaoHybrid',
  REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP: 'kakaoRoadmap',
  REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW: 'kakaoSkyview',
  SURVEY_BOUNDARY_ACCURACY_DEFAULT: 'defaultAccuracy',
  SURVEY_BOUNDARY_SOURCE_DEFAULT: 'defaultSource',
}));

jest.mock('@/constants/korean-fieldwork-project', () => ({
  KOREAN_FIELDWORK_PROJECT_IDENTIFIER: 'KoreanFieldwork',
  KOREAN_FIELDWORK_PROJECT_LANGUAGES: ['ko'],
}));

jest.mock('@/constants/sample-project', () => ({
  isSampleProject: jest.fn(() => false),
  SAMPLE_PROJECT_LABEL: 'Sample project',
}));

describe('usePouchDbDatastore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatastoreInstances.length = 0;
    mockDbsByName.clear();
    mockCreateDbDeferreds.clear();
    mockLoadProjectSetupDefaults.mockResolvedValue({});
    mockLoadProjectBoundaryDraft.mockResolvedValue(undefined);
    mockRemoveProjectBoundaryDraft.mockResolvedValue(undefined);
  });

  it('opens the project database without preloading all documents and attachments', async () => {
    const { result } = renderHook(() => usePouchDbDatastore('fieldwork-fast'));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const db = mockDbsByName.get('fieldwork-fast');
    expect(db?.allDocs).not.toHaveBeenCalled();
    expect(mockDatastoreInstances[0].createDb.mock.calls[0][3]).toBe(false);
    expect(mockDatastoreInstances[0].setupChangesEmitter).toHaveBeenCalledTimes(1);
  });

  it('seeds a drawn project boundary when opening a newly created project', async () => {
    mockLoadProjectSetupDefaults.mockResolvedValueOnce({
      boundarySummary: 'A구역',
      investigationModeId: 'excavation',
    });
    mockLoadProjectBoundaryDraft.mockResolvedValueOnce({
      coordinates: [
        { latitude: 37.1, longitude: 127.1 },
        { latitude: 37.1, longitude: 127.2 },
        { latitude: 37.2, longitude: 127.2 },
      ],
      mapTypeId: 'SKYVIEW',
    });

    const { result } = renderHook(() => usePouchDbDatastore('fieldwork-boundary'));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(mockDatastoreInstances[0].bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          resource: expect.objectContaining({
            category: 'Operation',
            id: 'initial-fieldwork-operation',
            projectBoundarySummary: 'A구역',
            projectInvestigationMode: 'excavation',
          }),
        }),
        expect.objectContaining({
          resource: expect.objectContaining({
            category: 'SurveyBoundary',
            geometry: expect.any(Object),
            id: 'initial-survey-boundary',
            referenceBasemapProvider: 'kakaoSkyview',
            relations: { isRecordedIn: ['initial-fieldwork-operation'] },
            surveyBoundaryNote: 'A구역',
          }),
        }),
      ],
      ''
    );
    expect(mockDatastoreInstances[0].createDb.mock.calls[0][3]).toBe(true);
    expect(mockRemoveProjectBoundaryDraft)
      .toHaveBeenCalledWith('fieldwork-boundary');
  });

  it('clears the active datastore while a new project database is opening', async () => {
    const { result, rerender } = renderHook(
      ({ project }) => usePouchDbDatastore(project),
      { initialProps: { project: 'fieldwork-a' } }
    );

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const deferred = createDeferred();
    mockCreateDbDeferreds.set('fieldwork-b', deferred);

    await act(async () => {
      rerender({ project: 'fieldwork-b' });
    });

    expect(result.current).toBeUndefined();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });
});

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};
