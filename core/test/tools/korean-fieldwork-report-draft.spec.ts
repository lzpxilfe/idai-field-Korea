import {
    KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION,
    KoreanFieldworkReportDraftPayload,
    parseKoreanFieldworkReportDraftPayload,
    validateKoreanFieldworkReportDraftPayload
} from '../../src/tools/korean-fieldwork-report-draft';
import { KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION } from '../../src/tools/korean-fieldwork-assist-run';


describe('Korean fieldwork report draft contract', () => {

    it('round-trips citation-first draft candidates without replacing the target record', () => {

        const payload = makeReportDraftPayload();
        const validation = validateKoreanFieldworkReportDraftPayload(payload);
        const parsed = parseKoreanFieldworkReportDraftPayload(JSON.stringify(payload));

        expect(validation.isValid).toBe(true);
        expect(validation.issues).toEqual([]);
        expect(parsed).toEqual({ ok: true, value: payload });
        expect(payload.target).toEqual({
            documentId: 'feature-1',
            documentRevision: '7-observed',
            inputSha256: 'd'.repeat(64)
        });
    });


    it('preserves unknown future versions instead of guessing a migration', () => {

        const payload = makeReportDraftPayload();
        const unsupported = parseKoreanFieldworkReportDraftPayload({
            ...payload,
            schemaVersion: 2
        });

        expect(unsupported.ok).toBe(false);
        if ('reason' in unsupported) {
            expect(unsupported.reason).toBe('unsupportedVersion');
            expect((unsupported.raw as any).schemaVersion).toBe(2);
        }
    });


    it('returns issues for malformed nested runs and reviews instead of throwing', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun = {};
        delete payload.drafts[0].review;

        expect(() => validateKoreanFieldworkReportDraftPayload(payload)).not.toThrow();
        expect(validateKoreanFieldworkReportDraftPayload(payload).issues.map(issue => issue.code))
            .toContain('invalidType');
    });


    it('rejects sparse citation, draft and claim collections', () => {

        const sparseCitations = makeReportDraftPayload() as any;
        sparseCitations.citations = new Array(1);
        sparseCitations.retrievalRun.outputItemIds = [];

        const sparseDrafts = makeReportDraftPayload() as any;
        sparseDrafts.drafts = new Array(1);
        sparseDrafts.assistRun.outputItemIds = [];

        const sparseClaims = makeReportDraftPayload() as any;
        sparseClaims.drafts[0].claims = new Array(1);

        expect(validateKoreanFieldworkReportDraftPayload(sparseCitations).issues.map(issue => issue.path))
            .toContain('$.citations');
        expect(validateKoreanFieldworkReportDraftPayload(sparseDrafts).issues.map(issue => issue.path))
            .toContain('$.drafts');
        expect(validateKoreanFieldworkReportDraftPayload(sparseClaims).issues.map(issue => issue.path))
            .toContain('$.drafts[0].claims');
    });


    it('requires precise source locators, access levels and verification states', () => {

        const payload = makeReportDraftPayload() as any;
        payload.citations[0].locator = { label: '사람이 읽는 설명만 있음' };
        delete payload.citations[0].accessLevel;
        delete payload.citations[0].excerptSha256;
        payload.citations[0].verification = 'candidate';

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path)).toContain('$.citations[0].locator');
        expect(validation.issues.map(issue => issue.path)).toContain('$.citations[0].accessLevel');
        expect(validation.issues.map(issue => issue.path)).toContain('$.citations[0].excerptSha256');
        expect(validation.issues.map(issue => issue.path)).toContain('$.citations[0].verification');
        expect(validation.issues.map(issue => issue.code)).toContain('invalidState');
    });


    it('maps every claim to pinned records or citations and checks text ranges', () => {

        const payload = makeReportDraftPayload() as any;
        payload.drafts[0].claims[0].documentIds = ['source-evidence-1'];
        payload.drafts[0].claims[1].citationIds = ['missing-citation'];
        payload.drafts[1].claims[0].end = payload.drafts[1].text.length + 1;

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.code)).toContain('invalidReference');
        expect(validation.issues.map(issue => issue.code)).toContain('outOfRange');
    });


    it('requires complete, non-overlapping claim coverage for generated text', () => {

        const payload = makeReportDraftPayload() as any;
        payload.drafts[0].claims[1].start += 2;
        payload.drafts[1].claims[1].start = 0;

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.message))
            .toContain('Claim ranges cannot overlap; each output span needs one explicit basis.');
        expect(validation.issues.some(issue =>
            issue.message.indexOf('has no record or citation basis') !== -1
        )).toBe(true);
    });


    it('pins target and citation revisions in generation and retrieval run inputs', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun.inputs = [{
            documentId: 'feature-1',
            documentRevision: 'older-revision'
        }];
        payload.retrievalRun.inputs[0].documentRevision = 'older-source-revision';

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRun.inputs');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.retrievalRun.inputs');
    });


    it('requires a completed reportRetrieval run with bidirectional citation outputs', () => {

        const payload = makeReportDraftPayload() as any;
        payload.retrievalRun.kind = 'reportDraft';

        const invalidRun = validateKoreanFieldworkReportDraftPayload(payload);

        payload.retrievalRun.kind = 'reportRetrieval';
        payload.retrievalRun.status = 'cancelled';
        const unfinishedRun = validateKoreanFieldworkReportDraftPayload(payload);

        payload.retrievalRun.status = 'completed';
        payload.retrievalRun.outputItemIds = ['missing-citation'];
        const invalidOutputs = validateKoreanFieldworkReportDraftPayload(payload);

        expect(invalidRun.issues.map(issue => issue.path)).toContain('$.retrievalRun.kind');
        expect(unfinishedRun.issues.map(issue => issue.path)).toContain('$.retrievalRun.status');
        expect(invalidOutputs.issues.map(issue => issue.path))
            .toContain('$.retrievalRun.outputItemIds[0]');
        expect(invalidOutputs.issues.map(issue => issue.path))
            .toContain('$.citations[0].citationId');
    });


    it('keeps retrieval and generation run identities separate', () => {

        const payload = makeReportDraftPayload() as any;
        payload.retrievalRun.runId = payload.assistRun.runId;

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path)).toContain('$.retrievalRun.runId');
    });


    it('cross-checks the target input hash against the generation run', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun.inputs[0].sourceSha256 = 'e'.repeat(64);

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path)).toContain('$.assistRun.inputs');

        delete payload.target.inputSha256;
        expect(validateKoreanFieldworkReportDraftPayload(payload).issues.map(issue => issue.path))
            .toContain('$.target.inputSha256');
    });


    it('requires bidirectional links between the run and every candidate', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun.outputItemIds = ['draft-formal', 'missing-draft'];

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRun.outputItemIds[1]');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.drafts[1].draftId');
    });


    it('rejects manual attribution for generation-run outputs', () => {

        const payload = makeReportDraftPayload() as any;
        payload.drafts[0].provenance = { origin: 'manual' };

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path))
            .toContain('$.drafts[0].provenance.origin');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRun.outputItemIds[0]');
    });


    it('rejects dangling and forked edit lineage', () => {

        const dangling = makeReportDraftPayload() as any;
        dangling.assistRun.outputItemIds = ['draft-formal'];
        dangling.drafts[1].provenance = {
            origin: 'edited',
            derivedFromItemId: 'missing-draft'
        };

        const danglingValidation = validateKoreanFieldworkReportDraftPayload(dangling);

        const forked = makeReportDraftPayload() as any;
        forked.drafts[0].review = {
            state: 'superseded',
            decidedAt: '2026-07-13T11:05:00.000Z',
            decidedBy: 'reviewer-1'
        };
        forked.drafts.push(
            makeAcceptedEditedDraft(forked.drafts[0], 'draft-edit-1'),
            makeAcceptedEditedDraft(forked.drafts[0], 'draft-edit-2')
        );

        const forkedValidation = validateKoreanFieldworkReportDraftPayload(forked);

        expect(danglingValidation.issues.map(issue => issue.path))
            .toContain('$.drafts[1].provenance.derivedFromItemId');
        expect(forkedValidation.issues.map(issue => issue.message))
            .toContain('Draft edit lineage cannot have multiple accepted successors.');
    });


    it('rejects cyclic edit lineage', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun.outputItemIds = [];
        payload.drafts[0].provenance = {
            origin: 'edited',
            derivedFromItemId: 'draft-variant'
        };
        payload.drafts[1].provenance = {
            origin: 'edited',
            derivedFromItemId: 'draft-formal'
        };

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.message))
            .toContain('Draft edit lineage cannot contain a cycle.');
    });


    it('requires accepted edits to replace exactly one superseded predecessor', () => {

        const payload = makeReportDraftPayload() as any;
        payload.drafts[1].review = {
            state: 'rejected',
            decidedAt: '2026-07-13T11:05:00.000Z',
            decidedBy: 'reviewer-1'
        };
        payload.drafts.push({
            ...makeEditedDraft(payload.drafts[0], 'draft-edit-1'),
            review: {
                state: 'accepted',
                decidedAt: '2026-07-13T11:06:00.000Z',
                decidedBy: 'reviewer-1'
            }
        });

        const withoutSupersededPredecessor = validateKoreanFieldworkReportDraftPayload(payload);

        payload.drafts[0].review = {
            state: 'superseded',
            decidedAt: '2026-07-13T11:05:00.000Z',
            decidedBy: 'reviewer-1'
        };

        expect(withoutSupersededPredecessor.issues.map(issue => issue.path))
            .toContain('$.drafts[2].provenance.derivedFromItemId');
        expect(validateKoreanFieldworkReportDraftPayload(payload).isValid).toBe(true);
    });


    it('cross-checks prompt and index versions against their producing runs', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun.parameters.promptVersion = 'different-prompt';
        payload.assistRun.parameters.indexVersion = 'different-generation-index';
        payload.retrievalRun.parameters.indexVersion = 'different-index';

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRun.parameters.promptVersion');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRun.parameters.indexVersion');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.retrievalRun.parameters.indexVersion');
    });


    it('allows explicit review but never accepts two competing drafts at once', () => {

        const payload = makeReportDraftPayload() as any;
        payload.drafts.forEach((draft: any) => {
            draft.review = {
                state: 'accepted',
                decidedAt: '2026-07-13T11:05:00.000Z',
                decidedBy: 'reviewer-1'
            };
        });

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.message))
            .toContain('Only one report draft candidate may be accepted at a time.');
    });


    it('inherits the assist-run ban on persisted provider secrets', () => {

        const payload = makeReportDraftPayload() as any;
        payload.assistRun.parameters = {
            provider: {
                access_token: 'must-not-be-stored'
            }
        };

        const validation = validateKoreanFieldworkReportDraftPayload(payload);

        expect(validation.issues.map(issue => issue.code)).toContain('forbiddenSecret');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRun.parameters.provider.access_token');
    });
});


