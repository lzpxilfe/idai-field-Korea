import { MaterialIcons } from '@expo/vector-icons';
import {
  CategoryForm,
  getKoreanFieldworkFeatureMeasurementGroups,
  getKoreanFieldworkFeaturePhotoProgress,
  isKoreanFieldworkFeaturePhotoMilestone,
  NewResource,
} from 'idai-field-core';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getKoreanFieldworkFeatureAttributeGroups,
  getKoreanFieldworkFeatureAttributeUpdate,
  getKoreanFieldworkFeatureAttributeValues,
  getKoreanFieldworkFeatureObservationPlaceholder,
  KoreanFieldworkFeatureAttributeGroup,
} from './korean-fieldwork-feature-attributes';
import {
  FEATURE_STATUS_QUICK_OPTIONS,
  FEATURE_PERIOD_QUICK_OPTIONS,
  FEATURE_TYPE_QUICK_OPTIONS,
  FIELDWORK_QUICK_FIELDS,
  buildKoreanFieldworkLongAxisOrientation,
  getKoreanFieldworkFeatureTypeUpdates,
  getKoreanFieldworkChecklistQuickOptions,
  getKoreanFieldworkLongAxisOrientationParts,
  getKoreanFieldworkQuickRecordAvailability,
  getKoreanFieldworkQuickPresetUpdates,
  getKoreanFieldworkQuickPresets,
  getResourceFieldValue,
  getStringArrayFieldValues,
  hasKoreanFieldworkQuickRecordActions,
  KoreanFieldworkQuickOption,
  KoreanFieldworkQuickPreset,
  QUALITY_QUICK_OPTIONS,
  TIMING_QUICK_OPTIONS,
  toggleStringArrayFieldValue,
  VERIFICATION_QUICK_OPTIONS,
} from './korean-fieldwork-quick-record';
import { KoreanFieldworkInvestigationModeId } from './korean-fieldwork-investigation-mode';
import KoreanFieldworkFeatureMeasurementFields
  from './KoreanFieldworkFeatureMeasurementFields';

const ORIENTATION_DIRECTION_OPTIONS = ['N', 'E', 'S', 'W'] as const;

interface KoreanFieldworkQuickRecordPanelProps {
  category: CategoryForm;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  resource: NewResource;
  onUpdateResourceField: (fieldName: string, value: unknown) => void;
  onUpdateResourceFields?: (updates: Record<string, unknown>) => void;
}

