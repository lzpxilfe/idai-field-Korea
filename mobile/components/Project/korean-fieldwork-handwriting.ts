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

export const KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE =
  'penMemoInfiniteGridV1' as const;
export const KOREAN_FIELDWORK_PEN_MEMO_WORLD_LIMIT = 10000000;

export interface KoreanFieldworkPenMemoHandwritingPayload {
  coordinateSpace: typeof KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE;
  version: 2;
  strokes: KoreanFieldworkHandwritingStroke[];
}

export interface KoreanFieldworkHandwritingNormalizationOptions {
  coordinateSpace?: typeof KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE;
}

const MAX_COORDINATE = 10000;
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 24;
const MIN_PRESSURE = 0;
const MAX_PRESSURE = 1;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DEFAULT_PEN_WIDTH = 5;
const DEFAULT_ERASER_WIDTH = 5;
const ERASER_REFERENCE_CANVAS_SIZE = 640;
const MIN_ERASER_RADIUS = 24;
const MIN_ERASER_SAMPLE_SPACING = 8;
const MAX_ERASER_SAMPLE_SPACING = 40;
const MAX_ERASER_DENSE_SAMPLES_PER_STROKE = 20000;

export const normalizeKoreanFieldworkHandwritingStrokes = (
  value: unknown,
  options: KoreanFieldworkHandwritingNormalizationOptions = {}
): KoreanFieldworkHandwritingStroke[] => {
  const normalizedValue = typeof value === 'string'
    ? parseKoreanFieldworkHandwritingPayload(value)
    : value;
  const coordinateSpace = isHandwritingPayload(normalizedValue)
    ? getCoordinateSpace(normalizedValue)
    : options.coordinateSpace;
  const strokesValue = isRecord(normalizedValue)
    && Array.isArray(normalizedValue.strokes)
    ? normalizedValue.strokes
    : normalizedValue;

  if (!Array.isArray(strokesValue)) return [];

  return strokesValue
    .map((stroke) => normalizeStroke(stroke, coordinateSpace))
    .filter((stroke): stroke is KoreanFieldworkHandwritingStroke => !!stroke);
};

export const hasKoreanFieldworkHandwriting = (
  strokes: readonly KoreanFieldworkHandwritingStroke[]
): boolean => strokes.some((stroke) => stroke.points.length > 0);

export const countKoreanFieldworkHandwritingPoints = (
  strokes: readonly KoreanFieldworkHandwritingStroke[]
): number => strokes.reduce((count, stroke) => count + stroke.points.length, 0);

export const serializeKoreanFieldworkHandwriting = (
  strokes: readonly KoreanFieldworkHandwritingStroke[],
  options: KoreanFieldworkHandwritingNormalizationOptions = {}
): string => options.coordinateSpace === KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
  ? JSON.stringify({
    coordinateSpace: KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE,
    version: 2,
    strokes: normalizeKoreanFieldworkHandwritingStrokes(strokes, options),
  } satisfies KoreanFieldworkPenMemoHandwritingPayload)
  : JSON.stringify({
    version: 1,
    strokes: normalizeKoreanFieldworkHandwritingStrokes(strokes),
  } satisfies KoreanFieldworkHandwritingPayload);

/**
 * Replays the saved stroke timeline and returns only ink that remains visible.
 * Erasers affect preceding pen strokes, while pen strokes written afterwards
 * remain intact. The stored payload itself is deliberately left unchanged.
 */
export const applyKoreanFieldworkHandwritingErasers = (
  value: unknown,
  options: KoreanFieldworkHandwritingNormalizationOptions = {}
): KoreanFieldworkHandwritingStroke[] => {
  const timeline = normalizeKoreanFieldworkHandwritingStrokes(value, options);
  let visibleStrokes: KoreanFieldworkHandwritingStroke[] = [];

  for (const stroke of timeline) {
    if (stroke.tool !== 'eraser') {
      visibleStrokes.push(stroke);
      continue;
    }

    visibleStrokes = visibleStrokes.flatMap((visibleStroke) =>
      subtractEraserStroke(visibleStroke, stroke));
  }

  return visibleStrokes;
};

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
  value: unknown,
  coordinateSpace?: typeof KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
): KoreanFieldworkHandwritingStroke | undefined => {
  const pointsValue = isRecord(value) && Array.isArray(value.points)
    ? value.points
    : value;

  if (!Array.isArray(pointsValue)) return undefined;

  const points = pointsValue
    .map((point) => normalizePoint(point, coordinateSpace))
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
  value: unknown,
  coordinateSpace?: typeof KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
): KoreanFieldworkHandwritingPoint | undefined => {
  if (!isRecord(value)) return undefined;

  const x = normalizeCoordinate(value.x, coordinateSpace);
  const y = normalizeCoordinate(value.y, coordinateSpace);
  const pressure = normalizePressure(value.pressure);

  return x === undefined || y === undefined
    ? undefined
    : {
      ...(pressure !== undefined ? { pressure } : {}),
      x,
      y,
    };
};

