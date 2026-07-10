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
import {
    getPenMemoSketchSummaryLabel,
    getPhotoAnnotationSummaryLabel
} from '../../../src/app/util/korean-fieldwork-evidence-review';


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


    it('formats tablet source copies as HWP-safe detail lines', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoCaption: '\ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74',
            originalFilename: 'IMG_0001.JPG',
            fieldworkPhotoUri: 'file:///tablet/photos/IMG_0001.JPG'
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, photo] as any
        )!;
        const photoGroup = bundle.groups.find(group => group.id === 'photos')!;
        const [photoSource] = photoGroup.sources;

        expect(photoSource.detail)
            .toContain('\uc0ac\uc9c4 \uc124\uba85: \ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74 \u00b7 '
                + '\uc6d0\ubcf8 \ud30c\uc77c: IMG_0001.JPG');
        expect(photoSource.copyText).toContain([
            '[\ud0dc\ube14\ub9bf \uc6d0\ubcf8] P1',
            '\uc0c1\uc138:',
            '- \uc0ac\uc9c4 \uc124\uba85: \ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74',
            '- \uc6d0\ubcf8 \ud30c\uc77c: IMG_0001.JPG',
            '- \uc6d0\ubcf8: file:///tablet/photos/IMG_0001.JPG'
        ].join('\r\n'));
        expect(photoGroup.copyText).toContain([
            '- P1',
            ' \ucc98\ub9ac: \ubbf8\ucc98\ub9ac',
            ' - \uc0ac\uc9c4 \uc124\uba85: \ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74',
            ' - \uc6d0\ubcf8 \ud30c\uc77c: IMG_0001.JPG',
            ' - \uc6d0\ubcf8: file:///tablet/photos/IMG_0001.JPG'
        ].join('\r\n'));
        expect(bundle.copyText).toContain([
            '- P1',
            ' \ucc98\ub9ac: \ubbf8\ucc98\ub9ac',
            ' - \uc0ac\uc9c4 \uc124\uba85: \ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74',
            ' - \uc6d0\ubcf8 \ud30c\uc77c: IMG_0001.JPG',
            ' - \uc6d0\ubcf8: file:///tablet/photos/IMG_0001.JPG'
        ].join('\r\n'));
        expect(photoSource.copyText).not.toContain('\t');
    });


    it('opens directly attached tablet record photos as desktop handoff sources', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            shortDescription: '\uc720\uad6c \ubc14\ub2e5\uba74 \uc9c1\uc811 \ucd2c\uc601',
            fieldworkPhotoCaption: '\ubc14\ub2e5\uba74 \uc815\ub9ac \ud6c4 \uc0ac\uc9c4',
            originalFilename: 'feature-direct-1.jpg',
            fieldworkPhotoUri: 'file:///tablet/photos/feature-direct-1.jpg',
            fieldworkPhotoCapturedAt: '2026-07-11T10:05:00.000Z',
            width: 1920,
            height: 1080,
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(feature, [feature] as any)!;
        const photoGroup = bundle.groups.find(group => group.id === 'photos')!;
        const [photoSource] = photoGroup.sources;

        expect(bundle).toBeDefined();
        expect(bundle.sourceCount).toBe(1);
        expect(photoGroup.count).toBe(1);
        expect(photoSource).toMatchObject({
            documentId: 'feature-1',
            label: 'F1'
        });
        expect(photoSource.detail)
            .toContain('\uc9c1\uc811 \ucca8\ubd80 \uc0ac\uc9c4: \uc720\uad6c');
        expect(photoSource.detail)
            .toContain('\uc0ac\uc9c4 \uc124\uba85: \ubc14\ub2e5\uba74 \uc815\ub9ac \ud6c4 \uc0ac\uc9c4');
        expect(photoSource.detail)
            .toContain('\uc6d0\ubcf8 \ud30c\uc77c: feature-direct-1.jpg');
        expect(photoSource.detail)
            .toContain('\uc6d0\ubcf8: file:///tablet/photos/feature-direct-1.jpg');
        expect(photoSource.detail)
            .toContain('\ucd2c\uc601: 2026-07-11 10:05');
        expect(photoSource.copyText)
            .toContain('\uc9c1\uc811 \ucca8\ubd80 \uc0ac\uc9c4: \uc720\uad6c');
        expect(photoGroup.copyText)
            .toContain('\uc6d0\ubcf8: file:///tablet/photos/feature-direct-1.jpg');
        expect(bundle.copyText)
            .toContain('\uc0ac\uc9c4 1\uac74: F1');
    });


    it('carries tablet photo markings and sketch memos into desktop handoff source rows', () => {

        const photoStrokes = '{"version":1,"strokes":[{"points":[{"x":1000,"y":1000},{"x":5000,"y":5000}]}]}';
        const soilPhotoStrokes = '{"version":1,"strokes":[{"points":[{"x":2000,"y":3000}]}]}';
        const soilLineStrokes = '[[{"x":1,"y":2},{"x":3,"y":4}]]';
        const drawingStrokes = '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}';
        const penMemoStrokes = '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":11,"y":21}]}]}';
        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
            fieldworkPhotoAnnotationStrokes: photoStrokes
        });
        const soilProfilePhoto = createDoc('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfilePhotoUri: 'file:///tablet/photos/profile-1.jpg',
            soilProfilePhotoAnnotationStrokes: soilPhotoStrokes,
            soilProfileAnnotationStrokes: soilLineStrokes,
            soilProfileLayerMarkers: JSON.stringify([
                { x: 20, y: 50, label: '1' },
                { x: 80, y: 45, label: '2' }
            ])
        });
        const drawing = createDoc('drawing-1', 'Drawing', 'D1', {
            depicts: ['feature-1']
        }, {
            drawingSketchStrokes: drawingStrokes
        });
        const memo = createDoc('memo-1', 'PenMemo', 'M1', {
            depicts: ['feature-1']
        }, {
            penMemoStrokes,
            penMemoAutoTranscript: '\ubc14\ub2e5\uba74 \ud53c\ud2b8\uc120 \ud655\uc778',
            penMemoTranscriptionStatus: 'pending'
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, photo, soilProfilePhoto, drawing, memo] as any
        )!;
        const photoSource = bundle.groups.find(group => group.id === 'photos')!.sources[0];
        const soilProfilePhotoSource = bundle.groups.find(group => group.id === 'soilProfilePhotos')!.sources[0];
        const drawingSource = bundle.groups.find(group => group.id === 'drawings')!.sources[0];
        const memoSource = bundle.groups.find(group => group.id === 'penMemos')!.sources[0];

        expect(photoSource.detail)
            .toContain(`\uc0ac\uc9c4 \ud45c\uc2dc: ${getPhotoAnnotationSummaryLabel(photoStrokes)}`);
        expect(photoSource.copyText)
            .toContain(`\uc0ac\uc9c4 \ud45c\uc2dc: ${getPhotoAnnotationSummaryLabel(photoStrokes)}`);

        expect(soilProfilePhotoSource.detail)
            .toContain(`\uc0ac\uc9c4 \ud45c\uc2dc: ${getPhotoAnnotationSummaryLabel(soilPhotoStrokes)}`);
        expect(soilProfilePhotoSource.detail)
            .toContain(`\ud1a0\uce35\uc120 \ud45c\uc2dc: ${getPhotoAnnotationSummaryLabel(soilLineStrokes)}`);
        expect(soilProfilePhotoSource.detail)
            .toContain('\uce35 \ubc88\ud638 \ud45c\uc2dc: 1\uce35 20%/50%, 2\uce35 80%/45%');
        expect(bundle.groups.find(group => group.id === 'soilProfilePhotos')?.copyText)
            .toContain('\uce35 \ubc88\ud638 \ud45c\uc2dc: 1\uce35 20%/50%, 2\uce35 80%/45%');

        expect(drawingSource.detail)
            .toContain(`\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: ${getPenMemoSketchSummaryLabel(drawingStrokes)}`);
        expect(memoSource.detail)
            .toContain(getPenMemoSketchSummaryLabel(penMemoStrokes));
        expect(memoSource.detail)
            .toContain('\uc790\ub3d9 \ud544\uc0ac: \ubc14\ub2e5\uba74 \ud53c\ud2b8\uc120 \ud655\uc778');
        expect(memoSource.copyText)
            .toContain('\uc790\ub3d9 \ud544\uc0ac: \ubc14\ub2e5\uba74 \ud53c\ud2b8\uc120 \ud655\uc778');
    });


    it('keeps tablet media captions and original file references together for desktop processing', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const photo = createDoc('photo-1', 'Photo', 'P1', {
            depicts: ['feature-1']
        }, {
            fieldworkPhotoCaption: '\ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74',
            originalFilename: 'IMG_0001.JPG',
            fieldworkPhotoUri: 'file:///tablet/photos/IMG_0001.JPG',
            fieldworkPhotoCapturedAt: '2026-07-11T09:12:34.000Z',
            width: 4032,
            height: 3024,
            fieldworkImageUploadStatus: 'uploaded',
            fieldworkImageUploadedAt: '2026-07-11T09:15:00.000Z',
            fieldworkImageUploadedUri: 'file:///tablet/photos/IMG_0001.JPG',
            fieldworkImageUploadTarget: 'https://field.example/files/fieldwork/photo-1?type=original_image',
            fieldworkImageUploadedProject: 'field-office',
            fieldworkImageUploadedSizeBytes: 481516,
            fieldworkImageUploadedMd5: 'tablet-md5',
            fieldworkImageStoredSha256: 'fieldhub-sha256'
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, photo] as any
        )!;
        const photoSource = bundle.groups.find(group => group.id === 'photos')!.sources[0];

        expect(photoSource.detail)
            .toContain('\uc0ac\uc9c4 \uc124\uba85: \ubd81\ubcbd \uc720\uad6c \ubc14\ub2e5\uba74');
        expect(photoSource.detail)
            .toContain('\uc6d0\ubcf8 \ud30c\uc77c: IMG_0001.JPG');
        expect(photoSource.detail)
            .toContain('\uc6d0\ubcf8: file:///tablet/photos/IMG_0001.JPG');
        expect(photoSource.detail)
            .toContain('\ucd2c\uc601: 2026-07-11 09:12');
        expect(photoSource.detail)
            .toContain('\ud06c\uae30: 4032x3024');
        expect(photoSource.detail)
            .toContain('\uc774\ubbf8\uc9c0 \uc5c5\ub85c\ub4dc: \uc5c5\ub85c\ub4dc \uc644\ub8cc');
        expect(photoSource.detail)
            .toContain('\ub300\uc0c1 https://field.example/files/fieldwork/photo-1?type=original_image');
        expect(photoSource.detail)
            .toContain('MD5 tablet-md5');
        expect(photoSource.copyText)
            .toContain('\uc6d0\ubcf8 \ud30c\uc77c: IMG_0001.JPG');
        expect(bundle.groups.find(group => group.id === 'photos')?.copyText)
            .toContain('\uc6d0\ubcf8: file:///tablet/photos/IMG_0001.JPG');
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
            findSpotDescription: '\ubd81\ubcbd \ubc14\ub2e5\uba74 \uc790\uac08 \uc0ac\uc774',
            findSampleResearchScope: '\ud604\uc7a5 \uc138\ucc99 \ud6c4 \uc784\uc2dc\ubcf4\uad00',
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
            findSpotDescription: '\ub0a8\ubcbd \ud1a0\uce35 2\uce35 \uc911\uc559',
            sampleType: '\ud0c4\ud654\ubb3c',
            labNumber: 'LAB-2026-001',
            weight: '120g',
            volume: '250ml',
            samplePurpose: '\ud0c4\ud654\ubb3c \ubd84\uc11d',
            findSampleResearchScope: '\ubd84\uc11d\uc6a9 \ud558\ub098, \ubcf4\uad00\uc6a9 \ud558\ub098',
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
        expect(findSource.detail)
            .toContain('\ucd9c\ud1a0 \uc704\uce58 \uc124\uba85: \ubd81\ubcbd \ubc14\ub2e5\uba74 \uc790\uac08 \uc0ac\uc774');
        expect(findSource.detail)
            .toContain('\uc720\ubb3c\u00b7\uc2dc\ub8cc \uc5f0\uad6c\ubc94\uc704: \ud604\uc7a5 \uc138\ucc99 \ud6c4 \uc784\uc2dc\ubcf4\uad00');
        expect(findSource.detail).toContain('\uccad\ub3d9 \uc870\uac01');
        expect(findSource.copyText)
            .toContain('\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58: 1\ubc88 25%/75% bronze fragment');
        expect(bundle.groups.find(group => group.id === 'finds')?.copyText)
            .toContain('\uc720\ubb3c \ucd9c\ud1a0 \uc704\uce58: 1\ubc88 25%/75% bronze fragment');

        expect(sampleSource.detail)
            .toContain('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: 1\ubc88 50%/40% charcoal bag');
        expect(sampleSource.detail)
            .toContain('\ucc44\ucde8 \uc704\uce58 \uc124\uba85: \ub0a8\ubcbd \ud1a0\uce35 2\uce35 \uc911\uc559');
        expect(sampleSource.detail)
            .toContain('\uc2dc\ub8cc \uc885\ub958: \ud0c4\ud654\ubb3c');
        expect(sampleSource.detail)
            .toContain('\uc2e4\ud5d8\uc2e4 \ubc88\ud638: LAB-2026-001');
        expect(sampleSource.detail)
            .toContain('\ubb34\uac8c: 120g');
        expect(sampleSource.detail)
            .toContain('\ubd80\ud53c: 250ml');
        expect(sampleSource.detail)
            .toContain('\uc2dc\ub8cc \ubaa9\uc801: \ud0c4\ud654\ubb3c \ubd84\uc11d');
        expect(sampleSource.copyText)
            .toContain('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: 1\ubc88 50%/40% charcoal bag');
        expect(sampleSource.copyText)
            .toContain('\uc2dc\ub8cc \ubaa9\uc801: \ud0c4\ud654\ubb3c \ubd84\uc11d');
        expect(bundle.groups.find(group => group.id === 'samples')?.copyText)
            .toContain('\uc2dc\ub8cc \ucc44\ucde8 \uc704\uce58: 1\ubc88 50%/40% charcoal bag');
        expect(bundle.copyText)
            .toContain('\uc2dc\ub8cc \ubaa9\uc801: \ud0c4\ud654\ubb3c \ubd84\uc11d');
    });


    it('carries tablet soil color sample points into desktop handoff source rows', () => {

        const feature = createDoc('feature-1', 'Feature', 'F1', {}, {
            featureRecordingStatus: 'confirmed',
            featureInvestigationChecklist: []
        });
        const soilProfilePhoto = createDoc('soil-photo-1', 'SoilProfilePhoto', 'SP1', {
            depicts: ['feature-1']
        }, {
            soilProfilePhotoUri: 'file:///tablet/photos/profile-1.jpg',
            soilColorAssistCandidates: [
                '\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 20%/50% \ud3c9\uade0 RGB 111/87/61',
                '1: 10YR 4/3 (\ub192\uc74c, \ucc28\uc774 0.0)',
                '2: 7.5YR 4/3 (\ubcf4\ud1b5, \ucc28\uc774 8.1)'
            ].join('\n'),
            soilProfileColorSwatches: [
                '1: 10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%',
                '2: 7.5YR 4/4 red clay RGB 139/128/88 @ 80%/45%'
            ].join('\n'),
            soilProfileColorNote: '\uc0ac\uc9c4 \uc0c9\uacfc \uc2e4\ubb3c \uc0c9 \ube44\uad50 \ud544\uc694',
            soilProfileCaptureNote: '\ubd81\ubcbd \ub2e8\uba74 \uc624\ud6c4 \ucd2c\uc601'
        });

        const bundle = makeKoreanFieldworkRecordTabletBundle(
            feature,
            [feature, soilProfilePhoto] as any
        )!;
        const soilProfilePhotoSource = bundle.groups
            .find(group => group.id === 'soilProfilePhotos')!.sources[0];

        expect(soilProfilePhotoSource.detail)
            .toContain('\uba3c\uc140 \ud6c4\ubcf4 10YR 4/3, 7.5YR 4/3');
        expect(soilProfilePhotoSource.detail)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%');
        expect(soilProfilePhotoSource.detail)
            .toContain('\uce35\ubcc4 \ud1a0\uc0c9: 1\uce35 10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%');
        expect(soilProfilePhotoSource.detail)
            .toContain('\ud1a0\uc0c9 \uba54\ubaa8: \uc0ac\uc9c4 \uc0c9\uacfc \uc2e4\ubb3c \uc0c9 \ube44\uad50 \ud544\uc694');
        expect(soilProfilePhotoSource.detail)
            .toContain('file:///tablet/photos/profile-1.jpg');
        expect(soilProfilePhotoSource.copyText)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%');
        expect(bundle.groups.find(group => group.id === 'soilProfilePhotos')?.copyText)
            .toContain('\uce35\ubcc4 \ud1a0\uc0c9: 1\uce35 10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%');
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
        expect(reviewedBundle.groups.find(group => group.id === 'photos')!.copyText)
            .toContain('\ucc98\ub9ac: \ucc98\ub9ac\ub428 2026-07-11 - \ud655\uc778 \uc5c6\uc74c');
        expect(reviewedBundle.copyText)
            .toContain('\ucc98\ub9ac: \ucc98\ub9ac\ub428 2026-07-11 - \ud655\uc778 \uc5c6\uc74c');

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
        expect(staleBundle.groups.find(group => group.id === 'photos')!.copyText)
            .toContain('\ucc98\ub9ac: \ub2e4\uc2dc \ud655\uc778 - ');

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
