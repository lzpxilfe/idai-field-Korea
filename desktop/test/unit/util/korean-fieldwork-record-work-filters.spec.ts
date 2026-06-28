import {
    getKoreanFieldworkRecordWorkDocuments,
    getKoreanFieldworkRecordWorkFilterCounts,
    matchesKoreanFieldworkRecordWorkFilter
} from '../../../src/app/util/korean-fieldwork-record-work-filters';


describe('korean-fieldwork-record-work-filters', () => {

    it('matches records with readiness issues or recheck states', () => {

        const feature = createDocument('feature-1', 'Feature');
        const recheckTrench = createDocument('trench-1', 'Trench', {
            verificationState: 'needsRecheck'
        });

        expect(matchesKoreanFieldworkRecordWorkFilter(
            feature,
            'needsReview',
            [feature],
            { 'feature-1': 2 }
        )).toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(recheckTrench, 'needsReview', [], {}))
            .toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(feature, 'needsReview', [feature], {}))
            .toBe(false);
    });


    it('matches candidate and investigating feature records', () => {

        const candidate = createDocument('candidate', 'Feature', {
            featureRecordingStatus: 'candidate'
        });
        const confirmed = createDocument('confirmed', 'Feature', {
            featureRecordingStatus: 'confirmed'
        });

        expect(matchesKoreanFieldworkRecordWorkFilter(candidate, 'pending', [], {}))
            .toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(confirmed, 'pending', [], {}))
            .toBe(false);
    });


    it('matches structural records that still need evidence', () => {

        const feature = createDocument('feature-1', 'Feature');
        const photo = createDocument('photo-1', 'Photo', {
            relations: { depicts: ['feature-1'] }
        });

        expect(matchesKoreanFieldworkRecordWorkFilter(
            feature,
            'missingEvidence',
            [feature],
            {}
        )).toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(
            photo,
            'missingEvidence',
            [feature, photo],
            {}
        )).toBe(false);
    });


    it('uses shared evidence chips for missing-evidence decisions', () => {

        const operation = createDocument('operation-1', 'Operation');
        const pit = createDocument('pit-1', 'FeatureSegment', {
            relations: { liesWithin: ['operation-1'] }
        });
        const operationPhoto = createDocument('operation-photo-1', 'Photo', {
            relations: { depicts: ['operation-1'] }
        });
        const operationSoilPhoto = createDocument('operation-soil-photo-1', 'SoilProfilePhoto', {
            relations: { depicts: ['operation-1'] }
        });
        const operationDrawing = createDocument('operation-drawing-1', 'Drawing', {
            relations: { depicts: ['operation-1'] }
        });
        const operationFind = createDocument('operation-find-1', 'Find', {
            relations: { liesWithin: ['operation-1'] }
        });
        const operationSample = createDocument('operation-sample-1', 'Sample', {
            relations: { liesWithin: ['operation-1'] }
        });
        const operationSketch = createDocument('operation-sketch-1', 'PenMemo', {
            relations: { depicts: ['operation-1'] }
        });

        expect(matchesKoreanFieldworkRecordWorkFilter(
            operation,
            'missingEvidence',
            [
                operation,
                pit,
                operationPhoto,
                operationSoilPhoto,
                operationDrawing,
                operationFind,
                operationSample
            ],
            {}
        )).toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(
            operation,
            'missingEvidence',
            [
                operation,
                pit,
                operationPhoto,
                operationSoilPhoto,
                operationDrawing,
                operationFind,
                operationSample,
                operationSketch
            ],
            {}
        )).toBe(false);

        const layer = createDocument('layer-1', 'Layer');
        const layerDocuments = [
            layer,
            createDocument('layer-photo-1', 'Photo', {
                relations: { depicts: ['layer-1'] }
            }),
            createDocument('layer-drawing-1', 'Drawing', {
                relations: { depicts: ['layer-1'] }
            }),
            createDocument('layer-sketch-1', 'PenMemo', {
                relations: { depicts: ['layer-1'] }
            }),
            createDocument('layer-find-1', 'Find', {
                relations: { liesWithin: ['layer-1'] }
            }),
            createDocument('layer-sample-1', 'Sample', {
                relations: { liesWithin: ['layer-1'] }
            })
        ];

        expect(matchesKoreanFieldworkRecordWorkFilter(
            layer,
            'missingEvidence',
            layerDocuments,
            {}
        )).toBe(false);
    });


    it('matches records created or modified today', () => {

        const now = new Date('2026-06-24T10:00:00+09:00');
        const createdToday = createDocument('created', 'Feature', {}, '2026-06-24T01:00:00+09:00');
        const modifiedToday = createDocument(
            'modified',
            'Feature',
            {},
            '2026-06-23T01:00:00+09:00',
            '2026-06-24T09:00:00+09:00'
        );
        const old = createDocument('old', 'Feature', {}, '2026-06-23T01:00:00+09:00');

        expect(matchesKoreanFieldworkRecordWorkFilter(createdToday, 'today', [], {}, now))
            .toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(modifiedToday, 'today', [], {}, now))
            .toBe(true);
        expect(matchesKoreanFieldworkRecordWorkFilter(old, 'today', [], {}, now))
            .toBe(false);
    });


    it('uses the Korean fieldwork date for desktop today filtering', () => {

        const previousTimeZone = process.env.TZ;
        process.env.TZ = 'UTC';

        try {
            const now = new Date('2026-06-23T14:30:00.000Z');
            const beforeKoreanMidnight = createDocument(
                'before-korean-midnight',
                'Feature',
                {},
                '2026-06-23T14:10:00.000Z'
            );
            const afterKoreanMidnight = createDocument(
                'after-korean-midnight',
                'Feature',
                {},
                '2026-06-23T15:10:00.000Z'
            );

            expect(matchesKoreanFieldworkRecordWorkFilter(
                beforeKoreanMidnight,
                'today',
                [],
                {},
                now
            )).toBe(true);
            expect(matchesKoreanFieldworkRecordWorkFilter(
                afterKoreanMidnight,
                'today',
                [],
                {},
                now
            )).toBe(false);
        } finally {
            restoreTimeZone(previousTimeZone);
        }
    });


    it('counts desktop record work groups without counting evidence documents as records', () => {

        const now = new Date('2026-06-24T10:00:00+09:00');
        const documents = [
            createDocument('operation-1', 'Operation'),
            createDocument('feature-1', 'Feature', {
                featureRecordingStatus: 'candidate'
            }, '2026-06-24T01:00:00+09:00'),
            createDocument('photo-1', 'Photo')
        ];
        const recordDocuments = getKoreanFieldworkRecordWorkDocuments(documents as any);

        expect(recordDocuments.map(document => document.resource.id)).toEqual([
            'operation-1',
            'feature-1'
        ]);
        expect(getKoreanFieldworkRecordWorkFilterCounts(
            recordDocuments as any,
            documents as any,
            { 'operation-1': 1 },
            now
        )).toEqual({
            all: 2,
            needsReview: 1,
            pending: 1,
            missingEvidence: 2,
            today: 1
        });
    });
});


const createDocument = (
        id: string,
        category: string,
        resource: Record<string, unknown> = {},
        createdDate = '2026-06-23T01:00:00+09:00',
        modifiedDate?: string
) => ({
    resource: {
        id,
        identifier: id,
        category,
        relations: {},
        ...resource
    },
    created: {
        user: 'tester',
        date: createdDate
    },
    modified: modifiedDate
        ? [{ user: 'tester', date: modifiedDate }]
        : []
});

function restoreTimeZone(previousTimeZone: string|undefined): void {

    if (previousTimeZone === undefined) {
        delete process.env.TZ;
    } else {
        process.env.TZ = previousTimeZone;
    }
}
