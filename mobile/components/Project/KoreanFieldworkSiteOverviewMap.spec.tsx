import { fireEvent, render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import { StyleSheet } from 'react-native';
import KoreanFieldworkSiteOverviewMap from './KoreanFieldworkSiteOverviewMap';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkSiteOverviewMap', () => {
  it('shows only the survey boundary and feature sketches with feature names', () => {
    const onOpenFeature = jest.fn();
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
    const feature = createDocument(C.FEATURE, 'feature-1', {
      featureLocationSketch: JSON.stringify({
        center: { x: 42, y: 58 },
        points: [{ x: 42, y: 58 }],
        rotation: 15,
        scale: 90,
        shape: 'oval',
      }),
      featureType: 'pit',
      identifier: '1호 수혈',
    });
    const photo = createDocument(C.PHOTO, 'photo-1', {
      identifier: '현장 사진',
    });

    const { getAllByTestId, getByTestId, getByText, queryByText } = render(
      <KoreanFieldworkSiteOverviewMap
        documents={[boundary, feature, photo]}
        onOpenFeature={onOpenFeature}
      />
    );

    expect(getAllByTestId('siteOverviewBoundaryLine')).toHaveLength(4);
    expect(getByTestId('siteOverviewFeatureShape_feature-1')).toBeTruthy();
    expect(getByText('1호 수혈')).toBeTruthy();
    expect(queryByText('현장 사진')).toBeNull();

    fireEvent.press(getByTestId('siteOverviewFeatureLabel_feature-1'));

    expect(onOpenFeature).toHaveBeenCalledWith(feature);
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
    expect(getByText('2호 유구')).toBeTruthy();
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
});

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
