import { MaterialIcons } from '@expo/vector-icons';
import {
  Document,
  getKoreanFieldworkTodaySummary,
} from 'idai-field-core';
import { router, useGlobalSearchParams } from 'expo-router';
import proj4 from 'proj4';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CategoryIcon from '@/components/common/CategoryIcon';
import SwipeableActionRow from '@/components/common/SwipeableActionRow';
import DocumentAddModal from '@/components/Project/DocumentAddModal';
import KoreanFieldworkDailyNotebookDigest from '@/components/Project/KoreanFieldworkDailyNotebookDigest';
import KoreanFieldworkDailyJournalCalendar from '@/components/Project/KoreanFieldworkDailyJournalCalendar';
import KoreanFieldworkFieldNotePanel from '@/components/Project/KoreanFieldworkFieldNotePanel';
import KoreanFieldworkInvestigationModePanel from '@/components/Project/KoreanFieldworkInvestigationModePanel';
import KoreanFieldworkNotebookLedger from '@/components/Project/KoreanFieldworkNotebookLedger';
import KoreanFieldworkOverviewChart from '@/components/Project/KoreanFieldworkOverviewChart';
import KoreanFieldworkSelectedRecordWorkbench from '@/components/Project/KoreanFieldworkSelectedRecordWorkbench';
import {
  KOREAN_FIELDWORK_CATEGORY_LABELS,
  getKoreanFieldworkDisplayIdentifier,
  getKoreanFieldworkCategoryLabel,
  KOREAN_FIELDWORK_CATEGORIES,
} from '@/components/Project/korean-fieldwork-categories';
import { getKoreanFieldworkAllowedChildCategoryNames } from '@/components/Project/korean-fieldwork-child-records';
import {
  createKoreanFieldworkDailyLogDraft,
  createKoreanFieldworkRecordMemoDraft,
  getKoreanFieldworkDailyLogAppendUpdates,
  getKoreanFieldworkDailyLogForOperation,
  getKoreanFieldworkFieldNoteOperation,
  getKoreanFieldworkNotebookContinuationSeed,
  KoreanFieldworkFieldNoteContinuationSeed,
  KoreanFieldworkFieldNoteMode,
  KoreanFieldworkNotebookEntry,
  KoreanFieldworkNotebookContinuationFocus,
} from '@/components/Project/korean-fieldwork-field-notes';
import {
  formatKoreanFieldworkParentPath,
  getKoreanFieldworkPrimaryParent,
  getKoreanFieldworkRecordStatusChips,
  KoreanFieldworkStatusChip,
  KoreanFieldworkStatusTone,
} from '@/components/Project/korean-fieldwork-record-summary';
import {
  getKoreanFieldworkExpandedRecordIds,
} from '@/components/Project/korean-fieldwork-record-selection';
import {
  getKoreanFieldworkEvidenceChips,
  KoreanFieldworkEvidenceChip,
} from '@/components/Project/korean-fieldwork-record-evidence';
import {
  getKoreanFieldworkRecordActionSummary,
  KoreanFieldworkRecordActionItem,
} from '@/components/Project/korean-fieldwork-record-actions';
import {
  getKoreanFieldworkQuickActionStates,
  getKoreanFieldworkTodayActionTargets,
  KoreanFieldworkPriorityTaskAction,
} from '@/components/Project/korean-fieldwork-today-actions';
import {
  getKoreanFieldworkRecordListEmptyState,
} from '@/components/Project/korean-fieldwork-record-list-empty-state';
import {
  getKoreanFieldworkSiteOverviewMapRoute,
  getKoreanFieldworkReturnParam,
  KOREAN_FIELDWORK_FIELD_BOARD_RESET_PARAM,
  KOREAN_FIELDWORK_RETURN_TARGETS,
} from '@/components/Project/korean-fieldwork-navigation';
import {
  loadKoreanFieldworkProjectBoundaryDraft,
  saveKoreanFieldworkInvestigationModeId,
  KoreanFieldworkInvestigationModeId,
  KoreanFieldworkProjectBoundaryDraft,
  shouldUseKoreanFieldworkTrenchWorkflow,
} from '@/components/Project/korean-fieldwork-investigation-mode';
import {
  syncKoreanFieldworkProjectSetupDefaultsToProjectDocument,
} from '@/components/Project/korean-fieldwork-project-setup-sync';
import {
  getKoreanFieldworkUserVisibleDocuments,
  getKoreanFieldworkUserVisibleTodaySummary,
} from '@/components/Project/korean-fieldwork-system-records';
import {
  getLegacyRootDocumentsForOperation,
} from '@/components/Project/korean-fieldwork-operation-wrap';
import { ConfigurationContext } from '@/contexts/configuration-context';
import LabelsContext from '@/contexts/labels/labels-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import { ProjectContext } from '@/contexts/project-context';
import { ToastType } from '@/components/common/Toast/ToastProvider';
import useKoreanFieldworkProjectSetupDefaults from '@/hooks/use-korean-fieldwork-project-setup-defaults';
import useToast from '@/hooks/use-toast';
import { colors } from '@/utils/colors';

type FilterId = 'all'|'operation'|'feature'|'find'|'media'|'review';
type FieldworkWorkspaceTabId = 'records'|'journal';

const RECORD_ROW_DOUBLE_TAP_DURATION_MS = 350;

interface RecordFilter {
  id: FilterId;
  label: string;
  categories: string[];
}

interface RecordGroup {
  title: string;
  subtitle: string;
  categories: string[];
}

const getRecordFilters = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): RecordFilter[] => [
  { id: 'all', label: '전체', categories: [] },
  {
    id: 'operation',
    label: '조사 구역 기록',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.OPERATION,
      KOREAN_FIELDWORK_CATEGORIES.SURVEY,
      KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY,
    ],
  },
  {
    id: 'feature',
    label: getPrimaryFieldRecordLabel(investigationModeId),
    categories: getPrimaryFieldRecordCategories(investigationModeId),
  },
  {
    id: 'find',
    label: '유물·시료',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.FIND,
      KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION,
      KOREAN_FIELDWORK_CATEGORIES.SAMPLE,
    ],
  },
  {
    id: 'media',
    label: '사진·도면·메모',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.PHOTO,
      KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO,
      KOREAN_FIELDWORK_CATEGORIES.DRAWING,
      KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO,
      KOREAN_FIELDWORK_CATEGORIES.AERIAL_MAP_LAYER,
    ],
  },
  {
    id: 'review',
    label: '점검',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.FIELD_RECORD_QUALITY_REVIEW,
      KOREAN_FIELDWORK_CATEGORIES.SOURCE_EVIDENCE_INDEX,
    ],
  },
];

const getRecordGroups = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): RecordGroup[] => [
  {
    title: '조사 경계와 구역 기록',
    subtitle: `조사 전체 범위, 구역 기록, ${getPrimaryFieldRecordLabel(
      investigationModeId
    )} 기준`,
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.OPERATION,
      KOREAN_FIELDWORK_CATEGORIES.SURVEY,
      KOREAN_FIELDWORK_CATEGORIES.SURVEY_BOUNDARY,
    ],
  },
  {
    title: getPrimaryFieldRecordLabel(investigationModeId),
    subtitle: getPrimaryFieldRecordSubtitle(investigationModeId),
    categories: getPrimaryFieldRecordCategories(investigationModeId),
  },
  {
    title: '유물과 시료',
    subtitle: '수습, 라벨, 분석 목적까지 이어지는 기록',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.FIND,
      KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION,
      KOREAN_FIELDWORK_CATEGORIES.SAMPLE,
    ],
  },
  {
    title: '사진·도면·메모',
    subtitle: '현장 사진, 도면, 메모 기록',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.PHOTO,
      KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO,
      KOREAN_FIELDWORK_CATEGORIES.DRAWING,
      KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO,
      KOREAN_FIELDWORK_CATEGORIES.AERIAL_MAP_LAYER,
    ],
  },
  {
    title: '점검과 색인',
    subtitle: '마감 전 확인과 근거 색인',
    categories: [
      KOREAN_FIELDWORK_CATEGORIES.FIELD_RECORD_QUALITY_REVIEW,
      KOREAN_FIELDWORK_CATEGORIES.SOURCE_EVIDENCE_INDEX,
    ],
  },
];

const getPrimaryFieldRecordLabel = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string =>
  shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
    ? '트렌치'
    : '유구';

const getPrimaryFieldRecordSubtitle = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string =>
  shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
    ? '트렌치, 유구 확인 결과, 피트, 토층사진 기록'
    : '유구, 피트, 토층사진 기록';

const getRecordSearchPlaceholder = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string =>
  `식별자, 설명, ${getPrimaryFieldRecordLabel(investigationModeId)}·유물·시료 검색`;

const getPrimaryFieldRecordCategories = (
  investigationModeId?: KoreanFieldworkInvestigationModeId
): string[] => {
  const categories = [
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
    KOREAN_FIELDWORK_CATEGORIES.LAYER,
  ];

  return shouldUseKoreanFieldworkTrenchWorkflow(investigationModeId)
    ? [KOREAN_FIELDWORK_CATEGORIES.TRENCH, ...categories]
    : categories;
};

