import {
    isKoreanFieldworkContractRecord,
    isKoreanFieldworkDenseArray,
    KoreanFieldworkAssistRun,
    KoreanFieldworkContractValidationIssue,
    KoreanFieldworkProposalReview,
    validateKoreanFieldworkAssistRun
} from './korean-fieldwork-assist-run';
import {
    KoreanFieldworkSoilProfileGeometry,
    KoreanFieldworkSoilProfileInterpretationPayload,
    KoreanFieldworkStratigraphicRelation,
    validateKoreanFieldworkSoilProfileInterpretation
} from './korean-fieldwork-assist-geometry';
import {
    KoreanFieldworkReportDraft,
    KoreanFieldworkReportDraftPayload,
    validateKoreanFieldworkReportDraftPayload
} from './korean-fieldwork-report-draft';
import {
    isKoreanFieldworkAssistSidecarJsonValue,
    KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
    KoreanFieldworkAssistSidecar,
    normalizeKoreanFieldworkAssistSidecar,
    serializeKoreanFieldworkAssistSidecar,
    stringifyKoreanFieldworkCanonicalJson,
    validateKoreanFieldworkAssistSidecar
} from './korean-fieldwork-assist-sidecar';


export interface KoreanFieldworkAssistSidecarPatch {
    assistRuns?: KoreanFieldworkAssistRun[];
    soilProfileInterpretations?: KoreanFieldworkSoilProfileInterpretationPayload[];
    reportDraftPayloads?: KoreanFieldworkReportDraftPayload[];
}

export interface KoreanFieldworkAssistSidecarSnapshot {
    storageRevision: string;
    sidecar: KoreanFieldworkAssistSidecar;
}

export interface KoreanFieldworkAssistSidecarChange {
    baseStorageRevision: string;
    changed: boolean;
    sidecar: KoreanFieldworkAssistSidecar;
}

export interface KoreanFieldworkAssistSidecarMergeProposal {
    parentStorageRevisions: string[];
    sidecar: KoreanFieldworkAssistSidecar;
}

export type KoreanFieldworkAssistSidecarConflictCode =
    'differentTarget'
    |'revisionCollision'
    |'staleStorageRevision'
    |'contentConflict'
    |'semanticConflict';

export interface KoreanFieldworkAssistSidecarConflict {
    code: KoreanFieldworkAssistSidecarConflictCode;
    message: string;
    path: string;
}

export type KoreanFieldworkAssistSidecarOperationResult<T> =
    {
        ok: true;
        value: T;
    }
    |{
        issues: KoreanFieldworkContractValidationIssue[];
        ok: false;
        reason: 'invalid';
    }
    |{
        conflicts: KoreanFieldworkAssistSidecarConflict[];
        ok: false;
        reason: 'conflict';
    };

const PATCH_KEYS = new Set([
    'assistRuns',
    'soilProfileInterpretations',
    'reportDraftPayloads'
]);


