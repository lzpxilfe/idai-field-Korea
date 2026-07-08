import { CategoryForm } from '../model/configuration/category-form';
import { Document } from '../model/document/document';
import { NewResource, Resource } from '../model/document/resource';
import { ProjectConfiguration } from '../services/project-configuration';
import {
    getKoreanFieldworkFeatureIdentifierPrefix,
    getKoreanFieldworkFeatureInterpretationTypeValue,
    getKoreanFieldworkFeatureTypeOption
} from './korean-fieldwork-feature-types';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-record-contract';


export interface KoreanFieldworkContinuationAction {
    id: string;
    categoryName: string;
    relationName: string;
}

export interface KoreanFieldworkDraftBaseResourceOptions {
    existingDocuments?: readonly Document[];
    featureType?: string;
    identifier?: string;
    linkedIdentifierLabel?: string;
}

export type KoreanFieldworkFeatureDraftValues = {
    featureType: string;
    featureInterpretationType?: string[];
};

const C = KOREAN_FIELDWORK_CATEGORIES;

export const KOREAN_FIELDWORK_DRAFT_IDENTIFIER_PREFIXES: Readonly<Record<string, string>> = {
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
    [C.TRENCH]: 'trench'
};

const CONTINUATION_CATEGORIES = new Set<string>([
    C.OPERATION,
    C.TRENCH,
    C.FEATURE_GROUP,
    C.FEATURE,
    C.FEATURE_SEGMENT,
    C.LAYER,
    C.SURVEY,
    C.SURVEY_BOUNDARY,
    C.FIND,
    C.FIND_COLLECTION,
    C.SAMPLE,
    C.PHOTO,
    C.SOIL_PROFILE_PHOTO,
    C.DRAWING,
    C.PEN_MEMO,
    C.DAILY_LOG,
    C.FIELD_RECORD_QUALITY_REVIEW
]);

const NEXT_CHILD_CATEGORY: Readonly<Record<string, string|undefined>> = {
    [C.OPERATION]: C.TRENCH,
    [C.TRENCH]: C.FEATURE,
    [C.FEATURE_GROUP]: C.FEATURE,
    [C.FEATURE]: C.FEATURE_SEGMENT,
    [C.FEATURE_SEGMENT]: C.LAYER
};

const EVIDENCE_CATEGORY_PRIORITY: Readonly<Record<string, readonly string[]>> = {
    [C.OPERATION]: [C.SURVEY_BOUNDARY, C.DAILY_LOG, C.PEN_MEMO],
    [C.TRENCH]: [C.PHOTO, C.DRAWING, C.SOIL_PROFILE_PHOTO, C.PEN_MEMO],
    [C.FEATURE_GROUP]: [C.PHOTO, C.DRAWING, C.PEN_MEMO],
    [C.FEATURE]: [C.PHOTO, C.SOIL_PROFILE_PHOTO, C.DRAWING, C.PEN_MEMO, C.FIND, C.SAMPLE],
    [C.FEATURE_SEGMENT]: [C.PHOTO, C.SOIL_PROFILE_PHOTO, C.DRAWING, C.PEN_MEMO, C.FIND, C.SAMPLE],
    [C.LAYER]: [C.SOIL_PROFILE_PHOTO, C.SAMPLE, C.PHOTO, C.DRAWING, C.PEN_MEMO],
    [C.SURVEY]: [C.SURVEY_BOUNDARY, C.FIND_COLLECTION, C.FIND, C.PHOTO, C.PEN_MEMO],
    [C.FIND_COLLECTION]: [C.FIND, C.PHOTO, C.PEN_MEMO],
    [C.FIND]: [C.PHOTO, C.DRAWING, C.SAMPLE, C.PEN_MEMO],
    [C.SAMPLE]: [C.PHOTO, C.PEN_MEMO]
};

const RELATION_LABEL_ORDER = ['liesWithin', 'depicts', 'isRecordedIn', 'isMapLayerOf'];


