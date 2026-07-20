import { MaterialIcons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';
import {
  getKoreanFieldworkDailyJournalFeatureOverlays,
  KoreanFieldworkDailyJournalFeatureOverlay,
} from './korean-fieldwork-daily-journal-plan';
import {
  hasKoreanFieldworkHandwriting,
  KoreanFieldworkHandwritingPoint,
  KoreanFieldworkHandwritingStroke,
  KoreanFieldworkHandwritingTool,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from './korean-fieldwork-handwriting';
import KoreanFieldworkFullscreenDrawingModal, {
  DEFAULT_FIELDWORK_BRUSH_COLOR,
  DEFAULT_FIELDWORK_BRUSH_WIDTH,
  DEFAULT_FIELDWORK_DRAWING_TOOL,
  FieldworkFullscreenDrawingBackground,
  KoreanFieldworkBrushControls,
} from './KoreanFieldworkFullscreenDrawingModal';

export const KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS = {
  boundaryMemoBoundarySnapshot: 'dailyLogBoundaryMemoBoundarySnapshot',
  boundaryMemoCopiedAt: 'dailyLogBoundaryMemoCopiedAt',
  boundaryMemoCopiedFromDate: 'dailyLogBoundaryMemoCopiedFromDate',
  boundaryMemoCopiedFromId: 'dailyLogBoundaryMemoCopiedFromId',
  boundaryMemoImportedAt: 'dailyLogBoundaryMemoImportedAt',
  boundaryMemoStrokes: 'dailyLogBoundaryMemoStrokes',
  boundaryMemoUpdatedAt: 'dailyLogBoundaryMemoUpdatedAt',
  equipmentCount: 'dailyLogEquipmentCount',
  equipmentSize: 'dailyLogEquipmentSize',
  investigatorCount: 'dailyLogInvestigatorCount',
  laborerCount: 'dailyLogLaborerCount',
  safetyEducationPhoto: 'dailyLogSafetyEducationPhoto',
  safetyEducationStretching: 'dailyLogSafetyEducationStretching',
  workerCount: 'dailyLogWorkerCount',
  workMemo: 'description',
  workMemoUpdatedAt: 'dailyLogWorkMemoUpdatedAt',
} as const;

interface KoreanFieldworkDailyJournalCalendarProps {
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  boundarySummary?: string;
  canEdit: boolean;
  dailyLog?: Document;
  dailyLogs?: readonly Document[];
  documents?: readonly Document[];
  isSaving?: boolean;
  now?: Date;
  onCreateDailyLog: () => Promise<void> | void;
  onOpenDailyLog?: (dailyLog: Document) => void;
  onSelectDate?: (date: Date) => void;
  onUpdateDailyLog: (updates: Record<string, unknown>) => Promise<void> | void;
  selectedDate?: Date;
  today?: Date;
}

const MAX_COORDINATE = 10000;
const DEFAULT_CANVAS_SIZE = {
  height: 230,
  width: 320,
};
const MIN_POINT_DISTANCE = 18;
const RELEASE_POINT_MIN_DISTANCE = 1;
const INTERPOLATED_POINT_SPACING = 90;
const MAX_INTERPOLATED_POINTS_PER_MOVE = 18;
const BOUNDARY_MEMO_SMOOTHING_SEGMENT_LENGTH = 16;
const BOUNDARY_MEMO_MIN_SMOOTHING_STEPS = 1;
const BOUNDARY_MEMO_MAX_SMOOTHING_STEPS = 4;
const PLAN_PADDING_RATIO = 0.08;
const BOUNDARY_MEMO_STROKE_COLOR = '#f97316';
const BOUNDARY_MEMO_ERASER_COLOR = '#ffffff';
const FIELD = KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS;
const WORK_MEMO_PLACEHOLDER =
  '오늘 진행한 조사, 발견한 내용, 현장 상황과 내일 이어서 할 일을 적습니다.';

const KoreanFieldworkDailyJournalCalendar: React.FC<
  KoreanFieldworkDailyJournalCalendarProps
> = ({
  boundaryDraft,
  boundarySummary,
  canEdit,
  dailyLog,
  dailyLogs = [],
  documents = [],
  isSaving = false,
  now = new Date(),
  onCreateDailyLog,
  onOpenDailyLog,
  onSelectDate,
  onUpdateDailyLog,
  selectedDate,
  today,
}) => {
  const effectiveToday = today ?? now;
  const effectiveSelectedDate = selectedDate ?? effectiveToday;
  const selectedDateKey = formatDateKey(effectiveSelectedDate);
  const todayKey = formatDateKey(effectiveToday);
  const [visibleWeekDate, setVisibleWeekDate] =
    useState(() => new Date(effectiveSelectedDate));
  const [personnelDraft, setPersonnelDraft] =
    useState(getPersonnelDraft(dailyLog));
  const [workMemoDraft, setWorkMemoDraft] =
    useState(getStringField(dailyLog, FIELD.workMemo));
  const [isWorkMemoDirty, setIsWorkMemoDirty] = useState(false);
  const [saveStatus, setSaveStatus] =
    useState<'saved'|'saving'|'error'|undefined>();
  const selectedDateKeyRef = useRef(selectedDateKey);
  const saveRequestIdRef = useRef(0);
  selectedDateKeyRef.current = selectedDateKey;
  const visibleWeekKey = formatDateKey(visibleWeekDate);
  const dayItems = useMemo(
    () => getCalendarWeek(
      visibleWeekDate,
      effectiveToday,
      effectiveSelectedDate
    ),
    [selectedDateKey, todayKey, visibleWeekKey]
  );
  const personnelSummary = getPersonnelSummary(dailyLog);
  const hasDailyLog = !!dailyLog;
  const savedWorkMemo = getStringField(dailyLog, FIELD.workMemo);
  const hasSavedWorkMemo = savedWorkMemo.length > 0;
  const safetyPhotoDone = getBooleanField(dailyLog, FIELD.safetyEducationPhoto);
  const safetyStretchingDone = getBooleanField(
    dailyLog,
    FIELD.safetyEducationStretching
  );
  const boundaryStrokes = normalizeKoreanFieldworkHandwritingStrokes(
    getResourceValue(dailyLog, FIELD.boundaryMemoStrokes)
  );
  const hasBoundaryMemo = hasKoreanFieldworkHandwriting(boundaryStrokes);
  const effectiveBoundaryDraft = getKoreanFieldworkDailyJournalBoundaryDraft(
    dailyLog,
    boundaryDraft
  );
  const featureOverlays = getKoreanFieldworkDailyJournalFeatureOverlays(
    documents,
    effectiveSelectedDate,
    effectiveBoundaryDraft
  );
  const boundaryMemoSourceLogs = getKoreanFieldworkBoundaryMemoSourceLogs(
    dailyLogs,
    effectiveSelectedDate
  );
  const yesterdayDateKey = formatDateKey(addDays(effectiveSelectedDate, -1));
  const yesterdayBoundaryMemoSource = boundaryMemoSourceLogs.find((document) =>
    getStringField(document, 'date') === yesterdayDateKey);

  useEffect(() => {
    setPersonnelDraft(getPersonnelDraft(dailyLog));
  }, [dailyLog]);

  useEffect(() => {
    setWorkMemoDraft(getStringField(dailyLog, FIELD.workMemo));
    setIsWorkMemoDirty(false);
    setSaveStatus(undefined);
  }, [dailyLog?.resource.id, selectedDateKey]);

  useEffect(() => {
    setVisibleWeekDate(new Date(effectiveSelectedDate));
  }, [selectedDateKey]);

  const saveUpdates = async (
    updates: Record<string, unknown>,
    options: { updateWorkMemoTimestamp?: boolean } = {}
  ): Promise<boolean> => {
    if (!canEdit) return false;

    const requestDateKey = selectedDateKey;
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;

    try {
      setSaveStatus('saving');
      await onUpdateDailyLog({
        ...updates,
        ...(options.updateWorkMemoTimestamp
          ? { [FIELD.workMemoUpdatedAt]: new Date().toISOString() }
          : {}),
      });
      const isCurrentDate = selectedDateKeyRef.current === requestDateKey;
      if (isCurrentDate && saveRequestIdRef.current === requestId) {
        setSaveStatus('saved');
      }
      return isCurrentDate;
    } catch {
      if (
        selectedDateKeyRef.current === requestDateKey
        && saveRequestIdRef.current === requestId
      ) {
        setSaveStatus('error');
      }
      return false;
    }
  };
  const savePersonnel = () => {
    const investigatorCount = normalizeCount(personnelDraft.investigatorCount);
    const laborerCount = normalizeCount(personnelDraft.laborerCount);
    const equipmentCount = normalizeCount(personnelDraft.equipmentCount);
    const equipmentSize = normalizeText(personnelDraft.equipmentSize);
    const workerCount = sumCounts(investigatorCount, laborerCount);

    setPersonnelDraft({
      equipmentCount: countToText(equipmentCount),
      equipmentSize,
      investigatorCount: countToText(investigatorCount),
      laborerCount: countToText(laborerCount),
    });
    saveUpdates({
      [FIELD.equipmentCount]: equipmentCount,
      [FIELD.equipmentSize]: equipmentSize || undefined,
      [FIELD.investigatorCount]: investigatorCount,
      [FIELD.laborerCount]: laborerCount,
      [FIELD.workerCount]: workerCount,
    });
  };
  const toggleSafety = (fieldName: string, currentValue: boolean) => {
    saveUpdates({ [fieldName]: !currentValue });
  };
  const updateWorkMemoDraft = (value: string) => {
    setWorkMemoDraft(value);
    setIsWorkMemoDirty(normalizeText(value) !== savedWorkMemo);
  };
  const saveWorkMemo = async () => {
    if (!canEdit || isSaving || !isWorkMemoDirty) return;

    const normalizedWorkMemo = normalizeText(workMemoDraft);
    const wasSaved = await saveUpdates(
      {
        [FIELD.workMemo]: normalizedWorkMemo || undefined,
        diaryAbstract: createDiaryAbstract(normalizedWorkMemo),
      },
      { updateWorkMemoTimestamp: true }
    );
    if (wasSaved) setIsWorkMemoDirty(false);
  };
  const updateBoundaryStrokes = (serializedStrokes: string) => {
    const boundarySnapshot =
      getStringField(dailyLog, FIELD.boundaryMemoBoundarySnapshot)
      || serializeBoundaryDraft(boundaryDraft);

    saveUpdates({
      [FIELD.boundaryMemoImportedAt]: boundarySnapshot
        ? getStringField(dailyLog, FIELD.boundaryMemoImportedAt)
          || new Date().toISOString()
        : undefined,
      [FIELD.boundaryMemoBoundarySnapshot]: boundarySnapshot || undefined,
      [FIELD.boundaryMemoStrokes]: serializedStrokes,
      [FIELD.boundaryMemoUpdatedAt]: new Date().toISOString(),
    });
  };
  const importBoundaryMemo = (sourceDailyLog: Document) => {
    if (hasBoundaryMemo) return;

    const sourceStrokes = normalizeKoreanFieldworkHandwritingStrokes(
      getResourceValue(sourceDailyLog, FIELD.boundaryMemoStrokes)
    );
    if (!hasKoreanFieldworkHandwriting(sourceStrokes)) return;

    const copiedAt = new Date().toISOString();
    const sourceBoundarySnapshot =
      getStringField(sourceDailyLog, FIELD.boundaryMemoBoundarySnapshot);
    const boundarySnapshot =
      sourceBoundarySnapshot || serializeBoundaryDraft(boundaryDraft);

    saveUpdates({
      [FIELD.boundaryMemoBoundarySnapshot]: boundarySnapshot || undefined,
      [FIELD.boundaryMemoCopiedAt]: copiedAt,
      [FIELD.boundaryMemoCopiedFromDate]:
        getStringField(sourceDailyLog, 'date') || undefined,
      [FIELD.boundaryMemoCopiedFromId]: sourceDailyLog.resource.id,
      [FIELD.boundaryMemoImportedAt]: boundarySnapshot
        ? getStringField(sourceDailyLog, FIELD.boundaryMemoImportedAt)
          || copiedAt
        : undefined,
      [FIELD.boundaryMemoStrokes]:
        serializeKoreanFieldworkHandwriting(sourceStrokes),
      [FIELD.boundaryMemoUpdatedAt]: copiedAt,
    });
  };

  return (
    <View style={styles.container} testID="dailyJournalCalendar">
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <MaterialIcons name="calendar-month" size={18} color="#175cd3" />
            <Text style={styles.title}>작업일지</Text>
          </View>
          <Text style={styles.dateText} testID="dailyJournalSelectedDateLabel">
            {formatFullDate(effectiveSelectedDate)}
          </Text>
        </View>
        {hasDailyLog ? (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => onOpenDailyLog?.(dailyLog)}
            style={styles.openButton}
            testID="dailyJournalOpenLog"
          >
            <MaterialIcons name="open-in-new" size={15} color="#175cd3" />
            <Text style={styles.openButtonText}>일지 열기</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!canEdit || isSaving}
            onPress={onCreateDailyLog}
            style={[
              styles.openButton,
              (!canEdit || isSaving) && styles.disabledButton,
            ]}
            testID="dailyJournalCreateLog"
          >
            <MaterialIcons
              name="add"
              size={15}
              color={canEdit && !isSaving ? '#175cd3' : '#98a2b3'}
            />
            <Text
              style={[
                styles.openButtonText,
                (!canEdit || isSaving) && styles.disabledButtonText,
              ]}
            >
              일지 만들기
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.weekNavigationRow}>
        <TouchableOpacity
          accessibilityLabel="이전 주"
          activeOpacity={0.86}
          onPress={() => setVisibleWeekDate((date) => addDays(date, -7))}
          style={styles.weekNavigationButton}
          testID="dailyJournalPreviousWeek"
        >
          <MaterialIcons name="chevron-left" size={20} color="#475467" />
        </TouchableOpacity>
        <Text style={styles.weekRangeLabel}>{formatWeekRange(dayItems)}</Text>
        <TouchableOpacity
          accessibilityLabel="다음 주"
          activeOpacity={0.86}
          onPress={() => setVisibleWeekDate((date) => addDays(date, 7))}
          style={styles.weekNavigationButton}
          testID="dailyJournalNextWeek"
        >
          <MaterialIcons name="chevron-right" size={20} color="#475467" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {dayItems.map((day) => (
          <TouchableOpacity
            accessibilityHint={day.isToday ? '오늘' : undefined}
            accessibilityLabel={`${formatFullDate(day.date)} 일지 선택`}
            accessibilityState={{ selected: day.isSelected }}
            activeOpacity={0.86}
            key={day.key}
            onPress={() => onSelectDate?.(new Date(day.date))}
            style={[
              styles.dayCell,
              day.isToday && styles.dayCellToday,
              day.isSelected && styles.dayCellSelected,
            ]}
            testID={`dailyJournalDay_${day.key}`}
          >
            <Text
              style={[
                styles.dayWeekday,
                day.isToday && styles.dayTextToday,
                day.isSelected && styles.dayTextSelected,
              ]}
            >
              {day.weekday}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                day.isToday && styles.dayTextToday,
                day.isSelected && styles.dayTextSelected,
              ]}
            >
              {day.day}
            </Text>
            {day.isToday && (
              <Text
                style={[
                  styles.todayBadge,
                  day.isSelected && styles.todayBadgeSelected,
                ]}
              >
                오늘
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <JournalMetric
          icon="groups"
          label="투입"
          value={personnelSummary.text}
          warning={personnelSummary.isEmpty}
        />
        <JournalMetric
          icon="health-and-safety"
          label="안전교육"
          value={
            safetyPhotoDone && safetyStretchingDone
              ? '완료'
              : `${safetyPhotoDone ? '사진' : '-'} · ${
                safetyStretchingDone ? '체조' : '-'
              }`
          }
          warning={!safetyPhotoDone || !safetyStretchingDone}
        />
        <JournalMetric
          icon="gesture"
          label="경계 메모"
          value={hasBoundaryMemo ? '저장됨' : '없음'}
          warning={!hasBoundaryMemo}
        />
      </View>

      <View style={styles.inputRow}>
        <View style={styles.workerInputWrap}>
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.fieldLabel}>오늘 투입 인원/장비</Text>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={!canEdit || isSaving}
              onPress={savePersonnel}
              style={[
                styles.smallButton,
                (!canEdit || isSaving) && styles.disabledButton,
              ]}
              testID="dailyJournalPersonnelSave"
            >
              <Text
                style={[
                  styles.smallButtonText,
                  (!canEdit || isSaving) && styles.disabledButtonText,
                ]}
              >
                반영
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.personnelInputGrid}>
            <PersonnelInput
              editable={canEdit && !isSaving}
              keyboardType="number-pad"
              label="조사원"
              onChangeText={(value) => setPersonnelDraft((draft) => ({
                ...draft,
                investigatorCount: value,
              }))}
              onEndEditing={savePersonnel}
              testID="dailyJournalInvestigatorCountInput"
              value={personnelDraft.investigatorCount}
            />
            <PersonnelInput
              editable={canEdit && !isSaving}
              keyboardType="number-pad"
              label="인부"
              onChangeText={(value) => setPersonnelDraft((draft) => ({
                ...draft,
                laborerCount: value,
              }))}
              onEndEditing={savePersonnel}
              testID="dailyJournalLaborerCountInput"
              value={personnelDraft.laborerCount}
            />
            <PersonnelInput
              editable={canEdit && !isSaving}
              keyboardType="number-pad"
              label="장비"
              onChangeText={(value) => setPersonnelDraft((draft) => ({
                ...draft,
                equipmentCount: value,
              }))}
              onEndEditing={savePersonnel}
              testID="dailyJournalEquipmentCountInput"
              value={personnelDraft.equipmentCount}
            />
            <PersonnelInput
              editable={canEdit && !isSaving}
              label="장비 크기"
              onChangeText={(value) => setPersonnelDraft((draft) => ({
                ...draft,
                equipmentSize: value,
              }))}
              onEndEditing={savePersonnel}
              placeholder="예: 0.6㎥, 10톤"
              testID="dailyJournalEquipmentSizeInput"
              value={personnelDraft.equipmentSize}
            />
          </View>
        </View>

        <View style={styles.safetyWrap}>
          <Text style={styles.fieldLabel}>안전교육</Text>
          <View style={styles.safetyRow}>
            <SafetyToggle
              icon="photo-camera"
              isActive={safetyPhotoDone}
              isDisabled={!canEdit || isSaving}
              label="사진"
              onPress={() => toggleSafety(
                FIELD.safetyEducationPhoto,
                safetyPhotoDone
              )}
              testID="dailyJournalSafetyPhoto"
            />
            <SafetyToggle
              icon="directions-run"
              isActive={safetyStretchingDone}
              isDisabled={!canEdit || isSaving}
              label="체조"
              onPress={() => toggleSafety(
                FIELD.safetyEducationStretching,
                safetyStretchingDone
              )}
              testID="dailyJournalSafetyStretching"
            />
          </View>
        </View>
      </View>

      <View style={styles.workMemoSection}>
        <View style={styles.fieldHeaderRow}>
          <View style={styles.workMemoHeading}>
            <Text style={styles.fieldLabel}>그날의 일지</Text>
            <Text
              style={[
                styles.workMemoState,
                isWorkMemoDirty && styles.workMemoStateDirty,
              ]}
              testID="dailyJournalWorkMemoState"
            >
              {getWorkMemoStateText(
                hasSavedWorkMemo,
                isWorkMemoDirty,
                saveStatus
              )}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!canEdit || isSaving || !isWorkMemoDirty}
            onPress={saveWorkMemo}
            style={[
              styles.smallButton,
              (!canEdit || isSaving || !isWorkMemoDirty)
                && styles.disabledButton,
            ]}
            testID="dailyJournalWorkMemoSave"
          >
            <Text
              style={[
                styles.smallButtonText,
                (!canEdit || isSaving || !isWorkMemoDirty)
                  && styles.disabledButtonText,
              ]}
            >
              저장
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          editable={canEdit && !isSaving}
          multiline
          onChangeText={updateWorkMemoDraft}
          placeholder={WORK_MEMO_PLACEHOLDER}
          style={styles.workMemoInput}
          testID="dailyJournalWorkMemoInput"
          textAlignVertical="top"
          value={workMemoDraft}
        />
      </View>

      <BoundaryMemoCanvas
        boundaryDraft={effectiveBoundaryDraft}
        boundarySummary={boundarySummary}
        canEdit={canEdit && !isSaving}
        copiedFromDate={getStringField(
          dailyLog,
          FIELD.boundaryMemoCopiedFromDate
        ) || undefined}
        featureOverlays={featureOverlays}
        importSources={boundaryMemoSourceLogs}
        isImportDisabled={
          !canEdit || isSaving || saveStatus === 'saving' || hasBoundaryMemo
        }
        key={selectedDateKey}
        onImportSource={importBoundaryMemo}
        onUpdateStrokes={updateBoundaryStrokes}
        selectedDate={effectiveSelectedDate}
        strokes={boundaryStrokes}
        yesterdaySource={yesterdayBoundaryMemoSource}
      />

      {!!saveStatus && (
        <Text
          style={[
            styles.statusText,
            saveStatus === 'error' && styles.statusTextError,
          ]}
          testID="dailyJournalSaveStatus"
        >
          {getSaveStatusText(saveStatus)}
        </Text>
      )}
    </View>
  );
};

const BoundaryMemoCanvas: React.FC<{
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  boundarySummary?: string;
  canEdit: boolean;
  copiedFromDate?: string;
  featureOverlays: readonly KoreanFieldworkDailyJournalFeatureOverlay[];
  importSources: readonly Document[];
  isImportDisabled: boolean;
  onImportSource: (sourceDailyLog: Document) => void;
  onUpdateStrokes: (serializedStrokes: string) => void;
  selectedDate: Date;
  strokes: KoreanFieldworkHandwritingStroke[];
  yesterdaySource?: Document;
}> = ({
  boundaryDraft,
  boundarySummary,
  canEdit,
  copiedFromDate,
  featureOverlays,
  importSources,
  isImportDisabled,
  onImportSource,
  onUpdateStrokes,
  selectedDate,
  strokes,
  yesterdaySource,
}) => {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [brushColor, setBrushColor] = useState(DEFAULT_FIELDWORK_BRUSH_COLOR);
  const [brushWidth, setBrushWidth] = useState(DEFAULT_FIELDWORK_BRUSH_WIDTH);
  const [drawingTool, setDrawingTool] =
    useState<KoreanFieldworkHandwritingTool>(DEFAULT_FIELDWORK_DRAWING_TOOL);
  const [isImportDateListVisible, setIsImportDateListVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStroke, setActiveStroke] =
    useState<KoreanFieldworkHandwritingStroke>();
  const activeStrokeRef = useRef<KoreanFieldworkHandwritingStroke>();
  const latestStrokesRef = useRef<KoreanFieldworkHandwritingStroke[]>(strokes);
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const boundaryPlan = useMemo(
    () => getBoundaryPlanBackground(boundaryDraft),
    [boundaryDraft]
  );
  const boundaryAspectRatio = boundaryPlan?.aspectRatio ?? 1;
  const boundaryPoints = useMemo(
    () => mapNormalizedPointsToCanvas(
      boundaryPlan?.boundaryPoints ?? [],
      canvasSize,
      boundaryAspectRatio
    ),
    [boundaryAspectRatio, boundaryPlan, canvasSize]
  );
  const fullscreenBackground = useMemo(
    () => {
      const fullscreenBoundaryPoints = boundaryPlan?.boundaryPoints;
      if (
        !boundaryPlan
        || !fullscreenBoundaryPoints
        || fullscreenBoundaryPoints.length < 3
      ) {
        return undefined;
      }

      return {
        ...boundaryPlan,
        boundaryPoints: fullscreenBoundaryPoints,
        guidePaths: featureOverlays.flatMap((overlay) => overlay.guidePaths),
        label: `조사 경계 · 배치 유구 ${featureOverlays.length}개`,
      };
    },
    [boundaryPlan, featureOverlays]
  );
  const hasMemoStrokes = hasKoreanFieldworkHandwriting(strokes);

  useEffect(() => {
    latestStrokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    setIsImportDateListVisible(false);
  }, [selectedDate]);

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startStroke = (event: GestureResponderEvent) => {
    if (!canEdit) return;

    const point = getNormalizedPoint(event, canvasSize, boundaryAspectRatio);
    if (!point) return;

    activeStrokeRef.current = {
      color: brushColor,
      points: [point],
      tool: drawingTool,
      width: brushWidth,
    };
    setActiveStroke(activeStrokeRef.current);
  };
  const moveStroke = (event: GestureResponderEvent) => {
    if (!canEdit) return;

    const point = getNormalizedPoint(event, canvasSize, boundaryAspectRatio);
    if (!point) return;

    appendActiveStrokePoint(point);
  };
  const finishStroke = (event?: GestureResponderEvent) => {
    if (!canEdit) return;

    const releasePoint = event
      ? getNormalizedPoint(event, canvasSize, boundaryAspectRatio)
      : undefined;
    if (releasePoint) {
      appendActiveStrokePoint(releasePoint, RELEASE_POINT_MIN_DISTANCE);
    }

    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = undefined;
    setActiveStroke(undefined);

    if (!stroke || stroke.points.length === 0) return;

    commitStrokes(latestStrokesRef.current.concat(stroke));
  };
  const undoStroke = () => {
    commitStrokes(latestStrokesRef.current.slice(0, -1));
  };
  const clearStrokes = () => {
    commitStrokes([]);
  };
  const commitStrokes = (nextStrokes: KoreanFieldworkHandwritingStroke[]) => {
    const normalizedStrokes = normalizeKoreanFieldworkHandwritingStrokes(
      nextStrokes
    );
    latestStrokesRef.current = normalizedStrokes;
    onUpdateStrokes(serializeKoreanFieldworkHandwriting(normalizedStrokes));
  };
  const appendActiveStrokePoint = (
    point: KoreanFieldworkHandwritingPoint,
    minimumDistance = MIN_POINT_DISTANCE
  ) => {
    const currentStroke = activeStrokeRef.current;
    if (!currentStroke) return;

    const previousPoint = currentStroke.points[currentStroke.points.length - 1];
    if (
      previousPoint
      && getPointDistance(previousPoint, point) < minimumDistance
    ) {
      return;
    }

    const interpolatedPoints = previousPoint
      ? getInterpolatedStrokePoints(previousPoint, point)
      : [point];
    if (interpolatedPoints.length === 0) return;

    activeStrokeRef.current = {
      color: currentStroke.color,
      points: currentStroke.points.concat(interpolatedPoints),
      tool: currentStroke.tool,
      width: currentStroke.width,
    };
    setActiveStroke(activeStrokeRef.current);
  };

  return (
    <View style={styles.boundarySection}>
      <View style={styles.boundaryHeader}>
        <View style={styles.boundaryHeaderText}>
          <Text style={styles.fieldLabel}>유적 경계 위 메모</Text>
          <Text style={styles.boundaryDetail} numberOfLines={1}>
            {boundaryDraft
              ? boundarySummary || `초기 경계 ${boundaryDraft.coordinates.length}점`
              : '처음 만든 유적 경계가 없습니다.'}
          </Text>
          <Text style={styles.boundaryFeatureCount}>
            {`해당 날짜까지 배치된 유구 ${featureOverlays.length}개`}
          </Text>
        </View>
        <View style={styles.boundaryActions}>
          <IconButton
            icon="open-in-full"
            isDisabled={!canEdit}
            onPress={() => setIsFullscreen(true)}
            testID="dailyJournalBoundaryFullscreen"
          />
          <IconButton
            icon="undo"
            isDisabled={!canEdit || strokes.length === 0}
            onPress={undoStroke}
            testID="dailyJournalBoundaryUndo"
          />
          <IconButton
            icon="delete-outline"
            isDanger
            isDisabled={!canEdit || strokes.length === 0}
            onPress={clearStrokes}
            testID="dailyJournalBoundaryClear"
          />
        </View>
      </View>
      <View style={styles.boundaryImportRow}>
        <TouchableOpacity
          accessibilityLabel="어제 경계 메모 가져오기"
          accessibilityState={{
            disabled: isImportDisabled || !yesterdaySource,
          }}
          activeOpacity={0.86}
          disabled={isImportDisabled || !yesterdaySource}
          onPress={() => yesterdaySource && onImportSource(yesterdaySource)}
          style={[
            styles.boundaryImportButton,
            (isImportDisabled || !yesterdaySource) && styles.disabledButton,
          ]}
          testID="dailyJournalBoundaryImportYesterday"
        >
          <MaterialIcons
            name="history"
            size={15}
            color={isImportDisabled || !yesterdaySource ? '#98a2b3' : '#175cd3'}
          />
          <Text style={[
            styles.boundaryImportButtonText,
            (isImportDisabled || !yesterdaySource) && styles.disabledButtonText,
          ]}>
            어제 것 가져오기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="특정 날짜의 경계 메모 고르기"
          accessibilityState={{
            disabled: isImportDisabled || importSources.length === 0,
            expanded: isImportDateListVisible,
          }}
          activeOpacity={0.86}
          disabled={isImportDisabled || importSources.length === 0}
          onPress={() => setIsImportDateListVisible((current) => !current)}
          style={[
            styles.boundaryImportButton,
            (isImportDisabled || importSources.length === 0)
              && styles.disabledButton,
          ]}
          testID="dailyJournalBoundaryToggleImportDates"
        >
          <MaterialIcons
            name="event-repeat"
            size={15}
            color={
              isImportDisabled || importSources.length === 0
                ? '#98a2b3'
                : '#175cd3'
            }
          />
          <Text style={[
            styles.boundaryImportButtonText,
            (isImportDisabled || importSources.length === 0)
              && styles.disabledButtonText,
          ]}>
            다른 날짜에서 가져오기
          </Text>
        </TouchableOpacity>
        <Text style={styles.boundaryImportState}>
          {hasMemoStrokes
            ? copiedFromDate
              ? `${formatBoundaryMemoSourceDate(copiedFromDate)} 메모를 이어 작성 중입니다.`
              : '이 날짜 메모가 있어 가져오기는 잠겼습니다.'
            : yesterdaySource
              ? '빈 메모로 시작하거나 어제 작업을 이어가세요.'
              : '이 날짜는 빈 메모로 시작합니다.'}
        </Text>
      </View>
      {isImportDateListVisible && (
        <ScrollView
          horizontal
          contentContainerStyle={styles.boundaryImportDateList}
          showsHorizontalScrollIndicator
          testID="dailyJournalBoundaryImportDateList"
        >
          {importSources.map((sourceDailyLog) => {
            const sourceDate = getStringField(sourceDailyLog, 'date');

            return (
              <TouchableOpacity
                accessibilityLabel={`${sourceDate} 경계 메모 가져오기`}
                activeOpacity={0.86}
                key={sourceDailyLog.resource.id}
                onPress={() => {
                  setIsImportDateListVisible(false);
                  onImportSource(sourceDailyLog);
                }}
                style={styles.boundaryImportDateButton}
                testID={`dailyJournalBoundaryImportDate_${sourceDate}`}
              >
                <Text style={styles.boundaryImportDateButtonText}>
                  {formatBoundaryMemoSourceDate(sourceDate)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <KoreanFieldworkBrushControls
        brushColor={brushColor}
        brushWidth={brushWidth}
        drawingTool={drawingTool}
        isDisabled={!canEdit}
        onSelectBrushColor={(color) => {
          setBrushColor(color);
          setDrawingTool('pen');
        }}
        onSelectBrushWidth={setBrushWidth}
        onSelectDrawingTool={setDrawingTool}
        testIDPrefix="dailyJournalBoundaryBrush"
      />
      <View
        onLayout={updateCanvasSize}
        onMoveShouldSetResponderCapture={() => canEdit}
        onMoveShouldSetResponder={() => canEdit}
        onResponderGrant={startStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={finishStroke}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponderCapture={() => canEdit}
        onStartShouldSetResponder={() => canEdit}
        style={styles.boundaryCanvas}
        testID="dailyJournalBoundaryCanvas"
      >
        {boundaryDraft ? (
          <>
            {toBoundarySegments(boundaryPoints)}
            {boundaryPoints.map((point, index) => (
              <View
                key={`point-${index}`}
                style={[
                  styles.boundaryVertex,
                  {
                    left: point.x - 4,
                    top: point.y - 4,
                  },
                ]}
              />
            ))}
            <Text style={styles.boundaryCanvasLabel}>조사 경계</Text>
          </>
        ) : (
          <View style={styles.boundaryEmpty}>
            <MaterialIcons name="polyline" size={20} color="#98a2b3" />
            <Text style={styles.boundaryEmptyText}>
              새 프로젝트에서 그린 경계를 찾지 못했습니다.
            </Text>
          </View>
        )}
        {featureOverlays.flatMap((overlay, overlayIndex) =>
          toFeatureOverlayElements(
            overlay,
            overlayIndex,
            canvasSize,
            boundaryAspectRatio
          )
        )}
        {visibleStrokes.flatMap((stroke, strokeIndex) =>
          toStrokeSegments(
            stroke,
            strokeIndex,
            canvasSize,
            boundaryAspectRatio
          )
        )}
      </View>
      <KoreanFieldworkFullscreenDrawingModal
        background={fullscreenBackground}
        brushColor={brushColor}
        brushWidth={brushWidth}
        drawingTool={drawingTool}
        isVisible={isFullscreen}
        onBrushColorChange={(color) => {
          setBrushColor(color);
          setDrawingTool('pen');
        }}
        onBrushWidthChange={setBrushWidth}
        onClose={() => setIsFullscreen(false)}
        onDrawingToolChange={setDrawingTool}
        onUpdateStrokes={commitStrokes}
        strokes={latestStrokesRef.current}
        testIDPrefix="dailyJournalBoundary"
        title={'\uc720\uc801 \uacbd\uacc4 \uc704 \uba54\ubaa8'}
      />
      <Text style={styles.boundaryHint}>
        제토 범위, 노출 유구, 유물 출토 지점처럼 하루 작업 상황을 펜으로 표시합니다.
        {` ${formatFullDate(selectedDate)} 기록에만 따로 저장됩니다.`}
        {hasMemoStrokes ? ' 저장된 메모가 있습니다.' : ''}
      </Text>
    </View>
  );
};

const JournalMetric: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  warning?: boolean;
}> = ({ icon, label, value, warning = false }) => (
  <View style={[styles.metric, warning && styles.metricWarning]}>
    <MaterialIcons
      name={icon}
      size={16}
      color={warning ? '#b54708' : '#175cd3'}
    />
    <View style={styles.metricText}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, warning && styles.warningText]}>
        {value}
      </Text>
    </View>
  </View>
);

const PersonnelInput: React.FC<{
  editable: boolean;
  keyboardType?: 'default' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  onEndEditing: () => void;
  placeholder?: string;
  testID: string;
  value: string;
}> = ({
  editable,
  keyboardType = 'default',
  label,
  onChangeText,
  onEndEditing,
  placeholder,
  testID,
  value,
}) => (
  <View style={styles.personnelField}>
    <Text style={styles.personnelLabel}>{label}</Text>
    <TextInput
      editable={editable}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      onEndEditing={onEndEditing}
      placeholder={placeholder ?? '0'}
      style={styles.workerInput}
      testID={testID}
      value={value}
    />
  </View>
);

const SafetyToggle: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  isActive: boolean;
  isDisabled: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}> = ({
  icon,
  isActive,
  isDisabled,
  label,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    disabled={isDisabled}
    onPress={onPress}
    style={[
      styles.safetyToggle,
      isActive && styles.safetyToggleActive,
      isDisabled && styles.disabledButton,
    ]}
    testID={testID}
  >
    <MaterialIcons
      name={icon}
      size={15}
      color={isActive ? '#027a48' : '#667085'}
    />
    <Text
      style={[
        styles.safetyToggleText,
        isActive && styles.safetyToggleTextActive,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const IconButton: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  isDanger?: boolean;
  isDisabled: boolean;
  onPress: () => void;
  testID: string;
}> = ({
  icon,
  isDanger = false,
  isDisabled,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    disabled={isDisabled}
    onPress={onPress}
    style={[styles.iconButton, isDisabled && styles.disabledButton]}
    testID={testID}
  >
    <MaterialIcons
      name={icon}
      size={15}
      color={isDisabled ? '#98a2b3' : isDanger ? '#b42318' : '#475467'}
    />
  </TouchableOpacity>
);

interface CalendarDayItem {
  date: Date;
  day: string;
  isSelected: boolean;
  isToday: boolean;
  key: string;
  weekday: string;
}

const getCalendarWeek = (
  visibleDate: Date,
  today: Date,
  selectedDate: Date
): CalendarDayItem[] => {
  const start = new Date(visibleDate);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);

  return ['월', '화', '수', '목', '금', '토', '일'].map((weekday, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    return {
      date: day,
      day: String(day.getDate()),
      isSelected: isSameDate(day, selectedDate),
      isToday: isSameDate(day, today),
      key: formatDateKey(day),
      weekday,
    };
  });
};

const addDays = (date: Date, amount: number): Date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const formatWeekRange = (dayItems: CalendarDayItem[]): string => {
  const firstDay = dayItems[0]?.date;
  const lastDay = dayItems[dayItems.length - 1]?.date;
  if (!firstDay || !lastDay) return '';

  if (firstDay.getFullYear() !== lastDay.getFullYear()) {
    return `${firstDay.getFullYear()}. ${firstDay.getMonth() + 1}. ${
      firstDay.getDate()
    }. - ${lastDay.getFullYear()}. ${lastDay.getMonth() + 1}. ${
      lastDay.getDate()
    }.`;
  }

  return `${firstDay.getFullYear()}. ${firstDay.getMonth() + 1}. ${
    firstDay.getDate()
  }. - ${lastDay.getMonth() + 1}. ${lastDay.getDate()}.`;
};

const isSameDate = (dateA: Date, dateB: Date): boolean =>
  dateA.getFullYear() === dateB.getFullYear()
  && dateA.getMonth() === dateB.getMonth()
  && dateA.getDate() === dateB.getDate();

const formatFullDate = (date: Date): string =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

const formatDateKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const formatBoundaryMemoSourceDate = (dateKey: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;

  return `${Number(match[2])}월 ${Number(match[3])}일`;
};

export const getKoreanFieldworkBoundaryMemoSourceLogs = (
  dailyLogs: readonly Document[],
  selectedDate: Date
): Document[] => {
  const selectedDateKey = formatDateKey(selectedDate);
  const sourcesByDate = new Map<string, Document>();

  dailyLogs.forEach((dailyLog) => {
    const dateKey = getStringField(dailyLog, 'date');
    const strokes = normalizeKoreanFieldworkHandwritingStrokes(
      getResourceValue(dailyLog, FIELD.boundaryMemoStrokes)
    );
    if (
      !isDateKey(dateKey)
      || dateKey >= selectedDateKey
      || !hasKoreanFieldworkHandwriting(strokes)
    ) {
      return;
    }

    sourcesByDate.set(dateKey, dailyLog);
  });

  return Array.from(sourcesByDate.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([, dailyLog]) => dailyLog);
};

const isDateKey = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

interface PersonnelDraft {
  equipmentCount: string;
  equipmentSize: string;
  investigatorCount: string;
  laborerCount: string;
}

const getPersonnelDraft = (
  document: Document | undefined
): PersonnelDraft => ({
  equipmentCount: getCountText(document, FIELD.equipmentCount),
  equipmentSize: getStringField(document, FIELD.equipmentSize),
  investigatorCount: getCountText(document, FIELD.investigatorCount),
  laborerCount: getCountText(document, FIELD.laborerCount),
});

const getPersonnelSummary = (
  document: Document | undefined
): { isEmpty: boolean; text: string } => {
  const investigatorCount = getCountText(document, FIELD.investigatorCount);
  const laborerCount = getCountText(document, FIELD.laborerCount);
  const equipmentCount = getCountText(document, FIELD.equipmentCount);
  const equipmentSize = getStringField(document, FIELD.equipmentSize);
  const parts = [
    investigatorCount ? `조사원 ${investigatorCount}` : undefined,
    laborerCount ? `인부 ${laborerCount}` : undefined,
    equipmentCount ? `장비 ${equipmentCount}` : undefined,
    equipmentSize ? `크기 ${equipmentSize}` : undefined,
  ].filter((part): part is string => !!part);

  if (parts.length > 0) return { isEmpty: false, text: parts.join(' · ') };

  const legacyWorkerCount = getCountText(document, FIELD.workerCount);
  return legacyWorkerCount
    ? { isEmpty: false, text: `작업자 ${legacyWorkerCount}` }
    : { isEmpty: true, text: '미입력' };
};

const getCountText = (
  document: Document | undefined,
  fieldName: string
): string => {
  const value = getResourceValue(document, fieldName);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.replace(/[^\d]/g, '');

  return '';
};

const normalizeCount = (value: string): number | undefined => {
  const parsed = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const normalizeText = (value: string): string => value.trim();

const createDiaryAbstract = (value: string): string | undefined => {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  if (!normalizedValue) return undefined;
  if (normalizedValue.length <= 120) return normalizedValue;

  return `${normalizedValue.slice(0, 117)}...`;
};

const countToText = (value: number | undefined): string =>
  value === undefined ? '' : String(value);

const sumCounts = (
  ...counts: (number | undefined)[]
): number | undefined => {
  const total = counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
  return total > 0 ? total : undefined;
};

const getBooleanField = (
  document: Document | undefined,
  fieldName: string
): boolean => getResourceValue(document, fieldName) === true;

const getStringField = (
  document: Document | undefined,
  fieldName: string
): string => {
  const value = getResourceValue(document, fieldName);
  return typeof value === 'string' ? value.trim() : '';
};

const getResourceValue = (
  document: Document | undefined,
  fieldName: string
): unknown => (document?.resource as unknown as Record<string, unknown> | undefined)
  ?.[fieldName];

export const getKoreanFieldworkDailyJournalBoundaryDraft = (
  dailyLog: Document | undefined,
  fallbackBoundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined
): KoreanFieldworkProjectBoundaryDraft | undefined => {
  const snapshot = getStringField(
    dailyLog,
    FIELD.boundaryMemoBoundarySnapshot
  );
  if (!snapshot) return fallbackBoundaryDraft;

  try {
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;
    if (!parsed || !Array.isArray(parsed.coordinates)) {
      return fallbackBoundaryDraft;
    }
    const coordinates = parsed.coordinates
      .filter((coordinate): coordinate is Record<string, unknown> =>
        !!coordinate && typeof coordinate === 'object')
      .map((coordinate) => ({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      }))
      .filter((coordinate): coordinate is {
        latitude: number;
        longitude: number;
      } =>
        typeof coordinate.latitude === 'number'
        && Number.isFinite(coordinate.latitude)
        && typeof coordinate.longitude === 'number'
        && Number.isFinite(coordinate.longitude));

    return coordinates.length >= 3
      ? {
        ...parsed,
        coordinates,
      } as unknown as KoreanFieldworkProjectBoundaryDraft
      : fallbackBoundaryDraft;
  } catch {
    return fallbackBoundaryDraft;
  }
};

const serializeBoundaryDraft = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined
): string | undefined => boundaryDraft
  ? JSON.stringify(boundaryDraft)
  : undefined;

export const getBoundaryPlanBackground = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined
): FieldworkFullscreenDrawingBackground | undefined => {
  const projection = getBoundaryProjection(boundaryDraft);
  if (!projection) return undefined;

  const padding = MAX_COORDINATE * PLAN_PADDING_RATIO;
  const drawableSize = MAX_COORDINATE - (padding * 2);

  return {
    aspectRatio: clamp(
      projection.xRange / Math.max(projection.yRange, 0.000001),
      0.05,
      20
    ),
    boundaryPoints: projection.projectedPoints.map((point) => ({
      x: normalizeCoordinate(
        padding
        + ((point.x - projection.minX) / Math.max(projection.xRange, 0.000001))
        * drawableSize
      ),
      y: normalizeCoordinate(
        padding
        + ((projection.maxY - point.y) / Math.max(projection.yRange, 0.000001))
        * drawableSize
      ),
    })),
  };
};

export const getBoundaryCanvasPoints = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined,
  canvasSize: { height: number; width: number }
): { x: number; y: number }[] => {
  const projection = getBoundaryProjection(boundaryDraft);
  if (!projection) return [];

  const padding = 24;
  const drawableWidth = Math.max(canvasSize.width - (padding * 2), 1);
  const drawableHeight = Math.max(canvasSize.height - (padding * 2), 1);
  const scale = Math.min(
    drawableWidth / Math.max(projection.xRange, 0.000001),
    drawableHeight / Math.max(projection.yRange, 0.000001)
  );
  const fittedWidth = projection.xRange * scale;
  const fittedHeight = projection.yRange * scale;
  const offsetX = (canvasSize.width - fittedWidth) / 2;
  const offsetY = (canvasSize.height - fittedHeight) / 2;

  return projection.projectedPoints.map((point) => ({
    x: offsetX + ((point.x - projection.minX) * scale),
    y: offsetY + ((projection.maxY - point.y) * scale),
  }));
};

const getBoundaryProjection = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined
) => {
  if (!boundaryDraft || boundaryDraft.coordinates.length === 0) {
    return undefined;
  }

  const averageLatitude = boundaryDraft.coordinates.reduce(
    (sum, point) => sum + point.latitude,
    0
  ) / boundaryDraft.coordinates.length;
  const longitudeScale = Math.max(
    Math.cos((averageLatitude * Math.PI) / 180),
    0.000001
  );
  const projectedPoints = boundaryDraft.coordinates.map((point) => ({
    x: point.longitude * longitudeScale,
    y: point.latitude,
  }));
  const xs = projectedPoints.map((point) => point.x);
  const ys = projectedPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    maxY,
    minX,
    minY,
    projectedPoints,
    xRange: Math.max(maxX - minX, 0.000001),
    yRange: Math.max(maxY - minY, 0.000001),
  };
};

const getNormalizedPoint = (
  event: GestureResponderEvent,
  canvasSize: { height: number; width: number },
  aspectRatio = 1
): KoreanFieldworkHandwritingPoint | undefined => {
  const { locationX, locationY } = getLocalTouchPoint(event);
  if (typeof locationX !== 'number' || typeof locationY !== 'number') {
    return undefined;
  }
  const viewport = getDrawingViewport(canvasSize, aspectRatio);
  if (
    locationX < viewport.left
    || locationX > viewport.left + viewport.width
    || locationY < viewport.top
    || locationY > viewport.top + viewport.height
  ) {
    return undefined;
  }

  return {
    x: normalizeCoordinate(
      ((locationX - viewport.left) / viewport.width) * MAX_COORDINATE
    ),
    y: normalizeCoordinate(
      ((locationY - viewport.top) / viewport.height) * MAX_COORDINATE
    ),
  };
};

const getLocalTouchPoint = (event: GestureResponderEvent): {
  locationX?: number;
  locationY?: number;
} => {
  const nativeEvent = event.nativeEvent as unknown as {
    changedTouches?: TouchPointCandidate[];
    locationX?: number;
    locationY?: number;
    touches?: TouchPointCandidate[];
  };
  const localTouch = [
    ...(nativeEvent.touches ?? []),
    ...(nativeEvent.changedTouches ?? []),
  ].find(hasLocalTouchCoordinates);

  return {
    locationX: localTouch?.locationX ?? localTouch?.x ?? nativeEvent.locationX,
    locationY: localTouch?.locationY ?? localTouch?.y ?? nativeEvent.locationY,
  };
};

interface TouchPointCandidate {
  locationX?: number;
  locationY?: number;
  x?: number;
  y?: number;
}

const hasLocalTouchCoordinates = (
  value: TouchPointCandidate
): boolean =>
  Number.isFinite(value.locationX ?? value.x)
  && Number.isFinite(value.locationY ?? value.y);

const normalizeCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COORDINATE, Math.round(value)))
    : 0;

const denormalizePoint = (
  point: KoreanFieldworkHandwritingPoint,
  canvasSize: { height: number; width: number },
  aspectRatio = 1
) => {
  const viewport = getDrawingViewport(canvasSize, aspectRatio);

  return {
    x: viewport.left + ((point.x / MAX_COORDINATE) * viewport.width),
    y: viewport.top + ((point.y / MAX_COORDINATE) * viewport.height),
  };
};

const mapNormalizedPointsToCanvas = (
  points: readonly { x: number; y: number }[],
  canvasSize: { height: number; width: number },
  aspectRatio = 1
): { x: number; y: number }[] =>
  points.map((point) => denormalizePoint(point, canvasSize, aspectRatio));

const getDrawingViewport = (
  canvasSize: { height: number; width: number },
  aspectRatio = 1
) => {
  const safeAspectRatio = clamp(aspectRatio, 0.05, 20);
  const canvasAspectRatio = canvasSize.width / Math.max(canvasSize.height, 1);
  let width = canvasSize.width;
  let height = canvasSize.height;

  if (canvasAspectRatio > safeAspectRatio) {
    width = height * safeAspectRatio;
  } else {
    height = width / safeAspectRatio;
  }

  return {
    height,
    left: (canvasSize.width - width) / 2,
    top: (canvasSize.height - height) / 2,
    width,
  };
};

const getPointDistance = (
  pointA: KoreanFieldworkHandwritingPoint,
  pointB: KoreanFieldworkHandwritingPoint
): number => Math.sqrt(
  ((pointB.x - pointA.x) ** 2) + ((pointB.y - pointA.y) ** 2)
);

const getInterpolatedStrokePoints = (
  start: KoreanFieldworkHandwritingPoint,
  end: KoreanFieldworkHandwritingPoint
): KoreanFieldworkHandwritingPoint[] => {
  const distance = getPointDistance(start, end);
  if (distance === 0) return [];

  const steps = clamp(
    Math.ceil(distance / INTERPOLATED_POINT_SPACING),
    1,
    MAX_INTERPOLATED_POINTS_PER_MOVE
  );

  return Array.from({ length: steps }, (_, index) => {
    const ratio = (index + 1) / steps;

    return {
      x: normalizeCoordinate(start.x + ((end.x - start.x) * ratio)),
      y: normalizeCoordinate(start.y + ((end.y - start.y) * ratio)),
    };
  });
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toBoundarySegments = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return [];

  return points.map((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    return (
      <LineSegment
        color="#175cd3"
        end={nextPoint}
        key={`boundary-${index}`}
        start={point}
        width={2}
      />
    );
  });
};

const toFeatureOverlayElements = (
  overlay: KoreanFieldworkDailyJournalFeatureOverlay,
  overlayIndex: number,
  canvasSize: { height: number; width: number },
  aspectRatio = 1
): React.ReactElement[] => {
  const elements: React.ReactElement[] = [];

  overlay.guidePaths.forEach((path, pathIndex) => {
    const points = mapNormalizedPointsToCanvas(
      path.points,
      canvasSize,
      aspectRatio
    );
    const color = path.strokeColor ?? '#0f766e';
    const width = clamp(path.width ?? 2, 1, 8);

    if (points.length === 1) {
      const point = points[0];
      const size = Math.max(8, width * 3);
      elements.push(
        <View
          key={`feature-${overlayIndex}-${pathIndex}-dot`}
          pointerEvents="none"
          style={[
            styles.featureGuideDot,
            {
              backgroundColor: path.fillColor ?? 'rgba(15,118,110,0.15)',
              borderColor: color,
              borderRadius: size / 2,
              height: size,
              left: point.x - (size / 2),
              top: point.y - (size / 2),
              width: size,
            },
          ]}
          testID="dailyJournalFeatureGuidePath"
        />
      );
      return;
    }

    const pathSegments = points.slice(1).map((point, pointIndex) => (
      <LineSegment
        color={color}
        end={point}
        key={`feature-${overlayIndex}-${pathIndex}-${pointIndex}`}
        start={points[pointIndex]}
        testID="dailyJournalFeatureGuidePath"
        width={width}
      />
    ));
    if (path.closed && points.length >= 3) {
      pathSegments.push(
        <LineSegment
          color={color}
          end={points[0]}
          key={`feature-${overlayIndex}-${pathIndex}-closed`}
          start={points[points.length - 1]}
          testID="dailyJournalFeatureGuidePath"
          width={width}
        />
      );
    }
    elements.push(...pathSegments);
  });

  const center = denormalizePoint(overlay.center, canvasSize, aspectRatio);
  elements.push(
    <Text
      key={`feature-${overlayIndex}-label`}
      numberOfLines={1}
      style={[
        styles.featureGuideLabel,
        {
          left: clamp(center.x + 5, 3, Math.max(canvasSize.width - 95, 3)),
          top: clamp(center.y - 11, 3, Math.max(canvasSize.height - 23, 3)),
        },
      ]}
      testID={`dailyJournalFeatureOverlay_${overlay.id}`}
    >
      {overlay.label}
    </Text>
  );

  return elements;
};

const toStrokeSegments = (
  stroke: KoreanFieldworkHandwritingStroke,
  strokeIndex: number,
  canvasSize: { height: number; width: number },
  aspectRatio = 1
) => {
  const strokeWidth = getStrokeWidth(stroke);
  const strokeColor = getBoundaryMemoStrokeColor(stroke);

  if (stroke.points.length === 1) {
    const point = denormalizePoint(stroke.points[0], canvasSize, aspectRatio);

    return (
      <View
        key={`${strokeIndex}-dot`}
        style={[
          styles.strokeDot,
          {
            backgroundColor: strokeColor,
            height: strokeWidth + 3,
            left: point.x - ((strokeWidth + 3) / 2),
            borderRadius: (strokeWidth + 3) / 2,
            top: point.y - ((strokeWidth + 3) / 2),
            width: strokeWidth + 3,
          },
        ]}
      />
    );
  }

  const smoothedPoints = getSmoothedBoundaryMemoStrokePoints(
    stroke,
    canvasSize,
    aspectRatio
  );
  const segments = smoothedPoints.slice(1).map((point, pointIndex) => {
    const previousPoint = smoothedPoints[pointIndex];

    return (
      <LineSegment
        color={strokeColor}
        end={point}
        key={`${strokeIndex}-${pointIndex}`}
        start={previousPoint}
        testID="dailyJournalBoundaryStrokeSegment"
        width={strokeWidth}
      />
    );
  });
  const joints = smoothedPoints.map((point, pointIndex) => (
    <View
      key={`${strokeIndex}-joint-${pointIndex}`}
      pointerEvents="none"
      style={[
        styles.strokeJoint,
        {
          backgroundColor: strokeColor,
          borderRadius: strokeWidth / 2,
          height: strokeWidth,
          left: point.x - (strokeWidth / 2),
          top: point.y - (strokeWidth / 2),
          width: strokeWidth,
        },
      ]}
      testID="dailyJournalBoundaryStrokeJoint"
    />
  ));

  return segments.concat(joints);
};

const getStrokeWidth = (stroke: KoreanFieldworkHandwritingStroke): number =>
  clamp(stroke.width ?? 3, 1, 24);

const getBoundaryMemoStrokeColor = (
  stroke: KoreanFieldworkHandwritingStroke
): string => stroke.tool === 'eraser'
  ? BOUNDARY_MEMO_ERASER_COLOR
  : stroke.color ?? BOUNDARY_MEMO_STROKE_COLOR;

const getSmoothedBoundaryMemoStrokePoints = (
  stroke: KoreanFieldworkHandwritingStroke,
  canvasSize: { height: number; width: number },
  aspectRatio = 1
): { x: number; y: number }[] => {
  const points = stroke.points.map((point) =>
    denormalizePoint(point, canvasSize, aspectRatio));
  if (points.length < 3) return points;

  const smoothedPoints: { x: number; y: number }[] = [];

  points.slice(0, -1).forEach((point, index) => {
    const nextPoint = points[index + 1];
    const previousPoint = points[Math.max(index - 1, 0)];
    const followingPoint = points[Math.min(index + 2, points.length - 1)];
    const steps = clamp(
      Math.ceil(getPixelPointDistance(
        point,
        nextPoint
      ) / BOUNDARY_MEMO_SMOOTHING_SEGMENT_LENGTH),
      BOUNDARY_MEMO_MIN_SMOOTHING_STEPS,
      BOUNDARY_MEMO_MAX_SMOOTHING_STEPS
    );

    for (let step = 0; step < steps; step += 1) {
      const smoothedPoint = getCatmullRomPoint(
        previousPoint,
        point,
        nextPoint,
        followingPoint,
        step / steps,
        canvasSize
      );
      appendPixelPointIfDistinct(smoothedPoints, smoothedPoint);
    }
  });

  appendPixelPointIfDistinct(smoothedPoints, points[points.length - 1]);

  return smoothedPoints;
};

const getCatmullRomPoint = (
  point0: { x: number; y: number },
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number },
  t: number,
  canvasSize: { height: number; width: number }
): { x: number; y: number } => {
  const t2 = t * t;
  const t3 = t2 * t;

  return clampPixelPoint({
    x: 0.5 * (
      (2 * point1.x)
      + ((-point0.x + point2.x) * t)
      + (((2 * point0.x) - (5 * point1.x) + (4 * point2.x) - point3.x) * t2)
      + ((-point0.x + (3 * point1.x) - (3 * point2.x) + point3.x) * t3)
    ),
    y: 0.5 * (
      (2 * point1.y)
      + ((-point0.y + point2.y) * t)
      + (((2 * point0.y) - (5 * point1.y) + (4 * point2.y) - point3.y) * t2)
      + ((-point0.y + (3 * point1.y) - (3 * point2.y) + point3.y) * t3)
    ),
  }, canvasSize);
};

const appendPixelPointIfDistinct = (
  points: { x: number; y: number }[],
  point: { x: number; y: number }
) => {
  const previousPoint = points[points.length - 1];
  if (
    previousPoint
    && Math.round(previousPoint.x) === Math.round(point.x)
    && Math.round(previousPoint.y) === Math.round(point.y)
  ) {
    return;
  }

  points.push(point);
};

const clampPixelPoint = (
  point: { x: number; y: number },
  canvasSize: { height: number; width: number }
): { x: number; y: number } => ({
  x: clamp(point.x, 0, canvasSize.width),
  y: clamp(point.y, 0, canvasSize.height),
});

const getPixelPointDistance = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): number => Math.sqrt(((end.x - start.x) ** 2) + ((end.y - start.y) ** 2));

