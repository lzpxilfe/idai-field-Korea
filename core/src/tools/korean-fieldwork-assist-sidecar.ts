import {
    isKoreanFieldworkContractRecord,
    isKoreanFieldworkDenseArray,
    isKoreanFieldworkSha256,
    KoreanFieldworkAssistJsonValue,
    KoreanFieldworkAssistRun,
    KoreanFieldworkContractParseResult,
    KoreanFieldworkContractValidation,
    KoreanFieldworkContractValidationIssue,
    KoreanFieldworkContractValidationIssueCode,
    validateKoreanFieldworkAssistRun
} from './korean-fieldwork-assist-run';
import {
    KoreanFieldworkSoilProfileInterpretationPayload,
    KoreanFieldworkSoilProfileSourceImage,
    validateKoreanFieldworkSoilProfileAssistLinks,
    validateKoreanFieldworkSoilProfileInterpretation
} from './korean-fieldwork-assist-geometry';
import {
    KoreanFieldworkReportDraftPayload,
    KoreanFieldworkReportDraftTarget,
    validateKoreanFieldworkReportDraftPayload
} from './korean-fieldwork-report-draft';


export const KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION = 1 as const;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_MEDIA_TYPE =
    'application/vnd.idai-field.korean-fieldwork-assist-sidecar+json' as const;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_DEPTH = 128;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_NODES = 100000;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH = 1000000;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_TOTAL_STRING_LENGTH = 8000000;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_SERIALIZED_LENGTH = 16000000;

export interface KoreanFieldworkAssistSidecar {
    schemaVersion: typeof KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION;
    targetDocumentId: string;
    assistRuns: KoreanFieldworkAssistRun[];
    soilProfileInterpretations: KoreanFieldworkSoilProfileInterpretationPayload[];
    reportDraftPayloads: KoreanFieldworkReportDraftPayload[];
}

export type KoreanFieldworkAssistSidecarFreshness =
    'current'
    |'revisionOnly'
    |'contentChanged'
    |'missing';

export type KoreanFieldworkCurrentSoilProfileSource = Pick<
    KoreanFieldworkSoilProfileSourceImage,
    'documentId'|'documentRevision'|'sourceField'|'sourceSha256'|'width'|'height'|'mediaId'
>;

export type KoreanFieldworkCurrentReportTarget = Pick<
    KoreanFieldworkReportDraftTarget,
    'documentId'|'documentRevision'|'inputSha256'
>;

const SIDECAR_KEYS = new Set([
    'schemaVersion',
    'targetDocumentId',
    'assistRuns',
    'soilProfileInterpretations',
    'reportDraftPayloads'
]);

const SHA256_VALUE_KEYS = new Set(['sourceSha256', 'inputSha256', 'excerptSha256']);

interface IndexedValue<T> {
    index: number;
    value: T;
}


export function validateKoreanFieldworkAssistSidecar(
        value: unknown
): KoreanFieldworkContractValidation {

    try {
        const serialized = stringifyKoreanFieldworkCanonicalJson(value);
        if (serialized === undefined) {
            return makeValidation([makeIssue(
                '$',
                'invalidValue',
                'Assist sidecar must be a persistence-safe, bounded JSON value.'
            )]);
        }

        return validateKoreanFieldworkAssistSidecarUnchecked(JSON.parse(serialized));
    } catch (_) {
        return makeValidation([makeIssue(
            '$',
            'invalidValue',
            'Assist sidecar could not be inspected safely.'
        )]);
    }
}


