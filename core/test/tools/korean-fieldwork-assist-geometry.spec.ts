import {
    convertKoreanFieldworkImagePoint,
    convertKoreanFieldworkPercentPointToNormalized10000,
    findKoreanFieldworkAcceptedStratigraphicCycle,
    isKoreanFieldworkSoilProfileInterpretationStale,
    KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION,
    KoreanFieldworkSoilProfileInterpretationPayload,
    parseKoreanFieldworkSoilProfileInterpretation,
    validateKoreanFieldworkSoilProfileAssistLinks,
    validateKoreanFieldworkSoilProfileInterpretation
} from '../../src/tools/korean-fieldwork-assist-geometry';
import {
    KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
    KoreanFieldworkAssistRun
} from '../../src/tools/korean-fieldwork-assist-run';


describe('Korean fieldwork soil-profile interpretation contract', () => {

    it('round-trips typed geometry with explicit normalized image coordinates', () => {

        const payload = makeInterpretation();
        const validation = validateKoreanFieldworkSoilProfileInterpretation(payload);
        const parsed = parseKoreanFieldworkSoilProfileInterpretation(JSON.stringify(payload));

        expect(validation.isValid).toBe(true);
        expect(validation.issues).toEqual([]);
        expect(parsed).toEqual({ ok: true, value: payload });
    });


    it('rejects malformed JSON and preserves unsupported future versions', () => {

        const payload = makeInterpretation();
        const malformed = parseKoreanFieldworkSoilProfileInterpretation('{');
        const unsupported = parseKoreanFieldworkSoilProfileInterpretation({
            ...payload,
            schemaVersion: 2
        });

        expect(malformed.ok).toBe(false);
        if ('reason' in malformed) expect(malformed.reason).toBe('invalid');
        expect(unsupported.ok).toBe(false);
        if ('reason' in unsupported) {
            expect(unsupported.reason).toBe('unsupportedVersion');
            expect((unsupported.raw as any).schemaVersion).toBe(2);
        }
    });


    it('returns issues for malformed nested proposals instead of throwing', () => {

        const payload = makeInterpretation() as any;
        delete payload.geometries[0].provenance;
        delete payload.relations[0].review;

        expect(() => validateKoreanFieldworkSoilProfileInterpretation(payload)).not.toThrow();
        expect(validateKoreanFieldworkSoilProfileInterpretation(payload).issues.map(issue => issue.code))
            .toContain('invalidType');
    });


    it('returns issues for malformed photo candidates instead of throwing', () => {

        const payload = makeInterpretation() as any;
        payload.geometries[2].soilColor.candidates[0].munsell = 123;

        expect(() => validateKoreanFieldworkSoilProfileInterpretation(payload)).not.toThrow();
        expect(validateKoreanFieldworkSoilProfileInterpretation(payload).issues.map(issue => issue.path))
            .toContain('$.geometries[2].soilColor.candidates[0].munsell');
    });


    it('rejects sparse geometry collections and point lists without throwing', () => {

        const sparseGeometries = makeInterpretation() as any;
        sparseGeometries.geometries = new Array(1);

        const sparseRelations = makeInterpretation() as any;
        sparseRelations.relations = new Array(1);

        const sparsePoints = makeInterpretation() as any;
        sparsePoints.geometries[1].points = new Array(4);
        sparsePoints.geometries[1].points[1] = { x: 1000, y: 1000 };
        sparsePoints.geometries[1].points[2] = { x: 9000, y: 1000 };
        sparsePoints.geometries[1].points[3] = { x: 5000, y: 9000 };

        expect(() => validateKoreanFieldworkSoilProfileInterpretation(sparsePoints)).not.toThrow();
        expect(validateKoreanFieldworkSoilProfileInterpretation(sparseGeometries).issues.map(
            issue => issue.path
        )).toContain('$.geometries');
        expect(validateKoreanFieldworkSoilProfileInterpretation(sparseRelations).issues.map(
            issue => issue.path
        )).toContain('$.relations');
        expect(validateKoreanFieldworkSoilProfileInterpretation(sparsePoints).issues.map(
            issue => issue.path
        )).toContain('$.geometries[1].points');
    });


    it('converts legacy tagged coordinates without accepting ambiguous bare points', () => {

        expect(convertKoreanFieldworkPercentPointToNormalized10000({
            xPercent: 20,
            yPercent: 50
        })).toEqual({ x: 2000, y: 5000 });

        expect(convertKoreanFieldworkImagePoint(
            { x: 5000, y: 5000 },
            'imageNormalized10000',
            'sourcePixel',
            { width: 2000, height: 1000 }
        )).toEqual({ x: 1000, y: 500 });

        expect(convertKoreanFieldworkImagePoint(
            { x: 1000, y: 500 },
            'sourcePixel',
            'imageNormalized10000',
            { width: 2000, height: 1000 }
        )).toEqual({ x: 5000, y: 5000 });

        expect(convertKoreanFieldworkPercentPointToNormalized10000({
            xPercent: 120,
            yPercent: 50
        })).toBeUndefined();
    });


    it('rejects out-of-range, degenerate and underspecified geometry without clamping', () => {

        const payload = makeInterpretation() as any;
        payload.geometries[0].points = [{ x: -1, y: 0 }, { x: 10001, y: 10000 }];
        payload.geometries[1].points = [
            { x: 1000, y: 1000 },
            { x: 2000, y: 2000 },
            { x: 3000, y: 3000 }
        ];

        const validation = validateKoreanFieldworkSoilProfileInterpretation(payload);

        expect(validation.isValid).toBe(false);
        expect(validation.issues.map(issue => issue.code)).toContain('outOfRange');
        expect(validation.issues.map(issue => issue.message))
            .toContain('Context polygon points cannot be collinear.');
    });


    it('keeps polygons, boundaries and observation points as different types', () => {

        const payload = makeInterpretation() as any;
        payload.relations[0].subjectContextId = 'interface-1';
        payload.geometries[2].role = 'materialSample';

        const validation = validateKoreanFieldworkSoilProfileInterpretation(payload);

        expect(validation.issues.map(issue => issue.path))
            .toContain('$.relations[0].subjectContextId');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.geometries[2].soilColor');
    });


    it('distinguishes field-measured Munsell values from photo estimates', () => {

        const payload = makeInterpretation() as any;
        const soilColor = payload.geometries[2].soilColor;
        soilColor.method = 'fieldMeasured';
        delete soilColor.selectedMunsell;

        const missingMeasurement = validateKoreanFieldworkSoilProfileInterpretation(payload);

        soilColor.method = 'photoEstimated';
        soilColor.selectedMunsell = '10YR 4/3';
        delete soilColor.calibration;

        const missingCalibration = validateKoreanFieldworkSoilProfileInterpretation(payload);

        expect(missingMeasurement.issues.map(issue => issue.path))
            .toContain('$.geometries[2].soilColor.selectedMunsell');
        expect(missingCalibration.issues.map(issue => issue.path))
            .toContain('$.geometries[2].soilColor.calibration');
    });


    it('detects accepted stratigraphic cycles but ignores unaccepted proposals', () => {

        const payload = makeInterpretation();
        const reverse = {
            ...payload.relations[0],
            id: 'relation-2',
            subjectContextId: 'context-2',
            objectContextId: 'context-1'
        };

        expect(findKoreanFieldworkAcceptedStratigraphicCycle([
            payload.relations[0],
            reverse
        ])).toEqual(['context-1', 'context-2', 'context-1']);

        reverse.review = { state: 'proposed' };
        expect(findKoreanFieldworkAcceptedStratigraphicCycle([
            payload.relations[0],
            reverse
        ])).toBeUndefined();
    });


    it('collapses accepted sameAs contexts before checking stratigraphic cycles', () => {

        const payload = makeInterpretation();
        const sameAs = {
            ...payload.relations[0],
            id: 'relation-same-as',
            predicate: 'sameAs' as const
        };

        expect(findKoreanFieldworkAcceptedStratigraphicCycle([
            sameAs,
            payload.relations[0]
        ])).toBeDefined();
    });


    it('requires accepted relation endpoints to be accepted contexts', () => {

        const payload = makeInterpretation() as any;
        payload.geometries[3].review = { state: 'proposed' };

        expect(validateKoreanFieldworkSoilProfileInterpretation(payload).issues.map(issue => issue.path))
            .toContain('$.relations[0].objectContextId');
    });


    it('rejects self-intersecting context polygons', () => {

        const payload = makeInterpretation() as any;
        payload.geometries[1].points = [
            { x: 1000, y: 1000 },
            { x: 9000, y: 9000 },
            { x: 1000, y: 9000 },
            { x: 9000, y: 1000 },
            { x: 5000, y: 9500 }
        ];

        expect(validateKoreanFieldworkSoilProfileInterpretation(payload).issues.map(issue => issue.message))
            .toContain('Context polygon edges cannot cross or touch non-adjacent edges.');
    });


    it('cross-checks assist outputs, source hashes and reverse provenance links', () => {

        const payload = makeInterpretation();
        const run = makeAssistRun();
        const photoRun = makePhotoAssistRun();
        const valid = validateKoreanFieldworkSoilProfileAssistLinks(payload, [run, photoRun]);

        expect(valid.isValid).toBe(true);

        const wrongRun = {
            ...run,
            inputs: [{
                ...run.inputs[0],
                sourceSha256: 'b'.repeat(64)
            }]
        };
        const invalid = validateKoreanFieldworkSoilProfileAssistLinks(payload, [wrongRun, photoRun]);

        expect(invalid.issues.map(issue => issue.path))
            .toContain('$.assistRuns[0].inputs');
    });


    it('validates malformed assist-run collections without throwing', () => {

        const payload = makeInterpretation();

        expect(() => validateKoreanFieldworkSoilProfileAssistLinks(payload, undefined)).not.toThrow();
        expect(validateKoreanFieldworkSoilProfileAssistLinks(payload, undefined).issues.map(issue => issue.path))
            .toContain('$.assistRuns');
        expect(() => validateKoreanFieldworkSoilProfileAssistLinks(
            payload,
            [null, makeAssistRun(), makePhotoAssistRun()]
        )).not.toThrow();

        const sparseRuns = new Array(2);
        sparseRuns[1] = makeAssistRun();
        expect(validateKoreanFieldworkSoilProfileAssistLinks(
            payload,
            sparseRuns
        ).issues.map(issue => issue.path)).toContain('$.assistRuns');
    });


    it('matches each soil assist-run kind to its output type and provenance', () => {

        const payload = makeInterpretation() as any;
        payload.geometries[0].provenance = { origin: 'manual' };
        payload.geometries[1].provenance = {
            origin: 'assist',
            assistRunId: 'assist-run-1'
        };
        const run = makeAssistRun();
        run.outputItemIds = ['context-1'];

        const validation = validateKoreanFieldworkSoilProfileAssistLinks(
            payload,
            [run, makePhotoAssistRun()]
        );

        expect(validation.issues.map(issue => issue.message))
            .toContain('Assist run kind does not match the referenced output item type.');
    });


    it('pins photo-estimated colors to an assist run, source pixel and ranked candidates', () => {

        const payload = makeInterpretation() as any;
        const sample = payload.geometries[2];
        sample.provenance = { origin: 'manual' };
        sample.soilColor.selectedMunsell = '5YR 3/2';
        sample.soilColor.candidates[0].rank = 9;
        sample.soilColor.samplePixel = { x: 2000, y: 1000 };

        const validation = validateKoreanFieldworkSoilProfileInterpretation(payload);

        expect(validation.issues.map(issue => issue.path))
            .toContain('$.geometries[2].provenance.origin');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.geometries[2].soilColor.selectedMunsell');
        expect(validation.issues.map(issue => issue.path))
            .toContain('$.geometries[2].soilColor.samplePixel');
        expect(validation.issues.map(issue => issue.message))
            .toContain('Candidate ranks must form a contiguous sequence starting at 1.');
    });


    it('marks interpretation data stale when the source revision or hash changes', () => {

        const payload = makeInterpretation();

        expect(isKoreanFieldworkSoilProfileInterpretationStale(payload, {
            documentId: payload.sourceImage.documentId,
            documentRevision: payload.sourceImage.documentRevision,
            sourceSha256: payload.sourceImage.sourceSha256,
            width: payload.sourceImage.width,
            height: payload.sourceImage.height
        })).toBe(false);

        expect(isKoreanFieldworkSoilProfileInterpretationStale(payload, {
            documentId: payload.sourceImage.documentId,
            documentRevision: '4-new-photo',
            sourceSha256: 'b'.repeat(64),
            width: payload.sourceImage.width,
            height: payload.sourceImage.height
        })).toBe(true);
    });


    it('requires edited items to preserve a superseded predecessor', () => {

        const payload = makeInterpretation() as any;
        payload.geometries.push({
            ...payload.geometries[1],
            id: 'context-edited',
            provenance: {
                origin: 'edited',
                derivedFromItemId: 'context-1'
            },
            review: {
                state: 'accepted',
                decidedAt: '2026-07-13T10:10:00.000Z',
                decidedBy: 'reviewer-1'
            }
        });

        const validation = validateKoreanFieldworkSoilProfileInterpretation(payload);

        expect(validation.issues.map(issue => issue.code)).toContain('invalidState');
    });


    it('prevents accepted edit forks and reports real payload paths', () => {

        const payload = makeInterpretation() as any;
        payload.relations = [];
        payload.geometries[1].review = {
            state: 'superseded',
            decidedAt: '2026-07-13T10:10:00.000Z',
            decidedBy: 'reviewer-1'
        };
        ['context-edited-a', 'context-edited-b'].forEach(id => payload.geometries.push({
            ...payload.geometries[1],
            id,
            provenance: {
                origin: 'edited',
                derivedFromItemId: 'context-1'
            },
            review: {
                state: 'accepted',
                decidedAt: '2026-07-13T10:11:00.000Z',
                decidedBy: 'reviewer-1'
            }
        }));

        const validation = validateKoreanFieldworkSoilProfileInterpretation(payload);

        expect(validation.issues.map(issue => issue.message))
            .toContain('A superseded item can have only one accepted successor.');
        expect(validation.issues.some(issue =>
            issue.path === '$.geometries[4].provenance.derivedFromItemId'
        )).toBe(true);
    });
});


