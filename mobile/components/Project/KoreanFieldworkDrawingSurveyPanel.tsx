import { MaterialIcons } from '@expo/vector-icons';
import {
  NewResource,
  Resource,
} from 'idai-field-core';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

type EditableDrawingResource = (Resource | NewResource) & Record<string, unknown>;

interface Option {
  detail: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}

interface Props {
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
  resource: EditableDrawingResource;
}

export const KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS = {
  devices: 'drawingThreeDDevices',
  methods: 'drawingSurveyMethods',
  stages: 'drawingSurveyStages',
  updatedAt: 'drawingSurveyUpdatedAt',
} as const;

const METHOD_OPTIONS: Option[] = [
  {
    detail: '\uc904\uc790, \uc218\ud3c9\uae30, \ub808\ubca8, \uc2a4\ucf00\uc77c \ub4f1\uc73c\ub85c \ud604\uc7a5\uc5d0\uc11c \uc9c1\uc811 \uc2e4\uce21',
    icon: 'straighten',
    label: '\uc190\uc2e4\uce21',
    value: 'handMeasured',
  },
  {
    detail: '\uc0ac\uc9c4\uce21\ub7c9/\ud3ec\uc778\ud2b8\ud074\ub77c\uc6b0\ub4dc/\uc815\uc0ac\uc601\uc0c1 \uae30\ubc18 \uc2e4\uce21',
    icon: 'view-in-ar',
    label: '3D \uc2e4\uce21',
    value: 'threeDMeasured',
  },
];

const THREE_D_DEVICE_OPTIONS: Option[] = [
  {
    detail: 'DSLR/\ubbf8\ub7ec\ub9ac\uc2a4 \uc0ac\uc9c4\uc73c\ub85c \uc720\uad6c \uc2e4\uce21',
    icon: 'photo-camera',
    label: 'DSLR',
    value: 'dslr',
  },
  {
    detail: '\ub4dc\ub860 \uc0ac\uc9c4/\uc815\uc0ac\uc601\uc0c1\uc73c\ub85c \uc720\uad6c \ub610\ub294 \uad6c\uc5ed \uc2e4\uce21',
    icon: 'flight',
    label: '\ub4dc\ub860',
    value: 'drone',
  },
];

const STAGE_OPTIONS: Option[] = [
  {
    detail: '\ub178\ucd9c, \uc808\ub2e8, \ud1a0\uce35 \ud655\uc778 \ub4f1 \uc870\uc0ac \uc9c4\ud589 \uc911 \uc2e4\uce21',
    icon: 'pending-actions',
    label: '\uc870\uc0ac \uc911',
    value: 'duringInvestigation',
  },
  {
    detail: '\uc870\uc0ac \uc644\ub8cc \ud6c4 \ucd5c\uc885 \uc0c1\ud0dc \uc2e4\uce21',
    icon: 'task-alt',
    label: '\uc870\uc0ac \uc644\ub8cc',
    value: 'afterCompletion',
  },
];

const TEXT = {
  deviceSection: '3D \uc2e4\uce21 \uc7a5\ube44',
  methodSection: '\uc2e4\uce21 \ubc29\uc2dd',
  stageSection: '\uc2e4\uce21 \ub2e8\uacc4',
  title: '\ub3c4\uba74 \uc2e4\uce21 \ud655\uc778',
};

const KoreanFieldworkDrawingSurveyPanel: React.FC<Props> = ({
  onUpdateResourceFields,
  resource,
}) => {
  if (resource.category !== KOREAN_FIELDWORK_CATEGORIES.DRAWING) return null;

  const methods = getStringArray(resource[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.methods]);
  const devices = getStringArray(resource[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.devices]);
  const stages = getStringArray(resource[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.stages]);
  const hasThreeDMeasured = methods.includes('threeDMeasured');
  const toggleFieldValue = (
    fieldName: string,
    values: string[],
    value: string
  ) => {
    const nextValues = values.includes(value)
      ? values.filter((currentValue) => currentValue !== value)
      : values.concat(value);
    const updates: Record<string, unknown> = {
      [fieldName]: nextValues,
      [KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.updatedAt]:
        new Date().toISOString(),
    };

    if (
      fieldName === KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.methods
      && value === 'threeDMeasured'
      && values.includes(value)
    ) {
      updates[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.devices] = [];
    }

    onUpdateResourceFields(updates);
  };

  return (
    <View style={styles.container} testID="drawingSurveyPanel">
      <View style={styles.headerRow}>
        <MaterialIcons name="architecture" size={18} color="#344054" />
        <Text style={styles.title}>{TEXT.title}</Text>
      </View>
      <OptionSection
        activeValues={methods}
        options={METHOD_OPTIONS}
        testIDPrefix="drawingSurveyMethod"
        title={TEXT.methodSection}
        onToggle={(value) => toggleFieldValue(
          KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.methods,
          methods,
          value
        )}
      />
      {hasThreeDMeasured && (
        <OptionSection
          activeValues={devices}
          options={THREE_D_DEVICE_OPTIONS}
          testIDPrefix="drawingSurveyDevice"
          title={TEXT.deviceSection}
          onToggle={(value) => toggleFieldValue(
            KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.devices,
            devices,
            value
          )}
        />
      )}
      <OptionSection
        activeValues={stages}
        options={STAGE_OPTIONS}
        testIDPrefix="drawingSurveyStage"
        title={TEXT.stageSection}
        onToggle={(value) => toggleFieldValue(
          KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.stages,
          stages,
          value
        )}
      />
    </View>
  );
};

const OptionSection: React.FC<{
  activeValues: string[];
  onToggle: (value: string) => void;
  options: Option[];
  testIDPrefix: string;
  title: string;
}> = ({
  activeValues,
  onToggle,
  options,
  testIDPrefix,
  title,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.optionGrid}>
      {options.map((option) => {
        const isActive = activeValues.includes(option.value);

        return (
          <TouchableOpacity
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.86}
            key={option.value}
            onPress={() => onToggle(option.value)}
            style={[styles.optionButton, isActive && styles.optionButtonActive]}
            testID={`${testIDPrefix}_${option.value}`}
          >
            <View style={[
              styles.optionIcon,
              isActive && styles.optionIconActive,
            ]}>
              <MaterialIcons
                name={option.icon}
                size={17}
                color={isActive ? '#027a48' : '#667085'}
              />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[
                styles.optionLabel,
                isActive && styles.optionLabelActive,
              ]}>
                {option.label}
              </Text>
              <Text style={styles.optionDetail} numberOfLines={2}>
                {option.detail}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  optionButtonActive: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  optionDetail: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 2,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 6,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    borderRadius: 5,
    height: 34,
    justifyContent: 'center',
    marginRight: 8,
    width: 34,
  },
  optionIconActive: {
    backgroundColor: '#d1fadf',
  },
  optionLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
  },
  optionLabelActive: {
    color: '#027a48',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 6,
  },
});

export default KoreanFieldworkDrawingSurveyPanel;
