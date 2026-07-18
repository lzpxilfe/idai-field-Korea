import { NativeModules, Platform } from 'react-native';
import {
  applyKoreanFieldworkHandwritingErasers,
  KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE,
  KoreanFieldworkHandwritingPoint,
  KoreanFieldworkHandwritingStroke,
  serializeKoreanFieldworkHandwriting,
} from '@/components/Project/korean-fieldwork-handwriting';
import {
  KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_MAX,
  KOREAN_FIELDWORK_PEN_MEMO_LINE_COUNT,
  KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT,
} from '@/components/Project/korean-fieldwork-pen-memo-layout';

const WRITING_AREA_WIDTH = KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_MAX;
const ESTIMATED_LINE_HEIGHT = KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT;
const MAX_RECOGNITION_CHUNKS = 128;
const MAX_RECOGNITION_INPUT_POINTS = 100000;
const MAX_RECOGNITION_SEGMENT_BOUNDARIES = MAX_RECOGNITION_CHUNKS;
const RECOGNITION_SCOPE_TOO_LARGE_MESSAGE =
  '필기 범위가 너무 넓습니다. 메모를 몇 구역으로 나누어 인식해 주세요.';

interface NativeRecognitionModule {
  downloadModel: () => Promise<KoreanHandwritingModelStatus>;
  getModelStatus: () => Promise<KoreanHandwritingModelStatus>;
  recognize: (
    serializedStrokes: string,
    writingWidth: number,
    writingHeight: number,
    preContext: string
  ) => Promise<KoreanHandwritingRecognitionResult>;
}

export interface KoreanHandwritingModelStatus {
  downloaded: boolean;
  engine: string;
}

export interface KoreanHandwritingRecognitionResult {
  candidates: string[];
  engine: string;
  modelDownloaded: boolean;
  text: string;
}

interface KoreanHandwritingRecognitionChunk {
  columnIndex: number;
  payload: string;
  rowIndex: number;
}

interface KoreanHandwritingRecognitionChunkResult {
  chunk: KoreanHandwritingRecognitionChunk;
  result: KoreanHandwritingRecognitionResult;
}

interface KoreanHandwritingRecognitionChunkBucket {
  columnIndex: number;
  rowIndex: number;
  strokes: KoreanFieldworkHandwritingStroke[];
}

interface KoreanHandwritingRecognitionStrokeFragment {
  columnIndex: number;
  points: KoreanFieldworkHandwritingPoint[];
  rowIndex: number;
}

export const isKoreanHandwritingRecognitionAvailable = (): boolean =>
  Platform.OS === 'android'
  && !!getNativeRecognitionModule();

export const getKoreanHandwritingModelStatus = async ():
Promise<KoreanHandwritingModelStatus> => {
  const module = requireNativeRecognitionModule();
  return module.getModelStatus();
};

export const downloadKoreanHandwritingModel = async ():
Promise<KoreanHandwritingModelStatus> => {
  const module = requireNativeRecognitionModule();
  return module.downloadModel();
};

export const recognizeKoreanHandwriting = async (
  strokesValue: unknown,
  preContext = ''
): Promise<KoreanHandwritingRecognitionResult> => {
  const chunks = getKoreanHandwritingRecognitionChunks(strokesValue);
  if (chunks.length === 0) {
    throw new Error('읽을 수 있는 펜 필기가 없습니다.');
  }

  const module = requireNativeRecognitionModule();
  const chunkResults: KoreanHandwritingRecognitionChunkResult[] = [];
  let currentContext = preContext.trim();
  for (const chunk of chunks) {
    const lineResult = await module.recognize(
      chunk.payload,
      WRITING_AREA_WIDTH,
      ESTIMATED_LINE_HEIGHT,
      currentContext.slice(-20)
    );
    chunkResults.push({ chunk, result: lineResult });
    if (lineResult.text?.trim()) {
      currentContext = `${currentContext} ${lineResult.text.trim()}`.trim();
    }
  }

  const recognizedText = getRecognizedChunkText(chunkResults);
  const result = chunkResults[0]?.result;

  return {
    candidates: chunkResults.length === 1
      ? normalizeCandidates(result?.candidates)
      : recognizedText ? [recognizedText] : [],
    engine: result?.engine || 'ml-kit-digital-ink-ko-18.1',
    modelDownloaded: chunkResults.every(({ result: chunkResult }) =>
      chunkResult.modelDownloaded !== false),
    text: recognizedText,
  };
};

