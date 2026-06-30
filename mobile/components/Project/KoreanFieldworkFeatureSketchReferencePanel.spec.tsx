import { render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
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
    expect(getByTestId('featureShapeSketchPreview')).toBeTruthy();
    expect(getByTestId('featureShapeSketchShape')).toBeTruthy();
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
