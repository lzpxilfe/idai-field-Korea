import * as FileSystem from 'expo-file-system';
import {
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_IMPORTED_VECTOR_LAYER,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DXF_IMPORT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_GEOJSON_IMPORT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_SHP_IMPORT,
} from 'idai-field-core';
import proj4 from 'proj4';
import {
  MapLocation,
  SurveyBoundaryGeometry,
} from './korean-fieldwork-drafts';

export interface ImportedBoundaryFile {
  boundarySource: string;
  center?: MapLocation;
  coordinateCount: number;
  coordinateSystem: string;
  fileName: string;
  geometry: SurveyBoundaryGeometry;
  referenceBasemapProvider: string;
}

interface ParsedBoundaryGeometry {
  coordinateSystem: string;
  geometry: SurveyBoundaryGeometry;
}

type Coordinate = [number, number];
type DxfGroup = { code: number; value: string };
type DxfEntity = { type: string; groups: DxfGroup[] };

const WEB_MERCATOR = 'EPSG:3857';
const WGS84 = 'EPSG:4326';
const KOREA_UNIFIED = 'EPSG:5179';
const KOREA_CENTRAL_2000 = 'EPSG:5181';
const KOREA_WEST_2010 = 'EPSG:5185';
const KOREA_CENTRAL_2010 = 'EPSG:5186';
const KOREA_EAST_2010 = 'EPSG:5187';
const SUPPORTED_CRS = new Set([
  WEB_MERCATOR,
  WGS84,
  KOREA_UNIFIED,
  KOREA_CENTRAL_2000,
  KOREA_WEST_2010,
  KOREA_CENTRAL_2010,
  KOREA_EAST_2010,
]);
const FILE_URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const DXF_LINE_CONNECT_TOLERANCE = 0.001;

let hasRegisteredProj4Definitions = false;

export const importBoundaryFileFromPath = async (
  filePath: string
): Promise<ImportedBoundaryFile> => {
  const uri = normalizeLocalFileUri(filePath);
  const extension = getFileExtension(uri);
  const prjCoordinateSystem = await readPrjCoordinateSystem(uri);
  let parsedBoundary: ParsedBoundaryGeometry;
  let boundarySource: string;

  if (extension === 'shp') {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    parsedBoundary = parseShpBoundaryBytes(
      base64ToUint8Array(base64),
      prjCoordinateSystem
    );
    boundarySource = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_SHP_IMPORT;
  } else if (extension === 'dxf') {
    const dxfText = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    parsedBoundary = parseDxfBoundaryText(dxfText, prjCoordinateSystem);
    boundarySource = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DXF_IMPORT;
  } else if (extension === 'geojson' || extension === 'json') {
    const geoJsonText = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    parsedBoundary = parseGeoJsonBoundaryText(geoJsonText, prjCoordinateSystem);
    boundarySource = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_GEOJSON_IMPORT;
  } else {
    throw new Error('Supported boundary files are .shp, .dxf, and .geojson.');
  }

  return {
    ...parsedBoundary,
    boundarySource,
    center: getGeometryCenter(parsedBoundary.geometry),
    coordinateCount: parsedBoundary.geometry.coordinates.length,
    fileName: getFileName(uri),
    referenceBasemapProvider:
      KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_IMPORTED_VECTOR_LAYER,
  };
};

