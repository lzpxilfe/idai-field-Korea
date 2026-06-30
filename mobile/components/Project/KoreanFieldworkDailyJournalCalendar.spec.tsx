import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkDailyJournalCalendar, {
  KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS,
} from './KoreanFieldworkDailyJournalCalendar';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const FIELD = KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS;
const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkDailyJournalCalendar', () => {
  it('updates worker count and safety education fields on the daily log', async () => {
    const handleUpdateDailyLog = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        dailyLog={createDailyLog({
          [FIELD.workerCount]: 2,
        }) as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    fireEvent.changeText(getByTestId('dailyJournalWorkerCountInput'), '5');
    fireEvent.press(getByTestId('dailyJournalWorkerCountSave'));
    fireEvent.press(getByTestId('dailyJournalSafetyPhoto'));
    fireEvent.press(getByTestId('dailyJournalSafetyStretching'));

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.workerCount]: 5,
      }));
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.safetyEducationPhoto]: true,
      }));
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.safetyEducationStretching]: true,
      }));
    });
  });

  it('creates a daily log when one does not exist yet', () => {
    const handleCreateDailyLog = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={handleCreateDailyLog}
        onUpdateDailyLog={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('dailyJournalCreateLog'));

    expect(handleCreateDailyLog).toHaveBeenCalled();
  });

  it('stores handwriting strokes over the imported project boundary', async () => {
    const handleUpdateDailyLog = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkDailyJournalCalendar
        boundaryDraft={{
          coordinates: [
            { latitude: 37.1, longitude: 127.1 },
            { latitude: 37.1, longitude: 127.2 },
            { latitude: 37.0, longitude: 127.2 },
            { latitude: 37.0, longitude: 127.1 },
          ],
        }}
        boundarySummary="북쪽 능선부터 남쪽 농로까지"
        canEdit
        dailyLog={createDailyLog() as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    expect(getByText('북쪽 능선부터 남쪽 농로까지')).toBeTruthy();

    const canvas = getByTestId('dailyJournalBoundaryCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 32, locationY: 23 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 160, locationY: 115 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 160, locationY: 115 },
    });

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.boundaryMemoStrokes]: expect.stringContaining('"strokes"'),
      }));
    });
    expect(JSON.parse(handleUpdateDailyLog.mock.calls[0][0][
      FIELD.boundaryMemoStrokes
    ])).toMatchObject({
      version: 1,
      strokes: [
        {
          points: [
            { x: 1000, y: 1000 },
            { x: 5000, y: 5000 },
          ],
        },
      ],
    });
  });
});

const createDailyLog = (
  extraResource: Record<string, unknown> = {}
) => ({
  resource: {
    id: 'daily-log-1',
    identifier: '2026-06-30 작업일지',
    category: C.DAILY_LOG,
    date: '2026-06-30',
    relations: {},
    ...extraResource,
  },
});
