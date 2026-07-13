// Shared, persistence-safe contracts for optional Korean fieldwork assist features.
// Platform I/O, model execution and secret storage intentionally stay outside core.

export const KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION = 1 as const;

export type KoreanFieldworkAssistRunKind =
    'soilProfileBoundarySuggestion'
    |'soilProfileContextSuggestion'
    |'soilColorPhotoEstimate'
    |'reportRetrieval'
    |'reportDraft'
    |'spatialProcessing';

export type KoreanFieldworkAssistRunStatus =
    'running'
    |'completed'
    |'failed'
    |'cancelled';

export type KoreanFieldworkAssistRuntime =
    'tablet'
    |'desktop'
    |'trustedServer'
    |'externalProvider'
    |'manual';

export type KoreanFieldworkProposalState =
    'proposed'
    |'accepted'
    |'rejected'
    |'superseded';

export type KoreanFieldworkProposalOrigin =
    'manual'
    |'assist'
    |'legacyImport'
    |'edited';

export type KoreanFieldworkContractValidationIssueCode =
    'duplicateId'
    |'forbiddenSecret'
    |'invalidReference'
    |'invalidState'
    |'invalidType'
    |'invalidValue'
    |'outOfRange'
    |'required'
    |'unsupportedVersion';

export interface KoreanFieldworkContractValidationIssue {
    code: KoreanFieldworkContractValidationIssueCode;
    message: string;
    path: string;
}

export interface KoreanFieldworkContractValidation {
    isValid: boolean;
    issues: KoreanFieldworkContractValidationIssue[];
}

export type KoreanFieldworkContractParseResult<T> =
    {
        ok: true;
        value: T;
    }
    |{
        issues: KoreanFieldworkContractValidationIssue[];
        ok: false;
        raw: unknown;
        reason: 'invalid'|'unsupportedVersion';
    };

export type KoreanFieldworkAssistJsonPrimitive = boolean|null|number|string;

export type KoreanFieldworkAssistJsonValue =
    KoreanFieldworkAssistJsonPrimitive
    |KoreanFieldworkAssistJsonValue[]
    |{ [key: string]: KoreanFieldworkAssistJsonValue };

export interface KoreanFieldworkAssistSourceReference {
    documentId: string;
    documentRevision: string;
    mediaId?: string;
    sourceSha256?: string;
}

export interface KoreanFieldworkAssistEngine {
    name: string;
    version: string;
    runtime: KoreanFieldworkAssistRuntime;
    modelId?: string;
    modelRevision?: string;
}

export interface KoreanFieldworkAssistFailure {
    code: string;
    message: string;
}

export interface KoreanFieldworkAssistRun {
    schemaVersion: typeof KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION;
    runId: string;
    kind: KoreanFieldworkAssistRunKind;
    status: KoreanFieldworkAssistRunStatus;
    startedAt: string;
    completedAt?: string;
    operatorId: string;
    inputs: KoreanFieldworkAssistSourceReference[];
    engine: KoreanFieldworkAssistEngine;
    parameters: { [key: string]: KoreanFieldworkAssistJsonValue };
    outputItemIds: string[];
    warnings?: string[];
    failure?: KoreanFieldworkAssistFailure;
}

export interface KoreanFieldworkProposalProvenance {
    origin: KoreanFieldworkProposalOrigin;
    assistRunId?: string;
    derivedFromItemId?: string;
    sourceField?: string;
}

export interface KoreanFieldworkProposalReview {
    state: KoreanFieldworkProposalState;
    decidedAt?: string;
    decidedBy?: string;
    note?: string;
}

const ASSIST_RUN_KINDS: readonly KoreanFieldworkAssistRunKind[] = [
    'soilProfileBoundarySuggestion',
    'soilProfileContextSuggestion',
    'soilColorPhotoEstimate',
    'reportRetrieval',
    'reportDraft',
    'spatialProcessing'
];

const ASSIST_RUN_STATUSES: readonly KoreanFieldworkAssistRunStatus[] = [
    'running',
    'completed',
    'failed',
    'cancelled'
];

const ASSIST_RUNTIMES: readonly KoreanFieldworkAssistRuntime[] = [
    'tablet',
    'desktop',
    'trustedServer',
    'externalProvider',
    'manual'
];

const PROPOSAL_STATES: readonly KoreanFieldworkProposalState[] = [
    'proposed',
    'accepted',
    'rejected',
    'superseded'
];

