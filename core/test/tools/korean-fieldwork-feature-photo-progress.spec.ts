import {
    getKoreanFieldworkFeaturePhotoProgress,
    isKoreanFieldworkFeaturePhotoMilestone,
    KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES
} from '../../src/tools/korean-fieldwork-feature-photo-progress';


describe('Korean fieldwork feature photo progress', () => {

    it('starts without inferring progress from other evidence', () => {

        expect(getKoreanFieldworkFeaturePhotoProgress([
            'soilProfilePhotoLinked',
            'measuredDrawingCompleted'
        ])).toEqual({
            stage: 'unrecorded',
            label: '사진 미확인',
            recordingStatus: 'candidate',
            progressPercent: 0,
            checkedCount: 0,
            totalCount: 3,
            checkedValues: [],
            missingValues: [
                'preInvestigationPhotoTaken',
                'inProgressPhotoTaken',
                'completionPhotoTaken'
            ],
            nextMilestoneValue: 'preInvestigationPhotoTaken'
        });
    });

    it('uses the latest checked photo milestone as the investigation stage', () => {

        expect(getKoreanFieldworkFeaturePhotoProgress([
            'preInvestigationPhotoTaken'
        ])).toEqual(jasmine.objectContaining({
            stage: 'preInvestigation',
            recordingStatus: 'candidate',
            progressPercent: 33,
            checkedCount: 1,
            nextMilestoneValue: 'inProgressPhotoTaken'
        }));

        expect(getKoreanFieldworkFeaturePhotoProgress([
            'preInvestigationPhotoTaken',
            'inProgressPhotoTaken'
        ])).toEqual(jasmine.objectContaining({
            stage: 'investigating',
            recordingStatus: 'investigating',
            progressPercent: 67,
            checkedCount: 2,
            nextMilestoneValue: 'completionPhotoTaken'
        }));
    });

    it('keeps completion stage separate from missing earlier photo coverage', () => {

        expect(getKoreanFieldworkFeaturePhotoProgress([
            'completionPhotoTaken'
        ])).toEqual({
            stage: 'completed',
            label: '완료',
            recordingStatus: 'confirmed',
            progressPercent: 100,
            checkedCount: 1,
            totalCount: 3,
            checkedValues: ['completionPhotoTaken'],
            missingValues: [
                'preInvestigationPhotoTaken',
                'inProgressPhotoTaken'
            ],
            nextMilestoneValue: undefined
        });
    });

    it('publishes only the three primary photo milestones', () => {

        expect(KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES.map(({ value }) => value))
            .toEqual([
                'preInvestigationPhotoTaken',
                'inProgressPhotoTaken',
                'completionPhotoTaken'
            ]);
        expect(isKoreanFieldworkFeaturePhotoMilestone('inProgressPhotoTaken')).toBe(true);
        expect(isKoreanFieldworkFeaturePhotoMilestone('soilProfilePhotoLinked')).toBe(false);
    });
});
