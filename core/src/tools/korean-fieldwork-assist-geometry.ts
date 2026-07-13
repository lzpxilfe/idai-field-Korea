import { RgbSample } from './korean-fieldwork-soil-color';
import {
    isKoreanFieldworkContractRecord,
    isKoreanFieldworkDenseArray,
    isKoreanFieldworkIsoTimestamp,
    isKoreanFieldworkSha256,
    KoreanFieldworkAssistRun,
    KoreanFieldworkContractParseResult,
    KoreanFieldworkContractValidation,
    KoreanFieldworkContractValidationIssue,
    KoreanFieldworkContractValidationIssueCode,
    KoreanFieldworkProposalProvenance,
    KoreanFieldworkProposalReview,
    validateKoreanFieldworkAssistRun,
    validateKoreanFieldworkProposalProvenance,
    validateKoreanFieldworkProposalReview
} from './korean-fieldwork-assist-run';


export const KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION = 1 as const;
export const KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX = 10000;

export type KoreanFieldworkImageCoordinateSpace =
    'sourcePixel'
    |'imageNormalized10000';

export type KoreanFieldworkInterpretationScoreMeaning =
    'relativeOnly'
    |'calibratedProbability';

export type KoreanFieldworkStratigraphicPredicate =
    'above'
    |'below'
    |'cuts'
    |'fills'
    |'sameAs';

export interface KoreanFieldworkImagePoint {
    x: number;
    y: number;
}

export interface KoreanFieldworkSoilProfileSourceImage {
    documentId: string;
    documentRevision: string;
    sourceField: string;
    sourceSha256: string;
    width: number;
    height: number;
    mediaId?: string;
    capturedAt?: string;
    originalFilename?: string;
}

export interface KoreanFieldworkInterpretationScore {
    metric: string;
    value: number;
    meaning: KoreanFieldworkInterpretationScoreMeaning;
}

export interface KoreanFieldworkSoilColorCandidateReference {
    deltaE: number;
    munsell: string;
    rank: number;
}

export interface KoreanFieldworkFieldMeasuredSoilColorObservation {
    method: 'fieldMeasured';
    selectedMunsell: string;
}

export interface KoreanFieldworkPhotoEstimatedSoilColorObservation {
    method: 'photoEstimated';
    selectedMunsell?: string;
    samplePixel: KoreanFieldworkImagePoint;
    rgb: RgbSample;
    candidates: KoreanFieldworkSoilColorCandidateReference[];
    calibration: 'none'|'whiteBalance'|'colorCard';
}

export type KoreanFieldworkSoilColorObservation =
    KoreanFieldworkFieldMeasuredSoilColorObservation
    |KoreanFieldworkPhotoEstimatedSoilColorObservation;

interface KoreanFieldworkSoilProfileItemBase {
    id: string;
    label?: string;
    note?: string;
    provenance: KoreanFieldworkProposalProvenance;
    review: KoreanFieldworkProposalReview;
    score?: KoreanFieldworkInterpretationScore;
}

export interface KoreanFieldworkSoilInterfacePolyline extends KoreanFieldworkSoilProfileItemBase {
    kind: 'interfacePolyline';
    points: KoreanFieldworkImagePoint[];
}

export interface KoreanFieldworkSoilContextPolygon extends KoreanFieldworkSoilProfileItemBase {
    kind: 'contextPolygon';
    points: KoreanFieldworkImagePoint[];
    layerDocumentId?: string;
}

export interface KoreanFieldworkSoilAnnotationPoint extends KoreanFieldworkSoilProfileItemBase {
    kind: 'annotationPoint';
    point: KoreanFieldworkImagePoint;
    role: 'layerMarker'|'soilColorSample'|'materialSample'|'other';
    layerDocumentId?: string;
    soilColor?: KoreanFieldworkSoilColorObservation;
}

export interface KoreanFieldworkStratigraphicRelation extends KoreanFieldworkSoilProfileItemBase {
    kind: 'stratigraphicRelation';
    subjectContextId: string;
    predicate: KoreanFieldworkStratigraphicPredicate;
    objectContextId: string;
}

export type KoreanFieldworkSoilProfileGeometry =
    KoreanFieldworkSoilInterfacePolyline
    |KoreanFieldworkSoilContextPolygon
    |KoreanFieldworkSoilAnnotationPoint;

export interface KoreanFieldworkSoilProfileInterpretationPayload {
    schemaVersion: typeof KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION;
    coordinateSpace: KoreanFieldworkImageCoordinateSpace;
    sourceImage: KoreanFieldworkSoilProfileSourceImage;
    geometries: KoreanFieldworkSoilProfileGeometry[];
    relations: KoreanFieldworkStratigraphicRelation[];
}

const COORDINATE_SPACES: readonly KoreanFieldworkImageCoordinateSpace[] = [
    'sourcePixel',
    'imageNormalized10000'
];

const SCORE_MEANINGS: readonly KoreanFieldworkInterpretationScoreMeaning[] = [
    'relativeOnly',
    'calibratedProbability'
];

const STRATIGRAPHIC_PREDICATES: readonly KoreanFieldworkStratigraphicPredicate[] = [
    'above',
    'below',
    'cuts',
    'fills',
    'sameAs'
];

const SOIL_ASSIST_RUN_KINDS = new Set([
    'soilProfileBoundarySuggestion',
    'soilProfileContextSuggestion',
    'soilColorPhotoEstimate'
]);


