import { MaterialIcons } from '@expo/vector-icons';
import React, {
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KoreanFieldworkHandwritingPoint,
  KoreanFieldworkHandwritingStroke,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from './korean-fieldwork-handwriting';

export const KOREAN_FIELDWORK_FREE_DRAWING_FIELDS = {
  featureStrokes: 'featureFreeDrawingStrokes',
  featureUpdatedAt: 'featureFreeDrawingUpdatedAt',
} as const;

interface CanvasSize {
  height: number;
  width: number;
}

interface PixelPoint {
  x: number;
  y: number;
}

interface Props {
  onDrawingActiveChange?: (isActive: boolean) => void;
  onUpdateStrokes: (serializedStrokes: string) => void;
  strokesValue?: unknown;
  title?: string;
}

const DEFAULT_CANVAS_SIZE = {
  height: 280,
  width: 320,
};
const MAX_COORDINATE = 10000;
const BRUSH_STROKE_WIDTH = 5;
const MIN_POINT_DISTANCE = 18;
const RELEASE_POINT_MIN_DISTANCE = 1;
const INTERPOLATED_POINT_SPACING = 90;
const MAX_INTERPOLATED_POINTS_PER_MOVE = 18;
const SMOOTHING_SEGMENT_LENGTH = 7;
const MIN_SMOOTHING_STEPS = 3;
const MAX_SMOOTHING_STEPS = 12;
const TEXT = {
  title: '\uc790\uc720 \uc2a4\ucf00\uce58',
};

const KoreanFieldworkFreeDrawingPanel: React.FC<Props> = ({
  onDrawingActiveChange,
  onUpdateStrokes,
  strokesValue,
  title = TEXT.title,
}) => {
  const strokes = useMemo(
    () => normalizeKoreanFieldworkHandwritingStrokes(strokesValue),
    [strokesValue]
  );
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [activeStroke, setActiveStroke] =
    useState<KoreanFieldworkHandwritingStroke>();
  const activeStrokeRef = useRef<KoreanFieldworkHandwritingStroke>();
  const isDrawingInteractionActiveRef = useRef(false);
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const strokeCount = strokes.length;

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startStroke = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize);
    if (!point) return;

    setDrawingInteractionActive(true);
    activeStrokeRef.current = { points: [point] };
    setActiveStroke(activeStrokeRef.current);
  };
  const moveStroke = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize);
    if (!point) return;

    appendActiveStrokePoint(point);
  };
  const finishStroke = (event?: GestureResponderEvent) => {
    const releasePoint = event ? getNormalizedPoint(event, canvasSize) : undefined;
    if (releasePoint) {
      appendActiveStrokePoint(releasePoint, RELEASE_POINT_MIN_DISTANCE);
    }

    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = undefined;
    setActiveStroke(undefined);
    setDrawingInteractionActive(false);

    if (!stroke || stroke.points.length === 0) return;

    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.concat(stroke)));
  };
  const setDrawingInteractionActive = (isActive: boolean) => {
    if (isDrawingInteractionActiveRef.current === isActive) return;

    isDrawingInteractionActiveRef.current = isActive;
    onDrawingActiveChange?.(isActive);
  };
  const undoStroke = () => {
    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.slice(0, -1)));
  };
  const clearStrokes = () => {
    onUpdateStrokes(serializeKoreanFieldworkHandwriting([]));
  };
  const appendActiveStrokePoint = (
    point: KoreanFieldworkHandwritingPoint,
    minimumDistance = MIN_POINT_DISTANCE
  ) => {
    const currentStroke = activeStrokeRef.current;
    if (!currentStroke) return;

    const previousPoint = currentStroke.points[currentStroke.points.length - 1];
    if (
      previousPoint
      && getPointDistance(previousPoint, point) < minimumDistance
    ) {
      return;
    }

    const interpolatedPoints = previousPoint
      ? getInterpolatedStrokePoints(previousPoint, point)
      : [point];
    if (interpolatedPoints.length === 0) return;

    activeStrokeRef.current = {
      points: currentStroke.points.concat(interpolatedPoints),
    };
    setActiveStroke(activeStrokeRef.current);
  };

  return (
    <View style={styles.container} testID="koreanFieldworkFreeDrawingPanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="gesture" size={17} color="#344054" />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.actionRow}>
          <IconButton
            icon="undo"
            isDisabled={strokeCount === 0}
            onPress={undoStroke}
            testID="fieldworkFreeDrawingUndo"
          />
          <IconButton
            icon="delete-outline"
            isDanger
            isDisabled={strokeCount === 0}
            onPress={clearStrokes}
            testID="fieldworkFreeDrawingClear"
          />
        </View>
      </View>
      <View
        onLayout={updateCanvasSize}
        onMoveShouldSetResponderCapture={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={startStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={finishStroke}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponderCapture={() => true}
        onStartShouldSetResponder={() => true}
        onTouchCancel={() => setDrawingInteractionActive(false)}
        onTouchEnd={() => setDrawingInteractionActive(false)}
        onTouchStart={() => setDrawingInteractionActive(true)}
        style={styles.canvas}
        testID="fieldworkFreeDrawingCanvas"
      >
        {visibleStrokes.flatMap((stroke, strokeIndex) =>
          toStrokeSegments(stroke, strokeIndex, canvasSize)
        )}
      </View>
    </View>
  );
};

const IconButton: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  isDanger?: boolean;
  isDisabled: boolean;
  onPress: () => void;
  testID: string;
}> = ({
  icon,
  isDanger = false,
  isDisabled,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    disabled={isDisabled}
    onPress={onPress}
    style={[
      styles.iconButton,
      isDisabled && styles.iconButtonDisabled,
    ]}
    testID={testID}
  >
    <MaterialIcons
      name={icon}
      size={15}
      color={isDisabled ? '#98a2b3' : isDanger ? '#b42318' : '#475467'}
    />
  </TouchableOpacity>
);

const getNormalizedPoint = (
  event: GestureResponderEvent,
  canvasSize: CanvasSize
): KoreanFieldworkHandwritingPoint | undefined => {
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
    x: normalizeCoordinate((locationX / canvasSize.width) * MAX_COORDINATE),
    y: normalizeCoordinate((locationY / canvasSize.height) * MAX_COORDINATE),
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

const hasLocalTouchCoordinates = (
  value: TouchPointCandidate
): boolean =>
  Number.isFinite(value.locationX ?? value.x)
  && Number.isFinite(value.locationY ?? value.y);

const normalizeCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COORDINATE, Math.round(value)))
    : 0;

