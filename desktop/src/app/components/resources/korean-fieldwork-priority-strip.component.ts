import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
    Datastore,
    Document,
    FieldDocument,
    KoreanFieldworkReportHandoffCopySection,
    KoreanFieldworkReportHandoffItem,
    KoreanFieldworkReadinessIssue,
    makeKoreanFieldworkReportHandoff,
    normalizeKoreanFieldworkHwpPlainText,
    PouchdbDatastore,
    ProjectConfiguration
} from 'idai-field-core';
import { Routing } from '../../services/routing';
import { MenuModalLauncher } from '../../services/menu-modal-launcher';
import { Messages } from '../messages/messages';
import { ViewFacade } from './view/view-facade';
import {
    getKoreanFieldworkProjectResourceValue,
    isKoreanFieldworkProject,
    KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD,
    KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD
} from '../../util/korean-fieldwork-project-setup';
import {
    KoreanFieldworkPriorityIssue,
    KoreanFieldworkTodayStats,
    makeKoreanFieldworkTodayStats
} from '../../util/korean-fieldwork-today-stats';
import {
    getKoreanFieldworkUserVisibleDocuments
} from '../../util/korean-fieldwork-system-records';
import {
    KoreanFieldworkWorkflowAction,
    KoreanFieldworkWorkflowStep,
    makeKoreanFieldworkWorkflowSteps
} from '../../util/korean-fieldwork-workflow';
import {
    KoreanFieldworkProgressItem,
    makeKoreanFieldworkProgressItems
} from '../../util/korean-fieldwork-progress-board';
import {
    KoreanFieldworkFeatureOverviewItem,
    KoreanFieldworkUnitMatrixItem,
    makeKoreanFieldworkFeatureOverviewItems,
    makeKoreanFieldworkUnitMatrixItems
} from '../../util/korean-fieldwork-unit-matrix';
import {
    getKoreanFieldworkOverviewChartData,
    KoreanFieldworkOverviewChartData,
    KoreanFieldworkOverviewMetric,
    KoreanFieldworkOverviewSegment,
    KoreanFieldworkOverviewTone
} from '../../util/korean-fieldwork-overview-chart';
import {
    KoreanFieldworkDailyNotebookDigest,
    KoreanFieldworkDailyJournalSummary,
    KoreanFieldworkNotebookEntry,
    KoreanFieldworkNotebookContinuationFocus,
    getKoreanFieldworkNotebookContinuationSeed,
    getKoreanFieldworkNotebookEntriesForDocument,
    makeKoreanFieldworkNotebookEntryCopyText,
    makeKoreanFieldworkDailyNotebookDigest
} from '../../util/korean-fieldwork-notebook-digest';
import {
    KoreanFieldworkWorkbenchItem,
    makeKoreanFieldworkWorkbenchItems
} from '../../util/korean-fieldwork-workbench';
import {
    isKoreanFieldworkHierarchyScopeDocument,
    KoreanFieldworkHierarchyItem,
    KoreanFieldworkHierarchyLane,
    makeKoreanFieldworkHierarchyLanes
} from '../../util/korean-fieldwork-hierarchy';
import {
    KoreanFieldworkPriorityTask,
    KoreanFieldworkPriorityTaskAction,
    makeKoreanFieldworkPriorityTasks
} from '../../util/korean-fieldwork-today-actions';
import {
    KoreanFieldworkRecordActionItem,
    makeKoreanFieldworkRecordActions
} from '../../util/korean-fieldwork-record-actions';
import {
    canReviseKoreanFieldworkIdentifier,
    getKoreanFieldworkFieldIdentifier,
    getKoreanFieldworkIdentifierRevisionHistory,
    getKoreanFieldworkIdentifierRevisionUpdates,
    getKoreanFieldworkReportIdentifier
} from '../../util/korean-fieldwork-identifier-revision';
import {
    getKoreanFieldworkRecordWorkDocuments,
    getKoreanFieldworkRecordWorkFilterCounts,
    KOREAN_FIELDWORK_RECORD_WORK_FILTERS,
    KoreanFieldworkRecordWorkFilter,
    KoreanFieldworkRecordWorkFilterCounts,
    KoreanFieldworkRecordWorkFilterId,
    matchesKoreanFieldworkRecordWorkFilter
} from '../../util/korean-fieldwork-record-work-filters';
import {
    KoreanFieldworkCloseoutSummary,
    makeKoreanFieldworkCloseoutSummary
} from '../../util/korean-fieldwork-closeout';
import {
    KoreanFieldworkScopeSummary,
    KoreanFieldworkScopeSummaryAction,
    makeKoreanFieldworkScopeSummary
} from '../../util/korean-fieldwork-scope-summary';
import {
    getKoreanFieldworkCloseoutBatchUpdates,
    getKoreanFieldworkCloseoutIssueActions,
    KoreanFieldworkCloseoutBatchUpdate
} from '../../util/korean-fieldwork-closeout-actions';
import {
    canCreateKoreanFieldworkChildRecord,
    createNextFeatureIdentifier,
    createKoreanFieldworkDraftResource,
    getKoreanFieldworkContinuationActions
} from '../../util/korean-fieldwork-document-drafts';
import { writeKoreanFieldworkHwpClipboardText } from '../../util/korean-fieldwork-hwp-clipboard';
import {
    KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS,
    KoreanFieldworkFeatureGuidancePreset
} from '../../util/korean-fieldwork-feature-guidance';
import {
    createKoreanFieldworkTabletHandoffReviewUpdate,
    createKoreanFieldworkTabletHandoffSourceReviewUpdate,
    getKoreanFieldworkTabletRecordBundleGroupSourcesForReview,
    KoreanFieldworkTabletRecordBundle,
    KoreanFieldworkTabletRecordBundleGroup,
    KoreanFieldworkTabletRecordBundleSource,
    makeKoreanFieldworkRecordTabletBundle
} from '../../util/korean-fieldwork-record-tablet-bundle';
import { DoceditLauncher } from './service/docedit-launcher';

type KoreanFieldworkPriorityPanelId = 'overview'|'workflow'|'today'|'records'|'notebook'|'report'|'closeout';

interface KoreanFieldworkPriorityPanelOption {
    id: KoreanFieldworkPriorityPanelId;
    label: string;
    count: number;
}

interface KoreanFieldworkRecordWorkEmptyState {
    title: string;
    detail: string;
}

interface PendingFeatureDraft {
    identifier: string;
    parentDocumentId: string;
    parentLabel: string;
}

interface KoreanFieldworkCreateDocumentDraftOptions {
    identifier?: string;
    recordMemoContinuation?: ReturnType<typeof getKoreanFieldworkNotebookContinuationSeed>;
    recordMemoTemplate?: boolean;
}

type KoreanFieldworkTodayQuickActionId = 'dailyLog'|'record'|'closeout';
type KoreanFieldworkTodayQuickActionTone = 'neutral'|'success'|'info'|'warning'|'danger';

type KoreanFieldworkTodayQuickActionTarget =
    | { type: 'dailyLog' }
    | { type: 'priorityTask', action: KoreanFieldworkPriorityTaskAction }
    | { type: 'openPanel', panelId: KoreanFieldworkPriorityPanelId };

interface KoreanFieldworkTodayQuickAction {
    id: KoreanFieldworkTodayQuickActionId;
    icon: string;
    label: string;
    detail: string;
    tone: KoreanFieldworkTodayQuickActionTone;
    target?: KoreanFieldworkTodayQuickActionTarget;
    disabled?: boolean;
}

const FEATURE_CATEGORY_NAME = 'Feature';
const NOTEBOOK_RECORD_MEMO_CATEGORY = 'PenMemo';
const REPORT_HANDOFF_COLLAPSED_LIMIT = 8;
const NOTEBOOK_RECORD_MEMO_TARGET_CATEGORIES = new Set([
    'Operation',
    'Trench',
    'FeatureGroup',
    'Feature',
    'FeatureSegment',
    'Layer',
    'FindCollection',
    'Find',
    'Sample',
    'Photo',
    'SoilProfilePhoto',
    'Drawing'
]);

const SELECTED_RECORD_CATEGORY_LABELS: Readonly<Record<string, string>> = {
    Drawing: '도면',
    Feature: '유구',
    FeatureGroup: '관련 유구',
    FeatureSegment: '세부 단위',
    Find: '유물',
    FindCollection: '유물 일괄',
    Layer: '토층',
    Operation: '조사',
    Photo: '사진',
    Sample: '시료',
    SoilProfilePhoto: '토층사진',
    Trench: '트렌치'
};


@Component({
    selector: 'korean-fieldwork-priority-strip',
    templateUrl: './korean-fieldwork-priority-strip.html',
    standalone: false
})
export class KoreanFieldworkPriorityStripComponent implements OnInit, OnDestroy {

    public stats: KoreanFieldworkTodayStats|undefined;
    public workflowSteps: KoreanFieldworkWorkflowStep[] = [];
    public priorityTasks: KoreanFieldworkPriorityTask[] = [];
    public progressItems: KoreanFieldworkProgressItem[] = [];
    public featureOverviewItems: KoreanFieldworkFeatureOverviewItem[] = [];
    public unitMatrixItems: KoreanFieldworkUnitMatrixItem[] = [];
    public workbenchItems: KoreanFieldworkWorkbenchItem[] = [];
    public recordWorkFilterCounts: KoreanFieldworkRecordWorkFilterCounts|undefined;
    public activeRecordWorkFilterId: KoreanFieldworkRecordWorkFilterId = 'all';
    public workbenchActionsByDocumentId: Map<string, KoreanFieldworkRecordActionItem[]> = new Map();
    public scopeSummary: KoreanFieldworkScopeSummary|undefined;
    public closeoutSummary: KoreanFieldworkCloseoutSummary|undefined;
    public closeoutBatchUpdates: KoreanFieldworkCloseoutBatchUpdate[] = [];
    public notebookDigest: KoreanFieldworkDailyNotebookDigest|undefined;
    public notebookDailyLogParentDocumentId: string|undefined;
    public reportHandoffItems: KoreanFieldworkReportHandoffItem[] = [];
    public reportHandoffTabletBundlesByDocumentId: Map<string, KoreanFieldworkTabletRecordBundle> = new Map();
    public reportHandoffCopyAllText: string = '';
    public reportHandoffCopyAllBodyText: string = '';
    public reportCopiedDocumentId: string|undefined;
    public notebookCopiedEntryId: string|undefined;
    public selectedReportHandoffDocumentId: string|undefined;
    public reportHandoffShowsAll: boolean = false;
    public reportHandoffShowsTabletWorkOnly: boolean = false;
    public overviewChartData: KoreanFieldworkOverviewChartData|undefined;
    public isLoading: boolean = false;
    public activePanel: KoreanFieldworkPriorityPanelId = 'overview';
    public pendingFeatureDraft: PendingFeatureDraft|undefined;

    private changesSubscription: Subscription|undefined;
    private refreshId: number = 0;
    private projectDocuments: Document[] = [];


    constructor(private datastore: Datastore,
                private pouchdbDatastore: PouchdbDatastore,
                private projectConfiguration: ProjectConfiguration,
                private routing: Routing,
                private viewFacade: ViewFacade,
                private menuModalLauncher: MenuModalLauncher,
                private router: Router,
                private messages: Messages,
                @Optional() private doceditLauncher?: DoceditLauncher) {}


