import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import KakaoSatellitePicker from './KakaoSatellitePicker';

const mockPostMessage = jest.fn();
const mockLocationSubscriptionRemove = jest.fn();
let mockWatchPositionCallback: ((location: {
  coords: {
    accuracy: number;
    latitude: number;
    longitude: number;
  };
}) => void) | undefined;

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
  },
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      accuracy: 8,
      latitude: 36.45,
      longitude: 127.12,
    },
  })),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
  })),
  watchPositionAsync: jest.fn((_options, callback) => {
    mockWatchPositionCallback = callback;
    return Promise.resolve({ remove: mockLocationSubscriptionRemove });
  }),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        postMessage: mockPostMessage,
      }));

      return <View {...props} />;
    }
  );
  MockWebView.displayName = 'MockWebView';

  return { WebView: MockWebView };
});

describe('KakaoSatellitePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWatchPositionCallback = undefined;
  });

  it('covers the map with a full loading overlay until the drawing map is ready', () => {
    const { getByTestId, queryByTestId } = render(
      <KakaoSatellitePicker
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="js-key"
        onClose={jest.fn()}
        onPickBoundary={jest.fn()}
        visible
      />
    );

    expect(getByTestId('kakao-boundary-loading-overlay')).toBeTruthy();

    act(() => {
      fireEvent(getByTestId('kakao-satellite-picker-webview'), 'message', {
        nativeEvent: {
          data: JSON.stringify({ type: 'ready' }),
        },
      });
    });

    expect(queryByTestId('kakao-boundary-loading-overlay')).toBeNull();
  });

  it('starts with the open basemap when the Kakao JavaScript key is empty', () => {
    const { getByTestId } = render(
      <KakaoSatellitePicker
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="   "
        onClose={jest.fn()}
        onPickBoundary={jest.fn()}
        visible
      />
    );

    const webView = getByTestId('kakao-satellite-picker-webview');
    expect(webView.props.source).toEqual(expect.objectContaining({
      html: expect.stringContaining('tile.openstreetmap.org'),
      baseUrl: 'https://idai-field.local/boundary-picker/',
    }));
    expect(webView.props.source.html).toContain('World_Imagery');
    expect(webView.props.source.html).not.toContain('dapi.kakao.com');
  });

  it('shows the live device location and sends it to the WebView map', async () => {
    const { getByTestId, getByText } = render(
      <KakaoSatellitePicker
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="js-key"
        onClose={jest.fn()}
        onPickBoundary={jest.fn()}
        visible
      />
    );

    await waitFor(() => {
      expect(getByText(/현재 위치 36\.450000, 127\.120000/)).toBeTruthy();
    });

    act(() => {
      mockWatchPositionCallback?.({
        coords: {
          accuracy: 6,
          latitude: 36.451,
          longitude: 127.121,
        },
      });
    });

    await waitFor(() => {
      expect(getByText(/현재 위치 36\.451000, 127\.121000/)).toBeTruthy();
    });

    act(() => {
      fireEvent(getByTestId('kakao-satellite-picker-webview'), 'message', {
        nativeEvent: {
          data: JSON.stringify({ type: 'ready' }),
        },
      });
    });

    await waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalledWith(expect.stringContaining(
        '"type":"currentLocation"'
      ));
    });
    expect(getByTestId('kakao-boundary-live-location')).toBeTruthy();
  });

  it('passes the selected Kakao map type with picked boundaries', () => {
    const onPickBoundary = jest.fn();
    const { getByTestId } = render(
      <KakaoSatellitePicker
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="js-key"
        onClose={jest.fn()}
        onPickBoundary={onPickBoundary}
        visible
      />
    );

    act(() => {
      fireEvent(getByTestId('kakao-satellite-picker-webview'), 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'boundary',
            payload: {
              mapTypeId: 'ROADMAP',
              coordinates: [
                { latitude: 36.45, longitude: 127.12 },
                { latitude: 36.46, longitude: 127.13 },
                { latitude: 36.47, longitude: 127.14 },
              ],
            },
          }),
        },
      });
    });

    expect(onPickBoundary).toHaveBeenCalledWith(expect.objectContaining({
      mapTypeId: 'ROADMAP',
    }));
  });

  it('uses feature boundary copy when drawing a feature location', () => {
    const { getByText } = render(
      <KakaoSatellitePicker
        drawingMode="featureBoundary"
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="js-key"
        onClose={jest.fn()}
        onPickBoundary={jest.fn()}
        visible
      />
    );

    expect(getByText('유구 경계 지도에서 그리기')).toBeTruthy();
    expect(getByText(
      '유적 경계 안에서 유구의 외곽점을 찍고, 점을 끌어 옮기거나 선 중간 +로 점을 추가하세요.'
    )).toBeTruthy();
  });

  it('keeps the native map type selector in sync with the WebView map type', () => {
    const { getByTestId } = render(
      <KakaoSatellitePicker
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="js-key"
        onClose={jest.fn()}
        onPickBoundary={jest.fn()}
        visible
      />
    );

    expect(getByTestId('kakao-map-type-HYBRID').props.accessibilityState)
      .toEqual({ selected: true });
    expect(getByTestId('kakao-map-type-BLANK')).toBeTruthy();

    fireEvent.press(getByTestId('kakao-map-type-ROADMAP'));

    expect(getByTestId('kakao-map-type-ROADMAP').props.accessibilityState)
      .toEqual({ selected: true });

    act(() => {
      fireEvent(getByTestId('kakao-satellite-picker-webview'), 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'mapType',
            payload: { mapTypeId: 'SKYVIEW' },
          }),
        },
      });
    });

    expect(getByTestId('kakao-map-type-SKYVIEW').props.accessibilityState)
      .toEqual({ selected: true });

    act(() => {
      fireEvent(getByTestId('kakao-satellite-picker-webview'), 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'mapType',
            payload: { mapTypeId: 'BLANK' },
          }),
        },
      });
    });

    expect(getByTestId('kakao-map-type-BLANK').props.accessibilityState)
      .toEqual({ selected: true });
  });

  it('falls back to an open basemap drawing tool when every Kakao SDK origin is rejected', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <KakaoSatellitePicker
        initialLocation={{ latitude: 36.45, longitude: 127.12 }}
        javaScriptKey="js-key"
        onClose={jest.fn()}
        onPickBoundary={jest.fn()}
        visible
      />
    );

    for (let index = 0; index < 8; index++) {
      act(() => {
        fireEvent(getByTestId('kakao-satellite-picker-webview'), 'message', {
          nativeEvent: {
            data: JSON.stringify({
              type: 'error',
              payload: {
                message: 'denied',
                webViewBaseUrl: `origin-${index}`,
              },
            }),
          },
        });
      });
    }

    const webView = getByTestId('kakao-satellite-picker-webview');
    expect(webView.props.source).toEqual(expect.objectContaining({
      html: expect.stringContaining('조사 경계 그리기'),
      baseUrl: 'https://idai-field.local/boundary-picker/',
    }));
    expect(webView.props.source.html).toContain('tile.openstreetmap.org');
    expect(webView.props.source.html).toContain('World_Imagery');

    expect(getByText(
      '카카오 지도가 WebView 출처 제한에 막혀 공개 배경지도로 전환했습니다. 경계 그리기와 저장은 그대로 가능합니다.'
    )).toBeTruthy();
    expect(queryByTestId('kakao-boundary-retry')).toBeNull();
  });
});
