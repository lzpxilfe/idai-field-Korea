import { Ionicons } from '@expo/vector-icons';
import { CategoryForm, Document, Tree } from 'idai-field-core';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ConfigurationContext } from '@/contexts/configuration-context';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import CategoryIcon from '@/components/common/CategoryIcon';
import Heading from '@/components/common/Heading';
import Input from '@/components/common/Input';
import TitleBar from '@/components/common/TitleBar';
import LabelsContext from '@/contexts/labels/labels-context';
import KakaoSatellitePicker from '@/components/Project/Map/KakaoSatellitePicker';
import type {
  KakaoSatellitePickedBoundary,
  KakaoSatellitePickedLocation,
} from '@/components/Project/Map/KakaoSatellitePicker';
import {
  getKoreanFieldworkAddOptions,
  KoreanFieldworkAddOption,
  KOREAN_FIELDWORK_HIERARCHY_HELP,
} from './korean-fieldwork-add-options';
import {
  getKoreanFieldworkCategoryLabel,
  KOREAN_FIELDWORK_CATEGORY_ORDER,
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';
import { canCreateKoreanFieldworkChildRecord } from './korean-fieldwork-child-records';
import {
  getKoreanFieldworkFeatureInvestigationSteps,
  getKoreanFieldworkFeatureTypeOption,
  KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS,
} from './korean-fieldwork-feature-types';
import type {
  KoreanFieldworkInvestigationModeId,
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';

const ICON_SIZE = 34;
const FEATURE_SKETCH_CANVAS_DEFAULT_SIZE = {
  height: 1280,
  width: 1920,
};
const FEATURE_SKETCH_TABLET_WIDTH = 600;
const FEATURE_SKETCH_SCALE_STEP = 10;
const FEATURE_SKETCH_ROTATION_STEP = 15;
const FEATURE_SKETCH_GRID_PERCENTS = [25, 50, 75];
const FEATURE_LOCATION_SKETCH_SHAPES = [
  { id: 'point', label: '점', icon: 'location-outline' },
  { id: 'polygon', label: '점 연결', icon: 'git-merge-outline' },
  { id: 'rectangle', label: '사각형', icon: 'square-outline' },
  { id: 'oval', label: '타원', icon: 'ellipse-outline' },
] as const;
type FeatureLocationSketchShape =
  typeof FEATURE_LOCATION_SKETCH_SHAPES[number]['id'];
type FeatureSketchPoint = {
  x: number;
  y: number;
};
type FeatureSketchPixelPoint = {
  x: number;
  y: number;
};
type FeatureSketchTouchPoint = {
  x: number;
  y: number;
};
type FeatureShapeGestureState = {
  angle: number;
  distance: number;
  rotation: number;
  scale: number;
};

interface AddModalProps {
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  existingDocuments?: readonly Document[];
  initialCategoryName?: string;
  initialDraftParams?: Record<string, string>;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  mapJavaScriptKey?: string;
  onAddCategory: (
    categoryName: string,
    parentDoc: Document | undefined,
    draftParams?: Record<string, string>
  ) => void;
  onClose: () => void;
  parentDoc?: Document;
}

const DocumentAddModal: React.FC<AddModalProps> = ({
  boundaryDraft,
  existingDocuments = [],
  initialCategoryName,
  initialDraftParams = {},
  investigationModeId,
  mapJavaScriptKey = '',
  onAddCategory,
  onClose,
  parentDoc,
}) => {
  const config = useContext(ConfigurationContext);
  const { labels } = useContext(LabelsContext);
  const [expandedFeatureGuideType, setExpandedFeatureGuideType] = useState<string>();
  const [featureIdentifier, setFeatureIdentifier] = useState('');
  const isFeatureOnlyFlow =
    initialCategoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE;
  const [isChoosingFeatureType, setIsChoosingFeatureType] =
    useState(isFeatureOnlyFlow);
  const windowDimensions = useWindowDimensions();
  const isFeatureWideLayout =
    windowDimensions.width >= FEATURE_SKETCH_TABLET_WIDTH;
  const featureSketchCanvasHeight = useMemo(
    () => {
      const reservedHeight = isFeatureWideLayout ? 352 : 180;
      const minimumHeight = isFeatureWideLayout ? 440 : 460;
      const maximumHeight = isFeatureWideLayout ? 860 : 760;
      const targetHeight = Math.max(
        minimumHeight,
        Math.round(windowDimensions.height - reservedHeight)
      );

      return clamp(
        targetHeight,
        minimumHeight,
        maximumHeight
      );
    },
    [isFeatureWideLayout, windowDimensions.height]
  );
  const [featureLocationShape, setFeatureLocationShape] =
    useState<FeatureLocationSketchShape>('polygon');
  const [featureSketchPoints, setFeatureSketchPoints] = useState<FeatureSketchPoint[]>([]);
  const [activeFeatureSketchPoint, setActiveFeatureSketchPoint] =
    useState<FeatureSketchPoint>();
  const [featureSketchCenter, setFeatureSketchCenter] =
    useState<FeatureSketchPoint>({ x: 50, y: 50 });
  const [featureSketchScale, setFeatureSketchScale] = useState(100);
  const [featureSketchRotation, setFeatureSketchRotation] = useState(0);
  const [featureSketchWasEdited, setFeatureSketchWasEdited] = useState(false);
  const [featureSketchCanvasSize, setFeatureSketchCanvasSize] =
    useState(FEATURE_SKETCH_CANVAS_DEFAULT_SIZE);
  const [featureMapBoundary, setFeatureMapBoundary] =
    useState<KakaoSatellitePickedBoundary>();
  const [isFeatureBoundaryPickerOpen, setIsFeatureBoundaryPickerOpen] =
    useState(false);
  const lastPreviewFeatureSketchPointRef = useRef<FeatureSketchPoint>();
  const featureShapeGestureRef = useRef<FeatureShapeGestureState>();

  const isAllowedCategory = useCallback(
    (category: CategoryForm) =>
      !!parentDoc && canCreateKoreanFieldworkChildRecord(category, parentDoc, config),
    [parentDoc, config]
  );

  const allowedCategories = useMemo(
    () => Tree.flatten(config.getCategories())
      .filter(isAllowedCategory)
      .sort(compareKoreanFieldworkCategories),
    [config, isAllowedCategory]
  );

  const categoriesByName = useMemo(
    () => new Map(allowedCategories.map((category) => [category.name, category])),
    [allowedCategories]
  );
  const featureSketchBoundaryPoints = useMemo(
    () => getFeatureSketchBoundaryPoints(boundaryDraft),
    [boundaryDraft]
  );

  const optionGroups = useMemo(
    () => getKoreanFieldworkAddOptions(
      parentDoc?.resource.category ?? '',
      allowedCategories.map((category) => category.name),
      investigationModeId
    ),
    [allowedCategories, investigationModeId, parentDoc]
  );

  if (!parentDoc) return null;
  const parentCategory = config.getCategory(parentDoc.resource.category);
  if (!parentCategory) return null;
  const hasPrimaryOptions = optionGroups.primary.length > 0;
  const hasSpecialOptions = optionGroups.special.length > 0;
  const hasOtherOptions = optionGroups.other.length > 0;
  const parentCategoryLabel = labels?.get(parentCategory)
    ?? getKoreanFieldworkCategoryLabel(parentCategory.name);

  const openAddOption = (option: KoreanFieldworkAddOption) => {
    if (option.categoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
      openFeatureCreation();
      return;
    }

    onAddCategory(option.categoryName, parentDoc);
  };

  const renderOption = (option: KoreanFieldworkAddOption) => {
    const category = categoriesByName.get(option.categoryName);
    if (!category) return null;

    return (
      <TouchableOpacity
        key={option.categoryName}
        activeOpacity={0.86}
        style={styles.optionRow}
        onPress={() => openAddOption(option)}
        testID={`addCategory_${option.categoryName}`}
      >
        <CategoryIcon category={category} size={ICON_SIZE} />
        <View style={styles.optionText}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionDescription} numberOfLines={2}>
            {option.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#475467" />
      </TouchableOpacity>
    );
  };

  const resetFeatureLocationSketch = () => {
    setFeatureLocationShape('polygon');
    setActiveFeatureSketchPoint(undefined);
    setFeatureSketchPoints([]);
    setFeatureSketchCenter({ x: 50, y: 50 });
    setFeatureSketchScale(100);
    setFeatureSketchRotation(0);
    setFeatureSketchWasEdited(false);
    setFeatureMapBoundary(undefined);
    featureShapeGestureRef.current = undefined;
  };

  const openFeatureCreation = () => {
    setExpandedFeatureGuideType(undefined);
    setFeatureIdentifier('');
    resetFeatureLocationSketch();
    setIsChoosingFeatureType(true);
  };

  const leaveFeatureCreation = () => {
    if (isFeatureOnlyFlow) {
      onClose();
      return;
    }

    setExpandedFeatureGuideType(undefined);
    resetFeatureLocationSketch();
    setIsChoosingFeatureType(false);
  };

  const selectFeatureLocationShape = (shape: FeatureLocationSketchShape) => {
    setFeatureLocationShape(shape);
    setActiveFeatureSketchPoint(undefined);
    setFeatureSketchWasEdited(true);
    setFeatureMapBoundary(undefined);
    featureShapeGestureRef.current = undefined;
    if (shape !== 'polygon' && featureSketchPoints.length > 1) {
      setFeatureSketchPoints([featureSketchCenter]);
    }
  };

  const openFeatureBoundaryPicker = () => {
    setIsFeatureBoundaryPickerOpen(true);
  };

  const pickFeatureBoundary = (boundary: KakaoSatellitePickedBoundary) => {
    setFeatureMapBoundary(boundary);
    setFeatureLocationShape('polygon');
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(undefined);
    setFeatureSketchCenter(getFeatureSketchCenterFromBoundary(boundary));
    setFeatureSketchPoints(
      getFeatureSketchPointsFromBoundary(boundary, boundaryDraft)
    );
    setIsFeatureBoundaryPickerOpen(false);
  };

  const handleFeatureSketchLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) {
      setFeatureSketchCanvasSize({ height, width });
    }
  };

  const previewFeatureSketchPoint = (event: GestureResponderEvent) => {
    const shapeGesture = getFeatureShapeGesture(
      event,
      featureSketchCanvasSize
    );
    if (
      isFeatureShapeTransformVisible(featureLocationShape)
      && shapeGesture
    ) {
      const initialGesture = featureShapeGestureRef.current ?? {
        angle: shapeGesture.angle,
        distance: Math.max(1, shapeGesture.distance),
        rotation: featureSketchRotation,
        scale: featureSketchScale,
      };
      featureShapeGestureRef.current = initialGesture;
      const nextScale = clamp(
        initialGesture.scale
          * (shapeGesture.distance / Math.max(1, initialGesture.distance)),
        35,
        240
      );
      const nextRotation = normalizeRotation(
        initialGesture.rotation + shapeGesture.angle - initialGesture.angle
      );

      setFeatureMapBoundary(undefined);
      setFeatureSketchWasEdited(true);
      setActiveFeatureSketchPoint(undefined);
      setFeatureSketchCenter(shapeGesture.center);
      setFeatureSketchPoints([shapeGesture.center]);
      setFeatureSketchScale(Math.round(nextScale));
      setFeatureSketchRotation(Math.round(nextRotation));
      return;
    }

    featureShapeGestureRef.current = undefined;
    const point = getSketchPointFromPress(
      event,
      featureSketchCanvasSize
    );
    if (areSketchPointsEqual(point, lastPreviewFeatureSketchPointRef.current)) {
      return;
    }

    lastPreviewFeatureSketchPointRef.current = point;
    setFeatureMapBoundary(undefined);
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(point);

    if (featureLocationShape !== 'polygon') {
      setFeatureSketchCenter(point);
      setFeatureSketchPoints([point]);
    }
  };

  const commitFeatureSketchPoint = (event: GestureResponderEvent) => {
    if (featureShapeGestureRef.current) {
      featureShapeGestureRef.current = undefined;
      return;
    }

    const point = getSketchPointFromPress(
      event,
      featureSketchCanvasSize
    );
    lastPreviewFeatureSketchPointRef.current = undefined;
    setFeatureMapBoundary(undefined);
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(undefined);

    if (featureLocationShape === 'polygon') {
      setFeatureSketchPoints((points) => [...points, point].slice(-8));
      setFeatureSketchCenter(point);
      return;
    }

    setFeatureSketchCenter(point);
    setFeatureSketchPoints([point]);
  };

  const cancelFeatureSketchPoint = () => {
    lastPreviewFeatureSketchPointRef.current = undefined;
    featureShapeGestureRef.current = undefined;
    setActiveFeatureSketchPoint(undefined);
  };

  const adjustFeatureSketchScale = (delta: number) => {
    setFeatureSketchWasEdited(true);
    setFeatureSketchScale((scale) => clamp(scale + delta, 60, 160));
  };

  const adjustFeatureSketchRotation = (delta: number) => {
    setFeatureSketchWasEdited(true);
    setFeatureSketchRotation((rotation) => {
      const nextRotation = rotation + delta;
      if (nextRotation > 180) return nextRotation - 360;
      if (nextRotation < -180) return nextRotation + 360;
      return nextRotation;
    });
  };

  const undoFeatureSketchPoint = () => {
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(undefined);
    if (featureLocationShape === 'polygon') {
      setFeatureSketchPoints((points) => points.slice(0, -1));
      return;
    }

    setFeatureSketchPoints([]);
  };

  const renderFeatureSketchBoundary = () => {
    if (featureSketchBoundaryPoints.length < 3) {
      return (
        <View
          pointerEvents="none"
          style={styles.featureSketchBoundaryFallback}
          testID="featureSketchBoundaryFallback"
        >
          <Text style={styles.featureSketchBoundaryFallbackText}>
            {'\uc870\uc0ac \uacbd\uacc4 \uc5c6\uc74c'}
          </Text>
        </View>
      );
    }

    return (
      <>
        {toFeatureSketchLineSegments({
          canvasSize: featureSketchCanvasSize,
          closePath: true,
          color: '#175cd3',
          keyPrefix: 'boundary',
          points: featureSketchBoundaryPoints,
          testID: 'featureSketchBoundaryLine',
          width: 2,
        })}
        {featureSketchBoundaryPoints.map((point, index) => (
          <View
            key={`boundary-point-${index}`}
            pointerEvents="none"
            style={[
              styles.featureSketchBoundaryPoint,
              getFeatureSketchPointStyle(point),
            ]}
            testID={`featureSketchBoundaryPoint_${index}`}
          />
        ))}
        <Text style={styles.featureSketchBoundaryLabel}>
          {'\uc870\uc0ac \uacbd\uacc4'}
        </Text>
      </>
    );
  };

  const renderFeatureSketchPreview = () => {
    if (featureLocationShape === 'rectangle' || featureLocationShape === 'oval') {
      return (
        <View
          pointerEvents="none"
          style={[
            styles.featureSketchShapePreview,
            featureLocationShape === 'oval' && styles.featureSketchOvalPreview,
            getFeatureSketchShapeStyle(
              featureSketchCenter,
              featureSketchScale,
              featureSketchRotation
            ),
          ]}
          testID="featureSketchShapePreview"
        >
          <View style={styles.featureSketchShapeCenter} />
        </View>
      );
    }

    const points = featureLocationShape === 'polygon'
      ? getVisibleFeatureSketchPoints(featureSketchPoints, activeFeatureSketchPoint)
      : (featureSketchPoints.length > 0 ? featureSketchPoints : [featureSketchCenter]);

    return (
      <>
        {featureLocationShape === 'polygon' && toFeatureSketchLineSegments({
          canvasSize: featureSketchCanvasSize,
          closePath: points.length > 2 && activeFeatureSketchPoint === undefined,
          color: '#f97316',
          keyPrefix: 'feature',
          points,
          testID: 'featureSketchLine',
          width: 3,
        })}
        {points.map((point, index) => (
          <View
            key={`${point.x}-${point.y}-${index}`}
            pointerEvents="none"
            style={[
              styles.featureSketchPoint,
              activeFeatureSketchPoint === point && styles.featureSketchPointActive,
              getFeatureSketchPointStyle(point),
            ]}
            testID={`featureSketchPoint_${index}`}
          >
            <Text style={styles.featureSketchPointText}>{index + 1}</Text>
          </View>
        ))}
      </>
    );
  };

  const renderFeatureSketchGrid = () => (
    <>
      {FEATURE_SKETCH_GRID_PERCENTS.map((percent) => (
        <View
          key={`vertical-grid-${percent}`}
          pointerEvents="none"
          style={[
            styles.featureSketchGridLine,
            styles.featureSketchGridLineVertical,
            { left: toPercent(percent) },
          ]}
        />
      ))}
      {FEATURE_SKETCH_GRID_PERCENTS.map((percent) => (
        <View
          key={`horizontal-grid-${percent}`}
          pointerEvents="none"
          style={[
            styles.featureSketchGridLine,
            styles.featureSketchGridLineHorizontal,
            { top: toPercent(percent) },
          ]}
        />
      ))}
    </>
  );

  const renderFeatureSketchMapSurface = () => (
    <View
      pointerEvents="none"
      style={styles.featureSketchMapSurface}
      testID="featureSketchFlatMapSurface"
    >
      <View style={[styles.featureSketchSatelliteField, styles.featureSketchSatelliteFieldA]} />
      <View style={[styles.featureSketchSatelliteField, styles.featureSketchSatelliteFieldB]} />
      <View style={[styles.featureSketchSatelliteField, styles.featureSketchSatelliteFieldC]} />
      <View style={[styles.featureSketchSatelliteRoad, styles.featureSketchSatelliteRoadA]} />
      <View style={[styles.featureSketchSatelliteRoad, styles.featureSketchSatelliteRoadB]} />
      <View style={[styles.featureSketchSatelliteTreeLine, styles.featureSketchSatelliteTreeLineA]} />
      <View style={[styles.featureSketchSatelliteWater, styles.featureSketchSatelliteWaterA]} />
    </View>
  );

  const renderFeatureSketchToolbar = () => (
    <View
      pointerEvents="box-none"
      style={styles.featureSketchToolbar}
      testID="featureSketchToolRail"
    >
      <TouchableOpacity
        activeOpacity={0.84}
        accessibilityLabel="마지막 점 되돌리기"
        onPress={undoFeatureSketchPoint}
        style={styles.featureSketchToolButton}
        testID="featureSketchUndo"
      >
        <Ionicons name="arrow-undo-outline" size={18} color="#344054" />
      </TouchableOpacity>
      {isFeatureShapeTransformVisible(featureLocationShape) && (
        <>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="왼쪽으로 평면 회전"
            onPress={() => adjustFeatureSketchRotation(-FEATURE_SKETCH_ROTATION_STEP)}
            style={styles.featureSketchToolButton}
            testID="featureSketchRotateLeft"
          >
            <Ionicons name="return-up-back-outline" size={18} color="#344054" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="오른쪽으로 평면 회전"
            onPress={() => adjustFeatureSketchRotation(FEATURE_SKETCH_ROTATION_STEP)}
            style={styles.featureSketchToolButton}
            testID="featureSketchRotateRight"
          >
            <Ionicons name="return-up-forward-outline" size={18} color="#344054" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="유구 표시 작게"
            onPress={() => adjustFeatureSketchScale(-FEATURE_SKETCH_SCALE_STEP)}
            style={styles.featureSketchToolButton}
            testID="featureSketchScaleDown"
          >
            <Ionicons name="remove-outline" size={18} color="#344054" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="유구 표시 크게"
            onPress={() => adjustFeatureSketchScale(FEATURE_SKETCH_SCALE_STEP)}
            style={styles.featureSketchToolButton}
            testID="featureSketchScaleUp"
          >
            <Ionicons name="add-outline" size={18} color="#344054" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderFeatureLocationSketchPanel = () => (
    <View
      style={[
        styles.featureLocationPanel,
        isFeatureWideLayout && styles.featureLocationPanelWide,
      ]}
      testID="featureLocationSketchPanel"
    >
      <View
        onLayout={handleFeatureSketchLayout}
        style={[
          styles.featureSketchCanvas,
          { height: featureSketchCanvasHeight },
        ]}
        testID="featureLocationSketchCanvas"
      >
        {renderFeatureSketchMapSurface()}
        {renderFeatureSketchGrid()}
        <View
          onMoveShouldSetResponder={() => true}
          onResponderGrant={previewFeatureSketchPoint}
          onResponderMove={previewFeatureSketchPoint}
          onResponderRelease={commitFeatureSketchPoint}
          onResponderTerminate={cancelFeatureSketchPoint}
          onStartShouldSetResponder={() => true}
          style={styles.featureSketchTouchLayer}
          testID="featureLocationSketchTouchLayer"
        />
        <View pointerEvents="box-none" style={styles.featureLocationHeader}>
          <View style={styles.featureLocationHeaderCopy}>
            <Text style={styles.featureLocationTitle}>유구 위치 지도</Text>
            <Text style={styles.featureLocationDetail}>
              위성지도나 평면도처럼 조사 경계 위에 유구를 바로 얹습니다.
            </Text>
          </View>
          {featureSketchWasEdited && (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={resetFeatureLocationSketch}
              style={styles.featureSketchIconButton}
              testID="featureSketchReset"
            >
              <Ionicons name="refresh-outline" size={17} color="#475467" />
            </TouchableOpacity>
          )}
        </View>
        <View
          pointerEvents="none"
          style={styles.featureSketchPlaneBadge}
          testID="featureSketchPlacementBadge"
        >
          <Ionicons name="map-outline" size={13} color="#175cd3" />
          <Text style={styles.featureSketchPlaneBadgeText}>조사 경계 위 배치</Text>
        </View>
        <View
          pointerEvents="box-none"
          style={styles.featureSketchMapActionPanel}
          testID="featureSketchMapActionPanel"
        >
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={openFeatureBoundaryPicker}
            style={styles.featureSketchMapActionButton}
            testID="featureSketchOpenMapBoundary"
          >
            <Ionicons name="map-outline" size={16} color="white" />
            <Text style={styles.featureSketchMapActionText}>
              지도에서 유구 경계 그리기
            </Text>
          </TouchableOpacity>
          <Text style={styles.featureSketchMapActionHint}>
            {featureMapBoundary
              ? `지도 경계점 ${featureMapBoundary.coordinates.length}개를 가져왔습니다.`
              : '유적 경계 지도를 보면서 유구 외곽을 먼저 잡을 수 있습니다.'}
          </Text>
        </View>
        <View
          pointerEvents="box-none"
          style={styles.featureSketchModeRow}
          testID="featureSketchModeRail"
        >
          {FEATURE_LOCATION_SKETCH_SHAPES.map((shape) => {
            const isSelected = shape.id === featureLocationShape;

            return (
              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={shape.id}
                onPress={() => selectFeatureLocationShape(shape.id)}
                style={[
                  styles.featureSketchModeButton,
                  isSelected && styles.featureSketchModeButtonSelected,
                ]}
                testID={`featureSketchMode_${shape.id}`}
              >
                <Ionicons
                  name={shape.icon as keyof typeof Ionicons.glyphMap}
                  size={15}
                  color={isSelected ? '#c2410c' : '#526272'}
                />
                <Text style={[
                  styles.featureSketchModeText,
                  isSelected && styles.featureSketchModeTextSelected,
                ]}>
                  {shape.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {renderFeatureSketchBoundary()}
        {renderFeatureSketchPreview()}
        {renderFeatureSketchToolbar()}
      </View>
    </View>
  );

  const renderFeatureTypePicker = () => {
    const featureCategory = categoriesByName.get(KOREAN_FIELDWORK_CATEGORIES.FEATURE);
    if (!featureCategory) return null;

    const toggleFeatureGuide = (featureType: string) => {
      setExpandedFeatureGuideType((currentType) =>
        currentType === featureType ? undefined : featureType);
    };
    const normalizedFeatureIdentifier = featureIdentifier.trim();

    const updateFeatureIdentifier = (value: string) => {
      setFeatureIdentifier(value);
    };

    const createFeature = (featureType: string) => {
      const resolvedFeatureIdentifier = normalizedFeatureIdentifier
        || createNextFeatureIdentifier(featureType, existingDocuments);

      onAddCategory(
        KOREAN_FIELDWORK_CATEGORIES.FEATURE,
        parentDoc,
        {
          ...initialDraftParams,
          featureType,
          identifier: resolvedFeatureIdentifier,
          ...getFeatureLocationSketchDraftParams({
            center: featureSketchCenter,
            isEdited: featureSketchWasEdited,
            mapBoundary: featureMapBoundary,
            points: featureSketchPoints,
            rotation: featureSketchRotation,
            scale: featureSketchScale,
            shape: featureLocationShape,
          }),
        }
      );
    };

    const renderFeatureInvestigationGuide = (featureType: string) => (
      <View style={styles.featureGuide}>
        <Text style={styles.featureGuideTitle}>조사 참고</Text>
        <Text style={styles.featureGuideNote}>
          현장 상황에 맞게 바꿔도 되는 참고용 순서입니다.
        </Text>
        <Text style={styles.featureGuideSteps} numberOfLines={2}>
          {getKoreanFieldworkFeatureInvestigationSteps(featureType)
            .slice(0, 3)
            .join(' → ')}
        </Text>
      </View>
    );

    return (
      <View
        style={[
          styles.featureCreationLayout,
          isFeatureWideLayout && styles.featureCreationLayoutWide,
        ]}
        testID="featureCreationLayout"
      >
        <View
          style={[
            styles.featureCreationMapPane,
            isFeatureWideLayout && styles.featureCreationMapPaneWide,
          ]}
          testID="featureCreationMapPane"
        >
          {renderFeatureLocationSketchPanel()}
        </View>
        <View
          style={[
            styles.featureCreationFormPane,
            isFeatureWideLayout && styles.featureCreationFormPaneWide,
          ]}
          testID="featureCreationFormPane"
        >
          <View style={[
            styles.featureNamePanel,
            isFeatureWideLayout && styles.featureNamePanelWide,
          ]}>
            <Input
              autoFocus
              isValid={true}
              invalidText="유구명을 먼저 입력하세요."
              label="유구명"
              onChangeText={updateFeatureIdentifier}
              placeholder="예: 1호 수혈"
              returnKeyType="done"
              testID="featureIdentifierInput"
              value={featureIdentifier}
            />
            <Text style={styles.featureNameHint}>
              유구명만 먼저 적어도 됩니다. 성격과 세부 정보는 조사하면서 계속 채우고 고칠 수 있습니다.
            </Text>
          </View>
          <View style={[
            styles.parentPanel,
            isFeatureWideLayout && styles.featureCreationParentPanelWide,
          ]}>
            <Text style={styles.parentLabel} numberOfLines={1}>
              포함 위치: {parentDoc.resource.identifier}
            </Text>
            <Text style={styles.parentMeta}>
              성격이 보이면 고르고, 애매하면 유구로 먼저 시작합니다.
            </Text>
            <Text style={styles.hierarchyHelp}>
              {KOREAN_FIELDWORK_HIERARCHY_HELP}
            </Text>
          </View>
          <View style={[
            styles.startUnknownFeature,
            isFeatureWideLayout && styles.startUnknownFeatureWide,
          ]}>
            <View style={styles.featureTypeHeader}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => createFeature('unknown')}
                style={styles.featureTypeCreateArea}
                testID="featureType_startUnknown"
              >
                <Ionicons name="add-circle-outline" size={22} color="#027a48" />
                <View style={styles.featureTypeText}>
                  <Text style={styles.featureTypeLabel} numberOfLines={1}>
                    유구로 바로 만들기
                  </Text>
                  <Text style={styles.featureTypeDescription} numberOfLines={2}>
                    시기와 성격은 조사하면서 다시 고칠 수 있습니다.
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityLabel="유구 조사 참고 보기"
                onPress={() => toggleFeatureGuide('startUnknown')}
                style={styles.featureHelpButton}
                testID="featureTypeHelp_startUnknown"
              >
                <Ionicons
                  name={expandedFeatureGuideType === 'startUnknown'
                    ? 'close-circle-outline'
                    : 'help-circle-outline'}
                  size={22}
                  color="#2f6f4e"
                />
              </TouchableOpacity>
            </View>
            {expandedFeatureGuideType === 'startUnknown'
              && renderFeatureInvestigationGuide('unknown')}
          </View>
          <View style={[
            styles.featureTypeGrid,
            isFeatureWideLayout && styles.featureTypeGridWide,
          ]}>
            {KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS.map((option) => (
              <View
                key={option.value}
                style={[
                  styles.featureTypeOption,
                  isFeatureWideLayout && styles.featureTypeOptionWide,
                ]}
              >
                <View style={styles.featureTypeHeader}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => createFeature(option.value)}
                    style={styles.featureTypeCreateArea}
                    testID={`featureType_${option.value}`}
                  >
                    <CategoryIcon category={featureCategory} size={24} />
                    <View style={styles.featureTypeText}>
                      <Text style={styles.featureTypeLabel} numberOfLines={1}>
                        {option.label}
                      </Text>
                      <Text style={styles.featureTypeDescription} numberOfLines={2}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityLabel={`${option.label} 조사 참고 보기`}
                    onPress={() => toggleFeatureGuide(option.value)}
                    style={styles.featureHelpButton}
                    testID={`featureTypeHelp_${option.value}`}
                  >
                    <Ionicons
                      name={expandedFeatureGuideType === option.value
                        ? 'close-circle-outline'
                        : 'help-circle-outline'}
                      size={22}
                      color="#475467"
                    />
                  </TouchableOpacity>
                </View>
                {expandedFeatureGuideType === option.value
                  && renderFeatureInvestigationGuide(option.value)}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      onRequestClose={onClose}
      animationType="fade"
      transparent
      visible={true}
    >
      <KakaoSatellitePicker
        drawingMode="featureBoundary"
        initialLocation={getFeatureBoundaryPickerInitialLocation(boundaryDraft)}
        javaScriptKey={mapJavaScriptKey}
        onClose={() => setIsFeatureBoundaryPickerOpen(false)}
        onPickBoundary={pickFeatureBoundary}
        visible={isFeatureBoundaryPickerOpen}
      />
      <Pressable
        onPress={onClose}
        style={styles.container}
        testID="documentAddModalBackdrop"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.cardShell}
        >
          <Card style={[
            styles.card,
            isChoosingFeatureType && styles.featureCreationCard,
          ]}>
          <TitleBar
            title={
              <>
                <CategoryIcon category={parentCategory} size={25} />
                <Heading style={styles.heading}>
                  {isChoosingFeatureType ? '유구 추가' : '기록 종류 선택'}
                </Heading>
              </>
            }
            left={
              <Button
                title={isChoosingFeatureType && !isFeatureOnlyFlow ? '뒤로' : '닫기'}
                variant="transparent"
                icon={<Ionicons
                  name={
                    isChoosingFeatureType && !isFeatureOnlyFlow
                      ? 'chevron-back-outline'
                      : 'close-outline'
                  }
                  size={16}
                />}
                onPress={isChoosingFeatureType ? leaveFeatureCreation : onClose}
              />
            }
          />
          <ScrollView
            style={[
              styles.categories,
              isChoosingFeatureType && styles.featureCreationCategories,
            ]}
            contentContainerStyle={
              isChoosingFeatureType ? styles.featureCreationContent : undefined
            }
          >
            {isChoosingFeatureType ? renderFeatureTypePicker() : (
              <>
                <View style={styles.parentPanel}>
                  <Text style={styles.parentLabel} numberOfLines={1}>
                    포함 위치: {parentDoc.resource.identifier}
                  </Text>
                  <Text style={styles.parentMeta}>
                    {parentCategoryLabel}에 포함할 기록을 고르세요.
                  </Text>
                  <Text style={styles.hierarchyHelp}>
                    {KOREAN_FIELDWORK_HIERARCHY_HELP}
                  </Text>
                </View>

                {hasPrimaryOptions && (
                  <View style={styles.optionSection}>
                    <Text style={styles.sectionTitle}>권장 기록</Text>
                    {optionGroups.primary.map(renderOption)}
                  </View>
                )}

                {hasSpecialOptions && (
                  <View style={styles.optionSection}>
                    <Text style={styles.sectionTitle}>특별한 경우</Text>
                    {optionGroups.special.map(renderOption)}
                  </View>
                )}

                {hasOtherOptions && (
                  <View style={styles.optionSection}>
                    <Text style={styles.sectionTitle}>그 밖의 기록</Text>
                    {optionGroups.other.map(renderOption)}
                  </View>
                )}

                {!hasPrimaryOptions && !hasSpecialOptions && !hasOtherOptions && (
                  <View style={styles.emptyState}>
                    <Ionicons name="information-circle-outline" size={24} color="#667085" />
                    <Text style={styles.emptyTitle}>
                      이어 만들 수 있는 기록이 없습니다
                    </Text>
                    <Text style={styles.emptyText}>
                      지금 조사 방식에 맞는 현재 범위를 먼저 선택해 주세요.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const compareKoreanFieldworkCategories = (
  categoryA: CategoryForm,
  categoryB: CategoryForm
): number => {
  const indexA = KOREAN_FIELDWORK_CATEGORY_ORDER.indexOf(categoryA.name);
  const indexB = KOREAN_FIELDWORK_CATEGORY_ORDER.indexOf(categoryB.name);
  const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
  const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

  return orderA === orderB
    ? categoryA.name.localeCompare(categoryB.name)
    : orderA - orderB;
};

const getFeatureLocationSketchDraftParams = ({
  center,
  isEdited,
  mapBoundary,
  points,
  rotation,
  scale,
  shape,
}: {
  center: FeatureSketchPoint;
  isEdited: boolean;
  mapBoundary?: KakaoSatellitePickedBoundary;
  points: FeatureSketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}): Record<string, string> => {
  if (mapBoundary && mapBoundary.coordinates.length >= 3) {
    const payload = {
      version: 2,
      source: 'mapBoundary',
      shape: 'polygon',
      center: mapBoundary.center,
      coordinates: mapBoundary.coordinates,
      mapTypeId: mapBoundary.mapTypeId,
    };
    const note = `지도에서 유구 경계점 ${mapBoundary.coordinates.length}개를 찍었습니다.`;

    return {
      featureGeometry: JSON.stringify(toGeoJsonPolygon(mapBoundary.coordinates)),
      featureGeometryRevisionNote: note,
      featureLocationSketch: JSON.stringify(payload),
      geometryConfidence: 'rough',
      geometrySource: 'drawnOnBoundaryMap',
      shortDescription: note,
    };
  }

  if (!isEdited) return {};

  const sketchPoints = shape === 'polygon'
    ? points
    : (points.length > 0 ? points : [center]);
  const payload = {
    version: 1,
    shape,
    center: roundSketchPoint(center),
    points: sketchPoints.map(roundSketchPoint),
    rotation,
    scale,
  };
  const note = getFeatureLocationSketchNote(payload);

  return {
    featureGeometryRevisionNote: note,
    featureLocationSketch: JSON.stringify(payload),
    shortDescription: note,
  };
};

const getFeatureLocationSketchNote = ({
  center,
  points,
  rotation,
  scale,
  shape,
}: {
  center: FeatureSketchPoint;
  points: FeatureSketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}): string => {
  if (shape === 'polygon') {
    return `위치 스케치: 점 연결 ${points.length}점, 마지막 ${formatSketchPoint(
      points[points.length - 1] ?? center
    )}`;
  }

  return `위치 스케치: ${getFeatureLocationSketchShapeLabel(shape)}, 중심 ${formatSketchPoint(
    center
  )}, 크기 ${scale}%, 회전 ${rotation}°`;
};

const getFeatureLocationSketchShapeLabel = (
  shape: FeatureLocationSketchShape
): string => {
  switch (shape) {
    case 'oval':
      return '타원';
    case 'polygon':
      return '점 연결';
    case 'rectangle':
      return '사각형';
    default:
      return '점';
  }
};

const createNextFeatureIdentifier = (
  featureType: string,
  existingDocuments: readonly Document[]
): string => {
  const prefix = getFeatureIdentifierPrefix(featureType);
  const nextNumber = getNextFeatureIdentifierNumber(
    featureType,
    prefix,
    existingDocuments
  );

  return `${nextNumber}호 ${prefix}`;
};

const getFeatureIdentifierPrefix = (featureType: string): string => {
  const prefix = getKoreanFieldworkFeatureTypeOption(featureType)
    ?.identifierPrefix
    ?.trim();

  return prefix || '유구';
};

const getNextFeatureIdentifierNumber = (
  featureType: string,
  prefix: string,
  existingDocuments: readonly Document[]
): number => {
  const maxNumber = existingDocuments
    .filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE)
    .reduce((maxIdentifierNumber, document) => {
      const identifier = document.resource.identifier ?? '';
      const identifierNumber = getFeatureIdentifierNumber(identifier, prefix);
      if (identifierNumber !== undefined) {
        return Math.max(maxIdentifierNumber, identifierNumber);
      }

      if (getDocumentFeatureType(document) !== featureType) {
        return maxIdentifierNumber;
      }

      return Math.max(
        maxIdentifierNumber,
        getFirstPositiveNumber(identifier) ?? 0
      );
    }, 0);

  return maxNumber + 1;
};

const getDocumentFeatureType = (document: Document): string => {
  const featureType = (document.resource as Record<string, unknown>).featureType;

  return typeof featureType === 'string' ? featureType : '';
};

const getFeatureIdentifierNumber = (
  identifier: string,
  prefix: string
): number | undefined => {
  const normalizedIdentifier = identifier.replace(/\s+/g, ' ').trim();
  if (!normalizedIdentifier) return undefined;

  const escapedPrefix = escapeRegExp(prefix);
  const patterns = [
    new RegExp(`(?:^|\\s)(\\d+)\\s*호\\s*${escapedPrefix}(?:\\s|$)`),
    new RegExp(`(?:^|\\s)${escapedPrefix}\\s*(\\d+)\\s*호?(?:\\s|$)`),
    new RegExp(`(?:^|\\s)${escapedPrefix}[-_\\s]*(\\d+)(?:\\s|$)`),
  ];

  for (const pattern of patterns) {
    const match = normalizedIdentifier.match(pattern);
    const number = match ? Number.parseInt(match[1], 10) : 0;
    if (number > 0) return number;
  }

  return normalizedIdentifier.includes(prefix)
    ? getFirstPositiveNumber(normalizedIdentifier)
    : undefined;
};

const getFirstPositiveNumber = (value: string): number | undefined => {
  const match = value.match(/\d+/);
  const number = match ? Number.parseInt(match[0], 10) : 0;

  return number > 0 ? number : undefined;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSketchPointFromPress = (
  event: GestureResponderEvent,
  canvasSize: { height: number; width: number }
): FeatureSketchPoint => {
  const width = Math.max(1, canvasSize.width);
  const height = Math.max(1, canvasSize.height);
  const locationX = Number.isFinite(event.nativeEvent.locationX)
    ? event.nativeEvent.locationX
    : (width / 2);
  const locationY = Number.isFinite(event.nativeEvent.locationY)
    ? event.nativeEvent.locationY
    : (height / 2);

  return {
    x: Math.round(clamp((locationX / width) * 100, 0, 100)),
    y: Math.round(clamp((locationY / height) * 100, 0, 100)),
  };
};

const getFeatureShapeGesture = (
  event: GestureResponderEvent,
  canvasSize: { height: number; width: number }
): {
  angle: number;
  center: FeatureSketchPoint;
  distance: number;
} | undefined => {
  const touches = getFeatureSketchTouches(event);
  if (touches.length < 2) return undefined;

  const [first, second] = touches;
  const centerPixel = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
  const distance = Math.sqrt(
    ((second.x - first.x) ** 2) + ((second.y - first.y) ** 2)
  );
  const angle = Math.atan2(second.y - first.y, second.x - first.x)
    * (180 / Math.PI);

  return {
    angle,
    center: getSketchPointFromPixel(centerPixel, canvasSize),
    distance,
  };
};

const getFeatureSketchTouches = (
  event: GestureResponderEvent
): FeatureSketchTouchPoint[] => {
  const touches = (event.nativeEvent as unknown as {
    touches?: Array<{ locationX?: number; locationY?: number }>;
  }).touches ?? [];

  return touches
    .map((touch) => ({
      x: Number(touch.locationX),
      y: Number(touch.locationY),
    }))
    .filter((touch) => Number.isFinite(touch.x) && Number.isFinite(touch.y));
};

const getSketchPointFromPixel = (
  point: FeatureSketchTouchPoint,
  canvasSize: { height: number; width: number }
): FeatureSketchPoint => {
  const width = Math.max(1, canvasSize.width);
  const height = Math.max(1, canvasSize.height);

  return {
    x: Math.round(clamp((point.x / width) * 100, 0, 100)),
    y: Math.round(clamp((point.y / height) * 100, 0, 100)),
  };
};

const normalizeRotation = (rotation: number): number => {
  if (rotation > 180) return normalizeRotation(rotation - 360);
  if (rotation < -180) return normalizeRotation(rotation + 360);
  return rotation;
};

const areSketchPointsEqual = (
  first?: FeatureSketchPoint,
  second?: FeatureSketchPoint
): boolean => first?.x === second?.x && first?.y === second?.y;

const getVisibleFeatureSketchPoints = (
  points: FeatureSketchPoint[],
  activePoint?: FeatureSketchPoint
): FeatureSketchPoint[] => (
  activePoint ? points.concat(activePoint) : points
);

const getFeatureSketchBoundaryPoints = (
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): FeatureSketchPoint[] => {
  if (!boundaryDraft || boundaryDraft.coordinates.length < 3) return [];

  const longitudes = boundaryDraft.coordinates.map((point) => point.longitude);
  const latitudes = boundaryDraft.coordinates.map((point) => point.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.000001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.000001);
  const padding = 14;
  const drawableSize = 100 - (padding * 2);

  return boundaryDraft.coordinates.map((point) => ({
    x: padding + (((point.longitude - minLongitude) / longitudeRange)
      * drawableSize),
    y: padding + (((maxLatitude - point.latitude) / latitudeRange)
      * drawableSize),
  }));
};

const getFeatureBoundaryPickerInitialLocation = (
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): KakaoSatellitePickedLocation | undefined => {
  if (boundaryDraft?.center) return boundaryDraft.center;
  if (!boundaryDraft || boundaryDraft.coordinates.length === 0) return undefined;

  const latitude = boundaryDraft.coordinates.reduce(
    (sum, point) => sum + point.latitude,
    0
  ) / boundaryDraft.coordinates.length;
  const longitude = boundaryDraft.coordinates.reduce(
    (sum, point) => sum + point.longitude,
    0
  ) / boundaryDraft.coordinates.length;

  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : undefined;
};

const getFeatureSketchPointsFromBoundary = (
  featureBoundary: KakaoSatellitePickedBoundary,
  projectBoundary?: KoreanFieldworkProjectBoundaryDraft
): FeatureSketchPoint[] => {
  const referenceCoordinates =
    projectBoundary && projectBoundary.coordinates.length >= 3
      ? projectBoundary.coordinates
      : featureBoundary.coordinates;

  return normalizeLocationsToSketchPoints(
    featureBoundary.coordinates,
    referenceCoordinates
  );
};

const getFeatureSketchCenterFromBoundary = (
  featureBoundary: KakaoSatellitePickedBoundary
): FeatureSketchPoint => {
  const points = normalizeLocationsToSketchPoints(
    featureBoundary.center ? [featureBoundary.center] : featureBoundary.coordinates,
    featureBoundary.coordinates
  );

  return points[0] ?? { x: 50, y: 50 };
};

const normalizeLocationsToSketchPoints = (
  locations: readonly KakaoSatellitePickedLocation[],
  referenceLocations: readonly KakaoSatellitePickedLocation[]
): FeatureSketchPoint[] => {
  if (locations.length === 0 || referenceLocations.length === 0) return [];

  const longitudes = referenceLocations.map((point) => point.longitude);
  const latitudes = referenceLocations.map((point) => point.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.000001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.000001);
  const padding = 14;
  const drawableSize = 100 - (padding * 2);

  return locations.map((point) => ({
    x: Math.round(clamp(
      padding + (((point.longitude - minLongitude) / longitudeRange) * drawableSize),
      0,
      100
    )),
    y: Math.round(clamp(
      padding + (((maxLatitude - point.latitude) / latitudeRange) * drawableSize),
      0,
      100
    )),
  }));
};

const toGeoJsonPolygon = (
  coordinates: readonly KakaoSatellitePickedLocation[]
): Record<string, unknown> => {
  const ring = coordinates.map((point) => [
    point.longitude,
    point.latitude,
  ]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closedRing = first && last
    && (first[0] !== last[0] || first[1] !== last[1])
      ? [...ring, first]
      : ring;

  return {
    type: 'Polygon',
    coordinates: [closedRing],
  };
};

const denormalizeFeatureSketchPoint = (
  point: FeatureSketchPoint,
  canvasSize: { height: number; width: number }
): FeatureSketchPixelPoint => ({
  x: (point.x / 100) * canvasSize.width,
  y: (point.y / 100) * canvasSize.height,
});

const toFeatureSketchLineSegments = ({
  canvasSize,
  closePath,
  color,
  keyPrefix,
  points,
  testID,
  width,
}: {
  canvasSize: { height: number; width: number };
  closePath: boolean;
  color: string;
  keyPrefix: string;
  points: FeatureSketchPoint[];
  testID: string;
  width: number;
}) => {
  if (points.length < 2) return [];

  const segmentStartPoints = closePath ? points : points.slice(0, -1);

  return segmentStartPoints.map((point, index) => (
    <FeatureSketchLineSegment
      color={color}
      end={denormalizeFeatureSketchPoint(
        points[(index + 1) % points.length],
        canvasSize
      )}
      key={`${keyPrefix}-${index}`}
      start={denormalizeFeatureSketchPoint(point, canvasSize)}
      testID={testID}
      width={width}
    />
  ));
};

const FeatureSketchLineSegment: React.FC<{
  color: string;
  end: FeatureSketchPixelPoint;
  start: FeatureSketchPixelPoint;
  testID: string;
  width: number;
}> = ({ color, end, start, testID, width }) => {
  const distance = Math.sqrt(((end.x - start.x) ** 2) + ((end.y - start.y) ** 2));
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: color,
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

const getFeatureSketchPointStyle = (point: FeatureSketchPoint) => ({
  left: toPercent(point.x),
  top: toPercent(point.y),
});

const getFeatureSketchShapeStyle = (
  center: FeatureSketchPoint,
  scale: number,
  rotation: number
) => ({
  left: toPercent(center.x),
  top: toPercent(center.y),
  transform: [
    { scale: scale / 100 },
    { rotate: `${rotation}deg` },
  ],
});

const isFeatureShapeTransformVisible = (
  shape: FeatureLocationSketchShape
): boolean => shape === 'rectangle' || shape === 'oval';

const roundSketchPoint = (point: FeatureSketchPoint): FeatureSketchPoint => ({
  x: Math.round(point.x),
  y: Math.round(point.y),
});

const formatSketchPoint = (point: FeatureSketchPoint): string =>
  `${Math.round(point.x)}%, ${Math.round(point.y)}%`;

const toPercent = (value: number): DimensionValue =>
  `${value}%` as DimensionValue;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
  },
  card: {
    maxHeight: '84%',
    padding: 10,
    width: '72%',
  },
  featureCreationCard: {
    borderRadius: 0,
    height: '100%',
    maxHeight: '100%',
    padding: 0,
    width: '100%',
  },
  cardShell: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  heading: {
    marginLeft: 10,
  },
  categories: {
    margin: 10,
  },
  featureCreationCategories: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  featureCreationContent: {
    flexGrow: 1,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  featureCreationLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  featureCreationLayoutWide: {
    alignItems: 'stretch',
    flex: 1,
    flexDirection: 'column',
  },
  featureCreationMapPane: {
    flex: 1,
    minWidth: 0,
  },
  featureCreationMapPaneWide: {
    flex: 1,
    marginRight: 0,
    minHeight: 0,
    minWidth: 0,
  },
  featureCreationFormPane: {
    minWidth: 0,
  },
  featureCreationFormPaneWide: {
    backgroundColor: '#ffffff',
    borderTopColor: '#d0d5dd',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 352,
    minHeight: 252,
    maxWidth: '100%',
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    width: '100%',
  },
  parentPanel: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  parentLabel: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '800',
  },
  parentMeta: {
    color: '#526272',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  hierarchyHelp: {
    color: '#2f6f4e',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  featureNamePanel: {
    backgroundColor: 'white',
    borderColor: '#b9c7d5',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  featureNamePanelWide: {
    flexBasis: 258,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 0,
    marginRight: 8,
  },
  featureCreationParentPanelWide: {
    flexBasis: 238,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 0,
    marginRight: 8,
  },
  featureNameHint: {
    color: '#526272',
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: 5,
    marginTop: 2,
  },
  featureLocationPanel: {
    backgroundColor: '#f8faf7',
    borderColor: '#b8c4d0',
    borderRadius: 0,
    borderWidth: 0,
    flex: 1,
    marginBottom: 0,
    overflow: 'hidden',
  },
  featureLocationPanelWide: {
    minHeight: 440,
  },
  featureLocationHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 5,
  },
  featureLocationHeaderCopy: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: 360,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  featureLocationTitle: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '900',
  },
  featureLocationDetail: {
    color: '#526272',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  featureSketchIconButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    marginLeft: 8,
    width: 30,
  },
  featureSketchModeRow: {
    alignItems: 'flex-start',
    bottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    left: 12,
    position: 'absolute',
    right: 66,
    zIndex: 4,
  },
  featureSketchModeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#98a2b3',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 5,
    marginBottom: 5,
    minHeight: 32,
    minWidth: 84,
    paddingHorizontal: 8,
  },
  featureSketchModeButtonSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  featureSketchModeText: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  featureSketchModeTextSelected: {
    color: '#c2410c',
  },
  featureSketchCanvas: {
    backgroundColor: '#f8faf7',
    borderColor: '#8294a9',
    borderRadius: 0,
    borderWidth: 0,
    height: 520,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  featureSketchMapSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8faf7',
  },
  featureSketchTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  featureSketchSatelliteField: {
    borderColor: 'rgba(52, 64, 84, 0.11)',
    borderWidth: 1,
    position: 'absolute',
  },
  featureSketchSatelliteFieldA: {
    backgroundColor: '#dde9d3',
    bottom: '50%',
    left: 0,
    right: '46%',
    top: 0,
  },
  featureSketchSatelliteFieldB: {
    backgroundColor: '#eee1c3',
    bottom: 0,
    left: 0,
    right: '56%',
    top: '50%',
  },
  featureSketchSatelliteFieldC: {
    backgroundColor: '#d5e2dc',
    bottom: 0,
    left: '44%',
    right: 0,
    top: '34%',
  },
  featureSketchSatelliteRoad: {
    backgroundColor: 'rgba(244, 247, 240, 0.9)',
    borderColor: 'rgba(52, 64, 84, 0.16)',
    borderWidth: 1,
    position: 'absolute',
  },
  featureSketchSatelliteRoadA: {
    bottom: '48%',
    height: 14,
    left: 0,
    right: 0,
  },
  featureSketchSatelliteRoadB: {
    bottom: 0,
    left: '42%',
    top: 0,
    width: 14,
  },
  featureSketchSatelliteTreeLine: {
    backgroundColor: 'rgba(91, 141, 98, 0.28)',
    position: 'absolute',
  },
  featureSketchSatelliteTreeLineA: {
    bottom: '48%',
    height: 18,
    left: 0,
    right: 0,
  },
  featureSketchSatelliteWater: {
    backgroundColor: 'rgba(143, 193, 216, 0.36)',
    borderColor: 'rgba(52, 64, 84, 0.12)',
    borderWidth: 1,
    position: 'absolute',
  },
  featureSketchSatelliteWaterA: {
    bottom: '18%',
    height: '16%',
    right: 0,
    width: '22%',
  },
  featureSketchGridLine: {
    backgroundColor: 'rgba(52, 64, 84, 0.1)',
    position: 'absolute',
  },
  featureSketchGridLineVertical: {
    bottom: 0,
    top: 0,
    width: 1,
  },
  featureSketchGridLineHorizontal: {
    height: 1,
    left: 0,
    right: 0,
  },
  featureSketchPlaneBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    right: 50,
    top: 12,
    zIndex: 2,
  },
  featureSketchPlaneBadgeText: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  featureSketchMapActionPanel: {
    alignItems: 'flex-start',
    left: 12,
    maxWidth: 360,
    position: 'absolute',
    top: 78,
    zIndex: 5,
  },
  featureSketchMapActionButton: {
    alignItems: 'center',
    backgroundColor: '#175cd3',
    borderColor: '#1849a9',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  featureSketchMapActionHint: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#b2ddff',
    borderRadius: 4,
    borderWidth: 1,
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  featureSketchMapActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  featureSketchBoundaryFallback: {
    alignItems: 'center',
    borderColor: 'rgba(71, 84, 103, 0.45)',
    borderRadius: 6,
    borderStyle: 'dashed',
    borderWidth: 2,
    bottom: 18,
    justifyContent: 'center',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 18,
  },
  featureSketchBoundaryFallbackText: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '800',
  },
  featureSketchBoundaryLabel: {
    backgroundColor: 'rgba(239, 248, 255, 0.92)',
    borderColor: '#b2ddff',
    borderRadius: 4,
    borderWidth: 1,
    color: '#175cd3',
    fontSize: 10,
    fontWeight: '900',
    left: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    top: 42,
  },
  featureSketchBoundaryPoint: {
    backgroundColor: '#175cd3',
    borderColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    position: 'absolute',
    width: 8,
  },
  featureSketchPoint: {
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -10,
    position: 'absolute',
    width: 20,
  },
  featureSketchPointActive: {
    backgroundColor: '#c2410c',
  },
  featureSketchPointText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
  featureSketchShapePreview: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderColor: '#f97316',
    borderRadius: 5,
    borderWidth: 2,
    height: 64,
    justifyContent: 'center',
    marginLeft: -50,
    marginTop: -32,
    position: 'absolute',
    width: 100,
  },
  featureSketchOvalPreview: {
    borderRadius: 32,
  },
  featureSketchShapeCenter: {
    backgroundColor: '#c2410c',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  featureSketchToolbar: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    position: 'absolute',
    right: 12,
    top: 70,
    zIndex: 3,
  },
  featureSketchToolButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#98a2b3',
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginBottom: 7,
    width: 38,
  },
  optionSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 10,
  },
  optionLabel: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '900',
  },
  optionDescription: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  featureTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureTypeGridWide: {
    alignContent: 'flex-start',
    flex: 1,
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  featureTypeOption: {
    alignItems: 'stretch',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 76,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: '49%',
  },
  featureTypeOptionWide: {
    marginRight: 8,
    minHeight: 68,
    width: 178,
  },
  startUnknownFeature: {
    alignItems: 'stretch',
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  startUnknownFeatureWide: {
    flexBasis: 236,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 0,
    marginRight: 8,
  },
  featureTypeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  featureTypeCreateArea: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  featureTypeText: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  featureTypeLabel: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '900',
  },
  featureTypeDescription: {
    color: '#667085',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  featureHelpButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginLeft: 8,
    width: 34,
  },
  featureGuide: {
    borderTopColor: '#eaecf0',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 7,
  },
  featureGuideTitle: {
    color: '#475467',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 3,
  },
  featureGuideNote: {
    color: '#667085',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 3,
  },
  featureGuideSteps: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  emptyState: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyTitle: {
    color: '#27343b',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default DocumentAddModal;
