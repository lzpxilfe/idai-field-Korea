import { MaterialIcons } from '@expo/vector-icons';
import {
  Document,
  NewResource,
  Resource,
} from 'idai-field-core';
import React, { useMemo, useRef, useState } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
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

interface FindSpotViewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface FindSpotPanGesture {
  start: PixelPoint;
  viewport: FindSpotViewport;
}

interface FindSpotPinchGesture {
  center: PixelPoint;
  distance: number;
  viewport: FindSpotViewport;
}

interface FindSpotTapGesture {
  start: PixelPoint;
  viewport: FindSpotViewport;
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
  compact?: boolean;
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
const DEFAULT_FIND_SPOT_VIEWPORT: FindSpotViewport = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
const FEATURE_SKETCH_SHAPE_BASE_WIDTH = 18;
const FEATURE_SKETCH_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SKETCH_SHAPE_MIN_SCALE = 8;
const FEATURE_SKETCH_SHAPE_MAX_SCALE = 240;
const SHAPE_PREVIEW_SIDE_PADDING = 10;
const SHAPE_PREVIEW_TOP_PADDING = 24;
const SHAPE_PREVIEW_BOTTOM_PADDING = 12;
const FIND_SPOT_MIN_SCALE = 1;
const FIND_SPOT_MAX_SCALE = 5;
const FIND_SPOT_TAP_DISTANCE = 8;
const FIND_SPOT_DRAG_HIT_RADIUS = 20;
const VALID_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'oval',
]);
const FIND_CONTEXT_CATEGORIES = new Set<string>([
  KOREAN_FIELDWORK_CATEGORIES.FIND,
  KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION,
  KOREAN_FIELDWORK_CATEGORIES.SAMPLE,
]);
const TEXT = {
  findEmptyItem: '\uc720\ubb3c\uba85/\uc218\ub7c9 \uba54\ubaa8',
  findHint:
    '\uc720\uad6c \ubaa8\uc591 \uc704\uc5d0 \uc720\ubb3c \uc704\uce58\ub97c \ub204\ub974\uc138\uc694. \ucc0d\uc740 \uc810\uc740 \ub4dc\ub798\uadf8\ud574 \uc62e\uae38 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
  feature: '\uc720\uad6c',
  noFeature: '\uc5f0\uacb0\ub41c \uc720\uad6c \uc2a4\ucf00\uce58 \uc5c6\uc74c',
  numberSuffix: '\ubc88',
  sampleEmptyItem: '\uc2dc\ub8cc\uba85/\ucc44\ucde8 \uba54\ubaa8',
  title: '\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58',
  sampleHint:
    '\uc720\uad6c \ubaa8\uc591 \uc704\uc5d0 \uc2dc\ub8cc \uc704\uce58\ub97c \ub204\ub974\uc138\uc694. \ucc0d\uc740 \uc810\uc740 \ub4dc\ub798\uadf8\ud574 \uc62e\uae38 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
  sampleTitle: '\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58',
};