function validateKoreanFieldworkAssistSidecarUnchecked(
        value: unknown
): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];

    // This guard also rejects cycles, accessors, sparse arrays, non-finite numbers,
    // symbols and host objects before nested validators can read unsafe properties.
    if (!isKoreanFieldworkAssistSidecarJsonValue(value)) {
        addIssue(
            issues,
            '$',
            'invalidValue',
            'Assist sidecar must be a persistence-safe, dense JSON value.'
        );
        return makeValidation(issues);
    }
    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$', 'invalidType', 'Assist sidecar must be an object.');
        return makeValidation(issues);
    }

    Object.keys(value).forEach(key => {
        if (!SIDECAR_KEYS.has(key)) {
            addIssue(
                issues,
                `$.${key}`,
                'invalidValue',
                'Assist sidecar v1 does not permit unknown top-level fields.'
            );
        }
    });

    if (value.schemaVersion !== KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION) {
        addIssue(
            issues,
            '$.schemaVersion',
            value.schemaVersion === undefined ? 'required' : 'unsupportedVersion',
            'Assist sidecar schemaVersion must be 1.'
        );
    }
    validateRequiredString(value.targetDocumentId, '$.targetDocumentId', issues);

    const runs = validateRuns(value.assistRuns, issues);
    const soils = validateSoilPayloads(value.soilProfileInterpretations, issues);
    const reports = validateReportPayloads(value.reportDraftPayloads, issues);

    if (typeof value.targetDocumentId === 'string' && value.targetDocumentId.trim() !== '') {
        validateCrossLinks(value.targetDocumentId, runs, soils, reports, issues);
    }

    return makeValidation(issues);
}


export function parseKoreanFieldworkAssistSidecar(
        value: unknown
): KoreanFieldworkContractParseResult<KoreanFieldworkAssistSidecar> {

    try {
        return parseKoreanFieldworkAssistSidecarUnchecked(value);
    } catch (_) {
        return {
            issues: [makeIssue('$', 'invalidValue', 'Assist sidecar could not be parsed safely.')],
            ok: false,
            raw: value,
            reason: 'invalid'
        };
    }
}


function parseKoreanFieldworkAssistSidecarUnchecked(
        value: unknown
): KoreanFieldworkContractParseResult<KoreanFieldworkAssistSidecar> {

    const parsed = parseContractInput(value);

    if (!parsed.ok) {
        return {
            issues: [makeIssue('$', 'invalidValue', 'Assist sidecar is not valid JSON.')],
            ok: false,
            raw: value,
            reason: 'invalid'
        };
    }
    const serialized = stringifyKoreanFieldworkCanonicalJson(parsed.value);
    if (serialized === undefined) {
        return {
            issues: [makeIssue('$', 'invalidValue', 'Assist sidecar is not safe JSON.')],
            ok: false,
            raw: parsed.value,
            reason: 'invalid'
        };
    }
    const safeValue = JSON.parse(serialized) as unknown;
    if (isKoreanFieldworkContractRecord(safeValue)
            && safeValue.schemaVersion !== undefined
            && safeValue.schemaVersion !== KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION) {
        return {
            issues: [makeIssue(
                '$.schemaVersion',
                'unsupportedVersion',
                'Assist sidecar schema version is not supported.'
            )],
            ok: false,
            raw: safeValue,
            reason: 'unsupportedVersion'
        };
    }

    const validation = validateKoreanFieldworkAssistSidecarUnchecked(safeValue);

    return validation.isValid
        ? {
            ok: true,
            value: safeValue as KoreanFieldworkAssistSidecar
        }
        : {
            issues: validation.issues,
            ok: false,
            raw: safeValue,
            reason: 'invalid'
        };
}


export function getKoreanFieldworkSoilProfileSourceKey(
        source: Pick<
            KoreanFieldworkSoilProfileSourceImage,
            'documentRevision'|'sourceField'|'mediaId'
        >
): string;
export function getKoreanFieldworkSoilProfileSourceKey(source: unknown): string|undefined;
export function getKoreanFieldworkSoilProfileSourceKey(source: unknown): string|undefined {

    const safeSource = toSafeJsonRecord(source);
    if (!safeSource
            || typeof safeSource.documentRevision !== 'string'
            || safeSource.documentRevision.trim() === ''
            || typeof safeSource.sourceField !== 'string'
            || safeSource.sourceField.trim() === ''
            || (safeSource.mediaId !== undefined && typeof safeSource.mediaId !== 'string')) {
        return undefined;
    }

    return JSON.stringify([
        safeSource.documentRevision,
        safeSource.sourceField,
        safeSource.mediaId || ''
    ]);
}


