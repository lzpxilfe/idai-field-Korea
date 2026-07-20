import {
    CategoryForm,
    canCreateKoreanFieldworkChildRecord as canCreateCoreKoreanFieldworkChildRecord,
    createKoreanFieldworkDraftBaseResource as createCoreKoreanFieldworkDraftBaseResource,
    createKoreanFieldworkDraftIdentifier as createCoreKoreanFieldworkDraftIdentifier,
    createKoreanFieldworkDraftRelations as createCoreKoreanFieldworkDraftRelations,
    createNextKoreanFieldworkFeatureIdentifier as createCoreNextKoreanFieldworkFeatureIdentifier,
    Document,
    getKoreanFieldworkContinuationActions as getCoreKoreanFieldworkContinuationActions,
    getKoreanFieldworkFeatureDraftValues,
    KoreanFieldworkContinuationAction,
    NewResource,
    OptionalRange,
    ProjectConfiguration,
    Resource
} from 'idai-field-core';
import {
    getKoreanFieldworkDefaultFieldValues,
    getKoreanFieldworkFeatureTraceDraftValues
} from './korean-fieldwork-draft-defaults';
import {
    KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS
} from './korean-fieldwork-feature-guidance';
import {
    KoreanFieldworkFieldNoteContinuationSeed,
    KoreanFieldworkFieldNoteInput
} from './korean-fieldwork-notebook-digest';

export type { KoreanFieldworkContinuationAction } from 'idai-field-core';


export interface KoreanFieldworkDraftResourceOptions {
    boundaryAccuracy?: string;
    boundarySummary?: string;
    boundarySource?: string;
    existingDocuments?: readonly Document[];
    featureType?: string;
    identifier?: string;
    recordMemoContinuation?: KoreanFieldworkFieldNoteContinuationSeed;
    recordMemoTemplate?: boolean;
    referenceBasemapProvider?: string;
}

const CATEGORIES = {
    DAILY_LOG: 'DailyLog',
    DRAWING: 'Drawing',
    FEATURE: 'Feature',
    FEATURE_GROUP: 'FeatureGroup',
    FEATURE_SEGMENT: 'FeatureSegment',
    FIELD_RECORD_QUALITY_REVIEW: 'FieldRecordQualityReview',
    FIND: 'Find',
    FIND_COLLECTION: 'FindCollection',
    LAYER: 'Layer',
    PEN_MEMO: 'PenMemo',
    PHOTO: 'Photo',
    SAMPLE: 'Sample',
    SOIL_PROFILE_PHOTO: 'SoilProfilePhoto',
    SURVEY: 'Survey',
    SURVEY_BOUNDARY: 'SurveyBoundary',
    TRENCH: 'Trench',
    OPERATION: 'Operation'
};


export function getKoreanFieldworkContinuationActions(
        parentDoc: Document,
        projectConfiguration: ProjectConfiguration
): KoreanFieldworkContinuationAction[] {

    return getCoreKoreanFieldworkContinuationActions(parentDoc, projectConfiguration);
}


export function createKoreanFieldworkDraftResource(
        parentDoc: Document,
        categoryName: string,
        projectConfiguration: ProjectConfiguration,
        options: KoreanFieldworkDraftResourceOptions = {}
): NewResource {

    const category = getCategory(categoryName, projectConfiguration);
    const featurePreset = categoryName === CATEGORIES.FEATURE
        ? getFeatureGuidancePreset(options.featureType ?? 'unknown')
        : undefined;
    const inheritedPeriod = categoryName === CATEGORIES.FEATURE
        && category
        && CategoryForm.getField(category, 'period')
        ? getKoreanFieldworkMostRecentSiblingFeaturePeriod(
            parentDoc,
            options.existingDocuments ?? []
        )
        : undefined;
    const baseResource = createCoreKoreanFieldworkDraftBaseResource(
        parentDoc,
        categoryName,
        projectConfiguration,
        {
            existingDocuments: options.existingDocuments,
            featureType: featurePreset?.featureType,
            identifier: options.identifier,
            linkedIdentifierLabel: getLinkedIdentifierLabel(categoryName)
        }
    );

    return {
        ...baseResource,
        ...getKoreanFieldworkDefaultFieldValues(category, {
            boundaryAccuracy: options.boundaryAccuracy,
            boundarySummary: options.boundarySummary,
            boundarySource: options.boundarySource,
            referenceBasemapProvider: options.referenceBasemapProvider
        }),
        ...getKoreanFieldworkFeatureTraceDraftValues(category),
        ...getFeatureGuidanceDraftValues(category, featurePreset),
        ...(inheritedPeriod ? { period: inheritedPeriod } : {}),
        ...getRecordMemoDraftValues(
            category,
            parentDoc,
            options.recordMemoTemplate,
            options.recordMemoContinuation
        )
    };
}


