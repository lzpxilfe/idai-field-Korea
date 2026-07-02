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

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      postMessage: jest.fn(),
    }));

    return <View {...props} />;
  });
  MockWebView.displayName = 'MockWebView';

  return { WebView: MockWebView };
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

    const payload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);
    const [stroke] = payload.strokes;

    expect(payload).toMatchObject({
      version: 1,
    });
    expect(stroke.points[0]).toEqual({ x: 1000, y: 1000 });
    expect(stroke.points[stroke.points.length - 1]).toEqual({ x: 5000, y: 5000 });
    expect(stroke.points.length).toBeGreaterThan(2);
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

    const payload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);
    const [stroke] = payload.strokes;

    expect(payload).toMatchObject({
      version: 1,
    });
    expect(stroke.points[0]).toEqual({ x: 2000, y: 2000 });
    expect(stroke.points[stroke.points.length - 1]).toEqual({ x: 5000, y: 5000 });
    expect(stroke.points.length).toBeGreaterThan(2);
  });

  it('locks parent scrolling from the first touch on the sketch background', () => {
    const handleDrawingActiveChange = jest.fn();
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onDrawingActiveChange={handleDrawingActiveChange}
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkFreeDrawingCanvas');
    fireEvent(canvas, 'touchStart');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 48, locationY: 42 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 160, locationY: 140 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 140 },
    });
    fireEvent(canvas, 'touchEnd');

    expect(handleDrawingActiveChange.mock.calls).toEqual([[true], [false]]);
    expect(handleUpdateStrokes).toHaveBeenCalledTimes(1);
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
    expect(getAllByTestId('fieldworkFreeDrawingStrokeJoint').length)
      .toBeGreaterThan(2);
  });

  it('stores the selected brush width with new free sketch strokes', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingBrush_8'));

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

    const payload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);

    expect(payload.strokes[0].width).toBe(8);
  });

  it('opens a full-screen free sketch canvas from the expand button', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreen'));

    expect(getByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeTruthy();
  });

  it('does not show technical stroke and point counts in the sketch header', () => {
    const { queryByText } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={jest.fn()}
        strokesValue={'{"version":1,"strokes":[{"points":[{"x":1000,"y":1000}]}]}'}
      />
    );

    expect(queryByText(/획\s*\d/)).toBeNull();
    expect(queryByText(/점\s*\d/)).toBeNull();
  });
});
