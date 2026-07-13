import {
    isKoreanFieldworkContractRecord,
    isKoreanFieldworkDenseArray,
    isKoreanFieldworkSha256,
    KoreanFieldworkAssistRun,
    KoreanFieldworkContractParseResult,
    KoreanFieldworkContractValidation,
    KoreanFieldworkContractValidationIssue,
    KoreanFieldworkContractValidationIssueCode,
    KoreanFieldworkProposalReview,
    validateKoreanFieldworkAssistRun,
    validateKoreanFieldworkProposalProvenance,
    validateKoreanFieldworkProposalReview
} from './korean-fieldwork-assist-run';


export const KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION = 1 as const;

export type KoreanFieldworkReportDraftStyle =
    'formal'
    |'variant'
    |'custom';

export type KoreanFieldworkReportClaimBasis =
    'record'
    |'citation';

export type KoreanFieldworkCitationVerification =
    'verified'
    |'candidate'
    |'pendingDecision'
    |'conflicting'
    |'unverified';

export type KoreanFieldworkCitationAccessLevel =
    'public'
    |'project'
    |'restricted';

export interface KoreanFieldworkReportDraftTarget {
    documentId: string;
    documentRevision: string;
    inputSha256: string;
}

export type KoreanFieldworkReportCitationLocator =
    {
        page: string;
        chunkId?: string;
        label?: string;
    }
    |{
        page?: string;
        chunkId: string;
        label?: string;
    };

export interface KoreanFieldworkReportCitation {
    citationId: string;
    sourceDocumentId: string;
    sourceDocumentRevision: string;
    sourceLabel: string;
    sourceEvidenceIndexId?: string;
    locator: KoreanFieldworkReportCitationLocator;
    retrievalScore?: number;
    verification: 'verified';
    accessLevel: KoreanFieldworkCitationAccessLevel;
    excerptSha256: string;
}

export interface KoreanFieldworkReportDraftClaim {
    claimId: string;
    start: number;
    end: number;
    basis: KoreanFieldworkReportClaimBasis;
    documentIds?: string[];
    citationIds?: string[];
}

export type KoreanFieldworkReportDraftProvenance =
    {
        origin: 'assist';
        assistRunId: string;
        derivedFromItemId?: never;
        sourceField?: never;
    }
    |{
        origin: 'edited';
        assistRunId?: never;
        derivedFromItemId: string;
        sourceField?: never;
    };

export interface KoreanFieldworkReportDraft {
    draftId: string;
    style: KoreanFieldworkReportDraftStyle;
    text: string;
    claims: KoreanFieldworkReportDraftClaim[];
    warnings?: string[];
    provenance: KoreanFieldworkReportDraftProvenance;
    review: KoreanFieldworkProposalReview;
}

export interface KoreanFieldworkReportDraftPayload {
    schemaVersion: typeof KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION;
    target: KoreanFieldworkReportDraftTarget;
    assistRun: KoreanFieldworkAssistRun;
    retrievalRun: KoreanFieldworkAssistRun;
    promptVersion: string;
    indexVersion: string;
    citations: KoreanFieldworkReportCitation[];
    drafts: KoreanFieldworkReportDraft[];
}

const DRAFT_STYLES: readonly KoreanFieldworkReportDraftStyle[] = [
    'formal',
    'variant',
    'custom'
];

const CLAIM_BASES: readonly KoreanFieldworkReportClaimBasis[] = [
    'record',
    'citation'
];

const CITATION_VERIFICATION_STATES: readonly KoreanFieldworkCitationVerification[] = [
    'verified',
    'candidate',
    'pendingDecision',
    'conflicting',
    'unverified'
];

const CITATION_ACCESS_LEVELS: readonly KoreanFieldworkCitationAccessLevel[] = [
    'public',
    'project',
    'restricted'
];


