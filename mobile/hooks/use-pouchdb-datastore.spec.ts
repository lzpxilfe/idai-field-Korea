import { act, renderHook, waitFor } from '@testing-library/react-native';
import usePouchDbDatastore from './use-pouchdb-datastore';

const mockDatastoreInstances: any[] = [];
const mockDbsByName = new Map<string, any>();
const mockCreateDbDeferreds = new Map<string, {
  promise: Promise<void>;
  resolve: () => void;
}>();

jest.mock('pouchdb-core', () => {
  const PouchDB = jest.fn((name: string) => {
    const db = {
      allDocs: jest.fn(),
      close: jest.fn(),
      destroy: jest.fn(),
      get: jest.fn(),
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
  loadKoreanFieldworkProjectSetupDefaults: jest.fn(() => Promise.resolve({})),
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
  });

  it('opens the project database without preloading all documents and attachments', async () => {
    const { result } = renderHook(() => usePouchDbDatastore('fieldwork-fast'));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const db = mockDbsByName.get('fieldwork-fast');
    expect(db?.allDocs).not.toHaveBeenCalled();
    expect(mockDatastoreInstances[0].setupChangesEmitter).toHaveBeenCalledTimes(1);
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
