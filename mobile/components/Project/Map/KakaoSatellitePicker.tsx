import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  buildKakaoSatellitePickerHtml,
  KakaoMapTypeId,
} from './kakao-satellite-picker-html';

export interface KakaoSatellitePickedLocation {
  latitude: number;
  longitude: number;
}

export interface KakaoSatellitePickedBoundary {
  center?: KakaoSatellitePickedLocation;
  coordinates: KakaoSatellitePickedLocation[];
  mapTypeId?: KakaoMapTypeId;
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
  'http://127.0.0.1:8080/',
  'http://localhost:8081/',
  'http://127.0.0.1:8081/',
  'https://localhost/',
  'https://127.0.0.1/',
  'http://localhost/',
  'http://127.0.0.1/',
];
const KAKAO_MAP_TYPE_OPTIONS: Array<{ id: KakaoMapTypeId; label: string }> = [
  { id: 'ROADMAP', label: '일반' },
  { id: 'SKYVIEW', label: '위성' },
  { id: 'HYBRID', label: '혼합' },
];

const KakaoSatellitePicker: React.FC<KakaoSatellitePickerProps> = ({
  initialLocation,
  javaScriptKey,
  onClose,
  onPickBoundary,
  visible,
}) => {
  const webViewRef = useRef<any>(null);
  const latitude = initialLocation?.latitude ?? DEFAULT_LOCATION.latitude;
  const longitude = initialLocation?.longitude ?? DEFAULT_LOCATION.longitude;
  const [message, setMessage] = useState(
    '지도에서 조사 경계 꼭짓점을 차례대로 눌러 주세요.'
  );
  const [baseUrlIndex, setBaseUrlIndex] = useState(0);
  const [isPublicMapFallbackOpen, setIsPublicMapFallbackOpen] = useState(false);
  const [selectedMapTypeId, setSelectedMapTypeId] = useState<KakaoMapTypeId>('HYBRID');
  const [initialMapTypeId, setInitialMapTypeId] = useState<KakaoMapTypeId>('HYBRID');
  const webViewBaseUrl =
    KAKAO_MAP_WEBVIEW_BASE_URLS[baseUrlIndex] ?? KAKAO_MAP_WEBVIEW_BASE_URLS[0];
  const publicMapUrl = getKakaoPublicMapUrl(latitude, longitude);
  const mapHtml = useMemo(
    () => buildKakaoSatellitePickerHtml({
      javaScriptKey,
      latitude,
      longitude,
      mapTypeId: initialMapTypeId,
      webViewBaseUrl,
    }),
    [initialMapTypeId, javaScriptKey, latitude, longitude, webViewBaseUrl]
  );

  useEffect(() => {
    if (visible) {
      setBaseUrlIndex(0);
      setIsPublicMapFallbackOpen(false);
      setInitialMapTypeId('HYBRID');
      setSelectedMapTypeId('HYBRID');
    }
  }, [javaScriptKey, visible]);

  const openPublicMapFallback = (diagnostic?: Record<string, unknown>) => {
    setMessage(getPublicMapFallbackMessage(diagnostic, webViewBaseUrl));
    setIsPublicMapFallbackOpen(true);
  };

  const retryWithNextWebViewOrigin = (diagnostic?: Record<string, unknown>) => {
    if (baseUrlIndex >= KAKAO_MAP_WEBVIEW_BASE_URLS.length - 1) return false;

    const nextBaseUrl = KAKAO_MAP_WEBVIEW_BASE_URLS[baseUrlIndex + 1];
    setMessage(getRetryMessage(diagnostic, webViewBaseUrl, nextBaseUrl));
    setBaseUrlIndex(baseUrlIndex + 1);
    return true;
  };

  const onPickLocation = (boundary: KakaoSatellitePickedBoundary) => {
    onPickBoundary(boundary);
  };

  const selectMapType = (mapTypeId: KakaoMapTypeId) => {
    setSelectedMapTypeId(mapTypeId);
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'setMapType',
      payload: { mapTypeId },
    }));
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setMessage('카카오 지도가 열렸습니다. 지도 종류를 고르고 경계 꼭짓점을 3개 이상 찍어 저장하세요.');
        return;
      }

      if (data.type === 'mapType') {
        const mapTypeId = getPickedMapTypeId(data.payload?.mapTypeId);
        if (mapTypeId) setSelectedMapTypeId(mapTypeId);
        return;
      }

      if (data.type === 'boundary') {
        const coordinates = getPickedCoordinates(data.payload?.coordinates);
        if (coordinates.length >= 3) {
          setMessage('선택한 꼭짓점으로 조사 경계를 저장합니다.');
          onPickLocation({
            coordinates,
            center: getPickedLocation(data.payload?.center),
            mapTypeId: getPickedMapTypeId(data.payload?.mapTypeId),
          });
        }
        return;
      }

      if (data.type === 'error') {
        const diagnostic = getDiagnosticPayload(data.payload);
        if (retryWithNextWebViewOrigin(diagnostic)) return;
        openPublicMapFallback(diagnostic);
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
            <Text style={styles.title}>카카오 지도에서 경계 그리기</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.mapTypeControls}>
              {KAKAO_MAP_TYPE_OPTIONS.map((option) => {
                const selected = option.id === selectedMapTypeId;

                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.id}
                    onPress={() => selectMapType(option.id)}
                    style={[
                      styles.mapTypeButton,
                      selected && styles.mapTypeButtonSelected,
                    ]}
                    testID={`kakao-map-type-${option.id}`}
                  >
                    <Text style={[
                      styles.mapTypeButtonText,
                      selected && styles.mapTypeButtonTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
          ref={webViewRef}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onError={(event) => {
            if (isPublicMapFallbackOpen) {
              setMessage(
                event.nativeEvent.description
                  ? `공개 카카오 지도 WebView 오류: ${event.nativeEvent.description}`
                  : '공개 카카오 지도를 불러오지 못했습니다.'
              );
              return;
            }
            const diagnostic = {
              message: event.nativeEvent.description,
              webViewBaseUrl,
            };
            if (retryWithNextWebViewOrigin(diagnostic)) return;
            openPublicMapFallback(diagnostic);
          }}
          onHttpError={(event) => {
            if (isPublicMapFallbackOpen) {
              setMessage(`공개 카카오 지도 요청이 HTTP ${event.nativeEvent.statusCode} 응답을 받았습니다.`);
              return;
            }
            const diagnostic = {
              statusCode: event.nativeEvent.statusCode,
              webViewBaseUrl,
            };
            if (retryWithNextWebViewOrigin(diagnostic)) return;
            openPublicMapFallback(diagnostic);
          }}
          onMessage={onMessage}
          key={isPublicMapFallbackOpen ? publicMapUrl : webViewBaseUrl}
          onLoadEnd={() => {
            if (isPublicMapFallbackOpen) {
              setMessage((currentMessage) =>
                currentMessage.includes('Kakao Developers')
                  ? currentMessage
                  : '공개 카카오 지도가 열렸습니다. 경계 저장은 SDK 도메인 등록 후 다시 시도하세요.'
              );
            }
          }}
          setSupportMultipleWindows={false}
          source={isPublicMapFallbackOpen
            ? { uri: publicMapUrl }
            : { html: mapHtml, baseUrl: webViewBaseUrl }}
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
  mapTypeButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5df',
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 10,
  },
  mapTypeButtonSelected: {
    backgroundColor: '#24495d',
    borderColor: '#24495d',
  },
  mapTypeButtonText: {
    color: '#20313a',
    fontSize: 12,
    fontWeight: '700',
  },
  mapTypeButtonTextSelected: {
    color: '#fff',
  },
  mapTypeControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
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

const getKakaoPublicMapUrl = (
  latitude: number,
  longitude: number
): string => {
  const safeLatitude = Number.isFinite(latitude)
    ? latitude
    : DEFAULT_LOCATION.latitude;
  const safeLongitude = Number.isFinite(longitude)
    ? longitude
    : DEFAULT_LOCATION.longitude;

  return `https://map.kakao.com/link/map/${safeLatitude},${safeLongitude}`;
};

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

const getPickedMapTypeId = (
  value: unknown
): KakaoMapTypeId | undefined => {
  return value === 'ROADMAP' || value === 'SKYVIEW' || value === 'HYBRID'
    ? value
    : undefined;
};

const getDiagnosticPayload = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : undefined;

const getRetryMessage = (
  diagnostic: Record<string, unknown> | undefined,
  attemptedBaseUrl: string,
  nextBaseUrl: string
): string => {
  const attemptedOrigin = getDiagnosticOrigin(diagnostic) ?? attemptedBaseUrl;
  return `카카오 지도 SDK가 ${attemptedOrigin} 출처에서 거부되었습니다. ${nextBaseUrl} 경로로 다시 시도합니다.`;
};

const getPublicMapFallbackMessage = (
  diagnostic: Record<string, unknown> | undefined,
  attemptedBaseUrl: string
): string => {
  const attemptedOrigin = getDiagnosticOrigin(diagnostic) ?? attemptedBaseUrl;
  return `카카오 지도 SDK가 WebView 출처에서 거부되어 공개 카카오 지도를 열었습니다. Kakao Developers JavaScript SDK 도메인에 ${attemptedOrigin} 등록 후 다시 시도하세요. 경계 저장은 SDK 지도가 열릴 때 사용할 수 있습니다.`;
};

const getDiagnosticOrigin = (
  diagnostic: Record<string, unknown> | undefined
): string | undefined => {
  const origin = getNonEmptyString(diagnostic?.origin);
  if (origin && origin !== 'null') return origin;

  const hrefOrigin = getOriginFromUrl(getNonEmptyString(diagnostic?.href));
  if (hrefOrigin) return hrefOrigin;

  const baseUrlOrigin = getOriginFromUrl(getNonEmptyString(diagnostic?.webViewBaseUrl));
  if (baseUrlOrigin) return baseUrlOrigin;

  return getNonEmptyString(diagnostic?.webViewBaseUrl);
};

const getOriginFromUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
};

const getNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
