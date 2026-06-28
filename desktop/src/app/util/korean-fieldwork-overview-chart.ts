import { Document } from 'idai-field-core';
import { KoreanFieldworkTodayStats } from './korean-fieldwork-today-stats';
import {
    getKoreanFieldworkChecklistMetrics
} from './korean-fieldwork-checklist';


export type KoreanFieldworkOverviewTone = 'neutral'|'info'|'success'|'warning'|'danger';

export interface KoreanFieldworkOverviewMetric {
    id: string;
    label: string;
    value: number|string;
    detail: string;
    tone: KoreanFieldworkOverviewTone;
}

export interface KoreanFieldworkOverviewSegment {
    id: string;
    label: string;
    count: number;
    percent: number;
    tone: KoreanFieldworkOverviewTone;
}

export interface KoreanFieldworkOverviewChartData {
    totalDocumentCount: number;
    investigationUnitCount: number;
    surveyBoundaryCount: number;
    surveyCount: number;
    operationCount: number;
    trenchCount: number;
    featureGroupCount: number;
    featureCount: number;
    featureSegmentCount: number;
    featureWorkflowCount: number;
    checklistDone: number;
    checklistTotal: number;
    checklistPercent: number;
    openIssueCount: number;
    criticalIssueCount: number;
    metrics: KoreanFieldworkOverviewMetric[];
    investigationSegments: KoreanFieldworkOverviewSegment[];
    featureStatusSegments: KoreanFieldworkOverviewSegment[];
}

const C = {
    FEATURE: 'Feature',
    FEATURE_GROUP: 'FeatureGroup',
    FEATURE_SEGMENT: 'FeatureSegment',
    OPERATION: 'Operation',
    SURVEY: 'Survey',
    SURVEY_BOUNDARY: 'SurveyBoundary',
    TRENCH: 'Trench'
} as const;

const INVESTIGATION_UNIT_CATEGORIES = new Set<string>([
    C.SURVEY,
    C.SURVEY_BOUNDARY,
    C.OPERATION,
    C.TRENCH,
    C.FEATURE_GROUP,
    C.FEATURE,
    C.FEATURE_SEGMENT
]);

const FEATURE_WORKFLOW_CATEGORIES = new Set<string>([
    C.FEATURE,
    C.FEATURE_SEGMENT
]);