export function validateKoreanFieldworkSoilProfileInterpretation(
        value: unknown
): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$', 'invalidType', 'Soil-profile interpretation must be an object.');
        return makeValidation(issues);
    }

    if (value.schemaVersion !== KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION) {
        addIssue(
            issues,
            '$.schemaVersion',
            value.schemaVersion === undefined ? 'required' : 'unsupportedVersion',
            'Soil-profile interpretation schemaVersion must be 1.'
        );
    }
    if (!COORDINATE_SPACES.includes(value.coordinateSpace as KoreanFieldworkImageCoordinateSpace)) {
        addIssue(
            issues,
            '$.coordinateSpace',
            'invalidValue',
            'A tagged image coordinate space is required.'
        );
    }

    validateSourceImage(value.sourceImage, issues);

    const geometries = validateGeometryArray(
        value.geometries,
        value.coordinateSpace,
        value.sourceImage,
        issues
    );
    const relations = validateRelationArray(value.relations, issues);
    validateUniqueItemIds(geometries, relations, issues);
    validateDerivedItems(geometries, relations, issues);
    validateRelationReferences(geometries, relations, issues);

    const cycle = findKoreanFieldworkAcceptedStratigraphicCycle(relations);
    if (cycle) {
        addIssue(
            issues,
            '$.relations',
            'invalidState',
            `Accepted stratigraphic relations contain a cycle: ${cycle.join(' -> ')}.`
        );
    }

    return makeValidation(issues);
}


export function parseKoreanFieldworkSoilProfileInterpretation(
        value: unknown
): KoreanFieldworkContractParseResult<KoreanFieldworkSoilProfileInterpretationPayload> {

    const parsed = parseContractInput(value);

    if (!parsed.ok) {
        return {
            issues: [makeIssue('$', 'invalidValue', 'Soil-profile interpretation is not valid JSON.')],
            ok: false,
            raw: value,
            reason: 'invalid'
        };
    }

    if (isKoreanFieldworkContractRecord(parsed.value)
            && parsed.value.schemaVersion !== undefined
            && parsed.value.schemaVersion
                !== KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION) {
        return {
            issues: [makeIssue(
                '$.schemaVersion',
                'unsupportedVersion',
                'Soil-profile interpretation schema version is not supported.'
            )],
            ok: false,
            raw: parsed.value,
            reason: 'unsupportedVersion'
        };
    }

    const validation = validateKoreanFieldworkSoilProfileInterpretation(parsed.value);

    return validation.isValid
        ? {
            ok: true,
            value: parsed.value as unknown as KoreanFieldworkSoilProfileInterpretationPayload
        }
        : {
            issues: validation.issues,
            ok: false,
            raw: parsed.value,
            reason: 'invalid'
        };
}


export function validateKoreanFieldworkSoilProfileAssistLinks(
        payload: unknown,
        assistRuns: unknown
): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];
    const payloadValidation = validateKoreanFieldworkSoilProfileInterpretation(payload);
    issues.push(...payloadValidation.issues);
    if (!payloadValidation.isValid) return makeValidation(issues);

    if (!Array.isArray(assistRuns)) {
        addIssue(issues, '$.assistRuns', 'invalidType', 'Assist runs must be an array.');
        return makeValidation(issues);
    }
    if (!isKoreanFieldworkDenseArray(assistRuns)) {
        addIssue(issues, '$.assistRuns', 'invalidValue', 'Assist runs must be a dense JSON array.');
        return makeValidation(issues);
    }

    const interpretation = payload as KoreanFieldworkSoilProfileInterpretationPayload;

    const runIds = new Set<string>();
    const validRunById = new Map<string, { path: string; run: KoreanFieldworkAssistRun }>();
    const itemById = new Map<string, {
        item: KoreanFieldworkSoilProfileGeometry|KoreanFieldworkStratigraphicRelation;
        path: string;
    }>();

    interpretation.geometries.forEach((item, index) => itemById.set(item.id, {
        item,
        path: `$.geometries[${index}]`
    }));
    interpretation.relations.forEach((item, index) => itemById.set(item.id, {
        item,
        path: `$.relations[${index}]`
    }));

    for (let index = 0; index < assistRuns.length; index++) {
        const path = `$.assistRuns[${index}]`;
        const candidate = assistRuns[index];
        const validation = validateKoreanFieldworkAssistRun(candidate);
        issues.push(...prefixIssues(validation.issues, path));
        if (!validation.isValid || !isKoreanFieldworkContractRecord(candidate)) continue;

        const run = candidate as unknown as KoreanFieldworkAssistRun;

        if (runIds.has(run.runId)) {
            addIssue(issues, `${path}.runId`, 'duplicateId', 'Assist run IDs must be unique.');
        } else {
            runIds.add(run.runId);
            validRunById.set(run.runId, { path, run });
        }

        if (!SOIL_ASSIST_RUN_KINDS.has(run.kind)) {
            addIssue(issues, `${path}.kind`, 'invalidValue', 'Only soil-profile assist runs belong here.');
        }

        const sourceInput = run.inputs.find(input =>
            input.documentId === interpretation.sourceImage.documentId
                && input.documentRevision === interpretation.sourceImage.documentRevision
                && input.sourceSha256 === interpretation.sourceImage.sourceSha256
                && (!interpretation.sourceImage.mediaId
                    || input.mediaId === interpretation.sourceImage.mediaId)
        );

        if (!sourceInput) {
            addIssue(
                issues,
                `${path}.inputs`,
                'invalidReference',
                'Assist run does not pin the interpretation source image.'
            );
        }

        run.outputItemIds.forEach((outputItemId, outputIndex) => {
            const itemEntry = itemById.get(outputItemId);

            if (!itemEntry) {
                addIssue(
                    issues,
                    `${path}.outputItemIds[${outputIndex}]`,
                    'invalidReference',
                    'Assist output item does not exist in the interpretation payload.'
                );
                return;
            }

            const { item } = itemEntry;
            if (item.provenance.origin !== 'assist'
                    || item.provenance.assistRunId !== run.runId) {
                addIssue(
                    issues,
                    `${path}.outputItemIds[${outputIndex}]`,
                    'invalidReference',
                    'Assist outputs require assist provenance pointing back to their run.'
                );
            }

            if (!isOutputAllowedForSoilRun(run.kind, item)) {
                addIssue(
                    issues,
                    `${path}.outputItemIds[${outputIndex}]`,
                    'invalidReference',
                    'Assist run kind does not match the referenced output item type.'
                );
            }
        });
    }

    itemById.forEach(({ item, path }, itemId) => {
        if (!isKoreanFieldworkContractRecord(item.provenance)
                || item.provenance.origin !== 'assist') return;

        const runEntry = item.provenance.assistRunId
            ? validRunById.get(item.provenance.assistRunId)
            : undefined;

        if (!runEntry) {
            addIssue(
                issues,
                `${path}.provenance.assistRunId`,
                'invalidReference',
                'Assist-origin item references an unknown assist run.'
            );
            return;
        }

        if (!runEntry.run.outputItemIds.includes(itemId)) {
            addIssue(
                issues,
                `${path}.provenance.assistRunId`,
                'invalidReference',
                'Assist run does not list this item as an output.'
            );
        }

        if (!isOutputAllowedForSoilRun(runEntry.run.kind, item)) {
            addIssue(
                issues,
                `${path}.provenance.assistRunId`,
                'invalidReference',
                'Assist-origin item type does not match its assist run kind.'
            );
        }
    });

    return makeValidation(issues);
}


