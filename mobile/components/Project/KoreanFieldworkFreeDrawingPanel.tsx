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
  countKoreanFieldworkHandwritingPoints,
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

interface Props {
  onUpdateStrokes: (serializedStrokes: string) => void;
  strokesValue?: unknown;
  title?: string;
}

const DEFAULT_CANVAS_SIZE = {
  height: 280,
  width: 320,
};
const MAX_COORDINATE = 10000;
const MIN_POINT_DISTANCE = 80;
const TEXT = {
  title: '\uc790\uc720 \uc2a4\ucf00\uce58',
  countPrefix: '\ud68d',
  pointPrefix: '\uc810',
};

const KoreanFieldworkFreeDrawingPanel: React.FC<Props> = ({
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
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const strokeCount = strokes.length;
  const pointCount = countKoreanFieldworkHandwritingPoints(strokes);

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startStroke = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize);
    if (!point) return;

    activeStrokeRef.current = { points: [point] };
    setActiveStroke(activeStrokeRef.current);
  };
  const moveStroke = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, canvasSize);
    const currentStroke = activeStrokeRef.current;
    if (!point || !currentStroke) return;

    const previousPoint = currentStroke.points[currentStroke.points.length - 1];
    if (previousPoint && getPointDistance(previousPoint, point) < MIN_POINT_DISTANCE) {
      return;
    }

    activeStrokeRef.current = {
      points: currentStroke.points.concat(point),
    };
    setActiveStroke(activeStrokeRef.current);
  };
  const finishStroke = () => {
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = undefined;
    setActiveStroke(undefined);

    if (!stroke || stroke.points.length === 0) return;

    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.concat(stroke)));
  };
  const undoStroke = () => {
    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.slice(0, -1)));
  };
  const clearStrokes = () => {
    onUpdateStrokes(serializeKoreanFieldworkHandwriting([]));
  };

  return (
    <View style={styles.container} testID="koreanFieldworkFreeDrawingPanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="gesture" size={17} color="#344054" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.countText}>
            {TEXT.countPrefix} {strokeCount} · {TEXT.pointPrefix} {pointCount}
          </Text>
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
        onResponderGrant={startStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={finishStroke}
        onStartShouldSetResponder={() => true}
        style={styles.canvas}
        testID="fieldworkFreeDrawingCanvas"
      >
        <View pointerEvents="none" style={styles.gridVertical} />
        <View pointerEvents="none" style={styles.gridHorizontal} />
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
  const { locationX, locationY } = event.nativeEvent;
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

const normalizeCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COORDINATE, Math.round(value)))
    : 0;

const denormalizePoint = (
  point: KoreanFieldworkHandwritingPoint,
  canvasSize: CanvasSize
) => ({
  x: (point.x / MAX_COORDINATE) * canvasSize.width,
  y: (point.y / MAX_COORDINATE) * canvasSize.height,
});

const getPointDistance = (
  pointA: KoreanFieldworkHandwritingPoint,
  pointB: KoreanFieldworkHandwritingPoint
): number => Math.sqrt(
  ((pointB.x - pointA.x) ** 2) + ((pointB.y - pointA.y) ** 2)
);

const toStrokeSegments = (
  stroke: KoreanFieldworkHandwritingStroke,
  strokeIndex: number,
  canvasSize: CanvasSize
) => {
  const strokeWidth = 3;

  if (stroke.points.length === 1) {
    const point = denormalizePoint(stroke.points[0], canvasSize);

    return (
      <View
        key={`${strokeIndex}-dot`}
        style={[
          styles.strokeDot,
          {
            height: strokeWidth + 4,
            left: point.x - ((strokeWidth + 4) / 2),
            top: point.y - ((strokeWidth + 4) / 2),
            width: strokeWidth + 4,
          },
        ]}
      />
    );
  }

  return stroke.points.slice(1).map((point, pointIndex) => {
    const previousPoint = stroke.points[pointIndex];
    const start = denormalizePoint(previousPoint, canvasSize);
    const end = denormalizePoint(point, canvasSize);
    const distance = Math.sqrt(((end.x - start.x) ** 2) + ((end.y - start.y) ** 2));
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    return (
      <View
        key={`${strokeIndex}-${pointIndex}`}
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
      />
    );
  });
};

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
  countText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 7,
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
    backgroundColor: '#ffffff',
    height: DEFAULT_CANVAS_SIZE.height,
    position: 'relative',
  },
  gridVertical: {
    backgroundColor: '#eef2f6',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 0,
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
  strokeDot: {
    backgroundColor: '#111827',
    borderRadius: 4,
    position: 'absolute',
  },
  strokeSegment: {
    backgroundColor: '#111827',
    borderRadius: 2,
    position: 'absolute',
  },
});

export default KoreanFieldworkFreeDrawingPanel;
