import { MaterialIcons } from '@expo/vector-icons';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GestureResponderEvent,
  Image,
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

export interface FieldworkPhotoSamplePoint {
  x: number;
  y: number;
}

export const FIELDWORK_PHOTO_ANNOTATION_FIELDS = {
  photoStrokes: 'fieldworkPhotoAnnotationStrokes',
  photoUpdatedAt: 'fieldworkPhotoAnnotationUpdatedAt',
  soilProfileStrokes: 'soilProfilePhotoAnnotationStrokes',
  soilProfileUpdatedAt: 'soilProfilePhotoAnnotationUpdatedAt',
} as const;

interface FieldworkPhotoAnnotationPanelProps {
  imageUri?: string;
  strokesValue?: unknown;
  title?: string;
  sampleButtonLabel?: string;
  onSamplePoint?: (point: FieldworkPhotoSamplePoint) => Promise<void> | void;
  onUpdateStrokes: (serializedStrokes: string) => void;
}

const DEFAULT_CANVAS_SIZE = {
  height: 240,
  width: 320,
};
const MAX_COORDINATE = 10000;
const MIN_POINT_DISTANCE = 80;

interface Rect {
  height: number;
  left: number;
  top: number;
  width: number;
}

const FieldworkPhotoAnnotationPanel: React.FC<FieldworkPhotoAnnotationPanelProps> = ({
  imageUri,
  strokesValue,
  title = '사진 위 펜표시',
  sampleButtonLabel,
  onSamplePoint,
  onUpdateStrokes,
}) => {
  const strokes = useMemo(
    () => normalizeKoreanFieldworkHandwritingStrokes(strokesValue),
    [strokesValue]
  );
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [imageSize, setImageSize] = useState(DEFAULT_CANVAS_SIZE);
  const [activeStroke, setActiveStroke] =
    useState<KoreanFieldworkHandwritingStroke>();
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<string>();
  const activeStrokeRef = useRef<KoreanFieldworkHandwritingStroke>();
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const strokeCount = strokes.length;
  const pointCount = countKoreanFieldworkHandwritingPoints(strokes);
  const imageFrame = useMemo(
    () => getContainedImageFrame(canvasSize, imageSize),
    [canvasSize, imageSize]
  );

  useEffect(() => {
    if (!imageUri) return;

    let isActive = true;
    setImageSize(DEFAULT_CANVAS_SIZE);
    Image.getSize(
      imageUri,
      (width, height) => {
        if (isActive && width > 0 && height > 0) {
          setImageSize({ width, height });
        }
      },
      () => undefined
    );

    return () => {
      isActive = false;
    };
  }, [imageUri]);

  if (!imageUri) return null;

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startStroke = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, imageFrame);
    if (!point) return;

    if (isSampleMode && onSamplePoint) {
      setSampleStatus('선택 지점 토색을 읽는 중');
      setIsSampleMode(false);
      Promise.resolve(onSamplePoint(point))
        .then(() => setSampleStatus('선택 지점 먼셀 후보를 반영했습니다.'))
        .catch(() => setSampleStatus('선택 지점 토색을 읽지 못했습니다.'));
      return;
    }

    activeStrokeRef.current = { points: [point] };
    setActiveStroke(activeStrokeRef.current);
  };
  const moveStroke = (event: GestureResponderEvent) => {
    const point = getNormalizedPoint(event, imageFrame);
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
    <View style={styles.container} testID="fieldworkPhotoAnnotationPanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="draw" size={17} color="#344054" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.countText}>획 {strokeCount} · 점 {pointCount}</Text>
        </View>
        <View style={styles.actionRow}>
          {!!onSamplePoint && (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => {
                setSampleStatus('사진에서 토색을 찍을 지점을 누르세요.');
                setIsSampleMode(true);
              }}
              style={[
                styles.headerAction,
                isSampleMode && styles.headerActionActive,
              ]}
              testID="fieldworkPhotoSamplePointButton"
            >
              <MaterialIcons
                name="colorize"
                size={15}
                color={isSampleMode ? '#175cd3' : '#475467'}
              />
              <Text
                style={[
                  styles.headerActionText,
                  isSampleMode && styles.headerActionTextActive,
                ]}
              >
                {sampleButtonLabel ?? '찍기'}
              </Text>
            </TouchableOpacity>
          )}
          <IconButton
            icon="undo"
            isDisabled={strokeCount === 0}
            onPress={undoStroke}
            testID="fieldworkPhotoAnnotationUndo"
          />
          <IconButton
            icon="delete-outline"
            isDanger
            isDisabled={strokeCount === 0}
            onPress={clearStrokes}
            testID="fieldworkPhotoAnnotationClear"
          />
        </View>
      </View>
      {!!sampleStatus && (
        <Text style={styles.statusText} testID="fieldworkPhotoAnnotationStatus">
          {sampleStatus}
        </Text>
      )}
      <View
        onLayout={updateCanvasSize}
        onResponderGrant={startStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={finishStroke}
        onStartShouldSetResponder={() => true}
        style={styles.canvas}
        testID="fieldworkPhotoAnnotationCanvas"
      >
        <Image
          resizeMode="contain"
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
        />
        {visibleStrokes.flatMap((stroke, strokeIndex) =>
          toStrokeSegments(stroke, strokeIndex, imageFrame)
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
  imageFrame: Rect
): KoreanFieldworkHandwritingPoint | undefined => {
  const { locationX, locationY } = event.nativeEvent;
  if (typeof locationX !== 'number' || typeof locationY !== 'number') {
    return undefined;
  }
  if (
    locationX < imageFrame.left
    || locationX > imageFrame.left + imageFrame.width
    || locationY < imageFrame.top
    || locationY > imageFrame.top + imageFrame.height
  ) {
    return undefined;
  }

  return {
    x: normalizeCoordinate(
      ((locationX - imageFrame.left) / imageFrame.width) * MAX_COORDINATE
    ),
    y: normalizeCoordinate(
      ((locationY - imageFrame.top) / imageFrame.height) * MAX_COORDINATE
    ),
  };
};

const normalizeCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COORDINATE, Math.round(value)))
    : 0;