export function getKoreanFieldworkReportDraftPayloadKey(
        payload: KoreanFieldworkReportDraftPayload
): string;
export function getKoreanFieldworkReportDraftPayloadKey(payload: unknown): string|undefined;
export function getKoreanFieldworkReportDraftPayloadKey(payload: unknown): string|undefined {

    const safePayload = toSafeJsonRecord(payload);
    const assistRun = safePayload && isKoreanFieldworkContractRecord(safePayload.assistRun)
        ? safePayload.assistRun
        : undefined;

    return assistRun && typeof assistRun.runId === 'string' && assistRun.runId.trim() !== ''
        ? assistRun.runId
        : undefined;
}


export function classifyKoreanFieldworkSoilProfileFreshness(
        payload: KoreanFieldworkSoilProfileInterpretationPayload,
        currentSource?: KoreanFieldworkCurrentSoilProfileSource
): KoreanFieldworkAssistSidecarFreshness;
export function classifyKoreanFieldworkSoilProfileFreshness(
        payload: unknown,
        currentSource?: unknown
): KoreanFieldworkAssistSidecarFreshness|undefined;
export function classifyKoreanFieldworkSoilProfileFreshness(
        payload: unknown,
        currentSource?: unknown
): KoreanFieldworkAssistSidecarFreshness|undefined {

    const safePayload = toSafeJsonRecord(payload);
    const source = safePayload && isKoreanFieldworkContractRecord(safePayload.sourceImage)
        ? safePayload.sourceImage
        : undefined;
    if (!source || !isSoilFreshnessSource(source)) return undefined;

    if (!currentSource) return 'missing';
    const safeCurrentSource = toSafeJsonRecord(currentSource);
    if (!safeCurrentSource || !isSoilFreshnessSource(safeCurrentSource)) return undefined;

    if (source.documentId !== safeCurrentSource.documentId
            || source.sourceField !== safeCurrentSource.sourceField
            || (source.mediaId || '') !== (safeCurrentSource.mediaId || '')
            || source.sourceSha256.toLowerCase()
                !== safeCurrentSource.sourceSha256.toLowerCase()
            || source.width !== safeCurrentSource.width
            || source.height !== safeCurrentSource.height) {
        return 'contentChanged';
    }

    return source.documentRevision === safeCurrentSource.documentRevision
        ? 'current'
        : 'revisionOnly';
}


export function classifyKoreanFieldworkReportDraftFreshness(
        payload: KoreanFieldworkReportDraftPayload,
        currentTarget?: KoreanFieldworkCurrentReportTarget
): KoreanFieldworkAssistSidecarFreshness;
export function classifyKoreanFieldworkReportDraftFreshness(
        payload: unknown,
        currentTarget?: unknown
): KoreanFieldworkAssistSidecarFreshness|undefined;
export function classifyKoreanFieldworkReportDraftFreshness(
        payload: unknown,
        currentTarget?: unknown
): KoreanFieldworkAssistSidecarFreshness|undefined {

    const safePayload = toSafeJsonRecord(payload);
    const target = safePayload && isKoreanFieldworkContractRecord(safePayload.target)
        ? safePayload.target
        : undefined;
    if (!target || !isReportFreshnessTarget(target)) return undefined;

    if (!currentTarget) return 'missing';
    const safeCurrentTarget = toSafeJsonRecord(currentTarget);
    if (!safeCurrentTarget || !isReportFreshnessTarget(safeCurrentTarget)) return undefined;

    if (target.documentId !== safeCurrentTarget.documentId
            || target.inputSha256.toLowerCase()
                !== safeCurrentTarget.inputSha256.toLowerCase()) {
        return 'contentChanged';
    }

    return target.documentRevision === safeCurrentTarget.documentRevision
        ? 'current'
        : 'revisionOnly';
}


