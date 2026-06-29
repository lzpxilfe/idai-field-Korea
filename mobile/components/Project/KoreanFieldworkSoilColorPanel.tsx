import { MaterialIcons } from '@expo/vector-icons';
import {
  CategoryForm,
  NewResource,
} from 'idai-field-core';
import React, { useMemo, useState } from 'react';
import {
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
  assistCandidates: 'soilColorAssistCandidates',
  assistStatus: 'soilColorAssistStatus',
  manualMunsell: 'soilColorMunsellManual',
  moistureState: 'soilColorMoistureState',
  profileColorNote: 'soilProfileColorNote',
  profileColorSwatches: 'soilProfileColorSwatches',
  soilColorNote: 'soilColorNote',
} as const;

const MUNSELL_HUE_OPTIONS: readonly SoilColorOption[] = [
  { value: '10YR', label: '10YR' },
  { value: '7.5YR', label: '7.5YR' },
  { value: '5YR', label: '5YR' },
  { value: '2.5YR', label: '2.5YR' },
  { value: '10R', label: '10R' },
  { value: '7.5R', label: '7.5R' },
  { value: '5R', label: '5R' },
  { value: '2.5Y', label: '2.5Y' },
  { value: '5Y', label: '5Y' },
  { value: '10Y', label: '10Y' },
];

const MUNSELL_VALUE_OPTIONS: readonly SoilColorOption[] =
  ['2', '3', '4', '5', '6', '7', '8'].map((value) => ({
    value,
    label: value,
  }));

const MUNSELL_CHROMA_OPTIONS: readonly SoilColorOption[] =
  ['1', '2', '3', '4', '6', '8'].map((value) => ({
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
  const [selectedRowNumber, setSelectedRowNumber] = useState(1);
  const [builderHue, setBuilderHue] = useState('10YR');
  const [builderValue, setBuilderValue] = useState('4');
  const [builderChroma, setBuilderChroma] = useState('3');
  const activeRowNumber = soilColorRows.some((row) => row.number === selectedRowNumber)
    ? selectedRowNumber
    : soilColorRows[0]?.number ?? 1;
  const builderMunsell = formatMunsell(builderHue, builderValue, builderChroma);

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

  const applyMunsellValue = (value: string) => {
    if (canRecordLayerMunsell) {
      updateFields(getLayerMunsellUpdates(fieldNames, value));
      return;
    }

    if (canRecordPhotoSwatches) {
      onUpdateResourceField(
        SOIL_COLOR_FIELDS.profileColorSwatches,
        updateSoilColorRowValue(
          getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
          activeRowNumber,
          value
        )
      );
    }
  };

  const updateBuilder = (
    part: 'hue' | 'value' | 'chroma',
    nextValue: string
  ) => {
    const nextHue = part === 'hue' ? nextValue : builderHue;
    const nextMunsellValue = part === 'value' ? nextValue : builderValue;
    const nextChroma = part === 'chroma' ? nextValue : builderChroma;

    if (part === 'hue') setBuilderHue(nextValue);
    if (part === 'value') setBuilderValue(nextValue);
    if (part === 'chroma') setBuilderChroma(nextValue);

    applyMunsellValue(formatMunsell(nextHue, nextMunsellValue, nextChroma));
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
            <View key={row.number} style={styles.layerRow}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setSelectedRowNumber(row.number)}
                style={[
                  styles.layerNumber,
                  row.number === activeRowNumber && styles.layerNumberActive,
                ]}
                testID={`soilColorLayerSelect_${row.number}`}
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
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => onUpdateResourceField(
                  SOIL_COLOR_FIELDS.profileColorSwatches,
                  updateSoilColorRowValue(
                    getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches),
                    row.number,
                    value
                  )
                )}
                onFocus={() => setSelectedRowNumber(row.number)}
                placeholder="먼셀값 또는 토색 메모"
                placeholderTextColor="#98a2b3"
                style={styles.layerInput}
                testID={`soilColorLayerInput_${row.number}`}
                value={row.value}
              />
            </View>
          ))}
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => {
              const nextValue = appendEmptySoilColorRow(
                getTextValue(resource, SOIL_COLOR_FIELDS.profileColorSwatches)
              );
              const nextRows = getSoilColorRows(nextValue);
              setSelectedRowNumber(nextRows[nextRows.length - 1]?.number ?? 1);
              onUpdateResourceField(SOIL_COLOR_FIELDS.profileColorSwatches, nextValue);
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
          label="색상"
          options={MUNSELL_HUE_OPTIONS}
          activeValue={builderHue}
          onPress={(value) => updateBuilder('hue', value)}
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
        {canRecordLayerMunsell && (
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={(value) => updateFields(
              getLayerMunsellUpdates(fieldNames, value)
            )}
            placeholder="직접 입력"
            placeholderTextColor="#98a2b3"
            style={styles.textInput}
            testID="soilColorInput_manualMunsell"
            value={getTextValue(resource, SOIL_COLOR_FIELDS.manualMunsell)}
          />
        )}
      </QuickSection>

      {hasAssistCandidates && (
        <QuickSection title="사진에서 찍은 토색">
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            multiline
            onChangeText={(value) => updateFields(
              getAssistCandidateUpdates(fieldNames, value)
            )}
            placeholder="사진에서 찍은 먼셀 후보가 여기에 표시됩니다."
            placeholderTextColor="#98a2b3"
            style={[styles.textInput, styles.candidateInput]}
            testID="soilColorInput_assistCandidates"
            value={assistCandidateText}
          />
          {assistCandidateOptions.length > 0 && (
            <PresetRow
              options={assistCandidateOptions}
              activeValue={
                canRecordLayerMunsell
                  ? getTextValue(resource, SOIL_COLOR_FIELDS.manualMunsell)
                  : soilColorRows.find((row) => row.number === activeRowNumber)?.value
              }
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

const formatMunsell = (hue: string, value: string, chroma: string): string =>
  `${hue} ${value}/${chroma}`;

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
    flexDirection: 'row',
    marginBottom: 7,
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