export function validateKoreanFieldworkReportDraftPayload(
        value: unknown
): KoreanFieldworkContractValidation {

    const issues: KoreanFieldworkContractValidationIssue[] = [];

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$', 'invalidType', 'Report draft payload must be an object.');
        return makeValidation(issues);
    }

    if (value.schemaVersion !== KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION) {
        addIssue(
            issues,
            '$.schemaVersion',
            value.schemaVersion === undefined ? 'required' : 'unsupportedVersion',
            'Report draft schemaVersion must be 1.'
        );
    }

    validateTarget(value.target, issues);
    validateRequiredString(value.promptVersion, '$.promptVersion', issues);
    validateRequiredString(value.indexVersion, '$.indexVersion', issues);

    const assistRun = validateReportAssistRun(value.assistRun, issues);
    const retrievalRun = validateReportRetrievalRun(value.retrievalRun, issues);
    const citations = validateCitations(value.citations, issues);
    const drafts = validateDrafts(value.drafts, citations, assistRun, issues);

    validateTargetInput(value.target, assistRun, issues);
    validateCitationInputs(citations, assistRun, retrievalRun, issues);
    validateRetrievalRunOutputs(citations, retrievalRun, issues);
    validateRunOutputs(drafts, assistRun, issues);
    validateDraftLineage(drafts, issues);
    validateVersionPins(value, assistRun, retrievalRun, issues);

    const acceptedDrafts = drafts.filter(draft =>
        isKoreanFieldworkContractRecord(draft.review) && draft.review.state === 'accepted'
    );
    if (acceptedDrafts.length > 1) {
        addIssue(
            issues,
            '$.drafts',
            'invalidState',
            'Only one report draft candidate may be accepted at a time.'
        );
    }

    if (assistRun && retrievalRun && retrievalRun.runId === assistRun.runId) {
        addIssue(
            issues,
            '$.retrievalRun.runId',
            'invalidReference',
            'Retrieval and draft generation runs must have different IDs.'
        );
    }

    return makeValidation(issues);
}


export function parseKoreanFieldworkReportDraftPayload(
        value: unknown
): KoreanFieldworkContractParseResult<KoreanFieldworkReportDraftPayload> {

    const parsed = parseContractInput(value);

    if (!parsed.ok) {
        return {
            issues: [makeIssue('$', 'invalidValue', 'Report draft payload is not valid JSON.')],
            ok: false,
            raw: value,
            reason: 'invalid'
        };
    }

    if (isKoreanFieldworkContractRecord(parsed.value)
            && parsed.value.schemaVersion !== undefined
            && parsed.value.schemaVersion !== KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION) {
        return {
            issues: [makeIssue(
                '$.schemaVersion',
                'unsupportedVersion',
                'Report draft schema version is not supported.'
            )],
            ok: false,
            raw: parsed.value,
            reason: 'unsupportedVersion'
        };
    }

    const validation = validateKoreanFieldworkReportDraftPayload(parsed.value);

    return validation.isValid
        ? {
            ok: true,
            value: parsed.value as unknown as KoreanFieldworkReportDraftPayload
        }
        : {
            issues: validation.issues,
            ok: false,
            raw: parsed.value,
            reason: 'invalid'
        };
}


function validateTarget(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, '$.target', 'invalidType', 'Report draft target must be an object.');
        return;
    }

    validateRequiredString(value.documentId, '$.target.documentId', issues);
    validateRequiredString(value.documentRevision, '$.target.documentRevision', issues);

    if (!isKoreanFieldworkSha256(value.inputSha256)) {
        addIssue(
            issues,
            '$.target.inputSha256',
            value.inputSha256 === undefined ? 'required' : 'invalidValue',
            'Report draft targets require a 64-character hexadecimal input SHA-256.'
        );
    }
}


