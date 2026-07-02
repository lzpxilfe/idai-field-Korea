import { MaterialIcons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React, {
  useMemo,
  useState,
} from 'react';
import type { DimensionValue } from 'react-native';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';

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

interface FeatureLocationSketch {
  center: SketchPoint;
  points: SketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}

interface FeatureSoilPitLine {
  end: SketchPoint;
  id: string;
  label: string;
  start: SketchPoint;
  updatedAt?: string;
  version: 1;
}

interface Props {
  allowedAddCategoryNames?: string[];
  document: Document;
  documents: readonly Document[];
  onAddSoilProfilePhoto?: (parentDoc: Document, categoryName: string) => void;
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
}

export const KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS = {
  line: 'featureSoilPitLine',
  lines: 'featureSoilPitLines',
  updatedAt: 'featureSoilPitLineUpdatedAt',
} as const;

const DEFAULT_CANVAS_SIZE = {
  height: 220,
  width: 320,
};
const FEATURE_SKETCH_SHAPE_BASE_WIDTH = 18;
const FEATURE_SKETCH_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SKETCH_SHAPE_MIN_SCALE = 8;
const FEATURE_SKETCH_SHAPE_MAX_SCALE = 240;
const SHAPE_PREVIEW_SIDE_PADDING = 9;
const SHAPE_PREVIEW_TOP_PADDING = 22;
const SHAPE_PREVIEW_BOTTOM_PADDING = 12;
const MIN_LINE_DISTANCE = 3;
const VALID_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'oval',
]);
const TEXT = {
  addSoilProfilePhoto: '\ud1a0\uce35\uc0ac\uc9c4 \ucd94\uac00',
  clear: '\uc9c0\uc6b0\uae30',
  connectedCount: '\uc5f0\uacb0\ub41c \ud1a0\uce35\uc0ac\uc9c4',
  drawHint:
    '\ud53c\ud2b8\uc120\uacfc \ud1a0\uce35\uc0ac\uc9c4\uc744 \ud55c \uacf3\uc5d0\uc11c \ub2e4\ub8f9\ub2c8\ub2e4. \uc2dc\uc791\uc810\uacfc \ub05d\uc810\uc744 \ucc28\ub840\ub85c \ucc0d\uc5b4 \ud53c\ud2b8/\uc808\ub2e8\uc120\uc744 \ud45c\uc2dc\ud569\ub2c8\ub2e4.',
  feature: '\uc720\uad6c',
  lineCount: '\ud53c\ud2b8\uc120',
  noSketch: '\uc720\uad6c \uc2a4\ucf00\uce58 \uc5c6\uc74c',
  pendingHint: '\ub05d\uc810\uc744 \ucc0d\uc73c\uba74 \uc120\uc774 \ucd94\uac00\ub429\ub2c8\ub2e4.',
  title: '\ud53c\ud2b8\u00b7\ud1a0\uce35\uc0ac\uc9c4',
  undo: '\ub9c8\uc9c0\ub9c9 \uc9c0\uc6b0\uae30',
};