export function getKoreanFieldworkOverviewChartData(
        stats: KoreanFieldworkTodayStats,
        documents: Document[],
        investigationMode?: string
): KoreanFieldworkOverviewChartData {

    const categoryCounts = getCategoryCounts(documents);
    const surveyCount = categoryCounts.get(C.SURVEY) ?? 0;
    const surveyBoundaryCount = categoryCounts.get(C.SURVEY_BOUNDARY) ?? 0;
    const operationCount = categoryCounts.get(C.OPERATION) ?? 0;
    const trenchCount = categoryCounts.get(C.TRENCH) ?? 0;
    const featureGroupCount = categoryCounts.get(C.FEATURE_GROUP) ?? 0;
    const featureCount = categoryCounts.get(C.FEATURE) ?? 0;
    const featureSegmentCount = categoryCounts.get(C.FEATURE_SEGMENT) ?? 0;
    const investigationUnitCount = documents.filter(document =>
        INVESTIGATION_UNIT_CATEGORIES.has(document.resource.category)
    ).length;
    const featureWorkflowDocuments = documents.filter(document =>
        FEATURE_WORKFLOW_CATEGORIES.has(document.resource.category)
    );
    const checklistStats = getKoreanFieldworkChecklistMetrics(documents, investigationMode);
    const checklistPercent = checklistStats.total > 0
        ? Math.round((checklistStats.done / checklistStats.total) * 100)
        : 0;

    return {
        totalDocumentCount: documents.length,
        investigationUnitCount,
        surveyBoundaryCount,
        surveyCount,
        operationCount,
        trenchCount,
        featureGroupCount,
        featureCount,
        featureSegmentCount,
        featureWorkflowCount: featureWorkflowDocuments.length,
        checklistDone: checklistStats.done,
        checklistTotal: checklistStats.total,
        checklistPercent,
        openIssueCount: stats.openIssueCount,
        criticalIssueCount: stats.criticalIssueCount,
        metrics: [
            {
                id: 'investigation',
                label: '조사',
                value: operationCount,
                detail: `경계 ${surveyBoundaryCount} · 트렌치 ${trenchCount}`,
                tone: operationCount > 0 ? 'info' : 'neutral'
            },
            {
                id: 'feature',
                label: '유구',
                value: featureCount,
                detail: `유구군 ${featureGroupCount} · 피트 ${featureSegmentCount}`,
                tone: featureCount > 0 ? 'success' : 'neutral'
            },
            {
                id: 'process',
                label: '진행',
                value: checklistStats.total > 0 ? `${checklistPercent}%` : '0%',
                detail: checklistStats.total > 0
                    ? `과정 ${checklistStats.done}/${checklistStats.total}`
                    : '과정 기록 없음',
                tone: getChecklistTone(checklistPercent, checklistStats.total)
            },
            {
                id: 'review',
                label: '확인 필요',
                value: stats.openIssueCount,
                detail: stats.criticalIssueCount > 0
                    ? `필수 ${stats.criticalIssueCount}건`
                    : '마감 전 점검',
                tone: stats.criticalIssueCount > 0
                    ? 'danger'
                    : stats.openIssueCount > 0 ? 'warning' : 'success'
            }
        ],
        investigationSegments: [
            createSegment(
                'surveyBoundary',
                '경계',
                surveyCount + surveyBoundaryCount,
                investigationUnitCount,
                'info'
            ),
            createSegment('operation', '조사', operationCount, investigationUnitCount, 'success'),
            createSegment('trench', '트렌치', trenchCount, investigationUnitCount, 'info'),
            createSegment('featureGroup', '유구군', featureGroupCount, investigationUnitCount, 'neutral'),
            createSegment('feature', '유구', featureCount, investigationUnitCount, 'warning'),
            createSegment('featureSegment', '피트', featureSegmentCount, investigationUnitCount, 'neutral')
        ],
        featureStatusSegments: buildFeatureStatusSegments(featureWorkflowDocuments)
    };
}


function getCategoryCounts(documents: Document[]): Map<string, number> {

    return documents.reduce((counts, document) => {
        counts.set(
            document.resource.category,
            (counts.get(document.resource.category) ?? 0) + 1
        );
        return counts;
    }, new Map<string, number>());
}


function buildFeatureStatusSegments(documents: Document[]): KoreanFieldworkOverviewSegment[] {

    const total = documents.length;
    const counts = documents.reduce((index, document) => {
        const status = getFeatureRecordingStatus(document);
        index[status] = (index[status] ?? 0) + 1;
        return index;
    }, {} as Record<string, number>);

    return [
        createSegment('candidate', '조사 전', counts.candidate ?? 0, total, 'warning'),
        createSegment('investigating', '조사 중', counts.investigating ?? 0, total, 'info'),
        createSegment('confirmed', '완료', counts.confirmed ?? 0, total, 'success'),
        createSegment('unclassified', '상태 없음', counts.unclassified ?? 0, total, 'neutral')
    ];
}


function getFeatureRecordingStatus(
        document: Document
): 'candidate'|'investigating'|'confirmed'|'unclassified' {

    const status = getResource(document).featureRecordingStatus;

    return status === 'candidate'
        || status === 'investigating'
        || status === 'confirmed'
            ? status
            : 'unclassified';
}


function createSegment(
        id: string,
        label: string,
        count: number,
        total: number,
        tone: KoreanFieldworkOverviewTone
): KoreanFieldworkOverviewSegment {

    return {
        id,
        label,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        tone
    };
}


function getChecklistTone(percent: number, total: number): KoreanFieldworkOverviewTone {

    if (total === 0) return 'neutral';
    if (percent >= 100) return 'success';
    if (percent >= 50) return 'info';
    return 'warning';
}


function getResource(document: Document): Record<string, unknown> {

    return document.resource as unknown as Record<string, unknown>;
}
