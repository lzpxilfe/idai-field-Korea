import { render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import { StyleSheet } from 'react-native';
import KoreanFieldworkFeatureSketchReferencePanel
  from './KoreanFieldworkFeatureSketchReferencePanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkFeatureSketchReferencePanel', () => {
  it('shows feature location against the survey boundary and the feature shape', () => {
    const feature = createDoc('feature-1', C.FEATURE, {
      featureLocationSketch: JSON.stringify({
        version: 1,
        shape: 'oval',
        center: { x: 64, y: 42 },
        points: [{ x: 64, y: 42 }],
        rotation: 15,
        scale: 120,
      }),
    });
    const boundary = createDoc('boundary-1', C.SURVEY_BOUNDARY, {
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      },
    });
    const { getByTestId, getAllByTestId } = render(
      <KoreanFieldworkFeatureSketchReferencePanel
        document={feature}
        documents={[boundary, feature]}
      />
    );

    expect(getByTestId('featureSketchReferencePanel')).toBeTruthy();
    expect(getByTestId('featureBoundaryLocationPreview')).toBeTruthy();
    expect(getAllByTestId('featureBoundaryLine')).toHaveLength(4);
    expect(getByTestId('featureBoundaryFeatureShape')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('featureBoundaryPoint_0').props.style))
      .toMatchObject({
        left: 73,
        top: 132,
      });
    expect(getByTestId('featureShapeSketchPreview')).toBeTruthy();
    expect(getByTestId('featureShapeSketchShape')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('featureShapeSketchShape').props.style).width)
      .toBeGreaterThan(100);
  });

  it('stays hidden outside feature edit screens', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkFeatureSketchReferencePanel
        document={createDoc('photo-1', C.PHOTO)}
        documents={[]}
      />
    );

    expect(queryByTestId('featureSketchReferencePanel')).toBeNull();
  });

  it.each(['rectangle', 'circle', 'oval'])(
    'fits very small %s sketches into the shape preview',
    (shape) => {
      const feature = createDoc('feature-1', C.FEATURE, {
        featureLocationSketch: JSON.stringify({
          version: 2,
          shape,
          center: { x: 50, y: 50 },
          points: [{ x: 50, y: 50 }],
          rotation: 0,
          scale: 8,
        }),
      });

      const { getByTestId } = render(
        <KoreanFieldworkFeatureSketchReferencePanel
          document={feature}
          documents={[feature]}
        />
      );

      const shapeStyle = StyleSheet.flatten(
        getByTestId('featureShapeSketchShape').props.style
      );

      expect(shapeStyle.height).toBeGreaterThan(100);
      if (shape === 'circle') {
        expect(shapeStyle.width).toBe(shapeStyle.height);
      } else {
        expect(shapeStyle.width).toBeGreaterThan(150);
      }
    }
  );

  it('fits polygon sketches into the shape preview instead of keeping boundary placement', () => {
    const feature = createDoc('feature-1', C.FEATURE, {
      featureLocationSketch: JSON.stringify({
        version: 2,
        shape: 'polygon',
        center: { x: 15, y: 12 },
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 20, y: 14 },
          { x: 10, y: 14 },
        ],
        rotation: 0,
        scale: 100,
      }),
    });

    const { getByTestId } = render(
      <KoreanFieldworkFeatureSketchReferencePanel
        document={feature}
        documents={[feature]}
      />
    );
    const firstPointStyle = StyleSheet.flatten(
      getByTestId('featureShapeSketchShape_0').props.style
    );

    expect(firstPointStyle.left).toBe('8%');
    expect(firstPointStyle.top).toBe('40.2%');
  });
});

const createDoc = (
  id: string,
  category: string,
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  created: { date: new Date(0), user: 'test' },
  modified: [],
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
    ...extraResource,
  },
});
