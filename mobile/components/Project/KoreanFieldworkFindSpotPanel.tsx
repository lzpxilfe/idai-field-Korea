import { MaterialIcons } from '@expo/vector-icons';
import {
  Document,
  NewResource,
  Resource,
} from 'idai-field-core';
import React, { useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KOREAN_FIELDWORK_CATEGORIES,
  getKoreanFieldworkDisplayIdentifier,
} from './korean-fieldwork-categories';

type FeatureLocationSketchShape = 'point' | 'polygon' | 'rectangle' | 'oval';
type EditableFindResource = (Resource | NewResource) & Record<string, unknown>;

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

interface FindSpotItem {
  label: string;
  number: number;
  point: SketchPoint;
}

interface Props {
  documents: readonly Document[];
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
  parentDocument?: Document;
  resource: EditableFindResource;
}

export const KOREAN_FIELDWORK_FIND_SPOT_FIELDS = {
  items: 'findSpotItems',
  updatedAt: 'findSpotItemsUpdatedAt',
} as const;

const DEFAULT_CANVAS_SIZE = {
  height: 240,
  width: 320,
};
const FEATURE_SKETCH_SHAPE_BASE_WIDTH = 18;
const FEATURE_SKETCH_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SKETCH_SHAPE_MIN_SCALE = 8;
const FEATURE_SKETCH_SHAPE_MAX_SCALE = 240;
const SHAPE_PREVIEW_SIDE_PADDING = 10;
const SHAPE_PREVIEW_TOP_PADDING = 24;
const SHAPE_PREVIEW_BOTTOM_PADDING = 12;
const VALID_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'oval',
]);
const FIND_CONTEXT_CATEGORIES = new Set<string>([
  KOREAN_FIELDWORK_CATEGORIES.FIND,
  KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION,
]);
const TEXT = {
  addHint:
    '\uc720\uad6c \uc2a4\ucf00\uce58 \uc704\uc5d0 \ucd9c\ud1a0 \uc704\uce58\ub97c \ub204\ub974\uba74 \ubc88\ud638\uc810\uc774 \ucd94\uac00\ub429\ub2c8\ub2e4.',
  emptyItem: '\uc720\ubb3c\uba85/\uc218\ub7c9 \uba54\ubaa8',
  feature: '\uc720\uad6c',
  noFeature: '\uc5f0\uacb0\ub41c \uc720\uad6c \uc2a4\ucf00\uce58 \uc5c6\uc74c',
  numberSuffix: '\ubc88',
  title: '\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58',
};

const KoreanFieldworkFindSpotPanel: React.FC<Props> = ({
  documents,
  onUpdateResourceFields,
  parentDocument,
  resource,
}) => {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const featureDocument = useMemo(
    () => getFeatureContextDocument(resource, documents, parentDocument),
    [documents, parentDocument, resource]
  );
  const featureSketch = useMemo(
    () => normalizeFeatureLocationSketch(
      (featureDocument?.resource as Record<string, unknown> | undefined)
        ?.featureLocationSketch
    ),
    [featureDocument?.resource]
  );
  const items = useMemo(
    () => normalizeFindSpotItems(
      resource[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]
    ),
    [resource]
  );

  if (!FIND_CONTEXT_CATEGORIES.has(resource.category)) return null;
  if (!featureDocument) return null;

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const addPoint = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize);
    if (!point) return;

    writeItems(
      items.concat({
        label: '',
        number: getNextFindSpotNumber(items),
        point,
      })
    );
  };
  const updateLabel = (number: number, label: string) => {
    writeItems(items.map((item) =>
      item.number === number ? { ...item, label } : item
    ));
  };
  const removeItem = (number: number) => {
    writeItems(items.filter((item) => item.number !== number));
  };
  const writeItems = (nextItems: FindSpotItem[]) => {
    const updatedAt = new Date().toISOString();

    onUpdateResourceFields({
      [KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]: JSON.stringify({
        items: nextItems,
        updatedAt,
        version: 1,
      }),
      [KOREAN_FIELDWORK_FIND_SPOT_FIELDS.updatedAt]: updatedAt,
    });
  };
  const featureLabel = getKoreanFieldworkDisplayIdentifier(
    featureDocument.resource.identifier
  ) || featureDocument.resource.id;

  return (
    <View style={styles.container} testID="findSpotPanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="place" size={17} color="#344054" />
          <Text style={styles.title}>{TEXT.title}</Text>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
        <Text style={styles.featureLabel} numberOfLines={1}>
          {featureLabel}
        </Text>
      </View>
      <Text style={styles.hint}>{TEXT.addHint}</Text>
      <View
        onLayout={updateCanvasSize}
        onResponderRelease={addPoint}
        onStartShouldSetResponder={() => true}
        style={styles.canvas}
        testID="findSpotCanvas"
      >
        <View style={styles.northBand}>
          <Text style={styles.northText}>N</Text>
        </View>
        <View style={styles.verticalAxis} />
        <View style={styles.horizontalAxis} />
        {featureSketch
          ? renderFeatureSketch(featureSketch, canvasSize)
          : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyPreviewText}>{TEXT.noFeature}</Text>
            </View>
          )}
        {items.map((item) => (
          <View
            key={`find-spot-${item.number}`}
            pointerEvents="none"
            style={[styles.findPoint, getPointPercentStyle(item.point)]}
            testID={`findSpotPoint_${item.number}`}
          >
            <Text style={styles.findPointText}>{item.number}</Text>
          </View>
        ))}
      </View>
      {items.length > 0 && (
        <View style={styles.itemList}>
          {items.map((item) => (
            <View
              key={`find-spot-row-${item.number}`}
              style={styles.itemRow}
              testID={`findSpotRow_${item.number}`}
            >
              <View style={styles.itemNumber}>
                <Text style={styles.itemNumberText}>{item.number}</Text>
              </View>
              <TextInput
                autoCapitalize="none"
                onChangeText={(text) => updateLabel(item.number, text)}
                placeholder={`${item.number}${TEXT.numberSuffix} ${TEXT.emptyItem}`}
                placeholderTextColor="#98a2b3"
                style={styles.itemInput}
                testID={`findSpotLabelInput_${item.number}`}
                value={item.label}
              />
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => removeItem(item.number)}
                style={styles.deleteButton}
                testID={`findSpotDelete_${item.number}`}
              >
                <MaterialIcons name="delete-outline" size={16} color="#b42318" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
        testID="findSpotFeatureShape"
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
        keyPrefix: 'find-spot-feature',
        points,
        testID: 'findSpotFeatureBoundary',
        width: 3,
      })}
      {points.map((point, index) => (
        <View
          key={`find-spot-feature-point-${index}-${point.x}-${point.y}`}
          pointerEvents="none"
          style={[styles.featurePoint, getPointPercentStyle(point)]}
          testID={`findSpotFeaturePoint_${index}`}
        />
      ))}
    </>
  );
};

