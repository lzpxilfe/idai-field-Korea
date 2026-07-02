import { MaterialIcons } from '@expo/vector-icons';
import React, {
  useCallback,
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
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  KoreanFieldworkHandwritingPoint,
  KoreanFieldworkHandwritingStroke,
  KoreanFieldworkHandwritingTool,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from './korean-fieldwork-handwriting';
import {
  DEFAULT_FIELDWORK_BRUSH_WIDTH,
  DEFAULT_FIELDWORK_DRAWING_TOOL,
  KoreanFieldworkBrushControls,
} from './KoreanFieldworkFullscreenDrawingModal';
import { SOIL_COLOR_MUNSELL_REFERENCES } from './soil-color-photo-assist';

export interface FieldworkPhotoSamplePoint {
  munsell?: string;
  rgb?: {
    blue: number;
    green: number;
    red: number;
  };
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
  sampleRequestKey?: number | string;
  sampleRequestLabel?: string;
  sampleButtonLabel?: string;
  onSamplePoint?: (point: FieldworkPhotoSamplePoint) => Promise<void> | void;
  onUpdateStrokes: (serializedStrokes: string) => void;
}

interface PhotoAnnotationFullscreenCommand {
  payload?: unknown;
  type: 'setBrushStyle' | 'setBrushWidth' | 'setMode' | 'setStrokes';
}

interface PhotoAnnotationFullscreenMessage {
  payload?: unknown;
  type: 'samplePoint' | 'samplePreview' | 'strokes';
}

interface PhotoSamplePreview {
  munsell?: string;
  point?: FieldworkPhotoSamplePoint;
  rgb?: {
    blue: number;
    green: number;
    red: number;
  };
}

const DEFAULT_CANVAS_SIZE = {
  height: 240,
  width: 320,
};
const MAX_COORDINATE = 10000;
const DEFAULT_BRUSH_STROKE_WIDTH = DEFAULT_FIELDWORK_BRUSH_WIDTH;
const DEFAULT_PHOTO_BRUSH_COLOR = '#ffea00';
const DEFAULT_DRAWING_TOOL = DEFAULT_FIELDWORK_DRAWING_TOOL;
const MIN_POINT_DISTANCE = 18;
const RELEASE_POINT_MIN_DISTANCE = 1;
const TAP_OPEN_FULLSCREEN_DISTANCE = 35;
const INTERPOLATED_POINT_SPACING = 90;
const MAX_INTERPOLATED_POINTS_PER_MOVE = 18;
const PHOTO_ANNOTATION_WEBVIEW_BASE_URL = 'https://idai-field.local/photo-annotation/';

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
  sampleRequestKey,
  sampleRequestLabel,
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
  const [brushColor, setBrushColor] = useState(DEFAULT_PHOTO_BRUSH_COLOR);
  const [brushWidth, setBrushWidth] = useState(DEFAULT_BRUSH_STROKE_WIDTH);
  const [drawingTool, setDrawingTool] =
    useState<KoreanFieldworkHandwritingTool>(DEFAULT_DRAWING_TOOL);
  const [activeStroke, setActiveStroke] =
    useState<KoreanFieldworkHandwritingStroke>();
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenHtml, setFullscreenHtml] = useState<string>();
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<string>();
  const activeStrokeRef = useRef<KoreanFieldworkHandwritingStroke>();
  const fullscreenWebViewRef = useRef<WebView>(null);
  const latestStrokesRef = useRef<KoreanFieldworkHandwritingStroke[]>(strokes);
  const touchStartPointRef = useRef<KoreanFieldworkHandwritingPoint>();
  const activeCanvasRef = useRef<'fullscreen' | 'preview'>();
  const handledSampleRequestKeyRef = useRef<number | string>();
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const strokeCount = strokes.length;
  const imageFrame = useMemo(
    () => getContainedImageFrame(canvasSize, imageSize),
    [canvasSize, imageSize]
  );

  const postFullscreenCommand = useCallback((
    command: PhotoAnnotationFullscreenCommand
  ) => {
    fullscreenWebViewRef.current?.postMessage(JSON.stringify(command));
  }, []);

  const openFullscreen = useCallback((nextSampleMode = false) => {
    if (!imageUri) return;

    setIsSampleMode(nextSampleMode);
    setFullscreenHtml(buildPhotoAnnotationFullscreenHtml({
      brushColor,
      brushWidth,
      drawingTool,
      imageUri,
      isSampleMode: nextSampleMode,
      munsellReferences: SOIL_COLOR_MUNSELL_REFERENCES,
      strokes: latestStrokesRef.current,
    }));
    setIsFullscreenOpen(true);
  }, [brushColor, brushWidth, drawingTool, imageUri]);

  const closeFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
    setIsSampleMode(false);
    setFullscreenHtml(undefined);
  }, []);

  useEffect(() => {
    latestStrokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    postFullscreenCommand({
      payload: { width: brushWidth },
      type: 'setBrushWidth',
    });
  }, [brushWidth, postFullscreenCommand]);

  useEffect(() => {
    postFullscreenCommand({
      payload: {
        color: brushColor,
        tool: drawingTool,
        width: brushWidth,
      },
      type: 'setBrushStyle',
    });
  }, [brushColor, brushWidth, drawingTool, postFullscreenCommand]);

  useEffect(() => {
    postFullscreenCommand({
      payload: { mode: isSampleMode ? 'sample' : 'draw' },
      type: 'setMode',
    });
  }, [isSampleMode, postFullscreenCommand]);

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

  useEffect(() => {
    if (
      !imageUri
      || !onSamplePoint
      || sampleRequestKey === undefined
      || handledSampleRequestKeyRef.current === sampleRequestKey
    ) {
      return;
    }

    handledSampleRequestKeyRef.current = sampleRequestKey;
    setSampleStatus(getSamplePrompt(sampleRequestLabel));
    openFullscreen(true);
  }, [
    imageUri,
    onSamplePoint,
    openFullscreen,
    sampleRequestKey,
    sampleRequestLabel,
  ]);

  if (!imageUri) return null;

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startStroke = (
    event: GestureResponderEvent,
    targetImageFrame: Rect,
    canvasMode: 'fullscreen' | 'preview'
  ) => {
    const point = getNormalizedPoint(event, targetImageFrame);
    if (!point) return;

    if (isSampleMode && onSamplePoint) {
      setSampleStatus(getSampleReadingMessage(sampleRequestLabel));
      setIsSampleMode(false);
      Promise.resolve(onSamplePoint(point))
        .then(() => {
          setSampleStatus(getSampleSuccessMessage(sampleRequestLabel));
          setIsFullscreenOpen(false);
        })
        .catch(() => setSampleStatus('선택 지점 토색을 읽지 못했습니다.'));
      return;
    }

    if (canvasMode === 'preview' && drawingTool === 'eraser') {
      openFullscreen(false);
      return;
    }

    touchStartPointRef.current = point;
    activeCanvasRef.current = canvasMode;
    activeStrokeRef.current = {
      color: brushColor,
      points: [point],
      tool: drawingTool,
      width: brushWidth,
    };
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
      openFullscreen(false);
      return;
    }

    commitStrokes(latestStrokesRef.current.concat(stroke));
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
      color: currentStroke.color,
      points: currentStroke.points.concat(interpolatedPoints),
      tool: currentStroke.tool,
      width: currentStroke.width,
    };
    setActiveStroke(activeStrokeRef.current);
  };
  const undoStroke = () => {
    commitStrokes(latestStrokesRef.current.slice(0, -1));
  };
  const clearStrokes = () => {
    commitStrokes([]);
  };
  const commitStrokes = (nextStrokes: KoreanFieldworkHandwritingStroke[]) => {
    const normalizedStrokes = normalizeKoreanFieldworkHandwritingStrokes(
      nextStrokes
    );
    latestStrokesRef.current = normalizedStrokes;
    onUpdateStrokes(serializeKoreanFieldworkHandwriting(normalizedStrokes));
    postFullscreenCommand({ payload: normalizedStrokes, type: 'setStrokes' });
  };
  const handleFullscreenMessage = (event: WebViewMessageEvent) => {
    const message = parsePhotoAnnotationFullscreenMessage(event.nativeEvent.data);
    if (!message) return;

    if (message.type === 'strokes') {
      commitStrokes(normalizeKoreanFieldworkHandwritingStrokes(message.payload));
      return;
    }

    if (message.type === 'samplePreview') {
      setSampleStatus(formatSamplePreviewStatus(
        message.payload,
        sampleRequestLabel
      ));
      return;
    }

    if (message.type === 'samplePoint') {
      const point = normalizeSamplePointPayload(message.payload);
      if (!point || !onSamplePoint) return;

      setSampleStatus(getSampleReadingMessage(sampleRequestLabel));
      setIsSampleMode(false);
      Promise.resolve(onSamplePoint(point))
        .then(() => {
          setSampleStatus(getSampleSuccessMessage(sampleRequestLabel));
          closeFullscreen();
        })
        .catch(() => setSampleStatus('선택 지점의 토색을 읽지 못했습니다.'));
    }
  };

  return (
    <View style={styles.container} testID="fieldworkPhotoAnnotationPanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="draw" size={17} color="#344054" />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.actionRow}>
          {!!onSamplePoint && (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => {
                setSampleStatus(getSamplePrompt(sampleRequestLabel));
                openFullscreen(true);
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
            icon="open-in-full"
            isDisabled={false}
            onPress={() => openFullscreen(false)}
            testID="fieldworkPhotoAnnotationFullscreen"
          />
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
      <KoreanFieldworkBrushControls
        brushColor={brushColor}
        brushWidth={brushWidth}
        drawingTool={drawingTool}
        onSelectBrushColor={(color) => {
          setBrushColor(color);
          setDrawingTool('pen');
        }}
        onSelectBrushWidth={setBrushWidth}
        onSelectDrawingTool={setDrawingTool}
        testIDPrefix="fieldworkPhotoAnnotationBrush"
      />
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
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <Image
            resizeMode="contain"
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        {visibleStrokes.flatMap((stroke, strokeIndex) =>
          toStrokeSegments(stroke, strokeIndex, imageFrame)
        )}
      </View>
      <Modal
        animationType="fade"
        onRequestClose={closeFullscreen}
        visible={isFullscreenOpen}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <View style={styles.titleRow}>
              <MaterialIcons name="draw" size={18} color="white" />
              <Text style={styles.fullscreenTitle}>{title}</Text>
            </View>
            {!!onSamplePoint && (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => setIsSampleMode((currentMode) => {
                  const nextMode = !currentMode;
                  if (nextMode) setSampleStatus(getSamplePrompt(sampleRequestLabel));

                  return nextMode;
                })}
                style={[
                  styles.fullscreenModeButton,
                  isSampleMode && styles.fullscreenModeButtonActive,
                ]}
                testID="fieldworkPhotoAnnotationFullscreenSampleMode"
              >
                <MaterialIcons
                  name={isSampleMode ? 'colorize' : 'draw'}
                  size={16}
                  color="white"
                />
                <Text style={styles.fullscreenModeButtonText}>
                  {isSampleMode ? '스포이드' : '펜'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={closeFullscreen}
              style={styles.fullscreenCloseButton}
              testID="fieldworkPhotoAnnotationFullscreenClose"
            >
              <MaterialIcons name="close" size={22} color="white" />
            </TouchableOpacity>
          </View>
          {!!sampleStatus && (
            <Text
              style={styles.fullscreenStatusText}
              testID="fieldworkPhotoAnnotationFullscreenStatus"
            >
              {sampleStatus}
            </Text>
          )}
          {!isSampleMode && (
            <KoreanFieldworkBrushControls
              brushColor={brushColor}
              brushWidth={brushWidth}
              drawingTool={drawingTool}
              onSelectBrushColor={(color) => {
                setBrushColor(color);
                setDrawingTool('pen');
              }}
              onSelectBrushWidth={setBrushWidth}
              onSelectDrawingTool={setDrawingTool}
              testIDPrefix="fieldworkPhotoAnnotationFullscreenBrush"
            />
          )}
          {fullscreenHtml && (
            <WebView
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              androidLayerType="hardware"
              bounces={false}
              javaScriptEnabled
              mixedContentMode="always"
              onMessage={handleFullscreenMessage}
              originWhitelist={['*']}
              ref={fullscreenWebViewRef}
              scrollEnabled={false}
              source={{
                baseUrl: PHOTO_ANNOTATION_WEBVIEW_BASE_URL,
                html: fullscreenHtml,
              }}
              style={styles.fullscreenCanvas}
              testID="fieldworkPhotoAnnotationFullscreenCanvas"
            />
          )}
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

const parsePhotoAnnotationFullscreenMessage = (
  value: string
): PhotoAnnotationFullscreenMessage | undefined => {
  try {
    const parsedValue = JSON.parse(value) as Partial<PhotoAnnotationFullscreenMessage>;
    if (
      parsedValue.type === 'samplePoint'
      || parsedValue.type === 'samplePreview'
      || parsedValue.type === 'strokes'
    ) {
      return {
        payload: parsedValue.payload,
        type: parsedValue.type,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const normalizeSamplePointPayload = (
  value: unknown
): FieldworkPhotoSamplePoint | undefined => {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as Partial<FieldworkPhotoSamplePoint>;
  const rgb = candidate.rgb
    && typeof candidate.rgb.red === 'number'
    && typeof candidate.rgb.green === 'number'
    && typeof candidate.rgb.blue === 'number'
    ? {
      blue: Math.round(candidate.rgb.blue),
      green: Math.round(candidate.rgb.green),
      red: Math.round(candidate.rgb.red),
    }
    : undefined;
  if (
    typeof candidate.x !== 'number'
    || typeof candidate.y !== 'number'
    || !Number.isFinite(candidate.x)
    || !Number.isFinite(candidate.y)
  ) {
    return undefined;
  }

  return {
    ...(typeof candidate.munsell === 'string'
      ? { munsell: candidate.munsell }
      : {}),
    ...(rgb ? { rgb } : {}),
    x: normalizeCoordinate(candidate.x),
    y: normalizeCoordinate(candidate.y),
  };
};

const formatSamplePreviewStatus = (
  value: unknown,
  sampleRequestLabel?: string
): string => {
  const preview = normalizePhotoSamplePreview(value);
  if (!preview?.munsell || !preview.rgb) return getSamplePrompt(sampleRequestLabel);

  const label = sampleRequestLabel ? `${sampleRequestLabel} ` : '';

  return `${label}${preview.munsell} · RGB ${preview.rgb.red}/${preview.rgb.green}/${preview.rgb.blue}`;
};

const normalizePhotoSamplePreview = (
  value: unknown
): PhotoSamplePreview | undefined => {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as PhotoSamplePreview;
  const rgb = candidate.rgb
    && typeof candidate.rgb.red === 'number'
    && typeof candidate.rgb.green === 'number'
    && typeof candidate.rgb.blue === 'number'
    ? {
      blue: Math.round(candidate.rgb.blue),
      green: Math.round(candidate.rgb.green),
      red: Math.round(candidate.rgb.red),
    }
    : undefined;

  return {
    munsell: typeof candidate.munsell === 'string'
      ? candidate.munsell
      : undefined,
    point: normalizeSamplePointPayload(candidate.point),
    rgb,
  };
};

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

const getSamplePrompt = (sampleRequestLabel?: string): string =>
  sampleRequestLabel
    ? `${sampleRequestLabel} 토색을 찍을 지점을 사진에서 누르세요.`
    : '사진에서 토색을 찍을 지점을 누르세요.';

const getSampleReadingMessage = (sampleRequestLabel?: string): string =>
  sampleRequestLabel
    ? `${sampleRequestLabel} 토색을 읽는 중`
    : '선택 지점 토색을 읽는 중';

const getSampleSuccessMessage = (sampleRequestLabel?: string): string =>
  sampleRequestLabel
    ? `${sampleRequestLabel} 먼셀 값을 입력했습니다.`
    : '선택 지점 먼셀 값을 입력했습니다.';

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
  if (stroke.tool === 'eraser') return [];

  const strokeWidth = getStrokeWidth(stroke);
  const strokeColor = getPhotoAnnotationStrokeColor(stroke);

  if (stroke.points.length === 1) {
    const point = denormalizePoint(stroke.points[0], imageFrame);

    return (
      <View
        key={`${strokeIndex}-dot`}
        pointerEvents="none"
        style={[
          styles.strokeDot,
          {
            backgroundColor: strokeColor,
            height: strokeWidth + 3,
            left: point.x - ((strokeWidth + 3) / 2),
            borderRadius: (strokeWidth + 3) / 2,
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
            backgroundColor: strokeColor,
            height: strokeWidth,
            left: ((start.x + end.x) / 2) - (distance / 2),
            borderRadius: strokeWidth / 2,
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
            backgroundColor: strokeColor,
            height: strokeWidth,
            left: pixelPoint.x - (strokeWidth / 2),
            borderRadius: strokeWidth / 2,
            top: pixelPoint.y - (strokeWidth / 2),
            width: strokeWidth,
          },
        ]}
      />
    );
  });

  return segments.concat(joints);
};

const getStrokeWidth = (stroke: KoreanFieldworkHandwritingStroke): number =>
  clamp(stroke.width ?? 3, 1, 24);

const getPhotoAnnotationStrokeColor = (
  stroke: KoreanFieldworkHandwritingStroke
): string => stroke.color ?? DEFAULT_PHOTO_BRUSH_COLOR;

const buildPhotoAnnotationFullscreenHtml = ({
  brushColor,
  brushWidth,
  drawingTool,
  imageUri,
  isSampleMode,
  munsellReferences,
  strokes,
}: {
  brushColor: string;
  brushWidth: number;
  drawingTool: KoreanFieldworkHandwritingTool;
  imageUri: string;
  isSampleMode: boolean;
  munsellReferences: typeof SOIL_COLOR_MUNSELL_REFERENCES;
  strokes: KoreanFieldworkHandwritingStroke[];
}): string => {
  const initialState = toHtmlJson({
    brushColor,
    brushWidth,
    drawingTool,
    imageUri,
    maxCoordinate: MAX_COORDINATE,
    mode: isSampleMode ? 'sample' : 'draw',
    munsellReferences,
    strokes: normalizeKoreanFieldworkHandwritingStrokes(strokes),
  });

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{height:100%;margin:0;overflow:hidden;background:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
#canvas{height:100vh;touch-action:none;width:100vw;}
</style>
</head>
<body>
<canvas id="canvas"></canvas>
<script>
const state=${initialState};
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d',{willReadFrequently:true});
const sampleCanvas=document.createElement('canvas');
const sampleCtx=sampleCanvas.getContext('2d',{willReadFrequently:true});
const strokeCanvas=document.createElement('canvas');
const strokeCtx=strokeCanvas.getContext('2d');
const image=new Image();
let imageReady=false;
let imageSamplingReady=false;
let strokes=Array.isArray(state.strokes)?state.strokes:[];
let brushWidth=state.brushWidth||5;
let brushColor=isHexColor(state.brushColor)?state.brushColor:'#ffea00';
let drawingTool=state.drawingTool==='eraser'?'eraser':'pen';
let mode=state.mode==='sample'?'sample':'draw';
let activeStroke=null;
let activeSample=null;
let isDrawing=false;
let renderQueued=false;
let gesture=null;
let pixelRatio=1;
let viewport={offsetX:0,offsetY:0,scale:1};
const maxCoordinate=state.maxCoordinate||10000;
const references=Array.isArray(state.munsellReferences)?state.munsellReferences:[];
const minPointDistance=${MIN_POINT_DISTANCE};
const releasePointMinDistance=${RELEASE_POINT_MIN_DISTANCE};
const interpolatedPointSpacing=${INTERPOLATED_POINT_SPACING};
const maxInterpolatedPointsPerMove=${MAX_INTERPOLATED_POINTS_PER_MOVE};
function post(type,payload){
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(JSON.stringify({type,payload}));
  }
}
function resize(){
  const rect=canvas.getBoundingClientRect();
  const ratio=window.devicePixelRatio||1;
  pixelRatio=ratio;
  canvas.width=Math.max(1,Math.round(rect.width*ratio));
  canvas.height=Math.max(1,Math.round(rect.height*ratio));
  ctx.setTransform(ratio,0,0,ratio,0,0);
  requestRender();
}
function getCssSize(){
  const rect=canvas.getBoundingClientRect();
  return {height:rect.height,width:rect.width};
}
function getBaseImageFrame(){
  const size=getCssSize();
  const imageWidth=image.naturalWidth||image.width||size.width;
  const imageHeight=image.naturalHeight||image.height||size.height;
  const scale=Math.min(size.width/imageWidth,size.height/imageHeight);
  const width=imageWidth*scale;
  const height=imageHeight*scale;
  return {
    height,
    left:(size.width-width)/2,
    top:(size.height-height)/2,
    width
  };
}
function toScreenPoint(point){
  const size=getCssSize();
  const frame=getBaseImageFrame();
  const base={
    x:frame.left+(point.x/maxCoordinate)*frame.width,
    y:frame.top+(point.y/maxCoordinate)*frame.height
  };
  return {
    x:(size.width/2)+((base.x-(size.width/2))*viewport.scale)+viewport.offsetX,
    y:(size.height/2)+((base.y-(size.height/2))*viewport.scale)+viewport.offsetY
  };
}
function screenToNormalized(point){
  const size=getCssSize();
  const frame=getBaseImageFrame();
  const base={
    x:((point.x-viewport.offsetX-(size.width/2))/viewport.scale)+(size.width/2),
    y:((point.y-viewport.offsetY-(size.height/2))/viewport.scale)+(size.height/2)
  };
  if(base.x<frame.left||base.x>frame.left+frame.width||base.y<frame.top||base.y>frame.top+frame.height){
    return undefined;
  }
  return {
    x:clamp(Math.round(((base.x-frame.left)/frame.width)*maxCoordinate),0,maxCoordinate),
    y:clamp(Math.round(((base.y-frame.top)/frame.height)*maxCoordinate),0,maxCoordinate)
  };
}
function getEventPoint(event){
  const source=event.touches&&event.touches.length?event.touches[0]:event.changedTouches&&event.changedTouches.length?event.changedTouches[0]:event;
  const rect=canvas.getBoundingClientRect();
  return {x:source.clientX-rect.left,y:source.clientY-rect.top};
}
function getTouchPoint(touch){
  const rect=canvas.getBoundingClientRect();
  return {x:touch.clientX-rect.left,y:touch.clientY-rect.top};
}
function startGesture(event){
  const first=getTouchPoint(event.touches[0]);
  const second=getTouchPoint(event.touches[1]);
  gesture={
    center:getMidpoint(first,second),
    distance:getPixelDistance(first,second),
    offsetX:viewport.offsetX,
    offsetY:viewport.offsetY,
    scale:viewport.scale
  };
  activeStroke=null;
  isDrawing=false;
}
function updateGesture(event){
  if(!gesture||event.touches.length<2) return;
  const first=getTouchPoint(event.touches[0]);
  const second=getTouchPoint(event.touches[1]);
  const center=getMidpoint(first,second);
  const nextScale=clamp(gesture.scale*(getPixelDistance(first,second)/Math.max(1,gesture.distance)),1,8);
  viewport={
    offsetX:gesture.offsetX+(center.x-gesture.center.x),
    offsetY:gesture.offsetY+(center.y-gesture.center.y),
    scale:nextScale
  };
  requestRender();
}
function startTouch(event){
  event.preventDefault();
  if(event.touches&&event.touches.length>=2){
    startGesture(event);
    return;
  }
  const point=getEventPoint(event);
  if(mode==='sample'){
    updateSample(point);
    return;
  }
  const normalized=screenToNormalized(point);
  if(!normalized) return;
  activeStroke={color:brushColor,points:[normalized],tool:drawingTool,width:brushWidth};
  isDrawing=true;
  requestRender();
}
function moveTouch(event){
  event.preventDefault();
  if(event.touches&&event.touches.length>=2){
    updateGesture(event);
    return;
  }
  const point=getEventPoint(event);
  if(mode==='sample'){
    updateSample(point);
    return;
  }
  if(!isDrawing||!activeStroke) return;
  const normalized=screenToNormalized(point);
  if(!normalized) return;
  appendActiveStrokePoint(normalized,minPointDistance);
}
function endTouch(event){
  event.preventDefault();
  if(gesture){
    gesture=null;
    return;
  }
  const point=getEventPoint(event);
  if(mode==='sample'){
    const sample=updateSample(point);
    if(sample&&sample.point) post('samplePoint',{
      x:sample.point.x,
      y:sample.point.y,
      munsell:sample.munsell,
      rgb:sample.rgb
    });
    return;
  }
  if(!isDrawing||!activeStroke) return;
  const normalized=screenToNormalized(point);
  if(normalized) appendActiveStrokePoint(normalized,releasePointMinDistance);
  strokes=strokes.concat([activeStroke]);
  activeStroke=null;
  isDrawing=false;
  post('strokes',strokes);
  requestRender();
}
function appendActiveStrokePoint(point,minDistance){
  if(!activeStroke) return;
  const previous=activeStroke.points[activeStroke.points.length-1];
  if(previous&&distance(previous,point)<minDistance) return;
  const points=previous?interpolatePoints(previous,point):[point];
  if(points.length===0) return;
  activeStroke.points=activeStroke.points.concat(points);
  requestRender();
}
function interpolatePoints(start,end){
  const gap=distance(start,end);
  const steps=Math.max(
    1,
    Math.min(maxInterpolatedPointsPerMove,Math.ceil(gap/interpolatedPointSpacing))
  );
  const points=[];
  for(let index=1;index<=steps;index+=1){
    const progress=index/steps;
    points.push({
      x:Math.round(start.x+((end.x-start.x)*progress)),
      y:Math.round(start.y+((end.y-start.y)*progress))
    });
  }
  return points;
}
function updateSample(screenPoint){
  const point=screenToNormalized(screenPoint);
  if(!point){
    activeSample=null;
    requestRender();
    return undefined;
  }
  const rgb=readRgbAtNormalizedPoint(point);
  const candidate=rgb?getNearestMunsell(rgb):undefined;
  activeSample={
    munsell:candidate&&candidate.munsell,
    point,
    rgb,
    screenPoint
  };
  post('samplePreview',{
    munsell:activeSample.munsell,
    point,
    rgb
  });
  requestRender();
  return activeSample;
}
function readRgbAtNormalizedPoint(point){
  if(!imageSamplingReady) return undefined;
  const x=clamp(Math.round((point.x/maxCoordinate)*(sampleCanvas.width-1)),0,sampleCanvas.width-1);
  const y=clamp(Math.round((point.y/maxCoordinate)*(sampleCanvas.height-1)),0,sampleCanvas.height-1);
  try{
    const data=sampleCtx.getImageData(x,y,1,1).data;
    return {red:data[0],green:data[1],blue:data[2]};
  }catch{
    return undefined;
  }
}
function draw(){
  renderQueued=false;
  const size=getCssSize();
  ctx.clearRect(0,0,size.width,size.height);
  drawPhoto();
  strokeCanvas.width=canvas.width;
  strokeCanvas.height=canvas.height;
  strokeCtx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  strokeCtx.clearRect(0,0,size.width,size.height);
  strokes.forEach((stroke)=>drawStroke(stroke,'#ffea00',strokeCtx));
  if(activeStroke) drawStroke(activeStroke,'#ffea00',strokeCtx);
  ctx.drawImage(strokeCanvas,0,0,size.width,size.height);
  if(activeSample) drawSampleOverlay(activeSample);
}
function drawPhoto(){
  const size=getCssSize();
  ctx.fillStyle='#111827';
  ctx.fillRect(0,0,size.width,size.height);
  if(!imageReady) return;
  const frame=getBaseImageFrame();
  const transformed=transformFrame(frame);
  ctx.drawImage(image,transformed.left,transformed.top,transformed.width,transformed.height);
}
function transformFrame(frame){
  const size=getCssSize();
  return {
    height:frame.height*viewport.scale,
    left:(size.width/2)+((frame.left-(size.width/2))*viewport.scale)+viewport.offsetX,
    top:(size.height/2)+((frame.top-(size.height/2))*viewport.scale)+viewport.offsetY,
    width:frame.width*viewport.scale
  };
}
function drawStroke(stroke,fallbackColor,drawingContext){
  if(!stroke||!Array.isArray(stroke.points)||stroke.points.length===0) return;
  const target=drawingContext||ctx;
  const isEraser=stroke.tool==='eraser';
  const width=Math.max(1,Math.min(24,stroke.width||5))*Math.sqrt(viewport.scale);
  const color=isEraser?'rgba(0,0,0,1)':isHexColor(stroke.color)?stroke.color:fallbackColor;
  target.save();
  target.globalCompositeOperation=isEraser?'destination-out':'source-over';
  target.strokeStyle=color;
  target.fillStyle=color;
  target.lineCap='round';
  target.lineJoin='round';
  target.lineWidth=width;
  if(stroke.points.length===1){
    const dot=toScreenPoint(stroke.points[0]);
    target.beginPath();
    target.arc(dot.x,dot.y,(width+2)/2,0,Math.PI*2);
    target.fill();
    target.restore();
    return;
  }
  const points=stroke.points.map(toScreenPoint);
  target.beginPath();
  target.moveTo(points[0].x,points[0].y);
  for(let index=1;index<points.length-1;index+=1){
    const midpoint={
      x:(points[index].x+points[index+1].x)/2,
      y:(points[index].y+points[index+1].y)/2
    };
    target.quadraticCurveTo(points[index].x,points[index].y,midpoint.x,midpoint.y);
  }
  const lastPoint=points[points.length-1];
  target.lineTo(lastPoint.x,lastPoint.y);
  target.stroke();
  target.restore();
}
function drawSampleOverlay(sample){
  const screen=toScreenPoint(sample.point);
  ctx.save();
  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(screen.x,screen.y,18,0,Math.PI*2);
  ctx.moveTo(screen.x-25,screen.y);
  ctx.lineTo(screen.x+25,screen.y);
  ctx.moveTo(screen.x,screen.y-25);
  ctx.lineTo(screen.x,screen.y+25);
  ctx.stroke();
  const label=sample.munsell&&sample.rgb
    ? sample.munsell+' · RGB '+sample.rgb.red+'/'+sample.rgb.green+'/'+sample.rgb.blue
    : '픽셀 확인 중';
  const labelX=clamp(screen.x+24,8,getCssSize().width-190);
  const labelY=clamp(screen.y-46,8,getCssSize().height-54);
  ctx.fillStyle='rgba(17,24,39,0.88)';
  roundRect(labelX,labelY,178,46,8);
  ctx.fill();
  if(sample.rgb){
    ctx.fillStyle='rgb('+sample.rgb.red+','+sample.rgb.green+','+sample.rgb.blue+')';
    roundRect(labelX+8,labelY+10,24,24,5);
    ctx.fill();
  }
  ctx.fillStyle='#ffffff';
  ctx.font='700 13px sans-serif';
  ctx.fillText(label,labelX+40,labelY+28);
  ctx.restore();
}
function requestRender(){
  if(renderQueued) return;
  renderQueued=true;
  requestAnimationFrame(draw);
}
function handleCommand(event){
  let command;
  try{command=JSON.parse(event.data);}catch{return;}
  if(command.type==='setBrushWidth'){
    brushWidth=Math.max(1,Math.min(24,Number(command.payload&&command.payload.width)||brushWidth));
    return;
  }
  if(command.type==='setBrushStyle'){
    const payload=command.payload||{};
    brushWidth=Math.max(1,Math.min(24,Number(payload.width)||brushWidth));
    brushColor=isHexColor(payload.color)?payload.color:brushColor;
    drawingTool=payload.tool==='eraser'?'eraser':'pen';
    return;
  }
  if(command.type==='setMode'){
    mode=command.payload&&command.payload.mode==='sample'?'sample':'draw';
    activeStroke=null;
    isDrawing=false;
    activeSample=null;
    requestRender();
    return;
  }
  if(command.type==='setStrokes'){
    strokes=Array.isArray(command.payload)?command.payload:[];
    requestRender();
  }
}
function getNearestMunsell(rgb){
  const sampleLab=rgbToLab(rgb);
  return references
    .map((reference)=>({
      deltaE:deltaE(sampleLab,rgbToLab(reference.rgb)),
      munsell:reference.munsell
    }))
    .sort((left,right)=>left.deltaE-right.deltaE)[0];
}
function rgbToLab(rgb){
  const red=srgbToLinear(rgb.red/255);
  const green=srgbToLinear(rgb.green/255);
  const blue=srgbToLinear(rgb.blue/255);
  const x=((red*0.4124)+(green*0.3576)+(blue*0.1805))/0.95047;
  const y=(red*0.2126)+(green*0.7152)+(blue*0.0722);
  const z=((red*0.0193)+(green*0.1192)+(blue*0.9505))/1.08883;
  const fx=labPivot(x);
  const fy=labPivot(y);
  const fz=labPivot(z);
  return {l:(116*fy)-16,a:500*(fx-fy),b:200*(fy-fz)};
}
function srgbToLinear(value){
  return value<=0.04045?value/12.92:Math.pow((value+0.055)/1.055,2.4);
}
function labPivot(value){
  return value>0.008856?Math.cbrt(value):(7.787*value)+(16/116);
}
function deltaE(left,right){
  return Math.sqrt(Math.pow(left.l-right.l,2)+Math.pow(left.a-right.a,2)+Math.pow(left.b-right.b,2));
}
function getMidpoint(a,b){
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
function getPixelDistance(a,b){
  return Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2));
}
function distance(a,b){
  return Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2));
}
function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}
function isHexColor(value){
  return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
}
function roundRect(x,y,width,height,radius){
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.arcTo(x+width,y,x+width,y+height,radius);
  ctx.arcTo(x+width,y+height,x,y+height,radius);
  ctx.arcTo(x,y+height,x,y,radius);
  ctx.arcTo(x,y,x+width,y,radius);
  ctx.closePath();
}
canvas.addEventListener('touchstart',startTouch,{passive:false});
canvas.addEventListener('touchmove',moveTouch,{passive:false});
canvas.addEventListener('touchend',endTouch,{passive:false});
canvas.addEventListener('touchcancel',endTouch,{passive:false});
canvas.addEventListener('mousedown',startTouch);
canvas.addEventListener('mousemove',moveTouch);
window.addEventListener('mouseup',endTouch);
window.addEventListener('message',handleCommand);
document.addEventListener('message',handleCommand);
window.addEventListener('resize',resize);
image.onload=function(){
  imageReady=true;
  try{
    sampleCanvas.width=image.naturalWidth||image.width;
    sampleCanvas.height=image.naturalHeight||image.height;
    sampleCtx.drawImage(image,0,0,sampleCanvas.width,sampleCanvas.height);
    sampleCtx.getImageData(0,0,1,1);
    imageSamplingReady=true;
  }catch{
    imageSamplingReady=false;
  }
  requestRender();
};
image.onerror=function(){
  requestRender();
};
image.src=state.imageUri;
resize();
</script>
</body>
</html>`;
};

const toHtmlJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

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
  fullscreenModeButton: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 38,
    marginRight: 8,
    paddingHorizontal: 10,
  },
  fullscreenModeButtonActive: {
    backgroundColor: 'rgba(23, 92, 211, 0.52)',
    borderColor: 'rgba(178, 221, 255, 0.74)',
  },
  fullscreenModeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  fullscreenStatusText: {
    backgroundColor: '#1f2937',
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