export function getKoreanFieldworkContinuationActions(
        parentDoc: Document,
        projectConfiguration: ProjectConfiguration
): KoreanFieldworkContinuationAction[] {

    const parentCategoryName = parentDoc?.resource?.category;
    if (!parentDoc?.resource?.id || !CONTINUATION_CATEGORIES.has(parentCategoryName)) return [];

    const candidateCategoryNames = dedupe([
        NEXT_CHILD_CATEGORY[parentCategoryName],
        ...(EVIDENCE_CATEGORY_PRIORITY[parentCategoryName] ?? [])
    ].filter((categoryName): categoryName is string => !!categoryName));

    return candidateCategoryNames
        .map(categoryName => makeContinuationAction(categoryName, parentDoc, projectConfiguration))
        .filter((action): action is KoreanFieldworkContinuationAction => action !== undefined)
        .slice(0, 5);
}


export function createKoreanFieldworkDraftBaseResource(
        parentDoc: Document,
        categoryName: string,
        projectConfiguration: ProjectConfiguration,
        options: KoreanFieldworkDraftBaseResourceOptions = {}
): NewResource {

    return {
        identifier: options.linkedIdentifierLabel
            ? createKoreanFieldworkLinkedDraftIdentifier(
                parentDoc,
                categoryName,
                options.linkedIdentifierLabel,
                options.existingDocuments,
                options.identifier
            )
            : createKoreanFieldworkDraftIdentifier(
                categoryName,
                categoryName === C.FEATURE ? options.featureType : undefined,
                options.identifier
            ),
        relations: createKoreanFieldworkDraftRelations(parentDoc, categoryName, projectConfiguration),
        category: categoryName
    };
}


export function createKoreanFieldworkDraftRelations(
        parentDoc: Document,
        categoryName: string,
        projectConfiguration: ProjectConfiguration
): Resource.Relations {

    const parentCategoryName = parentDoc.resource.category;
    const parentRecordedIn = parentDoc.resource.relations?.isRecordedIn?.[0];
    const isAllowedRelation = (relationName: string) =>
        projectConfiguration.isAllowedRelationDomainCategory(
            categoryName,
            parentCategoryName,
            relationName
        );

    if (categoryName === C.AERIAL_MAP_LAYER && isAllowedRelation('isMapLayerOf')) {
        return { isMapLayerOf: [parentDoc.resource.id] };
    }

    if (isAllowedRelation('depicts')) return { depicts: [parentDoc.resource.id] };

    if (isAllowedRelation('liesWithin')) {
        const recordedInTarget = parentRecordedIn
            ?? (isAllowedRelation('isRecordedIn') ? parentDoc.resource.id : undefined);

        return {
            ...(recordedInTarget ? { isRecordedIn: [recordedInTarget] } : {}),
            liesWithin: [parentDoc.resource.id]
        };
    }

    if (isAllowedRelation('isRecordedIn')) return { isRecordedIn: [parentDoc.resource.id] };

    return parentRecordedIn
        ? { isRecordedIn: [parentRecordedIn], liesWithin: [parentDoc.resource.id] }
        : { isRecordedIn: [parentDoc.resource.id] };
}


export function canCreateKoreanFieldworkChildRecord(
        category: CategoryForm,
        parentDoc: Document,
        projectConfiguration: ProjectConfiguration
): boolean {

    if (!category || category.name === 'Image') return false;

    const canUseRelation = (relationName: string) =>
        projectConfiguration.isAllowedRelationDomainCategory(
            category.name,
            parentDoc.resource.category,
            relationName
        );

    return (
        (canUseRelation('isRecordedIn') && !category.mustLieWithin)
        || canUseRelation('liesWithin')
        || canUseRelation('depicts')
        || canUseRelation('isMapLayerOf')
    );
}


export function createKoreanFieldworkDraftIdentifier(
        categoryName: string,
        featureType?: string,
        preferredIdentifier?: string): string {

    const normalizedPreferredIdentifier = preferredIdentifier?.trim();
    if (normalizedPreferredIdentifier) return normalizedPreferredIdentifier;

    return `${getKoreanFieldworkDraftIdentifierPrefix(categoryName, featureType)}-${Date.now()}`;
}