export function stringifyKoreanFieldworkCanonicalJson(value: unknown): string|undefined {

    try {
        const snapshot = snapshotKoreanFieldworkCanonicalJsonValue(value);
        if (snapshot === undefined) return undefined;

        const serialized = JSON.stringify(snapshot);
        return serialized.length <= KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_SERIALIZED_LENGTH
            ? serialized
            : undefined;
    } catch (_) {
        return undefined;
    }
}


function toSafeJsonRecord(value: unknown): { [key: string]: unknown }|undefined {

    const serialized = stringifyKoreanFieldworkCanonicalJson(value);
    if (serialized === undefined) return undefined;

    try {
        const clone = JSON.parse(serialized) as unknown;

        return isKoreanFieldworkContractRecord(clone) ? clone : undefined;
    } catch (_) {
        return undefined;
    }
}


function isSoilFreshnessSource(value: { [key: string]: unknown }): value is {
    documentId: string;
    documentRevision: string;
    height: number;
    mediaId?: string;
    sourceField: string;
    sourceSha256: string;
    width: number;
} {

    return typeof value.documentId === 'string' && value.documentId.trim() !== ''
        && typeof value.documentRevision === 'string' && value.documentRevision.trim() !== ''
        && typeof value.sourceField === 'string' && value.sourceField.trim() !== ''
        && isKoreanFieldworkSha256(value.sourceSha256)
        && Number.isFinite(value.width) && Number.isFinite(value.height)
        && (value.mediaId === undefined || typeof value.mediaId === 'string');
}


function isReportFreshnessTarget(value: { [key: string]: unknown }): value is {
    documentId: string;
    documentRevision: string;
    inputSha256: string;
} {

    return typeof value.documentId === 'string' && value.documentId.trim() !== ''
        && typeof value.documentRevision === 'string' && value.documentRevision.trim() !== ''
        && isKoreanFieldworkSha256(value.inputSha256);
}


export function normalizeKoreanFieldworkAssistSidecar(
        value: unknown
): KoreanFieldworkAssistSidecar|undefined {

    try {
        const serialized = stringifyKoreanFieldworkCanonicalJson(value);
        if (serialized === undefined) return undefined;

        const clone = JSON.parse(serialized) as KoreanFieldworkAssistSidecar;
        if (!validateKoreanFieldworkAssistSidecarUnchecked(clone).isValid) return undefined;

        clone.assistRuns.sort((left, right) => compareStrings(left.runId, right.runId));

        clone.soilProfileInterpretations.sort((left, right) => compareStrings(
            soilSourceKeyUnchecked(left.sourceImage),
            soilSourceKeyUnchecked(right.sourceImage)
        ));

        clone.reportDraftPayloads.sort((left, right) => compareStrings(
            reportPayloadKeyUnchecked(left),
            reportPayloadKeyUnchecked(right)
        ));

        return clone;
    } catch (_) {
        return undefined;
    }
}


export function serializeKoreanFieldworkAssistSidecar(value: unknown): string|undefined {

    const normalized = normalizeKoreanFieldworkAssistSidecar(value);

    return normalized
        ? stringifyKoreanFieldworkCanonicalJson(normalized)
        : undefined;
}


function validateRuns(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): IndexedValue<KoreanFieldworkAssistRun>[] {

    if (!Array.isArray(value)) {
        addIssue(issues, '$.assistRuns', 'required', 'Assist runs must be an array.');
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, '$.assistRuns', 'invalidValue', 'Assist runs must be a dense JSON array.');
        return [];
    }

    const runs: IndexedValue<KoreanFieldworkAssistRun>[] = [];
    const runIds = new Set<string>();

    value.forEach((candidate, index) => {
        const path = `$.assistRuns[${index}]`;
        const validation = validateKoreanFieldworkAssistRun(candidate);
        issues.push(...prefixIssues(validation.issues, path));

        if (!validation.isValid || !isKoreanFieldworkContractRecord(candidate)) return;

        const run = candidate as unknown as KoreanFieldworkAssistRun;
        if (runIds.has(run.runId)) {
            addIssue(issues, `${path}.runId`, 'duplicateId', 'Assist run IDs must be unique.');
        } else {
            runIds.add(run.runId);
            runs.push({ index, value: run });
        }
    });

    return runs;
}


