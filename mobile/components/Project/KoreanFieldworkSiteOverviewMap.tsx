import { MaterialIcons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React, { useMemo, useRef, useState } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getKoreanFieldworkDisplayIdentifier,
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';
import {
  getKoreanFieldworkFeatureTypeLabel,
} from './korean-fieldwork-feature-types';
import type {
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';
import {
  projectMapCoordinateToWgs84,
  REFERENCE_VECTOR_FIELDS,
} from './Map/korean-fieldwork-drafts';

type FeatureLocationSketchShape =
  'point' | 'polygon' | 'rectangle' | 'circle' | 'oval';

interface SketchPoint {
  x: number;
  y: number;
}

interface PixelPoint {
  x: number;
  y: number;
}

interface CanvasSize {
  height: number;
  width: number;
}

interface SketchFrame {
  height: number;
  minX: number;
  minY: number;
  width: number;
}

interface BoundaryProjection {
  coordinateBounds?: CoordinateBounds;
  frame?: SketchFrame;
  points: SketchPoint[];
  usesWgs84Coordinates?: boolean;
}

interface CoordinateBounds {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

interface SiteOverviewViewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface SiteOverviewPinchGesture {
  center: PixelPoint;
  distance: number;
  viewport: SiteOverviewViewport;
}

interface SiteOverviewPanGesture {
  start: PixelPoint;
  viewport: SiteOverviewViewport;
}

interface FeatureLocationSketch {
  center: SketchPoint;
  isClosed?: boolean;
  points: SketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}

interface SiteOverviewFeature {
  document: Document;
  label: string;
  sketch: FeatureLocationSketch;
  typeLabel?: string;
}

interface Props {
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  documents: readonly Document[];
  onImportDxfReference?: () => void;
  onOpenFeature?: (document: Document) => void;
}

const CANVAS_DEFAULT_SIZE: CanvasSize = {
  height: 640,
  width: 960,
};
const BOUNDARY_PADDING = 14;
const FEATURE_SHAPE_BASE_WIDTH = 18;
const FEATURE_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SHAPE_MIN_SCALE = 8;
const FEATURE_SHAPE_MAX_SCALE = 240;
const FEATURE_MIN_SIZE = 8;
const FEATURE_LABEL_WIDTH = 118;
const FEATURE_LABEL_HEIGHT = 38;
const FEATURE_HIT_TARGET_MIN_SIZE = 48;
const EARTH_RADIUS_METERS = 6371008.8;
const MAX_REFERENCE_SEGMENTS = 1600;
const SITE_OVERVIEW_MIN_SCALE = 1;
const SITE_OVERVIEW_MAX_SCALE = 5;
const SITE_OVERVIEW_DEFAULT_VIEWPORT: SiteOverviewViewport = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
const VALID_FEATURE_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'circle',
  'oval',
]);

const KoreanFieldworkSiteOverviewMap: React.FC<Props> = ({
  boundaryDraft,
  documents,
  onImportDxfReference,
  onOpenFeature,
}) => {
  const [canvasSize, setCanvasSize] = useState(CANVAS_DEFAULT_SIZE);
  const [distanceFeatureIds, setDistanceFeatureIds] = useState<string[]>([]);
  const [isDistanceMeasurementActive, setIsDistanceMeasurementActive] =
    useState(false);
  const [viewport, setViewport] = useState(SITE_OVERVIEW_DEFAULT_VIEWPORT);
  const pinchGestureRef = useRef<SiteOverviewPinchGesture>();
  const panGestureRef = useRef<SiteOverviewPanGesture>();
  const boundaryProjection = useMemo(
    () => getSurveyBoundaryProjection(documents, boundaryDraft, canvasSize),
    [boundaryDraft, canvasSize, documents]
  );
  const boundaryPoints = boundaryProjection.points;
  const features = useMemo(
    () => getSiteOverviewFeatures(documents, boundaryProjection.frame),
    [boundaryProjection.frame, documents]
  );
  const referenceLines = useMemo(
    () => getSiteOverviewReferenceLines(documents, boundaryProjection),
    [boundaryProjection, documents]
  );
  const distanceStartFeature = features.find((feature) =>
    feature.document.resource.id === distanceFeatureIds[0]);
  const distanceEndFeature = features.find((feature) =>
    feature.document.resource.id === distanceFeatureIds[1]);
  const distanceMeters = useMemo(
    () => getApproximateFeatureDistanceMeters(
      distanceStartFeature,
      distanceEndFeature,
      boundaryProjection
    ),
    [boundaryProjection, distanceEndFeature, distanceStartFeature]
  );
  const canMeasureDistances = features.length >= 2
    && !!boundaryProjection.coordinateBounds
    && !!boundaryProjection.frame;
  const normalizedViewport = useMemo(
    () => normalizeSiteOverviewViewport(viewport, canvasSize),
    [canvasSize, viewport]
  );

  const handleCanvasLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startViewportGesture = (event: GestureResponderEvent) => {
    const pinchGesture = getSiteOverviewTouchGesture(event);
    if (pinchGesture) {
      pinchGestureRef.current = {
        center: pinchGesture.center,
        distance: Math.max(1, pinchGesture.distance),
        viewport: normalizedViewport,
      };
      panGestureRef.current = undefined;
      return;
    }

    const point = getPrimaryTouchPoint(event);
    if (point && normalizedViewport.scale > SITE_OVERVIEW_MIN_SCALE) {
      panGestureRef.current = {
        start: point,
        viewport: normalizedViewport,
      };
    }
  };
  const moveViewportGesture = (event: GestureResponderEvent) => {
    const pinchGesture = getSiteOverviewTouchGesture(event);
    if (pinchGesture) {
      const initialGesture = pinchGestureRef.current ?? {
        center: pinchGesture.center,
        distance: Math.max(1, pinchGesture.distance),
        viewport: normalizedViewport,
      };
      pinchGestureRef.current = initialGesture;
      panGestureRef.current = undefined;
      const nextScale = clamp(
        initialGesture.viewport.scale
          * (pinchGesture.distance / Math.max(1, initialGesture.distance)),
        SITE_OVERVIEW_MIN_SCALE,
        SITE_OVERVIEW_MAX_SCALE
      );
      const scaleRatio = nextScale / initialGesture.viewport.scale;
      const canvasCenter = {
        x: canvasSize.width / 2,
        y: canvasSize.height / 2,
      };

      setViewport(normalizeSiteOverviewViewport({
        offsetX: pinchGesture.center.x - canvasCenter.x
          - (scaleRatio * (
            initialGesture.center.x
            - canvasCenter.x
            - initialGesture.viewport.offsetX
          )),
        offsetY: pinchGesture.center.y - canvasCenter.y
          - (scaleRatio * (
            initialGesture.center.y
            - canvasCenter.y
            - initialGesture.viewport.offsetY
          )),
        scale: nextScale,
      }, canvasSize));
      return;
    }

    if (normalizedViewport.scale <= SITE_OVERVIEW_MIN_SCALE) return;

    const point = getPrimaryTouchPoint(event);
    if (!point) return;

    const panGesture = panGestureRef.current ?? {
      start: point,
      viewport: normalizedViewport,
    };
    panGestureRef.current = panGesture;
    setViewport(normalizeSiteOverviewViewport({
      offsetX: panGesture.viewport.offsetX + point.x - panGesture.start.x,
      offsetY: panGesture.viewport.offsetY + point.y - panGesture.start.y,
      scale: panGesture.viewport.scale,
    }, canvasSize));
  };
  const finishViewportGesture = () => {
    pinchGestureRef.current = undefined;
    panGestureRef.current = undefined;
    setViewport((currentViewport) =>
      normalizeSiteOverviewViewport(currentViewport, canvasSize));
  };
  const resetViewport = () => {
    pinchGestureRef.current = undefined;
    panGestureRef.current = undefined;
    setViewport(SITE_OVERVIEW_DEFAULT_VIEWPORT);
  };
  const toggleDistanceMeasurement = () => {
    setDistanceFeatureIds([]);
    setIsDistanceMeasurementActive((current) => !current);
  };
  const clearDistanceMeasurement = () => setDistanceFeatureIds([]);
  const handleFeaturePress = (feature: SiteOverviewFeature) => {
    if (!isDistanceMeasurementActive) {
      onOpenFeature?.(feature.document);
      return;
    }

    const featureId = feature.document.resource.id;
    setDistanceFeatureIds((currentIds) => {
      if (currentIds.length >= 2) return [featureId];
      if (currentIds[0] === featureId) return [];
      return currentIds.concat(featureId);
    });
  };

  return (
    <View style={styles.screen} testID="siteOverviewMap">
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="map" size={22} color="#f8fafc" />
          <Text style={styles.headerTitle}>현장 전체 현황</Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.headerMeta}>
            조사 경계 {boundaryPoints.length >= 3 ? 1 : 0} · 유구 {features.length}
          </Text>
          <TouchableOpacity
            accessibilityLabel="유구 중심 간 거리 측정"
            accessibilityState={{
              disabled: !canMeasureDistances,
              selected: isDistanceMeasurementActive,
            }}
            activeOpacity={0.84}
            disabled={!canMeasureDistances}
            onPress={toggleDistanceMeasurement}
            style={[
              styles.distanceMeasureButton,
              isDistanceMeasurementActive
                && styles.distanceMeasureButtonActive,
              !canMeasureDistances && styles.headerButtonDisabled,
            ]}
            testID="siteOverviewDistanceMeasure"
          >
            <MaterialIcons name="straighten" size={17} color="#f8fafc" />
            <Text style={styles.distanceMeasureButtonText}>거리</Text>
          </TouchableOpacity>
          {!!onImportDxfReference && (
            <TouchableOpacity
              accessibilityLabel="DXF 측량 배경 가져오기"
              activeOpacity={0.84}
              onPress={onImportDxfReference}
              style={styles.referenceImportButton}
              testID="siteOverviewImportDxfReference"
            >
              <MaterialIcons name="layers" size={16} color="#f8fafc" />
              <Text style={styles.referenceImportButtonText}>DXF 배경</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.mapWrap}>
        <View
          onLayout={handleCanvasLayout}
          onMoveShouldSetResponder={(event) =>
            !event || shouldHandleViewportGesture(event, normalizedViewport)}
          onMoveShouldSetResponderCapture={(event) =>
            !event || shouldHandleViewportGesture(event, normalizedViewport)}
          onResponderGrant={startViewportGesture}
          onResponderMove={moveViewportGesture}
          onResponderRelease={finishViewportGesture}
          onResponderTerminate={finishViewportGesture}
          onResponderTerminationRequest={() => false}
          onStartShouldSetResponder={(event) => !event || getTouchCount(event) >= 2}
          onStartShouldSetResponderCapture={(event) =>
            !event || getTouchCount(event) >= 2}
          style={styles.canvas}
          testID="siteOverviewCanvas"
        >
          <View style={styles.northBand}>
            <Text style={styles.northText}>N</Text>
          </View>
          <View
            pointerEvents="box-none"
            style={[
              styles.mapContent,
              getViewportTransformStyle(normalizedViewport),
            ]}
            testID="siteOverviewMapContent"
          >
            <View style={styles.gridVertical} />
            <View style={styles.gridHorizontal} />
            {referenceLines.flatMap((line, index) => toLineSegments({
              canvasSize,
              closePath: false,
              color: '#64748b',
              keyPrefix: `reference-${index}`,
              opacity: 0.48,
              points: line,
              testID: 'siteOverviewReferenceLine',
              width: 1,
            }))}
            {boundaryPoints.length >= 3 ? (
              <>
                {toLineSegments({
                  canvasSize,
                  closePath: true,
                  color: '#175cd3',
                  keyPrefix: 'site-boundary',
                  points: boundaryPoints,
                  testID: 'siteOverviewBoundaryLine',
                  width: 3,
                })}
                {boundaryPoints.map((point, index) => (
                  <View
                    key={`site-boundary-point-${index}`}
                    pointerEvents="none"
                    style={[styles.boundaryPoint, getPointPercentStyle(point)]}
                    testID={`siteOverviewBoundaryPoint_${index}`}
                  />
                ))}
              </>
            ) : (
              <EmptyOverlay text="조사 경계 없음" />
            )}
            {isDistanceMeasurementActive
              && distanceStartFeature
              && distanceEndFeature
              && toLineSegments({
                canvasSize,
                closePath: false,
                color: '#0f766e',
                keyPrefix: 'feature-distance',
                opacity: 0.9,
                points: [
                  distanceStartFeature.sketch.center,
                  distanceEndFeature.sketch.center,
                ],
                testID: 'siteOverviewDistanceLine',
                width: 3,
              })}
            {features.map((feature, index) => (
              <FeatureOverlay
                canvasSize={canvasSize}
                feature={feature}
                index={index}
                isDistanceMeasurementActive={isDistanceMeasurementActive}
                key={feature.document.resource.id}
                measurementOrder={getMeasurementOrder(
                  feature,
                  distanceStartFeature,
                  distanceEndFeature
                )}
                onPressFeature={isDistanceMeasurementActive || onOpenFeature
                  ? handleFeaturePress
                  : undefined}
              />
            ))}
            {features.length === 0 && boundaryPoints.length >= 3 && (
              <EmptyOverlay text="추가된 유구 없음" />
            )}
          </View>
          {isDistanceMeasurementActive && (
            <DistanceMeasurementPanel
              distanceMeters={distanceMeters}
              endFeature={distanceEndFeature}
              onClear={clearDistanceMeasurement}
              startFeature={distanceStartFeature}
            />
          )}
          {normalizedViewport.scale > SITE_OVERVIEW_MIN_SCALE && (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={resetViewport}
              style={styles.zoomResetButton}
              testID="siteOverviewZoomReset"
            >
              <MaterialIcons name="zoom-out-map" size={16} color="#175cd3" />
              <Text style={styles.zoomResetText}>
                {`${Math.round(normalizedViewport.scale * 100)}%`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const FeatureOverlay: React.FC<{
  canvasSize: CanvasSize;
  feature: SiteOverviewFeature;
  index: number;
  isDistanceMeasurementActive: boolean;
  measurementOrder?: 1 | 2;
  onPressFeature?: (feature: SiteOverviewFeature) => void;
}> = ({
  canvasSize,
  feature,
  index,
  isDistanceMeasurementActive,
  measurementOrder,
  onPressFeature,
}) => {
  const { sketch } = feature;
  const labelCenter = getFeatureLabelCenter(sketch);

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={isDistanceMeasurementActive
          ? (measurementOrder
            ? `${feature.label} 거리 측정 ${measurementOrder}번 유구`
            : `${feature.label} 거리 측정 선택`)
          : `${feature.label} 유구 정보 열기`}
        activeOpacity={0.84}
        disabled={!onPressFeature}
        onPress={() => onPressFeature?.(feature)}
        style={getFeatureHitTargetStyle(sketch, canvasSize)}
        testID={`siteOverviewFeatureHitTarget_${feature.document.resource.id}`}
      />
      {renderFeatureSketchShape(feature, canvasSize)}
      <TouchableOpacity
        activeOpacity={0.86}
        disabled={!onPressFeature}
        onPress={() => onPressFeature?.(feature)}
        style={[styles.featureLabel, getLabelStyle(labelCenter)]}
        testID={`siteOverviewFeatureLabel_${feature.document.resource.id}`}
      >
        <Text style={styles.featureLabelIndex}>{index + 1}</Text>
        <View style={styles.featureLabelTextWrap}>
          <Text style={styles.featureLabelText} numberOfLines={1}>
            {feature.label}
          </Text>
          {!!feature.typeLabel && (
            <Text style={styles.featureTypeText} numberOfLines={1}>
              {feature.typeLabel}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {!!measurementOrder && (
        <View
          pointerEvents="none"
          style={[
            styles.distanceFeatureMarker,
            getPointPercentStyle(sketch.center),
          ]}
          testID={`siteOverviewDistanceMarker_${measurementOrder}`}
        >
          <Text style={styles.distanceFeatureMarkerText}>
            {measurementOrder}
          </Text>
        </View>
      )}
    </>
  );
};

const DistanceMeasurementPanel: React.FC<{
  distanceMeters?: number;
  endFeature?: SiteOverviewFeature;
  onClear: () => void;
  startFeature?: SiteOverviewFeature;
}> = ({
  distanceMeters,
  endFeature,
  onClear,
  startFeature,
}) => {
  const isComplete = !!startFeature
    && !!endFeature
    && distanceMeters !== undefined;
  const text = !startFeature
    ? '거리 측정 · 첫 유구 선택'
    : !endFeature
      ? `${startFeature.label} · 두 번째 유구 선택`
      : distanceMeters === undefined
        ? '거리 계산 불가'
        : `${startFeature.label} ↔ ${endFeature.label} · 중심 간 약 ${formatDistanceMeters(distanceMeters)} m`;

  return (
    <View
      style={styles.distanceStatus}
      testID={isComplete
        ? 'siteOverviewDistanceResult'
        : 'siteOverviewDistanceStatus'}
    >
      <MaterialIcons name="straighten" size={18} color="#0f766e" />
      <Text numberOfLines={2} style={styles.distanceStatusText}>
        {text}
      </Text>
      {!!startFeature && (
        <TouchableOpacity
          accessibilityLabel="거리 측정 선택 초기화"
          onPress={onClear}
          style={styles.distanceClearButton}
          testID="siteOverviewDistanceClear"
        >
          <MaterialIcons name="close" size={18} color="#475467" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const getMeasurementOrder = (
  feature: SiteOverviewFeature,
  startFeature?: SiteOverviewFeature,
  endFeature?: SiteOverviewFeature
): 1 | 2 | undefined => {
  if (feature.document.resource.id === startFeature?.document.resource.id) {
    return 1;
  }
  if (feature.document.resource.id === endFeature?.document.resource.id) {
    return 2;
  }

  return undefined;
};

const renderFeatureSketchShape = (
  feature: SiteOverviewFeature,
  canvasSize: CanvasSize
) => {
  const { document, sketch } = feature;
  const testID = `siteOverviewFeatureShape_${document.resource.id}`;

  if (
    sketch.shape === 'rectangle'
    || sketch.shape === 'circle'
    || sketch.shape === 'oval'
  ) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.featureShape,
          (sketch.shape === 'oval' || sketch.shape === 'circle')
            && styles.featureShapeOval,
          getFeatureShapeFrame(sketch, canvasSize),
        ]}
        testID={testID}
      >
        <View style={styles.featureShapeCenter} />
      </View>
    );
  }

  const points = getVisibleFeatureSketchPoints(sketch);

  return (
    <>
      {sketch.shape === 'polygon' && toLineSegments({
        canvasSize,
        closePath: points.length > 2,
        color: '#f97316',
        keyPrefix: `${testID}-line`,
        points,
        testID,
        width: 3,
      })}
      {points.map((point, index) => (
        <View
          key={`${testID}-point-${index}-${point.x}-${point.y}`}
          pointerEvents="none"
          style={[styles.featurePoint, getPointPercentStyle(point)]}
          testID={`${testID}_${index}`}
        >
          <Text style={styles.featurePointText}>{index + 1}</Text>
        </View>
      ))}
    </>
  );
};

const EmptyOverlay: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.emptyOverlay} pointerEvents="none">
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const shouldHandleViewportGesture = (
  event: GestureResponderEvent,
  viewport: SiteOverviewViewport
): boolean =>
  getTouchCount(event) >= 2 || viewport.scale > SITE_OVERVIEW_MIN_SCALE;

const getViewportTransformStyle = (
  viewport: SiteOverviewViewport
): ViewStyle => ({
  transform: [
    { translateX: viewport.offsetX },
    { translateY: viewport.offsetY },
    { scale: viewport.scale },
  ],
});

const normalizeSiteOverviewViewport = (
  viewport: SiteOverviewViewport,
  canvasSize: CanvasSize
): SiteOverviewViewport => {
  const scale = clamp(
    viewport.scale,
    SITE_OVERVIEW_MIN_SCALE,
    SITE_OVERVIEW_MAX_SCALE
  );
  if (scale <= SITE_OVERVIEW_MIN_SCALE) return SITE_OVERVIEW_DEFAULT_VIEWPORT;

  const maxOffsetX = (canvasSize.width * (scale - 1)) / 2;
  const maxOffsetY = (canvasSize.height * (scale - 1)) / 2;

  return {
    offsetX: clamp(viewport.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(viewport.offsetY, -maxOffsetY, maxOffsetY),
    scale,
  };
};

const getSiteOverviewTouchGesture = (
  event: GestureResponderEvent | undefined
): {
  center: PixelPoint;
  distance: number;
} | undefined => {
  const touches = getNativeTouches(event);
  if (touches.length < 2) return undefined;

  const first = touches[0];
  const second = touches[1];

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

const getPrimaryTouchPoint = (
  event: GestureResponderEvent | undefined
): PixelPoint | undefined =>
  getNativeTouches(event)[0];

const getTouchCount = (event: GestureResponderEvent | undefined): number =>
  getNativeTouches(event).length;

const getNativeTouches = (
  event: GestureResponderEvent | undefined
): PixelPoint[] => {
  if (!event) return [];

  const nativeEvent = event.nativeEvent as unknown as {
    changedTouches?: TouchPointCandidate[];
    locationX?: number;
    locationY?: number;
    touches?: TouchPointCandidate[];
  };
  const touches = (nativeEvent.touches?.length
    ? nativeEvent.touches
    : nativeEvent.changedTouches) ?? [];
  const normalizedTouches = touches
    .map(normalizeTouchPoint)
    .filter((point): point is PixelPoint => !!point);

  if (normalizedTouches.length > 0) return normalizedTouches;

  if (
    Number.isFinite(nativeEvent.locationX)
    && Number.isFinite(nativeEvent.locationY)
  ) {
    return [{
      x: nativeEvent.locationX as number,
      y: nativeEvent.locationY as number,
    }];
  }

  return [];
};

interface TouchPointCandidate {
  locationX?: number;
  locationY?: number;
  x?: number;
  y?: number;
}

const normalizeTouchPoint = (
  touch: TouchPointCandidate
): PixelPoint | undefined => {
  const x = touch.locationX ?? touch.x;
  const y = touch.locationY ?? touch.y;

  return Number.isFinite(x) && Number.isFinite(y)
    ? { x: x as number, y: y as number }
    : undefined;
};

const getSiteOverviewFeatures = (
  documents: readonly Document[],
  boundaryFrame?: SketchFrame
): SiteOverviewFeature[] =>
  documents
    .filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE)
    .map((document): SiteOverviewFeature | undefined => {
      const resource = document.resource as Record<string, unknown>;
      const sketch = normalizeFeatureLocationSketch(
        resource.featureLocationSketch,
        boundaryFrame
      );
      if (!sketch) return undefined;
      const typeLabel = getKoreanFieldworkFeatureTypeLabel(resource.featureType);

      return {
        document,
        label: getKoreanFieldworkDisplayIdentifier(document.resource.identifier)
          || document.resource.id,
        sketch,
        ...(typeLabel ? { typeLabel } : {}),
      };
    })
    .filter((feature): feature is SiteOverviewFeature => !!feature);

const getApproximateFeatureDistanceMeters = (
  startFeature: SiteOverviewFeature | undefined,
  endFeature: SiteOverviewFeature | undefined,
  boundaryProjection: BoundaryProjection
): number | undefined => {
  if (!startFeature || !endFeature) return undefined;

  const startCoordinate = getCoordinateForSketchPoint(
    startFeature.sketch.center,
    boundaryProjection
  );
  const endCoordinate = getCoordinateForSketchPoint(
    endFeature.sketch.center,
    boundaryProjection
  );
  if (!startCoordinate || !endCoordinate) return undefined;

  const startWgs84 = boundaryProjection.usesWgs84Coordinates
    ? { latitude: startCoordinate[1], longitude: startCoordinate[0] }
    : projectMapCoordinateToWgs84(startCoordinate);
  const endWgs84 = boundaryProjection.usesWgs84Coordinates
    ? { latitude: endCoordinate[1], longitude: endCoordinate[0] }
    : projectMapCoordinateToWgs84(endCoordinate);
  if (!startWgs84 || !endWgs84) return undefined;

  return getHaversineDistanceMeters(startWgs84, endWgs84);
};

const getCoordinateForSketchPoint = (
  point: SketchPoint,
  boundaryProjection: BoundaryProjection
): number[] | undefined => {
  const { coordinateBounds, frame } = boundaryProjection;
  if (!coordinateBounds || !frame || frame.width <= 0 || frame.height <= 0) {
    return undefined;
  }

  const normalizedX = clamp((point.x - frame.minX) / frame.width, 0, 1);
  const normalizedY = clamp((point.y - frame.minY) / frame.height, 0, 1);

  return [
    coordinateBounds.minX
      + (normalizedX * (coordinateBounds.maxX - coordinateBounds.minX)),
    coordinateBounds.maxY
      - (normalizedY * (coordinateBounds.maxY - coordinateBounds.minY)),
  ];
};

const getHaversineDistanceMeters = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number => {
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const haversine = (Math.sin(latitudeDelta / 2) ** 2)
    + (Math.cos(startLatitude) * Math.cos(endLatitude)
      * (Math.sin(longitudeDelta / 2) ** 2));
  const normalizedHaversine = clamp(haversine, 0, 1);

  return EARTH_RADIUS_METERS
    * 2
    * Math.atan2(
      Math.sqrt(normalizedHaversine),
      Math.sqrt(1 - normalizedHaversine)
    );
};

const formatDistanceMeters = (distanceMeters: number): string =>
  distanceMeters < 10
    ? distanceMeters.toFixed(1)
    : Math.round(distanceMeters).toLocaleString('ko-KR');

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const getSiteOverviewReferenceLines = (
  documents: readonly Document[],
  boundaryProjection: BoundaryProjection
): SketchPoint[][] => {
  const { coordinateBounds, frame } = boundaryProjection;
  if (!coordinateBounds || !frame) return [];

  const projectedLines = documents
    .filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY)
    .flatMap((document) => getReferenceVectorCoordinateLines(
      (document.resource as Record<string, unknown>)[REFERENCE_VECTOR_FIELDS.geometry]
    ))
    .map((line) => line.map((coordinate) =>
      projectCoordinateToBoundaryFrame(coordinate, coordinateBounds, frame)))
    .filter((line) => line.length >= 2);

  return limitReferenceSegments(projectedLines);
};

const getReferenceVectorCoordinateLines = (value: unknown): number[][][] => {
  const rawGeometry = typeof value === 'string' ? parseJsonObject(value) : value;
  if (!isRecord(rawGeometry)) return [];

  if (rawGeometry.type === 'LineString') {
    const line = getNumericCoordinatePairs(rawGeometry.coordinates);
    return line.length >= 2 ? [line] : [];
  }
  if (
    rawGeometry.type !== 'MultiLineString'
    || !Array.isArray(rawGeometry.coordinates)
  ) {
    return [];
  }

  return rawGeometry.coordinates
    .map(getNumericCoordinatePairs)
    .filter((line) => line.length >= 2);
};

const projectCoordinateToBoundaryFrame = (
  coordinate: number[],
  bounds: CoordinateBounds,
  frame: SketchFrame
): SketchPoint => ({
  x: frame.minX + (
    ((coordinate[0] - bounds.minX) / Math.max(bounds.maxX - bounds.minX, 0.000001))
    * frame.width
  ),
  y: frame.minY + (
    ((bounds.maxY - coordinate[1]) / Math.max(bounds.maxY - bounds.minY, 0.000001))
    * frame.height
  ),
});

const limitReferenceSegments = (lines: SketchPoint[][]): SketchPoint[][] => {
  const segmentCount = lines.reduce(
    (sum, line) => sum + Math.max(0, line.length - 1),
    0
  );
  if (segmentCount <= MAX_REFERENCE_SEGMENTS) return lines;

  const stride = Math.ceil(segmentCount / MAX_REFERENCE_SEGMENTS);
  const sampledSegments: SketchPoint[][] = [];
  let segmentIndex = 0;
  lines.forEach((line) => {
    for (let index = 1; index < line.length; index += 1) {
      if (segmentIndex % stride === 0) {
        sampledSegments.push([line[index - 1], line[index]]);
      }
      segmentIndex += 1;
    }
  });

  return sampledSegments;
};

const normalizeFeatureLocationSketch = (
  value: unknown,
  boundaryFrame?: SketchFrame
): FeatureLocationSketch | undefined => {
  const rawValue = typeof value === 'string' ? parseJsonObject(value) : value;
  if (!isRecord(rawValue)) return undefined;

  const shapeValue = rawValue.shape;
  const shape = typeof shapeValue === 'string'
    && VALID_FEATURE_SHAPES.has(shapeValue as FeatureLocationSketchShape)
    ? shapeValue as FeatureLocationSketchShape
    : 'point';
  const center = normalizeSketchPoint(rawValue.center) ?? { x: 50, y: 50 };
  const points = Array.isArray(rawValue.points)
    ? rawValue.points
      .map(normalizeSketchPoint)
      .filter((point): point is SketchPoint => !!point)
    : [];

  return {
    center: projectStoredSketchPointToBoundaryFrame(center, boundaryFrame),
    isClosed: rawValue.isClosed === true,
    points: points.map((point) =>
      projectStoredSketchPointToBoundaryFrame(point, boundaryFrame)),
    rotation: normalizeNumber(rawValue.rotation, 0),
    scale: clamp(
      normalizeNumber(rawValue.scale, 100),
      FEATURE_SHAPE_MIN_SCALE,
      FEATURE_SHAPE_MAX_SCALE
    ),
    shape,
  };
};

const getSurveyBoundaryProjection = (
  documents: readonly Document[],
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined,
  canvasSize: CanvasSize
): BoundaryProjection => {
  const boundaryDocument = documents.find((candidate) =>
    candidate.resource.category === KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY
    && getBoundaryCoordinatePairs(candidate.resource.geometry).length >= 3
  );
  if (boundaryDocument) {
    return projectCoordinatePairsToBoundaryFrame(
      getBoundaryCoordinatePairs(boundaryDocument.resource.geometry),
      canvasSize
    );
  }

  return projectCoordinatePairsToBoundaryFrame(
    getBoundaryDraftCoordinatePairs(boundaryDraft),
    canvasSize
  );
};

const getBoundaryDraftCoordinatePairs = (
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): number[][] => {
  if (!boundaryDraft || boundaryDraft.coordinates.length < 3) return [];

  return boundaryDraft.coordinates.map((point) => [
    point.longitude,
    point.latitude,
  ]);
};

const getBoundaryCoordinatePairs = (geometry: unknown): number[][] => {
  const rawGeometry = typeof geometry === 'string'
    ? parseJsonObject(geometry)
    : geometry;
  if (!isRecord(rawGeometry)) return [];

  if (rawGeometry.type === 'LineString') {
    return getNumericCoordinatePairs(rawGeometry.coordinates);
  }

  if (rawGeometry.type === 'Polygon' && Array.isArray(rawGeometry.coordinates)) {
    return getNumericCoordinatePairs(rawGeometry.coordinates[0]);
  }

  return [];
};

const getNumericCoordinatePairs = (value: unknown): number[][] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((coordinate): coordinate is unknown[] =>
      Array.isArray(coordinate) && coordinate.length >= 2)
    .map((coordinate) => [coordinate[0], coordinate[1]])
    .filter((coordinate): coordinate is number[] =>
      typeof coordinate[0] === 'number'
      && Number.isFinite(coordinate[0])
      && typeof coordinate[1] === 'number'
      && Number.isFinite(coordinate[1]));
};

const projectCoordinatePairsToBoundaryFrame = (
  coordinatePairs: number[][],
  canvasSize: CanvasSize
): BoundaryProjection => {
  const openPairs = getOpenCoordinatePairs(coordinatePairs);
  if (openPairs.length < 3) return { points: [] };

  const xs = openPairs.map((coordinate) => coordinate[0]);
  const ys = openPairs.map((coordinate) => coordinate[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = Math.max(maxX - minX, 0.000001);
  const yRange = Math.max(maxY - minY, 0.000001);
  const frame = getAspectPreservingBoundaryFrame(
    openPairs,
    xRange,
    yRange,
    canvasSize
  );

  return {
    coordinateBounds: { maxX, maxY, minX, minY },
    frame,
    points: openPairs.map((coordinate) => ({
      x: frame.minX + (((coordinate[0] - minX) / xRange) * frame.width),
      y: frame.minY + (((maxY - coordinate[1]) / yRange) * frame.height),
    })),
    usesWgs84Coordinates: areWgs84CoordinatePairs(openPairs),
  };
};

const getAspectPreservingBoundaryFrame = (
  coordinatePairs: number[][],
  xRange: number,
  yRange: number,
  canvasSize: CanvasSize
): SketchFrame => {
  const drawableSize = 100 - (BOUNDARY_PADDING * 2);
  const canvasAspectRatio = getCanvasAspectRatio(canvasSize);
  const coordinateAspectRatio =
    getCoordinateRangeAspectRatio(coordinatePairs, xRange, yRange);
  const percentAspectRatio = coordinateAspectRatio / canvasAspectRatio;
  const width = percentAspectRatio >= 1
    ? drawableSize
    : drawableSize * percentAspectRatio;
  const height = percentAspectRatio >= 1
    ? drawableSize / percentAspectRatio
    : drawableSize;

  return {
    height,
    minX: 50 - (width / 2),
    minY: 50 - (height / 2),
    width,
  };
};

const getCoordinateRangeAspectRatio = (
  coordinatePairs: number[][],
  xRange: number,
  yRange: number
): number => {
  if (areWgs84CoordinatePairs(coordinatePairs)) {
    const averageLatitude = coordinatePairs.reduce(
      (sum, coordinate) => sum + coordinate[1],
      0
    ) / coordinatePairs.length;
    const longitudeScale = Math.max(
      Math.cos((averageLatitude * Math.PI) / 180),
      0.000001
    );

    return (xRange * longitudeScale) / yRange;
  }

  return xRange / yRange;
};

const areWgs84CoordinatePairs = (coordinatePairs: number[][]): boolean =>
  coordinatePairs.every((coordinate) =>
    coordinate[0] >= -180
    && coordinate[0] <= 180
    && coordinate[1] >= -90
    && coordinate[1] <= 90);

const getCanvasAspectRatio = (canvasSize: CanvasSize): number => {
  if (canvasSize.width > 0 && canvasSize.height > 0) {
    return canvasSize.width / canvasSize.height;
  }

  return CANVAS_DEFAULT_SIZE.width / CANVAS_DEFAULT_SIZE.height;
};

const projectStoredSketchPointToBoundaryFrame = (
  point: SketchPoint,
  boundaryFrame?: SketchFrame
): SketchPoint => {
  if (!boundaryFrame) return point;

  const drawableSize = 100 - (BOUNDARY_PADDING * 2);
  const normalizedX = clamp((point.x - BOUNDARY_PADDING) / drawableSize, 0, 1);
  const normalizedY = clamp((point.y - BOUNDARY_PADDING) / drawableSize, 0, 1);

  return {
    x: boundaryFrame.minX + (normalizedX * boundaryFrame.width),
    y: boundaryFrame.minY + (normalizedY * boundaryFrame.height),
  };
};

const getOpenCoordinatePairs = (coordinatePairs: number[][]): number[][] => {
  if (coordinatePairs.length < 2) return coordinatePairs;

  const first = coordinatePairs[0];
  const last = coordinatePairs[coordinatePairs.length - 1];

  return first[0] === last[0] && first[1] === last[1]
    ? coordinatePairs.slice(0, -1)
    : coordinatePairs;
};

const toLineSegments = ({
  canvasSize,
  closePath,
  color,
  keyPrefix,
  opacity = 0.94,
  points,
  testID,
  width,
}: {
  canvasSize: CanvasSize;
  closePath: boolean;
  color: string;
  keyPrefix: string;
  opacity?: number;
  points: SketchPoint[];
  testID: string;
  width: number;
}) => {
  if (points.length < 2) return [];

  const segmentStartPoints = closePath ? points : points.slice(0, -1);

  return segmentStartPoints.map((point, index) => (
    <SketchLineSegment
      color={color}
      end={denormalizePoint(points[(index + 1) % points.length], canvasSize)}
      key={`${keyPrefix}-${index}`}
      opacity={opacity}
      start={denormalizePoint(point, canvasSize)}
      testID={testID}
      width={width}
    />
  ));
};

const SketchLineSegment: React.FC<{
  color: string;
  end: PixelPoint;
  opacity: number;
  start: PixelPoint;
  testID: string;
  width: number;
}> = ({
  color,
  end,
  opacity,
  start,
  testID,
  width,
}) => {
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
        opacity,
        position: 'absolute',
        top: ((start.y + end.y) / 2) - (width / 2),
        transform: [{ rotateZ: `${angle}rad` }],
        width: distance,
      }}
      testID={testID}
    />
  );
};

const getFeatureShapeFrame = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize
): ViewStyle => {
  const center = denormalizePoint(sketch.center, canvasSize);
  const { height, width } = getFeatureShapeDimensions(sketch, canvasSize);

  return {
    height,
    left: center.x - (width / 2),
    top: center.y - (height / 2),
    transform: [{ rotateZ: `${normalizeRotation(sketch.rotation)}deg` }],
    width,
  };
};

const getFeatureShapeDimensions = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize
): { height: number; width: number } => {
  if (sketch.shape === 'circle') {
    const diameter = clamp(
      ((FEATURE_SHAPE_BASE_WIDTH * sketch.scale) / 100 / 100)
        * Math.min(canvasSize.width, canvasSize.height),
      FEATURE_MIN_SIZE,
      Math.min(canvasSize.width, canvasSize.height) * 0.72
    );

    return { height: diameter, width: diameter };
  }

  return {
    width: clamp(
      ((FEATURE_SHAPE_BASE_WIDTH * sketch.scale) / 100 / 100)
        * canvasSize.width,
      FEATURE_MIN_SIZE,
      canvasSize.width * 0.72
    ),
    height: clamp(
      ((FEATURE_SHAPE_BASE_HEIGHT * sketch.scale) / 100 / 100)
        * canvasSize.height,
      FEATURE_MIN_SIZE,
      canvasSize.height * 0.72
    ),
  };
};

const getFeatureHitTargetStyle = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize
): ViewStyle => {
  const points = getVisibleFeatureSketchPoints(sketch)
    .map((point) => denormalizePoint(point, canvasSize));
  const center = denormalizePoint(sketch.center, canvasSize);
  let targetCenter = center;
  let contentWidth = 0;
  let contentHeight = 0;

  if (
    sketch.shape === 'rectangle'
    || sketch.shape === 'circle'
    || sketch.shape === 'oval'
  ) {
    const dimensions = getFeatureShapeDimensions(sketch, canvasSize);
    contentWidth = dimensions.width;
    contentHeight = dimensions.height;
  } else if (points.length > 1) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    targetCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    contentWidth = maxX - minX;
    contentHeight = maxY - minY;
  }

  const width = Math.max(FEATURE_HIT_TARGET_MIN_SIZE, contentWidth + 16);
  const height = Math.max(FEATURE_HIT_TARGET_MIN_SIZE, contentHeight + 16);

  return {
    height,
    left: targetCenter.x - (width / 2),
    position: 'absolute',
    top: targetCenter.y - (height / 2),
    width,
    zIndex: 12,
  };
};

