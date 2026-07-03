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
  isLayerPhotoSamplingAvailable?: boolean;
  resource: NewResource;
  onSampleLayerColor?: (layerNumber: number) => void;
  onUpdateResourceField: (fieldName: string, value: unknown) => void;
  onUpdateResourceFields?: (updates: Record<string, unknown>) => void;
}

interface SoilColorOption {
  value: string;
  label: string;
}

interface SoilColorLayerRow {
  munsell: string;
  note: string;
  number: number;
  sample?: SoilColorSampleSummary;
  value: string;
}

interface SoilColorSampleSummary {
  blue: number;
  green: number;
  label: string;
  point?: SoilColorSamplePointSummary;
  pointLabel?: string;
  red: number;
}

interface SoilColorSamplePointSummary {
  xPercent: number;
  yPercent: number;
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

const MUNSELL_HUE_OPTIONS: {
  families: readonly SoilColorOption[];
  numbers: readonly SoilColorOption[];
} = {
  numbers: ['2.5', '5', '7.5', '10'].map((value) => ({ value, label: value })),
  families: [
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
  ].map((value) => ({ value, label: value })),
};

const MUNSELL_HUE_NUMBER_OPTIONS = MUNSELL_HUE_OPTIONS.numbers;
const MUNSELL_HUE_FAMILY_OPTIONS = MUNSELL_HUE_OPTIONS.families;
const MUNSELL_VALUE_PATTERN =
  /^(GLEY\s*[12]\s*\d(?:\.\d)?\/N|(?:10|7\.5|5|2\.5)(?:R|YR|Y|GY|G|BG|B|PB|P|RP)\s+\d(?:\.\d)?\/\d+(?:\.\d)?|N\s*\d(?:\.\d)?\/0)\s*(.*)$/i;
const RGB_SAMPLE_PATTERN = /\bRGB\s+(\d{1,3})\/(\d{1,3})\/(\d{1,3})\b/i;
const RGB_SAMPLE_NOTE_PATTERN =
  /\s*\bRGB\s+\d{1,3}\/\d{1,3}\/\d{1,3}(?:\s*@\s*\d{1,3}%\/\d{1,3}%)?/gi;
const SAMPLE_POINT_PATTERN = /(\d{1,3})%\/(\d{1,3})%/;

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
  isLayerPhotoSamplingAvailable = false,
  resource,
  onSampleLayerColor,
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

