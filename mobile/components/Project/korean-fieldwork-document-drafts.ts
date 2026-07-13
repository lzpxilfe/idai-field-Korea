import {
  createKoreanFieldworkDraftBaseResource,
  createKoreanFieldworkDraftIdentifier,
  createKoreanFieldworkDraftRelations as createCoreKoreanFieldworkDraftRelations,
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

const C = KOREAN_FIELDWORK_CATEGORIES;

export interface KoreanFieldworkDraftResourceOptions {
  existingDocuments?: readonly Document[];
  featureGeometry?: string;
  featureGeometryRevisionNote?: string;
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
      ...getKoreanFieldworkDraftFieldDefaults(categoryName, {
        geometryConfidence: normalizedGeometryConfidence,
        geometrySource: normalizedGeometrySource,
      }),
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
  if (categoryName === C.FEATURE_SEGMENT) return '피트';
  if (categoryName === C.FIND) return '유물';
  if (categoryName === C.SAMPLE) return '시료';
  if (categoryName === C.PHOTO) return '사진';
  if (categoryName === C.SOIL_PROFILE_PHOTO) return '토층사진';

  return undefined;
};

const isFeatureWorkflowCategory = (categoryName: string): boolean =>
  categoryName === C.FEATURE
  || categoryName === C.FEATURE_GROUP
  || categoryName === C.FEATURE_SEGMENT;