function validateReportAssistRun(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkAssistRun|undefined {

    const validation = validateKoreanFieldworkAssistRun(value);
    issues.push(...prefixIssues(validation.issues, '$.assistRun'));

    if (!isKoreanFieldworkContractRecord(value)) return undefined;

    if (value.kind !== 'reportDraft') {
        addIssue(
            issues,
            '$.assistRun.kind',
            'invalidValue',
            'Report draft payload requires a reportDraft assist run.'
        );
    }
    if (value.status !== 'completed') {
        addIssue(
            issues,
            '$.assistRun.status',
            'invalidState',
            'Persisted report draft candidates require a completed assist run.'
        );
    }

    return validation.isValid && value.kind === 'reportDraft' && value.status === 'completed'
        ? value as unknown as KoreanFieldworkAssistRun
        : undefined;
}


function validateReportRetrievalRun(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkAssistRun|undefined {

    const validation = validateKoreanFieldworkAssistRun(value);
    issues.push(...prefixIssues(validation.issues, '$.retrievalRun'));

    if (!isKoreanFieldworkContractRecord(value)) return undefined;

    if (value.kind !== 'reportRetrieval') {
        addIssue(
            issues,
            '$.retrievalRun.kind',
            'invalidValue',
            'Report draft payload requires a reportRetrieval assist run.'
        );
    }
    if (value.status !== 'completed') {
        addIssue(
            issues,
            '$.retrievalRun.status',
            'invalidState',
            'Report citations require a completed retrieval run.'
        );
    }

    return validation.isValid && value.kind === 'reportRetrieval' && value.status === 'completed'
        ? value as unknown as KoreanFieldworkAssistRun
        : undefined;
}


function validateCitations(
        value: unknown,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkReportCitation[] {

    if (!Array.isArray(value) || value.length === 0) {
        addIssue(
            issues,
            '$.citations',
            'required',
            'Citation-first report drafts require at least one retrieved source.'
        );
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, '$.citations', 'invalidValue', 'Citations must be a dense JSON array.');
        return [];
    }

    const citations = value.filter(isKoreanFieldworkContractRecord) as unknown as KoreanFieldworkReportCitation[];
    const citationIds = new Set<string>();

    value.forEach((citation, index) => {
        const path = `$.citations[${index}]`;

        if (!isKoreanFieldworkContractRecord(citation)) {
            addIssue(issues, path, 'invalidType', 'Report citation must be an object.');
            return;
        }

        validateRequiredString(citation.citationId, `${path}.citationId`, issues);
        validateRequiredString(citation.sourceDocumentId, `${path}.sourceDocumentId`, issues);
        validateRequiredString(
            citation.sourceDocumentRevision,
            `${path}.sourceDocumentRevision`,
            issues
        );
        validateRequiredString(citation.sourceLabel, `${path}.sourceLabel`, issues);
        validateOptionalString(
            citation.sourceEvidenceIndexId,
            `${path}.sourceEvidenceIndexId`,
            issues
        );

        if (typeof citation.citationId === 'string') {
            if (citationIds.has(citation.citationId)) {
                addIssue(issues, `${path}.citationId`, 'duplicateId', 'Citation IDs must be unique.');
            }
            citationIds.add(citation.citationId);
        }

        validateCitationLocator(citation.locator, `${path}.locator`, issues);

        if (citation.retrievalScore !== undefined
                && (!Number.isFinite(citation.retrievalScore)
                    || (citation.retrievalScore as number) < 0
                    || (citation.retrievalScore as number) > 1)) {
            addIssue(
                issues,
                `${path}.retrievalScore`,
                'outOfRange',
                'Retrieval score must be between 0 and 1.'
            );
        }
        if (!CITATION_VERIFICATION_STATES.includes(
            citation.verification as KoreanFieldworkCitationVerification
        )) {
            addIssue(
                issues,
                `${path}.verification`,
                'invalidValue',
                'Citation verification state is required.'
            );
        } else if (citation.verification !== 'verified') {
            addIssue(
                issues,
                `${path}.verification`,
                'invalidState',
                'Generated report drafts may cite only verified source evidence.'
            );
        }
        if (!CITATION_ACCESS_LEVELS.includes(
            citation.accessLevel as KoreanFieldworkCitationAccessLevel
        )) {
            addIssue(
                issues,
                `${path}.accessLevel`,
                'invalidValue',
                'Citation access level is required.'
            );
        }
        if (!isKoreanFieldworkSha256(citation.excerptSha256)) {
            addIssue(
                issues,
                `${path}.excerptSha256`,
                citation.excerptSha256 === undefined ? 'required' : 'invalidValue',
                'Verified citations must pin their excerpt with a 64-character hexadecimal SHA-256.'
            );
        }
    });

    return citations;
}


function validateCitationLocator(
        value: unknown,
        path: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!isKoreanFieldworkContractRecord(value)) {
        addIssue(issues, path, 'required', 'Citation locator must be an object.');
        return;
    }

    validateOptionalString(value.page, `${path}.page`, issues);
    validateOptionalString(value.chunkId, `${path}.chunkId`, issues);
    validateOptionalString(value.label, `${path}.label`, issues);

    if (![value.page, value.chunkId].some(
        entry => typeof entry === 'string' && entry.trim().length > 0
    )) {
        addIssue(
            issues,
            path,
            'required',
            'Citation locator requires a stable page or chunk ID; a label alone is not sufficient.'
        );
    }
}


function validateDrafts(
        value: unknown,
        citations: KoreanFieldworkReportCitation[],
        assistRun: KoreanFieldworkAssistRun|undefined,
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkReportDraft[] {

    if (!Array.isArray(value) || value.length === 0) {
        addIssue(issues, '$.drafts', 'required', 'Report draft payload requires at least one candidate.');
        return [];
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, '$.drafts', 'invalidValue', 'Drafts must be a dense JSON array.');
        return [];
    }

    const drafts = value.filter(isKoreanFieldworkContractRecord) as unknown as KoreanFieldworkReportDraft[];
    const draftIds = new Set<string>();
    const citationIds = new Set(citations.map(citation => citation.citationId));
    const citationDocumentIds = new Set(citations.map(citation => citation.sourceDocumentId));
    const recordDocumentIds = new Set((assistRun?.inputs ?? [])
        .map(input => input.documentId)
        .filter(documentId => !citationDocumentIds.has(documentId)));

    value.forEach((draft, index) => {
        const path = `$.drafts[${index}]`;

        if (!isKoreanFieldworkContractRecord(draft)) {
            addIssue(issues, path, 'invalidType', 'Report draft candidate must be an object.');
            return;
        }

        validateRequiredString(draft.draftId, `${path}.draftId`, issues);
        validateRequiredString(draft.text, `${path}.text`, issues);
        validateStringArray(draft.warnings, `${path}.warnings`, issues, false);

        if (typeof draft.draftId === 'string') {
            if (draftIds.has(draft.draftId)) {
                addIssue(issues, `${path}.draftId`, 'duplicateId', 'Draft IDs must be unique.');
            }
            draftIds.add(draft.draftId);
        }
        if (!DRAFT_STYLES.includes(draft.style as KoreanFieldworkReportDraftStyle)) {
            addIssue(issues, `${path}.style`, 'invalidValue', 'Report draft style is not supported.');
        }

        const provenanceValidation = validateKoreanFieldworkProposalProvenance(
            draft.provenance,
            `${path}.provenance`
        );
        const reviewValidation = validateKoreanFieldworkProposalReview(
            draft.review,
            `${path}.review`
        );
        issues.push(...provenanceValidation.issues, ...reviewValidation.issues);

        if (isKoreanFieldworkContractRecord(draft.provenance)) {
            if (!['assist', 'edited'].includes(draft.provenance.origin as string)) {
                addIssue(
                    issues,
                    `${path}.provenance.origin`,
                    'invalidValue',
                    'Report drafts may originate only from the assist run or an explicit edit.'
                );
            }
            if (assistRun && draft.provenance.origin === 'assist'
                    && draft.provenance.assistRunId !== assistRun.runId) {
                addIssue(
                    issues,
                    `${path}.provenance.assistRunId`,
                    'invalidReference',
                    'Assist-origin draft must point back to the reportDraft assist run.'
                );
            }
        }

        validateClaims(
            draft.claims,
            typeof draft.text === 'string' ? draft.text : '',
            citationIds,
            recordDocumentIds,
            path,
            issues
        );
    });

    return drafts;
}


function validateClaims(
        value: unknown,
        text: string,
        citationIds: Set<string>,
        recordDocumentIds: Set<string>,
        draftPath: string,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const path = `${draftPath}.claims`;

    if (!Array.isArray(value) || value.length === 0) {
        addIssue(
            issues,
            path,
            'required',
            'Every report draft requires claim-to-source mappings.'
        );
        return;
    }
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, path, 'invalidValue', 'Claims must be a dense JSON array.');
        return;
    }

    const claimIds = new Set<string>();
    const textCoverage = new Array(text.length).fill(0) as number[];

    value.forEach((claim, index) => {
        const claimPath = `${path}[${index}]`;

        if (!isKoreanFieldworkContractRecord(claim)) {
            addIssue(issues, claimPath, 'invalidType', 'Report draft claim must be an object.');
            return;
        }

        validateRequiredString(claim.claimId, `${claimPath}.claimId`, issues);

        if (typeof claim.claimId === 'string') {
            if (claimIds.has(claim.claimId)) {
                addIssue(issues, `${claimPath}.claimId`, 'duplicateId', 'Claim IDs must be unique.');
            }
            claimIds.add(claim.claimId);
        }

        if (!CLAIM_BASES.includes(claim.basis as KoreanFieldworkReportClaimBasis)) {
            addIssue(issues, `${claimPath}.basis`, 'invalidValue', 'Claim basis is not supported.');
        }
        const hasValidRange = Number.isInteger(claim.start) && Number.isInteger(claim.end)
            && (claim.start as number) >= 0
            && (claim.end as number) > (claim.start as number)
            && (claim.end as number) <= text.length;

        if (!hasValidRange) {
            addIssue(
                issues,
                claimPath,
                'outOfRange',
                'Claim range must reference non-empty text within the draft.'
            );
        } else if (!text.slice(claim.start as number, claim.end as number).trim()) {
            addIssue(issues, claimPath, 'invalidValue', 'Claim range cannot contain only whitespace.');
        } else {
            const overlaps = textCoverage
                .slice(claim.start as number, claim.end as number)
                .some(count => count > 0);

            if (overlaps) {
                addIssue(
                    issues,
                    claimPath,
                    'invalidState',
                    'Claim ranges cannot overlap; each output span needs one explicit basis.'
                );
            }
            for (let offset = claim.start as number; offset < (claim.end as number); offset++) {
                textCoverage[offset]++;
            }
        }

        if (claim.basis === 'citation') {
            const references = validateReferenceIds(
                claim.citationIds,
                `${claimPath}.citationIds`,
                citationIds,
                'citation',
                issues
            );
            if (references.length === 0) {
                addIssue(
                    issues,
                    `${claimPath}.citationIds`,
                    'required',
                    'Citation-based claims require at least one citation.'
                );
            }
            if (Array.isArray(claim.documentIds) && claim.documentIds.length > 0) {
                addIssue(
                    issues,
                    `${claimPath}.documentIds`,
                    'invalidState',
                    'Citation-based claims must use citationIds, not direct document IDs.'
                );
            }
        } else if (claim.basis === 'record') {
            const references = validateReferenceIds(
                claim.documentIds,
                `${claimPath}.documentIds`,
                recordDocumentIds,
                'input document',
                issues
            );
            if (references.length === 0) {
                addIssue(
                    issues,
                    `${claimPath}.documentIds`,
                    'required',
                    'Record-based claims require at least one pinned input document.'
                );
            }
            if (Array.isArray(claim.citationIds) && claim.citationIds.length > 0) {
                addIssue(
                    issues,
                    `${claimPath}.citationIds`,
                    'invalidState',
                    'Record-based claims must use documentIds, not citationIds.'
                );
            }
        }
    });

    let uncoveredOffset = -1;
    for (let offset = 0; offset < text.length; offset++) {
        if (text[offset].trim().length > 0 && textCoverage[offset] === 0) {
            uncoveredOffset = offset;
            break;
        }
    }
    if (uncoveredOffset !== -1) {
        addIssue(
            issues,
            path,
            'invalidState',
            `Draft text at offset ${uncoveredOffset} has no record or citation basis.`
        );
    }
}


