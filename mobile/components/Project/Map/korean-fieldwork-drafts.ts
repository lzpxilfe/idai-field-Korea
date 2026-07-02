import {
  Document,
  KOREAN_FIELDWORK_FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
  KOREAN_FIELDWORK_FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
  KOREAN_FIELDWORK_FEATURE_RECORDING_STATUS_CANDIDATE,
  KOREAN_FIELDWORK_GEOMETRY_CONFIDENCE_ROUGH,
  KOREAN_FIELDWORK_GEOMETRY_SOURCE_GPS_APPROXIMATE,
  KOREAN_FIELDWORK_GPS_DRAFT_BOUNDARY_HALF_SIZE_METERS,
  KOREAN_FIELDWORK_LAYER_SEQUENCE_MEANING_DEFAULT,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_DEFAULT,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_IMPORTED_VECTOR_LAYER,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS,
  KOREAN_FIELDWORK_SOIL_COLOR_ASSIST_STATUS_DEFAULT,
  KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
  KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_APPROXIMATE_GPS,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_IMPORTED_REFERENCE,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DEFAULT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DXF_IMPORT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_GPS_WALKOVER,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_GEOJSON_IMPORT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_SHP_IMPORT,
  KOREAN_FIELDWORK_SURVEY_BOUNDARY_TYPE_DEFAULT,
  NewDocument,
} from 'idai-field-core';
import proj4 from 'proj4';
import { KOREAN_FIELDWORK_CATEGORIES } from '../korean-fieldwork-categories';
import {
  getKoreanFieldworkFeatureInterpretationTypeValue,
  getKoreanFieldworkFeatureTypeOption,
} from '../korean-fieldwork-feature-types';
import { type KoreanFieldworkInvestigationModeId } from '../korean-fieldwork-investigation-mode';

export const LAYER_SEQUENCE_MEANING_DEFAULT = KOREAN_FIELDWORK_LAYER_SEQUENCE_MEANING_DEFAULT;
export const SOIL_COLOR_ASSIST_STATUS_DEFAULT = KOREAN_FIELDWORK_SOIL_COLOR_ASSIST_STATUS_DEFAULT;
export const SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT = KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT;
export const SOIL_PROFILE_PHOTO_QUALITY_DEFAULT = KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_QUALITY_DEFAULT;
export const SURVEY_BOUNDARY_TYPE_DEFAULT = KOREAN_FIELDWORK_SURVEY_BOUNDARY_TYPE_DEFAULT;
export const SURVEY_BOUNDARY_SOURCE_DEFAULT = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DEFAULT;
export const SURVEY_BOUNDARY_SOURCE_GPS_WALKOVER = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_GPS_WALKOVER;
export const SURVEY_BOUNDARY_SOURCE_DXF_IMPORT = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_DXF_IMPORT;
export const SURVEY_BOUNDARY_SOURCE_GEOJSON_IMPORT = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_GEOJSON_IMPORT;
export const SURVEY_BOUNDARY_SOURCE_SHP_IMPORT = KOREAN_FIELDWORK_SURVEY_BOUNDARY_SOURCE_SHP_IMPORT;
export const SURVEY_BOUNDARY_ACCURACY_DEFAULT = KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_DEFAULT;
export const SURVEY_BOUNDARY_ACCURACY_APPROXIMATE_GPS = KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_APPROXIMATE_GPS;
export const SURVEY_BOUNDARY_ACCURACY_IMPORTED_REFERENCE = KOREAN_FIELDWORK_SURVEY_BOUNDARY_ACCURACY_IMPORTED_REFERENCE;
export const REFERENCE_BASEMAP_PROVIDER_DEFAULT = KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_DEFAULT;
export const REFERENCE_BASEMAP_PROVIDER_IMPORTED_VECTOR_LAYER = KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_IMPORTED_VECTOR_LAYER;
export const REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS = KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS;
export const REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP = 'kakaoRoadmap';
export const REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW = 'kakaoSkyview';
export const REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID = 'kakaoHybrid';
export const FEATURE_RECORDING_STATUS_CANDIDATE = KOREAN_FIELDWORK_FEATURE_RECORDING_STATUS_CANDIDATE;
export const GEOMETRY_SOURCE_GPS_APPROXIMATE = KOREAN_FIELDWORK_GEOMETRY_SOURCE_GPS_APPROXIMATE;
export const GEOMETRY_CONFIDENCE_ROUGH = KOREAN_FIELDWORK_GEOMETRY_CONFIDENCE_ROUGH;
export const FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH = KOREAN_FIELDWORK_FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH;
export const FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT = KOREAN_FIELDWORK_FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT;
export const GPS_DRAFT_BOUNDARY_HALF_SIZE_METERS = KOREAN_FIELDWORK_GPS_DRAFT_BOUNDARY_HALF_SIZE_METERS;

