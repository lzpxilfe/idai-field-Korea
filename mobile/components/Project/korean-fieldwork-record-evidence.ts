import {
  Document,
  getKoreanFieldworkEvidenceChips,
} from 'idai-field-core';
import {
  getKoreanFieldworkCategoryLabel,
  getKoreanFieldworkDisplayIdentifier,
} from './korean-fieldwork-categories';
import { getKoreanFieldworkPrimaryParent } from './korean-fieldwork-record-summary';

export { getKoreanFieldworkEvidenceChips };

export type {
  KoreanFieldworkEvidenceChip,
} from 'idai-field-core';

export const getKoreanFieldworkEvidenceRecordIdentifier = (
  parentDocument: Document,
  evidenceDocument: Document,
  evidenceLabel: string,
  ordinal: number
): string => {
  const parentIdentifier = getEvidenceParentIdentifier(parentDocument);
  const normalizedLabel = evidenceLabel.trim()
    || getKoreanFieldworkCategoryLabel(evidenceDocument.resource.category);
  const expectedPrefix = `${parentIdentifier} `;
  const existingIdentifier = getKoreanFieldworkDisplayIdentifier(
    evidenceDocument.resource.identifier
  ).replace(/\s+/g, ' ').trim();

  if (
    existingIdentifier.startsWith(expectedPrefix)
    && !isMachineGeneratedIdentifier(existingIdentifier)
  ) {
    return existingIdentifier;
  }

  return `${parentIdentifier} ${normalizedLabel} ${Math.max(1, ordinal)}`;
};

export const getKoreanFieldworkRecordDisplayIdentifier = (
  document: Document,
  documents: readonly Document[]
): string => {
  const currentIdentifier = getKoreanFieldworkDisplayIdentifier(
    document.resource.identifier
  );
  const documentsById = new Map(documents.map((candidate) => [
    candidate.resource.id,
    candidate,
  ]));
  const parentDocument = getKoreanFieldworkPrimaryParent(document, documentsById);
  if (!parentDocument) {
    return currentIdentifier
      || getKoreanFieldworkCategoryLabel(document.resource.category);
  }

  const evidenceChip = getKoreanFieldworkEvidenceChips(parentDocument, [...documents])
    .find((chip) => chip.documents.some((candidate) =>
      candidate.resource.id === document.resource.id));
  if (!evidenceChip) {
    return currentIdentifier
      || getKoreanFieldworkCategoryLabel(document.resource.category);
  }

  const ordinal = evidenceChip.documents.findIndex((candidate) =>
    candidate.resource.id === document.resource.id) + 1;

  return getKoreanFieldworkEvidenceRecordIdentifier(
    parentDocument,
    document,
    evidenceChip.label,
    ordinal
  );
};

const getEvidenceParentIdentifier = (parentDocument: Document): string => {
  const resource = parentDocument.resource as Record<string, unknown>;
  const candidates = [
    resource.reportIdentifier,
    resource.fieldIdentifier,
    parentDocument.resource.identifier,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const identifier = getKoreanFieldworkDisplayIdentifier(candidate)
      .replace(/\s+/g, ' ')
      .trim();
    if (identifier && !isMachineGeneratedIdentifier(identifier)) return identifier;
  }

  return getKoreanFieldworkCategoryLabel(parentDocument.resource.category);
};

const isMachineGeneratedIdentifier = (identifier: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(identifier)
  || /[-_]\d{8,}$/.test(identifier)
  || (
    !/[가-힣]/.test(identifier)
    && /\d/.test(identifier)
    && /^[a-z0-9 _-]+$/i.test(identifier)
  );