function validateReferenceIds(
        value: unknown,
        path: string,
        allowed: Set<string>,
        label: string,
        issues: KoreanFieldworkContractValidationIssue[]
): string[] {

    if (!Array.isArray(value)) return [];
    if (!isKoreanFieldworkDenseArray(value)) {
        addIssue(issues, path, 'invalidValue', 'Reference IDs must be a dense JSON array.');
        return [];
    }

    const references = value.filter((entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0
    );
    const seen = new Set<string>();

    value.forEach((entry, index) => {
        if (typeof entry !== 'string' || !entry.trim()) {
            addIssue(issues, `${path}[${index}]`, 'invalidValue', 'Reference IDs must be strings.');
        } else if (seen.has(entry)) {
            addIssue(issues, `${path}[${index}]`, 'duplicateId', 'Reference IDs must be unique.');
        } else if (!allowed.has(entry)) {
            addIssue(
                issues,
                `${path}[${index}]`,
                'invalidReference',
                `Claim references an unknown ${label}.`
            );
        }
        if (typeof entry === 'string') seen.add(entry);
    });

    return references;
}


function validateTargetInput(
        target: unknown,
        assistRun: KoreanFieldworkAssistRun|undefined,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!assistRun || !isKoreanFieldworkContractRecord(target)) return;

    const pinned = assistRun.inputs.some(input =>
        input.documentId === target.documentId
            && input.documentRevision === target.documentRevision
            && (target.inputSha256 === undefined || input.sourceSha256 === target.inputSha256)
    );

    if (!pinned) {
        addIssue(
            issues,
            '$.assistRun.inputs',
            'invalidReference',
            'Report draft assist run must pin the target document revision and input hash.'
        );
    }
}