export function findKoreanFieldworkAcceptedStratigraphicCycle(
        relations: KoreanFieldworkStratigraphicRelation[]
): string[]|undefined {

    const acceptedRelations = relations.filter(relation =>
        isKoreanFieldworkContractRecord(relation)
            && isKoreanFieldworkContractRecord(relation.review)
            && relation.review.state === 'accepted'
    );
    const parent = new Map<string, string>();
    const edges = new Map<string, string[]>();

    const find = (node: string): string => {
        const currentParent = parent.get(node) ?? node;
        if (!parent.has(node)) parent.set(node, node);
        if (currentParent === node) return node;

        const root = find(currentParent);
        parent.set(node, root);
        return root;
    };
    const union = (first: string, second: string) => {
        const firstRoot = find(first);
        const secondRoot = find(second);
        if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
    };

    acceptedRelations.forEach(relation => {
        find(relation.subjectContextId);
        find(relation.objectContextId);
        if (relation.predicate === 'sameAs') {
            union(relation.subjectContextId, relation.objectContextId);
        }
    });

    for (const relation of acceptedRelations.filter(candidate => candidate.predicate !== 'sameAs')) {
        const rawFrom = relation.predicate === 'below'
            ? relation.objectContextId
            : relation.subjectContextId;
        const rawTo = relation.predicate === 'below'
            ? relation.subjectContextId
            : relation.objectContextId;
        const from = find(rawFrom);
        const to = find(rawTo);

        if (from === to) return [rawFrom, rawTo, rawFrom];

        const targets = edges.get(from) ?? [];
        targets.push(to);
        edges.set(from, targets);
        if (!edges.has(to)) edges.set(to, []);
    }

    /*
     * sameAs relations define equivalence classes. Directional relations are
     * evaluated only after those classes have been collapsed above.
     */
    acceptedRelations
        .filter(relation => relation.predicate === 'sameAs')
        .forEach(relation => {
            const root = find(relation.subjectContextId);
            if (!edges.has(root)) edges.set(root, []);
        });

    const visited = new Set<string>();
    const active = new Set<string>();
    const stack: string[] = [];

    const visit = (node: string): string[]|undefined => {
        if (active.has(node)) {
            const start = stack.indexOf(node);
            return [...stack.slice(start), node];
        }
        if (visited.has(node)) return undefined;

        visited.add(node);
        active.add(node);
        stack.push(node);

        for (const target of edges.get(node) ?? []) {
            const cycle = visit(target);
            if (cycle) return cycle;
        }

        stack.pop();
        active.delete(node);
        return undefined;
    };

    for (const node of edges.keys()) {
        const cycle = visit(node);
        if (cycle) return cycle;
    }

    return undefined;
}


export function convertKoreanFieldworkImagePoint(
        point: KoreanFieldworkImagePoint,
        from: KoreanFieldworkImageCoordinateSpace,
        to: KoreanFieldworkImageCoordinateSpace,
        sourceImage: Pick<KoreanFieldworkSoilProfileSourceImage, 'width'|'height'>
): KoreanFieldworkImagePoint|undefined {

    if (!isFinitePoint(point) || !isPositiveInteger(sourceImage.width)
            || !isPositiveInteger(sourceImage.height)) {
        return undefined;
    }
    if (!COORDINATE_SPACES.includes(from) || !COORDINATE_SPACES.includes(to)) return undefined;

    const fromMaximum = from === 'sourcePixel'
        ? { x: sourceImage.width, y: sourceImage.height }
        : { x: KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX, y: KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX };

    if (!isPointWithin(point, fromMaximum.x, fromMaximum.y)) return undefined;
    if (from === to) return { x: point.x, y: point.y };

    return from === 'imageNormalized10000'
        ? {
            x: point.x * sourceImage.width / KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX,
            y: point.y * sourceImage.height / KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX
        }
        : {
            x: Math.round(point.x * KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX / sourceImage.width),
            y: Math.round(point.y * KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX / sourceImage.height)
        };
}


