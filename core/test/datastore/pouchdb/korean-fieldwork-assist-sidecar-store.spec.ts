import PouchDB = require('pouchdb-node');
import {
    IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX,
    isIdaiFieldInternalDocumentId
} from '../../../src/datastore/pouchdb/internal-document';
import {
    getKoreanFieldworkAssistSidecarDocumentId,
    KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND,
    KoreanFieldworkAssistSidecarStore
} from '../../../src/datastore/pouchdb/korean-fieldwork-assist-sidecar-store';
import {
    KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
    KoreanFieldworkAssistRun
} from '../../../src/tools/korean-fieldwork-assist-run';


describe('KoreanFieldworkAssistSidecarStore', () => {

    let db: any;
    let store: KoreanFieldworkAssistSidecarStore;
    let databaseCounter = 0;


    beforeEach(() => {

        const name = `korean-fieldwork-assist-sidecar-store-${process.pid}`
            + `-${Date.now()}-${databaseCounter++}`;
        db = new PouchDB(name);
        store = new KoreanFieldworkAssistSidecarStore(db);
    });


    afterEach(async () => {

        if (db) await db.destroy();
    });


    it('stores PouchDB metadata outside the validated sidecar body', async () => {

        const targetDocumentId = 'feature/한글 1';
        const created = await store.create(targetDocumentId);

        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const documentId = getKoreanFieldworkAssistSidecarDocumentId(targetDocumentId);
        const raw = await db.get(documentId);
        const loaded = await store.load(targetDocumentId);

        expect(documentId.startsWith(IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX)).toBe(true);
        expect(isIdaiFieldInternalDocumentId(documentId)).toBe(true);
        expect(raw.kind).toBe(KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND);
        expect(raw._rev).toBe(created.value.storageRevision);
        expect(raw.sidecar._rev).toBeUndefined();
        expect(raw.sidecar.targetDocumentId).toBe(targetDocumentId);
        expect(loaded.ok).toBe(true);
        if (loaded.ok) expect(loaded.value).toEqual(created.value);
    });


    it('returns undefined for a missing sidecar without creating a document', async () => {

        const loaded = await store.load('missing-feature');

        expect(loaded).toEqual({ ok: true, value: undefined });
        expect((await db.info()).doc_count).toBe(0);
    });


    it('rejects invalid targets before accessing PouchDB', async () => {

        const get = spyOn(db, 'get').and.callThrough();
        const put = spyOn(db, 'put').and.callThrough();

        const loaded = await store.load('');
        const created = await store.create('', {});

        expect(loaded.ok).toBe(false);
        expect(created.ok).toBe(false);
        expect(get).not.toHaveBeenCalled();
        expect(put).not.toHaveBeenCalled();
    });


    it('persists patches with the current PouchDB revision and rejects stale callers', async () => {

        const created = await store.create('soil-photo-1');
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const updated = await store.applyPatch(
            'soil-photo-1',
            created.value.storageRevision,
            { assistRuns: [makeRunningRun()] }
        );

        expect(updated.ok).toBe(true);
        if (!updated.ok) return;
        expect(updated.value.storageRevision).not.toBe(created.value.storageRevision);
        expect(updated.value.sidecar.assistRuns.map(run => run.runId)).toEqual(['assist-run-1']);

        const stale = await store.applyPatch(
            'soil-photo-1',
            created.value.storageRevision,
            {}
        );
        expect(stale.ok).toBe(false);
        if ('reason' in stale && stale.reason === 'conflict') {
            expect(stale.conflicts).toEqual([jasmine.objectContaining({
                code: 'staleStorageRevision',
                path: '$.expectedStorageRevision'
            })]);
        }
    });


    it('does not write or invent a revision for a no-op patch', async () => {

        const created = await store.create('soil-photo-1');
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const put = spyOn(db, 'put').and.callThrough();
        const updated = await store.applyPatch(
            'soil-photo-1',
            created.value.storageRevision,
            {}
        );

        expect(updated.ok).toBe(true);
        if (updated.ok) expect(updated.value.storageRevision).toBe(created.value.storageRevision);
        expect(put).not.toHaveBeenCalled();
    });


    it('maps a concurrent PouchDB update to a stale-revision conflict', async () => {

        const created = await store.create('soil-photo-1');
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        let injectConcurrentWrite = true;
        const racingDb = {
            get: (id: string) => db.get(id),
            put: async (document: any) => {
                if (injectConcurrentWrite && document._rev) {
                    injectConcurrentWrite = false;
                    const concurrent = await db.get(document._id);
                    await db.put(concurrent);
                }
                return db.put(document);
            }
        };
        const racingStore = new KoreanFieldworkAssistSidecarStore(racingDb);

        const result = await racingStore.applyPatch(
            'soil-photo-1',
            created.value.storageRevision,
            { assistRuns: [makeRunningRun()] }
        );

        expect(result.ok).toBe(false);
        if ('reason' in result) expect(result.reason).toBe('conflict');
    });


    it('rejects malformed stored envelopes instead of leaking them as snapshots', async () => {

        const documentId = getKoreanFieldworkAssistSidecarDocumentId('soil-photo-1');
        await db.put({
            _id: documentId,
            kind: KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND,
            sidecar: {
                schemaVersion: 99,
                targetDocumentId: 'soil-photo-1',
                assistRuns: [],
                soilProfileInterpretations: [],
                reportDraftPayloads: []
            }
        });

        const loaded = await store.load('soil-photo-1');

        expect(loaded.ok).toBe(false);
        if ('reason' in loaded && loaded.reason === 'invalid') {
            expect(loaded.issues.map(issue => issue.path)).toContain('$.sidecar.schemaVersion');
        }
    });
});


function makeRunningRun(): KoreanFieldworkAssistRun {

    return {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
        runId: 'assist-run-1',
        kind: 'soilProfileBoundarySuggestion',
        status: 'running',
        startedAt: '2026-07-14T02:00:00.000Z',
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
        parameters: { threshold: 0.7 },
        outputItemIds: [],
        warnings: []
    };
}
