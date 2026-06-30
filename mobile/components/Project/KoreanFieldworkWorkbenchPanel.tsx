import { MaterialIcons } from '@expo/vector-icons';
import {
  Document,
  KoreanFieldworkTodaySummary,
} from 'idai-field-core';
import React, { useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/utils/colors';
import {
  getKoreanFieldworkWorkbenchItems,
  KoreanFieldworkWorkbenchItem,
} from './korean-fieldwork-workbench';
import {
  getKoreanFieldworkCategoryLabel,
  getKoreanFieldworkDisplayIdentifier,
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';
import { getKoreanFieldworkFeatureTypeLabel } from './korean-fieldwork-feature-types';
import {
  getKoreanFieldworkRecordActionSummary,
  KoreanFieldworkRecordActionItem,
} from './korean-fieldwork-record-actions';
import { KoreanFieldworkStatusTone } from './korean-fieldwork-record-summary';
import { KoreanFieldworkInvestigationModeId } from './korean-fieldwork-investigation-mode';

interface KoreanFieldworkWorkbenchPanelProps {
  summary: KoreanFieldworkTodaySummary;
  documents: Document[];
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  onEditDocument: (docId: string, categoryName: string) => void;
  onAddDocumentOfCategory?: (parentDoc: Document, categoryName: string) => void;
  getAllowedAddCategoryNames?: (document: Document) => string[];
  maxItems?: number;
}

const KoreanFieldworkWorkbenchPanel: React.FC<KoreanFieldworkWorkbenchPanelProps> = ({
  summary,
  documents,
  investigationModeId,
  onEditDocument,
  onAddDocumentOfCategory,
  getAllowedAddCategoryNames,
  maxItems = 8,
}) => {
  const [featureViewMode, setFeatureViewMode] =
    useState<'all'|'byType'>('all');
  const items = useMemo(
    () => getKoreanFieldworkWorkbenchItems(
      summary,
      documents,
      maxItems,
      investigationModeId
    ),
    [documents, investigationModeId, maxItems, summary]
  );
  const scopeDocuments = useMemo(
    () => documents.filter((document) =>
      SCOPE_LAYER_CATEGORIES.has(document.resource.category)
    ),
    [documents]
  );
  const scopeItems = useMemo(
    () => items.filter((item) =>
      SCOPE_LAYER_CATEGORIES.has(item.document.resource.category)
    ),
    [items]
  );
  const scopeItemsByDocumentId = useMemo(
    () => new Map(scopeItems.map((item) => [
      item.document.resource.id,
      item,
    ])),
    [scopeItems]
  );
  const featureDocuments = useMemo(
    () => documents.filter((document) =>
      document.resource.category === C.FEATURE
    ),
    [documents]
  );
  const featureItems = useMemo(
    () => items.filter((item) =>
      item.document.resource.category === C.FEATURE
    ),
    [items]
  );
  const otherItems = useMemo(
    () => items.filter((item) =>
      item.document.resource.category !== C.FEATURE
      && !SCOPE_LAYER_CATEGORIES.has(item.document.resource.category)
    ),
    [items]
  );
  const featureGroups = useMemo(
    () => getFeatureDocumentGroups(featureDocuments),
    [featureDocuments]
  );

  if (
    items.length === 0
    && scopeDocuments.length === 0
    && featureDocuments.length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.container} testID="koreanFieldworkWorkbenchPanel">
      <View style={styles.titleRow}>
        <MaterialIcons name="dashboard-customize" size={18} color="#175cd3" />
        <Text style={styles.title}>현장 작업대</Text>
        <Text style={styles.count}>
          경계 {scopeDocuments.length} · 유구 {featureDocuments.length}
        </Text>
      </View>
      {scopeDocuments.length > 0 && (
        <WorkbenchLayerSection
          title="조사 경계"
          detail="조사 구역, 경계, 트렌치 기준을 먼저 봅니다."
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.layerRow}
          >
            {scopeDocuments.map((document) => (
              <ScopeDocumentPill
                document={document}
                item={scopeItemsByDocumentId.get(document.resource.id)}
                key={document.resource.id}
                onPress={() => onEditDocument(
                  document.resource.id,
                  document.resource.category
                )}
              />
            ))}
          </ScrollView>
        </WorkbenchLayerSection>
      )}

      {featureDocuments.length > 0 && (
        <WorkbenchLayerSection
          title="유구"
          detail="전체로 훑거나, 수혈·구상유구·주거지처럼 성격별로 나눠 봅니다."
          right={(
            <View style={styles.segmentedControl}>
              <SegmentButton
                isActive={featureViewMode === 'all'}
                label="전체"
                onPress={() => setFeatureViewMode('all')}
                testID="workbenchFeatureView_all"
              />
              <SegmentButton
                isActive={featureViewMode === 'byType'}
                label="유구 별로"
                onPress={() => setFeatureViewMode('byType')}
                testID="workbenchFeatureView_byType"
              />
            </View>
          )}
        >
          {featureViewMode === 'all' ? (
            featureItems.length > 0 ? (
              <WorkbenchItemRow
                documents={documents}
                getAllowedAddCategoryNames={getAllowedAddCategoryNames}
                investigationModeId={investigationModeId}
                items={featureItems}
                onAddDocumentOfCategory={onAddDocumentOfCategory}
                onEditDocument={onEditDocument}
              />
            ) : (
              <Text style={styles.emptyLayerText}>
                정리 대기 중인 유구는 없습니다. 성격별 보기에서 전체 유구를 확인하세요.
              </Text>
            )
          ) : (
            <View style={styles.featureGroupList}>
              {featureGroups.map((group) => (
                <View key={group.id} style={styles.featureGroup}>
                  <View style={styles.featureGroupHeader}>
                    <Text style={styles.featureGroupTitle}>{group.label}</Text>
                    <Text style={styles.featureGroupCount}>{group.documents.length}</Text>
                  </View>
                  <View style={styles.featurePillWrap}>
                    {group.documents.map((document) => (
                      <FeatureDocumentPill
                        document={document}
                        key={document.resource.id}
                        onPress={() => onEditDocument(
                          document.resource.id,
                          document.resource.category
                        )}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </WorkbenchLayerSection>
      )}

      {otherItems.length > 0 && (
        <WorkbenchLayerSection
          title="그 외 현장 작업"
          detail="유물·시료·점검처럼 바로 이어서 처리할 기록입니다."
        >
          <WorkbenchItemRow
            documents={documents}
            getAllowedAddCategoryNames={getAllowedAddCategoryNames}
            investigationModeId={investigationModeId}
            items={otherItems}
            onAddDocumentOfCategory={onAddDocumentOfCategory}
            onEditDocument={onEditDocument}
          />
        </WorkbenchLayerSection>
      )}
    </View>
  );
};

const C = KOREAN_FIELDWORK_CATEGORIES;

const SCOPE_LAYER_CATEGORIES = new Set<string>([
  C.OPERATION,
  C.SURVEY,
  C.SURVEY_BOUNDARY,
  C.TRENCH,
]);

const WorkbenchLayerSection: React.FC<{
  title: string;
  detail: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({
  title,
  detail,
  children,
  right,
}) => (
  <View style={styles.layerSection}>
    <View style={styles.layerHeader}>
      <View style={styles.layerHeaderText}>
        <Text style={styles.layerTitle}>{title}</Text>
        <Text style={styles.layerDetail} numberOfLines={1}>{detail}</Text>
      </View>
      {right}
    </View>
    {children}
  </View>
);

const WorkbenchItemRow: React.FC<{
  documents: Document[];
  getAllowedAddCategoryNames?: (document: Document) => string[];
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  items: KoreanFieldworkWorkbenchItem[];
  onAddDocumentOfCategory?: (parentDoc: Document, categoryName: string) => void;
  onEditDocument: (docId: string, categoryName: string) => void;
}> = ({
  documents,
  getAllowedAddCategoryNames,
  investigationModeId,
  items,
  onAddDocumentOfCategory,
  onEditDocument,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.itemRow}
  >
    {items.map((item) => (
      <WorkbenchCard
        key={item.id}
        actions={getKoreanFieldworkRecordActionSummary(
          item.document,
          documents,
          getAllowedAddCategoryNames?.(item.document) ?? [],
          investigationModeId
        ).actions.slice(0, 2)}
        item={item}
        onActionPress={(action) => {
          if (action.type === 'openDocument' && action.document) {
            onEditDocument(
              action.document.resource.id,
              action.document.resource.category
            );
            return;
          }

          if (
            action.type === 'createDocument'
            && action.categoryName
            && onAddDocumentOfCategory
          ) {
            onAddDocumentOfCategory(item.document, action.categoryName);
          }
        }}
        onPress={() => onEditDocument(
          item.document.resource.id,
          item.document.resource.category
        )}
      />
    ))}
  </ScrollView>
);

const WorkbenchCard: React.FC<{
  item: KoreanFieldworkWorkbenchItem;
  actions: KoreanFieldworkRecordActionItem[];
  onActionPress: (action: KoreanFieldworkRecordActionItem) => void;
  onPress: () => void;
}> = ({
  item,
  actions,
  onActionPress,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    onPress={onPress}
    style={[styles.card, toneCardStyle(item.tone)]}
    testID={`workbenchItem_${item.id}`}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.categoryLabel} numberOfLines={1}>
        {item.categoryLabel}
      </Text>
      <MaterialIcons name="edit-note" size={16} color={toneIconColor(item.tone)} />
    </View>
    <Text style={styles.cardTitle} numberOfLines={1}>
      {item.title}
    </Text>
    {!!item.parentPath && (
      <Text style={styles.parentPath} numberOfLines={1}>
        {item.parentPath}
      </Text>
    )}
    <View style={styles.reasonRow}>
      {item.reasons.map((reason) => (
        <Text key={reason} style={[styles.reasonChip, toneReasonStyle(item.tone)]}>
          {reason}
        </Text>
      ))}
    </View>
    {item.statusChips.length > 0 && (
      <View style={styles.statusRow}>
        {item.statusChips.slice(0, 3).map((chip) => (
          <Text
            key={chip.label}
            style={[styles.statusChip, statusChipStyle(chip.tone)]}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
        ))}
      </View>
    )}
    <View style={styles.actionRow}>
      <WorkbenchAction
        icon="open-in-new"
        label="열기"
        onPress={(event) => {
          event?.stopPropagation?.();
          onPress();
        }}
        testID={`workbenchOpen_${item.id}`}
        tone={item.tone}
      />
      {actions.map((action) => (
        <WorkbenchAction
          key={action.id}
          icon={action.icon as keyof typeof MaterialIcons.glyphMap}
          label={action.label}
          onPress={(event) => {
            event?.stopPropagation?.();
            onActionPress(action);
          }}
          testID={`workbenchAction_${item.id}_${action.id}`}
          tone={action.tone}
        />
      ))}
    </View>
  </TouchableOpacity>
);

const ScopeDocumentPill: React.FC<{
  document: Document;
  item?: KoreanFieldworkWorkbenchItem;
  onPress: () => void;
}> = ({ document, item, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.86}
    onPress={onPress}
    style={styles.scopePill}
    testID={`workbenchScope_${document.resource.id}`}
  >
    <MaterialIcons name={getScopeDocumentIcon(document)} size={16} color="#2f5f4a" />
    <View style={styles.scopePillText}>
      <Text style={styles.scopePillCategory} numberOfLines={1}>
        {getKoreanFieldworkCategoryLabel(document.resource.category)}
      </Text>
      <Text style={styles.scopePillTitle} numberOfLines={1}>
        {getDisplayIdentifier(document)}
      </Text>
      {!!item && item.reasons.length > 0 && (
        <View style={styles.scopeReasonRow}>
          {item.reasons.slice(0, 3).map((reason) => (
            <Text
              key={reason}
              numberOfLines={1}
              style={[
                styles.scopeReasonChip,
                toneReasonStyle(item.tone),
              ]}
            >
              {reason}
            </Text>
          ))}
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const FeatureDocumentPill: React.FC<{
  document: Document;
  onPress: () => void;
}> = ({ document, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.86}
    onPress={onPress}
    style={styles.featurePill}
    testID={`workbenchFeature_${document.resource.id}`}
  >
    <MaterialIcons name="crop-square" size={14} color="#175cd3" />
    <Text style={styles.featurePillText} numberOfLines={1}>
      {getDisplayIdentifier(document)}
    </Text>
  </TouchableOpacity>
);

const SegmentButton: React.FC<{
  isActive: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}> = ({
  isActive,
  label,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityState={{ selected: isActive }}
    onPress={onPress}
    style={[
      styles.segmentButton,
      isActive && styles.segmentButtonActive,
    ]}
    testID={testID}
  >
    <Text style={[
      styles.segmentButtonText,
      isActive && styles.segmentButtonTextActive,
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const WorkbenchAction: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: (event?: GestureResponderEvent) => void;
  testID: string;
  tone: KoreanFieldworkStatusTone;
}> = ({
  icon,
  label,
  onPress,
  testID,
  tone,
}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    activeOpacity={0.84}
    onPress={onPress}
    style={[styles.actionButton, actionButtonToneStyle(tone)]}
    testID={testID}
  >
    <MaterialIcons name={icon} size={14} color={toneIconColor(tone)} />
    <Text
      style={[styles.actionLabel, actionLabelToneStyle(tone)]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const getFeatureDocumentGroups = (
  documents: Document[]
): Array<{ id: string; label: string; documents: Document[] }> => {
  const groups = documents.reduce((index, document) => {
    const typeValue = getResourceValue(document, 'featureType') ?? 'unknown';
    const typeId = typeof typeValue === 'string' ? typeValue : 'unknown';
    const label = getKoreanFieldworkFeatureTypeLabel(typeId) ?? '미정';
    const current = index.get(typeId) ?? {
      id: typeId,
      label,
      documents: [],
    };
    current.documents.push(document);
    index.set(typeId, current);
    return index;
  }, new Map<string, { id: string; label: string; documents: Document[] }>());

  return Array.from(groups.values())
    .sort((a, b) => a.label.localeCompare(b.label));
};

const getDisplayIdentifier = (document: Document): string =>
  getKoreanFieldworkDisplayIdentifier(document.resource.identifier)
  || document.resource.id;

const getResourceValue = (
  document: Document,
  fieldName: string
): unknown => (
  document.resource as unknown as Record<string, unknown>
)[fieldName];

const getScopeDocumentIcon = (
  document: Document
): keyof typeof MaterialIcons.glyphMap => {
  switch (document.resource.category) {
    case C.SURVEY_BOUNDARY:
      return 'polyline';
    case C.TRENCH:
      return 'view-stream';
    case C.SURVEY:
      return 'explore';
    default:
      return 'account-tree';
  }
};

const toneCardStyle = (tone: KoreanFieldworkStatusTone) => {
  switch (tone) {
    case 'danger':
      return styles.cardDanger;
    case 'warning':
      return styles.cardWarning;
    case 'info':
      return styles.cardInfo;
    case 'success':
      return styles.cardSuccess;
    default:
      return styles.cardNeutral;
  }
};

const toneReasonStyle = (tone: KoreanFieldworkStatusTone) => {
  switch (tone) {
    case 'danger':
      return styles.reasonDanger;
    case 'warning':
      return styles.reasonWarning;
    case 'info':
      return styles.reasonInfo;
    case 'success':
      return styles.reasonSuccess;
    default:
      return styles.reasonNeutral;
  }
};

const toneIconColor = (tone: KoreanFieldworkStatusTone): string => {
  switch (tone) {
    case 'danger':
      return colors.danger;
    case 'warning':
      return '#b54708';
    case 'info':
      return '#175cd3';
    case 'success':
      return '#027a48';
    default:
      return '#475467';
  }
};

const statusChipStyle = (tone: KoreanFieldworkStatusTone) => {
  switch (tone) {
    case 'danger':
      return styles.statusDanger;
    case 'warning':
      return styles.statusWarning;
    case 'info':
      return styles.statusInfo;
    case 'success':
      return styles.statusSuccess;
    default:
      return styles.statusNeutral;
  }
};

const actionButtonToneStyle = (tone: KoreanFieldworkStatusTone) => {
  switch (tone) {
    case 'danger':
      return styles.actionDanger;
    case 'warning':
      return styles.actionWarning;
    case 'info':
      return styles.actionInfo;
    case 'success':
      return styles.actionSuccess;
    default:
      return styles.actionNeutral;
  }
};

const actionLabelToneStyle = (tone: KoreanFieldworkStatusTone) => {
  switch (tone) {
    case 'danger':
      return styles.actionLabelDanger;
    case 'warning':
      return styles.actionLabelWarning;
    case 'info':
      return styles.actionLabelInfo;
    case 'success':
      return styles.actionLabelSuccess;
    default:
      return styles.actionLabelNeutral;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5fbff',
    borderColor: '#b9d9ea',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 7,
  },
  title: {
    color: '#175cd3',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },
  count: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '900',
  },
  layerSection: {
    borderTopColor: '#d8e8f4',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6,
  },
  layerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 7,
  },
  layerHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  layerTitle: {
    color: '#27343b',
    fontSize: 12,
    fontWeight: '900',
  },
  layerDetail: {
    color: '#667085',
    fontSize: 11,
    marginTop: 2,
  },
  layerRow: {
    paddingRight: 6,
  },
  segmentedControl: {
    alignItems: 'center',
    backgroundColor: '#eef2f6',
    borderRadius: 6,
    flexDirection: 'row',
    padding: 2,
  },
  segmentButton: {
    borderRadius: 5,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: 'white',
    borderColor: '#b9d9ea',
    borderWidth: 1,
  },
  segmentButtonText: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '900',
  },
  segmentButtonTextActive: {
    color: '#175cd3',
  },
  scopePill: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#cce0d8',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 7,
    minHeight: 52,
    paddingHorizontal: 9,
    width: 172,
  },
  scopePillText: {
    flex: 1,
    marginLeft: 7,
    minWidth: 0,
  },
  scopePillCategory: {
    color: '#526272',
    fontSize: 10,
    fontWeight: '900',
  },
  scopePillTitle: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  scopeReasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  scopeReasonChip: {
    borderRadius: 4,
    fontSize: 9,
    fontWeight: '900',
    marginRight: 4,
    marginTop: 3,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  emptyLayerText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    paddingBottom: 4,
  },
  featureGroupList: {
    gap: 7,
  },
  featureGroup: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  featureGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 5,
  },
  featureGroupTitle: {
    color: '#1f2937',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  featureGroupCount: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
  },
  featurePillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featurePill: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 5,
    marginTop: 5,
    minHeight: 30,
    maxWidth: 160,
    paddingHorizontal: 7,
  },
  featurePillText: {
    color: '#175cd3',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  itemRow: {
    paddingRight: 6,
  },
  card: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 166,
    padding: 9,
    width: 214,
  },
  cardNeutral: {
    borderColor: '#d0d5dd',
  },
  cardInfo: {
    borderColor: '#b2ddff',
  },
  cardSuccess: {
    borderColor: '#abefc6',
  },
  cardWarning: {
    borderColor: '#fedf89',
  },
  cardDanger: {
    borderColor: '#fecdca',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryLabel: {
    color: '#475467',
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
  },
  parentPath: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  reasonChip: {
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '900',
    marginRight: 4,
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  reasonNeutral: {
    backgroundColor: '#eef2f6',
    color: '#475467',
  },
  reasonInfo: {
    backgroundColor: '#eff8ff',
    color: '#175cd3',
  },
  reasonSuccess: {
    backgroundColor: '#ecfdf3',
    color: '#027a48',
  },
  reasonWarning: {
    backgroundColor: '#fffaeb',
    color: '#b54708',
  },
  reasonDanger: {
    backgroundColor: '#fff1f3',
    color: colors.danger,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  statusChip: {
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4,
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  statusNeutral: {
    backgroundColor: '#f2f4f7',
    color: '#475467',
  },
  statusInfo: {
    backgroundColor: '#eff8ff',
    color: '#175cd3',
  },
  statusSuccess: {
    backgroundColor: '#ecfdf3',
    color: '#027a48',
  },
  statusWarning: {
    backgroundColor: '#fffaeb',
    color: '#b54708',
  },
  statusDanger: {
    backgroundColor: '#fff1f3',
    color: colors.danger,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 5,
    marginTop: 5,
    minHeight: 30,
    maxWidth: 112,
    paddingHorizontal: 6,
  },
  actionNeutral: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
  },
  actionInfo: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
  },
  actionSuccess: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  actionWarning: {
    backgroundColor: '#fffaeb',
    borderColor: '#fedf89',
  },
  actionDanger: {
    backgroundColor: '#fff1f3',
    borderColor: '#fecdca',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 3,
  },
  actionLabelNeutral: {
    color: '#475467',
  },
  actionLabelInfo: {
    color: '#175cd3',
  },
  actionLabelSuccess: {
    color: '#027a48',
  },
  actionLabelWarning: {
    color: '#b54708',
  },
  actionLabelDanger: {
    color: colors.danger,
  },
});

export default KoreanFieldworkWorkbenchPanel;