const denormalizePoint = (
  point: KoreanFieldworkHandwritingPoint,
  imageFrame: Rect
) => ({
  x: imageFrame.left + ((point.x / MAX_COORDINATE) * imageFrame.width),
  y: imageFrame.top + ((point.y / MAX_COORDINATE) * imageFrame.height),
});

const getContainedImageFrame = (
  canvasSize: { height: number; width: number },
  imageSize: { height: number; width: number }
): Rect => {
  if (
    canvasSize.height <= 0
    || canvasSize.width <= 0
    || imageSize.height <= 0
    || imageSize.width <= 0
  ) {
    return {
      height: canvasSize.height,
      left: 0,
      top: 0,
      width: canvasSize.width,
    };
  }

  const scale = Math.min(
    canvasSize.width / imageSize.width,
    canvasSize.height / imageSize.height
  );
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  return {
    height,
    left: (canvasSize.width - width) / 2,
    top: (canvasSize.height - height) / 2,
    width,
  };
};

const getPointDistance = (
  pointA: KoreanFieldworkHandwritingPoint,
  pointB: KoreanFieldworkHandwritingPoint
): number => Math.sqrt(
  ((pointB.x - pointA.x) ** 2) + ((pointB.y - pointA.y) ** 2)
);

const toStrokeSegments = (
  stroke: KoreanFieldworkHandwritingStroke,
  strokeIndex: number,
  imageFrame: Rect
) => {
  const strokeWidth = 3;

  if (stroke.points.length === 1) {
    const point = denormalizePoint(stroke.points[0], imageFrame);

    return (
      <View
        key={`${strokeIndex}-dot`}
        style={[
          styles.strokeDot,
          {
            height: strokeWidth + 3,
            left: point.x - ((strokeWidth + 3) / 2),
            top: point.y - ((strokeWidth + 3) / 2),
            width: strokeWidth + 3,
          },
        ]}
      />
    );
  }

  return stroke.points.slice(1).map((point, pointIndex) => {
    const previousPoint = stroke.points[pointIndex];
    const start = denormalizePoint(previousPoint, imageFrame);
    const end = denormalizePoint(point, imageFrame);
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
    marginHorizontal: 14,
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
  headerAction: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 7,
  },
  headerActionActive: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
  },
  headerActionText: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  headerActionTextActive: {
    color: '#175cd3',
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
  statusText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingTop: 7,
  },
  canvas: {
    backgroundColor: '#111827',
    height: DEFAULT_CANVAS_SIZE.height,
    position: 'relative',
  },
  strokeDot: {
    backgroundColor: '#ffea00',
    borderColor: '#111827',
    borderRadius: 4,
    borderWidth: 1,
    position: 'absolute',
  },
  strokeSegment: {
    backgroundColor: '#ffea00',
    borderRadius: 2,
    position: 'absolute',
  },
});

export default FieldworkPhotoAnnotationPanel;