const PROPOSAL_ORIGINS: readonly KoreanFieldworkProposalOrigin[] = [
    'manual',
    'assist',
    'legacyImport',
    'edited'
];

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FORBIDDEN_PARAMETER_KEYS = new Set([
    'apikey',
    'authorization',
    'bearer',
    'bearertoken',
    'clientsecret',
    'credential',
    'credentials',
    'passphrase',
    'password',
    'privatekey',
    'refreshtoken',
    'secret',
    'token',
    'accesstoken'
]);

const FORBIDDEN_PARAMETER_KEY_FRAGMENTS = [
    'apikey',
    'authorization',
    'authtoken',
    'bearer',
    'clientsecret',
    'credential',
    'password',
    'passphrase',
    'privatekey',
    'refreshtoken',
    'accesstoken',
    'secret'
];


export function validateKoreanFieldworkAssistRun(value: unknown): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$', 'invalidType', 'Assist run must be an object.');
        return makeValidation(issues);
    }

    validateSchemaVersion(value.schemaVersion, issues);
    validateRequiredString(value.runId, '$.runId', issues);

    if (!ASSIST_RUN_KINDS.includes(value.kind as KoreanFieldworkAssistRunKind)) {
        addIssue(issues, '$.kind', 'invalidValue', 'Assist run kind is not supported.');
    }
    if (!ASSIST_RUN_STATUSES.includes(value.status as KoreanFieldworkAssistRunStatus)) {
        addIssue(issues, '$.status', 'invalidValue', 'Assist run status is not supported.');
    }

    validateTimestamp(value.startedAt, '$.startedAt', issues, true);
    validateRequiredString(value.operatorId, '$.operatorId', issues);
    validateInputs(value.inputs, issues);
    validateEngine(value.engine, issues);
    validateParameters(value.parameters, issues);
    validateStringArray(value.outputItemIds, '$.outputItemIds', issues, true);
    validateStringArray(value.warnings, '$.warnings', issues, false);
    validateRunCompletion(value, issues);

    return makeValidation(issues);
}


export function parseKoreanFieldworkAssistRun(
        value: unknown
): KoreanFieldworkContractParseResult<KoreanFieldworkAssistRun> {

    const parsed = parseContractInput(value);

    if (!parsed.ok) {
        return {
            issues: [makeIssue('$', 'invalidValue', 'Assist run is not valid JSON.')],
            ok: false,
            raw: value,
            reason: 'invalid'
        };
    }

    if (isKoreanFieldworkContractRecord(parsed.value)
            && parsed.value.schemaVersion !== undefined
            && parsed.value.schemaVersion !== KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION) {
        return {
            issues: [makeIssue(
                '$.schemaVersion',
                'unsupportedVersion',
                'Assist run schema version is not supported.'
            )],
            ok: false,
            raw: parsed.value,
            reason: 'unsupportedVersion'
        };
    }

    const validation = validateKoreanFieldworkAssistRun(parsed.value);

    return validation.isValid
        ? { ok: true, value: parsed.value as unknown as KoreanFieldworkAssistRun }
        : {
            issues: validation.issues,
            ok: false,
            raw: parsed.value,
            reason: 'invalid'
        };
}


export function validateKoreanFieldworkProposalProvenance(
        value: unknown,
        path: string = '$.provenance'
): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, path, 'invalidType', 'Proposal provenance must be an object.');
        return makeValidation(issues);
    }

    if (!PROPOSAL_ORIGINS.includes(value.origin as KoreanFieldworkProposalOrigin)) {
        addIssue(issues, `${path}.origin`, 'invalidValue', 'Proposal origin is not supported.');
    }
    validateOptionalString(value.assistRunId, `${path}.assistRunId`, issues);
    validateOptionalString(value.derivedFromItemId, `${path}.derivedFromItemId`, issues);
    validateOptionalString(value.sourceField, `${path}.sourceField`, issues);

    if (value.origin === 'assist' && !isNonEmptyString(value.assistRunId)) {
        addIssue(
            issues,
            `${path}.assistRunId`,
            'required',
            'Assist-origin proposals must reference their assist run.'
        );
    }
    if (value.origin === 'edited' && !isNonEmptyString(value.derivedFromItemId)) {
        addIssue(
            issues,
            `${path}.derivedFromItemId`,
            'required',
            'Edited proposals must reference the item they replace.'
        );
    }
    if (value.origin === 'legacyImport' && !isNonEmptyString(value.sourceField)) {
        addIssue(
            issues,
            `${path}.sourceField`,
            'required',
            'Legacy imports must preserve the source field instead of guessing its meaning.'
        );
    }
    if (value.origin !== 'assist' && value.assistRunId !== undefined) {
        addIssue(
            issues,
            `${path}.assistRunId`,
            'invalidState',
            'Only assist-origin proposals may reference an assist run.'
        );
    }
    if (value.origin !== 'edited' && value.derivedFromItemId !== undefined) {
        addIssue(
            issues,
            `${path}.derivedFromItemId`,
            'invalidState',
            'Only edited proposals may reference a predecessor item.'
        );
    }
    if (value.origin !== 'legacyImport' && value.sourceField !== undefined) {
        addIssue(
            issues,
            `${path}.sourceField`,
            'invalidState',
            'Only legacy imports may preserve a legacy source field.'
        );
    }

    return makeValidation(issues);
}


