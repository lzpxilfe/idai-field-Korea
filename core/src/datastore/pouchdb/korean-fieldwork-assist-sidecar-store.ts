import {
    KoreanFieldworkContractValidationIssue
} from '../../tools/korean-fieldwork-assist-run';
import {
    KoreanFieldworkAssistSidecar,
    parseKoreanFieldworkAssistSidecar
} from '../../tools/korean-fieldwork-assist-sidecar';
import {
    applyKoreanFieldworkAssistSidecarPatch,
    createKoreanFieldworkAssistSidecar,
    KoreanFieldworkAssistSidecarOperationResult,
    KoreanFieldworkAssistSidecarPatch,
    KoreanFieldworkAssistSidecarSnapshot
} from '../../tools/korean-fieldwork-assist-sidecar-operations';
import { IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX } from './internal-document';


export const KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND =
    'koreanFieldworkAssistSidecar' as const;
export const KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_ID_PREFIX =
    `${IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX}korean-fieldwork-assist-sidecar:` as const;

interface KoreanFieldworkAssistSidecarDocument {
    _id: string;
    _rev?: string;
    kind: typeof KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND;
    sidecar: KoreanFieldworkAssistSidecar;
}


export function getKoreanFieldworkAssistSidecarDocumentId(targetDocumentId: string): string {

    return KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_ID_PREFIX
        + encodeURIComponent(targetDocumentId);
}


export class KoreanFieldworkAssistSidecarStore {

    constructor(private db: any) {}


    public async load(
            targetDocumentId: unknown
    ): Promise<KoreanFieldworkAssistSidecarOperationResult<
        KoreanFieldworkAssistSidecarSnapshot|undefined
    >> {

        const targetIssue = validateTargetDocumentId(targetDocumentId);
        if (targetIssue) return invalidResult([targetIssue]);

        const target = targetDocumentId as string;
        const documentId = getKoreanFieldworkAssistSidecarDocumentId(target);
        let document: unknown;

        try {
            document = await this.db.get(documentId);
        } catch (error) {
            if (isPouchNotFound(error)) return { ok: true, value: undefined };
            throw error;
        }

        return parseStoredDocument(document, documentId, target);
    }


    public async create(
            targetDocumentId: unknown,
            content: unknown = {}
    ): Promise<KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarSnapshot>> {

        const created = createKoreanFieldworkAssistSidecar(targetDocumentId, content);
        if ('reason' in created) return created;

        const documentId = getKoreanFieldworkAssistSidecarDocumentId(
            created.value.targetDocumentId
        );
        const document = makeStoredDocument(documentId, created.value);

        try {
            const response = await this.db.put(document);
            return snapshotResult(response, created.value);
        } catch (error) {
            if (isPouchConflict(error)) return storageRevisionConflict();
            throw error;
        }
    }


    public async applyPatch(
            targetDocumentId: unknown,
            expectedStorageRevision: unknown,
            patch: unknown
    ): Promise<KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarSnapshot>> {

        const loaded = await this.load(targetDocumentId);
        if (!loaded.ok) return loaded;
        if (!loaded.value) return storageRevisionConflict('Assist sidecar does not exist.');

        const changed = applyKoreanFieldworkAssistSidecarPatch(
            loaded.value,
            expectedStorageRevision,
            patch
        );
        if ('reason' in changed) return changed;
        if (!changed.value.changed) return { ok: true, value: loaded.value };

        const documentId = getKoreanFieldworkAssistSidecarDocumentId(
            changed.value.sidecar.targetDocumentId
        );
        const document = makeStoredDocument(
            documentId,
            changed.value.sidecar,
            changed.value.baseStorageRevision
        );

        try {
            const response = await this.db.put(document);
            return snapshotResult(response, changed.value.sidecar);
        } catch (error) {
            if (isPouchConflict(error)) return storageRevisionConflict();
            throw error;
        }
    }
}


