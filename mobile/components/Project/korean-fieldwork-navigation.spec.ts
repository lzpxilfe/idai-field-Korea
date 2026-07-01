import {
  canOpenKoreanFieldworkProject,
  getKoreanFieldworkFieldBoardOverviewRoute,
  getKoreanFieldworkReturnParam,
  getKoreanFieldworkReturnTarget,
  getKoreanFieldworkSiteOverviewMapRoute,
  KOREAN_FIELDWORK_FIELD_BOARD_RESET_PARAM,
  KOREAN_FIELDWORK_MAP_VIEW_PARAM,
  KOREAN_FIELDWORK_MAP_VIEWS,
  KOREAN_FIELDWORK_RETURN_TARGETS,
  navigateToKoreanFieldworkReturnTarget,
} from './korean-fieldwork-navigation';

const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));

describe('Korean fieldwork navigation helpers', () => {
  afterEach(() => mockNavigate.mockClear());

  it('normalizes field-board return targets', () => {
    expect(getKoreanFieldworkReturnTarget('fieldBoard'))
      .toBe(KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD);
    expect(getKoreanFieldworkReturnTarget(['fieldBoard']))
      .toBe(KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD);
  });

  it('falls back to map return target for missing or unknown values', () => {
    expect(getKoreanFieldworkReturnTarget(undefined))
      .toBe(KOREAN_FIELDWORK_RETURN_TARGETS.MAP);
    expect(getKoreanFieldworkReturnTarget('unknown'))
      .toBe(KOREAN_FIELDWORK_RETURN_TARGETS.MAP);
  });

  it('serializes return target params for route handoff', () => {
    expect(getKoreanFieldworkReturnParam(
      KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD
    )).toEqual({ returnTo: 'fieldBoard' });
  });

  it('builds a field-board route that requests the top-level overview', () => {
    expect(getKoreanFieldworkFieldBoardOverviewRoute('reset-1')).toEqual({
      pathname: '/ProjectScreen',
      params: { [KOREAN_FIELDWORK_FIELD_BOARD_RESET_PARAM]: 'reset-1' },
    });
  });

  it('builds a map route that requests the whole-site overview', () => {
    expect(getKoreanFieldworkSiteOverviewMapRoute()).toEqual({
      pathname: '/ProjectScreen/DocumentsMap',
      params: {
        [KOREAN_FIELDWORK_MAP_VIEW_PARAM]:
          KOREAN_FIELDWORK_MAP_VIEWS.SITE_OVERVIEW,
      },
    });
  });

  it('blocks the field board when no project has been created or opened', () => {
    expect(canOpenKoreanFieldworkProject({
      currentProject: '',
      projects: {},
    })).toBe(false);
  });

  it('blocks orphaned project ids that do not have saved project settings', () => {
    expect(canOpenKoreanFieldworkProject({
      currentProject: 'missing-project',
      projects: {},
    })).toBe(false);
  });

  it('allows the field board when the current project exists in preferences', () => {
    expect(canOpenKoreanFieldworkProject({
      currentProject: 'fieldwork',
      projects: {
        fieldwork: {
          connected: false,
          languages: ['ko'],
          mapSettings: { pointRadius: 6 },
          password: '',
          url: '',
        },
      },
    })).toBe(true);
  });

  it('returns to the field board without map highlight params', () => {
    navigateToKoreanFieldworkReturnTarget(
      KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD,
      'doc-1'
    );

    expect(mockNavigate).toHaveBeenCalledWith('/ProjectScreen');
  });

  it('returns to the map with a highlighted document when requested', () => {
    navigateToKoreanFieldworkReturnTarget(
      KOREAN_FIELDWORK_RETURN_TARGETS.MAP,
      'doc-1'
    );

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/ProjectScreen/DocumentsMap',
      params: { highlightedDocId: 'doc-1' },
    });
  });
});
