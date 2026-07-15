import { getKoreanHandwritingLinePayloads } from './korean-handwriting-recognition';

describe('korean handwriting recognition', () => {
  it('splits ruled pen memo strokes into top-to-bottom lines', () => {
    const lines = getKoreanHandwritingLinePayloads({
      version: 1,
      strokes: [
        { points: [{ x: 100, y: 2400 }, { x: 200, y: 2500 }] },
        { points: [{ x: 100, y: 400 }, { x: 200, y: 500 }] },
        { tool: 'eraser', points: [{ x: 100, y: 450 }, { x: 200, y: 550 }] },
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
});