const denormalizePoint = (
  point: KoreanFieldworkHandwritingPoint,
  canvasSize: CanvasSize
): PixelPoint => ({
  x: (point.x / MAX_COORDINATE) * canvasSize.width,
  y: (point.y / MAX_COORDINATE) * canvasSize.height,
});

const getPointDistance = (
  pointA: KoreanFieldworkHandwritingPoint,
  pointB: KoreanFieldworkHandwritingPoint
): number => Math.sqrt(
  ((pointB.x - pointA.x) ** 2) + ((pointB.y - pointA.y) ** 2)
);

const getInterpolatedStrokePoints = (
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint
): KoreanFieldworkHandwritingPoint[] => {
  const distance = getPointDistance(start, end);
  if (distance === 0) return [];

  const steps = clamp(
    Math.ceil(distance / INTERPOLATED_POINT_SPACING),
    1,
    MAX_INTERPOLATED_POINTS_PER_MOVE
  );

  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;

    return {
      x: normalizeCoordinate(start.x + ((end.x - start.x) * t)),
      y: normalizeCoordinate(start.y + ((end.y - start.y) * t)),
    };
  });
};

const toStrokeSegments = (
  stroke: KoreanFieldworkHandwritingStroke,
  strokeIndex: number,
  canvasSize: CanvasSize
) => {
  const strokeWidth = BRUSH_STROKE_WIDTH;

  if (stroke.points.length === 1) {
    const point = denormalizePoint(stroke.points[0], canvasSize);

    return (
      <View
        key={`${strokeIndex}-dot`}
        pointerEvents="none"
        style={[
          styles.strokeDot,
          {
            height: strokeWidth + 4,
            left: point.x - ((strokeWidth + 4) / 2),
            top: point.y - ((strokeWidth + 4) / 2),
            width: strokeWidth + 4,
          },
        ]}
        testID="fieldworkFreeDrawingStrokeDot"
      />
    );
  }

  const smoothedPoints = getSmoothedPixelStrokePoints(stroke, canvasSize);

  const segments = smoothedPoints.slice(1).map((point, pointIndex) => {
    const previousPoint = smoothedPoints[pointIndex];
    const start = previousPoint;
    const end = point;
    const distance = Math.sqrt(((end.x - start.x) ** 2) + ((end.y - start.y) ** 2));
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    return (
      <View
        key={`${strokeIndex}-${pointIndex}`}
        pointerEvents="none"
        style={[
          styles.strokeSegment,
          {
            height: strokeWidth,
            left: ((start.x + end.x) / 2) - (distance / 2),
            top: ((start.y + end.y) / 2) - (strokeWidth / 2),
            transform: [{ rotateZ: `${angle}rad` }],
            width: distance,
          },
        ]}
        testID="fieldworkFreeDrawingStrokeSegment"
      />
    );
  });

  const joints = smoothedPoints.map((point, pointIndex) => (
    <View
      key={`${strokeIndex}-joint-${pointIndex}`}
      pointerEvents="none"
      style={[
        styles.strokeJoint,
        {
          height: strokeWidth,
          left: point.x - (strokeWidth / 2),
          top: point.y - (strokeWidth / 2),
          width: strokeWidth,
        },
      ]}
      testID="fieldworkFreeDrawingStrokeJoint"
    />
  ));

  return segments.concat(joints);
};

