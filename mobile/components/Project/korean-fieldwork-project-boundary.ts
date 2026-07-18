import {
  Document,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_GOOGLE_HYBRID,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_GOOGLE_SATELLITE,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW,
  KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS,
} from 'idai-field-core';

import {
  KoreanFieldworkBoundaryMapTypeId,
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';
import { projectMapCoordinateToWgs84 } from './Map/korean-fieldwork-drafts';

export const getKoreanFieldworkProjectBoundaryDraftFromSurveyBoundaries = (
  surveyBoundaries: readonly Document[]
): KoreanFieldworkProjectBoundaryDraft | undefined => {
  for (const surveyBoundary of surveyBoundaries) {
    if (surveyBoundary.resource.category !== 'SurveyBoundary') continue;

    const coordinates = getWgs84CoordinatesFromSurveyBoundary(surveyBoundary);
    if (coordinates.length < 3) continue;

    const mapTypeId = getKoreanFieldworkBoundaryMapTypeIdFromProvider(
      surveyBoundary.resource.referenceBasemapProvider
    );

    return {
      center: getBoundaryDraftCenter(coordinates),
      coordinates,
      ...(mapTypeId ? { mapTypeId } : {}),
    };
  }

  return undefined;
};

export const getKoreanFieldworkBoundaryMapTypeIdFromProvider = (
  referenceBasemapProvider: unknown
): KoreanFieldworkBoundaryMapTypeId | undefined => {
  switch (referenceBasemapProvider) {
    case KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_KAKAO_ROADMAP:
    case 'googleRoadmap':
      return 'ROADMAP';
    case KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_KAKAO_SKYVIEW:
    case KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_GOOGLE_SATELLITE:
      return 'SKYVIEW';
    case KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID:
    case KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_GOOGLE_HYBRID:
      return 'HYBRID';
    case KOREAN_FIELDWORK_REFERENCE_BASEMAP_PROVIDER_PLAIN_CANVAS:
      return 'BLANK';
    default:
      return undefined;
  }
};

const getWgs84CoordinatesFromSurveyBoundary = (
  surveyBoundary: Document
): KoreanFieldworkProjectBoundaryDraft['coordinates'] => {
  const geometry = (surveyBoundary.resource as Record<string, unknown>).geometry;
  if (!isLineStringGeometry(geometry)) return [];

  return getOpenLineStringCoordinates(geometry.coordinates)
    .map(projectMapCoordinateToWgs84)
    .filter((location): location is KoreanFieldworkProjectBoundaryDraft['coordinates'][number] =>
      location !== undefined
    );
};

const isLineStringGeometry = (
  geometry: unknown
): geometry is { coordinates: number[][]; type: 'LineString' } => {
  if (typeof geometry !== 'object' || geometry === null) return false;

  const candidate = geometry as Record<string, unknown>;

  return candidate.type === 'LineString'
    && Array.isArray(candidate.coordinates)
    && candidate.coordinates.every((coordinate) =>
      Array.isArray(coordinate)
      && coordinate.length >= 2
      && typeof coordinate[0] === 'number'
      && Number.isFinite(coordinate[0])
      && typeof coordinate[1] === 'number'
      && Number.isFinite(coordinate[1])
    );
};

const getOpenLineStringCoordinates = (coordinates: number[][]): number[][] => {
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (!firstCoordinate || !lastCoordinate) return coordinates;

  return firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
    ? coordinates.slice(0, -1)
    : coordinates;
};

const getBoundaryDraftCenter = (
  coordinates: KoreanFieldworkProjectBoundaryDraft['coordinates']
): KoreanFieldworkProjectBoundaryDraft['center'] => ({
  latitude: coordinates.reduce((sum, coordinate) =>
    sum + coordinate.latitude, 0) / coordinates.length,
  longitude: coordinates.reduce((sum, coordinate) =>
    sum + coordinate.longitude, 0) / coordinates.length,
});
