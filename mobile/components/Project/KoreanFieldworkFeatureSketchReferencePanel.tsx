import { Ionicons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React, { useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

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

interface SketchViewport {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface FeatureLocationSketch {
  center: SketchPoint;
  points: SketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}

interface Props {
  document: Document;
  documents: readonly Document[];
  onOpenFreeSketch?: () => void;
}

const PREVIEW_DEFAULT_SIZE = {
  height: 150,
  width: 260,
};
const BOUNDARY_PADDING = 12;
const SHAPE_PREVIEW_TOP_PADDING = 24;
const SHAPE_PREVIEW_SIDE_PADDING = 8;
const SHAPE_PREVIEW_BOTTOM_PADDING = 10;
const FEATURE_SKETCH_SHAPE_BASE_WIDTH = 18;
const FEATURE_SKETCH_SHAPE_BASE_HEIGHT = 12;
const VALID_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'circle',
  'oval',
]);
const FEATURE_SKETCH_SHAPE_MIN_SCALE = 8;
const FEATURE_SKETCH_SHAPE_MAX_SCALE = 240;
const FEATURE_SKETCH_REFERENCE_SHAPE_MIN_WIDTH = 6;
const FEATURE_SKETCH_REFERENCE_SHAPE_MIN_HEIGHT = 5;
const DOUBLE_PRESS_DELAY_MS = 350;
const TEXT = {
  panelTitle: '\uc720\uad6c \uc704\uce58\uc640 \ud615\ud0dc',
  boundaryTitle: '\uc804\uccb4 \uacbd\uacc4 \uc548 \uc704\uce58',
  shapeTitle: '\uc720\uad6c \ud615\ud0dc \uc2a4\ucf00\uce58',
  openSketchHint: '\ub450 \ubc88 \ub20c\ub7ec \uc790\uc720 \uc2a4\ucf00\uce58',
  noBoundary: '\uc870\uc0ac \uacbd\uacc4 \uc5c6\uc74c',
  noSketch: '\uc720\uad6c \uc2a4\ucf00\uce58 \uc5c6\uc74c',
  feature: '\uc720\uad6c',
};

const KoreanFieldworkFeatureSketchReferencePanel: React.FC<Props> = ({
  document,
  documents,
  onOpenFreeSketch,
}) => {
  const [boundaryCanvasSize, setBoundaryCanvasSize] =
    useState(PREVIEW_DEFAULT_SIZE);
  const [shapeCanvasSize, setShapeCanvasSize] =
    useState(PREVIEW_DEFAULT_SIZE);
  const boundaryPoints = useMemo(
    () => getSurveyBoundaryPoints(documents),
    [documents]
  );
  const sketch = useMemo(
    () => normalizeFeatureLocationSketch(
      (document.resource as Record<string, unknown>).featureLocationSketch
    ),
    [document.resource]
  );
  const boundaryViewport = useMemo(
    () => getSquarePlanViewport(boundaryCanvasSize),
    [boundaryCanvasSize]
  );

  if (document.resource.category !== KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
    return null;
  }

  return (
    <View style={styles.container} testID="featureSketchReferencePanel">
      <View style={styles.headerRow}>
        <Ionicons name="map-outline" size={16} color="#344054" />
        <Text style={styles.title}>{TEXT.panelTitle}</Text>
      </View>
      <View style={styles.previewRow}>
        <SketchCard
          onLayout={(size) => setBoundaryCanvasSize(size)}
          testID="featureBoundaryLocationPreview"
          title={TEXT.boundaryTitle}
        >
          {boundaryPoints.length >= 3
            ? (
              <>
                {toLineSegments({
                  canvasSize: boundaryCanvasSize,
                  closePath: true,
                  color: '#175cd3',
                  keyPrefix: 'boundary',
                  points: boundaryPoints,
                  testID: 'featureBoundaryLine',
                  viewport: boundaryViewport,
                  width: 2,
                })}
                {boundaryPoints.map((point, index) => (
                  <View
                    key={`boundary-point-${index}`}
                    pointerEvents="none"
                    style={[
                      styles.boundaryPoint,
                      getPointStyle(point, boundaryCanvasSize, boundaryViewport),
                    ]}
                    testID={`featureBoundaryPoint_${index}`}
                  />
                ))}
              </>
            )
            : (
              <EmptyPreviewText text={TEXT.noBoundary} />
            )}
          {sketch && renderFeatureSketch(
            sketch,
            boundaryCanvasSize,
            'featureBoundaryFeatureShape',
            true,
            boundaryViewport
          )}
        </SketchCard>
        <SketchCard
          onLayout={(size) => setShapeCanvasSize(size)}
          onDoublePress={onOpenFreeSketch}
          isShapePreview
          testID="featureShapeSketchPreview"
          title={TEXT.shapeTitle}
        >
          {sketch
            ? renderFeatureSketch(
              sketch,
              shapeCanvasSize,
              'featureShapeSketchShape',
              false
            )
            : <EmptyPreviewText text={TEXT.noSketch} />}
        </SketchCard>
      </View>
    </View>
  );
};

const SketchCard: React.FC<{
  children: React.ReactNode;
  isShapePreview?: boolean;
  onLayout: (size: CanvasSize) => void;
  onDoublePress?: () => void;
  testID: string;
  title: string;
}> = ({
  children,
  isShapePreview = false,
  onLayout,
  onDoublePress,
  testID,
  title,
}) => {
  const [lastPressAt, setLastPressAt] = useState(0);
  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) onLayout({ height, width });
  };
  const handlePress = () => {
    if (!onDoublePress) return;

    const pressedAt = Date.now();
    if (
      lastPressAt > 0
      && pressedAt - lastPressAt <= DOUBLE_PRESS_DELAY_MS
    ) {
      setLastPressAt(0);
      onDoublePress();
      return;
    }

    setLastPressAt(pressedAt);
  };

  return (
    <Pressable
      accessibilityHint={onDoublePress ? TEXT.openSketchHint : undefined}
      accessibilityRole={onDoublePress ? 'button' : undefined}
      disabled={!onDoublePress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        !!onDoublePress && pressed && styles.cardPressed,
      ]}
      testID={testID}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <View
        onLayout={handleLayout}
        pointerEvents="none"
        style={[
          styles.previewCanvas,
          isShapePreview && styles.shapePreviewCanvas,
        ]}
      >
        <View style={styles.northBand}>
          <Text style={styles.northText}>N</Text>
        </View>
        <View style={styles.verticalAxis} />
        <View style={styles.horizontalAxis} />
        {children}
      </View>
      {!!onDoublePress && (
        <View pointerEvents="none" style={styles.openSketchHint}>
          <Ionicons name="expand-outline" size={12} color="#175cd3" />
          <Text style={styles.openSketchHintText}>{TEXT.openSketchHint}</Text>
        </View>
      )}
    </Pressable>
  );
};