    async ngOnInit() {

        await this.refresh();
        this.changesSubscription = this.pouchdbDatastore.changesNotifications().subscribe(() => {
            this.refresh();
        });
    }


    ngOnDestroy() {

        if (this.changesSubscription) this.changesSubscription.unsubscribe();
    }


    public shouldShow = () => this.stats !== undefined;

    public setActivePanel(panelId: KoreanFieldworkPriorityPanelId) {

        if (this.isPanelAvailable(panelId)) this.activePanel = panelId;
    }

    public isPanelActive = (panelId: KoreanFieldworkPriorityPanelId) =>
        this.activePanel === panelId;

    public getPanelOptions(): KoreanFieldworkPriorityPanelOption[] {

        const panels: KoreanFieldworkPriorityPanelOption[] = [
            { id: 'overview', label: '전체 현황', count: this.getOverviewPanelCount() },
            { id: 'workflow', label: '작업 순서', count: this.getWorkflowStepAttentionCount() },
            { id: 'today', label: '오늘 할 일', count: this.getTodayPanelCount() },
            { id: 'records', label: '기록 작업', count: this.getRecordsPanelCount() },
            { id: 'notebook', label: '야장', count: this.getNotebookPanelCount() },
            { id: 'report', label: '\ubcf4\uace0\uc11c', count: this.getReportPanelCount() },
            { id: 'closeout', label: '마감', count: this.getCloseoutPanelCount() }
        ];

        return panels.filter(panel => this.isPanelAvailable(panel.id));
    }

    public shouldShowPanelNavigation = () =>
        this.getPanelOptions().length > 1;

    public hasPriorityIssues = () => this.getPriorityIssues().length > 0;

    public getPriorityIssues = () =>
        this.stats?.priorityIssues ?? [];

    public getSummaryLabel = () => {
        if (!this.stats) return '';

        return `일지 ${this.stats.dailyLogCount} · 경계 ${this.stats.surveyBoundaryCount} · 유구 후보 ${this.stats.featureCandidateCount} · 확인 ${this.stats.openIssueCount}`;
    };

    public getIssueBreakdownLabel = () => {
        if (!this.stats || this.stats.openIssueCount === 0) return '우선 확인 없음';

        return `필수 ${this.stats.criticalIssueCount} · 보완 ${this.stats.warningIssueCount} · 참고 ${this.stats.infoIssueCount}`;
    };

    public getStatusLabel = () => this.stats?.statusLabel ?? '';

    public getStatusTone = () => this.stats?.statusTone ?? 'success';

    public hasOverviewChartData = () => this.overviewChartData !== undefined;

    public getOverviewChartData = () => this.overviewChartData;

    public getOverviewMetrics = (): KoreanFieldworkOverviewMetric[] =>
        this.overviewChartData?.metrics ?? [];

    public getOverviewInvestigationSegments = (): KoreanFieldworkOverviewSegment[] =>
        this.overviewChartData?.investigationSegments ?? [];

    public getOverviewFeatureStatusSegments = (): KoreanFieldworkOverviewSegment[] =>
        this.overviewChartData?.featureStatusSegments ?? [];

    public getOverviewVisibleSegments = (segments: KoreanFieldworkOverviewSegment[]) =>
        segments.filter(segment => segment.count > 0);

    public getOverviewScopeLabel = () =>
        `전체 조사자료 · 기록 ${this.overviewChartData?.totalDocumentCount ?? 0}`;

    public getOverviewInvestigationSubtitle = () =>
        `${this.overviewChartData?.investigationUnitCount ?? 0}단위`;

    public getOverviewFeatureStatusSubtitle = () =>
        `${this.overviewChartData?.featureWorkflowCount ?? 0}건`;

    public getOverviewFooterLabel = () => {
        const data = this.overviewChartData;
        if (!data) return '';

        return `과정 ${data.checklistDone}/${data.checklistTotal}`
            + ` · 확인 ${data.openIssueCount}`
            + ` · 필수 ${data.criticalIssueCount}`;
    };

    public getOverviewSegmentFlex = (segment: KoreanFieldworkOverviewSegment) =>
        Math.max(segment.count, 1);

    public getOverviewToneClass = (tone: KoreanFieldworkOverviewTone) =>
        `tone-${tone}`;

    public returnToInvestigationOverview() {

        this.setActivePanel('overview');
    }

    public hasScopeSummary = () => this.scopeSummary !== undefined;

    public getScopeSummary = () => this.scopeSummary;

    public getScopeMetricLabel = () => {
        if (!this.scopeSummary) return '';

        return `현장 기록 ${this.scopeSummary.structureCount} · 자료 ${this.scopeSummary.evidenceCount} · 일지·점검 ${this.scopeSummary.reviewCount} · 확인 ${this.scopeSummary.issueCount}`;
    };

    public hasCloseoutSummary = () => this.closeoutSummary !== undefined;

    public getCloseoutSummary = () => this.closeoutSummary;

    public getCloseoutIssues = () => this.closeoutSummary?.issues ?? [];

    public getCloseoutCountsLabel = () => {
        const counts = this.closeoutSummary?.counts;
        if (!counts) return '';

        return `필수 ${counts.critical} · 보완 ${counts.warning} · 참고 ${counts.info}`;
    };

    public hasCloseoutBatchUpdates = () => this.closeoutBatchUpdates.length > 0;

    public getCloseoutBatchUpdateCount = () =>
        this.closeoutBatchUpdates.reduce((count, update) => count + update.issueCount, 0);

    public getCloseoutBatchDocumentCount = () => this.closeoutBatchUpdates.length;

    public getWorkflowSteps = () => this.workflowSteps;

    public getPriorityTasks = () => this.priorityTasks;

    public hasPriorityTasks = () => this.priorityTasks.length > 0;

    public getTodayQuickActions = (): KoreanFieldworkTodayQuickAction[] => [
        this.getTodayDailyLogQuickAction(),
        this.getTodayRecordQuickAction(),
        this.getTodayCloseoutQuickAction()
    ];

    public getProgressItems = () => this.progressItems;

    public hasProgressItems = () => this.progressItems.length > 0;

    public getFeatureOverviewItems = () => this.featureOverviewItems;

    public hasFeatureOverviewItems = () => this.featureOverviewItems.length > 0;

    public getUnitMatrixItems = () => this.unitMatrixItems;

    public hasUnitMatrixItems = () => this.unitMatrixItems.length > 0;

    public hasWorkbenchItems = () => this.workbenchItems.length > 0;

    public getWorkbenchItems = () => this.workbenchItems;

    public getFilteredWorkbenchItems = () =>
        this.workbenchItems.filter(item => this.matchesActiveRecordWorkFilter(item.documentId));

    public hasFilteredWorkbenchItems = () =>
        this.getFilteredWorkbenchItems().length > 0;

    public getHierarchyLanes = (): KoreanFieldworkHierarchyLane[] =>
        this.stats
            ? makeKoreanFieldworkHierarchyLanes(
                this.projectDocuments,
                this.stats.issueCountByDocumentId,
                this.getHierarchyScopeDocument()
            )
            : [];

    public hasHierarchyLanes = () =>
        this.getHierarchyLanes().some(lane => lane.totalCount > 0);

    public getHierarchyScopeLabel = () => {
        const scopeDocument = this.getHierarchyScopeDocument();

        return scopeDocument?.resource.identifier
            ?? scopeDocument?.resource.id
            ?? '전체 조사자료';
    };

    public getHierarchyItemContinuationAction(item: KoreanFieldworkHierarchyItem) {

        const document = this.getDocumentById(item.documentId);
        if (!document) return undefined;

        return getKoreanFieldworkContinuationActions(document, this.projectConfiguration)[0];
    }

    public canCreateHierarchyItemChild = (item: KoreanFieldworkHierarchyItem) =>
        this.getHierarchyItemContinuationAction(item) !== undefined;

    public getWorkbenchActions = (item: KoreanFieldworkWorkbenchItem) =>
        this.workbenchActionsByDocumentId.get(item.documentId) ?? [];

    public getRecordWorkFilters = (): readonly KoreanFieldworkRecordWorkFilter[] =>
        KOREAN_FIELDWORK_RECORD_WORK_FILTERS;

    public getRecordWorkFilterCount = (filter: KoreanFieldworkRecordWorkFilter) =>
        this.recordWorkFilterCounts?.[filter.id] ?? 0;

    public setActiveRecordWorkFilter(filter: KoreanFieldworkRecordWorkFilter) {

        this.activeRecordWorkFilterId = filter.id;
    }

    public isRecordWorkFilterActive = (filter: KoreanFieldworkRecordWorkFilter) =>
        this.activeRecordWorkFilterId === filter.id;

    public hasRecordWorkFilterCounts = () =>
        this.recordWorkFilterCounts !== undefined
        && this.recordWorkFilterCounts.all > 0;

    public hasFilteredRecordWorkItems = () =>
        this.getFilteredFeatureOverviewItems().length > 0
        || this.getFilteredUnitMatrixItems().length > 0
        || this.getFilteredProgressItems().length > 0
        || this.getFilteredWorkbenchItems().length > 0;

    public hasPendingFeatureDraft = () =>
        this.isPanelActive('records') && this.pendingFeatureDraft !== undefined;

    public getPendingFeatureDraftParentLabel = () =>
        this.pendingFeatureDraft?.parentLabel ?? '선택 기록';

    public getPendingFeatureDraftIdentifier = () =>
        this.pendingFeatureDraft?.identifier ?? '';

    public getPendingFeatureDraftIdentifierPlaceholder = () =>
        createNextFeatureIdentifier('unknown', this.projectDocuments);

    public updatePendingFeatureDraftIdentifier(identifier: string) {

        if (!this.pendingFeatureDraft) return;

        this.pendingFeatureDraft = {
            ...this.pendingFeatureDraft,
            identifier
        };
    }

    public getFeatureDraftPresets = (): readonly KoreanFieldworkFeatureGuidancePreset[] =>
        KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS;

    public getFeatureDraftPresetLabel(preset: KoreanFieldworkFeatureGuidancePreset): string {

        return preset.featureType === 'unknown'
            ? '유구로 만들기'
            : preset.label;
    }

    public cancelPendingFeatureDraft(event?: Event) {

        if (event) event.stopPropagation();
        this.pendingFeatureDraft = undefined;
    }

    public getFilteredRecordWorkEmptyState = (): KoreanFieldworkRecordWorkEmptyState => {

        switch (this.activeRecordWorkFilterId) {
            case 'needsReview':
                return {
                    title: '확인 필요 기록이 없습니다',
                    detail: '보완 경고나 재확인 표시가 있는 기록이 이 필터에 없습니다.'
                };
            case 'pending':
                return {
                    title: '조사 중 기록이 없습니다',
                    detail: '성격 보류나 조사 중 상태로 남겨 둔 유구 기록이 없습니다.'
                };
            case 'missingEvidence':
                return {
                    title: '자료 보강 대상이 없습니다',
                    detail: '사진·도면·유물·시료 연결이 부족한 기록이 이 필터에 없습니다.'
                };
            case 'today':
                return {
                    title: '오늘 작성 기록이 없습니다',
                    detail: '오늘 작성 필터만 비어 있습니다. 전체를 누르면 기존 기록을 다시 볼 수 있습니다.'
                };
            default:
                return {
                    title: '표시할 기록 작업이 없습니다',
                    detail: '조사 구역이나 유구, 트렌치를 추가하거나 다른 작업 필터를 확인하세요.'
                };
        }
    };

