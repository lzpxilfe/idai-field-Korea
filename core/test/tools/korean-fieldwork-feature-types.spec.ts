import {
    DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS,
    getKoreanFieldworkFeatureIdentifierPrefix,
    getKoreanFieldworkFeatureInterpretationTypeValue,
    getKoreanFieldworkFeatureInvestigationSteps,
    getKoreanFieldworkFeatureTypeLabel,
    getKoreanFieldworkFeatureTypeLabelFromInterpretationType,
    KOREAN_FIELDWORK_FEATURE_TYPE_INTERPRETATION_VALUES,
    KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS
} from '../../src/tools/korean-fieldwork-feature-types';


describe('Korean fieldwork feature types', () => {

    it('keeps feature type labels, prefixes, and interpretation values in core', () => {

        expect(KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS.map(option => option.value)).toEqual([
            'unknown',
            'pit',
            'posthole',
            'ditch',
            'kiln',
            'dwelling',
            'burial',
            'fence',
            'production',
            'building'
        ]);
        expect(getKoreanFieldworkFeatureTypeLabel('pit')).toBe('수혈');
        expect(getKoreanFieldworkFeatureIdentifierPrefix('dwelling')).toBe('주거지');
        expect(getKoreanFieldworkFeatureIdentifierPrefix('not-yet-classified')).toBe('유구');
        expect(getKoreanFieldworkFeatureInterpretationTypeValue('ditch')).toBe('ditchOrGully');
        expect(getKoreanFieldworkFeatureTypeLabelFromInterpretationType(['tomb'])).toBe('토광묘');
        expect(KOREAN_FIELDWORK_FEATURE_TYPE_INTERPRETATION_VALUES).toContain('surfaceBuilding');
    });


    it('keeps tablet investigation guidance in the same core option list', () => {

        for (const option of KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS) {
            expect(option.investigationSteps.length).toBeGreaterThanOrEqual(3);
        }
        expect(getKoreanFieldworkFeatureInvestigationSteps('pit')).toEqual([
            '조사 전 사진',
            '윤곽·어깨선',
            '장축·단축·깊이',
            '충전토 단면',
            '바닥 확인'
        ]);
        expect(getKoreanFieldworkFeatureInvestigationSteps('not-yet-classified'))
            .toBe(DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS);
    });
});