function makeReportDraftPayload(): KoreanFieldworkReportDraftPayload {

    const formalText = '현장 기록은 장방형 수혈주거지이다. 비교 보고서 사례와 유사하다.';
    const variantText = '장방형 수혈주거지로 기록되며, 비교 사례도 함께 검토할 수 있다.';

    return {
        schemaVersion: KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION,
        target: {
            documentId: 'feature-1',
            documentRevision: '7-observed',
            inputSha256: 'd'.repeat(64)
        },
        assistRun: {
            schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
            runId: 'report-run-1',
            kind: 'reportDraft',
            status: 'completed',
            startedAt: '2026-07-13T11:00:00.000Z',
            completedAt: '2026-07-13T11:00:08.000Z',
            operatorId: 'investigator-1',
            inputs: [
                {
                    documentId: 'feature-1',
                    documentRevision: '7-observed',
                    sourceSha256: 'd'.repeat(64)
                },
                {
                    documentId: 'source-evidence-1',
                    documentRevision: '2-verified'
                }
            ],
            engine: {
                name: 'local-report-draft',
                version: '1.0.0',
                runtime: 'desktop',
                modelId: 'local-model',
                modelRevision: 'sha-model-1'
            },
            parameters: {
                temperature: 0.2,
                cloudTransfer: false,
                promptVersion: 'korean-feature-draft-v1',
                indexVersion: 'approved-corpus-2026-07-13'
            },
            outputItemIds: ['draft-formal', 'draft-variant']
        },
        retrievalRun: {
            schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
            runId: 'retrieval-run-1',
            kind: 'reportRetrieval',
            status: 'completed',
            startedAt: '2026-07-13T10:59:55.000Z',
            completedAt: '2026-07-13T10:59:59.000Z',
            operatorId: 'investigator-1',
            inputs: [{
                documentId: 'source-evidence-1',
                documentRevision: '2-verified'
            }],
            engine: {
                name: 'approved-corpus-retrieval',
                version: '1.0.0',
                runtime: 'desktop'
            },
            parameters: {
                indexVersion: 'approved-corpus-2026-07-13',
                resultLimit: 5
            },
            outputItemIds: ['citation-1']
        },
        promptVersion: 'korean-feature-draft-v1',
        indexVersion: 'approved-corpus-2026-07-13',
        citations: [{
            citationId: 'citation-1',
            sourceDocumentId: 'source-evidence-1',
            sourceDocumentRevision: '2-verified',
            sourceLabel: '검증된 주거지 비교 사례',
            sourceEvidenceIndexId: 'source-index-1',
            locator: {
                page: '123',
                chunkId: 'chunk-45'
            },
            retrievalScore: 0.82,
            verification: 'verified',
            accessLevel: 'project',
            excerptSha256: 'c'.repeat(64)
        }],
        drafts: [
            {
                draftId: 'draft-formal',
                style: 'formal',
                text: formalText,
                claims: makeClaims(formalText),
                warnings: [],
                provenance: {
                    origin: 'assist',
                    assistRunId: 'report-run-1'
                },
                review: { state: 'proposed' }
            },
            {
                draftId: 'draft-variant',
                style: 'variant',
                text: variantText,
                claims: makeClaims(variantText),
                warnings: ['비교 사례 문장은 검토 후 반영'],
                provenance: {
                    origin: 'assist',
                    assistRunId: 'report-run-1'
                },
                review: { state: 'proposed' }
            }
        ]
    };
}


function makeEditedDraft(source: any, draftId: string) {

    return {
        ...source,
        draftId,
        provenance: {
            origin: 'edited' as const,
            derivedFromItemId: source.draftId
        },
        review: { state: 'proposed' as const }
    };
}


function makeAcceptedEditedDraft(source: any, draftId: string) {

    return {
        ...makeEditedDraft(source, draftId),
        review: {
            state: 'accepted' as const,
            decidedAt: '2026-07-13T11:06:00.000Z',
            decidedBy: 'reviewer-1'
        }
    };
}


function makeClaims(text: string) {

    const citationStart = text.indexOf('비교');

    return [
        {
            claimId: 'record-claim',
            start: 0,
            end: citationStart,
            basis: 'record' as const,
            documentIds: ['feature-1']
        },
        {
            claimId: 'citation-claim',
            start: citationStart,
            end: text.length,
            basis: 'citation' as const,
            citationIds: ['citation-1']
        }
    ];
}