const getSmoothedPixelStrokePoints = (
  stroke: KoreanFieldworkHandwritingStroke,
  canvasSize: CanvasSize
): PixelPoint[] => {
  const points = stroke.points.map((point) => denormalizePoint(point, canvasSize));
  if (points.length < 3) return points;

  const smoothedPoints: PixelPoint[] = [];

  points.slice(0, -1).forEach((point, index) => {
    const nextPoint = points[index + 1];
    const previousPoint = points[Math.max(index - 1, 0)];
    const followingPoint = points[Math.min(index + 2, points.length - 1)];
    const steps = clamp(
      Math.ceil(getPixelPointDistance(point, nextPoint) / SMOOTHING_SEGMENT_LENGTH),
      MIN_SMOOTHING_STEPS,
      MAX_SMOOTHING_STEPS
    );

    for (let step = 0; step < steps; step += 1) {
      const smoothedPoint = getCatmullRomPoint(
        previousPoint,
        point,
        nextPoint,
        followingPoint,
        step / steps,
        canvasSize
      );
      appendPixelPointIfDistinct(smoothedPoints, smoothedPoint);
    }
  });

  appendPixelPointIfDistinct(smoothedPoints, points[points.length - 1]);

  return smoothedPoints;
};

const getCatmullRomPoint = (
  point0: PixelPoint,
  point1: PixelPoint,
  point2: PixelPoint,
  point3: PixelPoint,
  t: number,
  canvasSize: CanvasSize
): PixelPoint => {
  const t2 = t * t;
  const t3 = t2 * t;

  return clampPixelPoint({
    x: 0.5 * (
      (2 * point1.x)
      + ((-point0.x + point2.x) * t)
      + (((2 * point0.x) - (5 * point1.x) + (4 * point2.x) - point3.x) * t2)
      + ((-point0.x + (3 * point1.x) - (3 * point2.x) + point3.x) * t3)
    ),
    y: 0.5 * (
      (2 * point1.y)
      + ((-point0.y + point2.y) * t)
      + (((2 * point0.y) - (5 * point1.y) + (4 * point2.y) - point3.y) * t2)
      + ((-point0.y + (3 * point1.y) - (3 * point2.y) + point3.y) * t3)
    ),
  }, canvasSize);
};

const appendPixelPointIfDistinct = (
  points: PixelPoint[],
  point: PixelPoint
) => {
  const previousPoint = points[points.length - 1];
  if (!previousPoint || getPixelPointDistance(previousPoint, point) >= 0.2) {
    points.push(point);
  }
};

const getPixelPointDistance = (
  pointA: PixelPoint,
  pointB: PixelPoint
): number => Math.sqrt(
  ((pointB.x - pointA.x) ** 2) + ((pointB.y - pointA.y) ** 2)
);

const clampPixelPoint = (
  point: PixelPoint,
  canvasSize: CanvasSize
): PixelPoint => ({
  x: clamp(point.x, 0, canvasSize.width),
  y: clamp(point.y, 0, canvasSize.height),
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 19,
    marginTop: 8,
    overflow: 'hidden',
  },
  headerRow: {
    alignItems: 'center',
    borderBottomColor: '#eaecf0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    paddingRight: 8,
  },
  title: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginLeft: 5,
    width: 32,
  },
  iconButtonDisabled: {
    backgroundColor: '#f8fafc',
  },
  canvas: {
    backgroundColor: '#fffefa',
    height: DEFAULT_CANVAS_SIZE.height,
    position: 'relative',
  },
  strokeDot: {
    backgroundColor: '#111827',
    borderRadius: 4,
    position: 'absolute',
  },
  strokeSegment: {
    backgroundColor: '#111827',
    borderRadius: BRUSH_STROKE_WIDTH / 2,
    position: 'absolute',
  },
  strokeJoint: {
    backgroundColor: '#111827',
    borderRadius: BRUSH_STROKE_WIDTH / 2,
    position: 'absolute',
  },
});

export default KoreanFieldworkFreeDrawingPanel;
