import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  KOREAN_FIELDWORK_PROJECT_LABEL,
  KOREAN_FIELDWORK_PROJECT_LANGUAGES,
} from '@/constants/korean-fieldwork-project';
import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/common/Button';
import Heading from '@/components/common/Heading';
import Input from '@/components/common/Input';
import TitleBar from '@/components/common/TitleBar';
import BoundaryFileImportModal from '@/components/Project/Map/BoundaryFileImportModal';
import KakaoSatellitePicker from '@/components/Project/Map/KakaoSatellitePicker';
import type {
  KakaoSatellitePickedBoundary,
} from '@/components/Project/Map/KakaoSatellitePicker';
import type {
  ImportedBoundaryFile,
} from '@/components/Project/Map/boundary-file-import';
import {
  projectMapCoordinateToWgs84,
  projectMapLocationToWgs84,
} from '@/components/Project/Map/korean-fieldwork-drafts';
import {
  KOREAN_FIELDWORK_INVESTIGATION_MODES,
  saveKoreanFieldworkBoundarySummary,
  saveKoreanFieldworkInvestigationModeId,
  saveKoreanFieldworkProjectBoundaryDraft,
  saveKoreanFieldworkProjectDisplayName,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import type {
  KoreanFieldworkInvestigationModeId,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import { PreferencesContext } from '@/contexts/preferences-context';
import { colors } from '@/utils/colors';
import {
  getLocalProjectNameInvalidText,
  validateProjectName,
} from './project-name-validation';

interface CreateProjectModalProps {
  existingProjects?: string[];
  onProjectCreated: (
    project: string,
    languages?: string[],
    displayName?: string
  ) => void;
  onClose: () => void;
}

const KOREAN_FIELDWORK_START_STEPS = [
  '프로젝트 기본 조사 방식을 정합니다.',
  '조사 경계 기준을 문장으로 남깁니다.',
  '지도에서 경계를 직접 그리거나 SHP/DXF/GeoJSON을 가져옵니다.',
];

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  existingProjects = [],
  onProjectCreated,
  onClose,
}) => {
  const preferences = useContext(PreferencesContext);
  const [project, setProject] = useState<string>('');
  const [projectTouched, setProjectTouched] = useState<boolean>(false);
  const [investigationModeId, setInvestigationModeId] =
    useState<KoreanFieldworkInvestigationModeId>();
  const [boundarySummary, setBoundarySummary] = useState<string>('');
  const [boundarySummaryTouched, setBoundarySummaryTouched] =
    useState<boolean>(false);
  const [pickedBoundary, setPickedBoundary] =
    useState<KakaoSatellitePickedBoundary>();
  const [isBoundaryPickerOpen, setIsBoundaryPickerOpen] =
    useState<boolean>(false);
  const [isBoundaryFileImportOpen, setIsBoundaryFileImportOpen] =
    useState<boolean>(false);
  const [isPreparingBoundaryPicker, setIsPreparingBoundaryPicker] =
    useState<boolean>(false);
  const [boundaryPickerInitialLocation, setBoundaryPickerInitialLocation] =
    useState<KakaoSatellitePickedBoundary['center']>();
  const insets = useSafeAreaInsets();
  const projectNameValidation = validateProjectName(project, existingProjects, {
    mode: 'local',
  });
  const { displayName, projectId } = projectNameValidation;
  const hasBoundaryGeometry = (pickedBoundary?.coordinates.length ?? 0) >= 3;
  const canCreateProject =
    projectNameValidation.isAvailable && !!investigationModeId && hasBoundaryGeometry;
  const showProjectNameError = projectTouched && !projectNameValidation.isAvailable;
  const showInvestigationModeError =
    boundarySummaryTouched && !investigationModeId;
  const showBoundaryGeometryError =
    boundarySummaryTouched && !hasBoundaryGeometry;
  const setupStatusText = getCreateProjectSetupStatusText(
    projectNameValidation,
    investigationModeId,
    hasBoundaryGeometry
  );
  const isSetupReady =
    projectNameValidation.isAvailable && !!investigationModeId && hasBoundaryGeometry;

  const onCreate = async () => {
    if (!canCreateProject) return;

    const normalizedBoundarySummary =
      boundarySummary.trim() || getDrawnBoundarySummary(pickedBoundary);

    await saveKoreanFieldworkInvestigationModeId(
      projectId,
      investigationModeId as KoreanFieldworkInvestigationModeId
    );
    await saveKoreanFieldworkProjectDisplayName(projectId, displayName);
    await saveKoreanFieldworkBoundarySummary(projectId, normalizedBoundarySummary);
    if (pickedBoundary) {
      await saveKoreanFieldworkProjectBoundaryDraft(projectId, pickedBoundary);
    }

    onProjectCreated(
      projectId,
      KOREAN_FIELDWORK_PROJECT_LANGUAGES.slice(),
      displayName !== projectId ? displayName : undefined
    );
    resetForm();
    onClose();
  };

  const onCancel = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setProject('');
    setProjectTouched(false);
    setInvestigationModeId(undefined);
    setBoundarySummary('');
    setBoundarySummaryTouched(false);
    setPickedBoundary(undefined);
    setIsBoundaryPickerOpen(false);
    setIsBoundaryFileImportOpen(false);
  };

  const openBoundaryPicker = async () => {
    setBoundarySummaryTouched(true);
    setIsPreparingBoundaryPicker(true);

    try {
      const currentLocation = await getCurrentBoundaryPickerLocation();
      if (currentLocation) setBoundaryPickerInitialLocation(currentLocation);

      setIsBoundaryPickerOpen(true);
    } finally {
      setIsPreparingBoundaryPicker(false);
    }
  };

  const onPickBoundary = (boundary: KakaoSatellitePickedBoundary) => {
    setPickedBoundary(boundary);
    setBoundarySummaryTouched(true);
    setIsBoundaryPickerOpen(false);
  };

  const onImportBoundaryFile = async (filePath: string) => {
    const {
      importBoundaryFileFromPath,
    } = require('@/components/Project/Map/boundary-file-import') as typeof import(
      '@/components/Project/Map/boundary-file-import'
    );
    const importedBoundary = await importBoundaryFileFromPath(filePath);
    const boundaryDraft = createPickedBoundaryFromImportedFile(importedBoundary);

    setPickedBoundary(boundaryDraft);
    setBoundarySummaryTouched(true);
    setBoundarySummary((currentValue) =>
      currentValue.trim().length > 0
        ? currentValue
        : getImportedBoundarySummary(importedBoundary)
    );
    setIsBoundaryFileImportOpen(false);
  };

  return (
    <Modal
      onRequestClose={onCancel}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <KakaoSatellitePicker
        initialLocation={boundaryPickerInitialLocation}
        javaScriptKey={
          preferences.preferences.mapProviderSettings.kakaoMapJavaScriptKey
        }
        onClose={() => setIsBoundaryPickerOpen(false)}
        onPickBoundary={onPickBoundary}
        visible={isBoundaryPickerOpen}
      />
      <BoundaryFileImportModal
        onClose={() => setIsBoundaryFileImportOpen(false)}
        onImport={onImportBoundaryFile}
        visible={isBoundaryFileImportOpen}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }
        ]}
      >
        <View style={styles.content}>
          <TitleBar
            title={<Heading>새 프로젝트 만들기</Heading>}
            left={
              <Button
                title="닫기"
                variant="transparent"
                icon={<Ionicons name="close-outline" size={16} />}
                onPress={onCancel}
              />
            }
            right={
              <Button
                title="만들기"
                variant="success"
                onPress={onCreate}
                isDisabled={!canCreateProject}
                testID="create-project-submit"
              />
            }
          />

          <ScrollView
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Input
              testID="project-input"
              label={`${KOREAN_FIELDWORK_PROJECT_LABEL} 프로젝트 이름`}
              value={project}
              onChangeText={(value) => {
                setProjectTouched(true);
                setProject(value);
              }}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              autoFocus
              helpText="한국어 현장 기록 설정을 사용합니다. 다른 기기와 동기화하려면 같은 이름을 정확히 사용하세요."
              invalidText={getLocalProjectNameInvalidText(projectNameValidation)}
              isValid={showProjectNameError ? false : undefined}
              style={styles.input}
            />

            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>프로젝트 기본 설정</Text>
              <Text style={styles.sectionText}>
                조사 방식과 경계 기준은 프로젝트를 만들 때 정하는 기준입니다.
                지도에서 도형을 그리거나 지원되는 파일 가져오기로 확정합니다.
              </Text>
              <View style={styles.startSteps}>
                {KOREAN_FIELDWORK_START_STEPS.map((step, index) => (
                  <View key={step} style={styles.startStep}>
                    <Text style={styles.startStepNumber}>{index + 1}</Text>
                    <Text style={styles.startStepText}>{step}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.modeGrid}>
                {KOREAN_FIELDWORK_INVESTIGATION_MODES.map((mode) => {
                  const isSelected = mode.id === investigationModeId;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      key={mode.id}
                      onPress={() => setInvestigationModeId(mode.id)}
                      style={[
                        styles.modeButton,
                        isSelected && styles.modeButtonSelected,
                      ]}
                      testID={`project-investigation-mode_${mode.id}`}
                    >
                      <Text
                        style={[
                          styles.modeLabel,
                          isSelected && styles.modeLabelSelected,
                        ]}
                      >
                        {mode.label}
                      </Text>
                      <Text
                        style={[
                          styles.modeDetail,
                          isSelected && styles.modeDetailSelected,
                        ]}
                      >
                        {mode.detail}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {showInvestigationModeError && (
                <Text style={styles.invalidText}>조사 방식을 선택해야 합니다.</Text>
              )}

              <View style={styles.boundaryDrawPanel}>
                <View style={styles.boundaryDrawText}>
                  <Text style={styles.boundaryDrawTitle}>유적 경계</Text>
                  <Text style={styles.boundaryDrawDetail}>
                    {getPickedBoundaryStatusText(
                      pickedBoundary,
                      isPreparingBoundaryPicker
                    )}
                  </Text>
                </View>
                <View style={styles.boundaryActionButtons}>
                  <Button
                    icon={<Ionicons name="map-outline" size={16} />}
                    isDisabled={isPreparingBoundaryPicker}
                    onPress={() => { void openBoundaryPicker(); }}
                    testID="project-boundary-draw-button"
                    title={getBoundaryDrawButtonTitle(
                      pickedBoundary,
                      isPreparingBoundaryPicker
                    )}
                    variant={pickedBoundary ? 'secondary' : 'success'}
                  />
                  <Button
                    icon={<Ionicons name="folder-open-outline" size={16} />}
                    isDisabled={isPreparingBoundaryPicker}
                    onPress={() => {
                      setBoundarySummaryTouched(true);
                      setIsBoundaryFileImportOpen(true);
                    }}
                    testID="project-boundary-import-button"
                    title="SHP/DXF 가져오기"
                    variant={pickedBoundary ? 'secondary' : 'success'}
                  />
                </View>
              </View>

              {showBoundaryGeometryError && (
                <Text style={styles.invalidText}>
                  유적 경계를 직접 그리거나 파일에서 가져와야 합니다.
                </Text>
              )}

              <Input
                testID="project-boundary-summary-input"
                label="경계 메모"
                value={boundarySummary}
                onChangeText={(value) => {
                  setBoundarySummaryTouched(true);
                  setBoundarySummary(value);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="예: 1구역 북쪽 능선부터 남쪽 농로까지"
                helpText="선택 사항입니다. 비워두면 그리거나 가져온 경계 정보가 메모로 저장됩니다."
                isValid
                style={styles.boundaryInput}
              />

              <View style={styles.boundaryNotice}>
                <Ionicons
                  name={isSetupReady ? 'checkmark-circle-outline' : 'information-circle-outline'}
                  size={18}
                  color={isSetupReady ? '#027a48' : '#175cd3'}
                />
                <Text style={styles.boundaryText}>
                  {setupStatusText}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
        {isPreparingBoundaryPicker && (
          <View
            style={styles.prepareBoundaryOverlay}
            testID="project-boundary-prepare-overlay"
          >
            <View style={styles.prepareBoundaryPanel}>
              <ActivityIndicator color="#24495d" size="large" />
              <Text style={styles.prepareBoundaryTitle}>
                잠시만 기다려주십시오
              </Text>
              <Text style={styles.prepareBoundaryText}>
                현재 위치를 확인하고 조사 경계 지도를 준비하고 있습니다.
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  boundaryActionButtons: {
    alignItems: 'stretch',
    gap: 8,
  },
  prepareBoundaryOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  prepareBoundaryPanel: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5df',
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  prepareBoundaryText: {
    color: '#526272',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  prepareBoundaryTitle: {
    color: '#20313a',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  boundaryDrawDetail: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },
  boundaryDrawPanel: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 12,
  },
  boundaryDrawText: {
    flex: 1,
  },
  boundaryDrawTitle: {
    color: '#27343b',
    fontSize: 14,
    fontWeight: '900',
  },
  boundaryInput: {
    marginTop: 12,
    width: '100%',
  },
  boundaryNotice: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 16,
    padding: 10,
  },
  boundaryText: {
    color: '#175cd3',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginLeft: 8,
  },
  container: {
    flex: 1,
    backgroundColor: colors.containerBackground,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  formContainer: {
    padding: 24,
    paddingTop: 32,
  },
  input: {
    width: '100%',
  },
  invalidText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    margin: 5,
  },
  modeButton: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    margin: 4,
    minHeight: 92,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: '47%',
  },
  modeButtonSelected: {
    backgroundColor: '#ecfdf3',
    borderColor: '#7fbc8c',
  },
  modeDetail: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 5,
  },
  modeDetailSelected: {
    color: '#2f6f4e',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  modeLabel: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '900',
  },
  modeLabelSelected: {
    color: '#1f5f43',
  },
  sectionText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#27343b',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  setupSection: {
    marginTop: 24,
  },
  startStep: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  startStepNumber: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    height: 22,
    lineHeight: 22,
    marginRight: 8,
    textAlign: 'center',
    width: 22,
  },
  startStepText: {
    color: '#344054',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  startSteps: {
    marginBottom: 14,
  },
});

const getCreateProjectSetupStatusText = (
  projectNameValidation: ReturnType<typeof validateProjectName>,
  investigationModeId: KoreanFieldworkInvestigationModeId | undefined,
  hasBoundaryGeometry: boolean
): string => {
  if (!projectNameValidation.isAvailable) {
    return projectNameValidation.isPresent
      ? getLocalProjectNameInvalidText(projectNameValidation)
      : '프로젝트 이름을 적고, 조사 방식을 고른 뒤 경계를 직접 그리거나 파일에서 가져오면 만들 수 있습니다.';
  }

  if (!investigationModeId && !hasBoundaryGeometry) {
    return '조사 방식을 고르고 경계를 직접 그리거나 SHP/DXF/GeoJSON에서 가져오면 만들 수 있습니다.';
  }

  if (!investigationModeId) {
    return '조사 방식을 선택하면 만들 수 있습니다.';
  }

  if (!hasBoundaryGeometry) {
    return '유적 경계를 직접 그리거나 파일에서 가져오면 만들 수 있습니다.';
  }

  return '준비 완료. 이 경계를 기준으로 프로젝트를 만들 수 있습니다.';
};

const getPickedBoundaryStatusText = (
  boundary?: KakaoSatellitePickedBoundary,
  isPreparingBoundaryPicker: boolean = false
): string =>
  isPreparingBoundaryPicker
    ? '현재 위치를 확인한 뒤 그 위치를 중심으로 지도를 엽니다.'
    : (
        boundary
          ? `경계점 ${boundary.coordinates.length}개를 찍었습니다. 생성하면 조사 경계 기록으로 저장됩니다.`
          : '지도에서 조사 지역의 꼭짓점을 3개 이상 찍어 경계를 만듭니다.'
      );

const getBoundaryDrawButtonTitle = (
  boundary: KakaoSatellitePickedBoundary | undefined,
  isPreparingBoundaryPicker: boolean
): string => {
  if (isPreparingBoundaryPicker) return '현재 위치 확인 중';

  return boundary ? '다시 그리기' : '지도에서 그리기';
};

const getDrawnBoundarySummary = (
  boundary?: KakaoSatellitePickedBoundary
): string => `지도에서 그린 조사 경계 (${boundary?.coordinates.length ?? 0}점)`;

const getImportedBoundarySummary = (
  importedBoundary: ImportedBoundaryFile
): string =>
  `${importedBoundary.fileName}에서 가져온 조사 경계 `
  + `(${importedBoundary.coordinateCount}점, ${importedBoundary.coordinateSystem})`;

const createPickedBoundaryFromImportedFile = (
  importedBoundary: ImportedBoundaryFile
): KakaoSatellitePickedBoundary => {
  const coordinates = getOpenMapCoordinates(importedBoundary.geometry.coordinates)
    .map(projectMapCoordinateToWgs84)
    .filter(isPickedBoundaryLocation);

  if (coordinates.length < 3) {
    throw new Error('가져온 파일에서 유효한 경계 좌표 3개 이상을 찾지 못했습니다.');
  }

  const center = importedBoundary.center
    ? projectMapLocationToWgs84(importedBoundary.center)
    : getPickedBoundaryCenter(coordinates);

  return {
    coordinates,
    ...(center ? { center } : {}),
  };
};

const getOpenMapCoordinates = (coordinates: number[][]): number[][] => {
  if (coordinates.length < 2) return coordinates;

  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (!firstCoordinate || !lastCoordinate) return coordinates;

  return firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
    ? coordinates.slice(0, -1)
    : coordinates;
};

const getPickedBoundaryCenter = (
  coordinates: KakaoSatellitePickedBoundary['coordinates']
): KakaoSatellitePickedBoundary['center'] => {
  if (coordinates.length === 0) return undefined;

  return {
    latitude: coordinates.reduce((sum, coordinate) =>
      sum + coordinate.latitude, 0) / coordinates.length,
    longitude: coordinates.reduce((sum, coordinate) =>
      sum + coordinate.longitude, 0) / coordinates.length,
  };
};

const isPickedBoundaryLocation = (
  location: KakaoSatellitePickedBoundary['coordinates'][number] | undefined
): location is KakaoSatellitePickedBoundary['coordinates'][number] =>
  location !== undefined;

const getCurrentBoundaryPickerLocation = async (
): Promise<KakaoSatellitePickedBoundary['center']> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return undefined;

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = currentLocation.coords;

    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : undefined;
  } catch (error) {
    console.warn('Unable to initialize project boundary picker location', error);
    return undefined;
  }
};

export default CreateProjectModal;