const KoreanFieldworkQuickRecordPanel: React.FC<KoreanFieldworkQuickRecordPanelProps> = ({
  category,
  investigationModeId,
  resource,
  onUpdateResourceField,
  onUpdateResourceFields,
}) => {
  const [showDetailedChecklist, setShowDetailedChecklist] = useState(false);
  const [showTimingEditor, setShowTimingEditor] = useState(false);
  const availability = useMemo(
    () => getKoreanFieldworkQuickRecordAvailability(
      category,
      resource,
      investigationModeId
    ),
    [category, investigationModeId, resource]
  );
  const presets = useMemo(
    () => getKoreanFieldworkQuickPresets(availability, investigationModeId),
    [availability, investigationModeId]
  );
  const checklistOptions = useMemo(
    () => getKoreanFieldworkChecklistQuickOptions(investigationModeId),
    [investigationModeId]
  );
  const featurePhotoOptions = useMemo(
    () => checklistOptions.filter((option) =>
      isKoreanFieldworkFeaturePhotoMilestone(option.value)
    ),
    [checklistOptions]
  );
  const detailedChecklistOptions = useMemo(
    () => checklistOptions.filter((option) =>
      !isKoreanFieldworkFeaturePhotoMilestone(option.value)
    ),
    [checklistOptions]
  );
  const isFeaturePhotoWorkflow = availability.checklist
    && featurePhotoOptions.length === 3;
  const featurePhotoProgress = getKoreanFieldworkFeaturePhotoProgress(
    getResourceFieldValue(resource, FIELDWORK_QUICK_FIELDS.checklist)
  );
  const categoryFieldNames = useMemo(
    () => new Set(category.groups.flatMap((group) =>
      group.fields.map((field) => field.name)
    )),
    [category]
  );
  const featureAttributeGroups = useMemo(
    () => getKoreanFieldworkFeatureAttributeGroups(category, resource),
    [category, resource]
  );
  const featureMeasurementGroups = useMemo(
    () => getKoreanFieldworkFeatureMeasurementGroups(category, resource),
    [category, resource]
  );
  const observationFieldName = getQuickObservationFieldName(
    categoryFieldNames
  );
  const longAxisOrientationValue = getTextValue(
    resource,
    FIELDWORK_QUICK_FIELDS.longAxisOrientation
  );
  const shortAxisOrientationValue = getTextValue(
    resource,
    FIELDWORK_QUICK_FIELDS.shortAxisOrientation
  );
  const applyUpdates = (updates: Record<string, unknown>) => {
    if (onUpdateResourceFields) {
      onUpdateResourceFields(updates);
      return;
    }

    Object.entries(updates).forEach(([fieldName, value]) =>
      onUpdateResourceField(fieldName, value)
    );
  };

  const applyPreset = (preset: KoreanFieldworkQuickPreset) => {
    const updates = getKoreanFieldworkQuickPresetUpdates(
      resource,
      availability,
      preset.id,
      investigationModeId
    );

    if (Object.keys(updates).length === 0) return;

    applyUpdates(updates);
  };

  const applyFeatureType = (value: string) => {
    applyUpdates({
      ...getKoreanFieldworkFeatureTypeUpdates(resource, value),
      ...getStaleFeatureAttributeClears(category, resource, value),
    });
  };

  const toggleChecklistValue = (value: string) => {
    const nextChecklist = toggleStringArrayFieldValue(
      resource,
      FIELDWORK_QUICK_FIELDS.checklist,
      value
    );

    if (
      isFeaturePhotoWorkflow
      && isKoreanFieldworkFeaturePhotoMilestone(value)
    ) {
      applyUpdates({
        [FIELDWORK_QUICK_FIELDS.checklist]: nextChecklist,
        [FIELDWORK_QUICK_FIELDS.featureStatus]:
          getKoreanFieldworkFeaturePhotoProgress(nextChecklist).recordingStatus,
      });
      return;
    }

    onUpdateResourceField(FIELDWORK_QUICK_FIELDS.checklist, nextChecklist);
  };

  const orientationNoteValue = getTextValue(
    resource,
    FIELDWORK_QUICK_FIELDS.orientationNote
  );
  const observationValue = observationFieldName
    ? getTextValue(resource, observationFieldName)
    : '';
  const timingValue = getSingleValue(resource, FIELDWORK_QUICK_FIELDS.timing)[0];
  const timingLabel = getQuickOptionLabel(
    TIMING_QUICK_OPTIONS,
    timingValue,
    '자동 설정 전'
  );
  const observationPlaceholder = getKoreanFieldworkFeatureObservationPlaceholder(
    category,
    resource
  );
  const featureAttributeSectionTitle = getFeatureAttributeSectionTitle(
    getTextValue(resource, FIELDWORK_QUICK_FIELDS.featureType)
  );
  const panelTitle = getQuickRecordPanelTitle(
    availability.featureType,
    featureAttributeGroups.length > 0 || featureMeasurementGroups.length > 0
  );
  const hasOrientationReference =
    categoryFieldNames.has(FIELDWORK_QUICK_FIELDS.orientationReference);
  const hasOrientationNote =
    categoryFieldNames.has(FIELDWORK_QUICK_FIELDS.orientationNote);
  const hasLongAxisOrientation =
    categoryFieldNames.has(FIELDWORK_QUICK_FIELDS.longAxisOrientation);
  const hasShortAxisOrientation =
    categoryFieldNames.has(FIELDWORK_QUICK_FIELDS.shortAxisOrientation);
  const orientationBearingFieldName = getOrientationBearingFieldName(
    hasLongAxisOrientation,
    hasShortAxisOrientation,
    hasOrientationNote,
    hasOrientationReference
  );
  const orientationBearingValue = getTextValue(resource, orientationBearingFieldName);
  const [orientationDraft, setOrientationDraft] = useState<OrientationDraft>(() =>
    getOrientationDraftFromValue(orientationBearingValue)
  );
  useEffect(
    () => setOrientationDraft(getOrientationDraftFromValue(orientationBearingValue)),
    [orientationBearingValue]
  );
  const existingOrientationSummary = getExistingOrientationSummary({
    longAxisOrientationValue,
    orientationNoteValue,
    orientationReferenceValue: hasOrientationReference
      ? getTextValue(resource, FIELDWORK_QUICK_FIELDS.orientationReference)
      : '',
    shortAxisOrientationValue,
  });
  const showManualFeatureStatus = availability.featureStatus
    && !isFeaturePhotoWorkflow;

  if (!hasKoreanFieldworkQuickRecordActions(availability) && !observationFieldName) return null;

  const updateOrientationDraft = (
    part: keyof OrientationDraft,
    value: string
  ) => {
    const normalizedValue = part === 'degrees'
      ? normalizeOrientationDegreeInput(value)
      : normalizeOrientationDirectionInput(value);
    const nextDraft = { ...orientationDraft, [part]: normalizedValue };
    const nextOrientationValue = buildKoreanFieldworkLongAxisOrientation(
      nextDraft.start,
      nextDraft.degrees,
      nextDraft.end
    );

    setOrientationDraft(nextDraft);

    if (nextOrientationValue) {
      onUpdateResourceField(orientationBearingFieldName, nextOrientationValue);
    } else if (
      !nextDraft.start
      && !nextDraft.degrees
      && !nextDraft.end
      && orientationBearingValue
    ) {
      onUpdateResourceField(orientationBearingFieldName, '');
    }
  };

  return (
    <View style={styles.container} testID="koreanFieldworkQuickRecordPanel">
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="fact-check" size={18} color="#175cd3" />
          <Text style={styles.title}>{panelTitle}</Text>
        </View>
      </View>

      {presets.length > 0 && !isFeaturePhotoWorkflow && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {presets.map((preset) => (
            <PresetButton
              key={preset.id}
              preset={preset}
              onPress={() => applyPreset(preset)}
            />
          ))}
        </ScrollView>
      )}

      {availability.period && (
        <QuickSection title="시대/시기">
          <OptionRow
            options={FEATURE_PERIOD_QUICK_OPTIONS}
            activeValues={getSingleValue(resource, FIELDWORK_QUICK_FIELDS.period)}
            onPress={(value) => onUpdateResourceField(
              FIELDWORK_QUICK_FIELDS.period,
              value
            )}
            singleChoice
          />
        </QuickSection>
      )}

      {availability.featureType && (
        <QuickSection
          title="유구 성격"
          description="확신이 없으면 미정이나 추정으로 두고, 조사하면서 다시 고쳐도 됩니다."
        >
          <OptionRow
            options={FEATURE_TYPE_QUICK_OPTIONS}
            activeValues={getSingleValue(resource, FIELDWORK_QUICK_FIELDS.featureType)}
            onPress={applyFeatureType}
            singleChoice
          />
        </QuickSection>
      )}

      {featureMeasurementGroups.length > 0 && (
        <QuickSection
          title="제원"
          description="현재 확인한 실측값만 입력하세요. 단위는 항목마다 바꿀 수 있습니다."
        >
          <KoreanFieldworkFeatureMeasurementFields
            groups={featureMeasurementGroups}
            onUpdateResourceFields={applyUpdates}
            resource={resource}
          />
        </QuickSection>
      )}

      {featureAttributeGroups.length > 0 && (
        <QuickSection
          title={featureAttributeSectionTitle}
          description="처음부터 모두 채울 필요 없습니다. 조사 진행 중 확인한 항목부터 계속 보완하세요."
        >
          {featureAttributeGroups.map((group) => (
            <FeatureAttributeGroup
              key={group.fieldName}
              group={group}
              activeValues={getKoreanFieldworkFeatureAttributeValues(
                resource,
                group.fieldName
              )}
              onPress={(value) => applyUpdates(
                getKoreanFieldworkFeatureAttributeUpdate(
                  resource,
                  group.fieldName,
                  value
                )
              )}
            />
          ))}
        </QuickSection>
      )}

      {observationFieldName && (
        <QuickSection title="야장 메모">
          <TextInput
            testID={`quickRecordInput_${observationFieldName}`}
            autoCorrect={false}
            multiline
            placeholder={observationPlaceholder}
            placeholderTextColor="#98a2b3"
            value={observationValue}
            onChangeText={(value) => onUpdateResourceField(
              observationFieldName,
              value
            )}
            style={[styles.textInput, styles.observationInput]}
          />
          {availability.quality && (
            <View style={styles.inlineRecordCharacter}>
              <Text style={styles.inlineRecordCharacterLabel}>기록 성격</Text>
              <OptionRow
                options={QUALITY_QUICK_OPTIONS}
                activeValues={getStringArrayFieldValues(
                  resource,
                  FIELDWORK_QUICK_FIELDS.quality
                )}
                onPress={(value) => onUpdateResourceField(
                  FIELDWORK_QUICK_FIELDS.quality,
                  toggleStringArrayFieldValue(
                    resource,
                    FIELDWORK_QUICK_FIELDS.quality,
                    value
                  )
                )}
              />
            </View>
          )}
        </QuickSection>
      )}

      {!observationFieldName && availability.quality && (
        <QuickSection title="기록 성격">
          <OptionRow
            options={QUALITY_QUICK_OPTIONS}
            activeValues={getStringArrayFieldValues(
              resource,
              FIELDWORK_QUICK_FIELDS.quality
            )}
            onPress={(value) => onUpdateResourceField(
              FIELDWORK_QUICK_FIELDS.quality,
              toggleStringArrayFieldValue(
                resource,
                FIELDWORK_QUICK_FIELDS.quality,
                value
              )
            )}
          />
        </QuickSection>
      )}

      {availability.axisOrientation && (
        <QuickSection
          title="방위"
          description="왼쪽 방위, 가운데 각도, 오른쪽 방위를 따로 적으세요. 예: N 30 W"
        >
          {existingOrientationSummary && (
            <Text style={styles.orientationSummary}>
              기존 방위 참고: {existingOrientationSummary}
            </Text>
          )}
          <View style={styles.orientationInputRow}>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={1}
              onChangeText={(value) => updateOrientationDraft('start', value)}
              placeholder="N"
              placeholderTextColor="#98a2b3"
              style={[styles.textInput, styles.orientationDirectionInput]}
              testID="quickRecordInput_orientationStart"
              value={orientationDraft.start}
            />
            <TextInput
              autoCorrect={false}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(value) => updateOrientationDraft('degrees', value)}
              placeholder="30"
              placeholderTextColor="#98a2b3"
              style={[styles.textInput, styles.orientationDegreeInput]}
              testID="quickRecordInput_orientationDegrees"
              value={orientationDraft.degrees}
            />
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={1}
              onChangeText={(value) => updateOrientationDraft('end', value)}
              placeholder="W"
              placeholderTextColor="#98a2b3"
              style={[styles.textInput, styles.orientationDirectionInput]}
              testID="quickRecordInput_orientationEnd"
              value={orientationDraft.end}
            />
          </View>
          <View style={styles.orientationDirectionPicker}>
            <OrientationDirectionButtonRow
              label={'\uc67c\ucabd'}
              onSelect={(direction) => updateOrientationDraft('start', direction)}
              selectedDirection={orientationDraft.start}
              testIDPrefix="quickRecordOrientationStart"
            />
            <OrientationDirectionButtonRow
              label={'\uc624\ub978\ucabd'}
              onSelect={(direction) => updateOrientationDraft('end', direction)}
              selectedDirection={orientationDraft.end}
              testIDPrefix="quickRecordOrientationEnd"
            />
          </View>
        </QuickSection>
      )}

      {showManualFeatureStatus && (
        <QuickSection title="조사 진행">
          <OptionRow
            options={FEATURE_STATUS_QUICK_OPTIONS}
            activeValues={getSingleValue(
              resource,
              FIELDWORK_QUICK_FIELDS.featureStatus
            )}
            onPress={(value) => onUpdateResourceField(
              FIELDWORK_QUICK_FIELDS.featureStatus,
              value
            )}
            singleChoice
          />
        </QuickSection>
      )}

      {availability.checklist && (isFeaturePhotoWorkflow ? (
        <QuickSection title="조사 사진">
          <View
            style={styles.photoProgressSummary}
            testID="quickRecordPhotoProgressSummary"
          >
            <View style={styles.photoProgressStage}>
              <MaterialIcons name="photo-camera" size={16} color="#175cd3" />
              <Text style={styles.photoProgressLabel}>
                {featurePhotoProgress.label}
              </Text>
            </View>
            <Text style={styles.photoProgressPercent}>
              {featurePhotoProgress.progressPercent}%
            </Text>
            <Text style={styles.photoProgressCount}>
              사진 {featurePhotoProgress.checkedCount}/{featurePhotoProgress.totalCount}
            </Text>
          </View>
          <OptionRow
            options={featurePhotoOptions}
            activeValues={getStringArrayFieldValues(
              resource,
              FIELDWORK_QUICK_FIELDS.checklist
            )}
            onPress={toggleChecklistValue}
          />
          {detailedChecklistOptions.length > 0 && (
            <>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setShowDetailedChecklist((current) => !current)}
                style={styles.detailChecklistToggle}
                testID="quickRecordToggleDetailedChecklist"
              >
                <Text style={styles.detailChecklistToggleText}>
                  세부 기록 {showDetailedChecklist ? '접기' : '보기'}
                </Text>
                <MaterialIcons
                  name={showDetailedChecklist ? 'expand-less' : 'expand-more'}
                  size={18}
                  color="#475467"
                />
              </TouchableOpacity>
              {showDetailedChecklist && (
                <View style={styles.detailChecklist}>
                  <OptionRow
                    options={detailedChecklistOptions}
                    activeValues={getStringArrayFieldValues(
                      resource,
                      FIELDWORK_QUICK_FIELDS.checklist
                    )}
                    onPress={toggleChecklistValue}
                  />
                </View>
              )}
            </>
          )}
        </QuickSection>
      ) : (
        <QuickSection title="조사 단계 확인">
          <OptionRow
            options={checklistOptions}
            activeValues={getStringArrayFieldValues(
              resource,
              FIELDWORK_QUICK_FIELDS.checklist
            )}
            onPress={toggleChecklistValue}
          />
        </QuickSection>
      ))}

      {availability.verification && (
        <QuickSection title="확인·마감">
          <OptionRow
            options={VERIFICATION_QUICK_OPTIONS}
            activeValues={getSingleValue(
              resource,
              FIELDWORK_QUICK_FIELDS.verification
            )}
            onPress={(value) => onUpdateResourceField(
              FIELDWORK_QUICK_FIELDS.verification,
              value
            )}
            singleChoice
          />
        </QuickSection>
      )}

      {availability.timing && (
        <View style={styles.timingSection}>
          <TouchableOpacity
            accessibilityLabel={`기록 시점 ${timingLabel}`}
            activeOpacity={0.84}
            onPress={() => setShowTimingEditor((current) => !current)}
            style={styles.timingToggle}
            testID="quickRecordToggleTimingEditor"
          >
            <View style={styles.timingSummary}>
              <MaterialIcons name="schedule" size={16} color="#475467" />
              <Text style={styles.timingSummaryLabel}>기록 시점</Text>
              <Text style={styles.timingSummaryValue} testID="quickRecordTimingValue">
                {timingLabel}
              </Text>
            </View>
            <View style={styles.timingEditAction}>
              <Text style={styles.timingEditActionText}>
                {showTimingEditor ? '닫기' : '기록 시점 수정'}
              </Text>
              <MaterialIcons
                name={showTimingEditor ? 'expand-less' : 'expand-more'}
                size={18}
                color="#475467"
              />
            </View>
          </TouchableOpacity>
          {showTimingEditor && (
            <View style={styles.timingEditor}>
              <OptionRow
                options={TIMING_QUICK_OPTIONS}
                activeValues={getSingleValue(resource, FIELDWORK_QUICK_FIELDS.timing)}
                onPress={(value) => onUpdateResourceField(
                  FIELDWORK_QUICK_FIELDS.timing,
                  value
                )}
                singleChoice
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const PresetButton: React.FC<{
  preset: KoreanFieldworkQuickPreset;
  onPress: () => void;
}> = ({ preset, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.84}
    onPress={onPress}
    style={styles.presetButton}
    testID={`quickRecordPreset_${preset.id}`}
  >
    <MaterialIcons
      name={preset.icon as keyof typeof MaterialIcons.glyphMap}
      size={17}
      color="#175cd3"
    />
    <View style={styles.presetTextWrap}>
      <Text style={styles.presetLabel} numberOfLines={1}>
        {preset.label}
      </Text>
      <Text style={styles.presetDetail} numberOfLines={1}>
        {preset.detail}
      </Text>
    </View>
  </TouchableOpacity>
);

const QuickSection: React.FC<{
  description?: string;
  title: string;
  children: React.ReactNode;
}> = ({ description, title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {description && (
      <Text style={styles.sectionDescription}>{description}</Text>
    )}
    {children}
  </View>
);

const OrientationDirectionButtonRow: React.FC<{
  label: string;
  onSelect: (direction: string) => void;
  selectedDirection: string;
  testIDPrefix: string;
}> = ({ label, onSelect, selectedDirection, testIDPrefix }) => (
  <View style={styles.orientationDirectionButtonRow}>
    <Text style={styles.orientationDirectionButtonLabel}>{label}</Text>
    {ORIENTATION_DIRECTION_OPTIONS.map((direction) => {
      const isSelected = selectedDirection === direction;

      return (
        <TouchableOpacity
          activeOpacity={0.84}
          key={direction}
          onPress={() => onSelect(direction)}
          style={[
            styles.orientationDirectionButton,
            isSelected && styles.orientationDirectionButtonSelected,
          ]}
          testID={`${testIDPrefix}_${direction}`}
        >
          <Text
            style={[
              styles.orientationDirectionButtonText,
              isSelected && styles.orientationDirectionButtonTextSelected,
            ]}
          >
            {direction}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

interface OrientationDraft {
  degrees: string;
  end: string;
  start: string;
}

const getOrientationBearingFieldName = (
  hasLongAxisOrientation: boolean,
  hasShortAxisOrientation: boolean,
  hasOrientationNote: boolean,
  hasOrientationReference: boolean
): string => {
  if (hasLongAxisOrientation) return FIELDWORK_QUICK_FIELDS.longAxisOrientation;
  if (hasShortAxisOrientation) return FIELDWORK_QUICK_FIELDS.shortAxisOrientation;
  if (hasOrientationNote) return FIELDWORK_QUICK_FIELDS.orientationNote;
  if (hasOrientationReference) return FIELDWORK_QUICK_FIELDS.orientationReference;

  return FIELDWORK_QUICK_FIELDS.orientationNote;
};

const getOrientationDraftFromValue = (value: string): OrientationDraft => {
  const parts = getKoreanFieldworkLongAxisOrientationParts(value);

  return {
    degrees: parts?.degrees?.toString() ?? '',
    end: parts?.end ?? '',
    start: parts?.start ?? '',
  };
};

const normalizeOrientationDirectionInput = (value: string): string =>
  value.toUpperCase().replace(/[^NSEW]/g, '').slice(0, 1);

const normalizeOrientationDegreeInput = (value: string): string =>
  value.replace(/[^\d]/g, '').slice(0, 2);

const getExistingOrientationSummary = ({
  longAxisOrientationValue,
  orientationNoteValue,
  orientationReferenceValue,
  shortAxisOrientationValue,
}: {
  longAxisOrientationValue: string;
  orientationNoteValue: string;
  orientationReferenceValue: string;
  shortAxisOrientationValue: string;
}): string | undefined => {
  const parts = [
    longAxisOrientationValue ? `장축 ${longAxisOrientationValue}` : undefined,
    shortAxisOrientationValue ? `단축 ${shortAxisOrientationValue}` : undefined,
    orientationReferenceValue || undefined,
  ].filter((part): part is string => !!part);

  if (parts.length === 0 || orientationNoteValue.trim()) return undefined;

  return parts.join(' · ');
};

const OptionRow: React.FC<{
  options: readonly KoreanFieldworkQuickOption[];
  activeValues: string[];
  onPress: (value: string) => void;
  singleChoice?: boolean;
}> = ({
  options,
  activeValues,
  onPress,
  singleChoice = false,
}) => {
  const activeValueSet = new Set(activeValues);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.optionRow}
    >
      {options.map((option) => {
        const isActive = activeValueSet.has(option.value);

        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.84}
            testID={`quickRecordOption_${option.value}`}
            onPress={() => onPress(option.value)}
            style={[
              styles.optionChip,
              isActive && styles.optionChipActive,
              singleChoice && styles.optionChipSingle,
            ]}
          >
            <MaterialIcons
              name={isActive ? 'check-circle' : 'radio-button-unchecked'}
              size={15}
              color={isActive ? '#027a48' : '#667085'}
            />
            <Text
              style={[
                styles.optionChipText,
                isActive && styles.optionChipTextActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const getSingleValue = (
  resource: NewResource,
  fieldName: string
): string[] => {
  const fieldValue = getResourceFieldValue(resource, fieldName);

  return typeof fieldValue === 'string' ? [fieldValue] : [];
};

const getQuickOptionLabel = (
  options: readonly KoreanFieldworkQuickOption[],
  value: string | undefined,
  fallback: string
): string => value
  ? options.find((option) => option.value === value)?.label ?? value
  : fallback;

const getStaleFeatureAttributeClears = (
  category: CategoryForm,
  resource: NewResource,
  nextFeatureType: string
): Record<string, unknown> => {
  const nextFieldNames = getFeatureAttributeFieldNames(
    category,
    resource,
    nextFeatureType
  );
  const updates: Record<string, unknown> = {};

  FEATURE_TYPE_QUICK_OPTIONS
    .flatMap((option) => getKoreanFieldworkFeatureAttributeGroups(
      category,
      { ...resource, featureType: option.value }
    ))
    .forEach((group) => {
      if (
        !nextFieldNames.has(group.fieldName)
        && Object.prototype.hasOwnProperty.call(resource, group.fieldName)
      ) {
        updates[group.fieldName] = undefined;
      }
    });

  return updates;
};

const getFeatureAttributeFieldNames = (
  category: CategoryForm,
  resource: NewResource,
  featureType: string
): Set<string> =>
  new Set(getKoreanFieldworkFeatureAttributeGroups(
    category,
    { ...resource, featureType }
  ).map((group) => group.fieldName));

const getFeatureAttributeSectionTitle = (featureType: string): string => {
  const option = FEATURE_TYPE_QUICK_OPTIONS.find((item) => item.value === featureType);

  return option?.label && option.value !== 'unknown'
    ? `${option.label} 핵심 속성`
    : '유구 핵심 속성';
};

const getQuickRecordPanelTitle = (
  canSelectFeatureType: boolean,
  hasFeatureAttributes: boolean
): string =>
  canSelectFeatureType || hasFeatureAttributes
    ? '유구 성격별 기록'
    : '현장 최소 기록';

const QUICK_OBSERVATION_FIELD_ORDER = [
  'description',
  'featureChecklistNote',
  'interpretation',
  'shortDescription',
] as const;

const getQuickObservationFieldName = (
  fieldNames: Set<string>
): string | undefined =>
  QUICK_OBSERVATION_FIELD_ORDER.find((fieldName) => fieldNames.has(fieldName));

const FeatureAttributeGroup: React.FC<{
  activeValues: string[];
  group: KoreanFieldworkFeatureAttributeGroup;
  onPress: (value: string) => void;
}> = ({
  activeValues,
  group,
  onPress,
}) => (
  <View style={styles.attributeGroup}>
    <Text style={styles.attributeGroupTitle}>{group.title}</Text>
    <OptionRow
      options={group.options}
      activeValues={activeValues}
      onPress={(value) => onPress(value)}
    />
  </View>
);

const getTextValue = (
  resource: NewResource,
  fieldName: string
): string => {
  const fieldValue = getResourceFieldValue(resource, fieldName);

  return typeof fieldValue === 'string' ? fieldValue : '';
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5fbff',
    borderColor: '#b9d9ea',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: '#175cd3',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 5,
  },
  presetRow: {
    paddingRight: 8,
    paddingTop: 9,
  },
  presetButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 7,
    minHeight: 45,
    paddingHorizontal: 9,
    width: 188,
  },
  presetTextWrap: {
    flex: 1,
    marginLeft: 6,
  },
  presetLabel: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
  },
  presetDetail: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },
  sectionDescription: {
    color: '#667085',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  attributeGroup: {
    marginBottom: 7,
  },
  attributeGroupTitle: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },
  photoProgressSummary: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 7,
    minHeight: 34,
    paddingHorizontal: 8,
  },
  photoProgressStage: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  photoProgressLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },
  photoProgressPercent: {
    color: '#175cd3',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
  },
  photoProgressCount: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
  },
  detailChecklistToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginTop: 7,
    minHeight: 28,
  },
  detailChecklistToggleText: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
  },
  detailChecklist: {
    marginTop: 3,
  },
  inlineRecordCharacter: {
    borderTopColor: '#d0d5dd',
    borderTopWidth: 1,
    marginTop: 9,
    paddingTop: 8,
  },
  inlineRecordCharacterLabel: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },
  timingSection: {
    marginTop: 9,
  },
  timingToggle: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
    minHeight: 36,
    paddingHorizontal: 9,
  },
  timingSummary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timingSummaryLabel: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 5,
  },
  timingSummaryValue: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
  },
  timingEditAction: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timingEditActionText: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 2,
  },
  timingEditor: {
    marginTop: 6,
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
  optionChipSingle: {
    minWidth: 86,
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
  orientationSummary: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginBottom: 6,
  },
  orientationInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  orientationDirectionInput: {
    flexGrow: 0,
    textAlign: 'center',
    width: 58,
  },
  orientationDegreeInput: {
    flexGrow: 0,
    marginHorizontal: 7,
    textAlign: 'center',
    width: 74,
  },
  orientationDirectionPicker: {
    marginTop: 8,
  },
  orientationDirectionButtonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  orientationDirectionButtonLabel: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 7,
    width: 42,
  },
  orientationDirectionButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginRight: 6,
    width: 34,
  },
  orientationDirectionButtonSelected: {
    backgroundColor: '#ecfdf3',
    borderColor: '#32d583',
  },
  orientationDirectionButtonText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '900',
  },
  orientationDirectionButtonTextSelected: {
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
  noteInput: {
    fontWeight: '700',
    minHeight: 54,
    textAlignVertical: 'top',
  },
  observationInput: {
    fontWeight: '700',
    minHeight: 72,
    textAlignVertical: 'top',
  },
});

export default KoreanFieldworkQuickRecordPanel;
