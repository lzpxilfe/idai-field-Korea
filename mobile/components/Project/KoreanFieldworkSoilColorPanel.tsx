import { MaterialIcons } from '@expo/vector-icons';
import {
  CategoryForm,
  NewResource,
} from 'idai-field-core';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';
import { extractMunsellCandidateOptions } from './soil-color-photo-assist';

interface KoreanFieldworkSoilColorPanelProps {
  category: CategoryForm;
  resource: NewResource;
  onUpdateResourceField: (fieldName: string, value: unknown) => void;
  onUpdateResourceFields?: (updates: Record<string, unknown>) => void;
}

interface SoilColorOption {
  value: string;
  label: string;
}

interface SoilColorLayerRow {
  number: number;
  value: string;
}

const C = KOREAN_FIELDWORK_CATEGORIES;

const SOIL_COLOR_FIELDS = {
  activeLayerNumber: 'soilProfileActiveLayerNumber',
  assistCandidates: 'soilColorAssistCandidates',
  assistStatus: 'soilColorAssistStatus',
  manualMunsell: 'soilColorMunsellManual',
  moistureState: 'soilColorMoistureState',
  profileColorNote: 'soilProfileColorNote',
  profileColorSwatches: 'soilProfileColorSwatches',
  soilColorNote: 'soilColorNote',
} as const;

const MUNSELL_HUE_NUMBER_OPTIONS: readonly SoilColorOption[] =
  ['2.5', '5', '7.5', '10'].map((value) => ({ value, label: value }));

const MUNSELL_HUE_FAMILY_OPTIONS: readonly SoilColorOption[] = [
  'R',
  'YR',
  'Y',
  'GY',
  'G',
  'BG',
  'B',
  'PB',
  'P',
  'RP',
  'GLEY 1',
  'GLEY 2',
  'N',
].map((value) => ({ value, label: value }));

const MUNSELL_VALUE_OPTIONS: readonly SoilColorOption[] =
  ['1', '2', '2.5', '3', '4', '5', '6', '7', '8', '9'].map((value) => ({
    value,
    label: value,
  }));

const MUNSELL_CHROMA_OPTIONS: readonly SoilColorOption[] =
  ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12'].map((value) => ({
    value,
    label: `/${value}`,
  }));

const MOISTURE_OPTIONS: readonly SoilColorOption[] = [
  { value: 'dry', label: '건조' },
  { value: 'moist', label: '습윤' },
  { value: 'wet', label: '젖음' },
  { value: 'unclear', label: '불명확' },
];

