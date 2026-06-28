import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import KakaoSatellitePicker from './KakaoSatellitePicker';

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        postMessage: jest.fn(),
      }));

      return <View {...props} />;
    }),
  };
});

describe('KakaoSatellitePicker', () => {
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
  });

  it('opens a public Kakao map fallback when every SDK origin is rejected', () => {
    const { getByTestId, getByText } = render(
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
    expect(webView.props.source).toEqual({
      uri: 'https://map.kakao.com/link/map/36.45,127.12',
    });

    act(() => {
      fireEvent(webView, 'loadEnd');
    });

    expect(getByText(
      '카카오 지도 SDK가 WebView 출처에서 거부되어 공개 카카오 지도를 열었습니다. Kakao Developers JavaScript SDK 도메인에 origin-7 등록 후 다시 시도하세요. 경계 저장은 SDK 지도가 열릴 때 사용할 수 있습니다.'
    )).toBeTruthy();
  });
});
