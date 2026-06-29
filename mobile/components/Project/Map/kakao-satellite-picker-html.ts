interface KakaoSatellitePickerHtmlOptions {
  javaScriptKey: string;
  latitude: number;
  longitude: number;
  mapTypeId?: KakaoMapTypeId;
  webViewBaseUrl?: string;
}

interface OpenBoundaryPickerHtmlOptions {
  latitude: number;
  longitude: number;
  mapTypeId?: KakaoMapTypeId;
}

export type KakaoMapTypeId = 'ROADMAP' | 'SKYVIEW' | 'HYBRID';

export const buildKakaoSatellitePickerHtml = ({
  javaScriptKey,
  latitude,
  longitude,
  mapTypeId = 'HYBRID',
  webViewBaseUrl,
}: KakaoSatellitePickerHtmlOptions): string => {
  const safeKey = encodeURIComponent(javaScriptKey.trim());
  const safeLatitude = Number.isFinite(latitude) ? latitude : 37.5665;
  const safeLongitude = Number.isFinite(longitude) ? longitude : 126.9780;
  const safeMapTypeId = getSafeMapTypeId(mapTypeId);
  const safeWebViewBaseUrl = JSON.stringify(webViewBaseUrl ?? '');
  const kakaoSdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${safeKey}&autoload=false`;
  const safeKakaoSdkUrl = JSON.stringify(kakaoSdkUrl);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    .banner {
      background: rgba(21, 31, 38, 0.88);
      border-radius: 4px;
      color: white;
      display: none;
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      left: 12px;
      max-width: calc(100% - 24px);
      padding: 8px 10px;
      position: absolute;
      right: 12px;
      top: 12px;
      z-index: 10;
    }
    .map-type-control {
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(30, 41, 59, 0.16);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.16);
      display: none;
      gap: 6px;
      left: 12px;
      padding: 6px;
      position: absolute;
      top: 66px;
      z-index: 10;
    }
    .toolbar {
      align-items: center;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(30, 41, 59, 0.16);
      border-radius: 6px;
      bottom: 12px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.18);
      box-sizing: border-box;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      left: 12px;
      max-width: calc(100% - 24px);
      padding: 8px;
      position: absolute;
      right: 12px;
      z-index: 10;
    }
    .status {
      color: #1f2937;
      flex: 1;
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-width: 210px;
    }
    .status strong {
      color: #20313a;
      display: block;
      font-size: 14px;
      margin-bottom: 2px;
    }
    button {
      appearance: none;
      border: 0;
      border-radius: 4px;
      color: white;
      font: 700 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-height: 38px;
      padding: 0 12px;
    }
    button.secondary {
      background: #475467;
    }
    button.primary {
      background: #175cd3;
    }
    button.map-type {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #1f2937;
      min-height: 32px;
      padding: 0 9px;
    }
    button.map-type.active {
      background: #24495d;
      border-color: #24495d;
      color: white;
    }
    button:disabled {
      background: #98a2b3;
      color: #eef2f4;
    }
    .midpoint-handle {
      align-items: center;
      background: #ffffff;
      border: 2px solid #175cd3;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
      color: #175cd3;
      cursor: pointer;
      display: flex;
      font: 800 18px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      height: 26px;
      justify-content: center;
      min-height: 0;
      padding: 0;
      width: 26px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-type-control">
    <button id="mapTypeRoadmap" class="map-type" data-map-type="ROADMAP" type="button">일반</button>
    <button id="mapTypeSkyview" class="map-type" data-map-type="SKYVIEW" type="button">위성</button>
    <button id="mapTypeHybrid" class="map-type" data-map-type="HYBRID" type="button">하이브리드</button>
  </div>
  <div class="banner">지도에서 조사 경계 꼭짓점을 차례대로 누르세요. 3개 이상 찍으면 경계를 저장할 수 있습니다.</div>
  <div class="toolbar">
    <div id="status" class="status"><strong>조사 경계 그리기</strong>지도를 눌러 첫 꼭짓점을 추가하세요. 찍은 점은 끌어서 옮길 수 있습니다.</div>
    <button id="undo" class="secondary" type="button" disabled>되돌리기</button>
    <button id="reset" class="secondary" type="button" disabled>초기화</button>
    <button id="save" class="primary" type="button" disabled>경계 저장</button>
  </div>
  <script>
    function post(type, payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: type,
        payload: Object.assign({
          href: window.location && window.location.href,
          origin: window.location && window.location.origin,
          protocol: window.location && window.location.protocol,
          host: window.location && window.location.host,
          referrer: document.referrer,
          sdkUrl: ${safeKakaoSdkUrl},
          webViewBaseUrl: ${safeWebViewBaseUrl}
        }, payload || {})
      }));
    }

    window.onerror = function(message, source, line, column) {
      post('error', {
        failure: 'runtime-error',
        message: '카카오 지도 SDK 실행 중 오류가 발생했습니다. 메시지에 표시된 WebView 출처를 Kakao Developers JavaScript SDK 도메인에 등록했는지 확인하세요.',
        detail: String(message || '') + ' ' + String(source || '') + ':' + String(line || '') + ':' + String(column || '')
      });
      return false;
    };

    function loadScript() {
      var script = document.createElement('script');
      script.src = ${safeKakaoSdkUrl};
      script.onload = function() {
        if (!window.kakao || !kakao.maps || !kakao.maps.load) {
          post('error', {
            failure: 'missing-map-object',
            message: '카카오 지도 SDK가 로드됐지만 지도 객체를 찾지 못했습니다. JavaScript 키 종류와 WebView 출처 등록을 확인하세요.'
          });
          return;
        }
        kakao.maps.load(initMap);
      };
      script.onerror = function() {
        post('error', {
          failure: 'sdk-script-error',
          message: '카카오 지도 SDK 요청이 거부되었거나 네트워크에서 차단되었습니다. 메시지에 표시된 WebView 출처를 Kakao Developers JavaScript SDK 도메인에 등록했는지 확인하세요.'
        });
      };
      document.head.appendChild(script);
    }

    function initMap() {
      try {
        var center = new kakao.maps.LatLng(${safeLatitude}, ${safeLongitude});
        var map = new kakao.maps.Map(document.getElementById('map'), {
          center: center,
          level: 3
        });
        var currentMapType = '${safeMapTypeId}';
        var kakaoMapTypeIds = {
          ROADMAP: kakao.maps.MapTypeId.ROADMAP,
          SKYVIEW: kakao.maps.MapTypeId.SKYVIEW,
          HYBRID: kakao.maps.MapTypeId.HYBRID
        };
        map.setMapTypeId(kakaoMapTypeIds[currentMapType]);

        var points = [];
        var markers = [];
        var midpointOverlays = [];
        var statusEl = document.getElementById('status');
        var undoEl = document.getElementById('undo');
        var resetEl = document.getElementById('reset');
        var saveEl = document.getElementById('save');
        var mapTypeButtons = Array.prototype.slice.call(
          document.querySelectorAll('[data-map-type]')
        );
        var outline = new kakao.maps.Polyline({
          map: map,
          path: [],
          strokeWeight: 4,
          strokeColor: '#175cd3',
          strokeOpacity: 0.95,
          strokeStyle: 'solid'
        });
        var polygon = new kakao.maps.Polygon({
          map: map,
          path: [],
          strokeWeight: 2,
          strokeColor: '#175cd3',
          strokeOpacity: 0.95,
          fillColor: '#60a5fa',
          fillOpacity: 0.24
        });

        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
          addPoint(mouseEvent.latLng);
        });

        undoEl.addEventListener('click', undoPoint);
        resetEl.addEventListener('click', resetPoints);
        saveEl.addEventListener('click', saveBoundary);
        mapTypeButtons.forEach(function(button) {
          button.addEventListener('click', function() {
            setMapType(button.getAttribute('data-map-type'));
          });
        });

        function setMapType(nextMapType) {
          if (!kakaoMapTypeIds[nextMapType]) return;
          currentMapType = nextMapType;
          map.setMapTypeId(kakaoMapTypeIds[currentMapType]);
          mapTypeButtons.forEach(function(button) {
            button.className = button.getAttribute('data-map-type') === currentMapType
              ? 'map-type active'
              : 'map-type';
          });
          post('mapType', { mapTypeId: currentMapType });
        }

        function handleNativeMessage(event) {
          try {
            var data = typeof event.data === 'string'
              ? JSON.parse(event.data)
              : event.data;
            if (!data || data.type !== 'setMapType') return;
            setMapType(data.payload && data.payload.mapTypeId);
          } catch (error) {}
        }

        window.addEventListener('message', handleNativeMessage);
        document.addEventListener('message', handleNativeMessage);

        function addPoint(latLng) {
          points.push(latLng);
          redraw();
        }

        function undoPoint() {
          if (points.length === 0) return;
          points.pop();
          redraw();
        }

        function resetPoints() {
          points = [];
          redraw();
        }

        function redraw() {
          markers.forEach(function(marker) {
            marker.setMap(null);
          });
          markers = [];
          midpointOverlays.forEach(function(overlay) {
            overlay.setMap(null);
          });
          midpointOverlays = [];
          points.forEach(function(point, index) {
            var marker = new kakao.maps.Marker({
              draggable: true,
              map: map,
              position: point,
              title: '경계점 ' + (index + 1)
            });
            marker.setDraggable(true);
            kakao.maps.event.addListener(marker, 'dragend', function() {
              points[index] = marker.getPosition();
              redraw();
            });
            markers.push(marker);
          });
          addSegmentInsertHandles();
          outline.setPath(points);
          polygon.setPath(points.length >= 3 ? points : []);
          undoEl.disabled = points.length === 0;
          resetEl.disabled = points.length === 0;
          saveEl.disabled = points.length < 3;
          statusEl.innerHTML = points.length < 3
            ? '<strong>조사 경계 그리기</strong>경계점 ' + points.length + '개. 점은 끌어서 옮길 수 있습니다. 최소 3개가 필요합니다.'
            : '<strong>조사 경계 그리기</strong>경계점 ' + points.length + '개. 점을 끌어 옮기거나 선 중간 +로 추가한 뒤 저장하세요.';
        }

        function addSegmentInsertHandles() {
          if (points.length < 2) return;
          for (var index = 0; index < points.length - 1; index += 1) {
            addMidpointHandle(getMidpoint(points[index], points[index + 1]), index + 1);
          }
          if (points.length >= 3) {
            addMidpointHandle(getMidpoint(points[points.length - 1], points[0]), points.length);
          }
        }

        function addMidpointHandle(position, insertIndex) {
          var handle = document.createElement('button');
          handle.className = 'midpoint-handle';
          handle.type = 'button';
          handle.setAttribute('aria-label', '새 경계점 추가');
          handle.textContent = '+';
          handle.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            points.splice(insertIndex, 0, position);
            redraw();
          });
          midpointOverlays.push(new kakao.maps.CustomOverlay({
            content: handle,
            map: map,
            position: position,
            xAnchor: 0.5,
            yAnchor: 0.5
          }));
        }

        function getMidpoint(first, second) {
          return new kakao.maps.LatLng(
            (first.getLat() + second.getLat()) / 2,
            (first.getLng() + second.getLng()) / 2
          );
        }

        function saveBoundary() {
          if (points.length < 3) return;
          var coordinates = points.map(function(point) {
            return {
              latitude: point.getLat(),
              longitude: point.getLng()
            };
          });
          post('boundary', {
            coordinates: coordinates,
            center: getCenter(coordinates),
            mapTypeId: currentMapType
          });
        }

        function getCenter(coordinates) {
          var latitude = 0;
          var longitude = 0;
          coordinates.forEach(function(coordinate) {
            latitude += coordinate.latitude;
            longitude += coordinate.longitude;
          });
          return {
            latitude: latitude / coordinates.length,
            longitude: longitude / coordinates.length
          };
        }

        redraw();
        setMapType(currentMapType);
        post('ready');
      } catch (error) {
        post('error', { message: error && error.message ? error.message : String(error) });
      }
    }

    loadScript();
  </script>
</body>
</html>`;
};