const KoreanFieldworkSoilColorPanel: React.FC<KoreanFieldworkSoilColorPanelProps> = ({
  category,
  resource,
  onUpdateResourceField,
  onUpdateResourceFields,
}) => {
  const fieldNames = useMemo(
    () => new Set(category.groups.flatMap((group) =>
      group.fields.map((field) => field.name)
    )),
    [category]
  );
  const isLayer = resource.category === C.LAYER;
  const isSoilProfilePhoto = resource.category === C.SOIL_PROFILE_PHOTO;
  const canRecordLayerMunsell =
    isLayer && fieldNames.has(SOIL_COLOR_FIELDS.manualMunsell);
  const canRecordPhotoSwatches =
    isSoilProfilePhoto && fieldNames.has(SOIL_COLOR_FIELDS.profileColorSwatches);
  const hasAssistCandidates =
    fieldNames.has(SOIL_COLOR_FIELDS.assistCandidates);
  const assistCandidateText = getTextValue(
    resource,
    SOIL_COLOR_FIELDS.assistCandidates
  );
  const assistCandidateOptions = extractMunsellCandidateOptions(
    assistCandidateText
  ).map((value) => ({ value, label: value }));
  const soilColorRows = useMemo(
    () => getSoilColorRows(getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches)),
    [resource]
  );
  const [selectedRowNumber, setSelectedRowNumber] = useState(
    getActiveLayerNumber(resource) ?? 1
  );
  const [editingRowNumber, setEditingRowNumber] = useState<number>();
  const [rowNumberInput, setRowNumberInput] = useState('');
  const [builderHueNumber, setBuilderHueNumber] = useState('10');
  const [builderHueFamily, setBuilderHueFamily] = useState('YR');
  const [builderValue, setBuilderValue] = useState('4');
  const [builderChroma, setBuilderChroma] = useState('3');
  const activeRowNumber = soilColorRows.some((row) => row.number === selectedRowNumber)
    ? selectedRowNumber
    : soilColorRows[0]?.number ?? 1;
  const builderMunsell = formatMunsell(
    builderHueNumber,
    builderHueFamily,
    builderValue,
    builderChroma
  );

  if (!canRecordLayerMunsell && !canRecordPhotoSwatches) return null;

  const updateFields = (updates: Record<string, unknown>) => {
    if (onUpdateResourceFields) {
      onUpdateResourceFields(updates);
      return;
    }

    Object.entries(updates).forEach(([fieldName, value]) =>
      onUpdateResourceField(fieldName, value)
    );
  };

  const selectLayerRow = (rowNumber: number) => {
    setSelectedRowNumber(rowNumber);
    onUpdateResourceField(SOIL_COLOR_FIELDS.activeLayerNumber, rowNumber);
  };

  const openLayerNumberEditor = (rowNumber: number) => {
    selectLayerRow(rowNumber);
    setRowNumberInput(String(rowNumber));
    setEditingRowNumber(rowNumber);
  };

  const closeLayerNumberEditor = () => {
    setEditingRowNumber(undefined);
    setRowNumberInput('');
  };

  const applyLayerNumberEdit = () => {
    if (!editingRowNumber) return;

    const nextRowNumber = Number.parseInt(rowNumberInput.trim(), 10);
    if (!Number.isFinite(nextRowNumber) || nextRowNumber < 1) return;

    const nextValue = renameSoilColorRowNumber(
      getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
      editingRowNumber,
      nextRowNumber
    );

    updateFields({
      [SOIL_COLOR_FIELDS.profileColorSwatches]: nextValue,
      [SOIL_COLOR_FIELDS.activeLayerNumber]: nextRowNumber,
    });
    setSelectedRowNumber(nextRowNumber);
    closeLayerNumberEditor();
  };

  const applyMunsellValue = (value: string) => {
    if (canRecordLayerMunsell) {
      updateFields(getLayerMunsellUpdates(fieldNames, value));
      return;
    }

    if (canRecordPhotoSwatches) {
      updateFields({
        [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowValue(
          getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
          activeRowNumber,
          value
        ),
        [SOIL_COLOR_FIELDS.activeLayerNumber]: activeRowNumber,
      });
    }
  };

  const updateBuilder = (
    part: 'hueNumber' | 'hueFamily' | 'value' | 'chroma',
    nextValue: string
  ) => {
    const nextHueNumber = part === 'hueNumber' ? nextValue : builderHueNumber;
    const nextHueFamily = part === 'hueFamily' ? nextValue : builderHueFamily;
    const nextMunsellValue = part === 'value' ? nextValue : builderValue;
    const nextChroma = part === 'chroma' ? nextValue : builderChroma;

    if (part === 'hueNumber') setBuilderHueNumber(nextValue);
    if (part === 'hueFamily') setBuilderHueFamily(nextValue);
    if (part === 'value') setBuilderValue(nextValue);
    if (part === 'chroma') setBuilderChroma(nextValue);

    applyMunsellValue(formatMunsell(
      nextHueNumber,
      nextHueFamily,
      nextMunsellValue,
      nextChroma
    ));
  };

  const applyAssistCandidate = (value: string) => {
    if (canRecordLayerMunsell) {
      updateFields(getLayerMunsellUpdates(fieldNames, value));
      return;
    }

    if (canRecordPhotoSwatches) {
      updateFields({
        [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowValue(
          getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
          activeRowNumber,
          value
        ),
        [SOIL_COLOR_FIELDS.activeLayerNumber]: activeRowNumber,
        ...(fieldNames.has(SOIL_COLOR_FIELDS.assistStatus)
          ? { [SOIL_COLOR_FIELDS.assistStatus]: 'reviewed' }
          : {}),
      });
    }
  };

  return (
    <View style={styles.container} testID="koreanFieldworkSoilColorPanel">
      <View style={styles.headerTitleRow}>
        <MaterialIcons name="palette" size={18} color="#7a4b12" />
        <Text style={styles.title}>토색 기록</Text>
      </View>

      {canRecordPhotoSwatches && (
        <QuickSection title="층별 토색">
          {soilColorRows.map((row) => (
            <TouchableOpacity
              activeOpacity={0.86}
              key={row.number}
              onPress={() => selectLayerRow(row.number)}
              style={[
                styles.layerRow,
                row.number === activeRowNumber && styles.layerRowActive,
              ]}
              testID={`soilColorLayerSelect_${row.number}`}
            >
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => openLayerNumberEditor(row.number)}
                style={[
                  styles.layerNumber,
                  row.number === activeRowNumber && styles.layerNumberActive,
                ]}
                testID={`soilColorLayerNumberEdit_${row.number}`}
              >
                <Text
                  style={[
                    styles.layerNumberText,
                    row.number === activeRowNumber && styles.layerNumberTextActive,
                  ]}
                >
                  {row.number}
                </Text>
              </TouchableOpacity>
              <View style={styles.layerValueBox}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.layerValueText,
                    !row.value && styles.layerValuePlaceholder,
                  ]}
                  testID={`soilColorLayerValue_${row.number}`}
                >
                  {row.value || '먼셀값 없음'}
                </Text>
              </View>
              <MaterialIcons
                name="colorize"
                size={16}
                color={row.number === activeRowNumber ? '#175cd3' : '#98a2b3'}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => {
              const nextValue = appendEmptySoilColorRow(
                getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches)
              );
              const nextRows = getSoilColorRows(nextValue);
              const nextRowNumber = nextRows[nextRows.length - 1]?.number ?? 1;
              setSelectedRowNumber(nextRowNumber);
              updateFields({
                [SOIL_COLOR_FIELDS.profileColorSwatches]: nextValue,
                [SOIL_COLOR_FIELDS.activeLayerNumber]: nextRowNumber,
              });
            }}
            style={styles.addNumberButton}
            testID="soilColorAddNumberedSwatch"
          >
            <MaterialIcons name="add" size={16} color="#175cd3" />
            <Text style={styles.addNumberButtonText}>층 추가</Text>
          </TouchableOpacity>
          {hasAssistCandidates && (
            <LayerSampleCandidatePanel
              activeRowNumber={activeRowNumber}
              assistCandidateOptions={assistCandidateOptions}
              assistCandidateText={assistCandidateText}
              activeValue={soilColorRows.find((row) =>
                row.number === activeRowNumber)?.value}
              onPressCandidate={applyAssistCandidate}
            />
          )}
        </QuickSection>
      )}

      <QuickSection title="먼셀 조합">
        {canRecordPhotoSwatches && (
          <LayerNumberModal
            isVisible={editingRowNumber !== undefined}
            value={rowNumberInput}
            onApply={applyLayerNumberEdit}
            onChangeValue={setRowNumberInput}
            onClose={closeLayerNumberEditor}
          />
        )}
        <View style={styles.builderPreviewRow}>
          <Text style={styles.builderPreviewLabel}>
            {canRecordPhotoSwatches ? `${activeRowNumber}층에 입력` : '현재 먼셀값'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => applyMunsellValue(builderMunsell)}
            style={styles.builderPreviewButton}
            testID="soilColorApplyMunsellBuilder"
          >
            <Text style={styles.builderPreviewText}>{builderMunsell}</Text>
          </TouchableOpacity>
        </View>
        <LabeledPresetRow
          label="숫자"
          options={MUNSELL_HUE_NUMBER_OPTIONS}
          activeValue={builderHueNumber}
          onPress={(value) => updateBuilder('hueNumber', value)}
          testIDPrefix="soilColorHueNumberOption"
        />
        <LabeledPresetRow
          label="알파벳"
          options={MUNSELL_HUE_FAMILY_OPTIONS}
          activeValue={builderHueFamily}
          onPress={(value) => updateBuilder('hueFamily', value)}
          testIDPrefix="soilColorHueFamilyOption"
        />
        <LabeledPresetRow
          label="명도"
          options={MUNSELL_VALUE_OPTIONS}
          activeValue={builderValue}
          onPress={(value) => updateBuilder('value', value)}
          testIDPrefix="soilColorValueOption"
        />
        <LabeledPresetRow
          label="채도"
          options={MUNSELL_CHROMA_OPTIONS}
          activeValue={builderChroma}
          onPress={(value) => updateBuilder('chroma', value)}
          testIDPrefix="soilColorChromaOption"
        />
      </QuickSection>

      {hasAssistCandidates && canRecordLayerMunsell && (
        <QuickSection title="스포이드 후보">
          <AssistCandidateTextInput
            fieldNames={fieldNames}
            onUpdateFields={updateFields}
            value={assistCandidateText}
          />
          {assistCandidateOptions.length > 0 && (
            <PresetRow
              options={assistCandidateOptions}
              activeValue={getTextValue(resource, SOIL_COLOR_FIELDS.manualMunsell)}
              onPress={applyAssistCandidate}
              testIDPrefix="soilColorCandidateOption"
            />
          )}
        </QuickSection>
      )}

      {isLayer && fieldNames.has(SOIL_COLOR_FIELDS.moistureState) && (
        <QuickSection title="수분 상태">
          <PresetRow
            options={MOISTURE_OPTIONS}
            activeValue={getTextValue(resource, SOIL_COLOR_FIELDS.moistureState)}
            onPress={(value) => onUpdateResourceField(
              SOIL_COLOR_FIELDS.moistureState,
              value
            )}
          />
        </QuickSection>
      )}

      <QuickSection title="토색 메모">
        <TextInput
          autoCorrect={false}
          multiline
          onChangeText={(value) => onUpdateResourceField(
            canRecordLayerMunsell
              ? SOIL_COLOR_FIELDS.soilColorNote
              : SOIL_COLOR_FIELDS.profileColorNote,
            value
          )}
          placeholder="혼입물, 점토질/사질, 색 변화 등을 적습니다."
          placeholderTextColor="#98a2b3"
          style={[styles.textInput, styles.noteInput]}
          testID="soilColorInput_note"
          value={getTextValue(
            resource,
            canRecordLayerMunsell
              ? SOIL_COLOR_FIELDS.soilColorNote
              : SOIL_COLOR_FIELDS.profileColorNote
          )}
        />
      </QuickSection>
    </View>
  );
};

