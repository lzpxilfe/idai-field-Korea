import { MaterialIcons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import KoreanFieldworkDrawingSurveyPanel from './KoreanFieldworkDrawingSurveyPanel';

type DrawingStatus = 'notStarted' | 'inProgress' | 'completed';

interface Props {
  document: Document;
  drawingRecordCount?: number;
  onOpenDrawingRecords?: () => void;
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
}

const DRAWING_CHECKLIST_VALUE = 'measuredDrawingCompleted';
const STATUS_OPTIONS: readonly { label: string; value: DrawingStatus }[] = [
  { label: '실측 전', value: 'notStarted' },
  { label: '실측 중', value: 'inProgress' },
  { label: '실측 완료', value: 'completed' },
];

const KoreanFieldworkFeatureDrawingStatusPanel: React.FC<Props> = ({
  document,
  drawingRecordCount = 0,
  onOpenDrawingRecords,
  onUpdateResourceFields,
}) => {
  const resource = document.resource as Record<string, unknown>;
  const checklist = useMemo(
    () => getStringArray(resource.featureInvestigationChecklist),
    [resource.featureInvestigationChecklist]
  );
  const savedStatus = getDrawingStatus(resource.featureDrawingStatus, checklist);
  const savedNote = typeof resource.featureChecklistNote === 'string'
    ? resource.featureChecklistNote
    : '';
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<DrawingStatus>(savedStatus);
  const [note, setNote] = useState(savedNote);

  useEffect(() => {
    if (isOpen) return;
    setStatus(savedStatus);
    setNote(savedNote);
  }, [isOpen, savedNote, savedStatus]);

  const selectStatus = (nextStatus: DrawingStatus) => {
    setStatus(nextStatus);
    onUpdateResourceFields({
      featureDrawingStatus: nextStatus,
      featureInvestigationChecklist: nextStatus === 'completed'
        ? addUnique(checklist, DRAWING_CHECKLIST_VALUE)
        : checklist.filter((value) => value !== DRAWING_CHECKLIST_VALUE),
    });
  };

  const saveNote = () => {
    onUpdateResourceFields({ featureChecklistNote: note.trim() });
    setIsOpen(false);
  };

  const statusLabel = STATUS_OPTIONS.find((option) =>
    option.value === savedStatus)?.label ?? '실측 전';

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`${statusLabel}, 진행 확인과 메모`}
        activeOpacity={0.82}
        onPress={() => setIsOpen(true)}
        style={[
          styles.trigger,
          savedStatus === 'completed' && styles.triggerCompleted,
        ]}
        testID="evidenceChip_drawings"
      >
        <MaterialIcons
          name={savedStatus === 'completed' ? 'task-alt' : 'architecture'}
          size={13}
          color={savedStatus === 'completed' ? '#027a48' : '#175cd3'}
        />
        <Text
          style={[
            styles.triggerText,
            savedStatus === 'completed' && styles.triggerTextCompleted,
          ]}
        >
          {statusLabel}
        </Text>
        <MaterialIcons name="chevron-right" size={15} color="#667085" />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.overlay} testID="featureDrawingStatusModal">
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <MaterialIcons name="architecture" size={20} color="#344054" />
                <Text style={styles.title}>실측·도면 진행</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="닫기"
                hitSlop={8}
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={22} color="#344054" />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              새 도면을 추가하지 않고 현재 실측 진행 상태와 현장 메모를 남깁니다.
            </Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => {
                const isActive = option.value === status;

                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.84}
                    onPress={() => selectStatus(option.value)}
                    style={[styles.statusButton, isActive && styles.statusButtonActive]}
                    testID={`featureDrawingStatus_${option.value}`}
                  >
                    <MaterialIcons
                      name={isActive ? 'check-circle' : 'radio-button-unchecked'}
                      size={17}
                      color={isActive ? '#2f6f4e' : '#98a2b3'}
                    />
                    <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <KoreanFieldworkDrawingSurveyPanel
              allowFeature
              onUpdateResourceFields={onUpdateResourceFields}
              resource={document.resource}
            />

            <Text style={styles.memoLabel}>현장 메모</Text>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="남은 실측, 보완할 선, 확인할 부분을 적으세요."
              placeholderTextColor="#98a2b3"
              style={styles.memoInput}
              testID="featureDrawingNote"
              textAlignVertical="top"
              value={note}
            />

            <View style={styles.footer}>
              {drawingRecordCount > 0 && !!onOpenDrawingRecords && (
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => {
                    setIsOpen(false);
                    onOpenDrawingRecords();
                  }}
                  style={styles.existingButton}
                  testID="featureDrawingRecordsOpen"
                >
                  <Text style={styles.existingButtonText}>
                    기존 도면 {drawingRecordCount}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={saveNote}
                style={styles.saveButton}
                testID="featureDrawingSave"
              >
                <Text style={styles.saveButtonText}>메모 저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const getDrawingStatus = (
  value: unknown,
  checklist: string[]
): DrawingStatus => {
  if (checklist.includes(DRAWING_CHECKLIST_VALUE)) return 'completed';
  if (value === 'inProgress') return 'inProgress';
  return 'notStarted';
};

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const addUnique = (values: string[], value: string): string[] =>
  values.includes(value) ? values : [...values, value];

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    height: 24,
    marginBottom: 4,
    marginHorizontal: 2,
    paddingHorizontal: 6,
  },
  triggerCompleted: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  triggerText: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  triggerTextCompleted: {
    color: '#027a48',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 24, 40, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxWidth: 620,
    padding: 18,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: '#1d2939',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 7,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  description: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  statusRow: {
    flexDirection: 'row',
    marginHorizontal: -3,
    marginTop: 14,
  },
  statusButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e4e7ec',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 3,
    minHeight: 42,
    paddingHorizontal: 8,
  },
  statusButtonActive: {
    backgroundColor: '#ecfdf3',
    borderColor: '#6ce9a6',
  },
  statusText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  statusTextActive: {
    color: '#027a48',
  },
  memoLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 16,
  },
  memoInput: {
    borderColor: '#d0d5dd',
    borderRadius: 7,
    borderWidth: 1,
    color: '#1d2939',
    fontSize: 13,
    height: 110,
    marginTop: 7,
    padding: 10,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  existingButton: {
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  existingButtonText: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: '#2f6f4e',
    borderRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default KoreanFieldworkFeatureDrawingStatusPanel;
