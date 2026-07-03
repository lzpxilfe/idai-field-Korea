import {
  hasKoreanFieldworkProjectStartContext,
} from './korean-fieldwork-project-start';

describe('hasKoreanFieldworkProjectStartContext', () => {
  it('opens the field board when only hidden initial setup records exist', () => {
    expect(hasKoreanFieldworkProjectStartContext({
      recordingBaseCount: 1,
      storedBoundaryCount: 1,
      userVisibleDocumentCount: 0,
    })).toBe(true);
  });

  it('opens the field board when a setup boundary summary was saved', () => {
    expect(hasKoreanFieldworkProjectStartContext({
      boundarySummary: '  north line to south line  ',
      recordingBaseCount: 0,
      storedBoundaryCount: 0,
      userVisibleDocumentCount: 0,
    })).toBe(true);
  });

  it('opens the field board for visible field records', () => {
    expect(hasKoreanFieldworkProjectStartContext({
      recordingBaseCount: 0,
      storedBoundaryCount: 0,
      userVisibleDocumentCount: 1,
    })).toBe(true);
  });

  it('keeps the field board closed before any project start context exists', () => {
    expect(hasKoreanFieldworkProjectStartContext({
      boundarySummary: '   ',
      recordingBaseCount: 0,
      storedBoundaryCount: 0,
      userVisibleDocumentCount: 0,
    })).toBe(false);
  });
});
