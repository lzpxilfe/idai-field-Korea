import {
  KoreanFieldworkInvestigationModeId,
  shouldUseKoreanFieldworkTrenchWorkflow,
} from './korean-fieldwork-investigation-mode';

export interface KoreanFieldworkRecordListEmptyState {
  icon: string;
  text: string;
  title: string;
}

interface KoreanFieldworkRecordListEmptyStateInput {
  activeCategoryFilterId: string;
  activeWorkFilterId: string;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  query: string;
  totalDocumentCount: number;
}

export const getKoreanFieldworkRecordListEmptyState = ({
  activeCategoryFilterId,
  activeWorkFilterId,
  investigationModeId,
  query,
  totalDocumentCount,
}: KoreanFieldworkRecordListEmptyStateInput): KoreanFieldworkRecordListEmptyState => {
  const primaryRecordLabel = getPrimaryFieldRecordLabel(investigationModeId);

  if (totalDocumentCount === 0) {
    return {
      icon: 'add-location-alt',
      title: '아직 기록이 없습니다',
      text: `지도에서 조사 경계를 먼저 만들고, ${primaryRecordLabel} 기록을 이어가세요.`,
    };
  }

  if (query.trim().length > 0) {
    return {
      icon: 'search-off',
      title: '검색 결과가 없습니다',
      text: '검색어를 지우거나 식별자·설명·기록 종류를 다시 확인하세요.',
    };
  }

  if (activeCategoryFilterId !== 'all' || activeWorkFilterId !== 'all') {
    return {
      icon: 'filter-list-off',
      title: '선택한 조건에 맞는 기록이 없습니다',
      text: '분류를 전체로 바꾸면 숨겨진 기록을 다시 볼 수 있습니다.',
    };
  }

  return {
    icon: 'assignment-late',
    title: '표시할 기록이 없습니다',
    text: `지도에서 조사 경계와 ${primaryRecordLabel}를 추가하거나, 다른 범위를 열어보세요.`,
  };
};

const getPrimaryFieldRecordLabel = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string =>
  shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
    ? '트렌치'
    : '유구';
