import {
  parseDxfBoundaryText,
  parseDxfReferenceText,
  parseGeoJsonBoundaryText,
  parseShpBoundaryBytes,
} from './boundary-file-import';

describe('boundary-file-import', () => {
  it('parses closed DXF lightweight polylines as projected survey boundaries', () => {
    const result = parseDxfBoundaryText([
      '0',
      'SECTION',
      '2',
      'ENTITIES',
      '0',
      'LWPOLYLINE',
      '90',
      '4',
      '10',
      '127.12',
      '20',
      '36.45',
      '10',
      '127.13',
      '20',
      '36.45',
      '10',
      '127.13',
      '20',
      '36.46',
      '10',
      '127.12',
      '20',
      '36.45',
      '0',
      'ENDSEC',
      '0',
      'EOF',
    ].join('\n'));

    expect(result.coordinateSystem).toBe('EPSG:4326');
    expect(result.geometry.type).toBe('LineString');
    expect(result.geometry.coordinates).toHaveLength(4);
    expect(result.geometry.coordinates[0][0]).not.toBeCloseTo(127.12);
    expect(result.referenceVectorGeometry?.type).toBe('MultiLineString');
    expect(result.referenceVectorLineCount).toBe(1);
  });

  it('keeps DXF polylines, lines, circles, and arcs as survey background', () => {
    const result = parseDxfReferenceText([
      '0', 'SECTION', '2', 'ENTITIES',
      '0', 'LWPOLYLINE',
      '90', '3', '70', '1',
      '10', '127.12', '20', '36.45',
      '10', '127.13', '20', '36.45',
      '10', '127.13', '20', '36.46',
      '0', 'LINE',
      '10', '127.12', '20', '36.455',
      '11', '127.13', '21', '36.455',
      '0', 'CIRCLE',
      '10', '127.125', '20', '36.455', '40', '0.001',
      '0', 'ARC',
      '10', '127.125', '20', '36.455', '40', '0.002',
      '50', '0', '51', '180',
      '0', 'ENDSEC', '0', 'EOF',
    ].join('\n'));

    expect(result.coordinateSystem).toBe('EPSG:4326');
    expect(result.geometry.type).toBe('MultiLineString');
    expect(result.lineCount).toBe(4);
    expect(result.coordinateCount).toBeGreaterThan(50);
    expect(result.geometry.coordinates).toHaveLength(4);
    expect(result.geometry.coordinates[0][0][0]).not.toBeCloseTo(127.12);
    expect(result.geometry.coordinates[0][0]).toEqual(
      result.geometry.coordinates[0][result.geometry.coordinates[0].length - 1]
    );
  });

  it('parses polygon SHP records without requiring a DBF sidecar', () => {
    const result = parseShpBoundaryBytes(
      createPolygonShpBytes([
        [127.12, 36.45],
        [127.13, 36.45],
        [127.13, 36.46],
        [127.12, 36.45],
      ]),
      'EPSG:4326'
    );

    expect(result.coordinateSystem).toBe('EPSG:4326');
    expect(result.geometry.coordinates).toHaveLength(4);
    expect(result.geometry.coordinates[0][0]).not.toBeCloseTo(127.12);
  });

  it('parses GeoJSON polygon boundaries for tablet-to-desktop sync', () => {
    const result = parseGeoJsonBoundaryText(JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [127.12, 36.45],
            [127.13, 36.45],
            [127.13, 36.46],
            [127.12, 36.45],
          ]],
        },
      }],
    }));

    expect(result.coordinateSystem).toBe('EPSG:4326');
    expect(result.geometry.type).toBe('LineString');
    expect(result.geometry.coordinates).toHaveLength(4);
    expect(result.geometry.coordinates[0][0]).not.toBeCloseTo(127.12);
  });

  it('rejects Korean projected coordinates without an explicit CRS', () => {
    expect(() => parseDxfBoundaryText(createDxfPolyline([
      [200000, 600000],
      [200100, 600000],
      [200100, 600100],
      [200000, 600000],
    ]))).toThrow(/Korean projected coordinates/);
  });

  it('uses an explicit Korean projected CRS instead of guessing the belt', () => {
    const result = parseDxfBoundaryText(
      createDxfPolyline([
        [200000, 600000],
        [200100, 600000],
        [200100, 600100],
        [200000, 600000],
      ]),
      'EPSG:5186'
    );

    expect(result.coordinateSystem).toBe('EPSG:5186');
    expect(result.geometry.coordinates).toHaveLength(4);
    expect(result.geometry.coordinates[0][0]).not.toBeCloseTo(200000);
  });
});

const createDxfPolyline = (coordinates: number[][]): string =>
  [
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    '0',
    'LWPOLYLINE',
    '90',
    String(coordinates.length),
    ...coordinates.flatMap(([x, y]) => [
      '10',
      String(x),
      '20',
      String(y),
    ]),
    '0',
    'ENDSEC',
    '0',
    'EOF',
  ].join('\n');

const createPolygonShpBytes = (points: number[][]): Uint8Array => {
  const contentLength = 4 + 32 + 4 + 4 + 4 + points.length * 16;
  const fileLength = 100 + 8 + contentLength;
  const bytes = new Uint8Array(fileLength);
  const view = new DataView(bytes.buffer);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  view.setInt32(0, 9994, false);
  view.setInt32(24, fileLength / 2, false);
  view.setInt32(28, 1000, true);
  view.setInt32(32, 5, true);
  writeBoundingBox(view, 36, xs, ys);

  view.setInt32(100, 1, false);
  view.setInt32(104, contentLength / 2, false);
  view.setInt32(108, 5, true);
  writeBoundingBox(view, 112, xs, ys);
  view.setInt32(144, 1, true);
  view.setInt32(148, points.length, true);
  view.setInt32(152, 0, true);
  points.forEach((point, index) => {
    const offset = 156 + index * 16;
    view.setFloat64(offset, point[0], true);
    view.setFloat64(offset + 8, point[1], true);
  });

  return bytes;
};

const writeBoundingBox = (
  view: DataView,
  offset: number,
  xs: number[],
  ys: number[]
) => {
  view.setFloat64(offset, Math.min(...xs), true);
  view.setFloat64(offset + 8, Math.min(...ys), true);
  view.setFloat64(offset + 16, Math.max(...xs), true);
  view.setFloat64(offset + 24, Math.max(...ys), true);
};