const KoreanFieldworkFeaturePitLinePanel: React.FC<Props> = ({
  allowedAddCategoryNames = [],
  document,
  documents,
  onAddSoilProfilePhoto,
  onUpdateResourceFields,
}) => {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [pendingStartPoint, setPendingStartPoint] = useState<SketchPoint>();
  const sketch = useMemo(
    () => normalizeFeatureLocationSketch(
      (document.resource as Record<string, unknown>).featureLocationSketch
    ),
    [document.resource]
  );
  const savedLines = useMemo(
    () => normalizeFeatureSoilPitLines(
      (document.resource as Record<string, unknown>)[
        KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines
      ],
      (document.resource as Record<string, unknown>)[
        KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.line
      ]
    ),
    [document.resource]
  );
  const hasSavedLines = savedLines.length > 0;
  const canClearLine = hasSavedLines || !!pendingStartPoint;
  const relatedSoilProfilePhotoCount = useMemo(
    () => documents.filter((candidate) =>
      candidate.resource.category === KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO
        && hasRelationTo(candidate, document.resource.id)
    ).length,
    [document.resource.id, documents]
  );
  const canAddSoilProfilePhoto =
    allowedAddCategoryNames.includes(KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO)
    && !!onAddSoilProfilePhoto;

  if (document.resource.category !== KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
    return null;
  }

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const addLinePoint = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize);
    if (!point) return;

    if (!pendingStartPoint) {
      setPendingStartPoint(point);
      return;
    }
    if (getPointDistance(pendingStartPoint, point) < MIN_LINE_DISTANCE) return;

    setPendingStartPoint(undefined);
    saveLines([
      ...savedLines,
      createFeatureSoilPitLine(pendingStartPoint, point, savedLines.length),
    ]);
  };
  const saveLines = (lines: FeatureSoilPitLine[]) => {
    const updatedAt = new Date().toISOString();
    const updatedLines = lines.map((line, index) => ({
      ...line,
      id: createFeatureSoilPitLineId(index),
      label: `${index + 1}`,
      updatedAt,
      version: 1 as const,
    }));
    onUpdateResourceFields({
      [KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]:
        JSON.stringify(updatedLines),
      [KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.line]:
        updatedLines[0] ? JSON.stringify(updatedLines[0]) : '',
      [KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.updatedAt]:
        updatedAt,
    });
  };
  const undoLastLine = () => {
    if (pendingStartPoint) {
      setPendingStartPoint(undefined);
      return;
    }
    if (!hasSavedLines) return;

    saveLines(savedLines.slice(0, -1));
  };
  const clearLines = () => {
    setPendingStartPoint(undefined);
    saveLines([]);
  };

  return (
    <View style={styles.container} testID="featurePitLinePanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="timeline" size={17} color="#344054" />
          <Text style={styles.title}>{TEXT.title}</Text>
          <Text style={styles.countText}>
            {TEXT.connectedCount} {relatedSoilProfilePhotoCount}
          </Text>
          <Text style={styles.countText}>
            {TEXT.lineCount} {savedLines.length}
          </Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel={TEXT.addSoilProfilePhoto}
            disabled={!canAddSoilProfilePhoto}
            onPress={() => onAddSoilProfilePhoto?.(
              document,
              KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO
            )}
            style={[
              styles.addButton,
              !canAddSoilProfilePhoto && styles.addButtonDisabled,
            ]}
            testID="featurePitLineAddSoilProfilePhoto"
          >
            <MaterialIcons
              name="terrain"
              size={15}
              color={canAddSoilProfilePhoto ? '#2f5f4a' : '#98a2b3'}
            />
            <Text
              style={[
                styles.addButtonText,
                !canAddSoilProfilePhoto && styles.addButtonTextDisabled,
              ]}
            >
              {TEXT.addSoilProfilePhoto}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel={TEXT.undo}
            disabled={!canClearLine}
            onPress={undoLastLine}
            style={[styles.clearButton, !canClearLine && styles.clearButtonDisabled]}
            testID="featurePitLineUndoLast"
          >
            <MaterialIcons
              name="undo"
              size={15}
              color={canClearLine ? '#344054' : '#98a2b3'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel={TEXT.clear}
            disabled={!canClearLine}
            onPress={clearLines}
            style={[styles.clearButton, !canClearLine && styles.clearButtonDisabled]}
            testID="featurePitLineClear"
          >
            <MaterialIcons
              name="delete-outline"
              size={15}
              color={canClearLine ? '#b42318' : '#98a2b3'}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.hint}>{TEXT.drawHint}</Text>
      {pendingStartPoint && (
        <Text style={styles.pendingHint} testID="featurePitLinePendingHint">
          {TEXT.pendingHint}
        </Text>
      )}
      <View
        onLayout={updateCanvasSize}
        onMoveShouldSetResponder={() => false}
        onResponderGrant={addLinePoint}
        onResponderTerminationRequest={() => true}
        onStartShouldSetResponder={() => true}
        style={styles.canvas}
        testID="featurePitLineCanvas"
      >
        <View style={styles.northBand}>
          <Text style={styles.northText}>N</Text>
        </View>
        <View style={styles.verticalAxis} />
        <View style={styles.horizontalAxis} />
        {sketch
          ? renderFeatureSketch(sketch, canvasSize)
          : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyPreviewText}>{TEXT.noSketch}</Text>
            </View>
          )}
        {savedLines.map((line, index) => (
          <React.Fragment key={`${line.id}-${index}`}>
            <SketchLineSegment
              color="#2f5f4a"
              end={denormalizePoint(line.end, canvasSize)}
              start={denormalizePoint(line.start, canvasSize)}
              testID="featurePitLineSegment"
              width={4}
            />
            <LineHandle
              label={line.label}
              point={line.start}
              testID="featurePitLineStart"
            />
            <LineHandle
              label={line.label}
              point={line.end}
              testID="featurePitLineEnd"
            />
            <View
              pointerEvents="none"
              style={[
                styles.lineLabel,
                getPointPercentStyle(getLineMidpoint(line)),
              ]}
              testID={`featurePitLineLabel_${index}`}
            >
              <Text style={styles.lineLabelText}>{line.label}</Text>
            </View>
          </React.Fragment>
        ))}
        {pendingStartPoint && (
          <>
            <LineHandle
              label="+"
              point={pendingStartPoint}
              testID="featurePitLinePendingStart"
            />
            <View
              pointerEvents="none"
              style={[
                styles.pendingPulse,
                getPointPercentStyle(pendingStartPoint),
              ]}
            />
          </>
        )}
      </View>
    </View>
  );
};

