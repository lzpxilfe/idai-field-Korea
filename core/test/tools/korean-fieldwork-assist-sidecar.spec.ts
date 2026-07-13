import {
    classifyKoreanFieldworkReportDraftFreshness,
    classifyKoreanFieldworkSoilProfileFreshness,
    getKoreanFieldworkReportDraftPayloadKey,
    getKoreanFieldworkSoilProfileSourceKey,
    KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
    KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_DEPTH,
    KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH,
    KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_SERIALIZED_LENGTH,
    KoreanFieldworkAssistSidecar,
    normalizeKoreanFieldworkAssistSidecar,
    parseKoreanFieldworkAssistSidecar,
    serializeKoreanFieldworkAssistSidecar,
    stringifyKoreanFieldworkCanonicalJson,
    validateKoreanFieldworkAssistSidecar
} from '../../src/tools/korean-fieldwork-assist-sidecar';
import {
    KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
    KoreanFieldworkAssistRun
} from '../../src/tools/korean-fieldwork-assist-run';
import {
    KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION,
    KoreanFieldworkSoilProfileInterpretationPayload
} from '../../src/tools/korean-fieldwork-assist-geometry';
import {
    KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION,
    KoreanFieldworkReportDraftPayload
} from '../../src/tools/korean-fieldwork-report-draft';


