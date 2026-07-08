import {
    getKoreanFieldworkCategoryLabel,
    getKoreanFieldworkChecklistSteps,
    getKoreanFieldworkEvidenceChips,
    getKoreanFieldworkEvidenceDefinitionsForCategory,
    getKoreanFieldworkFeaturePeriodSummary,
    getKoreanFieldworkFeatureInvestigationChecklistLabel,
    getKoreanFieldworkFeatureInvestigationChecklistLabels,
    getKoreanFieldworkFeatureInvestigationChecklistSummary,
    getKoreanFieldworkRecordFieldValueSummary,
    getKoreanFieldworkRecordValueLabel,
    getKoreanFieldworkReportHandoffCategoryRank,
    getKoreanFieldworkRelationLabel,
    isKoreanFieldworkReportHandoffCategory,
    KOREAN_FIELDWORK_CATEGORIES,
    KOREAN_FIELDWORK_CATEGORY_ORDER,
    KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS,
    KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS
} from '../../src/tools/korean-fieldwork-record-contract';


describe('Korean fieldwork record contract', () => {

    it('keeps shared category labels and ordering in core', () => {

        expect(getKoreanFieldworkCategoryLabel(KOREAN_FIELDWORK_CATEGORIES.FEATURE))
            .toBe('\uc720\uad6c');
        expect(getKoreanFieldworkCategoryLabel(KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT))
            .toBe('\ud53c\ud2b8');
        expect(getKoreanFieldworkCategoryLabel(KOREAN_FIELDWORK_CATEGORIES.FIND_COLLECTION))
            .toBe('\uc720\ubb3c \uc77c\uad04');
        expect(getKoreanFieldworkCategoryLabel('UnknownCategory')).toBe('UnknownCategory');

        expect(KOREAN_FIELDWORK_CATEGORY_ORDER.slice(0, 5)).toEqual([
            KOREAN_FIELDWORK_CATEGORIES.OPERATION,
            KOREAN_FIELDWORK_CATEGORIES.TRENCH,
            KOREAN_FIELDWORK_CATEGORIES.FEATURE,
            KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
            KOREAN_FIELDWORK_CATEGORIES.LAYER
        ]);
    });


    it('keeps Korean relation labels in the shared core contract', () => {

        expect(getKoreanFieldworkRelationLabel('liesWithin')).toBe('\uc0c1\uc704 \uae30\ub85d');
        expect(getKoreanFieldworkRelationLabel('depicts')).toBe('\ub300\uc0c1');
        expect(getKoreanFieldworkRelationLabel('isRecordedIn')).toBe('\uc870\uc0ac \uae30\ub85d');
        expect(getKoreanFieldworkRelationLabel('unknownRelation')).toBe('unknownRelation');
    });


    it('defines report handoff categories and ranks centrally', () => {

        expect(isKoreanFieldworkReportHandoffCategory(KOREAN_FIELDWORK_CATEGORIES.FEATURE))
            .toBe(true);
        expect(isKoreanFieldworkReportHandoffCategory(KOREAN_FIELDWORK_CATEGORIES.PHOTO))
            .toBe(true);
        expect(isKoreanFieldworkReportHandoffCategory('Project')).toBe(false);
        expect(getKoreanFieldworkReportHandoffCategoryRank(KOREAN_FIELDWORK_CATEGORIES.TRENCH))
            .toBeLessThan(getKoreanFieldworkReportHandoffCategoryRank(KOREAN_FIELDWORK_CATEGORIES.PHOTO));
        expect(getKoreanFieldworkReportHandoffCategoryRank('Project')).toBe(Number.MAX_SAFE_INTEGER);
    });


    it('keeps tablet quick-record value labels in the shared core contract', () => {

        expect(getKoreanFieldworkRecordValueLabel('featureRecordingStatus', 'candidate'))
            .toBe('\uc870\uc0ac \uc804');
        expect(getKoreanFieldworkRecordFieldValueSummary('fieldRecordQuality', [
            'immediateRecording',
            'observationInterpretationSeparated'
        ])).toBe('\ud604\uc7a5 \uae30\ub85d \u00b7 \ud574\uc11d');
        expect(getKoreanFieldworkRecordFieldValueSummary('recordCreationTiming', 'duringFieldwork'))
            .toBe('\ucd94\uac00 \uae30\ub85d');
        expect(getKoreanFieldworkRecordFieldValueSummary('verificationState', 'observedInField'))
            .toBe('\ud604\uc7a5 \ud655\uc778');
        expect(getKoreanFieldworkFeaturePeriodSummary({
            value: 'bronzeAge',
            endValue: 'threeKingdoms'
        })).toBe('\uccad\ub3d9\uae30~\uc0bc\uad6d');
        expect(getKoreanFieldworkRecordFieldValueSummary('geometrySource', 'gpsApproximate'))
            .toBe('GPS \ub300\ub7b5 \uc704\uce58');
        expect(getKoreanFieldworkRecordFieldValueSummary('featureGeometryEditStatus', 'roughSketch'))
            .toBe('\ub300\ub7b5 \uc2a4\ucf00\uce58');
        expect(getKoreanFieldworkRecordFieldValueSummary('surveyBoundarySource', 'shpImport'))
            .toBe('SHP \uac00\uc838\uc624\uae30');
        expect(getKoreanFieldworkRecordValueLabel('unknownField', 'unknownValue'))
            .toBe('unknownValue');
    });


    it('keeps tablet investigation checklist order and Korean labels in core', () => {

        expect(KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS).toEqual([
            'preInvestigationPhotoTaken',
            'inProgressPhotoTaken',
            'soilProfilePhotoLinked',
            'measuredDrawingCompleted',
            'preRecoveryFindPhotoTaken',
            'findsRecovered',
            'samplesCollected',
            'penMemoReviewed',
            'completionPhotoTaken'
        ]);
        expect(KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS).toEqual([
            'trenchSoilCleaned',
            'trenchFeatureChecked',
            'trenchPitOpened',
            'trenchPitProfileDrawn',
            'trenchOverviewPhotoTaken',
            'trenchObliquePhotoTaken',
            'soilProfilePhotoLinked',
            'inProgressPhotoTaken',
            'penMemoReviewed'
        ]);
        expect(getKoreanFieldworkChecklistSteps(KOREAN_FIELDWORK_CATEGORIES.FEATURE))
            .toBe(KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS);
        expect(getKoreanFieldworkChecklistSteps(KOREAN_FIELDWORK_CATEGORIES.TRENCH, 'trialTrench'))
            .toBe(KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS);
        expect(getKoreanFieldworkChecklistSteps(KOREAN_FIELDWORK_CATEGORIES.TRENCH, 'excavation'))
            .toEqual([]);
        expect(getKoreanFieldworkFeatureInvestigationChecklistLabel('preInvestigationPhotoTaken'))
            .toBe('\uc870\uc0ac \uc804 \uc0ac\uc9c4');
        expect(getKoreanFieldworkFeatureInvestigationChecklistLabel('unknownStep'))
            .toBe('unknownStep');
        expect(getKoreanFieldworkFeatureInvestigationChecklistLabels([
            'findsRecovered',
            'preInvestigationPhotoTaken',
            'unknownStep'
        ])).toEqual([
            '\uc870\uc0ac \uc804 \uc0ac\uc9c4',
            '\uc720\ubb3c \uc218\uc2b5',
            'unknownStep'
        ]);
        expect(getKoreanFieldworkFeatureInvestigationChecklistSummary(
            '["trenchPitOpened","trenchSoilCleaned"]'
        )).toBe('\ud1a0\uce35 \uc815\ub9ac \u00b7 \ud53c\ud2b8 \uc870\uc0ac');
    });


    it('gives tablet and desktop the same evidence chip contract', () => {

        const definitions = getKoreanFieldworkEvidenceDefinitionsForCategory(
            KOREAN_FIELDWORK_CATEGORIES.FEATURE
        );

        expect(definitions.map(definition => definition.id)).toEqual([
            'featureSegments',
            'layers',
            'photos',
            'soilProfilePhotos',
            'drawings',
            'sketches',
            'finds',
            'samples'
        ]);
        expect(definitions.map(definition => definition.createCategoryName)).toEqual([
            KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
            undefined,
            KOREAN_FIELDWORK_CATEGORIES.PHOTO,
            KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO,
            KOREAN_FIELDWORK_CATEGORIES.DRAWING,
            KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO,
            KOREAN_FIELDWORK_CATEGORIES.FIND,
            KOREAN_FIELDWORK_CATEGORIES.SAMPLE
        ]);
    });


    it('builds shared evidence chips from linked tablet records', () => {

        const feature = makeDocument('feature-1', KOREAN_FIELDWORK_CATEGORIES.FEATURE);
        const segment = makeDocument('segment-1', KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT, {
            relations: { liesWithin: ['feature-1'] }
        });
        const photo = makeDocument('photo-1', KOREAN_FIELDWORK_CATEGORIES.PHOTO, {
            relations: { depicts: ['feature-1'] }
        });

        const chips = getKoreanFieldworkEvidenceChips(feature as any, [feature, segment, photo] as any);

        expect(chips.map(chip => ({
            id: chip.id,
            label: chip.label,
            count: chip.count,
            createCategoryName: chip.createCategoryName
        }))).toEqual([
            {
                id: 'featureSegments',
                label: '\ud53c\ud2b8',
                count: 1,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT
            },
            {
                id: 'photos',
                label: '\uc0ac\uc9c4',
                count: 1,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.PHOTO
            },
            {
                id: 'soilProfilePhotos',
                label: '\ud1a0\uce35\uc0ac\uc9c4',
                count: 0,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.SOIL_PROFILE_PHOTO
            },
            {
                id: 'drawings',
                label: '\ub3c4\uba74',
                count: 0,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.DRAWING
            },
            {
                id: 'sketches',
                label: '\uc57d\ub3c4\u00b7\uc2a4\ucf00\uce58',
                count: 0,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO
            },
            {
                id: 'finds',
                label: '\uc720\ubb3c',
                count: 0,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.FIND
            },
            {
                id: 'samples',
                label: '\uc2dc\ub8cc',
                count: 0,
                createCategoryName: KOREAN_FIELDWORK_CATEGORIES.SAMPLE
            }
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
        created: { user: 'test', date: new Date(0) },
        modified: []
    };
}
