import type { Document } from 'idai-field-core';
import {
  ConfigReader,
  ConfigurationDocument,
  IdGenerator,
  KOREAN_FIELDWORK_CONFIGURATION_NAME,
  PouchdbDatastore,
  SampleDataLoaderBase,
} from 'idai-field-core';
import { useEffect, useState } from 'react';
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
  SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  SURVEY_BOUNDARY_SOURCE_DEFAULT,
} from '@/components/Project/Map/korean-fieldwork-drafts';
import {
  isSampleProject,
  SAMPLE_PROJECT_LABEL,
} from '@/constants/sample-project';

PouchDB.plugin(require('@neighbourhoodie/pouchdb-asyncstorage-adapter').default)

const INITIAL_OPERATION_ID = 'initial-fieldwork-operation';
const INITIAL_SURVEY_BOUNDARY_ID = 'initial-survey-boundary';

const usePouchDbDatastore = (project: string): PouchdbDatastore | undefined => {
  const [pouchdbDatastore, setpouchdbDatastore] = useState<PouchdbDatastore>();

  useEffect(() => {
    setpouchdbDatastore(undefined);

    if (project.trim().length === 0) {
      return;
    }

    let isCancelled = false;
    let activeManager: PouchdbDatastore | undefined;
    const managerPromise = buildpouchdbDatastore(project)
      .then((manager) => {
        if (isCancelled) {
          manager.close();
          return manager;
        }

        activeManager = manager;
        setpouchdbDatastore(manager);
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
  }, [project]);

  return pouchdbDatastore;
};

export default usePouchDbDatastore;

const buildpouchdbDatastore = async (
  project: string
): Promise<PouchdbDatastore> => {
  const datastore = new PouchdbDatastore(
    (name: string) => new PouchDB(name),
    new IdGenerator()
  );
  const projectSetupDefaults = isSampleProject(project)
    ? {}
    : await loadKoreanFieldworkProjectSetupDefaults(project)
        .catch(() => ({}));

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
      projectSetupDefaults
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

const createProjectDocument = async (
  project: string,
  projectSetupDefaults: KoreanFieldworkProjectSetupDefaults = {}
) => {
  return {
    _id: 'project',
    resource: {
      id: 'project',
      identifier: isSampleProject(project) ? SAMPLE_PROJECT_LABEL : project,
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
  projectSetupDefaults: KoreanFieldworkProjectSetupDefaults
) => {
  const boundaryDraft = await loadKoreanFieldworkProjectBoundaryDraft(project);
  if (!boundaryDraft) return;

  const db = datastore.getDb();
  const alreadyCreated = await db.get(INITIAL_SURVEY_BOUNDARY_ID)
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
  operationDraft.resource.id = INITIAL_OPERATION_ID;
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
  boundaryDocument.resource.id = INITIAL_SURVEY_BOUNDARY_ID;

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

  return REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID;
};
