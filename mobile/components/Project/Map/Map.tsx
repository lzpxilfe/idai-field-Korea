import * as Location from 'expo-location';
import {
  Document,
  KoreanFieldworkReadinessIssue,
} from 'idai-field-core';
import proj4 from 'proj4';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  LayoutRectangle,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import useMapData from '@/hooks/use-mapdata';
import { DocumentRepository } from '@/repositories/document-repository';
import { ConfigurationContext } from '@/contexts/configuration-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import Button from '@/components/common/Button';
import GLMap from './GLMap/GLMap';
import {
  createOperationDraft as buildOperationDraft,
  createPenMemoDraft as buildPenMemoDraft,
  createSoilProfilePhotoDraft as buildSoilProfilePhotoDraft,
  createSurveyBoundaryDraft as buildSurveyBoundaryDraft,
  MapLocation,
  REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID,
  REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP,
  REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW,
  REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS,
  SurveyBoundaryGeometry,
  SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  SURVEY_BOUNDARY_ACCURACY_IMPORTED_REFERENCE,
  SURVEY_BOUNDARY_SOURCE_DEFAULT,
} from './korean-fieldwork-drafts';
import {
  getKoreanFieldworkMapStartPanelCopy,
} from './korean-fieldwork-map-start-panel';
import {
  getKakaoSatelliteBasemapStatusMessage,
  KAKAO_SATELLITE_BASEMAP_TITLE,
} from './korean-fieldwork-map-provider-status';
import KakaoSatellitePicker, {
  KakaoSatellitePickedBoundary,
  KakaoSatellitePickedLocation,
} from './KakaoSatellitePicker';
import {
  createOperationRelationUpdate,
  getOperationWrapConfirmationMessage,
  getLegacyRootDocumentsForOperation,
  OPERATION_WRAP_CONFIRMATION_TITLE,
} from '../korean-fieldwork-operation-wrap';
import {
  KOREAN_FIELDWORK_CATEGORIES,
  SOIL_PROFILE_PHOTO_TARGET_CATEGORIES,
} from '../korean-fieldwork-categories';
import MapBottomSheet from './MapBottomSheet';
import {
  KoreanFieldworkInvestigationModeId,
  shouldUseKoreanFieldworkTrenchWorkflow,
} from '../korean-fieldwork-investigation-mode';
import { isKoreanFieldworkChecklistRecord } from '../korean-fieldwork-quick-record';
import BoundaryFileImportModal from './BoundaryFileImportModal';
import {
  ImportedBoundaryFile,
  importBoundaryFileFromPath,
} from './boundary-file-import';

const FEATURE_GEOMETRY_EDIT_STATUS_NEEDS_AERIAL_ALIGNMENT = 'needsAerialAlignment';
const FEATURE_GEOMETRY_EDIT_STATUS_ADJUSTED_TO_AERIAL_LAYER = 'adjustedToAerialLayer';
const GEOMETRY_SOURCE_AERIAL_LAYER_TRACE = 'aerialLayerTrace';
const GEOMETRY_CONFIDENCE_AERIAL_ALIGNED = 'aerialAligned';
const DEFAULT_KAKAO_PICKER_LOCATION = {
  latitude: 37.5665,
  longitude: 126.9780,
};
const BOUNDARY_IMPORT_SYNC_DETAIL =
  'SHP/DXF/GeoJSON은 태블릿에서 파일 선택으로 바로 가져오거나, 데스크톱에서 가져온 뒤 같은 프로젝트로 동기화해 조사 경계로 확인할 수 있습니다. 현장에서는 GPS 임시 경계나 위성지도 위치도 바로 보탤 수 있습니다.';

const getKakaoSatelliteBoundaryMetadata = (
  mapTypeId?: KakaoSatellitePickedBoundary['mapTypeId']
) => ({
  boundaryAccuracy: SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  boundarySource: SURVEY_BOUNDARY_SOURCE_DEFAULT,
  referenceBasemapProvider: getReferenceBasemapProviderForKakaoMapType(mapTypeId),
});

// define projection standards
proj4.defs(
  'WGS84',
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
);
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
// eslint-disable-next-line max-len
proj4.defs(
  'EPSG:3857',
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs'
);

