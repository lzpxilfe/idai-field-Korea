import { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  KoreanFieldworkInvestigationModeId,
  shouldUseKoreanFieldworkTrenchWorkflow,
} from './korean-fieldwork-investigation-mode';

export const getKoreanFieldworkRecordBoardCategories = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string[] => [
  KOREAN_FIELDWORK_CATEGORIES.OPERATION,
  KOREAN_FIELDWORK_CATEGORIES.SURVEY,
  KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY,
  ...(shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
    ? [KOREAN_FIELDWORK_CATEGORIES.TRENCH]
    : []),
  KOREAN_FIELDWORK_CATEGORIES.FEATURE_GROUP,
  KOREAN_FIELDWORK_CATEGORIES.FEATURE,
];

export const getKoreanFieldworkRecordBoardDocuments = (
  documents: Document[],
  investigationModeId?: KoreanFieldworkInvestigationModeId
): Document[] => {
  const recordCategories = new Set(
    getKoreanFieldworkRecordBoardCategories(investigationModeId)
  );
  return documents.filter((document) =>
    recordCategories.has(document.resource.category)
  );
};
