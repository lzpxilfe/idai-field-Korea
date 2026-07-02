import { Document, KoreanFieldworkReadinessIssue, ProjectConfiguration } from 'idai-field-core';
import {
    getKoreanFieldworkContinuationActions,
    KoreanFieldworkContinuationAction
} from './korean-fieldwork-document-drafts';
import { makeKoreanFieldworkEvidenceReview } from './korean-fieldwork-evidence-review';


export type KoreanFieldworkRecordActionTone = 'danger'|'warning'|'info'|'success'|'neutral';
export type KoreanFieldworkRecordActionType = 'openDocument'|'createDocument';

export interface KoreanFieldworkRecordActionItem {
    id: string;
    type: KoreanFieldworkRecordActionType;
    label: string;
    detail: string;
    icon: string;
    tone: KoreanFieldworkRecordActionTone;
    documentId?: string;
    categoryName?: string;
}

const NEXT_CHILD_CATEGORY: Readonly<Record<string, string|undefined>> = {
    Operation: 'Trench',
    Trench: 'Feature',
    FeatureGroup: 'Feature',
    Feature: 'FeatureSegment',
    FeatureSegment: 'Layer'
};

const PREFERRED_EVIDENCE_CATEGORIES = [
    'SoilProfilePhoto',
    'Photo',
    'Drawing',
    'Find',
    'Sample'
];

const OPEN_EVIDENCE_CATEGORIES = [
    ...PREFERRED_EVIDENCE_CATEGORIES,
    'PenMemo'
];

const LINK_RELATIONS = [
    'liesWithin',
    'depicts',
    'isRecordedIn',
    'isRecordedInFeature',
    'isMapLayerOf'
];
const FEATURE_LOCATION_SKETCH_FIELD = 'featureLocationSketch';

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
    DailyLog: '작업일지',
    Drawing: '도면',
    Feature: '유구',
    FeatureGroup: '관련 유구',
    FeatureSegment: '세부 단위',
    FieldRecordQualityReview: '보완 메모',
    Find: '유물',
    FindCollection: '유물 일괄',
    Layer: '토층',
    Operation: '조사 구역 기록',
    PenMemo: '야장 메모',
    Photo: '사진',
    Sample: '시료',
    SoilProfilePhoto: '토층사진',
    SurveyBoundary: '조사 경계',
    Trench: '트렌치'
};


export function makeKoreanFieldworkRecordActions(
        document: Document,
        documents: Document[],
        projectConfiguration: ProjectConfiguration,
        maxActions: number = 3
): KoreanFieldworkRecordActionItem[] {

    if (!document?.resource?.id) return [];

    const actions: KoreanFieldworkRecordActionItem[] = [];
    const issueAction = getIssueAction(document, documents);
    if (issueAction) actions.push(issueAction);

    const continuationActions = getKoreanFieldworkContinuationActions(document, projectConfiguration);
    const linkedDocuments = getLinkedDocuments(document, documents);
    const structureAction = getMissingStructureAction(document, linkedDocuments, continuationActions);
    if (structureAction) actions.push(toCreateAction(structureAction, document, 'info'));

    const evidenceAction = getMissingEvidenceAction(linkedDocuments, continuationActions);
    if (evidenceAction) actions.push(toCreateAction(evidenceAction, document, 'warning'));

    const openEvidenceAction = getOpenEvidenceAction(linkedDocuments);
    if (openEvidenceAction) actions.push(openEvidenceAction);

    continuationActions
        .filter(action => !isExistingStructureAction(document, linkedDocuments, action))
        .forEach(action => actions.push(toCreateAction(action, document, 'neutral')));

    const featureSketchAction = getMissingFeatureSketchAction(document);
    if (featureSketchAction) actions.push(featureSketchAction);

    return dedupeActions(actions).slice(0, maxActions);
}