function validateSoilPayloads(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): IndexedValue<KoreanFieldworkSoilProfileInterpretationPayload>[] {

    if (!Array.isArray(value)) {
        addIssue(
            issues,
            '$.soilProfileInterpretations',
            'required',
            'Soil-profile interpretations must be an array.'
        );
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(
            issues,
            '$.soilProfileInterpretations',
            'invalidValue',
            'Soil-profile interpretations must be a dense JSON array.'
        );
        return [];
    }

    const payloads: IndexedValue<KoreanFieldworkSoilProfileInterpretationPayload>[] = [];
    const keys = new Set<string>();

    value.forEach((candidate, index) => {
        const path = `$.soilProfileInterpretations[${index}]`;
        const validation = validateKoreanFieldworkSoilProfileInterpretation(candidate);
        issues.push(...prefixIssues(validation.issues, path));

        if (!validation.isValid || !isKoreanFieldworkContractRecord(candidate)) return;

        const payload = candidate as unknown as KoreanFieldworkSoilProfileInterpretationPayload;
        const key = soilSourceKeyUnchecked(payload.sourceImage);
        if (keys.has(key)) {
            addIssue(
                issues,
                `${path}.sourceImage`,
                'duplicateId',
                'A source revision and media slot may have only one interpretation payload.'
            );
        } else {
            keys.add(key);
            payloads.push({ index, value: payload });
        }
    });

    return payloads;
}


function validateReportPayloads(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): IndexedValue<KoreanFieldworkReportDraftPayload>[] {

    if (!Array.isArray(value)) {
        addIssue(
            issues,
            '$.reportDraftPayloads',
            'required',
            'Report draft payloads must be an array.'
        );
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(
            issues,
            '$.reportDraftPayloads',
            'invalidValue',
            'Report draft payloads must be a dense JSON array.'
        );
        return [];
    }

    const payloads: IndexedValue<KoreanFieldworkReportDraftPayload>[] = [];
    const keys = new Set<string>();

    value.forEach((candidate, index) => {
        const path = `$.reportDraftPayloads[${index}]`;
        const validation = validateKoreanFieldworkReportDraftPayload(candidate);
        issues.push(...prefixIssues(validation.issues, path));

        if (!validation.isValid || !isKoreanFieldworkContractRecord(candidate)) return;

        const payload = candidate as unknown as KoreanFieldworkReportDraftPayload;
        const key = reportPayloadKeyUnchecked(payload);
        if (keys.has(key)) {
            addIssue(
                issues,
                `${path}.assistRun.runId`,
                'duplicateId',
                'Each report generation run may have only one report payload.'
            );
        } else {
            keys.add(key);
            payloads.push({ index, value: payload });
        }
    });

    return payloads;
}