export function convertKoreanFieldworkPercentPointToNormalized10000(
        point: { xPercent: number; yPercent: number }
): KoreanFieldworkImagePoint|undefined {

    if (!Number.isFinite(point.xPercent) || !Number.isFinite(point.yPercent)
            || point.xPercent < 0 || point.xPercent > 100
            || point.yPercent < 0 || point.yPercent > 100) {
        return undefined;
    }

    return {
        x: Math.round(point.xPercent * 100),
        y: Math.round(point.yPercent * 100)
    };
}


export function isKoreanFieldworkSoilProfileInterpretationStale(
        payload: KoreanFieldworkSoilProfileInterpretationPayload,
        currentSource: Pick<
            KoreanFieldworkSoilProfileSourceImage,
            'documentId'|'documentRevision'|'sourceSha256'|'width'|'height'
        >
): boolean {

    const source = payload.sourceImage;

    return source.documentId !== currentSource.documentId
        || source.documentRevision !== currentSource.documentRevision
        || source.sourceSha256 !== currentSource.sourceSha256
        || source.width !== currentSource.width
        || source.height !== currentSource.height;
}


function validateSourceImage(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$.sourceImage', 'invalidType', 'Source image must be an object.');
        return;
    }

    validateRequiredString(value.documentId, '$.sourceImage.documentId', issues);
    validateRequiredString(value.documentRevision, '$.sourceImage.documentRevision', issues);
    validateRequiredString(value.sourceField, '$.sourceImage.sourceField', issues);
    validateOptionalString(value.mediaId, '$.sourceImage.mediaId', issues);
    validateOptionalString(value.originalFilename, '$.sourceImage.originalFilename', issues);

    if (!isKoreanFieldworkSha256(value.sourceSha256)) {
        addIssue(
            issues,
            '$.sourceImage.sourceSha256',
            'invalidValue',
            'Source images require a 64-character hexadecimal SHA-256.'
        );
    }
    if (!isPositiveInteger(value.width)) {
        addIssue(issues, '$.sourceImage.width', 'outOfRange', 'Source image width must be positive.');
    }
    if (!isPositiveInteger(value.height)) {
        addIssue(issues, '$.sourceImage.height', 'outOfRange', 'Source image height must be positive.');
    }
    if (value.capturedAt !== undefined && !isKoreanFieldworkIsoTimestamp(value.capturedAt)) {
        addIssue(
            issues,
            '$.sourceImage.capturedAt',
            'invalidValue',
            'capturedAt must be a UTC ISO timestamp.'
        );
    }
}


function validateGeometryArray(
        value: unknown,
        coordinateSpace: unknown,
        sourceImage: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkSoilProfileGeometry[] {

    if (!Array.isArray(value)) {
        addIssue(issues, '$.geometries', 'required', 'Geometries must be an array.');
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, '$.geometries', 'invalidValue', 'Geometries must be a dense JSON array.');
        return [];
    }

    const geometries = value.filter(isKoreanFieldworkContractRecord) as unknown as KoreanFieldworkSoilProfileGeometry[];

    value.forEach((item, index) => {
        const path = `$.geometries[${index}]`;

        if (!isKoreanFieldworkContractRecord(item)) {
            addIssue(issues, path, 'invalidType', 'Geometry must be an object.');
            return;
        }

        validateItemBase(item, path, issues);

        switch (item.kind) {
            case 'interfacePolyline':
                validatePointList(
                    item.points,
                    `${path}.points`,
                    2,
                    coordinateSpace,
                    sourceImage,
                    issues
                );
                break;
            case 'contextPolygon':
                validatePointList(
                    item.points,
                    `${path}.points`,
                    3,
                    coordinateSpace,
                    sourceImage,
                    issues
                );
                validateOptionalString(item.layerDocumentId, `${path}.layerDocumentId`, issues);
                validateSimplePolygon(item.points, `${path}.points`, issues);
                break;
            case 'annotationPoint':
                validatePoint(item.point, `${path}.point`, coordinateSpace, sourceImage, issues);
                if (!['layerMarker', 'soilColorSample', 'materialSample', 'other'].includes(
                    item.role as string
                )) {
                    addIssue(issues, `${path}.role`, 'invalidValue', 'Annotation point role is invalid.');
                }
                validateOptionalString(item.layerDocumentId, `${path}.layerDocumentId`, issues);
                validateSoilColor(item, path, sourceImage, issues);
                break;
            default:
                addIssue(issues, `${path}.kind`, 'invalidValue', 'Geometry kind is not supported.');
        }
    });

    return geometries;
}


function validateRelationArray(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkStratigraphicRelation[] {

    if (!Array.isArray(value)) {
        addIssue(issues, '$.relations', 'required', 'Relations must be an array.');
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, '$.relations', 'invalidValue', 'Relations must be a dense JSON array.');
        return [];
    }

    const relations = value.filter(isKoreanFieldworkContractRecord) as unknown as KoreanFieldworkStratigraphicRelation[];

    value.forEach((relation, index) => {
        const path = `$.relations[${index}]`;

        if (!isKoreanFieldworkContractRecord(relation)) {
            addIssue(issues, path, 'invalidType', 'Relation must be an object.');
            return;
        }

        validateItemBase(relation, path, issues);

        if (relation.kind !== 'stratigraphicRelation') {
            addIssue(issues, `${path}.kind`, 'invalidValue', 'Relation kind must be stratigraphicRelation.');
        }
        validateRequiredString(relation.subjectContextId, `${path}.subjectContextId`, issues);
        validateRequiredString(relation.objectContextId, `${path}.objectContextId`, issues);

        if (!STRATIGRAPHIC_PREDICATES.includes(
            relation.predicate as KoreanFieldworkStratigraphicPredicate
        )) {
            addIssue(issues, `${path}.predicate`, 'invalidValue', 'Relation predicate is not supported.');
        }
        if (relation.subjectContextId === relation.objectContextId
                && typeof relation.subjectContextId === 'string') {
            addIssue(issues, path, 'invalidState', 'Stratigraphic relations cannot reference themselves.');
        }
    });

    return relations;
}


