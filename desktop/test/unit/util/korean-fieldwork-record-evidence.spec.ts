import { Document } from 'idai-field-core';
import { getKoreanFieldworkEvidenceChips } from '../../../src/app/util/korean-fieldwork-record-evidence';


describe('korean-fieldwork-record-evidence', () => {

    it('summarizes field evidence attached to a feature record', () => {

        const feature = createDocument('feature-1', 'Feature', '수혈 1');
        const pit = createDocument('pit-1', 'FeatureSegment', '피트 1', {
            liesWithin: ['feature-1']
        });
        const layer = createDocument('layer-1', 'Layer', '토층 1', {
            liesWithin: ['feature-1']
        });
        const photo = createDocument('photo-1', 'Photo', '사진 1', {
            depicts: ['feature-1']
        });
        const sketch = createDocument('sketch-1', 'PenMemo', '약도 1', {
            depicts: ['feature-1']
        });
        const findCollection = createDocument('find-collection-1', 'FindCollection', '유물군 1', {
            liesWithin: ['feature-1']
        });
        const sample = createDocument('sample-1', 'Sample', '시료 1', {
            liesWithin: ['feature-1']
        });
        const chips = getKoreanFieldworkEvidenceChips(feature, [
            feature,
            pit,
            layer,
            photo,
            sketch,
            findCollection,
            sample
        ] as any);

        expect(chips.map(chip => ({
            id: chip.id,
            label: chip.label,
            count: chip.count,
            tone: chip.tone,
            createCategoryName: chip.createCategoryName,
            documentIds: chip.documents.map(document => document.resource.id)
        }))).toEqual([
            {
                id: 'featureSegments',
                label: '피트',
                count: 1,
                tone: 'filled',
                createCategoryName: 'FeatureSegment',
                documentIds: ['pit-1']
            },
            {
                id: 'layers',
                label: '토색 메모',
                count: 1,
                tone: 'filled',
                createCategoryName: undefined,
                documentIds: ['layer-1']
            },
            {
                id: 'photos',
                label: '사진',
                count: 1,
                tone: 'filled',
                createCategoryName: 'Photo',
                documentIds: ['photo-1']
            },
            {
                id: 'soilProfilePhotos',
                label: '토층사진',
                count: 0,
                tone: 'empty',
                createCategoryName: 'SoilProfilePhoto',
                documentIds: []
            },
            {
                id: 'drawings',
                label: '도면',
                count: 0,
                tone: 'empty',
                createCategoryName: 'Drawing',
                documentIds: []
            },
            {
                id: 'sketches',
                label: '약도·스케치',
                count: 1,
                tone: 'filled',
                createCategoryName: 'PenMemo',
                documentIds: ['sketch-1']
            },
            {
                id: 'finds',
                label: '유물',
                count: 1,
                tone: 'filled',
                createCategoryName: 'Find',
                documentIds: ['find-collection-1']
            },
            {
                id: 'samples',
                label: '시료',
                count: 1,
                tone: 'filled',
                createCategoryName: 'Sample',
                documentIds: ['sample-1']
            }
        ]);
    });


    it('keeps non-structural evidence records compact in the record list', () => {

        expect(getKoreanFieldworkEvidenceChips(
            createDocument('photo-1', 'Photo', '사진 1') as any,
            []
        )).toEqual([]);
    });


    it('keeps direct tablet photos visible on find, find collection, and sample records', () => {

        const find = createDocument('find-1', 'Find', '유물 1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/find-1.jpg'
        });
        const findCollection = createDocument('find-collection-1', 'FindCollection', '유물군 1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/find-collection-1.jpg'
        });
        const sample = createDocument('sample-1', 'Sample', '시료 1', {}, {
            fieldworkPhotoUri: 'file:///tablet/photos/sample-1.jpg'
        });

        expect(getKoreanFieldworkEvidenceChips(find, [find] as any)[0]).toMatchObject({
            id: 'photos',
            label: '사진',
            count: 1,
            tone: 'filled',
            createCategoryName: 'Photo',
            documents: [find]
        });
        expect(getKoreanFieldworkEvidenceChips(findCollection, [findCollection] as any)[0]).toMatchObject({
            id: 'photos',
            count: 1,
            documents: [findCollection]
        });
        expect(getKoreanFieldworkEvidenceChips(sample, [sample] as any)[0]).toMatchObject({
            id: 'photos',
            count: 1,
            documents: [sample]
        });
    });
});


const createDocument = (
        id: string,
        category: string,
        identifier: string,
        relations: Record<string, string[]> = {},
        extraResource: Record<string, unknown> = {}
): Document => ({
    resource: {
        id,
        identifier,
        category,
        relations,
        ...extraResource
    }
} as Document);
