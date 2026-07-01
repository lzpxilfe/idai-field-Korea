import {
  getKoreanFieldworkCategoryDescription,
  getKoreanFieldworkCategoryLabel,
  KOREAN_FIELDWORK_CATEGORIES,
  KOREAN_FIELDWORK_CATEGORY_ORDER,
  KOREAN_FIELDWORK_HIDDEN_ADD_CATEGORIES,
} from './korean-fieldwork-categories';
import {
  KoreanFieldworkInvestigationModeId,
  shouldUseKoreanFieldworkTrenchWorkflow,
} from './korean-fieldwork-investigation-mode';

export interface KoreanFieldworkAddOption {
  categoryName: string;
  label: string;
  description: string;
}

export interface KoreanFieldworkAddOptionGroups {
  primary: KoreanFieldworkAddOption[];
  special: KoreanFieldworkAddOption[];
  other: KoreanFieldworkAddOption[];
}

const C = KOREAN_FIELDWORK_CATEGORIES;

const PRIMARY_OPTIONS_BY_PARENT: Readonly<Record<string, readonly string[]>> = {
  [C.OPERATION]: [
    C.TRENCH,
    C.FEATURE,
    C.SURVEY_BOUNDARY,
    C.DAILY_LOG,
    C.FIELD_RECORD_QUALITY_REVIEW,
    C.AERIAL_MAP_LAYER,
    C.PEN_MEMO,
  ],
  [C.TRENCH]: [
    C.FEATURE,
    C.LAYER,
    C.FIND,
    C.FIND_COLLECTION,
    C.SAMPLE,
    C.SOIL_PROFILE_PHOTO,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.FEATURE]: [
    C.FEATURE_SEGMENT,
    C.LAYER,
    C.FIND,
    C.SAMPLE,
    C.SOIL_PROFILE_PHOTO,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.FEATURE_SEGMENT]: [
    C.LAYER,
    C.FIND,
    C.SAMPLE,
    C.SOIL_PROFILE_PHOTO,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.LAYER]: [
    C.SAMPLE,
    C.FIND,
    C.SOIL_PROFILE_PHOTO,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.SURVEY]: [
    C.SURVEY_BOUNDARY,
    C.FIND_COLLECTION,
    C.FIND,
    C.SAMPLE,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.FIND_COLLECTION]: [
    C.FIND,
    C.SAMPLE,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.FIND]: [
    C.SAMPLE,
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
  [C.SAMPLE]: [
    C.PEN_MEMO,
    C.PHOTO,
    C.DRAWING,
  ],
};

const PRIMARY_ONLY_CATEGORIES = new Set<string>([
  C.AERIAL_MAP_LAYER,
  C.DAILY_LOG,
  C.FIELD_RECORD_QUALITY_REVIEW,
  C.SURVEY_BOUNDARY,
]);

export const KOREAN_FIELDWORK_HIERARCHY_HELP =
  '여기서는 층위 선후를 정하지 않습니다. 새 기록이 어느 조사 경계, 유구, 트렌치에 포함되는지만 정합니다.';

export const getKoreanFieldworkAddOptions = (
  parentCategoryName: string,
  allowedCategoryNames: readonly string[],
  investigationModeId?: KoreanFieldworkInvestigationModeId
): KoreanFieldworkAddOptionGroups => {
  const allowedSet = new Set(allowedCategoryNames
    .filter(isVisibleAddCategory)
    .filter((categoryName) => isAllowedForInvestigationMode(
      parentCategoryName,
      categoryName,
      investigationModeId
    )));
  const specialNames = getSpecialOptionNames(
    parentCategoryName,
    allowedSet,
    investigationModeId
  );
  const specialSet = new Set(specialNames);
  const primaryNames = (PRIMARY_OPTIONS_BY_PARENT[parentCategoryName] ?? [])
    .filter((categoryName) =>
      allowedSet.has(categoryName) && !specialSet.has(categoryName)
    );
  const primarySet = new Set(primaryNames);
  const otherNames = [...allowedSet]
    .filter((categoryName) => !primarySet.has(categoryName))
    .filter((categoryName) => !specialSet.has(categoryName))
    .filter((categoryName) => !PRIMARY_ONLY_CATEGORIES.has(categoryName))
    .sort(compareKoreanFieldworkCategoryNames);

  return {
    primary: primaryNames.map(toOption),
    special: specialNames.map(toSpecialOption),
    other: otherNames.map(toOption),
  };
};

export const isVisibleAddCategory = (categoryName: string): boolean =>
  !KOREAN_FIELDWORK_HIDDEN_ADD_CATEGORIES.includes(categoryName);

const toOption = (categoryName: string): KoreanFieldworkAddOption => ({
  categoryName,
  label: getKoreanFieldworkCategoryLabel(categoryName),
  description: getKoreanFieldworkCategoryDescription(categoryName),
});

const toSpecialOption = (categoryName: string): KoreanFieldworkAddOption => {
  if (categoryName === C.TRENCH) {
    return {
      categoryName,
      label: getKoreanFieldworkCategoryLabel(categoryName),
      description:
        '발굴조사에서는 보통 유구를 바로 추가합니다. 조사지역을 예외적으로 트렌치로 나눌 때만 사용하세요.',
    };
  }

  return toOption(categoryName);
};

const getSpecialOptionNames = (
  parentCategoryName: string,
  allowedCategoryNames: Set<string>,
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string[] => {
  void parentCategoryName;
  void allowedCategoryNames;
  void investigationModeId;
  return [];
};

const isAllowedForInvestigationMode = (
  parentCategoryName: string,
  categoryName: string,
  investigationModeId?: KoreanFieldworkInvestigationModeId
): boolean => {
  if (parentCategoryName === C.FEATURE_GROUP) return false;

  if (
    parentCategoryName === C.OPERATION
    && categoryName === C.FEATURE
    && shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
  ) {
    return false;
  }

  return !(
    parentCategoryName === C.OPERATION
    && categoryName === C.TRENCH
    && !shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
  );
};

const compareKoreanFieldworkCategoryNames = (
  categoryNameA: string,
  categoryNameB: string
): number => {
  const indexA = KOREAN_FIELDWORK_CATEGORY_ORDER.indexOf(categoryNameA);
  const indexB = KOREAN_FIELDWORK_CATEGORY_ORDER.indexOf(categoryNameB);
  const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
  const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

  return orderA === orderB
    ? categoryNameA.localeCompare(categoryNameB)
    : orderA - orderB;
};
