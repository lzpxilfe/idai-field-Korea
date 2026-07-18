import {
  applyKoreanFieldworkHandwritingErasers,
  buildKoreanFieldworkHandwritingNoteText,
  extractKoreanFieldworkHandwritingFromText,
  KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE,
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

  it('preserves signed infinite-grid PenMemo coordinates without changing v1', () => {
    const payload = serializeKoreanFieldworkHandwriting([
      { points: [{ x: -2400.4, y: 12800.6 }] },
    ], {
      coordinateSpace: KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE,
    });

    expect(JSON.parse(payload)).toEqual({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{ points: [{ x: -2400, y: 12801 }] }],
    });
    expect(normalizeKoreanFieldworkHandwritingStrokes(payload)).toEqual([
      { points: [{ x: -2400, y: 12801 }] },
    ]);
    expect(normalizeKoreanFieldworkHandwritingStrokes({
      version: 1,
      strokes: [{ points: [{ x: -2400, y: 12801 }] }],
    }, {
      coordinateSpace: KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_SPACE,
    })).toEqual([
      { points: [{ x: 0, y: 10000 }] },
    ]);
  });

  it('applies a finite safety limit to infinite-grid coordinates', () => {
    expect(normalizeKoreanFieldworkHandwritingStrokes({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [{
        points: [
          { x: -20000000, y: 20000000 },
          { x: 20000000, y: -20000000 },
        ],
      }],
    })).toEqual([{
      points: [
        { x: -10000000, y: 10000000 },
        { x: 10000000, y: -10000000 },
      ],
    }]);
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

  it('removes only the middle of an earlier pen stroke crossed by an eraser', () => {
    const visibleStrokes = applyKoreanFieldworkHandwritingErasers({
      version: 1,
      strokes: [
        {
          points: [{ x: 0, y: 1000 }, { x: 1000, y: 1000 }],
          tool: 'pen',
          width: 5,
        },
        {
          points: [{ x: 500, y: 800 }, { x: 500, y: 1200 }],
          tool: 'eraser',
          width: 12,
        },
      ],
    });

    expect(visibleStrokes).toHaveLength(2);
    expect(Math.max(...visibleStrokes[0].points.map((point) => point.x)))
      .toBeLessThan(500);
    expect(Math.min(...visibleStrokes[1].points.map((point) => point.x)))
      .toBeGreaterThan(500);
    expect(visibleStrokes.flatMap((stroke) => stroke.points))
      .not.toContainEqual({ x: 500, y: 1000 });
  });

  it('samples only near an eraser on a very long infinite-grid stroke', () => {
    const visibleStrokes = applyKoreanFieldworkHandwritingErasers({
      coordinateSpace: 'penMemoInfiniteGridV1',
      version: 2,
      strokes: [
        {
          points: [
            { x: -10000000, y: 1000 },
            { x: 10000000, y: 1000 },
          ],
          tool: 'pen',
          width: 5,
        },
        {
          points: [
            { x: 12345, y: 800 },
            { x: 12345, y: 1200 },
          ],
          tool: 'eraser',
          width: 12,
        },
      ],
    });

    expect(visibleStrokes).toHaveLength(2);
    expect(Math.max(...visibleStrokes[0].points.map((point) => point.x)))
      .toBeLessThan(12345);
    expect(Math.min(...visibleStrokes[1].points.map((point) => point.x)))
      .toBeGreaterThan(12345);
    expect(visibleStrokes.flatMap((stroke) => stroke.points).length)
      .toBeLessThan(100);
  });

  it('removes an earlier pen stroke completely when fully covered', () => {
    expect(applyKoreanFieldworkHandwritingErasers({
      version: 1,
      strokes: [
        { points: [{ x: 450, y: 1000 }, { x: 550, y: 1000 }] },
        {
          points: [{ x: 400, y: 1000 }, { x: 600, y: 1000 }],
          tool: 'eraser',
          width: 24,
        },
      ],
    })).toEqual([]);
  });

  it('preserves pen strokes written after the eraser interaction', () => {
    const rewrittenStroke = {
      color: '#dc2626',
      points: [{ x: 450, y: 1000 }, { x: 550, y: 1000 }],
      tool: 'pen' as const,
      width: 5,
    };
    const visibleStrokes = applyKoreanFieldworkHandwritingErasers({
      version: 1,
      strokes: [
        { points: [{ x: 0, y: 1000 }, { x: 1000, y: 1000 }] },
        {
          points: [{ x: 500, y: 800 }, { x: 500, y: 1200 }],
          tool: 'eraser',
          width: 12,
        },
        rewrittenStroke,
      ],
    });

    expect(visibleStrokes).toContainEqual(rewrittenStroke);
    expect(visibleStrokes.every((stroke) => stroke.tool !== 'eraser')).toBe(true);
  });
});