export function createKoreanFieldworkDraftRelations(
        parentDoc: Document,
        categoryName: string,
        projectConfiguration: ProjectConfiguration
): Resource.Relations {

    return createCoreKoreanFieldworkDraftRelations(parentDoc, categoryName, projectConfiguration);
}


export function canCreateKoreanFieldworkChildRecord(
        category: CategoryForm,
        parentDoc: Document,
        projectConfiguration: ProjectConfiguration
): boolean {

    if (!category || category.name === 'Image') return false;

    return canCreateCoreKoreanFieldworkChildRecord(category, parentDoc, projectConfiguration);
}


export function createDraftIdentifier(
        categoryName: string,
        featureType?: string,
        preferredIdentifier?: string): string {

    const normalizedPreferredIdentifier = preferredIdentifier?.trim();
    return createCoreKoreanFieldworkDraftIdentifier(categoryName, featureType, normalizedPreferredIdentifier);
}


export function createNextFeatureIdentifier(featureType: string|undefined,
                                            existingDocuments: readonly Document[]): string {

    return createCoreNextKoreanFieldworkFeatureIdentifier(featureType, existingDocuments);
}


export function getKoreanFieldworkMostRecentSiblingFeaturePeriod(
        parentDoc: Document,
        existingDocuments: readonly Document[]
): OptionalRange<string>|undefined {

    const parentId = parentDoc?.resource?.id;
    if (!parentId) return undefined;

    let mostRecent: {
        documentIndex: number;
        period: OptionalRange<string>;
        timestamp?: number;
    }|undefined;

    existingDocuments.forEach((document, documentIndex) => {
        if (document?.resource?.category !== CATEGORIES.FEATURE
            || !isDirectChildOf(document, parentId)) {
            return;
        }

        const period = normalizeFeaturePeriod(document.resource.period);
        if (!period) return;

        const timestamp = getDocumentLastModifiedTimestamp(document);
        if (!mostRecent || isMoreRecentDocument(
            timestamp,
            documentIndex,
            mostRecent.timestamp,
            mostRecent.documentIndex
        )) {
            mostRecent = { documentIndex, period, timestamp };
        }
    });

    return mostRecent?.period;
}


function getLinkedIdentifierLabel(categoryName: string): string|undefined {

    if (categoryName === CATEGORIES.PHOTO) return '사진';
    if (categoryName === CATEGORIES.SOIL_PROFILE_PHOTO) return '토층사진';

    return undefined;
}


function isDirectChildOf(document: Document, parentId: string): boolean {

    const relations = document.resource.relations ?? {};
    const liesWithin = getRelationTargets(relations.liesWithin);
    if (liesWithin.length > 0) return liesWithin.includes(parentId);

    return getRelationTargets(relations.isRecordedIn).includes(parentId);
}


function getRelationTargets(value: unknown): string[] {

    return Array.isArray(value)
        ? value.filter((target): target is string => typeof target === 'string')
        : [];
}


