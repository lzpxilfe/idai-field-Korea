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
  normalizeKoreanFieldworkHandwritingStrokes,
} from './korean-fieldwork-handwriting';

export const DEFAULT_FIELDWORK_BRUSH_WIDTH = 5;
export const FIELDWORK_BRUSH_WIDTH_OPTIONS = [3, 5, 8, 12] as const;

export interface FieldworkFullscreenDrawingBackground {
  aspectRatio?: number;
  boundaryPoints?: { x: number; y: number }[];
  label?: string;
}

interface FullscreenDrawingCommand {
  payload?: unknown;
  type: 'setBrushWidth' | 'setStrokes';
}

interface FullscreenDrawingMessage {
  payload?: unknown;
  type: 'drawingActive' | 'ready' | 'strokes';
}

interface Props {
  background?: FieldworkFullscreenDrawingBackground;
  brushWidth: number;
  isVisible: boolean;
  onBrushWidthChange: (width: number) => void;
  onClose: () => void;
  onDrawingActiveChange?: (isActive: boolean) => void;
  onUpdateStrokes: (strokes: KoreanFieldworkHandwritingStroke[]) => void;
  strokes: KoreanFieldworkHandwritingStroke[];
  testIDPrefix: string;
  title: string;
}

const TEXT = {
  brush: '\ud39c',
};
const MAX_COORDINATE = 10000;
const WEBVIEW_BASE_URL = 'https://idai-field.local/fullscreen-drawing/';

