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
  countKoreanFieldworkHandwritingPoints,
  KoreanFieldworkHandwritingPoint,
  KoreanFieldworkHandwritingStroke,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from './korean-fieldwork-handwriting';

export const KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS = {
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
  workMemoUpdatedAt: 'dailyLogWorkMemoUpdatedAt',
} as const;

interface KoreanFieldworkDailyJournalCalendarProps {
  boundaryDraft?: KoreanFieldworkProjectBoundaryDraft;
  boundarySummary?: string;
  canEdit: boolean;
  dailyLog?: Document;
  isSaving?: boolean;
  now?: Date;
  onCreateDailyLog: () => Promise<void> | void;
  onOpenDailyLog?: (dailyLog: Document) => void;
  onUpdateDailyLog: (updates: Record<string, unknown>) => Promise<void> | void;
}

const MAX_COORDINATE = 10000;
const DEFAULT_CANVAS_SIZE = {
  height: 230,
  width: 320,
};
const MIN_POINT_DISTANCE = 80;
const FIELD = KOREAN_FIELDWORK_DAILY_JOURNAL_FIELDS;

const KoreanFieldworkDailyJournalCalendar: React.FC<
  KoreanFieldworkDailyJournalCalendarProps
> = ({
  boundaryDraft,
  boundarySummary,
  canEdit,
  dailyLog,
  isSaving = false,
  now = new Date(),
  onCreateDailyLog,
  onOpenDailyLog,
  onUpdateDailyLog,
}) => {
  const [personnelDraft, setPersonnelDraft] =
    useState(getPersonnelDraft(dailyLog));
  const [saveStatus, setSaveStatus] =
    useState<'saved'|'saving'|'error'|undefined>();
  const dayItems = useMemo(() => getCalendarWeek(now), [now]);
  const personnelSummary = getPersonnelSummary(dailyLog);
  const hasDailyLog = !!dailyLog;
  const safetyPhotoDone = getBooleanField(dailyLog, FIELD.safetyEducationPhoto);
  const safetyStretchingDone = getBooleanField(
    dailyLog,
    FIELD.safetyEducationStretching
  );
  const boundaryStrokes = normalizeKoreanFieldworkHandwritingStrokes(
    getResourceValue(dailyLog, FIELD.boundaryMemoStrokes)
  );
  const boundaryPointCount =
    countKoreanFieldworkHandwritingPoints(boundaryStrokes);

  useEffect(() => {
    setPersonnelDraft(getPersonnelDraft(dailyLog));
  }, [dailyLog]);

  const saveUpdates = async (updates: Record<string, unknown>) => {
    if (!canEdit) return;

    try {
      setSaveStatus('saving');
      await onUpdateDailyLog({
        ...updates,
        [FIELD.workMemoUpdatedAt]: new Date().toISOString(),
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
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
  const updateBoundaryStrokes = (serializedStrokes: string) => {
    saveUpdates({
      [FIELD.boundaryMemoImportedAt]: boundaryDraft
        ? getStringField(dailyLog, FIELD.boundaryMemoImportedAt)
          || new Date().toISOString()
        : undefined,
      [FIELD.boundaryMemoStrokes]: serializedStrokes,
      [FIELD.boundaryMemoUpdatedAt]: new Date().toISOString(),
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
          <Text style={styles.dateText}>{formatFullDate(now)}</Text>
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

      <View style={styles.weekRow}>
        {dayItems.map((day) => (
          <View
            key={day.key}
            style={[styles.dayCell, day.isToday && styles.dayCellToday]}
            testID={`dailyJournalDay_${day.key}`}
          >
            <Text
              style={[
                styles.dayWeekday,
                day.isToday && styles.dayTextToday,
              ]}
            >
              {day.weekday}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                day.isToday && styles.dayTextToday,
              ]}
            >
              {day.day}
            </Text>
          </View>
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
          value={boundaryPointCount > 0 ? `${boundaryPointCount}점` : '없음'}
          warning={boundaryPointCount === 0}
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

      <BoundaryMemoCanvas
        boundaryDraft={boundaryDraft}
        boundarySummary={boundarySummary}
        canEdit={canEdit && !isSaving}
        onUpdateStrokes={updateBoundaryStrokes}
        strokes={boundaryStrokes}
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
  onUpdateStrokes: (serializedStrokes: string) => void;
  strokes: KoreanFieldworkHandwritingStroke[];
}> = ({
  boundaryDraft,
  boundarySummary,
  canEdit,
  onUpdateStrokes,
  strokes,
}) => {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [activeStroke, setActiveStroke] =
    useState<KoreanFieldworkHandwritingStroke>();
  const activeStrokeRef = useRef<KoreanFieldworkHandwritingStroke>();
  const visibleStrokes = activeStroke ? strokes.concat(activeStroke) : strokes;
  const boundaryPoints = useMemo(
    () => getBoundaryCanvasPoints(boundaryDraft, canvasSize),
    [boundaryDraft, canvasSize]
  );
  const strokePointCount = countKoreanFieldworkHandwritingPoints(strokes);

  const updateCanvasSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) setCanvasSize({ height, width });
  };
  const startStroke = (event: GestureResponderEvent) => {
    if (!canEdit) return;

    const point = getNormalizedPoint(event, canvasSize);
    activeStrokeRef.current = { points: [point] };
    setActiveStroke(activeStrokeRef.current);
  };
  const moveStroke = (event: GestureResponderEvent) => {
    if (!canEdit) return;

    const point = getNormalizedPoint(event, canvasSize);
    const currentStroke = activeStrokeRef.current;
    if (!currentStroke) return;

    const previousPoint = currentStroke.points[currentStroke.points.length - 1];
    if (previousPoint && getPointDistance(previousPoint, point) < MIN_POINT_DISTANCE) {
      return;
    }

    activeStrokeRef.current = {
      points: currentStroke.points.concat(point),
    };
    setActiveStroke(activeStrokeRef.current);
  };
  const finishStroke = () => {
    if (!canEdit) return;

    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = undefined;
    setActiveStroke(undefined);

    if (!stroke || stroke.points.length === 0) return;

    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.concat(stroke)));
  };
  const undoStroke = () => {
    onUpdateStrokes(serializeKoreanFieldworkHandwriting(strokes.slice(0, -1)));
  };
  const clearStrokes = () => {
    onUpdateStrokes(serializeKoreanFieldworkHandwriting([]));
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
        </View>
        <View style={styles.boundaryActions}>
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
      <View
        onLayout={updateCanvasSize}
        onResponderGrant={startStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={finishStroke}
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
        {visibleStrokes.flatMap((stroke, strokeIndex) =>
          toStrokeSegments(stroke, strokeIndex, canvasSize)
        )}
      </View>
      <Text style={styles.boundaryHint}>
        제토 범위, 노출 유구, 유물 출토 지점처럼 하루 작업 상황을 펜으로 표시합니다.
        {strokePointCount > 0 ? ` 현재 ${strokePointCount}점 저장됨.` : ''}
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

const getCalendarWeek = (date: Date) => {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);

  return ['월', '화', '수', '목', '금', '토', '일'].map((weekday, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    return {
      day: String(day.getDate()),
      isToday: isSameDate(day, date),
      key: formatDateKey(day),
      weekday,
    };
  });
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

const countToText = (value: number | undefined): string =>
  value === undefined ? '' : String(value);

const sumCounts = (
  ...counts: Array<number | undefined>
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

const getBoundaryCanvasPoints = (
  boundaryDraft: KoreanFieldworkProjectBoundaryDraft | undefined,
  canvasSize: { height: number; width: number }
): { x: number; y: number }[] => {
  if (!boundaryDraft || boundaryDraft.coordinates.length === 0) return [];

  const longitudes = boundaryDraft.coordinates.map((point) => point.longitude);
  const latitudes = boundaryDraft.coordinates.map((point) => point.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.000001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.000001);
  const padding = 24;
  const drawableWidth = Math.max(canvasSize.width - (padding * 2), 1);
  const drawableHeight = Math.max(canvasSize.height - (padding * 2), 1);

  return boundaryDraft.coordinates.map((point) => ({
    x: padding + (((point.longitude - minLongitude) / longitudeRange)
      * drawableWidth),
    y: padding + (((maxLatitude - point.latitude) / latitudeRange)
      * drawableHeight),
  }));
};

const getNormalizedPoint = (
  event: GestureResponderEvent,
  canvasSize: { height: number; width: number }
): KoreanFieldworkHandwritingPoint => {
  const { locationX, locationY } = event.nativeEvent;

  return {
    x: normalizeCoordinate((locationX / canvasSize.width) * MAX_COORDINATE),
    y: normalizeCoordinate((locationY / canvasSize.height) * MAX_COORDINATE),
  };
};

const normalizeCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COORDINATE, Math.round(value)))
    : 0;

const denormalizePoint = (
  point: KoreanFieldworkHandwritingPoint,
  canvasSize: { height: number; width: number }
) => ({
  x: (point.x / MAX_COORDINATE) * canvasSize.width,
  y: (point.y / MAX_COORDINATE) * canvasSize.height,
});

const getPointDistance = (
  pointA: KoreanFieldworkHandwritingPoint,
  pointB: KoreanFieldworkHandwritingPoint
): number => Math.sqrt(
  ((pointB.x - pointA.x) ** 2) + ((pointB.y - pointA.y) ** 2)
);

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

const toStrokeSegments = (
  stroke: KoreanFieldworkHandwritingStroke,
  strokeIndex: number,
  canvasSize: { height: number; width: number }
) => {
  const strokeWidth = 3;

  if (stroke.points.length === 1) {
    const point = denormalizePoint(stroke.points[0], canvasSize);

    return (
      <View
        key={`${strokeIndex}-dot`}
        style={[
          styles.strokeDot,
          {
            height: strokeWidth + 3,
            left: point.x - ((strokeWidth + 3) / 2),
            top: point.y - ((strokeWidth + 3) / 2),
            width: strokeWidth + 3,
          },
        ]}
      />
    );
  }

  return stroke.points.slice(1).map((point, pointIndex) => {
    const previousPoint = stroke.points[pointIndex];

    return (
      <LineSegment
        color="#f97316"
        end={denormalizePoint(point, canvasSize)}
        key={`${strokeIndex}-${pointIndex}`}
        start={denormalizePoint(previousPoint, canvasSize)}
        width={strokeWidth}
      />
    );
  });
};

const LineSegment: React.FC<{
  color: string;
  end: { x: number; y: number };
  start: { x: number; y: number };
  width: number;
}> = ({ color, end, start, width }) => {
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
  weekRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#eaecf0',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    marginRight: 5,
    minHeight: 48,
    justifyContent: 'center',
  },
  dayCellToday: {
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
    color: 'white',
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
  boundaryActions: {
    flexDirection: 'row',
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