export function validateKoreanFieldworkProposalReview(
        value: unknown,
        path: string = '$.review'
): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, path, 'invalidType', 'Proposal review must be an object.');
        return makeValidation(issues);
    }

    if (!PROPOSAL_STATES.includes(value.state as KoreanFieldworkProposalState)) {
        addIssue(issues, `${path}.state`, 'invalidValue', 'Proposal review state is not supported.');
    }

    validateTimestamp(value.decidedAt, `${path}.decidedAt`, issues, false);
    validateOptionalString(value.decidedBy, `${path}.decidedBy`, issues);
    validateOptionalString(value.note, `${path}.note`, issues);

    if (value.state !== 'proposed') {
        if (!isNonEmptyString(value.decidedBy)) {
            addIssue(
                issues,
                `${path}.decidedBy`,
                'required',
                'Reviewed proposals must record the reviewer.'
            );
        }
        if (!isKoreanFieldworkIsoTimestamp(value.decidedAt)) {
            addIssue(
                issues,
                `${path}.decidedAt`,
                'required',
                'Reviewed proposals must record an ISO decision timestamp.'
            );
        }
    } else if (value.decidedAt !== undefined || value.decidedBy !== undefined) {
        addIssue(
            issues,
            path,
            'invalidState',
            'Proposed items cannot already contain a review decision.'
        );
    }

    return makeValidation(issues);
}


export function isKoreanFieldworkContractRecord(
        value: unknown
): value is { [key: string]: unknown } {

    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
}


export function isKoreanFieldworkIsoTimestamp(value: unknown): value is string {

    if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) return false;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;

    const canonicalInput = value.indexOf('.') === -1
        ? value.replace(/Z$/, '.000Z')
        : value;

    return parsed.toISOString() === canonicalInput;
}


export function isKoreanFieldworkSha256(value: unknown): value is string {

    return typeof value === 'string' && SHA256_PATTERN.test(value);
}


export function isKoreanFieldworkJsonValue(value: unknown): value is KoreanFieldworkAssistJsonValue {

    return isJsonValue(value, new Set<unknown>());
}


export function isKoreanFieldworkDenseArray<T = unknown>(value: unknown): value is T[] {

    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
    if (Object.getOwnPropertySymbols(value).length > 0) return false;

    const ownNames = Object.getOwnPropertyNames(value);
    if (ownNames.length !== value.length + 1 || !ownNames.includes('length')) return false;

    for (let index = 0; index < value.length; index++) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !descriptor.enumerable
                || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return false;
    }

    return true;
}


function isJsonValue(value: unknown, ancestors: Set<unknown>): value is KoreanFieldworkAssistJsonValue {

    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return isJsonArray(value, ancestors);
    if (!isKoreanFieldworkContractRecord(value) || ancestors.has(value)) return false;
    if (Object.getOwnPropertySymbols(value).length > 0) return false;

    ancestors.add(value);

    const valid = Object.getOwnPropertyNames(value).every(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);

        return descriptor !== undefined
            && descriptor.enumerable
            && Object.prototype.hasOwnProperty.call(descriptor, 'value')
            && isJsonValue(descriptor.value, ancestors);
    });

    ancestors.delete(value);
    return valid;
}


function isJsonArray(value: unknown[], ancestors: Set<unknown>): boolean {

    if (!isKoreanFieldworkDenseArray(value) || ancestors.has(value)) return false;

    ancestors.add(value);
    const valid = value.every(entry => isJsonValue(entry, ancestors));
    ancestors.delete(value);

    return valid;
}


function validateSchemaVersion(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (value !== KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION) {
        addIssue(
            issues,
            '$.schemaVersion',
            value === undefined ? 'required' : 'unsupportedVersion',
            'Assist run schemaVersion must be 1.'
        );
    }
}