describe('Korean fieldwork assist sidecar contract', () => {

    it('round-trips a valid soil interpretation without storage-owned metadata', () => {

        const sidecar = makeSoilSidecar();
        const serialized = serializeKoreanFieldworkAssistSidecar(sidecar) as string;
        const parsed = parseKoreanFieldworkAssistSidecar(serialized);

        expect(validateKoreanFieldworkAssistSidecar(sidecar)).toEqual({
            isValid: true,
            issues: []
        });
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(parsed.value).toEqual(sidecar);
        expect(JSON.parse(serialized).storageRevision).toBeUndefined();
        expect(JSON.parse(serialized)._rev).toBeUndefined();
        expect(JSON.parse(serialized).updatedAt).toBeUndefined();
    });


    it('preserves an unsupported future version and rejects malformed JSON', () => {

        const future = {
            ...makeSoilSidecar(),
            schemaVersion: 2
        };
        const unsupported = parseKoreanFieldworkAssistSidecar(JSON.stringify(future));
        const malformed = parseKoreanFieldworkAssistSidecar('{');

        expect(unsupported.ok).toBe(false);
        if ('reason' in unsupported) {
            expect(unsupported.reason).toBe('unsupportedVersion');
            expect(unsupported.raw).toEqual(future);
            expect(unsupported.issues.map(issue => issue.path)).toEqual(['$.schemaVersion']);
        }
        expect(malformed.ok).toBe(false);
        if ('reason' in malformed) expect(malformed.reason).toBe('invalid');
    });


    it('rejects raw and generated JSON beyond the serialized boundary', () => {

        const rawTooLarge = ' '.repeat(KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_SERIALIZED_LENGTH + 1);
        const escapedTooLarge = {
            a: '\u0000'.repeat(KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH),
            b: '\u0000'.repeat(KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH),
            c: '\u0000'.repeat(700000)
        };

        expect(parseKoreanFieldworkAssistSidecar(rawTooLarge).ok).toBe(false);
        expect(stringifyKoreanFieldworkCanonicalJson(escapedTooLarge)).toBeUndefined();
    });


    it('rejects unknown v1 fields instead of silently persisting storage metadata', () => {

        const sidecar = {
            ...makeSoilSidecar(),
            storageRevision: '7-pouch-owned'
        };
        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path)).toContain('$.storageRevision');
        expect(serializeKoreanFieldworkAssistSidecar(sidecar)).toBeUndefined();
    });


    it('rejects non-JSON, sparse, cyclic and accessor-backed values without throwing', () => {

        const cyclic: any = makeSoilSidecar();
        cyclic.self = cyclic;

        const accessor = makeSoilSidecar() as any;
        let getterCalls = 0;
        Object.defineProperty(accessor, 'unsafe', {
            enumerable: true,
            get: () => {
                getterCalls++;
                throw new Error('sidecar validation must not invoke accessors');
            }
        });

        const sparse = makeSoilSidecar() as any;
        sparse.assistRuns = new Array(1);

        [new Date(), new Map(), sparse, cyclic, accessor].forEach(value => {
            expect(() => validateKoreanFieldworkAssistSidecar(value)).not.toThrow();
            expect(validateKoreanFieldworkAssistSidecar(value).isValid).toBe(false);
            expect(stringifyKoreanFieldworkCanonicalJson(value)).toBeUndefined();
        });
        expect(getterCalls).toBe(0);
    });


    it('rejects over-deep JSON without overflowing the call stack', () => {

        const deep: any = {};
        let cursor = deep;
        for (let depth = 0; depth <= KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_DEPTH; depth++) {
            cursor.next = {};
            cursor = cursor.next;
        }

        expect(() => validateKoreanFieldworkAssistSidecar(deep)).not.toThrow();
        expect(validateKoreanFieldworkAssistSidecar(deep).isValid).toBe(false);
        expect(() => stringifyKoreanFieldworkCanonicalJson(deep)).not.toThrow();
        expect(stringifyKoreanFieldworkCanonicalJson(deep)).toBeUndefined();
    });


    it('snapshots proxy data descriptors without invoking hostile getters', () => {

        let getterCalls = 0;
        const hostile = new Proxy(makeSoilSidecar(), {
            get: () => {
                getterCalls++;
                throw new Error('hostile getter');
            }
        });

        expect(() => validateKoreanFieldworkAssistSidecar(hostile)).not.toThrow();
        expect(validateKoreanFieldworkAssistSidecar(hostile).isValid).toBe(true);
        expect(() => parseKoreanFieldworkAssistSidecar(hostile)).not.toThrow();
        expect(parseKoreanFieldworkAssistSidecar(hostile).ok).toBe(true);
        expect(() => normalizeKoreanFieldworkAssistSidecar(hostile)).not.toThrow();
        expect(normalizeKoreanFieldworkAssistSidecar(hostile)).toBeDefined();
        expect(getterCalls).toBe(0);
    });


    it('normalizes descriptor data without rereading a stateful proxy getter', () => {

        let assistRunReads = 0;
        const stateful = new Proxy(makeSoilSidecar(), {
            get: (target, property, receiver) => {
                if (property === 'assistRuns' && ++assistRunReads > 1) return null;
                return Reflect.get(target, property, receiver);
            }
        });

        let normalized: KoreanFieldworkAssistSidecar|undefined;
        expect(() => { normalized = normalizeKoreanFieldworkAssistSidecar(stateful); })
            .not.toThrow();
        expect(normalized).toBeDefined();
        expect(validateKoreanFieldworkAssistSidecar(normalized).isValid).toBe(true);
        expect(assistRunReads).toBe(0);
    });


    it('serializes a single descriptor snapshot without stateful descriptor rereads', () => {

        let descriptorReads = 0;
        const stateful = new Proxy({}, {
            ownKeys: () => ['value'],
            getOwnPropertyDescriptor: () => ({
                configurable: true,
                enumerable: true,
                value: ++descriptorReads === 1
                    ? 'safe'
                    : 'x'.repeat(KOREAN_FIELDWORK_ASSIST_SIDECAR_MAX_JSON_STRING_LENGTH + 1),
                writable: true
            })
        });

        expect(stringifyKoreanFieldworkCanonicalJson(stateful)).toBe('{"value":"safe"}');
        expect(descriptorReads).toBe(1);
    });


    it('uses canonical object-key ordering and deterministic collection ordering', () => {

        expect(stringifyKoreanFieldworkCanonicalJson({
            z: 1,
            a: { y: 2, x: 3 }
        })).toBe('{"a":{"x":3,"y":2},"z":1}');

        const first = makeSoilSidecar('soil-photo-1', [
            makeSoilBundle('z-run', '9-z', 'z-image', 'b'),
            makeSoilBundle('a-run', '2-a', 'a-image', 'a')
        ]);
        const second = makeSoilSidecar('soil-photo-1', [
            makeSoilBundle('a-run', '2-a', 'a-image', 'a'),
            makeSoilBundle('z-run', '9-z', 'z-image', 'b')
        ]);

        expect(serializeKoreanFieldworkAssistSidecar(first))
            .toBe(serializeKoreanFieldworkAssistSidecar(second));

        const normalized = normalizeKoreanFieldworkAssistSidecar(first) as KoreanFieldworkAssistSidecar;
        expect(normalized.assistRuns.map(run => run.runId)).toEqual(['a-run', 'z-run']);
        expect(normalized.soilProfileInterpretations.map(payload => payload.sourceImage.documentRevision))
            .toEqual(['2-a', '9-z']);
        expect(first.assistRuns.map(run => run.runId)).toEqual(['z-run', 'a-run']);
    });


    it('preserves semantically meaningful assist input order during normalization', () => {

        const sidecar = makeReportSidecar();
        sidecar.assistRuns[0].inputs.reverse();
        sidecar.reportDraftPayloads[0].assistRun.inputs.reverse();
        const expectedOrder = sidecar.assistRuns[0].inputs.map(input => input.documentId);

        const normalized = normalizeKoreanFieldworkAssistSidecar(sidecar);
        const serialized = serializeKoreanFieldworkAssistSidecar(sidecar) as string;

        expect(normalized).toBeDefined();
        expect((normalized as KoreanFieldworkAssistSidecar).assistRuns[0].inputs.map(
            input => input.documentId
        )).toEqual(expectedOrder);
        expect((JSON.parse(serialized) as KoreanFieldworkAssistSidecar).assistRuns[0].inputs.map(
            input => input.documentId
        )).toEqual(expectedOrder);
    });


    it('preserves ordering owned by nested run, geometry and report contracts', () => {

        const soil = makeSoilSidecar();
        soil.soilProfileInterpretations[0].geometries.unshift({
            id: 'z-manual-interface',
            kind: 'interfacePolyline',
            points: [{ x: 0, y: 4000 }, { x: 10000, y: 4200 }],
            provenance: { origin: 'manual' },
            review: { state: 'proposed' }
        });
        const report = makeReportSidecar();
        const payload = report.reportDraftPayloads[0];
        payload.drafts.unshift({
            ...clone(payload.drafts[0]),
            draftId: 'z-draft',
            provenance: {
                origin: 'assist',
                assistRunId: payload.assistRun.runId
            }
        });
        payload.assistRun.outputItemIds = ['z-draft', 'draft-1'];
        report.assistRuns[0] = clone(payload.assistRun);

        const normalizedSoil = normalizeKoreanFieldworkAssistSidecar(soil) as KoreanFieldworkAssistSidecar;
        const normalizedReport = normalizeKoreanFieldworkAssistSidecar(report) as KoreanFieldworkAssistSidecar;

        expect(normalizedSoil.soilProfileInterpretations[0].geometries.map(item => item.id))
            .toEqual(['z-manual-interface', 'interface-assist-run-1']);
        expect(normalizedReport.reportDraftPayloads[0].drafts.map(draft => draft.draftId))
            .toEqual(['z-draft', 'draft-1']);
        expect(normalizedReport.assistRuns[0].outputItemIds)
            .toEqual(['z-draft', 'draft-1']);
    });


    it('preserves prototype-like JSON keys in canonical output', () => {

        const value = JSON.parse('{"safe":1,"__proto__":{"kept":"yes"},"constructor":2}');
        const canonical = stringifyKoreanFieldworkCanonicalJson(value) as string;

        expect(JSON.parse(canonical)).toEqual(value);
        expect(canonical).toContain('"__proto__":{"kept":"yes"}');
        expect(canonical).not.toBe(stringifyKoreanFieldworkCanonicalJson({
            safe: 1,
            constructor: 2
        }));
    });


    it('builds stable soil and report payload keys from their immutable identities', () => {

        const soil = makeSoilBundle('run-1', '3-source', 'image-1', 'a').payload;
        const report = makeReportPayload();

        expect(getKoreanFieldworkSoilProfileSourceKey(soil.sourceImage))
            .toBe('["3-source","soilProfilePhotoUri","image-1"]');
        expect(getKoreanFieldworkReportDraftPayloadKey(report)).toBe('report-run-1');
        expect(() => getKoreanFieldworkSoilProfileSourceKey(null)).not.toThrow();
        expect(() => getKoreanFieldworkReportDraftPayloadKey(null)).not.toThrow();
        expect(getKoreanFieldworkSoilProfileSourceKey(null)).toBeUndefined();
        expect(getKoreanFieldworkReportDraftPayloadKey(null)).toBeUndefined();
    });


    it('classifies exact, revision-only, content-changed and missing source states', () => {

        const soil = makeSoilBundle('run-1', '3-source', 'image-1', 'a').payload;
        const report = makeReportPayload();

        expect(classifyKoreanFieldworkSoilProfileFreshness(soil)).toBe('missing');
        expect(classifyKoreanFieldworkSoilProfileFreshness(soil, {
            ...soil.sourceImage
        })).toBe('current');
        expect(classifyKoreanFieldworkSoilProfileFreshness(soil, {
            ...soil.sourceImage,
            sourceSha256: soil.sourceImage.sourceSha256.toUpperCase()
        })).toBe('current');
        expect(classifyKoreanFieldworkSoilProfileFreshness(soil, {
            ...soil.sourceImage,
            documentRevision: '4-repacked'
        })).toBe('revisionOnly');
        expect(classifyKoreanFieldworkSoilProfileFreshness(soil, {
            ...soil.sourceImage,
            documentRevision: '4-new-content',
            sourceSha256: 'f'.repeat(64)
        })).toBe('contentChanged');

        expect(classifyKoreanFieldworkReportDraftFreshness(report)).toBe('missing');
        expect(classifyKoreanFieldworkReportDraftFreshness(report, {
            ...report.target
        })).toBe('current');
        expect(classifyKoreanFieldworkReportDraftFreshness(report, {
            ...report.target,
            inputSha256: report.target.inputSha256.toUpperCase()
        })).toBe('current');
        expect(classifyKoreanFieldworkReportDraftFreshness(report, {
            ...report.target,
            documentRevision: '8-metadata-only'
        })).toBe('revisionOnly');
        expect(classifyKoreanFieldworkReportDraftFreshness(report, {
            ...report.target,
            inputSha256: 'e'.repeat(64)
        })).toBe('contentChanged');
        expect(classifyKoreanFieldworkReportDraftFreshness(null)).toBeUndefined();
    });


    it('normalizes SHA-256 fields to lowercase at the sidecar boundary', () => {

        const sidecar = makeReportSidecar();
        sidecar.assistRuns[0].inputs[0].sourceSha256 =
            sidecar.assistRuns[0].inputs[0].sourceSha256?.toUpperCase();
        sidecar.reportDraftPayloads[0].assistRun.inputs[0].sourceSha256 =
            sidecar.reportDraftPayloads[0].assistRun.inputs[0].sourceSha256?.toUpperCase();
        sidecar.reportDraftPayloads[0].target.inputSha256 =
            sidecar.reportDraftPayloads[0].target.inputSha256.toUpperCase();
        sidecar.reportDraftPayloads[0].citations[0].excerptSha256 =
            sidecar.reportDraftPayloads[0].citations[0].excerptSha256?.toUpperCase();

        const normalized = normalizeKoreanFieldworkAssistSidecar(sidecar) as KoreanFieldworkAssistSidecar;

        expect(normalized.assistRuns[0].inputs[0].sourceSha256).toBe('d'.repeat(64));
        expect(normalized.reportDraftPayloads[0].target.inputSha256).toBe('d'.repeat(64));
        expect(normalized.reportDraftPayloads[0].citations[0].excerptSha256).toBe('c'.repeat(64));
    });


    it('requires every payload and run to belong to the sidecar target', () => {

        const mismatchedSoil = makeSoilSidecar();
        mismatchedSoil.targetDocumentId = 'different-document';

        const mismatchedReport = makeReportSidecar();
        mismatchedReport.targetDocumentId = 'different-document';

        expect(validateKoreanFieldworkAssistSidecar(mismatchedSoil).issues.map(issue => issue.path))
            .toContain('$.soilProfileInterpretations[0].sourceImage.documentId');
        expect(validateKoreanFieldworkAssistSidecar(mismatchedReport).issues.map(issue => issue.path))
            .toContain('$.reportDraftPayloads[0].target.documentId');
    });


    it('rejects a soil proposal whose assist run is missing from the central registry', () => {

        const sidecar = makeSoilSidecar();
        sidecar.assistRuns = [];
        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.some(issue =>
            issue.path.indexOf('soilProfileInterpretations[0]') !== -1
                && issue.code === 'invalidReference'
        )).toBe(true);
    });


    it('requires report embedded runs to exactly match registered immutable snapshots', () => {

        const sidecar = makeReportSidecar();
        sidecar.assistRuns[0] = clone(sidecar.assistRuns[0]);
        sidecar.assistRuns[0].parameters = {
            ...sidecar.assistRuns[0].parameters,
            temperature: 0.9
        };

        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.reportDraftPayloads[0].assistRun');
    });


    it('rejects different report input hashes and approvals for one document revision', () => {

        const sidecar = makeReportSidecar();
        const first = sidecar.reportDraftPayloads[0];
        first.drafts[0].review = {
            state: 'accepted',
            decidedAt: '2026-07-13T11:10:00.000Z',
            decidedBy: 'reviewer-1'
        };

        const second = clone(first);
        second.assistRun.runId = 'report-run-2';
        second.assistRun.outputItemIds = ['draft-2'];
        second.assistRun.inputs[0].sourceSha256 = 'e'.repeat(64);
        second.target.inputSha256 = 'e'.repeat(64);
        second.drafts[0].draftId = 'draft-2';
        second.drafts[0].provenance = {
            origin: 'assist',
            assistRunId: 'report-run-2'
        };
        second.drafts[0].review = {
            state: 'accepted',
            decidedAt: '2026-07-13T11:11:00.000Z',
            decidedBy: 'reviewer-2'
        };
        sidecar.assistRuns.push(clone(second.assistRun));
        sidecar.reportDraftPayloads.push(second);

        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.reportDraftPayloads[1].target.inputSha256');
        expect(validation.issues.some(issue =>
            issue.message.indexOf('accepted draft') !== -1
        )).toBe(true);
    });


    it('rejects completed outputs that are orphaned from all persisted payloads', () => {

        const sidecar = makeSoilSidecar();
        sidecar.soilProfileInterpretations = [];
        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRuns[0].outputItemIds[0]');
    });


    it('does not let control characters make one run resolve another run output', () => {

        const orphan = makeSoilBundle('a', '3-source', 'image-1', 'a', 'b\u0000c');
        const linked = makeSoilBundle('a\u0000b', '4-source', 'image-2', 'b', 'c');
        const sidecar = makeSoilSidecar('soil-photo-1', [linked]);
        sidecar.assistRuns.unshift(orphan.run);

        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRuns[0].outputItemIds[0]');
    });


    it('rejects duplicate run identities and cross-run output ownership', () => {

        const duplicateRun = makeSoilSidecar();
        duplicateRun.assistRuns.push(clone(duplicateRun.assistRuns[0]));

        const first = makeSoilBundle('run-a', '3-a', 'image-a', 'a', 'shared-output');
        const second = makeSoilBundle('run-b', '4-b', 'image-b', 'b', 'shared-output');
        const duplicateOutput = makeSoilSidecar('soil-photo-1', [first, second]);

        expect(validateKoreanFieldworkAssistSidecar(duplicateRun).issues.map(issue => issue.code))
            .toContain('duplicateId');
        expect(validateKoreanFieldworkAssistSidecar(duplicateOutput).issues.some(issue =>
            issue.path === '$.assistRuns[1].outputItemIds[0]' && issue.code === 'duplicateId'
        )).toBe(true);
    });


    it('keeps original array indexes when earlier entries are invalid', () => {

        const sidecar = makeSoilSidecar();
        sidecar.assistRuns.unshift({ ...clone(sidecar.assistRuns[0]), runId: '' });
        sidecar.soilProfileInterpretations = [];

        const validation = validateKoreanFieldworkAssistSidecar(sidecar);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.assistRuns[1].outputItemIds[0]');
    });
});


