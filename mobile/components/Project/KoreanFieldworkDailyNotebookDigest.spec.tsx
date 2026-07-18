import { fireEvent, render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkDailyNotebookDigest
  from './KoreanFieldworkDailyNotebookDigest';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkDailyNotebookDigest', () => {
  it('summarizes today journal entries and opens the daily log', () => {
    const operation = createDoc('operation-1', C.OPERATION, 'A area');
    const feature = createDoc('feature-1', C.FEATURE, 'Feature 1');
    const dailyLog = createDoc('daily-log-1', C.DAILY_LOG, '2026-06-23 log', {
      isRecordedIn: [operation.resource.id],
    }, {
      date: '2026-06-23',
      description: '10:30 Feature 1 - Drainage cleared.',
    });
    const handleOpenDailyLog = jest.fn();
    const handleOpenEntryDocument = jest.fn();

    const { getByTestId, getByText } = render(
      <KoreanFieldworkDailyNotebookDigest
        documents={[operation, feature, dailyLog]}
        now={new Date('2026-06-23T12:00:00.000Z')}
        onOpenDailyLog={handleOpenDailyLog}
        onOpenEntryDocument={handleOpenEntryDocument}
      />
    );

    expect(getByText('날짜별 조사일지')).toBeTruthy();
    expect(getByText('2026-06-23')).toBeTruthy();
    expect(getByText('Drainage cleared.')).toBeTruthy();

    fireEvent.press(getByTestId('fieldDailyNotebookDigestDailyLog'));
    expect(handleOpenDailyLog).toHaveBeenCalledWith(dailyLog);

    fireEvent.press(getByTestId('fieldDailyNotebookDigestEntry_daily-log-1-0'));
    expect(handleOpenEntryDocument).toHaveBeenCalledWith(feature);
  });

  it('stays hidden when today has no notebook material', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkDailyNotebookDigest
        documents={[createDoc('feature-1', C.FEATURE, 'Feature 1')]}
        now={new Date('2026-06-23T12:00:00.000Z')}
      />
    );

    expect(queryByTestId('fieldDailyNotebookDigest')).toBeNull();
  });

  it('shows and opens a recent dated log even when today is empty', () => {
    const previousDailyLog = createDoc(
      'daily-log-previous',
      C.DAILY_LOG,
      '2026-06-21 log',
      {},
      {
        date: '2026-06-21',
        description: 'Feature outlines recorded before rain.',
      }
    );
    const handleOpenDailyLog = jest.fn();

    const { getByTestId, getByText } = render(
      <KoreanFieldworkDailyNotebookDigest
        documents={[previousDailyLog]}
        now={new Date('2026-06-23T12:00:00.000Z')}
        onOpenDailyLog={handleOpenDailyLog}
      />
    );

    expect(getByText('최근 날짜별 일지')).toBeTruthy();
    expect(getByText('2026-06-21')).toBeTruthy();
    expect(getByText('Feature outlines recorded before rain.')).toBeTruthy();

    fireEvent.press(getByTestId(
      'fieldDailyNotebookDigestTimeline_daily-log-previous'
    ));
    expect(handleOpenDailyLog).toHaveBeenCalledWith(previousDailyLog);
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
  created: { user: 'test', date: new Date('2026-06-23T00:00:00.000Z') },
  modified: [],
  resource: {
    id,
    identifier,
    category,
    relations,
    ...extraResource,
  },
});
