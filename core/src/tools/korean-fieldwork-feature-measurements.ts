import { CategoryForm } from '../model/configuration/category-form';
import { Measurement } from '../model/input-types/measurement';
import { NewResource } from '../model/document/resource';
import { getKoreanFieldworkFeatureTypeOption } from './korean-fieldwork-feature-types';


export type KoreanFieldworkFeatureMeasurementFieldName =
    'dimensionLength'
    |'dimensionVerticalExtent'
    |'dimensionWidth';

export interface KoreanFieldworkFeatureMeasurementDefinition {
    defaultUnit: 'cm'|'m';
    fieldName: KoreanFieldworkFeatureMeasurementFieldName;
    id: string;
    label: string;
    measurementComment: string;
}

export interface KoreanFieldworkFeatureMeasurementGroup {
    id: string;
    measurements: readonly KoreanFieldworkFeatureMeasurementDefinition[];
    title: string;
}

const measurement = (
        id: string,
        label: string,
        fieldName: KoreanFieldworkFeatureMeasurementFieldName,
        measurementComment: string,
        defaultUnit: 'cm'|'m' = 'cm'
): KoreanFieldworkFeatureMeasurementDefinition => ({
    defaultUnit,
    fieldName,
    id,
    label,
    measurementComment
});

const group = (
        id: string,
        title: string,
        measurements: readonly KoreanFieldworkFeatureMeasurementDefinition[]
): KoreanFieldworkFeatureMeasurementGroup => ({ id, measurements, title });

const FEATURE_MEASUREMENT_GROUPS_BY_TYPE:
        Readonly<Record<string, readonly KoreanFieldworkFeatureMeasurementGroup[]>> = {
    pit: [
        group('pitOverall', '수혈 제원', [
            measurement('pitLongAxis', '장축', 'dimensionLength', '수혈 장축'),
            measurement('pitShortAxis', '단축', 'dimensionWidth', '수혈 단축'),
            measurement('pitRemainingDepth', '잔존깊이', 'dimensionVerticalExtent', '수혈 잔존깊이')
        ])
    ],
    posthole: [
        group('postholeOverall', '주혈 제원', [
            measurement('postholeOpeningDiameter', '구경', 'dimensionWidth', '주혈 구경'),
            measurement('postholeBottomDiameter', '저경', 'dimensionWidth', '주혈 저경'),
            measurement('postholeDepth', '깊이', 'dimensionVerticalExtent', '주혈 깊이')
        ])
    ],
    ditch: [
        group('ditchOverall', '구상유구 제원', [
            measurement('ditchExposedLength', '확인길이', 'dimensionLength', '구상유구 확인길이'),
            measurement('ditchTopWidth', '상부폭', 'dimensionWidth', '구상유구 상부폭'),
            measurement('ditchBottomWidth', '하부폭', 'dimensionWidth', '구상유구 하부폭'),
            measurement('ditchDepth', '깊이', 'dimensionVerticalExtent', '구상유구 깊이')
        ])
    ],
    kiln: [
        group('kilnOverall', '가마 전체', [
            measurement('kilnOverallLength', '전체 길이', 'dimensionLength', '가마 전체 길이'),
            measurement('kilnOverallWidth', '최대폭', 'dimensionWidth', '가마 최대폭'),
            measurement('kilnRemainingDepth', '잔존깊이', 'dimensionVerticalExtent', '가마 잔존깊이')
        ]),
        group('kilnFireboxCombustion', '화구·연소부', [
            measurement('kilnFireboxWidth', '화구 폭', 'dimensionWidth', '가마 화구 폭'),
            measurement('kilnCombustionLength', '연소부 길이', 'dimensionLength', '가마 연소부 길이'),
            measurement('kilnCombustionWidth', '연소부 폭', 'dimensionWidth', '가마 연소부 폭'),
            measurement('kilnCombustionDepth', '연소부 깊이', 'dimensionVerticalExtent', '가마 연소부 깊이')
        ]),
        group('kilnFiringFlue', '소성부·연도부', [
            measurement('kilnFiringLength', '소성부 길이', 'dimensionLength', '가마 소성부 길이'),
            measurement('kilnFiringWidth', '소성부 폭', 'dimensionWidth', '가마 소성부 폭'),
            measurement('kilnFlueLength', '연도부 길이', 'dimensionLength', '가마 연도부 길이'),
            measurement('kilnFlueWidth', '연도부 폭·직경', 'dimensionWidth', '가마 연도부 폭·직경')
        ]),
        group('kilnAshDump', '회구부', [
            measurement('kilnAshDumpLength', '회구부 길이', 'dimensionLength', '가마 회구부 길이'),
            measurement('kilnAshDumpWidth', '회구부 폭', 'dimensionWidth', '가마 회구부 폭'),
            measurement('kilnAshDumpDepth', '회구부 깊이', 'dimensionVerticalExtent', '가마 회구부 깊이')
        ])
    ],
    dwelling: [
        group('dwellingOverall', '주거지 제원', [
            measurement('dwellingLongAxis', '장축', 'dimensionLength', '주거지 장축'),
            measurement('dwellingShortAxis', '단축', 'dimensionWidth', '주거지 단축'),
            measurement('dwellingRemainingDepth', '잔존깊이', 'dimensionVerticalExtent', '주거지 잔존깊이')
        ])
    ],
    burial: [
        group('burialGravePit', '묘광 제원', [
            measurement('burialGravePitLongAxis', '묘광 장축', 'dimensionLength', '토광묘 묘광 장축'),
            measurement('burialGravePitShortAxis', '묘광 단축', 'dimensionWidth', '토광묘 묘광 단축'),
            measurement('burialGravePitDepth', '묘광 잔존깊이', 'dimensionVerticalExtent', '토광묘 묘광 잔존깊이')
        ]),
        group('burialBody', '매장부 제원', [
            measurement('burialBodyLongAxis', '매장부 장축', 'dimensionLength', '토광묘 매장부 장축'),
            measurement('burialBodyShortAxis', '매장부 단축', 'dimensionWidth', '토광묘 매장부 단축'),
            measurement('burialBodyHeight', '매장부 잔존높이', 'dimensionVerticalExtent', '토광묘 매장부 잔존높이')
        ])
    ],
    fence: [
        group('fenceOverall', '목책열 제원', [
            measurement('fenceExposedLength', '확인길이', 'dimensionLength', '목책열 확인길이'),
            measurement('fencePostSpacing', '주혈 간격', 'dimensionLength', '목책열 주혈 간격'),
            measurement('fencePostDiameter', '주혈 구경', 'dimensionWidth', '목책열 주혈 구경'),
            measurement('fencePostDepth', '주혈 깊이', 'dimensionVerticalExtent', '목책열 주혈 깊이')
        ])
    ],
    production: [
        group('productionOverall', '생산유구 제원', [
            measurement('productionOverallLength', '전체 길이', 'dimensionLength', '생산유구 전체 길이'),
            measurement('productionOverallWidth', '최대폭', 'dimensionWidth', '생산유구 최대폭'),
            measurement('productionRemainingDepth', '잔존깊이', 'dimensionVerticalExtent', '생산유구 잔존깊이')
        ])
    ],
    building: [
        group('buildingOverall', '건물 규모', [
            measurement('buildingLongAxis', '장축', 'dimensionLength', '건물지 장축'),
            measurement('buildingShortAxis', '단축', 'dimensionWidth', '건물지 단축')
        ]),
        group('buildingBay', '칸 구성', [
            measurement('buildingFrontBaySpacing', '주칸 거리', 'dimensionLength', '건물지 주칸 거리'),
            measurement('buildingSideBaySpacing', '측면칸 거리', 'dimensionWidth', '건물지 측면칸 거리')
        ])
    ]
};


