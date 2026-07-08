import {
    createKoreanFieldworkDraftBaseResource,
    createKoreanFieldworkDraftIdentifier,
    createKoreanFieldworkDraftRelations,
    createKoreanFieldworkLinkedDraftIdentifier,
    createNextKoreanFieldworkFeatureIdentifier,
    getKoreanFieldworkContinuationActions,
    getKoreanFieldworkFeatureDraftValues,
    parseKoreanFieldworkFeatureGeometryOption
} from '../../src/tools/korean-fieldwork-document-drafts';


describe('Korean fieldwork document drafts', () => {

    beforeEach(() => {
        spyOn(Date, 'now').and.returnValue(1700000000000);
    });


    it('keeps draft identifiers and feature names in the core contract', () => {

        expect(createKoreanFieldworkDraftIdentifier('Feature', 'pit'))
            .toBe('수혈-1700000000000');
        expect(createKoreanFieldworkDraftIdentifier('Feature', 'not-yet-classified'))
            .toBe('유구-1700000000000');
        expect(createKoreanFieldworkDraftIdentifier('CustomRecordType'))
            .toBe('custom-record-type-1700000000000');
        expect(createKoreanFieldworkDraftIdentifier('Photo', undefined, '  1호 수혈 사진 1  '))
            .toBe('1호 수혈 사진 1');
    });


    it('creates linked evidence identifiers below the same parent record', () => {

        const parentDoc = createDoc('feature-1', 'Feature', {}, { identifier: '1호 수혈' });
        const documents = [
            createDoc('photo-1', 'Photo', { depicts: ['feature-1'] }, { identifier: '1호 수혈 사진 1' }),
            createDoc('photo-2', 'Photo', { depicts: ['feature-1'] }, { identifier: '1호 수혈 사진 2' }),
            createDoc('other-photo', 'Photo', { depicts: ['feature-2'] }, { identifier: '2호 수혈 사진 1' })
        ];

        expect(createKoreanFieldworkLinkedDraftIdentifier(parentDoc, 'Photo', '사진', documents))
            .toBe('1호 수혈 사진 3');
        expect(createKoreanFieldworkLinkedDraftIdentifier(parentDoc, 'SoilProfilePhoto', '토층사진'))
            .toBe('1호 수혈 토층사진 1');
    });


    it('creates draft relations with inherited operation context', () => {

        const featureDoc = createDoc('feature-1', 'Feature', {
            isRecordedIn: ['operation-1']
        });

        expect(createKoreanFieldworkDraftRelations(featureDoc, 'Photo', allowRelations({
            'Photo:Feature': ['depicts']
        }))).toEqual({ depicts: ['feature-1'] });

        expect(createKoreanFieldworkDraftRelations(featureDoc, 'Layer', allowRelations({
            'Layer:Feature': ['liesWithin']
        }))).toEqual({
            isRecordedIn: ['operation-1'],
            liesWithin: ['feature-1']
        });

        expect(createKoreanFieldworkDraftRelations(featureDoc, 'Find', allowRelations({}))).toEqual({
            isRecordedIn: ['operation-1'],
            liesWithin: ['feature-1']
        });
    });


    it('creates a base draft resource from shared identifier and relation rules', () => {

        const featureDoc = createDoc('feature-1', 'Feature', {}, { identifier: '1호 수혈' });

        expect(createKoreanFieldworkDraftBaseResource(featureDoc, 'Photo', allowRelations({
            'Photo:Feature': ['depicts']
        }), {
            linkedIdentifierLabel: '사진'
        })).toEqual({
            identifier: '1호 수혈 사진 1',
            category: 'Photo',
            relations: { depicts: ['feature-1'] }
        });
    });


    it('keeps next feature identifiers and interpretation values in core', () => {

        const documents = [
            createDoc('feature-1', 'Feature', {}, { identifier: '1호 수혈', featureType: 'pit' }),
            createDoc('feature-2', 'Feature', {}, { identifier: '수혈 2호', featureType: 'pit' }),
            createDoc('feature-3', 'Feature', {}, { identifier: '1호 주거지', featureType: 'dwelling' })
        ];

        expect(createNextKoreanFieldworkFeatureIdentifier('pit', documents)).toBe('3호 수혈');
        expect(createNextKoreanFieldworkFeatureIdentifier('dwelling', documents)).toBe('2호 주거지');
        expect(getKoreanFieldworkFeatureDraftValues('kiln')).toEqual({
            featureType: 'kiln',
            featureInterpretationType: ['kiln']
        });
        expect(getKoreanFieldworkFeatureDraftValues('unknown')).toEqual({
            featureType: 'unknown'
        });
    });


    it('keeps continuation actions in fieldwork order', () => {

        const featureDoc = createDoc('feature-1', 'Feature');
        const config = allowRelations({
            'FeatureSegment:Feature': ['liesWithin'],
            'Photo:Feature': ['depicts'],
            'SoilProfilePhoto:Feature': ['depicts'],
            'Drawing:Feature': ['depicts'],
            'PenMemo:Feature': ['depicts'],
            'Find:Feature': ['liesWithin']
        });

        expect(getKoreanFieldworkContinuationActions(featureDoc, config)
            .map(action => action.categoryName))
            .toEqual(['FeatureSegment', 'Photo', 'SoilProfilePhoto', 'Drawing', 'PenMemo']);
    });


    it('parses tablet feature geometry strings without accepting arbitrary JSON', () => {

        expect(parseKoreanFieldworkFeatureGeometryOption(JSON.stringify({
            type: 'Point',
            coordinates: [127, 37]
        }))).toEqual({
            type: 'Point',
            coordinates: [127, 37]
        });
        expect(parseKoreanFieldworkFeatureGeometryOption('{"coordinates":[127,37]}'))
            .toBeUndefined();
        expect(parseKoreanFieldworkFeatureGeometryOption('not json')).toBeUndefined();
    });
});


const createDoc = (id: string,
                   category: string,
                   relations: Record<string, string[]> = {},
                   fields: Record<string, any> = {}) => ({
    resource: {
        id,
        identifier: id,
        category,
        relations,
        ...fields
    }
} as any);


const allowRelations = (allowed: Record<string, string[]>) => ({
    getCategory: (categoryName: string) => createCategory(categoryName),
    isAllowedRelationDomainCategory: (
        categoryName: string,
        parentCategoryName: string,
        relationName: string
    ) => (allowed[`${categoryName}:${parentCategoryName}`] ?? []).includes(relationName)
} as any);


const createCategory = (name: string) => ({
    name,
    mustLieWithin: false,
    groups: []
} as any);
