import { Ionicons } from '@expo/vector-icons';
import {
  CategoryForm,
  Document,
  getKoreanFieldworkFeatureMeasurementGroups,
  NewResource,
  Tree,
} from 'idai-field-core';
import * as Location from 'expo-location';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  Image,
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
  FEATURE_SKETCH_SATELLITE_ATTRIBUTION,
  getFeatureSketchSatelliteTiles,
} from './feature-sketch-satellite';
import {
  getKoreanFieldworkFeatureInvestigationSteps,
  getKoreanFieldworkFeatureTypeOption,
  KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS,
} from './korean-fieldwork-feature-types';
import KoreanFieldworkFeatureMeasurementFields
  from './KoreanFieldworkFeatureMeasurementFields';
import { serializeKoreanFieldworkFeatureMeasurements }
  from './korean-fieldwork-feature-measurement-draft';
import type {
  KoreanFieldworkBoundaryLocation,
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
const FEATURE_SKETCH_BOUNDARY_PADDING = 14;
const FEATURE_SKETCH_SHAPE_BASE_WIDTH = 18;
const FEATURE_SKETCH_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SKETCH_SHAPE_MIN_SCALE = 8;
const FEATURE_SKETCH_SHAPE_MAX_SCALE = 240;
const FEATURE_SKETCH_OVAL_SEGMENTS = 16;
const FEATURE_SKETCH_MAX_POLYGON_POINTS = 64;
const FEATURE_SKETCH_CLOSE_POINT_DISTANCE = 4.5;
const FEATURE_SKETCH_INSERT_POINT_DISTANCE = 3.5;
const FEATURE_SKETCH_VIEWPORT_MIN_SCALE = 1;
const FEATURE_SKETCH_VIEWPORT_MAX_SCALE = 4;
const FEATURE_SKETCH_VIEWPORT_BASE_PAN_RATIO = 0.22;
const FEATURE_SKETCH_VIEWPORT_DEFAULT = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
const FEATURE_SKETCH_PREVIEW_POINT_MOVE_THRESHOLD = 0.45;
const FEATURE_SKETCH_VIEWPORT_OFFSET_THRESHOLD = 0.5;
const FEATURE_SKETCH_VIEWPORT_SCALE_THRESHOLD = 0.01;
const FEATURE_LOCATION_SKETCH_SHAPES = [
  { id: 'point', label: '점', icon: 'location-outline' },
  { id: 'polygon', label: '점 연결', icon: 'git-merge-outline' },
  { id: 'rectangle', label: '사각형', icon: 'square-outline' },
  { id: 'circle', label: '원', icon: 'ellipse-outline' },
  { id: 'oval', label: '타원', icon: 'ellipse-outline' },
] as const;
const FEATURE_SKETCH_BACKGROUND_OPTIONS = [
  { id: 'white', label: '흰 배경', icon: 'scan-outline' },
  { id: 'satellite', label: '위성', icon: 'map-outline' },
] as const;
type FeatureLocationSketchShape =
  typeof FEATURE_LOCATION_SKETCH_SHAPES[number]['id'];
type FeatureSketchBackground =
  typeof FEATURE_SKETCH_BACKGROUND_OPTIONS[number]['id'];
type FeatureSketchTool = 'inspect' | FeatureLocationSketchShape;
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
type FeatureSketchViewport = {
  offsetX: number;
  offsetY: number;
  scale: number;
};
type FeatureShapeGestureState = {
  angle: number;
  distance: number;
  rotation: number;
  scale: number;
};
type FeatureSketchViewportGestureState = {
  center: FeatureSketchTouchPoint;
  distance: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};
type FeatureSketchPanGestureState = {
  offsetX: number;
  offsetY: number;
  start: FeatureSketchTouchPoint;
};
type FeatureLiveLocation = KoreanFieldworkBoundaryLocation & {
  accuracy?: number;
};
type FeatureLiveLocationStatus =
  'idle' | 'checking' | 'tracking' | 'denied' | 'unavailable';

interface AddModalProps {
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  existingDocuments?: readonly Document[];
  initialCategoryName?: string;
  initialDraftParams?: Record<string, string>;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
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
  onAddCategory,
  onClose,
  parentDoc,
}) => {
  const config = useContext(ConfigurationContext);
  const { labels } = useContext(LabelsContext);
  const [expandedFeatureGuideType, setExpandedFeatureGuideType] = useState<string>();
  const [selectedFeatureType, setSelectedFeatureType] = useState<string>('unknown');
  const [featureIdentifier, setFeatureIdentifier] = useState('');
  const [featureMeasurementValues, setFeatureMeasurementValues] =
    useState<Record<string, unknown>>({});
  const isFeatureOnlyFlow =
    initialCategoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE;
  const [isChoosingFeatureType, setIsChoosingFeatureType] =
    useState(isFeatureOnlyFlow);
  const featureCreationScrollY = useRef(new Animated.Value(0)).current;
  const featureCreationScrollerRef = useRef<ScrollView>(null);
  const [featureCreationViewportHeight, setFeatureCreationViewportHeight] = useState(0);
  const [featureCreationContentHeight, setFeatureCreationContentHeight] = useState(0);
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
  const featureMapTranslateY = featureCreationScrollY.interpolate({
    extrapolate: 'clamp',
    inputRange: [0, featureSketchCanvasHeight],
    outputRange: [0, -featureSketchCanvasHeight],
  });
  const featureCreationScrollTrackHeight = Math.max(
    0,
    featureCreationViewportHeight - 20
  );
  const featureCreationMaxScroll = Math.max(
    0,
    featureCreationContentHeight - featureCreationViewportHeight
  );
  const featureCreationScrollThumbHeight = featureCreationScrollTrackHeight > 0
    ? Math.min(
      featureCreationScrollTrackHeight,
      Math.max(
        56,
        featureCreationScrollTrackHeight
          * (featureCreationViewportHeight / Math.max(featureCreationContentHeight, 1))
      )
    )
    : 0;
  const featureCreationScrollThumbTravel = Math.max(
    0,
    featureCreationScrollTrackHeight - featureCreationScrollThumbHeight
  );
  const featureCreationScrollThumbY = featureCreationScrollY.interpolate({
    extrapolate: 'clamp',
    inputRange: [0, Math.max(1, featureCreationMaxScroll)],
    outputRange: [0, featureCreationScrollThumbTravel],
  });
  const [featureLocationShape, setFeatureLocationShape] =
    useState<FeatureLocationSketchShape>('polygon');
  const [featureSketchActiveTool, setFeatureSketchActiveTool] =
    useState<FeatureSketchTool>('inspect');
  const [featureSketchPoints, setFeatureSketchPoints] = useState<FeatureSketchPoint[]>([]);
  const [activeFeatureSketchPoint, setActiveFeatureSketchPoint] =
    useState<FeatureSketchPoint>();
  const [featureSketchPolygonClosed, setFeatureSketchPolygonClosed] = useState(false);
  const [featureSketchCenter, setFeatureSketchCenter] =
    useState<FeatureSketchPoint>({ x: 50, y: 50 });
  const [featureSketchScale, setFeatureSketchScale] = useState(100);
  const [featureSketchRotation, setFeatureSketchRotation] = useState(0);
  const [featureSketchWasEdited, setFeatureSketchWasEdited] = useState(false);
  const [featureSketchCanvasSize, setFeatureSketchCanvasSize] =
    useState(FEATURE_SKETCH_CANVAS_DEFAULT_SIZE);
  const [featureSketchBackground, setFeatureSketchBackground] =
    useState<FeatureSketchBackground>('white');
  const [featureSketchSatelliteStatus, setFeatureSketchSatelliteStatus] =
    useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [featureLiveLocation, setFeatureLiveLocation] =
    useState<FeatureLiveLocation>();
  const [featureLiveLocationStatus, setFeatureLiveLocationStatus] =
    useState<FeatureLiveLocationStatus>('idle');
  const [featureSketchViewport, setFeatureSketchViewport] =
    useState<FeatureSketchViewport>(FEATURE_SKETCH_VIEWPORT_DEFAULT);
  const lastPreviewFeatureSketchPointRef = useRef<FeatureSketchPoint>();
  const draggedFeatureSketchPointIndexRef = useRef<number>();
  const featureShapeGestureRef = useRef<FeatureShapeGestureState>();
  const featureViewportGestureRef = useRef<FeatureSketchViewportGestureState>();
  const featureViewportPanRef = useRef<FeatureSketchPanGestureState>();

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
  const featureSketchSatelliteTiles = useMemo(
    () => getFeatureSketchSatelliteTiles(boundaryDraft, featureLiveLocation),
    [boundaryDraft, featureLiveLocation]
  );
  const featureLiveLocationPoint = useMemo(
    () => getFeatureSketchPointFromLocation(featureLiveLocation, boundaryDraft),
    [boundaryDraft, featureLiveLocation]
  );
  const handleFeatureCreationScrollerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setFeatureCreationViewportHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight);
    },
    []
  );
  const handleFeatureCreationContentSizeChange = useCallback(
    (_width: number, height: number) => {
      setFeatureCreationContentHeight((currentHeight) =>
        currentHeight === height ? currentHeight : height);
    },
    []
  );
  const scrollFeatureCreationFromRail = useCallback(
    (event: GestureResponderEvent) => {
      if (
        featureCreationMaxScroll <= 0
        || featureCreationScrollThumbTravel <= 0
      ) {
        return;
      }

      const thumbTop = clamp(
        event.nativeEvent.locationY - (featureCreationScrollThumbHeight / 2),
        0,
        featureCreationScrollThumbTravel
      );
      featureCreationScrollerRef.current?.scrollTo({
        animated: false,
        y: featureCreationMaxScroll
          * (thumbTop / featureCreationScrollThumbTravel),
      });
    },
    [
      featureCreationMaxScroll,
      featureCreationScrollThumbHeight,
      featureCreationScrollThumbTravel,
    ]
  );

  const optionGroups = useMemo(
    () => getKoreanFieldworkAddOptions(
      parentDoc?.resource.category ?? '',
      allowedCategories.map((category) => category.name),
      investigationModeId
    ),
    [allowedCategories, investigationModeId, parentDoc]
  );

  useEffect(() => {
    if (!isChoosingFeatureType) return;

    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | undefined;

    const updateLiveLocation = (coords: Location.LocationObjectCoords) => {
      const nextLocation = getFeatureLiveLocationFromCoords(coords);
      if (!nextLocation) {
        setFeatureLiveLocationStatus('unavailable');
        return;
      }

      setFeatureLiveLocation(nextLocation);
      setFeatureLiveLocationStatus('tracking');
    };

    const startLocationWatch = async () => {
      setFeatureLiveLocationStatus('checking');

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

        if (status !== 'granted') {
          setFeatureLiveLocationStatus('denied');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isMounted) return;

        updateLiveLocation(currentLocation.coords);

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 2,
            timeInterval: 3000,
          },
          (nextLocation) => {
            if (isMounted) updateLiveLocation(nextLocation.coords);
          }
        );
        if (!isMounted) {
          subscription.remove();
          return;
        }
        locationSubscription = subscription;
      } catch (error) {
        console.warn('Unable to watch feature sketch location', error);
        if (isMounted) setFeatureLiveLocationStatus('unavailable');
      }
    };

    void startLocationWatch();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [isChoosingFeatureType]);

  if (!parentDoc) return null;
  const parentCategory = config.getCategory(parentDoc.resource.category);
  if (!parentCategory) return null;
  const hasPrimaryOptions = optionGroups.primary.length > 0;
  const hasSpecialOptions = optionGroups.special.length > 0;
  const hasOtherOptions = optionGroups.other.length > 0;
  const parentCategoryLabel = labels?.get(parentCategory)
    ?? getKoreanFieldworkCategoryLabel(parentCategory.name);
  const normalizedFeatureIdentifier = featureIdentifier.trim();
  const selectedFeatureTypeLabel = selectedFeatureType === 'unknown'
    ? '성격 미정 유구'
    : getKoreanFieldworkFeatureTypeOption(selectedFeatureType ?? '')?.label;

  const createFeature = (featureType = selectedFeatureType) => {
    if (!featureType) return;

    const resolvedFeatureIdentifier = normalizedFeatureIdentifier
      || createNextFeatureIdentifier(featureType, existingDocuments);
    const featureMeasurementResource = createFeatureMeasurementResource(
      featureType,
      resolvedFeatureIdentifier,
      featureMeasurementValues
    );
    const featureMeasurements = serializeKoreanFieldworkFeatureMeasurements(
      featureMeasurementResource
    );

    onAddCategory(
      KOREAN_FIELDWORK_CATEGORIES.FEATURE,
      parentDoc,
      {
        ...initialDraftParams,
        featureType,
        ...(featureMeasurements ? { featureMeasurements } : {}),
        identifier: resolvedFeatureIdentifier,
        ...getFeatureLocationSketchDraftParams({
          background: featureSketchBackground,
          boundaryDraft,
          center: featureSketchCenter,
          isEdited: featureSketchWasEdited,
          isPolygonClosed: featureSketchPolygonClosed,
          points: featureSketchPoints,
          rotation: featureSketchRotation,
          scale: featureSketchScale,
          shape: featureLocationShape,
        }),
      }
    );
  };

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
    setFeatureSketchActiveTool('inspect');
    setActiveFeatureSketchPoint(undefined);
    setFeatureSketchPoints([]);
    setFeatureSketchPolygonClosed(false);
    setFeatureSketchCenter({ x: 50, y: 50 });
    setFeatureSketchScale(100);
    setFeatureSketchRotation(0);
    setFeatureSketchWasEdited(false);
    setFeatureSketchBackground('white');
    setFeatureSketchViewport(FEATURE_SKETCH_VIEWPORT_DEFAULT);
    draggedFeatureSketchPointIndexRef.current = undefined;
    featureShapeGestureRef.current = undefined;
    featureViewportGestureRef.current = undefined;
    featureViewportPanRef.current = undefined;
  };

  const openFeatureCreation = () => {
    setExpandedFeatureGuideType(undefined);
    setSelectedFeatureType('unknown');
    setFeatureIdentifier('');
    setFeatureMeasurementValues({});
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

  const enterFeatureSketchInspectMode = () => {
    setFeatureSketchActiveTool('inspect');
    setActiveFeatureSketchPoint(undefined);
    lastPreviewFeatureSketchPointRef.current = undefined;
    draggedFeatureSketchPointIndexRef.current = undefined;
    featureShapeGestureRef.current = undefined;
    featureViewportGestureRef.current = undefined;
    featureViewportPanRef.current = undefined;
  };

  const selectFeatureLocationShape = (shape: FeatureLocationSketchShape) => {
    if (featureSketchActiveTool === shape) {
      enterFeatureSketchInspectMode();
      return;
    }

    setFeatureLocationShape(shape);
    setFeatureSketchActiveTool(shape);
    setActiveFeatureSketchPoint(undefined);
    lastPreviewFeatureSketchPointRef.current = undefined;
    draggedFeatureSketchPointIndexRef.current = undefined;
    featureShapeGestureRef.current = undefined;
    featureViewportGestureRef.current = undefined;
    featureViewportPanRef.current = undefined;
    if (shape !== 'polygon' && featureSketchPoints.length > 1) {
      setFeatureSketchPoints([featureSketchCenter]);
      setFeatureSketchPolygonClosed(false);
    }
  };

  const handleFeatureSketchLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) {
      setFeatureSketchCanvasSize((currentSize) => {
        if (currentSize.height === height && currentSize.width === width) {
          return currentSize;
        }

        return { height, width };
      });
    }
  };

  const previewFeatureSketchPoint = (event: GestureResponderEvent) => {
    if (featureSketchActiveTool === 'inspect') {
      updateFeatureSketchViewport(event);
      return;
    }

    const touches = getFeatureSketchTouches(event);
    const shapeGesture = getFeatureShapeGesture(
      event,
      featureSketchCanvasSize,
      featureSketchViewport
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
        FEATURE_SKETCH_SHAPE_MIN_SCALE,
        FEATURE_SKETCH_SHAPE_MAX_SCALE
      );
      const nextRotation = normalizeRotation(
        initialGesture.rotation + shapeGesture.angle - initialGesture.angle
      );
      const roundedScale = Math.round(nextScale);
      const roundedRotation = Math.round(nextRotation);

      if (
        areFeatureSketchPointsNear(
          shapeGesture.center,
          featureSketchCenter,
          FEATURE_SKETCH_PREVIEW_POINT_MOVE_THRESHOLD
        )
        && roundedScale === featureSketchScale
        && roundedRotation === featureSketchRotation
      ) {
        return;
      }

      setFeatureSketchWasEdited(true);
      draggedFeatureSketchPointIndexRef.current = undefined;
      setActiveFeatureSketchPoint(undefined);
      setFeatureSketchCenter(shapeGesture.center);
      setFeatureSketchPoints([shapeGesture.center]);
      setFeatureSketchScale(roundedScale);
      setFeatureSketchRotation(roundedRotation);
      return;
    }

    if (touches.length > 1) {
      draggedFeatureSketchPointIndexRef.current = undefined;
      updateFeatureSketchViewport(event);
      return;
    }

    featureShapeGestureRef.current = undefined;
    featureViewportGestureRef.current = undefined;
    featureViewportPanRef.current = undefined;
    const point = getSketchPointFromPress(
      event,
      featureSketchCanvasSize,
      featureSketchViewport
    );
    if (!point) return;

    if (featureLocationShape === 'polygon') {
      const draggedPointIndex = draggedFeatureSketchPointIndexRef.current
        ?? getFeatureSketchPointHitIndex(point, featureSketchPoints);
      if (draggedPointIndex !== undefined) {
        draggedFeatureSketchPointIndexRef.current = draggedPointIndex;
        lastPreviewFeatureSketchPointRef.current = point;
        setFeatureSketchWasEdited(true);
        setActiveFeatureSketchPoint(point);
        moveFeatureSketchPoint(draggedPointIndex, point);
        return;
      }
    }

    if (!shouldUpdateFeatureSketchPreviewPoint(
      point,
      lastPreviewFeatureSketchPointRef.current
    )) {
      return;
    }

    lastPreviewFeatureSketchPointRef.current = point;
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(point);

    if (featureLocationShape !== 'polygon') {
      setFeatureSketchCenter(point);
      setFeatureSketchPoints([point]);
      setFeatureSketchPolygonClosed(false);
    }
  };

  const commitFeatureSketchPoint = (event: GestureResponderEvent) => {
    if (featureSketchActiveTool === 'inspect') {
      cancelFeatureSketchPoint();
      return;
    }

    if (featureViewportGestureRef.current) {
      cancelFeatureSketchPoint();
      return;
    }

    if (featureShapeGestureRef.current) {
      featureShapeGestureRef.current = undefined;
      return;
    }

    if (draggedFeatureSketchPointIndexRef.current !== undefined) {
      const point = getSketchPointFromPress(
        event,
        featureSketchCanvasSize,
        featureSketchViewport
      ) ?? activeFeatureSketchPoint;
      if (point) {
        moveFeatureSketchPoint(draggedFeatureSketchPointIndexRef.current, point);
      }
      draggedFeatureSketchPointIndexRef.current = undefined;
      lastPreviewFeatureSketchPointRef.current = undefined;
      setActiveFeatureSketchPoint(undefined);
      return;
    }

    const point = getSketchPointFromPress(
      event,
      featureSketchCanvasSize,
      featureSketchViewport
    ) ?? activeFeatureSketchPoint;
    if (!point) {
      cancelFeatureSketchPoint();
      return;
    }

    lastPreviewFeatureSketchPointRef.current = undefined;
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(undefined);

    if (featureLocationShape === 'polygon') {
      const nextPolygonState = getNextFeatureSketchPolygonState({
        isClosed: featureSketchPolygonClosed,
        point,
        points: featureSketchPoints,
      });

      setFeatureSketchPoints(nextPolygonState.points);
      setFeatureSketchPolygonClosed(nextPolygonState.isClosed);
      setFeatureSketchCenter(nextPolygonState.center);
      return;
    }

    setFeatureSketchCenter(point);
    setFeatureSketchPoints([point]);
    setFeatureSketchPolygonClosed(false);
  };

  const moveFeatureSketchPoint = (
    pointIndex: number,
    point: FeatureSketchPoint
  ) => {
    setFeatureSketchWasEdited(true);
    setFeatureSketchCenter(point);
    setFeatureSketchPoints((points) => {
      if (!points[pointIndex]) return points;

      const nextPoints = points.slice();
      nextPoints[pointIndex] = point;
      return nextPoints;
    });
    setFeatureSketchPolygonClosed(featureSketchPoints.length >= 3);
  };

  const insertFeatureSketchPointAtSegment = (segmentIndex: number) => {
    if (
      featureLocationShape !== 'polygon'
      || featureSketchPoints.length >= FEATURE_SKETCH_MAX_POLYGON_POINTS
    ) {
      return;
    }

    const midpoint = getFeatureSketchSegmentMidpoints(
      featureSketchPoints,
      featureSketchPolygonClosed
    )[segmentIndex];
    if (!midpoint) return;

    const insertionIndex = getFeatureSketchMidpointInsertionIndex(
      segmentIndex,
      featureSketchPoints.length
    );
    const nextPoints = featureSketchPoints.slice();
    nextPoints.splice(insertionIndex, 0, midpoint);

    lastPreviewFeatureSketchPointRef.current = undefined;
    setActiveFeatureSketchPoint(undefined);
    setFeatureSketchWasEdited(true);
    setFeatureSketchCenter(midpoint);
    setFeatureSketchPoints(nextPoints);
    setFeatureSketchPolygonClosed(nextPoints.length >= 3);
  };

  const cancelFeatureSketchPoint = () => {
    lastPreviewFeatureSketchPointRef.current = undefined;
    draggedFeatureSketchPointIndexRef.current = undefined;
    featureShapeGestureRef.current = undefined;
    featureViewportGestureRef.current = undefined;
    featureViewportPanRef.current = undefined;
    setActiveFeatureSketchPoint(undefined);
  };

  const updateFeatureSketchViewport = (event: GestureResponderEvent) => {
    const gesture = getFeatureSketchPixelGesture(event);
    if (gesture) {
      const initialGesture = featureViewportGestureRef.current ?? {
        center: gesture.center,
        distance: Math.max(1, gesture.distance),
        offsetX: featureSketchViewport.offsetX,
        offsetY: featureSketchViewport.offsetY,
        scale: featureSketchViewport.scale,
      };
      featureViewportGestureRef.current = initialGesture;
      featureViewportPanRef.current = undefined;

      const nextScale = clamp(
        initialGesture.scale
          * (gesture.distance / Math.max(1, initialGesture.distance)),
        FEATURE_SKETCH_VIEWPORT_MIN_SCALE,
        FEATURE_SKETCH_VIEWPORT_MAX_SCALE
      );

      const nextViewport = clampFeatureSketchViewport(
        getFeatureSketchViewportFromGesture({
          canvasSize: featureSketchCanvasSize,
          currentCenter: gesture.center,
          initialCenter: initialGesture.center,
          initialViewport: {
            offsetX: initialGesture.offsetX,
            offsetY: initialGesture.offsetY,
            scale: initialGesture.scale,
          },
          nextScale,
        }),
        featureSketchCanvasSize
      );
      if (areFeatureSketchViewportsSimilar(nextViewport, featureSketchViewport)) {
        return;
      }

      setFeatureSketchViewport(nextViewport);
      return;
    }

    if (featureViewportGestureRef.current) return;

    const point = getFeatureSketchPressPixel(event, featureSketchCanvasSize);
    if (!point) return;

    const panGesture = featureViewportPanRef.current ?? {
      offsetX: featureSketchViewport.offsetX,
      offsetY: featureSketchViewport.offsetY,
      start: point,
    };
    featureViewportPanRef.current = panGesture;

    const nextViewport = clampFeatureSketchViewport({
      offsetX: panGesture.offsetX + point.x - panGesture.start.x,
      offsetY: panGesture.offsetY + point.y - panGesture.start.y,
      scale: featureSketchViewport.scale,
    }, featureSketchCanvasSize);
    if (areFeatureSketchViewportsSimilar(nextViewport, featureSketchViewport)) {
      return;
    }

    setFeatureSketchViewport(nextViewport);
  };

  const adjustFeatureSketchScale = (delta: number) => {
    setFeatureSketchWasEdited(true);
    setFeatureSketchScale((scale) => clamp(
      scale + delta,
      FEATURE_SKETCH_SHAPE_MIN_SCALE,
      FEATURE_SKETCH_SHAPE_MAX_SCALE
    ));
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

  const adjustFeatureSketchViewportScale = (delta: number) => {
    setFeatureSketchViewport((viewport) => clampFeatureSketchViewport({
      ...viewport,
      scale: clamp(
        viewport.scale + delta,
        FEATURE_SKETCH_VIEWPORT_MIN_SCALE,
        FEATURE_SKETCH_VIEWPORT_MAX_SCALE
      ),
    }, featureSketchCanvasSize));
  };

  const undoFeatureSketchPoint = () => {
    setFeatureSketchWasEdited(true);
    setActiveFeatureSketchPoint(undefined);
    if (featureLocationShape === 'polygon') {
      setFeatureSketchPoints((points) => points.slice(0, -1));
      setFeatureSketchPolygonClosed(false);
      return;
    }

    setFeatureSketchPoints([]);
    setFeatureSketchPolygonClosed(false);
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
          viewport: featureSketchViewport,
          width: 2,
        })}
        {featureSketchBoundaryPoints.map((point, index) => (
          <View
            key={`boundary-point-${index}`}
            pointerEvents="none"
            style={[
              styles.featureSketchBoundaryPoint,
              getFeatureSketchPointStyle(
                point,
                featureSketchCanvasSize,
                featureSketchViewport
              ),
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
    if (
      featureLocationShape === 'rectangle'
      || featureLocationShape === 'circle'
      || featureLocationShape === 'oval'
    ) {
      return (
        <View
          pointerEvents="none"
          style={[
            styles.featureSketchShapePreview,
            featureLocationShape === 'oval' && styles.featureSketchOvalPreview,
            featureLocationShape === 'circle' && styles.featureSketchCirclePreview,
            getFeatureSketchShapeStyle(
              featureSketchCenter,
              featureSketchScale,
              featureSketchRotation,
              featureSketchCanvasSize,
              featureSketchViewport
            ),
          ]}
          testID="featureSketchShapePreview"
        >
          <View style={styles.featureSketchShapeCenter} />
        </View>
      );
    }

    const isPreviewClosingPolygon = (
      featureLocationShape === 'polygon'
      && !featureSketchPolygonClosed
      && activeFeatureSketchPoint
      && shouldCloseFeatureSketchPolygon(activeFeatureSketchPoint, featureSketchPoints)
    );
    const previewPoint = isPreviewClosingPolygon
      ? featureSketchPoints[0]
      : activeFeatureSketchPoint;
    const visiblePoints = featureLocationShape === 'polygon'
      ? getVisibleFeatureSketchPoints(
        featureSketchPoints,
        featureSketchPolygonClosed ? undefined : previewPoint
      )
      : (featureSketchPoints.length > 0 ? featureSketchPoints : [featureSketchCenter]);
    const linePoints = visiblePoints;
    const shouldCloseLinePath = featureSketchPolygonClosed || !!isPreviewClosingPolygon;

    return (
      <>
        {featureLocationShape === 'polygon' && toFeatureSketchLineSegments({
          canvasSize: featureSketchCanvasSize,
          closePath: shouldCloseLinePath,
          color: '#f97316',
          keyPrefix: 'feature',
          points: linePoints,
          testID: 'featureSketchLine',
          viewport: featureSketchViewport,
          width: 3,
        })}
        {featureLocationShape === 'polygon'
          && featureSketchActiveTool === 'polygon'
          && getFeatureSketchSegmentMidpoints(
            featureSketchPoints,
            featureSketchPolygonClosed
          ).map((point, index) => (
            <TouchableOpacity
              activeOpacity={0.78}
              key={`feature-insert-${index}`}
              onPress={() => insertFeatureSketchPointAtSegment(index)}
              style={[
                styles.featureSketchInsertPoint,
                getFeatureSketchPointStyle(
                  point,
                  featureSketchCanvasSize,
                  featureSketchViewport
                ),
              ]}
              testID={`featureSketchInsertPoint_${index}`}
            >
              <Ionicons name="add" size={10} color="#c2410c" />
            </TouchableOpacity>
          ))}
        {visiblePoints.map((point, index) => (
          <View
            key={`${point.x}-${point.y}-${index}`}
            pointerEvents="none"
            style={[
              styles.featureSketchPoint,
              previewPoint === point && styles.featureSketchPointActive,
              featureLocationShape === 'polygon'
                && index === 0
                && featureSketchPoints.length >= 3
                && !featureSketchPolygonClosed
                && styles.featureSketchPointCloseTarget,
              getFeatureSketchPointStyle(
                point,
                featureSketchCanvasSize,
                featureSketchViewport
              ),
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
            getFeatureSketchVerticalGridLineStyle(
              percent,
              featureSketchCanvasSize,
              featureSketchViewport
            ),
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
            getFeatureSketchHorizontalGridLineStyle(
              percent,
              featureSketchCanvasSize,
              featureSketchViewport
            ),
          ]}
        />
      ))}
    </>
  );

  const renderFeatureSketchMapSurface = () => (
    <View
      pointerEvents="none"
      style={[
        styles.featureSketchMapSurface,
        getFeatureSketchViewportLayerStyle(
          featureSketchCanvasSize,
          featureSketchViewport
        ),
        featureSketchBackground === 'white'
          ? styles.featureSketchWhiteMapSurface
          : styles.featureSketchSatelliteMapSurface,
      ]}
      testID="featureSketchFlatMapSurface"
    >
      {featureSketchBackground === 'satellite'
        && featureSketchSatelliteTiles.map((tile, index) => (
          <Image
            key={tile.key}
            onError={(event) => {
              console.warn(
                `Unable to load feature sketch satellite tile: ${event.nativeEvent.error}; `
                + tile.uri
              );
              setFeatureSketchSatelliteStatus('error');
            }}
            onLoad={() => setFeatureSketchSatelliteStatus('loaded')}
            onLoadStart={() => setFeatureSketchSatelliteStatus('loading')}
            resizeMode="stretch"
            source={{ uri: tile.uri }}
            style={[
              styles.featureSketchSatelliteImage,
              {
                height: `${tile.heightPercent}%`,
                left: `${tile.leftPercent}%`,
                top: `${tile.topPercent}%`,
                width: `${tile.widthPercent}%`,
              },
            ]}
            testID={`featureSketchSatelliteTile_${index}`}
          />
        ))}
      {featureSketchBackground === 'satellite'
        && (featureSketchSatelliteStatus !== 'loaded'
          || featureSketchSatelliteTiles.length === 0) && (
        <View style={styles.featureSketchSatelliteStatus}>
          {featureSketchSatelliteStatus === 'error'
            || featureSketchSatelliteTiles.length === 0 ? (
            <>
              <Ionicons name="cloud-offline-outline" size={20} color="#475467" />
              <Text style={styles.featureSketchSatelliteStatusText}>
                위성지도를 불러오지 못했습니다
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator color="#175cd3" size="small" />
              <Text style={styles.featureSketchSatelliteStatusText}>
                위성지도 불러오는 중
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderFeatureSketchCurrentLocation = () => {
    if (!featureLiveLocationPoint) return null;

    return (
      <View
        pointerEvents="none"
        style={[
          styles.featureSketchLiveLocation,
          getFeatureSketchPointStyle(
            featureLiveLocationPoint,
            featureSketchCanvasSize,
            featureSketchViewport
          ),
        ]}
        testID="featureSketchLiveLocation"
      >
        <View style={styles.featureSketchLiveLocationPulse} />
        <View style={styles.featureSketchLiveLocationDot} />
        <Text style={styles.featureSketchLiveLocationText}>내 위치</Text>
      </View>
    );
  };

  const renderFeatureSketchToolbar = () => (
    <View
      pointerEvents="box-none"
      style={styles.featureSketchToolbar}
      testID="featureSketchToolRail"
    >
      {featureSketchActiveTool === 'inspect' ? (
        <>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="지도 축소"
            onPress={() => adjustFeatureSketchViewportScale(-0.35)}
            style={styles.featureSketchToolButton}
            testID="featureSketchZoomOut"
          >
            <Ionicons name="remove-outline" size={18} color="#344054" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="지도 확대"
            onPress={() => adjustFeatureSketchViewportScale(0.35)}
            style={styles.featureSketchToolButton}
            testID="featureSketchZoomIn"
          >
            <Ionicons name="add-outline" size={18} color="#344054" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="지도 위치 초기화"
            onPress={() => setFeatureSketchViewport(FEATURE_SKETCH_VIEWPORT_DEFAULT)}
            style={styles.featureSketchToolButton}
            testID="featureSketchViewReset"
          >
            <Ionicons name="expand-outline" size={18} color="#344054" />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          activeOpacity={0.84}
          accessibilityLabel="마지막 점 되돌리기"
          onPress={undoFeatureSketchPoint}
          style={styles.featureSketchToolButton}
          testID="featureSketchUndo"
        >
          <Ionicons name="arrow-undo-outline" size={18} color="#344054" />
        </TouchableOpacity>
      )}
      {featureSketchActiveTool !== 'inspect'
        && isFeatureShapeTransformVisible(featureLocationShape) && (
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
        {featureSketchBackground === 'satellite'
          && featureSketchSatelliteStatus === 'loaded' && (
          <View
            pointerEvents="none"
            style={styles.featureSketchSatelliteAttribution}
            testID="featureSketchSatelliteAttribution"
          >
            <Text style={styles.featureSketchSatelliteAttributionText}>
              {FEATURE_SKETCH_SATELLITE_ATTRIBUTION}
            </Text>
          </View>
        )}
        <View
          onMoveShouldSetResponder={() => true}
          onResponderGrant={previewFeatureSketchPoint}
          onResponderMove={previewFeatureSketchPoint}
          onResponderRelease={commitFeatureSketchPoint}
          onResponderTerminate={cancelFeatureSketchPoint}
          onResponderTerminationRequest={() => false}
          onStartShouldSetResponder={() => true}
          style={styles.featureSketchTouchLayer}
          testID="featureLocationSketchTouchLayer"
        />
        {renderFeatureSketchCurrentLocation()}
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
          style={styles.featureSketchContextPanel}
          testID="featureSketchContextPanel"
        >
          <View
            style={styles.featureSketchBackgroundRow}
            testID="featureSketchBackgroundSelector"
          >
            {FEATURE_SKETCH_BACKGROUND_OPTIONS.map((option) => {
              const isSelected = option.id === featureSketchBackground;

              return (
                <TouchableOpacity
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.id}
                  onPress={() => setFeatureSketchBackground(option.id)}
                  style={[
                    styles.featureSketchBackgroundButton,
                    isSelected && styles.featureSketchBackgroundButtonSelected,
                  ]}
                  testID={`featureSketchBackground_${option.id}`}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={isSelected ? '#175cd3' : '#526272'}
                  />
                  <Text style={[
                    styles.featureSketchBackgroundText,
                    isSelected && styles.featureSketchBackgroundTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text
            style={styles.featureSketchLocationStatus}
            testID="featureSketchLiveLocationStatus"
          >
            {getFeatureLiveLocationStatusText(
              featureLiveLocationStatus,
              featureLiveLocation
            )}
          </Text>
        </View>
        <View
          pointerEvents="box-none"
          style={styles.featureSketchModeRow}
          testID="featureSketchModeRail"
        >
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityState={{ selected: featureSketchActiveTool === 'inspect' }}
            onPress={enterFeatureSketchInspectMode}
            style={[
              styles.featureSketchModeButton,
              featureSketchActiveTool === 'inspect'
                && styles.featureSketchModeButtonSelected,
            ]}
            testID="featureSketchMode_inspect"
          >
            <Ionicons
              name="hand-left-outline"
              size={15}
              color={featureSketchActiveTool === 'inspect' ? '#c2410c' : '#526272'}
            />
            <Text style={[
              styles.featureSketchModeText,
              featureSketchActiveTool === 'inspect'
                && styles.featureSketchModeTextSelected,
            ]}>
              보기
            </Text>
          </TouchableOpacity>
          {FEATURE_LOCATION_SKETCH_SHAPES.map((shape) => {
            const isSelected = featureSketchActiveTool === shape.id;

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
    const updateFeatureIdentifier = (value: string) => {
      setFeatureIdentifier(value);
    };
    const featureMeasurementResource = createFeatureMeasurementResource(
      selectedFeatureType,
      featureIdentifier,
      featureMeasurementValues
    );
    const featureMeasurementGroups = getKoreanFieldworkFeatureMeasurementGroups(
      featureCategory,
      featureMeasurementResource
    );

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
      <View style={styles.featureCreationLayout} testID="featureCreationLayout">
        <Animated.View
          style={[
            styles.featureCreationMapPane,
            isFeatureWideLayout && styles.featureCreationMapPaneWide,
            {
              height: featureSketchCanvasHeight,
              transform: [{ translateY: featureMapTranslateY }],
            },
          ]}
          testID="featureCreationMapPane"
        >
          {renderFeatureLocationSketchPanel()}
        </Animated.View>
        <Animated.ScrollView
          contentContainerStyle={[
            styles.featureCreationLayoutContent,
            isFeatureWideLayout && styles.featureCreationLayoutContentWide,
            { paddingTop: featureSketchCanvasHeight },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleFeatureCreationContentSizeChange}
          onLayout={handleFeatureCreationScrollerLayout}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: featureCreationScrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          ref={featureCreationScrollerRef}
          style={styles.featureCreationScroller}
          testID="featureCreationScroller"
        >
          <View
            pointerEvents="none"
            style={styles.featureCreationScrollHandle}
            testID="featureCreationScrollHandle"
          >
            <View style={styles.featureCreationScrollHandleBar} />
            <Text style={styles.featureCreationScrollHandleText}>
              위로 밀어 아래 내용 보기
            </Text>
          </View>
          <View
            style={[
              styles.featureCreationFormPane,
              styles.featureCreationFormScrollerContent,
              !isFeatureWideLayout && styles.featureCreationFormScrollerContentNarrow,
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
            selectedFeatureType === 'unknown' && styles.startUnknownFeatureSelected,
            isFeatureWideLayout && styles.startUnknownFeatureWide,
          ]}>
            <View style={styles.featureTypeHeader}>
              <TouchableOpacity
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedFeatureType === 'unknown' }}
                onPress={() => setSelectedFeatureType('unknown')}
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
                  selectedFeatureType === option.value && styles.featureTypeOptionSelected,
                  isFeatureWideLayout && styles.featureTypeOptionWide,
                ]}
              >
                <View style={styles.featureTypeHeader}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedFeatureType === option.value }}
                    onPress={() => setSelectedFeatureType(option.value)}
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
          {featureMeasurementGroups.length > 0 && (
            <View
              style={styles.featureMeasurementSection}
              testID="featureCreationMeasurements"
            >
              <Text style={styles.featureMeasurementTitle}>제원</Text>
              <Text style={styles.featureMeasurementDescription}>
                현재 확인한 실측값만 입력하세요. 단위는 항목마다 바꿀 수 있습니다.
              </Text>
              <KoreanFieldworkFeatureMeasurementFields
                groups={featureMeasurementGroups}
                onUpdateResourceFields={(updates) =>
                  setFeatureMeasurementValues((currentValues) => ({
                    ...currentValues,
                    ...updates,
                  }))}
                resource={featureMeasurementResource}
              />
            </View>
          )}
          <View style={styles.featureCreateFooter}>
            <Text style={styles.featureCreateFooterText} testID="featureCreateSelection">
              {selectedFeatureTypeLabel
                ? `${selectedFeatureTypeLabel}로 추가합니다.`
                : '유구 성격을 고른 뒤 추가하기를 누르세요.'}
            </Text>
            <Button
              title="추가하기"
              variant="success"
              isDisabled={!selectedFeatureType}
              onPress={() => {
                createFeature();
              }}
              style={styles.featureCreateSubmitButton}
              testID="featureCreateSubmit"
            />
          </View>
          </View>
        </Animated.ScrollView>
        {featureCreationMaxScroll > 1 && (
          <View
            accessibilityLabel="유구 추가 내용 스크롤"
            onMoveShouldSetResponder={() => true}
            onResponderGrant={scrollFeatureCreationFromRail}
            onResponderMove={scrollFeatureCreationFromRail}
            onResponderTerminationRequest={() => false}
            onStartShouldSetResponder={() => true}
            style={styles.featureCreationScrollbar}
            testID="featureCreationScrollbar"
          >
            <View pointerEvents="none" style={styles.featureCreationScrollbarTrack} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.featureCreationScrollbarThumb,
                {
                  height: featureCreationScrollThumbHeight,
                  transform: [{ translateY: featureCreationScrollThumbY }],
                },
              ]}
              testID="featureCreationScrollbarThumb"
            />
          </View>
        )}
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
            right={isChoosingFeatureType ? (
              <Button
                title="추가하기"
                variant="success"
                isDisabled={!selectedFeatureType}
                onPress={() => {
                  createFeature();
                }}
                testID="featureCreateSubmitTop"
              />
            ) : undefined}
          />
          {isChoosingFeatureType ? (
            <View style={[styles.categories, styles.featureCreationCategories]}>
              {renderFeatureTypePicker()}
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.categories}
            >
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
            </ScrollView>
          )}
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
  background,
  boundaryDraft,
  center,
  isEdited,
  isPolygonClosed,
  points,
  rotation,
  scale,
  shape,
}: {
  background: FeatureSketchBackground;
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  center: FeatureSketchPoint;
  isEdited: boolean;
  isPolygonClosed: boolean;
  points: FeatureSketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}): Record<string, string> => {
  if (!isEdited) return {};

  const sketchPoints = shape === 'polygon'
    ? points
    : (points.length > 0 ? points : [center]);
  const roundedSketchPoints = sketchPoints.map(roundSketchPoint);
  const payload = {
    version: 2,
    source: 'boundarySketch',
    background,
    shape,
    center: roundSketchPoint(center),
    points: roundedSketchPoints,
    isClosed: shape === 'polygon' ? isPolygonClosed : undefined,
    rotation,
    scale,
    projectBoundaryPointCount: boundaryDraft?.coordinates.length ?? 0,
  };
  const geometryPoints = getFeatureSketchGeometryPoints({
    center,
    isPolygonClosed,
    points: sketchPoints,
    rotation,
    scale,
    shape,
  });
  const geometryLocations =
    boundaryDraft && geometryPoints.length >= 3
      ? denormalizeSketchPointsToBoundaryLocations(geometryPoints, boundaryDraft)
      : [];

  const draftParams: Record<string, string> = {
    featureLocationSketch: JSON.stringify(payload),
  };

  if (geometryLocations.length >= 3) {
    draftParams.featureGeometry = JSON.stringify(toGeoJsonPolygon(geometryLocations));
    draftParams.geometryConfidence = 'rough';
    draftParams.geometrySource = 'drawnOnBoundarySketch';
  }

  return draftParams;
};

const getFeatureSketchGeometryPoints = ({
  center,
  isPolygonClosed,
  points,
  rotation,
  scale,
  shape,
}: {
  center: FeatureSketchPoint;
  isPolygonClosed: boolean;
  points: FeatureSketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}): FeatureSketchPoint[] => {
  if (shape === 'polygon') {
    return isPolygonClosed && points.length >= 3 ? points : [];
  }
  if (shape === 'rectangle') {
    return getRotatedRectangleSketchPoints(center, scale, rotation);
  }
  if (shape === 'oval') {
    return getOvalSketchPoints(center, scale, rotation);
  }
  if (shape === 'circle') {
    return getCircleSketchPoints(center, scale);
  }

  return [];
};

const getRotatedRectangleSketchPoints = (
  center: FeatureSketchPoint,
  scale: number,
  rotation: number
): FeatureSketchPoint[] => {
  const halfWidth = (FEATURE_SKETCH_SHAPE_BASE_WIDTH * scale) / 200;
  const halfHeight = (FEATURE_SKETCH_SHAPE_BASE_HEIGHT * scale) / 200;

  return [
    rotateSketchPoint(center, -halfWidth, -halfHeight, rotation),
    rotateSketchPoint(center, halfWidth, -halfHeight, rotation),
    rotateSketchPoint(center, halfWidth, halfHeight, rotation),
    rotateSketchPoint(center, -halfWidth, halfHeight, rotation),
  ];
};

const getOvalSketchPoints = (
  center: FeatureSketchPoint,
  scale: number,
  rotation: number
): FeatureSketchPoint[] => {
  const radiusX = (FEATURE_SKETCH_SHAPE_BASE_WIDTH * scale) / 200;
  const radiusY = (FEATURE_SKETCH_SHAPE_BASE_HEIGHT * scale) / 200;

  return Array.from({ length: FEATURE_SKETCH_OVAL_SEGMENTS }, (_, index) => {
    const angle = (Math.PI * 2 * index) / FEATURE_SKETCH_OVAL_SEGMENTS;

    return rotateSketchPoint(
      center,
      Math.cos(angle) * radiusX,
      Math.sin(angle) * radiusY,
      rotation
    );
  });
};

const getCircleSketchPoints = (
  center: FeatureSketchPoint,
  scale: number
): FeatureSketchPoint[] => {
  const radius = (FEATURE_SKETCH_SHAPE_BASE_WIDTH * scale) / 200;

  return Array.from({ length: FEATURE_SKETCH_OVAL_SEGMENTS }, (_, index) => {
    const angle = (Math.PI * 2 * index) / FEATURE_SKETCH_OVAL_SEGMENTS;

    return {
      x: clamp(center.x + (Math.cos(angle) * radius), 0, 100),
      y: clamp(center.y + (Math.sin(angle) * radius), 0, 100),
    };
  });
};

const rotateSketchPoint = (
  center: FeatureSketchPoint,
  deltaX: number,
  deltaY: number,
  rotation: number
): FeatureSketchPoint => {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: clamp(center.x + (deltaX * cos) - (deltaY * sin), 0, 100),
    y: clamp(center.y + (deltaX * sin) + (deltaY * cos), 0, 100),
  };
};

const createFeatureMeasurementResource = (
  featureType: string,
  identifier: string,
  measurementValues: Record<string, unknown>
): NewResource => ({
  id: 'feature-measurement-draft',
  identifier,
  category: KOREAN_FIELDWORK_CATEGORIES.FEATURE,
  relations: {},
  featureType,
  ...measurementValues,
} as NewResource);

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
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
): FeatureSketchPoint | undefined => {
  const pressPoint = getFeatureSketchPressPixel(event, canvasSize);
  if (!pressPoint) return undefined;

  return getSketchPointFromPixel(pressPoint, canvasSize, viewport);
};

const getFeatureSketchPressPixel = (
  event: GestureResponderEvent,
  _canvasSize: { height: number; width: number }
): FeatureSketchTouchPoint | undefined => {
  const nativeEvent = event.nativeEvent as unknown as FeatureSketchNativeEvent;
  const localTouch = [
    ...(nativeEvent.touches ?? []),
    ...(nativeEvent.changedTouches ?? []),
  ].map(getFeatureSketchLocalTouchPoint)
    .find((touch): touch is FeatureSketchTouchPoint => !!touch);

  return localTouch ?? getFeatureSketchLocalTouchPoint(nativeEvent);
};

const getFeatureShapeGesture = (
  event: GestureResponderEvent,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
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
    center: getSketchPointFromPixel(centerPixel, canvasSize, viewport),
    distance,
  };
};

const getFeatureSketchPixelGesture = (
  event: GestureResponderEvent
): {
  center: FeatureSketchTouchPoint;
  distance: number;
} | undefined => {
  const touches = getFeatureSketchTouches(event);
  if (touches.length < 2) return undefined;

  const [first, second] = touches;

  return {
    center: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    },
    distance: Math.sqrt(
      ((second.x - first.x) ** 2) + ((second.y - first.y) ** 2)
    ),
  };
};

const getFeatureSketchTouches = (
  event: GestureResponderEvent
): FeatureSketchTouchPoint[] => {
  const nativeEvent = event.nativeEvent as unknown as FeatureSketchNativeEvent;
  const touches = nativeEvent.touches?.length
    ? nativeEvent.touches
    : (nativeEvent.changedTouches ?? []);

  return touches
    .map(getFeatureSketchLocalTouchPoint)
    .filter((touch): touch is FeatureSketchTouchPoint => !!touch);
};

interface FeatureSketchTouchCandidate {
  locationX?: number;
  locationY?: number;
  x?: number;
  y?: number;
}

interface FeatureSketchNativeEvent extends FeatureSketchTouchCandidate {
  changedTouches?: FeatureSketchTouchCandidate[];
  touches?: FeatureSketchTouchCandidate[];
}

const getFeatureSketchLocalTouchPoint = (
  value?: FeatureSketchTouchCandidate
): FeatureSketchTouchPoint | undefined => {
  const x = value?.locationX ?? value?.x;
  const y = value?.locationY ?? value?.y;

  return Number.isFinite(x) && Number.isFinite(y)
    ? { x: Number(x), y: Number(y) }
    : undefined;
};

const getSketchPointFromPixel = (
  point: FeatureSketchTouchPoint,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
): FeatureSketchPoint => {
  const width = Math.max(1, canvasSize.width);
  const height = Math.max(1, canvasSize.height);
  const center = getFeatureSketchCanvasCenter(canvasSize);
  const baseX = center.x + ((point.x - center.x - viewport.offsetX)
    / Math.max(FEATURE_SKETCH_VIEWPORT_MIN_SCALE, viewport.scale));
  const baseY = center.y + ((point.y - center.y - viewport.offsetY)
    / Math.max(FEATURE_SKETCH_VIEWPORT_MIN_SCALE, viewport.scale));

  return {
    x: roundSketchCoordinate(clamp((baseX / width) * 100, 0, 100)),
    y: roundSketchCoordinate(clamp((baseY / height) * 100, 0, 100)),
  };
};

const getNextFeatureSketchPolygonState = ({
  isClosed,
  point,
  points,
}: {
  isClosed: boolean;
  point: FeatureSketchPoint;
  points: FeatureSketchPoint[];
}): {
  center: FeatureSketchPoint;
  isClosed: boolean;
  points: FeatureSketchPoint[];
} => {
  if (shouldCloseFeatureSketchPolygon(point, points)) {
    return {
      center: points[0],
      isClosed: true,
      points,
    };
  }

  const insertionIndex = getFeatureSketchSegmentInsertionIndex(
    point,
    points,
    isClosed
  );

  if (insertionIndex !== undefined) {
    const nextPoints = points.slice();
    nextPoints.splice(insertionIndex, 0, point);

    return {
      center: point,
      isClosed: nextPoints.length >= 3,
      points: nextPoints.slice(0, FEATURE_SKETCH_MAX_POLYGON_POINTS),
    };
  }

  const nextPoints = points
    .concat(point)
    .slice(-FEATURE_SKETCH_MAX_POLYGON_POINTS);

  return {
    center: point,
    isClosed: nextPoints.length >= 3,
    points: nextPoints,
  };
};

const getFeatureSketchMidpointInsertionIndex = (
  segmentIndex: number,
  pointCount: number
): number => Math.min(pointCount, Math.max(1, segmentIndex + 1));

const shouldCloseFeatureSketchPolygon = (
  point: FeatureSketchPoint,
  points: FeatureSketchPoint[]
): boolean => (
  points.length >= 3
  && getFeatureSketchPointDistance(point, points[0])
    <= FEATURE_SKETCH_CLOSE_POINT_DISTANCE
);

const getFeatureSketchPointHitIndex = (
  point: FeatureSketchPoint,
  points: FeatureSketchPoint[]
): number | undefined => {
  const pointIndex = points.findIndex((candidate) =>
    getFeatureSketchPointDistance(point, candidate) <= FEATURE_SKETCH_CLOSE_POINT_DISTANCE
  );

  return pointIndex >= 0 ? pointIndex : undefined;
};

const getFeatureSketchSegmentInsertionIndex = (
  point: FeatureSketchPoint,
  points: FeatureSketchPoint[],
  isClosed: boolean
): number | undefined => {
  if (points.length < 2) return undefined;

  const segmentCount = isClosed ? points.length : points.length - 1;
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestIndex: number | undefined;

  for (let index = 0; index < segmentCount; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const distance = getFeatureSketchPointToSegmentDistance(point, start, end);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index + 1;
    }
  }

  return closestDistance <= FEATURE_SKETCH_INSERT_POINT_DISTANCE
    ? closestIndex
    : undefined;
};

const getFeatureSketchSegmentMidpoints = (
  points: FeatureSketchPoint[],
  isClosed: boolean
): FeatureSketchPoint[] => {
  if (points.length < 2) return [];

  const segmentCount = isClosed ? points.length : points.length - 1;

  return Array.from({ length: segmentCount }, (_, index) => {
    const start = points[index];
    const end = points[(index + 1) % points.length];

    return {
      x: roundSketchCoordinate((start.x + end.x) / 2),
      y: roundSketchCoordinate((start.y + end.y) / 2),
    };
  });
};

const getFeatureSketchPointDistance = (
  first: FeatureSketchPoint,
  second: FeatureSketchPoint
): number => Math.sqrt(
  ((second.x - first.x) ** 2) + ((second.y - first.y) ** 2)
);

const getFeatureSketchPointToSegmentDistance = (
  point: FeatureSketchPoint,
  start: FeatureSketchPoint,
  end: FeatureSketchPoint
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLengthSquared = (dx ** 2) + (dy ** 2);

  if (segmentLengthSquared === 0) {
    return getFeatureSketchPointDistance(point, start);
  }

  const projection = clamp(
    (((point.x - start.x) * dx) + ((point.y - start.y) * dy))
      / segmentLengthSquared,
    0,
    1
  );
  const projectedPoint = {
    x: start.x + (projection * dx),
    y: start.y + (projection * dy),
  };

  return getFeatureSketchPointDistance(point, projectedPoint);
};

const getFeatureLiveLocationFromCoords = (
  coords: Location.LocationObjectCoords
): FeatureLiveLocation | undefined => {
  if (
    !Number.isFinite(coords.latitude)
    || !Number.isFinite(coords.longitude)
  ) {
    return undefined;
  }

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    ...(typeof coords.accuracy === 'number'
      ? { accuracy: coords.accuracy }
      : {}),
  };
};

const getFeatureLiveLocationStatusText = (
  status: FeatureLiveLocationStatus,
  location?: FeatureLiveLocation
): string => {
  if (status === 'tracking' && location) {
    const accuracy = typeof location.accuracy === 'number'
      ? ` · ±${Math.round(location.accuracy)}m`
      : '';

    return `내 위치 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}${accuracy}`;
  }
  if (status === 'denied') return '현재 위치 권한이 없어 위치 표시는 생략합니다.';
  if (status === 'unavailable') return '현재 위치를 확인하지 못했습니다.';
  if (status === 'checking') return '현재 위치 확인 중';

  return '유적 경계 안에서 유구 위치를 바로 잡습니다.';
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

const areFeatureSketchPointsNear = (
  first?: FeatureSketchPoint,
  second?: FeatureSketchPoint,
  threshold = 0
): boolean => {
  if (threshold <= 0) return areSketchPointsEqual(first, second);

  return (
    !!first
    && !!second
    && getFeatureSketchPointDistance(first, second) <= threshold
  );
};

const shouldUpdateFeatureSketchPreviewPoint = (
  nextPoint: FeatureSketchPoint,
  previousPoint?: FeatureSketchPoint
): boolean => (
  !areFeatureSketchPointsNear(
    nextPoint,
    previousPoint,
    FEATURE_SKETCH_PREVIEW_POINT_MOVE_THRESHOLD
  )
);

const areFeatureSketchViewportsSimilar = (
  first: FeatureSketchViewport,
  second: FeatureSketchViewport
): boolean => (
  Math.abs(first.offsetX - second.offsetX) < FEATURE_SKETCH_VIEWPORT_OFFSET_THRESHOLD
  && Math.abs(first.offsetY - second.offsetY) < FEATURE_SKETCH_VIEWPORT_OFFSET_THRESHOLD
  && Math.abs(first.scale - second.scale) < FEATURE_SKETCH_VIEWPORT_SCALE_THRESHOLD
);

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
  const padding = FEATURE_SKETCH_BOUNDARY_PADDING;
  const drawableSize = 100 - (padding * 2);

  return boundaryDraft.coordinates.map((point) => ({
    x: padding + (((point.longitude - minLongitude) / longitudeRange)
      * drawableSize),
    y: padding + (((maxLatitude - point.latitude) / latitudeRange)
      * drawableSize),
  }));
};

const getFeatureSketchPointFromLocation = (
  location: FeatureLiveLocation | undefined,
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): FeatureSketchPoint | undefined => {
  if (!location || !boundaryDraft || boundaryDraft.coordinates.length < 3) {
    return undefined;
  }

  return normalizeBoundaryLocationsToSketchPoints(
    [location],
    boundaryDraft.coordinates
  )[0];
};

const normalizeBoundaryLocationsToSketchPoints = (
  locations: readonly KoreanFieldworkBoundaryLocation[],
  referenceLocations: readonly KoreanFieldworkBoundaryLocation[]
): FeatureSketchPoint[] => {
  if (locations.length === 0 || referenceLocations.length === 0) return [];

  const bounds = getBoundaryLocationBounds(referenceLocations);
  const drawableSize = 100 - (FEATURE_SKETCH_BOUNDARY_PADDING * 2);

  return locations.map((point) => ({
    x: Math.round(clamp(
      FEATURE_SKETCH_BOUNDARY_PADDING
        + (((point.longitude - bounds.minLongitude) / bounds.longitudeRange)
          * drawableSize),
      0,
      100
    )),
    y: Math.round(clamp(
      FEATURE_SKETCH_BOUNDARY_PADDING
        + (((bounds.maxLatitude - point.latitude) / bounds.latitudeRange)
          * drawableSize),
      0,
      100
    )),
  }));
};

const denormalizeSketchPointsToBoundaryLocations = (
  points: readonly FeatureSketchPoint[],
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft
): KoreanFieldworkBoundaryLocation[] => {
  if (boundaryDraft.coordinates.length < 3) return [];

  const bounds = getBoundaryLocationBounds(boundaryDraft.coordinates);
  const drawableSize = 100 - (FEATURE_SKETCH_BOUNDARY_PADDING * 2);

  return points.map((point) => {
    const normalizedX = clamp(
      (point.x - FEATURE_SKETCH_BOUNDARY_PADDING) / drawableSize,
      0,
      1
    );
    const normalizedY = clamp(
      (point.y - FEATURE_SKETCH_BOUNDARY_PADDING) / drawableSize,
      0,
      1
    );

    return {
      latitude: bounds.maxLatitude - (normalizedY * bounds.latitudeRange),
      longitude: bounds.minLongitude + (normalizedX * bounds.longitudeRange),
    };
  });
};

const getBoundaryLocationBounds = (
  locations: readonly KoreanFieldworkBoundaryLocation[]
) => {
  const longitudes = locations.map((point) => point.longitude);
  const latitudes = locations.map((point) => point.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);

  return {
    latitudeRange: Math.max(maxLatitude - minLatitude, 0.000001),
    longitudeRange: Math.max(maxLongitude - minLongitude, 0.000001),
    maxLatitude,
    maxLongitude,
    minLatitude,
    minLongitude,
  };
};

const toGeoJsonPolygon = (
  coordinates: readonly KoreanFieldworkBoundaryLocation[]
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

const getFeatureSketchCanvasCenter = (
  canvasSize: { height: number; width: number }
): FeatureSketchPixelPoint => ({
  x: canvasSize.width / 2,
  y: canvasSize.height / 2,
});

const getFeatureSketchViewportPoint = (
  point: FeatureSketchPoint,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
): FeatureSketchPixelPoint => {
  const basePoint = denormalizeFeatureSketchPoint(point, canvasSize);
  const center = getFeatureSketchCanvasCenter(canvasSize);

  return {
    x: center.x + ((basePoint.x - center.x) * viewport.scale)
      + viewport.offsetX,
    y: center.y + ((basePoint.y - center.y) * viewport.scale)
      + viewport.offsetY,
  };
};

const getFeatureSketchBasePixelFromViewportPixel = (
  point: FeatureSketchTouchPoint,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
): FeatureSketchPixelPoint => {
  const center = getFeatureSketchCanvasCenter(canvasSize);
  const scale = Math.max(FEATURE_SKETCH_VIEWPORT_MIN_SCALE, viewport.scale);

  return {
    x: center.x + ((point.x - center.x - viewport.offsetX) / scale),
    y: center.y + ((point.y - center.y - viewport.offsetY) / scale),
  };
};

const getFeatureSketchViewportFromGesture = ({
  canvasSize,
  currentCenter,
  initialCenter,
  initialViewport,
  nextScale,
}: {
  canvasSize: { height: number; width: number };
  currentCenter: FeatureSketchTouchPoint;
  initialCenter: FeatureSketchTouchPoint;
  initialViewport: FeatureSketchViewport;
  nextScale: number;
}): FeatureSketchViewport => {
  const canvasCenter = getFeatureSketchCanvasCenter(canvasSize);
  const anchoredBasePoint = getFeatureSketchBasePixelFromViewportPixel(
    initialCenter,
    canvasSize,
    initialViewport
  );

  return {
    offsetX: currentCenter.x - canvasCenter.x
      - ((anchoredBasePoint.x - canvasCenter.x) * nextScale),
    offsetY: currentCenter.y - canvasCenter.y
      - ((anchoredBasePoint.y - canvasCenter.y) * nextScale),
    scale: nextScale,
  };
};

const clampFeatureSketchViewport = (
  viewport: FeatureSketchViewport,
  canvasSize: { height: number; width: number }
): FeatureSketchViewport => {
  const scale = clamp(
    viewport.scale,
    FEATURE_SKETCH_VIEWPORT_MIN_SCALE,
    FEATURE_SKETCH_VIEWPORT_MAX_SCALE
  );
  const baseOffsetX = canvasSize.width * FEATURE_SKETCH_VIEWPORT_BASE_PAN_RATIO;
  const baseOffsetY = canvasSize.height * FEATURE_SKETCH_VIEWPORT_BASE_PAN_RATIO;
  const maxOffsetX = baseOffsetX + ((canvasSize.width * (scale - 1)) / 2);
  const maxOffsetY = baseOffsetY + ((canvasSize.height * (scale - 1)) / 2);

  return {
    offsetX: clamp(viewport.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(viewport.offsetY, -maxOffsetY, maxOffsetY),
    scale,
  };
};

const getFeatureSketchViewportLayerStyle = (
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
) => {
  const topLeft = getFeatureSketchViewportPoint(
    { x: 0, y: 0 },
    canvasSize,
    viewport
  );

  return {
    height: canvasSize.height * viewport.scale,
    left: topLeft.x,
    top: topLeft.y,
    width: canvasSize.width * viewport.scale,
  };
};

const getFeatureSketchVerticalGridLineStyle = (
  percent: number,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
) => {
  const top = getFeatureSketchViewportPoint(
    { x: percent, y: 0 },
    canvasSize,
    viewport
  );

  return {
    height: canvasSize.height * viewport.scale,
    left: top.x,
    top: top.y,
  };
};

const getFeatureSketchHorizontalGridLineStyle = (
  percent: number,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
) => {
  const left = getFeatureSketchViewportPoint(
    { x: 0, y: percent },
    canvasSize,
    viewport
  );

  return {
    left: left.x,
    top: left.y,
    width: canvasSize.width * viewport.scale,
  };
};

const toFeatureSketchLineSegments = ({
  canvasSize,
  closePath,
  color,
  keyPrefix,
  points,
  testID,
  viewport,
  width,
}: {
  canvasSize: { height: number; width: number };
  closePath: boolean;
  color: string;
  keyPrefix: string;
  points: FeatureSketchPoint[];
  testID: string;
  viewport: FeatureSketchViewport;
  width: number;
}) => {
  if (points.length < 2) return [];

  const segmentStartPoints = closePath ? points : points.slice(0, -1);

  return segmentStartPoints.map((point, index) => (
    <FeatureSketchLineSegment
      color={color}
      end={getFeatureSketchViewportPoint(
        points[(index + 1) % points.length],
        canvasSize,
        viewport
      )}
      key={`${keyPrefix}-${index}`}
      start={getFeatureSketchViewportPoint(point, canvasSize, viewport)}
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

const getFeatureSketchPointStyle = (
  point: FeatureSketchPoint,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
) => {
  const viewportPoint = getFeatureSketchViewportPoint(
    point,
    canvasSize,
    viewport
  );

  return {
    left: viewportPoint.x,
    top: viewportPoint.y,
  };
};

const getFeatureSketchShapeStyle = (
  center: FeatureSketchPoint,
  scale: number,
  rotation: number,
  canvasSize: { height: number; width: number },
  viewport: FeatureSketchViewport
) => {
  const viewportPoint = getFeatureSketchViewportPoint(
    center,
    canvasSize,
    viewport
  );

  return {
    left: viewportPoint.x,
    top: viewportPoint.y,
    transform: [
      { scale: (scale / 100) * viewport.scale },
      { rotate: `${rotation}deg` },
    ],
  };
};

const isFeatureShapeTransformVisible = (
  shape: FeatureLocationSketchShape
): boolean => shape === 'rectangle' || shape === 'circle' || shape === 'oval';

const roundSketchPoint = (point: FeatureSketchPoint): FeatureSketchPoint => ({
  x: roundSketchCoordinate(point.x),
  y: roundSketchCoordinate(point.y),
});

const roundSketchCoordinate = (value: number): number =>
  Math.round(value * 10) / 10;

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
  featureCreationLayout: {
    flex: 1,
  },
  featureCreationScroller: {
    flex: 1,
  },
  featureCreationScrollbar: {
    alignItems: 'center',
    bottom: 10,
    justifyContent: 'flex-start',
    position: 'absolute',
    right: 0,
    top: 10,
    width: 30,
    zIndex: 6,
  },
  featureCreationScrollbarTrack: {
    backgroundColor: 'rgba(71, 84, 103, 0.2)',
    borderRadius: 4,
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 6,
  },
  featureCreationScrollbarThumb: {
    backgroundColor: '#667085',
    borderColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 7,
    borderWidth: 1,
    position: 'absolute',
    top: 0,
    width: 14,
  },
  featureCreationScrollHandle: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4e7ec',
    borderBottomWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 7,
    width: '100%',
  },
  featureCreationScrollHandleBar: {
    backgroundColor: '#98a2b3',
    borderRadius: 999,
    height: 4,
    marginBottom: 5,
    width: 54,
  },
  featureCreationScrollHandleText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '600',
  },
  featureCreationLayoutContent: {
    flexGrow: 1,
    flexDirection: 'column',
  },
  featureCreationLayoutContentWide: {
    alignItems: 'stretch',
  },
  featureCreationMapPane: {
    left: 0,
    minWidth: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  featureCreationMapPaneWide: {
    marginRight: 0,
    minWidth: 0,
  },
  featureCreationFormPane: {
    minWidth: 0,
  },
  featureCreationFormPaneWide: {
    backgroundColor: '#ffffff',
    borderTopColor: '#d0d5dd',
    borderTopWidth: 1,
    maxWidth: '100%',
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    width: '100%',
  },
  featureCreationFormScrollerContent: {
    alignItems: 'stretch',
    flexDirection: 'column',
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  featureCreationFormScrollerContentNarrow: {
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
    alignSelf: 'stretch',
    marginBottom: 8,
    marginRight: 0,
    width: '100%',
  },
  featureCreationParentPanelWide: {
    alignSelf: 'stretch',
    marginBottom: 8,
    marginRight: 0,
    width: '100%',
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
    overflow: 'hidden',
    position: 'absolute',
  },
  featureSketchWhiteMapSurface: {
    backgroundColor: '#ffffff',
  },
  featureSketchSatelliteMapSurface: {
    backgroundColor: '#f8faf7',
  },
  featureSketchSatelliteImage: {
    position: 'absolute',
  },
  featureSketchSatelliteStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#eef2f6',
    justifyContent: 'center',
  },
  featureSketchSatelliteStatusText: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
  featureSketchSatelliteAttribution: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 3,
    bottom: 92,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: 38,
    zIndex: 3,
  },
  featureSketchSatelliteAttributionText: {
    color: '#344054',
    fontSize: 9,
    fontWeight: '600',
  },
  featureSketchTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  featureSketchGridLine: {
    backgroundColor: 'rgba(52, 64, 84, 0.1)',
    position: 'absolute',
  },
  featureSketchGridLineVertical: {
    width: 1,
  },
  featureSketchGridLineHorizontal: {
    height: 1,
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
  featureSketchContextPanel: {
    alignItems: 'flex-start',
    left: 12,
    maxWidth: 360,
    position: 'absolute',
    top: 78,
    zIndex: 5,
  },
  featureSketchBackgroundRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  featureSketchBackgroundButton: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 30,
    paddingHorizontal: 8,
  },
  featureSketchBackgroundButtonSelected: {
    backgroundColor: '#eff8ff',
    borderColor: '#84caff',
  },
  featureSketchBackgroundText: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  featureSketchBackgroundTextSelected: {
    color: '#175cd3',
  },
  featureSketchLocationStatus: {
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
  featureSketchLiveLocation: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -7,
    marginTop: -7,
    position: 'absolute',
    zIndex: 4,
  },
  featureSketchLiveLocationPulse: {
    backgroundColor: 'rgba(23, 92, 211, 0.16)',
    borderColor: 'rgba(23, 92, 211, 0.34)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    position: 'absolute',
    width: 36,
  },
  featureSketchLiveLocationDot: {
    backgroundColor: '#175cd3',
    borderColor: 'white',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  featureSketchLiveLocationText: {
    backgroundColor: 'rgba(23, 92, 211, 0.94)',
    borderRadius: 4,
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
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
  featureSketchPointCloseTarget: {
    borderColor: '#7c2d12',
    borderWidth: 3,
  },
  featureSketchPointText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
  featureSketchInsertPoint: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 237, 0.96)',
    borderColor: '#fdba74',
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    marginLeft: -8,
    marginTop: -8,
    position: 'absolute',
    width: 16,
    zIndex: 3,
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
  featureSketchCirclePreview: {
    borderRadius: 50,
    height: 100,
    marginTop: -50,
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
    right: 34,
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
    justifyContent: 'space-between',
    minWidth: 0,
    width: '100%',
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
    minHeight: 68,
    width: '49%',
  },
  featureTypeOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
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
  startUnknownFeatureSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  startUnknownFeatureWide: {
    alignSelf: 'stretch',
    marginBottom: 8,
    marginRight: 0,
    width: '100%',
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
  featureMeasurementSection: {
    borderTopColor: '#d0d5dd',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 12,
  },
  featureMeasurementTitle: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  featureMeasurementDescription: {
    color: '#667085',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 9,
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
  featureCreateFooter: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  featureCreateFooterText: {
    color: '#344054',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    paddingRight: 10,
  },
  featureCreateSubmitButton: {
    minWidth: 104,
    paddingHorizontal: 14,
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