const EmptyPreviewText: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.emptyPreview}>
    <Text style={styles.emptyPreviewText}>{text}</Text>
  </View>
);

const renderFeatureSketch = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize,
  testID: string,
  compact: boolean,
  viewport?: SketchViewport
) => {
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
          compact && styles.featureShapeCompact,
          (sketch.shape === 'oval' || sketch.shape === 'circle')
            && styles.featureShapeOval,
          getFeatureShapeFrame(sketch, canvasSize, compact, viewport),
        ]}
        testID={testID}
      >
        <View style={styles.featureShapeCenter} />
        {!compact && (
          <Text style={styles.featureShapeLabel}>{TEXT.feature}</Text>
        )}
      </View>
    );
  }

  const points = compact
    ? getVisibleFeatureSketchPoints(sketch)
    : fitFeatureSketchPoints(getVisibleFeatureSketchPoints(sketch));

  return (
    <>
      {sketch.shape === 'polygon' && toLineSegments({
        canvasSize,
        closePath: points.length > 2,
        color: '#f97316',
        keyPrefix: `${testID}-line`,
        points,
        testID,
        viewport,
        width: compact ? 2 : 3,
      })}
      {points.map((point, index) => (
        <View
          key={`${testID}-${index}-${point.x}-${point.y}`}
          pointerEvents="none"
          style={[
            styles.featurePoint,
            compact && styles.featurePointCompact,
            getPointStyle(point, canvasSize, viewport),
          ]}
          testID={`${testID}_${index}`}
        >
          {!compact && (
            <Text style={styles.featurePointText}>{index + 1}</Text>
          )}
        </View>
      ))}
    </>
  );
};

const getVisibleFeatureSketchPoints = (
  sketch: FeatureLocationSketch
): SketchPoint[] => {
  if (sketch.shape === 'polygon') return sketch.points;
  return sketch.points.length > 0 ? sketch.points : [sketch.center];
};

const normalizeFeatureLocationSketch = (
  value: unknown
): FeatureLocationSketch | undefined => {
  const rawValue = typeof value === 'string' ? parseJsonObject(value) : value;
  if (!isRecord(rawValue)) return undefined;

  const shapeValue = rawValue.shape;
  const shape = typeof shapeValue === 'string' && VALID_SHAPES.has(
    shapeValue as FeatureLocationSketchShape
  )
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
    points,
    rotation: normalizeNumber(rawValue.rotation, 0),
    scale: clamp(
      normalizeNumber(rawValue.scale, 100),
      FEATURE_SKETCH_SHAPE_MIN_SCALE,
      FEATURE_SKETCH_SHAPE_MAX_SCALE
    ),
    shape,
  };
};