function validateInputs(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!Array.isArray(value)) {
        addIssue(issues, '$.inputs', 'required', 'Assist runs require at least one pinned input.');
        return;
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, '$.inputs', 'invalidValue', 'Assist inputs must be a dense JSON array.');
        return;
    }
    if (value.length === 0) {
        addIssue(issues, '$.inputs', 'required', 'Assist runs require at least one pinned input.');
        return;
    }

    const inputKeys = new Set<string>();

    value.forEach((input, index) => {
        const path = `$.inputs[${index}]`;

        if (!isKoreanFieldworkContractRecord(input)) {
            addIssue(issues, path, 'invalidType', 'Assist input must be an object.');
            return;
        }

        validateRequiredString(input.documentId, `${path}.documentId`, issues);
        validateRequiredString(input.documentRevision, `${path}.documentRevision`, issues);
        validateOptionalString(input.mediaId, `${path}.mediaId`, issues);

        if (input.sourceSha256 !== undefined && !isKoreanFieldworkSha256(input.sourceSha256)) {
            addIssue(
                issues,
                `${path}.sourceSha256`,
                'invalidValue',
                'sourceSha256 must be a 64-character hexadecimal SHA-256.'
            );
        }
        if (isNonEmptyString(input.mediaId) && !isKoreanFieldworkSha256(input.sourceSha256)) {
            addIssue(
                issues,
                `${path}.sourceSha256`,
                'required',
                'Media inputs must pin the original file with sourceSha256.'
            );
        }

        if (isNonEmptyString(input.documentId)) {
            const key = `${input.documentId}\u0000${isNonEmptyString(input.mediaId) ? input.mediaId : ''}`;

            if (inputKeys.has(key)) {
                addIssue(issues, path, 'duplicateId', 'Assist input references must be unique.');
            }
            inputKeys.add(key);
        }
    });
}


function validateEngine(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$.engine', 'invalidType', 'Assist engine must be an object.');
        return;
    }

    validateRequiredString(value.name, '$.engine.name', issues);
    validateRequiredString(value.version, '$.engine.version', issues);
    validateOptionalString(value.modelId, '$.engine.modelId', issues);
    validateOptionalString(value.modelRevision, '$.engine.modelRevision', issues);

    if (!ASSIST_RUNTIMES.includes(value.runtime as KoreanFieldworkAssistRuntime)) {
        addIssue(issues, '$.engine.runtime', 'invalidValue', 'Assist runtime is not supported.');
    }
    if (isNonEmptyString(value.modelId) && !isNonEmptyString(value.modelRevision)) {
        addIssue(
            issues,
            '$.engine.modelRevision',
            'required',
            'Model-based runs must pin a model revision.'
        );
    }
}


function validateParameters(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$.parameters', 'invalidType', 'Assist parameters must be a JSON object.');
        return;
    }

    const isJsonValue = isKoreanFieldworkJsonValue(value);

    if (!isJsonValue) {
        addIssue(
            issues,
            '$.parameters',
            'invalidValue',
            'Assist parameters must contain only finite JSON values.'
        );
    }

    const secretPath = isJsonValue
        ? findForbiddenSecretPath(value, '$.parameters')
        : undefined;
    if (secretPath) {
        addIssue(
            issues,
            secretPath,
            'forbiddenSecret',
            'Assist parameters must not persist API keys, tokens, passwords or secrets.'
        );
    }
}


function validateRunCompletion(
        value: { [key: string]: unknown },
        issues: KoreanFieldworkContractValidationIssue[]
) {

    validateTimestamp(value.completedAt, '$.completedAt', issues, false);

    if (value.status === 'running') {
        if (value.completedAt !== undefined) {
            addIssue(
                issues,
                '$.completedAt',
                'invalidState',
                'Running assist runs cannot have completedAt.'
            );
        }
        if (value.failure !== undefined) {
            addIssue(issues, '$.failure', 'invalidState', 'Running assist runs cannot have a failure.');
        }
    } else if (ASSIST_RUN_STATUSES.includes(value.status as KoreanFieldworkAssistRunStatus)) {
        if (!isKoreanFieldworkIsoTimestamp(value.completedAt)) {
            addIssue(
                issues,
                '$.completedAt',
                'required',
                'Finished assist runs must record completedAt.'
            );
        }
    }

    if (value.status === 'failed') {
        if (!isKoreanFieldworkContractRecord(value.failure)) {
            addIssue(issues, '$.failure', 'required', 'Failed assist runs require a safe failure summary.');
        } else {
            validateRequiredString(value.failure.code, '$.failure.code', issues);
            validateRequiredString(value.failure.message, '$.failure.message', issues);
        }
    } else if (value.failure !== undefined) {
        addIssue(issues, '$.failure', 'invalidState', 'Only failed assist runs may contain failure.');
    }

    if (value.status !== 'completed' && Array.isArray(value.outputItemIds)
            && value.outputItemIds.length > 0) {
        addIssue(
            issues,
            '$.outputItemIds',
            'invalidState',
            'Only completed assist runs may publish persisted output item IDs.'
        );
    }

    if (isKoreanFieldworkIsoTimestamp(value.startedAt)
            && isKoreanFieldworkIsoTimestamp(value.completedAt)
            && Date.parse(value.completedAt) < Date.parse(value.startedAt)) {
        addIssue(
            issues,
            '$.completedAt',
            'invalidState',
            'completedAt cannot be earlier than startedAt.'
        );
    }
}


