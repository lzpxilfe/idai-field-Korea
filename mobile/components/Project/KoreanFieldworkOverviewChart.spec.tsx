import { fireEvent, render } from '@testing-library/react-native';
import {
  Document,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';
import React from 'react';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import KoreanFieldworkOverviewChart from './KoreanFieldworkOverviewChart';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => (
      <Text>{name}</Text>
    ),
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkOverviewChart', () => {
  it('renders an overview chart and returns to the top investigation chart', () => {
    const operation = createDoc('operation-1', C.OPERATION, '조사구역 1');
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      liesWithin: ['operation-1'],
    }, {
      featureRecordingStatus: 'candidate',
      featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
      fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg',
    });
    const handleReturn = jest.fn();

    const { getByTestId, getByText } = render(
      <KoreanFieldworkOverviewChart
        summary={createSummary()}
        documents={[operation, feature]}
        currentScopeLabel="조사구역 1 / 수혈 1"
        onReturnToInvestigationOverview={handleReturn}
      />
    );

    expect(getByText('유적·유구 차트')).toBeTruthy();
    expect(getByText('전체 유구 성격 비율')).toBeTruthy();
    expect(getByText('유구 조사 진행')).toBeTruthy();
    expect(getByText('조사구역 1 / 수혈 1 · 기록 2')).toBeTruthy();
    expect(getByText('미정')).toBeTruthy();
    expect(getByText('자료')).toBeTruthy();
    expect(getByText('사진 1 · 도면/메모 0 · 유물/시료 0')).toBeTruthy();
    expect(getByText('collections')).toBeTruthy();

    fireEvent.press(getByTestId('fieldworkOverviewReturnToInvestigation'));

    expect(handleReturn).toHaveBeenCalledTimes(1);
  });
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  relations: Record<string, string[]> = {},
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  created: { user: 'test', date: new Date('2026-06-27T00:00:00.000Z') },
  modified: [],
  resource: {
    id,
    identifier,
    category,
    relations,
    ...extraResource,
  },
});

const createSummary = (): KoreanFieldworkTodaySummary => ({
  dailyLogs: [],
  surveyBoundaries: [],
  featureCandidates: [],
  openIssues: [],
  issueCountByDocumentId: {},
});
