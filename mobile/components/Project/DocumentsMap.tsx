import {
  Document,
  getKoreanFieldworkTodaySummary,
  RelationsManager,
  SyncStatus,
} from 'idai-field-core';
import React, {
  ReactElement,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Alert, Keyboard, StyleSheet, View } from 'react-native';
import useToast from '@/hooks/use-toast';
import { DocumentRepository } from '@/repositories/document-repository';
import { ToastType } from '@/components/common/Toast/ToastProvider';
import Button from '@/components/common/Button';
import DocumentAddModal from './DocumentAddModal';
import DocumentRemoveModal from './DocumentRemoveModal';
import KoreanFieldworkTodayBoard from './KoreanFieldworkTodayBoard';

import Map from './Map/Map';
import { router, useGlobalSearchParams } from 'expo-router';
import SearchBar from './SearchBar';
import { ProjectContext } from '@/contexts/project-context';
import type {
  KoreanFieldworkInvestigationModeId,
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getKoreanFieldworkUserVisibleDocuments,
  getKoreanFieldworkUserVisibleTodaySummary,
} from './korean-fieldwork-system-records';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  KOREAN_FIELDWORK_MAP_VIEW_PARAM,
  KOREAN_FIELDWORK_MAP_VIEWS,
} from './korean-fieldwork-navigation';
interface DocumentsMapProps {
  repository: DocumentRepository;
  syncStatus: SyncStatus;
  relationsManager?: RelationsManager;
  issueSearch: (q: string) => void;
  selectParent: (doc: Document) => void;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  boundarySummary?: string;
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
}