const LayerSampleCandidatePanel: React.FC<{
  activeRowNumber: number;
  activeValue?: string;
  assistCandidateOptions: SoilColorOption[];
  assistCandidateText: string;
  onPressCandidate: (value: string) => void;
}> = ({
  activeRowNumber,
  activeValue,
  assistCandidateOptions,
  assistCandidateText,
  onPressCandidate,
}) => {
  if (
    assistCandidateOptions.length === 0
    && assistCandidateText.trim().length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.layerSamplePanel} testID="soilColorLayerSamplePanel">
      <View style={styles.layerSampleHeader}>
        <MaterialIcons name="colorize" size={16} color="#175cd3" />
        <Text style={styles.layerSampleTitle}>
          {`${activeRowNumber}층 스포이드 후보`}
        </Text>
      </View>
      {assistCandidateOptions.length > 0 ? (
        <PresetRow
          options={assistCandidateOptions}
          activeValue={activeValue}
          onPress={onPressCandidate}
          testIDPrefix="soilColorCandidateOption"
        />
      ) : (
        <Text style={styles.layerSampleStatus}>{assistCandidateText}</Text>
      )}
    </View>
  );
};

const AssistCandidateTextInput: React.FC<{
  fieldNames: Set<string>;
  onUpdateFields: (updates: Record<string, unknown>) => void;
  value: string;
}> = ({ fieldNames, onUpdateFields, value }) => (
  <TextInput
    autoCapitalize="characters"
    autoCorrect={false}
    multiline
    onChangeText={(nextValue) => onUpdateFields(
      getAssistCandidateUpdates(fieldNames, nextValue)
    )}
    placeholder="사진에서 찍은 먼셀 후보가 여기에 표시됩니다."
    placeholderTextColor="#98a2b3"
    style={[styles.textInput, styles.candidateInput]}
    testID="soilColorInput_assistCandidates"
    value={value}
  />
);

