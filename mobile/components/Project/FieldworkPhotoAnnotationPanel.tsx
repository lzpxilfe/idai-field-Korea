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
  Modal,
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
const MIN_POINT_DISTANCE = 18;
const RELEASE_POINT_MIN_DISTANCE = 1;
const TAP_OPEN_FULLSCREEN_DISTANCE = 35;
const INTERPOLATED_POINT_SPACING = 90;
const MAX_INTERPOLATED_POINTS_PER_MOVE = 18;

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
  const [fullscreenCanvasSize, setFullscreenCanvasSize] =
    useState(DEFAULT_CANVAS_SIZE);
  const [imageSize, setImageSize] = useState(DEFAULT_CANVAS_SIZE);
  const [activeStroke, setActiveStroke] =
    useState<KoreanFieldworkHandwritingStroke>();
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<string>();
  const activeStrokeRef = useRef<KoreanFieldworkHandwritingStroke>();
  const touchStartPointRef = useRef<KoreanFieldworkHandwritingPoint>();
  const activeCanvasRef = useRef<'fullscreen' | 'preview'>();
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const strokeCount = strokes.length;
  const pointCount = countKoreanFieldworkHandwritingPoints(strokes);
  const imageFrame = useMemo(
    () => getContainedImageFrame(canvasSize, imageSize),
    [canvasSize, imageSize]
  );
  const fullscreenImageFrame = useMemo(
    () => getContainedImageFrame(fullscreenCanvasSize, imageSize),
    [fullscreenCanvasSize, imageSize]
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
  const updateFullscreenCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setFullscreenCanvasSize({ height, width });
  };
  const startStroke = (
    event: GestureResponderEvent,
    targetImageFrame: Rect,
    canvasMode: 'fullscreen' | 'preview'
  ) => {
    const point = getNormalizedPoint(event, targetImageFrame);
    if (!point) return;

    if (isSampleMode && onSamplePoint) {
      setSampleStatus('선택 지점 토색을 읽는 중');
      setIsSampleMode(false);
      Promise.resolve(onSamplePoint(point))
        .then(() => setSampleStatus('선택 지점 먼셀 후보를 반영했습니다.'))
        .catch(() => setSampleStatus('선택 지점 토색을 읽지 못했습니다.'));
      return;
    }

    touchStartPointRef.current = point;
    activeCanvasRef.current = canvasMode;
    activeStrokeRef.current = { points: [point] };
    setActiveStroke(activeStrokeRef.current);
  };
  const moveStroke = (
    event: GestureResponderEvent,
    targetImageFrame: Rect,
    canvasMode: 'fullscreen' | 'preview'
  ) => {
    if (activeCanvasRef.current && activeCanvasRef.current !== canvasMode) return;

    const point = getNormalizedPoint(event, targetImageFrame);
    const currentStroke = activeStrokeRef.current;
    if (!point || !currentStroke) return;

    appendActiveStrokePoint(point);
  };
  const finishStroke = (
    event?: GestureResponderEvent,
    targetImageFrame?: Rect,
    canvasMode: 'fullscreen' | 'preview' = 'preview'
  ) => {
    if (activeCanvasRef.current && activeCanvasRef.current !== canvasMode) return;
    const releasePoint = event && targetImageFrame
      ? getNormalizedPoint(event, targetImageFrame)
      : undefined;
    if (releasePoint) {
      appendActiveStrokePoint(releasePoint, RELEASE_POINT_MIN_DISTANCE);
    }

    const stroke = activeStrokeRef.current;
    const startPoint = touchStartPointRef.current;
    activeStrokeRef.current = undefined;
    touchStartPointRef.current = undefined;
    activeCanvasRef.current = undefined;
    setActiveStroke(undefined);

    if (!stroke || stroke.points.length === 0) return;

    const lastPoint = stroke.points[stroke.points.length - 1];
    if (
      canvasMode === 'preview'
      && startPoint
      && lastPoint
      && getPointDistance(startPoint, lastPoint) < TAP_OPEN_FULLSCREEN_DISTANCE
    ) {
      setIsFullscreenOpen(true);
      return;
    }

    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.concat(stroke)));
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
        onMoveShouldSetResponderCapture={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => startStroke(event, imageFrame, 'preview')}
        onResponderMove={(event) => moveStroke(event, imageFrame, 'preview')}
        onResponderRelease={(event) => finishStroke(event, imageFrame, 'preview')}
        onResponderTerminate={(event) => finishStroke(event, imageFrame, 'preview')}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponderCapture={() => true}
        onStartShouldSetResponder={() => true}
        style={styles.canvas}
        testID="fieldworkPhotoAnnotationCanvas"
      >
        <Image
          pointerEvents="none"
          resizeMode="contain"
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
        />
        {visibleStrokes.flatMap((stroke, strokeIndex) =>
          toStrokeSegments(stroke, strokeIndex, imageFrame)
        )}
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsFullscreenOpen(false)}
        visible={isFullscreenOpen}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <View style={styles.titleRow}>
              <MaterialIcons name="draw" size={18} color="white" />
              <Text style={styles.fullscreenTitle}>{title}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setIsFullscreenOpen(false)}
              style={styles.fullscreenCloseButton}
              testID="fieldworkPhotoAnnotationFullscreenClose"
            >
              <MaterialIcons name="close" size={22} color="white" />
            </TouchableOpacity>
          </View>
          <View
            onLayout={updateFullscreenCanvasSize}
            onMoveShouldSetResponderCapture={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) =>
              startStroke(event, fullscreenImageFrame, 'fullscreen')}
            onResponderMove={(event) =>
              moveStroke(event, fullscreenImageFrame, 'fullscreen')}
            onResponderRelease={(event) =>
              finishStroke(event, fullscreenImageFrame, 'fullscreen')}
            onResponderTerminate={(event) =>
              finishStroke(event, fullscreenImageFrame, 'fullscreen')}
            onResponderTerminationRequest={() => false}
            onStartShouldSetResponderCapture={() => true}
            onStartShouldSetResponder={() => true}
            style={styles.fullscreenCanvas}
            testID="fieldworkPhotoAnnotationFullscreenCanvas"
          >
            <Image
              pointerEvents="none"
              resizeMode="contain"
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
            />
            {visibleStrokes.flatMap((stroke, strokeIndex) =>
              toStrokeSegments(stroke, strokeIndex, fullscreenImageFrame)
            )}
          </View>
        </View>
      </Modal>
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
  const { locationX, locationY } = getLocalTouchPoint(event);
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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

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
        pointerEvents="none"
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

  const segments = stroke.points.slice(1).map((point, pointIndex) => {
    const previousPoint = stroke.points[pointIndex];
    const start = denormalizePoint(previousPoint, imageFrame);
    const end = denormalizePoint(point, imageFrame);
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
      />
    );
  });

  const joints = stroke.points.map((point, pointIndex) => {
    const pixelPoint = denormalizePoint(point, imageFrame);

    return (
      <View
        key={`${strokeIndex}-joint-${pointIndex}`}
        pointerEvents="none"
        style={[
          styles.strokeJoint,
          {
            height: strokeWidth,
            left: pixelPoint.x - (strokeWidth / 2),
            top: pixelPoint.y - (strokeWidth / 2),
            width: strokeWidth,
          },
        ]}
      />
    );
  });

  return segments.concat(joints);
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
  fullscreenCanvas: {
    backgroundColor: '#111827',
    flex: 1,
    position: 'relative',
  },
  fullscreenCloseButton: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 6,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  fullscreenContainer: {
    backgroundColor: '#111827',
    flex: 1,
  },
  fullscreenHeader: {
    alignItems: 'center',
    backgroundColor: '#101828',
    borderBottomColor: 'rgba(255, 255, 255, 0.14)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  fullscreenTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 6,
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
  strokeJoint: {
    backgroundColor: '#ffea00',
    borderRadius: 2,
    position: 'absolute',
  },
});

export default FieldworkPhotoAnnotationPanel;
