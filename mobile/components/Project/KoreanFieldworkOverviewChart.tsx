import { MaterialIcons } from '@expo/vector-icons';
import {
  Document,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/utils/colors';
import { KoreanFieldworkInvestigationModeId } from './korean-fieldwork-investigation-mode';
import {
  getKoreanFieldworkOverviewChartData,
  KoreanFieldworkOverviewMetric,
  KoreanFieldworkOverviewSegment,
  KoreanFieldworkOverviewTone,
} from './korean-fieldwork-overview-chart';

interface KoreanFieldworkOverviewChartProps {
  summary: KoreanFieldworkTodaySummary;
  documents: Document[];
  currentScopeLabel: string;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  onReturnToInvestigationOverview: () => void;
}

const KoreanFieldworkOverviewChart: React.FC<KoreanFieldworkOverviewChartProps> = ({
  summary,
  documents,
  currentScopeLabel,
  investigationModeId,
  onReturnToInvestigationOverview,
}) => {
  const data = useMemo(
    () => getKoreanFieldworkOverviewChartData(
      summary,
      documents,
      investigationModeId
    ),
    [documents, investigationModeId, summary]
  );

  return (
    <View style={styles.container} testID="koreanFieldworkOverviewChart">
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>전체 현황</Text>
          <Text style={styles.title}>유적·유구 차트</Text>
          <Text style={styles.scopeText} numberOfLines={1}>
            {currentScopeLabel} · 기록 {data.totalDocumentCount}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="전체 조사 현황으로 돌아가기"
          activeOpacity={0.86}
          onPress={onReturnToInvestigationOverview}
          style={styles.returnButton}
          testID="fieldworkOverviewReturnToInvestigation"
        >
          <MaterialIcons name="account-tree" size={18} color="#175cd3" />
          <Text style={styles.returnButtonText}>조사</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricRow}>
        {data.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </View>

      <ChartBlock
        title="전체 유구 현황"
        subtitle={`${data.investigationUnitCount}단위`}
        segments={data.investigationSegments}
        emptyText="유구 현황 없음"
        actionSegmentId="operation"
        onActionSegmentPress={onReturnToInvestigationOverview}
      />
      <ChartBlock
        title="유구·피트 진행"
        subtitle={`${data.featureWorkflowCount}건`}
        segments={data.featureStatusSegments}
        emptyText="유구 기록 없음"
      />

      <View style={styles.footerRow}>
        <FooterStat
          label="과정"
          value={data.checklistTotal > 0
            ? `${data.checklistDone}/${data.checklistTotal}`
            : '0/0'}
          tone={data.checklistPercent >= 100 ? 'success' : 'info'}
        />
        <FooterStat
          label="확인 필요"
          value={`${data.openIssueCount}`}
          tone={data.openIssueCount > 0 ? 'warning' : 'success'}
        />
        <FooterStat
          label="필수"
          value={`${data.criticalIssueCount}`}
          tone={data.criticalIssueCount > 0 ? 'danger' : 'neutral'}
        />
      </View>
    </View>
  );
};

const MetricCard: React.FC<{
  metric: KoreanFieldworkOverviewMetric;
}> = ({ metric }) => (
  <View style={[styles.metricCard, metricToneStyle(metric.tone)]}>
    <MaterialIcons
      name={metricIcon(metric.id)}
      size={18}
      color={toneColor(metric.tone)}
    />
    <Text style={[styles.metricValue, metricTextToneStyle(metric.tone)]}>
      {metric.value}
    </Text>
    <Text style={styles.metricLabel} numberOfLines={1}>{metric.label}</Text>
    <Text style={styles.metricDetail} numberOfLines={1}>{metric.detail}</Text>
  </View>
);

const ChartBlock: React.FC<{
  title: string;
  subtitle: string;
  segments: KoreanFieldworkOverviewSegment[];
  emptyText: string;
  actionSegmentId?: string;
  onActionSegmentPress?: () => void;
}> = ({
  title,
  subtitle,
  segments,
  emptyText,
  actionSegmentId,
  onActionSegmentPress,
}) => {
  const visibleSegments = segments.filter((segment) => segment.count > 0);

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.track}>
        {visibleSegments.length > 0 ? visibleSegments.map((segment) => (
          <View
            key={segment.id}
            style={[
              styles.trackSegment,
              {
                backgroundColor: toneColor(segment.tone),
                flex: segment.count,
              },
            ]}
          />
        )) : (
          <View style={styles.emptyTrack}>
            <Text style={styles.emptyTrackText}>{emptyText}</Text>
          </View>
        )}
      </View>
      <View style={styles.legendRow}>
        {segments.map((segment) => (
          <SegmentLegend
            key={segment.id}
            segment={segment}
            isAction={segment.id === actionSegmentId}
            onPress={onActionSegmentPress}
          />
        ))}
      </View>
    </View>
  );
};

