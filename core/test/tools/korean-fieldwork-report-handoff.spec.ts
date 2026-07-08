import {
    makeKoreanFieldworkReportHandoff,
    normalizeKoreanFieldworkHwpPlainText,
    validateKoreanFieldworkReportHandoffCandidate
} from '../../src/tools/korean-fieldwork-report-handoff';


describe('Korean fieldwork report handoff', () => {

    it('turns a tablet feature bundle into a desktop report copy block', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('memo-1', 'PenMemo', {
                penMemoReviewedTranscript: 'fill continues under east edge',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');

        expect(featureItem).toEqual(jasmine.objectContaining({
            documentId: 'feature-1',
            identifier: 'pit-001',
            summary: 'round pit with dark fill',
            evidenceCount: 3,
            issueCount: 6,
            tone: 'review'
        }));
        expect(featureItem?.evidenceLabel).toContain('\uc0ac\uc9c4 1');
        expect(featureItem?.evidenceLabel).toContain('\ud1a0\uce35\uc0ac\uc9c4 1');
        expect(featureItem?.evidenceLabel).toContain('\ud604\uc7a5\uba54\ubaa8 1');
        expect(featureItem?.evidenceDetails.join('\n')).toContain('file:///tablet/photos/photo-1.jpg');
        expect(featureItem?.evidenceDetails.join('\n')).toContain('fill continues under east edge');
        expect(featureItem?.issueDetails.join('\n')).toContain('feature-complete-photo');
        expect(featureItem?.issueDetails.join('\n')).toContain('fieldwork-photo-upload-missing');
        expect(featureItem?.issueDetails.join('\n')).toContain('fieldwork-photo-report-metadata-missing');
        expect(featureItem?.issueDetails.join('\n')).toContain('soil-profile-color-swatches-missing');
        expect(featureItem?.copyText).toContain('[\uc720\uad6c] pit-001');
        expect(featureItem?.copyText).toContain('\uc694\uc57d: round pit with dark fill');
        expect(featureItem?.copyText).toContain('\uc790\ub8cc \uc0c1\uc138');
        expect(featureItem?.copyText).toContain('file:///tablet/photos/photo-1.jpg');
        expect(featureItem?.copyText).toContain('\ud655\uc778: \ubcf4\uc644 \ud544\uc694 6');
        expect(featureItem?.copyText).toContain('\ud655\uc778 \uc0c1\uc138');
        expect(featureItem?.copyText).toContain('fieldwork-photo-upload-missing');
        expect(handoff.reviewCount).toBeGreaterThan(0);
        expect(handoff.copyAllText).toContain(featureItem!.copyText);
        expect(featureItem?.copyText).not.toContain('\u200B');
        expect(featureItem?.copyText).not.toMatch(/(^|[^\r])\n/);
        expect(featureItem?.copyText).toContain('\r\n');
    });


    it('carries soil profile color sample locations into HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                soilColorAssistCandidates: [
                    '\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 20%/50% \ud3c9\uade0 RGB 111/87/61',
                    '1: 10YR 4/3 (\ubcf4\ud1b5, \ucc28\uc774 0.0)'
                ].join('\n'),
                soilProfileColorNote: 'dark fill sample from lower layer',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\uce35\ubcc4 \ud1a0\uc0c9: 1: 10YR 4/3 RGB 111/87/61 @ 20%/50%');
        expect(evidenceDetails)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: \uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 20%/50% \ud3c9\uade0 RGB 111/87/61');
        expect(featureItem?.copyText)
            .toContain('RGB 111/87/61 @ 20%/50%');
        expect(featureItem?.copyText)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58');
        expect(featureItem?.copyText).not.toMatch(/(^|[^\r])\n/);
    });


    it('recovers soil profile eyedropper locations from layer swatches when assist text is missing', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                soilProfileColorSwatches: [
                    '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                    '2: 2.5Y 5/3 RGB 139/128/88 @ 80%/50%'
                ].join('\n'),
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1: RGB 111/87/61 @ 20%/50%, 2: RGB 139/128/88 @ 80%/50%');
        expect(featureItem?.copyText)
            .toContain('2: RGB 139/128/88 @ 80%/50%');
    });


    it('normalizes HWP copy text as plain Windows clipboard text', () => {

        expect(normalizeKoreanFieldworkHwpPlainText('  [유구] 1호 수혈  \n\n\n요약: 값\u200B\n'))
            .toBe('[유구] 1호 수혈\r\n\r\n요약: 값');
    });


    it('carries tablet closeout review issues into desktop HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'candidate'
            }),
            makeDocument('photo-annotated', 'Photo', {
                originalFilename: 'photo-annotated.jpg',
                fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                width: 4032,
                height: 3024,
                fieldworkPhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":1,"y":2}]}]}',
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('memo-auto', 'PenMemo', {
                penMemoAutoTranscript: 'possible ash lens near base',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const issueDetails = featureItem?.issueDetails.join('\n') ?? '';

        expect(issueDetails).toContain('fieldwork-photo-annotation-review');
        expect(issueDetails).toContain('pen-memo-auto-transcript-review');
        expect(featureItem?.copyText).toContain('\ud655\uc778 \uc0c1\uc138');
        expect(featureItem?.copyText).toContain('fieldwork-photo-annotation-review');
        expect(featureItem?.copyText).toContain('pen-memo-auto-transcript-review');
    });


    it('carries linked record labels into desktop HWP copy blocks', () => {

        const documents = [
            makeDocument('operation-1', 'Operation', {
                identifier: 'op-001',
                shortDescription: 'north area excavation'
            }),
            makeDocument('trench-1', 'Trench', {
                identifier: 'trench-001',
                shortDescription: 'north trench',
                relations: { isRecordedIn: ['operation-1'] }
            }),
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'candidate',
                relations: { liesWithin: ['trench-1'], isRecordedIn: ['operation-1'] }
            }),
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/pit-001.jpg',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const photoItem = handoff.items.find(item => item.documentId === 'photo-1');

        expect(featureItem?.relationDetails).toEqual([
            '\uc0c1\uc704 \uae30\ub85d: [\ud2b8\ub80c\uce58] trench-001',
            '\uc870\uc0ac \uae30\ub85d: [\uc870\uc0ac \uad6c\uc5ed \uae30\ub85d] op-001'
        ]);
        expect(photoItem?.relationDetails).toEqual([
            '\ub300\uc0c1: [\uc720\uad6c] pit-001'
        ]);
        expect(featureItem?.copyText).toContain('\uc5f0\uacb0: \uc0c1\uc704 \uae30\ub85d: [\ud2b8\ub80c\uce58] trench-001');
        expect(featureItem?.copyText).toContain('\uc870\uc0ac \uae30\ub85d: [\uc870\uc0ac \uad6c\uc5ed \uae30\ub85d] op-001');
        expect(photoItem?.copyText).toContain('\uc5f0\uacb0: \ub300\uc0c1: [\uc720\uad6c] pit-001');
    });


    it('keeps direct tablet media records copyable even before upload metadata is complete', () => {

        const documents = [
            makeDocument('find-1', 'Find', {
                identifier: 'find-001',
                shortDescription: 'rim sherd near floor',
                fieldworkPhotoUri: 'content://tablet/photos/find-001.jpg'
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);

        expect(handoff.items.length).toBe(1);
        expect(handoff.items[0]).toEqual(jasmine.objectContaining({
            documentId: 'find-1',
            identifier: 'find-001',
            summary: 'rim sherd near floor',
            evidenceCount: 1,
            tone: 'review'
        }));
        expect(handoff.items[0].evidenceLabel).toContain('\uc0ac\uc9c4 1');
        expect(handoff.items[0].copyText).toContain('[\uc720\ubb3c] find-001');
        expect(handoff.items[0].copyText).toContain('content://tablet/photos/find-001.jpg');
    });


    it('orders investigation records before evidence records', () => {

        const documents = [
            makeDocument('photo-1', 'Photo'),
            makeDocument('feature-1', 'Feature'),
            makeDocument('trench-1', 'Trench'),
            makeDocument('layer-1', 'Layer')
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);

        expect(handoff.items.map(item => item.documentId)).toEqual([
            'trench-1',
            'feature-1',
            'layer-1',
            'photo-1'
        ]);
    });


    it('validates a tablet draft before saving it for desktop report handoff', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'pit-001',
            category: 'Feature',
            relations: { liesWithin: ['trench-1'], isRecordedIn: ['operation-1'] },
            shortDescription: 'round pit with dark fill',
            featureRecordingStatus: 'candidate'
        } as any, [
            makeDocument('trench-1', 'Trench')
        ] as any);

        expect(validation).toEqual(jasmine.objectContaining({
            status: 'ready',
            category: 'Feature',
            categoryLabel: '\uc720\uad6c',
            identifier: 'pit-001',
            isReportHandoffCategory: true,
            isCopyable: true,
            issueCount: 0
        }));
        expect(validation.message).toContain('\ub370\uc2a4\ud06c\ud1b1 \ubcf4\uace0\uc11c \ud0ed \uc804\ub2ec \ud655\uc778');
        expect(validation.copyText).toContain('[\uc720\uad6c] pit-001');
    });


    it('reports pre-save handoff gaps that would weaken HWP copy blocks', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'photo-001',
            category: 'Photo',
            relations: {}
        } as any);

        expect(validation.status).toBe('review');
        expect(validation.isCopyable).toBe(true);
        expect(validation.messages.length).toBeGreaterThan(1);
        expect(validation.messages.join('\n')).toContain('HWP');
        expect(validation.messages.join('\n')).toContain('\uc0ac\uc9c4/\ub3c4\uba74');
        expect(validation.relatedFields).toContain('fieldworkPhotoUri');
        expect(validation.relatedFields).toContain('relations');
    });


    it('ignores records that are not part of the desktop report handoff contract', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'term-001',
            category: 'TermAuthority',
            relations: {}
        } as any);

        expect(validation).toEqual(jasmine.objectContaining({
            status: 'not-applicable',
            isReportHandoffCategory: false,
            isCopyable: false,
            evidenceCount: 0,
            issueCount: 0
        }));
    });
});


function makeDocument(id: string, category: string, resource: any = {}) {

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
