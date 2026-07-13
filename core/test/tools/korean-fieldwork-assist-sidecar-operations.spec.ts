import {
    applyKoreanFieldworkAssistSidecarPatch,
    createKoreanFieldworkAssistSidecar,
    KoreanFieldworkAssistSidecarSnapshot,
    mergeKoreanFieldworkAssistSidecarSnapshots
} from '../../src/tools/korean-fieldwork-assist-sidecar-operations';
import {
    KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
    KoreanFieldworkAssistSidecar,
    serializeKoreanFieldworkAssistSidecar,
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


describe('Korean fieldwork assist sidecar storage operations', () => {

    it('creates a normalized, detached sidecar without inventing a storage revision', () => {

        const second = makeBundle('z-run', '9-z', 'z-image', 'b');
        const first = makeBundle('a-run', '2-a', 'a-image', 'a');
        const content = {
            assistRuns: [second.run, first.run],
            soilProfileInterpretations: [second.payload, first.payload]
        };
        const before = JSON.stringify(content);

        const result = createKoreanFieldworkAssistSidecar('soil-photo-1', content);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.assistRuns.map(run => run.runId)).toEqual(['a-run', 'z-run']);
            expect((result.value as any).storageRevision).toBeUndefined();
            expect(result.value.assistRuns[0]).not.toBe(first.run);
        }
        expect(JSON.stringify(content)).toBe(before);
    });


    it('rejects invalid targets, unknown patch fields and unsafe content', () => {

        const invalidTarget = createKoreanFieldworkAssistSidecar('', {});
        const unknownField = createKoreanFieldworkAssistSidecar('soil-photo-1', {
            storageRevision: 'must-not-be-content'
        });
        const unsafe = createKoreanFieldworkAssistSidecar('soil-photo-1', {
            assistRuns: new Array(1)
        });

        expect(invalidTarget.ok).toBe(false);
        expect(unknownField.ok).toBe(false);
        expect(unsafe.ok).toBe(false);
        if ('reason' in unknownField && unknownField.reason === 'invalid') {
            expect(unknownField.issues.map(issue => issue.path))
                .toContain('$.patch.storageRevision');
        }
    });


    it('snapshots proxy operation inputs without invoking hostile getters', () => {

        let getterCalls = 0;
        const hostilePatch = new Proxy({}, {
            get: () => {
                getterCalls++;
                throw new Error('hostile patch getter');
            }
        });
        const hostileSnapshot = new Proxy(makeSnapshot('1-base'), {
            get: () => {
                getterCalls++;
                throw new Error('hostile snapshot getter');
            }
        });

        let created: any;
        let applied: any;
        let merged: any;
        expect(() => {
            created = createKoreanFieldworkAssistSidecar('soil-photo-1', hostilePatch);
            applied = applyKoreanFieldworkAssistSidecarPatch(hostileSnapshot, '1-base', {});
            merged = mergeKoreanFieldworkAssistSidecarSnapshots(
                hostileSnapshot,
                makeSnapshot('2-other')
            );
        }).not.toThrow();

        [created, applied, merged].forEach(result => expect(result.ok).toBe(true));
        expect(getterCalls).toBe(0);
    });


    it('applies a running-to-completed transition only at the expected storage revision', () => {

        const bundle = makeBundle();
        const running = makeRunningRun(bundle.run);
        const created = createKoreanFieldworkAssistSidecar('soil-photo-1', {
            assistRuns: [running]
        });
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const snapshot: KoreanFieldworkAssistSidecarSnapshot = {
            storageRevision: '4-current',
            sidecar: created.value
        };
        const patch = {
            assistRuns: [bundle.run],
            soilProfileInterpretations: [bundle.payload]
        };
        const snapshotBefore = JSON.stringify(snapshot);
        const patchBefore = JSON.stringify(patch);
        deepFreeze(snapshot);
        deepFreeze(patch);

        const result = applyKoreanFieldworkAssistSidecarPatch(snapshot, '4-current', patch);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.baseStorageRevision).toBe('4-current');
            expect(result.value.changed).toBe(true);
            expect(result.value.sidecar.assistRuns[0].status).toBe('completed');
            expect(result.value.sidecar.soilProfileInterpretations.length).toBe(1);
            expect(validateKoreanFieldworkAssistSidecar(result.value.sidecar).isValid).toBe(true);
        }
        expect(JSON.stringify(snapshot)).toBe(snapshotBefore);
        expect(JSON.stringify(patch)).toBe(patchBefore);
    });


    it('returns a stale-revision conflict without applying otherwise valid content', () => {

        const snapshot = makeSnapshot('5-current');
        const result = applyKoreanFieldworkAssistSidecarPatch(snapshot, '4-stale', {});

        expect(result.ok).toBe(false);
        if ('reason' in result) {
            expect(result.reason).toBe('conflict');
            if (result.reason === 'conflict') {
                expect(result.conflicts).toEqual([jasmine.objectContaining({
                    code: 'staleStorageRevision',
                    path: '$.expectedStorageRevision'
                })]);
            }
        }
    });


    it('reports empty and exact duplicate patches as no-op changes', () => {

        const snapshot = makeSnapshot('1-base');
        const empty = applyKoreanFieldworkAssistSidecarPatch(snapshot, '1-base', {});
        const exact = applyKoreanFieldworkAssistSidecarPatch(snapshot, '1-base', {
            assistRuns: clone(snapshot.sidecar.assistRuns),
            soilProfileInterpretations: clone(snapshot.sidecar.soilProfileInterpretations)
        });

        [empty, exact].forEach(result => {
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.changed).toBe(false);
                expect(result.value.sidecar).toEqual(snapshot.sidecar);
            }
        });
    });


    it('advances a proposal review monotonically without replacing its content', () => {

        const snapshot = makeSnapshot('1-base');
        const reviewed = clone(snapshot.sidecar.soilProfileInterpretations[0]);
        reviewed.geometries[0].review = {
            state: 'accepted',
            decidedAt: '2026-07-13T10:10:00.000Z',
            decidedBy: 'reviewer-1'
        };

        const result = applyKoreanFieldworkAssistSidecarPatch(snapshot, '1-base', {
            soilProfileInterpretations: [reviewed]
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.changed).toBe(true);
            expect(result.value.sidecar.soilProfileInterpretations[0].geometries[0].review.state)
                .toBe('accepted');
            expect((result.value.sidecar.soilProfileInterpretations[0].geometries[0] as any).points)
                .toEqual((snapshot.sidecar.soilProfileInterpretations[0].geometries[0] as any).points);
        }
    });


    it('rejects divergent immutable run content during a CAS patch', () => {

        const snapshot = makeSnapshot('1-base');
        const changedRun = clone(snapshot.sidecar.assistRuns[0]);
        changedRun.parameters = { threshold: 0.99 };

        const result = applyKoreanFieldworkAssistSidecarPatch(snapshot, '1-base', {
            assistRuns: [changedRun]
        });

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts.some(conflict => conflict.code === 'contentConflict')).toBe(true);
            expect(result.conflicts[0].path).toContain('runId');
        }
    });


    it('rejects a patch whose individually valid additions break global genealogy', () => {

        const snapshot = makeSnapshot('1-base', makeBundle(
            'run-a',
            '3-a',
            'image-a',
            'a',
            'shared-output'
        ));
        const second = makeBundle(
            'run-b',
            '4-b',
            'image-b',
            'b',
            'shared-output'
        );

        const result = applyKoreanFieldworkAssistSidecarPatch(snapshot, '1-base', {
            assistRuns: [second.run],
            soilProfileInterpretations: [second.payload]
        });

        expect(result.ok).toBe(false);
        if ('reason' in result) {
            expect(result.reason).toBe('invalid');
            if (result.reason === 'invalid') {
                expect(result.issues.some(issue => issue.code === 'duplicateId')).toBe(true);
            }
        }
    });


    it('merges disjoint histories and returns sorted parent storage revisions', () => {

        const left = makeSnapshot('9-left', makeBundle(
            'z-run',
            '9-z',
            'z-image',
            'b'
        ));
        const right = makeSnapshot('2-right', makeBundle(
            'a-run',
            '2-a',
            'a-image',
            'a'
        ));

        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.parentStorageRevisions).toEqual(['2-right', '9-left']);
            expect(result.value.sidecar.assistRuns.map(run => run.runId))
                .toEqual(['a-run', 'z-run']);
            expect(result.value.sidecar.soilProfileInterpretations.length).toBe(2);
            expect(validateKoreanFieldworkAssistSidecar(result.value.sidecar).isValid).toBe(true);
        }
    });


    it('deduplicates canonical-equal content from distinct revisions', () => {

        const left = makeSnapshot('2-later');
        const right = makeSnapshot('1-earlier', cloneBundle(makeBundle()));

        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.parentStorageRevisions).toEqual(['1-earlier', '2-later']);
            expect(result.value.sidecar.assistRuns.length).toBe(1);
            expect(result.value.sidecar.soilProfileInterpretations.length).toBe(1);
        }
    });


    it('detects a storage revision collision before attempting a content merge', () => {

        const populated = makeSnapshot('same-revision');
        const empty: KoreanFieldworkAssistSidecarSnapshot = {
            storageRevision: 'same-revision',
            sidecar: makeEmptySidecar('soil-photo-1')
        };

        const result = mergeKoreanFieldworkAssistSidecarSnapshots(empty, populated);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts[0].code).toBe('revisionCollision');
            expect(result.conflicts[0].path).toBe('$.rightSnapshot.storageRevision');
        }
    });


    it('does not merge sidecars for different canonical documents', () => {

        const left: KoreanFieldworkAssistSidecarSnapshot = {
            storageRevision: '1-left',
            sidecar: makeEmptySidecar('document-a')
        };
        const right: KoreanFieldworkAssistSidecarSnapshot = {
            storageRevision: '2-right',
            sidecar: makeEmptySidecar('document-b')
        };

        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts[0].code).toBe('differentTarget');
        }
    });


    it('reports divergent content for the same stable soil item identity', () => {

        const left = makeSnapshot('1-left');
        const changedBundle = cloneBundle(makeBundle());
        (changedBundle.payload.geometries[0] as any).points[1] = { x: 9000, y: 5300 };
        const right = makeSnapshot('2-right', changedBundle);

        expect(validateKoreanFieldworkAssistSidecar(right.sidecar).isValid).toBe(true);
        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts.some(conflict =>
                conflict.code === 'contentConflict'
                    && conflict.path.indexOf('.geometries') !== -1
            )).toBe(true);
        }
    });


    it('promotes compatible review state but rejects incompatible decisions', () => {

        const proposed = makeSnapshot('1-proposed');
        const acceptedBundle = cloneBundle(makeBundle());
        acceptedBundle.payload.geometries[0].review = {
            state: 'accepted',
            decidedAt: '2026-07-13T10:10:00.000Z',
            decidedBy: 'reviewer-1'
        };
        const accepted = makeSnapshot('2-accepted', acceptedBundle);

        const promoted = mergeKoreanFieldworkAssistSidecarSnapshots(proposed, accepted);
        expect(promoted.ok).toBe(true);
        if (promoted.ok) {
            expect(promoted.value.sidecar.soilProfileInterpretations[0].geometries[0].review.state)
                .toBe('accepted');
        }

        const rejectedBundle = cloneBundle(makeBundle());
        rejectedBundle.payload.geometries[0].review = {
            state: 'rejected',
            decidedAt: '2026-07-13T10:11:00.000Z',
            decidedBy: 'reviewer-2'
        };
        const rejected = makeSnapshot('3-rejected', rejectedBundle);
        const conflicting = mergeKoreanFieldworkAssistSidecarSnapshots(accepted, rejected);

        expect(conflicting.ok).toBe(false);
        if ('reason' in conflicting && conflicting.reason === 'conflict') {
            expect(conflicting.conflicts.some(conflict => conflict.code === 'contentConflict'))
                .toBe(true);
        }
    });


    it('returns semantic conflicts when disjoint valid histories violate global ownership', () => {

        const left = makeSnapshot('1-left', makeBundle(
            'run-a',
            '3-a',
            'image-a',
            'a',
            'shared-output'
        ));
        const right = makeSnapshot('2-right', makeBundle(
            'run-b',
            '4-b',
            'image-b',
            'b',
            'shared-output'
        ));

        expect(validateKoreanFieldworkAssistSidecar(left.sidecar).isValid).toBe(true);
        expect(validateKoreanFieldworkAssistSidecar(right.sidecar).isValid).toBe(true);
        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts.some(conflict =>
                conflict.code === 'semanticConflict'
                    && conflict.path === '$.assistRuns[1].outputItemIds[0]'
            )).toBe(true);
        }
    });


    it('unions an appended edited report draft without changing the generation snapshot', () => {

        const left = makeReportSnapshot('1-left');
        const right = clone(makeReportSnapshot('2-right'));
        const payload = right.sidecar.reportDraftPayloads[0];
        payload.drafts.push({
            ...clone(payload.drafts[0]),
            draftId: 'draft-edited',
            style: 'custom',
            provenance: {
                origin: 'edited',
                derivedFromItemId: 'draft-1'
            },
            review: { state: 'proposed' }
        });

        expect(validateKoreanFieldworkAssistSidecar(right.sidecar).isValid).toBe(true);
        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.sidecar.reportDraftPayloads[0].drafts.map(draft => draft.draftId))
                .toEqual(['draft-1', 'draft-edited']);
            expect(result.value.sidecar.reportDraftPayloads[0].assistRun)
                .toEqual(left.sidecar.reportDraftPayloads[0].assistRun);
        }
    });


    it('rejects divergent verified citations under the same report generation run', () => {

        const left = makeReportSnapshot('1-left');
        const right = clone(makeReportSnapshot('2-right'));
        right.sidecar.reportDraftPayloads[0].citations[0].sourceLabel = '다르게 기록된 출처';

        expect(validateKoreanFieldworkAssistSidecar(right.sidecar).isValid).toBe(true);
        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts.some(conflict =>
                conflict.code === 'contentConflict'
                    && conflict.path.indexOf('reportDraftPayloads') !== -1
            )).toBe(true);
        }
    });


    it('rejects two accepted report generations for the same pinned target after merge', () => {

        const left = makeReportSnapshot('1-left', 'report-run-a', 'draft-a', true);
        const right = makeReportSnapshot('2-right', 'report-run-b', 'draft-b', true);

        expect(validateKoreanFieldworkAssistSidecar(left.sidecar).isValid).toBe(true);
        expect(validateKoreanFieldworkAssistSidecar(right.sidecar).isValid).toBe(true);
        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts.some(conflict =>
                conflict.code === 'semanticConflict'
                    && conflict.message.indexOf('accepted draft') !== -1
            )).toBe(true);
        }
    });


    it('converges on one nested order regardless of merge operand direction', () => {

        const left = makeSnapshot('2-left');
        const right = makeSnapshot('1-right');
        left.sidecar.soilProfileInterpretations[0].geometries.push(
            makeManualInterface('left-interface', 3000)
        );
        right.sidecar.soilProfileInterpretations[0].geometries.push(
            makeManualInterface('right-interface', 4000)
        );

        const leftRight = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);
        const rightLeft = mergeKoreanFieldworkAssistSidecarSnapshots(right, left);

        expect(leftRight.ok).toBe(true);
        expect(rightLeft.ok).toBe(true);
        if (leftRight.ok && rightLeft.ok) {
            expect(serializeKoreanFieldworkAssistSidecar(leftRight.value.sidecar))
                .toBe(serializeKoreanFieldworkAssistSidecar(rightLeft.value.sidecar));
            expect(leftRight.value.sidecar.soilProfileInterpretations[0].geometries.map(
                item => item.id
            )).toEqual(['interface-assist-run-1', 'right-interface', 'left-interface']);
        }
    });


    it('rejects branches that reorder shared nested item IDs', () => {

        const left = makeSnapshot('1-left');
        left.sidecar.soilProfileInterpretations[0].geometries.push(
            makeManualInterface('manual-interface', 3000)
        );
        const right = clone(left);
        right.storageRevision = '2-right';
        right.sidecar.soilProfileInterpretations[0].geometries.reverse();

        expect(validateKoreanFieldworkAssistSidecar(left.sidecar).isValid).toBe(true);
        expect(validateKoreanFieldworkAssistSidecar(right.sidecar).isValid).toBe(true);
        const result = mergeKoreanFieldworkAssistSidecarSnapshots(left, right);

        expect(result.ok).toBe(false);
        if ('reason' in result && result.reason === 'conflict') {
            expect(result.conflicts).toContain(jasmine.objectContaining({
                code: 'contentConflict',
                path: jasmine.stringMatching(/\.geometries$/)
            }));
        }
    });


    it('never mutates frozen merge inputs', () => {

        const left = makeSnapshot('1-left', makeBundle(
            'z-run',
            '9-z',
            'z-image',
            'b'
        ));
        const right = makeSnapshot('2-right', makeBundle(
            'a-run',
            '2-a',
            'a-image',
            'a'
        ));
        const leftBefore = JSON.stringify(left);
        const rightBefore = JSON.stringify(right);
        deepFreeze(left);
        deepFreeze(right);

        expect(() => mergeKoreanFieldworkAssistSidecarSnapshots(left, right)).not.toThrow();
        expect(JSON.stringify(left)).toBe(leftBefore);
        expect(JSON.stringify(right)).toBe(rightBefore);
    });
});


