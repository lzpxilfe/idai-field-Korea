import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Document, NewResource } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkQuickFindSpotModal from './KoreanFieldworkQuickFindSpotModal';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkQuickFindSpotModal', () => {
  it.each([
    [C.FIND, '유물 위치'],
    [C.SAMPLE, '시료 위치'],
  ])('records multiple detailed points before saving a %s record', async (
    category,
    title
  ) => {
    const feature = createFeature();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(
      <KoreanFieldworkQuickFindSpotModal
        documents={[feature]}
        initialResource={createResource(category)}
        onClose={jest.fn()}
        onSave={onSave}
        parentDocument={feature}
      />
    );
    const canvas = getByTestId('findSpotCanvas');

    expect(getByText(title)).toBeTruthy();
    expect(getByTestId('quickFindSpotSave').props.accessibilityState.disabled)
      .toBe(true);
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 180, locationY: 120 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 180, locationY: 120 },
    });
    fireEvent.changeText(getByTestId('findSpotLabelInput_1'), '1\ubc88 \uc704\uce58');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 280, locationY: 80 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 280, locationY: 80 },
    });
    fireEvent.changeText(getByTestId('findSpotLabelInput_2'), '2\ubc88 \uc704\uce58');

    expect(getByText('2\uc810')).toBeTruthy();
    fireEvent.press(getByTestId('quickFindSpotSave'));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const savedResource = onSave.mock.calls[0][0];
    const savedItems = JSON.parse(savedResource.findSpotItems).items;
    expect(savedResource.category).toBe(category);
    expect(savedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ number: 1, label: '1\ubc88 \uc704\uce58' }),
      expect.objectContaining({ number: 2, label: '2\ubc88 \uc704\uce58' }),
    ]));
  });
});

const createResource = (category: string): NewResource => ({
  category,
  identifier: category === C.SAMPLE ? '수혈 1 시료 1' : '수혈 1 유물 1',
  relations: { liesWithin: ['feature-1'] },
});

const createFeature = (): Document => ({
  _id: 'feature-1',
  created: { date: new Date(0), user: 'test' },
  modified: [],
  resource: {
    id: 'feature-1',
    identifier: '수혈 1',
    category: C.FEATURE,
    relations: {},
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
  },
});