interface MapProps {
  repository: DocumentRepository;
  documents: Document[];
  selectedDocumentIds: string[];
  highlightedDocId?: string;
  focusMode?: 'selectedDocuments' | 'siteOverview';
  addDocument: (parentDoc: Document) => void;
  addDocumentOfCategory: (
    parentDoc: Document,
    categoryName: string,
    draftParams?: Record<string, string>
  ) => void;
  editDocument: (docID: string, categoryName: string) => void;
  removeDocument: (doc: Document) => void;
  selectParent: (doc: Document) => void;
  readinessIssues: KoreanFieldworkReadinessIssue[];
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  boundarySummary?: string;
  satellitePickerRequestId?: number;
  boundaryFileImportRequestId?: number;
}

const Map: React.FC<MapProps> = (props) => {
  const config = useContext(ConfigurationContext);
  const preferences = useContext(PreferencesContext);
  const [screen, setScreen] = useState<LayoutRectangle>();
  const [highlightedDoc, setHighlightedDoc] = useState<Document>();
  const [location, setLocation] = useState<MapLocation>();
  const [wgs84Location, setWgs84Location] = useState<KakaoSatellitePickedLocation>();
  const [isKakaoSatellitePickerOpen, setIsKakaoSatellitePickerOpen] = useState(false);
  const [isBoundaryFileImportOpen, setIsBoundaryFileImportOpen] = useState(false);
  const currentMapProviderSettings = preferences.preferences.mapProviderSettings;

  const [
    geoDocuments,
    layerDocuments,
    documentToWorldMatrix,
    screenToWorldMatrix,
    viewBox,
    focusMapOnDocumentId,
    updateDoc,
  ] = useMapData(props.repository, props.selectedDocumentIds, screen, {
    focusMode: props.focusMode ?? 'selectedDocuments',
  });

  const setHighlightedDocFromId = useCallback(
    (docId: string) => props.repository.get(docId).then(setHighlightedDoc),
    [props.repository]
  );

  useEffect(() => {
    if (!props.highlightedDocId) return;
    setHighlightedDocFromId(props.highlightedDocId);
  }, [props.highlightedDocId, setHighlightedDocFromId]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    let isMounted = true;

    const updateLocation = (coords: Location.LocationObjectCoords) => {
      try {
        const { latitude, longitude } = coords;
        const projected = projectWgs84ToMapLocation({ latitude, longitude });
        if (isMounted) {
          setWgs84Location({ latitude, longitude });
          if (projected) setLocation(projected);
        }
      } catch (error) {
        console.warn('Unable to update map location', error);
      }
    };

    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;
        updateLocation(currentLocation.coords);

        const nextSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 2,
            timeInterval: 5000,
          },
          (nextLocation) => updateLocation(nextLocation.coords)
        );
        if (isMounted) subscription = nextSubscription;
        else nextSubscription.remove();
      } catch (error) {
        console.warn('Unable to initialize map location', error);
      }
    };

    void initializeLocation();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  const canCreateSoilProfilePhoto =
    !!highlightedDoc &&
    !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO) &&
    SOIL_PROFILE_PHOTO_TARGET_CATEGORIES.includes(highlightedDoc.resource.category);

  const operationDocuments = props.documents.filter(
    (document) => document.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION
  );
  const [primaryOperation] = operationDocuments;
  const usesTrenchWorkflow =
    shouldUseKoreanFieldworkTrenchWorkflow(props.investigationModeId);
  const legacyRootDocuments = operationDocuments.length === 0
    ? getLegacyRootDocumentsForOperation(props.documents)
    : [];
  const hasLegacyRecordsToWrap = legacyRootDocuments.length > 0;

  const canCreateSurveyBoundary =
    !!highlightedDoc &&
    !!location &&
    !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY) &&
    highlightedDoc.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION;
  const canCreateSurveyBoundaryInPrimaryOperation =
    !!primaryOperation &&
    !!location &&
    !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY);

  const featureParent = getFeatureCandidateParent(
    highlightedDoc,
    props.documents,
    props.investigationModeId
  );
  const canCreateFeatureCandidate =
    !!featureParent && !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.FEATURE);
  const canCreateOperation = !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.OPERATION);
  const canCreateTrench =
    usesTrenchWorkflow
    && !!primaryOperation
    && !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.TRENCH);
  const shouldCreateTrenchFromQuickCreate =
    usesTrenchWorkflow && !featureParent;
  const canUseQuickCreateAction = shouldCreateTrenchFromQuickCreate
    ? canCreateTrench
    : canCreateFeatureCandidate;
  const quickCreateTitle = shouldCreateTrenchFromQuickCreate
    ? '트렌치 추가'
    : '유구 추가';
  const quickCreateHint = shouldCreateTrenchFromQuickCreate
    ? '시굴·표본조사는 트렌치 위치를 먼저 잡은 뒤 유구를 기록합니다.'
    : '조사 경계 위에 유구 위치와 형태를 평면으로 그립니다.';
  const hasRenderableMapContent = geoDocuments.length > 0 || layerDocuments.length > 0;
  const hasSurveyBoundaryGeometry = geoDocuments.some((document) =>
    document.resource.category === KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY
  );
  const shouldShowStartPanel = operationDocuments.length === 0 || !hasRenderableMapContent;
  const shouldShowQuickCreate = !!primaryOperation;
  const hasMeasuredMapScreen =
    !!screen
    && Number.isFinite(screen.width)
    && Number.isFinite(screen.height)
    && screen.width > 0
    && screen.height > 0;
  const shouldRenderInteractiveMap = hasMeasuredMapScreen && !shouldShowStartPanel;
  const canStartSurveyBoundaryFlow =
    canCreateOperation
    && !!location
    && !!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY);
  const startPanelCopy = getKoreanFieldworkMapStartPanelCopy({
    hasBoundarySummary: !!props.boundarySummary?.trim(),
    hasLegacyRecordsToWrap,
    hasPrimaryOperation: !!primaryOperation,
    legacyRootDocumentCount: legacyRootDocuments.length,
  });

  const createOperation = async (): Promise<Document | undefined> => {
    if (!canCreateOperation) return undefined;

    const createdDocument = await props.repository.create(buildOperationDraft({
      legacyRootDocumentCount: legacyRootDocuments.length,
      investigationModeId: props.investigationModeId,
      boundarySummary: props.boundarySummary,
      existingOperationIdentifiers: operationDocuments.map((document) =>
        document.resource.identifier),
      projectId: preferences.preferences.currentProject,
    }));
    if (legacyRootDocuments.length > 0) {
      await Promise.all(legacyRootDocuments.map((document) =>
        props.repository.update(createOperationRelationUpdate(
          document,
          createdDocument
        ))));
    }

    setHighlightedDoc(createdDocument);
    return createdDocument;
  };

  const createOperationThenSurveyBoundary = async () => {
    const createdDocument = await createOperation();
    if (!createdDocument) return;

    if (location && config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY)) {
      await createSurveyBoundaryForOperation(createdDocument, location);
      return;
    }

    props.editDocument(createdDocument.resource.id, KOREAN_FIELDWORK_CATEGORIES.OPERATION);
  };

  const confirmCreateOperationAndEdit = () => {
    if (!hasLegacyRecordsToWrap) {
      void createOperationThenSurveyBoundary();
      return;
    }

    Alert.alert(
      OPERATION_WRAP_CONFIRMATION_TITLE,
      getOperationWrapConfirmationMessage(legacyRootDocuments.length),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '조사 경계 생성',
          onPress: () => { void createOperationThenSurveyBoundary(); },
        },
      ]
    );
  };

  const openBoundaryFileImport = useCallback(() => {
    if (!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY)) {
      Alert.alert(
        'SHP/DXF/GeoJSON 경계 가져오기',
        `조사 경계 문서 유형을 사용할 수 없어 파일을 가져올 수 없습니다. ${BOUNDARY_IMPORT_SYNC_DETAIL}`,
        [{ text: '확인' }]
      );
      return;
    }

    setIsBoundaryFileImportOpen(true);
  }, [config]);

  const showSatelliteBasemapInfo = useCallback(() => {
    const javaScriptKey = currentMapProviderSettings.kakaoMapJavaScriptKey.trim();
    if (javaScriptKey) {
      setIsKakaoSatellitePickerOpen(true);
      return;
    }

    Alert.alert(
      KAKAO_SATELLITE_BASEMAP_TITLE,
      getKakaoSatelliteBasemapStatusMessage(currentMapProviderSettings),
      [{ text: '확인' }]
    );
  }, [currentMapProviderSettings]);

  const openSatellitePicker = useCallback(() => {
    showSatelliteBasemapInfo();
  }, [showSatelliteBasemapInfo]);

  useEffect(() => {
    if (!props.satellitePickerRequestId) return;
    openSatellitePicker();
  }, [openSatellitePicker, props.satellitePickerRequestId]);

  useEffect(() => {
    if (!props.boundaryFileImportRequestId) return;
    openBoundaryFileImport();
  }, [openBoundaryFileImport, props.boundaryFileImportRequestId]);

  const editPrimaryOperation = () => {
    if (!primaryOperation) return;

    setHighlightedDoc(primaryOperation);
    props.editDocument(primaryOperation.resource.id, KOREAN_FIELDWORK_CATEGORIES.OPERATION);
  };

  const createTrenchInPrimaryOperation = () => {
    if (!primaryOperation || !canCreateTrench) return;

    setHighlightedDoc(primaryOperation);
    props.addDocumentOfCategory(primaryOperation, KOREAN_FIELDWORK_CATEGORIES.TRENCH);
  };

  const openFeatureSketchCreation = () => {
    if (!featureParent || !config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.FEATURE)) return;

    setHighlightedDoc(featureParent);
    props.addDocumentOfCategory(
      featureParent,
      KOREAN_FIELDWORK_CATEGORIES.FEATURE
    );
  };

  const createFeatureCandidateAndEdit = openFeatureSketchCreation;
  const runQuickCreateAction = () => {
    if (shouldCreateTrenchFromQuickCreate) {
      createTrenchInPrimaryOperation();
      return;
    }

    createFeatureCandidateAndEdit();
  };

  const createPenMemoDraft = async () => {
    if (!highlightedDoc || !config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO)) return;

    const createdDocument = await props.repository.create(
      buildPenMemoDraft(highlightedDoc, props.documents)
    );

    props.editDocument(createdDocument.resource.id, KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO);
  };

  const createSoilProfilePhotoDraft = async () => {
    if (!highlightedDoc || !canCreateSoilProfilePhoto) return;

    const createdDocument = await props.repository.create(
      buildSoilProfilePhotoDraft(highlightedDoc, props.documents)
    );

    props.editDocument(createdDocument.resource.id, KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO);
  };

  const createSurveyBoundaryForOperation = async (
    operationDoc: Document,
    boundaryLocation?: MapLocation,
    boundaryMetadata?: {
      boundaryAccuracy?: string;
      boundarySource?: string;
      geometry?: SurveyBoundaryGeometry;
      referenceBasemapProvider?: string;
    },
    boundarySummary: string | undefined = props.boundarySummary,
    options: { openEditor?: boolean; focusOnMap?: boolean } = {}
  ) => {
    if (!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY)) return;

    const createdDocument = await props.repository.create(
      buildSurveyBoundaryDraft(operationDoc, boundaryLocation, boundarySummary, boundaryMetadata)
    );

    setHighlightedDoc(createdDocument);
    if (options.focusOnMap) {
      setTimeout(() => focusMapOnDocumentId(createdDocument.resource.id), 250);
    }
    if (options.openEditor !== false) {
      props.editDocument(createdDocument.resource.id, KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY);
    }
    return createdDocument;
  };

  const createSurveyBoundaryFromImportedFile = async (
    importedBoundary: ImportedBoundaryFile
  ) => {
    const centerLocation =
      importedBoundary.center ?? getBoundaryGeometryCenter(importedBoundary.geometry);
    if (centerLocation) setLocation(centerLocation);

    const operationDoc = primaryOperation ?? await createOperation();
    if (!operationDoc) {
      throw new Error('조사 구역을 만들 수 없어 경계를 저장하지 못했습니다.');
    }

    const importSummary = getImportedBoundarySummary(
      importedBoundary,
      props.boundarySummary
    );
    await createSurveyBoundaryForOperation(
      operationDoc,
      centerLocation,
      {
        boundaryAccuracy: SURVEY_BOUNDARY_ACCURACY_IMPORTED_REFERENCE,
        boundarySource: importedBoundary.boundarySource,
        geometry: importedBoundary.geometry,
        referenceBasemapProvider: importedBoundary.referenceBasemapProvider,
      },
      importSummary
    );

    setIsBoundaryFileImportOpen(false);
    Alert.alert(
      'SHP/DXF/GeoJSON 경계 가져오기',
      `${importedBoundary.fileName} 파일에서 ${importedBoundary.coordinateCount}개 좌표를 조사 경계로 저장했습니다.`,
      [{ text: '확인' }]
    );
  };

  const importBoundaryFile = async (filePath: string) => {
    const importedBoundary = await importBoundaryFileFromPath(filePath);
    await createSurveyBoundaryFromImportedFile(importedBoundary);
  };

  const createSurveyBoundaryDraft = async () => {
    if (!highlightedDoc || !location || !canCreateSurveyBoundary) return;

    await createSurveyBoundaryForOperation(highlightedDoc, location);
  };

  const createPrimarySurveyBoundaryDraft = async () => {
    if (!primaryOperation || !location || !canCreateSurveyBoundaryInPrimaryOperation) return;

    await createSurveyBoundaryForOperation(primaryOperation, location);
  };

  const createSurveyBoundaryFromKakaoSatelliteBoundary = async (
    pickedBoundary: KakaoSatellitePickedBoundary
  ) => {
    const boundaryGeometry =
      projectKakaoBoundaryToSurveyBoundaryGeometry(pickedBoundary.coordinates);
    if (!boundaryGeometry) {
      Alert.alert(
        '지도 경계',
        '선택한 경계 좌표를 지도 좌표로 변환하지 못했습니다.',
        [{ text: '확인' }]
      );
      return;
    }
    const centerLocation = pickedBoundary.center
      ? projectWgs84ToMapLocation(pickedBoundary.center)
      : getBoundaryGeometryCenter(boundaryGeometry);

    setWgs84Location(
      pickedBoundary.center ?? getWgs84BoundaryCenter(pickedBoundary.coordinates)
    );
    if (centerLocation) setLocation(centerLocation);
    setIsKakaoSatellitePickerOpen(false);

    const boundaryMetadata = {
      ...getKakaoSatelliteBoundaryMetadata(pickedBoundary.mapTypeId),
      geometry: boundaryGeometry,
    };

    if (primaryOperation) {
      await createSurveyBoundaryForOperation(
        primaryOperation,
        centerLocation,
        boundaryMetadata,
        props.boundarySummary,
        { focusOnMap: true, openEditor: false }
      );
      return;
    }

    const createdOperation = await createOperation();
    if (createdOperation) {
      await createSurveyBoundaryForOperation(
        createdOperation,
        centerLocation,
        boundaryMetadata,
        props.boundarySummary,
        { focusOnMap: true, openEditor: false }
      );
    }
  };

  const updateHighlightedFeatureGeometryState = async (
    featureGeometryEditStatus: string,
    patch: Record<string, unknown> = {}
  ) => {
    if (
      !highlightedDoc ||
      !isKoreanFieldworkChecklistRecord(
        highlightedDoc.resource.category,
        props.investigationModeId
      )
    ) {
      return;
    }

    const updatedDocument = await props.repository.update({
      ...highlightedDoc,
      resource: {
        ...highlightedDoc.resource,
        ...patch,
        featureGeometryEditStatus,
        featureGeometryRevisionHistory: appendGeometryRevisionHistory(
          highlightedDoc,
          featureGeometryEditStatus
        ),
      },
    });

    setHighlightedDoc(updatedDocument);
  };

  const markGeometryNeedsAerialAlignment = async () => {
    await updateHighlightedFeatureGeometryState(
      FEATURE_GEOMETRY_EDIT_STATUS_NEEDS_AERIAL_ALIGNMENT
    );
  };

  const markGeometryAdjustedToAerialLayer = async () => {
    await updateHighlightedFeatureGeometryState(
      FEATURE_GEOMETRY_EDIT_STATUS_ADJUSTED_TO_AERIAL_LAYER,
      {
        geometrySource: GEOMETRY_SOURCE_AERIAL_LAYER_TRACE,
        geometryConfidence: GEOMETRY_CONFIDENCE_AERIAL_ALIGNED,
      }
    );
  };

  const toggleFeatureWorkflowStep = async (stepValue: string) => {
    if (
      !highlightedDoc ||
      !isKoreanFieldworkChecklistRecord(
        highlightedDoc.resource.category,
        props.investigationModeId
      )
    ) {
      return;
    }

    const currentValues = Array.isArray(
      (highlightedDoc.resource as any).featureInvestigationChecklist
    )
      ? (highlightedDoc.resource as any).featureInvestigationChecklist
      : [];
    const nextValues = currentValues.includes(stepValue)
      ? currentValues.filter((value: string) => value !== stepValue)
      : [...currentValues, stepValue];

    const updatedDocument = await props.repository.update({
      ...highlightedDoc,
      resource: {
        ...highlightedDoc.resource,
        featureInvestigationChecklist: nextValues,
      },
    });

    setHighlightedDoc(updatedDocument);
  };

  const onParentIdSelected = (docId: string) => {
    const doc = geoDocuments.find((doc) => doc.resource.id === docId);
    doc && props.selectParent(doc);
  };

  const handleLayoutChange = (event: LayoutChangeEvent) =>
    setScreen(event.nativeEvent.layout);

  return (
    <View style={styles.container} onLayout={handleLayoutChange}>
      <KakaoSatellitePicker
        initialLocation={wgs84Location ?? DEFAULT_KAKAO_PICKER_LOCATION}
        javaScriptKey={currentMapProviderSettings.kakaoMapJavaScriptKey}
        onClose={() => setIsKakaoSatellitePickerOpen(false)}
        onPickBoundary={(pickedBoundary) => {
          void createSurveyBoundaryFromKakaoSatelliteBoundary(pickedBoundary);
        }}
        visible={isKakaoSatellitePickerOpen}
      />
      <BoundaryFileImportModal
        onClose={() => setIsBoundaryFileImportOpen(false)}
        onImport={importBoundaryFile}
        visible={isBoundaryFileImportOpen}
      />
      {shouldRenderInteractiveMap && documentToWorldMatrix && screenToWorldMatrix && (
        <GLMap
          setHighlightedDocId={setHighlightedDocFromId}
          highlightedDocId={highlightedDoc?.resource.id}
          screen={screen}
          viewBox={viewBox}
          documentToWorldMatrix={documentToWorldMatrix}
          screenToWorldMatrix={screenToWorldMatrix}
          selectedDocumentIds={props.selectedDocumentIds}
          geoDocuments={geoDocuments}
          location={location}
          showCurrentLocation={!hasSurveyBoundaryGeometry}
          updateDoc={updateDoc}
          selectParentId={onParentIdSelected}
          editDocument={props.editDocument}
          layerDocuments={layerDocuments}
          focusMapOnDocumentId={focusMapOnDocumentId}
        />
      )}
      {shouldShowStartPanel && (
        <View style={styles.startPanel}>
          <Text style={styles.startEyebrow}>현장 기록</Text>
          <Text style={styles.startTitle}>{startPanelCopy.title}</Text>
          <Text style={styles.startHierarchy}>
            {startPanelCopy.detail}
          </Text>
          <View style={styles.startActions}>
            {!primaryOperation ? (
              <Button
                variant="success"
                title={canStartSurveyBoundaryFlow
                  ? startPanelCopy.primaryActionTitle
                  : 'GPS 확인 중'}
                isDisabled={!canStartSurveyBoundaryFlow}
                onPress={confirmCreateOperationAndEdit}
              />
            ) : (
              <>
                <Button
                  variant="success"
                  title={location ? startPanelCopy.primaryActionTitle : 'GPS 확인 중'}
                  isDisabled={!canCreateSurveyBoundaryInPrimaryOperation}
                  onPress={createPrimarySurveyBoundaryDraft}
                />
                {usesTrenchWorkflow && (
                  <Button
                    variant="secondary"
                    title="트렌치 추가"
                    isDisabled={!canCreateTrench}
                    onPress={createTrenchInPrimaryOperation}
                  />
                )}
                <Button
                  variant="primary"
                  title="조사 기본정보"
                  onPress={editPrimaryOperation}
                />
              </>
            )}
            <Button
              variant="secondary"
              title={startPanelCopy.fileImportActionTitle}
              onPress={openBoundaryFileImport}
              testID="boundaryFileImportStartButton"
            />
            <Button
              variant="secondary"
              title={startPanelCopy.satelliteActionTitle}
              onPress={openSatellitePicker}
            />
          </View>
        </View>
      )}
      {shouldShowQuickCreate && !shouldShowStartPanel && (
        <View style={styles.quickCreateContainer}>
          <Button
            variant="success"
            title={quickCreateTitle}
            isDisabled={!canUseQuickCreateAction}
            onPress={runQuickCreateAction}
          />
          <Text style={styles.quickCreateHint}>
            {quickCreateHint}
          </Text>
          <View style={styles.quickSatelliteAction}>
            <Button
              variant="secondary"
              title="지도 선택"
              onPress={openSatellitePicker}
            />
          </View>
        </View>
      )}
      {!shouldShowStartPanel && (
        <MapBottomSheet
          document={highlightedDoc}
          addDocument={props.addDocument}
          editDocument={props.editDocument}
          removeDocument={props.removeDocument}
          focusHandler={focusMapOnDocumentId}
          canOpenFeatureSketchCreation={canCreateFeatureCandidate}
          canCreatePenMemo={!!config?.getCategory(KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO)}
          canCreateSoilProfilePhoto={canCreateSoilProfilePhoto}
          canCreateSurveyBoundary={canCreateSurveyBoundary}
          openFeatureSketchCreation={openFeatureSketchCreation}
          createPenMemoDraft={createPenMemoDraft}
          createSoilProfilePhotoDraft={createSoilProfilePhotoDraft}
          createSurveyBoundaryDraft={createSurveyBoundaryDraft}
          openBoundaryFileImport={openBoundaryFileImport}
          openSatellitePicker={openSatellitePicker}
          markGeometryNeedsAerialAlignment={markGeometryNeedsAerialAlignment}
          markGeometryAdjustedToAerialLayer={markGeometryAdjustedToAerialLayer}
          toggleFeatureWorkflowStep={toggleFeatureWorkflowStep}
          readinessIssues={props.readinessIssues.filter((issue) =>
            issue.documentId === highlightedDoc?.resource.id
          )}
          investigationModeId={props.investigationModeId}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#eef2f4',
    justifyContent: 'center',
  },
  startPanel: {
    backgroundColor: '#fff',
    borderColor: '#cbd5df',
    borderRadius: 6,
    borderWidth: 1,
    elevation: 8,
    left: 20,
    padding: 16,
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 20,
  },
  startEyebrow: {
    color: '#4f6574',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  startTitle: {
    color: '#20313a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  startHierarchy: {
    color: '#526272',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  startActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCreateContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 190,
    zIndex: 15,
  },
  quickCreateHint: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 4,
    color: '#333',
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: 'center',
  },
  quickSatelliteAction: {
    marginTop: 6,
  },
});