export type MapLocation = { x: number; y: number };
export type Wgs84MapLocation = { latitude: number; longitude: number };

export interface SurveyBoundaryDraftOptions {
  boundaryAccuracy?: string;
  boundarySource?: string;
  geometry?: SurveyBoundaryGeometry;
  referenceBasemapProvider?: string;
}

export interface SurveyBoundaryGeometry {
  type: 'LineString';
  coordinates: number[][];
}

proj4.defs(
  'WGS84',
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
);
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs(
  'EPSG:3857',
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs'
);

interface OperationDraftOptions {
  legacyRootDocumentCount?: number;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  boundarySummary?: string;
  existingOperationIdentifiers?: readonly string[];
  projectId?: string;
}

export const createOperationDraft = (
  options: OperationDraftOptions = {}
): NewDocument => {
  const legacyRootDocumentCount = options.legacyRootDocumentCount ?? 0;
  const normalizedBoundarySummary = options.boundarySummary?.trim();
  const shortDescription = getOperationDraftShortDescription(
    legacyRootDocumentCount,
    normalizedBoundarySummary
  );

  return {
    resource: {
      identifier: createOperationDraftIdentifier(
        options.projectId,
        options.existingOperationIdentifiers
      ),
      category: KOREAN_FIELDWORK_CATEGORIES.OPERATION,
      relations: {},
      ...(options.investigationModeId ? {
        projectInvestigationMode: options.investigationModeId,
      } : {}),
      ...(normalizedBoundarySummary ? {
        projectBoundarySetupState: 'draftBoundary',
        projectBoundarySummary: normalizedBoundarySummary,
      } : {}),
      ...(shortDescription ? { shortDescription } : {}),
    },
  };
};

const getOperationDraftShortDescription = (
  legacyRootDocumentCount: number,
  boundarySummary?: string
): string | undefined => {
  if (boundarySummary && legacyRootDocumentCount > 0) {
    return `${boundarySummary} · 기존 기록 ${legacyRootDocumentCount}건 유지`;
  }

  if (boundarySummary) return boundarySummary;

  if (legacyRootDocumentCount > 0) {
    return `기존 기록 ${legacyRootDocumentCount}건을 유지하고 새 조사 경계 기준을 만들었습니다.`;
  }

  return undefined;
};

const createOperationDraftIdentifier = (
  projectId?: string,
  existingOperationIdentifiers: readonly string[] = []
): string => {
  const baseIdentifier = createProjectScopedIdentifier(projectId, '조사구역');
  const existingIdentifierSet = new Set(existingOperationIdentifiers);
  if (!existingIdentifierSet.has(baseIdentifier)) return baseIdentifier;

  let sequenceNumber = 2;
  while (existingIdentifierSet.has(`${baseIdentifier}-${sequenceNumber}`)) {
    sequenceNumber += 1;
  }

  return `${baseIdentifier}-${sequenceNumber}`;
};

const createProjectScopedIdentifier = (
  projectId: string | undefined,
  suffix: string
): string => {
  const projectIdentifier = createProjectIdentifierPrefix(projectId);

  return projectIdentifier ? `${projectIdentifier}-${suffix}` : suffix;
};