export function createKoreanFieldworkAssistSidecar(
        targetDocumentId: unknown,
        content: unknown = {}
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecar> {

    try {
        return createKoreanFieldworkAssistSidecarUnchecked(targetDocumentId, content);
    } catch (_) {
        return unsafeOperationResult();
    }
}


function createKoreanFieldworkAssistSidecarUnchecked(
        targetDocumentId: unknown,
        content: unknown
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecar> {

    const safeContent = clone(content) as unknown;
    const issues = validatePatch(safeContent);
    if (typeof targetDocumentId !== 'string' || targetDocumentId.trim() === '') {
        issues.push({
            code: targetDocumentId === undefined ? 'required' : 'invalidValue',
            message: 'Sidecar targetDocumentId must be a non-empty string.',
            path: '$.targetDocumentId'
        });
    }
    if (issues.length > 0 || !isKoreanFieldworkContractRecord(safeContent)) {
        return { issues, ok: false, reason: 'invalid' };
    }

    const patch = safeContent as KoreanFieldworkAssistSidecarPatch;
    const sidecar: KoreanFieldworkAssistSidecar = {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
        targetDocumentId: targetDocumentId as string,
        assistRuns: clone(patch.assistRuns || []),
        soilProfileInterpretations: clone(patch.soilProfileInterpretations || []),
        reportDraftPayloads: clone(patch.reportDraftPayloads || [])
    };
    const validation = validateKoreanFieldworkAssistSidecar(sidecar);
    if (!validation.isValid) return { issues: validation.issues, ok: false, reason: 'invalid' };

    return {
        ok: true,
        value: normalizeKoreanFieldworkAssistSidecar(sidecar) as KoreanFieldworkAssistSidecar
    };
}


export function applyKoreanFieldworkAssistSidecarPatch(
        snapshot: unknown,
        expectedStorageRevision: unknown,
        patch: unknown
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarChange> {

    try {
        return applyKoreanFieldworkAssistSidecarPatchUnchecked(
            snapshot,
            expectedStorageRevision,
            patch
        );
    } catch (_) {
        return unsafeOperationResult();
    }
}


function applyKoreanFieldworkAssistSidecarPatchUnchecked(
        snapshot: unknown,
        expectedStorageRevision: unknown,
        patch: unknown
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarChange> {

    const snapshotResult = validateSnapshot(snapshot, '$.snapshot');
    if ('reason' in snapshotResult) {
        return snapshotResult.reason === 'invalid'
            ? { issues: snapshotResult.issues, ok: false, reason: 'invalid' }
            : { conflicts: snapshotResult.conflicts, ok: false, reason: 'conflict' };
    }

    if (typeof expectedStorageRevision !== 'string' || expectedStorageRevision.trim() === '') {
        return {
            issues: [{
                code: expectedStorageRevision === undefined ? 'required' : 'invalidValue',
                message: 'Expected storage revision must be a non-empty string.',
                path: '$.expectedStorageRevision'
            }],
            ok: false,
            reason: 'invalid'
        };
    }
    if (snapshotResult.value.storageRevision !== expectedStorageRevision) {
        return conflictResult([{
            code: 'staleStorageRevision',
            message: 'Expected storage revision does not match the current snapshot.',
            path: '$.expectedStorageRevision'
        }]);
    }

    const safePatch = clone(patch) as unknown;
    const patchIssues = validatePatch(safePatch);
    if (patchIssues.length > 0 || !isKoreanFieldworkContractRecord(safePatch)) {
        return { issues: patchIssues, ok: false, reason: 'invalid' };
    }

    const base = snapshotResult.value.sidecar;
    const next = clone(base);
    const conflicts: KoreanFieldworkAssistSidecarConflict[] = [];
    const typedPatch = safePatch as KoreanFieldworkAssistSidecarPatch;

    mergeRunsInto(next.assistRuns, typedPatch.assistRuns || [], conflicts, '$.assistRuns');
    mergeSoilsInto(
        next.soilProfileInterpretations,
        typedPatch.soilProfileInterpretations || [],
        conflicts,
        '$.soilProfileInterpretations'
    );
    mergeReportsInto(
        next.reportDraftPayloads,
        typedPatch.reportDraftPayloads || [],
        conflicts,
        '$.reportDraftPayloads'
    );
    if (conflicts.length > 0) return conflictResult(conflicts);

    const validation = validateKoreanFieldworkAssistSidecar(next);
    if (!validation.isValid) return { issues: validation.issues, ok: false, reason: 'invalid' };

    const normalized = normalizeKoreanFieldworkAssistSidecar(next) as KoreanFieldworkAssistSidecar;

    return {
        ok: true,
        value: {
            baseStorageRevision: snapshotResult.value.storageRevision,
            changed: serializeKoreanFieldworkAssistSidecar(base)
                !== serializeKoreanFieldworkAssistSidecar(normalized),
            sidecar: normalized
        }
    };
}


export function mergeKoreanFieldworkAssistSidecarSnapshots(
        leftSnapshot: unknown,
        rightSnapshot: unknown
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarMergeProposal> {

    try {
        return mergeKoreanFieldworkAssistSidecarSnapshotsUnchecked(leftSnapshot, rightSnapshot);
    } catch (_) {
        return unsafeOperationResult();
    }
}


function mergeKoreanFieldworkAssistSidecarSnapshotsUnchecked(
        leftSnapshot: unknown,
        rightSnapshot: unknown
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarMergeProposal> {

    const leftResult = validateSnapshot(leftSnapshot, '$.leftSnapshot');
    if ('reason' in leftResult) {
        return leftResult.reason === 'invalid'
            ? { issues: leftResult.issues, ok: false, reason: 'invalid' }
            : { conflicts: leftResult.conflicts, ok: false, reason: 'conflict' };
    }
    const rightResult = validateSnapshot(rightSnapshot, '$.rightSnapshot');
    if ('reason' in rightResult) {
        return rightResult.reason === 'invalid'
            ? { issues: rightResult.issues, ok: false, reason: 'invalid' }
            : { conflicts: rightResult.conflicts, ok: false, reason: 'conflict' };
    }

    const left = leftResult.value;
    const right = rightResult.value;
    const leftJson = serializeKoreanFieldworkAssistSidecar(left.sidecar) as string;
    const rightJson = serializeKoreanFieldworkAssistSidecar(right.sidecar) as string;

    if (left.storageRevision === right.storageRevision && leftJson !== rightJson) {
        return conflictResult([{
            code: 'revisionCollision',
            message: 'The same storage revision cannot name two different sidecar contents.',
            path: '$.rightSnapshot.storageRevision'
        }]);
    }
    if (left.sidecar.targetDocumentId !== right.sidecar.targetDocumentId) {
        return conflictResult([{
            code: 'differentTarget',
            message: 'Sidecars for different target documents cannot be merged.',
            path: '$.rightSnapshot.sidecar.targetDocumentId'
        }]);
    }

    const baseIsLeft = compareStrings(left.storageRevision, right.storageRevision) < 0
        || (left.storageRevision === right.storageRevision && leftJson <= rightJson);
    const base = baseIsLeft ? left : right;
    const incoming = baseIsLeft ? right : left;
    const merged = clone(base.sidecar);
    const conflicts: KoreanFieldworkAssistSidecarConflict[] = [];
    mergeRunsInto(merged.assistRuns, incoming.sidecar.assistRuns, conflicts, '$.assistRuns');
    mergeSoilsInto(
        merged.soilProfileInterpretations,
        incoming.sidecar.soilProfileInterpretations,
        conflicts,
        '$.soilProfileInterpretations'
    );
    mergeReportsInto(
        merged.reportDraftPayloads,
        incoming.sidecar.reportDraftPayloads,
        conflicts,
        '$.reportDraftPayloads'
    );
    if (conflicts.length > 0) return conflictResult(conflicts);

    const validation = validateKoreanFieldworkAssistSidecar(merged);
    if (!validation.isValid) {
        return conflictResult(validation.issues.map(issue => ({
            code: 'semanticConflict' as const,
            message: `Merged sidecar is invalid: ${issue.message}`,
            path: issue.path
        })));
    }

    const parentStorageRevisions = Array.from(new Set([
        left.storageRevision,
        right.storageRevision
    ])).sort(compareStrings);

    return {
        ok: true,
        value: {
            parentStorageRevisions,
            sidecar: normalizeKoreanFieldworkAssistSidecar(merged) as KoreanFieldworkAssistSidecar
        }
    };
}


function validateSnapshot(
        value: unknown,
        path: string
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarSnapshot> {

    const issues: KoreanFieldworkContractValidationIssue[] = [];
    let safeValue: unknown;
    try {
        safeValue = clone(value);
    } catch (_) {
        safeValue = undefined;
    }
    if (!isKoreanFieldworkContractRecord(safeValue)) {
        issues.push({
            code: 'invalidValue',
            message: 'Sidecar snapshot must be a persistence-safe JSON object.',
            path
        });
        return { issues, ok: false, reason: 'invalid' };
    }
    if (typeof safeValue.storageRevision !== 'string' || safeValue.storageRevision.trim() === '') {
        issues.push({
            code: safeValue.storageRevision === undefined ? 'required' : 'invalidValue',
            message: 'Snapshot storageRevision must be a non-empty string.',
            path: `${path}.storageRevision`
        });
    }
    const validation = validateKoreanFieldworkAssistSidecar(safeValue.sidecar);
    issues.push(...prefixIssues(validation.issues, `${path}.sidecar`));
    if (issues.length > 0) return { issues, ok: false, reason: 'invalid' };

    return {
        ok: true,
        value: {
            storageRevision: safeValue.storageRevision as string,
            sidecar: normalizeKoreanFieldworkAssistSidecar(
                safeValue.sidecar
            ) as KoreanFieldworkAssistSidecar
        }
    };
}


function validatePatch(value: unknown): KoreanFieldworkContractValidationIssue[] {

    const issues: KoreanFieldworkContractValidationIssue[] = [];
    if (!isKoreanFieldworkAssistSidecarJsonValue(value)
            || !isKoreanFieldworkContractRecord(value)) {
        issues.push({
            code: 'invalidValue',
            message: 'Sidecar patch must be a persistence-safe JSON object.',
            path: '$.patch'
        });
        return issues;
    }

    Object.keys(value).forEach(key => {
        if (!PATCH_KEYS.has(key)) {
            issues.push({
                code: 'invalidValue',
                message: 'Sidecar patch contains an unknown field.',
                path: `$.patch.${key}`
            });
        }
    });

    validatePatchArray(
        value.assistRuns,
        '$.patch.assistRuns',
        validateKoreanFieldworkAssistRun,
        issues
    );
    validatePatchArray(
        value.soilProfileInterpretations,
        '$.patch.soilProfileInterpretations',
        validateKoreanFieldworkSoilProfileInterpretation,
        issues
    );
    validatePatchArray(
        value.reportDraftPayloads,
        '$.patch.reportDraftPayloads',
        validateKoreanFieldworkReportDraftPayload,
        issues
    );

    return issues;
}


function validatePatchArray(
        value: unknown,
        path: string,
        validator: (candidate: unknown) => { issues: KoreanFieldworkContractValidationIssue[] },
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (value === undefined) return;
    if (!Array.isArray(value)) {
        issues.push({ code: 'invalidType', message: `${path} must be an array.`, path });
        return;
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        issues.push({ code: 'invalidValue', message: `${path} must be a dense JSON array.`, path });
        return;
    }

    value.forEach((candidate, index) => {
        issues.push(...prefixIssues(validator(candidate).issues, `${path}[${index}]`));
    });
}


function mergeRunsInto(
        target: KoreanFieldworkAssistRun[],
        incoming: KoreanFieldworkAssistRun[],
        conflicts: KoreanFieldworkAssistSidecarConflict[],
        path: string
) {

    const targetIndexByRunId = new Map(target.map((run, index) => [run.runId, index]));
    incoming.forEach(run => {
        const index = targetIndexByRunId.get(run.runId);
        if (index === undefined) {
            targetIndexByRunId.set(run.runId, target.length);
            target.push(clone(run));
            return;
        }

        const merged = mergeRun(target[index], run);
        if (merged) {
            target[index] = merged;
        } else {
            conflicts.push({
                code: 'contentConflict',
                message: `Assist run ${run.runId} has divergent immutable or terminal content.`,
                path: `${path}[runId=${JSON.stringify(run.runId)}]`
            });
        }
    });
}


function mergeRun(
        left: KoreanFieldworkAssistRun,
        right: KoreanFieldworkAssistRun
): KoreanFieldworkAssistRun|undefined {

    const normalizedLeft = normalizeRunClone(left);
    const normalizedRight = normalizeRunClone(right);
    if (canonicalEqual(normalizedLeft, normalizedRight)) return normalizedLeft;

    const leftBase = clone(normalizedLeft) as any;
    const rightBase = clone(normalizedRight) as any;
    ['status', 'completedAt', 'failure', 'outputItemIds'].forEach(key => {
        delete leftBase[key];
        delete rightBase[key];
    });
    if (!canonicalEqual(leftBase, rightBase)) return undefined;

    if (normalizedLeft.status === 'running' && normalizedRight.status !== 'running') {
        return normalizedRight;
    }
    if (normalizedRight.status === 'running' && normalizedLeft.status !== 'running') {
        return normalizedLeft;
    }

    return undefined;
}


function mergeSoilsInto(
        target: KoreanFieldworkSoilProfileInterpretationPayload[],
        incoming: KoreanFieldworkSoilProfileInterpretationPayload[],
        conflicts: KoreanFieldworkAssistSidecarConflict[],
        path: string
) {

    const targetIndexBySourceKey = new Map(target.map((payload, index) => [
        soilPayloadKeyUnchecked(payload),
        index
    ]));
    incoming.forEach(payload => {
        const key = soilPayloadKeyUnchecked(payload);
        const index = targetIndexBySourceKey.get(key);
        if (index === undefined) {
            targetIndexBySourceKey.set(key, target.length);
            target.push(clone(payload));
            return;
        }

        const merged = mergeSoilPayload(target[index], payload, conflicts, `${path}[source=${key}]`);
        if (merged) target[index] = merged;
    });
}


function mergeSoilPayload(
        left: KoreanFieldworkSoilProfileInterpretationPayload,
        right: KoreanFieldworkSoilProfileInterpretationPayload,
        conflicts: KoreanFieldworkAssistSidecarConflict[],
        path: string
): KoreanFieldworkSoilProfileInterpretationPayload|undefined {

    if (left.schemaVersion !== right.schemaVersion
            || left.coordinateSpace !== right.coordinateSpace
            || !canonicalEqual(left.sourceImage, right.sourceImage)) {
        conflicts.push({
            code: 'contentConflict',
            message: 'The same soil source slot has divergent source metadata or coordinate space.',
            path
        });
        return undefined;
    }

    const merged = clone(left);
    mergeReviewedItems(
        merged.geometries,
        right.geometries,
        item => item.id,
        conflicts,
        `${path}.geometries`
    );
    mergeReviewedItems(
        merged.relations,
        right.relations,
        item => item.id,
        conflicts,
        `${path}.relations`
    );

    return merged;
}


function mergeReportsInto(
        target: KoreanFieldworkReportDraftPayload[],
        incoming: KoreanFieldworkReportDraftPayload[],
        conflicts: KoreanFieldworkAssistSidecarConflict[],
        path: string
) {

    const targetIndexByRunId = new Map(target.map((payload, index) => [
        reportPayloadKeyUnchecked(payload),
        index
    ]));
    incoming.forEach(payload => {
        const key = reportPayloadKeyUnchecked(payload);
        const index = targetIndexByRunId.get(key);
        if (index === undefined) {
            targetIndexByRunId.set(key, target.length);
            target.push(clone(payload));
            return;
        }

        const merged = mergeReportPayload(target[index], payload, conflicts, `${path}[runId=${key}]`);
        if (merged) target[index] = merged;
    });
}


function mergeReportPayload(
        left: KoreanFieldworkReportDraftPayload,
        right: KoreanFieldworkReportDraftPayload,
        conflicts: KoreanFieldworkAssistSidecarConflict[],
        path: string
): KoreanFieldworkReportDraftPayload|undefined {

    const leftImmutable = clone(left) as any;
    const rightImmutable = clone(right) as any;
    delete leftImmutable.drafts;
    delete rightImmutable.drafts;

    if (!canonicalEqual(leftImmutable, rightImmutable)) {
        conflicts.push({
            code: 'contentConflict',
            message: 'The same report generation run has divergent target, run, citation or version pins.',
            path
        });
        return undefined;
    }

    const merged = clone(left);
    mergeReviewedItems(
        merged.drafts,
        right.drafts,
        draft => draft.draftId,
        conflicts,
        `${path}.drafts`
    );

    return merged;
}


type ReviewedItem =
    KoreanFieldworkSoilProfileGeometry
    |KoreanFieldworkStratigraphicRelation
    |KoreanFieldworkReportDraft;

function mergeReviewedItems<T extends ReviewedItem>(
        target: T[],
        incoming: T[],
        getId: (item: T) => string,
        conflicts: KoreanFieldworkAssistSidecarConflict[],
        path: string
) {

    const incomingIds = new Set(incoming.map(getId));
    const targetIds = new Set(target.map(getId));
    const targetSharedOrder = target.map(getId).filter(id => incomingIds.has(id));
    const incomingSharedOrder = incoming.map(getId).filter(id => targetIds.has(id));
    if (!sameStringArray(targetSharedOrder, incomingSharedOrder)) {
        conflicts.push({
            code: 'contentConflict',
            message: 'Branches disagree about the relative order of existing nested items.',
            path
        });
        return;
    }

    const targetIndexById = new Map(target.map((item, index) => [getId(item), index]));
    incoming.forEach(item => {
        const itemId = getId(item);
        const index = targetIndexById.get(itemId);
        if (index === undefined) {
            targetIndexById.set(itemId, target.length);
            target.push(clone(item));
            return;
        }

        const merged = mergeReviewedItem(target[index], item);
        if (merged) {
            target[index] = merged as T;
        } else {
            conflicts.push({
                code: 'contentConflict',
                message: `Item ${itemId} has divergent content or incompatible review decisions.`,
                path: `${path}[id=${JSON.stringify(itemId)}]`
            });
        }
    });
}


function mergeReviewedItem<T extends ReviewedItem>(left: T, right: T): T|undefined {

    if (canonicalEqual(left, right)) return clone(left);

    const leftContent = clone(left) as any;
    const rightContent = clone(right) as any;
    delete leftContent.review;
    delete rightContent.review;
    if (!canonicalEqual(leftContent, rightContent)) return undefined;

    const review = mergeReview(left.review, right.review);
    if (!review) return undefined;

    return { ...clone(left), review };
}


function mergeReview(
        left: KoreanFieldworkProposalReview,
        right: KoreanFieldworkProposalReview
): KoreanFieldworkProposalReview|undefined {

    if (canonicalEqual(left, right)) return clone(left);
    if (left.state === 'proposed' && (right.state === 'accepted' || right.state === 'rejected')) {
        return clone(right);
    }
    if (right.state === 'proposed' && (left.state === 'accepted' || left.state === 'rejected')) {
        return clone(left);
    }
    if (left.state === 'accepted' && right.state === 'superseded') return clone(right);
    if (right.state === 'accepted' && left.state === 'superseded') return clone(left);

    return undefined;
}


function normalizeRunClone(run: KoreanFieldworkAssistRun): KoreanFieldworkAssistRun {

    return clone(run);
}


function canonicalEqual(left: unknown, right: unknown): boolean {

    const leftJson = stringifyKoreanFieldworkCanonicalJson(left);
    const rightJson = stringifyKoreanFieldworkCanonicalJson(right);

    return leftJson !== undefined && leftJson === rightJson;
}


function sameStringArray(left: string[], right: string[]): boolean {

    return left.length === right.length && left.every((value, index) => value === right[index]);
}


function soilPayloadKeyUnchecked(payload: KoreanFieldworkSoilProfileInterpretationPayload): string {

    return JSON.stringify([
        payload.sourceImage.documentRevision,
        payload.sourceImage.sourceField,
        payload.sourceImage.mediaId || ''
    ]);
}


function reportPayloadKeyUnchecked(payload: KoreanFieldworkReportDraftPayload): string {

    return payload.assistRun.runId;
}


function clone<T>(value: T): T {

    const serialized = stringifyKoreanFieldworkCanonicalJson(value);
    if (serialized === undefined) throw new Error('Value is not persistence-safe JSON.');

    return JSON.parse(serialized);
}


function prefixIssues(
        issues: KoreanFieldworkContractValidationIssue[],
        prefix: string
): KoreanFieldworkContractValidationIssue[] {

    return issues.map(issue => ({
        ...issue,
        path: issue.path === '$'
            ? prefix
            : `${prefix}${issue.path.slice(1)}`
    }));
}


function conflictResult<T>(
        conflicts: KoreanFieldworkAssistSidecarConflict[]
): KoreanFieldworkAssistSidecarOperationResult<T> {

    return { conflicts, ok: false, reason: 'conflict' };
}


function unsafeOperationResult<T>(): KoreanFieldworkAssistSidecarOperationResult<T> {

    return {
        issues: [{
            code: 'invalidValue',
            message: 'Sidecar operation input could not be inspected safely.',
            path: '$'
        }],
        ok: false,
        reason: 'invalid'
    };
}


function compareStrings(left: string, right: string): number {

    return left < right ? -1 : left > right ? 1 : 0;
}