function validateCitationInputs(
        citations: KoreanFieldworkReportCitation[],
        assistRun: KoreanFieldworkAssistRun|undefined,
        retrievalRun: KoreanFieldworkAssistRun|undefined,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    citations.forEach((citation, index) => {
        if (assistRun && !hasPinnedCitationInput(citation, assistRun)) {
            addIssue(
                issues,
                '$.assistRun.inputs',
                'invalidReference',
                `Generation run does not pin citation ${index + 1}'s source revision.`
            );
        }
        if (retrievalRun && !hasPinnedCitationInput(citation, retrievalRun)) {
            addIssue(
                issues,
                '$.retrievalRun.inputs',
                'invalidReference',
                `Retrieval run does not pin citation ${index + 1}'s source revision.`
            );
        }
    });
}


function hasPinnedCitationInput(
        citation: KoreanFieldworkReportCitation,
        run: KoreanFieldworkAssistRun
): boolean {

    return run.inputs.some(input =>
        input.documentId === citation.sourceDocumentId
            && input.documentRevision === citation.sourceDocumentRevision
    );
}


function validateRetrievalRunOutputs(
        citations: KoreanFieldworkReportCitation[],
        retrievalRun: KoreanFieldworkAssistRun|undefined,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!retrievalRun) return;

    const citationIds = new Set(citations.map(citation => citation.citationId));

    retrievalRun.outputItemIds.forEach((itemId, index) => {
        if (!citationIds.has(itemId)) {
            addIssue(
                issues,
                `$.retrievalRun.outputItemIds[${index}]`,
                'invalidReference',
                'Retrieval run output does not reference a citation in this payload.'
            );
        }
    });

    citations.forEach((citation, index) => {
        if (!retrievalRun.outputItemIds.includes(citation.citationId)) {
            addIssue(
                issues,
                `$.citations[${index}].citationId`,
                'invalidReference',
                'Citation is not listed in retrievalRun.outputItemIds.'
            );
        }
    });
}