export function getKoreanFieldworkDraftIdentifierPrefix(categoryName: string, featureType?: string): string {

    return categoryName === C.FEATURE && featureType
        ? getKoreanFieldworkFeatureIdentifierPrefix(featureType)
        : KOREAN_FIELDWORK_DRAFT_IDENTIFIER_PREFIXES[categoryName] ?? toKebabCase(categoryName);
}


export function createNextKoreanFieldworkFeatureIdentifier(
        featureType: string|undefined,
        existingDocuments: readonly Document[]): string {

    const prefix = getKoreanFieldworkFeatureIdentifierPrefix(featureType ?? 'unknown');
    const nextNumber = getNextFeatureIdentifierNumber(featureType, prefix, existingDocuments);

    return `${nextNumber}호 ${prefix}`;
}


export function createKoreanFieldworkLinkedDraftIdentifier(
        parentDoc: Document,
        categoryName: string,
        label: string,
        existingDocuments: readonly Document[] = [],
        preferredIdentifier?: string): string {

    const normalizedPreferredIdentifier = preferredIdentifier?.trim();
    if (normalizedPreferredIdentifier) return normalizedPreferredIdentifier;

    const parentIdentifier = getKoreanFieldworkParentDraftIdentifier(parentDoc);
    const nextNumber = getNextLinkedDraftIdentifierNumber(
        parentDoc.resource.id,
        parentIdentifier,
        categoryName,
        label,
        existingDocuments
    );

    return `${parentIdentifier} ${label} ${nextNumber}`;
}


export function getKoreanFieldworkParentDraftIdentifier(parentDoc: Document): string {

    const identifier = parentDoc.resource.identifier?.trim()
        || parentDoc.resource.id?.trim();

    return identifier || '유구';
}


export function getKoreanFieldworkFeatureDraftValues(featureType?: string): KoreanFieldworkFeatureDraftValues {

    const featureTypeOption = getKoreanFieldworkFeatureTypeOption(featureType);
    const interpretationValue = getKoreanFieldworkFeatureInterpretationTypeValue(featureTypeOption.value);

    return {
        featureType: featureTypeOption.value,
        ...(interpretationValue ? { featureInterpretationType: [interpretationValue] } : {})
    };
}


export function parseKoreanFieldworkFeatureGeometryOption(
        featureGeometry?: string
): Record<string, unknown>|undefined {

    const normalizedFeatureGeometry = featureGeometry?.trim();
    if (!normalizedFeatureGeometry) return undefined;

    try {
        const parsedGeometry = JSON.parse(normalizedFeatureGeometry);
        return isJsonObject(parsedGeometry) && typeof parsedGeometry.type === 'string'
            ? parsedGeometry
            : undefined;
    } catch (_) {
        return undefined;
    }
}


function makeContinuationAction(categoryName: string,
                                parentDoc: Document,
                                projectConfiguration: ProjectConfiguration)
        : KoreanFieldworkContinuationAction|undefined {

    const category = projectConfiguration.getCategory(categoryName);
    if (!category || !canCreateKoreanFieldworkChildRecord(category, parentDoc, projectConfiguration)) {
        return undefined;
    }

    const relationName = getPreferredRelationName(categoryName, parentDoc, projectConfiguration);
    if (!relationName) return undefined;

    return {
        id: `${categoryName}:${relationName}`,
        categoryName,
        relationName
    };
}


function getPreferredRelationName(categoryName: string,
                                  parentDoc: Document,
                                  projectConfiguration: ProjectConfiguration): string|undefined {

    return RELATION_LABEL_ORDER.find(relationName =>
        projectConfiguration.isAllowedRelationDomainCategory(
            categoryName,
            parentDoc.resource.category,
            relationName
        )
    );
}


