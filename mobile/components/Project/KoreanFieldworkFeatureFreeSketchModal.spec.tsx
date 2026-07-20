import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkFeatureFreeSketchModal
  from './KoreanFieldworkFeatureFreeSketchModal';

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

describe('KoreanFieldworkFeatureFreeSketchModal', () => {
  it('keeps edits local until close and then saves only the parent feature', async () => {
    const feature = createFeature();
    const onClose = jest.fn();
    const onSave = jest.fn(async (updatedDocument: Document) => updatedDocument);
    const { getByTestId } = render(
      <KoreanFieldworkFeatureFreeSketchModal
        document={feature}
        isVisible
        onClose={onClose}
        onSave={onSave}
      />
    );
    const canvas = getByTestId('featureParentSketchFullscreenCanvas');
    const html = canvas.props.source.html as string;

    expect(html).toContain('"guidePaths"');
    expect(html).toContain('"strokeColor":"#f97316"');
    expect(onSave).not.toHaveBeenCalled();

    fireEvent(canvas, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [{
            color: '#111827',
            points: [
              { x: 1400, y: 2200 },
              { x: 5600, y: 6400 },
            ],
            tool: 'pen',
            width: 5,
          }],
          type: 'strokes',
        }),
      },
    });

    expect(onSave).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('featureParentSketchFullscreenClose'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const updatedDocument = onSave.mock.calls[0][0];
    expect(updatedDocument.resource.id).toBe(feature.resource.id);
    expect(updatedDocument.resource.featureLocationSketch)
      .toBe(feature.resource.featureLocationSketch);
    expect(updatedDocument.resource.featureFreeDrawingStrokes)
      .toContain('"x":1400');
    expect(updatedDocument.resource.featureFreeDrawingUpdatedAt)
      .toEqual(expect.any(String));
    expect(onClose).toHaveBeenCalledWith(updatedDocument);
  });

  it('closes without updating the parent when no strokes changed', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn(async (updatedDocument: Document) => updatedDocument);
    const { getByTestId } = render(
      <KoreanFieldworkFeatureFreeSketchModal
        document={createFeature()}
        isVisible
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.press(getByTestId('featureParentSketchFullscreenClose'));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stays open and reports an error when the parent save fails', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn(async () => {
      throw new Error('revision conflict');
    });
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkFeatureFreeSketchModal
        document={createFeature()}
        isVisible
        onClose={onClose}
        onSave={onSave}
      />
    );
    const canvas = getByTestId('featureParentSketchFullscreenCanvas');
    fireEvent(canvas, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [{
            points: [{ x: 1000, y: 1000 }, { x: 2000, y: 2000 }],
            tool: 'pen',
          }],
          type: 'strokes',
        }),
      },
    });
    fireEvent.press(getByTestId('featureParentSketchFullscreenClose'));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(getByTestId('featureParentSketchFullscreenStatus')).toBeTruthy());
    expect(queryByTestId('featureParentSketchFullscreenCanvas')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

const createFeature = (): Document => ({
  _id: 'feature-1',
  created: { date: new Date(0), user: 'test' },
  modified: [],
  resource: {
    id: 'feature-1',
    identifier: '1호 수혈',
    category: 'Feature',
    relations: {},
    featureLocationSketch: JSON.stringify({
      shape: 'oval',
      center: { x: 18, y: 24 },
      points: [{ x: 18, y: 24 }],
      rotation: 20,
      scale: 80,
    }),
    featureFreeDrawingStrokes: JSON.stringify({
      version: 1,
      strokes: [],
    }),
  },
});