function validateItemBase(
        value: { [key: string]: unknown },
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    validateRequiredString(value.id, `${path}.id`, issues);
    validateOptionalString(value.label, `${path}.label`, issues);
    validateOptionalString(value.note, `${path}.note`, issues);

    const provenanceValidation = validateKoreanFieldworkProposalProvenance(
        value.provenance,
        `${path}.provenance`
    );
    const reviewValidation = validateKoreanFieldworkProposalReview(value.review, `${path}.review`);

    issues.push(...provenanceValidation.issues, ...reviewValidation.issues);

    if (value.score !== undefined) validateScore(value.score, `${path}.score`, issues);
}


function validateScore(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, path, 'invalidType', 'Interpretation score must be an object.');
        return;
    }

    validateRequiredString(value.metric, `${path}.metric`, issues);

    if (!Number.isFinite(value.value) || (value.value as number) < 0 || (value.value as number) > 1) {
        addIssue(issues, `${path}.value`, 'outOfRange', 'Interpretation scores must be between 0 and 1.');
    }
    if (!SCORE_MEANINGS.includes(value.meaning as KoreanFieldworkInterpretationScoreMeaning)) {
        addIssue(issues, `${path}.meaning`, 'invalidValue', 'Interpretation score meaning is required.');
    }
}


function validateSoilColor(
        item: { [key: string]: unknown },
        path: string,
        sourceImage: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (item.role !== 'soilColorSample') {
        if (item.soilColor !== undefined) {
            addIssue(
                issues,
                `${path}.soilColor`,
                'invalidState',
                'Only soil-color sample points may contain soilColor.'
            );
        }
        return;
    }
    if (!isKoreanFieldworkContractRecord(item.soilColor)) {
        addIssue(issues, `${path}.soilColor`, 'required', 'Soil-color sample points require soilColor.');
        return;
    }

    const soilColor = item.soilColor;

    if (!['fieldMeasured', 'photoEstimated'].includes(soilColor.method as string)) {
        addIssue(issues, `${path}.soilColor.method`, 'invalidValue', 'Soil-color method is not supported.');
        return;
    }

    validateOptionalString(
        soilColor.selectedMunsell,
        `${path}.soilColor.selectedMunsell`,
        issues
    );

    if (soilColor.method === 'fieldMeasured') {
        if (typeof soilColor.selectedMunsell !== 'string' || !soilColor.selectedMunsell.trim()) {
            addIssue(
                issues,
                `${path}.soilColor.selectedMunsell`,
                'required',
                'Field-measured soil color requires the observed Munsell value.'
            );
        }
        if (soilColor.samplePixel !== undefined || soilColor.rgb !== undefined
                || soilColor.candidates !== undefined
                || soilColor.calibration !== undefined) {
            addIssue(
                issues,
                `${path}.soilColor`,
                'invalidState',
                'Field-measured soil color cannot contain photo-estimation evidence.'
            );
        }
    } else {
        if (!isKoreanFieldworkContractRecord(item.provenance)
                || item.provenance.origin !== 'assist') {
            addIssue(
                issues,
                `${path}.provenance.origin`,
                'invalidState',
                'Photo-estimated soil color requires assist-run provenance.'
            );
        }

        validatePixelSample(
            soilColor.samplePixel,
            sourceImage,
            `${path}.soilColor.samplePixel`,
            issues
        );
        validateRgbSample(soilColor.rgb, `${path}.soilColor.rgb`, issues);
        const candidates = validateSoilColorCandidates(
            soilColor.candidates,
            `${path}.soilColor.candidates`,
            issues
        );

        if (typeof soilColor.selectedMunsell === 'string'
                && soilColor.selectedMunsell.trim()
                && !candidates.some(candidate =>
                    typeof candidate.munsell === 'string'
                        && candidate.munsell.trim() === (soilColor.selectedMunsell as string).trim()
                )) {
            addIssue(
                issues,
                `${path}.soilColor.selectedMunsell`,
                'invalidReference',
                'Selected Munsell value must reference one of the ranked candidates.'
            );
        }
        if (isKoreanFieldworkContractRecord(item.review)
                && item.review.state === 'accepted'
                && (typeof soilColor.selectedMunsell !== 'string'
                    || !soilColor.selectedMunsell.trim())) {
            addIssue(
                issues,
                `${path}.soilColor.selectedMunsell`,
                'required',
                'Accepted photo estimates must record the selected candidate.'
            );
        }

        if (!['none', 'whiteBalance', 'colorCard'].includes(soilColor.calibration as string)) {
            addIssue(
                issues,
                `${path}.soilColor.calibration`,
                'required',
                'Photo-estimated soil color must record its calibration method.'
            );
        }
    }
}


function validatePixelSample(
        value: unknown,
        sourceImage: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isFinitePoint(value) || !Number.isInteger(value.x) || !Number.isInteger(value.y)) {
        addIssue(
            issues,
            path,
            'invalidType',
            'Photo-estimated color requires integer source-pixel sample coordinates.'
        );
        return;
    }
    if (!isKoreanFieldworkContractRecord(sourceImage)
            || !isPositiveInteger(sourceImage.width) || !isPositiveInteger(sourceImage.height)) return;

    if (value.x < 0 || value.x >= sourceImage.width
            || value.y < 0 || value.y >= sourceImage.height) {
        addIssue(
            issues,
            path,
            'outOfRange',
            'RGB sample coordinates must be inside the source pixel grid.'
        );
    }
}


