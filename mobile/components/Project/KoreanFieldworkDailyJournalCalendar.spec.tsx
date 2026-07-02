import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkDailyJournalCalendar, {
  getBoundaryPlanBackground,
  getBoundaryCanvasPoints,
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

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      postMessage: jest.fn(),
    }));

    return <View {...props} />;
  });
  MockWebView.displayName = 'MockWebView';

  return { WebView: MockWebView };
});

const FIELD = KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS;
const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkDailyJournalCalendar', () => {
  it('updates personnel hierarchy, equipment size, and safety education fields', async () => {
    const handleUpdateDailyLog = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        dailyLog={createDailyLog({
          [FIELD.equipmentCount]: 1,
          [FIELD.equipmentSize]: '0.3㎥',
          [FIELD.investigatorCount]: 1,
          [FIELD.laborerCount]: 2,
        }) as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    fireEvent.changeText(getByTestId('dailyJournalInvestigatorCountInput'), '2');
    fireEvent.changeText(getByTestId('dailyJournalLaborerCountInput'), '6');
    fireEvent.changeText(getByTestId('dailyJournalEquipmentCountInput'), '1');
    fireEvent.changeText(getByTestId('dailyJournalEquipmentSizeInput'), '0.6㎥');
    fireEvent.press(getByTestId('dailyJournalPersonnelSave'));
    fireEvent.press(getByTestId('dailyJournalSafetyPhoto'));
    fireEvent.press(getByTestId('dailyJournalSafetyStretching'));

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.equipmentCount]: 1,
        [FIELD.equipmentSize]: '0.6㎥',
        [FIELD.investigatorCount]: 2,
        [FIELD.laborerCount]: 6,
        [FIELD.workerCount]: 8,
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

  it('saves written daily journal memo text', async () => {
    const handleUpdateDailyLog = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        dailyLog={createDailyLog() as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    fireEvent.changeText(
      getByTestId('dailyJournalWorkMemoInput'),
      '서쪽 구역 제토 중 원형 윤곽 확인.'
    );
    fireEvent.press(getByTestId('dailyJournalWorkMemoSave'));

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.workMemo]: '서쪽 구역 제토 중 원형 윤곽 확인.',
      }));
    });
  });

  it('saves a memo draft even before today daily log exists', async () => {
    const handleUpdateDailyLog = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    fireEvent.changeText(
      getByTestId('dailyJournalWorkMemoInput'),
      'A-1 surface cleanup reached the access road.'
    );
    fireEvent.press(getByTestId('dailyJournalWorkMemoSave'));

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.workMemo]: 'A-1 surface cleanup reached the access road.',
      }));
    });
  });

  it('projects the journal boundary as a vertical plan without stretching axes independently', () => {
    const points = getBoundaryCanvasPoints(
      {
        coordinates: [
          { latitude: 37.1, longitude: 127.1 },
          { latitude: 37.1, longitude: 127.2 },
          { latitude: 37.0, longitude: 127.2 },
          { latitude: 37.0, longitude: 127.1 },
        ],
      },
      { height: 230, width: 320 }
    );
    const horizontalDistance = points[1].x - points[0].x;
    const verticalDistance = points[2].y - points[1].y;

    expect(verticalDistance).toBeCloseTo(182, 0);
    expect(horizontalDistance).toBeLessThan(verticalDistance);
    expect(horizontalDistance).toBeCloseTo(
      verticalDistance * Math.cos((37.05 * Math.PI) / 180),
      0
    );
  });

  it('keeps a reusable plan-space boundary for preview and full-screen notes', () => {
    const background = getBoundaryPlanBackground({
      coordinates: [
        { latitude: 37.1, longitude: 127.1 },
        { latitude: 37.1, longitude: 127.2 },
        { latitude: 37.0, longitude: 127.2 },
        { latitude: 37.0, longitude: 127.1 },
      ],
    });

    expect(background?.boundaryPoints).toHaveLength(4);
    expect(background?.aspectRatio).toBeCloseTo(
      Math.cos((37.05 * Math.PI) / 180),
      2
    );
    expect(background?.boundaryPoints?.[0]).toEqual({ x: 800, y: 800 });
    expect(background?.boundaryPoints?.[2]).toEqual({ x: 9200, y: 9200 });
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
      nativeEvent: {
        changedTouches: [{ locationX: 87, locationY: 23 }],
      },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: {
        changedTouches: [{ locationX: 160, locationY: 115 }],
      },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: {
        changedTouches: [{ locationX: 160, locationY: 115 }],
      },
    });

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.boundaryMemoStrokes]: expect.stringContaining('"strokes"'),
      }));
    });
    const serializedStrokes = JSON.parse(handleUpdateDailyLog.mock.calls[0][0][
      FIELD.boundaryMemoStrokes
    ]);
    const strokePoints = serializedStrokes.strokes[0].points;

    expect(serializedStrokes.version).toBe(1);
    expect(strokePoints[0].x).toBeGreaterThan(900);
    expect(strokePoints[0].x).toBeLessThan(1100);
    expect(strokePoints[0].y).toEqual(1000);
    expect(strokePoints[strokePoints.length - 1]).toEqual({ x: 5000, y: 5000 });
    expect(strokePoints.length).toBeGreaterThan(2);
  });

  it('opens the boundary memo as a full-screen drawing canvas', () => {
    const { getByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        boundaryDraft={{
          coordinates: [
            { latitude: 37.1, longitude: 127.1 },
            { latitude: 37.1, longitude: 127.2 },
            { latitude: 37.0, longitude: 127.2 },
            { latitude: 37.0, longitude: 127.1 },
          ],
        }}
        canEdit
        dailyLog={createDailyLog() as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('dailyJournalBoundaryFullscreen'));

    expect(getByTestId('dailyJournalBoundaryFullscreenCanvas')).toBeTruthy();
  });

  it('does not expose technical point counts for saved boundary memo strokes', () => {
    const { getByText, queryByText } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        dailyLog={createDailyLog({
          [FIELD.boundaryMemoStrokes]:
            '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}',
        }) as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={jest.fn()}
      />
    );

    expect(getByText('저장됨')).toBeTruthy();
    expect(queryByText(/현재\s*\d+\uC810/)).toBeNull();
    expect(queryByText(/\d+\uC810/)).toBeNull();
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