const KoreanFieldworkFullscreenDrawingModal: React.FC<Props> = ({
  background,
  brushWidth,
  isVisible,
  onBrushWidthChange,
  onClose,
  onDrawingActiveChange,
  onUpdateStrokes,
  strokes,
  testIDPrefix,
  title,
}) => {
  const webViewRef = useRef<WebView>(null);
  const wasVisibleRef = useRef(false);
  const normalizedStrokes = useMemo(
    () => normalizeKoreanFieldworkHandwritingStrokes(strokes),
    [strokes]
  );
  const [html, setHtml] = useState<string>();
  const [currentStrokes, setCurrentStrokes] =
    useState<KoreanFieldworkHandwritingStroke[]>(normalizedStrokes);

  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      setCurrentStrokes(normalizedStrokes);
      setHtml(buildFullscreenDrawingHtml({
        background,
        brushWidth,
        strokes: normalizedStrokes,
      }));
    }
    if (!isVisible && wasVisibleRef.current) {
      setHtml(undefined);
      setCurrentStrokes(normalizedStrokes);
      onDrawingActiveChange?.(false);
    }
    wasVisibleRef.current = isVisible;
  }, [
    background,
    brushWidth,
    isVisible,
    normalizedStrokes,
    onDrawingActiveChange,
  ]);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStrokes(normalizedStrokes);
      return;
    }

    postCommand({ type: 'setBrushWidth', payload: { width: brushWidth } });
  }, [brushWidth, isVisible, normalizedStrokes]);

  const postCommand = (command: FullscreenDrawingCommand) => {
    webViewRef.current?.postMessage(JSON.stringify(command));
  };
  const updateStrokes = (nextStrokes: KoreanFieldworkHandwritingStroke[]) => {
    const normalizedNextStrokes = normalizeKoreanFieldworkHandwritingStrokes(
      nextStrokes
    );
    setCurrentStrokes(normalizedNextStrokes);
    onUpdateStrokes(normalizedNextStrokes);
  };
  const undoStroke = () => {
    const nextStrokes = currentStrokes.slice(0, -1);
    updateStrokes(nextStrokes);
    postCommand({ type: 'setStrokes', payload: nextStrokes });
  };
  const clearStrokes = () => {
    updateStrokes([]);
    postCommand({ type: 'setStrokes', payload: [] });
  };
  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseFullscreenDrawingMessage(event.nativeEvent.data);
    if (!message) return;

    if (message.type === 'drawingActive') {
      onDrawingActiveChange?.(message.payload === true);
      return;
    }

    if (message.type === 'strokes') {
      updateStrokes(normalizeKoreanFieldworkHandwritingStrokes(message.payload));
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
          </View>
          <View style={styles.fullscreenActions}>
            <IconButton
              icon="undo"
              isDisabled={currentStrokes.length === 0}
              onPress={undoStroke}
              testID={`${testIDPrefix}FullscreenUndo`}
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
              isDisabled={false}
              onPress={onClose}
              testID={`${testIDPrefix}FullscreenClose`}
            />
          </View>
        </View>
        <KoreanFieldworkBrushControls
          brushWidth={brushWidth}
          onSelectBrushWidth={onBrushWidthChange}
          testIDPrefix={`${testIDPrefix}FullscreenBrush`}
        />
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
  brushWidth: number;
  isDisabled?: boolean;
  onSelectBrushWidth: (width: number) => void;
  testIDPrefix: string;
}> = ({
  brushWidth,
  isDisabled = false,
  onSelectBrushWidth,
  testIDPrefix,
}) => (
  <View style={styles.brushRow}>
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
  brushWidth,
  strokes,
}: {
  background?: FieldworkFullscreenDrawingBackground;
  brushWidth: number;
  strokes: KoreanFieldworkHandwritingStroke[];
}): string => {
  const initialState = toHtmlJson({
    background,
    brushWidth,
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
let strokes=Array.isArray(state.strokes)?state.strokes:[];
let brushWidth=state.brushWidth||5;
let activeStroke=null;
let gesture=null;
let isDrawing=false;
let renderQueued=false;
const maxCoordinate=state.maxCoordinate||10000;
const background=state.background||{};
let viewport={offsetX:0,offsetY:0,scale:1};
function post(type,payload){
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(JSON.stringify({type,payload}));
  }
}
function resize(){
  const rect=canvas.getBoundingClientRect();
  const ratio=window.devicePixelRatio||1;
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
  const size=getCssSize();
  const frame=getBaseDrawingFrame();
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
  post('drawingActive',false);
  requestRender();
}
function updateGesture(event){
  if(!gesture||!event.touches||event.touches.length<2) return;
  const first=getTouchPoint(event.touches[0]);
  const second=getTouchPoint(event.touches[1]);
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
  requestRender();
}
function endGesture(event){
  if(event.touches&&event.touches.length>=2){
    updateGesture(event);
    return;
  }
  gesture=null;
}
function start(event){
  event.preventDefault();
  if(event.touches&&event.touches.length>=2){
    startGesture(event);
    return;
  }
  const point=screenToNormalized(getEventPoint(event));
  if(!point) return;
  activeStroke={points:[point],width:brushWidth};
  isDrawing=true;
  post('drawingActive',true);
  requestRender();
}
function move(event){
  if(gesture||event.touches&&event.touches.length>=2){
    event.preventDefault();
    if(event.touches&&event.touches.length>=2) updateGesture(event);
    return;
  }
  if(!isDrawing||!activeStroke) return;
  event.preventDefault();
  const point=screenToNormalized(getEventPoint(event));
  if(!point) return;
  const previous=activeStroke.points[activeStroke.points.length-1];
  if(previous&&distance(previous,point)<8) return;
  activeStroke.points.push(point);
  requestRender();
}
function end(event){
  if(gesture){
    event.preventDefault();
    endGesture(event);
    return;
  }
  if(!isDrawing||!activeStroke) return;
  event.preventDefault();
  const point=screenToNormalized(getEventPoint(event));
  const previous=activeStroke.points[activeStroke.points.length-1];
  if(point&&(!previous||distance(previous,point)>=1)) activeStroke.points.push(point);
  strokes=strokes.concat([activeStroke]);
  activeStroke=null;
  isDrawing=false;
  post('drawingActive',false);
  post('strokes',strokes);
  requestRender();
}
function drawStroke(stroke,color){
  if(!stroke||!Array.isArray(stroke.points)||stroke.points.length===0) return;
  const width=Math.max(1,Math.min(24,stroke.width||5))*Math.sqrt(viewport.scale);
  ctx.strokeStyle=color||'#111827';
  ctx.fillStyle=color||'#111827';
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.lineWidth=width;
  if(stroke.points.length===1){
    const dot=toScreenPoint(stroke.points[0]);
    ctx.beginPath();
    ctx.arc(dot.x,dot.y,(width+2)/2,0,Math.PI*2);
    ctx.fill();
    return;
  }
  const points=stroke.points.map(toScreenPoint);
  ctx.beginPath();
  ctx.moveTo(points[0].x,points[0].y);
  for(let index=1;index<points.length-1;index+=1){
    const midpoint={
      x:(points[index].x+points[index+1].x)/2,
      y:(points[index].y+points[index+1].y)/2
    };
    ctx.quadraticCurveTo(points[index].x,points[index].y,midpoint.x,midpoint.y);
  }
  const lastPoint=points[points.length-1];
  ctx.lineTo(lastPoint.x,lastPoint.y);
  ctx.stroke();
}
function drawBackground(){
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
function render(){
  renderQueued=false;
  const size=getCssSize();
  ctx.clearRect(0,0,size.width,size.height);
  drawBackground();
  strokes.forEach((stroke)=>drawStroke(stroke,'#111827'));
  if(activeStroke) drawStroke(activeStroke,'#111827');
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
  if(command.type==='setStrokes'){
    strokes=Array.isArray(command.payload)?command.payload:[];
    activeStroke=null;
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
canvas.addEventListener('touchstart',start,{passive:false});
canvas.addEventListener('touchmove',move,{passive:false});
canvas.addEventListener('touchend',end,{passive:false});
canvas.addEventListener('touchcancel',end,{passive:false});
canvas.addEventListener('mousedown',start);
canvas.addEventListener('mousemove',move);
window.addEventListener('mouseup',end);
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
    minHeight: 44,
    paddingHorizontal: 10,
  },
  brushLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 8,
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
});

export default KoreanFieldworkFullscreenDrawingModal;
