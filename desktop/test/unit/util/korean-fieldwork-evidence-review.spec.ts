import {
    getPenMemoSketchPreview,
    getPenMemoSketchSummaries,
    getPhotoAnnotationSketchPreview,
    getPhotoAnnotationSummaryLabel,
    getPhotoAnnotationSummaries,
    getPenMemoTranscriptionSummaryLabel,
    getPendingPenMemoTranscriptionDocuments,
    getSoilColorCandidateSummaries,
    getSoilColorSwatchSummaries,
    makeKoreanFieldworkEvidenceReview
} from '../../../src/app/util/korean-fieldwork-evidence-review';


describe('korean-fieldwork-evidence-review', () => {

    it('flags tablet handwriting PenMemo records until a reviewed transcript exists', () => {

        const feature = createDocument('feature-1', 'Feature');
        const pendingHandwritingMemo = createDocument('memo-1', 'PenMemo', {
            relations: { depicts: ['feature-1'] },
            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20}]}]}',
            penMemoTranscriptionStatus: 'pending'
        });
        const reviewedHandwritingMemo = createDocument('memo-2', 'PenMemo', {
            relations: { depicts: ['feature-1'] },
            penMemoReviewedTranscript: '[관찰 내용] 바닥면 정리 완료.',
            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":30,"y":40}]}]}',
            penMemoTranscriptionStatus: 'reviewed'
        });

        const review = makeKoreanFieldworkEvidenceReview(feature as any, [
            feature,
            pendingHandwritingMemo,
            reviewedHandwritingMemo,
            createDocument('photo-1', 'Photo', { relations: { depicts: ['feature-1'] } }),
            createDocument('drawing-1', 'Drawing', { relations: { depicts: ['feature-1'] } }),
            createDocument('report-1', 'ReportPreparationReview', { relations: { isRecordedIn: ['feature-1'] } })
        ] as any);

        expect(review.penMemos.length).toBe(2);
        expect(review.pendingPenMemoTranscriptions.map(document => document.resource.id))
            .toEqual(['memo-1']);
        expect(review.penMemoTranscriptionSummaries.map(summary => ({
            id: summary.document.resource.id,
            label: summary.label
        }))).toEqual([
            {
                id: 'memo-1',
                label: '태블릿 손글씨 원자료 · 스케치 메모 1획/1점.'
            }
        ]);
        expect(review.penMemoSketchSummaries.map(summary => ({
            id: summary.document.resource.id,
            strokeCount: summary.strokeCount,
            pointCount: summary.pointCount,
            pendingTranscription: summary.pendingTranscription
        }))).toEqual([
            {
                id: 'memo-1',
                strokeCount: 1,
                pointCount: 1,
                pendingTranscription: true
            },
            {
                id: 'memo-2',
                strokeCount: 1,
                pointCount: 1,
                pendingTranscription: false
            }
        ]);
        expect(review.missingEvidenceKinds).toContain('penMemoTranscription');
        expect(review.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                documentId: 'memo-1',
                ruleId: 'pen-memo-handwriting-transcription',
                message: '태블릿 손글씨 야장 메모가 아직 전사되지 않았습니다. 스케치 메모 1획/1점.',
                recommendedAction: '태블릿 손글씨 원자료 · 스케치 메모 1획/1점. 태블릿 손글씨 원자료를 읽어 검토 전사문으로 남기세요.'
            })
        ]));
        expect(review.reportReady).toBe(false);
    });


    it('summarizes tablet sketch memo stroke and point counts for desktop review', () => {

        const summaries = getPenMemoSketchSummaries([
            createDocument('memo-sketch', 'PenMemo', {
                penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":12,"y":21}]},{"points":[{"x":30,"y":40}]}]}',
                penMemoTranscriptionStatus: 'pending'
            }),
            createDocument('memo-reviewed', 'PenMemo', {
                penMemoReviewedTranscript: '[관찰 내용] 평면 약측 전사.',
                penMemoStrokes: '[[{"x":1,"y":2},{"x":3,"y":4}]]',
                penMemoTranscriptionStatus: 'reviewed'
            }),
            createDocument('memo-empty', 'PenMemo', {
                penMemoStrokes: '[]'
            })
        ] as any);

        expect(summaries.map(summary => ({
            id: summary.document.resource.id,
            strokeCount: summary.strokeCount,
            pointCount: summary.pointCount,
            pendingTranscription: summary.pendingTranscription
        }))).toEqual([
            {
                id: 'memo-sketch',
                strokeCount: 2,
                pointCount: 3,
                pendingTranscription: true
            },
            {
                id: 'memo-reviewed',
                strokeCount: 1,
                pointCount: 2,
                pendingTranscription: false
            }
        ]);
    });


    it('builds desktop SVG previews from tablet sketch memo strokes', () => {

        const preview = getPenMemoSketchPreview(JSON.stringify({
            version: 1,
            strokes: [
                { points: [{ x: 10, y: 20 }, { x: 40, y: 50 }] },
                { points: [{ x: 80, y: 20 }] }
            ]
        }));

        expect(preview).toEqual({
            label: '스케치 메모 2획/3점.',
            path: 'M 8 13.7 L 52.6 58.3 M 110 13.7 L 114 13.7 M 112 11.7 L 112 15.7',
            viewBox: '0 0 120 72'
        });
        expect(getPenMemoSketchPreview('[]')).toBeUndefined();
    });


    it('preserves boundary-normalized tablet sketch positions for shared site overviews', () => {

        const preview = getPenMemoSketchPreview(JSON.stringify({
            version: 1,
            strokes: [
                { points: [{ x: 1000, y: 2000 }, { x: 9000, y: 8000 }] }
            ]
        }), {
            normalizedCanvasAspectRatio: 1.5,
            preserveNormalizedCanvas: true
        });

        expect(preview).toEqual({
            label: '스케치 메모 1획 2점',
            path: 'M 26.4 19.2 L 93.6 52.8',
            viewBox: '0 0 120 72'
        });
    });


    it('clips only the erased portion of a long tablet pen segment in the desktop preview', () => {

        const preview = getPenMemoSketchPreview(JSON.stringify({
            version: 1,
            strokes: [
                {
                    points: [{ x: 2000, y: 5000 }, { x: 8000, y: 5000 }],
                    tool: 'pen',
                    width: 8
                },
                {
                    points: [{ x: 5000, y: 3000 }, { x: 5000, y: 7000 }],
                    tool: 'eraser',
                    width: 12
                }
            ]
        }), {
            normalizedCanvasAspectRatio: 1.5,
            preserveNormalizedCanvas: true
        });

        expect(preview?.path).toBe(
            'M 34.8 36 L 59.1 36 M 60.9 36 L 85.2 36'
        );
    });


    it('summarizes tablet photo annotations for desktop review panels', () => {

        const photoStrokes = '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}';
        const soilProfilePhotoStrokes = '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}';
        const summaries = getPhotoAnnotationSummaries([
            createDocument('photo-annotated', 'Photo', {
                fieldworkPhotoAnnotationStrokes: photoStrokes
            })
        ] as any, [
            createDocument('soil-photo-annotated', 'SoilProfilePhoto', {
                soilProfilePhotoAnnotationStrokes: soilProfilePhotoStrokes
            }),
            createDocument('soil-photo-legacy', 'SoilProfilePhoto', {
                soilProfileAnnotationStrokes: '[[{"x":1,"y":2}]]'
            }),
            createDocument('soil-photo-empty', 'SoilProfilePhoto', {
                soilProfilePhotoAnnotationStrokes: '[]'
            })
        ] as any);

        expect(summaries.map(summary => ({
            id: summary.document.resource.id,
            label: summary.label,
            preview: summary.preview,
            source: summary.source
        }))).toEqual([
            {
                id: 'photo-annotated',
                label: '사진 표시 1획/2점',
                preview: expect.objectContaining({
                    label: '사진 표시 1획/2점',
                    viewBox: '0 0 120 72'
                }),
                source: 'photo'
            },
            {
                id: 'soil-photo-annotated',
                label: '사진 표시 1획/1점',
                preview: expect.objectContaining({
                    label: '사진 표시 1획/1점',
                    viewBox: '0 0 120 72'
                }),
                source: 'soilProfilePhoto'
            },
            {
                id: 'soil-photo-legacy',
                label: '사진 표시 1획/1점',
                preview: expect.objectContaining({
                    label: '사진 표시 1획/1점',
                    viewBox: '0 0 120 72'
                }),
                source: 'soilProfilePhoto'
            }
        ]);
        expect(getPhotoAnnotationSketchPreview(photoStrokes)).toEqual(expect.objectContaining({
            label: '사진 표시 1획/2점',
            path: 'M 32 8 L 88 64'
        }));

        expect(makeKoreanFieldworkEvidenceReview(
            createDocument('feature-1', 'Feature') as any,
            [
                createDocument('feature-1', 'Feature'),
                createDocument('photo-annotated', 'Photo', {
                    relations: { depicts: ['feature-1'] },
                    fieldworkPhotoAnnotationStrokes: photoStrokes
                }),
                createDocument('soil-photo-annotated', 'SoilProfilePhoto', {
                    relations: { depicts: ['feature-1'] },
                    soilProfilePhotoAnnotationStrokes: soilProfilePhotoStrokes
                })
            ] as any
        ).photoAnnotationSummaries.map(summary => summary.document.resource.id))
            .toEqual(['photo-annotated', 'soil-photo-annotated']);
    });


    it('keeps tablet photo annotation update times visible for desktop review panels', () => {

        const photoStrokes = '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}';
        const soilProfilePhotoStrokes = '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}';
        const photoLabel = getPhotoAnnotationSummaryLabel(photoStrokes);
        const soilProfilePhotoLabel = getPhotoAnnotationSummaryLabel(soilProfilePhotoStrokes);

        const summaries = getPhotoAnnotationSummaries([
            createDocument('photo-annotated', 'Photo', {
                fieldworkPhotoAnnotationStrokes: photoStrokes,
                fieldworkPhotoAnnotationUpdatedAt: '2026-06-23T08:34:00.000Z'
            })
        ] as any, [
            createDocument('soil-photo-annotated', 'SoilProfilePhoto', {
                soilProfilePhotoAnnotationStrokes: soilProfilePhotoStrokes,
                soilProfilePhotoAnnotationUpdatedAt: '2026-06-23T08:35:00.000Z'
            }),
            createDocument('soil-photo-legacy', 'SoilProfilePhoto', {
                soilProfileAnnotationStrokes: '[[{"x":1,"y":2}]]',
                soilProfilePhotoAnnotationUpdatedAt: '2026-06-23T08:36:00.000Z'
            })
        ] as any);

        expect(summaries.map(summary => ({
            id: summary.document.resource.id,
            label: summary.label,
            previewLabel: summary.preview.label,
            updatedAt: summary.updatedAt
        }))).toEqual([
            {
                id: 'photo-annotated',
                label: `${photoLabel} · 수정 2026-06-23T08:34:00.000Z`,
                previewLabel: photoLabel,
                updatedAt: '2026-06-23T08:34:00.000Z'
            },
            {
                id: 'soil-photo-annotated',
                label: `${soilProfilePhotoLabel} · 수정 2026-06-23T08:35:00.000Z`,
                previewLabel: soilProfilePhotoLabel,
                updatedAt: '2026-06-23T08:35:00.000Z'
            },
            {
                id: 'soil-photo-legacy',
                label: getPhotoAnnotationSummaryLabel('[[{"x":1,"y":2}]]'),
                previewLabel: getPhotoAnnotationSummaryLabel('[[{"x":1,"y":2}]]'),
                updatedAt: undefined
            }
        ]);
    });


    it('keeps annotations visible when the opened desktop record is the tablet photo itself', () => {

        const annotatedPhoto = createDocument('photo-annotated', 'Photo', {
            fieldworkPhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}'
        });
        const annotatedSoilPhoto = createDocument('soil-photo-annotated', 'SoilProfilePhoto', {
            soilProfilePhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}',
            soilColorAssistCandidates: '1: 10YR 4/3 (높음)'
        });

        expect(makeKoreanFieldworkEvidenceReview(
            annotatedPhoto as any,
            [annotatedPhoto] as any
        ).photoAnnotationSummaries.map(summary => ({
            id: summary.document.resource.id,
            label: summary.label,
            source: summary.source
        }))).toEqual([
            {
                id: 'photo-annotated',
                label: '사진 표시 1획/2점',
                source: 'photo'
            }
        ]);

        const soilPhotoReview = makeKoreanFieldworkEvidenceReview(
            annotatedSoilPhoto as any,
            [annotatedSoilPhoto] as any
        );

        expect(soilPhotoReview.photoAnnotationSummaries.map(summary => ({
            id: summary.document.resource.id,
            label: summary.label,
            source: summary.source
        }))).toEqual([
            {
                id: 'soil-photo-annotated',
                label: '사진 표시 1획/1점',
                source: 'soilProfilePhoto'
            }
        ]);
        expect(soilPhotoReview.soilColorCandidateSummaries.map(summary => ({
            id: summary.document.resource.id,
            label: summary.label
        }))).toEqual([
            {
                id: 'soil-photo-annotated',
                label: '먼셀 후보 10YR 4/3'
            }
        ]);
    });


    it('counts the opened tablet media record itself as desktop review evidence', () => {

        const photo = createDocument('photo-1', 'Photo', {
            fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg'
        });
        const soilProfilePhoto = createDocument('soil-photo-1', 'SoilProfilePhoto', {
            soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg'
        });
        const drawing = createDocument('drawing-1', 'Drawing', {
            fileUri: 'file:///tablet/drawings/drawing-1.jpg'
        });

        const photoReview = makeKoreanFieldworkEvidenceReview(photo as any, [photo] as any);
        const soilPhotoReview = makeKoreanFieldworkEvidenceReview(
            soilProfilePhoto as any,
            [soilProfilePhoto] as any
        );
        const drawingReview = makeKoreanFieldworkEvidenceReview(drawing as any, [drawing] as any);

        expect(photoReview.photos.map(document => document.resource.id)).toEqual(['photo-1']);
        expect(photoReview.missingEvidenceKinds).not.toContain('photo');
        expect(soilPhotoReview.soilProfilePhotos.map(document => document.resource.id))
            .toEqual(['soil-photo-1']);
        expect(soilPhotoReview.missingEvidenceKinds).not.toContain('photo');
        expect(drawingReview.drawings.map(document => document.resource.id)).toEqual(['drawing-1']);
        expect(drawingReview.missingEvidenceKinds).not.toContain('drawing');
    });


    it('summarizes photo-derived soil color candidates for desktop review panels', () => {

        const summaries = getSoilColorCandidateSummaries([
            createDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilColorAssistCandidates: [
                    '사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                    '1: 10YR 4/3 (높음)',
                    '2: 7.5YR 4/3 (보통)'
                ].join('\n')
            }),
            createDocument('soil-photo-empty', 'SoilProfilePhoto', {
                soilColorAssistCandidates: '사진 색상 샘플을 읽지 못했습니다.'
            })
        ] as any);

        expect(summaries).toEqual([
            expect.objectContaining({
                candidates: ['10YR 4/3', '7.5YR 4/3'],
                document: expect.objectContaining({
                    resource: expect.objectContaining({ id: 'soil-photo-1' })
                }),
                label: '먼셀 후보 10YR 4/3, 7.5YR 4/3 · 사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                sampleSourceLabel: '사진 선택 지점 20%/50% 평균 RGB 111/87/61'
            })
        ]);
    });


    it('prefers accepted layer sample locations in desktop soil color review labels', () => {

        const summaries = getSoilColorCandidateSummaries([
            createDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilColorAssistCandidates: [
                    '사진 선택 지점 80%/45% 평균 RGB 139/128/88',
                    '1: 2.5Y 5/3 (높음)',
                    '2: 10YR 4/3 (보통)'
                ].join('\n'),
                soilProfileColorSwatches: [
                    '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                    '2: 2.5Y 5/3 RGB 139/128/88 @ 80%/45%'
                ].join('\n')
            })
        ] as any);

        expect(summaries).toEqual([
            expect.objectContaining({
                candidates: ['2.5Y 5/3', '10YR 4/3'],
                label: '먼셀 후보 2.5Y 5/3, 10YR 4/3 · '
                    + '1층: RGB 111/87/61 @ 20%/50%, 2층: RGB 139/128/88 @ 80%/45%',
                sampleSourceLabel: '1층: RGB 111/87/61 @ 20%/50%, 2층: RGB 139/128/88 @ 80%/45%'
            })
        ]);
        expect(summaries[0].label)
            .not.toContain('사진 선택 지점 80%/45% 평균 RGB 139/128/88');
    });


    it('summarizes tablet layer-by-layer soil color swatches without photo candidates', () => {

        const summaries = getSoilColorSwatchSummaries([
            createDocument('soil-photo-lines', 'SoilProfilePhoto', {
                soilProfileColorSwatches: '1: 10YR 4/3\n2: \n3: 7.5YR 4/4'
            }),
            createDocument('soil-photo-json', 'SoilProfilePhoto', {
                soilProfileColorSwatches: JSON.stringify([
                    { munsell: '2.5Y 5/3', hex: '#91845f', source: 'tablet-eyedropper' }
                ])
            }),
            createDocument('soil-photo-empty', 'SoilProfilePhoto', {
                soilProfileColorSwatches: '[]'
            })
        ] as any);

        expect(summaries.map(summary => ({
            id: summary.document.resource.id,
            entries: summary.entries,
            label: summary.label
        }))).toEqual([
            {
                id: 'soil-photo-lines',
                entries: ['1: 10YR 4/3', '3: 7.5YR 4/4'],
                label: '층별 토색 2개 · 1: 10YR 4/3, 3: 7.5YR 4/4'
            },
            {
                id: 'soil-photo-json',
                entries: ['1: 2.5Y 5/3'],
                label: '층별 토색 1개 · 1: 2.5Y 5/3'
            }
        ]);
    });


    it('flags auto-transcribed PenMemo records until desktop review confirms the transcript', () => {

        const pendingAutoMemo = createDocument('memo-auto', 'PenMemo', {
            penMemoAutoTranscript: '[관찰 내용] 바닥 추가 정리.',
            penMemoTranscriptionStatus: 'pending',
            penMemoStrokes: '[]'
        });
        const reviewedAutoMemo = createDocument('memo-reviewed', 'PenMemo', {
            penMemoAutoTranscript: '[관찰 내용] 아궁이 정리.',
            penMemoReviewedTranscript: '[관찰 내용] 아궁이 정리.',
            penMemoTranscriptionStatus: 'reviewed',
            penMemoStrokes: '[]'
        });

        expect(getPendingPenMemoTranscriptionDocuments([
            pendingAutoMemo,
            reviewedAutoMemo
        ] as any).map(document => document.resource.id)).toEqual(['memo-auto']);

        expect(makeKoreanFieldworkEvidenceReview(
            createDocument('feature-1', 'Feature') as any,
            [
                createDocument('feature-1', 'Feature'),
                {
                    ...pendingAutoMemo,
                    resource: {
                        ...pendingAutoMemo.resource,
                        relations: { depicts: ['feature-1'] }
                    }
                }
            ] as any
        ).issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                documentId: 'memo-auto',
                ruleId: 'pen-memo-auto-transcript-review',
                recommendedAction: '자동 전사 검토. 자동 전사를 확인하고 검토 전사문으로 확정하세요.'
            })
        ]));
    });


    it('labels mixed handwriting and auto transcription as a source comparison task', () => {

        const memo = createDocument('memo-mixed', 'PenMemo', {
            penMemoAutoTranscript: '[관찰 내용] 평면 윤곽 전사.',
            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":11,"y":21}]}]}',
            penMemoTranscriptionStatus: 'pending'
        });

        expect(getPenMemoTranscriptionSummaryLabel(memo as any))
            .toBe('태블릿 손글씨·자동 전사 · 스케치 메모 1획/2점.');
        expect(makeKoreanFieldworkEvidenceReview(
            createDocument('feature-1', 'Feature') as any,
            [
                createDocument('feature-1', 'Feature'),
                {
                    ...memo,
                    resource: {
                        ...memo.resource,
                        relations: { depicts: ['feature-1'] }
                    }
                }
            ] as any
        ).issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                ruleId: 'pen-memo-auto-transcript-review',
                recommendedAction: '태블릿 손글씨·자동 전사 · 스케치 메모 1획/2점. 자동 전사를 원본 손글씨와 대조하고 검토 전사문으로 확정하세요.'
            })
        ]));
    });
});


const createDocument = (
    id: string,
    category: string,
    resource: Record<string, unknown> = {}
) => ({
    resource: {
        id,
        identifier: id,
        category,
        relations: {},
        ...resource
    }
});
