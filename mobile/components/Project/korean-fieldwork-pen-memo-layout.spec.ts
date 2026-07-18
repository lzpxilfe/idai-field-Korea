import {
  KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_MAX,
  KOREAN_FIELDWORK_PEN_MEMO_GRID_STEP,
  KOREAN_FIELDWORK_PEN_MEMO_LINE_COUNT,
  KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT,
  KOREAN_FIELDWORK_PEN_MEMO_MAJOR_EVERY,
} from './korean-fieldwork-pen-memo-layout';

describe('Korean fieldwork pen memo layout', () => {
  it('repeats a major line after every five small grid cells', () => {
    expect(KOREAN_FIELDWORK_PEN_MEMO_GRID_STEP).toBe(400);
    expect(KOREAN_FIELDWORK_PEN_MEMO_MAJOR_EVERY).toBe(5);
    expect(KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT).toBe(
      KOREAN_FIELDWORK_PEN_MEMO_GRID_STEP
      * KOREAN_FIELDWORK_PEN_MEMO_MAJOR_EVERY
    );
    expect(KOREAN_FIELDWORK_PEN_MEMO_LINE_HEIGHT).toBe(2000);
    expect(KOREAN_FIELDWORK_PEN_MEMO_LINE_COUNT).toBe(5);
    // The 10000-unit square is only the legacy reference scale. The canvas
    // repeats this cadence in every direction instead of ending after 25 cells.
    expect(
      KOREAN_FIELDWORK_PEN_MEMO_COORDINATE_MAX
      / KOREAN_FIELDWORK_PEN_MEMO_GRID_STEP
    ).toBe(25);
  });
});