const LineSegment: React.FC<{
  color: string;
  end: { x: number; y: number };
  start: { x: number; y: number };
  testID?: string;
  width: number;
}> = ({ color, end, start, testID, width }) => {
  const distance = Math.sqrt(((end.x - start.x) ** 2) + ((end.y - start.y) ** 2));
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: width,
        height: width,
        left: ((start.x + end.x) / 2) - (distance / 2),
        position: 'absolute',
        top: ((start.y + end.y) / 2) - (width / 2),
        transform: [{ rotateZ: `${angle}rad` }],
        width: distance,
      }}
      testID={testID}
    />
  );
};

const getSaveStatusText = (
  status: 'saved'|'saving'|'error'
): string => {
  switch (status) {
    case 'saving':
      return '작업일지를 저장하는 중입니다.';
    case 'error':
      return '작업일지를 저장하지 못했습니다.';
    default:
      return '작업일지에 반영했습니다.';
  }
};

const getWorkMemoStateText = (
  hasSavedWorkMemo: boolean,
  isDirty: boolean,
  saveStatus: 'saved'|'saving'|'error'|undefined
): string => {
  if (saveStatus === 'saving') return '저장 중';
  if (saveStatus === 'error') return '저장 실패 · 다시 확인';
  if (isDirty) return hasSavedWorkMemo ? '수정 중 · 저장 필요' : '작성 중 · 저장 필요';
  if (hasSavedWorkMemo) return '저장된 일지';

  return '새 일지 작성';
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderColor: '#b2ddff',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: '#175cd3',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 6,
  },
  dateText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  openButton: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  openButtonText: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  disabledButton: {
    backgroundColor: '#f2f4f7',
    borderColor: '#d0d5dd',
  },
  disabledButtonText: {
    color: '#98a2b3',
  },
  weekNavigationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weekNavigationButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 38,
  },
  weekRangeLabel: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '900',
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#eaecf0',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    marginRight: 5,
    minHeight: 58,
    justifyContent: 'center',
  },
  dayCellToday: {
    backgroundColor: '#eff8ff',
    borderColor: '#175cd3',
  },
  dayCellSelected: {
    backgroundColor: '#175cd3',
    borderColor: '#175cd3',
  },
  dayWeekday: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '900',
  },
  dayNumber: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  dayTextToday: {
    color: '#175cd3',
  },
  dayTextSelected: {
    color: 'white',
  },
  todayBadge: {
    color: '#175cd3',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 1,
  },
  todayBadgeSelected: {
    color: '#d1e9ff',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  metric: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    marginRight: 6,
    minHeight: 52,
    paddingHorizontal: 8,
  },
  metricWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fedf89',
  },
  metricText: {
    flex: 1,
    marginLeft: 6,
    minWidth: 0,
  },
  metricLabel: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '900',
  },
  metricValue: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  warningText: {
    color: '#b54708',
  },
  inputRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 10,
  },
  workerInputWrap: {
    flex: 1.45,
    marginRight: 8,
  },
  fieldLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
  },
  fieldHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workerInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 6,
  },
  personnelInputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  personnelField: {
    marginBottom: 6,
    width: '48.5%',
  },
  personnelLabel: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 3,
  },
  workerInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    color: '#1f2937',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    minHeight: 40,
    paddingHorizontal: 10,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginLeft: 6,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
  },
  workMemoSection: {
    borderTopColor: '#eaecf0',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  workMemoHeading: {
    flex: 1,
    minWidth: 0,
  },
  workMemoState: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  workMemoStateDirty: {
    color: '#b54708',
  },
  workMemoInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    color: '#101828',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    minHeight: 132,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  safetyWrap: {
    flex: 1,
  },
  safetyRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  safetyToggle: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginRight: 6,
    minHeight: 40,
  },
  safetyToggleActive: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  safetyToggleText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  safetyToggleTextActive: {
    color: '#027a48',
  },
  boundarySection: {
    borderTopColor: '#eaecf0',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  boundaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boundaryHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  boundaryDetail: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  boundaryFeatureCount: {
    color: '#0f766e',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  boundaryActions: {
    flexDirection: 'row',
  },
  boundaryImportRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  boundaryImportButton: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 5,
    marginRight: 6,
    minHeight: 34,
    paddingHorizontal: 9,
  },
  boundaryImportButtonText: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  boundaryImportState: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 15,
    marginBottom: 4,
  },
  boundaryImportDateList: {
    paddingBottom: 3,
    paddingRight: 6,
  },
  boundaryImportDateButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    minHeight: 32,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  boundaryImportDateButtonText: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '900',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginLeft: 5,
    width: 32,
  },
  boundaryCanvas: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: DEFAULT_CANVAS_SIZE.height,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  boundaryVertex: {
    backgroundColor: '#ffffff',
    borderColor: '#175cd3',
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    position: 'absolute',
    width: 8,
  },
  boundaryCanvasLabel: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 4,
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    top: 8,
  },
  featureGuideDot: {
    borderWidth: 2,
    position: 'absolute',
  },
  featureGuideLabel: {
    backgroundColor: 'rgba(240,253,250,0.9)',
    borderColor: '#99f6e4',
    borderRadius: 3,
    borderWidth: 1,
    color: '#115e59',
    fontSize: 9,
    fontWeight: '900',
    maxWidth: 90,
    paddingHorizontal: 3,
    paddingVertical: 1,
    position: 'absolute',
  },
  boundaryEmpty: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  boundaryEmptyText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  boundaryHint: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 6,
  },
  strokeDot: {
    backgroundColor: '#f97316',
    borderColor: '#7c2d12',
    borderRadius: 4,
    borderWidth: 1,
    position: 'absolute',
  },
  strokeJoint: {
    backgroundColor: '#f97316',
    position: 'absolute',
  },
  statusText: {
    color: '#027a48',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
  },
  statusTextError: {
    color: '#b42318',
  },
});

export default KoreanFieldworkDailyJournalCalendar;