const renderFeatureSketch = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize
) => {
  if (sketch.shape === 'rectangle' || sketch.shape === 'oval') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.featureShape,
          sketch.shape === 'oval' && styles.featureShapeOval,
          getFittedFeatureShapeFrame(sketch, canvasSize),
        ]}
        testID="featurePitLineFeatureShape"
      >
        <View style={styles.featureShapeCenter} />
        <Text style={styles.featureShapeLabel}>{TEXT.feature}</Text>
      </View>
    );
  }

  const points = fitFeatureSketchPoints(getVisibleFeatureSketchPoints(sketch));

  return (
    <>
      {sketch.shape === 'polygon' && toLineSegments({
        canvasSize,
        closePath: points.length > 2,
        color: '#f97316',
        keyPrefix: 'feature-pit-line-feature',
        points,
        testID: 'featurePitLineFeatureBoundary',
        width: 3,
      })}
      {points.map((point, index) => (
        <View
          key={`feature-pit-line-point-${index}-${point.x}-${point.y}`}
          pointerEvents="none"
          style={[styles.featurePoint, getPointPercentStyle(point)]}
          testID={`featurePitLineFeaturePoint_${index}`}
        >
          <Text style={styles.featurePointText}>{index + 1}</Text>
        </View>
      ))}
    </>
  );
};

const LineHandle: React.FC<{
  label?: string;
  point: SketchPoint;
  testID: string;
}> = ({ label, point, testID }) => (
  <View
    pointerEvents="none"
    style={[styles.lineHandle, getPointPercentStyle(point)]}
    testID={testID}
  >
    {!!label && <Text style={styles.lineHandleText}>{label}</Text>}
  </View>
);