const subtractEraserStroke = (
  penStroke: KoreanFieldworkHandwritingStroke,
  eraserStroke: KoreanFieldworkHandwritingStroke
): KoreanFieldworkHandwritingStroke[] => {
  const radius = Math.max(
    MIN_ERASER_RADIUS,
    (
      (eraserStroke.width ?? DEFAULT_ERASER_WIDTH)
      + (penStroke.width ?? DEFAULT_PEN_WIDTH)
    ) / 2 * (MAX_COORDINATE / ERASER_REFERENCE_CANVAS_SIZE)
  );
  if (!strokeBoundsOverlap(penStroke, eraserStroke, radius)) {
    return [penStroke];
  }

  const sampleSpacing = Math.max(
    MIN_ERASER_SAMPLE_SPACING,
    Math.min(MAX_ERASER_SAMPLE_SPACING, radius / 3)
  );
  const sampledPoints = sampleStrokePoints(
    penStroke.points,
    sampleSpacing,
    getStrokeBounds(eraserStroke.points),
    radius
  );
  const visibleRuns: KoreanFieldworkHandwritingPoint[][] = [];
  let activeRun: KoreanFieldworkHandwritingPoint[] = [];

  for (const point of sampledPoints) {
    if (getDistanceToStroke(point, eraserStroke.points) > radius) {
      activeRun.push(point);
    } else if (activeRun.length > 0) {
      visibleRuns.push(activeRun);
      activeRun = [];
    }
  }
  if (activeRun.length > 0) visibleRuns.push(activeRun);

  return visibleRuns.map((points) => ({
    ...(penStroke.color ? { color: penStroke.color } : {}),
    points,
    ...(penStroke.tool ? { tool: penStroke.tool } : {}),
    ...(penStroke.width !== undefined ? { width: penStroke.width } : {}),
  }));
};

const strokeBoundsOverlap = (
  first: KoreanFieldworkHandwritingStroke,
  second: KoreanFieldworkHandwritingStroke,
  padding: number
): boolean => {
  const firstBounds = getStrokeBounds(first.points);
  const secondBounds = getStrokeBounds(second.points);

  return firstBounds.minX <= secondBounds.maxX + padding
    && firstBounds.maxX >= secondBounds.minX - padding
    && firstBounds.minY <= secondBounds.maxY + padding
    && firstBounds.maxY >= secondBounds.minY - padding;
};

const getStrokeBounds = (
  points: readonly KoreanFieldworkHandwritingPoint[]
): { maxX: number; maxY: number; minX: number; minY: number } =>
  points.slice(1).reduce((bounds, point) => ({
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
  }), {
    maxX: points[0].x,
    maxY: points[0].y,
    minX: points[0].x,
    minY: points[0].y,
  });

const sampleStrokePoints = (
  points: readonly KoreanFieldworkHandwritingPoint[],
  spacing: number,
  focusBounds: { maxX: number; maxY: number; minX: number; minY: number },
  focusPadding: number
): KoreanFieldworkHandwritingPoint[] => {
  if (points.length < 2) return points.slice();

  const segments = points.slice(1).map((end, index) => {
    const start = points[index];
    const interval = getSegmentBoundsIntersectionInterval(
      start,
      end,
      focusBounds,
      focusPadding
    );
    return {
      end,
      interval,
      length: getPointDistance(start, end),
      start,
    };
  });
  const focusedLength = segments.reduce((length, segment) =>
    length + (segment.interval
      ? segment.length * (segment.interval.end - segment.interval.start)
      : 0), 0);
  const effectiveSpacing = Math.max(
    spacing,
    focusedLength / MAX_ERASER_DENSE_SAMPLES_PER_STROKE
  );
  const sampledPoints: KoreanFieldworkHandwritingPoint[] = [points[0]];
  let denseSampleCount = 0;
  for (const { end, interval, length, start } of segments) {
    if (!interval) {
      appendSampledPoint(sampledPoints, end);
      continue;
    }

    if (interval.start > 0) {
      appendSampledPoint(
        sampledPoints,
        interpolateHandwritingPoint(start, end, interval.start)
      );
    }
    const remainingSampleBudget = Math.max(
      0,
      MAX_ERASER_DENSE_SAMPLES_PER_STROKE - denseSampleCount
    );
    const steps = Math.min(
      remainingSampleBudget,
      Math.max(1, Math.ceil(
        (length * (interval.end - interval.start)) / effectiveSpacing
      ))
    );
    for (let step = 1; step <= steps; step += 1) {
      const progress = interval.start
        + ((interval.end - interval.start) * (step / steps));
      appendSampledPoint(
        sampledPoints,
        interpolateHandwritingPoint(start, end, progress)
      );
    }
    denseSampleCount += steps;
    if (steps === 0) {
      appendSampledPoint(
        sampledPoints,
        interpolateHandwritingPoint(start, end, interval.end)
      );
    }
    if (interval.end < 1) appendSampledPoint(sampledPoints, end);
  }
  return sampledPoints;
};