function validateStringArray(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[],
        required: boolean
) {

    if (value === undefined && !required) return;

    if (!Array.isArray(value)) {
        addIssue(issues, path, required ? 'required' : 'invalidType', `${path} must be an array.`);
        return;
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, path, 'invalidValue', `${path} must be a dense JSON array.`);
        return;
    }

    const seen = new Set<string>();

    value.forEach((entry, index) => {
        if (!isNonEmptyString(entry)) {
            addIssue(issues, `${path}[${index}]`, 'invalidValue', 'Array values must be non-empty strings.');
        } else if (seen.has(entry)) {
            addIssue(issues, `${path}[${index}]`, 'duplicateId', 'Array values must be unique.');
        } else {
            seen.add(entry);
        }
    });
}


function validateTimestamp(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[],
        required: boolean
) {

    if (value === undefined && !required) return;
    if (!isKoreanFieldworkIsoTimestamp(value)) {
        addIssue(
            issues,
            path,
            value === undefined ? 'required' : 'invalidValue',
            `${path} must be a UTC ISO timestamp.`
        );
    }
}


function validateRequiredString(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isNonEmptyString(value)) {
        addIssue(issues, path, 'required', `${path} must be a non-empty string.`);
    }
}


function validateOptionalString(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (value !== undefined && !isNonEmptyString(value)) {
        addIssue(issues, path, 'invalidValue', `${path} must be a non-empty string when provided.`);
    }
}


function isNonEmptyString(value: unknown): value is string {

    return typeof value === 'string' && value.trim().length > 0;
}


function findForbiddenSecretPath(
        value: unknown,
        path: string,
        ancestors: Set<unknown> = new Set<unknown>()
): string|undefined {

    if (Array.isArray(value)) {
        if (ancestors.has(value)) return undefined;
        ancestors.add(value);
        for (let index = 0; index < value.length; index++) {
            const found = findForbiddenSecretPath(value[index], `${path}[${index}]`, ancestors);
            if (found) {
                ancestors.delete(value);
                return found;
            }
        }
        ancestors.delete(value);
        return undefined;
    }
    if (!isKoreanFieldworkContractRecord(value)) return undefined;
    if (ancestors.has(value)) return undefined;

    ancestors.add(value);

    for (const [key, entry] of Object.entries(value)) {
        if (isForbiddenParameterKey(key)) {
            ancestors.delete(value);
            return `${path}.${key}`;
        }

        const found = findForbiddenSecretPath(entry, `${path}.${key}`, ancestors);
        if (found) {
            ancestors.delete(value);
            return found;
        }
    }

    ancestors.delete(value);
    return undefined;
}


function normalizeParameterKey(key: string): string {

    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}


function isForbiddenParameterKey(key: string): boolean {

    const normalized = normalizeParameterKey(key);
    const segments = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(segment => segment.length > 0);
    const benignTokenQualifiers = new Set([
        'budget', 'count', 'length', 'limit', 'max', 'maximum', 'min', 'minimum', 'usage', 'window'
    ]);
    const hasCredentialToken = segments.includes('token')
        && !segments.some(segment => benignTokenQualifiers.has(segment));

    return FORBIDDEN_PARAMETER_KEYS.has(normalized)
        || FORBIDDEN_PARAMETER_KEY_FRAGMENTS.some(fragment => normalized.includes(fragment))
        || segments.includes('secret')
        || hasCredentialToken
        || normalized.endsWith('secret')
        || normalized.endsWith('token');
}


function parseContractInput(value: unknown): { ok: true; value: unknown }|{ ok: false } {

    if (typeof value !== 'string') return { ok: true, value };

    try {
        return { ok: true, value: JSON.parse(value) };
    } catch (_) {
        return { ok: false };
    }
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