const normalizeFindSpotItems = (value: unknown): FindSpotItem[] => {
  const rawValue = typeof value === 'string' ? parseJsonObject(value) : value;
  const rawItems = Array.isArray(rawValue)
    ? rawValue
    : isRecord(rawValue) && Array.isArray(rawValue.items)
      ? rawValue.items
      : [];

  return rawItems
    .map(normalizeFindSpotItem)
    .filter((item): item is FindSpotItem => !!item)
    .sort((a, b) => a.number - b.number);
};

const normalizeFindSpotItem = (value: unknown): FindSpotItem | undefined => {
  if (!isRecord(value)) return undefined;

  const point = normalizeSketchPoint(value.point);
  const number = normalizeInteger(value.number);
  if (!point || number === undefined) return undefined;

  return {
    label: typeof value.label === 'string' ? value.label : '',
    number,
    point,
  };
};

const getNextFindSpotNumber = (items: FindSpotItem[]): number => {
  const usedNumbers = new Set(items.map((item) => item.number));
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return nextNumber;
};

const getFeatureContextDocument = (
  resource: EditableFindResource,
  documents: readonly Document[],
  parentDocument?: Document
): Document | undefined => {
  if (parentDocument?.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
    return parentDocument;
  }

  const relatedIds = [
    ...(parentDocument ? getRelationTargets(parentDocument.resource) : []),
    ...getRelationTargets(resource),
  ];

  return findFeatureDocumentByTargets(relatedIds, documents);
};

const findFeatureDocumentByTargets = (
  targetIds: string[],
  documents: readonly Document[]
): Document | undefined => {
  const documentsById = new Map(documents.map((document) => [
    document.resource.id,
    document,
  ]));

  for (const targetId of targetIds) {
    const targetDocument = documentsById.get(targetId);
    if (targetDocument?.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
      return targetDocument;
    }
  }

  for (const targetId of targetIds) {
    const targetDocument = documentsById.get(targetId);
    if (!targetDocument) continue;

    const featureDocument = findFeatureDocumentByTargets(
      getRelationTargets(targetDocument.resource),
      documents
    );
    if (featureDocument) return featureDocument;
  }

  return undefined;
};

const getRelationTargets = (resource: {
  relations?: Resource.Relations;
}): string[] => {
  const relations = resource.relations as Record<string, unknown> | undefined;
  if (!relations) return [];

  return [
    'liesWithin',
    'isRecordedInFeature',
    'isRecordedIn',
    'depicts',
  ].flatMap((relationName) => {
    const targets = relations[relationName];
    return Array.isArray(targets)
      ? targets.filter((target): target is string => typeof target === 'string')
      : [];
  });
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
        opacity: 0.88,
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
  if (typeof locationX !== 'number' || typeof locationY !== 'number') {
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

const normalizeInteger = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
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
  !!value && typeof value === 'object' && !Array.isArray(value);

const styles = StyleSheet.create({
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
    backgroundColor: '#ecfdf3',
    borderRadius: 4,
    color: '#027a48',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: '#fecdca',
    borderRadius: 5,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginLeft: 6,
    width: 34,
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
  featureLabel: {
    color: '#667085',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
  },
  featurePoint: {
    backgroundColor: '#f97316',
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
  findPoint: {
    alignItems: 'center',
    backgroundColor: '#2f5f4a',
    borderColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginLeft: -12,
    marginTop: -12,
    position: 'absolute',
    width: 24,
  },
  findPointText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
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
  itemInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 5,
    borderWidth: 1,
    color: '#1f2937',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    minHeight: 34,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  itemList: {
    marginTop: 8,
  },
  itemNumber: {
    alignItems: 'center',
    backgroundColor: '#2f5f4a',
    borderRadius: 10,
    height: 24,
    justifyContent: 'center',
    marginRight: 7,
    width: 24,
  },
  itemNumberText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 6,
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

export default KoreanFieldworkFindSpotPanel;