export function getKoreanFieldworkFeatureMeasurementGroups(
        category: CategoryForm|undefined,
        resource: NewResource
): readonly KoreanFieldworkFeatureMeasurementGroup[] {

    const featureType = getKoreanFieldworkFeatureTypeOption(resource.featureType)?.value;
    if (!featureType || featureType === 'unknown') return [];

    const fieldNames = getCategoryFieldNames(category);

    return (FEATURE_MEASUREMENT_GROUPS_BY_TYPE[featureType] ?? [])
        .map(measurementGroup => ({
            ...measurementGroup,
            measurements: measurementGroup.measurements.filter(definition =>
                fieldNames.has(definition.fieldName)
            )
        }))
        .filter(measurementGroup => measurementGroup.measurements.length > 0);
}


export function getKoreanFieldworkFeatureMeasurement(
        resource: NewResource,
        definition: KoreanFieldworkFeatureMeasurementDefinition
): Measurement|undefined {

    const values = resource[definition.fieldName];
    if (!Array.isArray(values)) return undefined;

    return values.find(value =>
        Measurement.isMeasurement(value)
        && value.measurementComment === definition.measurementComment
    ) as Measurement|undefined;
}


export function getKoreanFieldworkFeatureMeasurementUpdate(
        resource: NewResource,
        definition: KoreanFieldworkFeatureMeasurementDefinition,
        inputValue: number|undefined,
        inputUnit: 'cm'|'m'
): Record<string, unknown> {

    const currentValues = Array.isArray(resource[definition.fieldName])
        ? [...resource[definition.fieldName] as unknown[]]
        : [];
    const existingIndex = currentValues.findIndex(value =>
        Measurement.isMeasurement(value)
        && value.measurementComment === definition.measurementComment
    );

    if (inputValue === undefined || !Number.isFinite(inputValue) || inputValue <= 0) {
        return {
            [definition.fieldName]: existingIndex === -1
                ? currentValues
                : currentValues.filter((_value, index) => index !== existingIndex)
        };
    }

    const existingMeasurement = existingIndex === -1
        ? undefined
        : currentValues[existingIndex] as Measurement;
    const nextMeasurement: Measurement = {
        ...(existingMeasurement ?? {}),
        inputUnit,
        inputValue,
        isImprecise: existingMeasurement?.isImprecise ?? false,
        measurementComment: definition.measurementComment
    };
    delete nextMeasurement.inputRangeEndValue;
    delete nextMeasurement.rangeMin;
    delete nextMeasurement.rangeMax;
    Measurement.addNormalizedValues(nextMeasurement);

    if (existingIndex === -1) currentValues.push(nextMeasurement);
    else currentValues[existingIndex] = nextMeasurement;

    return { [definition.fieldName]: currentValues };
}


function getCategoryFieldNames(category: CategoryForm|undefined): Set<string> {

    return new Set(
        category?.groups.flatMap(categoryGroup =>
            categoryGroup.fields.map(field => field.name)
        ) ?? []
    );
}
