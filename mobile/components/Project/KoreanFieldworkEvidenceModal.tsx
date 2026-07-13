import { MaterialIcons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getKoreanFieldworkCategoryLabel } from './korean-fieldwork-categories';
import { KoreanFieldworkEvidenceChip } from './korean-fieldwork-record-evidence';

interface Props {
  canCreate: boolean;
  chip: KoreanFieldworkEvidenceChip;
  onClose: () => void;
  onCreate: () => void;
  onOpenDocument: (document: Document) => void;
}

const KoreanFieldworkEvidenceModal: React.FC<Props> = ({
  canCreate,
  chip,
  onClose,
  onCreate,
  onOpenDocument,
}) => (
  <Modal
    animationType="slide"
    onRequestClose={onClose}
    presentationStyle="fullScreen"
    statusBarTranslucent={false}
    testID="evidenceManagerModal"
    visible
  >
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{chip.label}</Text>
          <Text style={styles.count} testID="evidenceManagerCount">
            {chip.count}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {canCreate && (
            <TouchableOpacity
              accessibilityLabel={`${chip.label} 추가`}
              activeOpacity={0.84}
              onPress={onCreate}
              style={styles.addButton}
              testID="evidenceManagerAdd"
            >
              <MaterialIcons name="add" size={19} color="#ffffff" />
              <Text style={styles.addButtonText}>추가</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityLabel="닫기"
            activeOpacity={0.84}
            hitSlop={8}
            onPress={onClose}
            style={styles.closeButton}
            testID="evidenceManagerClose"
          >
            <MaterialIcons name="close" size={22} color="#344054" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        contentContainerStyle={
          chip.documents.length === 0 ? styles.emptyList : styles.list
        }
        data={chip.documents}
        keyExtractor={(document) => document.resource.id}
        ListEmptyComponent={(
          <View style={styles.emptyState} testID="evidenceManagerEmpty">
            <MaterialIcons name="inbox" size={28} color="#98a2b3" />
            <Text style={styles.emptyText}>아직 추가된 기록이 없습니다.</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            accessibilityLabel={`${item.resource.identifier} 열기`}
            activeOpacity={0.84}
            onPress={() => onOpenDocument(item)}
            style={styles.recordRow}
            testID={`evidenceManagerRecord_${item.resource.id}`}
          >
            <Text style={styles.recordNumber}>{index + 1}</Text>
            <View style={styles.recordText}>
              <Text style={styles.recordIdentifier} numberOfLines={1}>
                {item.resource.identifier || item.resource.id}
              </Text>
              <Text style={styles.recordCategory} numberOfLines={1}>
                {getKoreanFieldworkCategoryLabel(item.resource.category)}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={21} color="#667085" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#e4e7ec',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 16,
  },
  headerText: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  title: {
    color: '#1d2939',
    fontSize: 19,
    fontWeight: '900',
  },
  count: {
    backgroundColor: '#eef2f6',
    borderRadius: 7,
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 8,
    minWidth: 28,
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: 'center',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 12,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f4e',
    borderRadius: 6,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 3,
  },
  closeButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 38,
  },
  list: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  recordRow: {
    alignItems: 'center',
    borderBottomColor: '#e4e7ec',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  recordNumber: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    width: 30,
  },
  recordText: {
    flex: 1,
    paddingHorizontal: 8,
  },
  recordIdentifier: {
    color: '#1d2939',
    fontSize: 14,
    fontWeight: '900',
  },
  recordCategory: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});

export default KoreanFieldworkEvidenceModal;