function getNextFeatureIdentifierNumber(featureType: string|undefined,
                                        prefix: string,
                                        existingDocuments: readonly Document[]): number {

    const maxNumber = existingDocuments
        .filter(document => document.resource.category === C.FEATURE)
        .reduce((maxIdentifierNumber, document) => {
            const identifier = document.resource.identifier ?? '';
            const identifierNumber = getFeatureIdentifierNumber(identifier, prefix);
            if (identifierNumber !== undefined) {
                return Math.max(maxIdentifierNumber, identifierNumber);
            }

            if (getDocumentFeatureType(document) !== featureType) {
                return maxIdentifierNumber;
            }

            return Math.max(
                maxIdentifierNumber,
                getFirstPositiveNumber(identifier) ?? 0
            );
        }, 0);

    return maxNumber + 1;
}


function getDocumentFeatureType(document: Document): string {

    const featureType = (document.resource as Record<string, unknown>).featureType;

    return typeof featureType === 'string' ? featureType : '';
}


function getFeatureIdentifierNumber(identifier: string, prefix: string): number|undefined {

    const normalizedIdentifier = identifier.replace(/\s+/g, ' ').trim();
    if (!normalizedIdentifier) return undefined;

    const escapedPrefix = escapeRegExp(prefix);
    const patterns = [
        new RegExp(`(?:^|\\s)(\\d+)\\s*호\\s*${escapedPrefix}(?:\\s|$)`),
        new RegExp(`(?:^|\\s)${escapedPrefix}\\s*(\\d+)\\s*호(?:\\s|$)`),
        new RegExp(`(?:^|\\s)${escapedPrefix}[-_\\s]*(\\d+)(?:\\s|$)`)
    ];

    for (const pattern of patterns) {
        const match = normalizedIdentifier.match(pattern);
        const number = match ? Number.parseInt(match[1], 10) : 0;
        if (number > 0) return number;
    }

    return normalizedIdentifier.includes(prefix)
        ? getFirstPositiveNumber(normalizedIdentifier)
        : undefined;
}


function getNextLinkedDraftIdentifierNumber(parentId: string|undefined,
                                            parentIdentifier: string,
                                            categoryName: string,
                                            label: string,
                                            documents: readonly Document[]): number {

    const prefix = `${parentIdentifier} ${label} `;
    const linkedNumbers = documents
        .filter(document =>
            document.resource.category === categoryName
            && (
                isRelationLinkedToParent(document.resource.relations?.depicts, parentId)
                || isRelationLinkedToParent(document.resource.relations?.liesWithin, parentId)
            ))
        .map(document => getLinkedDraftIdentifierSuffixNumber(document.resource.identifier, prefix))
        .filter((value): value is number => value !== undefined);

    return linkedNumbers.length > 0
        ? Math.max(...linkedNumbers) + 1
        : 1;
}


function isRelationLinkedToParent(relationTargets: string[]|undefined, parentId: string|undefined): boolean {

    return !!parentId && !!relationTargets?.includes(parentId);
}


function getLinkedDraftIdentifierSuffixNumber(identifier: string|undefined,
                                              prefix: string): number|undefined {

    const normalizedIdentifier = identifier?.trim();
    if (!normalizedIdentifier?.startsWith(prefix)) return undefined;

    const suffix = normalizedIdentifier.slice(prefix.length).trim();
    const parsedNumber = Number.parseInt(suffix, 10);

    return Number.isFinite(parsedNumber) && parsedNumber > 0
        ? parsedNumber
        : undefined;
}


function getFirstPositiveNumber(value: string): number|undefined {

    const match = value.match(/\d+/);
    const number = match ? Number.parseInt(match[0], 10) : 0;

    return number > 0 ? number : undefined;
}


function escapeRegExp(value: string): string {

    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function dedupe<T>(values: T[]): T[] {

    return values.filter((value, index) => values.indexOf(value) === index);
}


function isJsonObject(value: unknown): value is Record<string, unknown> {

    return typeof value === 'object' && value !== null && !Array.isArray(value);
}


function toKebabCase(value: string): string {

    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}
