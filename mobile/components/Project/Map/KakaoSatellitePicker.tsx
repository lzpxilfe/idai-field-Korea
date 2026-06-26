import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { buildKakaoSatellitePickerHtml } from './kakao-satellite-picker-html';

export interface KakaoSatellitePickedLocation {
  latitude: number;
  longitude: number;
}

export interface KakaoSatellitePickedBoundary {
  center?: KakaoSatellitePickedLocation;
  coordinates: KakaoSatellitePickedLocation[];
}

interface KakaoSatellitePickerProps {
  initialLocation?: KakaoSatellitePickedLocation;
  javaScriptKey: string;
  onClose: () => void;
  onPickBoundary: (boundary: KakaoSatellitePickedBoundary) => void;
  visible: boolean;
}

const DEFAULT_LOCATION = {
  latitude: 37.5665,
  longitude: 126.9780,
};
const KAKAO_MAP_WEBVIEW_BASE_URLS = [
  'http://localhost:8080/',
  'https://localhost/',
  'http://localhost/',
];

const KakaoSatellitePicker: React.FC<KakaoSatellitePickerProps> = ({
  initialLocation,
  javaScriptKey,
  onClose,
  onPickBoundary,
  visible,
}) => {
  const [message, setMessage] = useState(
    '위성지도에서 조사 경계 꼭짓점을 차례대로 눌러 주세요.'
  );
  const [baseUrlIndex, setBaseUrlIndex] = useState(0);
  const webViewBaseUrl =
    KAKAO_MAP_WEBVIEW_BASE_URLS[baseUrlIndex] ?? KAKAO_MAP_WEBVIEW_BASE_URLS[0];
  const mapHtml = useMemo(
    () => buildKakaoSatellitePickerHtml({
      javaScriptKey,
      latitude: initialLocation?.latitude ?? DEFAULT_LOCATION.latitude,
      longitude: initialLocation?.longitude ?? DEFAULT_LOCATION.longitude,
    }),
    [initialLocation, javaScriptKey]
  );

  useEffect(() => {
    if (visible) setBaseUrlIndex(0);
  }, [javaScriptKey, visible]);

  const retryWithNextWebViewOrigin = () => {
    if (baseUrlIndex >= KAKAO_MAP_WEBVIEW_BASE_URLS.length - 1) return false;

    const nextBaseUrl = KAKAO_MAP_WEBVIEW_BASE_URLS[baseUrlIndex + 1];
    setMessage(
      `카카오 지도 SDK가 현재 WebView 출처에서 거부되었습니다. ${nextBaseUrl} 경로로 다시 시도합니다.`
    );
    setBaseUrlIndex(baseUrlIndex + 1);
    return true;
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setMessage('카카오 위성지도가 열렸습니다. 경계 꼭짓점을 3개 이상 찍고 저장하세요.');
        return;
      }

      if (data.type === 'boundary') {
        const coordinates = getPickedCoordinates(data.payload?.coordinates);
        if (coordinates.length >= 3) {
          setMessage('선택한 꼭짓점으로 조사 경계를 저장합니다.');
          onPickBoundary({
            coordinates,
            center: getPickedLocation(data.payload?.center),
          });
        }
        return;
      }

      if (data.type === 'error') {
        if (retryWithNextWebViewOrigin()) return;
        setMessage(data.payload?.message ?? '카카오 지도를 불러오지 못했습니다.');
      }
    } catch {
      setMessage('카카오 지도 메시지를 읽지 못했습니다.');
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>위성지도에서 경계 그리기</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
            testID="kakao-satellite-picker-close"
          >
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onError={(event) => {
            if (retryWithNextWebViewOrigin()) return;
            setMessage(
              event.nativeEvent.description
                ? `카카오 지도 WebView 오류: ${event.nativeEvent.description}`
                : '카카오 지도 WebView를 불러오지 못했습니다.'
            );
          }}
          onHttpError={(event) => {
            if (retryWithNextWebViewOrigin()) return;
            setMessage(
              `카카오 지도 요청이 HTTP ${event.nativeEvent.statusCode} 응답을 받았습니다. JavaScript 키와 http://localhost:8080 또는 https://localhost 도메인 등록을 확인하세요.`
            );
          }}
          onMessage={onMessage}
          key={webViewBaseUrl}
          source={{ html: mapHtml, baseUrl: webViewBaseUrl }}
          style={styles.webView}
          testID="kakao-satellite-picker-webview"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#24495d',
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    backgroundColor: '#eef2f4',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#ccd6df',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerText: {
    flex: 1,
  },
  message: {
    color: '#526272',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  title: {
    color: '#20313a',
    fontSize: 17,
    fontWeight: '800',
  },
  webView: {
    flex: 1,
  },
});

export default KakaoSatellitePicker;

const getPickedCoordinates = (value: unknown): KakaoSatellitePickedLocation[] =>
  Array.isArray(value)
    ? value.map(getPickedLocation).filter(isPickedLocation)
    : [];

const getPickedLocation = (
  value: unknown
): KakaoSatellitePickedLocation | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;

  const location = value as Record<string, unknown>;
  const latitude = location.latitude;
  const longitude = location.longitude;

  return typeof latitude === 'number'
    && Number.isFinite(latitude)
    && typeof longitude === 'number'
    && Number.isFinite(longitude)
    ? {
        latitude,
        longitude,
      }
    : undefined;
};

const isPickedLocation = (
  value: KakaoSatellitePickedLocation | undefined
): value is KakaoSatellitePickedLocation => value !== undefined;