const getSafeMapTypeId = (mapTypeId: KakaoMapTypeId): KakaoMapTypeId => {
  return ['ROADMAP', 'SKYVIEW', 'HYBRID'].includes(mapTypeId)
    ? mapTypeId
    : 'HYBRID';
};

export const buildOpenBoundaryPickerHtml = ({
  latitude,
  longitude,
  mapTypeId = 'HYBRID',
}: OpenBoundaryPickerHtmlOptions): string => {
  const safeLatitude = Number.isFinite(latitude) ? latitude : 37.5665;
  const safeLongitude = Number.isFinite(longitude) ? longitude : 126.9780;
  const safeMapTypeId = getSafeMapTypeId(mapTypeId);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    crossorigin=""
  />
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    body {
      background: #eef2f4;
      overflow: hidden;
    }
    .toolbar {
      align-items: center;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(30, 41, 59, 0.16);
      border-radius: 6px;
      bottom: 12px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.18);
      box-sizing: border-box;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      left: 12px;
      max-width: calc(100% - 24px);
      padding: 8px;
      position: absolute;
      right: 12px;
      z-index: 900;
    }
    .status {
      color: #1f2937;
      flex: 1;
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-width: 210px;
    }
    .status strong {
      color: #20313a;
      display: block;
      font-size: 14px;
      margin-bottom: 2px;
    }
    button {
      appearance: none;
      border: 0;
      border-radius: 4px;
      color: white;
      font: 700 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-height: 38px;
      padding: 0 12px;
    }
    button.secondary {
      background: #475467;
    }
    button.primary {
      background: #175cd3;
    }
    button:disabled {
      background: #98a2b3;
      color: #eef2f4;
    }
    .boundary-point-marker span {
      align-items: center;
      background: #ffffff;
      border: 2px solid #175cd3;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
      color: #1f2937;
      cursor: grab;
      display: flex;
      font: 800 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      height: 26px;
      justify-content: center;
      width: 26px;
    }
    .boundary-midpoint-marker span {
      align-items: center;
      background: #ffffff;
      border: 2px solid #175cd3;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
      color: #175cd3;
      display: flex;
      font: 800 18px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      height: 24px;
      justify-content: center;
      width: 24px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="toolbar">
    <div id="status" class="status"><strong>조사 경계 그리기</strong>공개 배경지도를 눌러 첫 꼭짓점을 추가하세요. 찍은 점은 끌어서 옮길 수 있습니다.</div>
    <button id="undo" class="secondary" type="button" disabled>되돌리기</button>
    <button id="reset" class="secondary" type="button" disabled>초기화</button>
    <button id="save" class="primary" type="button" disabled>경계 저장</button>
  </div>
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    crossorigin=""
  ></script>
  <script>
    function post(type, payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: type,
        payload: Object.assign({
          href: window.location && window.location.href,
          origin: window.location && window.location.origin,
          provider: 'open-basemap'
        }, payload || {})
      }));
    }

    window.onerror = function(message, source, line, column) {
      post('error', {
        failure: 'open-basemap-runtime-error',
        message: '공개 배경지도 실행 중 오류가 발생했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요.',
        detail: String(message || '') + ' ' + String(source || '') + ':' + String(line || '') + ':' + String(column || '')
      });
      return false;
    };

    function startOpenBoundaryMap() {
      if (!window.L) {
        post('error', {
          failure: 'open-basemap-script-error',
          message: '공개 배경지도 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요.'
        });
        return;
      }

      var map = L.map('map', {
        attributionControl: true,
        zoomControl: true
      }).setView([${safeLatitude}, ${safeLongitude}], 17);
      var currentMapType = '${safeMapTypeId}';
      var activeLayers = [];
      var roadmapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });
      var imageryLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      });
      var labelLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Labels &copy; Esri',
        maxZoom: 19
      });
      var points = [];
      var markersLayer = L.layerGroup().addTo(map);
      var outline = L.polyline([], {
        color: '#175cd3',
        opacity: 0.95,
        weight: 4
      }).addTo(map);
      var polygon = L.polygon([], {
        color: '#175cd3',
        fillColor: '#60a5fa',
        fillOpacity: 0.24,
        opacity: 0.95,
        weight: 2
      }).addTo(map);
      var statusEl = document.getElementById('status');
      var undoEl = document.getElementById('undo');
      var resetEl = document.getElementById('reset');
      var saveEl = document.getElementById('save');

      function setMapType(nextMapType) {
        if (nextMapType !== 'ROADMAP' && nextMapType !== 'SKYVIEW' && nextMapType !== 'HYBRID') return;
        activeLayers.forEach(function(layer) {
          map.removeLayer(layer);
        });
        activeLayers = nextMapType === 'ROADMAP'
          ? [roadmapLayer]
          : nextMapType === 'SKYVIEW'
            ? [imageryLayer]
            : [imageryLayer, labelLayer];
        activeLayers.forEach(function(layer) {
          layer.addTo(map);
        });
        currentMapType = nextMapType;
        post('mapType', { mapTypeId: currentMapType });
      }

      function handleNativeMessage(event) {
        try {
          var data = typeof event.data === 'string'
            ? JSON.parse(event.data)
            : event.data;
          if (!data || data.type !== 'setMapType') return;
          setMapType(data.payload && data.payload.mapTypeId);
        } catch (error) {}
      }

      window.addEventListener('message', handleNativeMessage);
      document.addEventListener('message', handleNativeMessage);

      map.on('click', function(event) {
        addPoint(event.latlng);
      });
      undoEl.addEventListener('click', function() {
        if (points.length === 0) return;
        points.pop();
        redraw();
      });
      resetEl.addEventListener('click', function() {
        points = [];
        redraw();
      });
      saveEl.addEventListener('click', saveBoundary);

      function addPoint(latLng) {
        points.push(latLng);
        redraw();
      }

      function redraw() {
        markersLayer.clearLayers();
        points.forEach(function(point, index) {
          L.marker([point.lat, point.lng], {
            draggable: true,
            icon: createPointIcon(index + 1),
            title: '경계점 ' + (index + 1)
          }).on('dragend', function(event) {
            points[index] = event.target.getLatLng();
            redraw();
          }).addTo(markersLayer);
        });
        addSegmentInsertHandles();
        outline.setLatLngs(points);
        polygon.setLatLngs(points.length >= 3 ? [points] : []);
        undoEl.disabled = points.length === 0;
        resetEl.disabled = points.length === 0;
        saveEl.disabled = points.length < 3;
        statusEl.innerHTML = points.length < 3
          ? '<strong>조사 경계 그리기</strong>경계점 ' + points.length + '개. 점은 끌어서 옮길 수 있습니다. 최소 3개가 필요합니다.'
          : '<strong>조사 경계 그리기</strong>경계점 ' + points.length + '개. 점을 끌어 옮기거나 선 중간 +로 추가한 뒤 저장하세요.';
      }

      function addSegmentInsertHandles() {
        if (points.length < 2) return;
        for (var index = 0; index < points.length - 1; index += 1) {
          addMidpointHandle(getMidpoint(points[index], points[index + 1]), index + 1);
        }
        if (points.length >= 3) {
          addMidpointHandle(getMidpoint(points[points.length - 1], points[0]), points.length);
        }
      }

      function addMidpointHandle(position, insertIndex) {
        L.marker([position.lat, position.lng], {
          icon: createMidpointIcon(),
          keyboard: false,
          title: '새 경계점 추가'
        }).on('click', function(event) {
          if (event.originalEvent) L.DomEvent.stop(event.originalEvent);
          points.splice(insertIndex, 0, position);
          redraw();
        }).addTo(markersLayer);
      }

      function getMidpoint(first, second) {
        return L.latLng(
          (first.lat + second.lat) / 2,
          (first.lng + second.lng) / 2
        );
      }

      function createPointIcon(label) {
        return L.divIcon({
          className: 'boundary-point-marker',
          html: '<span>' + label + '</span>',
          iconAnchor: [14, 14],
          iconSize: [28, 28]
        });
      }

      function createMidpointIcon() {
        return L.divIcon({
          className: 'boundary-midpoint-marker',
          html: '<span>+</span>',
          iconAnchor: [12, 12],
          iconSize: [24, 24]
        });
      }

      function saveBoundary() {
        if (points.length < 3) return;
        var coordinates = points.map(function(point) {
          return {
            latitude: point.lat,
            longitude: point.lng
          };
        });
        post('boundary', {
          coordinates: coordinates,
          center: getCenter(coordinates),
          mapTypeId: currentMapType
        });
      }

      function getCenter(coordinates) {
        var latitude = 0;
        var longitude = 0;
        coordinates.forEach(function(coordinate) {
          latitude += coordinate.latitude;
          longitude += coordinate.longitude;
        });
        return {
          latitude: latitude / coordinates.length,
          longitude: longitude / coordinates.length
        };
      }

      setMapType(currentMapType);
      redraw();
      setTimeout(function() {
        map.invalidateSize();
        post('ready');
      }, 80);
    }

    startOpenBoundaryMap();
  </script>
</body>
</html>`;
};
