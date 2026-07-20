import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import { StyleSheet } from 'react-native';
import KoreanFieldworkSiteOverviewMap from './KoreanFieldworkSiteOverviewMap';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkSiteOverviewMap', () => {
  it('shows only the survey boundary and feature sketches with feature names', () => {
    const onOpenFeature = jest.fn();
    const onImportDxfReference = jest.fn();
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
      referenceVectorGeometry: JSON.stringify({
        type: 'MultiLineString',
        coordinates: [
          [[126.12, 36.12], [126.28, 36.12]],
          [[126.12, 36.18], [126.28, 36.18]],
        ],
      }),
    });
    const feature = createDocument(C.FEATURE, 'feature-1', {
      featureLocationSketch: JSON.stringify({
        center: { x: 42, y: 58 },
        points: [{ x: 42, y: 58 }],
        rotation: 15,
        scale: 90,
        shape: 'circle',
      }),
      featureType: 'pit',
      identifier: '1호 수혈',
      period: 'joseon',
    });
    const photo = createDocument(C.PHOTO, 'photo-1', {
      identifier: '현장 사진',
    });

    const { getAllByTestId, getByTestId, getByText, queryByText } = render(
      <KoreanFieldworkSiteOverviewMap
        documents={[boundary, feature, photo]}
        onImportDxfReference={onImportDxfReference}
        onOpenFeature={onOpenFeature}
      />
    );

    expect(getAllByTestId('siteOverviewBoundaryLine')).toHaveLength(4);
    expect(getAllByTestId('siteOverviewReferenceLine')).toHaveLength(2);
    expect(getByTestId('siteOverviewFeatureShape_feature-1')).toBeTruthy();
    expect(getByText('[조선] 1호 수혈')).toBeTruthy();
    expect(queryByText('현장 사진')).toBeNull();

    fireEvent.press(getByTestId('siteOverviewFeatureHitTarget_feature-1'));

    expect(onOpenFeature).toHaveBeenCalledWith(feature);

    fireEvent.press(getByTestId('siteOverviewImportDxfReference'));

    expect(onImportDxfReference).toHaveBeenCalledTimes(1);
  });

  it('can use the project boundary draft when the saved boundary document is hidden or missing', () => {
    const feature = createDocument(C.FEATURE, 'feature-1', {
      featureLocationSketch: JSON.stringify({
        center: { x: 50, y: 50 },
        points: [
          { x: 40, y: 40 },
          { x: 60, y: 40 },
          { x: 60, y: 60 },
        ],
        shape: 'polygon',
      }),
      identifier: '2호 유구',
    });

    const { getAllByTestId, getByText } = render(
      <KoreanFieldworkSiteOverviewMap
        boundaryDraft={{
          coordinates: [
            { latitude: 36.1, longitude: 126.1 },
            { latitude: 36.1, longitude: 126.3 },
            { latitude: 36.3, longitude: 126.3 },
            { latitude: 36.3, longitude: 126.1 },
          ],
        }}
        documents={[feature]}
      />
    );

    expect(getAllByTestId('siteOverviewBoundaryLine')).toHaveLength(4);
    expect(getAllByTestId('siteOverviewFeatureShape_feature-1')).toHaveLength(3);
    expect(getByText('[시기미상] 2호 유구')).toBeTruthy();
  });

  it('measures the approximate center distance between two selected features', () => {
    const onOpenFeature = jest.fn();
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [1000, 1000],
          [1050, 1000],
          [1050, 1050],
          [1000, 1050],
          [1000, 1000],
        ],
      },
    });
    const firstFeature = createDocument(C.FEATURE, 'feature-1', {
      featureLocationSketch: JSON.stringify({
        center: { x: 14, y: 50 },
        points: [{ x: 14, y: 50 }],
        shape: 'point',
      }),
      identifier: '1호 유구',
    });
    const secondFeature = createDocument(C.FEATURE, 'feature-2', {
      featureLocationSketch: JSON.stringify({
        center: { x: 86, y: 50 },
        points: [{ x: 86, y: 50 }],
        shape: 'point',
      }),
      identifier: '2호 유구',
    });
    const { getByTestId, getByText, queryByTestId } = render(
      <KoreanFieldworkSiteOverviewMap
        documents={[boundary, firstFeature, secondFeature]}
        onOpenFeature={onOpenFeature}
      />
    );

    fireEvent.press(getByTestId('siteOverviewDistanceMeasure'));
    expect(getByText('거리 측정 · 첫 유구 선택')).toBeTruthy();

    fireEvent.press(getByTestId('siteOverviewFeatureHitTarget_feature-1'));
    expect(getByTestId('siteOverviewDistanceMarker_1')).toBeTruthy();
    expect(getByText('[시기미상] 1호 유구 · 두 번째 유구 선택')).toBeTruthy();

    fireEvent.press(getByTestId('siteOverviewFeatureHitTarget_feature-2'));
    expect(getByTestId('siteOverviewDistanceLine')).toBeTruthy();
    expect(getByTestId('siteOverviewDistanceMarker_2')).toBeTruthy();
    expect(getByText(
      '[시기미상] 1호 유구 ↔ [시기미상] 2호 유구 · 중심 간 약 50 m'
    )).toBeTruthy();
    expect(onOpenFeature).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('siteOverviewDistanceClear'));
    expect(queryByTestId('siteOverviewDistanceResult')).toBeNull();
    expect(getByText('거리 측정 · 첫 유구 선택')).toBeTruthy();

    fireEvent.press(getByTestId('siteOverviewDistanceMeasure'));
    fireEvent.press(getByTestId('siteOverviewFeatureHitTarget_feature-1'));
    expect(onOpenFeature).toHaveBeenCalledWith(firstFeature);
  });

  it('measures against a WGS84 project boundary draft before it is saved', () => {
    const firstFeature = createDocument(C.FEATURE, 'feature-1', {
      featureLocationSketch: JSON.stringify({
        center: { x: 14, y: 50 },
        points: [{ x: 14, y: 50 }],
        shape: 'point',
      }),
      identifier: '서쪽 유구',
    });
    const secondFeature = createDocument(C.FEATURE, 'feature-2', {
      featureLocationSketch: JSON.stringify({
        center: { x: 86, y: 50 },
        points: [{ x: 86, y: 50 }],
        shape: 'point',
      }),
      identifier: '동쪽 유구',
    });
    const { getByTestId, getByText } = render(
      <KoreanFieldworkSiteOverviewMap
        boundaryDraft={{
          coordinates: [
            { latitude: 37, longitude: 127 },
            { latitude: 37, longitude: 127.001 },
            { latitude: 37.001, longitude: 127.001 },
            { latitude: 37.001, longitude: 127 },
          ],
        }}
        documents={[firstFeature, secondFeature]}
      />
    );

    fireEvent.press(getByTestId('siteOverviewDistanceMeasure'));
    fireEvent.press(getByTestId('siteOverviewFeatureHitTarget_feature-1'));
    fireEvent.press(getByTestId('siteOverviewFeatureHitTarget_feature-2'));

    expect(getByText(
      '[시기미상] 서쪽 유구 ↔ [시기미상] 동쪽 유구 · 중심 간 약 89 m'
    )).toBeTruthy();
  });

  it('zooms the overview map with a two-finger pinch gesture', () => {
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
    });

    const { getByTestId } = render(
      <KoreanFieldworkSiteOverviewMap documents={[boundary]} />
    );
    const canvas = getByTestId('siteOverviewCanvas');

    fireEvent(canvas, 'responderGrant', {
      nativeEvent: {
        touches: [
          { locationX: 220, locationY: 220 },
          { locationX: 320, locationY: 220 },
        ],
      },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: {
        touches: [
          { locationX: 170, locationY: 220 },
          { locationX: 370, locationY: 220 },
        ],
      },
    });

    expect(getScaleFromStyle(getByTestId('siteOverviewMapContent').props.style))
      .toBeGreaterThan(1);

    fireEvent.press(getByTestId('siteOverviewZoomReset'));

    expect(getScaleFromStyle(getByTestId('siteOverviewMapContent').props.style))
      .toBe(1);
  });

  it('preserves the measured survey boundary aspect ratio in the overview map', () => {
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [1000, 1000],
          [5000, 1000],
          [5000, 2000],
          [1000, 2000],
          [1000, 1000],
        ],
      },
    });
    const feature = createDocument(C.FEATURE, 'feature-1', {
      featureLocationSketch: JSON.stringify({
        center: { x: 50, y: 86 },
        points: [{ x: 50, y: 86 }],
        shape: 'point',
      }),
      identifier: '1???좉뎄',
    });

    const { getByTestId } = render(
      <KoreanFieldworkSiteOverviewMap documents={[boundary, feature]} />
    );
    fireEvent(getByTestId('siteOverviewCanvas'), 'layout', {
      nativeEvent: {
        layout: { height: 400, width: 400, x: 0, y: 0 },
      },
    });

    expect(getPercentStyleValue(
      getByTestId('siteOverviewBoundaryPoint_0').props.style,
      'top'
    )).toBeCloseTo(59);
    expect(getPercentStyleValue(
      getByTestId('siteOverviewBoundaryPoint_2').props.style,
      'top'
    )).toBeCloseTo(41);
    expect(getPercentStyleValue(
      getByTestId('siteOverviewFeatureShape_feature-1_0').props.style,
      'top'
    )).toBeCloseTo(59);
  });

  it('uses synced feature geometry when a legacy feature has no location sketch', () => {
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ]],
      },
    });
    const feature = createDocument(C.FEATURE, 'feature-geometry', {
      geometry: { type: 'Point', coordinates: [126.2, 36.2] },
      identifier: '좌표 유구',
    });

    const { getByTestId, getByText } = render(
      <KoreanFieldworkSiteOverviewMap documents={[boundary, feature]} />
    );

    expect(getByTestId('siteOverviewFeatureShape_feature-geometry_0'))
      .toBeTruthy();
    expect(getByText('[시기미상] 좌표 유구')).toBeTruthy();
  });

  it('shows an online satellite background without storing provider tile bytes', () => {
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
    });
    const { getAllByTestId, getByTestId, getByText, queryByTestId } = render(
      <KoreanFieldworkSiteOverviewMap documents={[boundary]} />
    );

    const tiles = getAllByTestId('siteOverviewSatelliteTile');
    expect(tiles.length).toBeGreaterThan(0);
    expect(getByText('위성')).toBeTruthy();
    tiles.forEach((tile, index) => fireEvent(tile, index === 0 ? 'load' : 'error'));
    expect(getByText('일부 위성 타일이 누락되었습니다. 네트워크를 확인해 주세요.'))
      .toBeTruthy();
    expect(getByText('Tiles © Esri')).toBeTruthy();

    fireEvent.press(getByTestId('siteOverviewBackgroundToggle'));

    expect(queryByTestId('siteOverviewSatelliteTile')).toBeNull();
    expect(getByText('약도')).toBeTruthy();
  });

  it('renders and updates the project-wide sketch stored on the survey boundary', async () => {
    const onUpdateSiteSketch = jest.fn().mockResolvedValue(undefined);
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
      siteOverviewSketchStrokes: JSON.stringify({
        version: 1,
        strokes: [{
          color: '#dc2626',
          points: [{ x: 2000, y: 2000 }, { x: 7000, y: 7000 }],
          tool: 'pen',
          width: 8,
        }],
      }),
    });
    const { getByTestId, getByText } = render(
      <KoreanFieldworkSiteOverviewMap
        documents={[boundary]}
        onUpdateSiteSketch={onUpdateSiteSketch}
      />
    );

    expect(getByTestId('siteOverviewSketchLine')).toBeTruthy();
    fireEvent.press(getByTestId('siteOverviewOpenSketch'));
    expect(getByText('유적 전체 공용 약도')).toBeTruthy();

    fireEvent(getByTestId('siteOverviewSketchFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'strokes',
          payload: [{
            points: [{ x: 3000, y: 3000 }, { x: 8000, y: 8000 }],
            tool: 'pen',
            width: 5,
          }],
        }),
      },
    });

    await waitFor(() => expect(onUpdateSiteSketch).toHaveBeenCalledWith(
      'boundary-1',
      expect.stringContaining('"version":1'),
      expect.any(String)
    ));
    await waitFor(() => expect(getByText('저장 완료')).toBeTruthy());
  });

  it('waits for every queued sketch save before closing and keeps the latest state', async () => {
    const firstSave = createDeferred();
    const secondSave = createDeferred();
    const onUpdateSiteSketch = jest.fn()
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
    });
    const { getByTestId, getByText, queryByText } = render(
      <KoreanFieldworkSiteOverviewMap
        documents={[boundary]}
        onUpdateSiteSketch={onUpdateSiteSketch}
      />
    );
    const canvasMessage = (x: number) => ({
      nativeEvent: {
        data: JSON.stringify({
          type: 'strokes',
          payload: [{
            points: [{ x, y: x }, { x: x + 1000, y: x + 1000 }],
            tool: 'pen',
            width: 5,
          }],
        }),
      },
    });

    fireEvent.press(getByTestId('siteOverviewOpenSketch'));
    fireEvent(
      getByTestId('siteOverviewSketchFullscreenCanvas'),
      'message',
      canvasMessage(2000)
    );
    await waitFor(() => expect(onUpdateSiteSketch).toHaveBeenCalledTimes(1));
    fireEvent(
      getByTestId('siteOverviewSketchFullscreenCanvas'),
      'message',
      canvasMessage(4000)
    );

    fireEvent.press(getByTestId('siteOverviewSketchFullscreenClose'));

    expect(getByText('유적 전체 공용 약도')).toBeTruthy();
    expect(getByText('저장 마무리 중…')).toBeTruthy();
    expect(onUpdateSiteSketch).toHaveBeenCalledTimes(1);

    firstSave.resolve();
    await waitFor(() => expect(onUpdateSiteSketch).toHaveBeenCalledTimes(2));
    expect(onUpdateSiteSketch.mock.calls[1][1]).toContain('4000');
    expect(getByText('유적 전체 공용 약도')).toBeTruthy();

    secondSave.resolve();
    await waitFor(() => expect(queryByText('유적 전체 공용 약도')).toBeNull());
  }, 15000);

  it('keeps the sketch open after a save failure without leaking a rejection', async () => {
    const onUpdateSiteSketch = jest.fn().mockRejectedValue(
      new Error('offline')
    );
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
    });
    const { getByTestId, getByText } = render(
      <KoreanFieldworkSiteOverviewMap
        documents={[boundary]}
        onUpdateSiteSketch={onUpdateSiteSketch}
      />
    );

    fireEvent.press(getByTestId('siteOverviewOpenSketch'));
    fireEvent(getByTestId('siteOverviewSketchFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'strokes',
          payload: [{
            points: [{ x: 3000, y: 3000 }, { x: 8000, y: 8000 }],
            tool: 'pen',
            width: 5,
          }],
        }),
      },
    });

    await waitFor(() => {
      expect(getByText('저장 실패 · 화면 유지 중')).toBeTruthy();
    });
    fireEvent.press(getByTestId('siteOverviewSketchFullscreenClose'));

    await waitFor(() => {
      expect(getByText('유적 전체 공용 약도')).toBeTruthy();
      expect(getByText('저장 실패 · 화면 유지 중')).toBeTruthy();
    });
  });

  it('applies saved eraser gestures when showing the shared sketch overlay', () => {
    const boundary = createDocument(C.SURVEY_BOUNDARY, 'boundary-1', {
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.1, 36.1],
          [126.3, 36.1],
          [126.3, 36.3],
          [126.1, 36.3],
          [126.1, 36.1],
        ],
      },
      siteOverviewSketchStrokes: JSON.stringify({
        version: 1,
        strokes: [
          {
            points: [{ x: 2000, y: 5000 }, { x: 8000, y: 5000 }],
            tool: 'pen',
            width: 8,
          },
          {
            points: [{ x: 5000, y: 2000 }, { x: 5000, y: 8000 }],
            tool: 'eraser',
            width: 12,
          },
        ],
      }),
    });
    const { queryByTestId } = render(
      <KoreanFieldworkSiteOverviewMap documents={[boundary]} />
    );

    expect(queryByTestId('siteOverviewSketchLine')).toBeNull();
  });
});

const createDeferred = () => {
  let reject!: (reason?: unknown) => void;
  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
};

const getScaleFromStyle = (style: unknown): number => {
  const flattened = StyleSheet.flatten(style) as {
    transform?: { scale?: number }[];
  };

  return flattened.transform?.find((entry) =>
    typeof entry.scale === 'number')?.scale ?? 1;
};

const getPercentStyleValue = (
  style: unknown,
  property: 'left' | 'top'
): number => {
  const flattened = StyleSheet.flatten(style) as Record<string, unknown>;
  const value = flattened[property];
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number.NaN;

  return parseFloat(value.replace('%', ''));
};

const createDocument = (
  category: string,
  id: string,
  resource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
    ...resource,
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