export default Map;

function getReferenceBasemapProviderForKakaoMapType(
  mapTypeId?: KakaoSatellitePickedBoundary['mapTypeId']
): string {
  if (mapTypeId === 'ROADMAP') return REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP;
  if (mapTypeId === 'SKYVIEW') return REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW;
  if (mapTypeId === 'BLANK') return REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS;

  return REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID;
}

function getImportedBoundarySummary(
  importedBoundary: ImportedBoundaryFile,
  boundarySummary?: string
): string {
  const baseSummary = boundarySummary?.trim();
  const importSummary =
    `${importedBoundary.fileName} (${importedBoundary.coordinateSystem}, ${importedBoundary.coordinateCount}점)`;

  return baseSummary ? `${baseSummary} - ${importSummary}` : importSummary;
}

const projectWgs84ToMapLocation = (
  location: KakaoSatellitePickedLocation
): MapLocation | undefined => {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return undefined;
  }

  const projected = proj4('EPSG:4326', 'EPSG:3857', {
    x: location.longitude,
    y: location.latitude,
  });
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    return undefined;
  }

  return projected;
};

const projectKakaoBoundaryToSurveyBoundaryGeometry = (
  coordinates: KakaoSatellitePickedLocation[]
): SurveyBoundaryGeometry | undefined => {
  const projectedCoordinates = coordinates
    .map(projectWgs84ToMapLocation)
    .filter(isMapLocation);

  if (projectedCoordinates.length < 3) return undefined;

  return {
    type: 'LineString',
    coordinates: closeLineString(
      projectedCoordinates.map((location) => [location.x, location.y])
    ),
  };
};

