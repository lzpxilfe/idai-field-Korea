import { MapProviderSettings } from '@/models/preferences';

export const KAKAO_SATELLITE_BASEMAP_TITLE = '카카오 지도 연결';

export const getKakaoSatelliteBasemapStatusMessage = (
  mapSettings: Partial<MapProviderSettings>
): string => {
  const hasLocalRestKey = hasValue(mapSettings.kakaoLocalRestApiKey);
  const hasJavaScriptKey = hasValue(mapSettings.kakaoMapJavaScriptKey);
  const hasNativeAppKey = hasValue(mapSettings.kakaoNativeAppKey);

  if (hasJavaScriptKey) {
    return '카카오 지도 JavaScript 키가 저장되어 있습니다. 태블릿 지도는 JavaScript 키 WebView 경로를 우선 사용합니다. 지도 화면에서 일반지도, 위성지도, 하이브리드를 선택한 뒤 3개 이상의 꼭짓점을 찍어 조사 경계를 저장할 수 있습니다. SDK가 막히면 지도 화면에 표시되는 WebView 출처를 Kakao Developers의 JavaScript SDK 도메인에 등록해 주세요. SHP/DXF/CSV는 데스크톱에서 가져온 뒤 동기화하세요.';
  }

  if (hasNativeAppKey) {
    return '카카오 Native App 키가 저장되어 있습니다. 현재 태블릿 지도는 JavaScript 키 WebView 경로를 우선 사용합니다. Native 키는 앱 설정에 보관하고, SHP/DXF/CSV는 데스크톱에서 가져온 뒤 동기화하세요.';
  }

  if (hasLocalRestKey) {
    return '카카오 Local REST 키는 저장되어 있습니다. 이 키는 주소 검색과 좌표 변환용입니다. 지도 화면에는 카카오 지도 JavaScript 키 또는 Android Native App 키가 필요합니다.';
  }

  return '태블릿 지도 배경은 Google·Mapbox·네이버·카카오 같은 지도 API 키나 오프라인 타일 패키지가 필요합니다. 카카오는 지도 화면에 REST 키가 아니라 JavaScript 키를 우선 사용하고, Android Native App 키는 네이티브 지도 연동용으로 보관합니다.';
};

const hasValue = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;
