jest.mock('src/app/electron/electron', () => ({
    electronFs: { promises: {} },
    electronIpc: undefined,
    electronPath: { sep: '/' },
    electronRemote: undefined
}), { virtual: true });
jest.mock('../../../../src/app/services/menu-modal-launcher', () => ({
    MenuModalLauncher: jest.fn()
}));

import { Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import {
    KoreanFieldworkPriorityStripComponent
} from '../../../../src/app/components/resources/korean-fieldwork-priority-strip.component';
import {
    getKoreanFieldworkFeatureTypeLabel,
    getKoreanFieldworkRecordFieldValueSummary
} from 'idai-field-core';


describe('KoreanFieldworkPriorityStripComponent', () => {

    it('labels the selected record panel without workbench jargon', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../src/app/components/resources/korean-fieldwork-priority-strip.html'
            ),
            'utf8'
        );

        const legacyWorkbenchLabel = ['선택 기록', '작업대'].join(' ');

        expect(template).toContain('선택한 기록');
        expect(template).not.toContain(legacyWorkbenchLabel);
    });


    it('shows priority issues for Korean fieldwork projects', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-1', 'Feature', {
                        featureRecordingStatus: 'confirmed',
                        featureInvestigationChecklist: []
                    })
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();

        expect(component.shouldShow()).toBe(true);
        expect(component.hasPriorityIssues()).toBe(true);
        expect(component.getPriorityIssues()).toEqual([
            expect.objectContaining({
                documentId: 'feature-1',
                identifier: 'feature-1',
                severity: 'warning',
                recommendedAction: '현장 마감 전 완료 사진을 남겼는지 확인하세요.'
            })
        ]);
        expect(component.getSummaryLabel()).toBe('일지 0 · 경계 0 · 유구 후보 0 · 확인 1');
        expect(component.getIssueBreakdownLabel()).toBe('필수 0 · 보완 1 · 참고 0');
        expect(component.getStatusLabel()).toBe('보완 필요');
        expect(component.getStatusTone()).toBe('warning');
        expect(component.getScopeSummary()).toMatchObject({
            title: '조사 방식 미정',
            structureCount: 1,
            issueCount: 1,
            actionLabel: '프로젝트 정보'
        });
        expect(component.getScopeMetricLabel()).toBe('현장 기록 1 · 자료 0 · 일지·점검 0 · 확인 1');
        expect(component.getCloseoutSummary()).toMatchObject({
            status: 'needsReview',
            title: '마감 전 확인',
            counts: { critical: 0, warning: 1, info: 0 }
        });
        expect(component.getCloseoutCountsLabel()).toBe('필수 0 · 보완 1 · 참고 0');
        expect(component.getCloseoutIssues()[0]).toMatchObject({
            documentId: 'feature-1',
            ruleId: 'feature-complete-photo'
        });
        expect(component.hasCloseoutBatchUpdates()).toBe(true);
        expect(component.getCloseoutBatchUpdateCount()).toBe(1);
        expect(component.getCloseoutBatchDocumentCount()).toBe(1);
        expect(component.getWorkflowSteps().map(step => [step.id, step.status])).toEqual([
            ['project', 'done'],
            ['mode', 'current'],
            ['boundary', 'todo'],
            ['operation', 'todo'],
            ['targets', 'done'],
            ['recording', 'todo']
        ]);
        expect(component.getWorkflowSteps()[1].actionLabel).toBe('선택');
        expect(component.getWorkflowSteps()[2].actionLabel).toBe('지도');
        expect(component.getWorkflowSteps()[2].secondaryActionLabel).toBe('가져오기');
        expect(component.getWorkflowSteps()[3].actionLabel).toBe('지도');
        expect(component.hasProgressItems()).toBe(true);
        expect(component.getProgressItems()[0]).toMatchObject({
            documentId: 'feature-1',
            stage: '보완',
            tone: 'warning'
        });
        expect(component.hasUnitMatrixItems()).toBe(true);
        expect(component.getUnitMatrixItems()[0]).toMatchObject({
            documentId: 'feature-1',
            categoryLabel: '유구',
            issueCount: 1,
            tone: 'warning'
        });
        expect(component.hasFeatureOverviewItems()).toBe(true);
        expect(component.getFeatureOverviewItems()[0]).toMatchObject({
            documentId: 'feature-1',
            statusLabel: '보완 필요',
            evidenceLabel: '없음',
            nextActionLabel: '보완 항목 확인'
        });
        expect(component.hasWorkbenchItems()).toBe(true);
        expect(component.getWorkbenchItems()[0]).toMatchObject({
            documentId: 'feature-1',
            categoryLabel: '유구',
            tone: 'warning'
        });
        expect(component.getWorkbenchItems()[0].reasons).toContain('확인 1');
        expect(component.hasRecordWorkFilterCounts()).toBe(true);
        expect(component.getRecordWorkFilters().map(filter => [
            filter.label,
            component.getRecordWorkFilterCount(filter)
        ])).toEqual([
            ['전체', 1],
            ['확인 필요', 1],
            ['조사 중', 0],
            ['자료 보강', 1],
            ['오늘 작성', 0]
        ]);
    });


    it('shows project status even when there are no priority issues', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-candidate-1', 'Feature', {
                        featureRecordingStatus: 'candidate'
                    })
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();

        expect(component.shouldShow()).toBe(true);
        expect(component.hasPriorityIssues()).toBe(false);
        expect(component.getPriorityIssues()).toEqual([]);
        expect(component.getSummaryLabel()).toBe('일지 0 · 경계 0 · 유구 후보 1 · 확인 0');
        expect(component.getIssueBreakdownLabel()).toBe('우선 확인 없음');
        expect(component.getStatusLabel()).toBe('조사 진행');
        expect(component.getStatusTone()).toBe('info');
        expect(component.getCloseoutSummary()).toMatchObject({
            status: 'clear',
            title: '마감 가능'
        });
    });


    it('exposes report handoff copy blocks for HWP drafting', async () => {

        const write = jest.fn();
        const writeText = jest.fn();
        const clear = jest.fn();
        const testWindow = (global as any).window ?? ((global as any).window = {});
        const previousRequire = testWindow.require;
        testWindow.require = jest.fn().mockReturnValue({ clipboard: { clear, write, writeText } });

        try {
            const featureTypeLabel = getKoreanFieldworkFeatureTypeLabel('pit');
            const component = createComponent({
                find: jest.fn().mockResolvedValue({
                    documents: [
                        createDocument('project', 'Project'),
                        createDocument('feature-1', 'Feature', {
                            identifier: 'pit-001',
                            shortDescription: 'round pit with dark fill',
                            featureType: 'pit',
                            featureInterpretationType: ['pitFeature'],
                            period: 'bronzeAge',
                            geometrySource: 'gpsApproximate',
                            geometryConfidence: 'rough',
                            featureGeometryEditStatus: 'roughSketch',
                            featureLocationSketch: '{"shape":"oval","center":{"x":75,"y":50},"scale":80}',
                            featureFreeDrawingStrokes:
                                '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}',
                            surveyBoundaryAccuracy: 'importedReference',
                            surveyBoundarySource: 'shpImport',
                            fieldNote: [
                                '[\uad00\ucc30 \ub0b4\uc6a9] \ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.',
                                '[\ud574\uc11d] \uc8fc\uacf5 \uac00\ub2a5\uc131.',
                                '[\ub2e4\uc74c \uc791\uc5c5] \ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.',
                                '[\uadfc\uac70 \ubc88\ud638] \uc0ac\uc9c4 12, \ub3c4\uba74 3',
                                '[\uc190\uadf8\ub9bc \uc88c\ud45c] {"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}'
                            ].join('\n'),
                            featureRecordingStatus: 'confirmed',
                            recordCreationTiming: 'sameDayFieldRecord',
                            fieldRecordQuality: ['immediateRecording'],
                            verificationState: 'observedInField',
                            fieldOnlyMissingCheck: [
                                'stratigraphicBoundary',
                                'photoAngleAndScale'
                            ],
                            firstExposureRecord: [
                                'firstExposurePhoto',
                                'featureLineVisible',
                                'confirmedBeforeInternalExcavation'
                            ],
                            featureInvestigationChecklist: [
                                'findsRecovered',
                                'preInvestigationPhotoTaken',
                                'soilProfilePhotoLinked'
                            ]
                        }),
                        createDocument('photo-1', 'Photo', {
                            fieldworkPhotoUri: 'file:///tablet/photos/pit-001.jpg',
                            originalFilename: 'pit-001.jpg',
                            fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                            width: 4032,
                            height: 3024,
                            fieldworkPhotoAnnotationStrokes:
                                '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}',
                            relations: { depicts: ['feature-1'] }
                        }),
                        createDocument('soil-photo-1', 'SoilProfilePhoto', {
                            soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                            originalFilename: 'soil-photo-1.jpg',
                            soilProfilePhotoCapturedAt: '2026-06-23T02:03:04.000Z',
                            width: 3000,
                            height: 2000,
                            soilProfilePhotoAnnotationStrokes:
                                '{"version":1,"strokes":[{"points":[{"x":20,"y":30}]}]}',
                            soilProfileAnnotationStrokes:
                                '{"version":1,"strokes":[{"points":[{"x":15,"y":40},{"x":70,"y":45}]}]}',
                            soilProfileLayerMarkers: '[{"x":20,"y":50,"label":"1"}]',
                            soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                            soilColorAssistCandidates: [
                                '\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 20%/50% \ud3c9\uade0 RGB 111/87/61',
                                '1: 10YR 4/3 (\ubcf4\ud1b5, \ucc28\uc774 0.0)'
                            ].join('\n'),
                            relations: { depicts: ['feature-1'] }
                        }),
                        createDocument('drawing-1', 'Drawing', {
                            drawingSketchStrokes:
                                '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":50,"y":60}]}]}',
                            relations: { depicts: ['feature-1'] }
                        }),
                        createDocument('memo-handwritten', 'PenMemo', {
                            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}',
                            penMemoTranscriptionStatus: 'pending',
                            relations: { depicts: ['feature-1'] }
                        }),
                        createDocument('find-1', 'Find', {
                            identifier: 'find-001',
                            findSpotDescription: 'pit floor, east edge',
                            findSampleResearchScope: ['reportIncludedArtifact'],
                            artifactHandlingWorkflow: ['fieldCollection'],
                            artifactLabelRegisterLink: ['labelCreated'],
                            surfaceFindHandlingRecord: ['gpsLatLongRecorded'],
                            chanceFindProvenance: ['residentReport'],
                            relations: { isPresentIn: ['feature-1'] }
                        }),
                        createDocument('sample-1', 'Sample', {
                            identifier: 'sample-001',
                            sampleType: 'charcoal',
                            samplePurpose: ['absoluteDating'],
                            sampleCollectionHandling: ['lightShielded'],
                            archaeomagneticSampleContext: ['hearth'],
                            organicSoilAnalysisSample: ['interiorSoil'],
                            archaeobotanySampleDesign: ['amsCandidate'],
                            relations: { isPresentIn: ['feature-1'] }
                        }),
                        createDocument('quality-review-1', 'FieldRecordQualityReview', {
                            identifier: 'quality-001',
                            reviewedRecordUnit: ['featureRecord', 'dailyLog'],
                            qualityReviewStage: ['sameDayReview', 'sourceRecordCorrection'],
                            qualityCorrectionBasis: ['correctionReasonLinked', 'originalRecordPreserved'],
                            recordCreationTiming: 'sameDayFieldRecord',
                            fieldRecordQuality: ['correctionNeeded'],
                            reportCrossCheck: ['manuscript', 'photoRegister'],
                            reportEvaluationFeedback: ['fieldRecordReview', 'supplementRequestTracked'],
                            verificationState: 'needsRecheck',
                            relations: { isRecordedIn: ['operation-1'] }
                        }),
                        createDocument('daily-log-1', 'DailyLog', {
                            identifier: '2026-06-30',
                            date: '2026-06-30',
                            dailyLogInvestigatorCount: 2,
                            dailyLogLaborerCount: 4,
                            dailyLogWorkerCount: 6,
                            dailyLogEquipmentCount: 1,
                            dailyLogEquipmentSize: '0.6m3',
                            dailyLogSafetyEducationPhoto: true,
                            dailyLogSafetyEducationStretching: false,
                            dailyLogContent: JSON.stringify([
                                'strippingProgress',
                                'workArea',
                                'photoDrawingNumbers'
                            ]),
                            dailyLogEvidenceRole: ['sameDayFactRecord'],
                            dailyLogReview: ['sameDayWritten', 'reviewerChecked'],
                            dailyLogBoundaryMemoImportedAt: '2026-06-30T08:30:00.000Z',
                            dailyLogBoundaryMemoUpdatedAt: '2026-06-30T09:15:00.000Z',
                            dailyLogWorkMemoUpdatedAt: '2026-06-30T10:15:00.000Z',
                            dailyLogBoundaryMemoStrokes:
                                '{"version":1,"strokes":[{"points":[{"x":1200,"y":2200},{"x":3200,"y":4200}]}]}'
                        })
                    ]
                }),
                get: jest.fn()
            });

            await component.refresh();

            expect(component.getPanelOptions().map(panel => panel.id)).toContain('report');
            expect(component.hasReportHandoffItems()).toBe(true);
            expect(component.getReportHandoffSummaryLabel()).toContain('9');

            const [featureItem] = component.getReportHandoffItems();
            expect(featureItem).toMatchObject({
                documentId: 'feature-1',
                identifier: 'pit-001',
                summary: 'round pit with dark fill',
                evidenceCount: 6,
                tone: 'review'
            });
            expect(component.getReportHandoffPreviewItem()?.documentId).toBe('feature-1');
            expect(component.isReportHandoffItemSelected(featureItem)).toBe(true);
            expect(featureItem.details.join('\n'))
                .toContain('\uc704\uce58 \uc57d\ub3c4: \uc788\uc74c');
            expect(featureItem.details.join('\n'))
                .toContain('\uc790\uc720 \uc2a4\ucf00\uce58: \uc788\uc74c');
            expect(featureItem.details.join('\n'))
                .toContain('GPS \ub300\ub7b5 \uc704\uce58');
            expect(featureItem.details.join('\n'))
                .toContain('SHP \uac00\uc838\uc624\uae30');
            expect(featureItem.details.join('\n'))
                .toContain(`\uc131\uaca9: ${featureTypeLabel}`);
            expect(featureItem.details.join('\n'))
                .toContain('\uc2dc\ub300: \uccad\ub3d9\uae30');
            expect(featureItem.details.join('\n'))
                .toContain(
                    '\uc870\uc0ac \uc0c1\ud0dc: '
                    + '\uc720\uad6c \uc9c4\ud589: \uc644\ub8cc, '
                    + '\uae30\ub85d \uc2dc\uc810: \ub2f9\uc77c \uae30\ub85d, '
                    + '\uae30\ub85d \uad6c\ubd84: \ud604\uc7a5 \uae30\ub85d, '
                    + '\ud655\uc778 \uc0c1\ud0dc: \ud604\uc7a5 \ud655\uc778, '
                    + '\ud604\uc7a5\uc2dc\uc810 \ub204\ub77d\uc810\uac80: '
                    + '\uce35 \uacbd\uacc4 \ud655\uc778 \u00b7 \uc0ac\uc9c4 \uac01\ub3c4\u00b7\uc2a4\ucf00\uc77c, '
                    + '\ucd5c\ucd08 \ub178\ucd9c \uae30\ub85d: '
                    + '\ucd5c\ucd08 \ub178\ucd9c \uc0ac\uc9c4 \u00b7 '
                    + '\uc720\uad6c\uc120 \uac00\uc2dc \u00b7 \ub0b4\ubd80\uc870\uc0ac \uc804 \ud655\uc815'
                );
            expect(featureItem.details.join('\n'))
                .toContain(
                    '\uc870\uc0ac \ub2e8\uacc4 \ud655\uc778: '
                    + '\uc870\uc0ac \uc804 \uc0ac\uc9c4 \u00b7 \ud1a0\uce35\uc0ac\uc9c4 \u00b7 \uc720\ubb3c \uc218\uc2b5'
                );
            expect(featureItem.details.join('\n'))
                .toContain('\ud604\uc7a5\uba54\ubaa8: \uad00\ucc30: \ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.');
            expect(featureItem.details.join('\n'))
                .toContain('\ub2e4\uc74c \uc791\uc5c5: \ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('file:///tablet/photos/pit-001.jpg');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc6d0\ubcf8 \ud30c\uc77c: pit-001.jpg');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ucd2c\uc601: 2026-06-23 01:02');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ud06c\uae30: 4032x3024');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc6d0\ubcf8 \ud30c\uc77c: soil-photo-1.jpg');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ucd2c\uc601: 2026-06-23 02:03');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ud06c\uae30: 3000x2000');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc0ac\uc9c4 \ud45c\uc2dc: \uc788\uc74c');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('RGB 111/87/61 @ 20%/50%');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ud1a0\uce35\uc120 \ud45c\uc2dc: \uc788\uc74c');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uce35 \ubc88\ud638 \ud45c\uc2dc: \uc788\uc74c');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: \uc788\uc74c');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc720\ubb3c find-001');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\ucd9c\ud1a0 \uc704\uce58: pit floor, east edge');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc720\ubb3c \uad00\ub9ac \uc808\ucc28: \ud604\uc7a5\uc218\uc2b5');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc9c0\ud45c \uc218\uc2b5\uc720\ubb3c \uad00\ub9ac: GPS \uc704\uacbd\ub3c4 \uae30\ub85d');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc2dc\ub8cc sample-001');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc2dc\ub8cc \ubaa9\uc801: \uc808\ub300\uc5f0\ub300');
            expect(featureItem.evidenceDetails.join('\n'))
                .toContain('\uc2dc\ub8cc \ucc44\ucde8\u00b7\ubcf4\uad00: \ube5b \ucc28\ub2e8');
            expect(featureItem.copyText)
                .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58');
            expect(featureItem.copyText)
                .toContain('1\uce35: RGB 111/87/61 @ 20%/50%');
            expect(featureItem.copyText)
                .toContain('\uc6d0\ubcf8 \ud30c\uc77c: pit-001.jpg');
            expect(featureItem.copyText)
                .toContain('\uc6d0\ubcf8 \ud30c\uc77c: soil-photo-1.jpg');
            expect(featureItem.copyText)
                .not.toContain('\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 20%/50% \ud3c9\uade0 RGB 111/87/61');
            expect(featureItem.copyText)
                .toContain('\ud544\uae30 \uc6d0\ubcf8: \uc788\uc74c');
            expect(featureItem.copyText)
                .toContain('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: \uc788\uc74c');
            expect(featureItem.copyText)
                .toContain('\uc720\ubb3c find-001');
            expect(featureItem.copyText)
                .toContain('\uc2dc\ub8cc sample-001');
            expect(featureItem.copyText)
                .not.toContain('reportIncludedArtifact');
            expect(featureItem.copyText)
                .not.toContain('absoluteDating');
            expect(featureItem.copyText)
                .toContain('\uc790\uc720 \uc2a4\ucf00\uce58: \uc788\uc74c');
            expect(featureItem.copyText)
                .toContain('GPS \ub300\ub7b5 \uc704\uce58');
            expect(featureItem.copyText)
                .toContain('SHP \uac00\uc838\uc624\uae30');
            expect(featureItem.copyText)
                .toContain(`\uc131\uaca9: ${featureTypeLabel}`);
            expect(featureItem.copyText)
                .toContain('\uc2dc\ub300: \uccad\ub3d9\uae30');
            expect(featureItem.copyText)
                .toContain('\uae30\ub85d \uc2dc\uc810: \ub2f9\uc77c \uae30\ub85d');
            expect(featureItem.copyText)
                .toContain('\uae30\ub85d \uad6c\ubd84: \ud604\uc7a5 \uae30\ub85d');
            expect(featureItem.copyText)
                .toContain(
                    '\ud604\uc7a5\uc2dc\uc810 \ub204\ub77d\uc810\uac80: '
                    + '\uce35 \uacbd\uacc4 \ud655\uc778 \u00b7 \uc0ac\uc9c4 \uac01\ub3c4\u00b7\uc2a4\ucf00\uc77c'
                );
            expect(featureItem.copyText)
                .toContain(
                    '\ucd5c\ucd08 \ub178\ucd9c \uae30\ub85d: '
                    + '\ucd5c\ucd08 \ub178\ucd9c \uc0ac\uc9c4 \u00b7 '
                    + '\uc720\uad6c\uc120 \uac00\uc2dc \u00b7 \ub0b4\ubd80\uc870\uc0ac \uc804 \ud655\uc815'
                );
            expect(featureItem.copyText)
                .toContain(
                    '\uc870\uc0ac \ub2e8\uacc4 \ud655\uc778: '
                    + '\uc870\uc0ac \uc804 \uc0ac\uc9c4 \u00b7 \ud1a0\uce35\uc0ac\uc9c4 \u00b7 \uc720\ubb3c \uc218\uc2b5'
                );
            expect(featureItem.copyText)
                .toContain('\uadfc\uac70 \ubc88\ud638: \uc0ac\uc9c4 12, \ub3c4\uba74 3');
            expect(featureItem.copyText)
                .not.toContain('preInvestigationPhotoTaken');
            expect(featureItem.copyText)
                .not.toContain('pitFeature');
            expect(featureItem.copyText)
                .not.toContain('sameDayFieldRecord');
            expect(featureItem.copyText)
                .not.toContain('immediateRecording');
            expect(featureItem.copyText)
                .not.toContain('observedInField');
            expect(featureItem.copyText)
                .not.toContain('stratigraphicBoundary');
            expect(featureItem.copyText)
                .not.toContain('photoAngleAndScale');
            expect(featureItem.copyText)
                .not.toContain('firstExposurePhoto');
            expect(featureItem.copyText)
                .not.toContain('featureLineVisible');
            expect(featureItem.copyText)
                .not.toContain('confirmedBeforeInternalExcavation');
            expect(featureItem.copyText)
                .not.toContain('bronzeAge');
            expect(featureItem.copyText)
                .not.toContain('gpsApproximate');
            expect(featureItem.copyText)
                .not.toContain('roughSketch');
            expect(featureItem.copyText)
                .not.toContain('importedReference');
            expect(featureItem.copyText)
                .not.toContain('shpImport');
            expect(featureItem.copyText)
                .not.toContain('"shape"');
            expect(featureItem.copyText)
                .not.toContain('"strokes"');
            expect(featureItem.copyText)
                .not.toContain('\uc190\uadf8\ub9bc \uc88c\ud45c');
            expect(featureItem.issueDetails.join('\n'))
                .toContain('\ud604\uc7a5\uc0ac\uc9c4 \uc6d0\ubcf8 \ubcf4\uc874 \uc0c1\ud0dc');
            expect(featureItem.copyText)
                .not.toContain('fieldwork-photo-upload-missing');
            expect(featureItem.copyText).toContain('pit-001');
            expect(featureItem.copyText).toContain('round pit with dark fill');
            expect(featureItem.copyText).toContain('\uc790\ub8cc \uc0c1\uc138');
            expect(featureItem.copyText).toContain('\ud655\uc778 \uc0c1\uc138');
            expect(featureItem.copySections.map(section => section.id)).toEqual([
                'summary',
                'details',
                'evidence',
                'issues'
            ]);
            expect(featureItem.copySections.find(section => section.id === 'summary')?.copyText)
                .toContain('[\uc720\uad6c] pit-001\r\n\uc694\uc57d: round pit with dark fill');
            expect(featureItem.copySections.find(section => section.id === 'evidence')?.copyText)
                .toContain('\uc790\ub8cc \uc0c1\uc138:\r\n- \uc0ac\uc9c4');
            expect(featureItem.copySections.find(section => section.id === 'issues')?.copyText)
                .toContain('\ud655\uc778 \uc0c1\uc138:\r\n- ');

            const photoItem = component.getReportHandoffItems()
                .find(item => item.documentId === 'photo-1');
            expect(photoItem).toBeDefined();
            expect(photoItem!.summary)
                .toContain('\uc6d0\ubcf8 \ud30c\uc77c: pit-001.jpg');
            expect(photoItem!.details.join('\n'))
                .toContain('\ucd2c\uc601: 2026-06-23 01:02');
            expect(photoItem!.relationDetails.join('\n'))
                .toContain('\ub300\uc0c1: [\uc720\uad6c] pit-001');
            expect(photoItem!.copyText)
                .toContain('\uc5f0\uacb0: \ub300\uc0c1: [\uc720\uad6c] pit-001');
            component.selectReportHandoffItem(photoItem!);
            expect(component.getReportHandoffPreviewItem()?.documentId).toBe('photo-1');

            const soilPhotoItem = component.getReportHandoffItems()
                .find(item => item.documentId === 'soil-photo-1');
            expect(soilPhotoItem).toBeDefined();
            expect(soilPhotoItem!.summary)
                .toContain('\uc6d0\ubcf8 \ud30c\uc77c: soil-photo-1.jpg');
            expect(soilPhotoItem!.copyText)
                .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%');

            const drawingItem = component.getReportHandoffItems()
                .find(item => item.documentId === 'drawing-1');
            expect(drawingItem).toBeDefined();
            expect(drawingItem!.summary)
                .toContain('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: \uc788\uc74c');

            expect(component.hasReportHandoffOverflow()).toBe(true);
            component.toggleReportHandoffItems();
            const qualityItem = component.getReportHandoffItems()
                .find(item => item.documentId === 'quality-review-1');
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
            expect(qualityItem).toBeDefined();
            expect(qualityItem!.summary).toContain(reviewedRecordUnit);
            expect(qualityItem!.summary).toContain(reviewStage);
            expect(qualityItem!.summary).toContain(correctionBasis);
            expect(qualityItem!.details.join('\n')).toContain(reviewedRecordUnit);
            expect(qualityItem!.details.join('\n')).toContain(reviewStage);
            expect(qualityItem!.details.join('\n')).toContain(correctionBasis);
            expect(qualityItem!.details.join('\n')).toContain(reportCrossCheck);
            expect(qualityItem!.details.join('\n')).toContain(reportFeedback);
            expect(qualityItem!.copyText).toContain(reviewedRecordUnit);
            expect(qualityItem!.copyText).toContain(reviewStage);
            expect(qualityItem!.copyText).toContain(correctionBasis);
            expect(qualityItem!.copyText).toContain(reportCrossCheck);
            expect(qualityItem!.copyText).toContain(reportFeedback);
            expect(qualityItem!.copyText).not.toContain('sourceRecordCorrection');
            expect(qualityItem!.copyText).not.toContain('supplementRequestTracked');

            const dailyLogItem = component.getReportHandoffItems()
                .find(item => item.documentId === 'daily-log-1');
            expect(dailyLogItem).toBeDefined();
            expect(dailyLogItem!.summary)
                .toContain('\uc77c\uc9c0 \ub0b4\uc6a9: \ud45c\ud1a0 \uc9c4\ud589');
            expect(dailyLogItem!.details.join('\n'))
                .toContain('\uc791\uc5c5\uc77c\uc9c0 \uacbd\uacc4 \uba54\ubaa8: \uc788\uc74c');
            expect(dailyLogItem!.copyText)
                .toContain('\uc548\uc804\uad50\uc721: \uc0ac\uc9c4 \uc644\ub8cc / \uccb4\uc870 \ubbf8\ud655\uc778');
            expect(dailyLogItem!.copyText)
                .not.toContain('strippingProgress');
            expect(dailyLogItem!.copyText)
                .not.toContain('"strokes"');

            await component.copyReportHandoffItem(featureItem);

            expect(clear).toHaveBeenCalledTimes(1);
            expect(write).toHaveBeenCalledWith({ text: featureItem.copyText, html: '', rtf: '' });
            expect(writeText).not.toHaveBeenCalled();
            expect(component.getReportHandoffPreviewItem()?.documentId).toBe('feature-1');
            expect(component.getReportHandoffCopyActionLabel(featureItem)).toBe('\ubcf5\uc0ac\ub428');

            const evidenceSection = featureItem.copySections.find(section => section.id === 'evidence')!;
            await component.copyReportHandoffSection(featureItem, evidenceSection);

            expect(clear).toHaveBeenCalledTimes(2);
            expect(write).toHaveBeenLastCalledWith({ text: evidenceSection.copyText, html: '', rtf: '' });
            expect(writeText).not.toHaveBeenCalled();
            expect(component.getReportHandoffPreviewItem()?.documentId).toBe('feature-1');
            expect(component.getReportHandoffSectionCopyActionLabel(featureItem, evidenceSection))
                .toBe('\ubcf5\uc0ac\ub428');
        } finally {
            testWindow.require = previousRequire;
        }
    });


    it('expands report handoff lists so tablet records are not left hidden', async () => {

        const featureDocuments = Array.from({ length: 10 }, (_, index) => {
            const number = String(index + 1).padStart(3, '0');

            return createDocument(`feature-${number}`, 'Feature', {
                identifier: `pit-${number}`,
                shortDescription: `feature ${number}`,
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            });
        });

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    ...featureDocuments
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();

        expect(component.reportHandoffItems).toHaveLength(10);
        expect(component.getReportHandoffItems()).toHaveLength(8);
        expect(component.hasReportHandoffOverflow()).toBe(true);
        expect(component.getReportHandoffHiddenCount()).toBe(2);
        expect(component.getReportHandoffOverflowActionLabel()).toContain('2');

        component.toggleReportHandoffItems();

        expect(component.getReportHandoffItems()).toHaveLength(10);
        expect(component.getReportHandoffHiddenCount()).toBe(0);
        expect(component.getReportHandoffOverflowActionLabel()).toBe('\uc811\uae30');

        const hiddenFeature = component.getReportHandoffItems()
            .find(item => item.documentId === 'feature-010');
        expect(hiddenFeature).toBeDefined();
        component.selectReportHandoffItem(hiddenFeature!);
        expect(component.getReportHandoffPreviewItem()?.documentId).toBe('feature-010');

        component.toggleReportHandoffItems();

        expect(component.getReportHandoffItems()).toHaveLength(8);
        expect(component.getReportHandoffItems().some(item => item.documentId === 'feature-010')).toBe(false);
        expect(component.getReportHandoffPreviewItem()?.documentId)
            .toBe(component.getReportHandoffItems()[0].documentId);
    });


    it('keeps tablet-hidden initial boundary records out of desktop status and workbench lists', async () => {

        const component = createComponent(
            {
                find: jest.fn().mockResolvedValue({
                    documents: [
                        createDocument('project', 'Project'),
                        createDocument('initial-fieldwork-operation', 'Operation'),
                        createDocument('initial-survey-boundary', 'SurveyBoundary', {
                            relations: { isRecordedIn: ['initial-fieldwork-operation'] }
                        }),
                        createDocument('operation-boundary-draft', 'Operation', {
                            projectBoundarySetupState: 'draftBoundary',
                            projectBoundarySummary: '처음 만든 유적 경계'
                        }),
                        createDocument('boundary-from-draft-operation', 'SurveyBoundary', {
                            relations: { isRecordedIn: ['operation-boundary-draft'] }
                        }),
                        createDocument('feature-group-1', 'FeatureGroup'),
                        createDocument('feature-candidate-1', 'Feature', {
                            featureRecordingStatus: 'candidate'
                        })
                    ]
                }),
                get: jest.fn()
            },
            createActionProjectConfiguration()
        );

        await component.refresh();

        expect(component.projectDocuments.map(document => document.resource.id)).toEqual([
            'project',
            'feature-candidate-1'
        ]);
        expect(component.getSummaryLabel()).toBe('일지 0 · 경계 0 · 유구 후보 1 · 확인 0');
        expect(component.getWorkflowSteps().find(step => step.id === 'operation')?.status).toBe('todo');
        expect(component.getProgressItems().map(item => item.documentId)).toEqual(['feature-candidate-1']);
        expect(component.getWorkbenchItems().map(item => item.documentId)).not.toContain('feature-group-1');
    });


    it('filters desktop record work panels by the selected work status', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-review', 'Feature', {
                        featureRecordingStatus: 'confirmed',
                        featureInvestigationChecklist: []
                    }),
                    createDocument('feature-pending', 'Feature', {
                        featureRecordingStatus: 'candidate'
                    })
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();
        component.setActivePanel('records');

        const pendingFilter = component.getRecordWorkFilters()
            .find(filter => filter.id === 'pending')!;
        component.setActiveRecordWorkFilter(pendingFilter);

        expect(component.isRecordWorkFilterActive(pendingFilter)).toBe(true);
        expect(component.getFilteredProgressItems().map(item => item.documentId))
            .toEqual(['feature-pending']);
        expect(component.getFilteredUnitMatrixItems().map(item => item.documentId))
            .toEqual(['feature-pending']);
        expect(component.getFilteredFeatureOverviewItems().map(item => item.documentId))
            .toEqual(['feature-pending']);
        expect(component.getFilteredWorkbenchItems().map(item => item.documentId))
            .toEqual(['feature-pending']);

        const reviewFilter = component.getRecordWorkFilters()
            .find(filter => filter.id === 'needsReview')!;
        component.setActiveRecordWorkFilter(reviewFilter);

        expect(component.getFilteredProgressItems().map(item => item.documentId))
            .toEqual(['feature-review']);
        expect(component.getFilteredUnitMatrixItems().map(item => item.documentId))
            .toEqual(['feature-review']);
        expect(component.getFilteredWorkbenchItems().map(item => item.documentId))
            .toEqual(['feature-review']);

        const todayFilter = component.getRecordWorkFilters()
            .find(filter => filter.id === 'today')!;
        component.setActiveRecordWorkFilter(todayFilter);

        expect(component.hasFilteredRecordWorkItems()).toBe(false);
        expect(component.getFilteredRecordWorkEmptyLabel())
            .toBe('오늘 작성 기록이 없습니다');
        expect(component.getFilteredRecordWorkEmptyState()).toEqual({
            title: '오늘 작성 기록이 없습니다',
            detail: '오늘 작성 필터만 비어 있습니다. 전체를 누르면 기존 기록을 다시 볼 수 있습니다.'
        });
    });


    it('shows the full fieldwork sequence when setup and records are in place', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project', {
                        projectBoundarySummary: 'A구역',
                        projectInvestigationMode: 'excavation'
                    }),
                    createDocument('operation-1', 'Operation'),
                    createDocument('boundary-1', 'SurveyBoundary'),
                    createDocument('feature-1', 'Feature', {
                        relations: { liesWithin: ['operation-1'] },
                        featureRecordingStatus: 'confirmed',
                        featureInvestigationChecklist: ['completionPhotoTaken']
                    }),
                    createDocument('daily-1', 'DailyLog')
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();

        expect(component.getWorkflowSteps().map(step => [step.label, step.status])).toEqual([
            ['프로젝트', 'done'],
            ['조사 선택', 'done'],
            ['조사 구역', 'done'],
            ['조사 구역 기록', 'done'],
            ['유구 추가', 'done'],
            ['야장·마감', 'done']
        ]);
        expect(component.getWorkflowStepStatusLabel('current')).toBe('다음');
        expect(component.getWorkflowStepStatusLabel('attention')).toBe('확인');
        expect(component.getScopeSummary()).toMatchObject({
            title: '조사 범위 준비',
            detail: '발굴조사 · A구역',
            structureCount: 2,
            reviewCount: 2,
            actionLabel: '지도'
        });
        expect(component.getScopeMetricLabel()).toBe('현장 기록 2 · 자료 0 · 일지·점검 2 · 확인 0');
    });


    it('keeps the desktop fieldwork header focused with selectable workflow panels', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-1', 'Feature', {
                        featureRecordingStatus: 'confirmed',
                        featureInvestigationChecklist: []
                    }),
                    createDocument('memo-1', 'PenMemo', {
                        date: getTodayLabel(),
                        penMemoReviewedTranscript: '[다음 작업] 사진 보강.',
                        relations: { depicts: ['feature-1'] }
                    })
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();

        expect(component.activePanel).toBe('overview');
        expect(component.shouldShowPanelNavigation()).toBe(true);
        expect(component.getPanelOptions().map(panel => panel.label)).toEqual([
            '전체 현황',
            '작업 순서',
            '오늘 할 일',
            '기록 작업',
            '야장',
            '\ubcf4\uace0\uc11c',
            '마감'
        ]);
        expect(component.getPanelOptions().map(panel => panel.id)).toEqual([
            'overview',
            'workflow',
            'today',
            'records',
            'notebook',
            'report',
            'closeout'
        ]);
        expect(component.hasOverviewChartData()).toBe(true);
        expect(component.getOverviewChartData()).toMatchObject({
            totalDocumentCount: 3,
            featureCount: 1,
            openIssueCount: 1
        });
        expect(component.getOverviewMetrics().map(metric => metric.label)).toEqual([
            '조사',
            '유구',
            '자료',
            '진행',
            '확인 필요'
        ]);
        expect(component.getOverviewFooterLabel()).toBe('과정 0/9 · 확인 1 · 필수 0');

        component.setActivePanel('records');

        expect(component.isPanelActive('records')).toBe(true);

        component.returnToInvestigationOverview();

        expect(component.isPanelActive('overview')).toBe(true);

        component.setActivePanel('records');

        expect(component.isPanelActive('records')).toBe(true);

        component.notebookDigest = undefined;
        component.setActivePanel('notebook');

        expect(component.isPanelActive('records')).toBe(true);
    });


    it('runs today quick actions from the desktop header', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const operation = createDocument('operation-1', 'Operation');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project', {
                        projectBoundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지'
                    }),
                    operation
                ]
            }),
            get: jest.fn().mockResolvedValue(operation)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        component.setActivePanel('today');

        const actions = component.getTodayQuickActions();
        expect(actions.map(action => action.label)).toEqual([
            '오늘 일지',
            '경계 만들기',
            '마감 점검'
        ]);

        await component.runTodayQuickAction(actions[0]);
        await component.runTodayQuickAction(actions[1]);
        await component.runTodayQuickAction(actions[2]);

        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'daily-log-1700000000000',
                    category: 'DailyLog',
                    relations: { isRecordedIn: ['operation-1'] }
                })
            })
        );
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'survey-boundary-1700000000000',
                    category: 'SurveyBoundary',
                    relations: { isRecordedIn: ['operation-1'] },
                    shortDescription: '1구역 북쪽 능선부터 남쪽 농로까지',
                    surveyBoundaryNote: '1구역 북쪽 능선부터 남쪽 농로까지'
                })
            })
        );
        expect(component.isPanelActive('closeout')).toBe(true);
        expect(component.hasPendingFeatureDraft()).toBe(false);

        jest.restoreAllMocks();
    });


    it('uses the desktop quick record button for the next record after the survey boundary exists', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const operation = createDocument('operation-1', 'Operation');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    operation,
                    createDocument('boundary-1', 'SurveyBoundary', {
                        relations: { isRecordedIn: ['operation-1'] }
                    })
                ]
            }),
            get: jest.fn().mockResolvedValue(operation)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            { editDocument: jest.fn() }
        );

        await component.refresh();
        component.setActivePanel('today');

        const actions = component.getTodayQuickActions();
        expect(actions.map(action => action.label)).toEqual([
            '오늘 일지',
            '유구 만들기',
            '마감 점검'
        ]);

        await component.runTodayQuickAction(actions[1]);

        component.setActivePanel('records');
        expect(component.hasPendingFeatureDraft()).toBe(true);
        expect(component.getPendingFeatureDraftParentLabel()).toBe('operation-1');

        jest.restoreAllMocks();
    });


    it('names pending desktop feature drafts from typed names or next field numbers', async () => {

        const operation = createDocument('operation-1', 'Operation');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    operation,
                    createDocument('boundary-1', 'SurveyBoundary', {
                        relations: { isRecordedIn: ['operation-1'] }
                    }),
                    createDocument('feature-1', 'Feature', {
                        identifier: '1호 수혈',
                        featureType: 'pit',
                        relations: { liesWithin: ['operation-1'] }
                    }),
                    createDocument('feature-2', 'Feature', {
                        identifier: '수혈 2호',
                        featureType: 'pit',
                        relations: { liesWithin: ['operation-1'] }
                    })
                ]
            }),
            get: jest.fn().mockResolvedValue(operation)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        component.setActivePanel('today');
        await component.runTodayQuickAction(component.getTodayQuickActions()[1]);

        expect(component.hasPendingFeatureDraft()).toBe(true);
        expect(component.getPendingFeatureDraftIdentifier()).toBe('');
        expect(component.getPendingFeatureDraftIdentifierPlaceholder()).toBe('1호 유구');

        const pitPreset = component.getFeatureDraftPresets()
            .find(preset => preset.featureType === 'pit')!;

        await component.createPendingFeatureDraft(pitPreset);

        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: '3호 수혈',
                    category: 'Feature',
                    featureType: 'pit',
                    featureGeometryRevisionNote:
                        '위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹으며 시작',
                    geometryConfidence: 'rough',
                    geometrySource: 'aerialLayerTrace',
                    shortDescription:
                        '위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹으며 시작'
                })
            })
        );

        await component.runTodayQuickAction(component.getTodayQuickActions()[1]);
        component.updatePendingFeatureDraftIdentifier('  북쪽 배수로  ');

        const ditchPreset = component.getFeatureDraftPresets()
            .find(preset => preset.featureType === 'ditch')!;

        await component.createPendingFeatureDraft(ditchPreset);

        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: '북쪽 배수로',
                    category: 'Feature',
                    featureType: 'ditch',
                    geometrySource: 'aerialLayerTrace'
                })
            })
        );
    });


    it('runs workflow actions from the sequence strip', async () => {

        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('operation-1', 'Operation'),
                    createDocument('feature-1', 'Feature')
                ]
            }),
            get: jest.fn().mockResolvedValue(createDocument('feature-1', 'Feature'))
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const viewFacade = {
            deselect: jest.fn().mockResolvedValue(undefined),
            setMode: jest.fn()
        };
        const menuModalLauncher = {
            openInformationModal: jest.fn().mockResolvedValue(undefined)
        };
        const router = {
            navigate: jest.fn().mockResolvedValue(true)
        };
        const component = createComponent(
            datastore,
            createProjectConfiguration(),
            routing,
            viewFacade,
            menuModalLauncher,
            router
        );

        await component.refresh();

        const projectStep = component.getWorkflowSteps().find(step => step.id === 'project')!;
        const operationStep = component.getWorkflowSteps().find(step => step.id === 'operation')!;
        const boundaryStep = component.getWorkflowSteps().find(step => step.id === 'boundary')!;
        const targetStep = component.getWorkflowSteps().find(step => step.id === 'targets')!;

        expect(boundaryStep.secondaryActionDetail).toBe(
            'SHP/DXF/GeoJSON은 태블릿에서 파일 선택으로 바로 가져오거나, 데스크톱에서 가져온 뒤 같은 프로젝트로 동기화해 조사 경계로 확인할 수 있습니다.'
        );

        await component.runWorkflowStep(projectStep);
        await component.runWorkflowStep(operationStep);
        await component.runWorkflowStep(boundaryStep);
        await component.runWorkflowStepSecondaryAction(boundaryStep);
        await component.runWorkflowStep(targetStep);

        expect(menuModalLauncher.openInformationModal).toHaveBeenCalled();
        expect(viewFacade.deselect).toHaveBeenCalled();
        expect(viewFacade.setMode).toHaveBeenCalledWith('map');
        expect(router.navigate).toHaveBeenCalledWith(['import']);
        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(createDocument('feature-1', 'Feature'));
    });


    it('offers import as a secondary boundary setup action from priority tasks', async () => {

        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project')
                ]
            }),
            get: jest.fn()
        };
        const viewFacade = {
            deselect: jest.fn().mockResolvedValue(undefined),
            setMode: jest.fn()
        };
        const router = {
            navigate: jest.fn().mockResolvedValue(true)
        };
        const component = createComponent(
            datastore,
            createProjectConfiguration(),
            { jumpToResource: jest.fn() },
            viewFacade,
            { openInformationModal: jest.fn() },
            router
        );

        await component.refresh();

        const [task] = component.getPriorityTasks();
        expect(task).toMatchObject({
            id: 'start-operation',
            action: { type: 'openMap' },
            secondaryAction: { type: 'openImport' },
            secondaryActionDetail: 'SHP/DXF/GeoJSON은 태블릿에서 파일 선택으로 바로 가져오거나, 데스크톱에서 가져온 뒤 같은 프로젝트로 동기화해 조사 경계로 확인할 수 있습니다.',
            secondaryActionLabel: '경계 가져오기'
        });
        expect(component.canRunPriorityTaskSecondaryAction(task)).toBe(true);

        await component.runPriorityTask(task);
        await component.runPriorityTaskSecondaryAction(task);

        expect(viewFacade.deselect).toHaveBeenCalled();
        expect(viewFacade.setMode).toHaveBeenCalledWith('map');
        expect(router.navigate).toHaveBeenCalledWith(['import']);
    });


    it('runs scope summary actions from the desktop header', async () => {

        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project', {
                        projectInvestigationMode: 'trialTrench'
                    }),
                    createDocument('operation-1', 'Operation')
                ]
            }),
            get: jest.fn()
        };
        const viewFacade = {
            deselect: jest.fn().mockResolvedValue(undefined),
            setMode: jest.fn()
        };
        const router = {
            navigate: jest.fn().mockResolvedValue(true)
        };
        const component = createComponent(
            datastore,
            createProjectConfiguration(),
            { jumpToResource: jest.fn() },
            viewFacade,
            { openInformationModal: jest.fn() },
            router
        );

        await component.refresh();
        const summary = component.getScopeSummary()!;

        expect(summary.title).toBe('조사 구역 필요');

        await component.runScopeSummaryAction(summary.action);
        await component.runScopeSummaryAction(summary.secondaryAction);

        expect(viewFacade.deselect).toHaveBeenCalled();
        expect(viewFacade.setMode).toHaveBeenCalledWith('map');
        expect(router.navigate).toHaveBeenCalledWith(['import']);
    });


    it('stays hidden outside Korean fieldwork projects', async () => {

        const component = createComponent(
            {
                find: jest.fn().mockResolvedValue({
                    documents: [
                        createDocument('project', 'Project'),
                        createDocument('feature-1', 'Feature', {
                            featureRecordingStatus: 'confirmed',
                            featureInvestigationChecklist: []
                        })
                    ]
                }),
                get: jest.fn()
            },
            createProjectConfiguration(false)
        );

        await component.refresh();

        expect(component.shouldShow()).toBe(false);
        expect(component.getPriorityIssues()).toEqual([]);
    });


    it('opens priority issue documents', async () => {

        const issueDocument = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn(),
            get: jest.fn().mockResolvedValue(issueDocument)
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(datastore, createProjectConfiguration(), routing);

        await component.openIssue({
            documentId: 'feature-1',
            identifier: 'feature-1',
            category: 'Feature',
            severity: 'warning',
            message: '완료 사진 항목이 체크되지 않았습니다.',
            recommendedAction: '현장 마감 전 완료 사진을 남겼는지 확인하세요.'
        });

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(issueDocument);
    });


    it('opens closeout issue documents', async () => {

        const issueDocument = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-1', 'Feature', {
                        featureRecordingStatus: 'confirmed',
                        featureInvestigationChecklist: []
                    })
                ]
            }),
            get: jest.fn().mockResolvedValue(issueDocument)
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(datastore, createProjectConfiguration(), routing);

        await component.refresh();
        await component.openCloseoutIssue(component.getCloseoutIssues()[0]);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(issueDocument);
    });


    it('batch-applies safe closeout updates from the desktop header', async () => {

        let documents = [
            createDocument('project', 'Project'),
            createDocument('feature-1', 'Feature', {
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            })
        ];
        const datastore = {
            find: jest.fn().mockImplementation(() => Promise.resolve({ documents })),
            get: jest.fn(),
            bulkUpdate: jest.fn().mockImplementation(async (updatedDocuments: any[]) => {
                documents = documents.map(document =>
                    updatedDocuments.find(updated =>
                        updated.resource.id === document.resource.id
                    ) ?? document
                );
                return updatedDocuments;
            })
        };
        const component = createComponent(datastore);

        await component.refresh();
        expect(component.hasCloseoutBatchUpdates()).toBe(true);

        await component.resolveCloseoutBatchUpdates();

        expect(datastore.bulkUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
                resource: expect.objectContaining({
                    id: 'feature-1',
                    featureInvestigationChecklist: ['completionPhotoTaken']
                })
            })
        ]);
        expect(component.hasCloseoutBatchUpdates()).toBe(false);
        expect(component.getCloseoutSummary()).toMatchObject({
            status: 'clear',
            title: '마감 가능'
        });
    });


    it('shows today notebook follow-ups from tablet field notes', async () => {

        const component = createComponent({
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-1', 'Feature'),
                    createDocument('memo-1', 'PenMemo', {
                        date: getTodayLabel(),
                        penMemoReviewedTranscript: [
                            '[관찰 내용] 북쪽 경계에서 소토 확인.',
                            '[다음 작업] 사진 보강 후 단면 정리.'
                        ].join('\n'),
                        relations: { depicts: ['feature-1'] }
                    }),
                    createDocument('memo-2', 'PenMemo', {
                        date: getTodayLabel(),
                        penMemoReviewedTranscript: [
                            '[관찰 내용] 바닥면 정리 완료.'
                        ].join('\n'),
                        relations: { depicts: ['feature-1'] }
                    })
                ]
            }),
            get: jest.fn()
        });

        await component.refresh();

        expect(component.hasNotebookDigest()).toBe(true);
        expect(component.hasNotebookFollowUps()).toBe(true);
        expect(component.hasNotebookRecentEntries()).toBe(true);
        expect(component.getNotebookSummaryLabel()).toBe('기록 2 · 다음 1 · 번호 1');
        expect(component.getNotebookNextWorkEntries()[0].targetLabel).toBe('feature-1');
        expect(component.getNotebookEvidenceMissingEntries()[0].sourceLabel).toBe('메모');
        expect(component.getNotebookRecentEntries()).toHaveLength(1);
        expect(component.getNotebookRecentEntries()[0]).toMatchObject({
            targetLabel: 'feature-1',
            detail: '바닥면 정리 완료.'
        });
    });

    it('shows selected record notebook history in the desktop notebook panel', async () => {

        const feature = createDocument('feature-1', 'Feature');
        const memo = createDocument('memo-1', 'PenMemo', {
            date: getTodayLabel(),
            penMemoReviewedTranscript: [
                '[관찰 내용] 바닥면 정리 완료.',
                '[다음 작업] 단면 사진 보강.'
            ].join('\n'),
            relations: { depicts: ['feature-1'] }
        });
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(
            {
                find: jest.fn().mockResolvedValue({
                    documents: [
                        createDocument('project', 'Project'),
                        feature,
                        memo
                    ]
                }),
                get: jest.fn()
            },
            createActionProjectConfiguration(),
            routing,
            {
                deselect: jest.fn(),
                setMode: jest.fn(),
                getSelectedDocument: jest.fn().mockReturnValue(feature)
            }
        );

        await component.refresh();

        expect(component.hasNotebookPanel()).toBe(true);
        expect(component.hasNotebookSelectedRecordEntries()).toBe(true);
        expect(component.getNotebookSummaryLabel()).toContain('선택 1');
        expect(component.getNotebookSelectedRecordLabel()).toBe('feature-1');
        expect(component.getNotebookSelectedRecordEntries()[0]).toMatchObject({
            sourceLabel: '메모',
            detail: '바닥면 정리 완료.',
            nextWork: '단면 사진 보강.'
        });

        await component.openNotebookEntrySource(component.getNotebookSelectedRecordEntries()[0]);

        expect(routing.jumpToResource).toHaveBeenCalledWith(memo);
    });


    it('keeps the notebook panel available to create today daily logs', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const operation = createDocument('operation-1', 'Operation');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    operation
                ]
            }),
            get: jest.fn().mockResolvedValue(operation)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();

        expect(component.getPanelOptions().map(panel => panel.id)).toContain('notebook');
        expect(component.hasNotebookPanel()).toBe(true);
        expect(component.hasNotebookDigest()).toBe(false);
        expect(component.getNotebookDailyLogActionLabel()).toBe('오늘 작업일지 만들기');

        await component.runNotebookDailyLogAction();

        expect(datastore.get).toHaveBeenCalledWith('operation-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'daily-log-1700000000000',
                    category: 'DailyLog',
                    relations: { isRecordedIn: ['operation-1'] }
                })
            })
        );

        jest.restoreAllMocks();
    });


    it('opens today daily log from the notebook panel when it already exists', async () => {

        const dailyLog = createDocument('daily-1', 'DailyLog', {
            date: getTodayLabel(),
            relations: { isRecordedIn: ['operation-1'] }
        });
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(
            {
                find: jest.fn().mockResolvedValue({
                    documents: [
                        createDocument('project', 'Project'),
                        createDocument('operation-1', 'Operation'),
                        dailyLog
                    ]
                }),
                get: jest.fn()
            },
            createActionProjectConfiguration(),
            routing
        );

        await component.refresh();

        expect(component.hasNotebookPanel()).toBe(true);
        expect(component.getNotebookDailyLogActionLabel()).toBe('오늘 작업일지 열기');

        await component.runNotebookDailyLogAction();

        expect(routing.jumpToResource).toHaveBeenCalledWith(dailyLog);
    });

    it('shows tablet daily journal summaries in the desktop notebook panel', async () => {

        const dailyLog = createDocument('daily-1', 'DailyLog', {
            date: getTodayLabel(),
            dailyLogInvestigatorCount: 1,
            dailyLogLaborerCount: 3,
            dailyLogEquipmentCount: 1,
            dailyLogEquipmentSize: '10톤',
            dailyLogSafetyEducationPhoto: true,
            dailyLogSafetyEducationStretching: true,
            dailyLogContent: ['workArea', 'featureProgress', 'findSampleCollection'],
            dailyLogEvidenceRole: ['sameDayFactRecord'],
            dailyLogReview: ['sameDayWritten'],
            dailyLogBoundaryMemoImportedAt: `${getTodayLabel()}T08:30:00.000Z`,
            dailyLogWorkMemoUpdatedAt: `${getTodayLabel()}T10:15:00.000Z`,
            dailyLogBoundaryMemoStrokes: {
                version: 1,
                strokes: [
                    { points: [{ x: 120, y: 240 }, { x: 360, y: 420 }] }
                ]
            },
            relations: { isRecordedIn: ['operation-1'] }
        });
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(
            {
                find: jest.fn().mockResolvedValue({
                    documents: [
                        createDocument('project', 'Project'),
                        createDocument('operation-1', 'Operation'),
                        dailyLog
                    ]
                }),
                get: jest.fn()
            },
            createActionProjectConfiguration(),
            routing
        );

        await component.refresh();

        expect(component.hasNotebookDailyJournalSummaries()).toBe(true);
        expect(component.getNotebookSummaryLabel()).toBe('기록 0 · 다음 0 · 번호 0');
        expect(component.getNotebookDailyJournalSummaries()[0]).toMatchObject({
            document: dailyLog,
            personnelLabel: '투입 4명 (조사원 1명 / 인부 3명)',
            equipmentLabel: '장비 1대/10톤',
            safetyLabel: '안전교육 완료',
            contentLabel: '내용 작업구역 · 유구 조사 진행 · 유물·시료 수습',
            evidenceRoleLabel: '근거 당일 사실기록',
            reviewLabel: '검토 당일 작성',
            boundaryMemoLabel: '경계 메모 1획/2점',
            boundaryMemoImportedAtLabel: `경계 가져옴 ${getTodayLabel()}`,
            workMemoUpdatedAtLabel: `작업일지 수정 ${getTodayLabel()}`,
            boundaryMemoPreview: expect.objectContaining({
                path: expect.stringContaining('M '),
                viewBox: '0 0 120 72'
            }),
            hasSafetyComplete: true,
            hasBoundaryMemo: true,
            hasLogClassification: true
        });
        expect(component.getNotebookDailyJournalSummaryTone(
            component.getNotebookDailyJournalSummaries()[0]
        )).toBe('success');

        await component.openNotebookDailyJournalSummary(component.getNotebookDailyJournalSummaries()[0]);

        expect(routing.jumpToResource).toHaveBeenCalledWith(dailyLog);
    });

    it('runs selected record workbench commands from the records panel', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const feature = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    feature
                ]
            }),
            get: jest.fn().mockResolvedValue(feature)
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const viewFacade = {
            deselect: jest.fn().mockResolvedValue(undefined),
            setMode: jest.fn(),
            getSelectedDocument: jest.fn().mockReturnValue(feature)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            routing,
            viewFacade,
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();

        expect(component.getPanelOptions().map(panel => panel.id)).toContain('records');
        expect(component.hasSelectedRecordWorkbench()).toBe(true);
        expect(component.getSelectedRecordWorkbenchCategoryLabel()).toBe('유구');
        expect(component.getSelectedRecordWorkbenchLabel()).toBe('feature-1');

        await component.openSelectedRecordWorkbenchOnMap();
        await component.openSelectedRecordWorkbenchDocument();
        await component.clearSelectedRecordWorkbench();

        expect(viewFacade.setMode).toHaveBeenCalledWith('map');
        expect(routing.jumpToResource).toHaveBeenCalledWith(feature);
        expect(viewFacade.deselect).toHaveBeenCalled();

        const createAction = component.getSelectedRecordWorkbenchActions()
            .find(action => action.type === 'createDocument' && !!action.categoryName);
        expect(createAction).toBeDefined();

        await component.runSelectedRecordWorkbenchAction(createAction!);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: `${createAction!.categoryName!.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}-1700000000000`,
                    category: createAction!.categoryName
                })
            })
        );

        jest.restoreAllMocks();
    });

    it('shows connected record hierarchy lanes in the desktop records panel', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const operation = createDocument('operation-1', 'Operation');
        const trench = createDocument('trench-1', 'Trench', {
            relations: { liesWithin: ['operation-1'] }
        });
        const feature = createDocument('feature-1', 'Feature', {
            relations: { liesWithin: ['trench-1'] },
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const layer = createDocument('layer-1', 'Layer', {
            relations: { liesWithin: ['feature-1'] }
        });
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    operation,
                    trench,
                    feature,
                    layer
                ]
            }),
            get: jest.fn().mockImplementation(async (documentId: string) =>
                [operation, trench, feature, layer].find(document =>
                    document.resource.id === documentId
                )
            )
        };
        const routing = { jumpToResource: jest.fn() };
        const doceditLauncher = { editDocument: jest.fn().mockResolvedValue(undefined) };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            routing,
            {
                deselect: jest.fn(),
                setMode: jest.fn(),
                getSelectedDocument: jest.fn().mockReturnValue(feature)
            },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        component.setActivePanel('records');

        expect(component.hasHierarchyLanes()).toBe(true);
        expect(component.getHierarchyScopeLabel()).toBe('feature-1');
        expect(component.getHierarchyLanes().map(lane => [lane.label, lane.totalCount]))
            .toEqual([
                ['조사 구역 기록', 1],
                ['트렌치', 1],
                ['유구', 1],
                ['세부 단위', 0],
                ['토층', 1]
            ]);
        expect(component.getHierarchyLanes().find(lane => lane.categoryName === 'Feature')?.items[0])
            .toMatchObject({
                documentId: 'feature-1',
                isCurrentScope: true,
                parentIdentifier: 'trench-1',
                childCount: 1,
                issueCount: 1
            });

        const featureItem = component.getHierarchyLanes()
            .find(lane => lane.categoryName === 'Feature')!.items[0];
        await component.openHierarchyItem(featureItem);
        await component.createHierarchyItemChild(featureItem);

        expect(routing.jumpToResource).toHaveBeenCalledWith(feature);
        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'feature-segment-1700000000000',
                    category: 'FeatureSegment',
                    relations: expect.objectContaining({
                        liesWithin: ['feature-1']
                    })
                })
            })
        );

        jest.restoreAllMocks();
    });

    it('revises selected record identifiers from the desktop records panel', async () => {

        let documents = [
            createDocument('project', 'Project'),
            createDocument('feature-1', 'Feature', {
                identifier: 'F-17',
                fieldIdentifier: 'F-17'
            })
        ];
        const datastore = {
            find: jest.fn().mockImplementation(() => Promise.resolve({ documents })),
            get: jest.fn(),
            bulkUpdate: jest.fn().mockImplementation(async (updatedDocuments: any[]) => {
                documents = documents.map(document =>
                    updatedDocuments.find(updated =>
                        updated.resource.id === document.resource.id
                    ) ?? document
                );
                return updatedDocuments;
            })
        };
        const viewFacade = {
            deselect: jest.fn(),
            setMode: jest.fn(),
            getSelectedDocument: jest.fn().mockReturnValue(documents[1])
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            viewFacade
        );

        await component.refresh();

        expect(component.hasSelectedRecordWorkbench()).toBe(true);
        expect(component.canReviseSelectedRecordIdentifier()).toBe(true);
        expect(component.getSelectedRecordFieldIdentifier()).toBe('F-17');
        expect(component.getSelectedRecordReportIdentifier()).toBe('F-17');
        expect(component.getSelectedRecordIdentifierRevisionHistoryLabel()).toBe('변경 이력 없음');
        expect(component.canApplySelectedRecordIdentifierRevision('F-17')).toBe(false);
        expect(component.canApplySelectedRecordIdentifierRevision('조선시대 1호 가마')).toBe(true);

        await component.applySelectedRecordIdentifierRevision(
            '조선시대 1호 가마',
            '현장번호 정리'
        );

        expect(datastore.bulkUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
                resource: expect.objectContaining({
                    id: 'feature-1',
                    identifier: '조선시대 1호 가마',
                    fieldIdentifier: 'F-17',
                    reportIdentifier: '조선시대 1호 가마',
                    identifierRevisionNote: '현장번호 정리',
                    identifierRevisionHistory: [
                        expect.objectContaining({
                            previousIdentifier: 'F-17',
                            nextIdentifier: '조선시대 1호 가마',
                            fieldIdentifier: 'F-17',
                            reason: '현장번호 정리',
                            changedAt: expect.any(String)
                        })
                    ]
                })
            })
        ]);
        expect(component.getSelectedRecordWorkbenchLabel()).toBe('조선시대 1호 가마');
        expect(component.getSelectedRecordIdentifierRevisionHistoryLabel())
            .toBe('이력 1 · 최근 F-17에서 조선시대 1호 가마');
    });


    it('creates selected record pen memo drafts from the notebook panel', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const feature = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    feature
                ]
            }),
            get: jest.fn().mockResolvedValue(feature)
        };
        const viewFacade = {
            deselect: jest.fn(),
            setMode: jest.fn(),
            getSelectedDocument: jest.fn().mockReturnValue(feature)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            viewFacade,
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();

        expect(component.getPanelOptions().map(panel => panel.id)).toContain('notebook');
        expect(component.hasNotebookPanel()).toBe(true);
        expect(component.canRunNotebookRecordMemoAction()).toBe(true);
        expect(component.getNotebookRecordMemoActionLabel()).toBe('선택 기록 메모');
        expect(component.getNotebookRecordMemoActionDetail()).toContain('feature-1');

        await component.runNotebookRecordMemoAction();

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'pen-memo-1700000000000',
                    category: 'PenMemo',
                    shortDescription: 'feature-1 현장 메모',
                    description: '[관찰 내용]\n\n[스케치·약측/근거 번호]\n\n[다음 작업]',
                    penMemoStrokes: '[]',
                    penMemoTranscriptionStatus: 'pending',
                    relations: { depicts: ['feature-1'] }
                })
            })
        );

        jest.restoreAllMocks();
    });


    it('does not offer selected record memos for project setup records', async () => {

        const project = createDocument('project', 'Project');
        const component = createComponent(
            {
                find: jest.fn().mockResolvedValue({
                    documents: [project]
                }),
                get: jest.fn()
            },
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            {
                deselect: jest.fn(),
                setMode: jest.fn(),
                getSelectedDocument: jest.fn().mockReturnValue(project)
            }
        );

        await component.refresh();

        expect(component.canRunNotebookRecordMemoAction()).toBe(false);
        expect(component.hasNotebookPanel()).toBe(false);
        expect(component.getPanelOptions().map(panel => panel.id)).not.toContain('notebook');
    });


    it('opens progress board records', async () => {

        const progressDocument = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    progressDocument
                ]
            }),
            get: jest.fn().mockResolvedValue(progressDocument)
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(datastore, createProjectConfiguration(), routing);

        await component.refresh();
        await component.openProgressItem(component.getProgressItems()[0]);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(progressDocument);
    });


    it('opens unit matrix records', async () => {

        const matrixDocument = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    matrixDocument
                ]
            }),
            get: jest.fn().mockResolvedValue(matrixDocument)
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(datastore, createProjectConfiguration(), routing);

        await component.refresh();
        await component.openUnitMatrixItem(component.getUnitMatrixItems()[0]);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(matrixDocument);
    });


    it('creates unit matrix child drafts through the resource editor flow', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const feature = createDocument('feature-1', 'Feature', {
            featureRecordingStatus: 'candidate'
        });
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    feature
                ]
            }),
            get: jest.fn().mockResolvedValue(feature)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        const item = component.getUnitMatrixItems()
            .find(entry => entry.documentId === 'feature-1')!;

        expect(item.nextChildCategoryName).toBe('FeatureSegment');

        await component.createUnitMatrixRecord(item, item.nextChildCategoryName!);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'feature-segment-1700000000000',
                    category: 'FeatureSegment',
                    relations: { liesWithin: ['feature-1'] }
                })
            })
        );

        jest.restoreAllMocks();
    });


    it('asks for a feature type before opening dashboard Feature drafts', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const trench = createDocument('trench-1', 'Trench');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    trench
                ]
            }),
            get: jest.fn().mockResolvedValue(trench)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        const item = component.getUnitMatrixItems()
            .find(entry => entry.documentId === 'trench-1')!;

        expect(item.nextChildCategoryName).toBe('Feature');

        await component.createUnitMatrixRecord(item, item.nextChildCategoryName!);

        expect(doceditLauncher.editDocument).not.toHaveBeenCalled();
        expect(component.hasPendingFeatureDraft()).toBe(true);
        expect(component.getPendingFeatureDraftParentLabel()).toBe('trench-1');
        expect(component.getFeatureDraftPresetLabel(
            component.getFeatureDraftPresets().find(preset => preset.featureType === 'unknown')!
        )).toBe('유구로 만들기');

        const kilnPreset = component.getFeatureDraftPresets().find(preset =>
            preset.featureType === 'kiln'
        )!;

        await component.createPendingFeatureDraft(kilnPreset);

        expect(component.hasPendingFeatureDraft()).toBe(false);
        expect(datastore.get).toHaveBeenCalledWith('trench-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: '1호 가마',
                    category: 'Feature',
                    relations: expect.objectContaining({ liesWithin: ['trench-1'] }),
                    featureType: 'kiln',
                    featureInterpretationType: ['kiln'],
                    featureRecordingStatus: 'candidate',
                    featureInvestigationChecklist: []
                })
            })
        );

        jest.restoreAllMocks();
    });


    it('opens desktop workbench records', async () => {

        const workbenchDocument = createDocument('feature-1', 'Feature');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    createDocument('feature-1', 'Feature', {
                        featureRecordingStatus: 'candidate'
                    })
                ]
            }),
            get: jest.fn().mockResolvedValue(workbenchDocument)
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(datastore, createProjectConfiguration(), routing);

        await component.refresh();
        await component.openWorkbenchItem(component.getWorkbenchItems()[0]);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(routing.jumpToResource).toHaveBeenCalledWith(workbenchDocument);
    });


    it('runs compact workbench actions through the resource editor flow', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const feature = createDocument('feature-1', 'Feature', {
            featureRecordingStatus: 'candidate'
        });
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    feature
                ]
            }),
            get: jest.fn().mockResolvedValue(feature)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        const [item] = component.getWorkbenchItems();
        const createAction = component.getWorkbenchActions(item)
            .find(action => action.type === 'createDocument');

        expect(createAction).toMatchObject({
            label: '세부 단위 추가',
            categoryName: 'FeatureSegment'
        });

        await component.runWorkbenchAction(item, createAction!);

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'feature-segment-1700000000000',
                    category: 'FeatureSegment',
                    relations: { liesWithin: ['feature-1'] }
                })
            })
        );

        jest.restoreAllMocks();
    });


    it('creates desktop priority task drafts through the resource editor flow', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const operation = createDocument('operation-1', 'Operation');
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    operation
                ]
            }),
            get: jest.fn().mockResolvedValue(operation)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();
        expect(component.hasPriorityTasks()).toBe(true);
        await component.runPriorityTask(component.getPriorityTasks()[0]);

        expect(datastore.get).toHaveBeenCalledWith('operation-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'daily-log-1700000000000',
                    category: 'DailyLog',
                    relations: { isRecordedIn: ['operation-1'] }
                })
            })
        );

        jest.restoreAllMocks();
    });


    it('uses the selected hierarchy scope for desktop priority task drafts', async () => {

        const operation = createDocument('operation-1', 'Operation');
        const firstTrench = createDocument('trench-1', 'Trench', {}, {
            isRecordedIn: ['operation-1']
        });
        const selectedTrench = createDocument('trench-2', 'Trench', {}, {
            isRecordedIn: ['operation-1']
        });
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    operation,
                    firstTrench,
                    selectedTrench,
                    createDocument('daily-1', 'DailyLog', {}, {
                        isRecordedIn: ['operation-1']
                    }),
                    createDocument('boundary-1', 'SurveyBoundary', {}, {
                        isRecordedIn: ['operation-1']
                    })
                ]
            }),
            get: jest.fn().mockResolvedValue(selectedTrench)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            {
                deselect: jest.fn(),
                setMode: jest.fn(),
                getSelectedDocument: jest.fn().mockReturnValue(selectedTrench)
            }
        );

        await component.refresh();

        const task = component.getPriorityTasks()
            .find(priorityTask => priorityTask.id === 'create-detected-feature')!;

        expect(task.action).toEqual({
            type: 'createDocument',
            parentDocumentId: 'trench-2',
            categoryName: 'Feature'
        });
    });


    it('opens notebook follow-up targets', async () => {

        const feature = createDocument('feature-1', 'Feature');
        const memo = createDocument('memo-1', 'PenMemo', {
            date: getTodayLabel(),
            penMemoReviewedTranscript: '[다음 작업] 사진 보강.',
            relations: { depicts: ['feature-1'] }
        });
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    feature,
                    memo
                ]
            }),
            get: jest.fn()
        };
        const routing = {
            jumpToResource: jest.fn()
        };
        const component = createComponent(datastore, createProjectConfiguration(), routing);

        await component.refresh();
        await component.openNotebookEntry(component.getNotebookNextWorkEntries()[0]);

        expect(routing.jumpToResource).toHaveBeenCalledWith(feature);
    });


    it('continues notebook entries as seeded PenMemo drafts', async () => {

        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const feature = createDocument('feature-1', 'Feature');
        const memo = createDocument('memo-1', 'PenMemo', {
            date: getTodayLabel(),
            penMemoReviewedTranscript: [
                '[관찰 내용] 바닥면 정리 중 원형 윤곽 확인.',
                '[다음 작업] 사진 보강.'
            ].join('\n'),
            relations: { depicts: ['feature-1'] }
        });
        const datastore = {
            find: jest.fn().mockResolvedValue({
                documents: [
                    createDocument('project', 'Project'),
                    feature,
                    memo
                ]
            }),
            get: jest.fn().mockResolvedValue(feature)
        };
        const doceditLauncher = {
            editDocument: jest.fn().mockResolvedValue(undefined)
        };
        const component = createComponent(
            datastore,
            createActionProjectConfiguration(),
            { jumpToResource: jest.fn() },
            { deselect: jest.fn(), setMode: jest.fn() },
            { openInformationModal: jest.fn() },
            { navigate: jest.fn() },
            doceditLauncher
        );

        await component.refresh();

        const [entry] = component.getNotebookNextWorkEntries();
        expect(component.canContinueNotebookEntry(entry, 'nextWork')).toBe(true);
        expect(component.getNotebookContinuationActionLabel(entry, 'nextWork')).toBe('다음 이어쓰기');

        await component.continueNotebookEntry(entry, 'nextWork');

        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(doceditLauncher.editDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    identifier: 'pen-memo-1700000000000',
                    category: 'PenMemo',
                    relations: { depicts: ['feature-1'] },
                    shortDescription: 'feature-1 메모 남은 작업',
                    description: '[관찰 내용] 바닥면 정리 중 원형 윤곽 확인.\n\n[스케치·약측/근거 번호]\n\n[다음 작업] 사진 보강.'
                })
            })
        );

        jest.restoreAllMocks();
    });
});