const closeLineString = (coordinates: number[][]): number[][] => {
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (!firstCoordinate || !lastCoordinate) return coordinates;
  if (
    firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
  ) {
    return coordinates;
  }

  return [...coordinates, [firstCoordinate[0], firstCoordinate[1]]];
};

const getBoundaryGeometryCenter = (
  geometry: SurveyBoundaryGeometry
): MapLocation | undefined => {
  const openCoordinates = getOpenLineStringCoordinates(geometry.coordinates);
  if (openCoordinates.length === 0) return undefined;

  return {
    x: openCoordinates.reduce((sum, coordinate) => sum + coordinate[0], 0)
      / openCoordinates.length,
    y: openCoordinates.reduce((sum, coordinate) => sum + coordinate[1], 0)
      / openCoordinates.length,
  };
};

const getWgs84BoundaryCenter = (
  coordinates: KakaoSatellitePickedLocation[]
): KakaoSatellitePickedLocation | undefined => {
  if (coordinates.length === 0) return undefined;

  return {
    latitude: coordinates.reduce((sum, coordinate) => sum + coordinate.latitude, 0)
      / coordinates.length,
    longitude: coordinates.reduce((sum, coordinate) => sum + coordinate.longitude, 0)
      / coordinates.length,
  };
};

const getOpenLineStringCoordinates = (coordinates: number[][]): number[][] => {
  if (coordinates.length < 2) return coordinates;
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];

  return firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
    ? coordinates.slice(0, -1)
    : coordinates;
};

