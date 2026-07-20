import type { Document } from 'idai-field-core';
import {
  getKoreanFieldworkResourceDisplayIdentifier,
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';
import type {
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';
import type {
  FieldworkFullscreenDrawingGuidePath,
} from './KoreanFieldworkFullscreenDrawingModal';

type FeatureLocationSketchShape =
  'point' | 'polygon' | 'rectangle' | 'circle' | 'oval';

interface SketchPoint {
  x: number;
  y: number;
}

interface FeatureLocationSketch {
  center: SketchPoint;
  isClosed: boolean;
  points: SketchPoint[];
  projectBoundarySnapshot?: KoreanFieldworkProjectBoundaryDraft;
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}

export interface KoreanFieldworkDailyJournalFeatureOverlay {
  center: SketchPoint;
  guidePaths: FieldworkFullscreenDrawingGuidePath[];
  id: string;
  label: string;
}

const MAX_COORDINATE = 10000;
const BOUNDARY_PADDING = 800;
const FEATURE_SKETCH_BOUNDARY_PADDING = 14;
const FEATURE_SHAPE_BASE_WIDTH = 18;
const FEATURE_SHAPE_BASE_HEIGHT = 12;
const FEATURE_SHAPE_MIN_SCALE = 8;
const FEATURE_SHAPE_MAX_SCALE = 240;
const CURVE_SEGMENTS = 16;
const FEATURE_STROKE_COLOR = '#0f766e';
const FEATURE_FILL_COLOR = 'rgba(15,118,110,0.12)';
const FEATURE_STROKE_WIDTH = 3;
const VALID_SHAPES = new Set<FeatureLocationSketchShape>([
  'point',
  'polygon',
  'rectangle',
  'circle',
  'oval',
]);

/**
 * Returns the features that were known by the selected journal date.
 *
 * An explicit fieldwork/discovery date takes precedence over document creation.
 * The generic resource.date is intentionally ignored because it can represent
 * archaeological dating instead of the date a feature was found.
 * Documents without either date are retained as baseline features.
 */
export const getKoreanFieldworkDailyJournalFeatureOverlays = (
  documents: readonly Document[],
  selectedDate: Date,
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): KoreanFieldworkDailyJournalFeatureOverlay[] => {
  const selectedDateKey = formatDateKey(selectedDate);

  return documents
    .filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.FEATURE)
    .filter((document) => {
      const featureDateKey = getFeatureDateKey(document);

      return featureDateKey === undefined
        || (selectedDateKey !== undefined && featureDateKey <= selectedDateKey);
    })
    .map((document) => createFeatureOverlay(document, boundaryDraft))
    .filter((
      overlay
    ): overlay is KoreanFieldworkDailyJournalFeatureOverlay => !!overlay);
};

const createFeatureOverlay = (
  document: Document,
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): KoreanFieldworkDailyJournalFeatureOverlay | undefined => {
  const id = typeof document.resource.id === 'string'
    ? document.resource.id.trim()
    : '';
  if (!id) return undefined;

  const resource = document.resource as unknown as Record<string, unknown>;
  const sketch = normalizeFeatureLocationSketch(
    resource.featureLocationSketch
  );
  const drawing = sketch
    ? getSketchDrawing(sketch, boundaryDraft)
    : getPointGeometryDrawing(resource.geometry, boundaryDraft);
  if (!drawing) return undefined;

  return {
    center: drawing.center,
    guidePaths: [drawing.guidePath],
    id,
    label: getKoreanFieldworkResourceDisplayIdentifier(
      document.resource,
      id
    ),
  };
};

const getFeatureDateKey = (document: Document): string | undefined => {
  const resource = document.resource as unknown as Record<string, unknown>;
  const explicitFieldworkDateKey = [
    resource.featureDiscoveryDate,
    resource.fieldworkDate,
    resource.workDate,
  ].map(normalizeDateKey).find((dateKey) => !!dateKey);
  if (explicitFieldworkDateKey) return explicitFieldworkDateKey;

  const createdDate = (document.created as unknown as {
    date?: unknown;
  } | undefined)?.date;

  return normalizeCreatedDateKey(createdDate);
};

const normalizeDateKey = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const dateKey = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? dateKey
    : undefined;
};

const normalizeCreatedDateKey = (value: unknown): string | undefined => {
  const date = value instanceof Date
    ? value
    : typeof value === 'string'
      ? new Date(value)
      : undefined;

  return date ? formatDateKey(date) : undefined;
};

