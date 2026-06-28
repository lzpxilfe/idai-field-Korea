import { Document } from 'idai-field-core';
import { getKoreanFieldworkOverviewChartData } from '../../../src/app/util/korean-fieldwork-overview-chart';
import { KoreanFieldworkTodayStats } from '../../../src/app/util/korean-fieldwork-today-stats';


describe('korean-fieldwork-overview-chart', () => {

    it('summarizes desktop investigation units, feature status, process, and review issues', () => {

        const documents = [
            createDoc('boundary-1', 'SurveyBoundary', '경계 1'),
            createDoc('operation-1', 'Operation', '조사구역 1'),
            createDoc('trench-1', 'Trench', 'T1', {
                liesWithin: ['operation-1']
            }),
            createDoc('feature-group-1', 'FeatureGroup', '유구군 1', {
                liesWithin: ['trench-1']
            }),
            createDoc('feature-1', 'Feature', '수혈 1', {
                liesWithin: ['trench-1']
            }, {
                featureRecordingStatus: 'candidate',
                featureInvestigationChecklist: ['preInvestigationPhotoTaken']
            }),
            createDoc('feature-2', 'Feature', '수혈 2', {
                liesWithin: ['trench-1']
            }, {
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: [
                    'preInvestigationPhotoTaken',
                    'inProgressPhotoTaken'
                ]
            }),
            createDoc('segment-1', 'FeatureSegment', '피트 1', {
                liesWithin: ['feature-1']
            }, {
                featureRecordingStatus: 'investigating',
                featureInvestigationChecklist: ['inProgressPhotoTaken']
            }),
            createDoc('photo-1', 'Photo', '사진 1', {
                depicts: ['feature-1']
            })
        ];

        const data = getKoreanFieldworkOverviewChartData(
            createStats({ openIssueCount: 2, criticalIssueCount: 1 }),
            documents
        );

        expect(data.totalDocumentCount).toBe(8);
        expect(data.investigationUnitCount).toBe(7);
        expect(data.operationCount).toBe(1);
        expect(data.trenchCount).toBe(1);
        expect(data.featureCount).toBe(2);
        expect(data.featureSegmentCount).toBe(1);
        expect(data.checklistDone).toBe(4);
        expect(data.checklistTotal).toBe(27);
        expect(data.checklistPercent).toBe(15);
        expect(data.investigationSegments.find(segment =>
            segment.id === 'operation'
        )).toMatchObject({
            label: '조사',
            count: 1,
            percent: 14
        });
        expect(data.featureStatusSegments.map(segment => [
            segment.id,
            segment.count
        ])).toEqual([
            ['candidate', 1],
            ['investigating', 1],
            ['confirmed', 1],
            ['unclassified', 0]
        ]);
        expect(data.metrics.find(metric => metric.id === 'review')).toMatchObject({
            value: 2,
            detail: '필수 1건',
            tone: 'danger'
        });
    });


    it('counts tablet evidence documents and directly attached fieldwork photos', () => {

        const documents = [
            createDoc('feature-1', 'Feature', '수혈 1', {}, {
                fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg'
            }),
            createDoc('photo-1', 'Photo', '사진 1', {}, {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg'
            }),
            createDoc('drawing-1', 'Drawing', '도면 1'),
            createDoc('memo-1', 'PenMemo', '메모 1'),
            createDoc('find-1', 'Find', '유물 1', {}, {
                fieldworkPhotoUri: 'file:///tablet/photos/find-1.jpg'
            })
        ];

        const data = getKoreanFieldworkOverviewChartData(createStats(), documents);

        expect(data.evidenceCount).toBe(5);
        expect(data.photoEvidenceCount).toBe(2);
        expect(data.drawingCount).toBe(1);
        expect(data.penMemoCount).toBe(1);
        expect(data.findSampleCount).toBe(1);
        expect(data.metrics.find(metric => metric.id === 'evidence')).toMatchObject({
            label: '자료',
            value: 5,
            detail: '사진 2 · 도면/메모 2 · 유물/시료 1',
            tone: 'info'
        });
    });


    it('includes trench checklist progress for trial trench investigations', () => {

        const trench = createDoc('trench-1', 'Trench', 'T1', {}, {
            featureInvestigationChecklist: [
                'trenchSoilCleaned',
                'trenchPitOpened',
                'trenchOverviewPhotoTaken'
            ]
        });

        const data = getKoreanFieldworkOverviewChartData(
            createStats(),
            [trench],
            'trialTrench'
        );

        expect(data.checklistDone).toBe(3);
        expect(data.checklistTotal).toBe(9);
        expect(data.checklistPercent).toBe(33);
    });
});


const createDoc = (
        id: string,
        category: string,
        identifier: string,
        relations: Record<string, string[]> = {},
        extraResource: Record<string, unknown> = {}
): Document => ({
    resource: {
        id,
        identifier,
        category,
        relations,
        ...extraResource
    }
} as Document);


const createStats = (
        overrides: Partial<KoreanFieldworkTodayStats> = {}
): KoreanFieldworkTodayStats => ({
    criticalIssueCount: 0,
    dailyLogCount: 0,
    featureCandidateCount: 0,
    infoIssueCount: 0,
    issueCountByDocumentId: {},
    openIssueCount: 0,
    priorityIssues: [],
    statusLabel: '마감 예정',
    statusTone: 'success',
    surveyBoundaryCount: 0,
    warningIssueCount: 0,
    ...overrides
});
