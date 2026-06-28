import {
  getKakaoSatelliteBasemapStatusMessage,
  KAKAO_SATELLITE_BASEMAP_TITLE,
} from './korean-fieldwork-map-provider-status';

describe('korean-fieldwork-map-provider-status', () => {
  it('names the satellite basemap alert', () => {
    expect(KAKAO_SATELLITE_BASEMAP_TITLE).toBe('카카오 지도 연결');
  });

  it('explains that a Kakao REST key is for local APIs, not map display', () => {
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoLocalRestApiKey: 'rest-key',
    })).toContain('REST 키');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoLocalRestApiKey: 'rest-key',
    })).toContain('주소 검색과 좌표 변환용');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoLocalRestApiKey: 'rest-key',
    })).toContain('JavaScript 키 또는 Android Native App 키');
  });

  it('recognizes a stored Kakao JavaScript map key', () => {
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoMapJavaScriptKey: 'js-key',
    })).toContain('일반지도, 위성지도, 하이브리드');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoMapJavaScriptKey: 'js-key',
    })).toContain('JavaScript 키 WebView 경로를 우선 사용');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoMapJavaScriptKey: 'js-key',
    })).toContain('SHP/DXF/CSV는 데스크톱에서 가져온 뒤 동기화');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoMapJavaScriptKey: 'js-key',
    })).toContain('3개 이상의 꼭짓점');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoMapJavaScriptKey: 'js-key',
    })).toContain('화면에 표시되는 WebView 출처');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoMapJavaScriptKey: 'js-key',
    })).toContain('Kakao Developers');
  });

  it('recognizes a stored Kakao native app key', () => {
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoNativeAppKey: 'native-key',
    })).toContain('JavaScript 키 WebView 경로를 우선 사용');
    expect(getKakaoSatelliteBasemapStatusMessage({
      kakaoNativeAppKey: 'native-key',
    })).toContain('SHP/DXF/CSV는 데스크톱에서 가져온 뒤 동기화');
  });
});
