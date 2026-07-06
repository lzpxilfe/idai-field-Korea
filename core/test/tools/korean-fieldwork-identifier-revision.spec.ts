import { Document } from '../../src/model/document/document';
import {
    canReviseKoreanFieldworkIdentifier,
    getKoreanFieldworkFieldIdentifier,
    getKoreanFieldworkIdentifierRevisionHistory,
    getKoreanFieldworkIdentifierRevisionUpdates,
    getKoreanFieldworkReportIdentifier,
    KOREAN_FIELDWORK_IDENTIFIER_REVISION_CATEGORIES
} from '../../src/tools/korean-fieldwork-identifier-revision';


describe('Korean fieldwork identifier revision', () => {

    it('keeps identifier revision categories in the shared core contract', () => {

        expect(KOREAN_FIELDWORK_IDENTIFIER_REVISION_CATEGORIES).toEqual([
            'FeatureGroup',
            'Feature',
            'FeatureSegment'
        ]);
        expect(canReviseKoreanFieldworkIdentifier(createDoc('feature-group-1', 'FeatureGroup', 'group-1')))
            .toBe(true);
        expect(canReviseKoreanFieldworkIdentifier(createDoc('feature-1', 'Feature', 'pit-1')))
            .toBe(true);
        expect(canReviseKoreanFieldworkIdentifier(createDoc('segment-1', 'FeatureSegment', 'segment-1')))
            .toBe(true);
        expect(canReviseKoreanFieldworkIdentifier(createDoc('trench-1', 'Trench', 'T1')))
            .toBe(false);
        expect(canReviseKoreanFieldworkIdentifier(undefined)).toBe(false);
    });


    it('keeps field and report identifiers distinct for HWP numbering', () => {

        const feature = createDoc('feature-1', 'Feature', 'field-17');

        expect(getKoreanFieldworkIdentifierRevisionUpdates(feature, {
            nextIdentifier: '  Joseon pit 3  ',
            reason: '  final report numbering  ',
            now: new Date('2026-06-23T00:00:00.000Z')
        })).toEqual({
            identifier: 'Joseon pit 3',
            fieldIdentifier: 'field-17',
            reportIdentifier: 'Joseon pit 3',
            identifierRevisionNote: 'final report numbering',
            identifierRevisionHistory: [
                {
                    previousIdentifier: 'field-17',
                    nextIdentifier: 'Joseon pit 3',
                    fieldIdentifier: 'field-17',
                    reason: 'final report numbering',
                    changedAt: '2026-06-23T00:00:00.000Z'
                }
            ]
        });
    });


    it('preserves existing history and ignores non-changes', () => {

        const feature = createDoc('feature-1', 'Feature', 'Joseon pit 3', {
            fieldIdentifier: 'field-17',
            reportIdentifier: 'Joseon pit 3',
            identifierRevisionHistory: [
                {
                    previousIdentifier: 'field-17',
                    nextIdentifier: 'Joseon pit 3',
                    fieldIdentifier: 'field-17',
                    changedAt: '2026-06-22T00:00:00.000Z'
                },
                { ignored: true }
            ]
        });

        expect(getKoreanFieldworkFieldIdentifier(feature)).toBe('field-17');
        expect(getKoreanFieldworkReportIdentifier(feature)).toBe('Joseon pit 3');
        expect(getKoreanFieldworkIdentifierRevisionHistory(feature).length).toBe(1);
        expect(getKoreanFieldworkIdentifierRevisionUpdates(feature, {
            nextIdentifier: 'Joseon pit 3'
        })).toEqual({});
        const updates = getKoreanFieldworkIdentifierRevisionUpdates(feature, {
            nextIdentifier: 'Joseon pit 4',
            now: new Date('2026-06-23T00:00:00.000Z')
        });

        expect(updates).toEqual(jasmine.objectContaining({
            identifier: 'Joseon pit 4',
            fieldIdentifier: 'field-17',
            reportIdentifier: 'Joseon pit 4'
        }));
        expect((updates.identifierRevisionHistory as unknown[]).length).toBe(2);
        expect((updates.identifierRevisionHistory as unknown[])[0]).toEqual(jasmine.objectContaining({
            previousIdentifier: 'field-17',
            nextIdentifier: 'Joseon pit 3',
            fieldIdentifier: 'field-17'
        }));
        expect((updates.identifierRevisionHistory as unknown[])[1]).toEqual(jasmine.objectContaining({
            previousIdentifier: 'Joseon pit 3',
            nextIdentifier: 'Joseon pit 4',
            fieldIdentifier: 'field-17'
        }));
    });
});


const createDoc = (
        id: string,
        category: string,
        identifier: string,
        extraResource: Record<string, unknown> = {}
): Document => ({
    _id: id,
    resource: {
        id,
        identifier,
        category,
        relations: {},
        ...extraResource
    },
    created: { user: 'test', date: new Date('2026-06-23T00:00:00.000Z') },
    modified: []
} as Document);
