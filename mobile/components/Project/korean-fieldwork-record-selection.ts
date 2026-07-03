import { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import { getKoreanFieldworkParentPath } from './korean-fieldwork-record-summary';

const C = KOREAN_FIELDWORK_CATEGORIES;

const DETAIL_RECORD_CATEGORIES = new Set<string>([
  C.FEATURE_SEGMENT,
  C.LAYER,
  C.PHOTO,
  C.SOIL_PROFILE_PHOTO,
  C.DRAWING,
  C.PEN_MEMO,
  C.FIND,
  C.FIND_COLLECTION,
  C.SAMPLE,
  C.AERIAL_MAP_LAYER,
  C.FIELD_RECORD_QUALITY_REVIEW,
  C.SOURCE_EVIDENCE_INDEX,
]);

const PINNED_PARENT_CATEGORIES = new Set<string>([
  C.FEATURE,
  C.FEATURE_SEGMENT,
  C.LAYER,
]);

export const getKoreanFieldworkExpandedRecordIds = (
  selectedDocument: Document | undefined,
  documentsById: Map<string, Document>
): Set<string> => {
  const selectedIds = new Set<string>();
  if (!selectedDocument) return selectedIds;

  selectedIds.add(selectedDocument.resource.id);

  if (!DETAIL_RECORD_CATEGORIES.has(selectedDocument.resource.category)) {
    return selectedIds;
  }

  getKoreanFieldworkParentPath(selectedDocument, documentsById)
    .filter((parent) => PINNED_PARENT_CATEGORIES.has(parent.resource.category))
    .forEach((parent) => selectedIds.add(parent.resource.id));

  return selectedIds;
};