const DocumentsMap: React.FC<DocumentsMapProps> = ({
  repository,
  syncStatus,
  relationsManager,
  issueSearch,
  selectParent,
  investigationModeId,
  boundarySummary,
  boundaryDraft,
}): ReactElement => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isDeleteModelOpen, setIsDeleteModelOpen] = useState<boolean>(false);
  const [highlightedDoc, setHighlightedDoc] = useState<Document>();
  const [addModalInitialCategoryName, setAddModalInitialCategoryName] =
    useState<string>();
  const [addModalInitialDraftParams, setAddModalInitialDraftParams] =
    useState<Record<string, string>>({});
  const [satellitePickerRequestId, setSatellitePickerRequestId] = useState(0);
  const [boundaryFileImportRequestId, setBoundaryFileImportRequestId] =
    useState(0);
  // TODO: configure expo router to load params
  const params = useGlobalSearchParams();

  const { showToast } = useToast();
  const { documents, onDocumentSelected } = useContext(ProjectContext);
  const todaySummary = useMemo(
    () => getKoreanFieldworkTodaySummary(documents),
    [documents]
  );
  const userVisibleDocuments = useMemo(
    () => getKoreanFieldworkUserVisibleDocuments(documents),
    [documents]
  );
  const userVisibleTodaySummary = useMemo(
    () => getKoreanFieldworkUserVisibleTodaySummary(
      todaySummary,
      userVisibleDocuments
    ),
    [todaySummary, userVisibleDocuments]
  );
  const mapView = getStringParam(params?.[KOREAN_FIELDWORK_MAP_VIEW_PARAM]);
  const isSiteOverviewMap =
    mapView === KOREAN_FIELDWORK_MAP_VIEWS.SITE_OVERVIEW;
  const selectedDocumentIds = useMemo(
    () => isSiteOverviewMap ? [] : documents.map((doc) => doc.resource.id),
    [documents, isSiteOverviewMap]
  );
  const highlightedDocId = isSiteOverviewMap
    ? undefined
    : getStringParam(params?.highlightedDocId);

  const onQrCodeScanned = useCallback(
    (data: string) => {
      repository
        ?.find({ constraints: { 'identifier:match': data } })
        .then(({ documents: [doc] }) => {
          router.navigate({
            pathname: '/ProjectScreen/DocumentEdit',
            params: {
              docId: doc.resource.id,
              categoryName: doc.resource.category,
            },
          });
        })
        .catch(() =>
          Alert.alert('Not found', `Resource  '${data}' is not available`, [
            { text: 'OK' },
          ])
        );
    },
    [repository]
  );

  const handleAddDocument = (parentDoc: Document) => {
    setHighlightedDoc(parentDoc);
    setAddModalInitialCategoryName(undefined);
    setAddModalInitialDraftParams({});
    setIsAddModalOpen(true);
  };

  const handleAddDocumentOfCategory = (
    parentDoc: Document,
    categoryName: string,
    draftParams: Record<string, string> = {}
  ) => {
    if (
      categoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE
      && !draftParams.identifier?.trim()
    ) {
      setHighlightedDoc(parentDoc);
      setAddModalInitialCategoryName(KOREAN_FIELDWORK_CATEGORIES.FEATURE);
      setAddModalInitialDraftParams(draftParams);
      setIsAddModalOpen(true);
      return;
    }

    router.navigate({
      pathname: '/ProjectScreen/DocumentAdd',
      params: {
        parentDocId: parentDoc.resource.id,
        categoryName,
        ...draftParams,
      },
    });
  };

  const handleEditDocument = (docId: string, categoryName: string) => {
    router.navigate({
      pathname: '/ProjectScreen/DocumentEdit',
      params: { docId, categoryName },
    });
  };

  const openSatellitePicker = useCallback(() => {
    setSatellitePickerRequestId((value) => value + 1);
  }, []);

  const openBoundaryFileImport = useCallback(() => {
    setBoundaryFileImportRequestId((value) => value + 1);
  }, []);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddModalInitialCategoryName(undefined);
    setAddModalInitialDraftParams({});
  };

  const openRemoveDocument = (doc: Document) => {
    if (!relationsManager) {
      showToast(
        ToastType.Error,
        '관계 색인을 준비하는 중입니다. 잠시 후 다시 삭제해 주세요.'
      );
      return;
    }

    setHighlightedDoc(doc);
    setIsDeleteModelOpen(true);
  };

  const closeDeleteModal = () => setIsDeleteModelOpen(false);

  const onRemoveDocument = (doc: Document | undefined) => {
    if (!relationsManager) {
      showToast(
        ToastType.Error,
        '관계 색인을 준비하는 중입니다. 잠시 후 다시 삭제해 주세요.'
      );
      return;
    }

    if (doc) {
      const isRecordedIn = doc.resource.relations.isRecordedIn
        ? doc.resource.relations.isRecordedIn[0]
        : '';
      const identifier = doc.resource.identifier;

      relationsManager
        .remove(doc, { descendants: true })
        .then(() => {
          setIsDeleteModelOpen(false);
          showToast(ToastType.Info, `Removed ${identifier}`);
          router.navigate({
            pathname: '/ProjectScreen/DocumentsMap',
            params: isRecordedIn ? { highlightedDocId: isRecordedIn } : {},
          });
        })
        .catch((err) => {
          showToast(ToastType.Error, `Could not remove ${identifier}: ${err}`);
          Keyboard.dismiss();
        });
    }
  };

  const navigateAddCategory = (
    categoryName: string,
    parentDoc: Document | undefined,
    draftParams: Record<string, string> = {}
  ) => {
    if (!parentDoc) {
      closeAddModal();
      return;
    }

    if (
      categoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE
      && !draftParams.identifier?.trim()
    ) {
      setHighlightedDoc(parentDoc);
      setAddModalInitialCategoryName(KOREAN_FIELDWORK_CATEGORIES.FEATURE);
      setAddModalInitialDraftParams(draftParams);
      setIsAddModalOpen(true);
      return;
    }

    closeAddModal();
    router.navigate({
      pathname: '/ProjectScreen/DocumentAdd',
      params: {
        parentDocId: parentDoc.resource.id,
        categoryName,
        ...draftParams,
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {isAddModalOpen && (
        <DocumentAddModal
          boundaryDraft={boundaryDraft}
          existingDocuments={userVisibleDocuments}
          initialCategoryName={addModalInitialCategoryName}
          initialDraftParams={addModalInitialDraftParams}
          investigationModeId={investigationModeId}
          onClose={closeAddModal}
          parentDoc={highlightedDoc}
          onAddCategory={navigateAddCategory}
        />
      )}
      {isDeleteModelOpen && (
        <DocumentRemoveModal
          onClose={closeDeleteModal}
          onRemoveDocument={onRemoveDocument}
          doc={highlightedDoc}
        />
      )}
      <SearchBar
        {...{
          issueSearch,
          syncStatus,
          onQrCodeScanned,
        }}
      />
      <View style={styles.visibleMapActions}>
        <Button
          title="지도 선택"
          variant="secondary"
          onPress={openSatellitePicker}
          icon={<MaterialIcons name="satellite-alt" size={18} />}
          style={styles.visibleMapActionButton}
        />
        <Button
          title="SHP/DXF/GeoJSON"
          variant="secondary"
          onPress={openBoundaryFileImport}
          icon={<MaterialIcons name="folder-open" size={18} />}
          style={styles.visibleMapActionButton}
        />
      </View>
      <KoreanFieldworkTodayBoard
        summary={todaySummary}
        displaySummary={userVisibleTodaySummary}
        documents={documents}
        investigationModeId={investigationModeId}
        onEditDocument={handleEditDocument}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={onDocumentSelected}
      />
      <View style={styles.container}>
        <Map
          repository={repository}
          documents={documents}
          selectedDocumentIds={selectedDocumentIds}
          highlightedDocId={highlightedDocId}
          focusMode={isSiteOverviewMap ? 'siteOverview' : 'selectedDocuments'}
          addDocument={handleAddDocument}
          addDocumentOfCategory={handleAddDocumentOfCategory}
          editDocument={handleEditDocument}
          removeDocument={openRemoveDocument}
          selectParent={selectParent}
          readinessIssues={todaySummary.openIssues}
          investigationModeId={investigationModeId}
          boundarySummary={boundarySummary}
          satellitePickerRequestId={satellitePickerRequestId}
          boundaryFileImportRequestId={boundaryFileImportRequestId}
        />
      </View>
    </View>
  );
};

const getStringParam = (
  param: string | string[] | undefined
): string | undefined => Array.isArray(param) ? param[0] : param;

const styles = StyleSheet.create({
  visibleMapActions: {
    alignItems: 'flex-end',
    backgroundColor: '#eef2f4',
    borderBottomColor: '#d7e0e7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  visibleMapActionButton: {
    minWidth: 176,
  },
  container: {
    flex: 1,
  },
});

export default DocumentsMap;
