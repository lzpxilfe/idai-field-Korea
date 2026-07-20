import {
  getKoreanFieldworkCategoryLabel as getCoreKoreanFieldworkCategoryLabel,
  getKoreanFieldworkFeaturePeriodSummary,
  KOREAN_FIELDWORK_CATEGORIES as CORE_KOREAN_FIELDWORK_CATEGORIES,
  KOREAN_FIELDWORK_CATEGORY_LABELS as CORE_KOREAN_FIELDWORK_CATEGORY_LABELS,
  KOREAN_FIELDWORK_CATEGORY_ORDER as CORE_KOREAN_FIELDWORK_CATEGORY_ORDER,
  KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES as CORE_KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES,
  KOREAN_FIELDWORK_FEATURE_WORKFLOW_CATEGORIES as CORE_KOREAN_FIELDWORK_FEATURE_WORKFLOW_CATEGORIES,
  KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_TARGET_CATEGORIES as CORE_KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_TARGET_CATEGORIES,
} from 'idai-field-core';

export const KOREAN_FIELDWORK_CATEGORIES = CORE_KOREAN_FIELDWORK_CATEGORIES;
export const KOREAN_FIELDWORK_CATEGORY_LABELS = CORE_KOREAN_FIELDWORK_CATEGORY_LABELS;
export const KOREAN_FIELDWORK_CATEGORY_ORDER = CORE_KOREAN_FIELDWORK_CATEGORY_ORDER;
export const FEATURE_WORKFLOW_CATEGORIES = CORE_KOREAN_FIELDWORK_FEATURE_WORKFLOW_CATEGORIES;
export const SOIL_PROFILE_PHOTO_TARGET_CATEGORIES =
  CORE_KOREAN_FIELDWORK_SOIL_PROFILE_PHOTO_TARGET_CATEGORIES;
export const EVIDENCE_TARGET_CATEGORIES = CORE_KOREAN_FIELDWORK_EVIDENCE_TARGET_CATEGORIES;

