export interface KoreanFieldworkHandwritingPoint {
  pressure?: number;
  x: number;
  y: number;
}

export type KoreanFieldworkHandwritingTool = 'pen' | 'eraser';

export interface KoreanFieldworkHandwritingStroke {
  color?: string;
  points: KoreanFieldworkHandwritingPoint[];
  tool?: KoreanFieldworkHandwritingTool;
  width?: number;
}

export interface KoreanFieldworkHandwritingPayload {
  version: 1;
  strokes: KoreanFieldworkHandwritingStroke[];
}

const MAX_COORDINATE = 10000;
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 24;
const MIN_PRESSURE = 0;
const MAX_PRESSURE = 1;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export const normalizeKoreanFieldworkHandwritingStrokes = (
  value: unknown
): KoreanFieldworkHandwritingStroke[] => {
  const normalizedValue = typeof value === 'string'
    ? parseKoreanFieldworkHandwritingPayload(value)
    : value;
  const strokesValue = isRecord(normalizedValue)
    && Array.isArray(normalizedValue.strokes)
    ? normalizedValue.strokes
    : normalizedValue;

  if (!Array.isArray(strokesValue)) return [];

  return strokesValue
    .map(normalizeStroke)
    .filter((stroke): stroke is KoreanFieldworkHandwritingStroke => !!stroke);
};

export const hasKoreanFieldworkHandwriting = (
  strokes: readonly KoreanFieldworkHandwritingStroke[]
): boolean => strokes.some((stroke) => stroke.points.length > 0);

export const countKoreanFieldworkHandwritingPoints = (
  strokes: readonly KoreanFieldworkHandwritingStroke[]
): number => strokes.reduce((count, stroke) => count + stroke.points.length, 0);

export const serializeKoreanFieldworkHandwriting = (
  strokes: readonly KoreanFieldworkHandwritingStroke[]
): string => JSON.stringify({
  version: 1,
  strokes: normalizeKoreanFieldworkHandwritingStrokes(strokes),
} satisfies KoreanFieldworkHandwritingPayload);

export const buildKoreanFieldworkHandwritingNoteText = (
  strokes: readonly KoreanFieldworkHandwritingStroke[]
): string => {
  const normalizedStrokes = normalizeKoreanFieldworkHandwritingStrokes(strokes);
  if (!hasKoreanFieldworkHandwriting(normalizedStrokes)) return '';

  const pointCount = countKoreanFieldworkHandwritingPoints(normalizedStrokes);

  return [
    `[손그림 메모] 획 ${normalizedStrokes.length}개, 점 ${pointCount}개`,
    `[손그림 좌표] ${serializeKoreanFieldworkHandwriting(normalizedStrokes)}`,
  ].join('\n');
};

export const extractKoreanFieldworkHandwritingFromText = (
  text: string
): KoreanFieldworkHandwritingStroke[] => {
  const payloadStrokes = extractKoreanFieldworkHandwritingFromPayloadCandidates(text);
  if (payloadStrokes.length > 0) return payloadStrokes;
  const match = text.match(/^\[손그림 좌표\]\s*(.+)$/m);
  if (!match) return [];

  try {
    return normalizeKoreanFieldworkHandwritingStrokes(JSON.parse(match[1]));
  } catch {
    return [];
  }
};

const extractKoreanFieldworkHandwritingFromPayloadCandidates = (
  text: string
): KoreanFieldworkHandwritingStroke[] => {
  for (const payloadCandidate of getHandwritingPayloadCandidates(text)) {
    try {
      const strokes = normalizeKoreanFieldworkHandwritingStrokes(JSON.parse(payloadCandidate));
      if (hasKoreanFieldworkHandwriting(strokes)) return strokes;
    } catch {
      continue;
    }
  }

  return [];
};

const getHandwritingPayloadCandidates = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap(getHandwritingPayloadCandidatesFromLine);

const getHandwritingPayloadCandidatesFromLine = (line: string): string[] => {
  const candidates: string[] = [];
  const objectStart = line.includes('"strokes"') ? line.indexOf('{') : -1;
  if (objectStart >= 0) candidates.push(line.slice(objectStart));

  const legacyArrayStart = line.indexOf('[[{');
  if (legacyArrayStart >= 0) candidates.push(line.slice(legacyArrayStart));

  return candidates;
};

const normalizeStroke = (
  value: unknown
): KoreanFieldworkHandwritingStroke | undefined => {
  const pointsValue = isRecord(value) && Array.isArray(value.points)
    ? value.points
    : value;

  if (!Array.isArray(pointsValue)) return undefined;

  const points = pointsValue
    .map(normalizePoint)
    .filter((point): point is KoreanFieldworkHandwritingPoint => !!point);

  if (points.length === 0) return undefined;

  const width = isRecord(value) ? normalizeStrokeWidth(value.width) : undefined;
  const color = isRecord(value) ? normalizeStrokeColor(value.color) : undefined;
  const tool = isRecord(value) ? normalizeStrokeTool(value.tool) : undefined;

  return {
    ...(color !== undefined ? { color } : {}),
    points,
    ...(tool !== undefined ? { tool } : {}),
    ...(width !== undefined ? { width } : {}),
  };
};

const normalizePoint = (
  value: unknown
): KoreanFieldworkHandwritingPoint | undefined => {
  if (!isRecord(value)) return undefined;

  const x = normalizeCoordinate(value.x);
  const y = normalizeCoordinate(value.y);
  const pressure = normalizePressure(value.pressure);

  return x === undefined || y === undefined
    ? undefined
    : {
      ...(pressure !== undefined ? { pressure } : {}),
      x,
      y,
    };
};

const normalizePressure = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

  return Math.round(
    Math.max(MIN_PRESSURE, Math.min(MAX_PRESSURE, value)) * 1000
  ) / 1000;
};

const normalizeCoordinate = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

  return Math.max(0, Math.min(MAX_COORDINATE, Math.round(value)));
};

const normalizeStrokeWidth = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

  return Math.max(
    MIN_STROKE_WIDTH,
    Math.min(MAX_STROKE_WIDTH, Math.round(value))
  );
};

const normalizeStrokeColor = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value)) {
    return undefined;
  }

  return value.toLowerCase();
};

const normalizeStrokeTool = (
  value: unknown
): KoreanFieldworkHandwritingTool | undefined => {
  if (value === 'pen' || value === 'eraser') return value;

  return undefined;
};

const parseKoreanFieldworkHandwritingPayload = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