const createProjectIdentifierPrefix = (projectId?: string): string | undefined => {
  const normalizedProjectId = projectId
    ?.trim()
    .replace(/[\s.]+/g, '-')
    .replace(/[^0-9A-Za-z가-힣_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 40);

  return normalizedProjectId || undefined;
};

export const createDepictsRelation = (targetDoc: Document): { depicts: string[] } => ({
  depicts: [targetDoc.resource.id],
});

export const createKoreanFieldworkChildRelations = (
  parentDoc: Document
): { [relationName: string]: string[] } => {
  const parentRelations = parentDoc.resource.relations ?? {};

  if (!parentRelations.isRecordedIn) return { isRecordedIn: [parentDoc.resource.id] };

  return {
    isRecordedIn: [parentRelations.isRecordedIn[0]],
    liesWithin: [parentDoc.resource.id],
  };
};

export const createSoilProfilePhotoDraft = (targetDoc: Document): NewDocument => ({
  resource: {
    identifier: `soil-profile-photo-${Date.now()}`,
    category: KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO,
    relations: createDepictsRelation(targetDoc),
    soilProfileAnnotationStrokes: '[]',
    soilProfilePhotoAnnotationStrokes: '[]',
    soilProfileLayerMarkers: '[]',
    soilProfileLayerIds: '[]',
    soilProfileColorSwatches: '',
    soilColorAssistCandidates: '',
    soilColorAssistStatus: SOIL_COLOR_ASSIST_STATUS_DEFAULT,
    soilProfilePhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
    soilProfilePhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
    layerSequenceMeaning: LAYER_SEQUENCE_MEANING_DEFAULT,
  },
});

export const createLayerDraft = (
  parentDoc: Document,
  sequenceNumber: number
): NewDocument => ({
  resource: {
    identifier: `layer-${Date.now()}-${sequenceNumber}`,
    category: KOREAN_FIELDWORK_CATEGORIES.LAYER,
    relations: createKoreanFieldworkChildRelations(parentDoc),
    layerSequenceNumber: sequenceNumber,
    layerSequenceMeaning: LAYER_SEQUENCE_MEANING_DEFAULT,
    soilColorAssistStatus: SOIL_COLOR_ASSIST_STATUS_DEFAULT,
  },
});

export const createFeatureCandidateDraft = (
  parentDoc: Document,
  location: MapLocation,
  featureType = 'unknown'
): NewDocument => {
  const featureTypeOption = getKoreanFieldworkFeatureTypeOption(featureType);
  const featureInterpretationTypeValue =
    getKoreanFieldworkFeatureInterpretationTypeValue(featureTypeOption?.value);

  return {
    resource: {
      identifier: `${featureTypeOption?.identifierPrefix ?? 'feature-candidate'}-${Date.now()}`,
      category: KOREAN_FIELDWORK_CATEGORIES.FEATURE,
      relations: createKoreanFieldworkChildRelations(parentDoc),
      geometry: {
        type: 'Point',
        coordinates: [location.x, location.y],
      },
      ...(featureTypeOption ? { featureType: featureTypeOption.value } : {}),
      ...(featureInterpretationTypeValue
        ? { featureInterpretationType: [featureInterpretationTypeValue] }
        : {}),
      featureRecordingStatus: FEATURE_RECORDING_STATUS_CANDIDATE,
      geometrySource: GEOMETRY_SOURCE_GPS_APPROXIMATE,
      geometryConfidence: GEOMETRY_CONFIDENCE_ROUGH,
      featureGeometryEditStatus: FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
      featureGeometryRevisionHistory: FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
      featureInvestigationChecklist: [],
      featureSoilProfilePhotoCount: 0,
    },
  };
};

export const createSurveyBoundaryDraft = (
  parentDoc: Document,
  location?: MapLocation,
  boundarySummary?: string,
  options: SurveyBoundaryDraftOptions = {}
): NewDocument => {
  const normalizedBoundarySummary = boundarySummary?.trim();
  const geometry = options.geometry
    ?? (location ? createGpsDraftBoundaryGeometry(location) : undefined);

  return {
    resource: {
      identifier: `survey-boundary-${Date.now()}`,
      category: KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY,
      relations: createKoreanFieldworkChildRelations(parentDoc),
      ...(geometry ? {
        geometry,
      } : {}),
      ...(normalizedBoundarySummary ? {
        shortDescription: normalizedBoundarySummary,
        surveyBoundaryNote: normalizedBoundarySummary,
      } : {}),
      surveyBoundaryType: SURVEY_BOUNDARY_TYPE_DEFAULT,
      surveyBoundarySource: options.boundarySource ?? (location
        ? SURVEY_BOUNDARY_SOURCE_GPS_WALKOVER
        : SURVEY_BOUNDARY_SOURCE_DEFAULT),
      surveyBoundaryAccuracy: options.boundaryAccuracy ?? (location
        ? SURVEY_BOUNDARY_ACCURACY_APPROXIMATE_GPS
        : SURVEY_BOUNDARY_ACCURACY_DEFAULT),
      referenceBasemapProvider: options.referenceBasemapProvider
        ?? REFERENCE_BASEMAP_PROVIDER_DEFAULT,
    },
  };
};

export const createGpsDraftBoundaryGeometry = (
  location: MapLocation,
  halfSize = GPS_DRAFT_BOUNDARY_HALF_SIZE_METERS
) => ({
  type: 'LineString' as const,
  coordinates: [
    [location.x - halfSize, location.y - halfSize],
    [location.x + halfSize, location.y - halfSize],
    [location.x + halfSize, location.y + halfSize],
    [location.x - halfSize, location.y + halfSize],
    [location.x - halfSize, location.y - halfSize],
  ],
});

export const projectWgs84ToMapLocation = (
  location: Wgs84MapLocation
): MapLocation | undefined => {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return undefined;
  }

  const projected = proj4('EPSG:4326', 'EPSG:3857', {
    x: location.longitude,
    y: location.latitude,
  });
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    return undefined;
  }

  return projected;
};