function validateCrossLinks(
        targetDocumentId: string,
        runs: IndexedValue<KoreanFieldworkAssistRun>[],
        soils: IndexedValue<KoreanFieldworkSoilProfileInterpretationPayload>[],
        reports: IndexedValue<KoreanFieldworkReportDraftPayload>[],
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const runById = new Map(runs.map(entry => [entry.value.runId, entry.value]));
    const resolvedOutputs = new Set<string>();
    const retrievalRunIds = new Set<string>();
    const outputOwnerById = new Map<string, string>();
    const citationById = new Map<string, string>();
    const acceptedReportByTarget = new Map<string, string>();
    const reportHashByTargetRevision = new Map<string, string>();

    runs.forEach(({ index: runIndex, value: run }) => {
        run.outputItemIds.forEach((outputId, outputIndex) => {
            const owner = outputOwnerById.get(outputId);
            if (owner && owner !== run.runId) {
                addIssue(
                    issues,
                    `$.assistRuns[${runIndex}].outputItemIds[${outputIndex}]`,
                    'duplicateId',
                    `Output ID ${outputId} is already owned by assist run ${owner}.`
                );
            } else {
                outputOwnerById.set(outputId, run.runId);
            }
        });
    });

    soils.forEach(({ index: payloadIndex, value: payload }) => {
        const path = `$.soilProfileInterpretations[${payloadIndex}]`;
        if (payload.sourceImage.documentId !== targetDocumentId) {
            addIssue(
                issues,
                `${path}.sourceImage.documentId`,
                'invalidReference',
                'Soil-profile source document must match the sidecar target.'
            );
        }

        const referencedRunIds = new Set<string>();
        [...payload.geometries, ...payload.relations].forEach(item => {
            if (item.provenance.origin === 'assist' && item.provenance.assistRunId) {
                referencedRunIds.add(item.provenance.assistRunId);
                resolvedOutputs.add(outputKey(item.provenance.assistRunId, item.id));
            }
        });
        const linkedRuns = Array.from(referencedRunIds)
            .map(runId => runById.get(runId))
            .filter((run): run is KoreanFieldworkAssistRun => run !== undefined);
        const linkValidation = validateKoreanFieldworkSoilProfileAssistLinks(payload, linkedRuns);
        issues.push(...prefixIssues(linkValidation.issues, path));
    });

    reports.forEach(({ index: payloadIndex, value: payload }) => {
        const path = `$.reportDraftPayloads[${payloadIndex}]`;
        if (payload.target.documentId !== targetDocumentId) {
            addIssue(
                issues,
                `${path}.target.documentId`,
                'invalidReference',
                'Report draft target document must match the sidecar target.'
            );
        }

        validateEmbeddedRun(payload.assistRun, runById, `${path}.assistRun`, issues);
        validateEmbeddedRun(payload.retrievalRun, runById, `${path}.retrievalRun`, issues);
        retrievalRunIds.add(payload.retrievalRun.runId);

        const targetRevisionKey = JSON.stringify([
            payload.target.documentId,
            payload.target.documentRevision
        ]);
        const targetHash = payload.target.inputSha256.toLowerCase();
        const existingTargetHash = reportHashByTargetRevision.get(targetRevisionKey);
        if (existingTargetHash && existingTargetHash !== targetHash) {
            addIssue(
                issues,
                `${path}.target.inputSha256`,
                'invalidState',
                'One document revision cannot name multiple report input snapshots.'
            );
        } else {
            reportHashByTargetRevision.set(targetRevisionKey, targetHash);
        }

        payload.assistRun.outputItemIds.forEach(outputId =>
            resolvedOutputs.add(outputKey(payload.assistRun.runId, outputId))
        );
        payload.retrievalRun.outputItemIds.forEach(outputId =>
            resolvedOutputs.add(outputKey(payload.retrievalRun.runId, outputId))
        );

        payload.citations.forEach((citation, citationIndex) => {
            const canonical = stringifyKoreanFieldworkCanonicalJson(citation) as string;
            const existing = citationById.get(citation.citationId);
            if (existing !== undefined && existing !== canonical) {
                addIssue(
                    issues,
                    `${path}.citations[${citationIndex}].citationId`,
                    'duplicateId',
                    'A reused citation ID must preserve the exact verified citation snapshot.'
                );
            } else {
                citationById.set(citation.citationId, canonical);
            }
        });

        if (payload.drafts.some(draft => draft.review.state === 'accepted')) {
            const targetKey = JSON.stringify([
                payload.target.documentId,
                payload.target.documentRevision
            ]);
            const existingRun = acceptedReportByTarget.get(targetKey);
            if (existingRun && existingRun !== payload.assistRun.runId) {
                addIssue(
                    issues,
                    `${path}.drafts`,
                    'invalidState',
                    'Only one generation run may have an accepted draft for the same pinned target.'
                );
            } else {
                acceptedReportByTarget.set(targetKey, payload.assistRun.runId);
            }
        }
    });

    runs.forEach(({ index: runIndex, value: run }) => {
        if (!retrievalRunIds.has(run.runId)
                && !run.inputs.some(input => input.documentId === targetDocumentId)) {
            addIssue(
                issues,
                `$.assistRuns[${runIndex}].inputs`,
                'invalidReference',
                'Assist run must pin the sidecar target or be an embedded report retrieval run.'
            );
        }

        if (run.status === 'completed') {
            run.outputItemIds.forEach((outputId, outputIndex) => {
                if (!resolvedOutputs.has(outputKey(run.runId, outputId))) {
                    addIssue(
                        issues,
                        `$.assistRuns[${runIndex}].outputItemIds[${outputIndex}]`,
                        'invalidReference',
                        'Completed assist output is not resolved by a persisted sidecar payload.'
                    );
                }
            });
        }
    });
}