const SegmentLegend: React.FC<{
  segment: KoreanFieldworkOverviewSegment;
  isAction: boolean;
  onPress?: () => void;
}> = ({
  segment,
  isAction,
  onPress,
}) => {
  const content = (
    <>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: toneColor(segment.tone) },
        ]}
      />
      <Text style={styles.legendLabel} numberOfLines={1}>{segment.label}</Text>
      <Text style={styles.legendCount}>{segment.count}</Text>
      <Text style={styles.legendPercent}>{segment.percent}%</Text>
    </>
  );

  if (isAction && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={[styles.legendItem, styles.legendItemAction]}
        testID={`overviewSegment_${segment.id}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.legendItem}>
      {content}
    </View>
  );
};

const FooterStat: React.FC<{
  label: string;
  value: string;
  tone: KoreanFieldworkOverviewTone;
}> = ({ label, value, tone }) => (
  <View style={styles.footerStat}>
    <Text style={styles.footerLabel}>{label}</Text>
    <Text style={[styles.footerValue, metricTextToneStyle(tone)]}>{value}</Text>
  </View>
);

const metricIcon = (
  id: string
): keyof typeof MaterialIcons.glyphMap => {
  switch (id) {
    case 'investigation':
      return 'account-tree';
    case 'feature':
      return 'add-location-alt';
    case 'evidence':
      return 'collections';
    case 'process':
      return 'playlist-add-check';
    case 'review':
      return 'priority-high';
    default:
      return 'bar-chart';
  }
};

const toneColor = (tone: KoreanFieldworkOverviewTone): string => {
  switch (tone) {
    case 'danger':
      return colors.danger;
    case 'warning':
      return '#dc6803';
    case 'info':
      return '#175cd3';
    case 'success':
      return '#027a48';
    default:
      return '#667085';
  }
};

const metricToneStyle = (
  tone: KoreanFieldworkOverviewTone
) => {
  switch (tone) {
    case 'danger':
      return styles.metricDanger;
    case 'warning':
      return styles.metricWarning;
    case 'info':
      return styles.metricInfo;
    case 'success':
      return styles.metricSuccess;
    default:
      return styles.metricNeutral;
  }
};

const metricTextToneStyle = (
  tone: KoreanFieldworkOverviewTone
) => {
  switch (tone) {
    case 'danger':
      return styles.textDanger;
    case 'warning':
      return styles.textWarning;
    case 'info':
      return styles.textInfo;
    case 'success':
      return styles.textSuccess;
    default:
      return styles.textNeutral;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomColor: '#d0d5dd',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  kicker: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: '#1f2937',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  scopeText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  returnButton: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  returnButtonText: {
    color: '#175cd3',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 6,
  },
  metricCard: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    marginTop: 4,
    minHeight: 82,
    minWidth: 96,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  metricNeutral: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
  },
  metricInfo: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
  },
  metricSuccess: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  metricWarning: {
    backgroundColor: '#fffaeb',
    borderColor: '#fedf89',
  },
  metricDanger: {
    backgroundColor: '#fff1f3',
    borderColor: '#fecdca',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  metricLabel: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 1,
  },
  metricDetail: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  chartBlock: {
    marginTop: 11,
  },
  chartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTitle: {
    color: '#27343b',
    fontSize: 13,
    fontWeight: '900',
  },
  chartSubtitle: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
  },
  track: {
    backgroundColor: '#eef2f6',
    borderRadius: 5,
    flexDirection: 'row',
    height: 14,
    marginTop: 7,
    overflow: 'hidden',
  },
  trackSegment: {
    height: 14,
  },
  emptyTrack: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyTrackText: {
    color: '#98a2b3',
    fontSize: 10,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    marginTop: 7,
  },
  legendItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#eaecf0',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 5,
    marginHorizontal: 3,
    minHeight: 28,
    paddingHorizontal: 6,
  },
  legendItemAction: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 4,
    width: 8,
  },
  legendLabel: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 60,
  },
  legendCount: {
    color: '#1f2937',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 5,
  },
  legendPercent: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  footerRow: {
    borderTopColor: '#eef0f3',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
  },
  footerStat: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 12,
  },
  footerLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 4,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  textNeutral: {
    color: '#475467',
  },
  textInfo: {
    color: '#175cd3',
  },
  textSuccess: {
    color: '#027a48',
  },
  textWarning: {
    color: '#b54708',
  },
  textDanger: {
    color: colors.danger,
  },
});

export default KoreanFieldworkOverviewChart;
