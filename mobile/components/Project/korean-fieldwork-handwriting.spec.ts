import {
  buildKoreanFieldworkHandwritingNoteText,
  extractKoreanFieldworkHandwritingFromText,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from './korean-fieldwork-handwriting';

describe('Korean fieldwork handwriting', () => {
  it('serializes handwriting strokes into field note text', () => {
    const strokes = [
      { points: [{ x: 10.4, y: 20.5 }, { x: 40, y: 50 }] },
    ];

    const text = buildKoreanFieldworkHandwritingNoteText(strokes);

    expect(text).toContain('[손그림 메모] 획 1개, 점 2개');
    expect(text).toContain('[손그림 좌표]');
    expect(extractKoreanFieldworkHandwritingFromText(text)).toEqual([
      { points: [{ x: 10, y: 21 }, { x: 40, y: 50 }] },
    ]);
  });

  it('extracts handwriting payloads without relying on localized coordinate labels', () => {
    const text = [
      'field sketch coordinates {"version":1,"strokes":[{"points":[{"x":10.4,"y":20.5}]}]}',
    ].join('\n');

    expect(extractKoreanFieldworkHandwritingFromText(text)).toEqual([
      { points: [{ x: 10, y: 21 }] },
    ]);
  });

  it('normalizes legacy array handwriting payloads', () => {
    expect(normalizeKoreanFieldworkHandwritingStrokes([
      [{ x: 10.4, y: 20.5 }],
    ])).toEqual([
      { points: [{ x: 10, y: 21 }] },
    ]);
  });

  it('normalizes invalid stroke payloads before saving', () => {
    expect(normalizeKoreanFieldworkHandwritingStrokes({
      version: 1,
      strokes: [
        { points: [{ x: -10, y: 20.2 }, { x: 'bad', y: 0 }] },
        { points: [] },
      ],
    })).toEqual([
      { points: [{ x: 0, y: 20 }] },
    ]);
    expect(serializeKoreanFieldworkHandwriting([]))
      .toBe('{"version":1,"strokes":[]}');
  });

  it('preserves normalized stroke widths', () => {
    expect(normalizeKoreanFieldworkHandwritingStrokes({
      version: 1,
      strokes: [
        { points: [{ x: 10, y: 20 }], width: 8.4 },
        { points: [{ x: 20, y: 30 }], width: 99 },
      ],
    })).toEqual([
      { points: [{ x: 10, y: 20 }], width: 8 },
      { points: [{ x: 20, y: 30 }], width: 24 },
    ]);
  });

  it('preserves normalized S Pen pressure without changing legacy points', () => {
    expect(normalizeKoreanFieldworkHandwritingStrokes({
      version: 1,
      strokes: [{
        points: [
          { pressure: 0.4567, x: 10, y: 20 },
          { pressure: 5, x: 20, y: 30 },
          { x: 30, y: 40 },
        ],
      }],
    })).toEqual([{
      points: [
        { pressure: 0.457, x: 10, y: 20 },
        { pressure: 1, x: 20, y: 30 },
        { x: 30, y: 40 },
      ],
    }]);
  });

  it('preserves valid stroke colors and drawing tools', () => {
    expect(normalizeKoreanFieldworkHandwritingStrokes({
      version: 1,
      strokes: [
        {
          color: '#DC2626',
          points: [{ x: 10, y: 20 }],
          tool: 'pen',
          width: 5,
        },
        {
          color: 'red',
          points: [{ x: 20, y: 30 }],
          tool: 'eraser',
          width: 12,
        },
      ],
    })).toEqual([
      {
        color: '#dc2626',
        points: [{ x: 10, y: 20 }],
        tool: 'pen',
        width: 5,
      },
      {
        points: [{ x: 20, y: 30 }],
        tool: 'eraser',
        width: 12,
      },
    ]);
  });
});