    public getFilteredRecordWorkEmptyLabel = () =>
        this.getFilteredRecordWorkEmptyState().title;

    public getFilteredProgressItems = () =>
        this.progressItems.filter(item => this.matchesActiveRecordWorkFilter(item.documentId));

    public hasFilteredProgressItems = () =>
        this.getFilteredProgressItems().length > 0;

    public getFilteredFeatureOverviewItems = () =>
        this.featureOverviewItems.filter(item => this.matchesActiveRecordWorkFilter(item.documentId));

    public hasFilteredFeatureOverviewItems = () =>
        this.getFilteredFeatureOverviewItems().length > 0;

    public getFilteredUnitMatrixItems = () =>
        this.unitMatrixItems.filter(item => this.matchesActiveRecordWorkFilter(item.documentId));

    public hasFilteredUnitMatrixItems = () =>
        this.getFilteredUnitMatrixItems().length > 0;

    public hasSelectedRecordWorkbench = () =>
        !!this.stats && !!this.getSelectedRecordWorkbenchDocument();

    public getSelectedRecordWorkbenchLabel = () => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();

        return selectedDocument?.resource.identifier
            ?? selectedDocument?.resource.id
            ?? '';
    };

    public getSelectedRecordWorkbenchCategoryLabel = () => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument?.resource?.category) return '';

        return SELECTED_RECORD_CATEGORY_LABELS[selectedDocument.resource.category]
            ?? selectedDocument.resource.category;
    };

    public getSelectedRecordWorkbenchActions = () => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument) return [];

        return makeKoreanFieldworkRecordActions(
            selectedDocument,
            this.projectDocuments,
            this.projectConfiguration,
            4
        );
    };

    public canReviseSelectedRecordIdentifier = () =>
        canReviseKoreanFieldworkIdentifier(this.getSelectedRecordWorkbenchDocument());

    public getSelectedRecordFieldIdentifier = () => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();

        return selectedDocument
            ? getKoreanFieldworkFieldIdentifier(selectedDocument)
            : '';
    };

    public getSelectedRecordReportIdentifier = () => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();

        return selectedDocument
            ? getKoreanFieldworkReportIdentifier(selectedDocument)
            : '';
    };

    public getSelectedRecordIdentifierRevisionHistoryLabel = () => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument) return '변경 이력 없음';

        const history = getKoreanFieldworkIdentifierRevisionHistory(selectedDocument);
        if (history.length === 0) return '변경 이력 없음';

        const latestEntry = history[history.length - 1];

        return `이력 ${history.length} · 최근 ${latestEntry.previousIdentifier}에서 ${latestEntry.nextIdentifier}`;
    };

    public canApplySelectedRecordIdentifierRevision = (nextIdentifier: string|undefined|null) => {
        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument || !canReviseKoreanFieldworkIdentifier(selectedDocument)) return false;

        const normalizedNextIdentifier = normalizeIdentifierInput(nextIdentifier);
        const currentIdentifier = normalizeIdentifierInput(selectedDocument.resource.identifier);

        return !!normalizedNextIdentifier && normalizedNextIdentifier !== currentIdentifier;
    };

    public hasNotebookDigest = () =>
        !!this.notebookDigest
        && (
            this.notebookDigest.entries.length > 0
            || this.notebookDigest.dailyLogDocuments.length > 0
        );

    public hasNotebookPanel = () =>
        !!this.stats
        && (
            this.hasNotebookDigest()
            || this.hasNotebookSelectedRecordEntries()
            || this.canRunNotebookDailyLogAction()
            || this.canRunNotebookRecordMemoAction()
        );

    public getNotebookSummaryLabel = () => {
        const selectedRecordEntryCount = this.getNotebookSelectedRecordEntries().length;
        if (!this.notebookDigest) return '오늘 작업일지 준비 필요';

        return `기록 ${this.notebookDigest.entries.length}`
            + ` · 다음 ${this.notebookDigest.nextWorkEntries.length}`
            + ` · 번호 ${this.notebookDigest.evidenceMissingEntries.length}`
            + (selectedRecordEntryCount ? ` · 선택 ${selectedRecordEntryCount}` : '');
    };

    public getNotebookNextWorkEntries = () =>
        this.notebookDigest?.nextWorkEntries.slice(0, 3) ?? [];

    public getNotebookEvidenceMissingEntries = () =>
        this.notebookDigest?.evidenceMissingEntries.slice(0, 3) ?? [];

    public getNotebookRecentEntries = () => {
        if (!this.notebookDigest) return [];

        const surfacedEntryIds = new Set([
            ...this.notebookDigest.nextWorkEntries,
            ...this.notebookDigest.evidenceMissingEntries,
            ...this.getNotebookSelectedRecordEntries()
        ].map(entry => entry.id));

        return this.notebookDigest.entries
            .filter(entry => !surfacedEntryIds.has(entry.id))
            .slice(0, 3);
    };

    public hasNotebookRecentEntries = () =>
        this.getNotebookRecentEntries().length > 0;

    public hasNotebookFollowUps = () =>
        this.getNotebookNextWorkEntries().length > 0
        || this.getNotebookEvidenceMissingEntries().length > 0;

    public getNotebookDailyJournalSummaries = () =>
        this.notebookDigest?.dailyJournalSummaries.slice(0, 3) ?? [];

    public hasNotebookDailyJournalSummaries = () =>
        this.getNotebookDailyJournalSummaries().length > 0;

    public getNotebookDailyJournalSummaryTone(summary: KoreanFieldworkDailyJournalSummary): 'success'|'info'|'warning' {

        if (!summary.hasSafetyComplete) return 'warning';
        if (!summary.hasBoundaryMemo) return 'info';

        return 'success';
    }

    public getNotebookSelectedRecordEntries = () =>
        getKoreanFieldworkNotebookEntriesForDocument(
            this.getNotebookSelectedRecordDocument(),
            this.projectDocuments,
            3
        );

    public hasNotebookSelectedRecordEntries = () =>
        this.getNotebookSelectedRecordEntries().length > 0;

    public getNotebookSelectedRecordLabel = () => {
        const selectedDocument = this.getNotebookSelectedRecordDocument();

        return selectedDocument?.resource.identifier
            ?? selectedDocument?.resource.id
            ?? '선택 기록';
    };

    public getNotebookEntryActionLabel(entry: KoreanFieldworkNotebookEntry): string {

        return entry.targetDocument ? '대상 열기' : `${entry.sourceLabel} 열기`;
    }

    public isNotebookEntryCopied = (entry: KoreanFieldworkNotebookEntry) =>
        this.notebookCopiedEntryId === entry.id;

    public getNotebookEntryCopyActionLabel = (entry: KoreanFieldworkNotebookEntry) =>
        this.isNotebookEntryCopied(entry) ? '\ubcf5\uc0ac\ub428' : '\ubcf5\uc0ac';

    public getNotebookEntryCopyTooltip = (entry: KoreanFieldworkNotebookEntry) =>
        makeKoreanFieldworkNotebookEntryCopyText(entry);

    public async copyNotebookEntry(entry: KoreanFieldworkNotebookEntry, event?: Event) {

        if (event) event.stopPropagation();

        try {
            await writeKoreanFieldworkHwpClipboardText(makeKoreanFieldworkNotebookEntryCopyText(entry));
            this.markNotebookEntryCopied(entry.id);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public getNotebookContinuationFocus(
            entry: KoreanFieldworkNotebookEntry,
            preferredFocus?: KoreanFieldworkNotebookContinuationFocus
    ): KoreanFieldworkNotebookContinuationFocus|undefined {

        if (preferredFocus) return preferredFocus;
        if (entry.needsEvidenceNumbers && !entry.nextWork) return 'evidenceNumbers';
        if (entry.nextWork) return 'nextWork';

        return undefined;
    }

    public getNotebookContinuationActionLabel(
            entry: KoreanFieldworkNotebookEntry,
            preferredFocus?: KoreanFieldworkNotebookContinuationFocus
    ): string {

        const focus = this.getNotebookContinuationFocus(entry, preferredFocus);
        if (focus === 'evidenceNumbers') return '번호 이어쓰기';
        if (focus === 'nextWork') return '다음 이어쓰기';

        return '이어쓰기';
    }

    public canContinueNotebookEntry(
            entry: KoreanFieldworkNotebookEntry,
            preferredFocus?: KoreanFieldworkNotebookContinuationFocus
    ): boolean {

        const parentDocument = this.getNotebookContinuationParentDocument(entry);

        return this.canCreateNotebookRecordMemo(parentDocument)
            && !!getKoreanFieldworkNotebookContinuationSeed(
                entry,
                this.getNotebookContinuationFocus(entry, preferredFocus)
            );
    }

    public canRunNotebookDailyLogAction = () =>
        !!this.notebookDigest?.primaryDailyLog || !!this.notebookDailyLogParentDocumentId;

    public getNotebookDailyLogActionLabel = () =>
        this.notebookDigest?.primaryDailyLog ? '오늘 작업일지 열기' : '오늘 작업일지 만들기';

    public getNotebookDailyLogActionDetail = () =>
        this.notebookDigest?.primaryDailyLog
            ? '오늘 작업일지 기록을 엽니다.'
            : '현재 조사 구역에 오늘 작업일지를 만듭니다.';

    public canRunNotebookRecordMemoAction = () =>
        !!this.getNotebookRecordMemoParentDocument();

    public getNotebookRecordMemoActionLabel = () => '선택 기록 메모';

    public getNotebookRecordMemoActionDetail = () => {
        const selectedDocument = this.getNotebookRecordMemoParentDocument();
        const selectedLabel = selectedDocument?.resource.identifier
            ?? selectedDocument?.resource.id;

        return selectedLabel
            ? `${selectedLabel}에 현장 메모를 붙입니다.`
            : '지도나 기록 목록에서 선택한 기록에 현장 메모를 붙입니다.';
    };

    public hasReportHandoffItems = () => this.reportHandoffItems.length > 0;

    public getReportHandoffItems = () => {
        const items = this.getFilteredReportHandoffItems();

        return this.reportHandoffShowsAll
            ? items
            : items.slice(0, REPORT_HANDOFF_COLLAPSED_LIMIT);
    };

    public hasReportHandoffOverflow = () =>
        this.getFilteredReportHandoffItems().length > REPORT_HANDOFF_COLLAPSED_LIMIT;

    public getReportHandoffHiddenCount = () =>
        Math.max(0, this.getFilteredReportHandoffItems().length - this.getReportHandoffItems().length);

    public getReportHandoffSummaryLabel = () => {
        const reviewCount = this.reportHandoffItems.filter(item => item.tone === 'review').length;
        const readyCount = this.reportHandoffItems.length - reviewCount;
        const tabletWorkCount = this.getTabletWorkReportHandoffItemCount();
        const tabletDoneCount = this.getReviewedTabletReportHandoffItemCount();

        return `\ubcf5\uc0ac ${this.reportHandoffItems.length} \u00b7 \ubcf4\uc644 ${reviewCount} \u00b7 \ubc14\ub85c ${readyCount}`
            + (this.reportHandoffTabletBundlesByDocumentId.size > 0
                ? ` \u00b7 \ud0dc\ube14\ub9bf \ucc98\ub9ac ${tabletWorkCount} \u00b7 \uc644\ub8cc ${tabletDoneCount}`
                : '');
    };

    public hasTabletWorkReportHandoffItems = () =>
        this.getTabletWorkReportHandoffItemCount() > 0;

    public getTabletWorkReportHandoffItemCount = () =>
        this.reportHandoffItems.filter(item => this.needsTabletReportHandoffProcessing(item)).length;

    public getReviewedTabletReportHandoffItemCount = () =>
        this.reportHandoffItems.filter(item => this.isReportHandoffTabletBundleReviewed(item)).length;

    public getReportHandoffTabletWorkFilterActionLabel = () =>
        this.reportHandoffShowsTabletWorkOnly
            ? '\uc804\uccb4'
            : `\ud0dc\ube14\ub9bf \ucc98\ub9ac ${this.getTabletWorkReportHandoffItemCount()}`;

    public isReportHandoffItemCopied = (item: KoreanFieldworkReportHandoffItem) =>
        this.reportCopiedDocumentId === item.documentId;

    public isReportHandoffCopyAllCopied = () =>
        this.reportCopiedDocumentId === '__all__';

    public isReportHandoffCopyAllBodyCopied = () =>
        this.reportCopiedDocumentId === '__all_body__';

    public isReportHandoffTabletWorkCopied = () =>
        this.reportCopiedDocumentId === '__tablet_work__';

    public isReportHandoffSectionCopied = (
            item: KoreanFieldworkReportHandoffItem,
            section: KoreanFieldworkReportHandoffCopySection
    ) => this.reportCopiedDocumentId === this.getReportHandoffSectionCopyId(item, section);

    public isReportHandoffBodyCopied = (item: KoreanFieldworkReportHandoffItem) => {
        const bodySection = this.getReportHandoffBodySection(item);

        return !!bodySection && this.isReportHandoffSectionCopied(item, bodySection);
    };

    public isReportHandoffItemSelected = (item: KoreanFieldworkReportHandoffItem) =>
        this.getReportHandoffPreviewItem()?.documentId === item.documentId;

    public getReportHandoffPreviewItem = () => {
        const items = this.getFilteredReportHandoffItems();

        return items.find(item => item.documentId === this.selectedReportHandoffDocumentId)
            ?? items[0];
    };

    public getReportHandoffTabletBundle = (item: KoreanFieldworkReportHandoffItem) =>
        this.reportHandoffTabletBundlesByDocumentId.get(item.documentId);

    public hasReportHandoffTabletBundle = (item: KoreanFieldworkReportHandoffItem) =>
        this.getReportHandoffTabletBundle(item) !== undefined;

    public getReportHandoffTabletBundleCopyActionLabel = (item: KoreanFieldworkReportHandoffItem) =>
        this.isReportHandoffTabletBundleCopied(item) ? '\ubcf5\uc0ac\ub428' : '\ud0dc\ube14\ub9bf \ubb36\uc74c';

    public getReportHandoffCopyActionLabel = (item: KoreanFieldworkReportHandoffItem) =>
        this.isReportHandoffItemCopied(item) ? '\ubcf5\uc0ac\ub428' : '\ubcf5\uc0ac';

    public getReportHandoffCopyAllActionLabel = () =>
        this.isReportHandoffCopyAllCopied() ? '\ubcf5\uc0ac\ub428' : '\uc804\uccb4 \ubcf5\uc0ac';

    public getReportHandoffCopyAllBodyActionLabel = () =>
        this.isReportHandoffCopyAllBodyCopied() ? '\ubcf5\uc0ac\ub428' : '\ubcf8\ubb38 \uc804\uccb4 \ubcf5\uc0ac';

    public getReportHandoffTabletWorkCopyActionLabel = () =>
        this.isReportHandoffTabletWorkCopied()
            ? '\ubcf5\uc0ac\ub428'
            : `\ud0dc\ube14\ub9bf \ucc98\ub9ac \ubcf5\uc0ac ${this.getTabletWorkReportHandoffItemCount()}`;

    public getReportHandoffTabletWorkReviewActionLabel = () =>
        `\ud0dc\ube14\ub9bf \ucc98\ub9ac \uc644\ub8cc ${this.getTabletWorkReportHandoffItemCount()}`;

    public getTabletWorkReportHandoffCopyText = () => {
        const seenSourceKeys = new Set<string>();
        const seenIssueDetails = new Set<string>();
        const copyBlocks = this.getTabletWorkReportHandoffItems()
            .map(item => {
                const bundle = this.getReportHandoffTabletBundle(item);

                return bundle
                    ? this.makeTabletWorkReportHandoffCopyBlock(item, bundle, seenSourceKeys, seenIssueDetails)
                    : '';
            })
            .filter(copyBlock => copyBlock.length > 0);

        if (copyBlocks.length === 0) return '';

        return [
            `[\ud0dc\ube14\ub9bf \ucc98\ub9ac \ub300\uc0c1] ${copyBlocks.length}\uac74`,
            '\uc911\ubcf5 \uc6d0\uc790\ub8cc\ub294 \ucc98\uc74c \ub098\uc628 \ud56d\ubaa9\uc5d0\ub9cc \ud45c\uc2dc',
            ...copyBlocks.flatMap(copyBlock => ['', copyBlock])
        ].join('\r\n');
    };

    public getReportHandoffBodyCopyActionLabel = (item: KoreanFieldworkReportHandoffItem) =>
        this.isReportHandoffBodyCopied(item) ? '\ubcf5\uc0ac\ub428' : '\ubcf8\ubb38 \ubcf5\uc0ac';

    public isReportHandoffTabletBundleCopied = (item: KoreanFieldworkReportHandoffItem) =>
        this.reportCopiedDocumentId === this.getReportHandoffTabletBundleCopyId(item);

    public isReportHandoffTabletBundleGroupCopied = (
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup
    ) => this.reportCopiedDocumentId === this.getReportHandoffTabletBundleGroupCopyId(item, group);

    public isReportHandoffTabletBundleSourceCopied = (
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ) => this.reportCopiedDocumentId === this.getReportHandoffTabletBundleSourceCopyId(item, group, source);

    public isReportHandoffTabletBundleReviewed = (item: KoreanFieldworkReportHandoffItem) =>
        this.getReportHandoffTabletBundle(item)?.reviewState.isReviewed === true;

    public getReportHandoffTabletBundleReviewActionLabel = (item: KoreanFieldworkReportHandoffItem) =>
        this.isReportHandoffTabletBundleReviewed(item) ? '\ucc98\ub9ac \ud574\uc81c' : '\ucc98\ub9ac \uc644\ub8cc';

    public getReportHandoffTabletBundleGroupCopyActionLabel = (
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup
    ) => this.isReportHandoffTabletBundleGroupCopied(item, group) ? '\ubcf5\uc0ac\ub428' : `${group.label} \ubcf5\uc0ac`;

    public getReportHandoffTabletBundleGroupSources(
            group: KoreanFieldworkTabletRecordBundleGroup
    ): KoreanFieldworkTabletRecordBundleSource[] =>
        getKoreanFieldworkTabletRecordBundleGroupSourcesForReview(group);

    public getReportHandoffTabletBundleSourceCopyActionLabel = (
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ) => this.isReportHandoffTabletBundleSourceCopied(item, group, source) ? '\ubcf5\uc0ac\ub428' : '\ubcf5\uc0ac';

    public getReportHandoffTabletBundleSourceReviewActionLabel = (
            source: KoreanFieldworkTabletRecordBundleSource
    ) => source.reviewState.isReviewed ? '\ucc98\ub9ac \ud574\uc81c' : '\ucc98\ub9ac \uc644\ub8cc';

    public canOpenReportHandoffTabletBundleSource = (source: KoreanFieldworkTabletRecordBundleSource) =>
        !!source.documentId;

    public getReportHandoffSectionCopyActionLabel = (
            item: KoreanFieldworkReportHandoffItem,
            section: KoreanFieldworkReportHandoffCopySection
    ) => this.isReportHandoffSectionCopied(item, section) ? '\ubcf5\uc0ac\ub428' : section.label;

    public getReportHandoffOverflowActionLabel = () =>
        this.reportHandoffShowsAll
            ? '\uc811\uae30'
            : `\uc804\uccb4 \ubcf4\uae30 \u00b7 ${this.getReportHandoffHiddenCount()} \uae30\ub85d`;

    public toggleReportHandoffTabletWorkFilter(event?: Event) {

        if (event) event.stopPropagation();

        this.reportHandoffShowsTabletWorkOnly = !this.reportHandoffShowsTabletWorkOnly;
        this.reportHandoffShowsAll = false;
        this.ensureReportHandoffPreviewSelection();
    }

    public selectReportHandoffItem(item: KoreanFieldworkReportHandoffItem, event?: Event) {

        if (event) event.stopPropagation();

        this.selectedReportHandoffDocumentId = item.documentId;
    }

    public toggleReportHandoffItems(event?: Event) {

        if (event) event.stopPropagation();
        if (!this.hasReportHandoffOverflow()) return;

        this.reportHandoffShowsAll = !this.reportHandoffShowsAll;

        if (!this.reportHandoffShowsAll
                && !this.getReportHandoffItems().some(item => item.documentId === this.selectedReportHandoffDocumentId)) {
            this.selectedReportHandoffDocumentId = this.getReportHandoffItems()[0]?.documentId;
        }
    }

    public async openReportHandoffItem(item: KoreanFieldworkReportHandoffItem, event?: Event) {

        if (event) event.stopPropagation();

        try {
            await this.openDocument(item.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyReportHandoffItem(item: KoreanFieldworkReportHandoffItem, event?: Event) {

        if (event) event.stopPropagation();

        try {
            this.selectedReportHandoffDocumentId = item.documentId;
            await writeKoreanFieldworkHwpClipboardText(item.copyText);
            this.markReportHandoffCopied(item.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyReportHandoffTabletBundle(item: KoreanFieldworkReportHandoffItem, event?: Event) {

        if (event) event.stopPropagation();

        const bundle = this.getReportHandoffTabletBundle(item);
        if (!bundle?.copyText) return;

        try {
            this.selectedReportHandoffDocumentId = item.documentId;
            await writeKoreanFieldworkHwpClipboardText(bundle.copyText);
            this.markReportHandoffCopied(this.getReportHandoffTabletBundleCopyId(item));
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyReportHandoffTabletBundleGroup(
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup,
            event?: Event
    ) {

        if (event) event.stopPropagation();
        if (!group.copyText) return;

        try {
            this.selectedReportHandoffDocumentId = item.documentId;
            await writeKoreanFieldworkHwpClipboardText(group.copyText);
            this.markReportHandoffCopied(this.getReportHandoffTabletBundleGroupCopyId(item, group));
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyReportHandoffTabletBundleSource(
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource,
            event?: Event
    ) {

        if (event) event.stopPropagation();
        if (!source.copyText) return;

        try {
            this.selectedReportHandoffDocumentId = item.documentId;
            await writeKoreanFieldworkHwpClipboardText(source.copyText);
            this.markReportHandoffCopied(this.getReportHandoffTabletBundleSourceCopyId(item, group, source));
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async openReportHandoffTabletBundleSource(
            source: KoreanFieldworkTabletRecordBundleSource,
            event?: Event
    ) {

        if (event) event.stopPropagation();
        if (!source.documentId) return;

        try {
            await this.openDocument(source.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async toggleReportHandoffTabletBundleSourceReviewed(
            source: KoreanFieldworkTabletRecordBundleSource,
            event?: Event
    ) {

        if (event) event.stopPropagation();
        if (!source.documentId) return;

        const reviewedAt = new Date().toISOString();
        const updatedDocumentsById = new Map<string, Document>();
        this.collectReportHandoffTabletSourceReviewUpdate(
            source,
            !source.reviewState.isReviewed,
            reviewedAt,
            updatedDocumentsById
        );

        if (updatedDocumentsById.size === 0) return;

        try {
            await this.datastore.bulkUpdate([...updatedDocumentsById.values()]);
            this.applyProjectDocumentUpdates(updatedDocumentsById);
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async toggleReportHandoffTabletBundleReviewed(item: KoreanFieldworkReportHandoffItem, event?: Event) {

        if (event) event.stopPropagation();

        const bundle = this.getReportHandoffTabletBundle(item);
        if (!bundle) return;

        try {
            this.selectedReportHandoffDocumentId = item.documentId;
            const reviewed = !bundle.reviewState.isReviewed;
            const reviewedAt = new Date().toISOString();
            const updatedDocumentsById = new Map<string, Document>();

            this.collectReportHandoffTabletBundleReviewUpdates(
                item,
                bundle,
                reviewed,
                reviewedAt,
                updatedDocumentsById
            );
            if (updatedDocumentsById.size === 0) return;

            await this.datastore.bulkUpdate([...updatedDocumentsById.values()]);
            this.applyProjectDocumentUpdates(updatedDocumentsById);
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async markAllReportHandoffTabletWorkReviewed(event?: Event) {

        if (event) event.stopPropagation();

        const reviewedAt = new Date().toISOString();
        const updatedDocumentsById = new Map<string, Document>();

        this.getTabletWorkReportHandoffItems().forEach(item => {
            const bundle = this.getReportHandoffTabletBundle(item);
            if (!bundle) return;

            this.collectReportHandoffTabletBundleReviewUpdates(
                item,
                bundle,
                true,
                reviewedAt,
                updatedDocumentsById
            );
        });

        if (updatedDocumentsById.size === 0) return;

        try {
            await this.datastore.bulkUpdate([...updatedDocumentsById.values()]);
            this.applyProjectDocumentUpdates(updatedDocumentsById);
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyReportHandoffBody(item: KoreanFieldworkReportHandoffItem, event?: Event) {

        const bodySection = this.getReportHandoffBodySection(item);
        if (!bodySection?.copyText) return;

        await this.copyReportHandoffSection(item, bodySection, event);
    }

    public async copyReportHandoffSection(
            item: KoreanFieldworkReportHandoffItem,
            section: KoreanFieldworkReportHandoffCopySection,
            event?: Event) {

        if (event) event.stopPropagation();
        if (!section.copyText) return;

        try {
            this.selectedReportHandoffDocumentId = item.documentId;
            await writeKoreanFieldworkHwpClipboardText(section.copyText);
            this.markReportHandoffCopied(this.getReportHandoffSectionCopyId(item, section));
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyAllReportHandoffItems(event?: Event) {

        if (event) event.stopPropagation();
        if (!this.reportHandoffCopyAllText) return;

        try {
            await writeKoreanFieldworkHwpClipboardText(this.reportHandoffCopyAllText);
            this.markReportHandoffCopied('__all__');
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyAllReportHandoffTabletWork(event?: Event) {

        if (event) event.stopPropagation();

        const copyText = this.getTabletWorkReportHandoffCopyText();
        if (!copyText) return;

        try {
            await writeKoreanFieldworkHwpClipboardText(copyText);
            this.markReportHandoffCopied('__tablet_work__');
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async copyAllReportHandoffBodies(event?: Event) {

        if (event) event.stopPropagation();
        if (!this.reportHandoffCopyAllBodyText) return;

        try {
            await writeKoreanFieldworkHwpClipboardText(this.reportHandoffCopyAllBodyText);
            this.markReportHandoffCopied('__all_body__');
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public canRunWorkflowStep = (step: KoreanFieldworkWorkflowStep) => !!step.action;

    public canRunWorkflowStepSecondaryAction = (step: KoreanFieldworkWorkflowStep) => !!step.secondaryAction;

    public getWorkflowStepStatusLabel(status: KoreanFieldworkWorkflowStep['status']): string {

        switch (status) {
            case 'done':
                return '완료';
            case 'current':
                return '다음';
            case 'attention':
                return '확인';
            case 'todo':
                return '대기';
        }
    }

    public getSeverityLabel(severity: KoreanFieldworkPriorityIssue['severity']): string {

        switch (severity) {
            case 'critical':
                return '필수';
            case 'warning':
                return '보완';
            case 'info':
                return '참고';
        }
    }


    public async openIssue(issue: KoreanFieldworkPriorityIssue) {

        try {
            await this.openDocument(issue.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openCloseoutIssue(issue: KoreanFieldworkReadinessIssue) {

        try {
            await this.openDocument(issue.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async resolveCloseoutBatchUpdates() {

        if (!this.hasCloseoutBatchUpdates()) return;

        try {
            const updatedDocuments = this.closeoutBatchUpdates.map(batchUpdate => {
                const document = Document.clone(batchUpdate.document);
                Object.entries(batchUpdate.updates).forEach(([fieldName, value]) => {
                    document.resource[fieldName] = value;
                });
                return document;
            });

            await this.datastore.bulkUpdate(updatedDocuments);
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async runWorkflowStep(step: KoreanFieldworkWorkflowStep) {

        if (!step.action) return;

        try {
            await this.runWorkflowAction(step.action);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async runWorkflowStepSecondaryAction(step: KoreanFieldworkWorkflowStep) {

        if (!step.secondaryAction) return;

        try {
            await this.runWorkflowAction(step.secondaryAction);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async runScopeSummaryAction(action: KoreanFieldworkScopeSummaryAction|undefined) {

        if (!action) return;

        try {
            await this.runWorkflowAction(action);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async runPriorityTask(task: KoreanFieldworkPriorityTask) {

        try {
            await this.runPriorityTaskAction(task.action);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public canRunPriorityTaskSecondaryAction = (task: KoreanFieldworkPriorityTask) =>
        !!task.secondaryAction;

    public async runPriorityTaskSecondaryAction(task: KoreanFieldworkPriorityTask) {

        if (!task.secondaryAction) return;

        try {
            await this.runPriorityTaskAction(task.secondaryAction);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async runTodayQuickAction(action: KoreanFieldworkTodayQuickAction) {

        if (action.disabled || !action.target) return;

        try {
            switch (action.target.type) {
                case 'dailyLog':
                    await this.runNotebookDailyLogAction();
                    return;
                case 'priorityTask':
                    await this.runPriorityTaskAction(action.target.action);
                    return;
                case 'openPanel':
                    this.setActivePanel(action.target.panelId);
                    return;
            }
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openProgressItem(item: KoreanFieldworkProgressItem) {

        try {
            await this.openDocument(item.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openUnitMatrixItem(item: KoreanFieldworkUnitMatrixItem) {

        try {
            await this.openDocument(item.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async createUnitMatrixRecord(item: KoreanFieldworkUnitMatrixItem,
                                        categoryName: string,
                                        event?: Event) {

        if (event) event.stopPropagation();

        try {
            if (await this.requestDocumentDraft(item.documentId, categoryName)) {
                await this.refresh();
            }
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openWorkbenchItem(item: KoreanFieldworkWorkbenchItem) {

        try {
            await this.openDocument(item.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async runWorkbenchAction(item: KoreanFieldworkWorkbenchItem,
                                    action: KoreanFieldworkRecordActionItem,
                                    event?: Event) {

        if (event) event.stopPropagation();

        try {
            switch (action.type) {
                case 'openDocument':
                    await this.openDocument(action.documentId ?? item.documentId);
                    return;
                case 'createDocument':
                    if (!action.categoryName) return;
                    if (await this.requestDocumentDraft(item.documentId, action.categoryName)) {
                        await this.refresh();
                    }
                    return;
            }
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async openSelectedRecordWorkbenchDocument(event?: Event) {

        if (event) event.stopPropagation();

        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument) return;

        try {
            await this.routing.jumpToResource(selectedDocument);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openSelectedRecordWorkbenchOnMap(event?: Event) {

        if (event) event.stopPropagation();

        try {
            this.viewFacade.setMode('map');
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async clearSelectedRecordWorkbench(event?: Event) {

        if (event) event.stopPropagation();

        try {
            await this.viewFacade.deselect();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openHierarchyItem(item: KoreanFieldworkHierarchyItem, event?: Event) {

        if (event) event.stopPropagation();

        try {
            await this.openDocument(item.documentId);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async createHierarchyItemChild(item: KoreanFieldworkHierarchyItem, event?: Event) {

        if (event) event.stopPropagation();

        const action = this.getHierarchyItemContinuationAction(item);
        if (!action) return;

        try {
            if (await this.requestDocumentDraft(item.documentId, action.categoryName)) {
                await this.refresh();
            }
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async runSelectedRecordWorkbenchAction(action: KoreanFieldworkRecordActionItem,
                                                  event?: Event) {

        if (event) event.stopPropagation();

        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument) return;

        try {
            switch (action.type) {
                case 'openDocument':
                    await this.openDocument(action.documentId ?? selectedDocument.resource.id);
                    return;
                case 'createDocument':
                    if (!action.categoryName) return;
                    if (await this.requestDocumentDraft(selectedDocument.resource.id, action.categoryName)) {
                        await this.refresh();
                    }
                    return;
            }
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async createPendingFeatureDraft(preset: KoreanFieldworkFeatureGuidancePreset,
                                           event?: Event) {

        if (event) event.stopPropagation();
        const pendingFeatureDraft = this.pendingFeatureDraft;
        if (!pendingFeatureDraft) return;

        try {
            const identifier = this.getPendingFeatureIdentifierForPreset(preset);
            this.pendingFeatureDraft = undefined;
            await this.createDocumentDraft(
                pendingFeatureDraft.parentDocumentId,
                FEATURE_CATEGORY_NAME,
                preset.featureType,
                { identifier }
            );
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async applySelectedRecordIdentifierRevision(nextIdentifier: string|undefined|null,
                                                       reason?: string|undefined|null,
                                                       event?: Event) {

        if (event) event.stopPropagation();

        const selectedDocument = this.getSelectedRecordWorkbenchDocument();
        if (!selectedDocument || !this.canApplySelectedRecordIdentifierRevision(nextIdentifier)) return;

        try {
            const updates = getKoreanFieldworkIdentifierRevisionUpdates(selectedDocument, {
                nextIdentifier: nextIdentifier ?? '',
                reason: reason ?? ''
            });
            if (Object.keys(updates).length === 0) return;

            const updatedDocument = Document.clone(selectedDocument);
            Object.entries(updates).forEach(([fieldName, value]) => {
                updatedDocument.resource[fieldName] = value;
            });

            await this.datastore.bulkUpdate([updatedDocument]);
            this.projectDocuments = this.projectDocuments.map(document =>
                document.resource.id === updatedDocument.resource.id
                    ? updatedDocument
                    : document
            );
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openNotebookEntry(entry: KoreanFieldworkNotebookEntry) {

        try {
            await this.routing.jumpToResource(entry.targetDocument ?? entry.sourceDocument);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async openNotebookEntrySource(entry: KoreanFieldworkNotebookEntry) {

        try {
            await this.routing.jumpToResource(entry.sourceDocument);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async openNotebookDailyJournalSummary(summary: KoreanFieldworkDailyJournalSummary) {

        try {
            await this.routing.jumpToResource(summary.document);
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async continueNotebookEntry(
            entry: KoreanFieldworkNotebookEntry,
            preferredFocus?: KoreanFieldworkNotebookContinuationFocus,
            event?: Event) {

        if (event) event.stopPropagation();

        const parentDocument = this.getNotebookContinuationParentDocument(entry);
        if (!parentDocument?.resource?.id) return;

        try {
            await this.createDocumentDraft(
                parentDocument.resource.id,
                NOTEBOOK_RECORD_MEMO_CATEGORY,
                undefined,
                {
                    recordMemoContinuation: getKoreanFieldworkNotebookContinuationSeed(
                        entry,
                        this.getNotebookContinuationFocus(entry, preferredFocus)
                    )
                }
            );
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async runNotebookDailyLogAction() {

        try {
            if (this.notebookDigest?.primaryDailyLog) {
                await this.routing.jumpToResource(this.notebookDigest.primaryDailyLog);
            } else if (this.notebookDailyLogParentDocumentId) {
                await this.createDocumentDraft(this.notebookDailyLogParentDocumentId, 'DailyLog');
                await this.refresh();
            }
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }

    public async runNotebookRecordMemoAction() {

        const selectedDocument = this.getNotebookRecordMemoParentDocument();
        if (!selectedDocument?.resource?.id) return;

        try {
            await this.createDocumentDraft(
                selectedDocument.resource.id,
                NOTEBOOK_RECORD_MEMO_CATEGORY,
                undefined,
                { recordMemoTemplate: true }
            );
            await this.refresh();
        } catch (errWithParams) {
            this.messages.add(errWithParams);
        }
    }


    public async refresh() {

        const currentRefreshId = ++this.refreshId;
        this.isLoading = true;

        try {
            const allDocuments: Document[] = (await this.datastore.find({})).documents ?? [];
            const projectDocument = allDocuments.find(document => document.resource.id === 'project')
                ?? await this.datastore.get('project');
            const documents = getKoreanFieldworkUserVisibleDocuments(allDocuments);

            const stats = isKoreanFieldworkProject(projectDocument, this.projectConfiguration)
                ? makeKoreanFieldworkTodayStats(allDocuments)
                : undefined;
            const workflowSteps = stats
                ? makeKoreanFieldworkWorkflowSteps(documents, projectDocument, stats)
                : [];
            const scopeSummary = stats
                ? makeKoreanFieldworkScopeSummary(documents, projectDocument, stats.openIssueCount)
                : undefined;
            const priorityTaskScopeDocument = this.getHierarchyScopeDocument();
            const priorityTasks = stats
                ? makeKoreanFieldworkPriorityTasks(
                    documents,
                    projectDocument,
                    this.projectConfiguration,
                    5,
                    priorityTaskScopeDocument
                )
                : [];
            const investigationMode = getKoreanFieldworkProjectResourceValue(
                projectDocument,
                KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD
            );
            const progressItems = stats
                ? makeKoreanFieldworkProgressItems(documents, 6, investigationMode)
                : [];
            const overviewChartData = stats
                ? getKoreanFieldworkOverviewChartData(stats, documents, investigationMode)
                : undefined;
            const featureOverviewItems = stats
                ? makeKoreanFieldworkFeatureOverviewItems(
                    documents,
                    projectDocument,
                    this.projectConfiguration
                )
                : [];
            const unitMatrixItems = stats
                ? makeKoreanFieldworkUnitMatrixItems(
                    documents,
                    projectDocument,
                    this.projectConfiguration
                )
                : [];
            const workbenchItems = stats
                ? makeKoreanFieldworkWorkbenchItems(documents, 6, investigationMode)
                : [];
            const recordWorkFilterCounts = stats
                ? getKoreanFieldworkRecordWorkFilterCounts(
                    getKoreanFieldworkRecordWorkDocuments(documents),
                    documents,
                    stats.issueCountByDocumentId
                )
                : undefined;
            const documentsById = new Map(documents.map(document => [document.resource.id, document]));
            const workbenchActionsByDocumentId = stats
                ? makeWorkbenchActionsByDocumentId(workbenchItems, documentsById, documents, this.projectConfiguration)
                : new Map<string, KoreanFieldworkRecordActionItem[]>();
            const closeoutSummary = stats
                ? makeKoreanFieldworkCloseoutSummary(documents)
                : undefined;
            const closeoutBatchUpdates = stats
                ? makeCloseoutBatchUpdates(documents, documentsById, this.projectConfiguration)
                : [];
            const notebookDigest = stats
                ? makeKoreanFieldworkDailyNotebookDigest(documents)
                : undefined;
            const notebookDailyLogParentDocumentId = stats
                ? getNotebookDailyLogParentDocumentId(documents, this.projectConfiguration)
                : undefined;
            const reportHandoff = stats
                ? makeKoreanFieldworkReportHandoff(documents)
                : undefined;
            const reportHandoffTabletBundlesByDocumentId = stats && reportHandoff
                ? makeReportHandoffTabletBundles(reportHandoff.items, documentsById, documents)
                : new Map<string, KoreanFieldworkTabletRecordBundle>();

            if (currentRefreshId === this.refreshId) {
                this.stats = stats;
                this.workflowSteps = workflowSteps;
                this.scopeSummary = scopeSummary;
                this.priorityTasks = priorityTasks;
                this.overviewChartData = overviewChartData;
                this.progressItems = progressItems;
                this.featureOverviewItems = featureOverviewItems;
                this.unitMatrixItems = unitMatrixItems;
                this.workbenchItems = workbenchItems;
                this.recordWorkFilterCounts = recordWorkFilterCounts;
                this.workbenchActionsByDocumentId = workbenchActionsByDocumentId;
                this.closeoutSummary = closeoutSummary;
                this.closeoutBatchUpdates = closeoutBatchUpdates;
                this.notebookDigest = notebookDigest;
                this.notebookDailyLogParentDocumentId = notebookDailyLogParentDocumentId;
                this.reportHandoffItems = reportHandoff?.items ?? [];
                this.reportHandoffTabletBundlesByDocumentId = reportHandoffTabletBundlesByDocumentId;
                this.reportHandoffCopyAllText = reportHandoff?.copyAllText ?? '';
                this.reportHandoffCopyAllBodyText = reportHandoff?.copyAllBodyText ?? '';
                this.ensureReportHandoffPreviewSelection();
                this.projectDocuments = documents;
                this.keepActivePanelAvailable();
            }
        } catch (_) {
            if (currentRefreshId === this.refreshId) {
                this.stats = undefined;
                this.workflowSteps = [];
                this.scopeSummary = undefined;
                this.priorityTasks = [];
                this.overviewChartData = undefined;
                this.progressItems = [];
                this.featureOverviewItems = [];
                this.unitMatrixItems = [];
                this.workbenchItems = [];
                this.recordWorkFilterCounts = undefined;
                this.workbenchActionsByDocumentId = new Map();
                this.closeoutSummary = undefined;
                this.closeoutBatchUpdates = [];
                this.notebookDigest = undefined;
                this.notebookDailyLogParentDocumentId = undefined;
                this.reportHandoffItems = [];
                this.reportHandoffTabletBundlesByDocumentId = new Map();
                this.reportHandoffCopyAllText = '';
                this.reportHandoffCopyAllBodyText = '';
                this.selectedReportHandoffDocumentId = undefined;
                this.reportHandoffShowsAll = false;
                this.reportHandoffShowsTabletWorkOnly = false;
                this.projectDocuments = [];
                this.activePanel = 'workflow';
            }
        } finally {
            if (currentRefreshId === this.refreshId) this.isLoading = false;
        }
    }


    private async runWorkflowAction(action: KoreanFieldworkWorkflowAction) {

        switch (action.type) {
            case 'openProjectInfo':
                await this.menuModalLauncher.openInformationModal();
                await this.refresh();
                return;
            case 'openMap':
                await this.viewFacade.deselect();
                this.viewFacade.setMode('map');
                return;
            case 'openImport':
                await this.router.navigate(['import']);
                return;
            case 'openDocument':
                await this.openDocument(action.documentId);
                return;
        }
    }


    private async runPriorityTaskAction(action: KoreanFieldworkPriorityTaskAction) {

        switch (action.type) {
            case 'openProjectInfo':
                await this.menuModalLauncher.openInformationModal();
                await this.refresh();
                return;
            case 'openMap':
                await this.viewFacade.deselect();
                this.viewFacade.setMode('map');
                return;
            case 'openImport':
                await this.router.navigate(['import']);
                return;
            case 'openDocument':
                await this.openDocument(action.documentId);
                return;
            case 'createDocument':
                if (await this.requestDocumentDraft(action.parentDocumentId, action.categoryName)) {
                    await this.refresh();
                }
                return;
        }
    }


    private async requestDocumentDraft(parentDocumentId: string, categoryName: string): Promise<boolean> {

        if (categoryName === FEATURE_CATEGORY_NAME) {
            this.pendingFeatureDraft = {
                identifier: '',
                parentDocumentId,
                parentLabel: this.getDocumentLabel(parentDocumentId)
            };
            this.activePanel = 'records';
            return false;
        }

        await this.createDocumentDraft(parentDocumentId, categoryName);
        return true;
    }


    private async createDocumentDraft(parentDocumentId: string,
                                      categoryName: string,
                                      featureType?: string,
                                      options: KoreanFieldworkCreateDocumentDraftOptions = {}) {

        const parentDocument = await this.datastore.get(parentDocumentId);
        const draftResource = createKoreanFieldworkDraftResource(
            parentDocument,
            categoryName,
            this.projectConfiguration,
            {
                boundarySummary: this.getProjectBoundarySummaryDraftValue(categoryName),
                existingDocuments: this.projectDocuments,
                featureType,
                identifier: options.identifier,
                recordMemoContinuation: options.recordMemoContinuation,
                recordMemoTemplate: options.recordMemoTemplate
            }
        );
        const draftDocument = { resource: draftResource } as FieldDocument;

        if (this.doceditLauncher) {
            await this.doceditLauncher.editDocument(draftDocument);
        } else {
            await this.openDocument(parentDocument.resource.id);
        }
    }


    private getDocumentLabel(documentId: string): string {

        const document = this.projectDocuments.find(candidate =>
            candidate.resource.id === documentId
        );

        return document?.resource.identifier
            || document?.resource.id
            || '선택 기록';
    }


    private getPendingFeatureIdentifierForPreset(preset: KoreanFieldworkFeatureGuidancePreset): string {

        const typedIdentifier = this.pendingFeatureDraft?.identifier?.trim();

        return typedIdentifier
            || createNextFeatureIdentifier(preset.featureType, this.projectDocuments);
    }


    private getProjectBoundarySummaryDraftValue(categoryName: string): string|undefined {

        if (categoryName !== 'SurveyBoundary') return undefined;

        const projectDocument = this.projectDocuments.find(candidate =>
            candidate.resource.category === 'Project'
        );

        return getKoreanFieldworkProjectResourceValue(
            projectDocument,
            KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD
        );
    }


    private async openDocument(documentId: string) {

        await this.routing.jumpToResource(await this.datastore.get(documentId));
    }


    private collectReportHandoffTabletBundleReviewUpdates(
            item: KoreanFieldworkReportHandoffItem,
            bundle: KoreanFieldworkTabletRecordBundle,
            reviewed: boolean,
            reviewedAt: string,
            updatedDocumentsById: Map<string, Document>
    ) {

        const document = this.getProjectDocumentForStagedUpdate(item.documentId, updatedDocumentsById);
        if (!document) return;

        this.stageProjectDocumentUpdate(
            createKoreanFieldworkTabletHandoffReviewUpdate(document, bundle, reviewed, reviewedAt),
            updatedDocumentsById
        );

        bundle.groups
            .flatMap(group => group.sources)
            .forEach(source => this.collectReportHandoffTabletSourceReviewUpdate(
                source,
                reviewed,
                reviewedAt,
                updatedDocumentsById
            ));
    }


    private collectReportHandoffTabletSourceReviewUpdate(
            source: KoreanFieldworkTabletRecordBundleSource,
            reviewed: boolean,
            reviewedAt: string,
            updatedDocumentsById: Map<string, Document>
    ) {

        if (!source.documentId) return;

        const document = this.getProjectDocumentForStagedUpdate(source.documentId, updatedDocumentsById);
        if (!document) return;

        this.stageProjectDocumentUpdate(
            createKoreanFieldworkTabletHandoffSourceReviewUpdate(document, source, reviewed, reviewedAt),
            updatedDocumentsById
        );
    }


    private getProjectDocumentForStagedUpdate(
            documentId: string,
            updatedDocumentsById: Map<string, Document>
    ): Document|undefined {

        return updatedDocumentsById.get(documentId)
            ?? this.projectDocuments.find(candidate => candidate.resource.id === documentId);
    }


    private stageProjectDocumentUpdate(
            document: Document,
            updatedDocumentsById: Map<string, Document>
    ) {

        updatedDocumentsById.set(document.resource.id, document);
    }


    private applyProjectDocumentUpdates(updatedDocumentsById: Map<string, Document>) {

        this.projectDocuments = this.projectDocuments.map(candidate =>
            updatedDocumentsById.get(candidate.resource.id) ?? candidate
        );
    }


    private markReportHandoffCopied(documentId: string) {

        this.reportCopiedDocumentId = documentId;
        setTimeout(() => {
            if (this.reportCopiedDocumentId === documentId) {
                this.reportCopiedDocumentId = undefined;
            }
        }, 1600);
    }

    private markNotebookEntryCopied(entryId: string) {

        this.notebookCopiedEntryId = entryId;
        setTimeout(() => {
            if (this.notebookCopiedEntryId === entryId) {
                this.notebookCopiedEntryId = undefined;
            }
        }, 1600);
    }

    private getReportHandoffSectionCopyId(
            item: KoreanFieldworkReportHandoffItem,
            section: KoreanFieldworkReportHandoffCopySection
    ): string {

        return `${item.documentId}::${section.id}`;
    }

    private getReportHandoffTabletBundleCopyId(item: KoreanFieldworkReportHandoffItem): string {

        return `${item.documentId}::tabletBundle`;
    }

    private getReportHandoffTabletBundleGroupCopyId(
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup
    ): string {

        return `${this.getReportHandoffTabletBundleCopyId(item)}::${group.id}`;
    }

    private getReportHandoffTabletBundleSourceCopyId(
            item: KoreanFieldworkReportHandoffItem,
            group: KoreanFieldworkTabletRecordBundleGroup,
            source: KoreanFieldworkTabletRecordBundleSource
    ): string {

        return `${this.getReportHandoffTabletBundleGroupCopyId(item, group)}::${source.id}`;
    }

    private getReportHandoffBodySection(
            item: KoreanFieldworkReportHandoffItem
    ): KoreanFieldworkReportHandoffCopySection|undefined {

        return item.copySections.find(section => section.id === 'body');
    }


    private ensureReportHandoffPreviewSelection() {

        const visibleItems = this.getFilteredReportHandoffItems();

        if (visibleItems.length === 0) {
            this.selectedReportHandoffDocumentId = undefined;
            this.reportHandoffShowsAll = false;
            return;
        }

        if (!this.hasReportHandoffOverflow()) this.reportHandoffShowsAll = false;

        if (!this.selectedReportHandoffDocumentId
                || !visibleItems.some(item => item.documentId === this.selectedReportHandoffDocumentId)) {
            this.selectedReportHandoffDocumentId = visibleItems[0].documentId;
        }
    }


    private isPanelAvailable(panelId: KoreanFieldworkPriorityPanelId): boolean {

        switch (panelId) {
            case 'overview':
                return this.hasOverviewChartData();
            case 'workflow':
                return this.workflowSteps.length > 0;
            case 'today':
                return this.hasPriorityIssues() || this.hasScopeSummary() || this.hasPriorityTasks();
            case 'records':
                return this.hasSelectedRecordWorkbench()
                    || this.hasHierarchyLanes()
                    || this.hasProgressItems()
                    || this.hasUnitMatrixItems()
                    || this.hasWorkbenchItems();
            case 'notebook':
                return this.hasNotebookPanel();
            case 'report':
                return this.hasReportHandoffItems();
            case 'closeout':
                return this.hasCloseoutSummary();
        }
    }


    private keepActivePanelAvailable() {

        if (this.isPanelAvailable(this.activePanel)) return;

        this.activePanel = this.getPanelOptions()[0]?.id ?? 'workflow';
    }

    private getTodayDailyLogQuickAction(): KoreanFieldworkTodayQuickAction {

        const canRun = this.canRunNotebookDailyLogAction();

        return {
            id: 'dailyLog',
            icon: 'mdi-notebook-edit-outline',
            label: '오늘 일지',
            detail: canRun
                ? this.getNotebookDailyLogActionLabel()
                : '조사 경계가 생기면 일지를 만들 수 있습니다.',
            tone: canRun ? 'info' : 'neutral',
            target: canRun ? { type: 'dailyLog' } : undefined,
            disabled: !canRun
        };
    }


    private getTodayRecordQuickAction(): KoreanFieldworkTodayQuickAction {

        const featureCandidate = this.getFirstFeatureCandidateDocument();
        if (featureCandidate) {
            return {
                id: 'record',
                icon: 'mdi-map-marker-check-outline',
                label: '유구 확인',
                detail: `${this.getDocumentLabel(featureCandidate.resource.id)} 열기`,
                tone: 'info',
                target: {
                    type: 'priorityTask',
                    action: {
                        type: 'openDocument',
                        documentId: featureCandidate.resource.id
                    }
                }
            };
        }

        const task = this.getNextRecordPriorityTask();
        if (task) {
            return {
                id: 'record',
                icon: task.icon,
                label: task.actionLabel,
                detail: task.title,
                tone: task.tone,
                target: {
                    type: 'priorityTask',
                    action: task.action
                }
            };
        }

        return {
            id: 'record',
            icon: 'mdi-map-marker-plus-outline',
            label: '다음 기록',
            detail: '지금 바로 이어 만들 기록은 없습니다.',
            tone: 'neutral',
            disabled: true
        };
    }


    private getTodayCloseoutQuickAction(): KoreanFieldworkTodayQuickAction {

        const issueCount = this.getCloseoutIssues().length;
        const status = this.closeoutSummary?.status;

        return {
            id: 'closeout',
            icon: issueCount > 0 ? 'mdi-clipboard-alert-outline' : 'mdi-check-decagram-outline',
            label: '마감 점검',
            detail: this.closeoutSummary
                ? `${this.closeoutSummary.title} · ${issueCount}건`
                : '마감 상태를 계산할 수 없습니다.',
            tone: status === 'blocked'
                ? 'danger'
                : status === 'needsReview'
                    ? 'warning'
                    : status === 'clear'
                        ? 'success'
                        : 'neutral',
            target: this.closeoutSummary ? { type: 'openPanel', panelId: 'closeout' } : undefined,
            disabled: !this.closeoutSummary
        };
    }


    private getFirstFeatureCandidateDocument = () =>
        this.projectDocuments.find(document =>
            document.resource.category === FEATURE_CATEGORY_NAME
            && document.resource.featureRecordingStatus === 'candidate'
        );


    private getNextRecordPriorityTask(): KoreanFieldworkPriorityTask|undefined {

        const preferredTaskIds = [
            'create-survey-boundary',
            'create-detected-feature',
            'create-trench',
            'create-trench-pit',
            'create-excavation-section',
            'create-trench-profile-photo',
            'create-pit-profile-photo',
            'create-excavation-profile-photo',
            'create-excavation-drawing',
            'create-trench-photo'
        ];

        return preferredTaskIds
            .map(taskId => this.priorityTasks.find(task => task.id === taskId))
            .find((task): task is KoreanFieldworkPriorityTask => !!task)
            ?? this.priorityTasks.find(task =>
                task.action.type === 'createDocument'
                && task.id !== 'create-daily-log'
            );
    }


    private getWorkflowStepAttentionCount(): number {

        const openSteps = this.workflowSteps
            .filter(step => step.status === 'current' || step.status === 'attention' || step.status === 'todo')
            .length;

        return openSteps > 0 ? openSteps : this.workflowSteps.length;
    }


    private getOverviewPanelCount = () =>
        this.overviewChartData?.totalDocumentCount ?? 0;


    private getTodayPanelCount = () =>
        this.getPriorityIssues().length
        + this.priorityTasks.length
        + (this.scopeSummary ? 1 : 0);


    private getRecordsPanelCount = () =>
        this.progressItems.length
        + this.featureOverviewItems.length
        + this.unitMatrixItems.length
        + this.workbenchItems.length
        + this.getHierarchyLanes().reduce((count, lane) => count + lane.totalCount, 0)
        + (this.hasSelectedRecordWorkbench()
            ? Math.max(1, this.getSelectedRecordWorkbenchActions().length)
            : 0);


    private getNotebookPanelCount = () =>
        (this.notebookDigest?.nextWorkEntries.length ?? 0)
        + (this.notebookDigest?.evidenceMissingEntries.length ?? 0)
        + (this.notebookDigest?.dailyJournalSummaries.length ?? 0)
        + this.getNotebookRecentEntries().length
        + this.getNotebookSelectedRecordEntries().length
        + (this.canRunNotebookDailyLogAction() ? 1 : 0)
        + (this.canRunNotebookRecordMemoAction() ? 1 : 0);


    private getReportPanelCount = () =>
        this.reportHandoffItems.length;


    private getFilteredReportHandoffItems(): KoreanFieldworkReportHandoffItem[] {

        return this.reportHandoffShowsTabletWorkOnly
            ? this.getTabletWorkReportHandoffItems()
            : this.reportHandoffItems;
    }


    private getTabletWorkReportHandoffItems(): KoreanFieldworkReportHandoffItem[] {

        return this.reportHandoffItems.filter(item => this.needsTabletReportHandoffProcessing(item));
    }


    private needsTabletReportHandoffProcessing(item: KoreanFieldworkReportHandoffItem): boolean {

        const bundle = this.getReportHandoffTabletBundle(item);

        return !!bundle && !bundle.reviewState.isReviewed;
    }


    private makeTabletWorkReportHandoffCopyBlock(
            item: KoreanFieldworkReportHandoffItem,
            bundle: KoreanFieldworkTabletRecordBundle,
            seenSourceKeys?: Set<string>,
            seenIssueDetails?: Set<string>
    ): string {

        const bodySection = this.getReportHandoffBodySection(item);
        const bodyText = bodySection?.copyText ?? item.bodyPreview;
        const issueDetails = this.filterTabletWorkReportHandoffIssueDetails(
            this.getTabletWorkReportHandoffIssueDetails(item, bundle),
            seenIssueDetails
        );
        const lines = [
            `[\ud0dc\ube14\ub9bf \ucc98\ub9ac] ${item.title}`,
            bundle.summary,
            `\ub370\uc2a4\ud06c\ud1b1 \ucc98\ub9ac: ${bundle.reviewState.label}`,
            `\ucc98\ub9ac \uc0c1\uc138: ${bundle.reviewState.detail}`,
            bodyText ? 'HWP \ubcf8\ubb38' : '',
            bodyText,
            '',
            '\ud0dc\ube14\ub9bf \uc790\ub8cc',
            ...this.makeTabletWorkReportHandoffSourceLines(bundle, seenSourceKeys),
            '',
            issueDetails.length > 0
                ? `\ud655\uc778 \ud544\uc694 ${issueDetails.length}\uac74`
                : '\ud655\uc778 \ud544\uc694 \uc5c6\uc74c',
            ...issueDetails.map(issueDetail => `- ${issueDetail}`)
        ];

        return normalizeKoreanFieldworkHwpPlainText(lines.filter(line => line.length > 0).join('\n'));
    }


    private makeTabletWorkReportHandoffSourceLines(
            bundle: KoreanFieldworkTabletRecordBundle,
            seenSourceKeys?: Set<string>
    ): string[] {

        const lines = bundle.groups.flatMap(group => {
            const sources = this.getReportHandoffTabletBundleGroupSources(group)
                .filter(source => this.keepFirstTabletWorkReportHandoffSource(source, seenSourceKeys));

            if (sources.length === 0) return [];

            return [
                this.makeTabletWorkReportHandoffSourceGroupLine(group, sources),
                ...sources.flatMap(source => [
                    `  - ${source.label}`,
                    ...(source.detail ? [`    ${source.detail}`] : []),
                    ...source.issueDetails.map(issueDetail => `    \ud655\uc778: ${issueDetail}`)
                ])
            ];
        });

        return lines.length > 0
            ? lines
            : ['- \uc774\ubbf8 \uc55e\uc5d0\uc11c \uc815\ub9ac\ud55c \ud0dc\ube14\ub9bf \uc6d0\uc790\ub8cc\ub9cc \uc788\uc74c'];
    }


    private keepFirstTabletWorkReportHandoffSource(
            source: KoreanFieldworkTabletRecordBundleSource,
            seenSourceKeys?: Set<string>
    ): boolean {

        if (!seenSourceKeys) return true;

        const sourceKey = this.getTabletWorkReportHandoffSourceKey(source);
        if (seenSourceKeys.has(sourceKey)) return false;

        seenSourceKeys.add(sourceKey);
        return true;
    }


    private getTabletWorkReportHandoffSourceKey(source: KoreanFieldworkTabletRecordBundleSource): string {

        return source.documentId ?? source.id;
    }


    private makeTabletWorkReportHandoffSourceGroupLine(
            group: KoreanFieldworkTabletRecordBundleGroup,
            sources: KoreanFieldworkTabletRecordBundleSource[]
    ): string {

        const issueCount = sources.reduce((sum, source) => sum + source.issueCount, 0);
        const duplicateLabel = sources.length < group.count ? ' (\uc911\ubcf5 \uc81c\uc678)' : '';
        const visibleLabels = sources.map(source => source.label).slice(0, 3);
        const hiddenCount = sources.length - visibleLabels.length;
        const previewLabel = hiddenCount > 0
            ? `${visibleLabels.join(', ')} \uc678 ${hiddenCount}\uac74`
            : visibleLabels.join(', ');

        return `- ${group.label} ${sources.length}\uac74${duplicateLabel}: ${previewLabel}`
            + (issueCount > 0 ? ` \u00b7 \ud655\uc778 ${issueCount}\uac74` : '');
    }


    private filterTabletWorkReportHandoffIssueDetails(
            issueDetails: string[],
            seenIssueDetails?: Set<string>
    ): string[] {

        if (!seenIssueDetails) return issueDetails;

        return issueDetails.filter(issueDetail => {
            const key = issueDetail.trim();
            if (key.length === 0 || seenIssueDetails.has(key)) return false;

            seenIssueDetails.add(key);
            return true;
        });
    }


    private getTabletWorkReportHandoffIssueDetails(
            item: KoreanFieldworkReportHandoffItem,
            bundle: KoreanFieldworkTabletRecordBundle
    ): string[] {

        const sources = bundle.groups.flatMap(group => group.sources);
        const issueTokens = [
            item.documentId,
            item.identifier,
            item.title,
            bundle.documentId,
            ...sources.flatMap(source => [source.id, source.documentId ?? '', source.label])
        ].filter((token, index, tokens) =>
            token.length > 0 && tokens.indexOf(token) === index
        );
        const sourceIssueDetails = bundle.groups
            .flatMap(group => group.sources)
            .flatMap(source => source.issueDetails);

        return item.issueDetails
            .concat(sourceIssueDetails)
            .filter((issueDetail, index, issueDetails) =>
                issueDetail.length > 0 && issueDetails.indexOf(issueDetail) === index
            )
            .filter(issueDetail => issueTokens.some(token => issueDetail.includes(token)));
    }


    private getCloseoutPanelCount = () =>
        this.getCloseoutIssues().length + this.closeoutBatchUpdates.length;


    private matchesActiveRecordWorkFilter(documentId: string): boolean {

        if (this.activeRecordWorkFilterId === 'all') return true;

        const document = this.projectDocuments.find(candidate => candidate.resource.id === documentId);
        if (!document || !this.stats) return false;

        return matchesKoreanFieldworkRecordWorkFilter(
            document,
            this.activeRecordWorkFilterId,
            this.projectDocuments,
            this.stats.issueCountByDocumentId
        );
    }


    private getNotebookRecordMemoParentDocument(): Document|undefined {

        const selectedDocument = this.getNotebookSelectedRecordDocument();

        return this.canCreateNotebookRecordMemo(selectedDocument)
            ? selectedDocument
            : undefined;
    }


    private canCreateNotebookRecordMemo(parentDocument: Document|undefined): boolean {

        const penMemoCategory = getCategory(NOTEBOOK_RECORD_MEMO_CATEGORY, this.projectConfiguration);
        if (!parentDocument || !penMemoCategory) return false;

        return canCreateKoreanFieldworkChildRecord(
            penMemoCategory,
            parentDocument,
            this.projectConfiguration
        ) || NOTEBOOK_RECORD_MEMO_TARGET_CATEGORIES.has(parentDocument.resource.category);
    }


    private getNotebookContinuationParentDocument(
            entry: KoreanFieldworkNotebookEntry|undefined
    ): Document|undefined {

        return entry?.targetDocument ?? entry?.sourceDocument;
    }


    private getNotebookSelectedRecordDocument(): Document|undefined {

        const selectedDocument = this.viewFacade.getSelectedDocument?.();
        if (!selectedDocument?.resource?.category) return undefined;

        const currentDocument = this.projectDocuments.find(document =>
            document.resource.id === selectedDocument.resource.id
        ) ?? selectedDocument;

        return NOTEBOOK_RECORD_MEMO_TARGET_CATEGORIES.has(currentDocument.resource.category)
            ? currentDocument
            : undefined;
    }


    private getSelectedRecordWorkbenchDocument(): Document|undefined {

        return this.getNotebookSelectedRecordDocument();
    }


    private getHierarchyScopeDocument(): Document|undefined {

        const selectedDocument = this.getNotebookSelectedRecordDocument();

        return isKoreanFieldworkHierarchyScopeDocument(selectedDocument)
            ? selectedDocument
            : undefined;
    }


    private getDocumentById(documentId: string): Document|undefined {

        return this.projectDocuments.find(document => document.resource.id === documentId);
    }


}


function makeWorkbenchActionsByDocumentId(workbenchItems: KoreanFieldworkWorkbenchItem[],
                                          documentsById: Map<string, Document>,
                                          documents: Document[],
                                          projectConfiguration: ProjectConfiguration)
        : Map<string, KoreanFieldworkRecordActionItem[]> {

    const actionsByDocumentId = new Map<string, KoreanFieldworkRecordActionItem[]>();

    workbenchItems.forEach(item => {
        const document = documentsById.get(item.documentId);
        if (!document) return;

        const actions = makeKoreanFieldworkRecordActions(
            document,
            documents,
            projectConfiguration,
            2
        );
        if (actions.length > 0) actionsByDocumentId.set(item.documentId, actions);
    });

    return actionsByDocumentId;
}


function makeReportHandoffTabletBundles(items: KoreanFieldworkReportHandoffItem[],
                                        documentsById: Map<string, Document>,
                                        documents: Document[])
        : Map<string, KoreanFieldworkTabletRecordBundle> {

    const bundlesByDocumentId = new Map<string, KoreanFieldworkTabletRecordBundle>();

    items.forEach(item => {
        const document = documentsById.get(item.documentId);
        const bundle = document
            ? makeKoreanFieldworkRecordTabletBundle(document, documents, item)
            : undefined;

        if (bundle) bundlesByDocumentId.set(item.documentId, bundle);
    });

    return bundlesByDocumentId;
}


function makeCloseoutBatchUpdates(documents: Document[],
                                  documentsById: Map<string, Document>,
                                  projectConfiguration: ProjectConfiguration)
        : KoreanFieldworkCloseoutBatchUpdate[] {

    const allCloseoutIssues = makeKoreanFieldworkCloseoutSummary(
        documents,
        Number.MAX_SAFE_INTEGER
    ).issues;
    const issueActions = getKoreanFieldworkCloseoutIssueActions(
        allCloseoutIssues,
        documentsById,
        document => getKoreanFieldworkContinuationActions(document, projectConfiguration)
            .map(action => action.categoryName)
    );

    return getKoreanFieldworkCloseoutBatchUpdates(issueActions);
}


function getNotebookDailyLogParentDocumentId(documents: Document[],
                                             projectConfiguration: ProjectConfiguration): string|undefined {

    const dailyLogCategory = getCategory('DailyLog', projectConfiguration);
    if (!dailyLogCategory) return undefined;

    return documents.find(document =>
        document.resource.category === 'Operation'
        && canCreateKoreanFieldworkChildRecord(dailyLogCategory, document, projectConfiguration)
    )?.resource.id;
}


function getCategory(categoryName: string, projectConfiguration: ProjectConfiguration) {

    try {
        return projectConfiguration.getCategory(categoryName);
    } catch (_) {
        return undefined;
    }
}


function normalizeIdentifierInput(value: unknown): string {

    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}
