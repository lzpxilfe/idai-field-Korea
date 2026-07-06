import { makeKoreanFieldworkReportHandoff } from '../../src/tools/korean-fieldwork-report-handoff';


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
            issueCount: 3,
            tone: 'review'
        }));
        expect(featureItem?.evidenceLabel).toContain('\uc0ac\uc9c4 1');
        expect(featureItem?.evidenceLabel).toContain('\ud1a0\uce35\uc0ac\uc9c4 1');
        expect(featureItem?.evidenceLabel).toContain('\ud604\uc7a5\uba54\ubaa8 1');
        expect(featureItem?.copyText).toContain('[\uc720\uad6c] pit-001');
        expect(featureItem?.copyText).toContain('\uc694\uc57d: round pit with dark fill');
        expect(featureItem?.copyText).toContain('\ud655\uc778: \ubcf4\uc644 \ud544\uc694 3');
        expect(handoff.reviewCount).toBeGreaterThan(0);
        expect(handoff.copyAllText).toContain(featureItem!.copyText);
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