const formatDateKey = (date: Date): string | undefined => {
  if (!Number.isFinite(date.getTime())) return undefined;

  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const normalizeFeatureLocationSketch = (
  value: unknown
): FeatureLocationSketch | undefined => {
  const rawValue = typeof value === 'string' ? parseJson(value) : value;
  if (!isRecord(rawValue)) return undefined;

  const shapeValue = rawValue.shape;
  if (
    typeof shapeValue !== 'string'
    || !VALID_SHAPES.has(shapeValue as FeatureLocationSketchShape)
  ) {
    return undefined;
  }

  const points = Array.isArray(rawValue.points)
    ? rawValue.points
      .map(normalizeSketchPoint)
      .filter((point): point is SketchPoint => !!point)
    : [];
  const explicitCenter = normalizeSketchPoint(rawValue.center);
  const center = explicitCenter
    ?? (points.length > 0 ? getPointsCenter(points) : undefined);
  if (!center || (shapeValue === 'polygon' && points.length === 0)) {
    return undefined;
  }

  return {
    center,
    isClosed: shapeValue === 'polygon'
      ? rawValue.isClosed !== false && points.length >= 3
      : shapeValue !== 'point',
    points,
    projectBoundarySnapshot: normalizeBoundaryDraft(
      rawValue.projectBoundarySnapshot
    ),
    rotation: normalizeNumber(rawValue.rotation, 0),
    scale: clamp(
      normalizeNumber(rawValue.scale, 100),
      FEATURE_SHAPE_MIN_SCALE,
      FEATURE_SHAPE_MAX_SCALE
    ),
    shape: shapeValue as FeatureLocationSketchShape,
  };
};

const getSketchDrawing = (
  sketch: FeatureLocationSketch,
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): {
  center: SketchPoint;
  guidePath: FieldworkFullscreenDrawingGuidePath;
} | undefined => {
  const percentPoints = getSketchShapePoints(sketch);
  if (percentPoints.length === 0) return undefined;

  const closed = sketch.isClosed && percentPoints.length >= 3;

  return {
    center: toDrawingPoint(
      sketch.center,
      sketch.projectBoundarySnapshot,
      boundaryDraft
    ),
    guidePath: {
      closed,
      ...(closed ? { fillColor: FEATURE_FILL_COLOR } : {}),
      points: percentPoints.map((point) =>
        toDrawingPoint(
          point,
          sketch.projectBoundarySnapshot,
          boundaryDraft
        )),
      strokeColor: FEATURE_STROKE_COLOR,
      width: FEATURE_STROKE_WIDTH,
    },
  };
};

const getSketchShapePoints = (
  sketch: FeatureLocationSketch
): SketchPoint[] => {
  if (sketch.shape === 'polygon') return sketch.points;
  if (sketch.shape === 'point') return [sketch.center];

  const halfWidth = (FEATURE_SHAPE_BASE_WIDTH * sketch.scale) / 200;
  const halfHeight = (
    (sketch.shape === 'circle'
      ? FEATURE_SHAPE_BASE_WIDTH
      : FEATURE_SHAPE_BASE_HEIGHT)
    * sketch.scale
  ) / 200;

  if (sketch.shape === 'rectangle') {
    return [
      rotatePoint(sketch.center, -halfWidth, -halfHeight, sketch.rotation),
      rotatePoint(sketch.center, halfWidth, -halfHeight, sketch.rotation),
      rotatePoint(sketch.center, halfWidth, halfHeight, sketch.rotation),
      rotatePoint(sketch.center, -halfWidth, halfHeight, sketch.rotation),
    ];
  }

  return Array.from({ length: CURVE_SEGMENTS }, (_, index) => {
    const angle = (Math.PI * 2 * index) / CURVE_SEGMENTS;

    return rotatePoint(
      sketch.center,
      Math.cos(angle) * halfWidth,
      Math.sin(angle) * halfHeight,
      sketch.shape === 'circle' ? 0 : sketch.rotation
    );
  });
};

const getPointGeometryDrawing = (
  value: unknown,
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): {
  center: SketchPoint;
  guidePath: FieldworkFullscreenDrawingGuidePath;
} | undefined => {
  const geometry = typeof value === 'string' ? parseJson(value) : value;
  if (
    !isRecord(geometry)
    || geometry.type !== 'Point'
    || !Array.isArray(geometry.coordinates)
    || geometry.coordinates.length < 2
  ) {
    return undefined;
  }

  const longitude = geometry.coordinates[0];
  const latitude = geometry.coordinates[1];
  if (
    typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || typeof latitude !== 'number'
    || !Number.isFinite(latitude)
  ) {
    return undefined;
  }

  const center = projectBoundaryLocation(
    { latitude, longitude },
    boundaryDraft
  );
  if (!center) return undefined;

  return {
    center,
    guidePath: {
      closed: false,
      fillColor: FEATURE_FILL_COLOR,
      points: [center],
      strokeColor: FEATURE_STROKE_COLOR,
      width: FEATURE_STROKE_WIDTH,
    },
  };
};

const projectBoundaryLocation = (
  location: { latitude: number; longitude: number },
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): SketchPoint | undefined => {
  const boundaryLocations = boundaryDraft?.coordinates.filter((point) =>
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) ?? [];
  if (boundaryLocations.length < 3) return undefined;

  const averageLatitude = boundaryLocations.reduce(
    (sum, point) => sum + point.latitude,
    0
  ) / boundaryLocations.length;
  const longitudeScale = Math.max(
    Math.cos((averageLatitude * Math.PI) / 180),
    0.000001
  );
  const projectedBoundary = boundaryLocations.map((point) => ({
    x: point.longitude * longitudeScale,
    y: point.latitude,
  }));
  const xs = projectedBoundary.map((point) => point.x);
  const ys = projectedBoundary.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = Math.max(maxX - minX, 0.000001);
  const yRange = Math.max(maxY - minY, 0.000001);
  const drawableSize = MAX_COORDINATE - (BOUNDARY_PADDING * 2);
  const projectedLocation = {
    x: location.longitude * longitudeScale,
    y: location.latitude,
  };

  return {
    x: normalizeDrawingCoordinate(
      BOUNDARY_PADDING
      + (((projectedLocation.x - minX) / xRange) * drawableSize)
    ),
    y: normalizeDrawingCoordinate(
      BOUNDARY_PADDING
      + (((maxY - projectedLocation.y) / yRange) * drawableSize)
    ),
  };
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
    x: clamp(center.x + (deltaX * cos) - (deltaY * sin), 0, 100),
    y: clamp(center.y + (deltaX * sin) + (deltaY * cos), 0, 100),
  };
};

