import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  Dispatch,
  SetStateAction,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Document, FindOptions, Query } from 'idai-field-core';
import usePouchDbDatastore from '@/hooks/use-pouchdb-datastore';
import useRepository from '@/hooks/use-repository';
import useSync from '@/hooks/use-sync';
import useRelationsManager from '@/hooks/use-relations-manager';
import { ConfigurationContext } from '@/contexts/configuration-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import { DocumentRepository } from '@/repositories/document-repository';
import { RelationsManager, SyncStatus } from 'idai-field-core';
import useProjectData from '@/hooks/use-project-data';
import useFieldworkImageSync from '@/hooks/use-fieldwork-image-sync';
import useSearch from '@/hooks/use-search';
import {router} from 'expo-router'

const ALL_DOCUMENTS_QUERY: Query = {};
const ALL_DOCUMENTS_FIND_OPTIONS: FindOptions = {
  includeResourcesWithoutValidParent: true,
};
const PROJECT_BOARD_MIN_LOADING_MS = 850;

interface ProjectOpeningGate {
  project: string;
  canShow: boolean;
}

interface ProjectContextType {
  q: string;
  documents: Document[];
  hierarchyPath: Document[];
  pushToHierarchy: (doc: Document) => void;
  popFromHierarchy: () => void;
  clearHierarchy: () => void;
  onDocumentSelected: (doc: Document) => void;
  onParentSelected: (doc: Document) => void;
  isInOverview: (category: string) => boolean;
  setQ: Dispatch<SetStateAction<string>>;
  repository: DocumentRepository | undefined;
  syncStatus: SyncStatus | undefined;
  relationsManager: RelationsManager | undefined;
  isPreparingProject: boolean;
}

const defaultProjectContext: ProjectContextType = {
  q: '',
  documents: [],
  hierarchyPath: [],
  pushToHierarchy: () => {},
  popFromHierarchy: () => {},
  clearHierarchy: () => {},
  onDocumentSelected: () => {},
  onParentSelected: () => {},
  isInOverview: () => false,
  setQ: () => {},
  repository: undefined,
  syncStatus: undefined,
  relationsManager: undefined,
  isPreparingProject: true,
};

export const ProjectContext = createContext<ProjectContextType>(defaultProjectContext);

export const ProjectContextProvider = ({ children }) => {
  const [q, setQ] = useState<string>('');

  const config = useContext(ConfigurationContext);
  const preferences = useContext(PreferencesContext);
  const currentProject = preferences.preferences.currentProject;
  const [projectOpeningGate, setProjectOpeningGate] =
    useState<ProjectOpeningGate>({
      project: currentProject,
      canShow: false,
    });

  useEffect(() => {
    setProjectOpeningGate({
      project: currentProject,
      canShow: false,
    });

    const timeoutId = setTimeout(
      () =>
        setProjectOpeningGate({
          project: currentProject,
          canShow: true,
        }),
      PROJECT_BOARD_MIN_LOADING_MS
    );

    return () => clearTimeout(timeoutId);
  }, [currentProject]);

  const pouchdbDatastore = usePouchDbDatastore(
    currentProject
  );

  const repository = useRepository(
    preferences.preferences.username,
    config,
    pouchdbDatastore
  );

  const syncStatus = useSync({
    project: currentProject,
    projectSettings:
      preferences.preferences.projects[currentProject],
    pouchdbDatastore,
  });

  const relationsManager = useRelationsManager(
    repository?.datastore,
    config,
    preferences.preferences.username
  );

  const {
    documents,
    hierarchyPath,
    pushToHierarchy,
    popFromHierarchy,
    clearHierarchy,
    isInOverview,
    hasLoadedInitialDocuments,
  } = useProjectData(repository, q);
  const allDocuments = useSearch(
    repository,
    ALL_DOCUMENTS_QUERY,
    ALL_DOCUMENTS_FIND_OPTIONS
  );

  useFieldworkImageSync({
    documents: allDocuments,
    project: currentProject,
    projectSettings:
      preferences.preferences.projects[currentProject],
    repository,
    syncStatus,
  });

  const onDocumentSelected = (doc: Document) => {
    router.navigate({
      pathname: '/ProjectScreen/DocumentsMap',
      params: { highlightedDocId: doc.resource.id },
    });
  };

// useEffect(() => {

//   if (!hierarchyBack && !hierarchyPath.length) {
//       hierarchyNavigationRef.current?.dispatch(StackActions.push('DocumentsList', documents));
//   } else if (hierarchyNavigationRef.current?.canGoBack()) {
//       hierarchyNavigationRef.current.goBack();
//   }
// // necessary in order to prevent calling the effect when hierarchyBack changes
// // eslint-disable-next-line react-hooks/exhaustive-deps
// }, [documents]);


  const onParentSelected = (doc: Document) => {
    pushToHierarchy(doc);
    router.navigate({
      pathname: '/ProjectScreen/DocumentsMap',
      params: { highlightedDocId: doc.resource.id },
    });
  };


  const isPreparingProject =
    !repository ||
    !hasLoadedInitialDocuments ||
    projectOpeningGate.project !== currentProject ||
    !projectOpeningGate.canShow;

  if (isPreparingProject) {
    return <ProjectOpeningLoadingState projectName={currentProject} />;
  }


  return (
    <ProjectContext.Provider
      value={{
        documents,
        hierarchyPath,
        pushToHierarchy,
        popFromHierarchy,
        clearHierarchy,
        isInOverview,
        q,
        setQ,
        syncStatus,
        repository,
        relationsManager,
        isPreparingProject,
        onDocumentSelected,
        onParentSelected,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

const ProjectOpeningLoadingState = ({
  projectName,
}: {
  projectName?: string;
}) => (
  <View style={styles.loadingContainer} testID="project-opening-loading-state">
    <ActivityIndicator color="#2f5f4a" size="large" />
    <Text style={styles.loadingTitle}>현장 기록판을 준비하고 있습니다</Text>
    <Text style={styles.loadingText}>
      {projectName
        ? `${projectName} 프로젝트 기록을 불러오는 중입니다.`
        : '프로젝트 기록을 불러오는 중입니다.'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#f7faf8',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: '#20313a',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: '#526272',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
});
