import type {
  KoreanFieldworkBoundaryLocation,
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';

const ARCGIS_WORLD_IMAGERY_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const FEATURE_SKETCH_BOUNDARY_PADDING = 14;
const SATELLITE_TILE_SIZE = 256;
const SATELLITE_TARGET_PIXEL_WIDTH = 1000;
const SATELLITE_MAX_ZOOM = 18;
const SATELLITE_MAX_TILE_COUNT = 36;
const SATELLITE_FALLBACK_LATITUDE_SPAN = 0.0012;

export const FEATURE_SKETCH_SATELLITE_ATTRIBUTION = 'Tiles © Esri';

export interface FeatureSketchSatelliteTile {
  heightPercent: number;
  key: string;
  leftPercent: number;
  topPercent: number;
  uri: string;
  widthPercent: number;
}

interface FeatureSketchSatelliteBounds {
  maxLatitude: number;
  maxLongitude: number;
  minLatitude: number;
  minLongitude: number;
}

export const getFeatureSketchSatelliteTiles = (
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft,
  fallbackCenter?: KoreanFieldworkBoundaryLocation
): FeatureSketchSatelliteTile[] => {
  const bounds = getPaddedBoundaryBounds(boundaryDraft)
    ?? getFallbackCenterBounds(fallbackCenter);
  if (!bounds) return [];

  let zoom = getSatelliteZoom(bounds);
  let tileRange = getTileRange(bounds, zoom);
  while (tileRange.count > SATELLITE_MAX_TILE_COUNT && zoom > 0) {
    zoom -= 1;
    tileRange = getTileRange(bounds, zoom);
  }

  const longitudeRange = bounds.maxLongitude - bounds.minLongitude;
  const latitudeRange = bounds.maxLatitude - bounds.minLatitude;
  const tiles: FeatureSketchSatelliteTile[] = [];

  for (let y = tileRange.minY; y <= tileRange.maxY; y += 1) {
    for (let x = tileRange.minX; x <= tileRange.maxX; x += 1) {
      const west = tileXToLongitude(x, zoom);
      const east = tileXToLongitude(x + 1, zoom);
      const north = tileYToLatitude(y, zoom);
      const south = tileYToLatitude(y + 1, zoom);

      tiles.push({
        heightPercent: ((north - south) / latitudeRange) * 100,
        key: `${zoom}/${y}/${x}`,
        leftPercent: ((west - bounds.minLongitude) / longitudeRange) * 100,
        topPercent: ((bounds.maxLatitude - north) / latitudeRange) * 100,
        uri: `${ARCGIS_WORLD_IMAGERY_TILE_URL}/${zoom}/${y}/${x}`,
        widthPercent: ((east - west) / longitudeRange) * 100,
      });
    }
  }

  return tiles;
};

const getPaddedBoundaryBounds = (
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft
): FeatureSketchSatelliteBounds | undefined => {
  if (!boundaryDraft || boundaryDraft.coordinates.length < 3) return undefined;

  const longitudes = boundaryDraft.coordinates.map((point) => point.longitude);
  const latitudes = boundaryDraft.coordinates.map((point) => point.latitude);
  if (
    longitudes.some((value) => !Number.isFinite(value))
    || latitudes.some((value) => !Number.isFinite(value))
  ) {
    return undefined;
  }

  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.000001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.000001);
  const drawablePercent = 100 - (FEATURE_SKETCH_BOUNDARY_PADDING * 2);
  const longitudePadding = longitudeRange
    * (FEATURE_SKETCH_BOUNDARY_PADDING / drawablePercent);
  const latitudePadding = latitudeRange
    * (FEATURE_SKETCH_BOUNDARY_PADDING / drawablePercent);

  return {
    maxLatitude: maxLatitude + latitudePadding,
    maxLongitude: maxLongitude + longitudePadding,
    minLatitude: minLatitude - latitudePadding,
    minLongitude: minLongitude - longitudePadding,
  };
};

const getFallbackCenterBounds = (
  center?: KoreanFieldworkBoundaryLocation
): FeatureSketchSatelliteBounds | undefined => {
  if (
    !center
    || !Number.isFinite(center.latitude)
    || !Number.isFinite(center.longitude)
  ) {
    return undefined;
  }

  const latitudeRadius = SATELLITE_FALLBACK_LATITUDE_SPAN / 2;
  const longitudeRadius = latitudeRadius / Math.max(
    Math.cos((center.latitude * Math.PI) / 180),
    0.1
  );

  return {
    maxLatitude: center.latitude + latitudeRadius,
    maxLongitude: center.longitude + longitudeRadius,
    minLatitude: center.latitude - latitudeRadius,
    minLongitude: center.longitude - longitudeRadius,
  };
};

const getSatelliteZoom = (bounds: FeatureSketchSatelliteBounds): number => {
  const longitudeRange = bounds.maxLongitude - bounds.minLongitude;
  const exactZoom = Math.log2(
    (360 * SATELLITE_TARGET_PIXEL_WIDTH)
      / (longitudeRange * SATELLITE_TILE_SIZE)
  );

  return Math.max(0, Math.min(SATELLITE_MAX_ZOOM, Math.round(exactZoom)));
};

const getTileRange = (bounds: FeatureSketchSatelliteBounds, zoom: number) => {
  const minX = Math.floor(longitudeToTileX(bounds.minLongitude, zoom));
  const maxX = Math.floor(longitudeToTileX(bounds.maxLongitude, zoom));
  const minY = Math.floor(latitudeToTileY(bounds.maxLatitude, zoom));
  const maxY = Math.floor(latitudeToTileY(bounds.minLatitude, zoom));

  return {
    count: (maxX - minX + 1) * (maxY - minY + 1),
    maxX,
    maxY,
    minX,
    minY,
  };
};

const longitudeToTileX = (longitude: number, zoom: number): number => (
  ((longitude + 180) / 360) * (2 ** zoom)
);

const latitudeToTileY = (latitude: number, zoom: number): number => {
  const latitudeRadians = (latitude * Math.PI) / 180;
  return (
    (1 - (Math.log(Math.tan(latitudeRadians) + (1 / Math.cos(latitudeRadians)))
      / Math.PI))
      / 2
  ) * (2 ** zoom);
};

const tileXToLongitude = (x: number, zoom: number): number => (
  ((x / (2 ** zoom)) * 360) - 180
);

const tileYToLatitude = (y: number, zoom: number): number => (
  (Math.atan(Math.sinh(Math.PI * (1 - ((2 * y) / (2 ** zoom))))) * 180)
    / Math.PI
);