export const getKoreanHandwritingLinePayloads = (
  strokesValue: unknown
): string[] => getKoreanHandwritingRecognitionChunks(strokesValue)
  .map((chunk) => chunk.payload);

const getKoreanHandwritingRecognitionChunks = (
  strokesValue: unknown
): KoreanHandwritingRecognitionChunk[] => {
  assertRecognitionInputSize(strokesValue);
  const useDynamicChunks = isUnboundedHandwritingPayload(strokesValue);
  const strokes = applyKoreanFieldworkHandwritingErasers(
    strokesValue,
    useDynamicChunks ? {
      coordinateSpace: KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE,
    } : {}
  );
  const chunks = new Map<string, KoreanHandwritingRecognitionChunkBucket>();

  if (useDynamicChunks) {
    strokes.forEach((stroke) => {
      splitStrokeIntoRecognitionChunks(stroke).forEach((fragment) => {
        addStrokeToChunk(chunks, fragment.rowIndex, fragment.columnIndex, {
          ...stroke,
          points: fragment.points,
        });
      });
    });
  } else strokes.forEach((stroke) => {
    const averageX = stroke.points.reduce((sum, point) => sum + point.x, 0)
      / Math.max(1, stroke.points.length);
    const averageY = stroke.points.reduce((sum, point) => sum + point.y, 0)
      / Math.max(1, stroke.points.length);
    const rowIndex = useDynamicChunks
      ? Math.floor(averageY / ESTIMATED_LINE_HEIGHT)
      : Math.max(0, Math.min(
        KOREAN_FIELDWORK_PEN_MEMO_LINE_COUNT - 1,
        Math.floor(averageY / ESTIMATED_LINE_HEIGHT)
      ));
    const columnIndex = useDynamicChunks
      ? Math.floor(averageX / WRITING_AREA_WIDTH)
      : 0;
    const rowStartY = rowIndex * ESTIMATED_LINE_HEIGHT;
    const columnStartX = columnIndex * WRITING_AREA_WIDTH;
    const shiftedStroke: KoreanFieldworkHandwritingStroke = {
      ...stroke,
      points: stroke.points.map((point) => ({
        ...point,
        x: useDynamicChunks
          ? Math.max(0, Math.min(
            WRITING_AREA_WIDTH - 1,
            point.x - columnStartX
          ))
          : point.x,
        y: Math.max(0, Math.min(
          ESTIMATED_LINE_HEIGHT - 1,
          point.y - rowStartY
        )),
      })),
    };
    addStrokeToChunk(chunks, rowIndex, columnIndex, shiftedStroke);
  });

  return [...chunks.values()]
    .sort((left, right) =>
      left.rowIndex - right.rowIndex
      || left.columnIndex - right.columnIndex)
    .map((chunk) => ({
      columnIndex: chunk.columnIndex,
      payload: serializeKoreanFieldworkHandwriting(chunk.strokes),
      rowIndex: chunk.rowIndex,
    }));
};

const addStrokeToChunk = (
  chunks: Map<string, KoreanHandwritingRecognitionChunkBucket>,
  rowIndex: number,
  columnIndex: number,
  stroke: KoreanFieldworkHandwritingStroke
): void => {
  const chunkKey = `${rowIndex}:${columnIndex}`;
  if (!chunks.has(chunkKey) && chunks.size >= MAX_RECOGNITION_CHUNKS) {
    throw new Error(RECOGNITION_SCOPE_TOO_LARGE_MESSAGE);
  }
  const chunk = chunks.get(chunkKey) ?? {
    columnIndex,
    rowIndex,
    strokes: [],
  };
  chunk.strokes.push(stroke);
  chunks.set(chunkKey, chunk);
};