interface SoilBundle {
    payload: KoreanFieldworkSoilProfileInterpretationPayload;
    run: KoreanFieldworkAssistRun;
}


function makeSoilSidecar(
        targetDocumentId: string = 'soil-photo-1',
        bundles: SoilBundle[] = [makeSoilBundle()]
): KoreanFieldworkAssistSidecar {

    return {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
        targetDocumentId,
        assistRuns: bundles.map(bundle => bundle.run),
        soilProfileInterpretations: bundles.map(bundle => bundle.payload),
        reportDraftPayloads: []
    };
}


function makeSoilBundle(
        runId: string = 'assist-run-1',
        documentRevision: string = '3-source',
        mediaId: string = 'image-1',
        hashCharacter: string = 'a',
        outputId: string = `interface-${runId}`
): SoilBundle {

    const sourceSha256 = hashCharacter.repeat(64);
    const run: KoreanFieldworkAssistRun = {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
        runId,
        kind: 'soilProfileBoundarySuggestion',
        status: 'completed',
        startedAt: '2026-07-13T10:00:00.000Z',
        completedAt: '2026-07-13T10:00:05.000Z',
        operatorId: 'investigator-1',
        inputs: [{
            documentId: 'soil-photo-1',
            documentRevision,
            mediaId,
            sourceSha256
        }],
        engine: {
            name: 'deterministic-boundary-suggestion',
            version: '1.0.0',
            runtime: 'desktop'
        },
        parameters: { threshold: 0.7 },
        outputItemIds: [outputId],
        warnings: []
    };
    const payload: KoreanFieldworkSoilProfileInterpretationPayload = {
        schemaVersion: KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION,
        coordinateSpace: 'imageNormalized10000',
        sourceImage: {
            documentId: 'soil-photo-1',
            documentRevision,
            sourceField: 'soilProfilePhotoUri',
            sourceSha256,
            width: 2000,
            height: 1000,
            mediaId
        },
        geometries: [{
            id: outputId,
            kind: 'interfacePolyline',
            points: [{ x: 0, y: 5000 }, { x: 10000, y: 5200 }],
            provenance: { origin: 'assist', assistRunId: runId },
            review: { state: 'proposed' }
        }],
        relations: []
    };

    return { run, payload };
}


