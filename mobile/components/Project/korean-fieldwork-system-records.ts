import type {
  Document,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';

export const KOREAN_FIELDWORK_INITIAL_OPERATION_ID =
  'initial-fieldwork-operation';
export const KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID =
  'initial-survey-boundary';
export const KOREAN_FIELDWORK_INITIAL_BOUNDARY_SYSTEM_RECORD =
  'initialProjectBoundary';

const OPERATION_CATEGORY = 'Operation';
const SURVEY_BOUNDARY_CATEGORY = 'SurveyBoundary';
const FEATURE_GROUP_CATEGORY = 'FeatureGroup';
const PROJECT_BOUNDARY_SETUP_STATE = 'draftBoundary';

export const isKoreanFieldworkInitialBoundaryDocument = (
  document: Document | undefined
): boolean => {
  if (!document) return false;

  const resource = document.resource as unknown as Record<string, unknown>;

  return resource.id === KOREAN_FIELDWORK_INITIAL_OPERATION_ID
    || resource.id === KOREAN_FIELDWORK_INITIAL_SURVEY_BOUNDARY_ID
    || resource.koreanFieldworkSystemRecord
      === KOREAN_FIELDWORK_INITIAL_BOUNDARY_SYSTEM_RECORD
    || isProjectBoundarySetupOperation(document);
};

export const getKoreanFieldworkUserVisibleDocuments = (
  documents: Document[]
): Document[] => {
  const hiddenDocumentIds = new Set<string>();

  documents.forEach((document) => {
    if (
      isKoreanFieldworkInitialBoundaryDocument(document)
      || document.resource.category === FEATURE_GROUP_CATEGORY
    ) {
      hiddenDocumentIds.add(document.resource.id);
    }
  });
  documents.forEach((document) => {
    if (isProjectBoundarySetupSurveyBoundary(document, hiddenDocumentIds)) {
      hiddenDocumentIds.add(document.resource.id);
    }
  });

  return documents.filter((document) =>
    !hiddenDocumentIds.has(document.resource.id)
  );
};

export const getKoreanFieldworkUserVisibleTodaySummary = (
  summary: KoreanFieldworkTodaySummary,
  userVisibleDocuments: Document[]
): KoreanFieldworkTodaySummary => {
  const userVisibleDocumentIds = new Set(userVisibleDocuments.map((document) =>
    document.resource.id
  ));
  const openIssues = summary.openIssues.filter((issue) =>
    userVisibleDocumentIds.has(issue.documentId)
  );

  return {
    dailyLogs: filterVisibleDocuments(summary.dailyLogs, userVisibleDocumentIds),
    surveyBoundaries: filterVisibleDocuments(
      summary.surveyBoundaries,
      userVisibleDocumentIds
    ),
    featureCandidates: filterVisibleDocuments(
      summary.featureCandidates,
      userVisibleDocumentIds
    ),
    openIssues,
    issueCountByDocumentId: openIssues.reduce((index, issue) => {
      index[issue.documentId] = (index[issue.documentId] ?? 0) + 1;
      return index;
    }, {} as { [documentId: string]: number }),
  };
};

const filterVisibleDocuments = (
  documents: Document[],
  userVisibleDocumentIds: Set<string>
): Document[] => documents.filter((document) =>
  userVisibleDocumentIds.has(document.resource.id)
);

const isProjectBoundarySetupOperation = (
  document: Document
): boolean => {
  const resource = document.resource as unknown as Record<string, unknown>;

  return resource.category === OPERATION_CATEGORY
    && resource.projectBoundarySetupState === PROJECT_BOUNDARY_SETUP_STATE
    && hasTextValue(resource.projectBoundarySummary);
};

const isProjectBoundarySetupSurveyBoundary = (
  document: Document,
  hiddenDocumentIds: Set<string>
): boolean => {
  const resource = document.resource as unknown as Record<string, unknown>;

  return resource.category === SURVEY_BOUNDARY_CATEGORY
    && getRelationTargets(resource, 'isRecordedIn')
      .some((targetId) => hiddenDocumentIds.has(targetId));
};

const getRelationTargets = (
  resource: Record<string, unknown>,
  relationName: string
): string[] => {
  const relations = resource.relations as Record<string, unknown> | undefined;
  const relationTargets = relations?.[relationName];

  return Array.isArray(relationTargets)
    ? relationTargets.filter((target): target is string =>
      typeof target === 'string')
    : [];
};

const hasTextValue = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;
