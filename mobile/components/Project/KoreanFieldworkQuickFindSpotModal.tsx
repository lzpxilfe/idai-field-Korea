import { MaterialIcons } from '@expo/vector-icons';
import { Document, NewResource } from 'idai-field-core';
import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import KoreanFieldworkFindSpotPanel, {
  getKoreanFieldworkFindSpotItemCount,
  KOREAN_FIELDWORK_FIND_SPOT_FIELDS,
} from './KoreanFieldworkFindSpotPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

interface Props {
  documents: readonly Document[];
  initialResource: NewResource;
  onClose: () => void;
  onSave: (resource: NewResource) => Promise<void>;
  parentDocument: Document;
}

const KoreanFieldworkQuickFindSpotModal: React.FC<Props> = ({
  documents,
  initialResource,
  onClose,
  onSave,
  parentDocument,
}) => {
  const [resource, setResource] = useState(initialResource);
  const [isSaving, setIsSaving] = useState(false);
  const isSample = resource.category === KOREAN_FIELDWORK_CATEGORIES.SAMPLE;
  const pointCount = getKoreanFieldworkFindSpotItemCount(
    resource[KOREAN_FIELDWORK_FIND_SPOT_FIELDS.items]
  );
  const hasPoint = pointCount > 0;
  const title = isSample ? '시료 위치' : '유물 위치';

  const save = async () => {
    if (!hasPoint || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(resource);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      testID="quickFindSpotModal"
      visible
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialIcons name="place" size={20} color="#344054" />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.pointCount} testID="quickFindSpotCount">
              {`${pointCount}\uc810`}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityLabel={`${title} 저장`}
              activeOpacity={0.84}
              disabled={!hasPoint || isSaving}
              onPress={save}
              style={[
                styles.saveButton,
                (!hasPoint || isSaving) && styles.saveButtonDisabled,
              ]}
              testID="quickFindSpotSave"
            >
              <MaterialIcons name="save" size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {isSaving ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="닫기"
              activeOpacity={0.84}
              disabled={isSaving}
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
              testID="quickFindSpotClose"
            >
              <MaterialIcons name="close" size={22} color="#344054" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <KoreanFieldworkFindSpotPanel
            compact
            documents={documents}
            parentDocument={parentDocument}
            resource={resource}
            onUpdateResourceFields={(updates) => setResource((current) => ({
              ...current,
              ...updates,
            }))}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f2f4f7',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4e7ec',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 14,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  title: {
    color: '#1d2939',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 6,
  },
  pointCount: {
    backgroundColor: '#eef2f6',
    borderRadius: 6,
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
    minWidth: 38,
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f4e',
    borderRadius: 6,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    minWidth: 82,
    paddingHorizontal: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#98a2b3',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 4,
  },
  closeButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 38,
  },
});

export default KoreanFieldworkQuickFindSpotModal;