const getFeatureLabelCenter = (
  sketch: FeatureLocationSketch
): SketchPoint => {
  const points = getVisibleFeatureSketchPoints(sketch);
  if (points.length === 0) return sketch.center;

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
};

const getVisibleFeatureSketchPoints = (
  sketch: FeatureLocationSketch
): SketchPoint[] => {
  if (sketch.shape === 'polygon') return sketch.points;
  return sketch.points.length > 0 ? sketch.points : [sketch.center];
};

const getLabelStyle = (point: SketchPoint): ViewStyle => ({
  left: toPercent(clamp(point.x, 9, 91)),
  top: toPercent(clamp(point.y, 9, 91)),
  transform: [
    { translateX: -(FEATURE_LABEL_WIDTH / 2) },
    { translateY: -(FEATURE_LABEL_HEIGHT + 10) },
  ],
});

const getPointPercentStyle = (point: SketchPoint): ViewStyle => ({
  left: toPercent(point.x),
  top: toPercent(point.y),
});

const denormalizePoint = (
  point: SketchPoint,
  canvasSize: CanvasSize
): PixelPoint => ({
  x: (point.x / 100) * canvasSize.width,
  y: (point.y / 100) * canvasSize.height,
});

const normalizeSketchPoint = (value: unknown): SketchPoint | undefined => {
  if (!isRecord(value)) return undefined;

  const x = normalizePercent(value.x);
  const y = normalizePercent(value.y);

  return x === undefined || y === undefined ? undefined : { x, y };
};