function validateRgbSample(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, path, 'required', 'Photo-estimated soil color requires an RGB sample.');
        return;
    }

    ['red', 'green', 'blue'].forEach(channel => {
        const entry = value[channel];

        if (!Number.isInteger(entry) || (entry as number) < 0 || (entry as number) > 255) {
            addIssue(
                issues,
                `${path}.${channel}`,
                'outOfRange',
                'RGB channels must be integers between 0 and 255.'
            );
        }
    });
}


function validateSoilColorCandidates(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkSoilColorCandidateReference[] {

    if (!Array.isArray(value) || value.length === 0) {
        addIssue(issues, path, 'required', 'Photo-estimated soil color requires candidate values.');
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, path, 'invalidValue', 'Soil-color candidates must be a dense JSON array.');
        return [];
    }

    const ranks = new Set<number>();
    const munsellValues = new Set<string>();
    const candidates = value.filter(isKoreanFieldworkContractRecord) as unknown as KoreanFieldworkSoilColorCandidateReference[];

    value.forEach((candidate, index) => {
        const candidatePath = `${path}[${index}]`;

        if (!isKoreanFieldworkContractRecord(candidate)) {
            addIssue(issues, candidatePath, 'invalidType', 'Soil-color candidate must be an object.');
            return;
        }

        validateRequiredString(candidate.munsell, `${candidatePath}.munsell`, issues);

        if (typeof candidate.munsell === 'string' && candidate.munsell.trim()) {
            const normalizedMunsell = candidate.munsell.trim();
            if (munsellValues.has(normalizedMunsell)) {
                addIssue(
                    issues,
                    `${candidatePath}.munsell`,
                    'duplicateId',
                    'Candidate Munsell values must be unique.'
                );
            }
            munsellValues.add(normalizedMunsell);
        }

        if (!Number.isFinite(candidate.deltaE) || (candidate.deltaE as number) < 0) {
            addIssue(
                issues,
                `${candidatePath}.deltaE`,
                'outOfRange',
                'Candidate deltaE must be a non-negative finite number.'
            );
        }
        if (!Number.isInteger(candidate.rank) || (candidate.rank as number) < 1) {
            addIssue(issues, `${candidatePath}.rank`, 'outOfRange', 'Candidate rank must be positive.');
        } else if (ranks.has(candidate.rank as number)) {
            addIssue(issues, `${candidatePath}.rank`, 'duplicateId', 'Candidate ranks must be unique.');
        } else {
            ranks.add(candidate.rank as number);
        }
    });

    for (let expectedRank = 1; expectedRank <= value.length; expectedRank++) {
        if (!ranks.has(expectedRank)) {
            addIssue(
                issues,
                path,
                'invalidValue',
                'Candidate ranks must form a contiguous sequence starting at 1.'
            );
            break;
        }
    }

    return candidates;
}


function validatePointList(
        value: unknown,
        path: string,
        minimumDistinctPoints: number,
        coordinateSpace: unknown,
        sourceImage: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!Array.isArray(value)) {
        addIssue(issues, path, 'required', 'Geometry points must be an array.');
        return;
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, path, 'invalidValue', 'Geometry points must be a dense JSON array.');
        return;
    }

    value.forEach((point, index) =>
        validatePoint(point, `${path}[${index}]`, coordinateSpace, sourceImage, issues)
    );

    const distinctPoints = new Set(value
        .filter(isFinitePoint)
        .map(point => `${point.x}\u0000${point.y}`));

    if (distinctPoints.size < minimumDistinctPoints) {
        addIssue(
            issues,
            path,
            'invalidValue',
            `Geometry requires at least ${minimumDistinctPoints} distinct points.`
        );
    }
}


function validatePoint(
        value: unknown,
        path: string,
        coordinateSpace: unknown,
        sourceImage: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isFinitePoint(value)) {
        addIssue(issues, path, 'invalidType', 'Image point must contain finite x and y values.');
        return;
    }

    const maximum = getCoordinateMaximum(coordinateSpace, sourceImage);
    if (!maximum || !isPointWithin(value, maximum.x, maximum.y)) {
        addIssue(
            issues,
            path,
            'outOfRange',
            'Image point is outside the tagged coordinate space.'
        );
    }
}


function validateSimplePolygon(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkDenseArray<KoreanFieldworkImagePoint>(value)
            || !value.every(isFinitePoint) || value.length < 3) return;

    let doubleArea = 0;

    value.forEach((point, index) => {
        const next = value[(index + 1) % value.length];
        doubleArea += point.x * next.y - next.x * point.y;
    });

    if (Math.abs(doubleArea) < Number.EPSILON) {
        addIssue(issues, path, 'invalidValue', 'Context polygon points cannot be collinear.');
    }

    const pointKeys = new Set<string>();
    for (const point of value) {
        const key = `${point.x}\u0000${point.y}`;
        if (pointKeys.has(key)) {
            addIssue(
                issues,
                path,
                'invalidValue',
                'Context polygons use implicit closure and cannot repeat vertices.'
            );
            return;
        }
        pointKeys.add(key);
    }

    for (let firstEdge = 0; firstEdge < value.length; firstEdge++) {
        const firstStart = value[firstEdge];
        const firstEnd = value[(firstEdge + 1) % value.length];

        for (let secondEdge = firstEdge + 1; secondEdge < value.length; secondEdge++) {
            const edgesAreAdjacent = (firstEdge + 1) % value.length === secondEdge
                || (secondEdge + 1) % value.length === firstEdge;
            if (edgesAreAdjacent) continue;

            const secondStart = value[secondEdge];
            const secondEnd = value[(secondEdge + 1) % value.length];

            if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
                addIssue(
                    issues,
                    path,
                    'invalidValue',
                    'Context polygon edges cannot cross or touch non-adjacent edges.'
                );
                return;
            }
        }
    }
}


