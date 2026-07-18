import { Document } from 'idai-field-core';

import {
  getKoreanFieldworkBoundaryMapTypeIdFromProvider,
  getKoreanFieldworkProjectBoundaryDraftFromSurveyBoundaries,
} from './korean-fieldwork-project-boundary';

describe('Korean fieldwork project boundary restoration', () => {
  it('reconstructs a boundary draft from a synced SurveyBoundary', () => {
    const draft = getKoreanFieldworkProjectBoundaryDraftFromSurveyBoundaries([
      createDocument('feature-1', 'Feature', {
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
      }),
      createDocument('boundary-invalid', 'SurveyBoundary', {
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      }),
      createDocument('boundary-1', 'SurveyBoundary', {
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [111319.49079327357, 0],
            [111319.49079327357, 111325.1428663851],
            [0, 0],
          ],
        },
        referenceBasemapProvider: 'kakaoHybrid',
      }),
    ]);

    expect(draft?.coordinates).toHaveLength(3);
    expect(draft?.coordinates[0]).toEqual({ latitude: 0, longitude: 0 });
    expect(draft?.coordinates[1].longitude).toBeCloseTo(1, 6);
    expect(draft?.coordinates[1].latitude).toBeCloseTo(0, 6);
    expect(draft?.coordinates[2].longitude).toBeCloseTo(1, 6);
    expect(draft?.coordinates[2].latitude).toBeCloseTo(1, 6);
    expect(draft?.center?.longitude).toBeCloseTo(2 / 3, 6);
    expect(draft?.center?.latitude).toBeCloseTo(1 / 3, 6);
    expect(draft?.mapTypeId).toBe('HYBRID');
  });

  it.each([
    ['kakaoRoadmap', 'ROADMAP'],
    ['googleRoadmap', 'ROADMAP'],
    ['kakaoSkyview', 'SKYVIEW'],
    ['googleSatellite', 'SKYVIEW'],
    ['kakaoHybrid', 'HYBRID'],
    ['googleHybrid', 'HYBRID'],
    ['plainCanvas', 'BLANK'],
    ['none', undefined],
    ['importedVectorLayer', undefined],
  ] as const)(
    'maps the %s reference basemap provider to %s',
    (provider, expectedMapTypeId) => {
      expect(getKoreanFieldworkBoundaryMapTypeIdFromProvider(provider))
        .toBe(expectedMapTypeId);
    }
  );

  it('returns undefined when no synced SurveyBoundary has a usable polygon', () => {
    expect(getKoreanFieldworkProjectBoundaryDraftFromSurveyBoundaries([
      createDocument('boundary-1', 'SurveyBoundary', {
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
      }),
    ])).toBeUndefined();
  });
});

const createDocument = (
  id: string,
  category: string,
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
    ...extraResource,
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