function parseStoredDocument(
        value: unknown,
        expectedDocumentId: string,
        expectedTargetDocumentId: string
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarSnapshot> {

    if (!isRecord(value)) {
        return invalidResult([makeIssue('$', 'Stored assist sidecar must be an object.')]);
    }

    const issues: KoreanFieldworkContractValidationIssue[] = [];
    if (value._id !== expectedDocumentId) {
        issues.push(makeIssue('$._id', 'Stored assist sidecar has an unexpected document id.'));
    }
    if (value.kind !== KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND) {
        issues.push(makeIssue('$.kind', 'Stored assist sidecar has an unexpected document kind.'));
    }
    if (typeof value._rev !== 'string' || value._rev.trim() === '') {
        issues.push(makeIssue('$._rev', 'Stored assist sidecar must have a PouchDB revision.'));
    }

    const parsed = parseKoreanFieldworkAssistSidecar(value.sidecar);
    if ('reason' in parsed) {
        issues.push(...prefixIssues(parsed.issues, '$.sidecar'));
    } else if (parsed.value.targetDocumentId !== expectedTargetDocumentId) {
        issues.push(makeIssue(
            '$.sidecar.targetDocumentId',
            'Stored assist sidecar targets a different document.'
        ));
    }
    if (issues.length > 0 || 'reason' in parsed) return invalidResult(issues);

    return {
        ok: true,
        value: {
            storageRevision: value._rev as string,
            sidecar: parsed.value
        }
    };
}


function makeStoredDocument(
        documentId: string,
        sidecar: KoreanFieldworkAssistSidecar,
        storageRevision?: string
): KoreanFieldworkAssistSidecarDocument {

    const document: KoreanFieldworkAssistSidecarDocument = {
        _id: documentId,
        kind: KOREAN_FIELDWORK_ASSIST_SIDECAR_DOCUMENT_KIND,
        sidecar
    };
    if (storageRevision) document._rev = storageRevision;
    return document;
}


function snapshotResult(
        response: unknown,
        sidecar: KoreanFieldworkAssistSidecar
): KoreanFieldworkAssistSidecarOperationResult<KoreanFieldworkAssistSidecarSnapshot> {

    if (!isRecord(response) || typeof response.rev !== 'string' || response.rev.trim() === '') {
        throw new Error('PouchDB did not return an assist sidecar revision.');
    }

    return {
        ok: true,
        value: {
            storageRevision: response.rev,
            sidecar
        }
    };
}


function validateTargetDocumentId(
        value: unknown
): KoreanFieldworkContractValidationIssue|undefined {

    if (typeof value === 'string' && value.trim() !== '') return undefined;
    return {
        code: value === undefined ? 'required' : 'invalidValue',
        message: 'Sidecar targetDocumentId must be a non-empty string.',
        path: '$.targetDocumentId'
    };
}


function invalidResult<T>(
        issues: KoreanFieldworkContractValidationIssue[]
): KoreanFieldworkAssistSidecarOperationResult<T> {

    return { issues, ok: false, reason: 'invalid' };
}


function storageRevisionConflict(
        message: string = 'Assist sidecar storage revision changed before it could be saved.'
): KoreanFieldworkAssistSidecarOperationResult<never> {

    return {
        conflicts: [{
            code: 'staleStorageRevision',
            message,
            path: '$.expectedStorageRevision'
        }],
        ok: false,
        reason: 'conflict'
    };
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


function makeIssue(path: string, message: string): KoreanFieldworkContractValidationIssue {

    return { code: 'invalidValue', message, path };
}


function isRecord(value: unknown): value is { [key: string]: any } {

    return value !== null && typeof value === 'object' && !Array.isArray(value);
}


function isPouchNotFound(error: unknown): boolean {

    return isRecord(error) && (error.status === 404 || error.name === 'not_found');
}


function isPouchConflict(error: unknown): boolean {

    return isRecord(error) && (error.status === 409 || error.name === 'conflict');
}