const KoreanFieldworkFindSpotPanel: React.FC<Props> = ({
  compact = false,
  documents,
  onUpdateResourceFields,
  parentDocument,
  resource,
}) => {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [viewport, setViewport] = useState(DEFAULT_FIND_SPOT_VIEWPORT);
  const pinchGestureRef = useRef<FindSpotPinchGesture>();
  const panGestureRef = useRef<FindSpotPanGesture>();
  const tapGestureRef = useRef<FindSpotTapGesture>();
  const didMoveGestureRef = useRef(false);
  const draggedItemNumberRef = useRef<number>();
  const dragPreviewPointRef = useRef<SketchPoint>();
  const [dragPreview, setDragPreview] = useState<{
    number: number;
    point: SketchPoint;
  }>();
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
  const normalizedViewport = normalizeFindSpotViewport(viewport, canvasSize);
  const startViewportGesture = (event: GestureResponderEvent) => {
    const pinchGesture = getFindSpotTouchGesture(event);
    didMoveGestureRef.current = false;

    if (pinchGesture) {
      pinchGestureRef.current = {
        center: pinchGesture.center,
        distance: Math.max(1, pinchGesture.distance),
        viewport: normalizedViewport,
      };
      panGestureRef.current = undefined;
      tapGestureRef.current = undefined;
      return;
    }

    const point = getPrimaryTouchPoint(event);
    const draggedItem = point
      ? getFindSpotItemAtTouch(items, point, canvasSize, normalizedViewport)
      : undefined;
    if (draggedItem) {
      draggedItemNumberRef.current = draggedItem.number;
      dragPreviewPointRef.current = draggedItem.point;
      setDragPreview({ number: draggedItem.number, point: draggedItem.point });
      pinchGestureRef.current = undefined;
      panGestureRef.current = undefined;
      tapGestureRef.current = undefined;
      return;
    }

    tapGestureRef.current = point
      ? { start: point, viewport: normalizedViewport }
      : undefined;
    panGestureRef.current = point && normalizedViewport.scale > FIND_SPOT_MIN_SCALE
      ? { start: point, viewport: normalizedViewport }
      : undefined;
  };
  const moveViewportGesture = (event: GestureResponderEvent) => {
    if (draggedItemNumberRef.current !== undefined) {
      const point = getNormalizedPoint(event, canvasSize, normalizedViewport);
      if (point) {
        dragPreviewPointRef.current = point;
        setDragPreview({ number: draggedItemNumberRef.current, point });
      }
      return;
    }

    const pinchGesture = getFindSpotTouchGesture(event);
    if (pinchGesture) {
      const initialGesture = pinchGestureRef.current ?? {
        center: pinchGesture.center,
        distance: Math.max(1, pinchGesture.distance),
        viewport: normalizedViewport,
      };
      pinchGestureRef.current = initialGesture;
      panGestureRef.current = undefined;
      tapGestureRef.current = undefined;
      didMoveGestureRef.current = true;

      const nextScale = clamp(
        initialGesture.viewport.scale
          * (pinchGesture.distance / Math.max(1, initialGesture.distance)),
        FIND_SPOT_MIN_SCALE,
        FIND_SPOT_MAX_SCALE
      );
      const scaleRatio = nextScale / initialGesture.viewport.scale;
      const canvasCenter = getCanvasCenter(canvasSize);

      setViewport(normalizeFindSpotViewport({
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

    const point = getPrimaryTouchPoint(event);
    const tapGesture = tapGestureRef.current;
    if (point && tapGesture && getPixelDistance(tapGesture.start, point) > FIND_SPOT_TAP_DISTANCE) {
      didMoveGestureRef.current = true;
    }
    if (!point || normalizedViewport.scale <= FIND_SPOT_MIN_SCALE) return;

    const panGesture = panGestureRef.current ?? {
      start: point,
      viewport: normalizedViewport,
    };
    panGestureRef.current = panGesture;
    setViewport(normalizeFindSpotViewport({
      offsetX: panGesture.viewport.offsetX + point.x - panGesture.start.x,
      offsetY: panGesture.viewport.offsetY + point.y - panGesture.start.y,
      scale: panGesture.viewport.scale,
    }, canvasSize));
  };
  const finishViewportGesture = (event?: GestureResponderEvent) => {
    const draggedItemNumber = draggedItemNumberRef.current;
    if (draggedItemNumber !== undefined) {
      const point = event
        ? getNormalizedPoint(event, canvasSize, normalizedViewport)
        : dragPreviewPointRef.current;
      draggedItemNumberRef.current = undefined;
      dragPreviewPointRef.current = undefined;
      setDragPreview(undefined);
      if (point) {
        writeItems(items.map((item) =>
          item.number === draggedItemNumber ? { ...item, point } : item
        ));
      }
      return;
    }

    const tapGesture = tapGestureRef.current;
    const point = event ? getPrimaryTouchPoint(event) : undefined;
    const shouldAddPoint = !!tapGesture
      && !!point
      && !didMoveGestureRef.current
      && getPixelDistance(tapGesture.start, point) <= FIND_SPOT_TAP_DISTANCE;

    pinchGestureRef.current = undefined;
    panGestureRef.current = undefined;
    tapGestureRef.current = undefined;
    didMoveGestureRef.current = false;
    setViewport((currentViewport) =>
      normalizeFindSpotViewport(currentViewport, canvasSize));

    if (shouldAddPoint) addPoint(event as GestureResponderEvent);
  };
  const resetViewport = () => {
    pinchGestureRef.current = undefined;
    panGestureRef.current = undefined;
    tapGestureRef.current = undefined;
    didMoveGestureRef.current = false;
    draggedItemNumberRef.current = undefined;
    dragPreviewPointRef.current = undefined;
    setDragPreview(undefined);
    setViewport(DEFAULT_FIND_SPOT_VIEWPORT);
  };
  const addPoint = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize, normalizedViewport);
    if (!point) return;

    const nextItem = {
        label: '',
        number: getNextFindSpotNumber(items),
        point,
    };
    writeItems(items.concat(nextItem));
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
  const isSample = resource.category === KOREAN_FIELDWORK_CATEGORIES.SAMPLE;

  return (
    <View
      style={compact ? styles.compactContainer : styles.container}
      testID="findSpotPanel"
    >
      {!compact && (
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <MaterialIcons name="place" size={17} color="#344054" />
            <Text style={styles.title}>{isSample ? TEXT.sampleTitle : TEXT.title}</Text>
            <Text style={styles.countText}>{items.length}</Text>
          </View>
          <Text style={styles.featureLabel} numberOfLines={1}>
            {featureLabel}
          </Text>
        </View>
      )}
      <Text style={styles.hint}>{isSample ? TEXT.sampleHint : TEXT.findHint}</Text>
      <View
        onLayout={updateCanvasSize}
        onResponderGrant={startViewportGesture}
        onResponderMove={moveViewportGesture}
        onResponderRelease={finishViewportGesture}
        onResponderTerminate={() => finishViewportGesture()}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponder={() => true}
        style={styles.canvas}
        testID="findSpotCanvas"
      >
        <View style={styles.northBand}>
          <Text style={styles.northText}>N</Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.mapContent,
            getViewportTransformStyle(normalizedViewport),
          ]}
          testID="findSpotMapContent"
        >
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
              style={[
                styles.findPoint,
                getPointPercentStyle(
                  dragPreview?.number === item.number ? dragPreview.point : item.point
                ),
              ]}
              testID={`findSpotPoint_${item.number}`}
            >
              <Text style={styles.findPointText}>{item.number}</Text>
            </View>
          ))}
        </View>
        {normalizedViewport.scale > FIND_SPOT_MIN_SCALE && (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={resetViewport}
            style={styles.zoomResetButton}
            testID="findSpotZoomReset"
          >
            <MaterialIcons name="zoom-out-map" size={15} color="#175cd3" />
            <Text style={styles.zoomResetText}>
              {`${Math.round(normalizedViewport.scale * 100)}%`}
            </Text>
          </TouchableOpacity>
        )}
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
                placeholder={`${item.number}${TEXT.numberSuffix} ${
                  isSample ? TEXT.sampleEmptyItem : TEXT.findEmptyItem
                }`}
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

