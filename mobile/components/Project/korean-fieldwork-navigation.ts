import { router } from 'expo-router';
import { type Preferences } from '@/models/preferences';

export const KOREAN_FIELDWORK_RETURN_TARGETS = {
  FIELD_BOARD: 'fieldBoard',
  MAP: 'map',
} as const;

export const KOREAN_FIELDWORK_FIELD_BOARD_RESET_PARAM = 'fieldBoardReset';
export const KOREAN_FIELDWORK_MAP_VIEW_PARAM = 'fieldworkMapView';

export const KOREAN_FIELDWORK_MAP_VIEWS = {
  SITE_OVERVIEW: 'siteOverview',
} as const;

export type KoreanFieldworkReturnTarget =
  typeof KOREAN_FIELDWORK_RETURN_TARGETS[keyof typeof KOREAN_FIELDWORK_RETURN_TARGETS];

export const canOpenKoreanFieldworkProject = (
  preferences: Pick<Preferences, 'currentProject' | 'projects'>
): boolean => {
  const currentProject = preferences.currentProject.trim();

  return currentProject.length > 0
    && Object.prototype.hasOwnProperty.call(preferences.projects, currentProject);
};

export const getKoreanFieldworkReturnTarget = (
  value: string | string[] | undefined
): KoreanFieldworkReturnTarget => {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  return normalizedValue === KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD
    ? KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD
    : KOREAN_FIELDWORK_RETURN_TARGETS.MAP;
};

export const getKoreanFieldworkReturnParam = (
  returnTarget: KoreanFieldworkReturnTarget
): { returnTo: KoreanFieldworkReturnTarget } => ({
  returnTo: returnTarget,
});

export const getKoreanFieldworkFieldBoardOverviewRoute = (
  resetKey: string
) => ({
  pathname: '/ProjectScreen' as const,
  params: { [KOREAN_FIELDWORK_FIELD_BOARD_RESET_PARAM]: resetKey },
});

export const getKoreanFieldworkSiteOverviewMapRoute = () => ({
  pathname: '/ProjectScreen/DocumentsMap' as const,
  params: {
    [KOREAN_FIELDWORK_MAP_VIEW_PARAM]:
      KOREAN_FIELDWORK_MAP_VIEWS.SITE_OVERVIEW,
  },
});

export const navigateToKoreanFieldworkReturnTarget = (
  returnTarget: KoreanFieldworkReturnTarget,
  highlightedDocId?: string
) => {
  if (returnTarget === KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD) {
    router.navigate('/ProjectScreen');
    return;
  }

  router.navigate({
    pathname: '/ProjectScreen/DocumentsMap',
    params: highlightedDocId ? { highlightedDocId } : {},
  });
};
