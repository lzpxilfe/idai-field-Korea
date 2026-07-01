interface KakaoSatellitePickerHtmlOptions {
  drawingMode?: BoundaryDrawingMode;
  javaScriptKey: string;
  latitude: number;
  longitude: number;
  mapTypeId?: KakaoMapTypeId;
  webViewBaseUrl?: string;
}

interface OpenBoundaryPickerHtmlOptions {
  drawingMode?: BoundaryDrawingMode;
  latitude: number;
  longitude: number;
  mapTypeId?: KakaoMapTypeId;
}

export type KakaoMapTypeId = 'ROADMAP' | 'SKYVIEW' | 'HYBRID';
export type BoundaryDrawingMode = 'surveyBoundary' | 'featureBoundary';

interface BoundaryPickerHtmlCopy {
  bannerText: string;
  drawingTitle: string;
  initialInstruction: string;
  minimumInstruction: string;
  midpointAriaLabel: string;
  pointTitlePrefix: string;
  readyInstruction: string;
  saveButtonLabel: string;
}

const BOUNDARY_PICKER_HTML_COPY: Record<BoundaryDrawingMode, BoundaryPickerHtmlCopy> = {
  surveyBoundary: {
    bannerText:
      '지도에서 조사 경계 꼭짓점을 차례로 누르세요. 3개 이상 찍으면 경계를 저장할 수 있습니다.',
    drawingTitle: '조사 경계 그리기',
    initialInstruction:
      '지도를 눌러 첫 꼭짓점을 추가하세요. 찍은 점은 끌어서 옮길 수 있습니다.',
    minimumInstruction:
      '경계점 {count}개. 점을 더 찍어야 합니다. 최소 3개가 필요합니다.',
    midpointAriaLabel: '새 경계점 추가',
    pointTitlePrefix: '경계점 ',
    readyInstruction:
      '경계점 {count}개. 점을 끌어 옮기면 경계 범위도 같이 움직입니다.',
    saveButtonLabel: '경계 저장',
  },
  featureBoundary: {
    bannerText:
      '유적 경계 안에서 유구의 외곽점을 차례로 누르세요. 3개 이상 찍으면 유구 경계를 저장할 수 있습니다.',
    drawingTitle: '유구 경계 그리기',
    initialInstruction:
      '유구가 놓인 위치를 보면서 첫 외곽점을 추가하세요. 찍은 점은 끌어서 옮길 수 있습니다.',
    minimumInstruction:
      '유구 경계점 {count}개. 점을 더 찍어야 합니다. 최소 3개가 필요합니다.',
    midpointAriaLabel: '새 유구 경계점 추가',
    pointTitlePrefix: '유구 경계점 ',
    readyInstruction:
      '유구 경계점 {count}개. 점을 끌어 옮기면 유구 범위도 같이 움직입니다.',
    saveButtonLabel: '유구 경계 저장',
  },
};

const getBoundaryPickerHtmlCopy = (
  drawingMode: BoundaryDrawingMode = 'surveyBoundary'
): BoundaryPickerHtmlCopy =>
  BOUNDARY_PICKER_HTML_COPY[drawingMode] ?? BOUNDARY_PICKER_HTML_COPY.surveyBoundary;

const toSafeJsonString = (value: string): string => JSON.stringify(value);

