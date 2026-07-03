import {
  Document,
  KOREAN_FIELDWORK_RECORD_CREATION_TIMING_DURING_FIELDWORK,
  NewResource,
  ProjectConfiguration,
  Resource,
} from 'idai-field-core';
import {
  FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
  FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
  FEATURE_RECORDING_STATUS_CANDIDATE,
  LAYER_SEQUENCE_MEANING_DEFAULT,
  REFERENCE_BASEMAP_PROVIDER_DEFAULT,
  SOIL_COLOR_ASSIST_STATUS_DEFAULT,
  SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
  SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
  SURVEY_BOUNDARY_ACCURACY_DEFAULT,
  SURVEY_BOUNDARY_SOURCE_DEFAULT,
  SURVEY_BOUNDARY_TYPE_DEFAULT,
} from './Map/korean-fieldwork-drafts';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  getKoreanFieldworkFeatureInterpretationTypeValue,
  getKoreanFieldworkFeatureTypeOption,
} from './korean-fieldwork-feature-types';

const C = KOREAN_FIELDWORK_CATEGORIES;

const DRAFT_IDENTIFIER_PREFIXES: Readonly<Record<string, string>> = {
  [C.AERIAL_MAP_LAYER]: 'aerial-map-layer',
  [C.DAILY_LOG]: 'daily-log',
  [C.DRAWING]: 'drawing',
  [C.FEATURE]: 'feature',
  [C.FEATURE_GROUP]: 'feature-group',
  [C.FEATURE_SEGMENT]: 'feature-segment',
  [C.FIELD_RECORD_QUALITY_REVIEW]: 'field-record-review',
  [C.FIND]: 'find',
  [C.FIND_COLLECTION]: 'find-collection',
  [C.LAYER]: 'layer',
  [C.PEN_MEMO]: 'pen-memo',
  [C.PHOTO]: 'photo',
  [C.SAMPLE]: 'sample',
  [C.SOIL_PROFILE_PHOTO]: 'soil-profile-photo',
  [C.SOURCE_EVIDENCE_INDEX]: 'source-evidence-index',
  [C.SURVEY]: 'survey',
  [C.SURVEY_BOUNDARY]: 'survey-boundary',
  [C.TRENCH]: 'trench',
};

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
  const resource: NewResource = {
    identifier: categoryName === C.SOIL_PROFILE_PHOTO
      ? createLinkedPhotoDraftIdentifier(
        parentDoc,
        categoryName,
        '\ud1a0\uce35\uc0ac\uc9c4',
        options.existingDocuments,
        options.identifier
      )
      : categoryName === C.PHOTO
        ? createLinkedPhotoDraftIdentifier(
          parentDoc,
          categoryName,
          '\uc0ac\uc9c4',
          options.existingDocuments,
          options.identifier
        )
      : createDraftIdentifier(
        categoryName,
        featureTypeOption?.value,
        options.identifier
      ),
    relations: createKoreanFieldworkDraftRelations(parentDoc, categoryName, config),
    category: categoryName,
  };

  if (isFeatureWorkflowCategory(categoryName)) {
    const featureInterpretationTypeValue = getKoreanFieldworkFeatureInterpretationTypeValue(
      featureTypeOption?.value
    );
    const normalizedFeatureGeometryRevisionNote =
      options.featureGeometryRevisionNote?.trim();
    const normalizedFeatureLocationSketch =
      options.featureLocationSketch?.trim();
    const normalizedGeometryConfidence = options.geometryConfidence?.trim();
    const normalizedGeometrySource = options.geometrySource?.trim();
    const normalizedShortDescription = options.shortDescription?.trim();
    const featureGeometry = parseFeatureGeometryOption(options.featureGeometry);

    return {
      ...resource,
      ...(featureGeometry ? { geometry: featureGeometry } : {}),
      ...(featureTypeOption ? { featureType: featureTypeOption.value } : {}),
      ...(featureInterpretationTypeValue
        ? { featureInterpretationType: [featureInterpretationTypeValue] }
        : {}),
      featureRecordingStatus: FEATURE_RECORDING_STATUS_CANDIDATE,
      featureGeometryEditStatus: FEATURE_GEOMETRY_EDIT_STATUS_ROUGH_SKETCH,
      featureGeometryRevisionHistory: FEATURE_GEOMETRY_REVISION_HISTORY_DEFAULT,
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
      featureInvestigationChecklist: [],
      featureSoilProfilePhotoCount: 0,
    };
  }

  if (categoryName === C.TRENCH) {
    return {
      ...resource,
      featureInvestigationChecklist: [],
      recordCreationTiming: KOREAN_FIELDWORK_RECORD_CREATION_TIMING_DURING_FIELDWORK,
      fieldRecordQuality: [],
    };
  }

  if (categoryName === C.LAYER) {
    return {
      ...resource,
      layerSequenceNumber: 1,
      layerSequenceMeaning: LAYER_SEQUENCE_MEANING_DEFAULT,
      soilColorAssistStatus: SOIL_COLOR_ASSIST_STATUS_DEFAULT,
    };
  }

  if (categoryName === C.SOIL_PROFILE_PHOTO) {
    return {
      ...resource,
      soilProfileAnnotationStrokes: '[]',
      soilProfilePhotoAnnotationStrokes: '[]',
      soilProfileLayerMarkers: '[]',
      soilProfileLayerIds: '[]',
      soilProfileColorSwatches: '',
      soilColorAssistCandidates: '',
      soilColorAssistStatus: SOIL_COLOR_ASSIST_STATUS_DEFAULT,
      soilProfilePhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
      soilProfilePhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
      layerSequenceMeaning: LAYER_SEQUENCE_MEANING_DEFAULT,
    };
  }

  if (categoryName === C.PHOTO) {
    return {
      ...resource,
      fieldworkPhotoAnnotationStrokes: '[]',
      fieldworkPhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
      fieldworkPhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
      mediaEvidenceRole: ['fieldResultRecord'],
    };
  }

  if (categoryName === C.DRAWING) {
    return {
      ...resource,
      drawingSketchStrokes: '[]',
      mediaEvidenceRole: ['fieldResultRecord'],
    };
  }

  if (categoryName === C.SURVEY_BOUNDARY) {
    return {
      ...resource,
      surveyBoundaryType: SURVEY_BOUNDARY_TYPE_DEFAULT,
      surveyBoundarySource: SURVEY_BOUNDARY_SOURCE_DEFAULT,
      surveyBoundaryAccuracy: SURVEY_BOUNDARY_ACCURACY_DEFAULT,
      referenceBasemapProvider: REFERENCE_BASEMAP_PROVIDER_DEFAULT,
    };
  }

  if (categoryName === C.PEN_MEMO) {
    return {
      ...resource,
      penMemoStrokes: '[]',
      penMemoTranscriptionStatus: 'pending',
    };
  }

  return resource;
};