const splitStrokeIntoRecognitionChunks = (
  stroke: KoreanFieldworkHandwritingStroke
): KoreanHandwritingRecognitionStrokeFragment[] => {
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    const rowIndex = Math.floor(point.y / ESTIMATED_LINE_HEIGHT);
    const columnIndex = Math.floor(point.x / WRITING_AREA_WIDTH);
    return [{
      columnIndex,
      points: [toRecognitionChunkPoint(point, rowIndex, columnIndex)],
      rowIndex,
    }];
  }

  const fragments: KoreanHandwritingRecognitionStrokeFragment[] = [];
  for (let pointIndex = 1; pointIndex < stroke.points.length; pointIndex += 1) {
    const segmentStart = stroke.points[pointIndex - 1];
    const segmentEnd = stroke.points[pointIndex];
    const cuts = getRecognitionChunkSegmentCuts(segmentStart, segmentEnd);

    for (let cutIndex = 1; cutIndex < cuts.length; cutIndex += 1) {
      const start = interpolateRecognitionPoint(
        segmentStart,
        segmentEnd,
        cuts[cutIndex - 1]
      );
      const end = interpolateRecognitionPoint(
        segmentStart,
        segmentEnd,
        cuts[cutIndex]
      );
      const midpoint = interpolateRecognitionPoint(start, end, 0.5);
      const rowIndex = Math.floor(midpoint.y / ESTIMATED_LINE_HEIGHT);
      const columnIndex = Math.floor(midpoint.x / WRITING_AREA_WIDTH);
      appendRecognitionStrokeFragment(
        fragments,
        rowIndex,
        columnIndex,
        toRecognitionChunkPoint(start, rowIndex, columnIndex),
        toRecognitionChunkPoint(end, rowIndex, columnIndex)
      );
    }
  }

  return fragments;
};

const getRecognitionChunkSegmentCuts = (
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint
): number[] => {
  const cuts = [0, 1];
  addRecognitionChunkAxisCuts(cuts, start.x, end.x, WRITING_AREA_WIDTH);
  addRecognitionChunkAxisCuts(cuts, start.y, end.y, ESTIMATED_LINE_HEIGHT);

  return cuts
    .sort((left, right) => left - right)
    .filter((cut, index, sortedCuts) =>
      index === 0 || Math.abs(cut - sortedCuts[index - 1]) > 0.0000001);
};

const addRecognitionChunkAxisCuts = (
  cuts: number[],
  start: number,
  end: number,
  chunkSize: number
): void => {
  if (start === end) return;

  const minimum = Math.min(start, end);
  const maximum = Math.max(start, end);
  let boundary = (Math.floor(minimum / chunkSize) + 1) * chunkSize;
  while (boundary < maximum) {
    if (cuts.length - 2 >= MAX_RECOGNITION_SEGMENT_BOUNDARIES) {
      throw new Error(RECOGNITION_SCOPE_TOO_LARGE_MESSAGE);
    }
    const cut = (boundary - start) / (end - start);
    if (cut > 0 && cut < 1) cuts.push(cut);
    boundary += chunkSize;
  }
};

const appendRecognitionStrokeFragment = (
  fragments: KoreanHandwritingRecognitionStrokeFragment[],
  rowIndex: number,
  columnIndex: number,
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint
): void => {
  const previousFragment = fragments[fragments.length - 1];
  if (
    previousFragment
    && previousFragment.rowIndex === rowIndex
    && previousFragment.columnIndex === columnIndex
  ) {
    appendRecognitionPoint(previousFragment.points, start);
    appendRecognitionPoint(previousFragment.points, end);
    return;
  }

  const points = [start];
  appendRecognitionPoint(points, end);
  fragments.push({ columnIndex, points, rowIndex });
};

const appendRecognitionPoint = (
  points: KoreanFieldworkHandwritingPoint[],
  point: KoreanFieldworkHandwritingPoint
): void => {
  const previousPoint = points[points.length - 1];
  if (
    previousPoint
    && previousPoint.x === point.x
    && previousPoint.y === point.y
    && previousPoint.pressure === point.pressure
  ) {
    return;
  }
  points.push(point);
};

