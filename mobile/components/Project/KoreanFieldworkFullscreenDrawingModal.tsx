import { MaterialIcons } from '@expo/vector-icons';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  KoreanFieldworkHandwritingStroke,
  KoreanFieldworkHandwritingTool,
  normalizeKoreanFieldworkHandwritingStrokes,
} from './korean-fieldwork-handwriting';
import {
  KOREAN_FIELDWORK_PEN_MEMO_GRID_STEP,
  KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT,
} from './korean-fieldwork-pen-memo-layout';

export const DEFAULT_FIELDWORK_BRUSH_WIDTH = 5;
export const FIELDWORK_BRUSH_WIDTH_OPTIONS = [3, 5, 8, 12] as const;
export const DEFAULT_FIELDWORK_BRUSH_COLOR = '#111827';
export const FIELDWORK_BRUSH_COLOR_OPTIONS = [
  '#111827',
  '#dc2626',
  '#f59e0b',
  '#16a34a',
  '#2563eb',
] as const;
export const DEFAULT_FIELDWORK_DRAWING_TOOL: KoreanFieldworkHandwritingTool = 'pen';
export type FieldworkDrawingInteractionTool =
  | KoreanFieldworkHandwritingTool
  | 'hand'
  | 'lasso';

export interface FieldworkFullscreenDrawingBackground {
  aspectRatio?: number;
  boundaryPoints?: { x: number; y: number }[];
  label?: string;
  satelliteAttribution?: string;
  satelliteTiles?: {
    heightPercent: number;
    key: string;
    leftPercent: number;
    topPercent: number;
    uri: string;
    widthPercent: number;
  }[];
  writingGuides?: boolean;
}

interface FullscreenDrawingCommand {
  payload?: unknown;
  type:
    | 'deleteSelection'
    | 'resetViewport'
    | 'setBrushStyle'
    | 'setBrushWidth'
    | 'setStrokes';
}

interface FullscreenDrawingMessage {
  payload?: unknown;
  type: 'drawingActive' | 'ready' | 'selection' | 'strokes';
}

interface Props {
  background?: FieldworkFullscreenDrawingBackground;
  brushColor?: string;
  brushWidth: number;
  drawingTool?: KoreanFieldworkHandwritingTool;
  isCloseDisabled?: boolean;
  isVisible: boolean;
  onBrushColorChange?: (color: string) => void;
  onBrushWidthChange: (width: number) => void;
  onClose: () => void;
  onDrawingActiveChange?: (isActive: boolean) => void;
  onDrawingToolChange?: (tool: KoreanFieldworkHandwritingTool) => void;
  onUpdateStrokes: (strokes: KoreanFieldworkHandwritingStroke[]) => void;
  strokes: KoreanFieldworkHandwritingStroke[];
  statusText?: string;
  statusTone?: 'error' | 'neutral' | 'success';
  testIDPrefix: string;
  title: string;
}

const TEXT = {
  brush: '\ud39c',
};
const MAX_COORDINATE = 10000;
const FULLSCREEN_DRAWING_MIN_POINT_DISTANCE = 32;
const FULLSCREEN_DRAWING_RELEASE_POINT_MIN_DISTANCE = 1;
const FULLSCREEN_DRAWING_INTERPOLATED_POINT_SPACING = 80;
const FULLSCREEN_DRAWING_MAX_INTERPOLATED_POINTS_PER_MOVE = 18;
const WEBVIEW_BASE_URL = 'https://idai-field.local/fullscreen-drawing/';

