import {
    makeKoreanFieldworkWorkbenchItems
} from '../../../src/app/util/korean-fieldwork-workbench';
import { getKoreanFieldworkRecordFieldValueSummary } from 'idai-field-core';


describe('korean-fieldwork-workbench', () => {

    it('prioritizes records that need field decisions and preserves parent context', () => {

        const operation = createDocument('operation-1', 'Operation', '조사구역 1', {}, {
            fieldRecordQuality: ['immediateRecording'],
            recordCreationTiming: 'duringFieldwork',
            verificationState: 'observedInField'
        });
        const trench = createDocument('trench-1', 'Trench', 'T1', {
            liesWithin: ['operation-1']
        }, {
            fieldRecordQuality: [],
            recordCreationTiming: '',
            verificationState: 'observedInField'
        });
        const feature = createDocument('feature-1', 'Feature', '수혈 1', {
            liesWithin: ['trench-1']
        }, {
            featureRecordingStatus: 'candidate',
            featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
            fieldRecordQuality: [],
            recordCreationTiming: '',
            verificationState: 'pendingDecision'
        });

        const items = makeKoreanFieldworkWorkbenchItems([
            operation,
            trench,
            feature
        ] as any);

        expect(items.map(item => ({
            id: item.id,
            categoryLabel: item.categoryLabel,
            parentPath: item.parentPath,
            reasons: item.reasons,
            tone: item.tone
        }))).toEqual([
            {
                id: 'feature-1',
                categoryLabel: '유구',
                parentPath: '조사구역 1 > T1',
                reasons: ['조사 전', '과정 1/9', '추가 확인', '기록 보완'],
                tone: 'info'
            },
            {
                id: 'trench-1',
                categoryLabel: '트렌치',
                parentPath: '조사구역 1',
                reasons: ['기록 보완', '시점 미입력'],
                tone: 'neutral'
            }
        ]);
    });


    it('omits records that have no active workbench reason', () => {

        const operation = createDocument('operation-1', 'Operation', '조사구역 1', {}, {
            fieldRecordQuality: ['immediateRecording'],
            recordCreationTiming: 'duringFieldwork',
            verificationState: 'observedInField'
        });

        expect(makeKoreanFieldworkWorkbenchItems([operation] as any)).toEqual([]);
    });


    it('counts PenMemo review as a desktop workflow step', () => {

        const feature = createDocument('feature-1', 'Feature', '유구 1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: [
                'preInvestigationPhotoTaken',
                'inProgressPhotoTaken',
                'soilProfilePhotoLinked',
                'measuredDrawingCompleted',
                'preRecoveryFindPhotoTaken',
                'findsRecovered',
                'samplesCollected',
                'penMemoReviewed'
            ],
            fieldRecordQuality: ['immediateRecording'],
            recordCreationTiming: 'duringFieldwork',
            verificationState: 'observedInField'
        });

        const [item] = makeKoreanFieldworkWorkbenchItems([feature] as any);

        expect(item).toEqual(expect.objectContaining({ id: 'feature-1' }));
        expect(item.reasons).toContain('과정 8/9');
    });


    it('uses the investigation mode to surface trial-trench workflow progress on desktop', () => {

        const trench = createDocument('trench-1', 'Trench', 'T1', {}, {
            featureInvestigationChecklist: [
                'trenchSoilCleaned',
                'trenchPitOpened'
            ],
            fieldRecordQuality: ['immediateRecording'],
            recordCreationTiming: 'duringFieldwork',
            verificationState: 'observedInField'
        });

        expect(makeKoreanFieldworkWorkbenchItems([trench] as any)).toEqual([]);
        expect(makeKoreanFieldworkWorkbenchItems([trench] as any, 6, 'trialTrench')).toEqual([
            expect.objectContaining({
                id: 'trench-1',
                reasons: ['과정 2/9'],
                tone: 'info'
            })
        ]);
    });


    it('surfaces field record quality review details with shared Korean labels', () => {

        const operation = createCompleteRecord('operation-1', 'Operation', '\uc870\uc0ac\uad6c\uc5ed 1');
        const qualityReview = createDocument('quality-review-1', 'FieldRecordQualityReview', 'quality-001', {
            isRecordedIn: ['operation-1']
        }, {
            reviewedRecordUnit: ['featureRecord', 'dailyLog'],
            qualityReviewStage: ['sameDayReview', 'sourceRecordCorrection'],
            qualityCorrectionBasis: ['correctionReasonLinked', 'originalRecordPreserved'],
            recordCreationTiming: 'sameDayFieldRecord',
            fieldRecordQuality: ['correctionNeeded'],
            reportEvaluationFeedback: ['fieldRecordReview', 'supplementRequestTracked'],
            verificationState: 'needsRecheck'
        });
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
        const reportFeedback = getKoreanFieldworkRecordFieldValueSummary(
            'reportEvaluationFeedback',
            ['fieldRecordReview', 'supplementRequestTracked']
        )!;

        const [item] = makeKoreanFieldworkWorkbenchItems([
            operation,
            qualityReview
        ] as any);
        const reasonsText = item.reasons.join('\n');

        expect(item).toEqual(expect.objectContaining({
            id: 'quality-review-1',
            parentPath: '\uc870\uc0ac\uad6c\uc5ed 1',
            tone: 'warning',
            actionLabel: '\uac80\ud1a0 \uc5f4\uae30'
        }));
        expect(item.reasons).toEqual([
            `\uac80\ud1a0 \ub300\uc0c1 ${reviewedRecordUnit}`,
            `\uac80\ud1a0 \ub2e8\uacc4 ${reviewStage}`,
            `\uc218\uc815\u00b7\ubcf4\uc644 \uadfc\uac70 ${correctionBasis}`,
            `\ud3c9\uac00 \ud658\ub958 ${reportFeedback}`
        ]);
        expect(reasonsText).not.toContain('featureRecord');
        expect(reasonsText).not.toContain('sourceRecordCorrection');
        expect(reasonsText).not.toContain('correctionReasonLinked');
        expect(reasonsText).not.toContain('supplementRequestTracked');
    });


    it('surfaces soil profile photos with photo-derived Munsell candidates for desktop review', () => {

        const operation = createCompleteRecord('operation-1', 'Operation', '조사구역 1');
        const layer = createCompleteRecord('layer-1', 'Layer', '토층 1', {
            liesWithin: ['operation-1']
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', '토층사진 1', {
            depicts: ['layer-1']
        }, {
            soilColorAssistStatus: 'candidatesAvailable',
            soilColorAssistCandidates: '1: 10YR 4/3 (높음, 차이 0.0)',
            soilProfileColorSwatches: '[]'
        });

        const items = makeKoreanFieldworkWorkbenchItems([
            operation,
            layer,
            soilProfilePhoto
        ] as any);

        expect(items).toEqual([
            expect.objectContaining({
                id: 'soil-photo-1',
                categoryLabel: '토층사진',
                parentPath: '조사구역 1 > 토층 1',
                reasons: ['토색 후보', '먼셀 후보 10YR 4/3', '토색 미기록'],
                tone: 'warning',
                actionLabel: '토색 검토'
            })
        ]);
    });


    it('omits reviewed soil profile photos from the workbench', () => {

        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', '토층사진 1', {}, {
            soilColorAssistStatus: 'reviewed',
            soilProfileColorSwatches: '1: 10YR 4/3'
        });

        expect(makeKoreanFieldworkWorkbenchItems([soilProfilePhoto] as any)).toEqual([]);
    });


    it('surfaces tablet photos and drawings as desktop processing records', () => {

        const feature = createDocument('feature-1', 'Feature', '유구 1', {}, {
            fieldRecordQuality: ['immediateRecording'],
            recordCreationTiming: 'duringFieldwork',
            verificationState: 'observedInField',
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: [
                'preInvestigationPhotoTaken',
                'inProgressPhotoTaken',
                'soilProfilePhotoLinked',
                'measuredDrawingCompleted',
                'preRecoveryFindPhotoTaken',
                'findsRecovered',
                'findRecordsLinked',
                'samplesCollected',
                'penMemoReviewed'
            ]
        });
        const photo = createDocument('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1.jpg',
            fieldworkPhotoAnnotationStrokes:
                '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":2000,"y":2000}]}]}'
        });
        const drawing = createDocument('drawing-1', 'Drawing', 'D1', {
            isDepictedIn: ['feature-1']
        }, {
            drawingSketchStrokes:
                '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}'
        });

        const items = makeKoreanFieldworkWorkbenchItems([
            feature,
            photo,
            drawing
        ] as any);

        expect(items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'photo-1',
                categoryLabel: '\uc0ac\uc9c4',
                parentPath: '\uc720\uad6c 1',
                reasons: [
                    '\ud655\uc778 1',
                    '\uc6d0\ubcf8 \ubcf4\uc874 \ud655\uc778',
                    '\uc0ac\uc9c4 \uc815\ubcf4 \ud655\uc778',
                    '\uc0ac\uc9c4 \ud45c\uc2dc \uc124\uba85'
                ],
                tone: 'warning',
                actionLabel: '\uc0ac\uc9c4 \uac80\ud1a0'
            }),
            expect.objectContaining({
                id: 'drawing-1',
                categoryLabel: '\ub3c4\uba74',
                parentPath: '\uc720\uad6c 1',
                reasons: ['\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58 \ud655\uc778'],
                tone: 'neutral',
                actionLabel: '\ub3c4\uba74 \uac80\ud1a0'
            })
        ]));
    });


    it('surfaces tablet feature sketches and pit lines as desktop processing records', () => {

        const feature = createDocument('feature-1', 'Feature', '\uc720\uad6c 1', {}, {
            fieldRecordQuality: ['immediateRecording'],
            recordCreationTiming: 'duringFieldwork',
            verificationState: 'observedInField',
            featureRecordingStatus: 'confirmed',
            featureLocationSketch: JSON.stringify({
                shape: 'oval',
                center: { x: 50, y: 50 },
                scale: 80
            }),
            featureFreeDrawingStrokes: JSON.stringify({
                version: 1,
                strokes: [
                    { points: [{ x: 10, y: 20 }, { x: 40, y: 50 }] }
                ]
            }),
            featureSoilPitLines: JSON.stringify([
                {
                    label: '1',
                    start: { x: 10, y: 20 },
                    end: { x: 80, y: 25 },
                    points: [{ x: 10, y: 20 }, { x: 80, y: 25 }]
                },
                {
                    label: '2',
                    start: { x: 30, y: 40 },
                    end: { x: 30, y: 70 },
                    points: [{ x: 30, y: 40 }, { x: 30, y: 70 }]
                }
            ])
        });

        const items = makeKoreanFieldworkWorkbenchItems([feature] as any);

        expect(items).toEqual([
            expect.objectContaining({
                id: 'feature-1',
                reasons: expect.arrayContaining([
                    '위치 약도',
                    '자유 스케치',
                    '피트선 2'
                ])
            })
        ]);
    });


    it('surfaces tablet find and sample spot points as desktop processing records', () => {

        const feature = createCompleteRecord('feature-1', 'Feature', '\uc720\uad6c 1');
        const find = createCompleteRecord('find-1', 'Find', 'F1', {
            isPresentIn: ['feature-1']
        }) as any;
        find.resource.findSpotItems = JSON.stringify({
            version: 1,
            items: [
                { number: 1, point: { x: 25, y: 75 }, label: 'bronze fragment' },
                { number: 2, point: { x: 40, y: 60 }, label: 'rim sherd' }
            ]
        });
        const sample = createCompleteRecord('sample-1', 'Sample', 'S1', {
            isPresentIn: ['feature-1']
        }) as any;
        sample.resource.findSpotItems = JSON.stringify({
            version: 1,
            items: [
                { number: 1, point: { x: 50, y: 40 }, label: 'charcoal bag' }
            ]
        });

        const items = makeKoreanFieldworkWorkbenchItems([
            feature,
            find,
            sample
        ] as any);

        expect(items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'find-1',
                parentPath: '\uc720\uad6c 1',
                reasons: expect.arrayContaining(['\ucd9c\ud1a0 \uc704\uce58\uc810 2'])
            }),
            expect.objectContaining({
                id: 'sample-1',
                parentPath: '\uc720\uad6c 1',
                reasons: expect.arrayContaining(['\ucc44\ucde8 \uc704\uce58\uc810 1'])
            })
        ]));
    });


    it('surfaces handwritten PenMemo records that still need transcription review', () => {

        const feature = createCompleteRecord('feature-1', 'Feature', '수혈 1');
        const memo = createDocument('memo-1', 'PenMemo', '메모 1', {
            depicts: ['feature-1']
        }, {
            penMemoStrokes: '{"version":1,"strokes":[[{"x":1,"y":2}]]}',
            penMemoTranscriptionStatus: 'pending'
        });

        const items = makeKoreanFieldworkWorkbenchItems([
            feature,
            memo
        ] as any);

        expect(items).toContainEqual(expect.objectContaining({
            id: 'memo-1',
            categoryLabel: '야장 메모',
            parentPath: '수혈 1',
            reasons: ['태블릿 손글씨 원자료', '스케치 메모 1획/1점.'],
            tone: 'warning',
            actionLabel: '메모 검토'
        }));
    });


    it('surfaces auto-transcribed PenMemo records until a reviewed transcript exists', () => {

        const memo = createDocument('memo-1', 'PenMemo', '메모 1', {}, {
            penMemoAutoTranscript: '[관찰 내용] 바닥면 추가 정리.',
            penMemoTranscriptionStatus: 'pending',
            penMemoStrokes: '[]'
        });

        const items = makeKoreanFieldworkWorkbenchItems([memo] as any);

        expect(items).toEqual([
            expect.objectContaining({
                id: 'memo-1',
                reasons: ['자동 전사 검토'],
                tone: 'warning',
                actionLabel: '메모 검토'
            })
        ]);
    });


    it('omits empty and reviewed PenMemo records from the workbench', () => {

        const emptyMemo = createDocument('memo-empty', 'PenMemo', '빈 메모', {}, {
            penMemoStrokes: '[]',
            penMemoTranscriptionStatus: 'pending'
        });
        const reviewedMemo = createDocument('memo-reviewed', 'PenMemo', '검토 메모', {}, {
            penMemoStrokes: '{"version":1,"strokes":[[{"x":1,"y":2}]]}',
            penMemoReviewedTranscript: '[관찰 내용] 바닥면 정리 완료.',
            penMemoTranscriptionStatus: 'reviewed'
        });

        expect(makeKoreanFieldworkWorkbenchItems([
            emptyMemo,
            reviewedMemo
        ] as any)).toEqual([]);
    });
});


const createDocument = (
        id: string,
        category: string,
        identifier: string,
        relations: Record<string, string[]> = {},
        fields: Record<string, unknown> = {}
) => ({
    resource: {
        id,
        identifier,
        category,
        relations,
        ...fields
    }
});


const createCompleteRecord = (
        id: string,
        category: string,
        identifier: string,
        relations: Record<string, string[]> = {}
) => createDocument(id, category, identifier, relations, {
    fieldRecordQuality: ['immediateRecording'],
    recordCreationTiming: 'duringFieldwork',
    verificationState: 'observedInField'
});