export const parseDxfBoundaryText = (
  dxfText: string,
  coordinateSystemHint?: string
): ParsedBoundaryGeometry => {
  const entities = collectDxfEntities(dxfText);
  const candidates: Coordinate[][] = [];
  const segments: [Coordinate, Coordinate][] = [];

  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index];
    if (!entity) continue;

    if (entity.type === 'LWPOLYLINE') {
      addCandidate(candidates, parseDxfLightweightPolyline(entity.groups));
    } else if (entity.type === 'POLYLINE') {
      const vertices: Coordinate[] = [];
      let cursor = index + 1;
      while (cursor < entities.length && entities[cursor]?.type !== 'SEQEND') {
        if (entities[cursor]?.type === 'VERTEX') {
          addCoordinate(vertices, getDxfCoordinate(entities[cursor].groups));
        }
        cursor += 1;
      }
      addCandidate(candidates, vertices);
      index = cursor;
    } else if (entity.type === 'LINE') {
      const segment = parseDxfLine(entity.groups);
      if (segment) segments.push(segment);
    }
  }

  if (candidates.length === 0 && segments.length > 0) {
    addCandidate(candidates, buildLineStringFromSegments(segments));
  }

  return createSurveyBoundaryGeometry(
    selectBestCoordinateSet(candidates),
    coordinateSystemHint
  );
};

export const parseShpBoundaryBytes = (
  bytes: Uint8Array,
  coordinateSystemHint?: string
): ParsedBoundaryGeometry => {
  if (bytes.length < 100) {
    throw new Error('The SHP file is too small to contain a valid header.');
  }
  if (readInt32BE(bytes, 0) !== 9994) {
    throw new Error('The SHP file header is invalid.');
  }

  const candidates: Coordinate[][] = [];
  const fallbackPoints: Coordinate[] = [];
  let offset = 100;

  while (offset + 8 <= bytes.length) {
    const contentLength = readInt32BE(bytes, offset + 4) * 2;
    const contentStart = offset + 8;
    const contentEnd = contentStart + contentLength;
    if (contentLength <= 0 || contentEnd > bytes.length) break;

    const shapeType = readInt32LE(bytes, contentStart);
    if (isMultipartShapeType(shapeType)) {
      parseMultipartShpRecord(bytes, contentStart, contentEnd)
        .forEach((part) => addCandidate(candidates, part));
    } else if (isPointShapeType(shapeType)) {
      addCoordinate(fallbackPoints, parseShpPointRecord(bytes, contentStart));
    }

    offset = contentEnd;
  }

  if (candidates.length === 0) addCandidate(candidates, fallbackPoints);

  return createSurveyBoundaryGeometry(
    selectBestCoordinateSet(candidates),
    coordinateSystemHint
  );
};

export const parseGeoJsonBoundaryText = (
  geoJsonText: string,
  coordinateSystemHint?: string
): ParsedBoundaryGeometry => {
  const geoJson = JSON.parse(geoJsonText);
  const candidates = extractGeoJsonCoordinateSets(geoJson);

  return createSurveyBoundaryGeometry(
    selectBestCoordinateSet(candidates),
    coordinateSystemHint
  );
};

const normalizeLocalFileUri = (filePath: string): string => {
  const trimmedPath = filePath.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmedPath) throw new Error('Enter a SHP or DXF file path.');
  if (FILE_URI_SCHEME_PATTERN.test(trimmedPath)) return trimmedPath;
  if (trimmedPath.startsWith('/')) return `file://${trimmedPath}`;

  return trimmedPath;
};

