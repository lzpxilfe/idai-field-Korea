import React, { useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import DocumentsMap from '@/components/Project/DocumentsMap';
import {
  loadKoreanFieldworkProjectBoundaryDraft,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import type {
  KoreanFieldworkProjectBoundaryDraft,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import {
  getKoreanFieldworkProjectBoundaryDraftFromSurveyBoundaries,
} from '@/components/Project/korean-fieldwork-project-boundary';
import { ProjectContext } from '@/contexts/project-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import useKoreanFieldworkProjectSetupDefaults from '@/hooks/use-korean-fieldwork-project-setup-defaults';

const DocumentMapContainer: React.FC = () => {
  const {
    allDocuments,
    repository,
    relationsManager,
    syncStatus,
    setQ,
    onParentSelected,
  } = useContext(ProjectContext);
  const preferencesContext = useContext(PreferencesContext);
  const projectId = preferencesContext.preferences.currentProject;
  const { investigationModeId, boundarySummary } =
    useKoreanFieldworkProjectSetupDefaults(projectId, repository);
  const [boundaryDraft, setBoundaryDraft] =
    useState<KoreanFieldworkProjectBoundaryDraft>();
  const effectiveBoundaryDraft = useMemo(
    () => boundaryDraft
      ?? getKoreanFieldworkProjectBoundaryDraftFromSurveyBoundaries(allDocuments),
    [allDocuments, boundaryDraft]
  );

  useEffect(() => {
    let isMounted = true;

    if (!projectId) {
      setBoundaryDraft(undefined);
      return () => {
        isMounted = false;
      };
    }

    loadKoreanFieldworkProjectBoundaryDraft(projectId)
      .then((draft) => {
        if (isMounted) setBoundaryDraft(draft);
      })
      .catch(() => {
        if (isMounted) setBoundaryDraft(undefined);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (!repository || syncStatus === undefined) {
    return <ProjectMapLoadingState />;
  }

  return (
    <DocumentsMap
      repository={repository}
      issueSearch={setQ}
      syncStatus={syncStatus}
      relationsManager={relationsManager}
      selectParent={onParentSelected}
      investigationModeId={investigationModeId}
      boundarySummary={boundarySummary}
      boundaryDraft={effectiveBoundaryDraft}
    />
  );
};

const ProjectMapLoadingState: React.FC = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingTitle}>지도를 준비하고 있습니다</Text>
    <Text style={styles.loadingText}>
      현장 기록 저장소와 동기화 상태를 확인하는 중입니다.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#eef2f4',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: {
    color: '#20313a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    color: '#526272',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});

export default DocumentMapContainer;