export const KOREAN_FIELDWORK_CATEGORY_DESCRIPTIONS: Readonly<Record<string, string>> = {
  [KOREAN_FIELDWORK_CATEGORIES.AERIAL_MAP_LAYER]:
    '\ub4dc\ub860 \uc815\uc0ac\uc601\uc0c1\uacfc \uae30\uc900 \ubc30\uacbd\uc9c0\ub3c4\ub97c \ud604\uc7a5 \uc9c0\ub3c4\uc5d0 \ub9de\ucda5\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG]:
    '\uc624\ub298\uc758 \uc791\uc5c5 \ubc94\uc704, \ub2f4\ub2f9\uc790, \uad00\ucc30 \ub0b4\uc6a9\uacfc \ubcc0\uacbd\uc0ac\ud56d\uc744 \ubb36\uc2b5\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.DRAWING]:
    '\uc2e4\uce21\ub3c4, \ubd84\ud3ec\ub3c4, \ubcf4\uc815 \ub3c4\uba74 \ub4f1 \ub3c4\uba74 \uc790\ub8cc\ub97c \ucd94\uac00\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.FEATURE]:
    '\uc218\ud608, \uc8fc\uac70\uc9c0, \ubaa9\ucc45, \uad6c\uc0c1\uc720\uad6c\ucc98\ub7fc \uac1c\ubcc4 \uc720\uad6c\ub97c \uae30\ub85d\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP]:
    '\ubaa9\ucc45\uc5f4, \uc218\ud608 \uc5ec\ub7ec \uae30, \uac74\ubb3c\uc9c0 \uc5ec\ub7ec \ub3d9\ucc98\ub7fc \ud568\uaed8 \ub2e4\ub8e8\ub294 \uc720\uad6c\uc785\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT]:
    '\ud53c\ud2b8, \uc808\uac1c\uba74, \ub0b4\ubd80 \ud1f4\uc801\ucc98\ub7fc \uc720\uad6c \uc548\uc5d0\uc11c \ub530\ub85c \uc870\uc0ac\ud55c \uc138\ubd80 \ub2e8\uc704\uc785\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.FIELD_RECORD_QUALITY_REVIEW]:
    '\ud604\uc7a5 \uae30\ub85d, \ud574\uc11d, \ubcf4\uc644 \uba54\ubaa8\ub97c \ub530\ub85c \ub0a8\uae41\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.FIND]:
    '\uac1c\ubcc4 \uc720\ubb3c\uc758 \ucd9c\ud1a0 \ub9e5\ub77d, \uc218\uc2b5 \uc0c1\ud0dc, \ud574\uc11d \uadfc\uac70\ub97c \uae30\ub85d\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION]:
    '\ub3d9\uc77c \ub9e5\ub77d\uc758 \uc720\ubb3c \uc77c\uad04 \uc218\uc2b5 \ub610\ub294 \ubb36\uc74c \uae30\ub85d\uc785\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.LAYER]:
    '\uc0ac\uc9c4\uc5d0 \ud45c\uc2dc\ud55c \ud1a0\uce35 \ubc88\ud638\ubcc4 \ud1a0\uc0c9\uacfc \ud544\uc694\ud55c \uba54\ubaa8\ub97c \ub0a8\uae41\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.OPERATION]:
    '\uc870\uc0ac \uacbd\uacc4 \uc548\uc5d0\uc11c \uc720\uad6c\ub098 \ud2b8\ub80c\uce58, \uc720\ubb3c \uae30\ub85d\uc744 \uc774\uc5b4 \ubd99\uc774\ub294 \uad6c\uc5ed \uae30\ub85d\uc785\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO]:
    '\ud0dc\ube14\ub9bf\uc5d0\uc11c \ubc14\ub85c \uc801\ub294 \uc190\uae00\uc528 \uba54\ubaa8\uc640 \uc804\uc0ac \uc0c1\ud0dc\ub97c \ub0a8\uae41\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.PHOTO]:
    '\ud604\uc7a5 \uc0ac\uc9c4, \uc720\ubb3c \uc0ac\uc9c4, \ubcf4\uace0\uc11c\uc6a9 \uc0ac\uc9c4 \uadfc\uac70\ub97c \ucd94\uac00\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.SAMPLE]:
    '\ud1a0\uc591, \ubaa9\ud0c4, \uc720\uae30\ubb3c, \uc790\uc5f0\uacfc\ud559 \ubd84\uc11d\uc6a9 \uc2dc\ub8cc\ub97c \uae30\ub85d\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO]:
    '\ud1a0\uce35 \ub2e8\uba74 \uc0ac\uc9c4\uacfc \ud1a0\uce35 \ubc88\ud638, \ud1a0\uc0c9 \uae30\ub85d\uc744 \ub0a8\uae41\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.SOURCE_EVIDENCE_INDEX]:
    '\ubcf4\uace0\uc11c\u00b7\ubb38\ud5cc\u00b7\uc6d0\uc790\ub8cc\uc758 \uadfc\uac70\uc790\ub8cc\ub97c \ub098\uc911\uc5d0 \ucd94\uc801\ud560 \uc218 \uc788\uac8c \uc0c9\uc778\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.SURVEY]:
    '\uc9c0\ud45c\uc870\uc0ac, \uc2dc\uad74 \uc804 \ub2e8\uacc4, \uc870\uc0ac \ubc29\ubc95\uacfc \uad00\ucc30 \uc870\uac74\uc744 \uae30\ub85d\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY]:
    '\uc870\uc0ac \ubc94\uc704, \uad6c\uc5ed\uc120, \ubc30\uacbd\uc9c0\ub3c4 \ucd9c\ucc98\uc640 \uc815\ud655\ub3c4\ub97c \uae30\ub85d\ud569\ub2c8\ub2e4.',
  [KOREAN_FIELDWORK_CATEGORIES.TRENCH]:
    '\uc2dc\uad74\u00b7\ud45c\ubcf8 \ud2b8\ub80c\uce58\uc758 \uc704\uce58\uc640 \ubc94\uc704\ub97c \uc7a1\uc2b5\ub2c8\ub2e4.',
};