export const createKoreanFieldworkDraftRelations = (
  parentDoc: Document,
  categoryName: string,
  config: ProjectConfiguration
): Resource.Relations => {
  const parentCategoryName = parentDoc.resource.category;
  const parentRecordedIn = parentDoc.resource.relations?.isRecordedIn?.[0];
  const isAllowedRelation = (relationName: string) =>
    config.isAllowedRelationDomainCategory(
      categoryName,
      parentCategoryName,
      relationName
    );

  if (
    categoryName === C.AERIAL_MAP_LAYER
    && isAllowedRelation('isMapLayerOf')
  ) {
    return { isMapLayerOf: [parentDoc.resource.id] };
  }

  if (isAllowedRelation('depicts')) {
    return { depicts: [parentDoc.resource.id] };
  }

  if (isAllowedRelation('liesWithin')) {
    const recordedInTarget = parentRecordedIn
      ?? (isAllowedRelation('isRecordedIn') ? parentDoc.resource.id : undefined);

    return {
      ...(recordedInTarget ? { isRecordedIn: [recordedInTarget] } : {}),
      liesWithin: [parentDoc.resource.id],
    };
  }

  if (isAllowedRelation('isRecordedIn')) {
    return { isRecordedIn: [parentDoc.resource.id] };
  }

  return parentRecordedIn
    ? { isRecordedIn: [parentRecordedIn], liesWithin: [parentDoc.resource.id] }
    : { isRecordedIn: [parentDoc.resource.id] };
};

