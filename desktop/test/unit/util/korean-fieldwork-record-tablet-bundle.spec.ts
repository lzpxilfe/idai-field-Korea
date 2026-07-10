import {
    createKoreanFieldworkTabletHandoffReviewUpdate,
    createKoreanFieldworkTabletHandoffSourceReviewUpdate,
    containsKoreanFieldworkTabletRecordBundleSource,
    getKoreanFieldworkTabletRecordBundleGroupSourcesForReview,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SUMMARY_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD,
    makeKoreanFieldworkRecordTabletBundle,
    wouldKoreanFieldworkTabletRecordBundleBeReviewedAfterSourceReview
} from '../../../src/app/util/korean-fieldwork-record-tablet-bundle';


describe('korean-fieldwork-record-tablet-bundle', () => {

    it('groups many tablet evidence records by kind for desktop handoff', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            shortDescription: '\uc6d0\ud615 \uc218\ud608',
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photos = [1, 2, 3, 4].map(index =>
            createDoc(`photo-${index}`, 'Photo', `P${index}`, {
                depicts: ['feature-1']
            }, {
                fieldworkPhotoUri: `file:///tablet/photos/P${index}.jpg`
            })
        );
        const drawing = createDoc('drawing-1', 'Drawing', 'D1', {
            depicts: ['feature-1']
        }, {
            description: '\ubc14\ub2e5\uba74 \uc2e4\uce21 \ub3c4\uba74'
        });
        const memo = createDoc('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            date: '2026-07-10',
            penMemoReviewedTranscript: '[\uad00\ucc30 \ub0b4\uc6a9] \ubc14\ub2e5\uba74 \ud53c\ud2b8\uc120 \ud655\uc778.'
        });
        const sample = createDoc('sample-1', 'Sample', 'S1', {
            isRecordedInFeature: ['feature-1']
        }, {
            shortDescription: '\ubd81\ubcbd \ud1a0\uc591 \uc2dc\ub8cc'
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, ...photos, drawing, memo, sample] as any
        )!;

        expect(bundle).toBeDefined();
        expect(bundle.title).toContain('F1');
        expect(bundle.sourceCount).toBe(8);
        expect(bundle.summary).toContain('\uc790\ub8cc 8\uac74');
        expect(bundle.fingerprint).toMatch(/^v1:[0-9a-f]{8}:\d+$/);
        expect(bundle.fingerprint.length).toBeLessThan(24);
        expect(bundle.reviewState).toMatchObject({
            isReviewed: false,
            isStale: false,
            label: '\ubbf8\ucc98\ub9ac',
            tone: 'neutral'
        });
        expect(bundle.groups.map(group => [group.id, group.count])).toEqual([
            ['photos', 4],
            ['drawings', 1],
            ['penMemos', 1],
            ['samples', 1],
            ['notebookEntries', 1]
        ]);
        expect(bundle.groups.find(group => group.id === 'photos')?.detail)
            .toBe('P1, P2, P3 \uc678 1\uac74 \u00b7 \ud655\uc778 4\uac74');
        expect(bundle.groups.find(group => group.id === 'photos')?.issueCount)
            .toBe(4);
        expect(bundle.groups.find(group => group.id === 'photos')?.tone)
            .toBe('warning');
        expect(bundle.groups.find(group => group.id === 'photos')?.copyText)
            .toContain('- P4');
        expect(bundle.groups.find(group => group.id === 'photos')?.sources[3].copyText)
            .toContain('[\ud0dc\ube14\ub9bf \uc6d0\ubcf8] P4');
        expect(bundle.groups.find(group => group.id === 'photos')?.sources[3].copyText)
            .toContain('\ud655\uc778 \ud544\uc694:');
        expect(bundle.copyText).toContain('[\ud0dc\ube14\ub9bf \uc790\ub8cc \ubb36\uc74c]');
        expect(bundle.copyText).toContain('\ub370\uc2a4\ud06c\ud1b1 \ucc98\ub9ac: \ubbf8\ucc98\ub9ac');
        expect(bundle.copyText).toContain('\uc0ac\uc9c4 4\uac74: P1, P2, P3 \uc678 1\uac74');
        expect(bundle.copyText).toContain('\r\n');
    });


    it('marks tablet bundle sources that still need desktop review', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1.jpg'
        });
        const memo = createDoc('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20}]}]}',
            penMemoTranscriptionStatus: 'pending'
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, photo, memo] as any
        )!;
        const penMemoGroup = bundle.groups.find(group => group.id === 'penMemos')!;
        const [penMemoSource] = penMemoGroup.sources;

        expect(bundle.issueCount).toBeGreaterThanOrEqual(1);
        expect(bundle.summary).toContain('\ud655\uc778');
        expect(penMemoGroup.issueCount).toBe(1);
        expect(penMemoGroup.tone).toBe('warning');
        expect(penMemoGroup.detail).toContain('\ud655\uc778 1\uac74');
        expect(penMemoSource).toMatchObject({
            documentId: 'memo-1',
            issueCount: 1,
            label: 'M1',
            tone: 'warning'
        });
        expect(penMemoSource.issueDetails[0]).toContain('M1');
        expect(penMemoGroup.copyText).toContain('\ud655\uc778: M1');
        expect(penMemoSource.copyText).toContain('[\ud0dc\ube14\ub9bf \uc6d0\ubcf8] M1');
        expect(penMemoSource.copyText).toContain('\ud655\uc778 \ud544\uc694:');
    });


    it('carries tablet find and sample spot points into desktop handoff source rows', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const find = createDoc('find-1', 'Find', 'Find 1', {
            isRecordedInFeature: ['feature-1']
        }, {
            shortDescription: '\uccad\ub3d9 \uc870\uac01',
            findSpotItems: JSON.stringify({
                version: 1,
                items: [
                    { number: 1, point: { x: 25, y: 75 }, label: 'bronze fragment' }
                ]
            })
        });
        const sample = createDoc('sample-1', 'Sample', 'Sample 1', {
            isRecordedInFeature: ['feature-1']
        }, {
            samplePurpose: '\ud0c4\ud654\ubb3c \ubd84\uc11d',
            findSpotItems: JSON.stringify({
                version: 1,
                items: [
                    { number: 1, point: { x: 50, y: 40 }, label: 'charcoal bag' }
                ]
            })
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, find, sample] as any
        )!;
        const findSource = bundle.groups.find(group => group.id === 'finds')!.sources[0];
        const sampleSource = bundle.groups.find(group => group.id === 'samples')!.sources[0];

        expect(findSource.detail)
            .toContain('\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58: 1\ubc88 25%/75% bronze fragment');
        expect(findSource.detail).toContain('\uccad\ub3d9 \uc870\uac01');
        expect(findSource.copyText)
            .toContain('\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58: 1\ubc88 25%/75% bronze fragment');
        expect(bundle.groups.find(group => group.id === 'finds')?.copyText)
            .toContain('\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58: 1\ubc88 25%/75% bronze fragment');

        expect(sampleSource.detail)
            .toContain('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: 1\ubc88 50%/40% charcoal bag');
        expect(sampleSource.copyText)
            .toContain('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: 1\ubc88 50%/40% charcoal bag');
        expect(bundle.groups.find(group => group.id === 'samples')?.copyText)
            .toContain('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: 1\ubc88 50%/40% charcoal bag');
    });


    it('tracks desktop review state for tablet bundle handoff processing', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1.jpg'
        });
        const bundle = makeKoreanFieldworkRecordTabletBundle(feature, [feature, photo] as any)!;
        const reviewedDocument = createKoreanFieldworkTabletHandoffReviewUpdate(
            feature,
            bundle,
            true,
            '2026-07-11T01:02:03.000Z'
        );
        const reviewedBundle = makeKoreanFieldworkRecordTabletBundle(
            reviewedDocument,
            [reviewedDocument, photo] as any
        )!;

        expect(reviewedDocument.resource).toMatchObject({
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD]: '2026-07-11T01:02:03.000Z',
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD]: bundle.sourceCount,
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD]: bundle.issueCount,
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SUMMARY_FIELD]: bundle.summary,
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD]: bundle.fingerprint
        });
        expect(reviewedBundle.reviewState).toMatchObject({
            isReviewed: true,
            isStale: false,
            label: '\ucc98\ub9ac\ub428 2026-07-11',
            tone: 'success'
        });
        expect(reviewedBundle.copyText)
            .toContain('\ub370\uc2a4\ud06c\ud1b1 \ucc98\ub9ac: \ucc98\ub9ac\ub428 2026-07-11');
        expect(reviewedBundle.copyText)
            .toContain(
                `\ucc98\ub9ac \uc0c1\uc138: \uc790\ub8cc ${bundle.sourceCount}\uac74`
                + ` \u00b7 \ud655\uc778 ${bundle.issueCount}\uac74`
            );

        const reopenedDocument = createKoreanFieldworkTabletHandoffReviewUpdate(
            reviewedDocument,
            reviewedBundle,
            false
        );

        expect(reopenedDocument.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD])
            .toBeUndefined();
        expect(reopenedDocument.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD])
            .toBeUndefined();
        expect(reopenedDocument.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD])
            .toBeUndefined();
    });


    it('tracks desktop review state for individual tablet source rows', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1.jpg'
        });
        const bundle = makeKoreanFieldworkRecordTabletBundle(feature, [feature, photo] as any)!;
        const photoSource = bundle.groups.find(group => group.id === 'photos')!.sources[0];
        const reviewedPhoto = createKoreanFieldworkTabletHandoffSourceReviewUpdate(
            photo,
            photoSource,
            true,
            '2026-07-11T02:03:04.000Z'
        );
        const reviewedBundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, reviewedPhoto] as any
        )!;
        const reviewedSource = reviewedBundle.groups.find(group => group.id === 'photos')!.sources[0];

        expect(reviewedPhoto.resource).toMatchObject({
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD]: '2026-07-11T02:03:04.000Z',
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD]: photoSource.issueCount,
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD]: 'P1',
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD]: photoSource.fingerprint
        });
        expect(reviewedSource.reviewState).toMatchObject({
            isReviewed: true,
            isStale: false,
            label: '\ucc98\ub9ac\ub428 2026-07-11',
            tone: 'success'
        });

        const changedPhoto = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1-retake.jpg',
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD]:
                reviewedPhoto.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD],
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD]:
                reviewedPhoto.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_ISSUE_COUNT_FIELD],
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD]:
                reviewedPhoto.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_LABEL_FIELD],
            [KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD]:
                reviewedPhoto.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD]
        });
        const staleBundle = makeKoreanFieldworkRecordTabletBundle(feature, [feature, changedPhoto] as any)!;
        const staleSource = staleBundle.groups.find(group => group.id === 'photos')!.sources[0];

        expect(staleSource.reviewState).toMatchObject({
            isReviewed: false,
            isStale: true,
            label: '\ub2e4\uc2dc \ud655\uc778',
            detail: expect.stringContaining('\uc6d0\ubcf8/\ubcf8\ubb38 \ub0b4\uc6a9 \ubcc0\uacbd'),
            tone: 'warning'
        });

        const reopenedPhoto = createKoreanFieldworkTabletHandoffSourceReviewUpdate(
            reviewedPhoto,
            reviewedSource,
            false
        );

        expect(reopenedPhoto.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_AT_FIELD])
            .toBeUndefined();
        expect(reopenedPhoto.resource[KOREAN_FIELDWORK_TABLET_HANDOFF_SOURCE_REVIEWED_FINGERPRINT_FIELD])
            .toBeUndefined();
    });


    it('orders tablet source rows by desktop processing priority', () => {

        const reviewed = makeSource('reviewed', 0, true, false);
        const unreviewed = makeSource('unreviewed', 0, false, false);
        const issueLow = makeSource('issue-low', 1, false, false);
        const issueHigh = makeSource('issue-high', 2, false, false);
        const stale = makeSource('stale', 0, false, true);

        const orderedSources = getKoreanFieldworkTabletRecordBundleGroupSourcesForReview({
            sources: [reviewed, unreviewed, issueLow, issueHigh, stale]
        } as any);

        expect(orderedSources.map(source => source.id)).toEqual([
            'stale',
            'issue-high',
            'issue-low',
            'unreviewed',
            'reviewed'
        ]);
    });


    it('detects when reviewing a source row finishes the whole tablet bundle', () => {

        const reviewed = makeSource('reviewed', 0, true, false);
        const pending = makeSource('pending', 0, false, false);
        const bundle = {
            groups: [
                {
                    id: 'photos',
                    sources: [reviewed, pending]
                }
            ]
        } as any;

        expect(containsKoreanFieldworkTabletRecordBundleSource(bundle, pending)).toBe(true);
        expect(containsKoreanFieldworkTabletRecordBundleSource(bundle, makeSource('missing', 0, false, false)))
            .toBe(false);
        expect(wouldKoreanFieldworkTabletRecordBundleBeReviewedAfterSourceReview(bundle, pending))
            .toBe(true);
        expect(wouldKoreanFieldworkTabletRecordBundleBeReviewedAfterSourceReview(bundle, reviewed))
            .toBe(false);
    });


    it('marks reviewed tablet bundles stale when tablet evidence changes later', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD]: '2026-07-11T01:02:03.000Z',
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD]: 1,
            [KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD]: 0,
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photos = [1, 2].map(index =>
            createDoc(`photo-${index}`, 'Photo', `P${index}`, {
                depicts: ['feature-1']
            }, {
                fieldworkPhotoUri: `file:///tablet/photos/P${index}.jpg`
            })
        );
        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, ...photos] as any
        )!;

        expect(bundle.reviewState).toMatchObject({
            isReviewed: false,
            isStale: true,
            label: '\ub2e4\uc2dc \ud655\uc778',
            detail: expect.stringContaining('\uc790\ub8cc 1\uac74\uc5d0\uc11c 2\uac74'),
            tone: 'warning'
        });
        expect(bundle.copyText)
            .toContain('\ub370\uc2a4\ud06c\ud1b1 \ucc98\ub9ac: \ub2e4\uc2dc \ud655\uc778');
    });


    it('marks reviewed tablet bundles stale when tablet source details change without count changes', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1.jpg'
        });
        const bundle = makeKoreanFieldworkRecordTabletBundle(feature, [feature, photo] as any)!;
        const reviewedDocument = createKoreanFieldworkTabletHandoffReviewUpdate(
            feature,
            bundle,
            true,
            '2026-07-11T01:02:03.000Z'
        );
        const changedPhoto = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/P1-retake.jpg'
        });
        const changedBundle = makeKoreanFieldworkRecordTabletBundle(
            reviewedDocument,
            [reviewedDocument, changedPhoto] as any
        )!;

        expect(changedBundle.sourceCount).toBe(bundle.sourceCount);
        expect(changedBundle.issueCount).toBe(bundle.issueCount);
        expect(changedBundle.fingerprint).not.toBe(bundle.fingerprint);
        expect(changedBundle.reviewState).toMatchObject({
            isReviewed: false,
            isStale: true,
            label: '\ub2e4\uc2dc \ud655\uc778',
            detail: expect.stringContaining('\uc6d0\ubcf8/\ubcf8\ubb38 \ub0b4\uc6a9 \ubcc0\uacbd'),
            tone: 'warning'
        });
    });


    it('stays hidden when the current record has no tablet evidence bundle', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1');

        expect(makeKoreanFieldworkRecordTabletBundle(feature, [feature] as any))
            .toBeUndefined();
    });
});


const createDoc = (
    id: string,
    category: string,
    identifier: string,
    relations: Record<string, string[]> = {},
    extraResource: Record<string, unknown> = {}
) => ({
    resource: {
        id,
        identifier,
        category,
        relations,
        ...extraResource
    }
} as any);


const makeSource = (
    id: string,
    issueCount: number,
    isReviewed: boolean,
    isStale: boolean
) => ({
    id,
    label: id,
    documentId: id,
    issueCount,
    issueDetails: [],
    copyText: id,
    fingerprint: id,
    reviewState: {
        isReviewed,
        isStale,
        label: isStale ? '\ub2e4\uc2dc \ud655\uc778' : (isReviewed ? '\ucc98\ub9ac\ub428' : '\ubbf8\ucc98\ub9ac'),
        detail: id,
        tone: isStale ? 'warning' : (isReviewed ? 'success' : 'neutral')
    },
    tone: issueCount > 0 ? 'warning' : 'info'
} as any);
