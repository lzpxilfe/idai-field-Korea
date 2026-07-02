import { fireEvent, render, waitFor } from '@testing-library/react-native';
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

describe('FieldworkPhotoAnnotationPanel', () => {
  afterEach(() => {
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

  it('opens a full-screen drawing canvas from a single photo tap', () => {
    const handleUpdateStrokes = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <FieldworkPhotoAnnotationPanel
        imageUri="file:///tablet/photo.jpg"
        onUpdateStrokes={handleUpdateStrokes}
      />
    );

    const canvas = getByTestId('fieldworkPhotoAnnotationCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 32, locationY: 24 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 32, locationY: 24 },
    });

    expect(handleUpdateStrokes).not.toHaveBeenCalled();
    expect(getByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeTruthy();

    fireEvent.press(getByTestId('fieldworkPhotoAnnotationFullscreenClose'));

    expect(queryByTestId('fieldworkPhotoAnnotationFullscreenCanvas')).toBeNull();
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
    fireEvent(getByTestId('fieldworkPhotoAnnotationCanvas'), 'responderGrant', {
      nativeEvent: { locationX: 256, locationY: 120 },
    });

    expect(handleUpdateStrokes).toHaveBeenCalledWith('{"version":1,"strokes":[]}');
    await waitFor(() =>
      expect(handleSamplePoint).toHaveBeenCalledWith({ x: 8000, y: 5000 })
    );
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
    fireEvent(getByTestId('fieldworkPhotoAnnotationCanvas'), 'responderGrant', {
      nativeEvent: { locationX: 160, locationY: 120 },
    });

    await waitFor(() =>
      expect(handleSamplePoint).toHaveBeenCalledWith({ x: 5000, y: 5000 })
    );
  });

});