const toRecognitionChunkPoint = (
  point: KoreanFieldworkHandwritingPoint,
  rowIndex: number,
  columnIndex: number
): KoreanFieldworkHandwritingPoint => ({
  ...(point.pressure !== undefined ? { pressure: point.pressure } : {}),
  x: Math.max(0, Math.min(
    WRITING_AREA_WIDTH - 1,
    Math.round(point.x - (columnIndex * WRITING_AREA_WIDTH))
  )),
  y: Math.max(0, Math.min(
    ESTIMATED_LINE_HEIGHT - 1,
    Math.round(point.y - (rowIndex * ESTIMATED_LINE_HEIGHT))
  )),
});

const interpolateRecognitionPoint = (
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint,
  progress: number
): KoreanFieldworkHandwritingPoint => {
  const pressure = start.pressure !== undefined || end.pressure !== undefined
    ? (start.pressure ?? 0.5)
      + (((end.pressure ?? start.pressure ?? 0.5) - (start.pressure ?? 0.5))
        * progress)
    : undefined;

  return {
    ...(pressure !== undefined
      ? { pressure: Math.round(pressure * 1000) / 1000 }
      : {}),
    x: start.x + ((end.x - start.x) * progress),
    y: start.y + ((end.y - start.y) * progress),
  };
};

const getRecognizedChunkText = (
  chunkResults: readonly KoreanHandwritingRecognitionChunkResult[]
): string => {
  const rows = new Map<number, string[]>();
  chunkResults.forEach(({ chunk, result }) => {
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    if (!text) return;
    rows.set(chunk.rowIndex, [...(rows.get(chunk.rowIndex) ?? []), text]);
  });

  return [...rows.entries()]
    .sort(([leftRow], [rightRow]) => leftRow - rightRow)
    .map(([, texts]) => texts.join(' '))
    .join('\n');
};

const isUnboundedHandwritingPayload = (
  value: unknown
): boolean => {
  const parsedValue = typeof value === 'string'
    ? parseHandwritingPayload(value)
    : value;
  if (
    isRecord(parsedValue)
    && parsedValue.version === 2
    && parsedValue.coordinateSpace === KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
  ) {
    return true;
  }
  if (isRecord(parsedValue) && parsedValue.version !== undefined) return false;

  return getRawHandwritingStrokes(parsedValue).some((stroke) =>
    getRawHandwritingPoints(stroke).some((point) =>
      isRecord(point)
      && (
        isCoordinateOutsideLegacyCanvas(point.x)
        || isCoordinateOutsideLegacyCanvas(point.y)
      )));
};

const assertRecognitionInputSize = (value: unknown): void => {
  const parsedValue = typeof value === 'string'
    ? parseHandwritingPayload(value)
    : value;
  let pointCount = 0;
  for (const stroke of getRawHandwritingStrokes(parsedValue)) {
    pointCount += getRawHandwritingPoints(stroke).length;
    if (pointCount > MAX_RECOGNITION_INPUT_POINTS) {
      throw new Error(RECOGNITION_SCOPE_TOO_LARGE_MESSAGE);
    }
  }
};

const getRawHandwritingStrokes = (value: unknown): unknown[] => {
  const strokesValue = isRecord(value) && Array.isArray(value.strokes)
    ? value.strokes
    : value;
  return Array.isArray(strokesValue) ? strokesValue : [];
};

const getRawHandwritingPoints = (stroke: unknown): unknown[] => {
  const pointsValue = isRecord(stroke) && Array.isArray(stroke.points)
    ? stroke.points
    : stroke;
  return Array.isArray(pointsValue) ? pointsValue : [];
};

const isCoordinateOutsideLegacyCanvas = (value: unknown): boolean =>
  typeof value === 'number'
  && Number.isFinite(value)
  && (value < 0 || value > KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_MAX);

const parseHandwritingPayload = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeCandidates = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value
      .filter((candidate): candidate is string => typeof candidate === 'string')
      .map((candidate) => candidate.trim())
      .filter(Boolean))].slice(0, 5)
    : [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

const getNativeRecognitionModule = (): NativeRecognitionModule | undefined =>
  NativeModules.KoreanHandwritingRecognition as NativeRecognitionModule | undefined;

const requireNativeRecognitionModule = (): NativeRecognitionModule => {
  const module = getNativeRecognitionModule();
  if (!module) {
    throw new Error('이 앱 빌드에는 한국어 필기 인식기가 포함되어 있지 않습니다.');
  }
  return module;
};
