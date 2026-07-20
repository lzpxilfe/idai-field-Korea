import type {
  FieldworkFullscreenDrawingBackground,
  FieldworkFullscreenDrawingGuidePath,
} from './KoreanFieldworkFullscreenDrawingModal';

type FeatureLocationSketchShape =
  'point' | 'polygon' | 'rectangle' | 'circle' | 'oval';

interface FeatureLocationSketch {
  center: SketchPoint;
  points: SketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}

interface SketchPoint {
  x: number;
  y: number;
}

const MAX_COORDINATE = 10000;
const GUIDE_PADDING = 1000;
const FEATURE_SHAPE_BASE_WIDTH = 18;
const FEATURE_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SHAPE_MIN_SCALE = 8;
const FEATURE_SHAPE_MAX_SCALE = 240;
const CURVE_SEGMENTS = 32;
const VALID_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'circle',
  'oval',
]);

export const getKoreanFieldworkFeatureSketchDrawingBackground = (
  value: unknown
): FieldworkFullscreenDrawingBackground | undefined => {
  const guidePaths = getKoreanFieldworkFeatureSketchGuidePaths(value);

  return guidePaths.length > 0 ? { guidePaths } : undefined;
};

export const getKoreanFieldworkFeatureSketchGuidePaths = (
  value: unknown
): FieldworkFullscreenDrawingGuidePath[] => {
  const sketch = normalizeFeatureLocationSketch(value);
  if (!sketch) return [];

  const sourcePoints = getFeatureShapePoints(sketch);
  const points = fitGuidePoints(sourcePoints);
  if (points.length === 0) return [];

  const closed = sketch.shape !== 'point'
    && (sketch.shape !== 'polygon' || points.length >= 3);

  return [{
    closed,
    ...(closed ? { fillColor: 'rgba(249,115,22,0.12)' } : {}),
    points,
    strokeColor: '#f97316',
    width: 3,
  }];
};

const normalizeFeatureLocationSketch = (
  value: unknown
): FeatureLocationSketch | undefined => {
  const rawValue = typeof value === 'string' ? parseJsonObject(value) : value;
  if (!isRecord(rawValue)) return undefined;

  const shapeValue = rawValue.shape;
  if (
    typeof shapeValue !== 'string'
    || !VALID_SHAPES.has(shapeValue as FeatureLocationSketchShape)
  ) {
    return undefined;
  }

  const center = normalizeSketchPoint(rawValue.center) ?? { x: 50, y: 50 };
  const points = Array.isArray(rawValue.points)
    ? rawValue.points
      .map(normalizeSketchPoint)
      .filter((point): point is SketchPoint => !!point)
    : [];

  return {
    center,
    points,
    rotation: normalizeNumber(rawValue.rotation, 0),
    scale: clamp(
      normalizeNumber(rawValue.scale, 100),
      FEATURE_SHAPE_MIN_SCALE,
      FEATURE_SHAPE_MAX_SCALE
    ),
    shape: shapeValue as FeatureLocationSketchShape,
  };
};

const getFeatureShapePoints = (
  sketch: FeatureLocationSketch
): SketchPoint[] => {
  if (sketch.shape === 'polygon') {
    return sketch.points.length > 0 ? sketch.points : [sketch.center];
  }
  if (sketch.shape === 'point') return [sketch.center];

  const shapeScale = sketch.scale / 100;
  const radiusX = FEATURE_SHAPE_BASE_WIDTH * shapeScale / 2;
  const radiusY = (
    sketch.shape === 'circle'
      ? FEATURE_SHAPE_BASE_WIDTH
      : FEATURE_SHAPE_BASE_HEIGHT
  ) * shapeScale / 2;

  if (sketch.shape === 'rectangle') {
    return [
      rotatePoint(sketch.center, -radiusX, -radiusY, sketch.rotation),
      rotatePoint(sketch.center, radiusX, -radiusY, sketch.rotation),
      rotatePoint(sketch.center, radiusX, radiusY, sketch.rotation),
      rotatePoint(sketch.center, -radiusX, radiusY, sketch.rotation),
    ];
  }

  return Array.from({ length: CURVE_SEGMENTS }, (_, index) => {
    const angle = (Math.PI * 2 * index) / CURVE_SEGMENTS;

    return rotatePoint(
      sketch.center,
      Math.cos(angle) * radiusX,
      Math.sin(angle) * radiusY,
      sketch.shape === 'circle' ? 0 : sketch.rotation
    );
  });
};

const fitGuidePoints = (points: SketchPoint[]): SketchPoint[] => {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return [{ x: MAX_COORDINATE / 2, y: MAX_COORDINATE / 2 }];
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  const drawableSize = MAX_COORDINATE - (GUIDE_PADDING * 2);
  const xScale = xRange > 0 ? drawableSize / xRange : Number.POSITIVE_INFINITY;
  const yScale = yRange > 0 ? drawableSize / yRange : Number.POSITIVE_INFINITY;
  const scale = Math.min(xScale, yScale);

  if (!Number.isFinite(scale) || scale <= 0) {
    return [{ x: MAX_COORDINATE / 2, y: MAX_COORDINATE / 2 }];
  }

  const fittedWidth = xRange * scale;
  const fittedHeight = yRange * scale;
  const offsetX = (MAX_COORDINATE - fittedWidth) / 2;
  const offsetY = (MAX_COORDINATE - fittedHeight) / 2;

  return points.map((point) => ({
    x: normalizeCoordinate(offsetX + ((point.x - minX) * scale)),
    y: normalizeCoordinate(offsetY + ((point.y - minY) * scale)),
  }));
};

const rotatePoint = (
  center: SketchPoint,
  deltaX: number,
  deltaY: number,
  rotation: number
): SketchPoint => {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: center.x + (deltaX * cos) - (deltaY * sin),
    y: center.y + (deltaX * sin) + (deltaY * cos),
  };
};

const normalizeSketchPoint = (value: unknown): SketchPoint | undefined => {
  if (!isRecord(value)) return undefined;

  const x = normalizePercent(value.x);
  const y = normalizePercent(value.y);

  return x === undefined || y === undefined ? undefined : { x, y };
};

const normalizePercent = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : undefined;

const normalizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeCoordinate = (value: number): number =>
  Math.round(clamp(value, 0, MAX_COORDINATE));

const parseJsonObject = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