function makeInterpretation(): KoreanFieldworkSoilProfileInterpretationPayload {

    return {
        schemaVersion: KOREAN_FIELDWORK_SOIL_PROFILE_INTERPRETATION_SCHEMA_VERSION,
        coordinateSpace: 'imageNormalized10000',
        sourceImage: {
            documentId: 'soil-photo-1',
            documentRevision: '3-source',
            sourceField: 'soilProfilePhotoUri',
            sourceSha256: 'a'.repeat(64),
            width: 2000,
            height: 1000,
            mediaId: 'image-1',
            originalFilename: 'section-a.jpg'
        },
        geometries: [
            {
                id: 'interface-1',
                kind: 'interfacePolyline',
                points: [
                    { x: 0, y: 5000 },
                    { x: 10000, y: 5200 }
                ],
                provenance: {
                    origin: 'assist',
                    assistRunId: 'assist-run-1'
                },
                review: { state: 'proposed' },
                score: {
                    metric: 'relativeBoundaryStrength',
                    value: 0.72,
                    meaning: 'relativeOnly'
                }
            },
            {
                id: 'context-1',
                kind: 'contextPolygon',
                points: [
                    { x: 0, y: 0 },
                    { x: 10000, y: 0 },
                    { x: 10000, y: 5000 },
                    { x: 0, y: 5000 }
                ],
                provenance: { origin: 'manual' },
                review: {
                    state: 'accepted',
                    decidedAt: '2026-07-13T10:10:00.000Z',
                    decidedBy: 'reviewer-1'
                }
            },
            {
                id: 'soil-color-1',
                kind: 'annotationPoint',
                point: { x: 2000, y: 2500 },
                role: 'soilColorSample',
                soilColor: {
                    method: 'photoEstimated',
                    selectedMunsell: '10YR 4/3',
                    samplePixel: { x: 400, y: 250 },
                    rgb: { red: 111, green: 87, blue: 61 },
                    candidates: [{
                        deltaE: 2.1,
                        munsell: '10YR 4/3',
                        rank: 1
                    }],
                    calibration: 'none'
                },
                provenance: {
                    origin: 'assist',
                    assistRunId: 'photo-run-1'
                },
                review: { state: 'proposed' }
            },
            {
                id: 'context-2',
                kind: 'contextPolygon',
                points: [
                    { x: 0, y: 5000 },
                    { x: 10000, y: 5000 },
                    { x: 10000, y: 10000 },
                    { x: 0, y: 10000 }
                ],
                provenance: { origin: 'manual' },
                review: {
                    state: 'accepted',
                    decidedAt: '2026-07-13T10:10:00.000Z',
                    decidedBy: 'reviewer-1'
                }
            }
        ],
        relations: [{
            id: 'relation-1',
            kind: 'stratigraphicRelation',
            subjectContextId: 'context-1',
            predicate: 'above',
            objectContextId: 'context-2',
            provenance: { origin: 'manual' },
            review: {
                state: 'accepted',
                decidedAt: '2026-07-13T10:10:00.000Z',
                decidedBy: 'reviewer-1'
            }
        }]
    };
}


function makeAssistRun(): KoreanFieldworkAssistRun {

    return {
        schemaVersion: KOREAN_FIELDWORK_ASSIST_RUN_SCHEMA_VERSION,
        runId: 'assist-run-1',
        kind: 'soilProfileBoundarySuggestion',
        status: 'completed',
        startedAt: '2026-07-13T10:00:00.000Z',
        completedAt: '2026-07-13T10:00:05.000Z',
        operatorId: 'investigator-1',
        inputs: [{
            documentId: 'soil-photo-1',
            documentRevision: '3-source',
            mediaId: 'image-1',
            sourceSha256: 'a'.repeat(64)
        }],
        engine: {
            name: 'deterministic-boundary-suggestion',
            version: '1.0.0',
            runtime: 'desktop'
        },
        parameters: {
            threshold: 0.7
        },
        outputItemIds: ['interface-1']
    };
}


function makePhotoAssistRun(): KoreanFieldworkAssistRun {

    return {
        ...makeAssistRun(),
        runId: 'photo-run-1',
        kind: 'soilColorPhotoEstimate',
        engine: {
            name: 'deterministic-soil-color-estimate',
            version: '1.0.0',
            runtime: 'desktop'
        },
        outputItemIds: ['soil-color-1']
    };
}
