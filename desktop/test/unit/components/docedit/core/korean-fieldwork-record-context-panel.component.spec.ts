jest.mock('src/app/electron/electron', () => ({
    electronRemote: undefined
}), { virtual: true });

import {
    KoreanFieldworkRecordContextPanelComponent
} from '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.component';
import { getPhotoAnnotationSummaryLabel } from '../../../../../src/app/util/korean-fieldwork-evidence-review';
import * as fs from 'fs';
import * as path from 'path';


describe('KoreanFieldworkRecordContextPanelComponent', () => {

    it('summarizes the current record context, parents, children, links, and status chips', async () => {

        const operation = createDocument('operation-1', 'Operation', 'OP1');
        const trench = createDocument('trench-1', 'Trench', 'TR1', {
            liesWithin: ['operation-1']
        });
        const feature = createDocument('feature-1', 'Feature', 'F1', {
            liesWithin: ['trench-1']
        }, {
            featureType: 'kiln',
            featureRecordingStatus: 'confirmed',
            potteryKilnPartInvestigation: ['combustionPartRecorded', 'firingPartRecorded'],
            verificationState: 'observedInField',
            longAxisOrientation: 'N-23°-E',
            orientationReference: '자북'
        });
        const segment = createDocument('segment-1', 'FeatureSegment', 'F1-pit', {
            liesWithin: ['feature-1']
        });
        const layer = createDocument('layer-1', 'Layer', 'L1', {
            isRecordedInFeature: ['feature-1']
        });
        const photo = createDocument('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilColorAssistStatus: 'candidatesAvailable',
            soilColorAssistCandidates: '1: 10YR 4/3 (높음, 차이 0.0)'
        });
        const memo = createDocument('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            date: getTodayLabel(),
            penMemoReviewedTranscript: [
                '[관찰 내용] 북쪽 경계에서 소토 확인.',
                '[다음 작업] 사진 보강 후 단면 정리.'
            ].join('\n')
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [operation, trench, feature, segment, layer, photo, soilProfilePhoto, memo]
            })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            field('verificationState'),
            field('longAxisOrientation'),
            checkboxesField('potteryKilnPartInvestigation')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getCategoryLabel()).toBe('유구');
        expect(component.getCurrentIdentifier()).toBe('F1');
        expect(component.parentPathLabel).toBe('OP1 > TR1');
        expect(component.metrics).toEqual([
            { id: 'children', label: '이어진 기록', count: 2 },
            { id: 'linkedEvidence', label: '연결', count: 3 }
        ]);
        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'featureSegments', label: '피트', count: 1, canCreate: false },
            { id: 'layers', label: '토색 메모', count: 1, canCreate: false },
            { id: 'photos', label: '사진', count: 1, canCreate: false },
            { id: 'soilProfilePhotos', label: '토층사진', count: 1, canCreate: false },
            { id: 'penMemos', label: '야장 메모', count: 1, canCreate: false }
        ]));
        expect(component.getEvidenceInsights()).toEqual([
            {
                id: 'soilColor:soil-photo-1',
                label: '토색 후보',
                detail: 'SP1 · 먼셀 후보 10YR 4/3',
                tone: 'info'
            }
        ]);
        expect(component.getStatusChips()).toEqual(expect.arrayContaining([
            { label: '장축 N-23°-E · 자북', tone: 'info' },
            { label: '완료', tone: 'success' },
            { label: '가마 핵심 연소부·소성부', tone: 'success' },
            { label: '현장 확인', tone: 'success' }
        ]));
        expect(component.hasNotebookEntries()).toBe(true);
        expect(component.getNotebookEntries()[0]).toMatchObject({
            sourceLabel: '메모',
            targetLabel: 'F1',
            nextWork: '사진 보강 후 단면 정리.'
        });
        expect(component.getNotebookEntryTone(component.getNotebookEntries()[0])).toBe('warning');
    });


    it('combines long- and short-axis orientation values in one status chip', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            longAxisOrientation: 'N-23\u00B0-E',
            shortAxisOrientation: 'N-67\u00B0-W',
            orientationReference: '\uC790\uBD81'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('longAxisOrientation'),
            field('shortAxisOrientation')
        ] as any;

        expect(component.getStatusChips()).toContainEqual({
            label: '\uC7A5\uCD95 N-23\u00B0-E / \uB2E8\uCD95 N-67\u00B0-W \u00B7 \uC790\uBD81',
            tone: 'info'
        });
    });


    it('counts directly attached tablet photos in record evidence metrics', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg',
            featureRecordingStatus: 'investigating'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'photos', count: 1, canCreate: false })
        ]));
    });


    it('shows tablet feature location sketches as desktop reference previews', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureLocationSketch: JSON.stringify({
                version: 1,
                shape: 'polygon',
                center: { x: 68, y: 52 },
                points: [
                    { x: 60, y: 42 },
                    { x: 80, y: 45 },
                    { x: 76, y: 62 },
                    { x: 58, y: 59 }
                ],
                rotation: 0,
                scale: 100
            }),
            featureRecordingStatus: 'investigating'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        expect(component.hasFeatureLocationSketchPreview()).toBe(true);

        const preview = component.getFeatureLocationSketchPreview()!;

        expect(preview.summary).toBe('점 연결 4점');
        expect(preview.location.boundaryPath).toBe('M 8 8 H 112 V 72 H 8 Z');
        expect(preview.location.path).toContain('Z');
        expect(preview.location.points.map(point => point.label)).toEqual(['1', '2', '3', '4']);
        expect(preview.shape.boundaryPath).toBeUndefined();
        expect(preview.shape.path).toMatch(/^M /);
        expect(preview.shape.path).toContain('Z');
    });


    it('keeps the desktop feature location preview framed as a flat placement map', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
            ),
            'utf8'
        );

        const styles = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss'
            ),
            'utf8'
        );

        expect(template).toContain('class="flat-map-surface"');
        expect(template).toContain('class="flat-map-grid"');
        expect(template).toContain('평면 배치 지도');
        expect(template).not.toContain('위성지도식 평면');
        expect(template).toContain('satellite-field');
        expect(template).toContain('satellite-road');
        expect(styles).toContain('.flat-map-surface');
        expect(styles).toContain('.satellite-field');
        expect(styles).toContain('.satellite-road');
        expect(styles).toContain('.flat-map-grid path');
        expect(styles).toContain('.flat-map-badge text');
    });


    it('keeps the desktop feature sketch reference visible before a sketch is drawn', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'candidate'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        expect(component.hasFeatureLocationSketchPreview()).toBe(true);

        const preview = component.getFeatureLocationSketchPreview()!;

        expect(preview.summary).toBe('스케치 필요');
        expect(preview.location.boundaryPath).toBe('M 8 8 H 112 V 72 H 8 Z');
        expect(preview.location.emptyLabel).toBe('위치 스케치 필요');
        expect(preview.shape.emptyLabel).toBe('형태 스케치 필요');
        expect(preview.shape.points).toEqual([]);
    });


    it('keeps rotated tablet oval sketches visible on desktop feature records', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureLocationSketch: JSON.stringify({
                version: 1,
                shape: 'oval',
                center: { x: 75, y: 50 },
                points: [{ x: 75, y: 50 }],
                rotation: 15,
                scale: 110
            }),
            featureRecordingStatus: 'investigating'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        const preview = component.getFeatureLocationSketchPreview()!;

        expect(preview.summary).toBe('타원 · 중심 75%, 50%');
        expect(preview.location.ellipse).toEqual(expect.objectContaining({
            cx: 86,
            cy: 40,
            transform: 'rotate(15 86 40)'
        }));
        expect(preview.shape.ellipse).toEqual(expect.objectContaining({
            cx: 60,
            cy: 40,
            transform: 'rotate(15 60 40)'
        }));
    });


    it('shows tablet free drawing strokes as desktop feature sketch previews', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureFreeDrawingStrokes: JSON.stringify({
                version: 1,
                strokes: [
                    { points: [{ x: 1000, y: 1000 }, { x: 5200, y: 5000 }] },
                    { points: [{ x: 8000, y: 1800 }] }
                ]
            }),
            featureFreeDrawingUpdatedAt: '2026-06-30T08:15:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureFreeDrawingStrokes')
        ] as any;

        expect(component.shouldShow()).toBe(true);
        expect(component.hasFeatureFreeDrawingPreview()).toBe(true);

        const preview = component.getFeatureFreeDrawingPreview()!;

        expect(preview.summary).toBe('자유 스케치 2획/3점.');
        expect(preview.updatedAt).toBe('2026-06-30');
        expect(preview.viewBox).toBe('0 0 120 72');
        expect(preview.path).toContain('M ');
        expect(preview.path).toContain('L ');
    });


    it('keeps the desktop free sketch slot visible before tablet drawing starts', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1');
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        expect(component.hasFeatureFreeDrawingPreview()).toBe(true);

        const preview = component.getFeatureFreeDrawingPreview()!;

        expect(preview.summary).toBe('자유 스케치 없음');
        expect(preview.emptyLabel).toBe('자유 스케치 필요');
        expect(preview.path).toBeUndefined();
        expect(preview.viewBox).toBe('0 0 120 72');
    });


    it('keeps the tablet free drawing preview section in the desktop record context template', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
            ),
            'utf8'
        );

        expect(template).toContain('getFeatureFreeDrawingPreview() as freeDrawingPreview');
        expect(template).toContain('자유 스케치');
        expect(template).toContain('태블릿 자유 스케치');
    });


    it('shows tablet daily journal personnel, equipment, and safety on opened DailyLog records', () => {

        const dailyLog = createDocument('daily-log-1', 'DailyLog', '2026-06-30 일지', {}, {
            dailyLogInvestigatorCount: 2,
            dailyLogLaborerCount: 4,
            dailyLogEquipmentCount: 1,
            dailyLogEquipmentSize: '0.6㎥',
            dailyLogSafetyEducationPhoto: true,
            dailyLogSafetyEducationStretching: false,
            dailyLogContent: ['strippingProgress', 'workArea', 'safetyIssue'],
            dailyLogEvidenceRole: ['sameDayFactRecord'],
            dailyLogReview: ['sameDayWritten', 'reviewerChecked'],
            dailyLogBoundaryMemoImportedAt: '2026-06-30T08:30:00.000Z',
            dailyLogWorkMemoUpdatedAt: '2026-06-30T10:15:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [dailyLog] })
        });
        component.document = dailyLog as any;
        component.fieldDefinitions = [
            field('dailyLogContent')
        ] as any;

        expect(component.shouldShow()).toBe(true);
        expect(component.hasDailyJournalSummary()).toBe(true);

        const summary = component.getDailyJournalSummary()!;

        expect(summary.personnelLabel).toBe('투입 6명 (조사원 2명 / 인부 4명)');
        expect(summary.equipmentLabel).toBe('장비 1대/0.6㎥');
        expect(summary.safetyLabel).toBe('안전교육 · 사진 · 체조 미확인');
        expect(summary.contentLabel).toBe('내용 제토 진행 · 작업구역 · 안전 문제');
        expect(summary.evidenceRoleLabel).toBe('근거 당일 사실기록');
        expect(summary.reviewLabel).toBe('검토 당일 작성 · 검토자 확인');
        expect(summary.boundaryMemoLabel).toBe('경계 메모 없음');
        expect(summary.boundaryMemoImportedAtLabel).toBe('경계 가져옴 2026-06-30');
        expect(summary.workMemoUpdatedAtLabel).toBe('작업일지 수정 2026-06-30');
        expect(summary.hasSafetyComplete).toBe(false);
        expect(summary.hasBoundaryMemo).toBe(false);
        expect(summary.hasLogClassification).toBe(true);
    });


    it('keeps the tablet daily journal summary section in the desktop record context template', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
            ),
            'utf8'
        );

        expect(template).toContain('getDailyJournalSummary() as dailyJournalSummary');
        expect(template).toContain('작업일지 요약');
        expect(template).toContain('dailyJournalSummary.personnelLabel');
        expect(template).toContain('dailyJournalSummary.safetyLabel');
        expect(template).toContain('dailyJournalSummary.contentLabel');
        expect(template).toContain('dailyJournalSummary.evidenceRoleLabel');
        expect(template).toContain('dailyJournalSummary.reviewLabel');
        expect(template).toContain('dailyJournalSummary.boundaryMemoImportedAtLabel');
        expect(template).toContain('dailyJournalSummary.workMemoUpdatedAtLabel');
    });


    it('shows tablet daily journal boundary handwriting on opened DailyLog records', () => {

        const dailyLog = createDocument('daily-log-1', 'DailyLog', '2026-06-30 일지', {}, {
            dailyLogBoundaryMemoStrokes: JSON.stringify({
                version: 1,
                strokes: [
                    { points: [{ x: 1200, y: 2200 }, { x: 3200, y: 4200 }] }
                ]
            }),
            dailyLogBoundaryMemoImportedAt: '2026-06-30T08:30:00.000Z',
            dailyLogBoundaryMemoUpdatedAt: '2026-06-30T09:15:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [dailyLog] })
        });
        component.document = dailyLog as any;
        component.fieldDefinitions = [
            field('dailyLogBoundaryMemoStrokes')
        ] as any;

        expect(component.shouldShow()).toBe(true);
        expect(component.hasDailyJournalBoundaryMemoPreview()).toBe(true);

        const preview = component.getDailyJournalBoundaryMemoPreview()!;

        expect(preview.summary).toBe('경계 메모 1획/2점.');
        expect(preview.importedAt).toBe('2026-06-30');
        expect(preview.updatedAt).toBe('2026-06-30');
        expect(preview.viewBox).toBe('0 0 120 72');
        expect(preview.path).toContain('M ');
        expect(preview.path).toContain('L ');
    });


    it('keeps the tablet daily journal boundary preview section in the desktop record context template', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
            ),
            'utf8'
        );

        expect(template).toContain('getDailyJournalBoundaryMemoPreview() as boundaryMemoPreview');
        expect(template).toContain('작업일지 경계 메모');
        expect(template).toContain('태블릿 작업일지 경계 메모');
        expect(template).toContain('boundaryMemoPreview.importedAt');
    });


    it('shows direct tablet photos on desktop find records', async () => {

        const find = createDocument('find-1', 'Find', 'FIND1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/find-1.jpg',
            recordCreationTiming: 'duringInvestigation'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [find] })
        });
        component.document = find as any;
        component.fieldDefinitions = [
            field('recordCreationTiming')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'photos', label: '사진', count: 1, canCreate: false }
        ]));
    });


    it('warns when a selected feature type has no core attributes recorded', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureType: 'kiln',
            featureRecordingStatus: 'investigating'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            checkboxesField('potteryKilnPartInvestigation')
        ] as any;

        await component.ngOnChanges();

        expect(component.getStatusChips()).toEqual(expect.arrayContaining([
            { label: '조사 중', tone: 'info' },
            { label: '가마 핵심 속성 미기록', tone: 'warning' }
        ]));
    });


    it('shows tablet feature period values on opened desktop feature records', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            period: 'joseon',
            featureRecordingStatus: 'investigating'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('period', 'KoreanFieldwork-featurePeriod'),
            field('featureRecordingStatus', 'KoreanFieldwork-featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual(expect.arrayContaining([
            { label: '시기 조선', tone: 'info' },
            { label: '조사 중', tone: 'info' }
        ]));
    });


    it('keeps tablet project setup visible on desktop operation records', async () => {

        const operation = createDocument('operation-1', 'Operation', 'OP1', {}, {
            projectInvestigationMode: 'trialTrench',
            projectBoundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [operation] })
        });
        component.document = operation as any;
        component.fieldDefinitions = [
            field('projectInvestigationMode'),
            field('projectBoundarySummary')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '조사 표본·시굴조사', tone: 'info' },
            { label: '경계 1구역 북쪽 능선부터 남쪽 농로…', tone: 'success' }
        ]);
    });


    it('keeps tablet operation role responsibilities visible on desktop operation records', async () => {

        const operation = createDocument('operation-1', 'Operation', 'OP1', {}, {
            operationRoleResponsibility: JSON.stringify([
                'safetyLead',
                'photographyLead',
                'dailyLogAuthor',
                'roleGapIdentified'
            ])
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [operation] })
        });
        component.document = operation as any;
        component.fieldDefinitions = [
            field('operationRoleResponsibility')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '역할 안전 담당 · 사진 담당 · 작업일지 작성자 +1', tone: 'warning' }
        ]);
    });


    it('summarizes tablet feature stratigraphy and soil checks on desktop segment records', async () => {

        const segment = createDocument('segment-1', 'FeatureSegment', 'F1-fill', {}, {
            featureFillInterpretation: ['attributionCaution'],
            featureLifecycleReview: ['burialProcess'],
            soilTextureFieldAssessment: ['quantitativeAnalysisNeeded'],
            soilParticleFieldCheck: ['touchTestChecked']
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [segment] })
        });
        component.document = segment as any;
        component.fieldDefinitions = [
            checkboxesField('featureFillInterpretation'),
            checkboxesField('soilTextureFieldAssessment')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '해석 내부토 귀속 주의 / 라이프사이클 매몰 과정', tone: 'warning' },
            { label: '토성 판정 정량분석 대조 필요 / 입자 촉감 테스트', tone: 'warning' }
        ]);
    });


    it('summarizes tablet soil-map prediction checks on desktop survey records', async () => {

        const survey = createDocument('survey-1', 'Survey', 'SUR1', {}, {
            soilMapPredictionVerification: [
                'soilMapDepthLimitChecked',
                'trenchResultRevisesPrediction'
            ]
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [survey] })
        });
        component.document = survey as any;
        component.fieldDefinitions = [
            checkboxesField('soilMapPredictionVerification')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '예측 토양도 토양도 반영깊이 한계 확인·시굴 결과로 예측 수정', tone: 'warning' }
        ]);
    });


    it('summarizes source evidence caption checks on opened desktop records', async () => {

        const sourceEvidence = createDocument('source-1', 'SourceEvidenceIndex', 'SRC1', {}, {
            sourceEvidenceVerification: [
                'pageChecked',
                'captionNeedsCheck'
            ]
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [sourceEvidence] })
        });
        component.document = sourceEvidence as any;
        component.fieldDefinitions = [
            checkboxesField('sourceEvidenceVerification')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '검증 근거 쪽수 대조·캡션 대조 필요', tone: 'warning' }
        ]);
    });


    it('keeps tablet imported boundary file details visible on desktop boundary records', async () => {

        const boundary = createDocument('boundary-1', 'SurveyBoundary', 'B1', {}, {
            shortDescription: 'A구역 - boundary.geojson (EPSG:4326, 5점)',
            surveyBoundaryAccuracy: 'importedReference',
            surveyBoundarySource: 'geoJsonImport',
            referenceBasemapProvider: 'importedVectorLayer'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [boundary] })
        });
        component.document = boundary as any;
        component.fieldDefinitions = [
            field('shortDescription'),
            field('surveyBoundaryAccuracy'),
            field('surveyBoundarySource'),
            field('referenceBasemapProvider')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '가져온 경계 boundary.geojson (EPSG:4326, 5점)', tone: 'success' },
            { label: 'GeoJSON 가져오기 · 가져온 참고자료', tone: 'info' }
        ]);
    });


    it('renders parent scope with included-location wording', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
            ),
            'utf8'
        );

        expect(template).toContain('포함 위치: {{parentPathLabel}}');
    });


    it('stays hidden outside Korean fieldwork contexts', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [] })
        });
        component.document = createDocument('type-1', 'Type', 'Type 1') as any;
        component.fieldDefinitions = [
            field('shortDescription')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(false);
        expect(component.parentPathLabel).toBeUndefined();
        expect(component.metrics).toEqual([]);
        expect(component.getEvidenceMetrics()).toEqual([]);
    });


    it('opens the source notebook record from the context panel', async () => {

        const routing = { jumpToResource: jest.fn() };
        const memo = createDocument('memo-1', 'PenMemo', 'M1', {}, {
            date: getTodayLabel(),
            penMemoReviewedTranscript: '[다음 작업] 사진 보강.'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [memo]
            })
        }, routing);
        component.document = memo as any;
        component.fieldDefinitions = [
            field('recordCreationTiming')
        ] as any;

        await component.ngOnChanges();
        await component.openNotebookEntry(component.getNotebookEntries()[0]);

        expect(routing.jumpToResource).toHaveBeenCalledWith(memo);
    });


    it('appends a related tablet field note to the current record narrative once', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '기존 기록.'
        });
        const memo = createDocument('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            date: getTodayLabel(),
            penMemoReviewedTranscript: [
                '[관찰 내용] 북쪽 경계에서 소토 확인.',
                '[해석] 폐기층 가능성 있음.',
                '[다음 작업] 사진 보강 후 단면 정리.',
                '[손그림 메모] 총 1획, 점 2개',
                '[손그림 좌표] {"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}'
            ].join('\n')
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, memo]
            })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('longAxisOrientation'),
            textField('description', '설명')
        ] as any;

        await component.ngOnChanges();
        expect(component.canApplyNotebookEntry(component.getNotebookEntries()[0])).toBe(true);
        expect(component.getNotebookEntryApplyTargetLabel(component.getNotebookEntries()[0])).toBe('설명');

        component.applyNotebookEntry(component.getNotebookEntries()[0]);
        component.applyNotebookEntry(component.getNotebookEntries()[0]);

        expect(feature.resource.description).toContain('기존 기록.');
        expect(feature.resource.description).toContain('[메모 ');
        expect(feature.resource.description).toContain('관찰: 북쪽 경계에서 소토 확인.');
        expect(feature.resource.description).toContain('손그림: 손그림 메모 1획/2점.');
        expect(feature.resource.description).toContain('해석: 폐기층 가능성 있음.');
        expect(feature.resource.description).toContain('다음 작업: 사진 보강 후 단면 정리.');
        expect(feature.resource.description.match(/\[메모/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('appends tablet soil-photo Munsell candidates to the current record narrative once', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '기존 토층 관찰.'
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilColorAssistStatus: 'candidatesAvailable',
            soilColorAssistCandidates: [
                '사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                '1: 10YR 4/3 (높음, 차이 0.0)',
                '2: 7.5YR 4/3 (보통, 차이 2.1)'
            ].join('\n'),
            soilProfileColorSwatches: '1: 10YR 4/3',
            soilProfileColorNote: '조명 보정 필요.',
            soilProfileCaptureNote: '오전 확산광.'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, soilProfilePhoto]
            })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            textField('description', '설명')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            id: 'soilColor:soil-photo-1',
            label: '토색 후보',
            detail: 'SP1 · 먼셀 후보 10YR 4/3, 7.5YR 4/3 · 사진 선택 지점 20%/50% 평균 RGB 111/87/61',
            appendText: [
                '[토층사진 SP1]',
                '토색 후보: 10YR 4/3, 7.5YR 4/3',
                '샘플 위치: 사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                '토색 번호: 1: 10YR 4/3',
                '토색 메모: 조명 보정 필요.',
                '촬영 조건: 오전 확산광.'
            ].join('\n')
        });
        expect(component.canApplyEvidenceInsight(insight)).toBe(true);
        expect(component.getEvidenceInsightApplyTargetLabel(insight)).toBe('설명');

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('기존 토층 관찰.');
        expect(feature.resource.description).toContain('[토층사진 SP1]');
        expect(feature.resource.description).toContain('토색 후보: 10YR 4/3, 7.5YR 4/3');
        expect(feature.resource.description).toContain('샘플 위치: 사진 선택 지점 20%/50% 평균 RGB 111/87/61');
        expect(feature.resource.description).toContain('토색 번호: 1: 10YR 4/3');
        expect(feature.resource.description).toContain('토색 메모: 조명 보정 필요.');
        expect(feature.resource.description).toContain('촬영 조건: 오전 확산광.');
        expect(feature.resource.description.match(/\[토층사진 SP1\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('appends tablet layer-by-layer soil colors even when no photo candidates exist', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '기존 토색 기록.'
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfileColorSwatches: '1: 10YR 4/3\n2: 7.5YR 4/4',
            soilProfileColorNote: '2층은 수분 많음.'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, soilProfilePhoto]
            })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            textField('description', '설명')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            id: 'soilColorSwatches:soil-photo-1',
            label: '층별 토색',
            detail: 'SP1 · 층별 토색 2개 · 1: 10YR 4/3, 2: 7.5YR 4/4',
            appendText: [
                '[토층사진 SP1]',
                '층별 토색: 1: 10YR 4/3\n2: 7.5YR 4/4',
                '토색 메모: 2층은 수분 많음.'
            ].join('\n')
        });

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('기존 토색 기록.');
        expect(feature.resource.description).toContain('[토층사진 SP1]');
        expect(feature.resource.description).toContain('층별 토색: 1: 10YR 4/3\n2: 7.5YR 4/4');
        expect(feature.resource.description).toContain('토색 메모: 2층은 수분 많음.');
        expect(feature.resource.description.match(/\[토층사진 SP1\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('creates continuation records with inherited operation context', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const feature = createDocument('feature-1', 'Feature', 'F1', {
            isRecordedIn: ['operation-1']
        }, {
            featureRecordingStatus: 'investigating'
        });
        const savedSegment = createDocument('segment-1', 'FeatureSegment', 'feature-segment-1700000000000', {
            isRecordedIn: ['operation-1'],
            liesWithin: ['feature-1']
        }, {
            featureRecordingStatus: 'candidate',
            featureInvestigationChecklist: []
        });
        const modalRef = {
            componentInstance: {
                setDocument: jest.fn().mockResolvedValue(undefined)
            },
            result: Promise.resolve({ documents: [savedSegment] })
        };
        const modalService = { open: jest.fn().mockReturnValue(modalRef) };
        const datastore = {
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        };
        const component = createComponent(
            datastore,
            { jumpToResource: jest.fn() },
            createProjectConfiguration({
                'FeatureSegment:Feature': ['liesWithin'],
                'Photo:Feature': ['depicts']
            }),
            modalService
        );
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.getContinuationActions().map(action => action.categoryName))
            .toEqual(['FeatureSegment', 'Photo']);
        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'featureSegments', label: '피트', count: 0, canCreate: true },
            { id: 'photos', label: '사진', count: 0, canCreate: true }
        ]));
        expect(component.getContinuationActionLabel(component.getContinuationActions()[0]))
            .toBe('세부유구');
        expect(component.getContinuationActionDetail(component.getContinuationActions()[0]))
            .toBe('포함 위치: 현재 기록');
        expect(component.getRecordActions().some(action =>
            action.type === 'createDocument' && action.categoryName === 'FeatureSegment'
        )).toBe(true);

        await component.runRecordAction(component.getRecordActions().find(action =>
            action.type === 'createDocument' && action.categoryName === 'FeatureSegment'
        )!);

        expect(modalService.open).toHaveBeenCalled();
        expect(modalRef.componentInstance.setDocument).toHaveBeenCalledWith(expect.objectContaining({
            resource: expect.objectContaining({
                identifier: 'feature-segment-1700000000000',
                category: 'FeatureSegment',
                relations: {
                    isRecordedIn: ['operation-1'],
                    liesWithin: ['feature-1']
                },
                featureRecordingStatus: 'candidate',
                featureInvestigationChecklist: []
            })
        }));
        expect(handleChanged).toHaveBeenCalledTimes(1);
        expect(component.metrics).toEqual(expect.arrayContaining([
            { id: 'children', label: '이어진 기록', count: 1 }
        ]));

        jest.restoreAllMocks();
    });


    it('creates typed feature continuation drafts from the desktop context flow', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const trench = createDocument('trench-1', 'Trench', 'T1');
        const savedFeature = createDocument('feature-1', 'Feature', '가마-1700000000000', {
            liesWithin: ['trench-1']
        }, {
            featureType: 'kiln',
            featureInterpretationType: ['kiln'],
            featureRecordingStatus: 'candidate',
            featureInvestigationChecklist: []
        });
        const modalRef = {
            componentInstance: {
                setDocument: jest.fn().mockResolvedValue(undefined)
            },
            result: Promise.resolve({ documents: [savedFeature] })
        };
        const modalService = { open: jest.fn().mockReturnValue(modalRef) };
        const component = createComponent(
            { find: jest.fn().mockResolvedValue({ documents: [trench] }) },
            { jumpToResource: jest.fn() },
            createProjectConfiguration({
                'Feature:Trench': ['liesWithin']
            }),
            modalService
        );
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = trench as any;
        component.fieldDefinitions = [
            field('recordCreationTiming')
        ] as any;

        await component.ngOnChanges();

        const featureAction = component.getContinuationActions().find(action =>
            action.categoryName === 'Feature'
        )!;
        const kilnPreset = component.getFeatureContinuationPresets().find(preset =>
            preset.featureType === 'kiln'
        )!;

        expect(component.isFeatureContinuationAction(featureAction)).toBe(true);
        expect(component.getFeatureContinuationPresetLabel(
            component.getFeatureContinuationPresets().find(preset => preset.featureType === 'unknown')!
        )).toBe('유구로 만들기');
        expect(component.getFeatureContinuationPresetLabel(kilnPreset)).toBe('가마');
        expect(component.getFeatureContinuationDetail(featureAction))
            .toBe('포함 위치: 현재 기록 · 성격을 고른 뒤 시작');

        await component.createFeatureContinuationRecord(featureAction, kilnPreset);

        expect(modalService.open).toHaveBeenCalled();
        expect(modalRef.componentInstance.setDocument).toHaveBeenCalledWith(expect.objectContaining({
            resource: expect.objectContaining({
                identifier: '가마-1700000000000',
                category: 'Feature',
                relations: {
                    liesWithin: ['trench-1']
                },
                featureType: 'kiln',
                featureInterpretationType: ['kiln'],
                featureRecordingStatus: 'candidate',
                featureInvestigationChecklist: []
            })
        }));
        expect(handleChanged).toHaveBeenCalledTimes(1);

        jest.restoreAllMocks();
    });


    it('opens records from prioritized fieldwork actions', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'investigating'
        });
        const photo = createDocument('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        });
        const routing = { jumpToResource: jest.fn() };
        const datastore = {
            find: jest.fn().mockResolvedValue({ documents: [feature, photo] }),
            get: jest.fn().mockResolvedValue(photo)
        };
        const component = createComponent(datastore, routing);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.runRecordAction({
            id: 'open-photo',
            type: 'openDocument',
            label: '사진 열기',
            detail: '연결된 사진 확인',
            icon: 'mdi-camera-outline',
            tone: 'info',
            documentId: 'photo-1'
        });

        expect(datastore.get).toHaveBeenCalledWith('photo-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(photo);
    });


    it('shows tablet handwriting transcription backlog as an openable record action', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'investigating'
        });
        const memo = createDocument('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20}]}]}',
            penMemoTranscriptionStatus: 'pending'
        });
        const routing = { jumpToResource: jest.fn() };
        const datastore = {
            find: jest.fn().mockResolvedValue({ documents: [feature, memo] }),
            get: jest.fn().mockResolvedValue(memo)
        };
        const component = createComponent(datastore, routing);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'penMemos', label: '야장 메모', count: 1, canCreate: false },
            { id: 'penMemoSketches', label: '스케치 메모', count: 1, canCreate: false }
        ]));
        expect(component.getEvidenceInsights()).toEqual([
            {
                id: 'penMemoSketch:memo-1',
                label: '태블릿 야장 전사',
                detail: 'M1 · 태블릿 손글씨 원자료 · 스케치 메모 1획/1점.',
                sketchPreview: {
                    label: '스케치 메모 1획/1점.',
                    path: 'M 30 8 L 34 8 M 32 6 L 32 10',
                    viewBox: '0 0 120 72'
                },
                tone: 'warning'
            }
        ]);

        const [action] = component.getRecordActions();
        expect(action).toMatchObject({
            id: 'issue-pen-memo-handwriting-transcription-memo-1',
            type: 'openDocument',
            label: '관련 점검',
            detail: '태블릿 손글씨 원자료 · 스케치 메모 1획/1점. 태블릿 손글씨 원자료를 읽어 검토 전사문으로 남기세요.',
            documentId: 'memo-1',
            tone: 'warning'
        });

        await component.runRecordAction(action);

        expect(datastore.get).toHaveBeenCalledWith('memo-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(memo);
    });


    it('shows tablet photo annotation previews in the record context evidence', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'investigating'
        });
        const photo = createDocument('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}'
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfilePhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, photo, soilProfilePhoto]
            })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'photoAnnotations', label: '사진 표시', count: 2, canCreate: false }
        ]));
        expect(component.getEvidenceInsights()).toEqual([
            {
                id: 'photoAnnotation:photo-1',
                label: '사진 표시',
                detail: 'P1 · 사진 표시 1획/2점',
                sketchPreview: {
                    label: '사진 표시 1획/2점',
                    path: 'M 32 8 L 88 64',
                    viewBox: '0 0 120 72'
                },
                tone: 'info'
            },
            {
                id: 'photoAnnotation:soil-photo-1',
                label: '토층사진 표시',
                detail: 'SP1 · 사진 표시 1획/1점',
                sketchPreview: {
                    label: '사진 표시 1획/1점',
                    path: 'M 30 8 L 34 8 M 32 6 L 32 10',
                    viewBox: '0 0 120 72'
                },
                tone: 'info'
            }
        ]);
    });


    it('appends tablet photo annotation summaries to the current record narrative once', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '기존 사진 관찰.'
        });
        const photo = createDocument('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            description: '동쪽 벽면 균열 표시.',
            fieldworkPhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}',
            fieldworkPhotoAnnotationUpdatedAt: '2026-06-23T08:34:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, photo]
            })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            textField('description', '설명')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            id: 'photoAnnotation:photo-1',
            label: '사진 표시',
            detail: 'P1 · 사진 표시 1획/2점 · 수정 2026-06-23T08:34:00.000Z',
            appendText: [
                '[사진 P1 표시]',
                '표시 요약: 사진 표시 1획/2점',
                '표시 설명: 동쪽 벽면 균열 표시.',
                '수정 시각: 2026-06-23T08:34:00.000Z'
            ].join('\n')
        });
        expect(component.canApplyEvidenceInsight(insight)).toBe(true);
        expect(component.getEvidenceInsightApplyTargetLabel(insight)).toBe('설명');

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('기존 사진 관찰.');
        expect(feature.resource.description).toContain('[사진 P1 표시]');
        expect(feature.resource.description).toContain('표시 요약: 사진 표시 1획/2점');
        expect(feature.resource.description).toContain('표시 설명: 동쪽 벽면 균열 표시.');
        expect(feature.resource.description).toContain('수정 시각: 2026-06-23T08:34:00.000Z');
        expect(feature.resource.description.match(/\[사진 P1 표시\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('shows tablet photo annotation update times in record context insights', async () => {

        const photoStrokes = '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}';
        const soilProfilePhotoStrokes = '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}';
        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'investigating'
        });
        const photo = createDocument('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoAnnotationStrokes: photoStrokes,
            fieldworkPhotoAnnotationUpdatedAt: '2026-06-23T08:34:00.000Z'
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfilePhotoAnnotationStrokes: soilProfilePhotoStrokes,
            soilProfilePhotoAnnotationUpdatedAt: '2026-06-23T08:35:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, photo, soilProfilePhoto]
            })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        const insights = component.getEvidenceInsights();
        expect(insights[0].detail).toContain(getPhotoAnnotationSummaryLabel(photoStrokes));
        expect(insights[0].detail).toContain('수정 2026-06-23T08:34:00.000Z');
        expect(insights[1].detail).toContain(getPhotoAnnotationSummaryLabel(soilProfilePhotoStrokes));
        expect(insights[1].detail).toContain('수정 2026-06-23T08:35:00.000Z');
        expect(insights[0].sketchPreview?.label).toBe(getPhotoAnnotationSummaryLabel(photoStrokes));
        expect(insights[1].sketchPreview?.label).toBe(getPhotoAnnotationSummaryLabel(soilProfilePhotoStrokes));
    });


    it('shows tablet photo annotations when the opened desktop record is the photo itself', async () => {

        const photo = createDocument('photo-1', 'Photo', 'P1', {}, {
            fieldworkPhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [photo]
            })
        });
        component.document = photo as any;
        component.fieldDefinitions = [
            field('fieldworkPhotoAnnotationStrokes')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'photoAnnotations', label: '사진 표시', count: 1, canCreate: false }
        ]));
        expect(component.getEvidenceInsights()).toEqual([
            {
                id: 'photoAnnotation:photo-1',
                label: '사진 표시',
                detail: 'P1 · 사진 표시 1획/2점',
                sketchPreview: {
                    label: '사진 표시 1획/2점',
                    path: 'M 32 8 L 88 64',
                    viewBox: '0 0 120 72'
                },
                tone: 'info'
            }
        ]);
    });


    it('shows tablet soil-photo annotations and Munsell candidates on the opened soil photo', async () => {

        const soilPhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {}, {
            soilColorAssistCandidates: '1: 10YR 4/3 (높음)',
            soilColorAssistStatus: 'candidatesAvailable',
            soilProfilePhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [soilPhoto]
            })
        });
        component.document = soilPhoto as any;
        component.fieldDefinitions = [
            field('soilColorAssistCandidates'),
            field('soilProfilePhotoAnnotationStrokes')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'photoAnnotations', label: '사진 표시', count: 1, canCreate: false }
        ]));
        expect(component.getEvidenceInsights()).toEqual([
            {
                id: 'soilColor:soil-photo-1',
                label: '토색 후보',
                detail: 'SP1 · 먼셀 후보 10YR 4/3',
                tone: 'info'
            },
            {
                id: 'photoAnnotation:soil-photo-1',
                label: '토층사진 표시',
                detail: 'SP1 · 사진 표시 1획/1점',
                sketchPreview: {
                    label: '사진 표시 1획/1점',
                    path: 'M 30 8 L 34 8 M 32 6 L 32 10',
                    viewBox: '0 0 120 72'
                },
                tone: 'info'
            }
        ]);
    });


    it('shows a stable empty state when the current record has no immediate actions', async () => {

        const photo = createDocument('photo-1', 'Photo', 'P1');
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [photo] })
        });
        component.document = photo as any;
        component.fieldDefinitions = [
            field('recordCreationTiming')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getRecordActions()).toEqual([]);
        expect(component.hasRecordActionEmptyState()).toBe(true);
    });


    it('applies report identifiers while preserving the field number', async () => {

        const feature = createDocument('feature-1', 'Feature', '수혈 17', {}, {
            featureRecordingStatus: 'confirmed'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            field('fieldIdentifier'),
            field('reportIdentifier'),
            field('identifierRevisionHistory'),
            field('identifierRevisionNote')
        ] as any;

        await component.ngOnChanges();

        expect(component.canShowIdentifierRevision()).toBe(true);
        expect(component.getIdentifierRevisionFieldIdentifier()).toBe('수혈 17');

        component.setIdentifierRevisionNextValue(' 조선시대 3호 수혈 ');
        component.setIdentifierRevisionReason('전면 제토 후 번호 재배정');
        expect(component.canApplyIdentifierRevision()).toBe(true);

        component.applyIdentifierRevision();

        expect(feature.resource).toMatchObject({
            identifier: '조선시대 3호 수혈',
            fieldIdentifier: '수혈 17',
            reportIdentifier: '조선시대 3호 수혈',
            identifierRevisionNote: '전면 제토 후 번호 재배정'
        });
        expect(feature.resource.identifierRevisionHistory).toEqual([
            expect.objectContaining({
                previousIdentifier: '수혈 17',
                nextIdentifier: '조선시대 3호 수혈',
                fieldIdentifier: '수혈 17',
                reason: '전면 제토 후 번호 재배정'
            })
        ]);
        expect(component.getIdentifierRevisionHistoryCount()).toBe(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('does not show identifier revision controls for non-feature records', async () => {

        const trench = createDocument('trench-1', 'Trench', 'T1', {}, {
            featureRecordingStatus: 'confirmed'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [trench] })
        });
        component.document = trench as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            field('fieldIdentifier'),
            field('reportIdentifier'),
            field('identifierRevisionHistory'),
            field('identifierRevisionNote')
        ] as any;

        await component.ngOnChanges();

        expect(component.canShowIdentifierRevision()).toBe(false);
    });
});


