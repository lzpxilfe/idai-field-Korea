import { NativeModules } from 'react-native';
import {
  getKoreanHandwritingLinePayloads,
  recognizeKoreanHandwriting,
} from './korean-handwriting-recognition';

const nativeModules = NativeModules as Record<string, unknown>;

describe('korean handwriting recognition', () => {
  afterEach(() => {
    delete nativeModules.KoreanHandwritingRecognition;
  });

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

  it('chunks signed v2 ink from top to bottom and left to right', () => {
    const chunks = getKoreanHandwritingLinePayloads({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [
        { color: '#dc2626', points: [{ x: 10500, y: 200 }] },
        { color: '#16a34a', points: [{ x: 500, y: -1800 }] },
        { color: '#2563eb', points: [{ x: 100, y: 4500 }] },
        { color: '#f59e0b', points: [{ x: -19500, y: 100 }] },
        { color: '#111827', points: [{ x: -9000, y: -1900 }] },
      ],
    }).map((chunk) => JSON.parse(chunk));

    expect(chunks).toHaveLength(5);
    expect(chunks.map((chunk) => ({
      color: chunk.strokes[0].color,
      point: chunk.strokes[0].points[0],
      version: chunk.version,
    }))).toEqual([
      { color: '#111827', point: { x: 1000, y: 100 }, version: 1 },
      { color: '#16a34a', point: { x: 500, y: 200 }, version: 1 },
      { color: '#f59e0b', point: { x: 500, y: 100 }, version: 1 },
      { color: '#dc2626', point: { x: 500, y: 200 }, version: 1 },
      { color: '#2563eb', point: { x: 100, y: 500 }, version: 1 },
    ]);
  });

  it('preserves signed coordinates in a markerless live stroke array', () => {
    const [chunk] = getKoreanHandwritingLinePayloads([
      { points: [{ x: -500, y: -100 }] },
    ]);

    expect(JSON.parse(chunk)).toEqual({
      version: 1,
      strokes: [{ points: [{ x: 9500, y: 1900 }] }],
    });
  });

  it('splits a long v2 stroke at every crossed column boundary', () => {
    const chunks = getKoreanHandwritingLinePayloads({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{
        points: [
          { x: -100, y: 100 },
          { x: 20100, y: 100 },
        ],
      }],
    }).map((chunk) => JSON.parse(chunk));

    expect(chunks.map((chunk) => chunk.strokes[0].points)).toEqual([
      [{ x: 9900, y: 100 }, { x: 9999, y: 100 }],
      [{ x: 0, y: 100 }, { x: 9999, y: 100 }],
      [{ x: 0, y: 100 }, { x: 9999, y: 100 }],
      [{ x: 0, y: 100 }, { x: 100, y: 100 }],
    ]);
  });

  it('splits a long v2 stroke at every crossed signed row boundary', () => {
    const chunks = getKoreanHandwritingLinePayloads({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{
        points: [
          { x: 100, y: -100 },
          { x: 100, y: 4100 },
        ],
      }],
    }).map((chunk) => JSON.parse(chunk));

    expect(chunks.map((chunk) => chunk.strokes[0].points)).toEqual([
      [{ x: 100, y: 1900 }, { x: 100, y: 1999 }],
      [{ x: 100, y: 0 }, { x: 100, y: 1999 }],
      [{ x: 100, y: 0 }, { x: 100, y: 1999 }],
      [{ x: 100, y: 0 }, { x: 100, y: 100 }],
    ]);
  });

  it('reads the v2 coordinate marker from a serialized boundary payload', () => {
    const [chunk] = getKoreanHandwritingLinePayloads(JSON.stringify({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{ points: [{ x: 10000, y: 10000 }] }],
    }));

    expect(JSON.parse(chunk)).toEqual({
      version: 1,
      strokes: [{ points: [{ x: 0, y: 0 }] }],
    });
  });

  it('fails fast when one pathological segment crosses too many chunks', () => {
    expect(() => getKoreanHandwritingLinePayloads({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{
        points: [
          { x: -10000000, y: -10000000 },
          { x: 10000000, y: 10000000 },
        ],
      }],
    })).toThrow('필기 범위가 너무 넓습니다.');
  });

  it('fails fast instead of starting hundreds of native recognitions', async () => {
    const recognize = jest.fn();
    nativeModules.KoreanHandwritingRecognition = { recognize };

    await expect(recognizeKoreanHandwriting({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: Array.from({ length: 129 }, (_, index) => ({
        points: [{ x: index * 10000, y: 100 }],
      })),
    })).rejects.toThrow('필기 범위가 너무 넓습니다.');
    expect(recognize).not.toHaveBeenCalled();
  });

  it('rejects an oversized point payload before replaying or serializing it', () => {
    const point = { x: 100, y: 100 };
    expect(() => getKoreanHandwritingLinePayloads({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{ points: Array(100001).fill(point) }],
    })).toThrow('필기 범위가 너무 넓습니다.');
  });

  it('joins columns with spaces and inserts newlines only between rows', async () => {
    const recognize = jest.fn(async (payload: string) => {
      const color = JSON.parse(payload).strokes[0].color;
      const textByColor: Record<string, string> = {
        '#dc2626': '오른쪽',
        '#16a34a': '아래',
        '#2563eb': '왼쪽',
      };
      const text = textByColor[color] ?? '';
      return {
        candidates: [text],
        engine: 'test-engine',
        modelDownloaded: true,
        text,
      };
    });
    nativeModules.KoreanHandwritingRecognition = { recognize };

    const result = await recognizeKoreanHandwriting({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [
        { color: '#dc2626', points: [{ x: 10500, y: 100 }] },
        { color: '#16a34a', points: [{ x: 500, y: 2100 }] },
        { color: '#2563eb', points: [{ x: -500, y: 100 }] },
      ],
    });

    expect(result.text).toBe('왼쪽 오른쪽\n아래');
    expect(result.candidates).toEqual(['왼쪽 오른쪽\n아래']);
    expect(recognize).toHaveBeenCalledTimes(3);
  });
});
