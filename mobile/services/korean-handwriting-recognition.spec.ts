import { getKoreanHandwritingLinePayloads } from './korean-handwriting-recognition';

describe('korean handwriting recognition', () => {
  it('splits ruled pen memo strokes into top-to-bottom lines', () => {
    const lines = getKoreanHandwritingLinePayloads({
      version: 1,
      strokes: [
        { points: [{ x: 100, y: 2400 }, { x: 200, y: 2500 }] },
        { points: [{ x: 100, y: 400 }, { x: 200, y: 500 }] },
        { tool: 'eraser', points: [{ x: 900, y: 450 }, { x: 1000, y: 550 }] },
      ],
    });

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).strokes[0].points).toEqual([
      { x: 100, y: 400 },
      { x: 200, y: 500 },
    ]);
    expect(JSON.parse(lines[1]).strokes[0].points).toEqual([
      { x: 100, y: 400 },
      { x: 200, y: 500 },
    ]);
  });

  it('keeps every graph-paper row aligned with the five recognition lines', () => {
    const lines = getKoreanHandwritingLinePayloads({
      version: 1,
      strokes: [
        { points: [{ x: 100, y: 1999 }] },
        { points: [{ x: 200, y: 2000 }] },
        { points: [{ x: 300, y: 3999 }] },
        { points: [{ x: 400, y: 4000 }] },
        { points: [{ x: 500, y: 6000 }] },
        { points: [{ x: 600, y: 8000 }] },
        { points: [{ x: 700, y: 9999 }] },
      ],
    });

    expect(lines).toHaveLength(5);
    expect(lines.map((line) => JSON.parse(line).strokes.map(
      (stroke: { points: { y: number }[] }) => stroke.points[0].y
    ))).toEqual([
      [1999],
      [0, 1999],
      [0],
      [0],
      [0, 1999],
    ]);
  });

  it('clamps a row-crossing stroke inside the native writing area', () => {
    const [line] = getKoreanHandwritingLinePayloads({
      version: 1,
      strokes: [{
        points: [
          { x: 100, y: 1900 },
          { x: 200, y: 2100 },
          { x: 300, y: 4100 },
        ],
      }],
    });

    expect(JSON.parse(line).strokes[0].points).toEqual([
      { x: 100, y: 0 },
      { x: 200, y: 100 },
      { x: 300, y: 1999 },
    ]);
  });

  it('passes only the pen fragments left visible after an eraser stroke', () => {
    const [line] = getKoreanHandwritingLinePayloads({
      version: 1,
      strokes: [
        { points: [{ x: 0, y: 1000 }, { x: 1000, y: 1000 }] },
        {
          points: [{ x: 500, y: 800 }, { x: 500, y: 1200 }],
          tool: 'eraser',
          width: 12,
        },
      ],
    });
    const recognizedStrokes = JSON.parse(line).strokes;

    expect(recognizedStrokes).toHaveLength(2);
    expect(Math.max(...recognizedStrokes[0].points.map(
      (point: { x: number }) => point.x
    ))).toBeLessThan(500);
    expect(Math.min(...recognizedStrokes[1].points.map(
      (point: { x: number }) => point.x
    ))).toBeGreaterThan(500);
  });
});