const normalizeFeatureSoilPitLines = (
  value: unknown,
  legacyValue: unknown
): FeatureSoilPitLine[] => {
  const rawValue = typeof value === 'string' ? parseJsonObject(value) : value;
  const rawLines = Array.isArray(rawValue)
    ? rawValue
    : isRecord(rawValue) && Array.isArray(rawValue.lines)
      ? rawValue.lines
      : [];
  const lines = rawLines
    .map((line, index) => normalizeFeatureSoilPitLine(line, index))
    .filter((line): line is FeatureSoilPitLine => !!line);
  if (lines.length > 0) return lines;

  const legacyLine = normalizeFeatureSoilPitLine(legacyValue, 0);
  return legacyLine ? [legacyLine] : [];
};

const normalizeFeatureSoilPitLine = (
  value: unknown,
  index: number
): FeatureSoilPitLine | undefined => {
  const rawValue = typeof value === 'string' ? parseJsonObject(value) : value;
  if (!isRecord(rawValue)) return undefined;

  const start = normalizeSketchPoint(rawValue.start);
  const end = normalizeSketchPoint(rawValue.end);
  if (!start || !end) return undefined;

  return {
    end,
    id: typeof rawValue.id === 'string'
      ? rawValue.id
      : createFeatureSoilPitLineId(index),
    label: typeof rawValue.label === 'string'
      ? rawValue.label
      : `${index + 1}`,
    start,
    updatedAt: typeof rawValue.updatedAt === 'string'
      ? rawValue.updatedAt
      : undefined,
    version: 1,
  };
};

const createFeatureSoilPitLine = (
  start: SketchPoint,
  end: SketchPoint,
  index: number
): FeatureSoilPitLine => ({
  end,
  id: createFeatureSoilPitLineId(index),
  label: `${index + 1}`,
  start,
  version: 1,
});

const createFeatureSoilPitLineId = (index: number): string =>
  `soil-pit-line-${index + 1}`;

const getLineMidpoint = (line: FeatureSoilPitLine): SketchPoint => ({
  x: (line.start.x + line.end.x) / 2,
  y: (line.start.y + line.end.y) / 2,
});

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

const getVisibleFeatureSketchPoints = (
  sketch: FeatureLocationSketch
): SketchPoint[] => {
  if (sketch.shape === 'polygon') return sketch.points;
  return sketch.points.length > 0 ? sketch.points : [sketch.center];
};