const normalizePercent = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : undefined;

const normalizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeRotation = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const parseJsonObject = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const toPercent = (value: number): DimensionValue =>
  `${value}%` as DimensionValue;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#eef2f4',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#27343b',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  headerTitleRow: {
    alignItems: 'center',
    flexShrink: 1,
    flexDirection: 'row',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
  },
  headerMeta: {
    color: '#c7d7d2',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 2,
  },
  mapWrap: {
    flex: 1,
    padding: 14,
  },
  canvas: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapContent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  northBand: {
    alignItems: 'center',
    backgroundColor: '#eef4ff',
    borderBottomColor: '#d6e4ff',
    borderBottomWidth: 1,
    height: 24,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  northText: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
  },
  distanceMeasureButton: {
    alignItems: 'center',
    borderColor: '#8ca8a2',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  distanceMeasureButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#5eead4',
  },
  distanceMeasureButtonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  headerButtonDisabled: {
    opacity: 0.42,
  },
  referenceImportButton: {
    alignItems: 'center',
    borderColor: '#8ca8a2',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  referenceImportButtonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  gridVertical: {
    backgroundColor: '#eef2f6',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 24,
    width: 1,
  },
  gridHorizontal: {
    backgroundColor: '#eef2f6',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  boundaryPoint: {
    backgroundColor: '#175cd3',
    borderColor: '#ffffff',
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    position: 'absolute',
    width: 10,
  },
  featureShape: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderColor: '#f97316',
    borderRadius: 5,
    borderWidth: 3,
    justifyContent: 'center',
    position: 'absolute',
  },
  featureShapeOval: {
    borderRadius: 999,
  },
  featureShapeCenter: {
    backgroundColor: '#f97316',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  featurePoint: {
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderColor: '#ffffff',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    marginLeft: -11,
    marginTop: -11,
    position: 'absolute',
    width: 22,
  },
  featurePointText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  featureLabel: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#f97316',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: FEATURE_LABEL_HEIGHT,
    paddingHorizontal: 7,
    position: 'absolute',
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: FEATURE_LABEL_WIDTH,
    zIndex: 20,
  },
  featureLabelIndex: {
    backgroundColor: '#f97316',
    borderRadius: 9,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    height: 18,
    lineHeight: 18,
    marginRight: 5,
    textAlign: 'center',
    width: 18,
  },
  featureLabelTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  featureLabelText: {
    color: '#7c2d12',
    fontSize: 12,
    fontWeight: '900',
  },
  featureTypeText: {
    color: '#9a3412',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  distanceFeatureMarker: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginLeft: -12,
    marginTop: -12,
    position: 'absolute',
    width: 24,
    zIndex: 24,
  },
  distanceFeatureMarkerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  distanceStatus: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#5ba89e',
    borderRadius: 6,
    borderWidth: 1,
    bottom: 10,
    flexDirection: 'row',
    left: 10,
    maxWidth: '78%',
    minHeight: 38,
    paddingLeft: 10,
    position: 'absolute',
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    zIndex: 40,
  },
  distanceStatusText: {
    color: '#134e4a',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 6,
    paddingVertical: 7,
  },
  distanceClearButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginLeft: 4,
    width: 36,
  },
  emptyOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 24,
  },
  emptyText: {
    color: '#98a2b3',
    fontSize: 16,
    fontWeight: '900',
  },
  zoomResetButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    bottom: 10,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 9,
    position: 'absolute',
    right: 10,
    zIndex: 40,
  },
  zoomResetText: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
});

export default KoreanFieldworkSiteOverviewMap;