const LayerNumberModal: React.FC<{
  isVisible: boolean;
  onApply: () => void;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  value: string;
}> = ({
  isVisible,
  onApply,
  onChangeValue,
  onClose,
  value,
}) => (
  <Modal
    animationType="fade"
    onRequestClose={onClose}
    transparent
    visible={isVisible}
  >
    <View style={styles.modalBackdrop}>
      <View style={styles.numberModalCard}>
        <Text style={styles.numberModalTitle}>층 번호</Text>
        <TextInput
          autoFocus
          keyboardType="number-pad"
          onChangeText={onChangeValue}
          selectTextOnFocus
          style={styles.numberModalInput}
          testID="soilColorLayerNumberInput"
          value={value}
        />
        <View style={styles.numberModalActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onClose}
            style={styles.numberModalSecondaryButton}
            testID="soilColorLayerNumberCancel"
          >
            <Text style={styles.numberModalSecondaryText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onApply}
            style={styles.numberModalPrimaryButton}
            testID="soilColorLayerNumberApply"
          >
            <Text style={styles.numberModalPrimaryText}>적용</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const QuickSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const LabeledPresetRow: React.FC<{
  label: string;
  options: readonly SoilColorOption[];
  activeValue?: string;
  onPress: (value: string) => void;
  testIDPrefix?: string;
}> = ({ label, options, activeValue, onPress, testIDPrefix }) => (
  <View style={styles.builderRow}>
    <Text style={styles.builderLabel}>{label}</Text>
    <PresetRow
      options={options}
      activeValue={activeValue}
      onPress={onPress}
      testIDPrefix={testIDPrefix}
    />
  </View>
);

const PresetRow: React.FC<{
  options: readonly SoilColorOption[];
  activeValue?: string;
  onPress: (value: string) => void;
  testIDPrefix?: string;
}> = ({ options, activeValue, onPress, testIDPrefix = 'soilColorOption' }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.optionRow}
  >
    {options.map((option) => {
      const isActive = activeValue === option.value;

      return (
        <TouchableOpacity
          activeOpacity={0.84}
          key={option.value}
          onPress={() => onPress(option.value)}
          style={[styles.optionChip, isActive && styles.optionChipActive]}
          testID={`${testIDPrefix}_${option.value}`}
        >
          <MaterialIcons
            name={isActive ? 'check-circle' : 'radio-button-unchecked'}
            size={15}
            color={isActive ? '#027a48' : '#667085'}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.optionChipText,
              isActive && styles.optionChipTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const getLayerMunsellUpdates = (
  fieldNames: Set<string>,
  value: string
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {
    [SOIL_COLOR_FIELDS.manualMunsell]: value,
  };

  if (fieldNames.has(SOIL_COLOR_FIELDS.assistStatus)) {
    updates[SOIL_COLOR_FIELDS.assistStatus] =
      value.trim().length > 0 ? 'manualRecorded' : 'notRun';
  }

  return updates;
};

const getAssistCandidateUpdates = (
  fieldNames: Set<string>,
  value: string
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {
    [SOIL_COLOR_FIELDS.assistCandidates]: value,
  };

  if (fieldNames.has(SOIL_COLOR_FIELDS.assistStatus)) {
    updates[SOIL_COLOR_FIELDS.assistStatus] =
      value.trim().length > 0 ? 'candidatesAvailable' : 'notRun';
  }

  return updates;
};

const formatMunsell = (
  hueNumber: string,
  hueFamily: string,
  value: string,
  chroma: string
): string => {
  if (hueFamily === 'N') return `N ${value}/0`;
  if (hueFamily.startsWith('GLEY')) return `${hueFamily} ${value}/N`;

  return `${hueNumber}${hueFamily} ${value}/${chroma}`;
};

const getSoilColorRows = (currentValue: string): SoilColorLayerRow[] => {
  const lines = currentValue
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [{ number: 1, value: '' }];

  return lines.map((line, index) => {
    const match = line.match(/^\s*(\d+)\s*:?\s*(.*)$/);

    if (!match) return { number: index + 1, value: line.trim() };

    return {
      number: Number.parseInt(match[1], 10),
      value: match[2] ?? '',
    };
  });
};

const appendEmptySoilColorRow = (currentValue: string): string => {
  const rows = getSoilColorRows(currentValue);
  const nextNumber = Math.max(0, ...rows.map((row) => row.number)) + 1;

  return serializeSoilColorRows(rows.concat({ number: nextNumber, value: '' }));
};

const renameSoilColorRowNumber = (
  currentValue: string,
  currentRowNumber: number,
  nextRowNumber: number
): string => {
  const rows = getSoilColorRows(currentValue);
  if (rows.some((row) =>
    row.number === nextRowNumber && row.number !== currentRowNumber
  )) {
    return currentValue;
  }

  return serializeSoilColorRows(rows.map((row) =>
    row.number === currentRowNumber
      ? { ...row, number: nextRowNumber }
      : row
  ));
};

const updateSoilColorRowValue = (
  currentValue: string,
  rowNumber: number,
  nextValue: string
): string => {
  const rows = getSoilColorRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const nextRows = rowIndex < 0
    ? rows.concat({ number: rowNumber, value: nextValue })
    : rows.map((row, index) =>
      index === rowIndex ? { ...row, value: nextValue } : row
    );

  return serializeSoilColorRows(nextRows);
};

const serializeSoilColorRows = (rows: SoilColorLayerRow[]): string =>
  rows
    .sort((left, right) => left.number - right.number)
    .map((row) => `${row.number}: ${row.value}`)
    .join('\n');

const getActiveLayerNumber = (resource: NewResource): number | undefined => {
  const rawValue = resource[SOIL_COLOR_FIELDS.activeLayerNumber];
  const numericValue = typeof rawValue === 'number'
    ? rawValue
    : typeof rawValue === 'string'
      ? Number.parseInt(rawValue, 10)
      : undefined;

  return numericValue && Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : undefined;
};

export const getSoilProfileColorSampleUpdates = (
  resource: NewResource,
  assistUpdates: {
    soilColorAssistCandidates?: unknown;
    soilColorAssistStatus?: unknown;
  }
): Record<string, unknown> => {
  const sampledMunsell = extractMunsellCandidateOptions(
    getTextFromUnknown(assistUpdates.soilColorAssistCandidates)
  )[0];
  if (!sampledMunsell) return { ...assistUpdates };

  const activeRowNumber = getActiveLayerNumber(resource)
    ?? getSoilColorRows(getTextValue(
      resource,
      SOIL_COLOR_FIELDS.profileColorSwatches
    ))[0]?.number
    ?? 1;

  return {
    ...assistUpdates,
    [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowValue(
      getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
      activeRowNumber,
      sampledMunsell
    ),
    [SOIL_COLOR_FIELDS.activeLayerNumber]: activeRowNumber,
    [SOIL_COLOR_FIELDS.assistStatus]:
      assistUpdates.soilColorAssistStatus === 'lowConfidence'
        ? 'lowConfidence'
        : 'reviewed',
  };
};

const getTextValue = (
  resource: NewResource,
  fieldName: string
): string => {
  const value = resource[fieldName];

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .join('\n');
  }
  if (typeof value !== 'string') return '';
  if (value.trim() === '[]') return '';

  return value;
};

const getTextFromUnknown = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff8eb',
    borderColor: '#e7bf78',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: '#7a4b12',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 5,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  layerRow: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 7,
    minHeight: 42,
    paddingHorizontal: 6,
  },
  layerRowActive: {
    backgroundColor: '#eff8ff',
    borderColor: '#84caff',
  },
  layerNumber: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 42,
  },
  layerNumberActive: {
    backgroundColor: '#eff8ff',
    borderColor: '#84caff',
  },
  layerNumberText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '900',
  },
  layerNumberTextActive: {
    color: '#175cd3',
  },
  layerInput: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    color: '#101828',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  layerValueBox: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 6,
  },
  layerValueText: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '900',
  },
  layerValuePlaceholder: {
    color: '#98a2b3',
    fontWeight: '800',
  },
  addNumberButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  addNumberButtonText: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  layerSamplePanel: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  layerSampleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  layerSampleTitle: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  layerSampleStatus: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 24, 40, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  numberModalCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 14,
    width: '100%',
  },
  numberModalTitle: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  numberModalInput: {
    backgroundColor: 'white',
    borderColor: '#84caff',
    borderRadius: 6,
    borderWidth: 1,
    color: '#101828',
    fontSize: 18,
    fontWeight: '900',
    minHeight: 44,
    paddingHorizontal: 10,
  },
  numberModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  numberModalSecondaryButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  numberModalSecondaryText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
  },
  numberModalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#175cd3',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  numberModalPrimaryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  builderPreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 7,
  },
  builderPreviewLabel: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 8,
  },
  builderPreviewButton: {
    backgroundColor: '#101828',
    borderRadius: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  builderPreviewText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  builderRow: {
    marginTop: 6,
  },
  builderLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  optionRow: {
    paddingRight: 8,
  },
  optionChip: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 6,
    minHeight: 32,
    paddingHorizontal: 8,
  },
  optionChipActive: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  optionChipText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  optionChipTextActive: {
    color: '#027a48',
  },
  textInput: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    color: '#101828',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  candidateInput: {
    fontWeight: '700',
    minHeight: 82,
    textAlignVertical: 'top',
  },
  noteInput: {
    fontWeight: '700',
    minHeight: 54,
    textAlignVertical: 'top',
  },
});

export default KoreanFieldworkSoilColorPanel;
