import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import {
  CategoryForm,
  Document,
  Resource,
} from 'idai-field-core';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { ConfigurationContext } from '@/contexts/configuration-context';
import LabelsContext from '@/contexts/labels/labels-context';
import useDocument from '@/hooks/use-document';
import useToast from '@/hooks/use-toast';

import Button from '@/components/common/Button';
import DocumentForm from '@/components/common/forms/DocumentForm';
import FieldworkPhotoAnnotationPanel, {
  FIELDWORK_PHOTO_ANNOTATION_FIELDS,
  FieldworkPhotoSamplePoint,
} from '@/components/Project/FieldworkPhotoAnnotationPanel';
import KoreanFieldworkDrawingSurveyPanel
  from '@/components/Project/KoreanFieldworkDrawingSurveyPanel';
import KoreanFieldworkFeatureSketchReferencePanel
  from '@/components/Project/KoreanFieldworkFeatureSketchReferencePanel';
import KoreanFieldworkFeaturePitLinePanel
  from '@/components/Project/KoreanFieldworkFeaturePitLinePanel';
import KoreanFieldworkFindSpotPanel
  from '@/components/Project/KoreanFieldworkFindSpotPanel';
import KoreanFieldworkFreeDrawingPanel, {
  KOREAN_FIELDWORK_FREE_DRAWING_FIELDS,
} from '@/components/Project/KoreanFieldworkFreeDrawingPanel';
import SoilProfileCameraButton, {
  FieldworkPhotoCaptureData,
  PhotoCameraButton,
  SoilProfileCaptureData,
} from '@/components/Project/SoilProfileCameraButton';
import KoreanFieldworkRecordActionPanel from '@/components/Project/KoreanFieldworkRecordActionPanel';
import KoreanFieldworkRecordContextPanel from '@/components/Project/KoreanFieldworkRecordContextPanel';
import KoreanFieldworkQuickRecordPanel from '@/components/Project/KoreanFieldworkQuickRecordPanel';
import KoreanFieldworkSoilColorPanel, {
  getSoilProfileColorSampleUpdates,
} from '@/components/Project/KoreanFieldworkSoilColorPanel';
import {
  getKoreanFieldworkReturnParam,
  getKoreanFieldworkReturnTarget,
  navigateToKoreanFieldworkReturnTarget,
} from '@/components/Project/korean-fieldwork-navigation';
import { ToastType } from '@/components/common/Toast/ToastProvider';
import { router, useGlobalSearchParams } from 'expo-router';
import { ProjectContext } from '@/contexts/project-context';
import { getKoreanFieldworkAllowedChildCategoryNames } from '@/components/Project/korean-fieldwork-child-records';
import { KOREAN_FIELDWORK_CATEGORIES } from '@/components/Project/korean-fieldwork-categories';
import { PreferencesContext } from '@/contexts/preferences-context';
import {
  KoreanFieldworkInvestigationModeId,
  loadKoreanFieldworkInvestigationModeId,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import {
  createSoilColorAssistUpdatesFromPhotoBase64AtPoint,
  createSoilColorAssistUpdatesFromRgbSampleAtPoint,
} from '@/components/Project/soil-color-photo-assist';

interface SoilProfileLayerSampleRequest {
  key: number;
  layerNumber: number;
}

const DocumentEdit: React.FC = () => {
  const { showToast } = useToast();
  const { documents, repository } = useContext(ProjectContext);
  const preferencesContext = useContext(PreferencesContext);

  // TODO: configure expo router to load params
  const params = useGlobalSearchParams();
  const docId = getParam(params.docId);
  const categoryName = getParam(params.categoryName);
  const shouldOpenFreeSketch = getParam(params.openFreeSketch) === '1';
  const returnTarget = getKoreanFieldworkReturnTarget(params.returnTo);

  const config = useContext(ConfigurationContext);
  const { labels } = useContext(LabelsContext);

  const document = useDocument(repository, docId);
  const [category, setCategory] = useState<CategoryForm>();
  const [resource, setResource] = useState<Resource>();
  const [investigationModeId, setInvestigationModeId] =
    useState<KoreanFieldworkInvestigationModeId>();
  const [isFreeDrawingActive, setIsFreeDrawingActive] = useState(false);
  const [soilProfileSampleRequest, setSoilProfileSampleRequest] =
    useState<SoilProfileLayerSampleRequest>();
  const projectId = preferencesContext.preferences.currentProject;

  useEffect(() => {
    const formName = categoryName ?? document?.resource.category;
    if (formName) setCategory(config.getCategory(formName));
  }, [categoryName, config, document]);

  useEffect(() => {
    if (document) setResource(document.resource);
  }, [document]);

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

  const onReturn = () => {
    navigateToKoreanFieldworkReturnTarget(returnTarget, docId);
  };

  const editDocument = () => {
    if (document && resource) {
      repository
        ?.update({ ...document, resource })
        .then((doc) => {
          showToast(ToastType.Success, `${doc.resource.identifier} 기록을 저장했습니다.`);
          navigateToKoreanFieldworkReturnTarget(returnTarget, doc.resource.id);
        })
        .catch((err) => {
          Keyboard.dismiss();
          showToast(
            ToastType.Error,
            `${document.resource.identifier} 기록을 저장하지 못했습니다: ${err}`
          );
        });
    }
  };

  const updateResource = (key: string, value: unknown) => {
    setResource(
      (oldResource) => oldResource && { ...oldResource, [key]: value }
    );
  };
  const applyResourceUpdates = (updates: Record<string, unknown>) => {
    setResource(
      (oldResource) => oldResource && { ...oldResource, ...updates }
    );
  };
  const requestSoilProfileLayerSample = (layerNumber: number) => {
    applyResourceUpdates({ soilProfileActiveLayerNumber: layerNumber });
    setSoilProfileSampleRequest((currentRequest) => ({
      key: (currentRequest?.key ?? 0) + 1,
      layerNumber,
    }));
  };

  const updateSoilProfileCapture = (data: SoilProfileCaptureData) => {
    setResource((oldResource) => oldResource && { ...oldResource, ...data });
  };
  const updatePhotoCapture = (data: FieldworkPhotoCaptureData) => {
    setResource((oldResource) => oldResource && { ...oldResource, ...data });
  };
  const allowedAddCategoryNames = useMemo(
    () => document
      ? getKoreanFieldworkAllowedChildCategoryNames(document, config)
      : [],
    [config, document]
  );
  const openRelatedDocument = (relatedDocument: Document) => {
    router.navigate({
      pathname: '/ProjectScreen/DocumentEdit',
      params: {
        docId: relatedDocument.resource.id,
        categoryName: relatedDocument.resource.category,
        ...getKoreanFieldworkReturnParam(returnTarget),
      },
    });
  };
  const addRelatedDocument = (parentDoc: Document, childCategoryName: string) => {
    router.navigate({
      pathname: '/ProjectScreen/DocumentAdd',
      params: {
        parentDocId: parentDoc.resource.id,
        categoryName: childCategoryName,
        ...getKoreanFieldworkReturnParam(returnTarget),
      },
    });
  };

  if (!docId) {
    return <DocumentEditLoadingState text="편집할 기록 정보를 찾는 중입니다." />;
  }

  if (!category || !labels || !document || !resource) {
    return (
      <DocumentEditLoadingState
        text={`기록 편집 화면을 준비하고 있습니다.\n남은 항목: ${getMissingDependencies([
          [!repository, '저장소'],
          [!document, '기록'],
          [!category, '양식'],
          [!labels, '라벨'],
          [!resource, '입력값'],
        ])}`}
      />
    );
  }

  const effectiveDocument = { ...document, resource };
  const isFeatureRecord = resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE;

  return (
    <DocumentForm
      titleBarRight={
        <Button
          variant="primary"
          onPress={editDocument}
          title="저장"
          icon={
            <Ionicons name="create-outline" size={18} testID="editDocBtn" />
          }
        />
      }
      category={category}
      collapseFormFieldsByDefault={true}
      headerText={`${labels.get(category)} 편집: ${
        document.resource.identifier
      }`}
      returnBtnHandler={onReturn}
      formHeader={
        <View>
          {isFeatureRecord && (
            <KoreanFieldworkFeatureSketchReferencePanel
              document={effectiveDocument}
              documents={documents ?? []}
            />
          )}
          {isFeatureRecord && (
            <KoreanFieldworkFeaturePitLinePanel
              allowedAddCategoryNames={allowedAddCategoryNames}
              document={effectiveDocument}
              documents={documents ?? []}
              onAddSoilProfilePhoto={addRelatedDocument}
              onUpdateResourceFields={applyResourceUpdates}
            />
          )}
          <KoreanFieldworkFindSpotPanel
            documents={documents ?? []}
            resource={resource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkDrawingSurveyPanel
            resource={resource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkRecordContextPanel
            document={effectiveDocument}
            documents={documents ?? []}
            allowedAddCategoryNames={allowedAddCategoryNames}
            onAddDocumentOfCategory={addRelatedDocument}
            onOpenDocument={openRelatedDocument}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkRecordActionPanel
            document={effectiveDocument}
            documents={documents ?? []}
            allowedAddCategoryNames={allowedAddCategoryNames}
            investigationModeId={investigationModeId}
            onAddDocumentOfCategory={addRelatedDocument}
            onOpenDocument={openRelatedDocument}
          />
          <KoreanFieldworkQuickRecordPanel
            category={category}
            investigationModeId={investigationModeId}
            resource={resource}
            onUpdateResourceField={updateResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
          <KoreanFieldworkSoilColorPanel
            category={category}
            isLayerPhotoSamplingAvailable={
              !!getStringValue(resource.soilProfilePhotoUri)
            }
            resource={resource}
            onSampleLayerColor={
              resource.category === 'SoilProfilePhoto'
                ? requestSoilProfileLayerSample
                : undefined
            }
            onUpdateResourceField={updateResource}
            onUpdateResourceFields={applyResourceUpdates}
          />
        </View>
      }
      formFooter={isFeatureRecord ? (
        <KoreanFieldworkFreeDrawingPanel
          initiallyFullscreen={shouldOpenFreeSketch}
          onDrawingActiveChange={setIsFreeDrawingActive}
          strokesValue={resource[KOREAN_FIELDWORK_FREE_DRAWING_FIELDS.featureStrokes]}
          onUpdateStrokes={(serializedStrokes) => applyResourceUpdates({
            [KOREAN_FIELDWORK_FREE_DRAWING_FIELDS.featureStrokes]: serializedStrokes,
            [KOREAN_FIELDWORK_FREE_DRAWING_FIELDS.featureUpdatedAt]:
              new Date().toISOString(),
          })}
        />
      ) : undefined}
      isScrollEnabled={!isFreeDrawingActive}
      resource={resource}
      updateFunction={updateResource}
      resourceActions={renderPhotoResourceActions(
        resource,
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

const getParam = (param: string | string[] | undefined): string | undefined =>
  Array.isArray(param) ? param[0] : param;

const renderPhotoResourceActions = (
  resource: Resource,
  updatePhotoCapture: (data: FieldworkPhotoCaptureData) => void,
  updateSoilProfileCapture: (data: SoilProfileCaptureData) => void,
  updateResourceFields: (updates: Record<string, unknown>) => void,
  soilProfileSampleRequest?: SoilProfileLayerSampleRequest,
  onSoilProfileSampleComplete?: () => void,
  username?: string
) => {
  if (resource.category === 'Photo') {
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

  if (resource.category === 'SoilProfilePhoto') {
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
  resource: Resource,
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

  updateResourceFields(getSoilProfileColorSampleUpdates(
    resource,
    assistUpdates,
    targetLayerNumber
  ));
};

const getMissingDependencies = (
  dependencies: [boolean, string][]
): string =>
  dependencies
    .filter(([isMissing]) => isMissing)
    .map(([, label]) => label)
    .join(', ');

const DocumentEditLoadingState: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>{text}</Text>
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

export default DocumentEdit;
