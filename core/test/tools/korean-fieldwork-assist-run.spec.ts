import {
    KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
    KoreanFieldworkAssistRun,
    parseKoreanFieldworkAssistRun,
    validateKoreanFieldworkAssistRun,
    validateKoreanFieldworkProposalProvenance,
    validateKoreanFieldworkProposalReview
} from '../../src/tools/korean-fieldwork-assist-run';


describe('Korean fieldwork assist run contract', () => {

    it('validates a completed, revision-pinned local assist run', () => {

        const validation = validateKoreanFieldworkAssistRun(makeAssistRun());

        expect(validation.isValid).toBe(true);
        expect(validation.issues).toEqual([]);
    });


    it('parses JSON round trips and rejects unknown schema versions without rewriting them', () => {

        const run = makeAssistRun();
        const parsed = parseKoreanFieldworkAssistRun(JSON.stringify(run));
        const unsupported = parseKoreanFieldworkAssistRun(JSON.stringify({
            ...run,
            schemaVersion: 2
        }));

        expect(parsed).toEqual({ ok: true, value: run });
        expect(unsupported.ok).toBe(false);
        if ('reason' in unsupported) {
            expect(unsupported.reason).toBe('unsupportedVersion');
            expect(unsupported.raw).toEqual({ ...run, schemaVersion: 2 });
        }
    });


    it('does not allow browser or provider secrets in persisted parameters', () => {

        const run = makeAssistRun() as any;
        run.parameters = {
            detector: {
                threshold: 0.7,
                apiKey: 'must-not-be-persisted'
            }
        };

        const validation = validateKoreanFieldworkAssistRun(run);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.code)).toContain('forbiddenSecret');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.parameters.detector.apiKey');
    });


    it('rejects provider-prefixed and header-style secret names', () => {

        [
            'openaiApiKey',
            'providerAuthToken',
            'x-api-key',
            'credential',
            'bearer',
            'secretValue',
            'providerSecretValue',
            'tokenValue',
            'providerTokenValue'
        ].forEach(key => {
            const run = makeAssistRun() as any;
            run.parameters = { [key]: 'must-not-be-persisted' };

            expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.code))
                .toContain('forbiddenSecret');
        });

        const benignTokenSetting = makeAssistRun() as any;
        benignTokenSetting.parameters = { maxTokens: 1024, tokenBudget: 2048 };
        expect(validateKoreanFieldworkAssistRun(benignTokenSetting).isValid).toBe(true);
    });


    it('accepts only serialization-stable JSON parameter values', () => {

        const invalidValues = [new Date(), new Map([['threshold', 0.7]]), new Array(1)];

        invalidValues.forEach(value => {
            const run = makeAssistRun() as any;
            run.parameters = { value };

            expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.code))
                .toContain('invalidValue');
        });

        const stableParameters = Object.create(null);
        stableParameters.threshold = 0.7;
        const stableRun = makeAssistRun() as any;
        stableRun.parameters = stableParameters;

        expect(validateKoreanFieldworkAssistRun(stableRun).isValid).toBe(true);
    });


    it('rejects accessor-backed parameter objects without invoking getters', () => {

        const run = makeAssistRun() as any;
        const parameters = {};
        Object.defineProperty(parameters, 'unsafe', {
            enumerable: true,
            get: () => { throw new Error('getter must not run'); }
        });
        run.parameters = parameters;

        expect(() => validateKoreanFieldworkAssistRun(run)).not.toThrow();
        expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.code))
            .toContain('invalidValue');
    });


    it('reports cyclic non-JSON parameters instead of throwing', () => {

        const run = makeAssistRun() as any;
        const parameters: any = { threshold: 0.7 };
        parameters.self = parameters;
        run.parameters = parameters;

        expect(() => validateKoreanFieldworkAssistRun(run)).not.toThrow();
        expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.code))
            .toContain('invalidValue');
    });


    it('requires media hashes and pinned model revisions', () => {

        const run = makeAssistRun() as any;
        delete run.inputs[0].sourceSha256;
        run.engine.modelId = 'Xenova/slimsam-77-uniform';

        const validation = validateKoreanFieldworkAssistRun(run);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.inputs[0].sourceSha256');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.engine.modelRevision');
    });


    it('keeps running, completed and failed lifecycle fields consistent', () => {

        const running = makeAssistRun() as any;
        running.status = 'running';

        const failed = makeAssistRun() as any;
        failed.status = 'failed';

        const backwards = makeAssistRun() as any;
        backwards.completedAt = '2026-07-13T09:59:59.000Z';

        expect(validateKoreanFieldworkAssistRun(running).issues.map(issue => issue.path))
            .toContain('$.completedAt');
        expect(validateKoreanFieldworkAssistRun(failed).issues.map(issue => issue.path))
            .toContain('$.failure');
        expect(validateKoreanFieldworkAssistRun(backwards).issues.map(issue => issue.code))
            .toContain('invalidState');
    });


    it('rejects normalized or impossible calendar timestamps', () => {

        ['2026-02-31T00:00:00.000Z', '2026-01-01T24:00:00.000Z'].forEach(startedAt => {
            const run = makeAssistRun() as any;
            run.startedAt = startedAt;

            expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.path))
                .toContain('$.startedAt');
        });
    });


    it('does not publish output IDs before a run completes', () => {

        const run = makeAssistRun() as any;
        run.status = 'cancelled';

        expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.path))
            .toContain('$.outputItemIds');
    });


    it('rejects sparse arrays in every persisted run collection', () => {

        ['inputs', 'outputItemIds', 'warnings'].forEach(property => {
            const run = makeAssistRun() as any;
            run[property] = new Array(1);

            expect(validateKoreanFieldworkAssistRun(run).issues.map(issue => issue.path))
                .toContain(`$.${property}`);
        });
    });


    it('requires review and edit provenance instead of silently replacing proposals', () => {

        const acceptedReview = validateKoreanFieldworkProposalReview({
            state: 'accepted',
            decidedAt: '2026-07-13T10:10:00.000Z',
            decidedBy: 'reviewer-1'
        });
        const invalidProposedReview = validateKoreanFieldworkProposalReview({
            state: 'proposed',
            decidedAt: '2026-07-13T10:10:00.000Z',
            decidedBy: 'reviewer-1'
        });
        const invalidAssistProvenance = validateKoreanFieldworkProposalProvenance({
            origin: 'assist'
        });
        const invalidEditProvenance = validateKoreanFieldworkProposalProvenance({
            origin: 'edited'
        });
        const invalidLegacyProvenance = validateKoreanFieldworkProposalProvenance({
            origin: 'legacyImport'
        });
        const falselyAttributedManual = validateKoreanFieldworkProposalProvenance({
            origin: 'manual',
            assistRunId: 'assist-run-1'
        });

        expect(acceptedReview.isValid).toBe(true);
        expect(invalidProposedReview.issues.map(issue => issue.code)).toContain('invalidState');
        expect(invalidAssistProvenance.issues.map(issue => issue.path))
            .toContain('$.provenance.assistRunId');
        expect(invalidEditProvenance.issues.map(issue => issue.path))
            .toContain('$.provenance.derivedFromItemId');
        expect(invalidLegacyProvenance.issues.map(issue => issue.path))
            .toContain('$.provenance.sourceField');
        expect(falselyAttributedManual.issues.map(issue => issue.code))
            .toContain('invalidState');
    });
});


function makeAssistRun(): KoreanFieldworkAssistRun {

    return {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
        runId: 'assist-run-1',
        kind: 'soilProfileBoundarySuggestion',
        status: 'completed',
        startedAt: '2026-07-13T10:00:00.000Z',
        completedAt: '2026-07-13T10:00:05.000Z',
        operatorId: 'investigator-1',
        inputs: [{
            documentId: 'soil-photo-1',
            documentRevision: '3-source',
            mediaId: 'image-1',
            sourceSha256: 'a'.repeat(64)
        }],
        engine: {
            name: 'deterministic-boundary-suggestion',
            version: '1.0.0',
            runtime: 'desktop'
        },
        parameters: {
            threshold: 0.7,
            smoothing: false
        },
        outputItemIds: ['interface-1'],
        warnings: []
    };
}
