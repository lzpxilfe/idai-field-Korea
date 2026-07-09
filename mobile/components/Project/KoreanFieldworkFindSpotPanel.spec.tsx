import { fireEvent, render } from '@testing-library/react-native';
import { Document, NewResource } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkFindSpotPanel, {
  KOREAN_FIELDWORK_FIND_SPOT_FIELDS,
} from './KoreanFieldworkFindSpotPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkFindSpotPanel', () => {
  it('adds numbered find spots on the parent feature sketch', () => {
    const onUpdateResourceFields = jest.fn();
    const feature = createFeature();
    const findResource = createFindResource();
    const { getByTestId } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        parentDocument={feature}
        resource={findResource}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    const canvas = getByTestId('findSpotCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 100, locationY: 150 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 100, locationY: 150 },
    });

    expect(onUpdateResourceFields).toHaveBeenCalledTimes(1);
    const updates = onUpdateResourceFields.mock.calls[0][0];
    const payload = JSON.parse(updates[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]);

    expect(payload.items).toMatchObject([
      {
        label: '',
        number: 1,
        point: { x: 25, y: 75 },
      },
    ]);
    expect(updates[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.updatedAt])
      .toEqual(payload.updatedAt);
  });

  it('adds numbered sample collection spots on the parent feature sketch', () => {
    const onUpdateResourceFields = jest.fn();
    const feature = createFeature();
    const sampleResource = createSampleResource();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        parentDocument={feature}
        resource={sampleResource}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    const canvas = getByTestId('findSpotCanvas');

    expect(getByText('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58')).toBeTruthy();
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 200, locationY: 80 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 200, locationY: 80 },
    });

    expect(onUpdateResourceFields).toHaveBeenCalledTimes(1);
    const updates = onUpdateResourceFields.mock.calls[0][0];
    const payload = JSON.parse(updates[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]);

    expect(payload.items).toMatchObject([
      {
        label: '',
        number: 1,
        point: { x: 50, y: 40 },
      },
    ]);
  });

  it('uses sample wording for existing sample spot labels', () => {
    const feature = createFeature();
    const sampleResource = createSampleResource({
      findSpotItems: JSON.stringify({
        version: 1,
        items: [
          { number: 1, point: { x: 50, y: 40 }, label: '' },
        ],
      }),
    });
    const { getByTestId, getByText } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        parentDocument={feature}
        resource={sampleResource}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getByText('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58')).toBeTruthy();
    expect(getByTestId('findSpotLabelInput_1').props.placeholder)
      .toBe('1\ubc88 \uc2dc\ub8cc\uba85/\uc218\ub7c9 \uba54\ubaa8');
  });

  it('zooms the feature sketch before placing a precise find spot', () => {
    const onUpdateResourceFields = jest.fn();
    const feature = createFeature();
    const findResource = createFindResource();
    const { getByTestId } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        parentDocument={feature}
        resource={findResource}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    const canvas = getByTestId('findSpotCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: {
        touches: [
          { locationX: 150, locationY: 100 },
          { locationX: 250, locationY: 100 },
        ],
      },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: {
        touches: [
          { locationX: 100, locationY: 100 },
          { locationX: 300, locationY: 100 },
        ],
      },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: {
        changedTouches: [
          { locationX: 100, locationY: 100 },
          { locationX: 300, locationY: 100 },
        ],
      },
    });

    expect(getByTestId('findSpotZoomReset')).toBeTruthy();

    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 300, locationY: 100 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 300, locationY: 100 },
    });

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const payload = JSON.parse(updates[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]);

    expect(payload.items[0].point.x).toBeCloseTo(62.5);
    expect(payload.items[0].point.y).toBeCloseTo(50);
  });

  it('pans the zoomed feature sketch without adding a find spot', () => {
    const onUpdateResourceFields = jest.fn();
    const feature = createFeature();
    const findResource = createFindResource();
    const { getByTestId } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        parentDocument={feature}
        resource={findResource}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    const canvas = getByTestId('findSpotCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: {
        touches: [
          { locationX: 150, locationY: 100 },
          { locationX: 250, locationY: 100 },
        ],
      },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: {
        touches: [
          { locationX: 100, locationY: 100 },
          { locationX: 300, locationY: 100 },
        ],
      },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: {
        changedTouches: [
          { locationX: 100, locationY: 100 },
          { locationX: 300, locationY: 100 },
        ],
      },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 220, locationY: 100 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 260, locationY: 100 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 260, locationY: 100 },
    });

    expect(onUpdateResourceFields).not.toHaveBeenCalled();
  });

  it('lets each numbered find spot store an item label', () => {
    const onUpdateResourceFields = jest.fn();
    const feature = createFeature();
    const findResource = createFindResource({
      findSpotItems: JSON.stringify({
        version: 1,
        items: [
          { number: 1, point: { x: 25, y: 75 }, label: '' },
          { number: 2, point: { x: 60, y: 45 }, label: '' },
        ],
      }),
    });
    const { getByTestId } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        parentDocument={feature}
        resource={findResource}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    expect(getByTestId('findSpotPoint_1')).toBeTruthy();
    expect(getByTestId('findSpotPoint_2')).toBeTruthy();
    fireEvent.changeText(getByTestId('findSpotLabelInput_2'), '청동 숟가락');

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const payload = JSON.parse(updates[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]);

    expect(payload.items[1]).toMatchObject({
      label: '청동 숟가락',
      number: 2,
      point: { x: 60, y: 45 },
    });
  });

  it('finds the feature sketch from an existing find relation', () => {
    const feature = createFeature();
    const findResource = createFindResource({}, {
      liesWithin: ['feature-1'],
    });
    const { getAllByTestId, getByTestId } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[feature]}
        resource={findResource}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getByTestId('findSpotPanel')).toBeTruthy();
    expect(getAllByTestId('findSpotFeatureBoundary').length).toBeGreaterThan(0);
  });

  it('stays hidden outside find records', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkFindSpotPanel
        documents={[createFeature()]}
        parentDocument={createFeature()}
        resource={{
          category: C.PHOTO,
          identifier: 'photo-1',
          relations: {},
        }}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(queryByTestId('findSpotPanel')).toBeNull();
  });
});

const createFeature = (): Document => createDoc('feature-1', C.FEATURE, {
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
});

const createFindResource = (
  extraResource: Record<string, unknown> = {},
  relations: Record<string, string[]> = {}
): NewResource => ({
  category: C.FIND,
  identifier: 'find-1',
  relations,
  ...extraResource,
});

const createSampleResource = (
  extraResource: Record<string, unknown> = {},
  relations: Record<string, string[]> = {}
): NewResource => ({
  category: C.SAMPLE,
  identifier: 'sample-1',
  relations,
  ...extraResource,
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
