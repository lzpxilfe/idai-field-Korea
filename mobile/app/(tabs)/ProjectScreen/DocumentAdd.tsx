import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import {
  CategoryForm,
  NewDocument,
  NewResource,
} from 'idai-field-core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
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
} from '@/components/Project/SoilProfileCameraButton';
import KoreanFieldworkDraftContextPanel from '@/components/Project/KoreanFieldworkDraftContextPanel';
import KoreanFieldworkFindSpotPanel
  from '@/components/Project/KoreanFieldworkFindSpotPanel';
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
import { createSoilColorAssistUpdatesFromPhotoBase64AtPoint } from '@/components/Project/soil-color-photo-assist';

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
  const projectId = preferencesContext.preferences.currentProject;

  const setResourceToDefault = useCallback(
    () => {
      if (!categoryName || !parentDoc) {
        setNewResource(undefined);
        return;
      }

      setNewResource(
        createKoreanFieldworkDraftResource(parentDoc, categoryName, config, {
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

  const updateSoilProfileCapture = (data: SoilProfileCaptureData) => {
    setNewResource((oldResource) => oldResource && { ...oldResource, ...data });
  };
  const updatePhotoCapture = (data: FieldworkPhotoCaptureData) => {
    setNewResource((oldResource) => oldResource && { ...oldResource, ...data });
  };

  const saveButtonHandler = () => {
    if (newResource) {
      const newDocument: NewDocument = {
        resource: newResource,
      };
      repository
        ?.create(newDocument)
        .then((doc) => {
          showToast(ToastType.Success, `${doc.resource.identifier} 기록을 만들었습니다.`);
          setResourceToDefault();
          navigateToKoreanFieldworkReturnTarget(returnTarget, doc.resource.id);
        })
        .catch((_err) => {
          Keyboard.dismiss();
          showToast(ToastType.Error, '기록을 만들지 못했습니다.');
          console.log(_err);
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
          <KoreanFieldworkQuickRecordPanel
            category={category}
            investigationModeId={investigationModeId}
            resource={newResource}
            onUpdateResourceField={updateResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkSoilColorPanel
            category={category}
            resource={newResource}
            onUpdateResourceField={updateResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
        </View>
      }
      resource={newResource}
      updateFunction={updateResource}
      resourceActions={renderPhotoResourceActions(
        categoryName,
        newResource,
        updatePhotoCapture,
        updateSoilProfileCapture,
        applyResourceUpdates,
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
  username?: string
) => {
  if (categoryName === 'Photo') {
    const imageUri = getStringValue(resource.imageUri ?? resource.fieldworkPhotoUri);

    return (
      <View>
        <PhotoCameraButton
          capturedUri={imageUri}
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
          onCapture={updateSoilProfileCapture}
          username={username}
        />
        <FieldworkPhotoAnnotationPanel
          imageUri={imageUri}
          title="토층사진 위 펜표시"
          sampleButtonLabel="토색 찍기"
          strokesValue={resource[FIELDWORK_PHOTO_ANNOTATION_FIELDS.soilProfileStrokes]}
          onSamplePoint={(point) =>
            sampleSoilProfileColor(imageUri, point, resource, updateResourceFields)}
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
  updateResourceFields: (updates: Record<string, unknown>) => void
) => {
  if (!imageUri) return;

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  updateResourceFields(getSoilProfileColorSampleUpdates(
    resource,
    createSoilColorAssistUpdatesFromPhotoBase64AtPoint(base64, point)
  ));
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