export const getKoreanFieldworkFindSpotItemCount = (value: unknown): number =>
  normalizeFindSpotItems(value).length;

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
  canvasSize: CanvasSize,
  viewport: FindSpotViewport
): SketchPoint | undefined => {
  const touchPoint = getPrimaryTouchPoint(event);
  if (!touchPoint) return undefined;

  const { x, y } = screenToViewportContentPoint(
    touchPoint,
    canvasSize,
    viewport
  );
  if (
    x < 0
    || x > canvasSize.width
    || y < 0
    || y > canvasSize.height
  ) {
    return undefined;
  }

  return {
    x: clamp((x / canvasSize.width) * 100, 0, 100),
    y: clamp((y / canvasSize.height) * 100, 0, 100),
  };
};

const screenToViewportContentPoint = (
  point: PixelPoint,
  canvasSize: CanvasSize,
  viewport: FindSpotViewport
): PixelPoint => {
  const center = getCanvasCenter(canvasSize);

  return {
    x: center.x + ((point.x - center.x - viewport.offsetX) / viewport.scale),
    y: center.y + ((point.y - center.y - viewport.offsetY) / viewport.scale),
  };
};

const viewportContentToScreenPoint = (
  point: PixelPoint,
  canvasSize: CanvasSize,
  viewport: FindSpotViewport
): PixelPoint => {
  const center = getCanvasCenter(canvasSize);

  return {
    x: center.x + ((point.x - center.x) * viewport.scale) + viewport.offsetX,
    y: center.y + ((point.y - center.y) * viewport.scale) + viewport.offsetY,
  };
};