const KoreanFieldworkFullscreenDrawingModal: React.FC<Props> = ({
  background,
  brushColor = DEFAULT_FIELDWORK_BRUSH_COLOR,
  brushWidth,
  drawingTool = DEFAULT_FIELDWORK_DRAWING_TOOL,
  isCloseDisabled = false,
  isVisible,
  onBrushColorChange,
  onBrushWidthChange,
  onClose,
  onDrawingActiveChange,
  onDrawingToolChange,
  onUpdateStrokes,
  strokes,
  statusText,
  statusTone = 'neutral',
  testIDPrefix,
  title,
}) => {
  const webViewRef = useRef<WebView>(null);
  const wasVisibleRef = useRef(false);
  const currentStrokesRef = useRef<KoreanFieldworkHandwritingStroke[]>([]);
  const undoHistoryRef = useRef<KoreanFieldworkHandwritingStroke[][]>([]);
  const redoHistoryRef = useRef<KoreanFieldworkHandwritingStroke[][]>([]);
  const normalizedStrokes = useMemo(
    () => normalizeKoreanFieldworkHandwritingStrokes(strokes),
    [strokes]
  );
  const [html, setHtml] = useState<string>();
  const [currentStrokes, setCurrentStrokes] =
    useState<KoreanFieldworkHandwritingStroke[]>(normalizedStrokes);
  const [canRedo, setCanRedo] = useState(false);
  const [interactionTool, setInteractionTool] =
    useState<FieldworkDrawingInteractionTool>(drawingTool);
  const [selectedStrokeCount, setSelectedStrokeCount] = useState(0);

  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      setCurrentStrokes(normalizedStrokes);
      currentStrokesRef.current = normalizedStrokes;
      undoHistoryRef.current = [];
      redoHistoryRef.current = [];
      setCanRedo(false);
      setInteractionTool(drawingTool);
      setSelectedStrokeCount(0);
      setHtml(buildFullscreenDrawingHtml({
        background,
        brushColor,
        brushWidth,
        drawingTool,
        strokes: normalizedStrokes,
      }));
    }
    if (!isVisible && wasVisibleRef.current) {
      setHtml(undefined);
      setCurrentStrokes(normalizedStrokes);
      onDrawingActiveChange?.(false);
      setSelectedStrokeCount(0);
    }
    wasVisibleRef.current = isVisible;
  }, [
    background,
    brushColor,
    brushWidth,
    drawingTool,
    isVisible,
    normalizedStrokes,
    onDrawingActiveChange,
  ]);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStrokes(normalizedStrokes);
      return;
    }

    postCommand({
      type: 'setBrushStyle',
      payload: {
        color: brushColor,
        tool: interactionTool,
        width: brushWidth,
      },
    });
  }, [brushColor, brushWidth, interactionTool, isVisible, normalizedStrokes]);

  const postCommand = (command: FullscreenDrawingCommand) => {
    webViewRef.current?.postMessage(JSON.stringify(command));
  };
  const updateStrokes = (nextStrokes: KoreanFieldworkHandwritingStroke[]) => {
    const normalizedNextStrokes = normalizeKoreanFieldworkHandwritingStrokes(
      nextStrokes
    );
    currentStrokesRef.current = normalizedNextStrokes;
    setCurrentStrokes(normalizedNextStrokes);
    onUpdateStrokes(normalizedNextStrokes);
  };
  const recordStrokes = (nextStrokes: KoreanFieldworkHandwritingStroke[]) => {
    undoHistoryRef.current.push(currentStrokesRef.current);
    redoHistoryRef.current = [];
    setCanRedo(false);
    updateStrokes(nextStrokes);
  };
  const undoStroke = () => {
    const fallbackHistory = currentStrokesRef.current.length > 0
      ? [currentStrokesRef.current.slice(0, -1)]
      : [];
    const nextStrokes = undoHistoryRef.current.pop() ?? fallbackHistory[0];
    if (!nextStrokes) return;

    redoHistoryRef.current.push(currentStrokesRef.current);
    updateStrokes(nextStrokes);
    setCanRedo(true);
    setSelectedStrokeCount(0);
    postCommand({ type: 'setStrokes', payload: nextStrokes });
  };
  const redoStroke = () => {
    const nextStrokes = redoHistoryRef.current.pop();
    if (!nextStrokes) return;

    undoHistoryRef.current.push(currentStrokesRef.current);
    updateStrokes(nextStrokes);
    setCanRedo(redoHistoryRef.current.length > 0);
    setSelectedStrokeCount(0);
    postCommand({ type: 'setStrokes', payload: nextStrokes });
  };
  const clearStrokes = () => {
    if (currentStrokesRef.current.length === 0) return;
    recordStrokes([]);
    setSelectedStrokeCount(0);
    postCommand({ type: 'setStrokes', payload: [] });
  };
  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseFullscreenDrawingMessage(event.nativeEvent.data);
    if (!message) return;

    if (message.type === 'drawingActive') {
      onDrawingActiveChange?.(message.payload === true);
      return;
    }

    if (message.type === 'selection') {
      const payload = message.payload as { count?: unknown } | undefined;
      setSelectedStrokeCount(
        typeof payload?.count === 'number' ? Math.max(0, payload.count) : 0
      );
      return;
    }

    if (message.type === 'strokes') {
      recordStrokes(normalizeKoreanFieldworkHandwritingStrokes(message.payload));
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      visible={isVisible}
    >
      <SafeAreaView style={styles.fullscreenRoot}>
        <View style={styles.fullscreenHeader}>
          <View style={styles.fullscreenTitleRow}>
            <MaterialIcons name="gesture" size={18} color="#111827" />
            <Text style={styles.fullscreenTitle}>{title}</Text>
            {!!statusText && (
              <View
                accessibilityLiveRegion="polite"
                style={[
                  styles.statusPill,
                  statusTone === 'error' && styles.statusPillError,
                  statusTone === 'success' && styles.statusPillSuccess,
                ]}
                testID={`${testIDPrefix}FullscreenStatus`}
              >
                <MaterialIcons
                  name={statusTone === 'error'
                    ? 'error-outline'
                    : statusTone === 'success'
                      ? 'check-circle-outline'
                      : 'sync'}
                  size={14}
                  color={statusTone === 'error'
                    ? '#b42318'
                    : statusTone === 'success'
                      ? '#027a48'
                      : '#344054'}
                />
                <Text style={[
                  styles.statusText,
                  statusTone === 'error' && styles.statusTextError,
                  statusTone === 'success' && styles.statusTextSuccess,
                ]}>
                  {statusText}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.fullscreenActions}>
            <IconButton
              icon="undo"
              isDisabled={currentStrokes.length === 0}
              onPress={undoStroke}
              testID={`${testIDPrefix}FullscreenUndo`}
            />
            <IconButton
              icon="redo"
              isDisabled={!canRedo}
              onPress={redoStroke}
              testID={`${testIDPrefix}FullscreenRedo`}
            />
            {selectedStrokeCount > 0 && (
              <IconButton
                icon="delete-sweep"
                isDanger
                isDisabled={false}
                onPress={() => postCommand({ type: 'deleteSelection' })}
                testID={`${testIDPrefix}FullscreenDeleteSelection`}
              />
            )}
            <IconButton
              icon="center-focus-strong"
              isDisabled={false}
              onPress={() => postCommand({ type: 'resetViewport' })}
              testID={`${testIDPrefix}FullscreenResetViewport`}
            />
            <IconButton
              icon="delete-outline"
              isDanger
              isDisabled={currentStrokes.length === 0}
              onPress={clearStrokes}
              testID={`${testIDPrefix}FullscreenClear`}
            />
            <IconButton
              icon="close"
              isDisabled={isCloseDisabled}
              onPress={onClose}
              testID={`${testIDPrefix}FullscreenClose`}
            />
          </View>
        </View>
        <KoreanFieldworkBrushControls
          activeInteractionTool={interactionTool}
          brushColor={brushColor}
          brushWidth={brushWidth}
          drawingTool={drawingTool}
          onSelectBrushColor={onBrushColorChange}
          onSelectBrushWidth={onBrushWidthChange}
          onSelectAdvancedTool={setInteractionTool}
          onSelectDrawingTool={(tool) => {
            setInteractionTool(tool);
            onDrawingToolChange?.(tool);
          }}
          showAdvancedTools
          testIDPrefix={`${testIDPrefix}FullscreenBrush`}
        />
        {background?.writingGuides && (
          <View
            style={styles.writingGuideNotice}
            testID={`${testIDPrefix}FullscreenWritingGuideNotice`}
          >
            <MaterialIcons name="grid-on" size={14} color="#2f6f4e" />
            <Text style={styles.writingGuideNoticeText}>
              방안지 무늬는 화면에만 표시 · 저장과 글자 인식에서 제외됩니다
            </Text>
          </View>
        )}
        {html && (
          <WebView
            androidLayerType="hardware"
            bounces={false}
            javaScriptEnabled
            onMessage={handleMessage}
            originWhitelist={['*']}
            ref={webViewRef}
            scrollEnabled={false}
            source={{ html, baseUrl: WEBVIEW_BASE_URL }}
            style={styles.fullscreenCanvas}
            testID={`${testIDPrefix}FullscreenCanvas`}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export const KoreanFieldworkBrushControls: React.FC<{
  activeInteractionTool?: FieldworkDrawingInteractionTool;
  brushColor?: string;
  brushWidth: number;
  drawingTool?: KoreanFieldworkHandwritingTool;
  isDisabled?: boolean;
  onSelectAdvancedTool?: (tool: 'hand' | 'lasso') => void;
  onSelectBrushColor?: (color: string) => void;
  onSelectBrushWidth: (width: number) => void;
  onSelectDrawingTool?: (tool: KoreanFieldworkHandwritingTool) => void;
  showAdvancedTools?: boolean;
  testIDPrefix: string;
}> = ({
  activeInteractionTool,
  brushColor = DEFAULT_FIELDWORK_BRUSH_COLOR,
  brushWidth,
  drawingTool = DEFAULT_FIELDWORK_DRAWING_TOOL,
  isDisabled = false,
  onSelectAdvancedTool,
  onSelectBrushColor,
  onSelectBrushWidth,
  onSelectDrawingTool,
  showAdvancedTools = false,
  testIDPrefix,
}) => (
  <View style={styles.brushRow}>
    {!!onSelectDrawingTool && (
      <View style={styles.toolGroup}>
        {(['pen', 'eraser'] as const).map((tool) => {
          const isSelected = (activeInteractionTool ?? drawingTool) === tool;

          return (
            <TouchableOpacity
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.86}
              disabled={isDisabled}
              key={tool}
              onPress={() => onSelectDrawingTool(tool)}
              style={[
                styles.toolOption,
                isSelected && styles.toolOptionSelected,
                isDisabled && styles.brushOptionDisabled,
              ]}
              testID={`${testIDPrefix}Tool_${tool}`}
            >
              <MaterialIcons
                name={tool === 'pen' ? 'edit' : 'backspace'}
                size={16}
                color={isDisabled ? '#98a2b3' : isSelected ? '#027a48' : '#475467'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    )}
    {showAdvancedTools && !!onSelectAdvancedTool && (
      <View style={styles.toolGroup}>
        {(['lasso', 'hand'] as const).map((tool) => {
          const isSelected = activeInteractionTool === tool;

          return (
            <TouchableOpacity
              accessibilityLabel={tool === 'lasso' ? '올가미 선택' : '화면 이동'}
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.86}
              disabled={isDisabled}
              key={tool}
              onPress={() => onSelectAdvancedTool(tool)}
              style={[
                styles.toolOption,
                isSelected && styles.toolOptionSelected,
                isDisabled && styles.brushOptionDisabled,
              ]}
              testID={`${testIDPrefix}Tool_${tool}`}
            >
              <MaterialIcons
                name={tool === 'lasso' ? 'gesture' : 'pan-tool'}
                size={16}
                color={isDisabled ? '#98a2b3' : isSelected ? '#027a48' : '#475467'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    )}
    {!!onSelectBrushColor && (
      <View style={styles.colorGroup}>
        {FIELDWORK_BRUSH_COLOR_OPTIONS.map((color, index) => {
          const isSelected =
            drawingTool !== 'eraser'
            && brushColor.toLowerCase() === color.toLowerCase();

          return (
            <TouchableOpacity
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.86}
              disabled={isDisabled}
              key={color}
              onPress={() => onSelectBrushColor(color)}
              style={[
                styles.colorOption,
                isSelected && styles.colorOptionSelected,
                isDisabled && styles.brushOptionDisabled,
              ]}
              testID={`${testIDPrefix}Color_${index}`}
            >
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    )}
    <Text style={styles.brushLabel}>{TEXT.brush}</Text>
    {FIELDWORK_BRUSH_WIDTH_OPTIONS.map((width) => {
      const isSelected = brushWidth === width;

      return (
        <TouchableOpacity
          accessibilityState={{ selected: isSelected }}
          activeOpacity={0.86}
          disabled={isDisabled}
          key={width}
          onPress={() => onSelectBrushWidth(width)}
          style={[
            styles.brushOption,
            isSelected && styles.brushOptionSelected,
            isDisabled && styles.brushOptionDisabled,
          ]}
          testID={`${testIDPrefix}_${width}`}
        >
          <View
            style={[
              styles.brushDot,
              {
                height: width + 5,
                width: width + 5,
              },
            ]}
          />
          <Text
            style={[
              styles.brushOptionText,
              isSelected && styles.brushOptionTextSelected,
            ]}
          >
            {width}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

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
      size={16}
      color={isDisabled ? '#98a2b3' : isDanger ? '#b42318' : '#344054'}
    />
  </TouchableOpacity>
);

const parseFullscreenDrawingMessage = (
  value: string
): FullscreenDrawingMessage | undefined => {
  try {
    const parsedValue = JSON.parse(value) as Partial<FullscreenDrawingMessage>;
    if (
      parsedValue.type === 'drawingActive'
      || parsedValue.type === 'ready'
      || parsedValue.type === 'selection'
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

const buildFullscreenDrawingHtml = ({
  background,
  brushColor,
  brushWidth,
  drawingTool,
  strokes,
}: {
  background?: FieldworkFullscreenDrawingBackground;
  brushColor: string;
  brushWidth: number;
  drawingTool: KoreanFieldworkHandwritingTool;
  strokes: KoreanFieldworkHandwritingStroke[];
}): string => {
  const initialState = toHtmlJson({
    background,
    brushColor,
    brushWidth,
    drawingTool,
    maxCoordinate: MAX_COORDINATE,
    strokes: normalizeKoreanFieldworkHandwritingStrokes(strokes),
  });

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{height:100%;margin:0;overflow:hidden;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
#board{height:100vh;position:relative;width:100vw;}
#canvas{background:#fffefa;height:100%;touch-action:none;width:100%;}
</style>
</head>
<body>
<div id="board"><canvas id="canvas"></canvas></div>
<script>
const state=${initialState};
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');
const strokeCanvas=document.createElement('canvas');
const strokeCtx=strokeCanvas.getContext('2d');
let strokes=Array.isArray(state.strokes)?state.strokes:[];
let brushWidth=state.brushWidth||5;
let brushColor=isHexColor(state.brushColor)?state.brushColor:'#111827';
let drawingTool=normalizeDrawingTool(state.drawingTool);
let activeStroke=null;
let activePointers=new Map();
let gesture=null;
let isDrawing=false;
let lassoPoints=[];
let selectedIndices=[];
let selectionMove=null;
let lastPenInteractionAt=0;
let renderQueued=false;
let pixelRatio=1;
const maxCoordinate=state.maxCoordinate||10000;
const background=state.background||{};
const penMemoGridStep=${KOREAN_FIELDWORK_PEN_MEMO_GRID_STEP};
const penMemoLineHeight=${KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT};
const satelliteTiles=(Array.isArray(background.satelliteTiles)
  ?background.satelliteTiles:[]).map((tile)=>{
    const image=new Image();
    const entry={...tile,image,loaded:false};
    image.onload=()=>{entry.loaded=true;requestRender();};
    image.onerror=()=>{entry.loaded=false;requestRender();};
    image.src=tile.uri;
    return entry;
  });
const minPointDistance=${FULLSCREEN_DRAWING_MIN_POINT_DISTANCE};
const releasePointMinDistance=${FULLSCREEN_DRAWING_RELEASE_POINT_MIN_DISTANCE};
const interpolatedPointSpacing=${FULLSCREEN_DRAWING_INTERPOLATED_POINT_SPACING};
const maxInterpolatedPointsPerMove=${FULLSCREEN_DRAWING_MAX_INTERPOLATED_POINTS_PER_MOVE};
let viewport={offsetX:0,offsetY:0,scale:1};
const palmRejectionAfterPenMs=700;
const palmContactSize=34;
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
function getBaseDrawingFrame(){
  const size=getCssSize();
  const aspectRatio=Math.max(0.05,Math.min(20,Number(background.aspectRatio)||1));
  const canvasAspect=size.width/Math.max(size.height,1);
  let width=size.width;
  let height=size.height;
  if(canvasAspect>aspectRatio){
    width=height*aspectRatio;
  }else{
    height=width/aspectRatio;
  }
  return {
    height,
    left:(size.width-width)/2,
    top:(size.height-height)/2,
    width
  };
}
function toScreenPoint(point){
  const size=getCssSize();
  const frame=getBaseDrawingFrame();
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
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)) return undefined;
  const size=getCssSize();
  const frame=getBaseDrawingFrame();
  if(!Number.isFinite(size.width)||!Number.isFinite(size.height)||!Number.isFinite(frame.width)||!Number.isFinite(frame.height)||frame.width<=0||frame.height<=0){
    return undefined;
  }
  const base={
    x:((point.x-viewport.offsetX-(size.width/2))/viewport.scale)+(size.width/2),
    y:((point.y-viewport.offsetY-(size.height/2))/viewport.scale)+(size.height/2)
  };
  if(!Number.isFinite(base.x)||!Number.isFinite(base.y)) return undefined;
  if(base.x<frame.left||base.x>frame.left+frame.width||base.y<frame.top||base.y>frame.top+frame.height){
    return undefined;
  }
  const normalized={
    x:clamp(Math.round(((base.x-frame.left)/frame.width)*maxCoordinate),0,maxCoordinate),
    y:clamp(Math.round(((base.y-frame.top)/frame.height)*maxCoordinate),0,maxCoordinate)
  };
  if(Number.isFinite(point.pressure)) normalized.pressure=clamp(point.pressure,0,1);
  return normalized;
}
function getEventPoint(event){
  const source=event.touches&&event.touches.length?event.touches[0]:event.changedTouches&&event.changedTouches.length?event.changedTouches[0]:event;
  if(!source||!Number.isFinite(source.clientX)||!Number.isFinite(source.clientY)) return undefined;
  const rect=canvas.getBoundingClientRect();
  const pressure=Number.isFinite(source.pressure)&&source.pressure>0
    ? source.pressure
    : Number.isFinite(source.force)&&source.force>0
      ? source.force
      : source.pointerType==='pen'?0.5:undefined;
  return {
    x:source.clientX-rect.left,
    y:source.clientY-rect.top,
    ...(Number.isFinite(pressure)?{pressure:clamp(pressure,0,1)}:{})
  };
}
function getTouchPoint(touch){
  if(!touch||!Number.isFinite(touch.clientX)||!Number.isFinite(touch.clientY)) return undefined;
  const rect=canvas.getBoundingClientRect();
  return {x:touch.clientX-rect.left,y:touch.clientY-rect.top};
}
function getActiveTouchPointers(){
  return Array.from(activePointers.values()).filter((pointer)=>pointer.pointerType==='touch');
}
function startGestureFromPointers(){
  const touches=getActiveTouchPointers();
  if(touches.length===0){gesture=null;return;}
  const first=touches[0];
  const second=touches[1];
  gesture=second?{
    center:getMidpoint(first,second),
    distance:getPixelDistance(first,second),
    kind:'pinch',
    offsetX:viewport.offsetX,
    offsetY:viewport.offsetY,
    scale:viewport.scale
  }:{
    center:first,
    distance:1,
    kind:'pan',
    offsetX:viewport.offsetX,
    offsetY:viewport.offsetY,
    scale:viewport.scale
  };
  requestRender();
}
function updateGestureFromPointers(){
  if(!gesture) return;
  const touches=getActiveTouchPointers();
  if(touches.length===0){gesture=null;return;}
  const first=touches[0];
  const second=touches[1];
  if(second&&gesture.kind!=='pinch'){
    startGestureFromPointers();
    return;
  }
  if(!second&&gesture.kind==='pinch'){
    startGestureFromPointers();
    return;
  }
  if(second){
    const center=getMidpoint(first,second);
    const nextScale=clamp(
      gesture.scale*(getPixelDistance(first,second)/Math.max(gesture.distance,1)),
      1,
      6
    );
    viewport={
      offsetX:gesture.offsetX+(center.x-gesture.center.x),
      offsetY:gesture.offsetY+(center.y-gesture.center.y),
      scale:nextScale
    };
  }else{
    viewport={
      offsetX:gesture.offsetX+(first.x-gesture.center.x),
      offsetY:gesture.offsetY+(first.y-gesture.center.y),
      scale:gesture.scale
    };
  }
  requestRender();
}
function isPalmPointer(event){
  return event.pointerType==='touch'&&(
    Math.max(Number(event.width)||0,Number(event.height)||0)>=palmContactSize
    || Date.now()-lastPenInteractionAt<palmRejectionAfterPenMs
  );
}
function startPointer(event){
  event.preventDefault();
  const screenPoint=getEventPoint(event);
  if(!screenPoint) return;
  if(event.pointerType==='touch'){
    if(isPalmPointer(event)) return;
    activePointers.set(event.pointerId,{...screenPoint,pointerType:'touch'});
    startGestureFromPointers();
    return;
  }
  if(event.pointerType==='pen') lastPenInteractionAt=Date.now();
  canvas.setPointerCapture&&canvas.setPointerCapture(event.pointerId);
  if(drawingTool==='hand'){
    gesture={
      center:screenPoint,
      distance:1,
      kind:'directPan',
      offsetX:viewport.offsetX,
      offsetY:viewport.offsetY,
      pointerId:event.pointerId,
      scale:viewport.scale
    };
    return;
  }
  const point=screenToNormalized(screenPoint);
  if(!point) return;
  if(drawingTool==='lasso'){
    if(selectedIndices.length>0&&isPointInSelection(point)){
      selectionMove={lastPoint:point};
    }else{
      selectedIndices=[];
      postSelection();
      lassoPoints=[point];
    }
    post('drawingActive',true);
    requestRender();
    return;
  }
  activeStroke={color:brushColor,points:[point],tool:drawingTool,width:brushWidth};
  isDrawing=true;
  post('drawingActive',true);
  requestRender();
}
function movePointer(event){
  const screenPoint=getEventPoint(event);
  if(!screenPoint) return;
  if(event.pointerType==='touch'){
    if(!activePointers.has(event.pointerId)) return;
    event.preventDefault();
    activePointers.set(event.pointerId,{...screenPoint,pointerType:'touch'});
    updateGestureFromPointers();
    return;
  }
  if(event.pointerType==='pen') lastPenInteractionAt=Date.now();
  if(gesture&&gesture.kind==='directPan'&&gesture.pointerId===event.pointerId){
    event.preventDefault();
    viewport={
      offsetX:gesture.offsetX+(screenPoint.x-gesture.center.x),
      offsetY:gesture.offsetY+(screenPoint.y-gesture.center.y),
      scale:gesture.scale
    };
    requestRender();
    return;
  }
  const point=screenToNormalized(screenPoint);
  if(!point) return;
  if(drawingTool==='lasso'){
    event.preventDefault();
    if(selectionMove){
      moveSelectedStrokes(point.x-selectionMove.lastPoint.x,point.y-selectionMove.lastPoint.y);
      selectionMove.lastPoint=point;
    }else if(lassoPoints.length>0&&distance(lassoPoints[lassoPoints.length-1],point)>=minPointDistance){
      lassoPoints.push(point);
    }
    requestRender();
    return;
  }
  if(!isDrawing||!activeStroke) return;
  event.preventDefault();
  appendActiveStrokePoint(point,minPointDistance);
}
function endPointer(event){
  if(event.pointerType==='touch'){
    if(activePointers.has(event.pointerId)){
      event.preventDefault();
      activePointers.delete(event.pointerId);
      startGestureFromPointers();
    }
    return;
  }
  if(event.pointerType==='pen') lastPenInteractionAt=Date.now();
  if(gesture&&gesture.kind==='directPan'&&gesture.pointerId===event.pointerId){
    gesture=null;
    return;
  }
  if(drawingTool==='lasso'){
    event.preventDefault();
    if(selectionMove){
      selectionMove=null;
      post('strokes',strokes);
    }else if(lassoPoints.length>=3){
      selectStrokesInLasso();
    }
    lassoPoints=[];
    post('drawingActive',false);
    requestRender();
    return;
  }
  if(!isDrawing||!activeStroke) return;
  event.preventDefault();
  const point=screenToNormalized(getEventPoint(event));
  if(point) appendActiveStrokePoint(point,releasePointMinDistance);
  strokes=strokes.concat([activeStroke]);
  activeStroke=null;
  isDrawing=false;
  post('drawingActive',false);
  post('strokes',strokes);
  requestRender();
}
function getStrokeBounds(stroke){
  if(!stroke||!Array.isArray(stroke.points)||stroke.points.length===0) return undefined;
  const xs=stroke.points.map((point)=>point.x);
  const ys=stroke.points.map((point)=>point.y);
  return {
    maxX:Math.max(...xs),maxY:Math.max(...ys),
    minX:Math.min(...xs),minY:Math.min(...ys)
  };
}
function getSelectionBounds(){
  const bounds=selectedIndices
    .map((index)=>getStrokeBounds(strokes[index]))
    .filter(Boolean);
  if(bounds.length===0) return undefined;
  return {
    maxX:Math.max(...bounds.map((value)=>value.maxX)),
    maxY:Math.max(...bounds.map((value)=>value.maxY)),
    minX:Math.min(...bounds.map((value)=>value.minX)),
    minY:Math.min(...bounds.map((value)=>value.minY))
  };
}
function isPointInSelection(point){
  const bounds=getSelectionBounds();
  return !!bounds
    && point.x>=bounds.minX&&point.x<=bounds.maxX
    && point.y>=bounds.minY&&point.y<=bounds.maxY;
}
function pointInPolygon(point,polygon){
  let inside=false;
  for(let index=0,previous=polygon.length-1;index<polygon.length;previous=index++){
    const currentPoint=polygon[index];
    const previousPoint=polygon[previous];
    const denominator=previousPoint.y-currentPoint.y;
    const intersects=((currentPoint.y>point.y)!==(previousPoint.y>point.y))
      && point.x<(previousPoint.x-currentPoint.x)*(point.y-currentPoint.y)
      /denominator+currentPoint.x;
    if(intersects) inside=!inside;
  }
  return inside;
}
function selectStrokesInLasso(){
  selectedIndices=strokes.reduce((indices,stroke,index)=>{
    const bounds=getStrokeBounds(stroke);
    if(!bounds) return indices;
    const center={x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2};
    if(pointInPolygon(center,lassoPoints)||stroke.points.some((point)=>pointInPolygon(point,lassoPoints))){
      indices.push(index);
    }
    return indices;
  },[]);
  postSelection();
}
function moveSelectedStrokes(deltaX,deltaY){
  if(!Number.isFinite(deltaX)||!Number.isFinite(deltaY)) return;
  const selected=new Set(selectedIndices);
  strokes=strokes.map((stroke,index)=>selected.has(index)?{
    ...stroke,
    points:stroke.points.map((point)=>({
      ...point,
      x:clamp(Math.round(point.x+deltaX),0,maxCoordinate),
      y:clamp(Math.round(point.y+deltaY),0,maxCoordinate)
    }))
  }:stroke);
}
function deleteSelection(){
  if(selectedIndices.length===0) return;
  const selected=new Set(selectedIndices);
  strokes=strokes.filter((stroke,index)=>!selected.has(index));
  selectedIndices=[];
  postSelection();
  post('strokes',strokes);
  requestRender();
}
function postSelection(){
  post('selection',{count:selectedIndices.length});
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
    const point={
      x:Math.round(start.x+((end.x-start.x)*progress)),
      y:Math.round(start.y+((end.y-start.y)*progress))
    };
    if(Number.isFinite(start.pressure)||Number.isFinite(end.pressure)){
      const startPressure=Number.isFinite(start.pressure)?start.pressure:0.5;
      const endPressure=Number.isFinite(end.pressure)?end.pressure:startPressure;
      point.pressure=clamp(
        startPressure+((endPressure-startPressure)*progress),
        0,
        1
      );
    }
    points.push(point);
  }
  return points;
}
function drawStroke(stroke,fallbackColor,drawingContext){
  if(!stroke||!Array.isArray(stroke.points)||stroke.points.length===0) return;
  const target=drawingContext||ctx;
  const isEraser=stroke.tool==='eraser';
  const width=Math.max(1,Math.min(24,stroke.width||5))*Math.sqrt(viewport.scale);
  const color=isEraser?'rgba(0,0,0,1)':isHexColor(stroke.color)?stroke.color:(fallbackColor||'#111827');
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
  const points=stroke.points.map((point)=>({...toScreenPoint(point),pressure:point.pressure}));
  const hasPressure=!isEraser&&stroke.points.some((point)=>Number.isFinite(point.pressure));
  if(!hasPressure){
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
    return;
  }
  for(let index=1;index<points.length;index+=1){
    const previous=points[index-1];
    const point=points[index];
    const pressure=isEraser?0.5:getAveragePressure(previous.pressure,point.pressure);
    target.lineWidth=width*(0.68+(pressure*0.64));
    target.beginPath();
    target.moveTo(previous.x,previous.y);
    target.lineTo(point.x,point.y);
    target.stroke();
  }
  target.restore();
}
function getAveragePressure(first,second){
  const firstPressure=Number.isFinite(first)?clamp(first,0,1):0.5;
  const secondPressure=Number.isFinite(second)?clamp(second,0,1):firstPressure;
  return (firstPressure+secondPressure)/2;
}
function drawBackground(){
  if(background.writingGuides){
    drawWritingGuidePaper();
  }
  if(satelliteTiles.length>0){
    ctx.save();
    ctx.globalAlpha=0.82;
    satelliteTiles.forEach((tile)=>{
      if(!tile.loaded) return;
      const start=toScreenPoint({
        x:tile.leftPercent*maxCoordinate/100,
        y:tile.topPercent*maxCoordinate/100
      });
      const end=toScreenPoint({
        x:(tile.leftPercent+tile.widthPercent)*maxCoordinate/100,
        y:(tile.topPercent+tile.heightPercent)*maxCoordinate/100
      });
      ctx.drawImage(
        tile.image,
        Math.min(start.x,end.x),
        Math.min(start.y,end.y),
        Math.abs(end.x-start.x),
        Math.abs(end.y-start.y)
      );
    });
    ctx.restore();
  }
  const points=Array.isArray(background.boundaryPoints)
    ? background.boundaryPoints.map(toScreenPoint)
    : [];
  if(points.length<3) return;
  ctx.save();
  ctx.strokeStyle='#175cd3';
  ctx.fillStyle='rgba(23,92,211,0.08)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(points[0].x,points[0].y);
  points.slice(1).forEach((point)=>ctx.lineTo(point.x,point.y));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle='#175cd3';
  points.forEach((point)=>{
    ctx.beginPath();
    ctx.arc(point.x,point.y,4,0,Math.PI*2);
    ctx.fill();
  });
  if(background.label){
    ctx.font='700 13px sans-serif';
    ctx.fillText(background.label,12,24);
  }
  ctx.restore();
}
function drawWritingGuidePaper(){
  const size=getCssSize();
  const start=toScreenPoint({x:0,y:0});
  const end=toScreenPoint({x:maxCoordinate,y:maxCoordinate});
  const left=Math.min(start.x,end.x);
  const top=Math.min(start.y,end.y);
  const width=Math.abs(end.x-start.x);
  const height=Math.abs(end.y-start.y);

  ctx.save();
  ctx.fillStyle='#e9edf0';
  ctx.fillRect(0,0,size.width,size.height);
  ctx.fillStyle='#fffef9';
  ctx.fillRect(left,top,width,height);
  ctx.beginPath();
  ctx.rect(left,top,width,height);
  ctx.clip();

  for(let x=penMemoGridStep;x<maxCoordinate;x+=penMemoGridStep){
    const isMajor=x%penMemoLineHeight===0;
    const guideStart=toScreenPoint({x,y:0});
    const guideEnd=toScreenPoint({x,y:maxCoordinate});
    ctx.strokeStyle=isMajor
      ?'rgba(47,111,78,0.22)'
      :'rgba(47,111,78,0.075)';
    ctx.lineWidth=isMajor?1.15:0.7;
    ctx.beginPath();
    ctx.moveTo(guideStart.x,guideStart.y);
    ctx.lineTo(guideEnd.x,guideEnd.y);
    ctx.stroke();
  }
  for(let y=penMemoGridStep;y<maxCoordinate;y+=penMemoGridStep){
    const isLineBoundary=y%penMemoLineHeight===0;
    const guideStart=toScreenPoint({x:0,y});
    const guideEnd=toScreenPoint({x:maxCoordinate,y});
    ctx.strokeStyle=isLineBoundary
      ?'rgba(47,111,78,0.28)'
      :'rgba(47,111,78,0.075)';
    ctx.lineWidth=isLineBoundary?1.35:0.7;
    ctx.beginPath();
    ctx.moveTo(guideStart.x,guideStart.y);
    ctx.lineTo(guideEnd.x,guideEnd.y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle='rgba(47,111,78,0.34)';
  ctx.lineWidth=1.2;
  ctx.strokeRect(left,top,width,height);
  ctx.restore();
}
function drawSelectionOverlay(){
  ctx.save();
  ctx.strokeStyle='#027a48';
  ctx.fillStyle='rgba(2,122,72,0.08)';
  ctx.lineWidth=1.5;
  ctx.setLineDash([7,5]);
  if(lassoPoints.length>1){
    const points=lassoPoints.map(toScreenPoint);
    ctx.beginPath();
    ctx.moveTo(points[0].x,points[0].y);
    points.slice(1).forEach((point)=>ctx.lineTo(point.x,point.y));
    ctx.stroke();
  }
  const bounds=getSelectionBounds();
  if(bounds){
    const start=toScreenPoint({x:bounds.minX,y:bounds.minY});
    const end=toScreenPoint({x:bounds.maxX,y:bounds.maxY});
    const left=Math.min(start.x,end.x)-7;
    const top=Math.min(start.y,end.y)-7;
    const width=Math.abs(end.x-start.x)+14;
    const height=Math.abs(end.y-start.y)+14;
    ctx.fillRect(left,top,width,height);
    ctx.strokeRect(left,top,width,height);
  }
  if(background.satelliteAttribution&&satelliteTiles.length>0){
    const size=getCssSize();
    ctx.setLineDash([]);
    ctx.font='600 10px sans-serif';
    const textWidth=ctx.measureText(background.satelliteAttribution).width;
    ctx.fillStyle='rgba(15,23,42,0.72)';
    ctx.fillRect(7,size.height-25,textWidth+10,18);
    ctx.fillStyle='#ffffff';
    ctx.fillText(background.satelliteAttribution,12,size.height-12);
  }
  ctx.restore();
}
function render(){
  renderQueued=false;
  const size=getCssSize();
  ctx.clearRect(0,0,size.width,size.height);
  drawBackground();
  strokeCanvas.width=canvas.width;
  strokeCanvas.height=canvas.height;
  strokeCtx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  strokeCtx.clearRect(0,0,size.width,size.height);
  strokes.forEach((stroke)=>drawStroke(stroke,'#111827',strokeCtx));
  if(activeStroke) drawStroke(activeStroke,'#111827',strokeCtx);
  ctx.drawImage(strokeCanvas,0,0,size.width,size.height);
  drawSelectionOverlay();
}
function requestRender(){
  if(renderQueued) return;
  renderQueued=true;
  requestAnimationFrame(render);
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
    drawingTool=normalizeDrawingTool(payload.tool);
    if(drawingTool!=='lasso'){
      selectedIndices=[];
      lassoPoints=[];
      postSelection();
      requestRender();
    }
    return;
  }
  if(command.type==='setStrokes'){
    strokes=Array.isArray(command.payload)?command.payload:[];
    activeStroke=null;
    selectedIndices=[];
    lassoPoints=[];
    postSelection();
    requestRender();
    return;
  }
  if(command.type==='deleteSelection'){
    deleteSelection();
    return;
  }
  if(command.type==='resetViewport'){
    viewport={offsetX:0,offsetY:0,scale:1};
    requestRender();
  }
}
function distance(a,b){
  return Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2));
}
function getMidpoint(a,b){
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
function getPixelDistance(a,b){
  return Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2));
}
function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}
function normalizeDrawingTool(value){
  return value==='eraser'||value==='lasso'||value==='hand'?value:'pen';
}
function isHexColor(value){
  return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
}
canvas.addEventListener('pointerdown',startPointer,{passive:false});
canvas.addEventListener('pointermove',movePointer,{passive:false});
canvas.addEventListener('pointerup',endPointer,{passive:false});
canvas.addEventListener('pointercancel',endPointer,{passive:false});
window.addEventListener('message',handleCommand);
document.addEventListener('message',handleCommand);
window.addEventListener('resize',resize);
resize();
post('ready',true);
</script>
</body>
</html>`;
};

const toHtmlJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

const styles = StyleSheet.create({
  fullscreenRoot: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  fullscreenHeader: {
    alignItems: 'center',
    borderBottomColor: '#eaecf0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 10,
  },
  fullscreenTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    paddingRight: 8,
  },
  fullscreenTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 6,
  },
  fullscreenActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    borderRadius: 12,
    flexDirection: 'row',
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillError: {
    backgroundColor: '#fef3f2',
  },
  statusPillSuccess: {
    backgroundColor: '#ecfdf3',
  },
  statusText: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  statusTextError: {
    color: '#b42318',
  },
  statusTextSuccess: {
    color: '#027a48',
  },
  fullscreenCanvas: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginLeft: 5,
    width: 34,
  },
  iconButtonDisabled: {
    backgroundColor: '#f8fafc',
  },
  brushRow: {
    alignItems: 'center',
    borderBottomColor: '#eaecf0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  brushLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 8,
  },
  writingGuideNotice: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderBottomColor: '#bbf7d0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 30,
    paddingHorizontal: 12,
  },
  writingGuideNoticeText: {
    color: '#2f5f4a',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  brushOption: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginRight: 6,
    minHeight: 32,
    minWidth: 50,
    paddingHorizontal: 8,
  },
  brushOptionDisabled: {
    backgroundColor: '#f8fafc',
  },
  brushOptionSelected: {
    backgroundColor: '#ecfdf3',
    borderColor: '#039855',
  },
  brushDot: {
    backgroundColor: '#111827',
    borderRadius: 12,
  },
  brushOptionText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  brushOptionTextSelected: {
    color: '#027a48',
  },
  colorGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 8,
  },
  colorOption: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginRight: 5,
    width: 32,
  },
  colorOptionSelected: {
    borderColor: '#039855',
    borderWidth: 2,
  },
  colorSwatch: {
    borderColor: 'rgba(17, 24, 39, 0.18)',
    borderRadius: 10,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  toolGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 8,
  },
  toolOption: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginRight: 5,
    width: 36,
  },
  toolOptionSelected: {
    backgroundColor: '#ecfdf3',
    borderColor: '#039855',
  },
});

export default KoreanFieldworkFullscreenDrawingModal;