const isMapLocation = (
  location: MapLocation | undefined
): location is MapLocation => location !== undefined;

const getFeatureCandidateParent = (
  highlightedDoc: Document | undefined,
  documents: Document[],
  investigationModeId?: KoreanFieldworkInvestigationModeId
): Document | undefined => {
  const usesTrenchWorkflow =
    shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId);

  if (usesTrenchWorkflow) {
    if (highlightedDoc?.resource.category === KOREAN_FIELDWORK_CATEGORIES.TRENCH) {
      return highlightedDoc;
    }

    if (highlightedDoc?.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
      const relatedTrench = findRelatedDocumentByCategory(
        highlightedDoc,
        documents,
        [KOREAN_FIELDWORK_CATEGORIES.TRENCH]
      );
      if (relatedTrench) return relatedTrench;
    }

    return documents.find(
      (document) => document.resource.category === KOREAN_FIELDWORK_CATEGORIES.TRENCH
    );
  }

  if (highlightedDoc) {
    if (highlightedDoc.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION) {
      return highlightedDoc;
    }

    if (highlightedDoc.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
      const relatedParent = findRelatedDocumentByCategory(
        highlightedDoc,
        documents,
        [
          KOREAN_FIELDWORK_CATEGORIES.OPERATION,
          KOREAN_FIELDWORK_CATEGORIES.TRENCH,
        ]
      );
      if (relatedParent) return relatedParent;
    }
  }

  return documents.find(
    (document) => document.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION
  );
};

