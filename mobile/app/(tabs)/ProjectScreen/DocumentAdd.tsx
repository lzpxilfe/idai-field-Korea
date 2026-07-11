import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import {
  CategoryForm,
  NewDocument,
  NewResource,
  getKoreanFieldworkReportHandoffSaveMessage,
  validateKoreanFieldworkReportHandoffCandidate,
} from 'idai-field-core';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { ConfigurationContext } from '@/contexts/configuration-context';
import LabelsContext from '@/contexts/labels/labels-context';
import useDocument from '@/hooks/use-document';
import useToast from '@/hooks/use-toast';
import Button from '@/components/common/Button';
import DocumentForm from '@/components/common/forms/DocumentForm';
import SoilProfileCameraButton, {
  FieldworkPhotoCaptureData,
  PhotoCameraButton,
  SoilProfileCaptureData,
  clearFieldworkImageUploadAudit,
} from '@/components/Project/SoilProfileCameraButton';
import KoreanFieldworkDraftContextPanel from '@/components/Project/KoreanFieldworkDraftContextPanel';
import KoreanFieldworkDrawingSurveyPanel
  from '@/components/Project/KoreanFieldworkDrawingSurveyPanel';
import KoreanFieldworkFindSpotPanel
  from '@/components/Project/KoreanFieldworkFindSpotPanel';
import KoreanFieldworkFreeDrawingPanel, {
  getKoreanFieldworkFreeDrawingConfig,
} from '@/components/Project/KoreanFieldworkFreeDrawingPanel';
import FieldworkPhotoAnnotationPanel, {
  FIELDWORK_PHOTO_ANNOTATION_FIELDS,
  FieldworkPhotoSamplePoint,
} from '@/components/Project/FieldworkPhotoAnnotationPanel';
import KoreanFieldworkQuickRecordPanel from '@/components/Project/KoreanFieldworkQuickRecordPanel';
import KoreanFieldworkSoilColorPanel, {
  getSoilProfileColorSampleUpdates,
} from '@/components/Project/KoreanFieldworkSoilColorPanel';
import {
  getKoreanFieldworkReturnTarget,
  navigateToKoreanFieldworkReturnTarget,
} from '@/components/Project/korean-fieldwork-navigation';
import {
  createKoreanFieldworkDraftRelations,
  createKoreanFieldworkDraftResource,
} from '@/components/Project/korean-fieldwork-document-drafts';
import { ToastType } from '@/components/common/Toast/ToastProvider';
import { useGlobalSearchParams } from 'expo-router';
import { ProjectContext } from '@/contexts/project-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import {
  KoreanFieldworkInvestigationModeId,
  loadKoreanFieldworkInvestigationModeId,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import {
  createSoilColorAssistUpdatesFromPhotoBase64AtPoint,
  createSoilColorAssistUpdatesFromRgbSampleAtPoint,
  hasMunsellCandidateOptions,
} from '@/components/Project/soil-color-photo-assist';

interface SoilProfileLayerSampleRequest {
  key: number;
  layerNumber: number;
}