export const buildKakaoSatellitePickerHtml = ({
  drawingMode = 'surveyBoundary',
  javaScriptKey,
  latitude,
  longitude,
  mapTypeId = 'HYBRID',
  webViewBaseUrl,
}: KakaoSatellitePickerHtmlOptions): string => {
  const copy = getBoundaryPickerHtmlCopy(drawingMode);
  const safeKey = encodeURIComponent(javaScriptKey.trim());
  const safeLatitude = Number.isFinite(latitude) ? latitude : 37.5665;
  const safeLongitude = Number.isFinite(longitude) ? longitude : 126.9780;
  const safeMapTypeId = getSafeMapTypeId(mapTypeId);
  const safeWebViewBaseUrl = JSON.stringify(webViewBaseUrl ?? '');
  const kakaoSdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${safeKey}&autoload=false`;
  const safeKakaoSdkUrl = JSON.stringify(kakaoSdkUrl);
  const safeBannerText = toSafeJsonString(copy.bannerText);
  const safeDrawingTitle = toSafeJsonString(copy.drawingTitle);
  const safeInitialInstruction = toSafeJsonString(copy.initialInstruction);
  const safeMinimumInstruction = toSafeJsonString(copy.minimumInstruction);
  const safeMidpointAriaLabel = toSafeJsonString(copy.midpointAriaLabel);
  const safePointTitlePrefix = toSafeJsonString(copy.pointTitlePrefix);
  const safeReadyInstruction = toSafeJsonString(copy.readyInstruction);
  const safeSaveButtonLabel = toSafeJsonString(copy.saveButtonLabel);

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
    .current-location-marker {
      align-items: center;
      background: rgba(14, 165, 233, 0.18);
      border: 2px solid #0284c7;
      border-radius: 999px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.28);
      display: flex;
      height: 28px;
      justify-content: center;
      width: 28px;
    }
    .current-location-marker span {
      background: #0284c7;
      border: 2px solid white;
      border-radius: 999px;
      display: block;
      height: 10px;
      width: 10px;
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
  <div id="banner" class="banner"></div>
  <div class="toolbar">
    <div id="status" class="status"></div>
    <button id="undo" class="secondary" type="button" disabled>되돌리기</button>
    <button id="reset" class="secondary" type="button" disabled>초기화</button>
    <button id="save" class="primary" type="button" disabled></button>
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
        var activeDragFrame = null;
        var activeDragMarker = null;
        var activeDragPointIndex = -1;
        var currentLocationOverlay = null;
        var currentAccuracyCircle = null;
        var hasCenteredOnCurrentLocation = false;
        var bannerText = ${safeBannerText};
        var drawingTitle = ${safeDrawingTitle};
        var initialInstruction = ${safeInitialInstruction};
        var minimumInstruction = ${safeMinimumInstruction};
        var midpointAriaLabel = ${safeMidpointAriaLabel};
        var pointTitlePrefix = ${safePointTitlePrefix};
        var readyInstruction = ${safeReadyInstruction};
        var saveButtonLabel = ${safeSaveButtonLabel};
        var bannerEl = document.getElementById('banner');
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
        bannerEl.textContent = bannerText;
        saveEl.textContent = saveButtonLabel;
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
            if (!data) return;
            if (data.type === 'setMapType') {
              setMapType(data.payload && data.payload.mapTypeId);
              return;
            }
            if (data.type === 'currentLocation') {
              updateCurrentLocation(data.payload);
            }
          } catch (error) {}
        }

        window.addEventListener('message', handleNativeMessage);
        document.addEventListener('message', handleNativeMessage);

        function addPoint(latLng) {
          points.push(latLng);
          redraw();
        }

        function updateCurrentLocation(payload) {
          if (!payload || !isFinite(payload.latitude) || !isFinite(payload.longitude)) return;
          var position = new kakao.maps.LatLng(payload.latitude, payload.longitude);
          var radius = isFinite(payload.accuracy)
            ? Math.max(4, Math.min(Number(payload.accuracy), 120))
            : 12;
          if (!currentLocationOverlay) {
            currentLocationOverlay = new kakao.maps.CustomOverlay({
              content: '<div class="current-location-marker" aria-label="current location"><span></span></div>',
              map: map,
              position: position,
              xAnchor: 0.5,
              yAnchor: 0.5
            });
          } else {
            currentLocationOverlay.setPosition(position);
          }
          if (!currentAccuracyCircle) {
            currentAccuracyCircle = new kakao.maps.Circle({
              center: position,
              fillColor: '#38bdf8',
              fillOpacity: 0.16,
              map: map,
              radius: radius,
              strokeColor: '#0284c7',
              strokeOpacity: 0.85,
              strokeWeight: 2
            });
          } else {
            currentAccuracyCircle.setPosition(position);
            currentAccuracyCircle.setRadius(radius);
          }
          if (!hasCenteredOnCurrentLocation && points.length === 0) {
            map.setCenter(position);
            hasCenteredOnCurrentLocation = true;
          }
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

        function clearMidpointHandles() {
          midpointOverlays.forEach(function(overlay) {
            overlay.setMap(null);
          });
          midpointOverlays = [];
        }

        function updateBoundaryPreview() {
          outline.setPath(points);
          polygon.setPath(points.length >= 3 ? points : []);
          undoEl.disabled = points.length === 0;
          resetEl.disabled = points.length === 0;
          saveEl.disabled = points.length < 3;
          statusEl.innerHTML = toStatusHtml(
            points.length < 3
              ? formatCountText(minimumInstruction, points.length)
              : formatCountText(readyInstruction, points.length)
          );
        }

        function startDragPreview(index, marker) {
          activeDragPointIndex = index;
          activeDragMarker = marker;
          clearMidpointHandles();
          if (activeDragFrame !== null) {
            cancelAnimationFrame(activeDragFrame);
          }
          syncDraggingPoint();
        }

        function syncDraggingPoint() {
          if (!activeDragMarker || activeDragPointIndex < 0) return;
          points[activeDragPointIndex] = activeDragMarker.getPosition();
          updateBoundaryPreview();
          activeDragFrame = requestAnimationFrame(syncDraggingPoint);
        }

        function stopDragPreview(index, marker) {
          if (activeDragFrame !== null) {
            cancelAnimationFrame(activeDragFrame);
            activeDragFrame = null;
          }
          activeDragMarker = null;
          activeDragPointIndex = -1;
          points[index] = marker.getPosition();
          redraw();
        }

        function redraw() {
          if (activeDragFrame !== null) {
            cancelAnimationFrame(activeDragFrame);
            activeDragFrame = null;
          }
          activeDragMarker = null;
          activeDragPointIndex = -1;
          markers.forEach(function(marker) {
            marker.setMap(null);
          });
          markers = [];
          clearMidpointHandles();
          points.forEach(function(point, index) {
            var marker = new kakao.maps.Marker({
              draggable: true,
              map: map,
              position: point,
              title: pointTitlePrefix + (index + 1)
            });
            marker.setDraggable(true);
            kakao.maps.event.addListener(marker, 'dragstart', function() {
              startDragPreview(index, marker);
            });
            kakao.maps.event.addListener(marker, 'dragend', function() {
              stopDragPreview(index, marker);
            });
            markers.push(marker);
          });
          addSegmentInsertHandles();
          updateBoundaryPreview();
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
          handle.setAttribute('aria-label', midpointAriaLabel);
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

        function formatCountText(template, count) {
          return template.replace('{count}', String(count));
        }

        function toStatusHtml(text) {
          return '<strong>' + escapeHtml(drawingTitle) + '</strong>' + escapeHtml(text);
        }

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        redraw();
        statusEl.innerHTML = toStatusHtml(initialInstruction);
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
  drawingMode = 'surveyBoundary',
  latitude,
  longitude,
  mapTypeId = 'HYBRID',
}: OpenBoundaryPickerHtmlOptions): string => {
  const copy = getBoundaryPickerHtmlCopy(drawingMode);
  const safeLatitude = Number.isFinite(latitude) ? latitude : 37.5665;
  const safeLongitude = Number.isFinite(longitude) ? longitude : 126.9780;
  const safeMapTypeId = getSafeMapTypeId(mapTypeId);
  const safeDrawingTitle = toSafeJsonString(copy.drawingTitle);
  const safeInitialInstruction = toSafeJsonString(copy.initialInstruction);
  const safeMinimumInstruction = toSafeJsonString(copy.minimumInstruction);
  const safeMidpointAriaLabel = toSafeJsonString(copy.midpointAriaLabel);
  const safePointTitlePrefix = toSafeJsonString(copy.pointTitlePrefix);
  const safeReadyInstruction = toSafeJsonString(copy.readyInstruction);
  const safeSaveButtonLabel = toSafeJsonString(copy.saveButtonLabel);

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
    .current-location-marker span {
      align-items: center;
      background: rgba(14, 165, 233, 0.2);
      border: 2px solid #0284c7;
      border-radius: 999px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.28);
      display: flex;
      height: 26px;
      justify-content: center;
      width: 26px;
    }
    .current-location-marker span::after {
      background: #0284c7;
      border: 2px solid white;
      border-radius: 999px;
      content: "";
      display: block;
      height: 9px;
      width: 9px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="toolbar">
    <div id="status" class="status"></div>
    <button id="undo" class="secondary" type="button" disabled>되돌리기</button>
    <button id="reset" class="secondary" type="button" disabled>초기화</button>
    <button id="save" class="primary" type="button" disabled></button>
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
      var currentLocationMarker = null;
      var currentAccuracyCircle = null;
      var hasCenteredOnCurrentLocation = false;
      var drawingTitle = ${safeDrawingTitle};
      var initialInstruction = ${safeInitialInstruction};
      var minimumInstruction = ${safeMinimumInstruction};
      var midpointAriaLabel = ${safeMidpointAriaLabel};
      var pointTitlePrefix = ${safePointTitlePrefix};
      var readyInstruction = ${safeReadyInstruction};
      var saveButtonLabel = ${safeSaveButtonLabel};
      var roadmapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxNativeZoom: 19,
        maxZoom: 22
      });
      var imageryLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 18,
        maxZoom: 22
      });
      var labelLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Labels &copy; Esri',
        maxNativeZoom: 18,
        maxZoom: 22
      });
      var points = [];
      var markersLayer = L.layerGroup().addTo(map);
      var midpointMarkersLayer = L.layerGroup().addTo(map);
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
          if (!data) return;
          if (data.type === 'setMapType') {
            setMapType(data.payload && data.payload.mapTypeId);
            return;
          }
          if (data.type === 'currentLocation') {
            updateCurrentLocation(data.payload);
          }
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
      saveEl.textContent = saveButtonLabel;

      function addPoint(latLng) {
        points.push(latLng);
        redraw();
      }

      function updateCurrentLocation(payload) {
        if (!payload || !isFinite(payload.latitude) || !isFinite(payload.longitude)) return;
        var position = [payload.latitude, payload.longitude];
        var radius = isFinite(payload.accuracy)
          ? Math.max(4, Math.min(Number(payload.accuracy), 120))
          : 12;
        if (!currentLocationMarker) {
          currentLocationMarker = L.marker(position, {
            icon: createCurrentLocationIcon(),
            interactive: false,
            keyboard: false,
            title: '현재 위치'
          }).addTo(map);
        } else {
          currentLocationMarker.setLatLng(position);
        }
        if (!currentAccuracyCircle) {
          currentAccuracyCircle = L.circle(position, {
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.16,
            opacity: 0.85,
            radius: radius,
            weight: 2
          }).addTo(map);
        } else {
          currentAccuracyCircle.setLatLng(position);
          currentAccuracyCircle.setRadius(radius);
        }
        if (!hasCenteredOnCurrentLocation && points.length === 0) {
          map.setView(position, Math.max(map.getZoom(), 17));
          hasCenteredOnCurrentLocation = true;
        }
      }

      function redraw() {
        markersLayer.clearLayers();
        midpointMarkersLayer.clearLayers();
        points.forEach(function(point, index) {
          L.marker([point.lat, point.lng], {
            draggable: true,
            icon: createPointIcon(index + 1),
            title: pointTitlePrefix + (index + 1)
          }).on('drag', function(event) {
            points[index] = event.target.getLatLng();
            midpointMarkersLayer.clearLayers();
            updateBoundaryPreview();
          }).on('dragend', function(event) {
            points[index] = event.target.getLatLng();
            redraw();
          }).addTo(markersLayer);
        });
        addSegmentInsertHandles();
        updateBoundaryPreview();
      }

      function updateBoundaryPreview() {
        outline.setLatLngs(points);
        polygon.setLatLngs(points.length >= 3 ? [points] : []);
        undoEl.disabled = points.length === 0;
        resetEl.disabled = points.length === 0;
        saveEl.disabled = points.length < 3;
        statusEl.innerHTML = toStatusHtml(
          points.length < 3
            ? formatCountText(minimumInstruction, points.length)
            : formatCountText(readyInstruction, points.length)
        );
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
          title: midpointAriaLabel
        }).on('click', function(event) {
          if (event.originalEvent) L.DomEvent.stop(event.originalEvent);
          points.splice(insertIndex, 0, position);
          redraw();
        }).addTo(midpointMarkersLayer);
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

      function createCurrentLocationIcon() {
        return L.divIcon({
          className: 'current-location-marker',
          html: '<span></span>',
          iconAnchor: [15, 15],
          iconSize: [30, 30]
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

      function formatCountText(template, count) {
        return template.replace('{count}', String(count));
      }

      function toStatusHtml(text) {
        return '<strong>' + escapeHtml(drawingTitle) + '</strong>' + escapeHtml(text);
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      setMapType(currentMapType);
      redraw();
      statusEl.innerHTML = toStatusHtml(initialInstruction);
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
