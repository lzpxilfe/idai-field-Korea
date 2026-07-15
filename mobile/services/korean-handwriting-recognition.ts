import { NativeModules, Platform } from 'react-native';
import {
  hasKoreanFieldworkHandwriting,
  KoreanFieldworkHandwritingStroke,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from '@/components/Project/korean-fieldwork-handwriting';

const WRITING_AREA_WIDTH = 10000;
const ESTIMATED_LINE_HEIGHT = 2000;

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
  const strokes = normalizeKoreanFieldworkHandwritingStrokes(strokesValue)
    .filter((stroke) => stroke.tool !== 'eraser');
  if (!hasKoreanFieldworkHandwriting(strokes)) {
    throw new Error('읽을 수 있는 펜 필기가 없습니다.');
  }

  const module = requireNativeRecognitionModule();
  const linePayloads = getKoreanHandwritingLinePayloads(strokes);
  const lineResults: KoreanHandwritingRecognitionResult[] = [];
  let currentContext = preContext.trim();
  for (const linePayload of linePayloads) {
    const lineResult = await module.recognize(
      linePayload,
      WRITING_AREA_WIDTH,
      ESTIMATED_LINE_HEIGHT,
      currentContext.slice(-20)
    );
    lineResults.push(lineResult);
    if (lineResult.text?.trim()) {
      currentContext = `${currentContext} ${lineResult.text.trim()}`.trim();
    }
  }

  const recognizedLines = lineResults
    .map((result) => typeof result.text === 'string' ? result.text.trim() : '')
    .filter(Boolean);
  const result = lineResults[0];

  return {
    candidates: lineResults.length === 1
      ? normalizeCandidates(result?.candidates)
      : recognizedLines.length > 0 ? [recognizedLines.join('\n')] : [],
    engine: result?.engine || 'ml-kit-digital-ink-ko-18.1',
    modelDownloaded: lineResults.every((lineResult) =>
      lineResult.modelDownloaded !== false),
    text: recognizedLines.join('\n'),
  };
};

export const getKoreanHandwritingLinePayloads = (
  strokesValue: unknown
): string[] => {
  const strokes = normalizeKoreanFieldworkHandwritingStrokes(strokesValue)
    .filter((stroke) => stroke.tool !== 'eraser');
  const lines = new Map<number, KoreanFieldworkHandwritingStroke[]>();

  strokes.forEach((stroke) => {
    const averageY = stroke.points.reduce((sum, point) => sum + point.y, 0)
      / Math.max(1, stroke.points.length);
    const lineIndex = Math.max(0, Math.min(
      4,
      Math.floor(averageY / ESTIMATED_LINE_HEIGHT)
    ));
    const lineStartY = lineIndex * ESTIMATED_LINE_HEIGHT;
    const shiftedStroke: KoreanFieldworkHandwritingStroke = {
      ...stroke,
      points: stroke.points.map((point) => ({
        ...point,
        y: Math.max(0, point.y - lineStartY),
      })),
    };
    lines.set(lineIndex, [...(lines.get(lineIndex) ?? []), shiftedStroke]);
  });

  return [...lines.entries()]
    .sort(([lineA], [lineB]) => lineA - lineB)
    .map(([, lineStrokes]) =>
      serializeKoreanFieldworkHandwriting(lineStrokes));
};

const normalizeCandidates = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value
      .filter((candidate): candidate is string => typeof candidate === 'string')
      .map((candidate) => candidate.trim())
      .filter(Boolean))].slice(0, 5)
    : [];

const getNativeRecognitionModule = (): NativeRecognitionModule | undefined =>
  NativeModules.KoreanHandwritingRecognition as NativeRecognitionModule | undefined;

const requireNativeRecognitionModule = (): NativeRecognitionModule => {
  const module = getNativeRecognitionModule();
  if (!module) {
    throw new Error('이 앱 빌드에는 한국어 필기 인식기가 포함되어 있지 않습니다.');
  }
  return module;
};
