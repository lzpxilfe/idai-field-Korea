import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
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

  it('stores denser preview points for smoother long freehand strokes', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkFreeDrawingCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 0, locationY: 0 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 320, locationY: 280 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 320, locationY: 280 },
    });

    const payload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);

    expect(payload.strokes[0].points.length).toBe(15);
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

  it('stores selected color and eraser tool with free sketch strokes', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingBrushColor_1'));

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

    fireEvent.press(getByTestId('fieldworkFreeDrawingBrushTool_eraser'));
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 48, locationY: 42 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 190, locationY: 160 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 190, locationY: 160 },
    });

    const firstPayload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);
    const secondPayload = JSON.parse(handleUpdateStrokes.mock.calls[1][0]);

    expect(firstPayload.strokes[0]).toMatchObject({
      color: '#dc2626',
      tool: 'pen',
    });
    expect(secondPayload.strokes[1]).toMatchObject({
      color: '#dc2626',
      tool: 'eraser',
    });
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

  it('shows pen memos on a repeating 5-by-5 grouped infinite grid', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
        writingGuides
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreen'));
    const fullscreenCanvas = getByTestId('fieldworkFreeDrawingFullscreenCanvas');
    const html = fullscreenCanvas.props.source.html as string;

    expect(getByTestId('fieldworkFreeDrawingFullscreenWritingGuideNotice'))
      .toBeTruthy();
    expect(getByText(/작은 칸 5×5마다 굵은 선/)).toBeTruthy();
    expect(html).toContain('"aspectRatio":1');
    expect(html).toContain('"canvasMode":"penMemoInfiniteGrid"');
    expect(html).toContain('"writingGuides":true');
    expect(html).toContain('const penMemoGridStep=400;');
    expect(html).toContain('const penMemoLineHeight=2000;');
    expect(html).toContain('const penMemoMajorEvery=5;');
    expect(html).toContain("const isInfiniteGrid=background.canvasMode==='penMemoInfiniteGrid';");
    expect(html).toContain('function drawWritingGuidePaper()');
    expect(html).toContain('const minimumUsableCanvasSize=16;');
    expect(html).toContain('const maxGridLinesPerAxis=512;');
    expect(html).toContain('function getVisibleGridIndexRange(');
    expect(html).toContain('const frame=getBaseDrawingFrameForSize(size);');
    expect(html).not.toContain("ctx.fillStyle='#e9edf0';");
    expect(html).not.toContain("ctx.strokeStyle='rgba(47,111,78,0.34)';");

    fireEvent(fullscreenCanvas, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [{
            points: [{ x: 1000, y: 1000 }, { x: 5000, y: 5000 }],
            tool: 'pen',
          }],
          type: 'strokes',
        }),
      },
    });

    const payload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);
    expect(payload).toEqual({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [expect.objectContaining({
        points: expect.any(Array),
        tool: 'pen',
      })],
    });
    expect(handleUpdateStrokes.mock.calls[0][0]).not.toContain('writingGuide');
  });

  it('preserves PenMemo ink drawn beyond the original square page', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
        writingGuides
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreen'));
    fireEvent(getByTestId('fieldworkFreeDrawingFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [{
            points: [
              { x: -2400, y: 12800 },
              { x: -1200, y: 13600 },
            ],
            tool: 'pen',
          }],
          type: 'strokes',
        }),
      },
    });

    expect(JSON.parse(handleUpdateStrokes.mock.calls[0][0])).toEqual({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{
        points: [
          { x: -2400, y: 12800 },
          { x: -1200, y: 13600 },
        ],
        tool: 'pen',
      }],
    });
  });

  it('fits extended PenMemo ink in the inline preview and opens it for editing', () => {
    const handleUpdateStrokes = jest.fn();
    const { getAllByTestId, getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
        strokesValue={JSON.stringify({
          coordinateSpace: 'penMemoInfiniteGridV1',
          version: 2,
          strokes: [
            {
              points: [{ x: 12000, y: 12000 }, { x: 14000, y: 14000 }],
              tool: 'pen',
            },
            {
              points: [{ x: 500000, y: 500000 }],
              tool: 'eraser',
              width: 12,
            },
          ],
        })}
        writingGuides
      />
    );

    const segmentStyle = StyleSheet.flatten(
      getAllByTestId('fieldworkFreeDrawingStrokeSegment')[0].props.style
    );
    expect(segmentStyle.left).toBeLessThan(320);
    const jointStyle = StyleSheet.flatten(
      getAllByTestId('fieldworkFreeDrawingStrokeJoint')[0].props.style
    );
    expect(jointStyle.left).toBeGreaterThan(20);
    expect(jointStyle.top).toBeGreaterThanOrEqual(0);

    fireEvent(getByTestId('fieldworkFreeDrawingCanvas'), 'responderGrant', {
      nativeEvent: { locationX: 160, locationY: 140 },
    });
    fireEvent(getByTestId('fieldworkFreeDrawingCanvas'), 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 140 },
    });

    expect(getByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeTruthy();
    const html = getByTestId('fieldworkFreeDrawingFullscreenCanvas')
      .props.source.html as string;
    expect(html).toContain('"initialFocusPoint":{"x":14000,"y":14000}');
    expect(handleUpdateStrokes).not.toHaveBeenCalled();
  });

  it('keeps an inline PenMemo swipe available to the parent scroll view', () => {
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={jest.fn()}
        writingGuides
      />
    );
    const canvas = getByTestId('fieldworkFreeDrawingCanvas');

    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 160, locationY: 100 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 160, locationY: 145 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 145 },
    });

    expect(queryByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeNull();
    expect(canvas.props.onResponderTerminationRequest()).toBe(true);
  });

  it('clamps persisted v1 PenMemo coordinates before entering infinite mode', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={jest.fn()}
        strokesValue={JSON.stringify({
          version: 1,
          strokes: [{ points: [{ x: -2400, y: 12800 }] }],
        })}
        writingGuides
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreen'));
    const html = getByTestId('fieldworkFreeDrawingFullscreenCanvas')
      .props.source.html as string;

    expect(html).toContain('"points":[{"x":0,"y":10000}]');
    expect(html).not.toContain('"x":-2400');
  });

  it('keeps full-screen drawing coordinates valid and samples strokes densely', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreen'));
    const fullscreenCanvas = getByTestId('fieldworkFreeDrawingFullscreenCanvas');
    const html = fullscreenCanvas.props.source.html as string;
    const script = html.match(/<script>([\s\S]+)<\/script>/)?.[1];

    expect(script).toBeDefined();
    expect(() => new Function(script as string)).not.toThrow();
    expect(html).toContain('const minPointDistance=32;');
    expect(html).toContain('const interpolatedPointSpacing=80;');
    expect(html).toContain(
      'if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)) return undefined;'
    );
    expect(html).toContain(
      'if(!source||!Number.isFinite(source.clientX)||!Number.isFinite(source.clientY)) return undefined;'
    );
    expect(html).toContain("canvas.addEventListener('pointerdown',startPointer");
    expect(html).toContain('function cancelTouchGestureForPen()');
    expect(html).toContain('activePointers.clear();');
    expect(html).toContain("activePenPointerId=event.pointerId;");
    expect(html).toContain("event.pointerType==='touch'&&activePenPointerId!==null");
    expect(html).toContain('activePenPointerId=null;');
    expect(html).not.toContain('palmRejectionAfterPenMs');
    expect(html).toContain('pressure:clamp(pressure,0,1)');
    expect(getByTestId('fieldworkFreeDrawingFullscreenBrushTool_lasso'))
      .toBeTruthy();
    expect(getByTestId('fieldworkFreeDrawingFullscreenBrushTool_hand'))
      .toBeTruthy();
    expect(getByTestId('fieldworkFreeDrawingFullscreenResetViewport'))
      .toBeTruthy();
  });

  it('undoes and redoes full-screen pen or lasso changes', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreen'));
    fireEvent(getByTestId('fieldworkFreeDrawingFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [{
            points: [
              { pressure: 0.25, x: 100, y: 200 },
              { pressure: 0.75, x: 300, y: 400 },
            ],
            tool: 'pen',
            width: 5,
          }],
          type: 'strokes',
        }),
      },
    });

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreenUndo'));
    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreenRedo'));

    expect(handleUpdateStrokes).toHaveBeenNthCalledWith(
      2,
      '{"version":1,"strokes":[]}'
    );
    expect(JSON.parse(handleUpdateStrokes.mock.calls[2][0]).strokes[0].points)
      .toEqual([
        { pressure: 0.25, x: 100, y: 200 },
        { pressure: 0.75, x: 300, y: 400 },
      ]);
  });

  it('can start directly in the full-screen sketch canvas', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFreeDrawingPanel
        initiallyFullscreen
        onUpdateStrokes={jest.fn()}
      />
    );

    expect(getByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeTruthy();
  });

  it('reopens the full-screen canvas for each external request', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <KoreanFieldworkFreeDrawingPanel
        fullscreenRequestId={0}
        onUpdateStrokes={jest.fn()}
      />
    );

    rerender(
      <KoreanFieldworkFreeDrawingPanel
        fullscreenRequestId={1}
        onUpdateStrokes={jest.fn()}
      />
    );
    expect(getByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeTruthy();

    fireEvent.press(getByTestId('fieldworkFreeDrawingFullscreenClose'));
    expect(queryByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeNull();

    rerender(
      <KoreanFieldworkFreeDrawingPanel
        fullscreenRequestId={2}
        onUpdateStrokes={jest.fn()}
      />
    );
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
