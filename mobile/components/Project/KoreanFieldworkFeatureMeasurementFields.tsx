import {
  getKoreanFieldworkFeatureMeasurement,
  getKoreanFieldworkFeatureMeasurementUpdate,
  KoreanFieldworkFeatureMeasurementDefinition,
  KoreanFieldworkFeatureMeasurementGroup,
  NewResource,
} from 'idai-field-core';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const FEATURE_MEASUREMENT_UNITS = ['cm', 'm'] as const;

interface KoreanFieldworkFeatureMeasurementFieldsProps {
  groups: readonly KoreanFieldworkFeatureMeasurementGroup[];
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
  resource: NewResource;
}

const KoreanFieldworkFeatureMeasurementFields: React.FC<
  KoreanFieldworkFeatureMeasurementFieldsProps
> = ({ groups, onUpdateResourceFields, resource }) => (
  <>
    {groups.map((group) => (
      <FeatureMeasurementGroup
        key={group.id}
        group={group}
        onUpdateResourceFields={onUpdateResourceFields}
        resource={resource}
      />
    ))}
  </>
);

const FeatureMeasurementGroup: React.FC<{
  group: KoreanFieldworkFeatureMeasurementGroup;
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
  resource: NewResource;
}> = ({ group, onUpdateResourceFields, resource }) => (
  <View style={styles.measurementGroup} testID={`quickRecordMeasurementGroup_${group.id}`}>
    <Text style={styles.measurementGroupTitle}>{group.title}</Text>
    <View style={styles.measurementGrid}>
      {group.measurements.map((definition) => (
        <FeatureMeasurementInput
          key={definition.id}
          definition={definition}
          onUpdateResourceFields={onUpdateResourceFields}
          resource={resource}
        />
      ))}
    </View>
  </View>
);

const FeatureMeasurementInput: React.FC<{
  definition: KoreanFieldworkFeatureMeasurementDefinition;
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
  resource: NewResource;
}> = ({ definition, onUpdateResourceFields, resource }) => {
  const measurement = getKoreanFieldworkFeatureMeasurement(resource, definition);
  const [draftValue, setDraftValue] = useState(
    measurement?.inputValue?.toString() ?? ''
  );
  const [inputUnit, setInputUnit] = useState<'cm' | 'm'>(
    measurement?.inputUnit === 'm' || measurement?.inputUnit === 'cm'
      ? measurement.inputUnit
      : definition.defaultUnit
  );

  useEffect(() => {
    setDraftValue(measurement?.inputValue?.toString() ?? '');
    setInputUnit(
      measurement?.inputUnit === 'm' || measurement?.inputUnit === 'cm'
        ? measurement.inputUnit
        : definition.defaultUnit
    );
  }, [
    definition.defaultUnit,
    definition.id,
    measurement?.inputUnit,
    measurement?.inputValue,
  ]);

  const updateMeasurement = (value: number | undefined, unit = inputUnit) => {
    onUpdateResourceFields(getKoreanFieldworkFeatureMeasurementUpdate(
      resource,
      definition,
      value,
      unit
    ));
  };
  const updateDraftValue = (value: string) => {
    const normalizedInput = value.replace(',', '.');
    if (!/^\d*(?:\.\d*)?$/.test(normalizedInput)) return;

    setDraftValue(value);
    if (!value) {
      updateMeasurement(undefined);
      return;
    }

    if (/^\d+(?:\.\d+)?$/.test(normalizedInput)) {
      updateMeasurement(Number(normalizedInput));
    }
  };
  const selectUnit = (unit: 'cm' | 'm') => {
    setInputUnit(unit);
    const normalizedInput = draftValue.replace(',', '.');
    if (/^\d+(?:\.\d+)?$/.test(normalizedInput)) {
      updateMeasurement(Number(normalizedInput), unit);
    }
  };
  const resetInvalidDraft = () => {
    const normalizedInput = draftValue.replace(',', '.');
    if (draftValue && !/^\d+(?:\.\d+)?$/.test(normalizedInput)) {
      setDraftValue(measurement?.inputValue?.toString() ?? '');
    }
  };

  return (
    <View style={styles.measurementField}>
      <Text style={styles.measurementLabel}>{definition.label}</Text>
      <View style={styles.measurementInputRow}>
        <TextInput
          autoCorrect={false}
          keyboardType="decimal-pad"
          onBlur={resetInvalidDraft}
          onChangeText={updateDraftValue}
          placeholder="0"
          placeholderTextColor="#98a2b3"
          selectTextOnFocus
          style={[styles.textInput, styles.measurementValueInput]}
          testID={`quickRecordMeasurement_${definition.id}`}
          value={draftValue}
        />
        <View style={styles.measurementUnitControl}>
          {FEATURE_MEASUREMENT_UNITS.map((unit) => {
            const isSelected = inputUnit === unit;

            return (
              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={unit}
                onPress={() => selectUnit(unit)}
                style={[
                  styles.measurementUnitButton,
                  isSelected && styles.measurementUnitButtonSelected,
                ]}
                testID={`quickRecordMeasurementUnit_${definition.id}_${unit}`}
              >
                <Text
                  style={[
                    styles.measurementUnitText,
                    isSelected && styles.measurementUnitTextSelected,
                  ]}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  measurementGroup: {
    marginBottom: 8,
  },
  measurementGroupTitle: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  measurementField: {
    flexBasis: 180,
    flexGrow: 1,
    marginBottom: 7,
    paddingHorizontal: 4,
  },
  measurementLabel: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  measurementInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  measurementValueInput: {
    flex: 1,
    minWidth: 72,
    textAlign: 'right',
  },
  measurementUnitControl: {
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    height: 38,
    marginLeft: 5,
    overflow: 'hidden',
  },
  measurementUnitButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    justifyContent: 'center',
    width: 36,
  },
  measurementUnitButtonSelected: {
    backgroundColor: '#ecfdf3',
  },
  measurementUnitText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
  },
  measurementUnitTextSelected: {
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
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});

export default KoreanFieldworkFeatureMeasurementFields;
