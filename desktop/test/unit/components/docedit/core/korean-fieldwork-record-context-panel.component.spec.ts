jest.mock('src/app/electron/electron', () => ({
    electronRemote: undefined
}), { virtual: true });

import {
    KoreanFieldworkRecordContextPanelComponent
} from '../../../../../src/app/components/docedit/core/korean-fieldwork-record-context-panel.component';
import { getPhotoAnnotationSummaryLabel } from '../../../../../src/app/util/korean-fieldwork-evidence-review';
import { getKoreanFieldworkRecordFieldValueSummary } from 'idai-field-core';
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
            { label: '가마 핵심 연소부 기록·소성부 기록', tone: 'success' },
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


    it('exposes current record HWP copy blocks in the desktop record context', async () => {

        const write = jest.fn();
        const writeText = jest.fn();
        const clear = jest.fn();
        const testWindow = (global as any).window ?? ((global as any).window = {});
        const previousRequire = testWindow.require;
        testWindow.require = jest.fn().mockReturnValue({ clipboard: { clear, write, writeText } });

        try {
            const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            });
            const photo = createDocument('photo-1', 'Photo', 'P1', {
                depicts: ['feature-1']
            }, {
                fieldworkPhotoUri: 'file:///tablet/photos/F1.jpg',
                originalFilename: 'F1.jpg',
                fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                width: 4032,
                height: 3024
            });
            const component = createComponent({
                find: jest.fn().mockResolvedValue({ documents: [feature, photo] })
            });
            component.document = feature as any;
            component.fieldDefinitions = [
                field('featureRecordingStatus'),
                field('featureInvestigationChecklist')
            ] as any;

            await component.ngOnChanges();

            expect(component.hasReportHandoffItem()).toBe(true);
            expect(component.getReportHandoffItem()).toMatchObject({
                documentId: 'feature-1',
                identifier: 'F1',
                summary: 'round pit with dark fill',
                bodyPreview: '\uc720\uad6c F1: round pit with dark fill'
            });
            expect(component.getReportHandoffItem()?.copyText).toContain('[\uc720\uad6c] F1');
            expect(component.getReportHandoffItem()?.copyText)
                .toContain('\uc790\ub8cc \uc0c1\uc138:\r\n- \uc0ac\uc9c4 P1');
            expect(component.getReportHandoffItem()?.copySections.map(section => section.id))
                .toEqual(['body', 'summary', 'details', 'evidence', 'issues']);
            expect(component.getReportHandoffItem()?.copySections.find(section => section.id === 'body')?.copyText)
                .toBe('\uc720\uad6c F1: round pit with dark fill');
            expect(component.getReportHandoffBodyCopyActionLabel()).toBe('\ubcf8\ubb38');

            const item = component.getReportHandoffItem()!;
            const bodySection = item.copySections.find(section => section.id === 'body')!;
            await component.copyReportHandoffBody();

            expect(clear).toHaveBeenCalledTimes(1);
            expect(writeText).toHaveBeenCalledWith(bodySection.copyText);
            expect(write).not.toHaveBeenCalled();
            expect(component.getReportHandoffBodyCopyActionLabel()).toBe('\ubcf5\uc0ac\ub428');

            await component.copyReportHandoffItem();

            expect(clear).toHaveBeenCalledTimes(2);
            expect(writeText).toHaveBeenLastCalledWith(item.copyText);
            expect(write).not.toHaveBeenCalled();
            expect(component.getReportHandoffCopyActionLabel()).toBe('\ubcf5\uc0ac\ub428');

            const evidenceSection = item.copySections.find(section => section.id === 'evidence')!;
            await component.copyReportHandoffSection(evidenceSection);

            expect(clear).toHaveBeenCalledTimes(3);
            expect(writeText).toHaveBeenLastCalledWith(evidenceSection.copyText);
            expect(write).not.toHaveBeenCalled();
            expect(component.getReportHandoffSectionCopyActionLabel(evidenceSection))
                .toBe('\ubcf5\uc0ac\ub428');
        } finally {
            testWindow.require = previousRequire;
        }
    });


    it('surfaces tablet pit lines in desktop evidence metrics and HWP copy blocks', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureSoilPitLines: JSON.stringify([
                {
                    label: '1',
                    points: [{ x: 10, y: 20 }, { x: 80, y: 25 }],
                    start: { x: 10, y: 20 },
                    end: { x: 80, y: 25 },
                    version: 2
                },
                {
                    label: '2',
                    points: [{ x: 30, y: 40 }, { x: 30, y: 70 }],
                    start: { x: 30, y: 40 },
                    end: { x: 30, y: 70 },
                    version: 2
                }
            ]),
            featureSoilPitLineUpdatedAt: '2026-07-10T08:20:00.000Z',
            featureRecordingStatus: 'candidate',
            featureInvestigationChecklist: []
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureSoilPitLines')
        ] as any;

        await component.ngOnChanges();

        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'featureSoilPitLines', label: '\ud53c\ud2b8\uc120', count: 2, canCreate: false }
        ]));
        expect(component.hasFeaturePitLinePreview()).toBe(true);
        expect(component.getFeaturePitLinePreview()).toEqual({
            lines: [
                {
                    end: { x: 91.2, y: 24 },
                    label: '1',
                    labelPoint: { x: 54.8, y: 19.4 },
                    start: { x: 18.4, y: 20.8 },
                    text: '\ud53c\ud2b8\uc120 1: \uc2dc\uc791 10%/20%, \ub05d 80%/25%'
                },
                {
                    end: { x: 39.2, y: 52.8 },
                    label: '2',
                    labelPoint: { x: 39.2, y: 40.2 },
                    start: { x: 39.2, y: 33.6 },
                    text: '\ud53c\ud2b8\uc120 2: \uc2dc\uc791 30%/40%, \ub05d 30%/70%'
                }
            ],
            summary: '\ud53c\ud2b8\uc120 2',
            updatedAt: '2026-07-10',
            viewBox: '0 0 120 80'
        });
        expect(component.getReportHandoffItem()?.evidenceLabel).toContain('\ud53c\ud2b8\uc120 2');
        expect(component.getReportHandoffItem()?.copyText)
            .toContain('\ud53c\ud2b8\uc120 1: \uc2dc\uc791 10%/20%, \ub05d 80%/25%');
        expect(component.getReportHandoffItem()?.copyText).not.toContain('"points"');
    });


    it('keeps the tablet pit line preview section in the desktop record context template', () => {

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

        expect(template).toContain('getFeaturePitLinePreview() as pitLinePreview');
        expect(template).toContain('\ud53c\ud2b8\uc120');
        expect(template).toContain('\ud0dc\ube14\ub9bf \ud53c\ud2b8\uc120 \ubbf8\ub9ac\ubcf4\uae30');
        expect(template).toContain('pitLinePreview.lines');
        expect(styles).toContain('.korean-fieldwork-record-context-pit-lines-svg');
        expect(styles).toContain('.pit-line-item line');
    });


    it('surfaces tablet field record quality reviews in the desktop record context', async () => {

        const operation = createDocument('operation-1', 'Operation', 'OP1');
        const qualityReview = createDocument(
            'quality-review-1',
            'FieldRecordQualityReview',
            'quality-001',
            { isRecordedIn: ['operation-1'] },
            {
                reviewedRecordUnit: ['featureRecord', 'dailyLog'],
                qualityReviewStage: ['sameDayReview', 'sourceRecordCorrection'],
                qualityCorrectionBasis: ['correctionReasonLinked', 'originalRecordPreserved'],
                recordCreationTiming: 'sameDayFieldRecord',
                fieldRecordQuality: ['correctionNeeded'],
                reportCrossCheck: ['manuscript', 'photoRegister'],
                reportEvaluationFeedback: ['fieldRecordReview', 'supplementRequestTracked'],
                verificationState: 'needsRecheck'
            }
        );
        const reviewedRecordUnit = getKoreanFieldworkRecordFieldValueSummary(
            'reviewedRecordUnit',
            ['featureRecord', 'dailyLog']
        )!;
        const reviewStage = getKoreanFieldworkRecordFieldValueSummary(
            'qualityReviewStage',
            ['sameDayReview', 'sourceRecordCorrection']
        )!;
        const correctionBasis = getKoreanFieldworkRecordFieldValueSummary(
            'qualityCorrectionBasis',
            ['correctionReasonLinked', 'originalRecordPreserved']
        )!;
        const reportCrossCheck = getKoreanFieldworkRecordFieldValueSummary(
            'reportCrossCheck',
            ['manuscript', 'photoRegister']
        )!;
        const reportFeedback = getKoreanFieldworkRecordFieldValueSummary(
            'reportEvaluationFeedback',
            ['fieldRecordReview', 'supplementRequestTracked']
        )!;
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [operation, qualityReview] })
        });
        component.document = qualityReview as any;
        component.fieldDefinitions = [
            checkboxesField('reviewedRecordUnit'),
            checkboxesField('qualityReviewStage'),
            checkboxesField('qualityCorrectionBasis'),
            field('recordCreationTiming'),
            checkboxesField('fieldRecordQuality'),
            checkboxesField('reportCrossCheck'),
            checkboxesField('reportEvaluationFeedback'),
            field('verificationState')
        ] as any;

        await component.ngOnChanges();

        const statusText = component.getStatusChips().map(chip => chip.label).join('\n');
        const copyText = component.getReportHandoffItem()?.copyText ?? '';

        expect(component.shouldShow()).toBe(true);
        expect(statusText).toContain(reviewedRecordUnit);
        expect(statusText).toContain(reviewStage);
        expect(statusText).not.toContain('featureRecord');
        expect(statusText).not.toContain('sourceRecordCorrection');
        expect(component.hasReportHandoffItem()).toBe(true);
        expect(copyText).toContain(reviewedRecordUnit);
        expect(copyText).toContain(reviewStage);
        expect(copyText).toContain(correctionBasis);
        expect(copyText).toContain(reportCrossCheck);
        expect(copyText).toContain(reportFeedback);
        expect(copyText).not.toContain('featureRecord');
        expect(copyText).not.toContain('sourceRecordCorrection');
        expect(copyText).not.toContain('supplementRequestTracked');
    });


    it('uses tablet feature geometry status values and lets desktop update them', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureGeometryEditStatus: 'needsAerialAlignment'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [feature] })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureGeometryEditStatus')
        ] as any;

        expect(component.getStatusChips()).toContainEqual({
            label: '보정 필요',
            tone: 'warning'
        });
        expect(component.canShowFeatureGeometryStatusActions()).toBe(true);
        expect(component.getFeatureGeometryStatusActions().map(action => action.value)).toEqual([
            'roughSketch',
            'needsAerialAlignment',
            'adjustedToAerialLayer',
            'adjustedToSurveyLine',
            'finalAccepted'
        ]);
        expect(component.isFeatureGeometryStatusActive('needsAerialAlignment')).toBe(true);

        component.setFeatureGeometryEditStatus('adjustedToAerialLayer');

        expect(feature.resource.featureGeometryEditStatus).toBe('adjustedToAerialLayer');
        expect(handleChanged).toHaveBeenCalledTimes(1);
        expect(component.getStatusChips()).toContainEqual({
            label: '드론 배경 맞춤',
            tone: 'success'
        });
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


    it('projects tablet feature placement against the actual survey boundary on desktop', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            featureLocationSketch: JSON.stringify({
                version: 1,
                shape: 'oval',
                center: { x: 64, y: 42 },
                points: [{ x: 64, y: 42 }],
                rotation: 15,
                scale: 120
            }),
            featureRecordingStatus: 'investigating'
        });
        const boundary = createDocument('boundary-1', 'SurveyBoundary', '경계', {}, {
            geometry: {
                type: 'LineString',
                coordinates: [
                    [0, 0],
                    [20, 0],
                    [10, 10],
                    [0, 5],
                    [0, 0]
                ]
            }
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [boundary, feature] })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        const preview = component.getFeatureLocationSketchPreview()!;

        expect(preview.location.boundaryPath).toBe(
            'M 22.6 63 L 97.4 63 L 60 17 L 22.6 40 Z'
        );
        expect(preview.location.boundaryPath).not.toBe('M 8 8 H 112 V 72 H 8 Z');
        expect(preview.location.ellipse).toEqual(expect.objectContaining({
            cx: 74.6,
            cy: 34.9,
            transform: 'rotate(15 74.6 34.9)'
        }));
    });


    it('uses desktop polygon geometry as a feature placement preview when tablet sketch JSON is missing', () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [0, 0],
                    [20, 0],
                    [10, 10],
                    [0, 5],
                    [0, 0]
                ]]
            },
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

        expect(preview.location.emptyLabel).toBeUndefined();
        expect(preview.location.path).toBe('M 22.6 63 L 97.4 63 L 60 17 L 22.6 40 Z');
        expect(preview.shape.path).toBe('M 28 72 L 92 72 L 60 8 L 28 40 Z');
        expect(preview.location.points.map(point => point.label)).toEqual(['1', '2', '3', '4']);
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
        expect(template).toContain('map-reference-card');
        expect(template).toContain('shape-reference-card');
        expect(template).toContain('korean-fieldwork-record-context-geometry-status');
        expect(template).toContain('setFeatureGeometryEditStatus(action.value)');
        expect(template).toContain('조사 경계 위 배치');
        expect(template).not.toContain('지도처럼 위에서 보기');
        expect(template).not.toContain('위성지도식 평면');
        expect(template).not.toContain('평면 배치 지도');
        expect(template).toContain('satellite-field');
        expect(template).toContain('satellite-road');
        expect(styles).toContain('.flat-map-surface');
        expect(styles).toContain('.satellite-field');
        expect(styles).toContain('.satellite-road');
        expect(styles).toContain('.flat-map-grid path');
        expect(styles).toContain('.flat-map-badge text');
        expect(styles).toContain('grid-template-columns: minmax(360px, 1.75fr) minmax(230px, 0.85fr);');
        expect(styles).toContain('height: clamp(220px, 30vh, 360px);');
        expect(styles).toContain('shape-reference-card .korean-fieldwork-record-context-feature-sketch-svg');
        expect(styles).toContain('.korean-fieldwork-record-context-geometry-status-button');
        expect(styles).not.toContain('height: 148px;');
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
            description: '동쪽 확장 구간 표토 제거 후 원형 수혈 2기 윤곽 확인.',
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
        expect(summary.workMemoLabel).toBe('작업 메모 동쪽 확장 구간 표토 제거 후 원형 수혈 2기 윤곽 확인.');
        expect(summary.boundaryMemoLabel).toBe('경계 메모 없음');
        expect(summary.boundaryMemoImportedAtLabel).toBe('경계 가져옴 2026-06-30');
        expect(summary.workMemoUpdatedAtLabel).toBe('작업일지 수정 2026-06-30');
        expect(summary.hasSafetyComplete).toBe(false);
        expect(summary.hasBoundaryMemo).toBe(false);
        expect(summary.hasWorkMemo).toBe(true);
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
        expect(template).toContain('dailyJournalSummary.workMemoLabel');
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


    it('shows tablet find spot points on opened desktop find records', async () => {

        const find = createDocument('find-1', 'Find', 'FIND1', {}, {
            findSpotItems: JSON.stringify({
                version: 1,
                items: [
                    { number: 1, point: { x: 25, y: 75 }, label: 'bronze fragment' },
                    { number: 2, point: { x: 40, y: 60 }, label: 'rim sherd' }
                ]
            }),
            findSpotItemsUpdatedAt: '2026-07-10T08:15:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [find] })
        });
        component.document = find as any;
        component.fieldDefinitions = [
            field('findSpotItems')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'findSpotItems', label: '\ucd9c\ud1a0 \uc704\uce58\uc810', count: 2, canCreate: false }
        ]));
        expect(component.hasFindSpotPreview()).toBe(true);
        expect(component.getFindSpotPreview()).toEqual({
            points: [
                {
                    label: '1',
                    text: '1\ubc88 25%/75% bronze fragment',
                    x: 34,
                    y: 56
                },
                {
                    label: '2',
                    text: '2\ubc88 40%/60% rim sherd',
                    x: 49.6,
                    y: 46.4
                }
            ],
            summary: '\ucd9c\ud1a0 \uc704\uce58\uc810 2',
            title: '\ucd9c\ud1a0 \uc704\uce58\uc810',
            updatedAt: '2026-07-10',
            viewBox: '0 0 120 80'
        });
        expect(component.getReportHandoffItem()?.copyText)
            .toContain('1\ubc88 25%/75% bronze fragment');
        expect(component.getReportHandoffItem()?.copyText)
            .toContain('2\ubc88 40%/60% rim sherd');
        expect(component.getReportHandoffItem()?.copyText).not.toContain('"items"');
    });


    it('labels tablet sample spot points as collection locations on desktop', async () => {

        const sample = createDocument('sample-1', 'Sample', 'SAMPLE1', {}, {
            findSpotItems: JSON.stringify({
                version: 1,
                items: [
                    { number: 1, point: { x: 15, y: 35 }, label: 'charcoal sample' }
                ]
            }),
            findSpotItemsUpdatedAt: '2026-07-10T08:30:00.000Z'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [sample] })
        });
        component.document = sample as any;
        component.fieldDefinitions = [
            field('findSpotItems')
        ] as any;

        await component.ngOnChanges();

        expect(component.getEvidenceMetrics()).toEqual(expect.arrayContaining([
            { id: 'findSpotItems', label: '\ucc44\ucde8 \uc704\uce58\uc810', count: 1, canCreate: false }
        ]));
        expect(component.getFindSpotPreview()).toEqual({
            points: [
                {
                    label: '1',
                    text: '1\ubc88 15%/35% charcoal sample',
                    x: 23.6,
                    y: 30.4
                }
            ],
            summary: '\ucc44\ucde8 \uc704\uce58\uc810 1',
            title: '\ucc44\ucde8 \uc704\uce58\uc810',
            updatedAt: '2026-07-10',
            viewBox: '0 0 120 80'
        });
        expect(component.getReportHandoffItem()?.copyText)
            .toContain('1\ubc88 15%/35% charcoal sample');
    });


    it('keeps the tablet find and sample spot preview section in the desktop record context template', () => {

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

        expect(template).toContain('getFindSpotPreview() as findSpotPreview');
        expect(template).toContain('\ud0dc\ube14\ub9bf \uc720\ubb3c\u00b7\uc2dc\ub8cc \uc704\uce58\uc810 \ubbf8\ub9ac\ubcf4\uae30');
        expect(template).toContain('findSpotPreview.points');
        expect(styles).toContain('.korean-fieldwork-record-context-find-spots-svg');
        expect(styles).toContain('.find-spot-item circle');
    });


    it('summarizes tablet media review values on opened desktop photo records', async () => {

        const photo = createDocument('photo-1', 'Photo', 'P1', {}, {
            mediaEvidenceRole: ['fieldResultRecord'],
            mediaQualityCheck: [
                'resolutionOrLineworkReadable',
                'focusBlurred'
            ],
            reportCrossCheck: ['photoRegister']
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [photo] })
        });
        component.document = photo as any;
        component.fieldDefinitions = [
            checkboxesField('mediaEvidenceRole'),
            checkboxesField('mediaQualityCheck'),
            checkboxesField('reportCrossCheck')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            {
                label: '미디어 역할 현장결과 기록 / 품질 해상도·선명도 적정·초점 흔들림 / 보고 사진대장',
                tone: 'warning'
            }
        ]);
    });


    it('shows confirmed tablet image uploads on opened desktop photo records', async () => {

        const photo = createDocument('photo-1', 'Photo', 'P1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
            digitalSourcePreservation: ['originalPhoto', 'originalImage', 'webOrServerBackup', 'backupVerified'],
            fieldworkImageUploadStatus: 'uploaded',
            fieldworkImageUploadedAt: '2026-06-23T01:03:00.000Z',
            fieldworkImageUploadedUri: 'file:///tablet/photos/photo-1.jpg',
            fieldworkImageUploadTarget: 'https://field.example/files/fieldwork/photo-1?type=original_image',
            fieldworkImageUploadedProject: 'fieldwork',
            fieldworkImageUploadedSizeBytes: 481516,
            fieldworkImageUploadedMd5: 'tablet-md5',
            fieldworkImageStoredSizeBytes: 481516,
            fieldworkImageStoredMd5: 'tablet-md5',
            fieldworkImageStoredSha256: 'server-sha256'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [photo] })
        });
        component.document = photo as any;
        component.fieldDefinitions = [
            field('fieldworkImageUploadStatus'),
            field('fieldworkImageUploadedAt')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '백업 업로드 확인 · 2026-06-23 · SHA256', tone: 'success' }
        ]);
    });


    it('warns when tablet image uploads still need confirmation on desktop media records', async () => {

        const photo = createDocument('photo-1', 'Photo', 'P1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({ documents: [photo] })
        });
        component.document = photo as any;
        component.fieldDefinitions = [
            field('fieldworkImageUploadStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.shouldShow()).toBe(true);
        expect(component.getStatusChips()).toEqual([
            { label: '백업 확인 필요', tone: 'warning' }
        ]);
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
            { label: '조사 시굴·표본조사', tone: 'info' },
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
            soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
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
            detail: 'SP1 · 먼셀 후보 10YR 4/3, 7.5YR 4/3 · 1층: RGB 111/87/61 @ 20%/50%',
            appendText: [
                '[토층사진 SP1]',
                '토색 후보: 10YR 4/3, 7.5YR 4/3',
                '샘플 위치: 1층: RGB 111/87/61 @ 20%/50%',
                '토색 번호: 1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                '토색 메모: 조명 보정 필요.',
                '촬영 조건: 오전 확산광.'
            ].join('\n')
        });
        expect(insight.sketchPreview).toEqual({
            label: '\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58 1\uce35 20%/50%',
            path: 'M 20 36 H 28 M 24 32 V 40',
            viewBox: '0 0 120 72'
        });
        expect(component.canApplyEvidenceInsight(insight)).toBe(true);
        expect(component.getEvidenceInsightApplyTargetLabel(insight)).toBe('설명');

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('기존 토층 관찰.');
        expect(feature.resource.description).toContain('[토층사진 SP1]');
        expect(feature.resource.description).toContain('토색 후보: 10YR 4/3, 7.5YR 4/3');
        expect(feature.resource.description).toContain('샘플 위치: 1층: RGB 111/87/61 @ 20%/50%');
        expect(feature.resource.description).toContain('토색 번호: 1: 10YR 4/3 RGB 111/87/61 @ 20%/50%');
        expect(feature.resource.description)
            .not.toContain('샘플 위치: 사진 선택 지점 20%/50% 평균 RGB 111/87/61');
        expect(feature.resource.description).toContain('토색 메모: 조명 보정 필요.');
        expect(feature.resource.description).toContain('촬영 조건: 오전 확산광.');
        expect(feature.resource.description.match(/\[토층사진 SP1\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('shows tablet soil-photo color sample points on swatch-only evidence', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1');
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfileColorSwatches: [
                '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                '2: 2.5Y 5/3 RGB 139/128/88 @ 80%/45%'
            ].join('\n')
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, soilProfilePhoto]
            })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            textField('description', '\uc124\uba85')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            id: 'soilColorSwatches:soil-photo-1',
            sketchPreview: {
                label: '\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58 2\uc810',
                path: 'M 20 36 H 28 M 24 32 V 40 M 92 32.4 H 100 M 96 28.4 V 36.4',
                viewBox: '0 0 120 72'
            }
        });
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


    it('appends linked tablet PenMemo handwriting evidence to the current record narrative once', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '기존 유구 설명.'
        });
        const memo = createDocument('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            penMemoReviewedTranscript: '[관찰 내용] 북쪽 교란 경계 약도.',
            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}'
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
            field('featureRecordingStatus'),
            textField('description', '설명')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            appendText: [
                '[메모 M1 손글씨]',
                '손글씨 원본: 스케치 메모 1획/2점.',
                '검토 필사: [관찰 내용] 북쪽 교란 경계 약도.'
            ].join('\n'),
            id: 'penMemoSketch:memo-1',
            label: '야장 스케치',
            tone: 'info'
        });
        expect(component.canApplyEvidenceInsight(insight)).toBe(true);

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('기존 유구 설명.');
        expect(feature.resource.description).toContain('[메모 M1 손글씨]');
        expect(feature.resource.description).toContain('손글씨 원본: 스케치 메모 1획/2점.');
        expect(feature.resource.description).toContain('검토 필사: [관찰 내용] 북쪽 교란 경계 약도.');
        expect(feature.resource.description).not.toContain('"strokes"');
        expect(feature.resource.description.match(/\[메모 M1 손글씨\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
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


    it('shows tablet soil-photo layer number markers in the record context evidence', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1');
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfileLayerMarkers: JSON.stringify([
                { x: 20, y: 50, label: '1' },
                { x: 80, y: 45, label: '2' }
            ])
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, soilProfilePhoto]
            })
        });
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus')
        ] as any;

        await component.ngOnChanges();

        expect(component.getEvidenceInsights()).toEqual([
            {
                id: 'soilLayerMarkers:soil-photo-1',
                label: '\uce35 \ubc88\ud638 \ud45c\uc2dc',
                detail: 'SP1 \u00b7 \uce35 \ubc88\ud638 \uc704\uce58 2\uc810',
                sketchPreview: {
                    label: '\uce35 \ubc88\ud638 \uc704\uce58 2\uc810',
                    path: 'M 20 36 H 28 M 24 32 V 40 M 92 32.4 H 100 M 96 28.4 V 36.4',
                    texts: [
                        { text: '1', x: 24, y: 29 },
                        { text: '2', x: 96, y: 25.4 }
                    ],
                    viewBox: '0 0 120 72'
                },
                tone: 'info'
            }
        ]);
    });


    it('shows tablet drawing sketch previews and appends a desktop narrative summary once', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '\uae30\uc874 \uc720\uad6c \uc124\uba85.'
        });
        const drawing = createDocument('drawing-1', 'Drawing', 'D1', {
            depicts: ['feature-1']
        }, {
            description: '\ub3d9\ucabd \ubcbd\uba74 \ud3c9\uba74\ub3c4 \ubcf4\uc815\uc120.',
            drawingSketchStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":50,"y":60}]}]}',
            fileUri: 'file:///tablet/drawings/pit-plan.png'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, drawing]
            })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            textField('description', '\uc124\uba85')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            id: 'drawingSketch:drawing-1',
            label: '\ub3c4\uba74 \uc2a4\ucf00\uce58',
            detail: 'D1 \u00b7 \ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58 1\ud68d/2\uc810',
            sketchPreview: {
                label: '\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58 1\ud68d/2\uc810',
                path: 'M 32 8 L 88 64',
                viewBox: '0 0 120 72'
            },
            appendText: [
                '[\ub3c4\uba74 D1]',
                '\uc2a4\ucf00\uce58 \uc694\uc57d: \ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58 1\ud68d/2\uc810',
                '\ub3c4\uba74 \uc124\uba85: \ub3d9\ucabd \ubcbd\uba74 \ud3c9\uba74\ub3c4 \ubcf4\uc815\uc120.',
                '\uc6d0\ubcf8: file:///tablet/drawings/pit-plan.png'
            ].join('\n')
        });
        expect(component.canApplyEvidenceInsight(insight)).toBe(true);

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('\uae30\uc874 \uc720\uad6c \uc124\uba85.');
        expect(feature.resource.description).toContain('[\ub3c4\uba74 D1]');
        expect(feature.resource.description).toContain(
            '\uc2a4\ucf00\uce58 \uc694\uc57d: \ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58 1\ud68d/2\uc810'
        );
        expect(feature.resource.description.match(/\[\ub3c4\uba74 D1\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
    });


    it('shows tablet drawing survey checks and appends a desktop narrative summary once', async () => {

        const feature = createDocument('feature-1', 'Feature', 'F1', {}, {
            description: '\uae30\uc874 \ub3c4\uba74 \uc124\uba85.'
        });
        const drawing = createDocument('drawing-1', 'Drawing', 'D1', {
            depicts: ['feature-1']
        }, {
            description: '\ub3d9\ucabd \ubcbd\uba74 \uc2e4\uce21 \ub3c4\uba74.',
            drawingSurveyMethods: ['handMeasured', 'threeDMeasured'],
            drawingThreeDDevices: ['drone'],
            drawingSurveyStages: ['afterCompletion'],
            fileUri: 'file:///tablet/drawings/pit-plan.png'
        });
        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [feature, drawing]
            })
        });
        const handleChanged = jest.fn();
        component.onChanged.subscribe(handleChanged);
        component.document = feature as any;
        component.fieldDefinitions = [
            field('featureRecordingStatus'),
            textField('description', '\uc124\uba85')
        ] as any;

        await component.ngOnChanges();

        const [insight] = component.getEvidenceInsights();
        expect(insight).toMatchObject({
            id: 'drawingSurvey:drawing-1',
            label: '\ub3c4\uba74 \uc2e4\uce21',
            detail: 'D1 \u00b7 \uc2e4\uce21 \ubc29\uc2dd: \uc190\uc2e4\uce21\u00b73D \uc2e4\uce21 / 3D \uc7a5\ube44: \ub4dc\ub860 / \uc2e4\uce21 \ub2e8\uacc4: \uc870\uc0ac \uc644\ub8cc',
            appendText: [
                '[\ub3c4\uba74 D1 \uc2e4\uce21]',
                '\ub3c4\uba74 \uc2e4\uce21: \uc2e4\uce21 \ubc29\uc2dd: \uc190\uc2e4\uce21\u00b73D \uc2e4\uce21 / 3D \uc7a5\ube44: \ub4dc\ub860 / \uc2e4\uce21 \ub2e8\uacc4: \uc870\uc0ac \uc644\ub8cc',
                '\ub3c4\uba74 \uc124\uba85: \ub3d9\ucabd \ubcbd\uba74 \uc2e4\uce21 \ub3c4\uba74.',
                '\uc6d0\ubcf8: file:///tablet/drawings/pit-plan.png'
            ].join('\n')
        });
        expect(component.canApplyEvidenceInsight(insight)).toBe(true);

        component.applyEvidenceInsight(insight);
        component.applyEvidenceInsight(insight);

        expect(feature.resource.description).toContain('\uae30\uc874 \ub3c4\uba74 \uc124\uba85.');
        expect(feature.resource.description).toContain('[\ub3c4\uba74 D1 \uc2e4\uce21]');
        expect(feature.resource.description).toContain(
            '\ub3c4\uba74 \uc2e4\uce21: \uc2e4\uce21 \ubc29\uc2dd: \uc190\uc2e4\uce21\u00b73D \uc2e4\uce21'
        );
        expect(feature.resource.description.match(/\[\ub3c4\uba74 D1 \uc2e4\uce21\]/g)).toHaveLength(1);
        expect(handleChanged).toHaveBeenCalledTimes(1);
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


    it('keeps desktop record actions in the first context rail before review sections', () => {

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

        const chipsIndex = template.indexOf('korean-fieldwork-record-context-chips');
        const actionIndex = template.indexOf('primary-action-rail');
        const featureSketchIndex = template.indexOf('korean-fieldwork-record-context-feature-sketch');
        const evidenceIndex = template.indexOf('korean-fieldwork-record-context-evidence');

        expect(actionIndex).toBeGreaterThan(chipsIndex);
        expect(actionIndex).toBeLessThan(featureSketchIndex);
        expect(actionIndex).toBeLessThan(evidenceIndex);
        expect(template).toContain('class="korean-fieldwork-record-context-actions primary-action-rail"');
        expect(template).toContain('class="korean-fieldwork-record-context-actions empty primary-action-rail"');
        expect(styles).toContain('.korean-fieldwork-record-context-actions.primary-action-rail');
        expect(styles).toContain('background: #f7fbf8;');
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
