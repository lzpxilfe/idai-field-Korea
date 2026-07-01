import {
  buildKakaoSatellitePickerHtml,
  buildOpenBoundaryPickerHtml,
} from './kakao-satellite-picker-html';

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
    expect(html).toContain('kakao.maps.MapTypeId.HYBRID');
    expect(html).toContain('map.setMapTypeId(kakaoMapTypeIds[currentMapType])');
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
    expect(html).toContain('map.setMapTypeId(kakaoMapTypeIds[currentMapType])');
    expect(html).toContain('mapTypeId: currentMapType');
    expect(html).toContain("data.type === 'setMapType'");
    expect(html).toContain('setMapType(data.payload && data.payload.mapTypeId)');
    expect(html).toContain("data.type === 'currentLocation'");
    expect(html).toContain('updateCurrentLocation(data.payload)');
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

  it('can switch the drawing copy from survey boundary to feature boundary', () => {
    const kakaoHtml = buildKakaoSatellitePickerHtml({
      drawingMode: 'featureBoundary',
      javaScriptKey: 'js-key',
      latitude: 36.12,
      longitude: 127.45,
    });
    const openHtml = buildOpenBoundaryPickerHtml({
      drawingMode: 'featureBoundary',
      latitude: 36.12,
      longitude: 127.45,
    });

    expect(kakaoHtml).toContain('유구 경계 그리기');
    expect(kakaoHtml).toContain('유구 경계 저장');
    expect(kakaoHtml).toContain('유구 경계점 {count}개');
    expect(kakaoHtml).toContain('새 유구 경계점 추가');
    expect(openHtml).toContain('유구 경계 그리기');
    expect(openHtml).toContain('유구 경계 저장');
  });

  it('supports editing boundaries by moving points and inserting midpoint handles', () => {
    const kakaoHtml = buildKakaoSatellitePickerHtml({
      javaScriptKey: 'js-key',
      latitude: 36.12,
      longitude: 127.45,
    });
    const openHtml = buildOpenBoundaryPickerHtml({
      latitude: 36.12,
      longitude: 127.45,
    });

    expect(kakaoHtml).toContain('marker.setDraggable(true)');
    expect(kakaoHtml).toContain('points[index] = marker.getPosition()');
    expect(kakaoHtml).toContain("kakao.maps.event.addListener(marker, 'dragstart'");
    expect(kakaoHtml).toContain('startDragPreview(index, marker)');
    expect(kakaoHtml).toContain('syncDraggingPoint()');
    expect(kakaoHtml).toContain('clearMidpointHandles()');
    expect(kakaoHtml).toContain('updateBoundaryPreview()');
    expect(kakaoHtml).toContain('점을 끌어 옮기면 경계 범위도 같이 움직입니다.');
    expect(kakaoHtml).toContain('new kakao.maps.CustomOverlay');
    expect(kakaoHtml).toContain('points.splice(insertIndex, 0, position)');
    expect(kakaoHtml).toContain('current-location-marker');
    expect(kakaoHtml).toContain('currentAccuracyCircle');
    expect(kakaoHtml).toContain('map.setCenter(position)');
    expect(kakaoHtml).toContain('새 경계점 추가');

    expect(openHtml).toContain('draggable: true');
    expect(openHtml).toContain('points[index] = event.target.getLatLng()');
    expect(openHtml).toContain("}).on('drag', function(event)");
    expect(openHtml).toContain('midpointMarkersLayer.clearLayers()');
    expect(openHtml).toContain('updateBoundaryPreview()');
    expect(openHtml).toContain('점을 끌어 옮기면 경계 범위도 같이 움직입니다.');
    expect(openHtml).toContain("className: 'boundary-midpoint-marker'");
    expect(openHtml).toContain('points.splice(insertIndex, 0, position)');
    expect(openHtml).toContain("className: 'current-location-marker'");
    expect(openHtml).toContain('currentAccuracyCircle');
    expect(openHtml).toContain('map.setView(position');
    expect(openHtml).toContain('새 경계점 추가');
  });

  it('explains Kakao SDK key and domain failures inside the WebView', () => {
    const html = buildKakaoSatellitePickerHtml({
      javaScriptKey: 'js-key',
      latitude: 37,
      longitude: 127,
    });

    expect(html).toContain('origin: window.location && window.location.origin');
    expect(html).toContain('sdkUrl: "https://dapi.kakao.com/v2/maps/sdk.js?appkey=js-key&autoload=false"');
    expect(html).toContain("failure: 'sdk-script-error'");
    expect(html).toContain('WebView 출처를 Kakao Developers JavaScript SDK 도메인에 등록');
    expect(html).toContain('카카오 지도 SDK가 로드됐지만 지도 객체를 찾지 못했습니다');
  });

  it('builds an open basemap boundary picker when Kakao domains reject WebView', () => {
    const html = buildOpenBoundaryPickerHtml({
      latitude: 36.12,
      longitude: 127.45,
      mapTypeId: 'SKYVIEW',
    });

    expect(html).toContain('leaflet@1.9.4');
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('World_Imagery');
    expect(html).toContain('maxNativeZoom: 18');
    expect(html).toContain('maxZoom: 22');
    expect(html).toContain("var currentMapType = 'SKYVIEW'");
    expect(html).toContain('post(\'boundary\'');
    expect(html).toContain('latitude: point.lat');
    expect(html).toContain('longitude: point.lng');
    expect(html).toContain("data.type === 'setMapType'");
    expect(html).toContain('setMapType(data.payload && data.payload.mapTypeId)');
    expect(html).toContain("data.type === 'currentLocation'");
    expect(html).toContain('updateCurrentLocation(data.payload)');
  });
});