function segmentsIntersect(
        firstStart: KoreanFieldworkImagePoint,
        firstEnd: KoreanFieldworkImagePoint,
        secondStart: KoreanFieldworkImagePoint,
        secondEnd: KoreanFieldworkImagePoint
): boolean {

    const firstOrientation = orientation(firstStart, firstEnd, secondStart);
    const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
    const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
    const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);
    const epsilon = 1e-9;

    if (((firstOrientation > epsilon && secondOrientation < -epsilon)
            || (firstOrientation < -epsilon && secondOrientation > epsilon))
            && ((thirdOrientation > epsilon && fourthOrientation < -epsilon)
                || (thirdOrientation < -epsilon && fourthOrientation > epsilon))) {
        return true;
    }

    return (Math.abs(firstOrientation) <= epsilon
            && pointIsOnSegment(secondStart, firstStart, firstEnd, epsilon))
        || (Math.abs(secondOrientation) <= epsilon
            && pointIsOnSegment(secondEnd, firstStart, firstEnd, epsilon))
        || (Math.abs(thirdOrientation) <= epsilon
            && pointIsOnSegment(firstStart, secondStart, secondEnd, epsilon))
        || (Math.abs(fourthOrientation) <= epsilon
            && pointIsOnSegment(firstEnd, secondStart, secondEnd, epsilon));
}


function orientation(
        start: KoreanFieldworkImagePoint,
        end: KoreanFieldworkImagePoint,
        point: KoreanFieldworkImagePoint
): number {

    return (end.x - start.x) * (point.y - start.y)
        - (end.y - start.y) * (point.x - start.x);
}


function pointIsOnSegment(
        point: KoreanFieldworkImagePoint,
        start: KoreanFieldworkImagePoint,
        end: KoreanFieldworkImagePoint,
        epsilon: number
): boolean {

    return point.x >= Math.min(start.x, end.x) - epsilon
        && point.x <= Math.max(start.x, end.x) + epsilon
        && point.y >= Math.min(start.y, end.y) - epsilon
        && point.y <= Math.max(start.y, end.y) + epsilon;
}


function validateUniqueItemIds(
        geometries: KoreanFieldworkSoilProfileGeometry[],
        relations: KoreanFieldworkStratigraphicRelation[],
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const ids = new Set<string>();

    [...geometries, ...relations].forEach(item => {
        if (ids.has(item.id)) {
            addIssue(issues, '$.items', 'duplicateId', `Duplicate interpretation item ID: ${item.id}.`);
        }
        ids.add(item.id);
    });
}


function validateDerivedItems(
        geometries: KoreanFieldworkSoilProfileGeometry[],
        relations: KoreanFieldworkStratigraphicRelation[],
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const entries = [
        ...geometries.map((item, index) => ({ item, path: `$.geometries[${index}]` })),
        ...relations.map((item, index) => ({ item, path: `$.relations[${index}]` }))
    ];
    const itemById = new Map(entries.map(entry => [entry.item.id, entry]));
    const acceptedSuccessors = new Map<string, typeof entries>();

    entries.forEach(entry => {
        const { item, path } = entry;
        if (!isKoreanFieldworkContractRecord(item.provenance)) return;

        const sourceId = item.provenance.derivedFromItemId;
        if (!sourceId) return;

        const sourceEntry = itemById.get(sourceId);

        if (!sourceEntry || sourceId === item.id) {
            addIssue(
                issues,
                `${path}.provenance.derivedFromItemId`,
                'invalidReference',
                'Edited item must reference a different existing interpretation item.'
            );
            return;
        }

        if (sourceEntry.item.kind !== item.kind) {
            addIssue(
                issues,
                `${path}.provenance.derivedFromItemId`,
                'invalidReference',
                'Edited items must preserve the predecessor item kind.'
            );
        }

        if (isKoreanFieldworkContractRecord(item.review) && item.review.state === 'accepted') {
            const successors = acceptedSuccessors.get(sourceId) ?? [];
            successors.push(entry);
            acceptedSuccessors.set(sourceId, successors);

            if (!isKoreanFieldworkContractRecord(sourceEntry.item.review)
                    || sourceEntry.item.review.state !== 'superseded') {
                addIssue(
                    issues,
                    `${path}.provenance.derivedFromItemId`,
                    'invalidState',
                    'An accepted edit requires its predecessor to be marked superseded.'
                );
            }
        }
    });

    acceptedSuccessors.forEach(successors => {
        if (successors.length <= 1) return;

        successors.forEach(successor => addIssue(
            issues,
            `${successor.path}.provenance.derivedFromItemId`,
            'invalidState',
            'A superseded item can have only one accepted successor.'
        ));
    });

    entries.forEach(({ item, path }) => {
        if (isKoreanFieldworkContractRecord(item.review)
                && item.review.state === 'superseded'
                && (acceptedSuccessors.get(item.id)?.length ?? 0) !== 1) {
            addIssue(
                issues,
                `${path}.review.state`,
                'invalidState',
                'A superseded item must have exactly one accepted edited successor.'
            );
        }
    });

    const lineageCycle = findLineageCycle(entries.map(entry => entry.item));
    if (lineageCycle) {
        const cycleEntry = itemById.get(lineageCycle[0]);
        addIssue(
            issues,
            cycleEntry ? `${cycleEntry.path}.provenance.derivedFromItemId` : '$',
            'invalidState',
            `Edited item lineage contains a cycle: ${lineageCycle.join(' -> ')}.`
        );
    }
}