const appendSampledPoint = (
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

const getSegmentBoundsIntersectionInterval = (
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint,
  bounds: { maxX: number; maxY: number; minX: number; minY: number },
  padding: number
): { end: number; start: number } | undefined => {
  let intervalStart = 0;
  let intervalEnd = 1;
  const axes = [
    {
      change: end.x - start.x,
      maximum: bounds.maxX + padding,
      minimum: bounds.minX - padding,
      origin: start.x,
    },
    {
      change: end.y - start.y,
      maximum: bounds.maxY + padding,
      minimum: bounds.minY - padding,
      origin: start.y,
    },
  ];

  for (const axis of axes) {
    if (axis.change === 0) {
      if (axis.origin < axis.minimum || axis.origin > axis.maximum) {
        return undefined;
      }
      continue;
    }
    const first = (axis.minimum - axis.origin) / axis.change;
    const second = (axis.maximum - axis.origin) / axis.change;
    intervalStart = Math.max(intervalStart, Math.min(first, second));
    intervalEnd = Math.min(intervalEnd, Math.max(first, second));
    if (intervalStart > intervalEnd) return undefined;
  }

  return {
    end: Math.max(0, Math.min(1, intervalEnd)),
    start: Math.max(0, Math.min(1, intervalStart)),
  };
};

const interpolateHandwritingPoint = (
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
    x: Math.round(start.x + ((end.x - start.x) * progress)),
    y: Math.round(start.y + ((end.y - start.y) * progress)),
  };
};

const getDistanceToStroke = (
  point: KoreanFieldworkHandwritingPoint,
  strokePoints: readonly KoreanFieldworkHandwritingPoint[]
): number => {
  if (strokePoints.length === 1) return getPointDistance(point, strokePoints[0]);

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < strokePoints.length; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      getDistanceToSegment(point, strokePoints[index - 1], strokePoints[index])
    );
  }
  return minimumDistance;
};

const getDistanceToSegment = (
  point: KoreanFieldworkHandwritingPoint,
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint
): number => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = (deltaX ** 2) + (deltaY ** 2);
  if (lengthSquared === 0) return getPointDistance(point, start);

  const projection = Math.max(0, Math.min(1,
    (((point.x - start.x) * deltaX) + ((point.y - start.y) * deltaY))
      / lengthSquared
  ));
  return getPointDistance(point, {
    x: start.x + (deltaX * projection),
    y: start.y + (deltaY * projection),
  });
};

const getPointDistance = (
  first: KoreanFieldworkHandwritingPoint,
  second: KoreanFieldworkHandwritingPoint
): number => Math.sqrt(
  ((second.x - first.x) ** 2) + ((second.y - first.y) ** 2)
);

const normalizePressure = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

  return Math.round(
    Math.max(MIN_PRESSURE, Math.min(MAX_PRESSURE, value)) * 1000
  ) / 1000;
};

const normalizeCoordinate = (
  value: unknown,
  coordinateSpace?: typeof KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

  const roundedValue = Math.round(value);
  return coordinateSpace === KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
    ? Math.max(
      -KOREAN_FIELDWORK_PEN_MEMO_WORLD_LIMIT,
      Math.min(KOREAN_FIELDWORK_PEN_MEMO_WORLD_LIMIT, roundedValue)
    )
    : Math.max(0, Math.min(MAX_COORDINATE, roundedValue));
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

const getCoordinateSpace = (
  value: unknown
): typeof KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE | undefined =>
  isRecord(value)
  && value.version === 2
  && value.coordinateSpace === KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
    ? KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE
    : undefined;

const isHandwritingPayload = (value: unknown): boolean =>
  isRecord(value) && Array.isArray(value.strokes);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
