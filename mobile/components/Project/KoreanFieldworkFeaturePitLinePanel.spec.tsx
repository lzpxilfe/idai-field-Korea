import { fireEvent, render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkFeaturePitLinePanel, {
  KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS,
} from './KoreanFieldworkFeaturePitLinePanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkFeaturePitLinePanel', () => {
  it('stores a straight soil pit line on the feature sketch', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        allowedAddCategoryNames={[C.SOIL_PROFILE_PHOTO]}
        document={createDoc('feature-1', C.FEATURE, {
          featureLocationSketch: JSON.stringify({
            version: 2,
            shape: 'polygon',
            center: { x: 50, y: 50 },
            points: [
              { x: 20, y: 20 },
              { x: 80, y: 20 },
              { x: 80, y: 70 },
              { x: 20, y: 70 },
            ],
            rotation: 0,
            scale: 100,
          }),
        })}
        documents={[]}
        onAddSoilProfilePhoto={jest.fn()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });

    expect(onUpdateResourceFields).toHaveBeenCalledTimes(1);
    const updates = onUpdateResourceFields.mock.calls[0][0];
    const pitLine = JSON.parse(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.line]);

    expect(pitLine.start).toEqual({ x: 20, y: 25 });
    expect(pitLine.end).toEqual({ x: 80, y: 75 });
    expect(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.updatedAt])
      .toEqual(pitLine.updatedAt);
  });

  it('connects the feature pit line panel to soil profile photo creation', () => {
    const onAddSoilProfilePhoto = jest.fn();
    const feature = createDoc('feature-1', C.FEATURE);
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        allowedAddCategoryNames={[C.SOIL_PROFILE_PHOTO]}
        document={feature}
        documents={[]}
        onAddSoilProfilePhoto={onAddSoilProfilePhoto}
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('featurePitLineAddSoilProfilePhoto'));

    expect(onAddSoilProfilePhoto).toHaveBeenCalledWith(
      feature,
      C.SOIL_PROFILE_PHOTO
    );
  });

  it('stays hidden outside feature records', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('photo-1', C.PHOTO)}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(queryByTestId('featurePitLinePanel')).toBeNull();
  });

  it('clears an existing soil pit line', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLine: JSON.stringify({
            version: 1,
            start: { x: 25, y: 30 },
            end: { x: 75, y: 65 },
          }),
        })}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    expect(getByTestId('featurePitLineSegment')).toBeTruthy();
    fireEvent.press(getByTestId('featurePitLineClear'));

    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      [KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.line]: '',
    }));
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
