export const IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX = 'idai-field-internal:' as const;


export function isIdaiFieldInternalDocumentId(value: unknown): value is string {

    return typeof value === 'string'
        && value.startsWith(IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX);
}