const createComponent = (
    datastore: any,
    routing: any = { jumpToResource: jest.fn() },
    projectConfiguration: any = createProjectConfiguration(),
    modalService: any = { open: jest.fn() }
) => new KoreanFieldworkRecordContextPanelComponent(
    datastore as any,
    { get: (item: any) => item.label ?? item.name } as any,
    projectConfiguration as any,
    routing as any,
    modalService as any
);


const createDocument = (
    id: string,
    category: string,
    identifier: string,
    relations: { [relationName: string]: string[] } = {},
    fields: any = {}
) => ({
    resource: {
        id,
        identifier,
        category,
        relations,
        ...fields
    }
});


const field = (name: string, valuelistId?: string) => ({
    name,
    editable: true,
    ...(valuelistId ? { valuelist: { id: valuelistId } } : {})
});


const checkboxesField = (name: string, valuelistId?: string) => ({
    ...field(name, valuelistId),
    inputType: 'checkboxes'
});


const textField = (name: string, label: string) => ({
    name,
    label,
    editable: true,
    inputType: 'text'
});


const createProjectConfiguration = (
    allowedRelations: Record<string, string[]> = {}
) => ({
    getCategory: (categoryName: string) => createCategory(categoryName),
    isAllowedRelationDomainCategory: (
        categoryName: string,
        parentCategoryName: string,
        relationName: string
    ) => (allowedRelations[`${categoryName}:${parentCategoryName}`] ?? []).includes(relationName)
});


const createCategory = (name: string) => ({
    name,
    label: getCategoryLabel(name),
    mustLieWithin: false,
    groups: [{
        name: 'koreanFieldwork',
        fields: createFields(name)
    }]
});


const createFields = (name: string) => {

    switch (name) {
        case 'Feature':
            return [
                field('featureType'),
                field('featureInterpretationType'),
                field('featureRecordingStatus', 'KoreanFieldwork-featureRecordingStatus'),
                field('featureInvestigationChecklist')
            ];
        case 'FeatureSegment':
            return [
                field('featureRecordingStatus', 'KoreanFieldwork-featureRecordingStatus'),
                field('featureInvestigationChecklist')
            ];
        default:
            return [];
    }
};


const getCategoryLabel = (name: string) => ({
    Feature: '유구',
    FeatureSegment: '세부유구',
    Photo: '사진'
}[name] ?? name);


const getTodayLabel = () => {
    const today = new Date();

    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
    ].join('-');
};
