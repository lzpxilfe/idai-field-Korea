import {
  getKoreanFieldworkFeatureSketchDrawingBackground,
  getKoreanFieldworkFeatureSketchGuidePaths,
} from './korean-fieldwork-feature-sketch-background';

describe('korean fieldwork feature sketch drawing background', () => {
  it('centers and enlarges a boundary-positioned polygon for free sketching', () => {
    const [path] = getKoreanFieldworkFeatureSketchGuidePaths(JSON.stringify({
      shape: 'polygon',
      center: { x: 15, y: 12 },
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 14 },
        { x: 10, y: 14 },
      ],
      rotation: 0,
      scale: 100,
    }));

    expect(path).toMatchObject({
      closed: true,
      strokeColor: '#f97316',
      width: 3,
    });
    expect(path.points).toEqual([
      { x: 1000, y: 3400 },
      { x: 9000, y: 3400 },
      { x: 9000, y: 6600 },
      { x: 1000, y: 6600 },
    ]);
  });

  it.each([
    ['rectangle', 4],
    ['circle', 32],
    ['oval', 32],
  ])('creates a centered closed guide for a rotated %s', (shape, pointCount) => {
    const [path] = getKoreanFieldworkFeatureSketchGuidePaths({
      shape,
      center: { x: 92, y: 8 },
      points: [{ x: 92, y: 8 }],
      rotation: 35,
      scale: 8,
    });

    expect(path.closed).toBe(true);
    expect(path.points).toHaveLength(pointCount);
    expect(Math.min(...path.points.map((point) => point.x))).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...path.points.map((point) => point.x))).toBeLessThanOrEqual(9000);
    expect(Math.min(...path.points.map((point) => point.y))).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...path.points.map((point) => point.y))).toBeLessThanOrEqual(9000);
  });

  it('uses a centered marker for a point-shaped feature', () => {
    expect(getKoreanFieldworkFeatureSketchGuidePaths({
      shape: 'point',
      center: { x: 12, y: 91 },
      points: [{ x: 12, y: 91 }],
    })).toEqual([expect.objectContaining({
      closed: false,
      points: [{ x: 5000, y: 5000 }],
    })]);
  });

  it('returns no drawing background for invalid or missing sketches', () => {
    expect(getKoreanFieldworkFeatureSketchDrawingBackground('{broken'))
      .toBeUndefined();
    expect(getKoreanFieldworkFeatureSketchDrawingBackground({ shape: 'line' }))
      .toBeUndefined();
    expect(getKoreanFieldworkFeatureSketchDrawingBackground(undefined))
      .toBeUndefined();
  });
});