interface Bundle {
    payload: KoreanFieldworkSoilProfileInterpretationPayload;
    run: KoreanFieldworkAssistRun;
}


function makeSnapshot(
        storageRevision: string,
        bundle: Bundle = makeBundle()
): KoreanFieldworkAssistSidecarSnapshot {

    return {
        storageRevision,
        sidecar: {
            schemaVersion: KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
            targetDocumentId: 'soil-photo-1',
            assistRuns: [bundle.run],
            soilProfileInterpretations: [bundle.payload],
            reportDraftPayloads: []
        }
    };
}


function makeEmptySidecar(targetDocumentId: string): KoreanFieldworkAssistSidecar {

    return {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
        targetDocumentId,
        assistRuns: [],
        soilProfileInterpretations: [],
        reportDraftPayloads: []
    };
}


function makeReportSnapshot(
        storageRevision: string,
        generationRunId: string = 'report-run-1',
        draftId: string = 'draft-1',
        accepted: boolean = false
): KoreanFieldworkAssistSidecarSnapshot {

    const generationRun: KoreanFieldworkAssistRun = {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
        runId: generationRunId,
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
            runtime: 'desktop'
        },
        parameters: {
            promptVersion: 'korean-feature-draft-v1',
            indexVersion: 'approved-corpus-v1'
        },
        outputItemIds: [draftId]
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
    const payload: KoreanFieldworkReportDraftPayload = {
        schemaVersion: KOREAN_FIELDWORK_REPORT_DRAFT_SCHEMA_VERSION,
        target: {
            documentId: 'feature-1',
            documentRevision: '7-observed',
            inputSha256: 'd'.repeat(64)
        },
        assistRun: clone(generationRun),
        retrievalRun: clone(retrievalRun),
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
            draftId,
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
            provenance: { origin: 'assist', assistRunId: generationRunId },
            review: accepted
                ? {
                    state: 'accepted',
                    decidedAt: '2026-07-13T11:10:00.000Z',
                    decidedBy: 'reviewer-1'
                }
                : { state: 'proposed' }
        }]
    };

    return {
        storageRevision,
        sidecar: {
            schemaVersion: KOREAN_FIELDWORK_ASSIST_SIDECAR_SCHEMA_VERSION,
            targetDocumentId: 'feature-1',
            assistRuns: [generationRun, retrievalRun],
            soilProfileInterpretations: [],
            reportDraftPayloads: [payload]
        }
    };
}


function makeBundle(
        runId: string = 'assist-run-1',
        documentRevision: string = '3-source',
        mediaId: string = 'image-1',
        hashCharacter: string = 'a',
        outputId: string = `interface-${runId}`
): Bundle {

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


function makeRunningRun(completed: KoreanFieldworkAssistRun): KoreanFieldworkAssistRun {

    const running = clone(completed);
    running.status = 'running';
    delete running.completedAt;
    running.outputItemIds = [];

    return running;
}


function makeManualInterface(id: string, y: number): any {

    return {
        id,
        kind: 'interfacePolyline',
        points: [{ x: 0, y }, { x: 10000, y: y + 100 }],
        provenance: { origin: 'manual' },
        review: { state: 'proposed' }
    };
}


function cloneBundle(bundle: Bundle): Bundle {

    return clone(bundle);
}


function clone<T>(value: T): T {

    return JSON.parse(JSON.stringify(value));
}


function deepFreeze<T>(value: T): T {

    if (value && typeof value === 'object') {
        Object.freeze(value);
        Object.keys(value as any).forEach(key => deepFreeze((value as any)[key]));
    }

    return value;
}
