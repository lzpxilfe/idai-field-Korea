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

type FeatureLocationSketchShape = 'point' | 'polygon' | 'rectangle' | 'oval';

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
  'oval',
]);

const KoreanFieldworkSiteOverviewMap: React.FC<Props> = ({
  boundaryDraft,
  documents,
  onOpenFeature,
}) => {
  const [canvasSize, setCanvasSize] = useState(CANVAS_DEFAULT_SIZE);
  const [viewport, setViewport] = useState(SITE_OVERVIEW_DEFAULT_VIEWPORT);
  const pinchGestureRef = useRef<SiteOverviewPinchGesture>();
  const panGestureRef = useRef<SiteOverviewPanGesture>();
  const boundaryPoints = useMemo(
    () => getSurveyBoundaryPoints(documents, boundaryDraft),
    [boundaryDraft, documents]
  );
  const features = useMemo(
    () => getSiteOverviewFeatures(documents),
    [documents]
  );
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

  return (
    <View style={styles.screen} testID="siteOverviewMap">
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="map" size={22} color="#f8fafc" />
          <Text style={styles.headerTitle}>현장 전체 현황</Text>
        </View>
        <Text style={styles.headerMeta}>
          조사 경계 {boundaryPoints.length >= 3 ? 1 : 0} · 유구 {features.length}
        </Text>
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
            {features.map((feature, index) => (
              <FeatureOverlay
                canvasSize={canvasSize}
                feature={feature}
                index={index}
                key={feature.document.resource.id}
                onOpenFeature={onOpenFeature}
              />
            ))}
            {features.length === 0 && boundaryPoints.length >= 3 && (
              <EmptyOverlay text="추가된 유구 없음" />
            )}
          </View>
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
  onOpenFeature?: (document: Document) => void;
}> = ({
  canvasSize,
  feature,
  index,
  onOpenFeature,
}) => {
  const { sketch } = feature;
  const labelCenter = getFeatureLabelCenter(sketch);

  return (
    <>
      {renderFeatureSketchShape(feature, canvasSize)}
      <TouchableOpacity
        activeOpacity={0.86}
        disabled={!onOpenFeature}
        onPress={() => onOpenFeature?.(feature.document)}
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
    </>
  );
};

const renderFeatureSketchShape = (
  feature: SiteOverviewFeature,
  canvasSize: CanvasSize
) => {
  const { document, sketch } = feature;
  const testID = `siteOverviewFeatureShape_${document.resource.id}`;

  if (sketch.shape === 'rectangle' || sketch.shape === 'oval') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.featureShape,
          sketch.shape === 'oval' && styles.featureShapeOval,
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
  documents: readonly Document[]
): SiteOverviewFeature[] =>
  documents
    .filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE)
    .map((document) => {
      const resource = document.resource as Record<string, unknown>;
      const sketch = normalizeFeatureLocationSketch(resource.featureLocationSketch);
      if (!sketch) return undefined;

      return {
        document,
        label: getKoreanFieldworkDisplayIdentifier(document.resource.identifier)
          || document.resource.id,
        sketch,
        typeLabel: getKoreanFieldworkFeatureTypeLabel(resource.featureType),
      };
    })
    .filter((feature): feature is SiteOverviewFeature => !!feature);

const normalizeFeatureLocationSketch = (
  value: unknown
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
    center,
    isClosed: rawValue.isClosed === true,
    points,
    rotation: normalizeNumber(rawValue.rotation, 0),
    scale: clamp(
      normalizeNumber(rawValue.scale, 100),
      FEATURE_SHAPE_MIN_SCALE,
      FEATURE_SHAPE_MAX_SCALE
    ),
    shape,
  };
};

const getSurveyBoundaryPoints = (
  documents: readonly Document[],
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): SketchPoint[] => {
  const boundaryDocument = documents.find((candidate) =>
    candidate.resource.category === KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY
    && getBoundaryCoordinatePairs(candidate.resource.geometry).length >= 3
  );
  if (boundaryDocument) {
    return normalizeCoordinatePairs(
      getBoundaryCoordinatePairs(boundaryDocument.resource.geometry)
    );
  }

  return getBoundaryDraftSketchPoints(boundaryDraft);
};

const getBoundaryDraftSketchPoints = (
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): SketchPoint[] => {
  if (!boundaryDraft || boundaryDraft.coordinates.length < 3) return [];

  const coordinatePairs = boundaryDraft.coordinates.map((point) => [
    point.longitude,
    point.latitude,
  ]);

  return normalizeCoordinatePairs(coordinatePairs);
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

const normalizeCoordinatePairs = (
  coordinatePairs: number[][]
): SketchPoint[] => {
  const openPairs = getOpenCoordinatePairs(coordinatePairs);
  if (openPairs.length < 3) return [];

  const xs = openPairs.map((coordinate) => coordinate[0]);
  const ys = openPairs.map((coordinate) => coordinate[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = Math.max(maxX - minX, 0.000001);
  const yRange = Math.max(maxY - minY, 0.000001);
  const drawableSize = 100 - (BOUNDARY_PADDING * 2);

  return openPairs.map((coordinate) => ({
    x: BOUNDARY_PADDING + (((coordinate[0] - minX) / xRange) * drawableSize),
    y: BOUNDARY_PADDING + (((maxY - coordinate[1]) / yRange) * drawableSize),
  }));
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
  points,
  testID,
  width,
}: {
  canvasSize: CanvasSize;
  closePath: boolean;
  color: string;
  keyPrefix: string;
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
      start={denormalizePoint(point, canvasSize)}
      testID={testID}
      width={width}
    />
  ));
};

const SketchLineSegment: React.FC<{
  color: string;
  end: PixelPoint;
  start: PixelPoint;
  testID: string;
  width: number;
}> = ({
  color,
  end,
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
        opacity: 0.94,
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
  const width = clamp(
    ((FEATURE_SHAPE_BASE_WIDTH * sketch.scale) / 100 / 100) * canvasSize.width,
    FEATURE_MIN_SIZE,
    canvasSize.width * 0.72
  );
  const height = clamp(
    ((FEATURE_SHAPE_BASE_HEIGHT * sketch.scale) / 100 / 100) * canvasSize.height,
    FEATURE_MIN_SIZE,
    canvasSize.height * 0.72
  );

  return {
    height,
    left: center.x - (width / 2),
    top: center.y - (height / 2),
    transform: [{ rotateZ: `${normalizeRotation(sketch.rotation)}deg` }],
    width,
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
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerTitleRow: {
    alignItems: 'center',
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