const DocumentAdd: React.FC = () => {
  const config = useContext(ConfigurationContext);
  const { labels } = useContext(LabelsContext);
  const { documents, repository } = useContext(ProjectContext);
  const preferencesContext = useContext(PreferencesContext);
  const params = useGlobalSearchParams();
  const parentDocId = getParam(params.parentDocId);
  const categoryName = getParam(params.categoryName);
  const featureType = getParam(params.featureType);
  const featureGeometryRevisionNote = getParam(params.featureGeometryRevisionNote);
  const featureLocationSketch = getParam(params.featureLocationSketch);
  const featureGeometry = getParam(params.featureGeometry);
  const geometryConfidence = getParam(params.geometryConfidence);
  const geometrySource = getParam(params.geometrySource);
  const identifier = getParam(params.identifier);
  const returnTarget = getKoreanFieldworkReturnTarget(params.returnTo);
  const shortDescription = getParam(params.shortDescription);
  const parentDoc = useDocument(repository, parentDocId);

  const { showToast } = useToast();
  const [category, setCategory] = useState<CategoryForm>();
  const [newResource, setNewResource] = useState<NewResource>();
  const [saveBtnEnabled, setSaveBtnEnabled] = useState<boolean>(false);
  const [investigationModeId, setInvestigationModeId] =
    useState<KoreanFieldworkInvestigationModeId>();
  const [isFreeDrawingActive, setIsFreeDrawingActive] = useState(false);
  const [soilProfileSampleRequest, setSoilProfileSampleRequest] =
    useState<SoilProfileLayerSampleRequest>();
  const projectId = preferencesContext.preferences.currentProject;
  const documentsRef = useRef(documents);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const setResourceToDefault = useCallback(
    () => {
      if (!categoryName || !parentDoc) {
        setNewResource(undefined);
        return;
      }

      setNewResource(
        createKoreanFieldworkDraftResource(parentDoc, categoryName, config, {
          existingDocuments: documentsRef.current ?? [],
          featureGeometryRevisionNote,
          featureGeometry,
          featureLocationSketch,
          featureType,
          geometryConfidence,
          geometrySource,
          identifier,
          shortDescription,
        })
      );
    },
    [
      parentDoc,
      categoryName,
      config,
      featureGeometryRevisionNote,
      featureGeometry,
      featureLocationSketch,
      featureType,
      geometryConfidence,
      geometrySource,
      identifier,
      shortDescription,
    ]
  );

  useEffect(() => setResourceToDefault(), [setResourceToDefault, category]);

  useEffect(() => {
    if (newResource?.identifier) setSaveBtnEnabled(true);
    else setSaveBtnEnabled(false);
  }, [newResource]);

  useEffect(
    () => {
      if (categoryName) setCategory(config.getCategory(categoryName));
    },
    [config, categoryName]
  );

  useEffect(() => {
    let isActive = true;
    setInvestigationModeId(undefined);

    loadKoreanFieldworkInvestigationModeId(projectId)
      .then((modeId) => {
        if (isActive && modeId) setInvestigationModeId(modeId);
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [projectId]);

  const updateResource = (key: string, value: unknown) =>
    setNewResource(
      (oldResource) => oldResource && { ...oldResource, [key]: value }
    );

  const applyResourceUpdates = (updates: Record<string, unknown>) =>
    setNewResource(
      (oldResource) => oldResource && { ...oldResource, ...updates }
    );
  const requestSoilProfileLayerSample = (layerNumber: number) => {
    applyResourceUpdates({ soilProfileActiveLayerNumber: layerNumber });
    setSoilProfileSampleRequest((currentRequest) => ({
      key: (currentRequest?.key ?? 0) + 1,
      layerNumber,
    }));
  };

  const updateSoilProfileCapture = (data: SoilProfileCaptureData) => {
    setNewResource((oldResource) => oldResource && {
      ...clearFieldworkImageUploadAudit(oldResource),
      ...data,
    });
  };
  const updatePhotoCapture = (data: FieldworkPhotoCaptureData) => {
    setNewResource((oldResource) => oldResource && {
      ...clearFieldworkImageUploadAudit(oldResource),
      ...data,
    });
  };

  const saveButtonHandler = () => {
    if (newResource) {
      const reportHandoffValidation = validateKoreanFieldworkReportHandoffCandidate(
        newResource,
        documents ?? []
      );
      const newDocument: NewDocument = {
        resource: newResource,
      };
      repository
        ?.create(newDocument)
        .then((doc) => {
          showToast(
            ToastType.Success,
            getKoreanFieldworkReportHandoffSaveMessage(
              `${doc.resource.identifier} 기록을 만들었습니다.`,
              reportHandoffValidation
            ),
            reportHandoffValidation.status === 'review' ? 5000 : 3000
          );
          setResourceToDefault();
          navigateToKoreanFieldworkReturnTarget(returnTarget, doc.resource.id);
        })
        .catch(() => {
          Keyboard.dismiss();
          showToast(ToastType.Error, '기록을 만들지 못했습니다.');
        });
    }
  };

  const onReturn = () => {
    setResourceToDefault();
    navigateToKoreanFieldworkReturnTarget(returnTarget, parentDocId);
  };

  if (!categoryName || !parentDoc || !category || !labels || !newResource) {
    return (
      <DocumentAddLoadingState
        missingItems={getMissingDependencies([
          [!repository, '저장소'],
          [!categoryName, '기록 종류'],
          [!parentDoc, '포함 위치'],
          [!category, '양식'],
          [!labels, '라벨'],
          [!newResource, '입력값'],
        ])}
      />
    );
  }

  const freeDrawingConfig = getKoreanFieldworkFreeDrawingConfig(categoryName);

  return (
    <DocumentForm
      titleBarRight={
        <Button
          variant="success"
          onPress={() => saveButtonHandler()}
          title="저장"
          isDisabled={!saveBtnEnabled}
          icon={
            <MaterialIcons
              name="save"
              size={18}
              color="white"
              testID="saveDocBtn"
            />
          }
        />
      }
      category={category}
      collapseFormFieldsByDefault={true}
      headerText={`${labels.get(category)} 만들기`}
      returnBtnHandler={onReturn}
      formHeader={
        <View>
          <KoreanFieldworkDraftContextPanel
            parentDocument={parentDoc}
            resource={newResource}
          />
          <KoreanFieldworkFindSpotPanel
            documents={documents ?? []}
            parentDocument={parentDoc}
            resource={newResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkDrawingSurveyPanel
            resource={newResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkQuickRecordPanel
            category={category}
            investigationModeId={investigationModeId}
            resource={newResource}
            onUpdateResourceField={updateResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkSoilColorPanel
            category={category}
            isLayerPhotoSamplingAvailable={
              !!getStringValue(newResource.soilProfilePhotoUri)
            }
            resource={newResource}
            onSampleLayerColor={
              newResource.category === 'SoilProfilePhoto'
                ? requestSoilProfileLayerSample
                : undefined
            }
            onUpdateResourceField={updateResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
        </View>
      }
      formFooter={freeDrawingConfig ? (
        <KoreanFieldworkFreeDrawingPanel
          onDrawingActiveChange={setIsFreeDrawingActive}
          strokesValue={newResource[freeDrawingConfig.strokesField]}
          title={freeDrawingConfig.title}
          onUpdateStrokes={(serializedStrokes) => {
            const updates: Record<string, unknown> = {
              [freeDrawingConfig.strokesField]: serializedStrokes,
            };
            if (freeDrawingConfig.updatedAtField) {
              updates[freeDrawingConfig.updatedAtField] = new Date().toISOString();
            }
            applyResourceUpdates(updates);
          }}
        />
      ) : undefined}
      isScrollEnabled={!isFreeDrawingActive}
      resource={newResource}
      updateFunction={updateResource}
      resourceActions={renderPhotoResourceActions(
        categoryName,
        newResource,
        updatePhotoCapture,
        updateSoilProfileCapture,
        applyResourceUpdates,
        soilProfileSampleRequest,
        () => setSoilProfileSampleRequest(undefined),
        preferencesContext.preferences.username
      )}
    />
  );
};

export const createRelations = createKoreanFieldworkDraftRelations;

export default DocumentAdd;

const getParam = (param: string | string[] | undefined): string | undefined =>
  Array.isArray(param) ? param[0] : param;

const renderPhotoResourceActions = (
  categoryName: string,
  resource: NewResource,
  updatePhotoCapture: (data: FieldworkPhotoCaptureData) => void,
  updateSoilProfileCapture: (data: SoilProfileCaptureData) => void,
  updateResourceFields: (updates: Record<string, unknown>) => void,
  soilProfileSampleRequest?: SoilProfileLayerSampleRequest,
  onSoilProfileSampleComplete?: () => void,
  username?: string
) => {
  if (categoryName === 'Photo') {
    const imageUri = getStringValue(resource.imageUri ?? resource.fieldworkPhotoUri);

    return (
      <View>
        <PhotoCameraButton
          capturedUri={imageUri}
          captureFilenameBase={getStringValue(resource.identifier)}
          onCapture={updatePhotoCapture}
          username={username}
        />
        <FieldworkPhotoAnnotationPanel
          imageUri={imageUri}
          strokesValue={resource[FIELDWORK_PHOTO_ANNOTATION_FIELDS.photoStrokes]}
          onUpdateStrokes={(serializedStrokes) => updateResourceFields({
            [FIELDWORK_PHOTO_ANNOTATION_FIELDS.photoStrokes]: serializedStrokes,
            [FIELDWORK_PHOTO_ANNOTATION_FIELDS.photoUpdatedAt]: new Date().toISOString(),
          })}
        />
      </View>
    );
  }

  if (categoryName === 'SoilProfilePhoto') {
    const imageUri = getStringValue(resource.soilProfilePhotoUri);

    return (
      <View>
        <SoilProfileCameraButton
          capturedUri={imageUri}
          captureFilenameBase={getStringValue(resource.identifier)}
          onCapture={updateSoilProfileCapture}
          username={username}
        />
        <FieldworkPhotoAnnotationPanel
          imageUri={imageUri}
          title="토층사진 위 펜표시"
          sampleRequestKey={soilProfileSampleRequest?.key}
          sampleRequestLabel={soilProfileSampleRequest
            ? `${soilProfileSampleRequest.layerNumber}층`
            : undefined}
          sampleButtonLabel="토색 찍기"
          strokesValue={resource[FIELDWORK_PHOTO_ANNOTATION_FIELDS.soilProfileStrokes]}
          onSamplePoint={async (point) => {
            await sampleSoilProfileColor(
              imageUri,
              point,
              resource,
              updateResourceFields,
              soilProfileSampleRequest?.layerNumber
            );
            onSoilProfileSampleComplete?.();
          }}
          onUpdateStrokes={(serializedStrokes) => updateResourceFields({
            [FIELDWORK_PHOTO_ANNOTATION_FIELDS.soilProfileStrokes]: serializedStrokes,
            [FIELDWORK_PHOTO_ANNOTATION_FIELDS.soilProfileUpdatedAt]: new Date().toISOString(),
          })}
        />
      </View>
    );
  }

  return undefined;
};

const getStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;

const sampleSoilProfileColor = async (
  imageUri: string | undefined,
  point: FieldworkPhotoSamplePoint,
  resource: NewResource,
  updateResourceFields: (updates: Record<string, unknown>) => void,
  targetLayerNumber?: number
) => {
  if (!imageUri) return;

  const assistUpdates = point.rgb
    ? createSoilColorAssistUpdatesFromRgbSampleAtPoint(point.rgb, point)
    : createSoilColorAssistUpdatesFromPhotoBase64AtPoint(
      await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      }),
      point
    );

  const updates = getSoilProfileColorSampleUpdates(
    resource,
    assistUpdates,
    targetLayerNumber
  );
  updateResourceFields(updates);

  if (!hasMunsellCandidateOptions(assistUpdates.soilColorAssistCandidates)) {
    throw new Error('soil color sample did not produce a Munsell candidate');
  }
};

const getMissingDependencies = (
  dependencies: [boolean, string][]
): string =>
  dependencies
    .filter(([isMissing]) => isMissing)
    .map(([, label]) => label)
    .join(', ');

const DocumentAddLoadingState: React.FC<{ missingItems: string }> = ({
  missingItems,
}) => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>
      {`기록 추가 화면을 준비하고 있습니다.\n남은 항목: ${missingItems}`}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#526272',
    fontSize: 14,
    textAlign: 'center',
  },
});