const createComponent = (
    datastore: any,
    projectConfiguration: any = createProjectConfiguration(),
    routing: any = { jumpToResource: jest.fn() },
    viewFacade: any = { deselect: jest.fn(), setMode: jest.fn() },
    menuModalLauncher: any = { openInformationModal: jest.fn() },
    router: any = { navigate: jest.fn() },
    doceditLauncher: any = undefined
) => new KoreanFieldworkPriorityStripComponent(
    datastore,
    { changesNotifications: () => new Subject().asObservable() } as any,
    projectConfiguration,
    routing,
    viewFacade,
    menuModalLauncher,
    router,
    { add: jest.fn() } as any,
    doceditLauncher
);


const createProjectConfiguration = (withKoreanFields: boolean = true) => ({
    getCategory: (categoryName: string) => {
        if (categoryName !== 'Project') return undefined;

        return {
            groups: [
                {
                    name: 'stem',
                    fields: withKoreanFields
                        ? [
                            { name: 'projectInvestigationMode' },
                            { name: 'projectBoundarySummary' }
                        ]
                        : []
                }
            ]
        };
    }
});


const createActionProjectConfiguration = () => ({
    getCategory: (categoryName: string) => ({
        name: categoryName,
        mustLieWithin: false,
        groups: [
            {
                name: 'stem',
                fields: getActionCategoryFields(categoryName)
            }
        ]
    }),
    isAllowedRelationDomainCategory: (
        categoryName: string,
        _parentCategoryName: string,
        relationName: string
    ) => {
        if (relationName === 'isMapLayerOf') return false;
        if (['Photo', 'SoilProfilePhoto', 'Drawing', 'PenMemo'].includes(categoryName)) {
            return relationName === 'depicts';
        }
        if (['DailyLog', 'SurveyBoundary'].includes(categoryName)) {
            return relationName === 'isRecordedIn';
        }
        if (['FeatureSegment', 'Layer'].includes(categoryName)) {
            return relationName === 'liesWithin';
        }
        return relationName === 'liesWithin' || relationName === 'isRecordedIn';
    }
});


