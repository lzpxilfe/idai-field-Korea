import { Ionicons } from '@expo/vector-icons';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import Button from '@/components/common/Button';
import Heading from '@/components/common/Heading';
import Input from '@/components/common/Input';
import TitleBar from '@/components/common/TitleBar';
import { router } from 'expo-router';
import { colors } from '@/utils/colors';
import {
  KOREAN_FIELDWORK_INVESTIGATION_MODES,
  KoreanFieldworkInvestigationModeId,
  loadKoreanFieldworkDefaultInstitutionName,
  loadKoreanFieldworkProjectSetupDefaults,
  loadKoreanFieldworkProjectBoundaryDraft,
  saveKoreanFieldworkDefaultInstitutionName,
  saveKoreanFieldworkBoundarySummary,
  saveKoreanFieldworkInvestigationModeId,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import type {
  KoreanFieldworkProjectBoundaryDraft,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import {
  syncKoreanFieldworkProjectSetupDefaultsToProjectDocument,
} from '@/components/Project/korean-fieldwork-project-setup-sync';
import useConfiguration from '@/hooks/use-configuration';
import usePouchDbDatastore from '@/hooks/use-pouchdb-datastore';
import useRepository from '@/hooks/use-repository';

const SettingsScreen: React.FC = () => {
  const preferences = useContext(PreferencesContext);
  const insets = useSafeAreaInsets();
  const currentProject = preferences.preferences.currentProject.trim();
  const hasCurrentProject = currentProject.length > 0;

  const [usernameVal, setUsernameVal] = useState(
    preferences.preferences.username
  );
  const [institutionName, setInstitutionName] = useState('');
  const [kakaoLocalRestApiKey, setKakaoLocalRestApiKey] = useState('');
  const [kakaoMapJavaScriptKey, setKakaoMapJavaScriptKey] = useState('');
  const [kakaoNativeAppKey, setKakaoNativeAppKey] = useState('');
  const [investigationModeId, setInvestigationModeId] =
    useState<KoreanFieldworkInvestigationModeId>();
  const [boundarySummary, setBoundarySummary] = useState('');
  const [projectBoundaryDraft, setProjectBoundaryDraft] =
    useState<KoreanFieldworkProjectBoundaryDraft>();
  const [hasProjectSetupInteraction, setHasProjectSetupInteraction] =
    useState(false);
  const [hasMapProviderInteraction, setHasMapProviderInteraction] =
    useState(false);
  const hasProjectSetupInteractionRef = useRef(false);
  const hasInstitutionNameInteractionRef = useRef(false);
  const [, setIsLoadingProjectSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const repositoryUsername = preferences.preferences.username.trim();
  const currentProjectSettings =
    preferences.preferences.projects[currentProject];
  const clearInitialPullPending = useCallback(() => {
    if (!currentProject || !currentProjectSettings?.initialPullPending) return;

    preferences.setProjectSettings(currentProject, {
      ...currentProjectSettings,
      initialPullPending: false,
    });
  }, [currentProject, currentProjectSettings, preferences]);
  const projectDatastore = usePouchDbDatastore(
    hasCurrentProject ? currentProject : '',
    currentProjectSettings,
    clearInitialPullPending
  );
  const projectConfiguration = useConfiguration(
    hasCurrentProject ? currentProject : '',
    preferences.preferences.languages,
    repositoryUsername,
    projectDatastore
  );
  const projectRepository = useRepository(
    repositoryUsername,
    projectConfiguration,
    projectDatastore
  );

  useEffect(() => {
    setKakaoLocalRestApiKey(
      preferences.preferences.mapProviderSettings.kakaoLocalRestApiKey
    );
    setKakaoMapJavaScriptKey(
      preferences.preferences.mapProviderSettings.kakaoMapJavaScriptKey
    );
    setKakaoNativeAppKey(
      preferences.preferences.mapProviderSettings.kakaoNativeAppKey
    );
    setHasMapProviderInteraction(false);
  }, [preferences.preferences.mapProviderSettings]);

  useEffect(() => {
    let isActive = true;

    loadKoreanFieldworkDefaultInstitutionName()
      .then((defaultInstitutionName) => {
        if (!isActive || hasInstitutionNameInteractionRef.current) return;
        setInstitutionName(defaultInstitutionName ?? '');
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!hasCurrentProject) {
      setInvestigationModeId(undefined);
      setBoundarySummary('');
      setProjectBoundaryDraft(undefined);
      setHasProjectSetupInteraction(false);
      hasProjectSetupInteractionRef.current = false;
      setIsLoadingProjectSettings(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingProjectSettings(true);
    setInvestigationModeId(undefined);
    setBoundarySummary('');
    setProjectBoundaryDraft(undefined);
    setHasProjectSetupInteraction(false);
    hasProjectSetupInteractionRef.current = false;

    const loadProjectSettings = async () => {
      const projectDocument = projectRepository
        ? await projectRepository.get('project').catch(() => undefined)
        : undefined;
      const [setupDefaults, boundaryDraft] = await Promise.all([
        loadKoreanFieldworkProjectSetupDefaults(
          currentProject,
          projectDocument
        ),
        loadKoreanFieldworkProjectBoundaryDraft(currentProject),
      ]);

      if (!isActive || hasProjectSetupInteractionRef.current) return;
      setInvestigationModeId(setupDefaults.investigationModeId);
      setBoundarySummary(setupDefaults.boundarySummary ?? '');
      setProjectBoundaryDraft(boundaryDraft);
      if (!hasInstitutionNameInteractionRef.current) {
        setInstitutionName(setupDefaults.institutionName ?? '');
      }
    };

    loadProjectSettings()
      .catch(() => undefined)
      .finally(() => {
        if (!isActive) return;
        setIsLoadingProjectSettings(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentProject, hasCurrentProject, projectRepository]);

  const isBoundarySummaryValid = boundarySummary.trim().length > 0;
  const canSaveProjectSetup =
    hasCurrentProject
    && !!investigationModeId
    && isBoundarySummaryValid;
  const canSaveMapProviderSettings =
    hasMapProviderInteraction;
  const canSaveUsername = usernameVal.trim().length > 0;
  const canSaveInstitutionName = institutionName.trim().length > 0;
  const isProjectSetupIncomplete =
    hasCurrentProject
    && (!investigationModeId || !isBoundarySummaryValid);
  const hasIncompleteProjectSetupDraft =
    hasProjectSetupInteraction && isProjectSetupIncomplete;
  const canSave =
    (
      canSaveUsername
      || canSaveInstitutionName
      || canSaveProjectSetup
      || canSaveMapProviderSettings
    )
    && !isSaving;
  const projectSetupNotice = getProjectSetupNotice(
    investigationModeId,
    isBoundarySummaryValid,
    hasIncompleteProjectSetupDraft
  );

  const saveSettings = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      if (canSaveUsername) preferences.setUsername(usernameVal.trim());
      if (canSaveInstitutionName) {
        await saveKoreanFieldworkDefaultInstitutionName(
          institutionName
        );
      }
      if (canSaveMapProviderSettings) {
        preferences.setMapProviderSettings({
          kakaoLocalRestApiKey: kakaoLocalRestApiKey.trim(),
          kakaoMapJavaScriptKey: kakaoMapJavaScriptKey.trim(),
          kakaoNativeAppKey: kakaoNativeAppKey.trim(),
        });
      }
      if (canSaveProjectSetup && investigationModeId) {
        await saveKoreanFieldworkInvestigationModeId(
          currentProject,
          investigationModeId
        );
        await saveKoreanFieldworkBoundarySummary(
          currentProject,
          boundarySummary
        );
      }
      if (hasCurrentProject && (canSaveProjectSetup || canSaveInstitutionName)) {
        await syncKoreanFieldworkProjectSetupDefaultsToProjectDocument(
          projectRepository,
          {
            ...(canSaveProjectSetup && investigationModeId
              ? { boundarySummary, investigationModeId }
              : {}),
            ...(canSaveInstitutionName
              ? { institutionName }
              : {}),
          }
        ).catch(() => undefined);
      }
      router.back();
    } catch (error) {
      console.warn('Unable to save settings', error);
      setIsSaving(false);
    }
  };
  const markProjectSetupInteraction = () => {
    hasProjectSetupInteractionRef.current = true;
    setHasProjectSetupInteraction(true);
  };
  const markMapProviderInteraction = () => {
    setHasMapProviderInteraction(true);
  };
  const setInstitutionNameValue = (value: string) => {
    hasInstitutionNameInteractionRef.current = true;
    setInstitutionName(value);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.content}>
        <TitleBar
          title={<Heading>설정</Heading>}
          left={
            <Button
              variant="transparent"
              onPress={() => router.back()}
              title="취소"
              icon={<Ionicons name="close-outline" size={16} />}
            />
          }
          right={
            <Button
              variant="success"
              onPress={() => { void saveSettings(); }}
              title="저장"
              isDisabled={!canSave}
              testID="settings-save"
            />
          }
        />

        <ScrollView
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>프로젝트 기본 설정</Text>
            {hasCurrentProject ? (
              <>
                <View style={styles.currentProjectBox}>
                  <Ionicons
                    name="folder-open-outline"
                    size={18}
                    color="#175cd3"
                  />
                  <Text
                    numberOfLines={1}
                    style={styles.currentProjectText}
                    testID="settings-current-project"
                  >
                    {currentProject}
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>조사 방식</Text>
                <Text style={styles.sectionText}>
                  조사 방식은 오늘 할 일을 묻는 값이 아니라, 이 프로젝트가 어떤 조사인지 정하는 기본값입니다.
                </Text>
                <View style={styles.modeGrid}>
                  {KOREAN_FIELDWORK_INVESTIGATION_MODES.map((mode) => {
                    const isSelected = investigationModeId === mode.id;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.86}
                        key={mode.id}
                        onPress={() => {
                          markProjectSetupInteraction();
                          setInvestigationModeId(mode.id);
                        }}
                        style={[
                          styles.modeButton,
                          isSelected && styles.modeButtonSelected,
                        ]}
                        testID={`settings-investigation-mode_${mode.id}`}
                      >
                        <View style={styles.modeLabelRow}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.modeLabel,
                              isSelected && styles.modeLabelSelected,
                            ]}
                          >
                            {mode.label}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={17}
                              color="#027a48"
                            />
                          )}
                        </View>
                        <Text
                          numberOfLines={2}
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

                <Input
                  label="조사 경계"
                  value={boundarySummary}
                  onChangeText={(value) => {
                    markProjectSetupInteraction();
                    setBoundarySummary(value);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="예: 1구역 북쪽 능선부터 남쪽 농로까지"
                  helpText="프로젝트 초기에 정한 경계 기준입니다. 지도 도형은 조사 경계 기록으로 따로 남깁니다."
                  isValid
                  testID="settings-boundary-summary-input"
                  style={styles.input}
                />

                {projectBoundaryDraft && (
                  <ProjectBoundaryPreview
                    boundaryDraft={projectBoundaryDraft}
                    boundarySummary={boundarySummary}
                  />
                )}

                <View style={styles.boundaryNotice}>
                  <Ionicons
                    name={isProjectSetupIncomplete
                      ? 'information-circle-outline'
                      : 'map-outline'}
                    size={18}
                    color="#175cd3"
                  />
                  <Text style={styles.boundaryText}>
                    {projectSetupNotice}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyProjectBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#667085"
                />
                <Text style={styles.emptyProjectText}>
                  프로젝트를 만들거나 열면 조사 방식과 조사 경계 기준이 여기에 표시됩니다.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>지도 API 키</Text>
            <Text style={styles.sectionText}>
              카카오는 기능별 키가 다릅니다. REST 키는 주소·좌표용이고, 태블릿 지도 배경 선택은 JavaScript 키 WebView 경로를 우선 사용합니다.
            </Text>
            <Input
              label="카카오 Local REST 키"
              value={kakaoLocalRestApiKey}
              onChangeText={(value) => {
                markMapProviderInteraction();
                setKakaoLocalRestApiKey(value);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              helpText="주소 검색과 좌표 변환에 사용합니다. 지도 배경 표시용 키는 아닙니다."
              testID="settings-kakao-local-rest-api-key-input"
              style={styles.input}
            />
            <Input
              label="카카오 지도 JavaScript 키"
              value={kakaoMapJavaScriptKey}
              onChangeText={(value) => {
                markMapProviderInteraction();
                setKakaoMapJavaScriptKey(value);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              helpText="WebView로 카카오 일반지도, 위성지도, 하이브리드를 선택해 경계를 찍을 때 사용합니다. SDK가 막히면 지도 화면에 표시되는 WebView 출처를 Kakao Developers에 등록하세요."
              testID="settings-kakao-map-javascript-key-input"
              style={styles.input}
            />
            <Input
              label="카카오 Native App 키"
              value={kakaoNativeAppKey}
              onChangeText={(value) => {
                markMapProviderInteraction();
                setKakaoNativeAppKey(value);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              helpText="네이티브 지도 연동용으로 보관합니다. 현재 카카오 지도 경계 찍기는 JavaScript 키를 우선 사용합니다."
              testID="settings-kakao-native-app-key-input"
              style={styles.input}
            />
            <View style={styles.boundaryNotice}>
              <Ionicons
                name="key-outline"
                size={18}
                color="#175cd3"
              />
              <Text style={styles.boundaryText}>
                키는 이 태블릿의 앱 설정에 저장됩니다. 소스 코드나 APK 빌드 스크립트에는 직접 넣지 않습니다.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>개인 기본값</Text>
            <Text style={styles.sectionText}>
              기록자와 기관을 나누어 저장합니다. 작업자 이름은 편집 이력에, 기관명은 프로젝트 기관 필드에 사용됩니다.
            </Text>
            <Input
              label="작업자 이름"
              value={usernameVal}
              onChangeText={setUsernameVal}
              autoCorrect={false}
              helpText="작업자 이름은 편집 이력에 저장되어 누가 기록을 만들고 수정했는지 확인하는 데 사용됩니다."
              isValid={usernameVal.trim().length > 0}
              invalidText="작업자 이름을 입력해야 합니다."
              testID="settings-username-input"
              style={styles.input}
            />
            <Input
              label="기관명"
              value={institutionName}
              onChangeText={setInstitutionNameValue}
              autoCorrect={false}
              placeholder="예: ○○문화재연구원"
              helpText="기관명은 새 프로젝트 기본값으로 보관하고, 현재 프로젝트가 열려 있으면 프로젝트의 기관 필드에도 저장합니다."
              testID="settings-institution-name-input"
              style={styles.input}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const BOUNDARY_PREVIEW_DEFAULT_SIZE = {
  height: 180,
  width: 320,
};
const BOUNDARY_PREVIEW_TEXT = {
  title: '\uc9c0\ub3c4\uc5d0\uc11c \ucc0d\uc740 \uc870\uc0ac \uacbd\uacc4',
  label: '\uc870\uc0ac \uacbd\uacc4',
  pointSuffix: '\uc810',
};

interface BoundaryPreviewPoint {
  x: number;
  y: number;
}

interface BoundaryPreviewSize {
  height: number;
  width: number;
}

const ProjectBoundaryPreview: React.FC<{
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft;
  boundarySummary: string;
}> = ({ boundaryDraft, boundarySummary }) => {
  const [canvasSize, setCanvasSize] = useState(BOUNDARY_PREVIEW_DEFAULT_SIZE);
  const boundaryPoints = useMemo(
    () => getBoundaryPreviewPoints(boundaryDraft, canvasSize),
    [boundaryDraft, canvasSize]
  );

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };

  return (
    <View style={styles.boundaryPreview} testID="settings-boundary-preview">
      <View style={styles.boundaryPreviewHeader}>
        <Text style={styles.boundaryPreviewTitle}>
          {BOUNDARY_PREVIEW_TEXT.title}
        </Text>
        <Text style={styles.boundaryPreviewDetail} numberOfLines={1}>
          {boundarySummary.trim()
            || `${boundaryDraft.coordinates.length}${BOUNDARY_PREVIEW_TEXT.pointSuffix}`}
        </Text>
      </View>
      <View
        onLayout={updateCanvasSize}
        style={styles.boundaryPreviewCanvas}
        testID="settings-boundary-preview-canvas"
      >
        {toBoundaryPreviewSegments(boundaryPoints)}
        {boundaryPoints.map((point, index) => (
          <View
            key={`settings-boundary-preview-point-${index}`}
            pointerEvents="none"
            style={[
              styles.boundaryPreviewPoint,
              {
                left: point.x - 9,
                top: point.y - 9,
              },
            ]}
            testID={`settings-boundary-preview-point_${index}`}
          >
            <Text style={styles.boundaryPreviewPointText}>{index + 1}</Text>
          </View>
        ))}
        <Text style={styles.boundaryPreviewLabel}>
          {BOUNDARY_PREVIEW_TEXT.label}
        </Text>
      </View>
    </View>
  );
};

const getBoundaryPreviewPoints = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft,
  canvasSize: BoundaryPreviewSize
): BoundaryPreviewPoint[] => {
  if (boundaryDraft.coordinates.length === 0) return [];

  const averageLatitude = boundaryDraft.coordinates.reduce(
    (sum, point) => sum + point.latitude,
    0
  ) / boundaryDraft.coordinates.length;
  const longitudeScale = Math.max(
    Math.cos((averageLatitude * Math.PI) / 180),
    0.000001
  );
  const projectedPoints = boundaryDraft.coordinates.map((point) => ({
    x: point.longitude * longitudeScale,
    y: point.latitude,
  }));
  const xs = projectedPoints.map((point) => point.x);
  const ys = projectedPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  const padding = 24;
  const drawableWidth = Math.max(canvasSize.width - (padding * 2), 1);
  const drawableHeight = Math.max(canvasSize.height - (padding * 2), 1);
  const scale = Math.min(
    drawableWidth / Math.max(xRange, 0.000001),
    drawableHeight / Math.max(yRange, 0.000001)
  );
  const fittedWidth = xRange * scale;
  const fittedHeight = yRange * scale;
  const offsetX = (canvasSize.width - fittedWidth) / 2;
  const offsetY = (canvasSize.height - fittedHeight) / 2;

  return projectedPoints.map((point) => ({
    x: offsetX + ((point.x - minX) * scale),
    y: offsetY + ((maxY - point.y) * scale),
  }));
};

const toBoundaryPreviewSegments = (points: BoundaryPreviewPoint[]) => {
  if (points.length < 2) return [];

  return points.map((point, index) => (
    <BoundaryPreviewSegment
      end={points[(index + 1) % points.length]}
      key={`settings-boundary-preview-segment-${index}`}
      start={point}
      testID="settings-boundary-preview-segment"
    />
  ));
};

const BoundaryPreviewSegment: React.FC<{
  end: BoundaryPreviewPoint;
  start: BoundaryPreviewPoint;
  testID: string;
}> = ({ end, start, testID }) => {
  const width = 3;
  const distance = Math.sqrt(
    ((end.x - start.x) ** 2) + ((end.y - start.y) ** 2)
  );
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: '#175cd3',
        borderRadius: width,
        height: width,
        left: ((start.x + end.x) / 2) - (distance / 2),
        opacity: 0.92,
        position: 'absolute',
        top: ((start.y + end.y) / 2) - (width / 2),
        transform: [{ rotateZ: `${angle}rad` }],
        width: distance,
      }}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#27343b',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
  },
  input: {
    width: '100%',
  },
  currentProjectBox: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 18,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  currentProjectText: {
    color: '#175cd3',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  fieldLabel: {
    color: '#27343b',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  modeButton: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    margin: 4,
    minHeight: 98,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: '47%',
  },
  modeButtonSelected: {
    backgroundColor: '#ecfdf3',
    borderColor: '#7fbc8c',
  },
  modeLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 20,
  },
  modeLabel: {
    color: '#27343b',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  modeLabelSelected: {
    color: '#027a48',
  },
  modeDetail: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 6,
  },
  modeDetailSelected: {
    color: '#2f6f4e',
  },
  boundaryNotice: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  boundaryPreview: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  boundaryPreviewCanvas: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 6,
    borderWidth: 1,
    height: BOUNDARY_PREVIEW_DEFAULT_SIZE.height,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  boundaryPreviewDetail: {
    color: '#667085',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
    textAlign: 'right',
  },
  boundaryPreviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  boundaryPreviewLabel: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    top: 8,
  },
  boundaryPreviewPoint: {
    alignItems: 'center',
    backgroundColor: '#175cd3',
    borderColor: '#ffffff',
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    width: 18,
  },
  boundaryPreviewPointText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  boundaryPreviewTitle: {
    color: '#27343b',
    fontSize: 13,
    fontWeight: '900',
  },
  boundaryText: {
    color: '#344054',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginLeft: 8,
  },
  emptyProjectBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyProjectText: {
    color: '#667085',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginLeft: 8,
  },
});

export default SettingsScreen;

const getProjectSetupNotice = (
  investigationModeId: KoreanFieldworkInvestigationModeId | undefined,
  isBoundarySummaryValid: boolean,
  hasIncompleteProjectSetupDraft: boolean
): string => {
  if (hasIncompleteProjectSetupDraft) {
    return '조사 방식과 조사 경계를 모두 채우면 프로젝트 기본값도 같이 저장됩니다. 지금 저장하면 개인 기본값만 저장합니다.';
  }

  if (!investigationModeId && !isBoundarySummaryValid) {
    return '개인 기본값은 따로 저장할 수 있습니다. 조사 방식과 조사 경계를 채우면 프로젝트 기본값도 함께 저장됩니다.';
  }
  if (!investigationModeId) {
    return '개인 기본값은 따로 저장할 수 있습니다. 조사 방식을 선택하면 프로젝트 기본값도 함께 저장됩니다.';
  }
  if (!isBoundarySummaryValid) {
    return '개인 기본값은 따로 저장할 수 있습니다. 조사 경계를 적으면 프로젝트 기본값도 함께 저장됩니다.';
  }

  return '저장하면 개인 기본값과 프로젝트 기본값을 함께 저장합니다.';
};
