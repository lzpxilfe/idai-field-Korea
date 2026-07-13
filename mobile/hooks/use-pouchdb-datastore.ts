import type { Document } from 'idai-field-core';
import {
  ConfigReader,
  ConfigurationDocument,
  IdGenerator,
  KOREAN_FIELDWORK_CONFIGURATION_NAME,
  PouchdbDatastore,
  SampleDataLoaderBase,
  SyncService,
} from 'idai-field-core';
import { useEffect, useRef, useState } from 'react';
import PouchDB from 'pouchdb-core'
import {
  KOREAN_FIELDWORK_PROJECT_IDENTIFIER,
  KOREAN_FIELDWORK_PROJECT_LANGUAGES,
} from '@/constants/korean-fieldwork-project';
import {
  createKoreanFieldworkProjectSetupResourceUpdates,
  loadKoreanFieldworkProjectBoundaryDraft,
  loadKoreanFieldworkProjectSetupDefaults,
  removeKoreanFieldworkProjectBoundaryDraft,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import type {
  KoreanFieldworkBoundaryMapTypeId,
  KoreanFieldworkProjectBoundaryDraft,
  KoreanFieldworkProjectSetupDefaults,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import {
  createOperationDraft,
  createSurveyBoundaryDraft,
  getBoundaryGeometryCenter,
  projectWgs84BoundaryToSurveyBoundaryGeometry,
  REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID,
  REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP,
  REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW,
  REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS,
  SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  SURVEY_BOUNDARY_SOURCE_DEFAULT,
} from '@/components/Project/Map/korean-fieldwork-drafts';
import {
  KOREAN_FIELDWORK_INITIAL_BOUNDARY_SYSTEM_RECORD,
  KOREAN_FIELDWORK_INITIAL_OPERATION_ID,
  KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID,
} from '@/components/Project/korean-fieldwork-system-records';
import {
  isSampleProject,
  SAMPLE_PROJECT_LABEL,
} from '@/constants/sample-project';
import type { ProjectSettings } from '@/models/preferences';

const getCommonJsDefaultExport = (module: any) => module.default ?? module;

export const configurePouchDbPlugins = (pouchDb: typeof PouchDB) => {
  pouchDb.plugin(getCommonJsDefaultExport(
    require('@neighbourhoodie/pouchdb-asyncstorage-adapter')
  ));
  pouchDb.plugin(getCommonJsDefaultExport(require('pouchdb-adapter-http')));
  pouchDb.plugin(getCommonJsDefaultExport(require('pouchdb-mapreduce')));
  pouchDb.plugin(getCommonJsDefaultExport(require('pouchdb-replication')));
};

configurePouchDbPlugins(PouchDB);

const usePouchDbDatastore = (
  project: string,
  projectSettings?: ProjectSettings,
  onInitialPullComplete?: () => void
): PouchdbDatastore | undefined => {
  const [pouchdbDatastore, setpouchdbDatastore] = useState<PouchdbDatastore>();
  const onInitialPullCompleteRef = useRef(onInitialPullComplete);
  const projectSettingsRef = useRef(projectSettings);
  onInitialPullCompleteRef.current = onInitialPullComplete;
  projectSettingsRef.current = projectSettings;

  useEffect(() => {
    setpouchdbDatastore(undefined);

    if (project.trim().length === 0) {
      return;
    }

    let isCancelled = false;
    let activeManager: PouchdbDatastore | undefined;
    const activeProjectSettings = projectSettingsRef.current;
    const managerPromise = buildpouchdbDatastore(project, activeProjectSettings)
      .then((manager) => {
        if (isCancelled) {
          manager.close();
          return manager;
        }

        activeManager = manager;
        setpouchdbDatastore(manager);
        if (shouldPullFromServerBeforeLocalSeed(project, activeProjectSettings)) {
          onInitialPullCompleteRef.current?.();
        }
        return manager;
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn(`Could not open project datastore '${project}'.`, error);
        }
        return undefined;
      });
    return () => {
      isCancelled = true;
      managerPromise.then((manager) => {
        if (manager !== undefined && activeManager === manager) manager.close();
      }).catch(() => undefined);
    };
  }, [
    project,
    projectSettings?.connected,
    projectSettings?.initialPullPending,
    projectSettings?.password,
    projectSettings?.url,
  ]);

  return pouchdbDatastore;
};

export default usePouchDbDatastore;

export const destroyPouchDbDatastore = async (project: string): Promise<void> => {
  const normalizedProject = project.trim();
  if (!normalizedProject || isSampleProject(normalizedProject)) return;

  const datastore = new PouchdbDatastore(
    (name: string) => new PouchDB(name),
    new IdGenerator()
  );

  await datastore.destroyDb(normalizedProject);
};

const buildpouchdbDatastore = async (
  project: string,
  projectSettings?: ProjectSettings
): Promise<PouchdbDatastore> => {
  const datastore = new PouchdbDatastore(
    (name: string) => new PouchDB(name),
    new IdGenerator()
  );

  if (shouldPullFromServerBeforeLocalSeed(project, projectSettings)) {
    try {
      await replicateInitialProjectFromServer(datastore, project, projectSettings);
    } catch (error) {
      if (!isDbNotEmptyError(error)) throw error;

      console.warn(
        `Initial server pull for '${project}' skipped because the local database already contains data.`
      );
    }
    await datastore.createDb(project);
    datastore.setupChangesEmitter();
    return datastore;
  }

  const projectSetupDefaults = isSampleProject(project)
    ? {}
    : await loadKoreanFieldworkProjectSetupDefaults(project)
        .catch(() => ({}));
  const boundaryDraft = isSampleProject(project)
    ? undefined
    : await loadKoreanFieldworkProjectBoundaryDraft(project)
        .catch(() => undefined);

  await datastore.createDb(
    project,
    await createProjectDocument(project, projectSetupDefaults),
    await createConfigurationDocument(project),
    isSampleProject(project)
  );

  if (!isSampleProject(project)) {
    await createInitialBoundaryDocuments(
      datastore,
      project,
      projectSetupDefaults,
      boundaryDraft
    ).catch((error) => {
      console.warn('Unable to create initial project boundary documents', error);
    });
  }
  
  if (isSampleProject(project)) {
    const loader = new SampleDataLoaderBase('en');
    await loader.go(datastore.getDb(), 'test');
  }

  datastore.setupChangesEmitter();
  return datastore;
};

const shouldPullFromServerBeforeLocalSeed = (
  project: string,
  projectSettings?: ProjectSettings
): projectSettings is ProjectSettings =>
  !isSampleProject(project)
  && !!projectSettings?.connected
  && !!projectSettings.initialPullPending
  && !!projectSettings.url?.trim();

const replicateInitialProjectFromServer = async (
  datastore: PouchdbDatastore,
  project: string,
  projectSettings: ProjectSettings
): Promise<void> => {
  const syncService = new SyncService(datastore);
  const replication = await syncService.startReplication(
    projectSettings.url,
    projectSettings.password ?? '',
    project,
    0,
    false
  );

  await new Promise<void>((resolve, reject) => {
    let subscription: { unsubscribe: () => void } | undefined;
    subscription = replication.subscribe(
      () => undefined,
      (error: unknown) => {
        subscription?.unsubscribe();
        reject(error);
      },
      () => {
        subscription?.unsubscribe();
        resolve();
      }
    );
  });
};

const isDbNotEmptyError = (error: unknown): boolean =>
  error === 'DB not empty'
  || (
    error instanceof Error
    && error.message === 'DB not empty'
  );

const createProjectDocument = async (
  project: string,
  projectSetupDefaults: KoreanFieldworkProjectSetupDefaults = {}
) => {
  return {
    _id: 'project',
    resource: {
      id: 'project',
      identifier: isSampleProject(project)
        ? SAMPLE_PROJECT_LABEL
        : (projectSetupDefaults.displayName?.trim() || project),
      category: 'Project',
      ...(!isSampleProject(project) && {
        projectBoundarySetupState: 'notStarted',
        ...createKoreanFieldworkProjectSetupResourceUpdates(projectSetupDefaults),
      }),
      relations: {},
    },
    created: { user: '', date: new Date() },
    modified: [],
  };
};

const createConfigurationDocument = async (
  project: string
): Promise<ConfigurationDocument | undefined> => {
  if (isSampleProject(project)) return undefined;

  const configurationDocument = await ConfigurationDocument.getConfigurationDocument(
    async () => {
      throw new Error('Configuration document not initialized yet');
    },
    new ConfigReader(),
    KOREAN_FIELDWORK_PROJECT_IDENTIFIER,
    ''
  );
  configurationDocument.resource.projectLanguages = KOREAN_FIELDWORK_PROJECT_LANGUAGES.slice();
  configurationDocument.resource.customConfigurationName = KOREAN_FIELDWORK_CONFIGURATION_NAME;
  return configurationDocument;
};

const createInitialBoundaryDocuments = async (
  datastore: PouchdbDatastore,
  project: string,
  projectSetupDefaults: KoreanFieldworkProjectSetupDefaults,
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined
) => {
  if (!boundaryDraft) return;

  const db = datastore.getDb();
  const alreadyCreated = await db.get(
    KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID
  )
    .then(() => true)
    .catch(() => false);
  if (alreadyCreated) {
    await removeKoreanFieldworkProjectBoundaryDraft(project);
    return;
  }

  const geometry = projectWgs84BoundaryToSurveyBoundaryGeometry(
    boundaryDraft.coordinates
  );
  if (!geometry) return;

  const boundarySummary = projectSetupDefaults.boundarySummary?.trim()
    || getGeneratedBoundarySummary(boundaryDraft.coordinates.length);
  const operationDraft = createOperationDraft({
    boundarySummary,
    investigationModeId: projectSetupDefaults.investigationModeId,
  });
  operationDraft.resource.id = KOREAN_FIELDWORK_INITIAL_OPERATION_ID;
  operationDraft.resource.koreanFieldworkSystemRecord =
    KOREAN_FIELDWORK_INITIAL_BOUNDARY_SYSTEM_RECORD;
  const operationDocument = {
    resource: operationDraft.resource,
  } as Document;
  const boundaryDocument = createSurveyBoundaryDraft(
    operationDocument,
    getBoundaryGeometryCenter(geometry),
    boundarySummary,
    {
      boundaryAccuracy: SURVEY_BOUNDARY_ACCURACY_DEFAULT,
      boundarySource: SURVEY_BOUNDARY_SOURCE_DEFAULT,
      geometry,
      referenceBasemapProvider: getReferenceBasemapProviderForMapType(
        boundaryDraft.mapTypeId
      ),
    }
  );
  boundaryDocument.resource.id = KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID;
  boundaryDocument.resource.koreanFieldworkSystemRecord =
    KOREAN_FIELDWORK_INITIAL_BOUNDARY_SYSTEM_RECORD;

  await datastore.bulkCreate([operationDraft, boundaryDocument], '');
  await removeKoreanFieldworkProjectBoundaryDraft(project);
};

const getGeneratedBoundarySummary = (coordinateCount: number): string =>
  `지도에서 그린 조사 경계 (${coordinateCount}점)`;

const getReferenceBasemapProviderForMapType = (
  mapTypeId?: KoreanFieldworkBoundaryMapTypeId
): string => {
  if (mapTypeId === 'ROADMAP') return REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP;
  if (mapTypeId === 'SKYVIEW') return REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW;
  if (mapTypeId === 'BLANK') return REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS;

  return REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID;
};