export const KOREAN_FIELDWORK_HIDDEN_ADD_CATEGORIES: readonly string[] = [
  'Image',
  'Process',
  'Project',
  'StoragePlace',
  'Type',
  'TypeCatalog',
  KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP,
  KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
  KOREAN_FIELDWORK_CATEGORIES.LAYER,
  KOREAN_FIELDWORK_CATEGORIES.PLACE,
];

export const FEATURE_CANDIDATE_PARENT_CATEGORIES: readonly string[] = [
  KOREAN_FIELDWORK_CATEGORIES.OPERATION,
  KOREAN_FIELDWORK_CATEGORIES.TRENCH,
];

export const getKoreanFieldworkCategoryLabel = (
  categoryName: string
): string => getCoreKoreanFieldworkCategoryLabel(categoryName);

export const getKoreanFieldworkDisplayIdentifier = (
  identifier?: string
): string => {
  const value = (identifier ?? '').trim();
  if (!value) return '';

  return value
    .replace(/^\ud604\uc7a5\ub2e8\uc704-/, '\uc870\uc0ac\uad6c\uc5ed-')
    .replace(/^\uc870\uc0ac\uae30\uc900-/, '\uc870\uc0ac\uad6c\uc5ed-');
};

export const getKoreanFieldworkFeaturePeriodDisplayLabel = (
  resource: {
    category: string;
    period?: unknown;
  }
): string | undefined => {
  if (resource.category !== KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
    return undefined;
  }

  return getKoreanFieldworkFeaturePeriodSummary(resource.period)
    ?? '\uc2dc\uae30\ubbf8\uc0c1';
};

export const getKoreanFieldworkResourceDisplayIdentifier = (
  resource: {
    category: string;
    identifier?: string;
    period?: unknown;
  },
  fallbackIdentifier = ''
): string => {
  const identifier = getKoreanFieldworkDisplayIdentifier(resource.identifier)
    || fallbackIdentifier.trim()
    || getKoreanFieldworkCategoryLabel(resource.category);
  const periodLabel = getKoreanFieldworkFeaturePeriodDisplayLabel(resource);
  const identifierWithoutLegacyPeriod = periodLabel
    ? stripLegacyFeaturePeriodPrefix(identifier)
    : identifier;

  return periodLabel
    ? `[${periodLabel}] ${identifierWithoutLegacyPeriod}`
    : identifier;
};

const stripLegacyFeaturePeriodPrefix = (identifier: string): string => {
  const withoutPeriod = identifier.replace(
    /^(?:\uc2dc\uae30\ubbf8\uc0c1|\uad6c\uc11d\uae30(?:\uc2dc\ub300)?|\uc2e0\uc11d\uae30(?:\uc2dc\ub300)?|\uccad\ub3d9\uae30(?:\uc2dc\ub300)?|\ucd08\uae30\ucca0\uae30(?:\uc2dc\ub300)?|\uc6d0\uc0bc\uad6d(?:\uc2dc\ub300)?|\uc0bc\uad6d(?:\uc2dc\ub300)?|\ud1b5\uc77c\uc2e0\ub77c(?:\uc2dc\ub300)?|\uace0\ub824(?:\uc2dc\ub300)?|\uc870\uc120(?:\uc2dc\ub300)?|\uadfc\ud604\ub300(?:\uc2dc\ub300)?)(?=\s|[\u00b7:\-\u2013\u2014]|\d|$)\s*(?:[\u00b7:\-\u2013\u2014]\s*)?/,
    ''
  ).trim();

  return withoutPeriod || identifier;
};

export const getKoreanFieldworkCategoryDescription = (
  categoryName: string
): string =>
  KOREAN_FIELDWORK_CATEGORY_DESCRIPTIONS[categoryName]
  ?? '\ud604\uc7a5 \uae30\ub85d\uc5d0 \ud544\uc694\ud55c \ud575\uc2ec \uc815\ubcf4\ub97c \uc774\uc5b4\uc11c \uc785\ub825\ud569\ub2c8\ub2e4.';