function getIssueAction(document: Document,
                        documents: Document[]): KoreanFieldworkRecordActionItem|undefined {

    const issues = makeKoreanFieldworkEvidenceReview(document, documents).issues
        .slice()
        .sort((issueA, issueB) => compareIssues(issueA, issueB, document.resource.id));
    const [issue] = issues;
    if (!issue) return undefined;

    return {
        id: `issue-${issue.ruleId}-${issue.documentId}`,
        type: 'openDocument',
        label: issue.documentId === document.resource.id ? '이 기록 점검' : '관련 점검',
        detail: issue.recommendedAction,
        icon: issue.severity === 'critical'
            ? 'mdi-alert-octagon-outline'
            : 'mdi-alert-outline',
        tone: issue.severity === 'critical' ? 'danger' : 'warning',
        documentId: issue.documentId
    };
}


function getMissingStructureAction(document: Document,
                                   linkedDocuments: Document[],
                                   continuationActions: KoreanFieldworkContinuationAction[])
        : KoreanFieldworkContinuationAction|undefined {

    const expectedCategoryName = NEXT_CHILD_CATEGORY[document.resource.category];
    if (!expectedCategoryName) return undefined;
    if (linkedDocuments.some(linkedDocument =>
            linkedDocument.resource.category === expectedCategoryName
    )) {
        return undefined;
    }

    return continuationActions.find(action => action.categoryName === expectedCategoryName);
}


function getMissingEvidenceAction(linkedDocuments: Document[],
                                  continuationActions: KoreanFieldworkContinuationAction[])
        : KoreanFieldworkContinuationAction|undefined {

    return continuationActions.find(action =>
        PREFERRED_EVIDENCE_CATEGORIES.includes(action.categoryName)
        && !linkedDocuments.some(linkedDocument =>
                linkedDocument.resource.category === action.categoryName
        )
    );
}


function getOpenEvidenceAction(linkedDocuments: Document[]): KoreanFieldworkRecordActionItem|undefined {

    const evidenceEntry = OPEN_EVIDENCE_CATEGORIES
        .map(categoryName => ({
            categoryName,
            documents: linkedDocuments.filter(document =>
                document.resource.category === categoryName
            )
        }))
        .find(entry => entry.documents.length > 0);
    const [document] = evidenceEntry?.documents ?? [];
    if (!evidenceEntry || !document) return undefined;

    const categoryLabel = getCategoryLabel(evidenceEntry.categoryName);

    return {
        id: `open-${evidenceEntry.categoryName}-${document.resource.id}`,
        type: 'openDocument',
        label: `${categoryLabel} 열기`,
        detail: `${evidenceEntry.documents.length}건의 ${categoryLabel} 근거가 연결되어 있습니다.`,
        icon: getCreateIcon(document.resource.category),
        tone: 'success',
        documentId: document.resource.id
    };
}


function getMissingFeatureSketchAction(document: Document): KoreanFieldworkRecordActionItem|undefined {

    if (document.resource.category !== 'Feature') return undefined;
    if (hasFeaturePlacement(document)) return undefined;

    return {
        id: 'current-feature-location-sketch',
        type: 'openDocument',
        label: '위치 스케치 확인',
        detail: '위성지도나 평면도처럼 조사 경계 위에 얹은 유구 위치와 형태가 비어 있습니다.',
        icon: 'mdi-map-marker-path',
        tone: 'warning',
        documentId: document.resource.id
    };
}


function hasFeaturePlacement(document: Document): boolean {

    return hasFeatureLocationSketch(document.resource[FEATURE_LOCATION_SKETCH_FIELD])
        || hasGeometryCoordinates((document.resource as any).geometry);
}


function hasFeatureLocationSketch(value: unknown): boolean {

    if (typeof value !== 'string') return !!value;

    const normalizedValue = value.trim();
    return normalizedValue.length > 0
        && normalizedValue !== '{}'
        && normalizedValue !== '[]';
}


function hasGeometryCoordinates(geometry: unknown): boolean {

    if (!geometry || typeof geometry !== 'object') return false;

    return hasNumericCoordinatePair((geometry as any).coordinates);
}


