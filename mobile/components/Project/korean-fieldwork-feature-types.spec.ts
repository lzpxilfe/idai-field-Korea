import {
  DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS,
  getKoreanFieldworkFeatureInvestigationSteps,
  KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS,
} from './korean-fieldwork-feature-types';

describe('korean-fieldwork-feature-types', () => {
  it('provides investigation steps for every feature type option', () => {
    for (const option of KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS) {
      expect(option.investigationSteps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('returns type-specific investigation guidance', () => {
    expect(getKoreanFieldworkFeatureInvestigationSteps('pit')).toEqual([
      '조사 전 사진',
      '윤곽·어깨선',
      '장축·단축·깊이',
      '충전토 단면',
      '바닥 확인',
    ]);
  });

  it('falls back to the default feature guidance when the type is unknown', () => {
    expect(getKoreanFieldworkFeatureInvestigationSteps('not-yet-classified'))
      .toBe(DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS);
  });
});