const DocumentsList: React.FC = () => {
  const { showToast } = useToast();
  const {
    documents,
    clearHierarchy,
    hierarchyPath,
    onDocumentSelected,
    relationsManager,
    repository,
  } = useContext(ProjectContext);
  const config = useContext(ConfigurationContext);
  const preferencesContext = useContext(PreferencesContext);
  const { labels } = useContext(LabelsContext);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<FieldworkWorkspaceTabId>('records');
  const [query, setQuery] = useState('');
  const [addModalParent, setAddModalParent] = useState<Document>();
  const [addModalInitialCategoryName, setAddModalInitialCategoryName] =
    useState<string>();
  const [addModalInitialDraftParams, setAddModalInitialDraftParams] =
    useState<Record<string, string>>({});
  const [selectedWorkbenchDocumentId, setSelectedWorkbenchDocumentId] =
    useState<string>();
  const [removingDocumentIds, setRemovingDocumentIds] =
    useState<Set<string>>(() => new Set());
  const [selectedInvestigationModeId, setSelectedInvestigationModeId] =
    useState<KoreanFieldworkInvestigationModeId>();
  const [isSelectedWorkbenchExpanded, setIsSelectedWorkbenchExpanded] =
    useState(false);
  const [fieldNoteContinuation, setFieldNoteContinuation] =
    useState<{
      documentId: string;
      seed: KoreanFieldworkFieldNoteContinuationSeed;
    }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldNoteContinuationRequestId = useRef(0);
  const handledResetToOverviewKeyRef = useRef<string>();
  const [isCreatingFieldNote, setIsCreatingFieldNote] = useState(false);
  const [projectBoundaryDraft, setProjectBoundaryDraft] =
    useState<KoreanFieldworkProjectBoundaryDraft>();
  const [isSavingDailyJournal, setIsSavingDailyJournal] = useState(false);
  const now = useMemo(() => new Date(), []);
  const routeParams = useGlobalSearchParams();
  const resetToOverviewKey = getStringRouteParam(
    routeParams[KOREAN_FIELDWORK_FIELD_BOARD_RESET_PARAM]
  );
  const projectId = preferencesContext.preferences.currentProject;
  const {
    investigationModeId: loadedInvestigationModeId,
    boundarySummary,
  } =
    useKoreanFieldworkProjectSetupDefaults(projectId, repository);
  const investigationModeId =
    selectedInvestigationModeId ?? loadedInvestigationModeId;
  const recordFilters = useMemo(
    () => getRecordFilters(investigationModeId),
    [investigationModeId]
  );
  const recordGroups = useMemo(
    () => getRecordGroups(investigationModeId),
    [investigationModeId]
  );
  const recordSearchPlaceholder = useMemo(
    () => getRecordSearchPlaceholder(investigationModeId),
    [investigationModeId]
  );

  const documentsById = useMemo(
    () => new Map(documents.map((document) => [document.resource.id, document])),
    [documents]
  );
  const userVisibleDocuments = useMemo(
    () => getKoreanFieldworkUserVisibleDocuments(documents),
    [documents]
  );
  const recordBoardDocuments = useMemo(
    () => userVisibleDocuments.filter((document) =>
      document.resource.category !== KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG
    ),
    [userVisibleDocuments]
  );
  const currentScopeParent = hierarchyPath[hierarchyPath.length - 1];
  const todaySummary = useMemo(
    () => getKoreanFieldworkTodaySummary(documents),
    [documents]
  );
  const effectiveProjectBoundaryDraft = useMemo(
    () => projectBoundaryDraft
      ?? getProjectBoundaryDraftFromSurveyBoundaries(todaySummary.surveyBoundaries),
    [projectBoundaryDraft, todaySummary.surveyBoundaries]
  );
  const userVisibleTodaySummary = useMemo(
    () => getKoreanFieldworkUserVisibleTodaySummary(
      todaySummary,
      userVisibleDocuments
    ),
    [todaySummary, userVisibleDocuments]
  );
  const actionDocuments = useMemo(() => {
    const documentsByActionId = new Map<string, Document>();
    [currentScopeParent, ...documents].forEach((document) => {
      if (document) documentsByActionId.set(document.resource.id, document);
    });

    return Array.from(documentsByActionId.values());
  }, [currentScopeParent, documents]);
  const actionDocumentsById = useMemo(
    () => new Map(actionDocuments.map((document) => [
      document.resource.id,
      document,
    ])),
    [actionDocuments]
  );
  const actionSummary = useMemo(
    () => currentScopeParent
      ? getKoreanFieldworkTodaySummary(actionDocuments)
      : todaySummary,
    [actionDocuments, currentScopeParent, todaySummary]
  );
  const normalizedQuery = query.trim().toLowerCase();
  const activeFilterDefinition = recordFilters.find((filter) =>
    filter.id === activeFilter
  ) ?? recordFilters[0];

  const getCategoryLabel = useCallback((categoryName: string) => {
    if (categoryName in KOREAN_FIELDWORK_CATEGORY_LABELS) {
      return getKoreanFieldworkCategoryLabel(categoryName);
    }

    const category = config.getCategory(categoryName);
    if (category && labels) return labels.get(category);

    return getKoreanFieldworkCategoryLabel(categoryName);
  }, [config, labels]);

  const categoryFilteredDocuments = useMemo(
    () => recordBoardDocuments.filter((document) => {
      const filterCategories = activeFilterDefinition.categories;
      return filterCategories.length === 0
        || filterCategories.includes(document.resource.category);
    }),
    [
      activeFilterDefinition,
      recordBoardDocuments,
    ]
  );
  const filteredDocuments = useMemo(() => categoryFilteredDocuments.filter((document) => {
    const matchesQuery = !normalizedQuery
      || getSearchableText(document, getCategoryLabel(document.resource.category))
        .includes(normalizedQuery);

    return matchesQuery;
  }), [
    categoryFilteredDocuments,
    getCategoryLabel,
    normalizedQuery,
  ]);
  const recordListEmptyState = useMemo(
    () => getKoreanFieldworkRecordListEmptyState({
      activeCategoryFilterId: activeFilter,
      activeWorkFilterId: 'all',
      investigationModeId,
      query,
      totalDocumentCount: recordBoardDocuments.length,
    }),
    [activeFilter, investigationModeId, query, recordBoardDocuments.length]
  );

  const groupedDocuments = useMemo(() => recordGroups
    .map((group) => ({
      ...group,
      documents: filteredDocuments.filter((document) =>
        group.categories.includes(document.resource.category)
      ),
    }))
    .filter((group) => group.documents.length > 0), [
    filteredDocuments,
    recordGroups,
  ]);

  const groupedDocumentIds = useMemo(() => new Set(groupedDocuments
    .flatMap((group) => group.documents.map((document) => document.resource.id))
  ), [groupedDocuments]);
  const otherDocuments = filteredDocuments.filter((document) =>
    !groupedDocumentIds.has(document.resource.id)
  );
  const actionTargets = useMemo(
    () => getKoreanFieldworkTodayActionTargets(
      actionSummary,
      actionDocuments,
      investigationModeId
    ),
    [actionDocuments, actionSummary, investigationModeId]
  );
  const quickActions = useMemo(
    () => getKoreanFieldworkQuickActionStates(
      actionSummary,
      actionTargets,
      currentScopeParent,
      investigationModeId
    ),
    [actionSummary, actionTargets, currentScopeParent, investigationModeId]
  );
  const recordingBaseCount = useMemo(
    () => documents.filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION
    ).length,
    [documents]
  );
  const operationCount = useMemo(
    () => userVisibleDocuments.filter((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION
    ).length,
    [userVisibleDocuments]
  );
  const legacyRootDocumentCount = useMemo(
    () => recordingBaseCount === 0
      ? getLegacyRootDocumentsForOperation(userVisibleDocuments).length
      : 0,
    [recordingBaseCount, userVisibleDocuments]
  );
  const hasFieldRecords = userVisibleDocuments.length > 0;
  const hierarchyLabel = hierarchyPath.length > 0
    ? hierarchyPath.map((document) =>
      getKoreanFieldworkDisplayIdentifier(document.resource.identifier)
      || document.resource.id
    ).join(' / ')
    : '전체 조사자료';

  useEffect(() => {
    setSelectedInvestigationModeId(undefined);
  }, [projectId]);
  useEffect(() => {
    let isActive = true;
    setProjectBoundaryDraft(undefined);

    loadKoreanFieldworkProjectBoundaryDraft(projectId)
      .then((boundaryDraft) => {
        if (isActive) setProjectBoundaryDraft(boundaryDraft);
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [projectId]);
  const openMap = () => router.navigate(getKoreanFieldworkSiteOverviewMapRoute());
  const editDocumentById = (
    docId: string,
    categoryName: string,
    extraParams: Record<string, string> = {}
  ) => {
    router.navigate({
      pathname: '/ProjectScreen/DocumentEdit',
      params: {
        docId,
        categoryName,
        ...extraParams,
        ...getKoreanFieldworkReturnParam(
          KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD
        ),
      },
    });
  };
  const editDocument = (document: Document) => {
    editDocumentById(document.resource.id, document.resource.category);
  };
  const openFeatureSketch = (document: Document) => {
    editDocumentById(document.resource.id, document.resource.category, {
      openFreeSketch: '1',
    });
  };
  const openAddChildModal = useCallback((
    document: Document,
    initialCategoryName?: string,
    initialDraftParams: Record<string, string> = {}
  ) => {
    setAddModalParent(document);
    setAddModalInitialCategoryName(initialCategoryName);
    setAddModalInitialDraftParams(initialDraftParams);
  }, []);
  const closeAddChildModal = useCallback(() => {
    setAddModalParent(undefined);
    setAddModalInitialCategoryName(undefined);
    setAddModalInitialDraftParams({});
  }, []);
  const confirmRemoveDocument = useCallback((document: Document) => {
    if (!relationsManager) {
      showToast(
        ToastType.Error,
        '관계 색인을 준비하는 중입니다. 잠시 후 다시 삭제해 주세요.'
      );
      return;
    }

    if (removingDocumentIds.has(document.resource.id)) {
      showToast(ToastType.Info, '삭제를 처리하는 중입니다. 잠시만 기다려 주세요.');
      return;
    }

    const identifier = getKoreanFieldworkDisplayIdentifier(
      document.resource.identifier
    ) || document.resource.id;

    Alert.alert(
      '기록 삭제',
      `${identifier} 기록을 삭제할까요? 하위 기록도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const removalScopeIds = getDocumentRemovalScopeIds(
              document,
              documentsById
            );
            setRemovingDocumentIds((currentIds) =>
              mergeDocumentIdSets(currentIds, removalScopeIds)
            );
            relationsManager
              .remove(document, { descendants: true })
              .then(() => {
                if (
                  selectedWorkbenchDocumentId
                  && removalScopeIds.has(selectedWorkbenchDocumentId)
                ) {
                  setSelectedWorkbenchDocumentId(undefined);
                  setIsSelectedWorkbenchExpanded(false);
                }
                if (
                  addModalParent
                  && removalScopeIds.has(addModalParent.resource.id)
                ) {
                  closeAddChildModal();
                }
                if (
                  fieldNoteContinuation
                  && removalScopeIds.has(fieldNoteContinuation.documentId)
                ) {
                  setFieldNoteContinuation(undefined);
                }
                if (hierarchyPath.some((item) =>
                  removalScopeIds.has(item.resource.id))) {
                  clearHierarchy();
                }
                showToast(ToastType.Info, `${identifier} 기록을 삭제했습니다.`);
              })
              .catch((err) => {
                showToast(
                  ToastType.Error,
                  `${identifier} 기록을 삭제하지 못했습니다: ${err}`
                );
              })
              .finally(() => {
                setRemovingDocumentIds((currentIds) =>
                  removeDocumentIdSet(currentIds, removalScopeIds)
                );
              });
          },
        },
      ]
    );
  }, [
    addModalParent,
    clearHierarchy,
    closeAddChildModal,
    documentsById,
    fieldNoteContinuation,
    hierarchyPath,
    relationsManager,
    removingDocumentIds,
    selectedWorkbenchDocumentId,
    showToast,
  ]);
  const getAllowedAddCategoryNames = useCallback(
    (document: Document) => getKoreanFieldworkAllowedChildCategoryNames(
      document,
      config
    ),
    [config]
  );
  const selectedWorkbenchDocument = useMemo(
    () => selectedWorkbenchDocumentId
      ? documentsById.get(selectedWorkbenchDocumentId)
      : undefined,
    [
      documentsById,
      selectedWorkbenchDocumentId,
    ]
  );
  const expandedRecordDocumentIds = useMemo(
    () => getKoreanFieldworkExpandedRecordIds(
      selectedWorkbenchDocument,
      documentsById
    ),
    [documentsById, selectedWorkbenchDocument]
  );
  const shouldShowSelectedRecordWorkbench =
    !!selectedWorkbenchDocument
    && (activeWorkspaceTab === 'journal' || isSelectedWorkbenchExpanded);
  const selectedWorkbenchAllowedAddCategoryNames = useMemo(
    () => selectedWorkbenchDocument
      ? getAllowedAddCategoryNames(selectedWorkbenchDocument)
      : [],
    [getAllowedAddCategoryNames, selectedWorkbenchDocument]
  );
  const selectedFieldNoteOperation = useMemo(
    () => selectedWorkbenchDocument
      ? getKoreanFieldworkFieldNoteOperation(
        selectedWorkbenchDocument,
        documents
      )
      : undefined,
    [documents, selectedWorkbenchDocument]
  );
  const selectedFieldNoteDailyLog = useMemo(
    () => getKoreanFieldworkDailyLogForOperation(
      selectedFieldNoteOperation,
      documents
    ),
    [documents, selectedFieldNoteOperation]
  );
  const selectedFieldNoteContinuationSeed = selectedWorkbenchDocument
    && fieldNoteContinuation?.documentId === selectedWorkbenchDocument.resource.id
    ? fieldNoteContinuation.seed
    : undefined;
  const selectedFieldNoteOperationAllowedCategoryNames = useMemo(
    () => selectedFieldNoteOperation
      ? getAllowedAddCategoryNames(selectedFieldNoteOperation)
      : [],
    [getAllowedAddCategoryNames, selectedFieldNoteOperation]
  );
  const canCreateSelectedRecordMemo =
    selectedWorkbenchAllowedAddCategoryNames.includes(
      KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO
    )
    && !!config.getCategory(KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO);
  const canCreateSelectedDailyLog =
    !!selectedFieldNoteDailyLog
    || (
      !!selectedFieldNoteOperation
      && selectedFieldNoteOperationAllowedCategoryNames.includes(
        KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG
      )
      && !!config.getCategory(KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG)
    );
  const fallbackOperationDocument = useMemo(
    () => documents.find((document) =>
      document.resource.category === KOREAN_FIELDWORK_CATEGORIES.OPERATION
    ),
    [documents]
  );
  const journalOperationDocument =
    selectedFieldNoteOperation
    ?? actionTargets.primaryOperation
    ?? fallbackOperationDocument;
  const journalDailyLog = useMemo(
    () => getKoreanFieldworkDailyLogForOperation(
      journalOperationDocument,
      documents,
      now
    ) ?? actionTargets.dailyLog,
    [actionTargets.dailyLog, documents, journalOperationDocument, now]
  );
  const journalOperationAllowedCategoryNames = useMemo(
    () => journalOperationDocument
      ? getAllowedAddCategoryNames(journalOperationDocument)
      : [],
    [getAllowedAddCategoryNames, journalOperationDocument]
  );
  const canEditDailyJournal =
    !!repository
    && (
      !!journalDailyLog
      || (
        !!journalOperationDocument
        && journalOperationAllowedCategoryNames.includes(
          KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG
        )
        && !!config.getCategory(KOREAN_FIELDWORK_CATEGORIES.DAILY_LOG)
      )
    );
  const overviewScopeLabel = selectedWorkbenchDocumentId && selectedWorkbenchDocument
    ? `선택: ${
      getKoreanFieldworkDisplayIdentifier(
        selectedWorkbenchDocument.resource.identifier
      ) || selectedWorkbenchDocument.resource.id
    }`
    : hierarchyLabel;
  const selectWorkbenchDocument = (
    document: Document,
    options?: { expand?: boolean; toggle?: boolean }
  ) => {
    if (options?.toggle && selectedWorkbenchDocumentId === document.resource.id) {
      setSelectedWorkbenchDocumentId(undefined);
      setIsSelectedWorkbenchExpanded(false);
      setFieldNoteContinuation(undefined);
      return;
    }

    setSelectedWorkbenchDocumentId(document.resource.id);
    setIsSelectedWorkbenchExpanded(!!options?.expand);
  };
  const continueNotebookEntry = (
    entry: KoreanFieldworkNotebookEntry,
    focus?: KoreanFieldworkNotebookContinuationFocus
  ) => {
    const targetDocument = entry.targetDocument ?? entry.sourceDocument;
    const seed = getKoreanFieldworkNotebookContinuationSeed(entry, focus);

    fieldNoteContinuationRequestId.current += 1;

    setSelectedWorkbenchDocumentId(targetDocument.resource.id);
    setIsSelectedWorkbenchExpanded(true);
    setFieldNoteContinuation({
      documentId: targetDocument.resource.id,
      seed: {
        ...seed,
        id: `${seed.id}-${fieldNoteContinuationRequestId.current}`,
      },
    });
  };
  const selectInvestigationMode = (modeId: KoreanFieldworkInvestigationModeId) => {
    setSelectedInvestigationModeId(modeId);
    saveKoreanFieldworkInvestigationModeId(projectId, modeId)
      .catch(() => undefined);
    syncKoreanFieldworkProjectSetupDefaultsToProjectDocument(
      repository,
      {
        boundarySummary,
        investigationModeId: modeId,
      }
    ).catch(() => undefined);
  };
  const navigateAddCategory = (
    categoryName: string,
    parentDoc: Document | undefined,
    draftParams: Record<string, string> = {}
  ) => {
    if (!parentDoc) {
      closeAddChildModal();
      return;
    }

    if (
      categoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE
      && !draftParams.identifier?.trim()
    ) {
      openAddChildModal(
        parentDoc,
        KOREAN_FIELDWORK_CATEGORIES.FEATURE,
        draftParams
      );
      return;
    }

    closeAddChildModal();

    router.navigate({
      pathname: '/ProjectScreen/DocumentAdd',
      params: {
        parentDocId: parentDoc.resource.id,
        categoryName,
        ...draftParams,
        ...getKoreanFieldworkReturnParam(
          KOREAN_FIELDWORK_RETURN_TARGETS.FIELD_BOARD
        ),
      },
    });
  };
  const updateWorkbenchResourceFields = (
    document: Document,
    updates: Record<string, unknown>
  ) => {
    if (!repository) return Promise.resolve(false);

    return repository.update({
      ...document,
      resource: {
        ...document.resource,
        ...updates,
      },
    })
      .then((updatedDocument) => {
        setSelectedWorkbenchDocumentId(updatedDocument.resource.id);
        showToast(
          ToastType.Success,
          `${updatedDocument.resource.identifier} 현장 확인을 반영했습니다.`
        );
        return true;
      })
      .catch((error) => {
        showToast(
          ToastType.Error,
          `${document.resource.identifier} 현장 확인을 반영하지 못했습니다. ${error}`
        );
        return false;
      });
  };
  const createFieldNote = async (
    mode: KoreanFieldworkFieldNoteMode,
    text: string
  ) => {
    if (!repository || !selectedWorkbenchDocument) return;

    try {
      setIsCreatingFieldNote(true);

      const savedIdentifiers: string[] = [];
      const saveRecordMemo = async () => {
        const createdDocument = await repository.create(
          createKoreanFieldworkRecordMemoDraft(
            selectedWorkbenchDocument,
            text,
            config
          )
        );
        savedIdentifiers.push(createdDocument.resource.identifier);
      };
      const saveDailyLog = async () => {
        if (!selectedFieldNoteOperation) return;

        if (selectedFieldNoteDailyLog) {
          const updates = getKoreanFieldworkDailyLogAppendUpdates(
            selectedFieldNoteDailyLog,
            selectedWorkbenchDocument,
            text
          );
          const updatedDocument = await repository.update({
            ...selectedFieldNoteDailyLog,
            resource: {
              ...selectedFieldNoteDailyLog.resource,
              ...updates,
            },
          });

          savedIdentifiers.push(updatedDocument.resource.identifier);
          return;
        }

        const createdDocument = await repository.create(
          createKoreanFieldworkDailyLogDraft(
            selectedFieldNoteOperation,
            selectedWorkbenchDocument,
            text,
            config
          )
        );

        savedIdentifiers.push(createdDocument.resource.identifier);
      };

      if (mode === 'recordMemo' || mode === 'both') await saveRecordMemo();
      if (mode === 'dailyLog' || mode === 'both') await saveDailyLog();

      if (savedIdentifiers.length === 0) return;

      showToast(
        ToastType.Success,
        `${savedIdentifiers.join(', ')}에 현장 메모를 저장했습니다.`
      );
      setFieldNoteContinuation(undefined);
    } catch (error) {
      showToast(
        ToastType.Error,
        `현장 메모를 저장하지 못했습니다. ${error}`
      );
      throw error;
    } finally {
      setIsCreatingFieldNote(false);
    }
  };
  const saveDailyJournalFields = async (
    updates: Record<string, unknown>
  ) => {
    if (!repository) throw new Error('repository unavailable');
    if (!journalDailyLog && !journalOperationDocument) {
      throw new Error('daily journal operation unavailable');
    }

    try {
      setIsSavingDailyJournal(true);

      if (journalDailyLog) {
        await repository.update({
          ...journalDailyLog,
          resource: {
            ...journalDailyLog.resource,
            ...updates,
          },
        });
        return;
      }

      if (!journalOperationDocument) return;

      const draft = createKoreanFieldworkDailyLogDraft(
        journalOperationDocument,
        journalOperationDocument,
        '오늘 작업일지 시작',
        config,
        now
      );
      await repository.create({
        ...draft,
        resource: {
          ...draft.resource,
          ...updates,
        },
      });
    } catch (error) {
      showToast(
        ToastType.Error,
        `작업일지를 저장하지 못했습니다. ${error}`
      );
      throw error;
    } finally {
      setIsSavingDailyJournal(false);
    }
  };
  const createDailyJournalLog = () => saveDailyJournalFields({});
  const openDailyJournalLog = (dailyLog: Document) => {
    selectWorkbenchDocument(dailyLog, { expand: true });
  };
  const runQuickAction = (action?: KoreanFieldworkPriorityTaskAction) => {
    if (!action) return;

    switch (action.type) {
      case 'openDocument': {
        const document = actionDocumentsById.get(action.documentId);
        if (document) selectWorkbenchDocument(document);
        return;
      }
      case 'createDocument': {
        const parentDocument = actionDocumentsById.get(action.parentDocumentId);
        if (parentDocument) {
          navigateAddCategory(action.categoryName, parentDocument);
        }
        return;
      }
      case 'openMap':
        openMap();
        return;
    }
  };
  const returnToInvestigationOverview = useCallback(() => {
    clearHierarchy();
    setSelectedWorkbenchDocumentId(undefined);
    setIsSelectedWorkbenchExpanded(false);
    setFieldNoteContinuation(undefined);
    setActiveWorkspaceTab('records');
    setActiveFilter('all');
    setQuery('');
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [clearHierarchy]);

  useEffect(() => {
    if (!resetToOverviewKey) {
      handledResetToOverviewKeyRef.current = undefined;
      return;
    }

    if (handledResetToOverviewKeyRef.current === resetToOverviewKey) {
      return;
    }

    handledResetToOverviewKeyRef.current = resetToOverviewKey;
    returnToInvestigationOverview();
  }, [resetToOverviewKey, returnToInvestigationOverview]);

  return (
    <View style={styles.screen}>
      {addModalParent && (
        <DocumentAddModal
          boundaryDraft={effectiveProjectBoundaryDraft}
          existingDocuments={userVisibleDocuments}
          initialCategoryName={addModalInitialCategoryName}
          initialDraftParams={addModalInitialDraftParams}
          investigationModeId={investigationModeId}
          onClose={closeAddChildModal}
          parentDoc={addModalParent}
          onAddCategory={navigateAddCategory}
        />
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBand}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>현장 기록</Text>
            <Text style={styles.title}>현장 기록판</Text>
            <Text style={styles.contextLine} numberOfLines={1}>
              현재 범위: {hierarchyLabel}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.mapButton}
            onPress={openMap}
          >
            <MaterialIcons name="map" size={22} color="white" />
            <Text style={styles.mapButtonText}>지도</Text>
          </TouchableOpacity>
        </View>

        <KoreanFieldworkInvestigationModePanel
          modeId={investigationModeId}
          onSelectMode={selectInvestigationMode}
          operationCount={operationCount}
          hasRecordingBase={recordingBaseCount > 0}
          totalDocumentCount={userVisibleDocuments.length}
          legacyRootDocumentCount={legacyRootDocumentCount}
          surveyBoundaryCount={userVisibleTodaySummary.surveyBoundaries.length}
          hasStoredBoundary={todaySummary.surveyBoundaries.length > 0}
          boundarySummary={boundarySummary}
          onOpenMap={openMap}
        />

        {hasFieldRecords && (
          <>
            <View style={styles.workspaceTabs}>
              <WorkspaceTabButton
                icon="account-tree"
                isActive={activeWorkspaceTab === 'records'}
                label="기록"
                onPress={() => setActiveWorkspaceTab('records')}
              />
              <WorkspaceTabButton
                icon="event-note"
                isActive={activeWorkspaceTab === 'journal'}
                label="조사일지"
                onPress={() => setActiveWorkspaceTab('journal')}
              />
            </View>

            {activeWorkspaceTab === 'records' && (
            <>
              <KoreanFieldworkOverviewChart
              summary={userVisibleTodaySummary}
              documents={userVisibleDocuments}
              currentScopeLabel={overviewScopeLabel}
              investigationModeId={investigationModeId}
              onReturnToInvestigationOverview={returnToInvestigationOverview}
              />

              <FieldworkFlowPanel
                boundaryDetail={boundarySummary
                  || `${todaySummary.surveyBoundaries.length}개 경계 기록`}
                hasBoundary={
                  !!boundarySummary || todaySummary.surveyBoundaries.length > 0
                }
                issueCount={userVisibleTodaySummary.openIssues.length}
                issueDisabled={quickActions.closeout.disabled}
                issueDetail={quickActions.closeout.detail}
                onIssuePress={() => runQuickAction(quickActions.closeout.action)}
                onOpenMap={openMap}
                onUnitPress={() =>
                  runQuickAction(quickActions.featureCandidate.action)}
                unitDetail={quickActions.featureCandidate.detail}
                unitDisabled={quickActions.featureCandidate.disabled}
                unitIcon={quickActions.featureCandidate.icon}
                unitLabel={quickActions.featureCandidate.label}
              />
            </>
            )}

        {activeWorkspaceTab === 'journal' && (
        <>
          <KoreanFieldworkDailyJournalCalendar
            boundaryDraft={effectiveProjectBoundaryDraft}
            boundarySummary={boundarySummary}
            canEdit={canEditDailyJournal}
            dailyLog={journalDailyLog}
            isSaving={isSavingDailyJournal}
            now={now}
            onCreateDailyLog={createDailyJournalLog}
            onOpenDailyLog={openDailyJournalLog}
            onUpdateDailyLog={saveDailyJournalFields}
          />
        </>
        )}

        {shouldShowSelectedRecordWorkbench && selectedWorkbenchDocument && (
          <>
            <KoreanFieldworkSelectedRecordWorkbench
              document={selectedWorkbenchDocument}
              documents={documents}
              allowedAddCategoryNames={selectedWorkbenchAllowedAddCategoryNames}
              investigationModeId={investigationModeId}
              isExpanded={isSelectedWorkbenchExpanded}
              onAddChild={openAddChildModal}
              onAddDocumentOfCategory={(parentDoc, categoryName) =>
                navigateAddCategory(categoryName, parentDoc)}
              onClearSelection={() => {
                setSelectedWorkbenchDocumentId(undefined);
                setIsSelectedWorkbenchExpanded(false);
              }}
              onEditDocument={editDocument}
              onOpenFeatureSketch={openFeatureSketch}
              onOpenDocument={(document) =>
                selectWorkbenchDocument(document, {
                  expand: isSelectedWorkbenchExpanded,
                })}
              onOpenMapDocument={onDocumentSelected}
              onToggleExpanded={() =>
                setIsSelectedWorkbenchExpanded((current) => !current)}
              onUpdateResourceFields={updateWorkbenchResourceFields}
            />
            {activeWorkspaceTab === 'journal' && isSelectedWorkbenchExpanded && (
              <KoreanFieldworkFieldNotePanel
                selectedDocument={selectedWorkbenchDocument}
                documents={documents}
                operationDocument={selectedFieldNoteOperation}
                existingDailyLog={selectedFieldNoteDailyLog}
                draftScopeId={preferencesContext.preferences.currentProject}
                investigationModeId={investigationModeId}
                continuationSeed={selectedFieldNoteContinuationSeed}
                allowedAddCategoryNames={selectedWorkbenchAllowedAddCategoryNames}
                canCreateRecordMemo={canCreateSelectedRecordMemo}
                canCreateDailyLog={canCreateSelectedDailyLog}
                isSaving={isCreatingFieldNote}
                onCreateNote={createFieldNote}
                onApplyToRecord={async (updates) => {
                  const wasUpdated = await updateWorkbenchResourceFields(
                    selectedWorkbenchDocument,
                    updates
                  );
                  if (!wasUpdated) throw new Error('record update failed');
                }}
                onAddDocumentOfCategory={(parentDoc, categoryName) =>
                  navigateAddCategory(categoryName, parentDoc)}
                onOpenDocument={(document) =>
                  selectWorkbenchDocument(document, { expand: true })}
              />
            )}
          </>
        )}

        {activeWorkspaceTab === 'journal' && (
          <>
            <KoreanFieldworkDailyNotebookDigest
              documents={userVisibleDocuments}
              now={now}
              onOpenDailyLog={(document) =>
                selectWorkbenchDocument(document, { expand: true })}
              onOpenEntryDocument={selectWorkbenchDocument}
            />
            <KoreanFieldworkNotebookLedger
              documents={userVisibleDocuments}
              onContinueEntry={continueNotebookEntry}
              onOpenDocument={selectWorkbenchDocument}
            />
          </>
        )}

        {activeWorkspaceTab === 'records' && (
        <>
        <View style={styles.searchBand}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color="#586069" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={recordSearchPlaceholder}
              placeholderTextColor="#6f7782"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
                <MaterialIcons name="close" size={20} color="#586069" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {recordFilters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                activeOpacity={0.86}
                style={[
                  styles.filterChip,
                  activeFilter === filter.id && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === filter.id && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.recordsBand}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>현장 기록</Text>
            <Text style={styles.sectionMeta}>{filteredDocuments.length}건</Text>
          </View>

          {filteredDocuments.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons
                name={recordListEmptyState.icon as keyof typeof MaterialIcons.glyphMap}
                size={24}
                color="#697386"
              />
              <Text style={styles.emptyTitle}>{recordListEmptyState.title}</Text>
              <Text style={styles.emptyText}>
                {recordListEmptyState.text}
              </Text>
            </View>
          )}

          {groupedDocuments.map((group) => (
            <RecordSection
              key={group.title}
              title={group.title}
              subtitle={group.subtitle}
              documents={group.documents}
              documentsById={documentsById}
              getCategoryLabel={getCategoryLabel}
              issueCountByDocumentId={
                userVisibleTodaySummary.issueCountByDocumentId
              }
              investigationModeId={investigationModeId}
              removingDocumentIds={removingDocumentIds}
              expandedDocumentIds={expandedRecordDocumentIds}
              onOpenDocument={(document) =>
                selectWorkbenchDocument(document, { toggle: true })}
              onOpenRelatedDocument={(document) =>
                selectWorkbenchDocument(document, { expand: true })}
              onAddChild={openAddChildModal}
              onAddDocumentOfCategory={(parentDoc, categoryName) =>
                navigateAddCategory(categoryName, parentDoc)}
              onEditDocument={editDocument}
              onDeleteDocument={confirmRemoveDocument}
            />
          ))}

          {otherDocuments.length > 0 && (
            <RecordSection
              title="기타 기록"
              subtitle="설정에는 남아 있지만 현장 기록 목록에는 따로 분류되지 않은 기록"
              documents={otherDocuments}
              documentsById={documentsById}
              getCategoryLabel={getCategoryLabel}
              issueCountByDocumentId={
                userVisibleTodaySummary.issueCountByDocumentId
              }
              investigationModeId={investigationModeId}
              removingDocumentIds={removingDocumentIds}
              expandedDocumentIds={expandedRecordDocumentIds}
              onOpenDocument={(document) =>
                selectWorkbenchDocument(document, { toggle: true })}
              onOpenRelatedDocument={(document) =>
                selectWorkbenchDocument(document, { expand: true })}
              onAddChild={openAddChildModal}
              onAddDocumentOfCategory={(parentDoc, categoryName) =>
                navigateAddCategory(categoryName, parentDoc)}
              onEditDocument={editDocument}
              onDeleteDocument={confirmRemoveDocument}
            />
          )}
        </View>
        </>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const getDocumentRemovalScopeIds = (
  document: Document,
  documentsById: Map<string, Document>
): Set<string> => {
  const removedIds = new Set<string>([document.resource.id]);
  let didAddDocument = true;

  while (didAddDocument) {
    didAddDocument = false;
    Array.from(documentsById.values()).forEach((candidate) => {
      if (removedIds.has(candidate.resource.id)) return;

      const parent = getKoreanFieldworkPrimaryParent(candidate, documentsById);
      if (parent && removedIds.has(parent.resource.id)) {
        removedIds.add(candidate.resource.id);
        didAddDocument = true;
      }
    });
  }

  return removedIds;
};

const mergeDocumentIdSets = (
  currentIds: Set<string>,
  idsToAdd: Set<string>
): Set<string> => {
  const nextIds = new Set(currentIds);
  idsToAdd.forEach((id) => nextIds.add(id));
  return nextIds;
};

const removeDocumentIdSet = (
  currentIds: Set<string>,
  idsToRemove: Set<string>
): Set<string> => {
  const nextIds = new Set(currentIds);
  idsToRemove.forEach((id) => nextIds.delete(id));
  return nextIds;
};

const getStringRouteParam = (
  param: string | string[] | undefined
): string | undefined => Array.isArray(param) ? param[0] : param;

const getProjectBoundaryDraftFromSurveyBoundaries = (
  surveyBoundaries: readonly Document[]
): KoreanFieldworkProjectBoundaryDraft | undefined => {
  for (const surveyBoundary of surveyBoundaries) {
    const coordinates = getWgs84CoordinatesFromSurveyBoundary(surveyBoundary);
    if (coordinates.length >= 3) {
      return {
        center: getBoundaryDraftCenter(coordinates),
        coordinates,
      };
    }
  }

  return undefined;
};

const getWgs84CoordinatesFromSurveyBoundary = (
  surveyBoundary: Document
): KoreanFieldworkProjectBoundaryDraft['coordinates'] => {
  const geometry = (surveyBoundary.resource as Record<string, unknown>).geometry;
  if (!isLineStringGeometry(geometry)) return [];

  return getOpenLineStringCoordinates(geometry.coordinates)
    .map(projectMapCoordinateToWgs84)
    .filter((location): location is KoreanFieldworkProjectBoundaryDraft['coordinates'][number] =>
      location !== undefined
    );
};

const isLineStringGeometry = (
  geometry: unknown
): geometry is { coordinates: number[][]; type: 'LineString' } => {
  if (typeof geometry !== 'object' || geometry === null) return false;

  const candidate = geometry as Record<string, unknown>;

  return candidate.type === 'LineString'
    && Array.isArray(candidate.coordinates)
    && candidate.coordinates.every((coordinate) =>
      Array.isArray(coordinate)
      && coordinate.length >= 2
      && typeof coordinate[0] === 'number'
      && Number.isFinite(coordinate[0])
      && typeof coordinate[1] === 'number'
      && Number.isFinite(coordinate[1])
    );
};

const getOpenLineStringCoordinates = (coordinates: number[][]): number[][] => {
  const [firstCoordinate] = coordinates;
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (!firstCoordinate || !lastCoordinate) return coordinates;

  return firstCoordinate[0] === lastCoordinate[0]
    && firstCoordinate[1] === lastCoordinate[1]
    ? coordinates.slice(0, -1)
    : coordinates;
};

const projectMapCoordinateToWgs84 = (
  coordinate: number[]
): KoreanFieldworkProjectBoundaryDraft['coordinates'][number] | undefined => {
  const projected = proj4('EPSG:3857', 'EPSG:4326', {
    x: coordinate[0],
    y: coordinate[1],
  });
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    return undefined;
  }

  return {
    latitude: projected.y,
    longitude: projected.x,
  };
};

const getBoundaryDraftCenter = (
  coordinates: KoreanFieldworkProjectBoundaryDraft['coordinates']
): KoreanFieldworkProjectBoundaryDraft['center'] => {
  if (coordinates.length === 0) return undefined;

  return {
    latitude: coordinates.reduce((sum, coordinate) =>
      sum + coordinate.latitude, 0) / coordinates.length,
    longitude: coordinates.reduce((sum, coordinate) =>
      sum + coordinate.longitude, 0) / coordinates.length,
  };
};

const FieldworkFlowPanel: React.FC<{
  boundaryDetail: string;
  hasBoundary: boolean;
  issueCount: number;
  issueDetail: string;
  issueDisabled?: boolean;
  onIssuePress: () => void;
  onOpenMap: () => void;
  onUnitPress: () => void;
  unitDetail: string;
  unitDisabled?: boolean;
  unitIcon: keyof typeof MaterialIcons.glyphMap;
  unitLabel: string;
}> = ({
  boundaryDetail,
  hasBoundary,
  issueCount,
  issueDetail,
  issueDisabled = false,
  onIssuePress,
  onOpenMap,
  onUnitPress,
  unitDetail,
  unitDisabled = false,
  unitIcon,
  unitLabel,
}) => (
  <View style={styles.flowPanel} testID="fieldworkFlowPanel">
    <View style={styles.flowHeader}>
      <Text style={styles.flowTitle}>현장 흐름</Text>
      <Text style={styles.flowMeta}>경계에서 기록까지</Text>
    </View>
    <View style={styles.flowSteps}>
      <FieldworkFlowStep
        detail={boundaryDetail}
        icon="polyline"
        isComplete={hasBoundary}
        label="조사 경계"
        onPress={onOpenMap}
        testID="fieldworkFlowBoundary"
      />
      <FieldworkFlowStep
        detail={unitDetail}
        icon={unitIcon}
        isDisabled={unitDisabled}
        label={unitLabel}
        onPress={onUnitPress}
        testID="fieldworkFlowUnit"
      />
      <FieldworkFlowStep
        detail={issueCount > 0 ? `${issueCount}건 확인 필요` : issueDetail}
        icon={issueCount > 0 ? 'priority-high' : 'task-alt'}
        isComplete={issueCount === 0}
        isDisabled={issueDisabled}
        isWarning={issueCount > 0}
        label="전체 상태"
        onPress={onIssuePress}
        testID="fieldworkFlowStatus"
      />
    </View>
  </View>
);

const FieldworkFlowStep: React.FC<{
  detail: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  isComplete?: boolean;
  isDisabled?: boolean;
  isWarning?: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}> = ({
  detail,
  icon,
  isComplete = false,
  isDisabled = false,
  isWarning = false,
  label,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    disabled={isDisabled}
    onPress={onPress}
    style={[
      styles.flowStep,
      isComplete && styles.flowStepComplete,
      isWarning && styles.flowStepWarning,
      isDisabled && styles.flowStepDisabled,
    ]}
    testID={testID}
  >
    <View style={[
      styles.flowStepIcon,
      isComplete && styles.flowStepIconComplete,
      isWarning && styles.flowStepIconWarning,
    ]}>
      <MaterialIcons
        name={icon}
        size={17}
        color={isWarning ? colors.danger : isComplete ? '#027a48' : '#175cd3'}
      />
    </View>
    <View style={styles.flowStepText}>
      <Text style={styles.flowStepLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.flowStepDetail} numberOfLines={2}>{detail}</Text>
    </View>
    <MaterialIcons
      name="chevron-right"
      size={18}
      color={isDisabled ? '#98a2b3' : '#667085'}
    />
  </TouchableOpacity>
);

const WorkspaceTabButton: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  isActive: boolean;
  label: string;
  onPress: () => void;
}> = ({
  icon,
  isActive,
  label,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    accessibilityRole="button"
    accessibilityState={{ selected: isActive }}
    onPress={onPress}
    style={[
      styles.workspaceTab,
      isActive && styles.workspaceTabActive,
    ]}
  >
    <MaterialIcons
      name={icon}
      size={17}
      color={isActive ? 'white' : '#344054'}
    />
    <Text
      style={[
        styles.workspaceTabText,
        isActive && styles.workspaceTabTextActive,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const RecordSection: React.FC<{
  title: string;
  subtitle: string;
  documents: Document[];
  documentsById: Map<string, Document>;
  getCategoryLabel: (categoryName: string) => string;
  issueCountByDocumentId: { [documentId: string]: number };
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  removingDocumentIds: Set<string>;
  expandedDocumentIds: Set<string>;
  onOpenDocument: (document: Document) => void;
  onOpenRelatedDocument: (document: Document) => void;
  onAddChild: (document: Document) => void;
  onAddDocumentOfCategory: (parentDoc: Document, categoryName: string) => void;
  onEditDocument: (document: Document) => void;
  onDeleteDocument: (document: Document) => void;
}> = ({
  title,
  subtitle,
  documents,
  documentsById,
  getCategoryLabel,
  issueCountByDocumentId,
  investigationModeId,
  removingDocumentIds,
  expandedDocumentIds,
  onOpenDocument,
  onOpenRelatedDocument,
  onAddChild,
  onAddDocumentOfCategory,
  onEditDocument,
  onDeleteDocument,
}) => {
  const allDocuments = Array.from(documentsById.values());

  return (
    <View style={styles.recordSection}>
      <View style={styles.recordSectionHeader}>
        <View style={styles.recordSectionTitleWrap}>
          <Text style={styles.recordSectionTitle}>{title}</Text>
          <Text style={styles.recordSectionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text style={styles.recordSectionCount}>{documents.length}</Text>
      </View>
      {documents.map((document) => (
        <RecordRow
          key={document.resource.id}
          document={document}
          documents={allDocuments}
          contextPath={formatKoreanFieldworkParentPath(document, documentsById)}
          categoryLabel={getCategoryLabel(document.resource.category)}
          issueCount={issueCountByDocumentId[document.resource.id] ?? 0}
          investigationModeId={investigationModeId}
          isDeleting={removingDocumentIds.has(document.resource.id)}
          selected={expandedDocumentIds.has(document.resource.id)}
          onOpen={() => onOpenDocument(document)}
          onAddChild={() => onAddChild(document)}
          onOpenEvidence={onOpenRelatedDocument}
          onAddEvidence={onAddDocumentOfCategory}
          onEdit={() => onEditDocument(document)}
          onDelete={() => onDeleteDocument(document)}
        />
      ))}
    </View>
  );
};

const RecordRow: React.FC<{
  document: Document;
  documents: Document[];
  contextPath: string | undefined;
  categoryLabel: string;
  issueCount: number;
  investigationModeId?: KoreanFieldworkInvestigationModeId;
  isDeleting: boolean;
  selected: boolean;
  onOpen: () => void;
  onAddChild: () => void;
  onOpenEvidence: (document: Document) => void;
  onAddEvidence: (parentDoc: Document, categoryName: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({
  document,
  documents,
  contextPath,
  categoryLabel,
  issueCount,
  investigationModeId,
  isDeleting,
  selected,
  onOpen,
  onAddChild,
  onOpenEvidence,
  onAddEvidence,
  onEdit,
  onDelete,
}) => {
  const config = useContext(ConfigurationContext);
  const lastPressTimeRef = useRef<number>();
  const category = config.getCategory(document.resource.category);
  const title = getKoreanFieldworkDisplayIdentifier(document.resource.identifier)
    || document.resource.id;
  const description = getRecordDescription(document);
  const statusChips = getKoreanFieldworkRecordStatusChips(document);
  const evidenceChips = getKoreanFieldworkEvidenceChips(document, documents);
  const allowedAddCategoryNames = useMemo(
    () => getKoreanFieldworkAllowedChildCategoryNames(document, config),
    [config, document]
  );
  const allowedEvidenceCategories = useMemo(
    () => new Set(allowedAddCategoryNames),
    [allowedAddCategoryNames]
  );
  const actionSummary = useMemo(
    () => getKoreanFieldworkRecordActionSummary(
      document,
      documents,
      allowedAddCategoryNames,
      investigationModeId
    ),
    [allowedAddCategoryNames, document, documents, investigationModeId]
  );
  const visibleActions = actionSummary.actions.slice(0, 2);
  const hasExpandedBody = selected && (
    evidenceChips.length > 0
    || !!description
    || actionSummary.isTracked
  );
  const handleOpenOrEdit = () => {
    const nowMs = Date.now();
    if (
      lastPressTimeRef.current !== undefined
      && nowMs - lastPressTimeRef.current <= RECORD_ROW_DOUBLE_TAP_DURATION_MS
    ) {
      lastPressTimeRef.current = undefined;
      onEdit();
      return;
    }

    lastPressTimeRef.current = nowMs;
    onOpen();
  };

  return (
    <SwipeableActionRow
      actions={[
        {
          icon: 'edit',
          id: 'edit',
          label: '수정',
          onPress: onEdit,
          testID: `recordSwipeEdit_${document.resource.id}`,
          tone: 'primary',
        },
        {
          icon: 'delete-outline',
          id: 'delete',
          label: isDeleting ? '삭제 중' : '삭제',
          onPress: () => {
            if (!isDeleting) onDelete();
          },
          testID: `recordSwipeDelete_${document.resource.id}`,
          tone: 'danger',
        },
      ]}
      testID={`recordSwipe_${document.resource.id}`}
    >
      <View
        style={[
          styles.recordRow,
          selected && styles.recordRowSelected,
          isDeleting && styles.recordRowDeleting,
        ]}
        testID={`recordRowContainer_${document.resource.id}`}
      >
        <View style={styles.recordRowHeader}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.recordOpenArea}
            onPress={handleOpenOrEdit}
            testID={`recordRow_${document.resource.id}`}
          >
            <View style={styles.recordIcon}>
              {category
                ? <CategoryIcon category={category} size={24} />
                : <MaterialIcons name="article" size={24} color="#555" />}
            </View>
            <View style={styles.recordMain}>
              <View style={styles.recordTitleRow}>
                <Text style={styles.recordTitle} numberOfLines={1}>{title}</Text>
                {issueCount > 0 && (
                  <View style={styles.issueBadge}>
                    <MaterialIcons name="priority-high" size={12} color="white" />
                    <Text style={styles.issueBadgeText}>{issueCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.recordMeta} numberOfLines={1}>
                {categoryLabel}{contextPath ? ` · 맥락 ${contextPath}` : ''}
              </Text>
              {statusChips.length > 0 && (
                <View style={styles.statusChipRow}>
                  {statusChips.map((chip) => (
                    <StatusChip key={`${title}-${chip.label}`} chip={chip} />
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.recordActions}>
            <TouchableOpacity
              accessibilityLabel={`${title} 이어 만들 기록 추가`}
              style={styles.iconButton}
              onPress={(event) => {
                event.stopPropagation();
                onAddChild();
              }}
              hitSlop={8}
            >
              <MaterialIcons name="add" size={20} color="#475467" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`${title} 편집`}
              style={styles.iconButton}
              onPress={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              hitSlop={8}
            >
              <MaterialIcons name="edit" size={20} color="#475467" />
            </TouchableOpacity>
          </View>
        </View>
        {hasExpandedBody && (
          <View style={styles.recordExpandedBody}>
            {evidenceChips.length > 0 && (
              <View style={styles.evidenceChipRow}>
                {evidenceChips.map((chip) => {
                  const [firstEvidenceDocument] = chip.documents;
                  const canCreate = !firstEvidenceDocument
                    && !!chip.createCategoryName
                    && allowedEvidenceCategories.has(chip.createCategoryName);
                  const isPressable = !!firstEvidenceDocument || canCreate;

                  return (
                    <EvidenceChip
                      key={`${title}-${chip.id}`}
                      chip={chip}
                      canCreate={canCreate}
                      disabled={!isPressable}
                      onPress={() => {
                        if (firstEvidenceDocument) {
                          onOpenEvidence(firstEvidenceDocument);
                          return;
                        }
                        if (canCreate && chip.createCategoryName) {
                          onAddEvidence(document, chip.createCategoryName);
                        }
                      }}
                    />
                  );
                })}
              </View>
            )}
            {!!description && (
              <Text style={styles.recordDescription} numberOfLines={2}>
                {description}
              </Text>
            )}
            {actionSummary.isTracked && (
              <RecordWorkSummary
                summary={actionSummary}
                actions={visibleActions}
                onActionPress={(action) => {
                  if (action.type === 'openDocument' && action.document) {
                    onOpenEvidence(action.document);
                    return;
                  }

                  if (action.type === 'createDocument' && action.categoryName) {
                    onAddEvidence(document, action.categoryName);
                  }
                }}
              />
            )}
          </View>
        )}
      </View>
    </SwipeableActionRow>
  );
};

const RecordWorkSummary: React.FC<{
  summary: ReturnType<typeof getKoreanFieldworkRecordActionSummary>;
  actions: KoreanFieldworkRecordActionItem[];
  onActionPress: (action: KoreanFieldworkRecordActionItem) => void;
}> = ({ summary, actions, onActionPress }) => (
  <View style={styles.recordWorkPanel}>
    <View style={styles.recordWorkSummaryRow}>
      <View style={styles.recordWorkPercentTrack}>
        <View
          style={[
            styles.recordWorkPercentFill,
            recordWorkPercentFillStyle(summary.tone),
            { width: `${summary.completionPercent}%` },
          ]}
        />
      </View>
      <Text style={[styles.recordWorkPercent, recordWorkPercentTextStyle(summary.tone)]}>
        {summary.completionPercent}%
      </Text>
      <Text style={styles.recordWorkMetric}>이어진 기록 {summary.structureCount}</Text>
      <Text style={styles.recordWorkMetric}>자료 {summary.evidenceCount}</Text>
      {summary.issueCount > 0 && (
        <Text style={styles.recordWorkIssue}>점검 {summary.issueCount}</Text>
      )}
      {summary.checklistTotal > 0 && (
        <Text style={styles.recordWorkMetric}>
          과정 {summary.checklistDone}/{summary.checklistTotal}
        </Text>
      )}
    </View>
    {actions.length > 0 && (
      <View style={styles.recordWorkActionRow}>
        {actions.map((action) => (
          <RecordWorkActionButton
            key={action.id}
            action={action}
            onPress={(event) => {
              event.stopPropagation();
              onActionPress(action);
            }}
          />
        ))}
      </View>
    )}
  </View>
);

const RecordWorkActionButton: React.FC<{
  action: KoreanFieldworkRecordActionItem;
  onPress: (event: GestureResponderEvent) => void;
}> = ({ action, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.84}
    accessibilityLabel={action.label}
    onPress={onPress}
    style={[styles.recordWorkActionButton, recordWorkActionStyle(action.tone)]}
  >
    <MaterialIcons
      name={action.icon as keyof typeof MaterialIcons.glyphMap}
      size={14}
      color={recordWorkActionColor(action.tone)}
    />
    <View style={styles.recordWorkActionTextWrap}>
      <Text style={styles.recordWorkActionLabel} numberOfLines={1}>
        {action.label}
      </Text>
      <Text style={styles.recordWorkActionDetail} numberOfLines={1}>
        {action.detail}
      </Text>
    </View>
  </TouchableOpacity>
);

const EvidenceChip: React.FC<{
  chip: KoreanFieldworkEvidenceChip;
  canCreate: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({
  chip,
  canCreate,
  disabled,
  onPress,
}) => {
  const isFilled = chip.tone === 'filled';
  const textStyle = isFilled || canCreate
    ? styles.evidenceChipTextFilled
    : styles.evidenceChipTextEmpty;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityLabel={`${chip.label} ${chip.count}건${canCreate ? ', 추가' : ''}`}
      disabled={disabled}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={[
        styles.evidenceChip,
        isFilled ? styles.evidenceChipFilled : styles.evidenceChipEmpty,
        canCreate && styles.evidenceChipCreate,
        disabled && styles.evidenceChipDisabled,
      ]}
    >
      <Text style={[styles.evidenceChipLabel, textStyle]}>{chip.label}</Text>
      <Text style={[styles.evidenceChipCount, textStyle]}>{chip.count}</Text>
      {canCreate && (
        <MaterialIcons name="add" size={13} color="#175cd3" />
      )}
    </TouchableOpacity>
  );
};

const StatusChip: React.FC<{ chip: KoreanFieldworkStatusChip }> = ({ chip }) => (
  <View style={[styles.statusChip, statusChipToneStyle(chip.tone)]}>
    <Text style={[styles.statusChipText, statusChipTextToneStyle(chip.tone)]}>
      {chip.label}
    </Text>
  </View>
);

const statusChipToneStyle = (
  tone: KoreanFieldworkStatusTone
) => {
  switch (tone) {
    case 'success':
      return styles.statusChipSuccess;
    case 'warning':
      return styles.statusChipWarning;
    case 'danger':
      return styles.statusChipDanger;
    case 'info':
      return styles.statusChipInfo;
    default:
      return styles.statusChipNeutral;
  }
};

const statusChipTextToneStyle = (
  tone: KoreanFieldworkStatusTone
) => {
  switch (tone) {
    case 'success':
      return styles.statusChipTextSuccess;
    case 'warning':
      return styles.statusChipTextWarning;
    case 'danger':
      return styles.statusChipTextDanger;
    case 'info':
      return styles.statusChipTextInfo;
    default:
      return styles.statusChipTextNeutral;
  }
};

const recordWorkPercentFillStyle = (
  tone: KoreanFieldworkStatusTone
) => {
  switch (tone) {
    case 'success':
      return styles.recordWorkPercentFillSuccess;
    case 'warning':
      return styles.recordWorkPercentFillWarning;
    case 'danger':
      return styles.recordWorkPercentFillDanger;
    case 'info':
      return styles.recordWorkPercentFillInfo;
    default:
      return styles.recordWorkPercentFillNeutral;
  }
};

const recordWorkPercentTextStyle = (
  tone: KoreanFieldworkStatusTone
) => {
  switch (tone) {
    case 'success':
      return styles.recordWorkPercentSuccess;
    case 'warning':
      return styles.recordWorkPercentWarning;
    case 'danger':
      return styles.recordWorkPercentDanger;
    case 'info':
      return styles.recordWorkPercentInfo;
    default:
      return styles.recordWorkPercentNeutral;
  }
};

const recordWorkActionStyle = (
  tone: KoreanFieldworkStatusTone
) => {
  switch (tone) {
    case 'success':
      return styles.recordWorkActionSuccess;
    case 'warning':
      return styles.recordWorkActionWarning;
    case 'danger':
      return styles.recordWorkActionDanger;
    case 'info':
      return styles.recordWorkActionInfo;
    default:
      return styles.recordWorkActionNeutral;
  }
};

const recordWorkActionColor = (tone: KoreanFieldworkStatusTone): string => {
  switch (tone) {
    case 'success':
      return '#027a48';
    case 'warning':
      return '#b54708';
    case 'danger':
      return colors.danger;
    case 'info':
      return '#175cd3';
    default:
      return '#475467';
  }
};

const getRecordDescription = (document: Document): string | undefined => {
  const resource = document.resource as any;

  return [
    resource.shortDescription,
    resource.description,
    resource.fieldNote,
    resource.interpretation,
    resource.diaryAbstract,
    resource.penMemoReviewedTranscript,
    resource.penMemoAutoTranscript,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);
};

const getSearchableText = (document: Document, categoryLabel: string): string => {
  const resource = document.resource as any;

  return [
    resource.identifier,
    resource.shortDescription,
    resource.description,
    resource.fieldNote,
    resource.interpretation,
    resource.diaryAbstract,
    resource.penMemoReviewedTranscript,
    resource.penMemoAutoTranscript,
    resource.category,
    categoryLabel,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
};

export default DocumentsList;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f2f4f7',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  headerBand: {
    alignItems: 'center',
    backgroundColor: '#27343b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  kicker: {
    color: '#b9d0ca',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  contextLine: {
    color: '#d7dee2',
    fontSize: 13,
    marginTop: 6,
  },
  mapButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f4e',
    borderRadius: 6,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  workspaceTabs: {
    backgroundColor: 'white',
    borderBottomColor: '#d0d5dd',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  workspaceTab: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 4,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  workspaceTabActive: {
    backgroundColor: '#27343b',
    borderColor: '#27343b',
  },
  workspaceTabText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 6,
  },
  workspaceTabTextActive: {
    color: 'white',
  },
  flowPanel: {
    backgroundColor: 'white',
    borderBottomColor: '#d0d5dd',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  flowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flowTitle: {
    color: '#27343b',
    fontSize: 15,
    fontWeight: '900',
  },
  flowMeta: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
  },
  flowSteps: {
    flexDirection: 'row',
  },
  flowStep: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    marginRight: 7,
    minHeight: 68,
    paddingHorizontal: 8,
  },
  flowStepComplete: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  flowStepWarning: {
    backgroundColor: '#fff7f7',
    borderColor: '#f0b7bd',
  },
  flowStepDisabled: {
    opacity: 0.55,
  },
  flowStepIcon: {
    alignItems: 'center',
    backgroundColor: '#eff8ff',
    borderRadius: 6,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  flowStepIconComplete: {
    backgroundColor: '#d1fadf',
  },
  flowStepIconWarning: {
    backgroundColor: '#fff1f3',
  },
  flowStepText: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  flowStepLabel: {
    color: '#27343b',
    fontSize: 12,
    fontWeight: '900',
  },
  flowStepDetail: {
    color: '#667085',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  warningText: {
    color: colors.danger,
  },
  searchBand: {
    backgroundColor: 'white',
    borderBottomColor: '#d0d5dd',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  searchInput: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterRow: {
    paddingTop: 10,
  },
  filterChip: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: '#27343b',
    borderColor: '#27343b',
  },
  filterChipText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: 'white',
  },
  recordsBand: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#27343b',
    fontSize: 17,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emptyTitle: {
    color: '#27343b',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  recordSection: {
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  recordSectionHeader: {
    alignItems: 'center',
    borderBottomColor: '#eaecf0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recordSectionTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  recordSectionTitle: {
    color: '#27343b',
    fontSize: 15,
    fontWeight: '900',
  },
  recordSectionSubtitle: {
    color: '#667085',
    fontSize: 12,
    marginTop: 2,
  },
  recordSectionCount: {
    color: '#475467',
    fontSize: 16,
    fontWeight: '900',
  },
  recordRow: {
    borderBottomColor: '#eef0f3',
    borderBottomWidth: 1,
    minHeight: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recordRowSelected: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#2f5f4a',
    borderLeftWidth: 4,
    paddingLeft: 6,
  },
  recordRowDeleting: {
    opacity: 0.55,
  },
  recordRowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  recordOpenArea: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 58,
    minWidth: 0,
  },
  recordExpandedBody: {
    marginLeft: 42,
    paddingRight: 2,
  },
  recordIcon: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  recordMain: {
    flex: 1,
    paddingHorizontal: 8,
  },
  recordTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  recordTitle: {
    color: '#1f2937',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  recordMeta: {
    color: '#667085',
    fontSize: 12,
    marginTop: 2,
  },
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  statusChip: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: 4,
    marginRight: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusChipNeutral: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
  },
  statusChipInfo: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
  },
  statusChipSuccess: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  statusChipWarning: {
    backgroundColor: '#fffaeb',
    borderColor: '#fedf89',
  },
  statusChipDanger: {
    backgroundColor: '#fff1f3',
    borderColor: '#fecdca',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusChipTextNeutral: {
    color: '#475467',
  },
  statusChipTextInfo: {
    color: '#175cd3',
  },
  statusChipTextSuccess: {
    color: '#027a48',
  },
  statusChipTextWarning: {
    color: '#b54708',
  },
  statusChipTextDanger: {
    color: colors.danger,
  },
  evidenceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -2,
    marginTop: 5,
  },
  evidenceChip: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    height: 24,
    marginBottom: 4,
    marginHorizontal: 2,
    paddingHorizontal: 6,
  },
  evidenceChipFilled: {
    backgroundColor: '#eef4ff',
    borderColor: '#c7d7fe',
  },
  evidenceChipEmpty: {
    backgroundColor: '#f8fafc',
    borderColor: '#eaecf0',
  },
  evidenceChipCreate: {
    backgroundColor: '#eff8ff',
    borderColor: '#b2ddff',
  },
  evidenceChipDisabled: {
    opacity: 0.75,
  },
  evidenceChipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  evidenceChipCount: {
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  evidenceChipTextFilled: {
    color: '#3538cd',
  },
  evidenceChipTextEmpty: {
    color: '#98a2b3',
  },
  recordDescription: {
    color: '#344054',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  recordWorkPanel: {
    backgroundColor: '#f8fafc',
    borderColor: '#eaecf0',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  recordWorkSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  recordWorkPercentTrack: {
    backgroundColor: '#e4e7ec',
    borderRadius: 4,
    flex: 1,
    height: 8,
    marginRight: 7,
    overflow: 'hidden',
  },
  recordWorkPercentFill: {
    borderRadius: 4,
    height: 8,
  },
  recordWorkPercentFillNeutral: {
    backgroundColor: '#98a2b3',
  },
  recordWorkPercentFillInfo: {
    backgroundColor: '#1570ef',
  },
  recordWorkPercentFillSuccess: {
    backgroundColor: '#12b76a',
  },
  recordWorkPercentFillWarning: {
    backgroundColor: '#f79009',
  },
  recordWorkPercentFillDanger: {
    backgroundColor: colors.danger,
  },
  recordWorkPercent: {
    fontSize: 11,
    fontWeight: '900',
    marginRight: 7,
    minWidth: 34,
    textAlign: 'right',
  },
  recordWorkPercentNeutral: {
    color: '#475467',
  },
  recordWorkPercentInfo: {
    color: '#175cd3',
  },
  recordWorkPercentSuccess: {
    color: '#027a48',
  },
  recordWorkPercentWarning: {
    color: '#b54708',
  },
  recordWorkPercentDanger: {
    color: colors.danger,
  },
  recordWorkMetric: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },
  recordWorkIssue: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 5,
  },
  recordWorkActionRow: {
    flexDirection: 'row',
    marginHorizontal: -3,
    marginTop: 7,
  },
  recordWorkActionButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 3,
    minHeight: 42,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  recordWorkActionNeutral: {
    borderColor: '#d0d5dd',
  },
  recordWorkActionInfo: {
    borderColor: '#b2ddff',
  },
  recordWorkActionSuccess: {
    borderColor: '#abefc6',
  },
  recordWorkActionWarning: {
    borderColor: '#fedf89',
  },
  recordWorkActionDanger: {
    borderColor: '#fecdca',
  },
  recordWorkActionTextWrap: {
    flex: 1,
    marginLeft: 5,
    minWidth: 0,
  },
  recordWorkActionLabel: {
    color: '#27343b',
    fontSize: 11,
    fontWeight: '900',
  },
  recordWorkActionDetail: {
    color: '#667085',
    fontSize: 10,
    marginTop: 1,
  },
  issueBadge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 5,
    flexDirection: 'row',
    marginLeft: 8,
    minHeight: 20,
    paddingHorizontal: 5,
  },
  issueBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 2,
  },
  recordActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginLeft: 6,
    width: 34,
  },
});
