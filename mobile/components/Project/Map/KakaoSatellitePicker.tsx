import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  BoundaryDrawingMode,
  buildOpenBoundaryPickerHtml,
  buildKakaoSatellitePickerHtml,
  KakaoMapTypeId,
} from './kakao-satellite-picker-html';

export interface KakaoSatellitePickedLocation {
  accuracy?: number;
  latitude: number;
  longitude: number;
}

export interface KakaoSatellitePickedBoundary {
  center?: KakaoSatellitePickedLocation;
  coordinates: KakaoSatellitePickedLocation[];
  mapTypeId?: KakaoMapTypeId;
}

interface KakaoSatellitePickerProps {
  drawingMode?: BoundaryDrawingMode;
  initialLocation?: KakaoSatellitePickedLocation;
  javaScriptKey: string;
  onClose: () => void;
  onPickBoundary: (boundary: KakaoSatellitePickedBoundary) => void;
  visible: boolean;
}

interface BoundaryPickerCopy {
  fallbackMessage: string;
  initialMessage: string;
  loadingKakaoText: string;
  loadingOpenText: string;
  loadingTitle: string;
  loadFailureTitle: string;
  pickedMessage: string;
  title: string;
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
const OPEN_BASEMAP_WEBVIEW_BASE_URL = 'https://idai-field.local/boundary-picker/';
const KAKAO_MAP_TYPE_OPTIONS: Array<{ id: KakaoMapTypeId; label: string }> = [
  { id: 'ROADMAP', label: '일반' },
  { id: 'SKYVIEW', label: '위성' },
  { id: 'HYBRID', label: '혼합' },
  { id: 'BLANK', label: '도면' },
];
type BoundaryMapEngine = 'kakao' | 'open';
type LiveLocationStatus = 'checking' | 'tracking' | 'denied' | 'unavailable';

const BOUNDARY_PICKER_COPY: Record<BoundaryDrawingMode, BoundaryPickerCopy> = {
  surveyBoundary: {
    fallbackMessage:
      '카카오 지도가 WebView 출처 제한에 막혀 공개 배경지도로 전환했습니다. 경계 그리기와 저장은 그대로 가능합니다.',
    initialMessage:
      '지도는 배경입니다. 꼭짓점을 찍고, 점을 끌어 옮기거나 선 중간 +로 점을 추가하세요.',
    loadingKakaoText:
      '카카오 배경지도 위에 조사 지역 꼭짓점을 찍을 수 있게 준비하고 있습니다.',
    loadingOpenText:
      '공개 배경지도 위에 조사 지역 꼭짓점을 찍을 수 있게 준비하고 있습니다.',
    loadingTitle: '조사 경계 지도를 준비 중입니다',
    loadFailureTitle: '조사 경계 지도를 열지 못했습니다',
    pickedMessage: '선택한 꼭짓점으로 조사 경계를 저장합니다.',
    title: '조사 경계 지도에서 그리기',
  },
  featureBoundary: {
    fallbackMessage:
      '카카오 지도가 WebView 출처 제한에 막혀 공개 배경지도로 전환했습니다. 유구 경계 그리기와 저장은 그대로 가능합니다.',
    initialMessage:
      '유적 경계 안에서 유구의 외곽점을 찍고, 점을 끌어 옮기거나 선 중간 +로 점을 추가하세요.',
    loadingKakaoText:
      '카카오 배경지도 위에 유구 외곽점을 찍을 수 있게 준비하고 있습니다.',
    loadingOpenText:
      '공개 배경지도 위에 유구 외곽점을 찍을 수 있게 준비하고 있습니다.',
    loadingTitle: '유구 경계 지도를 준비 중입니다',
    loadFailureTitle: '유구 경계 지도를 열지 못했습니다',
    pickedMessage: '선택한 꼭짓점으로 유구 경계를 저장합니다.',
    title: '유구 경계 지도에서 그리기',
  },
};

const KakaoSatellitePicker: React.FC<KakaoSatellitePickerProps> = ({
  drawingMode = 'surveyBoundary',
  initialLocation,
  javaScriptKey,
  onClose,
  onPickBoundary,
  visible,
}) => {
  const copy = BOUNDARY_PICKER_COPY[drawingMode]
    ?? BOUNDARY_PICKER_COPY.surveyBoundary;
  const webViewRef = useRef<any>(null);
  const latitude = initialLocation?.latitude ?? DEFAULT_LOCATION.latitude;
  const longitude = initialLocation?.longitude ?? DEFAULT_LOCATION.longitude;
  const [message, setMessage] = useState(
    '지도는 배경입니다. 꼭짓점을 찍고, 점을 끌어 옮기거나 선 중간 +로 점을 추가하세요.'
  );
  const [baseUrlIndex, setBaseUrlIndex] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string>();
  const [mapEngine, setMapEngine] = useState<BoundaryMapEngine>('kakao');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [selectedMapTypeId, setSelectedMapTypeId] = useState<KakaoMapTypeId>('HYBRID');
  const [initialMapTypeId, setInitialMapTypeId] = useState<KakaoMapTypeId>('HYBRID');
  const [liveLocation, setLiveLocation] = useState<KakaoSatellitePickedLocation>();
  const [liveLocationStatus, setLiveLocationStatus] =
    useState<LiveLocationStatus>('checking');
  const webViewBaseUrl =
    mapEngine === 'kakao'
      ? KAKAO_MAP_WEBVIEW_BASE_URLS[baseUrlIndex] ?? KAKAO_MAP_WEBVIEW_BASE_URLS[0]
      : OPEN_BASEMAP_WEBVIEW_BASE_URL;
  const mapHtml = useMemo(
    () => mapEngine === 'kakao'
      ? buildKakaoSatellitePickerHtml({
          drawingMode,
          javaScriptKey,
          latitude,
          longitude,
          mapTypeId: initialMapTypeId,
          webViewBaseUrl,
        })
      : buildOpenBoundaryPickerHtml({
          drawingMode,
          latitude,
          longitude,
          mapTypeId: initialMapTypeId,
        }),
    [
      drawingMode,
      initialMapTypeId,
      javaScriptKey,
      latitude,
      longitude,
      mapEngine,
      webViewBaseUrl,
    ]
  );

  useEffect(() => {
    if (visible) {
      setBaseUrlIndex(0);
      setIsMapReady(false);
      setMapLoadError(undefined);
      setMapEngine('kakao');
      setInitialMapTypeId('HYBRID');
      setSelectedMapTypeId('HYBRID');
      setLiveLocation(initialLocation);
      setLiveLocationStatus('checking');
      setReloadNonce((value) => value + 1);
      setMessage(copy.initialMessage);
    }
  }, [copy.initialMessage, javaScriptKey, visible]);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | undefined;

    const updateLiveLocation = (coords: Location.LocationObjectCoords) => {
      const nextLocation = getLocationFromCoords(coords);
      if (!nextLocation) {
        setLiveLocationStatus('unavailable');
        return;
      }

      setLiveLocation(nextLocation);
      setLiveLocationStatus('tracking');
    };

    const startLocationWatch = async () => {
      setLiveLocationStatus('checking');

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

        if (status !== 'granted') {
          setLiveLocationStatus('denied');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isMounted) return;

        updateLiveLocation(currentLocation.coords);

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 2,
            timeInterval: 3000,
          },
          (nextLocation) => {
            if (isMounted) updateLiveLocation(nextLocation.coords);
          }
        );
        if (!isMounted) {
          subscription.remove();
          return;
        }
        locationSubscription = subscription;
      } catch (error) {
        console.warn('Unable to watch boundary picker location', error);
        if (isMounted) setLiveLocationStatus('unavailable');
      }
    };

    void startLocationWatch();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !isMapReady || !liveLocation) return;

    webViewRef.current?.postMessage(JSON.stringify({
      type: 'currentLocation',
      payload: liveLocation,
    }));
  }, [isMapReady, liveLocation, visible]);

  const showMapLoadFailure = (diagnostic?: Record<string, unknown>) => {
    setMapLoadError(getOpenBasemapFailureMessage(diagnostic));
    setIsMapReady(false);
  };

  const retryWithNextWebViewOrigin = (diagnostic?: Record<string, unknown>) => {
    if (mapEngine !== 'kakao') return false;
    if (baseUrlIndex >= KAKAO_MAP_WEBVIEW_BASE_URLS.length - 1) return false;

    setMapLoadError(undefined);
    setIsMapReady(false);
    setBaseUrlIndex(baseUrlIndex + 1);
    return true;
  };

  const switchToOpenBasemap = () => {
    setMapEngine('open');
    setBaseUrlIndex(0);
    setIsMapReady(false);
    setMapLoadError(undefined);
    setReloadNonce((value) => value + 1);
    setMessage(copy.fallbackMessage);
  };

  const handleMapLoadProblem = (diagnostic?: Record<string, unknown>) => {
    if (mapEngine === 'kakao') {
      if (retryWithNextWebViewOrigin(diagnostic)) return;
      switchToOpenBasemap();
      return;
    }

    showMapLoadFailure(diagnostic);
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
        setIsMapReady(true);
        setMapLoadError(undefined);
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
          setMessage(copy.pickedMessage);
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
        handleMapLoadProblem(diagnostic);
      }
    } catch {
      setMessage('지도 메시지를 읽지 못했습니다.');
    }
  };

  const retryLoadingMap = () => {
    setMapEngine('kakao');
    setBaseUrlIndex(0);
    setIsMapReady(false);
    setMapLoadError(undefined);
    setReloadNonce((value) => value + 1);
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
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.liveLocationBox}>
              <Text
                style={styles.liveLocationText}
                testID="kakao-boundary-live-location"
              >
                {getLiveLocationText(liveLocationStatus, liveLocation)}
              </Text>
            </View>
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
            const diagnostic = {
              message: event.nativeEvent.description,
              webViewBaseUrl,
            };
            if (retryWithNextWebViewOrigin(diagnostic)) return;
            handleMapLoadProblem(diagnostic);
          }}
          onHttpError={(event) => {
            const diagnostic = {
              statusCode: event.nativeEvent.statusCode,
              webViewBaseUrl,
            };
            handleMapLoadProblem(diagnostic);
          }}
          onMessage={onMessage}
          key={`${mapEngine}-${webViewBaseUrl}-${reloadNonce}`}
          setSupportMultipleWindows={false}
          source={{ html: mapHtml, baseUrl: webViewBaseUrl }}
          style={styles.webView}
          testID="kakao-satellite-picker-webview"
        />
        {(!isMapReady || mapLoadError) && (
          <View style={styles.loadingOverlay} testID="kakao-boundary-loading-overlay">
            <View style={styles.loadingPanel}>
              {mapLoadError ? (
                <>
                  <Text style={styles.loadingTitle}>{copy.loadFailureTitle}</Text>
                  <Text style={styles.loadingText}>{mapLoadError}</Text>
                  <View style={styles.loadingActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={retryLoadingMap}
                      style={styles.loadingPrimaryButton}
                      testID="kakao-boundary-retry"
                    >
                      <Text style={styles.loadingPrimaryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={onClose}
                      style={styles.loadingSecondaryButton}
                    >
                      <Text style={styles.loadingSecondaryButtonText}>닫기</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <ActivityIndicator color="#24495d" size="large" />
                  <Text style={styles.loadingTitle}>{copy.loadingTitle}</Text>
                  <Text style={styles.loadingText}>
                    {mapEngine === 'open'
                      ? copy.loadingOpenText
                      : copy.loadingKakaoText}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
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
  liveLocationBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveLocationText: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: '#eef2f4',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  loadingPanel: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#cbd5df',
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 460,
    padding: 24,
    width: '100%',
  },
  loadingPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#24495d',
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 18,
  },
  loadingPrimaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingSecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5df',
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 18,
  },
  loadingSecondaryButtonText: {
    color: '#20313a',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingText: {
    color: '#526272',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingTitle: {
    color: '#20313a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
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

const getLocationFromCoords = (
  coords: Location.LocationObjectCoords
): KakaoSatellitePickedLocation | undefined => {
  const { accuracy, latitude, longitude } = coords;

  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? {
        ...(typeof accuracy === 'number' && Number.isFinite(accuracy)
          ? { accuracy }
          : {}),
        latitude,
        longitude,
      }
    : undefined;
};

const getLiveLocationText = (
  status: LiveLocationStatus,
  location: KakaoSatellitePickedLocation | undefined
): string => {
  if (status === 'denied') {
    return '현재 위치 권한이 꺼져 있습니다.';
  }

  if (status === 'unavailable') {
    return '현재 위치를 확인하지 못했습니다.';
  }

  if (!location) {
    return '현재 위치 확인 중...';
  }

  const accuracyText = typeof location.accuracy === 'number'
    ? ` · ±${Math.round(location.accuracy)}m`
    : '';

  return `현재 위치 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}${accuracyText}`;
};

const isPickedLocation = (
  value: KakaoSatellitePickedLocation | undefined
): value is KakaoSatellitePickedLocation => value !== undefined;

const getPickedMapTypeId = (
  value: unknown
): KakaoMapTypeId | undefined => {
  return value === 'ROADMAP' || value === 'SKYVIEW' || value === 'HYBRID' || value === 'BLANK'
    ? value
    : undefined;
};

const getDiagnosticPayload = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : undefined;

const getOpenBasemapFailureMessage = (
  diagnostic: Record<string, unknown> | undefined
): string => {
  const detail = getNonEmptyString(diagnostic?.message)
    ?? getNonEmptyString(diagnostic?.detail)
    ?? getNonEmptyString(diagnostic?.statusCode);
  return detail
    ? `공개 배경지도도 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요. 마지막 오류: ${detail}`
    : '공개 배경지도도 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요.';
};

const getNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : undefined;
