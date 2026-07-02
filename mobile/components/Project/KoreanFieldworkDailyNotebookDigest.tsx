import { MaterialIcons } from '@expo/vector-icons';
import { Document } from 'idai-field-core';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getKoreanFieldworkDailyNotebookDigest,
  KoreanFieldworkNotebookEntry,
} from './korean-fieldwork-field-notes';

interface KoreanFieldworkDailyNotebookDigestProps {
  documents: Document[];
  maxEntries?: number;
  now?: Date;
  onOpenDailyLog?: (document: Document) => void;
  onOpenEntryDocument?: (document: Document) => void;
}

const KoreanFieldworkDailyNotebookDigest: React.FC<
  KoreanFieldworkDailyNotebookDigestProps
> = ({
  documents,
  maxEntries = 4,
  now,
  onOpenDailyLog,
  onOpenEntryDocument,
}) => {
  const digest = useMemo(
    () => getKoreanFieldworkDailyNotebookDigest(
      documents,
      now ?? new Date(),
      maxEntries
    ),
    [documents, maxEntries, now]
  );

  if (!digest.primaryDailyLog && digest.entries.length === 0) return null;

  return (
    <View style={styles.container} testID="fieldDailyNotebookDigest">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="event-note" size={18} color="#175cd3" />
          <Text style={styles.title}>오늘 조사일지</Text>
        </View>
        <Text style={styles.dateLabel}>{digest.dateLabel}</Text>
      </View>

      <View style={styles.metricRow}>
        <DigestMetric label="일지" value={digest.dailyLogDocuments.length} />
        <DigestMetric label="메모" value={digest.entries.length} />
        <DigestMetric label="다음" value={digest.nextWorkEntries.length} />
        <DigestMetric
          label="번호"
          value={digest.evidenceMissingEntries.length}
          warning={digest.evidenceMissingEntries.length > 0}
        />
      </View>

      {digest.primaryDailyLog && (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => onOpenDailyLog?.(digest.primaryDailyLog as Document)}
          style={styles.dailyLogRow}
          testID="fieldDailyNotebookDigestDailyLog"
        >
          <MaterialIcons name="article" size={17} color="#2f5f4a" />
          <View style={styles.dailyLogText}>
            <Text style={styles.dailyLogTitle} numberOfLines={1}>
              {digest.primaryDailyLog.resource.identifier}
            </Text>
            <Text style={styles.dailyLogDetail} numberOfLines={2}>
              {String(digest.primaryDailyLog.resource.description ?? '')}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color="#667085" />
        </TouchableOpacity>
      )}

      {digest.entries.slice(0, maxEntries).map((entry) => (
        <DigestEntryRow
          entry={entry}
          key={entry.id}
          onOpenEntryDocument={onOpenEntryDocument}
        />
      ))}
    </View>
  );
};

const DigestMetric: React.FC<{
  label: string;
  value: number;
  warning?: boolean;
}> = ({ label, value, warning }) => (
  <View style={[styles.metric, warning && styles.metricWarning]}>
    <Text style={[styles.metricValue, warning && styles.metricValueWarning]}>
      {value}
    </Text>
    <Text style={[styles.metricLabel, warning && styles.metricLabelWarning]}>
      {label}
    </Text>
  </View>
);

const DigestEntryRow: React.FC<{
  entry: KoreanFieldworkNotebookEntry;
  onOpenEntryDocument?: (document: Document) => void;
}> = ({ entry, onOpenEntryDocument }) => {
  const documentToOpen = entry.targetDocument ?? entry.sourceDocument;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => onOpenEntryDocument?.(documentToOpen)}
      style={[
        styles.entryRow,
        entry.needsEvidenceNumbers && styles.entryRowWarning,
      ]}
      testID={`fieldDailyNotebookDigestEntry_${entry.id}`}
    >
      <View style={styles.entryIcon}>
        <MaterialIcons
          name={entry.nextWork ? 'task-alt' : 'notes'}
          size={16}
          color={entry.nextWork ? '#b54708' : '#175cd3'}
        />
      </View>
      <View style={styles.entryText}>
        <View style={styles.entryMetaRow}>
          <Text style={styles.entryCategory} numberOfLines={1}>
            {entry.targetCategoryLabel}
          </Text>
          <Text style={styles.entryTarget} numberOfLines={1}>
            {entry.targetLabel}
          </Text>
        </View>
        <Text style={styles.entryDetail} numberOfLines={2}>
          {entry.detail}
        </Text>
        {!!entry.nextWork && (
          <Text style={styles.nextWorkText} numberOfLines={1}>
            다음: {entry.nextWork}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d7de',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  dailyLogDetail: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 17,
  },
  dailyLogRow: {
    alignItems: 'center',
    backgroundColor: '#f6fef9',
    borderColor: '#abefc6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  dailyLogText: {
    flex: 1,
    gap: 2,
  },
  dailyLogTitle: {
    color: '#1f3d2f',
    fontSize: 13,
    fontWeight: '800',
  },
  dateLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  entryCategory: {
    color: '#175cd3',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '800',
  },
  entryDetail: {
    color: '#344054',
    fontSize: 12,
    lineHeight: 17,
  },
  entryIcon: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  entryMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  entryRow: {
    backgroundColor: '#f8fafc',
    borderColor: '#e4e7ec',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  entryRowWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fedf89',
  },
  entryTarget: {
    color: '#475467',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  entryText: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    borderRadius: 8,
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  metricLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
  },
  metricLabelWarning: {
    color: '#b54708',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricValue: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  metricValueWarning: {
    color: '#b54708',
  },
  metricWarning: {
    backgroundColor: '#fffbeb',
  },
  nextWorkText: {
    color: '#b54708',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});

export default KoreanFieldworkDailyNotebookDigest;