const getActionCategoryFields = (categoryName: string) => {
    if (categoryName === 'Project') {
        return [
            { name: 'projectInvestigationMode' },
            { name: 'projectBoundarySummary' }
        ];
    }
    if (categoryName === 'PenMemo') {
        return [
            { name: 'shortDescription' },
            { name: 'description' },
            { name: 'penMemoStrokes' },
            { name: 'penMemoTranscriptionStatus' }
        ];
    }
    if (categoryName === 'Feature') {
        return [
            { name: 'featureType' },
            { name: 'featureInterpretationType' },
            {
                name: 'featureRecordingStatus',
                valuelist: { id: 'KoreanFieldwork-featureRecordingStatus' }
            },
            { name: 'featureInvestigationChecklist' },
            { name: 'featureGeometryRevisionNote' },
            { name: 'geometryConfidence' },
            { name: 'geometrySource' },
            { name: 'shortDescription' }
        ];
    }
    if (categoryName === 'SurveyBoundary') {
        return [
            { name: 'shortDescription' },
            { name: 'surveyBoundaryNote' },
            {
                name: 'surveyBoundaryType',
                valuelist: { id: 'KoreanFieldwork-surveyBoundaryType' }
            }
        ];
    }
    return [];
};


const createDocument = (id: string, category: string, fields: any = {}) => ({
    resource: {
        id,
        identifier: id,
        category,
        relations: {},
        ...fields
    }
});


const getTodayLabel = () => {
    const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);

    return [
        today.getUTCFullYear(),
        String(today.getUTCMonth() + 1).padStart(2, '0'),
        String(today.getUTCDate()).padStart(2, '0')
    ].join('-');
};
