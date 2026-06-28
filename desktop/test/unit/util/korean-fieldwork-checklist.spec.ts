import {
    countKoreanFieldworkChecklistDone,
    getKoreanFieldworkChecklistMetrics,
    getKoreanFieldworkChecklistSteps,
    isKoreanFieldworkChecklistRecord
} from '../../../src/app/util/korean-fieldwork-checklist';


describe('korean-fieldwork-checklist', () => {

    it('uses the tablet trial-trench checklist values on desktop', () => {

        expect(getKoreanFieldworkChecklistSteps('Trench', 'trialTrench')).toEqual([
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
        expect(isKoreanFieldworkChecklistRecord('Trench', 'trialTrench')).toBe(true);
        expect(isKoreanFieldworkChecklistRecord('Trench', 'excavation')).toBe(false);
    });


    it('counts tablet-synced checklist values and ignores old desktop-only values', () => {

        const trench = createDocument('trench-1', 'Trench', {
            featureInvestigationChecklist: [
                'trenchSoilCleaned',
                'trenchPitOpened',
                'trenchPhotoTaken'
            ]
        });
        const steps = getKoreanFieldworkChecklistSteps('Trench', 'trialTrench');

        expect(countKoreanFieldworkChecklistDone(trench, steps)).toBe(2);
    });


    it('includes pen memo review in feature checklist totals', () => {

        const feature = createDocument('feature-1', 'Feature', {
            featureInvestigationChecklist: [
                'preInvestigationPhotoTaken',
                'penMemoReviewed'
            ]
        });

        expect(getKoreanFieldworkChecklistMetrics([feature])).toEqual({
            done: 2,
            total: 9
        });
    });
});


const createDocument = (id: string, category: string, fields: any = {}) => ({
    resource: {
        id,
        identifier: id,
        category,
        relations: {},
        ...fields
    }
} as any);
