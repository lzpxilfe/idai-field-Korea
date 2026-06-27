import { buildKakaoSatellitePickerHtml } from './kakao-satellite-picker-html';

describe('buildKakaoSatellitePickerHtml', () => {
  it('loads the Kakao map script with the JavaScript key and hybrid map type', () => {
    const html = buildKakaoSatellitePickerHtml({
      javaScriptKey: 'js key/with spaces',
      latitude: 36.12,
      longitude: 127.45,
    });

    expect(html).toContain('dapi.kakao.com/v2/maps/sdk.js');
    expect(html).toContain('appkey=js%20key%2Fwith%20spaces');
    expect(html).toContain("var currentMapType = 'HYBRID'");
    expect(html).toContain('kakao.maps.MapTypeId[currentMapType]');
    expect(html).toContain('new kakao.maps.LatLng(36.12, 127.45)');
  });

  it('renders map type controls and posts the selected map type with saved boundaries', () => {
    const html = buildKakaoSatellitePickerHtml({
      javaScriptKey: 'js-key',
      latitude: 36.12,
      longitude: 127.45,
      mapTypeId: 'ROADMAP',
    });

    expect(html).toContain('data-map-type="ROADMAP"');
    expect(html).toContain('data-map-type="SKYVIEW"');
    expect(html).toContain("var currentMapType = 'ROADMAP'");
    expect(html).toContain('map.setMapTypeId(kakao.maps.MapTypeId[currentMapType])');
    expect(html).toContain('mapTypeId: currentMapType');
  });

  it('posts drawn WGS84 boundary coordinates back to React Native', () => {
    const html = buildKakaoSatellitePickerHtml({
      javaScriptKey: 'js-key',
      latitude: Number.NaN,
      longitude: Number.NaN,
    });

    expect(html).toContain('window.ReactNativeWebView.postMessage');
    expect(html).toContain('window.onerror');
    expect(html).toContain("post('boundary'");
    expect(html).toContain('points.length < 3');
    expect(html).toContain('latitude: point.getLat()');
    expect(html).toContain('longitude: point.getLng()');
    expect(html).toContain('new kakao.maps.LatLng(37.5665, 126.978)');
  });

  it('explains Kakao SDK key and domain failures inside the WebView', () => {
    const html = buildKakaoSatellitePickerHtml({
      javaScriptKey: 'js-key',
      latitude: 37,
      longitude: 127,
    });

    expect(html).toContain('JavaScript 키와 Kakao Developers의 http://localhost:8080 또는 https://localhost 도메인 등록');
    expect(html).toContain('카카오 지도 SDK가 로드됐지만 지도 객체를 찾지 못했습니다');
  });
});
