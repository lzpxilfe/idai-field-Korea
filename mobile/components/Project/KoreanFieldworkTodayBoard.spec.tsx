import { fireEvent, render } from '@testing-library/react-native';
import { Document, KoreanFieldworkTodaySummary } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkTodayBoard from './KoreanFieldworkTodayBoard';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkTodayBoard', () => {
  it('does not show the old priority task list when no field records exist yet', () => {
    const handleOpenMap = jest.fn();
    const { getByTestId, queryByText } = render(
      <KoreanFieldworkTodayBoard
        summary={createSummary()}
        documents={[]}
        onEditDocument={jest.fn()}
        onOpenMap={handleOpenMap}
      />
    );

    expect(getByTestId('koreanFieldworkTodayBoard')).toBeTruthy();
    expect(queryByText('오늘 우선 작업')).toBeNull();
    expect(queryByText('조사 경계 생성')).toBeNull();
    expect(handleOpenMap).not.toHaveBeenCalled();
  });

  it('runs mode-aware quick actions from the map today board', () => {
    const operation = createDoc('operation-1', C.OPERATION, 'A구역');
    const handleAddDocumentOfCategory = jest.fn();
    const { getByText } = render(
      <KoreanFieldworkTodayBoard
        summary={createSummary()}
        documents={[operation]}
        investigationModeId="trialTrench"
        onEditDocument={jest.fn()}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenMap={jest.fn()}
      />
    );

    expect(getByText('확인 유구')).toBeTruthy();

    fireEvent.press(getByText('오늘 일지'));
    fireEvent.press(getByText('트렌치 추가'));

    expect(handleAddDocumentOfCategory).toHaveBeenCalledWith(
      operation,
      C.DAILY_LOG
    );
    expect(handleAddDocumentOfCategory).toHaveBeenCalledWith(
      operation,
      C.TRENCH
    );
  });

  it('opens the daily log but keeps 유구 추가 creating another feature', () => {
    const operation = createDoc('operation-1', C.OPERATION, 'A구역');
    const dailyLog = createDoc('daily-log-1', C.DAILY_LOG, 'DL-1');
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      featureRecordingStatus: 'candidate',
    });
    const handleOpenDocument = jest.fn();
    const handleAddDocumentOfCategory = jest.fn();
    const { getByText } = render(
      <KoreanFieldworkTodayBoard
        summary={createSummary({
          dailyLogs: [dailyLog],
          featureCandidates: [feature],
        })}
        documents={[operation, dailyLog, feature]}
        onEditDocument={jest.fn()}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={handleOpenDocument}
      />
    );

    fireEvent.press(getByText('오늘 일지'));
    fireEvent.press(getByText('유구 추가'));

    expect(handleOpenDocument).toHaveBeenCalledWith(dailyLog);
    expect(handleOpenDocument).not.toHaveBeenCalledWith(feature);
    expect(handleAddDocumentOfCategory).toHaveBeenCalledWith(
      operation,
      C.FEATURE
    );
  });
});

const createSummary = (
  overrides: Partial<KoreanFieldworkTodaySummary> = {}
): KoreanFieldworkTodaySummary => ({
  dailyLogs: [],
  surveyBoundaries: [],
  featureCandidates: [],
  openIssues: [],
  issueCountByDocumentId: {},
  ...overrides,
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  created: { user: 'test', date: new Date('2026-06-25T00:00:00.000Z') },
  modified: [],
  resource: {
    id,
    identifier,
    category,
    relations: {},
    ...extraResource,
  },
});