const normalizeSketchPoint = (value: unknown): SketchPoint | undefined => {
  if (!isRecord(value)) return undefined;

  const x = normalizePercent(value.x);
  const y = normalizePercent(value.y);

  return x === undefined || y === undefined ? undefined : { x, y };
};

const getPointsCenter = (points: readonly SketchPoint[]): SketchPoint => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

const toDrawingPoint = (
  point: SketchPoint,
  sourceBoundaryDraft?: KoreanFieldworkProjectBoundaryDraft,
  targetBoundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): SketchPoint => {
  const boundaryLocation = sourceBoundaryDraft
    ? denormalizeSketchPointToBoundaryLocation(point, sourceBoundaryDraft)
    : undefined;
  const projectedBoundaryLocation =
    boundaryLocation && targetBoundaryDraft
      ? projectBoundaryLocation(boundaryLocation, targetBoundaryDraft)
      : undefined;
  if (projectedBoundaryLocation) return projectedBoundaryLocation;

  const sourceDrawableSize = 100 - (FEATURE_SKETCH_BOUNDARY_PADDING * 2);
  const targetDrawableSize = MAX_COORDINATE - (BOUNDARY_PADDING * 2);
  const mapCoordinate = (value: number): number =>
    BOUNDARY_PADDING
    + (
      ((value - FEATURE_SKETCH_BOUNDARY_PADDING) / sourceDrawableSize)
      * targetDrawableSize
    );

  return {
    x: normalizeDrawingCoordinate(mapCoordinate(point.x)),
    y: normalizeDrawingCoordinate(mapCoordinate(point.y)),
  };
};

const denormalizeSketchPointToBoundaryLocation = (
  point: SketchPoint,
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft
): { latitude: number; longitude: number } | undefined => {
  const bounds = getBoundaryBounds(boundaryDraft);
  if (!bounds) return undefined;

  const drawableSize = 100 - (FEATURE_SKETCH_BOUNDARY_PADDING * 2);
  const normalizedX =
    (point.x - FEATURE_SKETCH_BOUNDARY_PADDING) / drawableSize;
  const normalizedY =
    (point.y - FEATURE_SKETCH_BOUNDARY_PADDING) / drawableSize;

  return {
    latitude: bounds.maxLatitude - (normalizedY * bounds.latitudeRange),
    longitude: bounds.minLongitude + (normalizedX * bounds.longitudeRange),
  };
};

const normalizeBoundaryDraft = (
  value: unknown
): KoreanFieldworkProjectBoundaryDraft | undefined => {
  if (!isRecord(value) || !Array.isArray(value.coordinates)) return undefined;

  const coordinates = value.coordinates
    .map((coordinate) => {
      if (!isRecord(coordinate)) return undefined;

      const { latitude, longitude } = coordinate;
      return (
        typeof latitude === 'number'
        && Number.isFinite(latitude)
        && typeof longitude === 'number'
        && Number.isFinite(longitude)
      )
        ? { latitude, longitude }
        : undefined;
    })
    .filter((coordinate): coordinate is {
      latitude: number;
      longitude: number;
    } => !!coordinate);

  return coordinates.length >= 3 ? { coordinates } : undefined;
};

const getBoundaryBounds = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft
): {
  latitudeRange: number;
  longitudeRange: number;
  maxLatitude: number;
  minLongitude: number;
} | undefined => {
  const coordinates = boundaryDraft.coordinates.filter((coordinate) =>
    Number.isFinite(coordinate.latitude)
    && Number.isFinite(coordinate.longitude));
  if (coordinates.length < 3) return undefined;

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitudeRange: Math.max(maxLatitude - minLatitude, 0.000001),
    longitudeRange: Math.max(maxLongitude - minLongitude, 0.000001),
    maxLatitude,
    minLongitude,
  };
};

const normalizeDrawingCoordinate = (value: number): number =>
  Math.round(clamp(value, 0, MAX_COORDINATE));

const normalizePercent = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : undefined;

const normalizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const parseJson = (value: string): unknown => {
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
