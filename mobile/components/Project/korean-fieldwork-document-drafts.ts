import {
  createKoreanFieldworkDraftBaseResource,
  createKoreanFieldworkDraftIdentifier,
  createKoreanFieldworkDraftRelations as createCoreKoreanFieldworkDraftRelations,
  CategoryForm,
  getKoreanFieldworkFeatureDraftValues,
  parseKoreanFieldworkFeatureGeometryOption,
  Document,
  getKoreanFieldworkDraftFieldDefaults,
  NewResource,
  ProjectConfiguration,
  Resource,
} from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  getKoreanFieldworkFeatureTypeOption,
} from './korean-fieldwork-feature-types';
import { parseKoreanFieldworkFeatureMeasurements }
  from './korean-fieldwork-feature-measurement-draft';

const C = KOREAN_FIELDWORK_CATEGORIES;

export interface KoreanFieldworkDraftResourceOptions {
  existingDocuments?: readonly Document[];
  featureGeometry?: string;
  featureGeometryRevisionNote?: string;
  featureMeasurements?: string;
  featureLocationSketch?: string;
  featureType?: string;
  geometryConfidence?: string;
  geometrySource?: string;
  identifier?: string;
  shortDescription?: string;
}

export const createKoreanFieldworkDraftResource = (
  parentDoc: Document,
  categoryName: string,
  config: ProjectConfiguration,
  options: KoreanFieldworkDraftResourceOptions = {}
): NewResource => {
  const featureTypeOption = categoryName === C.FEATURE
    ? getKoreanFieldworkFeatureTypeOption(options.featureType)
    : undefined;
  const featureCategory = categoryName === C.FEATURE
    ? getCategorySafely(config, categoryName)
    : undefined;
  const inheritedFeaturePeriod = featureCategory
    && CategoryForm.getField(featureCategory, 'period')
    ? getKoreanFieldworkInheritedFeaturePeriod(
      parentDoc,
      options.existingDocuments ?? []
    )
    : undefined;
  const resource = createKoreanFieldworkDraftBaseResource(
    parentDoc,
    categoryName,
    config,
    {
      existingDocuments: options.existingDocuments,
      featureType: featureTypeOption?.value,
      identifier: options.identifier,
      linkedIdentifierLabel: getLinkedIdentifierLabel(categoryName),
    }
  );

  if (isFeatureWorkflowCategory(categoryName)) {
    const featureDraftValues = featureTypeOption
      ? getKoreanFieldworkFeatureDraftValues(featureTypeOption.value)
      : undefined;
    const featureMeasurementValues = categoryName === C.FEATURE
      ? parseKoreanFieldworkFeatureMeasurements(options.featureMeasurements)
      : {};
    const normalizedFeatureGeometryRevisionNote =
      options.featureGeometryRevisionNote?.trim();
    const normalizedFeatureLocationSketch =
      options.featureLocationSketch?.trim();
    const normalizedGeometryConfidence = options.geometryConfidence?.trim();
    const normalizedGeometrySource = options.geometrySource?.trim();
    const normalizedShortDescription = options.shortDescription?.trim();
    const featureGeometry = parseKoreanFieldworkFeatureGeometryOption(options.featureGeometry);

    return {
      ...resource,
      ...(featureGeometry ? { geometry: featureGeometry } : {}),
      ...(featureDraftValues ?? {}),
      ...featureMeasurementValues,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName, {
        geometryConfidence: normalizedGeometryConfidence,
        geometrySource: normalizedGeometrySource,
      }),
      ...(inheritedFeaturePeriod
        ? { period: inheritedFeaturePeriod }
        : {}),
      ...(normalizedGeometryConfidence
        ? { geometryConfidence: normalizedGeometryConfidence }
        : {}),
      ...(normalizedGeometrySource
        ? { geometrySource: normalizedGeometrySource }
        : {}),
      ...(normalizedFeatureGeometryRevisionNote
        ? { featureGeometryRevisionNote: normalizedFeatureGeometryRevisionNote }
        : {}),
      ...(normalizedFeatureLocationSketch
        ? { featureLocationSketch: normalizedFeatureLocationSketch }
        : {}),
      ...(normalizedShortDescription
        ? { shortDescription: normalizedShortDescription }
        : {}),
    };
  }

  if (categoryName === C.TRENCH) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  if (categoryName === C.LAYER) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  if (categoryName === C.SOIL_PROFILE_PHOTO) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  if (categoryName === C.PHOTO) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  if (categoryName === C.DRAWING) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  if (categoryName === C.SURVEY_BOUNDARY) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  if (categoryName === C.PEN_MEMO) {
    return {
      ...resource,
      ...getKoreanFieldworkDraftFieldDefaults(categoryName),
    };
  }

  return resource;
};