function findLineageCycle(
        items: Array<KoreanFieldworkSoilProfileGeometry|KoreanFieldworkStratigraphicRelation>
): string[]|undefined {

    const predecessorById = new Map<string, string>();
    items.forEach(item => {
        if (isKoreanFieldworkContractRecord(item.provenance)
                && item.provenance.origin === 'edited'
                && typeof item.provenance.derivedFromItemId === 'string') {
            predecessorById.set(item.id, item.provenance.derivedFromItemId);
        }
    });

    for (const itemId of predecessorById.keys()) {
        const path: string[] = [];
        const pathIndexes = new Map<string, number>();
        let current: string|undefined = itemId;

        while (current && predecessorById.has(current)) {
            const existingIndex = pathIndexes.get(current);
            if (existingIndex !== undefined) return [...path.slice(existingIndex), current];

            pathIndexes.set(current, path.length);
            path.push(current);
            current = predecessorById.get(current);
        }
    }

    return undefined;
}


function validateRelationReferences(
        geometries: KoreanFieldworkSoilProfileGeometry[],
        relations: KoreanFieldworkStratigraphicRelation[],
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const contexts = new Map(geometries
        .filter(geometry => geometry.kind === 'contextPolygon')
        .map(geometry => [geometry.id, geometry as KoreanFieldworkSoilContextPolygon]));

    relations.forEach((relation, index) => {
        const subject = contexts.get(relation.subjectContextId);
        const object = contexts.get(relation.objectContextId);

        if (!subject) {
            addIssue(
                issues,
                `$.relations[${index}].subjectContextId`,
                'invalidReference',
                'Relation subject must reference a context polygon.'
            );
        }
        if (!object) {
            addIssue(
                issues,
                `$.relations[${index}].objectContextId`,
                'invalidReference',
                'Relation object must reference a context polygon.'
            );
        }

        if (isKoreanFieldworkContractRecord(relation.review)
                && relation.review.state === 'accepted') {
            if (subject && (!isKoreanFieldworkContractRecord(subject.review)
                    || subject.review.state !== 'accepted')) {
                addIssue(
                    issues,
                    `$.relations[${index}].subjectContextId`,
                    'invalidState',
                    'Accepted relations require an accepted subject context.'
                );
            }
            if (object && (!isKoreanFieldworkContractRecord(object.review)
                    || object.review.state !== 'accepted')) {
                addIssue(
                    issues,
                    `$.relations[${index}].objectContextId`,
                    'invalidState',
                    'Accepted relations require an accepted object context.'
                );
            }
        }
    });
}


function isOutputAllowedForSoilRun(
        runKind: KoreanFieldworkAssistRun['kind'],
        item: KoreanFieldworkSoilProfileGeometry|KoreanFieldworkStratigraphicRelation
): boolean {

    switch (runKind) {
        case 'soilProfileBoundarySuggestion':
            return item.kind === 'interfacePolyline';
        case 'soilProfileContextSuggestion':
            return item.kind === 'contextPolygon' || item.kind === 'stratigraphicRelation';
        case 'soilColorPhotoEstimate':
            return item.kind === 'annotationPoint'
                && item.role === 'soilColorSample'
                && item.soilColor?.method === 'photoEstimated';
        default:
            return false;
    }
}


function getCoordinateMaximum(
        coordinateSpace: unknown,
        sourceImage: unknown
): KoreanFieldworkImagePoint|undefined {

    if (coordinateSpace === 'imageNormalized10000') {
        return {
            x: KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX,
            y: KOREAN_FIELDWORK_IMAGE_NORMALIZED_MAX
        };
    }
    if (coordinateSpace !== 'sourcePixel' || !isKoreanFieldworkContractRecord(sourceImage)
            || !isPositiveInteger(sourceImage.width) || !isPositiveInteger(sourceImage.height)) {
        return undefined;
    }

    return { x: sourceImage.width, y: sourceImage.height };
}


function isFinitePoint(value: unknown): value is KoreanFieldworkImagePoint {

    return isKoreanFieldworkContractRecord(value)
        && Number.isFinite(value.x)
        && Number.isFinite(value.y);
}


function isPointWithin(point: KoreanFieldworkImagePoint, maximumX: number, maximumY: number): boolean {

    return point.x >= 0 && point.x <= maximumX && point.y >= 0 && point.y <= maximumY;
}


function isPositiveInteger(value: unknown): value is number {

    return Number.isInteger(value) && (value as number) > 0;
}


function validateRequiredString(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (typeof value !== 'string' || !value.trim()) {
        addIssue(issues, path, 'required', `${path} must be a non-empty string.`);
    }
}


function validateOptionalString(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
        addIssue(issues, path, 'invalidValue', `${path} must be a non-empty string when provided.`);
    }
}


function parseContractInput(value: unknown): { ok: true; value: unknown }|{ ok: false } {

    if (typeof value !== 'string') return { ok: true, value };

    try {
        return { ok: true, value: JSON.parse(value) };
    } catch (_) {
        return { ok: false };
    }
}


function prefixIssues(
        issues: KoreanFieldworkContractValidationIssue[],
        prefix: string
): KoreanFieldworkContractValidationIssue[] {

    return issues.map(issue => ({
        ...issue,
        path: issue.path === '$' ? prefix : `${prefix}${issue.path.slice(1)}`
    }));
}


function makeValidation(
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkContractValidation {

    return { isValid: issues.length === 0, issues };
}


function addIssue(
        issues: KoreanFieldworkContractValidationIssue[],
        path: string,
        code: KoreanFieldworkContractValidationIssueCode,
        message: string
) {

    issues.push(makeIssue(path, code, message));
}


function makeIssue(
        path: string,
        code: KoreanFieldworkContractValidationIssueCode,
        message: string
): KoreanFieldworkContractValidationIssue {

    return { code, message, path };
}