export const projectMapLocationToWgs84 = (
  location: MapLocation
): Wgs84MapLocation | undefined => {
  if (!Number.isFinite(location.x) || !Number.isFinite(location.y)) {
    return undefined;
  }

  const projected = proj4('EPSG:3857', 'EPSG:4326', location);
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    return undefined;
  }

  return {
    latitude: projected.y,
    longitude: projected.x,
  };
};

export const projectMapCoordinateToWgs84 = (
  coordinate: number[]
): Wgs84MapLocation | undefined => {
  if (
    coordinate.length < 2
    || !Number.isFinite(coordinate[0])
    || !Number.isFinite(coordinate[1])
  ) {
    return undefined;
  }

  return projectMapLocationToWgs84({
    x: coordinate[0],
    y: coordinate[1],
  });
};

export const projectWgs84BoundaryToSurveyBoundaryGeometry = (
  coordinates: Wgs84MapLocation[]
): SurveyBoundaryGeometry | undefined => {
  const projectedCoordinates = coordinates
    .map(projectWgs84ToMapLocation)
    .filter(isMapLocation);

  if (projectedCoordinates.length < 3) return undefined;

  return {
    type: 'LineString',
    coordinates: closeLineString(
      projectedCoordinates.map((location) => [location.x, location.y])
    ),
  };
};

export const getBoundaryGeometryCenter = (
  geometry: SurveyBoundaryGeometry
): MapLocation | undefined => {
  const openCoordinates = getOpenLineStringCoordinates(geometry.coordinates);
  if (openCoordinates.length === 0) return undefined;

  return {
    x: openCoordinates.reduce((sum, coordinate) => sum + coordinate[0], 0)
      / openCoordinates.length,
    y: openCoordinates.reduce((sum, coordinate) => sum + coordinate[1], 0)
      / openCoordinates.length,
  };
};

export const getWgs84BoundaryCenter = (
  coordinates: Wgs84MapLocation[]
): Wgs84MapLocation | undefined => {
  if (coordinates.length === 0) return undefined;

  return {
    latitude: coordinates.reduce((sum, coordinate) => sum + coordinate.latitude, 0)
      / coordinates.length,
    longitude: coordinates.reduce((sum, coordinate) => sum + coordinate.longitude, 0)
      / coordinates.length,
  };
};

const closeLineString = (coordinates: number[][]): number[][] => {
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (!firstCoordinate || !lastCoordinate) return coordinates;
  if (
    firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
  ) {
    return coordinates;
  }

  return [...coordinates, [firstCoordinate[0], firstCoordinate[1]]];
};

const getOpenLineStringCoordinates = (coordinates: number[][]): number[][] => {
  if (coordinates.length < 2) return coordinates;
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];

  return firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
    ? coordinates.slice(0, -1)
    : coordinates;
};

const isMapLocation = (
  location: MapLocation | undefined
): location is MapLocation => location !== undefined;