const getFittedFeatureShapeFrame = (
  sketch: FeatureLocationSketch,
  canvasSize: CanvasSize
) => {
  const availableWidth = Math.max(
    6,
    canvasSize.width - (SHAPE_PREVIEW_SIDE_PADDING * 2)
  );
  const availableHeight = Math.max(
    5,
    canvasSize.height - SHAPE_PREVIEW_TOP_PADDING - SHAPE_PREVIEW_BOTTOM_PADDING
  );
  const rotation = normalizeRotation(sketch.rotation);
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotatedBaseWidth =
    (FEATURE_SKETCH_SHAPE_BASE_WIDTH * cos)
    + (FEATURE_SKETCH_SHAPE_BASE_HEIGHT * sin);
  const rotatedBaseHeight =
    (FEATURE_SKETCH_SHAPE_BASE_WIDTH * sin)
    + (FEATURE_SKETCH_SHAPE_BASE_HEIGHT * cos);
  const scale = Math.min(
    availableWidth / Math.max(rotatedBaseWidth, 0.000001),
    availableHeight / Math.max(rotatedBaseHeight, 0.000001)
  );
  const width = FEATURE_SKETCH_SHAPE_BASE_WIDTH * scale;
  const height = FEATURE_SKETCH_SHAPE_BASE_HEIGHT * scale;
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

const getNormalizedPoint = (
  event: GestureResponderEvent,
  canvasSize: CanvasSize
): SketchPoint | undefined => {
  const { locationX, locationY } = getLocalTouchPoint(event);
  if (
    typeof locationX !== 'number'
    || typeof locationY !== 'number'
    || !Number.isFinite(locationX)
    || !Number.isFinite(locationY)
    || !Number.isFinite(canvasSize.width)
    || !Number.isFinite(canvasSize.height)
    || canvasSize.width <= 0
    || canvasSize.height <= 0
  ) {
    return undefined;
  }
  if (
    locationX < 0
    || locationX > canvasSize.width
    || locationY < 0
    || locationY > canvasSize.height
  ) {
    return undefined;
  }

  return {
    x: clamp((locationX / canvasSize.width) * 100, 0, 100),
    y: clamp((locationY / canvasSize.height) * 100, 0, 100),
  };
};

const getLocalTouchPoint = (event: GestureResponderEvent): {
  locationX?: number;
  locationY?: number;
} => {
  const nativeEvent = event.nativeEvent as unknown as {
    changedTouches?: TouchPointCandidate[];
    locationX?: number;
    locationY?: number;
    touches?: TouchPointCandidate[];
  };
  const localTouch = [
    ...(nativeEvent.touches ?? []),
    ...(nativeEvent.changedTouches ?? []),
  ].find(hasLocalTouchCoordinates);

  return {
    locationX: localTouch?.locationX ?? localTouch?.x ?? nativeEvent.locationX,
    locationY: localTouch?.locationY ?? localTouch?.y ?? nativeEvent.locationY,
  };
};

interface TouchPointCandidate {
  locationX?: number;
  locationY?: number;
  x?: number;
  y?: number;
}

const hasLocalTouchCoordinates = (value: TouchPointCandidate): boolean =>
  Number.isFinite(value.locationX ?? value.x)
  && Number.isFinite(value.locationY ?? value.y);

const denormalizePoint = (
  point: SketchPoint,
  canvasSize: CanvasSize
): PixelPoint => ({
  x: (point.x / 100) * canvasSize.width,
  y: (point.y / 100) * canvasSize.height,
});

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

const getPointDistance = (a: SketchPoint, b: SketchPoint): number =>
  Math.sqrt(((a.x - b.x) ** 2) + ((a.y - b.y) ** 2));

const hasRelationTo = (candidate: Document, documentId: string): boolean => {
  const relations = candidate.resource.relations as
    | Record<string, unknown>
    | undefined;
  if (!relations) return false;

  return Object.values(relations).some((value) =>
    Array.isArray(value) && value.includes(documentId)
  );
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
  !!value && typeof value === 'object' && !Array.isArray(value);

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#f2f4f7',
    borderColor: '#e4e7ec',
  },
  addButtonText: {
    color: '#2f5f4a',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  addButtonTextDisabled: {
    color: '#98a2b3',
  },
  canvas: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: DEFAULT_CANVAS_SIZE.height,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  clearButton: {
    alignItems: 'center',
    borderColor: '#fecdca',
    borderRadius: 5,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginLeft: 6,
    width: 34,
  },
  clearButtonDisabled: {
    borderColor: '#e4e7ec',
  },
  container: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
  },
  countText: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 7,
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
  featurePointText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  featureShape: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    borderColor: '#f97316',
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
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
  featureShapeOval: {
    borderRadius: 999,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hint: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 5,
  },
  horizontalAxis: {
    backgroundColor: '#eef2f6',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  lineHandle: {
    alignItems: 'center',
    backgroundColor: '#2f5f4a',
    borderColor: '#ffffff',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    justifyContent: 'center',
    marginLeft: -7,
    marginTop: -7,
    position: 'absolute',
    width: 14,
  },
  lineHandleText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 8,
  },
  lineLabel: {
    alignItems: 'center',
    backgroundColor: '#2f5f4a',
    borderColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    marginLeft: -8,
    marginTop: -8,
    position: 'absolute',
    width: 16,
  },
  lineLabelText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
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
  pendingHint: {
    color: '#2f5f4a',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 4,
  },
  pendingPulse: {
    borderColor: '#2f5f4a',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    opacity: 0.3,
    position: 'absolute',
    width: 28,
  },
  title: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  verticalAxis: {
    backgroundColor: '#eef2f6',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 18,
    width: 1,
  },
});

export default KoreanFieldworkFeaturePitLinePanel;