export const createDraftIdentifier = (
  categoryName: string,
  featureType?: string,
  preferredIdentifier?: string
): string => {
  const normalizedPreferredIdentifier = preferredIdentifier?.trim();
  if (normalizedPreferredIdentifier) return normalizedPreferredIdentifier;

  const featureTypeOption = categoryName === C.FEATURE
    ? getKoreanFieldworkFeatureTypeOption(featureType)
    : undefined;
  const prefix = featureTypeOption?.identifierPrefix
    ?? DRAFT_IDENTIFIER_PREFIXES[categoryName]
    ?? toKebabCase(categoryName);

  return `${prefix}-${Date.now()}`;
};

const createLinkedPhotoDraftIdentifier = (
  parentDoc: Document,
  categoryName: string,
  label: string,
  existingDocuments: readonly Document[] = [],
  preferredIdentifier?: string
): string => {
  const normalizedPreferredIdentifier = preferredIdentifier?.trim();
  if (normalizedPreferredIdentifier) return normalizedPreferredIdentifier;

  const parentIdentifier = getParentIdentifier(parentDoc);
  const nextNumber = getNextLinkedPhotoNumber(
    parentDoc.resource.id,
    parentIdentifier,
    categoryName,
    label,
    existingDocuments
  );

  return `${parentIdentifier} ${label} ${nextNumber}`;
};

const getParentIdentifier = (parentDoc: Document): string => {
  const identifier = parentDoc.resource.identifier?.trim()
    || parentDoc.resource.id?.trim();

  return identifier || '\uc720\uad6c';
};

const getNextLinkedPhotoNumber = (
  parentId: string | undefined,
  parentIdentifier: string,
  categoryName: string,
  label: string,
  documents: readonly Document[]
): number => {
  const prefix = `${parentIdentifier} ${label} `;
  const linkedNumbers = documents
    .filter((document) =>
      document.resource.category === categoryName
      && (
        isRelationLinkedToParent(document.resource.relations?.depicts, parentId)
        || isRelationLinkedToParent(document.resource.relations?.liesWithin, parentId)
      ))
    .map((document) => getLinkedPhotoSuffixNumber(
      document.resource.identifier,
      prefix
    ))
    .filter((value): value is number => value !== undefined);

  return linkedNumbers.length > 0
    ? Math.max(...linkedNumbers) + 1
    : 1;
};

const isRelationLinkedToParent = (
  relationTargets: string[] | undefined,
  parentId: string | undefined
): boolean =>
  !!parentId && !!relationTargets?.includes(parentId);

const getLinkedPhotoSuffixNumber = (
  identifier: string | undefined,
  prefix: string
): number | undefined => {
  const normalizedIdentifier = identifier?.trim();
  if (!normalizedIdentifier?.startsWith(prefix)) return undefined;

  const suffix = normalizedIdentifier.slice(prefix.length).trim();
  const parsedNumber = Number.parseInt(suffix, 10);

  return Number.isFinite(parsedNumber) && parsedNumber > 0
    ? parsedNumber
    : undefined;
};

const isFeatureWorkflowCategory = (categoryName: string): boolean =>
  categoryName === C.FEATURE
  || categoryName === C.FEATURE_SEGMENT;

const parseFeatureGeometryOption = (
  featureGeometry?: string
): Record<string, unknown> | undefined => {
  const normalizedFeatureGeometry = featureGeometry?.trim();
  if (!normalizedFeatureGeometry) return undefined;

  try {
    const parsedGeometry = JSON.parse(normalizedFeatureGeometry);
    return isJsonObject(parsedGeometry) && typeof parsedGeometry.type === 'string'
      ? parsedGeometry
      : undefined;
  } catch {
    return undefined;
  }
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