function validateEmbeddedRun(
        embedded: KoreanFieldworkAssistRun,
        runById: Map<string, KoreanFieldworkAssistRun>,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const registered = runById.get(embedded.runId);
    if (!registered) {
        addIssue(
            issues,
            `${path}.runId`,
            'invalidReference',
            'Embedded report run must exist in the sidecar assist-run registry.'
        );
        return;
    }

    if (stringifyNormalizedRun(registered) !== stringifyNormalizedRun(embedded)) {
        addIssue(
            issues,
            path,
            'invalidReference',
            'Embedded report run must exactly match its registered run snapshot.'
        );
    }
}


function stringifyNormalizedRun(run: KoreanFieldworkAssistRun): string|undefined {

    return stringifyKoreanFieldworkCanonicalJson(run);
}


export function isKoreanFieldworkAssistSidecarJsonValue(
        value: unknown
): value is KoreanFieldworkAssistJsonValue {

    return snapshotKoreanFieldworkCanonicalJsonValue(value) !== undefined;
}


export function snapshotKoreanFieldworkCanonicalJsonValue(
        value: unknown
): KoreanFieldworkAssistJsonValue|undefined {

    type Container = KoreanFieldworkAssistJsonValue[]|{
        [key: string]: KoreanFieldworkAssistJsonValue;
    };

    interface Frame {
        depth: number;
        exiting: boolean;
        key?: number|string;
        parent?: Container;
        source: unknown;
    }

    const stack: Frame[] = [{ depth: 0, exiting: false, source: value }];
    const ancestors = new Set<unknown>();
    let discoveredNodeCount = 1;
    let totalStringLength = 0;
    let result: KoreanFieldworkAssistJsonValue|undefined;

    try {
        while (stack.length > 0) {
            const frame = stack.pop() as Frame;
            if (frame.exiting) {
                ancestors.delete(frame.source);
                continue;
            }
            if (frame.depth > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_DEPTH) {
                return undefined;
            }

            const current = frame.source;
            if (current === null || typeof current === 'boolean') {
                assignSnapshotValue(
                    frame.parent,
                    frame.key,
                    current as null|boolean,
                    value => { result = value; }
                );
                continue;
            }
            if (typeof current === 'string') {
                totalStringLength += current.length;
                if (current.length > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH
                        || totalStringLength
                            > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_TOTAL_STRING_LENGTH) {
                    return undefined;
                }
                assignSnapshotValue(frame.parent, frame.key, current, value => { result = value; });
                continue;
            }
            if (typeof current === 'number') {
                if (!Number.isFinite(current)) return undefined;
                assignSnapshotValue(frame.parent, frame.key, current, value => { result = value; });
                continue;
            }
            if (typeof current !== 'object' || ancestors.has(current)) return undefined;

            const isArray = Array.isArray(current);
            const prototype = Object.getPrototypeOf(current);
            if ((isArray && prototype !== Array.prototype)
                    || (!isArray && prototype !== Object.prototype && prototype !== null)) {
                return undefined;
            }
            const ownKeys = Reflect.ownKeys(current);
            if (ownKeys.some(key => typeof key === 'symbol')) return undefined;
            const stringKeys = ownKeys as string[];
            let keys: string[];
            let destination: Container;

            if (isArray) {
                const lengthDescriptor = Object.getOwnPropertyDescriptor(current, 'length');
                if (!lengthDescriptor
                        || !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value')
                        || lengthDescriptor.enumerable
                        || !Number.isSafeInteger(lengthDescriptor.value)
                        || lengthDescriptor.value < 0
                        || stringKeys.length !== lengthDescriptor.value + 1) {
                    return undefined;
                }
                const length = lengthDescriptor.value as number;
                if (discoveredNodeCount + length
                        > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_NODES) {
                    return undefined;
                }
                keys = Array.from(
                    { length },
                    (_, index) => String(index)
                );
                const ownKeySet = new Set(stringKeys);
                if (!ownKeySet.has('length') || keys.some(key => !ownKeySet.has(key))) {
                    return undefined;
                }
                destination = new Array(length);
            } else {
                keys = [...stringKeys].sort(compareStrings);
                destination = Object.create(null) as {
                    [key: string]: KoreanFieldworkAssistJsonValue;
                };
            }

            if (discoveredNodeCount + keys.length
                    > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_NODES) {
                return undefined;
            }
            discoveredNodeCount += keys.length;
            if (!isArray) {
                for (const key of keys) {
                    totalStringLength += key.length;
                    if (key.length > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH
                            || totalStringLength
                                > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_TOTAL_STRING_LENGTH) {
                        return undefined;
                    }
                }
            }

            const children: unknown[] = [];
            for (const key of keys) {
                const descriptor = Object.getOwnPropertyDescriptor(current, key);
                if (!descriptor || !descriptor.enumerable
                        || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
                    return undefined;
                }
                children.push(descriptor.value);
            }

            assignSnapshotValue(frame.parent, frame.key, destination, value => { result = value; });
            ancestors.add(current);
            stack.push({ depth: frame.depth, exiting: true, source: current });
            for (let index = children.length - 1; index >= 0; index--) {
                stack.push({
                    depth: frame.depth + 1,
                    exiting: false,
                    key: isArray ? index : keys[index],
                    parent: destination,
                    source: children[index]
                });
            }
        }
    } catch (_) {
        return undefined;
    }

    return result;
}