export const createKoreanFieldworkDraftRelations = (
  parentDoc: Document,
  categoryName: string,
  config: ProjectConfiguration
): Resource.Relations => {
  return createCoreKoreanFieldworkDraftRelations(parentDoc, categoryName, config);
};

export const createDraftIdentifier = (
  categoryName: string,
  featureType?: string,
  preferredIdentifier?: string
): string => {
  return createKoreanFieldworkDraftIdentifier(categoryName, featureType, preferredIdentifier);
};

const getLinkedIdentifierLabel = (categoryName: string): string | undefined => {
  return KOREAN_FIELDWORK_LINKED_IDENTIFIER_LABELS[categoryName];
};

export const KOREAN_FIELDWORK_LINKED_IDENTIFIER_LABELS: Readonly<Record<string, string>> = {
  [C.AERIAL_MAP_LAYER]: '지도',
  [C.DAILY_LOG]: '작업일지',
  [C.DRAWING]: '도면',
  [C.FEATURE_GROUP]: '관련유구',
  [C.FEATURE_SEGMENT]: '피트',
  [C.FIELD_RECORD_QUALITY_REVIEW]: '보완메모',
  [C.FIND]: '유물',
  [C.FIND_COLLECTION]: '유물일괄',
  [C.LAYER]: '토층',
  [C.PEN_MEMO]: '메모',
  [C.PHOTO]: '사진',
  [C.SAMPLE]: '시료',
  [C.SOIL_PROFILE_PHOTO]: '토층사진',
  [C.SOURCE_EVIDENCE_INDEX]: '근거자료',
  [C.SURVEY]: '지표조사',
  [C.SURVEY_BOUNDARY]: '조사경계',
  [C.TRENCH]: '트렌치',
};

const isFeatureWorkflowCategory = (categoryName: string): boolean =>
  categoryName === C.FEATURE
  || categoryName === C.FEATURE_GROUP
  || categoryName === C.FEATURE_SEGMENT;

export const getKoreanFieldworkInheritedFeaturePeriod = (
  parentDoc: Document,
  existingDocuments: readonly Document[]
): { value: string; endValue?: string } | undefined => {
  const parentId = parentDoc.resource.id;
  if (!parentId) return undefined;

  let latest: {
    index: number;
    period: { value: string; endValue?: string };
    timestamp: number;
  } | undefined;

  existingDocuments.forEach((document, index) => {
    if (
      document.resource.category !== C.FEATURE
      || !isDirectChildOf(document, parentId)
    ) {
      return;
    }

    const period = normalizeFeaturePeriod(document.resource.period);
    if (!period) return;

    const timestamp = getDocumentTimestamp(document);
    if (
      !latest
      || timestamp > latest.timestamp
      || (timestamp === latest.timestamp && index > latest.index)
    ) {
      latest = { index, period, timestamp };
    }
  });

  return latest
    ? {
      value: latest.period.value,
      ...(latest.period.endValue
        ? { endValue: latest.period.endValue }
        : {}),
    }
    : undefined;
};

const normalizeFeaturePeriod = (
  value: unknown
): { value: string; endValue?: string } | undefined => {
  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    return normalizedValue ? { value: normalizedValue } : undefined;
  }
  if (!value || typeof value !== 'object') return undefined;

  const range = value as { value?: unknown; endValue?: unknown };
  if (typeof range.value !== 'string' || !range.value.trim()) return undefined;
  if (
    Object.prototype.hasOwnProperty.call(range, 'endValue')
    && (typeof range.endValue !== 'string' || !range.endValue.trim())
  ) {
    return undefined;
  }
  const endValue = typeof range.endValue === 'string'
    ? range.endValue.trim()
    : '';

  return {
    value: range.value.trim(),
    ...(endValue ? { endValue } : {}),
  };
};

const isDirectChildOf = (document: Document, parentId: string): boolean => {
  const relations = document.resource.relations as
    | Record<string, unknown>
    | undefined;
  const liesWithin = getRelationTargets(relations?.liesWithin);
  if (liesWithin.length > 0) return liesWithin.includes(parentId);

  return getRelationTargets(relations?.isRecordedIn).includes(parentId);
};

const getRelationTargets = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((target): target is string => typeof target === 'string')
    : [];

const getDocumentTimestamp = (document: Document): number => {
  const modifications = Array.isArray(document.modified)
    ? document.modified
    : [];
  const dateValue = modifications[modifications.length - 1]?.date
    ?? document.created?.date;
  const timestamp = dateValue instanceof Date
    ? dateValue.getTime()
    : typeof dateValue === 'string' || typeof dateValue === 'number'
      ? new Date(dateValue).getTime()
      : Number.NEGATIVE_INFINITY;

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const getCategorySafely = (
  config: ProjectConfiguration,
  categoryName: string
): CategoryForm | undefined => {
  try {
    return config.getCategory(categoryName);
  } catch {
    return undefined;
  }
};
