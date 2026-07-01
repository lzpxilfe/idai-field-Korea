import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkFreeDrawingPanel
  from './KoreanFieldworkFreeDrawingPanel';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

describe('KoreanFieldworkFreeDrawingPanel', () => {
  it('stores normalized strokes drawn on a blank field sketch canvas', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkFreeDrawingCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 32, locationY: 28 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 160, locationY: 140 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 140 },
    });

    expect(JSON.parse(handleUpdateStrokes.mock.calls[0][0])).toMatchObject({
      version: 1,
      strokes: [
        {
          points: [
            { x: 1000, y: 1000 },
            { x: 5000, y: 5000 },
          ],
        },
      ],
    });
  });

  it('uses active touch coordinates instead of a child target origin', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkFreeDrawingCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: {
        locationX: 0,
        locationY: 0,
        touches: [{ locationX: 64, locationY: 56 }],
      },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: {
        locationX: 0,
        locationY: 0,
        touches: [{ locationX: 160, locationY: 140 }],
      },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: {
        locationX: 0,
        locationY: 0,
        changedTouches: [{ locationX: 160, locationY: 140 }],
      },
    });

    expect(JSON.parse(handleUpdateStrokes.mock.calls[0][0])).toMatchObject({
      version: 1,
      strokes: [
        {
          points: [
            { x: 2000, y: 2000 },
            { x: 5000, y: 5000 },
          ],
        },
      ],
    });
  });

  it('loads serialized strokes and can clear them', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
        strokesValue={'{"version":1,"strokes":[{"points":[{"x":1000,"y":1000}]}]}'}
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingClear'));

    expect(handleUpdateStrokes).toHaveBeenCalledWith('{"version":1,"strokes":[]}');
  });

  it('renders stored strokes with smoothed brush segments', () => {
    const { getAllByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={jest.fn()}
        strokesValue={JSON.stringify({
          version: 1,
          strokes: [
            {
              points: [
                { x: 1000, y: 1000 },
                { x: 5000, y: 2000 },
                { x: 9000, y: 9000 },
              ],
            },
          ],
        })}
      />
    );

    expect(getAllByTestId('fieldworkFreeDrawingStrokeSegment').length)
      .toBeGreaterThan(2);
  });
});