  const sampleLayerColor = (rowNumber: number) => {
    selectLayerRow(rowNumber);
    onSampleLayerColor?.(rowNumber);
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
        [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowMunsellValue(
          getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
          activeRowNumber,
          value
        ),
        [SOIL_COLOR_FIELDS.activeLayerNumber]: activeRowNumber,
      });
    }
  };

  const updateLayerMunsellValue = (rowNumber: number, value: string) => {
    setSelectedRowNumber(rowNumber);
    updateFields({
      [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowMunsellValue(
        getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
        rowNumber,
        value
      ),
      [SOIL_COLOR_FIELDS.activeLayerNumber]: rowNumber,
    });
  };

  const updateLayerNoteValue = (rowNumber: number, value: string) => {
    setSelectedRowNumber(rowNumber);
    updateFields({
      [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowNoteValue(
        getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
        rowNumber,
        value
      ),
      [SOIL_COLOR_FIELDS.activeLayerNumber]: rowNumber,
    });
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
        [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowMunsellValue(
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
              <View style={styles.layerInputGroup}>
                <View style={styles.layerInputLine}>
                  <MaterialIcons name="colorize" size={15} color="#7a4b12" />
                  <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => updateLayerMunsellValue(row.number, value)}
                onFocus={() => selectLayerRow(row.number)}
                placeholder="먼셀/스포이드 결과"
                placeholderTextColor="#98a2b3"
                style={styles.layerInput}
                testID={`soilColorLayerInput_${row.number}`}
                    value={row.munsell}
              />
                  {!!onSampleLayerColor && (
                    <TouchableOpacity
                      activeOpacity={0.84}
                      disabled={!isLayerPhotoSamplingAvailable}
                      onPress={() => sampleLayerColor(row.number)}
                      style={[
                        styles.layerSampleButton,
                        !isLayerPhotoSamplingAvailable
                          && styles.layerSampleButtonDisabled,
                      ]}
                      testID={`soilColorLayerSampleButton_${row.number}`}
                    >
                      <MaterialIcons
                        name="colorize"
                        size={16}
                        color={isLayerPhotoSamplingAvailable ? '#175cd3' : '#98a2b3'}
                      />
                      <Text
                        style={[
                          styles.layerSampleButtonText,
                          !isLayerPhotoSamplingAvailable
                            && styles.layerSampleButtonTextDisabled,
                        ]}
                      >
                        스포이드
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {row.sample && (
                  <View
                    style={styles.layerSampleResult}
                    testID={`soilColorLayerSampleResult_${row.number}`}
                  >
                    <View
                      style={[
                        styles.layerSampleSwatch,
                        {
                          backgroundColor:
                            `rgb(${row.sample.red}, ${row.sample.green}, ${row.sample.blue})`,
                        },
                      ]}
                    />
                    <View style={styles.layerSampleTextColumn}>
                      <Text
                        numberOfLines={1}
                        style={styles.layerSampleResultText}
                        testID={`soilColorLayerSampleResultText_${row.number}`}
                      >
                        {row.sample.label}
                      </Text>
                      {row.sample.point && row.sample.pointLabel && (
                        <View
                          style={styles.layerSampleLocationRow}
                          testID={`soilColorLayerSampleLocation_${row.number}`}
                        >
                          <View
                            style={styles.layerSampleLocationMap}
                            testID={`soilColorLayerSampleLocationMap_${row.number}`}
                          >
                            <View
                              style={[
                                styles.layerSampleLocationMarker,
                                {
                                  left: `${getMarkerPercent(row.sample.point.xPercent)}%`,
                                  top: `${getMarkerPercent(row.sample.point.yPercent)}%`,
                                },
                              ]}
                              testID={`soilColorLayerSampleLocationMarker_${row.number}`}
                            />
                          </View>
                          <MaterialIcons name="my-location" size={13} color="#175cd3" />
                          <Text
                            numberOfLines={1}
                            style={styles.layerSampleLocationText}
                            testID={`soilColorLayerSampleLocationText_${row.number}`}
                          >
                            {`선택 위치 ${row.sample.pointLabel}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  onChangeText={(value) => updateLayerNoteValue(row.number, value)}
                  onFocus={() => selectLayerRow(row.number)}
                  placeholder="한글 토색·성상 메모"
                  placeholderTextColor="#98a2b3"
                  style={[styles.layerInput, styles.layerNoteInput]}
                  testID={`soilColorLayerNoteInput_${row.number}`}
                  value={row.note}
                />
              </View>
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
        <QuickSection title="사진 판독 후보">
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
    placeholder="사진에서 읽은 먼셀 후보가 여기에 표시됩니다."
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

  if (lines.length === 0) return [createSoilColorLayerRow(1, '')];

  return lines.map((line, index) => {
    const match = line.match(/^\s*(\d+)\s*:?\s*(.*)$/);

    if (!match) return createSoilColorLayerRow(index + 1, line.trim());

    return createSoilColorLayerRow(
      Number.parseInt(match[1], 10),
      match[2] ?? ''
    );
  });
};

const createSoilColorLayerRow = (
  number: number,
  value: string
): SoilColorLayerRow => {
  const { munsell, note: rawNote } = splitSoilColorRowValue(value);
  const sample = getSoilColorSampleSummary(rawNote);
  const note = removeSoilColorSampleSummary(rawNote);

  return {
    munsell,
    note,
    number,
    sample,
    value: formatSoilColorRowValue(munsell, note, sample?.label),
  };
};

const splitSoilColorRowValue = (value: string): {
  munsell: string;
  note: string;
} => {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(MUNSELL_VALUE_PATTERN);
  if (!match) {
    return {
      munsell: '',
      note: normalizedValue,
    };
  }

  return {
    munsell: normalizeMunsellText(match[1]),
    note: (match[2] ?? '').trim(),
  };
};

const normalizeMunsellText = (value: string): string =>
  value.toUpperCase().replace(/\s+/g, ' ').trim();

const getSoilColorSampleSummary = (
  value: string
): SoilColorSampleSummary | undefined => {
  const rgbMatch = value.match(RGB_SAMPLE_PATTERN);
  if (!rgbMatch) return undefined;

  const red = Number.parseInt(rgbMatch[1], 10);
  const green = Number.parseInt(rgbMatch[2], 10);
  const blue = Number.parseInt(rgbMatch[3], 10);
  if (![red, green, blue].every(isValidRgbChannel)) return undefined;

  const pointMatch = value.match(SAMPLE_POINT_PATTERN);
  const point = pointMatch
    ? {
      xPercent: clampSamplePercent(Number.parseInt(pointMatch[1], 10)),
      yPercent: clampSamplePercent(Number.parseInt(pointMatch[2], 10)),
    }
    : undefined;
  const pointLabel = point
    ? `${point.xPercent}%/${point.yPercent}%`
    : undefined;

  return {
    blue,
    green,
    label: formatSoilColorSampleLabel(red, green, blue, pointLabel),
    point,
    pointLabel,
    red,
  };
};

const removeSoilColorSampleSummary = (value: string): string =>
  value
    .replace(RGB_SAMPLE_NOTE_PATTERN, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const isValidRgbChannel = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 255;

const clampSamplePercent = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;

const getMarkerPercent = (value: number): number =>
  Math.max(4, Math.min(96, clampSamplePercent(value)));

const formatSoilColorSampleLabel = (
  red: number,
  green: number,
  blue: number,
  pointLabel?: string
): string =>
  [`RGB ${red}/${green}/${blue}`, pointLabel ? `@ ${pointLabel}` : '']
    .filter(Boolean)
    .join(' ');

const formatSoilColorRowValue = (
  munsell: string,
  note: string,
  sampleLabel?: string
): string =>
  [munsell.trim(), note.trim(), sampleLabel?.trim() ?? '']
    .filter(Boolean)
    .join(' ');

const appendEmptySoilColorRow = (currentValue: string): string => {
  const rows = getSoilColorRows(currentValue);
  const nextNumber = Math.max(0, ...rows.map((row) => row.number)) + 1;

  return serializeSoilColorRows(rows.concat(createSoilColorLayerRow(nextNumber, '')));
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

const updateSoilColorRowMunsellValue = (
  currentValue: string,
  rowNumber: number,
  nextMunsell: string
): string => {
  const rows = getSoilColorRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const nextRows = rowIndex < 0
    ? rows.concat(createSoilColorLayerRow(rowNumber, nextMunsell))
    : rows.map((row, index) =>
      index === rowIndex
        ? createSoilColorLayerRow(
          row.number,
          formatSoilColorRowValue(nextMunsell, row.note, row.sample?.label)
        )
        : row
    );

  return serializeSoilColorRows(nextRows);
};

const updateSoilColorRowNoteValue = (
  currentValue: string,
  rowNumber: number,
  nextNote: string
): string => {
  const rows = getSoilColorRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const nextRows = rowIndex < 0
    ? rows.concat(createSoilColorLayerRow(rowNumber, nextNote))
    : rows.map((row, index) =>
      index === rowIndex
        ? createSoilColorLayerRow(
          row.number,
          formatSoilColorRowValue(row.munsell, nextNote, row.sample?.label)
        )
        : row
    );

  return serializeSoilColorRows(nextRows);
};

const updateSoilColorRowSampleValue = (
  currentValue: string,
  rowNumber: number,
  nextMunsell: string,
  assistCandidateText: string
): string => {
  const rows = getSoilColorRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const sample = getSoilColorSampleSummary(assistCandidateText);
  const formatSampledValue = (note = '') =>
    formatSoilColorRowValue(nextMunsell, note, sample?.label);
  const nextRows = rowIndex < 0
    ? rows.concat(createSoilColorLayerRow(rowNumber, formatSampledValue()))
    : rows.map((row, index) =>
      index === rowIndex
        ? createSoilColorLayerRow(row.number, formatSampledValue(row.note))
        : row
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
  },
  targetLayerNumber?: number
): Record<string, unknown> => {
  const assistCandidateText = getTextFromUnknown(
    assistUpdates.soilColorAssistCandidates
  );
  const sampledMunsell = extractMunsellCandidateOptions(assistCandidateText)[0];
  if (!sampledMunsell) return { ...assistUpdates };

  const activeRowNumber = normalizeLayerNumber(targetLayerNumber)
    ?? getActiveLayerNumber(resource)
    ?? getSoilColorRows(getTextValue(
      resource,
      SOIL_COLOR_FIELDS.profileColorSwatches
    ))[0]?.number
    ?? 1;

  return {
    ...assistUpdates,
    [SOIL_COLOR_FIELDS.profileColorSwatches]: updateSoilColorRowSampleValue(
      getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
      activeRowNumber,
      sampledMunsell,
      assistCandidateText
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

const normalizeLayerNumber = (value: number | undefined): number | undefined =>
  value && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;

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
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 7,
    minHeight: 86,
    paddingHorizontal: 6,
    paddingVertical: 6,
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
    marginTop: 2,
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
  layerInputGroup: {
    flex: 1,
    minWidth: 0,
  },
  layerInputLine: {
    alignItems: 'center',
    flexDirection: 'row',
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
  layerSampleButton: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginLeft: 6,
    minHeight: 38,
    paddingHorizontal: 8,
  },
  layerSampleButtonDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
  },
  layerSampleButtonText: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  layerSampleButtonTextDisabled: {
    color: '#98a2b3',
  },
  layerSampleResult: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 5,
    minHeight: 26,
  },
  layerSampleTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  layerSampleResultText: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '800',
  },
  layerSampleLocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
    minHeight: 24,
  },
  layerSampleLocationMap: {
    backgroundColor: '#f8fafc',
    borderColor: '#84caff',
    borderRadius: 4,
    borderWidth: 1,
    height: 24,
    marginRight: 6,
    overflow: 'hidden',
    position: 'relative',
    width: 42,
  },
  layerSampleLocationMarker: {
    backgroundColor: '#175cd3',
    borderColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    position: 'absolute',
    width: 8,
  },
  layerSampleLocationText: {
    color: '#175cd3',
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 3,
  },
  layerSampleSwatch: {
    borderColor: '#98a2b3',
    borderRadius: 4,
    borderWidth: 1,
    height: 18,
    marginRight: 7,
    width: 26,
  },
  layerNoteInput: {
    fontWeight: '700',
    marginTop: 5,
    minHeight: 40,
    textAlignVertical: 'top',
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