const getFileExtension = (uri: string): string => {
  const cleanUri = uri.split(/[?#]/)[0];
  const match = /\.([a-z0-9]+)$/i.exec(cleanUri);
  return match?.[1]?.toLowerCase() ?? '';
};

const getFileName = (uri: string): string => {
  const cleanUri = decodeURIComponent(uri.split(/[?#]/)[0]);
  return cleanUri.replace(/\\/g, '/').split('/').pop() ?? cleanUri;
};

const readPrjCoordinateSystem = async (
  uri: string
): Promise<string | undefined> => {
  const prjUri = replaceFileExtension(uri, '.prj');
  if (!prjUri || prjUri === uri) return undefined;

  try {
    const prjText = await FileSystem.readAsStringAsync(prjUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return detectCoordinateSystemFromPrj(prjText);
  } catch {
    return undefined;
  }
};

const replaceFileExtension = (
  uri: string,
  nextExtension: string
): string | undefined => {
  const queryIndex = uri.search(/[?#]/);
  const suffix = queryIndex >= 0 ? uri.slice(queryIndex) : '';
  const pathPart = queryIndex >= 0 ? uri.slice(0, queryIndex) : uri;
  if (!/\.[^./\\]+$/.test(pathPart)) return undefined;

  return pathPart.replace(/\.[^./\\]+$/, nextExtension) + suffix;
};

const createSurveyBoundaryGeometry = (
  rawCoordinates: Coordinate[] | undefined,
  coordinateSystemHint?: string
): ParsedBoundaryGeometry => {
  const validCoordinates = (rawCoordinates ?? []).filter(isFiniteCoordinate);
  if (validCoordinates.length < 3) {
    throw new Error('No boundary geometry with at least three points was found.');
  }

  const coordinateSystem = detectCoordinateSystem(
    validCoordinates,
    coordinateSystemHint
  );
  const projectedCoordinates = projectCoordinates(
    closeLineString(validCoordinates),
    coordinateSystem
  );

  return {
    coordinateSystem,
    geometry: {
      type: 'LineString',
      coordinates: projectedCoordinates,
    },
  };
};

const collectDxfEntities = (dxfText: string) => {
  const groups = collectDxfGroups(dxfText);
  const entities: DxfEntity[] = [];
  let currentEntity: DxfEntity | undefined;

  groups.forEach((group) => {
    if (group.code === 0) {
      if (currentEntity) entities.push(currentEntity);
      currentEntity = { type: group.value.toUpperCase(), groups: [] };
      return;
    }
    currentEntity?.groups.push(group);
  });
  if (currentEntity) entities.push(currentEntity);

  return entities;
};

const collectDxfGroups = (dxfText: string) => {
  const lines = dxfText.replace(/\r/g, '').split('\n');
  const groups: DxfGroup[] = [];
  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = Number.parseInt(lines[index].trim(), 10);
    if (!Number.isFinite(code)) continue;
    groups.push({ code, value: lines[index + 1].trim() });
  }

  return groups;
};

const parseDxfLightweightPolyline = (
  groups: DxfGroup[]
): Coordinate[] => {
  const coordinates: Coordinate[] = [];
  let pendingX: number | undefined;

  groups.forEach((group) => {
    if (group.code === 10) {
      pendingX = Number.parseFloat(group.value);
    } else if (group.code === 20 && pendingX !== undefined) {
      addCoordinate(coordinates, [pendingX, Number.parseFloat(group.value)]);
      pendingX = undefined;
    }
  });

  return coordinates;
};

const getDxfCoordinate = (
  groups: DxfGroup[]
): Coordinate | undefined => {
  const x = getFirstDxfNumber(groups, 10);
  const y = getFirstDxfNumber(groups, 20);
  return x === undefined || y === undefined ? undefined : [x, y];
};

const parseDxfLine = (
  groups: DxfGroup[]
): [Coordinate, Coordinate] | undefined => {
  const startX = getFirstDxfNumber(groups, 10);
  const startY = getFirstDxfNumber(groups, 20);
  const endX = getFirstDxfNumber(groups, 11);
  const endY = getFirstDxfNumber(groups, 21);
  if (
    startX === undefined
    || startY === undefined
    || endX === undefined
    || endY === undefined
  ) {
    return undefined;
  }

  return [[startX, startY], [endX, endY]];
};

const getFirstDxfNumber = (
  groups: DxfGroup[],
  code: number
): number | undefined => {
  const value = groups.find((group) => group.code === code)?.value;
  if (value === undefined) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildLineStringFromSegments = (
  segments: [Coordinate, Coordinate][]
): Coordinate[] => {
  const remaining = [...segments];
  const firstSegment = remaining.shift();
  if (!firstSegment) return [];

  const path: Coordinate[] = [firstSegment[0], firstSegment[1]];
  let hasProgress = true;
  while (remaining.length > 0 && hasProgress) {
    hasProgress = false;
    const last = path[path.length - 1];
    const matchIndex = remaining.findIndex(([start, end]) =>
      areCoordinatesClose(start, last) || areCoordinatesClose(end, last));
    if (matchIndex < 0) continue;

    const [start, end] = remaining.splice(matchIndex, 1)[0];
    path.push(areCoordinatesClose(start, last) ? end : start);
    hasProgress = true;
  }

  if (path.length >= 3) return path;

  return segments.flatMap(([start, end]) => [start, end]);
};

const parseMultipartShpRecord = (
  bytes: Uint8Array,
  contentStart: number,
  contentEnd: number
): Coordinate[][] => {
  if (contentStart + 44 > contentEnd) return [];

  const numberOfParts = readInt32LE(bytes, contentStart + 36);
  const numberOfPoints = readInt32LE(bytes, contentStart + 40);
  if (numberOfParts <= 0 || numberOfPoints <= 0) return [];

  const partsOffset = contentStart + 44;
  const pointsOffset = partsOffset + numberOfParts * 4;
  if (pointsOffset + numberOfPoints * 16 > contentEnd) return [];

  const partStarts = Array.from({ length: numberOfParts }, (_, index) =>
    readInt32LE(bytes, partsOffset + index * 4));
  const allPoints = Array.from({ length: numberOfPoints }, (_, index): Coordinate => {
    const pointOffset = pointsOffset + index * 16;
    return [
      readFloat64LE(bytes, pointOffset),
      readFloat64LE(bytes, pointOffset + 8),
    ];
  });

  return partStarts.map((startIndex, index) => {
    const endIndex = partStarts[index + 1] ?? allPoints.length;
    return allPoints.slice(startIndex, endIndex);
  });
};

const parseShpPointRecord = (
  bytes: Uint8Array,
  contentStart: number
): Coordinate | undefined => {
  if (contentStart + 20 > bytes.length) return undefined;

  return [
    readFloat64LE(bytes, contentStart + 4),
    readFloat64LE(bytes, contentStart + 12),
  ];
};

const extractGeoJsonCoordinateSets = (geometryOrFeature: any): Coordinate[][] => {
  if (!geometryOrFeature) return [];
  if (geometryOrFeature.type === 'FeatureCollection') {
    return (geometryOrFeature.features ?? [])
      .flatMap((feature: any) => extractGeoJsonCoordinateSets(feature));
  }
  if (geometryOrFeature.type === 'Feature') {
    return extractGeoJsonCoordinateSets(geometryOrFeature.geometry);
  }
  if (geometryOrFeature.type === 'Polygon') {
    return (geometryOrFeature.coordinates ?? [])
      .map((ring: number[][]) => ring.map(toCoordinate));
  }
  if (geometryOrFeature.type === 'MultiPolygon') {
    return (geometryOrFeature.coordinates ?? [])
      .flatMap((polygon: number[][][]) => polygon.map((ring) =>
        ring.map(toCoordinate)));
  }
  if (geometryOrFeature.type === 'LineString') {
    return [(geometryOrFeature.coordinates ?? []).map(toCoordinate)];
  }
  if (geometryOrFeature.type === 'MultiLineString') {
    return (geometryOrFeature.coordinates ?? [])
      .map((lineString: number[][]) => lineString.map(toCoordinate));
  }

  return [];
};

const toCoordinate = (coordinate: number[]): Coordinate => [
  coordinate[0],
  coordinate[1],
];

const selectBestCoordinateSet = (
  candidates: Coordinate[][]
): Coordinate[] | undefined => {
  return candidates
    .map((coordinates) => coordinates.filter(isFiniteCoordinate))
    .filter((coordinates) => coordinates.length >= 3)
    .sort((left, right) =>
      getCoordinateSetScore(right) - getCoordinateSetScore(left))[0];
};

const getCoordinateSetScore = (coordinates: Coordinate[]): number => {
  const openCoordinates = getOpenLineStringCoordinates(coordinates);
  const area = Math.abs(getSignedArea(openCoordinates));
  if (area > 0) return area;

  return getLineLength(openCoordinates);
};

const getSignedArea = (coordinates: Coordinate[]): number => {
  if (coordinates.length < 3) return 0;
  return coordinates.reduce((sum, coordinate, index) => {
    const nextCoordinate = coordinates[(index + 1) % coordinates.length];
    return sum
      + coordinate[0] * nextCoordinate[1]
      - nextCoordinate[0] * coordinate[1];
  }, 0) / 2;
};

const getLineLength = (coordinates: Coordinate[]): number => {
  return coordinates.reduce((sum, coordinate, index) => {
    if (index === 0) return sum;
    const previous = coordinates[index - 1];
    return sum + Math.hypot(
      coordinate[0] - previous[0],
      coordinate[1] - previous[1]
    );
  }, 0);
};

const addCandidate = (
  candidates: Coordinate[][],
  coordinates: Coordinate[] | undefined
) => {
  if (coordinates && coordinates.filter(isFiniteCoordinate).length >= 3) {
    candidates.push(coordinates);
  }
};

const addCoordinate = (
  coordinates: Coordinate[],
  coordinate: Coordinate | undefined
) => {
  if (coordinate && isFiniteCoordinate(coordinate)) coordinates.push(coordinate);
};

const detectCoordinateSystem = (
  coordinates: Coordinate[],
  coordinateSystemHint?: string
): string => {
  if (coordinateSystemHint && SUPPORTED_CRS.has(coordinateSystemHint)) {
    return coordinateSystemHint;
  }
  if (coordinates.every(([x, y]) =>
    Math.abs(x) <= 180 && Math.abs(y) <= 90)) {
    return WGS84;
  }

  const center = getCoordinateCenter(coordinates);
  if (
    center.x >= 700000
    && center.x <= 1300000
    && center.y >= 1200000
    && center.y <= 2800000
  ) {
    return KOREA_UNIFIED;
  }
  if (
    center.x >= 100000
    && center.x <= 400000
    && center.y >= 300000
    && center.y <= 900000
  ) {
    return KOREA_CENTRAL_2010;
  }

  return WEB_MERCATOR;
};

const detectCoordinateSystemFromPrj = (prjText: string): string | undefined => {
  const epsgCode = /AUTHORITY\s*\[\s*"EPSG"\s*,\s*"(\d+)"/i.exec(prjText)?.[1]
    ?? /EPSG[\s:"]+(\d+)/i.exec(prjText)?.[1];
  if (epsgCode && SUPPORTED_CRS.has(`EPSG:${epsgCode}`)) {
    return `EPSG:${epsgCode}`;
  }

  const normalizedText = prjText.toLowerCase();
  if (normalizedText.includes('korea_unified')) return KOREA_UNIFIED;
  if (normalizedText.includes('central_belt_2010')) return KOREA_CENTRAL_2010;
  if (normalizedText.includes('west_belt_2010')) return KOREA_WEST_2010;
  if (normalizedText.includes('east_belt_2010')) return KOREA_EAST_2010;
  if (normalizedText.includes('central_belt')) return KOREA_CENTRAL_2000;
  if (normalizedText.includes('wgs_1984')) return WGS84;
  if (normalizedText.includes('wgs 84')) return WGS84;

  return undefined;
};

const projectCoordinates = (
  coordinates: Coordinate[],
  coordinateSystem: string
): number[][] => {
  if (coordinateSystem === WEB_MERCATOR) return coordinates;

  ensureProj4Definitions();
  return coordinates.map(([x, y]) => {
    const projected = proj4(coordinateSystem, WEB_MERCATOR, { x, y });
    return [projected.x, projected.y];
  });
};

const ensureProj4Definitions = () => {
  if (hasRegisteredProj4Definitions) return;

  proj4.defs(
    WGS84,
    '+proj=longlat +datum=WGS84 +no_defs +type=crs'
  );
  proj4.defs(
    WEB_MERCATOR,
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 '
      + '+x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null '
      + '+wktext +no_defs'
  );
  proj4.defs(
    KOREA_UNIFIED,
    '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 '
      + '+x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'
  );
  proj4.defs(
    KOREA_CENTRAL_2000,
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 '
      + '+x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs'
  );
  proj4.defs(
    KOREA_WEST_2010,
    '+proj=tmerc +lat_0=38 +lon_0=125 +k=1 '
      + '+x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
  );
  proj4.defs(
    KOREA_CENTRAL_2010,
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 '
      + '+x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
  );
  proj4.defs(
    KOREA_EAST_2010,
    '+proj=tmerc +lat_0=38 +lon_0=129 +k=1 '
      + '+x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
  );

  hasRegisteredProj4Definitions = true;
};

const getGeometryCenter = (
  geometry: SurveyBoundaryGeometry
): MapLocation | undefined => {
  const openCoordinates = getOpenLineStringCoordinates(
    geometry.coordinates as Coordinate[]
  );
  if (openCoordinates.length === 0) return undefined;

  return getCoordinateCenter(openCoordinates);
};

const getCoordinateCenter = (coordinates: Coordinate[]): MapLocation => ({
  x: coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0)
    / coordinates.length,
  y: coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0)
    / coordinates.length,
});

const closeLineString = (coordinates: Coordinate[]): Coordinate[] => {
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (!firstCoordinate || !lastCoordinate) return coordinates;
  if (areCoordinatesClose(firstCoordinate, lastCoordinate, 0)) return coordinates;

  return [...coordinates, [firstCoordinate[0], firstCoordinate[1]]];
};

const getOpenLineStringCoordinates = (
  coordinates: Coordinate[]
): Coordinate[] => {
  if (coordinates.length < 2) return coordinates;
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  return areCoordinatesClose(firstCoordinate, lastCoordinate, 0)
    ? coordinates.slice(0, -1)
    : coordinates;
};

const areCoordinatesClose = (
  left: Coordinate,
  right: Coordinate,
  tolerance = DXF_LINE_CONNECT_TOLERANCE
): boolean => {
  return Math.abs(left[0] - right[0]) <= tolerance
    && Math.abs(left[1] - right[1]) <= tolerance;
};

const isFiniteCoordinate = (
  coordinate: Coordinate
): coordinate is Coordinate => {
  return Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]);
};

const isMultipartShapeType = (shapeType: number): boolean =>
  [3, 5, 13, 15, 23, 25].includes(shapeType);

const isPointShapeType = (shapeType: number): boolean =>
  [1, 11, 21].includes(shapeType);

const readInt32BE = (bytes: Uint8Array, offset: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getInt32(offset, false);

const readInt32LE = (bytes: Uint8Array, offset: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getInt32(offset, true);

const readFloat64LE = (bytes: Uint8Array, offset: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getFloat64(offset, true);

const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleanBase64 = base64.replace(/\s/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < cleanBase64.length; index += 4) {
    const chunk = cleanBase64.slice(index, index + 4);
    if (chunk.length < 2) continue;

    const first = decodeBase64Character(chunk[0]);
    const second = decodeBase64Character(chunk[1]);
    const third = chunk[2] === '=' || chunk[2] === undefined
      ? 0
      : decodeBase64Character(chunk[2]);
    const fourth = chunk[3] === '=' || chunk[3] === undefined
      ? 0
      : decodeBase64Character(chunk[3]);

    bytes.push((first << 2) | (second >> 4));
    if (chunk[2] !== '=' && chunk[2] !== undefined) {
      bytes.push(((second & 15) << 4) | (third >> 2));
    }
    if (chunk[3] !== '=' && chunk[3] !== undefined) {
      bytes.push(((third & 3) << 6) | fourth);
    }
  }

  return new Uint8Array(bytes);
};

const decodeBase64Character = (character: string): number => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const value = alphabet.indexOf(character);
  if (value < 0) throw new Error('The SHP file is not valid base64 data.');

  return value;
};
