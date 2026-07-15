import {
  FEATURE_SKETCH_SATELLITE_ATTRIBUTION,
  getFeatureSketchSatelliteTiles,
} from './feature-sketch-satellite';

describe('feature sketch satellite imagery', () => {
  it('builds ArcGIS tiles around the padded project boundary', () => {
    const tiles = getFeatureSketchSatelliteTiles({
      coordinates: [
        { latitude: 36.46, longitude: 127.13 },
        { latitude: 36.46, longitude: 127.15 },
        { latitude: 36.48, longitude: 127.15 },
        { latitude: 36.48, longitude: 127.13 },
      ],
    } as any);

    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThanOrEqual(36);
    expect(tiles[0].uri).toMatch(
      /server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/\d+\/\d+\/\d+/
    );
    expect(tiles.some((tile) => tile.leftPercent < 0)).toBe(true);
    expect(tiles.some((tile) => tile.topPercent < 0)).toBe(true);
    expect(FEATURE_SKETCH_SATELLITE_ATTRIBUTION).toBe('Tiles © Esri');
  });

  it('does not request imagery without a usable project boundary', () => {
    expect(getFeatureSketchSatelliteTiles()).toEqual([]);
    expect(getFeatureSketchSatelliteTiles({ coordinates: [] } as any)).toEqual([]);
  });

  it('uses the current GPS position when no project boundary exists yet', () => {
    const tiles = getFeatureSketchSatelliteTiles(undefined, {
      latitude: 36.469095,
      longitude: 127.136156,
    });

    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((tile) => tile.uri.includes('/tile/18/'))).toBe(true);
  });
});