function assignSnapshotValue(
        parent: KoreanFieldworkAssistJsonValue[]
            |{ [key: string]: KoreanFieldworkAssistJsonValue }
            |undefined,
        key: number|string|undefined,
        value: KoreanFieldworkAssistJsonValue,
        setRoot: (value: KoreanFieldworkAssistJsonValue) => void
) {

    if (typeof key === 'string'
            && typeof value === 'string'
            && SHA256_VALUE_KEYS.has(key)
            && isKoreanFieldworkSha256(value)) {
        value = value.toLowerCase();
    }

    if (parent === undefined) {
        setRoot(value);
        return;
    }
    Object.defineProperty(parent, String(key), {
        configurable: true,
        enumerable: true,
        value,
        writable: true
    });
}


function outputKey(runId: string, outputId: string): string {

    return JSON.stringify([runId, outputId]);
}


function soilSourceKeyUnchecked(source: Pick<
    KoreanFieldworkSoilProfileSourceImage,
    'documentRevision'|'sourceField'|'mediaId'
>): string {

    return JSON.stringify([
        source.documentRevision,
        source.sourceField,
        source.mediaId || ''
    ]);
}


function reportPayloadKeyUnchecked(payload: KoreanFieldworkReportDraftPayload): string {

    return payload.assistRun.runId;
}


function compareStrings(left: string, right: string): number {

    return left < right ? -1 : left > right ? 1 : 0;
}


function validateRequiredString(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (typeof value !== 'string' || value.trim() === '') {
        addIssue(
            issues,
            path,
            value === undefined ? 'required' : 'invalidValue',
            `${path} must be a non-empty string.`
        );
    }
}


function parseContractInput(value: unknown): { ok: true; value: unknown }|{ ok: false } {

    if (typeof value !== 'string') return { ok: true, value };
    if (value.length > KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_SERIALIZED_LENGTH) {
        return { ok: false };
    }

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
        path: issue.path === '$'
            ? prefix
            : `${prefix}${issue.path.slice(1)}`
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

    return { path, code, message };
}
