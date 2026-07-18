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

  it('saves the written daily journal and its 120-character abstract', async () => {
    const handleUpdateDailyLog = jest.fn();
    const longJournalText = '가'.repeat(130);
    const { getByTestId, getByText } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        dailyLog={createDailyLog({
          [FIELD.workMemo]: '기존 일지',
        }) as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    fireEvent.changeText(getByTestId('dailyJournalWorkMemoInput'), longJournalText);

    expect(getByText('수정 중 · 저장 필요')).toBeTruthy();

    fireEvent.press(getByTestId('dailyJournalWorkMemoSave'));

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.workMemo]: longJournalText,
        [FIELD.workMemoUpdatedAt]: expect.any(String),
        diaryAbstract: `${'가'.repeat(117)}...`,
      }));
    });
  });

  it('saves a new daily journal even before the daily log exists', async () => {
    const handleUpdateDailyLog = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={handleUpdateDailyLog}
      />
    );

    expect(getByText('새 일지 작성')).toBeTruthy();

    fireEvent.changeText(
      getByTestId('dailyJournalWorkMemoInput'),
      '서쪽 구역 제토 중 원형 윤곽을 확인했다.'
    );
    fireEvent.press(getByTestId('dailyJournalWorkMemoSave'));

    await waitFor(() => {
      expect(handleUpdateDailyLog).toHaveBeenCalledWith(expect.objectContaining({
        [FIELD.workMemo]: '서쪽 구역 제토 중 원형 윤곽을 확인했다.',
        diaryAbstract: '서쪽 구역 제토 중 원형 윤곽을 확인했다.',
      }));
    });
  });

  it('keeps an unsaved journal draft when the same log receives other updates', () => {
    const props = {
      canEdit: true,
      now: new Date('2026-06-30T09:00:00+09:00'),
      onCreateDailyLog: jest.fn(),
      onUpdateDailyLog: jest.fn(),
    };
    const { getByTestId, rerender } = render(
      <KoreanFieldworkDailyJournalCalendar
        {...props}
        dailyLog={createDailyLog({
          [FIELD.workMemo]: '저장된 일지',
        }) as any}
      />
    );

    fireEvent.changeText(
      getByTestId('dailyJournalWorkMemoInput'),
      '아직 저장하지 않은 현장 기록'
    );

    rerender(
      <KoreanFieldworkDailyJournalCalendar
        {...props}
        dailyLog={createDailyLog({
          [FIELD.investigatorCount]: 3,
          [FIELD.workMemo]: '저장된 일지',
        }) as any}
      />
    );

    expect(getByTestId('dailyJournalWorkMemoInput').props.value)
      .toBe('아직 저장하지 않은 현장 기록');
  });

  it('selects a controlled journal date and distinguishes it from today', () => {
    const handleSelectDate = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        onCreateDailyLog={jest.fn()}
        onSelectDate={handleSelectDate}
        onUpdateDailyLog={jest.fn()}
        selectedDate={new Date('2026-06-30T12:00:00+09:00')}
        today={new Date('2026-07-02T12:00:00+09:00')}
      />
    );

    expect(getByTestId('dailyJournalDay_2026-06-30').props.accessibilityState)
      .toEqual({ selected: true });
    expect(getByTestId('dailyJournalDay_2026-07-02').props.accessibilityState)
      .toEqual({ selected: false });
    expect(getByTestId('dailyJournalDay_2026-07-02').props.accessibilityHint)
      .toBe('오늘');
    expect(getByText('2026년 6월 30일')).toBeTruthy();

    fireEvent.press(getByTestId('dailyJournalDay_2026-07-01'));

    expect(handleSelectDate).toHaveBeenCalledTimes(1);
    expect(formatTestDate(handleSelectDate.mock.calls[0][0])).toBe('2026-07-01');
  });

  it('moves the visible calendar backward and forward by one week', () => {
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={jest.fn()}
        selectedDate={new Date('2026-06-30T12:00:00+09:00')}
        today={new Date('2026-06-30T12:00:00+09:00')}
      />
    );

    expect(getByTestId('dailyJournalDay_2026-06-29')).toBeTruthy();

    fireEvent.press(getByTestId('dailyJournalNextWeek'));

    expect(queryByTestId('dailyJournalDay_2026-06-29')).toBeNull();
    expect(getByTestId('dailyJournalDay_2026-07-06')).toBeTruthy();

    fireEvent.press(getByTestId('dailyJournalPreviousWeek'));

    expect(getByTestId('dailyJournalDay_2026-06-29')).toBeTruthy();
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

  it('renders saved boundary memo strokes with smoothed continuous preview segments', () => {
    const { getAllByTestId } = render(
      <KoreanFieldworkDailyJournalCalendar
        canEdit
        dailyLog={createDailyLog({
          [FIELD.boundaryMemoStrokes]: JSON.stringify({
            version: 1,
            strokes: [
              {
                points: [
                  { x: 1000, y: 1000 },
                  { x: 5000, y: 2000 },
                  { x: 9000, y: 8000 },
                ],
                width: 5,
              },
            ],
          }),
        }) as any}
        now={new Date('2026-06-30T09:00:00+09:00')}
        onCreateDailyLog={jest.fn()}
        onUpdateDailyLog={jest.fn()}
      />
    );

    expect(getAllByTestId('dailyJournalBoundaryStrokeSegment').length)
      .toBeGreaterThan(2);
    expect(getAllByTestId('dailyJournalBoundaryStrokeJoint').length)
      .toBeGreaterThan(2);
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

const formatTestDate = (date: Date): string => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');