const findRelatedDocumentByCategory = (
  document: Document,
  documents: Document[],
  categoryPreference: string[]
): Document | undefined => {
  const documentsById = new globalThis.Map(documents.map((candidate) => [
    candidate.resource.id,
    candidate,
  ]));
  const relationTargets = getFeatureParentRelationTargets(document);

  for (const categoryName of categoryPreference) {
    const relatedDocument = relationTargets
      .map((documentId) => documentsById.get(documentId))
      .find((candidate) => candidate?.resource.category === categoryName);
    if (relatedDocument) return relatedDocument;
  }

  return undefined;
};

const getFeatureParentRelationTargets = (document: Document): string[] => {
  const relations = document.resource.relations as
    | Record<string, unknown>
    | undefined;
  if (!relations) return [];

  return ['liesWithin', 'isRecordedIn']
    .flatMap((relationName) => {
      const targets = relations[relationName];
      return Array.isArray(targets)
        ? targets.filter((target): target is string => typeof target === 'string')
        : [];
    });
};

const appendGeometryRevisionHistory = (
  document: Document,
  status: string
): string => {
  const resource = document.resource as any;
  const previousHistory = parseGeometryRevisionHistory(
    resource.featureGeometryRevisionHistory
  );

  return JSON.stringify([
    ...previousHistory,
    {
      at: new Date().toISOString(),
      status,
      geometry: resource.geometry,
      geometrySource: resource.geometrySource,
      geometryConfidence: resource.geometryConfidence,
      referenceLayerId: resource.featureGeometryReferenceLayerId,
    },
  ]);
};

const parseGeometryRevisionHistory = (history: unknown): unknown[] => {
  if (Array.isArray(history)) return history;
  if (typeof history !== 'string' || history.trim() === '') return [];

  try {
    const parsedHistory = JSON.parse(history);
    return Array.isArray(parsedHistory) ? parsedHistory : [];
  } catch {
    return [];
  }
};
