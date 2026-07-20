import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system';
import React from 'react';
import { Image } from 'react-native';
import FieldworkPhotoAnnotationPanel from './FieldworkPhotoAnnotationPanel';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('expo-file-system', () => ({
  EncodingType: {
    Base64: 'base64',
  },
  readAsStringAsync: jest.fn(() => new Promise(() => undefined)),
}));

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

describe('FieldworkPhotoAnnotationPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('stores normalized strokes drawn over a captured photo', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkPhotoAnnotationCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 32, locationY: 24 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 160, locationY: 120 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 120 },
    });

    expect(handleUpdateStrokes).toHaveBeenCalledWith(
      expect.stringContaining('"strokes"')
    );
    const payload = JSON.parse(handleUpdateStrokes.mock.calls[0][0]);
    const [stroke] = payload.strokes;
    expect(payload.version).toBe(1);
    expect(stroke.points[0]).toEqual({ x: 1000, y: 1000 });
    expect(stroke.points[stroke.points.length - 1]).toEqual({ x: 5000, y: 5000 });
    expect(stroke.points.length).toBeGreaterThan(2);
  });

  it('lets finger drags yield to scrolling and cancels unfinished preview ink', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={handleUpdateStrokes}
      />
    );
    const canvas = getByTestId('fieldworkPhotoAnnotationCanvas');

    expect(canvas.props.onStartShouldSetResponderCapture({
      nativeEvent: { pointerType: 'touch' },
    })).toBe(false);
    expect(canvas.props.onStartShouldSetResponder({
      nativeEvent: { pointerType: 'touch' },
    })).toBe(false);
    expect(canvas.props.onStartShouldSetResponderCapture({
      nativeEvent: { pointerType: 'pen' },
    })).toBe(true);

    fireEvent(canvas, 'touchStart', {
      nativeEvent: {
        locationX: 32,
        locationY: 24,
        pointerType: 'touch',
      },
    });
    fireEvent(canvas, 'touchMove', {
      nativeEvent: {
        locationX: 32,
        locationY: 80,
        pointerType: 'touch',
      },
    });
    fireEvent(canvas, 'touchEnd', {
      nativeEvent: {
        locationX: 32,
        locationY: 80,
        pointerType: 'touch',
      },
    });

    expect(handleUpdateStrokes).not.toHaveBeenCalled();
    expect(queryByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeNull();
  });

  it('does not show technical stroke and point counts in the photo header', () => {
    const { queryByText } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={jest.fn()}
        strokesValue={{
          version: 1,
          strokes: [{ points: [{ x: 1000, y: 1000 }] }],
        }}
      />
    );

    expect(queryByText(/\uD68D\s*\d/)).toBeNull();
    expect(queryByText(/\uC810\s*\d/)).toBeNull();
  });

  it('opens a full-screen drawing canvas from a single photo tap', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkPhotoAnnotationCanvas');
    fireEvent(canvas, 'touchStart', {
      nativeEvent: {
        locationX: 32,
        locationY: 24,
        pointerType: 'touch',
      },
    });
    fireEvent(canvas, 'touchEnd', {
      nativeEvent: {
        locationX: 32,
        locationY: 24,
        pointerType: 'touch',
      },
    });

    expect(handleUpdateStrokes).not.toHaveBeenCalled();
    expect(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeTruthy();

    fireEvent.press(getByTestId('fieldworkPhotoAnnotationFullscreenClose'));

    expect(queryByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeNull();
  });

  it('opens full-screen sample mode from a soil layer eyedropper request', async () => {
    const handleSamplePoint = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={handleSamplePoint}
        onUpdateStrokes={jest.fn()}
        sampleRequestKey={1}
        sampleRequestLabel="2층"
      />
    );

    await waitFor(() =>
      expect(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeTruthy()
    );
    expect(getByTestId('fieldworkPhotoAnnotationStatus').props.children)
      .toBe('2층 토색을 찍을 지점을 사진에서 누르세요.');

    fireEvent(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: { x: 5000, y: 5000 },
          type: 'samplePoint',
        }),
      },
    });

    expect(handleSamplePoint).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId('fieldworkPhotoAnnotationSampleConfirm')).toBeTruthy()
    );
    fireEvent.press(getByTestId('fieldworkPhotoAnnotationSampleConfirm'));

    await waitFor(() =>
      expect(handleSamplePoint).toHaveBeenCalledWith({ x: 5000, y: 5000 })
    );
  });

  it('clears and samples selected points when used for soil profile photos', async () => {
    const handleUpdateStrokes = jest.fn();
    const handleSamplePoint = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={handleSamplePoint}
        onUpdateStrokes={handleUpdateStrokes}
        sampleButtonLabel="토색 찍기"
        strokesValue={{
          version: 1,
          strokes: [{ points: [{ x: 1000, y: 1000 }] }],
        }}
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoAnnotationClear'));
    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    fireEvent(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: { x: 8000, y: 5000 },
          type: 'samplePoint',
        }),
      },
    });

    expect(handleUpdateStrokes).toHaveBeenCalledWith('{"version":1,"strokes":[]}');
    expect(handleSamplePoint).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId('fieldworkPhotoAnnotationSampleConfirm')).toBeTruthy()
    );
    fireEvent.press(getByTestId('fieldworkPhotoAnnotationSampleConfirm'));

    await waitFor(() =>
      expect(handleSamplePoint).toHaveBeenCalledWith({ x: 8000, y: 5000 })
    );
  });

  it('shows a live Munsell preview while the eyedropper moves', () => {
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={jest.fn()}
        onUpdateStrokes={jest.fn()}
        sampleButtonLabel="토색 찍기"
        sampleRequestLabel="3층"
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    fireEvent(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: {
            munsell: '10YR 4/3',
            point: { x: 5000, y: 5000 },
            rgb: { red: 111, green: 87, blue: 61 },
          },
          type: 'samplePreview',
        }),
      },
    });

    expect(getByTestId('fieldworkPhotoAnnotationFullscreenStatus').props.children)
      .toBe('3층 10YR 4/3 · RGB 111/87/61');
  });

  it('keeps the last valid eyedropper sample when touch release has no coordinates', () => {
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={jest.fn()}
        onUpdateStrokes={jest.fn()}
        sampleButtonLabel="토색 찍기"
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    const fullscreenCanvas = getByTestId('fieldworkPhotoAnnotationFullscreenCanvas');
    const html = fullscreenCanvas.props.source.html as string;

    expect(html).toContain(
      'if(!source||!Number.isFinite(source.clientX)||!Number.isFinite(source.clientY)) return undefined;'
    );
    expect(html).toContain(
      'if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)) return undefined;'
    );
    expect(html).toContain(
      'const sample=point?updateSample(point,true):activeSample&&activeSample.screenPoint?updateSample(activeSample.screenPoint,true):activeSample;'
    );
  });

  it('loads local photos into the full-screen sampler as data URIs', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      'prepared-local-photo'
    );

    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.png"
        onSamplePoint={jest.fn()}
        onUpdateStrokes={jest.fn()}
        sampleButtonLabel="sample"
      />
    );

    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    await waitFor(() =>
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        'file:///tablet/profile.png',
        { encoding: FileSystem.EncodingType.Base64 }
      )
    );
    await waitFor(() => {
      const fullscreenCanvas = getByTestId(
        'fieldworkPhotoAnnotationFullscreenCanvas'
      );
      const html = fullscreenCanvas.props.source.html as string;

      expect(html).toContain('data:image/png;base64,prepared-local-photo');
    });
  });

  it('averages a small canvas area for eyedropper RGB sampling', () => {
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={jest.fn()}
        onUpdateStrokes={jest.fn()}
        sampleButtonLabel="sample"
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    const fullscreenCanvas = getByTestId('fieldworkPhotoAnnotationFullscreenCanvas');
    const html = fullscreenCanvas.props.source.html as string;

    expect(html).toContain(
      'Math.min(sampleCanvas.width,sampleCanvas.height)*0.015'
    );
    expect(html).toContain('Math.round(red/count)');
    expect(html).not.toContain('getImageData(x,y,1,1)');
  });

  it('throttles eyedropper color analysis while dragging', () => {
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={jest.fn()}
        onUpdateStrokes={jest.fn()}
        sampleButtonLabel="sample"
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    const fullscreenCanvas = getByTestId('fieldworkPhotoAnnotationFullscreenCanvas');
    const html = fullscreenCanvas.props.source.html as string;

    expect(html).toContain('samplePreviewIntervalMs=140');
    expect(html).toContain('function shouldAnalyzeSamplePreview(screenPoint)');
    expect(html).toContain('updateSample(point,false)');
    expect(html).toContain('updateSample(point,true)');
  });

  it('passes the canvas-sampled RGB with the selected photo point', async () => {
    const handleSamplePoint = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/profile.jpg"
        onSamplePoint={handleSamplePoint}
        onUpdateStrokes={jest.fn()}
        sampleButtonLabel="토색 찍기"
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    fireEvent(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: {
            munsell: '2.5Y 5/3',
            rgb: { red: 139, green: 128, blue: 88 },
            x: 8000,
            y: 5000,
          },
          type: 'samplePoint',
        }),
      },
    });

    expect(handleSamplePoint).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId('fieldworkPhotoAnnotationSampleConfirm')).toBeTruthy()
    );
    fireEvent.press(getByTestId('fieldworkPhotoAnnotationSampleConfirm'));

    await waitFor(() =>
      expect(handleSamplePoint).toHaveBeenCalledWith({
        munsell: '2.5Y 5/3',
        rgb: { red: 139, green: 128, blue: 88 },
        x: 8000,
        y: 5000,
      })
    );
  });

  it('stores full-screen photo drawing strokes with brush width', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoAnnotationBrush_8'));
    fireEvent.press(getByTestId('fieldworkPhotoAnnotationFullscreen'));
    fireEvent(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [
            {
              points: [{ x: 1000, y: 1000 }, { x: 5000, y: 5000 }],
              width: 8,
            },
          ],
          type: 'strokes',
        }),
      },
    });

    expect(JSON.parse(handleUpdateStrokes.mock.calls[0][0]).strokes[0].width)
      .toBe(8);
  });

  it('stores selected photo annotation color and opens full-screen for erasing', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoAnnotationBrushColor_1'));

    const canvas = getByTestId('fieldworkPhotoAnnotationCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 32, locationY: 24 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 160, locationY: 120 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 120 },
    });

    expect(JSON.parse(handleUpdateStrokes.mock.calls[0][0]).strokes[0])
      .toMatchObject({
        color: '#dc2626',
        tool: 'pen',
      });

    fireEvent.press(getByTestId('fieldworkPhotoAnnotationBrushTool_eraser'));
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 32 },
    });

    expect(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeTruthy();
  });

  it('samples against the displayed image frame when the photo is letterboxed', async () => {
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => {
      success(100, 200);
    });
    const handleSamplePoint = jest.fn();
    const { getByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/portrait-profile.jpg"
        onSamplePoint={handleSamplePoint}
        onUpdateStrokes={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('fieldworkPhotoSamplePointButton'));
    fireEvent(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: { x: 5000, y: 5000 },
          type: 'samplePoint',
        }),
      },
    });

    expect(handleSamplePoint).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId('fieldworkPhotoAnnotationSampleConfirm')).toBeTruthy()
    );
    fireEvent.press(getByTestId('fieldworkPhotoAnnotationSampleConfirm'));

    await waitFor(() =>
      expect(handleSamplePoint).toHaveBeenCalledWith({ x: 5000, y: 5000 })
    );
  });

});