const getSurveyBoundaryPoints = (
  documents: readonly Document[]
): SketchPoint[] => {
  const boundaryDocument = documents.find((candidate) =>
    candidate.resource.category === KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY
      && getBoundaryCoordinatePairs(candidate.resource.geometry).length >= 3);
  if (!boundaryDocument) return [];

  return normalizeBoundaryCoordinatePairs(
    getBoundaryCoordinatePairs(boundaryDocument.resource.geometry)
  );
};

const getBoundaryCoordinatePairs = (geometry: unknown): number[][] => {
  if (!isRecord(geometry)) return [];

  if (geometry.type === 'LineString') {
    return getNumericCoordinatePairs(geometry.coordinates);
  }

  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    return getNumericCoordinatePairs(geometry.coordinates[0]);
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

const normalizeBoundaryCoordinatePairs = (
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
  viewport,
  width,
}: {
  canvasSize: CanvasSize;
  closePath: boolean;
  color: string;
  keyPrefix: string;
  points: SketchPoint[];
  testID: string;
  viewport?: SketchViewport;
  width: number;
}) => {
  if (points.length < 2) return [];

  const segmentStartPoints = closePath ? points : points.slice(0, -1);

  return segmentStartPoints.map((point, index) => (
    <SketchLineSegment
      color={color}
      end={denormalizePoint(
        points[(index + 1) % points.length],
        canvasSize,
        viewport
      )}
      key={`${keyPrefix}-${index}`}
      start={denormalizePoint(point, canvasSize, viewport)}
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

const getFeatureShapeFrame = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize,
  compact: boolean,
  viewport?: SketchViewport
) => {
  if (!compact) {
    return getFittedFeatureShapeFrame(sketch, canvasSize);
  }

  const center = denormalizePoint(sketch.center, canvasSize, viewport);
  const shapeScale = sketch.scale / 100;
  const sizeReference = viewport ?? {
    height: canvasSize.height,
    left: 0,
    top: 0,
    width: canvasSize.width,
  };
  const width = clamp(
    sizeReference.width * 0.22 * shapeScale * 0.84,
    FEATURE_SKETCH_REFERENCE_SHAPE_MIN_WIDTH,
    120
  );
  const height = clamp(
    sizeReference.height * 0.26 * shapeScale * 0.84,
    FEATURE_SKETCH_REFERENCE_SHAPE_MIN_HEIGHT,
    96
  );

  const normalizedWidth = sketch.shape === 'circle'
    ? Math.min(width, height)
    : width;
  const normalizedHeight = sketch.shape === 'circle'
    ? normalizedWidth
    : height;

  return {
    height: normalizedHeight,
    left: center.x - (normalizedWidth / 2),
    top: center.y - (normalizedHeight / 2),
    transform: [{ rotateZ: `${sketch.rotation}deg` }],
    width: normalizedWidth,
  };
};

const getFittedFeatureShapeFrame = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize
) => {
  const availableWidth = Math.max(
    FEATURE_SKETCH_REFERENCE_SHAPE_MIN_WIDTH,
    canvasSize.width - (SHAPE_PREVIEW_SIDE_PADDING * 2)
  );
  const availableHeight = Math.max(
    FEATURE_SKETCH_REFERENCE_SHAPE_MIN_HEIGHT,
    canvasSize.height - SHAPE_PREVIEW_TOP_PADDING - SHAPE_PREVIEW_BOTTOM_PADDING
  );
  const rotation = normalizeRotation(sketch.rotation);
  const baseHeight = sketch.shape === 'circle'
    ? FEATURE_SKETCH_SHAPE_BASE_WIDTH
    : FEATURE_SKETCH_SHAPE_BASE_HEIGHT;
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotatedBaseWidth =
    (FEATURE_SKETCH_SHAPE_BASE_WIDTH * cos)
    + (baseHeight * sin);
  const rotatedBaseHeight =
    (FEATURE_SKETCH_SHAPE_BASE_WIDTH * sin)
    + (baseHeight * cos);
  const scale = Math.min(
    availableWidth / Math.max(rotatedBaseWidth, 0.000001),
    availableHeight / Math.max(rotatedBaseHeight, 0.000001)
  );
  const width = FEATURE_SKETCH_SHAPE_BASE_WIDTH * scale;
  const height = baseHeight * scale;
  const center = {
    x: canvasSize.width / 2,
    y: SHAPE_PREVIEW_TOP_PADDING + (availableHeight / 2),
  };

  return {
    height,
    left: center.x - (width / 2),
    top: center.y - (height / 2),
    transform: [{ rotateZ: `${rotation}deg` }],
    width,
  };
};

const fitFeatureSketchPoints = (points: SketchPoint[]): SketchPoint[] => {
  if (points.length === 0) return points;
  if (points.length === 1) return [{ x: 50, y: 56 }];

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = Math.max(maxX - minX, 0.000001);
  const yRange = Math.max(maxY - minY, 0.000001);
  const availableWidth = 100 - (SHAPE_PREVIEW_SIDE_PADDING * 2);
  const availableHeight =
    100 - SHAPE_PREVIEW_TOP_PADDING - SHAPE_PREVIEW_BOTTOM_PADDING;
  const scale = Math.min(availableWidth / xRange, availableHeight / yRange);
  const fittedWidth = xRange * scale;
  const fittedHeight = yRange * scale;
  const offsetX = (100 - fittedWidth) / 2;
  const offsetY =
    SHAPE_PREVIEW_TOP_PADDING + ((availableHeight - fittedHeight) / 2);

  return points.map((point) => ({
    x: offsetX + ((point.x - minX) * scale),
    y: offsetY + ((point.y - minY) * scale),
  }));
};

const denormalizePoint = (
  point: SketchPoint,
  canvasSize: CanvasSize,
  viewport?: SketchViewport
): PixelPoint => ({
  x: (viewport?.left ?? 0)
    + ((point.x / 100) * (viewport?.width ?? canvasSize.width)),
  y: (viewport?.top ?? 0)
    + ((point.y / 100) * (viewport?.height ?? canvasSize.height)),
});

const getSquarePlanViewport = (canvasSize: CanvasSize): SketchViewport => {
  const size = Math.max(1, Math.min(canvasSize.width, canvasSize.height));

  return {
    height: size,
    left: (canvasSize.width - size) / 2,
    top: (canvasSize.height - size) / 2,
    width: size,
  };
};

const getPointStyle = (
  point: SketchPoint,
  canvasSize: CanvasSize,
  viewport?: SketchViewport
) => {
  if (!viewport) return getPointPercentStyle(point);

  const viewportPoint = denormalizePoint(point, canvasSize, viewport);
  return {
    left: viewportPoint.x,
    top: viewportPoint.y,
  };
};

const getPointPercentStyle = (point: SketchPoint) => ({
  left: toPercent(point.x),
  top: toPercent(point.y),
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
  container: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 8,
    overflow: 'hidden',
  },
  headerRow: {
    alignItems: 'center',
    borderBottomColor: '#eaecf0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  title: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  cardPressed: {
    borderColor: '#175cd3',
    opacity: 0.86,
  },
  cardTitle: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  openSketchHint: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  openSketchHintText: {
    color: '#175cd3',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 3,
  },
  previewCanvas: {
    backgroundColor: '#ffffff',
    borderTopColor: '#eaecf0',
    borderTopWidth: 1,
    height: PREVIEW_DEFAULT_SIZE.height,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  shapePreviewCanvas: {
    height: 188,
  },
  northBand: {
    alignItems: 'center',
    backgroundColor: '#eef4ff',
    borderBottomColor: '#d6e4ff',
    borderBottomWidth: 1,
    height: 18,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  northText: {
    color: '#175cd3',
    fontSize: 10,
    fontWeight: '900',
  },
  verticalAxis: {
    backgroundColor: '#eef2f6',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 18,
    width: 1,
  },
  horizontalAxis: {
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
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    position: 'absolute',
    width: 8,
  },
  emptyPreview: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 18,
  },
  emptyPreviewText: {
    color: '#98a2b3',
    fontSize: 12,
    fontWeight: '800',
  },
  featureShape: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
    borderColor: '#f97316',
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
  },
  featureShapeCompact: {
    backgroundColor: 'rgba(249, 115, 22, 0.24)',
    borderWidth: 2,
  },
  featureShapeOval: {
    borderRadius: 999,
  },
  featureShapeCenter: {
    backgroundColor: '#f97316',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  featureShapeLabel: {
    color: '#9a3412',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
  },
  featurePoint: {
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -10,
    position: 'absolute',
    width: 20,
  },
  featurePointCompact: {
    borderRadius: 7,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    width: 14,
  },
  featurePointText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default KoreanFieldworkFeatureSketchReferencePanel;