function validateRunOutputs(
        drafts: KoreanFieldworkReportDraft[],
        assistRun: KoreanFieldworkAssistRun|undefined,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (!assistRun) return;

    const assistDrafts = drafts.filter(draft =>
        isKoreanFieldworkContractRecord(draft.provenance)
            && draft.provenance.origin === 'assist'
    );
    const assistDraftIds = new Set(assistDrafts.map(draft => draft.draftId));

    assistRun.outputItemIds.forEach((itemId, index) => {
        if (!assistDraftIds.has(itemId)) {
            addIssue(
                issues,
                `$.assistRun.outputItemIds[${index}]`,
                'invalidReference',
                'Generation run output must reference an assist-origin draft candidate.'
            );
        }
    });

    assistDrafts.forEach(draft => {
        if (!assistRun.outputItemIds.includes(draft.draftId)) {
            const index = drafts.indexOf(draft);
            addIssue(
                issues,
                `$.drafts[${index}].draftId`,
                'invalidReference',
                'Draft candidate is not listed in assistRun.outputItemIds.'
            );
        }
    });
}


function validateDraftLineage(
        drafts: KoreanFieldworkReportDraft[],
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const draftById = new Map<string, KoreanFieldworkReportDraft>();
    const indexById = new Map<string, number>();
    drafts.forEach((draft, index) => {
        if (typeof draft.draftId === 'string' && draft.draftId.trim()) {
            draftById.set(draft.draftId, draft);
            indexById.set(draft.draftId, index);
        }
    });

    const successors = new Map<string, KoreanFieldworkReportDraft[]>();

    drafts.forEach((draft, index) => {
        if (!isKoreanFieldworkContractRecord(draft.provenance)
                || draft.provenance.origin !== 'edited') return;

        const predecessorId = draft.provenance.derivedFromItemId;
        if (typeof predecessorId !== 'string' || !predecessorId.trim()) return;

        const predecessor = draftById.get(predecessorId);
        if (!predecessor || predecessor === draft) {
            addIssue(
                issues,
                `$.drafts[${index}].provenance.derivedFromItemId`,
                'invalidReference',
                'Edited draft must reference a different existing draft candidate.'
            );
            return;
        }

        const predecessorSuccessors = successors.get(predecessorId) ?? [];
        predecessorSuccessors.push(draft);
        successors.set(predecessorId, predecessorSuccessors);

        if (isKoreanFieldworkContractRecord(draft.review)
                && draft.review.state === 'accepted'
                && (!isKoreanFieldworkContractRecord(predecessor.review)
                    || predecessor.review.state !== 'superseded')) {
            addIssue(
                issues,
                `$.drafts[${index}].provenance.derivedFromItemId`,
                'invalidState',
                'An accepted edit requires its predecessor to be marked superseded.'
            );
        }
    });

    successors.forEach((items, predecessorId) => {
        const acceptedItems = items.filter(item =>
            isKoreanFieldworkContractRecord(item.review)
                && item.review.state === 'accepted'
        );
        if (acceptedItems.length > 1) {
            addIssue(
                issues,
                `$.drafts[${indexById.get(predecessorId) ?? 0}].draftId`,
                'invalidState',
                'Draft edit lineage cannot have multiple accepted successors.'
            );
        }
    });

    drafts.forEach((draft, index) => {
        if (!isKoreanFieldworkContractRecord(draft.review)
                || draft.review.state !== 'superseded') return;

        const acceptedSuccessors = (successors.get(draft.draftId) ?? []).filter(successor =>
            isKoreanFieldworkContractRecord(successor.review)
                && successor.review.state === 'accepted'
        );
        if (acceptedSuccessors.length !== 1) {
            addIssue(
                issues,
                `$.drafts[${index}].review.state`,
                'invalidState',
                'A superseded draft requires exactly one accepted edited successor.'
            );
        }
    });

    validateDraftLineageCycles(drafts, draftById, indexById, issues);
}


