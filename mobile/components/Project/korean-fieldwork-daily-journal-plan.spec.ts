import type { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  getKoreanFieldworkDailyJournalFeatureOverlays,
} from './korean-fieldwork-daily-journal-plan';

const C = KOREAN_FIELDWORK_CATEGORIES;
const SELECTED_DATE = new Date(2026, 5, 20, 12);

describe('getKoreanFieldworkDailyJournalFeatureOverlays', () => {
  it('includes features added on or before the selected date', () => {
    const overlays = getKoreanFieldworkDailyJournalFeatureOverlays([
      createFeature('resource-before', {
        fieldworkDate: '2026-06-19',
        featureLocationSketch: pointSketch(10, 10),
      }, new Date(2026, 6, 1)),
      createFeature('resource-same-day', {
        workDate: '2026-06-20',
        featureLocationSketch: pointSketch(20, 20),
      }, new Date(2026, 6, 1)),
      createFeature('resource-after', {
        featureDiscoveryDate: '2026-06-21',
        featureLocationSketch: pointSketch(30, 30),
      }, new Date(2026, 5, 1)),
      createFeature('created-before', {
        featureLocationSketch: pointSketch(40, 40),
      }, new Date(2026, 5, 18, 23, 59)),
      createFeature('created-after', {
        featureLocationSketch: pointSketch(50, 50),
      }, new Date(2026, 5, 21, 0, 1)),
      createFeature('invalid-resource-date', {
        fieldworkDate: '2026-02-31',
        featureLocationSketch: pointSketch(60, 60),
      }, new Date(2026, 5, 19)),
      createFeature('generic-date-is-not-discovery-date', {
        date: '2026-01-01',
        featureLocationSketch: pointSketch(65, 65),
      }, new Date(2026, 5, 21)),
      createDocument(C.PHOTO, 'not-a-feature', {
        date: '2026-06-10',
        featureLocationSketch: pointSketch(70, 70),
      }, new Date(2026, 5, 10)),
    ], SELECTED_DATE);

    expect(overlays.map(({ id }) => id)).toEqual([
      'resource-before',
      'resource-same-day',
      'created-before',
      'invalid-resource-date',
    ]);
  });

  it('keeps undated features as the baseline for every valid journal date', () => {
    const undated = createFeature('baseline', {
      featureLocationSketch: pointSketch(25, 75),
    });

    expect(getKoreanFieldworkDailyJournalFeatureOverlays(
      [undated],
      new Date(1990, 0, 1)
    )).toEqual([
      expect.objectContaining({
        center: { x: 2083, y: 7917 },
        id: 'baseline',
      }),
    ]);
  });

  it('preserves point and polygon positions in the drawing coordinate space', () => {
    const overlays = getKoreanFieldworkDailyJournalFeatureOverlays([
      createFeature('point', {
        featureLocationSketch: pointSketch(12.34, 56.78),
      }),
      createFeature('polygon', {
        featureLocationSketch: JSON.stringify({
          center: { x: 30, y: 40 },
          isClosed: true,
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 20 },
            { x: 20, y: 50 },
          ],
          shape: 'polygon',
        }),
      }),
      createFeature('open-polygon', {
        featureLocationSketch: {
          center: { x: 60, y: 60 },
          isClosed: false,
          points: [
            { x: 50, y: 50 },
            { x: 70, y: 70 },
          ],
          shape: 'polygon',
        },
      }),
    ], SELECTED_DATE);

    expect(overlays[0]).toMatchObject({
      center: { x: 606, y: 5791 },
      guidePaths: [{
        closed: false,
        points: [{ x: 606, y: 5791 }],
        strokeColor: '#0f766e',
      }],
    });
    expect(overlays[1]).toMatchObject({
      center: { x: 2667, y: 3833 },
      guidePaths: [{
        closed: true,
        points: [
          { x: 333, y: 1500 },
          { x: 2667, y: 1500 },
          { x: 1500, y: 5000 },
        ],
        fillColor: 'rgba(15,118,110,0.12)',
      }],
    });
    expect(overlays[2].guidePaths[0]).toMatchObject({
      closed: false,
      points: [
        { x: 5000, y: 5000 },
        { x: 7333, y: 7333 },
      ],
    });
  });

  it('aligns the feature-sketch boundary padding with the journal plan', () => {
    const [overlay] = getKoreanFieldworkDailyJournalFeatureOverlays([
      createFeature('boundary-corner', {
        featureLocationSketch: pointSketch(14, 86),
      }),
    ], SELECTED_DATE);

    expect(overlay.center).toEqual({ x: 800, y: 9200 });
    expect(overlay.guidePaths[0].points).toEqual([{ x: 800, y: 9200 }]);
  });

  it('reprojects a saved feature position when the project boundary changed', () => {
    const sourceBoundary = {
      coordinates: [
        { latitude: 38, longitude: 127 },
        { latitude: 38, longitude: 128 },
        { latitude: 37, longitude: 128 },
        { latitude: 37, longitude: 127 },
      ],
    };
    const targetBoundary = {
      coordinates: [
        { latitude: 39, longitude: 127 },
        { latitude: 39, longitude: 129 },
        { latitude: 37, longitude: 129 },
        { latitude: 37, longitude: 127 },
      ],
    };
    const [overlay] = getKoreanFieldworkDailyJournalFeatureOverlays([
      createFeature('boundary-reprojected', {
        featureLocationSketch: JSON.stringify({
          center: { x: 50, y: 50 },
          points: [{ x: 50, y: 50 }],
          projectBoundarySnapshot: sourceBoundary,
          shape: 'point',
        }),
      }),
    ], SELECTED_DATE, targetBoundary);

    expect(overlay.center).toEqual({ x: 2900, y: 7100 });
    expect(overlay.guidePaths[0].points).toEqual([{ x: 2900, y: 7100 }]);
  });

  it('builds rectangle, circle, and rotated oval outlines around their centers', () => {
    const overlays = getKoreanFieldworkDailyJournalFeatureOverlays([
      createFeature('rectangle', {
        featureLocationSketch: shapeSketch('rectangle', 50, 50),
      }),
      createFeature('circle', {
        featureLocationSketch: shapeSketch('circle', 50, 50),
      }),
      createFeature('oval', {
        featureLocationSketch: shapeSketch('oval', 50, 50, 90),
      }),
    ], SELECTED_DATE);

    expect(overlays[0].guidePaths[0]).toMatchObject({
      closed: true,
      points: [
        { x: 3950, y: 4300 },
        { x: 6050, y: 4300 },
        { x: 6050, y: 5700 },
        { x: 3950, y: 5700 },
      ],
    });
    expect(overlays[1].guidePaths[0].points).toHaveLength(16);
    expect(overlays[1].guidePaths[0].points[0]).toEqual({
      x: 6050,
      y: 5000,
    });
    expect(overlays[2].guidePaths[0].points).toHaveLength(16);
    expect(overlays[2].guidePaths[0].points[0]).toEqual({
      x: 5000,
      y: 6050,
    });
    expect(overlays[2].guidePaths[0].points[4]).toEqual({
      x: 4300,
      y: 5000,
    });
  });

  it('projects Point geometry into the boundary plan when no sketch exists', () => {
    const boundaryDraft = {
      coordinates: [
        { latitude: 37, longitude: 127 },
        { latitude: 37, longitude: 127.2 },
        { latitude: 37.2, longitude: 127.2 },
        { latitude: 37.2, longitude: 127 },
      ],
    };
    const geometryFeature = createFeature('geometry', {
      geometry: JSON.stringify({
        coordinates: [127.1, 37.1],
        type: 'Point',
      }),
      identifier: '중앙 유구',
    });

    const [overlay] = getKoreanFieldworkDailyJournalFeatureOverlays(
      [geometryFeature],
      SELECTED_DATE,
      boundaryDraft
    );

    expect(overlay).toMatchObject({
      center: { x: 5000, y: 5000 },
      id: 'geometry',
      label: expect.stringContaining('중앙 유구'),
      guidePaths: [{
        closed: false,
        points: [{ x: 5000, y: 5000 }],
      }],
    });
    expect(getKoreanFieldworkDailyJournalFeatureOverlays(
      [geometryFeature],
      SELECTED_DATE
    )).toEqual([]);
  });

  it('prefers a valid location sketch over geometry and ignores unusable records', () => {
    const boundaryDraft = {
      coordinates: [
        { latitude: 37, longitude: 127 },
        { latitude: 37, longitude: 127.2 },
        { latitude: 37.2, longitude: 127.2 },
      ],
    };
    const overlays = getKoreanFieldworkDailyJournalFeatureOverlays([
      createFeature('sketch-wins', {
        featureLocationSketch: pointSketch(20, 30),
        geometry: { coordinates: [127.1, 37.1], type: 'Point' },
      }),
      createFeature('broken', {
        featureLocationSketch: '{not-json',
        geometry: { coordinates: ['127.1', 37.1], type: 'Point' },
      }),
    ], SELECTED_DATE, boundaryDraft);

    expect(overlays).toHaveLength(1);
    expect(overlays[0]).toMatchObject({
      center: { x: 1500, y: 2667 },
      id: 'sketch-wins',
    });
  });
});

const createFeature = (
  id: string,
  resource: Record<string, unknown>,
  createdDate?: Date
): Document => createDocument(C.FEATURE, id, resource, createdDate);

const createDocument = (
  category: string,
  id: string,
  resource: Record<string, unknown>,
  createdDate?: Date
): Document => ({
  _id: id,
  created: createdDate
    ? { date: createdDate, user: 'tester' }
    : undefined,
  modified: [],
  resource: {
    category,
    id,
    identifier: id,
    relations: {},
    ...resource,
  },
} as unknown as Document);

const pointSketch = (x: number, y: number): string => JSON.stringify({
  center: { x, y },
  points: [{ x, y }],
  shape: 'point',
});

const shapeSketch = (
  shape: 'rectangle' | 'circle' | 'oval',
  x: number,
  y: number,
  rotation = 0
): string => JSON.stringify({
  center: { x, y },
  points: [{ x, y }],
  rotation,
  scale: 100,
  shape,
});
