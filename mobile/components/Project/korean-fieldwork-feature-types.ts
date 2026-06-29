export interface KoreanFieldworkFeatureTypeOption {
  description: string;
  featureInterpretationTypeValue?: string;
  identifierPrefix: string;
  investigationSteps: readonly string[];
  label: string;
  value: string;
}

export const DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS = [
  '조사 전 사진',
  '윤곽 표시',
  '장축·단축·깊이',
  '토층·충전토',
  '성격 재판단',
] as const;

export const KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS: readonly KoreanFieldworkFeatureTypeOption[] = [
  {
    value: 'unknown',
    label: '미정',
    identifierPrefix: '유구',
    description: '검출 직후 성격이 분명하지 않을 때',
    investigationSteps: DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS,
  },
  {
    value: 'pit',
    label: '수혈',
    identifierPrefix: '수혈',
    featureInterpretationTypeValue: 'pitFeature',
    description: '평면 윤곽과 충전토를 먼저 확인',
    investigationSteps: [
      '조사 전 사진',
      '윤곽·어깨선',
      '장축·단축·깊이',
      '충전토 단면',
      '바닥 확인',
    ],
  },
  {
    value: 'posthole',
    label: '주혈',
    identifierPrefix: '주혈',
    featureInterpretationTypeValue: 'posthole',
    description: '기둥 자리, 열·간격 관계를 확인',
    investigationSteps: [
      '배열 확인',
      '직경·깊이',
      '충전토·다짐',
      '기둥 흔적',
      '간격 기록',
    ],
  },
  {
    value: 'ditch',
    label: '구상유구',
    identifierPrefix: '구상유구',
    featureInterpretationTypeValue: 'ditchOrGully',
    description: '방향, 폭, 접속 관계를 확인',
    investigationSteps: [
      '방향 확인',
      '폭·깊이',
      '절단면 설정',
      '접속 관계',
      '유수·매몰층',
    ],
  },
  {
    value: 'kiln',
    label: '가마',
    identifierPrefix: '가마',
    featureInterpretationTypeValue: 'kiln',
    description: '연소부·소성부·연도부를 확인',
    investigationSteps: [
      '부위 구분',
      '화구·연소부',
      '소성부·연도',
      '피열 흔적',
      '유물·재층',
    ],
  },
  {
    value: 'dwelling',
    label: '주거지',
    identifierPrefix: '주거지',
    featureInterpretationTypeValue: 'dwellingSite',
    description: '평면 형태와 내부 시설을 확인',
    investigationSteps: [
      '평면 윤곽',
      '토층둑 설정',
      '벽·바닥 접점',
      '내부시설',
      '출입구·주혈',
    ],
  },
  {
    value: 'burial',
    label: '토광묘',
    identifierPrefix: '토광묘',
    featureInterpretationTypeValue: 'tomb',
    description: '묘광 윤곽, 방향, 매장부를 확인',
    investigationSteps: [
      '묘광 윤곽',
      '방향·규모',
      '매장부 확인',
      '바닥·시상',
      '유물 위치',
    ],
  },
  {
    value: 'fence',
    label: '목책열',
    identifierPrefix: '목책열',
    description: '주혈열, 진행 방향, 간격을 확인',
    investigationSteps: [
      '주혈 배열',
      '진행 방향',
      '간격·직경',
      '중심축',
      '관계 유구',
    ],
  },
  {
    value: 'production',
    label: '생산유구',
    identifierPrefix: '생산유구',
    featureInterpretationTypeValue: 'productionFeature',
    description: '공정, 원료, 부속시설을 확인',
    investigationSteps: [
      '공정 구분',
      '원료·폐기층',
      '부속시설',
      '시료 채취',
      '연결 유구',
    ],
  },
  {
    value: 'building',
    label: '건물지',
    identifierPrefix: '건물지',
    featureInterpretationTypeValue: 'surfaceBuilding',
    description: '주혈 배치와 건물 방향을 확인',
    investigationSteps: [
      '주혈 배치',
      '건물 방향',
      '칸 간격',
      '기초 흔적',
      '생활면 확인',
    ],
  },
];

export const KOREAN_FIELDWORK_FEATURE_TYPE_INTERPRETATION_VALUES =
  KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS
    .map((option) => option.featureInterpretationTypeValue)
    .filter((value): value is string => !!value);

export const getKoreanFieldworkFeatureTypeOption = (
  value: unknown
): KoreanFieldworkFeatureTypeOption | undefined =>
  typeof value === 'string'
    ? KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS.find((option) =>
      option.value === value)
    : undefined;

export const getKoreanFieldworkFeatureTypeLabel = (
  value: unknown
): string | undefined => getKoreanFieldworkFeatureTypeOption(value)?.label;

export const getKoreanFieldworkFeatureInvestigationSteps = (
  value: unknown
): readonly string[] =>
  getKoreanFieldworkFeatureTypeOption(value)?.investigationSteps
    ?? DEFAULT_KOREAN_FIELDWORK_FEATURE_INVESTIGATION_STEPS;

export const getKoreanFieldworkFeatureTypeLabelFromInterpretationType = (
  value: unknown
): string | undefined => {
  const values = Array.isArray(value) ? value : [value];
  const option = KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS.find((candidate) =>
    typeof candidate.featureInterpretationTypeValue === 'string'
    &&
    values.includes(candidate.featureInterpretationTypeValue)
  );

  return option?.label;
};

export const getKoreanFieldworkFeatureInterpretationTypeValue = (
  value: unknown
): string | undefined =>
  getKoreanFieldworkFeatureTypeOption(value)?.featureInterpretationTypeValue;