function makeReportSidecar(): KoreanFieldworkAssistSidecar {

    const payload = makeReportPayload();

    return {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
        targetDocumentId: payload.target.documentId,
        assistRuns: [clone(payload.assistRun), clone(payload.retrievalRun)],
        soilProfileInterpretations: [],
        reportDraftPayloads: [payload]
    };
}


function makeReportPayload(): KoreanFieldworkReportDraftPayload {

    const generationRun: KoreanFieldworkAssistRun = {
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
            promptVersion: 'korean-feature-draft-v1',
            indexVersion: 'approved-corpus-v1'
        },
        outputItemIds: ['draft-1']
    };
    const retrievalRun: KoreanFieldworkAssistRun = {
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
        parameters: { indexVersion: 'approved-corpus-v1' },
        outputItemIds: ['citation-1']
    };

    return {
        schemaVersion: KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION,
        target: {
            documentId: 'feature-1',
            documentRevision: '7-observed',
            inputSha256: 'd'.repeat(64)
        },
        assistRun: generationRun,
        retrievalRun,
        promptVersion: 'korean-feature-draft-v1',
        indexVersion: 'approved-corpus-v1',
        citations: [{
            citationId: 'citation-1',
            sourceDocumentId: 'source-evidence-1',
            sourceDocumentRevision: '2-verified',
            sourceLabel: '검증된 비교 사례',
            locator: { page: '12' },
            verification: 'verified',
            accessLevel: 'project',
            excerptSha256: 'c'.repeat(64)
        }],
        drafts: [{
            draftId: 'draft-1',
            style: 'formal',
            text: '기록비교',
            claims: [
                {
                    claimId: 'record-claim',
                    start: 0,
                    end: 2,
                    basis: 'record',
                    documentIds: ['feature-1']
                },
                {
                    claimId: 'citation-claim',
                    start: 2,
                    end: 4,
                    basis: 'citation',
                    citationIds: ['citation-1']
                }
            ],
            provenance: { origin: 'assist', assistRunId: 'report-run-1' },
            review: { state: 'proposed' }
        }]
    };
}


function clone<T>(value: T): T {

    return JSON.parse(JSON.stringify(value));
}
