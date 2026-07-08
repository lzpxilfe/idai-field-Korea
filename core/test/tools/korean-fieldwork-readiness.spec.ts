import {
    buildEvidenceBundle,
    getKoreanFieldworkCloseoutSummary,
    getKoreanFieldworkCloseoutReviewIssues,
    getKoreanFieldworkReadinessIssues,
    getKoreanFieldworkTodaySummary,
    makeKoreanFieldworkCloseoutSummary,
    searchTermAuthorities
} from '../../src/tools/korean-fieldwork-readiness';


describe('Korean fieldwork readiness', () => {

    it('reports non-blocking field closeout issues from existing KoreanFieldwork fields', () => {

        const documents: any[] = [
            makeDocument('feature-1', 'Feature', {
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: ['findsRecovered', 'soilProfilePhotoLinked'],
                featureSoilProfilePhotoCount: 1
            }),
            makeDocument('feature-2', 'Feature', {
                featureGeometryEditStatus: 'needsAerialAlignment'
            }),
            makeDocument('find-1', 'Find', {
                relations: { liesWithin: ['feature-1'] }
            }),
            makeDocument('sample-1', 'Sample', {
                relations: { liesWithin: ['feature-1'] }
            }),
            makeDocument('report-1', 'ReportPreparationReview', {
                relations: { isSubjectOf: ['feature-1'] }
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);
        const issueIds = issues.map((issue) => issue.ruleId);

        expect(issueIds).toContain('feature-complete-photo');
        expect(issueIds).toContain('finds-recovered-pre-photo');
        expect(issueIds).toContain('soil-profile-photo-count');
        expect(issueIds).toContain('feature-geometry-needs-aerial-alignment');
        expect(issueIds).toContain('sample-purpose');
        expect(issueIds).toContain('find-label-register');
        expect(issueIds).toContain('report-cross-check');
        expect(issues.every((issue) => issue.blocksSave === false)).toBe(true);
    });


    it('builds evidence bundles around a feature without creating a Harris Matrix graph', () => {

        const feature = makeDocument('feature-1', 'Feature');
        const documents: any[] = [
            feature,
            makeDocument('segment-1', 'FeatureSegment', { relations: { liesWithin: ['feature-1'] } }),
            makeDocument('layer-1', 'Layer', { relations: { liesWithin: ['segment-1'] } }),
            makeDocument('photo-1', 'Photo', { relations: { isDepictedIn: ['feature-1'] } }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', { relations: { depicts: ['feature-1'] } }),
            makeDocument('drawing-1', 'Drawing', { relations: { isDepictedIn: ['feature-1'] } }),
            makeDocument('pen-1', 'PenMemo', { relations: { depicts: ['feature-1'] } }),
            makeDocument('find-1', 'Find', { relations: { liesWithin: ['feature-1'] } }),
            makeDocument('find-collection-1', 'FindCollection', { relations: { liesWithin: ['feature-1'] } }),
            makeDocument('sample-1', 'Sample', { relations: { liesWithin: ['feature-1'] } }),
            makeDocument('prep-1', 'ReportPreparationReview', { relations: { isSubjectOf: ['feature-1'] } }),
            makeDocument('cross-1', 'ReportEditorialCrossCheck', { relations: { isSubjectOf: ['feature-1'] } })
        ];

        const bundle = buildEvidenceBundle(feature as any, documents as any);

        expect(bundle.featureSegments.length).toBe(1);
        expect(bundle.layers.length).toBe(1);
        expect(bundle.photos.length).toBe(1);
        expect(bundle.soilProfilePhotos.length).toBe(1);
        expect(bundle.drawings.length).toBe(1);
        expect(bundle.penMemos.length).toBe(1);
        expect(bundle.finds.map((document) => document.resource.id)).toEqual(['find-1', 'find-collection-1']);
        expect(bundle.samples.length).toBe(1);
        expect(bundle.reportPreparationReviews.length).toBe(1);
        expect(bundle.reportEditorialCrossChecks.length).toBe(1);
    });


    it('counts directly attached tablet photos as photo evidence', () => {

        const feature = makeDocument('feature-1', 'Feature', {
            fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg'
        });

        const bundle = buildEvidenceBundle(feature as any, [feature] as any);

        expect(bundle.photos.map((document) => document.resource.id)).toEqual(['feature-1']);
    });


    it('reports local tablet media without confirmed original preservation', () => {

        const documents: any[] = [
            makeDocument('feature-photo-1', 'Feature', {
                fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg'
            }),
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg'
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'content://tablet/photos/soil-photo-1.jpg'
            }),
            makeDocument('drawing-1', 'Drawing', {
                fileUri: 'file:///tablet/drawings/drawing-1.jpg'
            }),
            makeDocument('photo-2', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-2.jpg',
                digitalSourcePreservation: [
                    'originalPhoto',
                    'originalImage',
                    'webOrServerBackup',
                    'backupVerified'
                ],
                fieldworkImageUploadStatus: 'uploaded',
                fieldworkImageUploadedAt: '2026-06-23T01:02:03.000Z',
                fieldworkImageUploadedUri: 'file:///tablet/photos/photo-2.jpg',
                fieldworkImageUploadTarget:
                    'https://field.example/files/fieldwork/photo-2?type=original_image',
                fieldworkImageUploadedProject: 'fieldwork',
                fieldworkImageUploadedSizeBytes: 481516,
                fieldworkImageUploadedMd5: 'tablet-md5',
                fieldworkImageStoredSizeBytes: 481516,
                fieldworkImageStoredMd5: 'tablet-md5',
                fieldworkImageStoredSha256: 'server-sha256'
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);

        expect(issues.map((issue) => issue.ruleId)).toEqual([
            'fieldwork-attached-photo-upload-missing',
            'fieldwork-photo-upload-missing',
            'soil-profile-photo-upload-missing',
            'fieldwork-drawing-upload-missing'
        ]);
        expect(issues[0].documentId).toBe('feature-photo-1');
        expect(issues[0].message).toBe(
            '기록에 직접 붙은 태블릿 사진 원본 보존 상태가 아직 확인되지 않았습니다.'
        );
        expect(issues[1].documentId).toBe('photo-1');
        expect(issues[1].relatedFields).toEqual([
            'fieldworkImageUploadStatus',
            'fieldworkImageUploadedAt',
            'fieldworkImageUploadedUri',
            'fieldworkImageUploadTarget',
            'fieldworkImageUploadedProject',
            'fieldworkImageUploadedSizeBytes',
            'fieldworkImageUploadedMd5',
            'fieldworkImageStoredSizeBytes',
            'fieldworkImageStoredMd5',
            'fieldworkImageStoredSha256',
            'digitalSourcePreservation'
        ]);
        expect(issues[3]).toEqual(jasmine.objectContaining({
            documentId: 'drawing-1',
            message: '도면 원본 보존 상태가 아직 확인되지 않았습니다.'
        }));
    });


    it('accepts locally preserved tablet media when server upload audit fields are absent', () => {

        const documents: any[] = [
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
                digitalSourcePreservation: [
                    'originalPhoto',
                    'originalImage',
                    'webOrServerBackup',
                    'backupVerified'
                ]
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                digitalSourcePreservation: [
                    'originalPhoto',
                    'originalImage',
                    'webOrServerBackup',
                    'backupVerified'
                ]
            }),
            makeDocument('drawing-1', 'Drawing', {
                fileUri: 'file:///tablet/drawings/drawing-1.jpg',
                digitalSourcePreservation: [
                    'originalDrawing',
                    'webOrServerBackup',
                    'backupVerified'
                ]
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);

        expect(issues.filter((issue) => issue.ruleId.endsWith('-upload-missing'))).toEqual([]);
    });


    it('keeps reporting tablet media when upload audit fields are incomplete', () => {

        const documents: any[] = [
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
                fieldworkImageUploadStatus: 'uploaded',
                fieldworkImageUploadedAt: '2026-06-23T01:02:03.000Z',
                fieldworkImageUploadedUri: 'file:///tablet/photos/previous-photo.jpg',
                fieldworkImageUploadTarget:
                    'https://field.example/files/fieldwork/photo-1?type=original_image',
                fieldworkImageUploadedProject: 'fieldwork',
                digitalSourcePreservation: ['webOrServerBackup']
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);

        expect(issues.map((issue) => issue.ruleId)).toEqual([
            'fieldwork-photo-upload-missing'
        ]);
    });


    it('keeps reporting tablet media when the upload target points to another file', () => {

        const documents: any[] = [
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
                digitalSourcePreservation: [
                    'originalPhoto',
                    'originalImage',
                    'webOrServerBackup',
                    'backupVerified'
                ],
                fieldworkImageUploadStatus: 'uploaded',
                fieldworkImageUploadedAt: '2026-06-23T01:02:03.000Z',
                fieldworkImageUploadedUri: 'file:///tablet/photos/photo-1.jpg',
                fieldworkImageUploadTarget:
                    'https://field.example/files/fieldwork/other-photo?type=original_image',
                fieldworkImageUploadedProject: 'fieldwork',
                fieldworkImageUploadedSizeBytes: 481516,
                fieldworkImageUploadedMd5: 'tablet-md5',
                fieldworkImageStoredSizeBytes: 481516,
                fieldworkImageStoredMd5: 'tablet-md5',
                fieldworkImageStoredSha256: 'server-sha256'
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);

        expect(issues.map((issue) => issue.ruleId)).toEqual([
            'fieldwork-photo-upload-missing'
        ]);
    });


    it('keeps reporting content URI tablet media when Field Hub stored metadata is missing', () => {

        const documents: any[] = [
            makeDocument('drawing-1', 'Drawing', {
                fileUri: 'content://tablet/drawings/drawing-1.jpg',
                digitalSourcePreservation: [
                    'originalDrawing',
                    'webOrServerBackup',
                    'backupVerified'
                ],
                fieldworkImageUploadStatus: 'uploaded',
                fieldworkImageUploadedAt: '2026-06-23T01:02:03.000Z',
                fieldworkImageUploadedUri: 'content://tablet/drawings/drawing-1.jpg',
                fieldworkImageUploadTarget:
                    'https://field.example/files/fieldwork/drawing-1?type=original_image',
                fieldworkImageUploadedProject: 'fieldwork'
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);

        expect(issues.map((issue) => issue.ruleId)).toEqual([
            'fieldwork-drawing-upload-missing'
        ]);
    });


    it('keeps reporting file URI tablet media when upload size metadata is missing', () => {

        const documents: any[] = [
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
                digitalSourcePreservation: [
                    'originalPhoto',
                    'originalImage',
                    'webOrServerBackup',
                    'backupVerified'
                ],
                fieldworkImageUploadStatus: 'uploaded',
                fieldworkImageUploadedAt: '2026-06-23T01:02:03.000Z',
                fieldworkImageUploadedUri: 'file:///tablet/photos/photo-1.jpg',
                fieldworkImageUploadTarget:
                    'https://field.example/files/fieldwork/photo-1?type=original_image',
                fieldworkImageUploadedProject: 'fieldwork',
                fieldworkImageUploadedMd5: 'tablet-md5'
            })
        ];

        const issues = getKoreanFieldworkReadinessIssues(documents as any);

        expect(issues.map((issue) => issue.ruleId)).toEqual([
            'fieldwork-photo-upload-missing'
        ]);
    });


    it('includes linked media backup issues in evidence bundles for report review', () => {

        const feature = makeDocument('feature-1', 'Feature');
        const photo = makeDocument('photo-1', 'Photo', {
            fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
            relations: { depicts: ['feature-1'] }
        });

        const bundle = buildEvidenceBundle(feature as any, [feature, photo] as any);

        expect(bundle.photos.length).toBe(1);
        expect(bundle.issues.some((issue) =>
            issue.documentId === 'photo-1'
            && issue.ruleId === 'fieldwork-photo-upload-missing'
        )).toBe(true);
    });


    it('summarizes today board inputs from documents and warning issues', () => {

        const documents: any[] = [
            makeDocument('log-1', 'DailyLog'),
            makeDocument('boundary-1', 'SurveyBoundary'),
            makeDocument('feature-1', 'Feature', { featureRecordingStatus: 'candidate' }),
            makeDocument('sample-1', 'Sample')
        ];

        const summary = getKoreanFieldworkTodaySummary(documents as any);

        expect(summary.dailyLogs.length).toBe(1);
        expect(summary.surveyBoundaries.length).toBe(1);
        expect(summary.featureCandidates.length).toBe(1);
        expect(summary.issueCountByDocumentId['sample-1']).toBe(1);
    });


    it('summarizes closeout status with Korean labels from shared core issues', () => {

        const summary = getKoreanFieldworkCloseoutSummary([
            makeIssue('warning', 'feature-2', 'feature-2', 'w'),
            makeIssue('critical', 'feature-1', 'feature-1', 'c'),
            makeIssue('info', 'sample-1', 'sample-1', 'i')
        ] as any);
        const reviewSummary = getKoreanFieldworkCloseoutSummary([
            makeIssue('info', 'find-1', 'find-1', 'i'),
            makeIssue('warning', 'feature-1', 'feature-1', 'w')
        ] as any);
        const clearSummary = getKoreanFieldworkCloseoutSummary([]);

        expect(summary.status).toBe('blocked');
        expect(summary.title).toBe('먼저 볼 항목');
        expect(summary.counts).toEqual({ critical: 1, warning: 1, info: 1 });
        expect(summary.issues.map(issue => issue.ruleId)).toEqual(['c', 'w', 'i']);
        expect(reviewSummary.status).toBe('needsReview');
        expect(reviewSummary.title).toBe('마감 전 확인');
        expect(reviewSummary.detail).toBe('보완 항목 1건, 안내 항목 1건이 남아 있습니다.');
        expect(clearSummary.status).toBe('clear');
        expect(clearSummary.title).toBe('마감 가능');
    });


    it('adds shared soil profile photo closeout issues with tablet Munsell candidates', () => {

        const soilProfilePhoto = makeDocument('soil-photo-1', 'SoilProfilePhoto', {
            identifier: '토층사진 1',
            originalFilename: 'soil-profile-1.jpg',
            width: 3000,
            height: 2000,
            soilProfilePhotoCapturedAt: '2026-06-23T01:02:03.000Z',
            soilColorAssistStatus: 'candidatesAvailable',
            soilColorAssistCandidates: '1: 10YR 4/3 (높음, 차이 0.0)',
            soilProfileColorSwatches: '[]'
        });

        const summary = makeKoreanFieldworkCloseoutSummary([soilProfilePhoto] as any);

        expect(summary.status).toBe('needsReview');
        expect(summary.issues.map(issue => issue.ruleId)).toEqual([
            'soil-color-candidates-review',
            'soil-profile-color-swatches-missing'
        ]);
        expect(summary.issues[0].message).toBe('사진에서 읽은 먼셀 후보를 검토해야 합니다.');
        expect(summary.issues[0].recommendedAction).toContain('먼셀 후보 10YR 4/3');
        expect(summary.issues[0].recommendedAction).toContain('먼셀값');
    });


    it('adds Korean report metadata labels to shared photo closeout issues', () => {

        const photo = makeDocument('photo-1', 'Photo', {
            identifier: '사진 1',
            originalFilename: '',
            width: 4032
        });

        const summary = makeKoreanFieldworkCloseoutSummary([photo] as any);

        expect(summary.issues.map(issue => issue.ruleId)).toEqual([
            'fieldwork-photo-report-metadata-missing'
        ]);
        expect(summary.issues[0].recommendedAction).toContain('원본 파일명');
        expect(summary.issues[0].recommendedAction).toContain('촬영시각');
        expect(summary.issues[0].recommendedAction).toContain('세로 크기');
    });


    it('adds shared closeout review issues for tablet photo annotations without descriptions', () => {

        const annotatedPhoto = makeDocument('photo-annotated', 'Photo', {
            identifier: 'Annotated photo',
            fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
            originalFilename: 'photo-annotated.jpg',
            width: 4032,
            height: 3024,
            fieldworkPhotoAnnotationStrokes:
                '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}'
        });
        const annotatedSoilPhoto = makeDocument('soil-photo-annotated', 'SoilProfilePhoto', {
            identifier: 'Annotated soil',
            soilProfilePhotoCapturedAt: '2026-06-23T01:02:03.000Z',
            originalFilename: 'soil-photo-annotated.jpg',
            width: 3000,
            height: 2000,
            soilProfileColorSwatches: '10YR 4/3',
            soilProfilePhotoAnnotationStrokes:
                '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}'
        });
        const explainedPhoto = makeDocument('photo-explained', 'Photo', {
            identifier: 'Explained photo',
            description: '함몰 벽면 균열 표시',
            fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
            originalFilename: 'photo-explained.jpg',
            width: 4032,
            height: 3024,
            fieldworkPhotoAnnotationStrokes:
                '{"version":1,"strokes":[{"points":[{"x":2000,"y":2000}]}]}'
        });

        const issues = getKoreanFieldworkCloseoutReviewIssues([
            annotatedPhoto,
            annotatedSoilPhoto,
            explainedPhoto
        ] as any);

        expect(issues.map(issue => issue.ruleId)).toEqual([
            'fieldwork-photo-annotation-review',
            'soil-profile-photo-annotation-review'
        ]);
        expect(issues[0]).toEqual(jasmine.objectContaining({
            documentId: 'photo-annotated',
            relatedFields: ['fieldworkPhotoAnnotationStrokes', 'description', 'shortDescription']
        }));
        expect(issues[0].recommendedAction).toContain('description');
        expect(issues[1]).toEqual(jasmine.objectContaining({
            documentId: 'soil-photo-annotated',
            relatedFields: ['soilProfilePhotoAnnotationStrokes', 'description', 'shortDescription']
        }));
    });


    it('adds field record quality review closeout details with shared labels', () => {

        const qualityReview = makeDocument('quality-review-1', 'FieldRecordQualityReview', {
            identifier: 'quality-001',
            reviewedRecordUnit: JSON.stringify(['featureRecord', 'dailyLog']),
            qualityReviewStage: { value: JSON.stringify(['sameDayReview', 'sourceRecordCorrection']) },
            qualityCorrectionBasis: ['correctionReasonLinked', 'sourceMediaChecked'],
            reportEvaluationFeedback: ['fieldRecordReview', 'supplementRequestTracked'],
            recordCreationTiming: 'duringFieldwork',
            fieldRecordQuality: ['immediateRecording'],
            verificationState: 'observedInField'
        });
        const closedReview = makeDocument('quality-review-2', 'FieldRecordQualityReview', {
            identifier: 'quality-002',
            reviewedRecordUnit: ['featureRecord'],
            qualityReviewStage: ['closedAfterCorrection'],
            qualityCorrectionBasis: ['sourceMediaChecked'],
            recordCreationTiming: 'duringFieldwork',
            fieldRecordQuality: ['immediateRecording'],
            verificationState: 'observedInField'
        });

        const issues = getKoreanFieldworkCloseoutReviewIssues([
            qualityReview,
            closedReview
        ] as any);

        expect(issues.map(issue => issue.ruleId)).toEqual([
            'field-record-quality-review-follow-up'
        ]);
        expect(issues[0].relatedFields).toEqual(jasmine.arrayContaining([
            'reviewedRecordUnit',
            'qualityReviewStage',
            'qualityCorrectionBasis',
            'reportEvaluationFeedback'
        ]));
        expect(issues[0].recommendedAction).toContain('검토 대상: 유구 기록 · 조사일지');
        expect(issues[0].recommendedAction).toContain('검토 단계: 당일 검토 · 원기록 보완');
        expect(issues[0].recommendedAction).toContain('수정·보완 근거: 수정 사유 연결 · 원사진·원도면 대조');
        expect(issues[0].recommendedAction).toContain('평가 환류: 원기록 재검토 · 보완요구 추적');
        expect(issues[0].recommendedAction).not.toContain('sourceRecordCorrection');
        expect(issues[0].recommendedAction).not.toContain('supplementRequestTracked');
    });


    it('finds TermAuthority records by alias while keeping authority and alias separate', () => {

        const authority = makeDocument('term-1', 'TermAuthority', {
            identifier: 'pit dwelling'
        });
        const alias = makeDocument('alias-1', 'TermAlias', {
            identifier: 'alias',
            termAliasText: '집자리',
            relations: { liesWithin: ['term-1'] }
        });

        const matches = searchTermAuthorities([authority, alias] as any, '집자리');

        expect(matches.length).toBe(1);
        expect(matches[0].authority.resource.id).toBe('term-1');
        expect(matches[0].aliases[0].resource.termAliasText).toBe('집자리');
        expect(matches[0].matchedText).toBe('집자리');
    });
});


function makeDocument(id: string, category: string, resource: any = {}): any {

    const { relations, ...properties } = resource;

    return {
        _id: id,
        resource: {
            id,
            identifier: id,
            category,
            relations: relations ?? {},
            ...properties
        },
        created: {},
        modified: []
    };
}


function makeIssue(
        severity: 'critical'|'warning'|'info',
        documentId: string,
        identifier: string,
        ruleId: string
): any {

    return {
        severity,
        documentId,
        identifier,
        ruleId,
        category: 'Feature',
        message: 'message',
        relatedFields: [],
        recommendedAction: '확인하세요.',
        blocksSave: false
    };
}
