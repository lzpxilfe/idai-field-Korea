import {
    createKoreanFieldworkTabletHandoffReviewUpdate,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_AT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_FINGERPRINT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_ISSUE_COUNT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SOURCE_COUNT_FIELD,
    KOREAN_FIELDWORK_TABLET_HANDOFF_REVIEWED_SUMMARY_FIELD,
    makeKoreanFieldworkRecordTabletBundle
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