function validateDraftLineageCycles(
        drafts: KoreanFieldworkReportDraft[],
        draftById: Map<string, KoreanFieldworkReportDraft>,
        indexById: Map<string, number>,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    const reported = new Set<string>();

    drafts.forEach(draft => {
        const visited = new Set<string>();
        let current: KoreanFieldworkReportDraft|undefined = draft;

        while (current && isKoreanFieldworkContractRecord(current.provenance)
                && current.provenance.origin === 'edited') {
            if (visited.has(current.draftId)) {
                if (!reported.has(current.draftId)) {
                    const index = indexById.get(current.draftId) ?? 0;
                    addIssue(
                        issues,
                        `$.drafts[${index}].provenance.derivedFromItemId`,
                        'invalidState',
                        'Draft edit lineage cannot contain a cycle.'
                    );
                    reported.add(current.draftId);
                }
                break;
            }

            visited.add(current.draftId);
            const predecessorId = current.provenance.derivedFromItemId;
            current = typeof predecessorId === 'string'
                ? draftById.get(predecessorId)
                : undefined;
        }
    });
}


function validateVersionPins(
        payload: { [key: string]: unknown },
        assistRun: KoreanFieldworkAssistRun|undefined,
        retrievalRun: KoreanFieldworkAssistRun|undefined,
        issues: KoreanFieldworkContractValidationIssue[]
) {

    if (assistRun && assistRun.parameters.promptVersion !== payload.promptVersion) {
        addIssue(
            issues,
            '$.assistRun.parameters.promptVersion',
            'invalidReference',
            'Generation run must pin the payload promptVersion.'
        );
    }
    if (assistRun && assistRun.parameters.indexVersion !== payload.indexVersion) {
        addIssue(
            issues,
            '$.assistRun.parameters.indexVersion',
            'invalidReference',
            'Generation run must pin the payload indexVersion.'
        );
    }
    if (retrievalRun && retrievalRun.parameters.indexVersion !== payload.indexVersion) {
        addIssue(
            issues,
            '$.retrievalRun.parameters.indexVersion',
            'invalidReference',
            'Retrieval run must pin the payload indexVersion.'
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

    const values = new Set<string>();

    value.forEach((entry, index) => {
        if (typeof entry !== 'string' || !entry.trim()) {
            addIssue(issues, `${path}[${index}]`, 'invalidValue', 'Array values must be strings.');
        } else if (values.has(entry)) {
            addIssue(issues, `${path}[${index}]`, 'duplicateId', 'Array values must be unique.');
        }
        if (typeof entry === 'string') values.add(entry);
    });
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