const getFindSpotItemAtTouch = (
  items: FindSpotItem[],
  touchPoint: PixelPoint,
  canvasSize: CanvasSize,
  viewport: FindSpotViewport
): FindSpotItem | undefined =>
  items.find((item) => {
    const itemPoint = viewportContentToScreenPoint(
      denormalizePoint(item.point, canvasSize),
      canvasSize,
      viewport
    );

    return getPixelDistance(itemPoint, touchPoint)
      <= Math.max(FIND_SPOT_DRAG_HIT_RADIUS, 10 * viewport.scale);
  });

const getViewportTransformStyle = (
  viewport: FindSpotViewport
): ViewStyle => ({
  transform: [
    { translateX: viewport.offsetX },
    { translateY: viewport.offsetY },
    { scale: viewport.scale },
  ],
});

const normalizeFindSpotViewport = (
  viewport: FindSpotViewport,
  canvasSize: CanvasSize
): FindSpotViewport => {
  const scale = clamp(
    viewport.scale,
    FIND_SPOT_MIN_SCALE,
    FIND_SPOT_MAX_SCALE
  );
  if (scale <= FIND_SPOT_MIN_SCALE) return DEFAULT_FIND_SPOT_VIEWPORT;

  const maxOffsetX = (canvasSize.width * (scale - 1)) / 2;
  const maxOffsetY = (canvasSize.height * (scale - 1)) / 2;

  return {
    offsetX: clamp(viewport.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(viewport.offsetY, -maxOffsetY, maxOffsetY),
    scale,
  };
};

const getFindSpotTouchGesture = (
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
    distance: getPixelDistance(first, second),
  };
};

const getPrimaryTouchPoint = (
  event: GestureResponderEvent | undefined
): PixelPoint | undefined =>
  getNativeTouches(event)[0];

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

const normalizeTouchPoint = (
  touch: TouchPointCandidate
): PixelPoint | undefined => {
  const x = touch.locationX ?? touch.x;
  const y = touch.locationY ?? touch.y;

  return Number.isFinite(x) && Number.isFinite(y)
    ? { x: x as number, y: y as number }
    : undefined;
};

const getPixelDistance = (first: PixelPoint, second: PixelPoint): number =>
  Math.sqrt(((second.x - first.x) ** 2) + ((second.y - first.y) ** 2));

const getCanvasCenter = (canvasSize: CanvasSize): PixelPoint => ({
  x: canvasSize.width / 2,
  y: canvasSize.height / 2,
});

interface TouchPointCandidate {
  locationX?: number;
  locationY?: number;
  x?: number;
  y?: number;
}

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
  compactContainer: {
    flex: 1,
    padding: 14,
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
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    marginLeft: -9,
    marginTop: -9,
    position: 'absolute',
    width: 18,
  },
  findPointText: {
    color: '#ffffff',
    fontSize: 9,
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
  mapContent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
    zIndex: 20,
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
  zoomResetButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    bottom: 8,
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 8,
    position: 'absolute',
    right: 8,
    zIndex: 30,
  },
  zoomResetText: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
});

export default KoreanFieldworkFindSpotPanel;