function hasNumericCoordinatePair(value: unknown): boolean {

    if (!Array.isArray(value)) return false;
    if (value.length >= 2
            && typeof value[0] === 'number'
            && Number.isFinite(value[0])
            && typeof value[1] === 'number'
            && Number.isFinite(value[1])) {
        return true;
    }

    return value.some(hasNumericCoordinatePair);
}


function isExistingStructureAction(document: Document,
                                   linkedDocuments: Document[],
                                   action: KoreanFieldworkContinuationAction): boolean {

    const expectedCategoryName = NEXT_CHILD_CATEGORY[document.resource.category];

    return action.categoryName === expectedCategoryName
        && linkedDocuments.some(linkedDocument =>
            linkedDocument.resource.category === expectedCategoryName
        );
}


function toCreateAction(action: KoreanFieldworkContinuationAction,
                        parentDocument: Document,
                        tone: KoreanFieldworkRecordActionTone): KoreanFieldworkRecordActionItem {

    const categoryLabel = getCategoryLabel(action.categoryName);
    const parentLabel = getCategoryLabel(parentDocument.resource.category);

    return {
        id: `create-${action.categoryName}`,
        type: 'createDocument',
        label: `${categoryLabel} 추가`,
        detail: `${parentLabel}에 ${categoryLabel} 기록을 이어서 작성합니다.`,
        icon: getCreateIcon(action.categoryName),
        tone,
        categoryName: action.categoryName
    };
}


function getLinkedDocuments(document: Document, documents: Document[]): Document[] {

    return documents.filter(candidate =>
        candidate.resource.id !== document.resource.id
        && LINK_RELATIONS.some(relationName =>
            getRelationTargets(candidate, relationName).includes(document.resource.id)
        )
    );
}


function getRelationTargets(document: Document, relationName: string): string[] {

    const targets = document.resource.relations?.[relationName];

    return Array.isArray(targets)
        ? targets.filter((target): target is string => typeof target === 'string')
        : [];
}


function compareIssues(issueA: KoreanFieldworkReadinessIssue,
                       issueB: KoreanFieldworkReadinessIssue,
                       currentDocumentId: string): number {

    return Number(issueB.documentId === currentDocumentId)
        - Number(issueA.documentId === currentDocumentId)
        || getSeverityRank(issueA.severity) - getSeverityRank(issueB.severity)
        || issueA.identifier.localeCompare(issueB.identifier, 'ko')
        || issueA.ruleId.localeCompare(issueB.ruleId);
}


function getSeverityRank(severity: KoreanFieldworkReadinessIssue['severity']): number {

    switch (severity) {
        case 'critical':
            return 0;
        case 'warning':
            return 1;
        default:
            return 2;
    }
}


function dedupeActions(actions: KoreanFieldworkRecordActionItem[]): KoreanFieldworkRecordActionItem[] {

    const actionIds = new Set<string>();

    return actions.filter(action => {
        if (actionIds.has(action.id)) return false;
        actionIds.add(action.id);
        return true;
    });
}


function getCategoryLabel(categoryName: string): string {

    return CATEGORY_LABELS[categoryName] ?? categoryName;
}


function getCreateIcon(categoryName: string): string {

    switch (categoryName) {
        case 'Drawing':
            return 'mdi-vector-polyline-plus';
        case 'Feature':
            return 'mdi-map-marker-plus-outline';
        case 'FeatureSegment':
            return 'mdi-source-branch-plus';
        case 'Find':
        case 'FindCollection':
            return 'mdi-package-variant-plus';
        case 'Layer':
            return 'mdi-layers-plus';
        case 'PenMemo':
            return 'mdi-notebook-plus-outline';
        case 'Photo':
            return 'mdi-camera-plus-outline';
        case 'Sample':
            return 'mdi-flask-plus-outline';
        case 'SoilProfilePhoto':
            return 'mdi-terrain';
        case 'SurveyBoundary':
            return 'mdi-map-plus';
        case 'Trench':
            return 'mdi-crop-square';
        default:
            return 'mdi-plus-circle-outline';
    }
}