function normalizeFeaturePeriod(value: unknown): OptionalRange<string>|undefined {

    if (typeof value === 'string') {
        const startValue = value.trim();

        return startValue ? { value: startValue } : undefined;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

    const range = value as Record<string, unknown>;
    if (typeof range.value !== 'string' || !range.value.trim()) return undefined;
    if (
        Object.prototype.hasOwnProperty.call(range, 'endValue')
        && (typeof range.endValue !== 'string' || !range.endValue.trim())
    ) {
        return undefined;
    }

    return {
        value: range.value.trim(),
        ...(typeof range.endValue === 'string'
            ? { endValue: range.endValue.trim() }
            : {})
    };
}


function getDocumentLastModifiedTimestamp(document: Document): number|undefined {

    const action = document.modified?.length > 0
        ? document.modified[document.modified.length - 1]
        : document.created;
    const date = action?.date;
    const timestamp = date instanceof Date
        ? date.getTime()
        : typeof date === 'string' || typeof date === 'number'
            ? new Date(date).getTime()
            : NaN;

    return Number.isFinite(timestamp) ? timestamp : undefined;
}


function isMoreRecentDocument(
        candidateTimestamp: number|undefined,
        candidateIndex: number,
        currentTimestamp: number|undefined,
        currentIndex: number
): boolean {

    if (candidateTimestamp !== undefined && currentTimestamp !== undefined) {
        return candidateTimestamp > currentTimestamp
            || (candidateTimestamp === currentTimestamp && candidateIndex > currentIndex);
    }
    if (candidateTimestamp !== undefined) return true;
    if (currentTimestamp !== undefined) return false;

    return candidateIndex > currentIndex;
}


function getCategory(categoryName: string, projectConfiguration: ProjectConfiguration): CategoryForm|undefined {

    try {
        return projectConfiguration.getCategory(categoryName);
    } catch (_) {
        return undefined;
    }
}


function getFeatureGuidancePreset(featureType: string|undefined) {

    return KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS.find(preset => preset.featureType === featureType);
}


function getFeatureGuidanceDraftValues(
        category: CategoryForm|undefined,
        preset: typeof KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS[number]|undefined) {

    if (!category || !preset) return {};

    const draftValues = getKoreanFieldworkFeatureDraftValues(preset.featureType);
    const interpretationValue = draftValues.featureInterpretationType?.[0]
        ?? preset.interpretationValue;

    return {
        ...(CategoryForm.getField(category, 'featureType') ? { featureType: draftValues.featureType } : {}),
        ...(interpretationValue && CategoryForm.getField(category, 'featureInterpretationType')
            ? { featureInterpretationType: [interpretationValue] }
            : {})
    };
}


function getRecordMemoDraftValues(
        category: CategoryForm|undefined,
        parentDoc: Document,
        useTemplate: boolean|undefined,
        continuation: KoreanFieldworkFieldNoteContinuationSeed|undefined) {

    if ((!useTemplate && !continuation) || category?.name !== CATEGORIES.PEN_MEMO) return {};

    const parentLabel = parentDoc.resource.identifier || parentDoc.resource.id || '선택 기록';
    const sourceLabel = continuation?.sourceLabel;

    return {
        ...(CategoryForm.getField(category, 'shortDescription')
            ? { shortDescription: sourceLabel ? `${parentLabel} ${sourceLabel}` : `${parentLabel} 현장 메모` }
            : {}),
        ...(CategoryForm.getField(category, 'description')
            ? { description: makeRecordMemoTemplate(continuation?.input) }
            : {})
    };
}


function makeRecordMemoTemplate(input: KoreanFieldworkFieldNoteInput|undefined): string {

    return [
        makeFieldNoteSectionLine('관찰 내용', input?.observation),
        makeFieldNoteSectionLine('스케치·약측/근거 번호', input?.evidenceNumbers),
        makeFieldNoteSectionLine('다음 작업', input?.nextWork),
        ...(input?.interpretation ? [makeFieldNoteSectionLine('해석', input.interpretation)] : [])
    ].join('\n\n');
}


function makeFieldNoteSectionLine(label: string, value: string|undefined): string {

    return `[${label}]${value ? ` ${value}` : ''}`;
}
