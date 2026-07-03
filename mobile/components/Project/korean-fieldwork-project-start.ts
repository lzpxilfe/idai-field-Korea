export interface KoreanFieldworkProjectStartContextInput {
  boundarySummary?: string;
  recordingBaseCount: number;
  storedBoundaryCount: number;
  userVisibleDocumentCount: number;
}

export const hasKoreanFieldworkProjectStartContext = ({
  boundarySummary,
  recordingBaseCount,
  storedBoundaryCount,
  userVisibleDocumentCount,
}: KoreanFieldworkProjectStartContextInput): boolean =>
  userVisibleDocumentCount > 0
  || recordingBaseCount > 0
  || storedBoundaryCount > 0
  || (boundarySummary?.trim().length ?? 0) > 0;
