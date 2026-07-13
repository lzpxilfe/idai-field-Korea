import { CategoryForm } from '../../src/model/configuration/category-form';
import { Measurement } from '../../src/model/input-types/measurement';
import { Resource } from '../../src/model/document/resource';
import {
    getKoreanFieldworkFeatureMeasurement,
    getKoreanFieldworkFeatureMeasurementGroups,
    getKoreanFieldworkFeatureMeasurementUpdate,
    KoreanFieldworkFeatureMeasurementDefinition
} from '../../src/tools/korean-fieldwork-feature-measurements';
import { KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS } from '../../src/tools/korean-fieldwork-feature-types';


describe('Korean fieldwork feature measurements', () => {

    const category = createCategoryForm([
        'dimensionLength',
        'dimensionWidth',
        'dimensionVerticalExtent'
    ]);


    it('gives every concrete tablet feature type its own measurement fields', () => {

        const concreteFeatureTypes = KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS
            .filter(option => option.value !== 'unknown');

        for (const option of concreteFeatureTypes) {
            const groups = getKoreanFieldworkFeatureMeasurementGroups(
                category,
                createResource({ featureType: option.value })
            );

            expect(groups.length).toBeGreaterThan(0);
            expect(groups.flatMap(group => group.measurements).length).toBeGreaterThan(1);
        }
    });


    it('separates grave pit and burial body dimensions', () => {

        const groups = getKoreanFieldworkFeatureMeasurementGroups(
            category,
            createResource({ featureType: 'burial' })
        );

        expect(groups.map(group => group.title)).toEqual(['묘광 제원', '매장부 제원']);
        expect(groups[0].measurements.map(definition => definition.label)).toEqual([
            '묘광 장축',
            '묘광 단축',
            '묘광 잔존깊이'
        ]);
    });


    it('keeps kiln parts separate from the overall kiln dimensions', () => {

        const groups = getKoreanFieldworkFeatureMeasurementGroups(
            category,
            createResource({ featureType: 'kiln' })
        );

        expect(groups.map(group => group.title)).toEqual([
            '가마 전체',
            '화구·연소부',
            '소성부·연도부',
            '회구부'
        ]);
        expect(groups.flatMap(group => group.measurements).map(definition => definition.label))
            .toContain('연도부 폭·직경');
    });


    it('normalizes one semantic measurement without replacing other dimensions', () => {

        const existingMeasurement: Measurement = {
            inputUnit: 'cm',
            inputValue: 99,
            isImprecise: false,
            measurementComment: '기존 상세 제원',
            value: 990000
        };
        const resource = createResource({
            featureType: 'kiln',
            dimensionLength: [existingMeasurement]
        });
        const definition = getDefinition(category, resource, 'kilnCombustionLength');
        const update = getKoreanFieldworkFeatureMeasurementUpdate(
            resource,
            definition,
            245.5,
            'cm'
        );
        const values = update.dimensionLength as Measurement[];

        expect(values.length).toBe(2);
        expect(values[0]).toEqual(existingMeasurement);
        expect(values[1]).toEqual({
            inputUnit: 'cm',
            inputValue: 245.5,
            isImprecise: false,
            measurementComment: '가마 연소부 길이',
            value: 2455000
        });
        expect(getKoreanFieldworkFeatureMeasurement(
            { ...resource, ...update },
            definition
        )?.inputValue).toBe(245.5);
    });


    it('updates units and removes only the selected semantic measurement', () => {

        const resource = createResource({ featureType: 'pit' });
        const definition = getDefinition(category, resource, 'pitLongAxis');
        const firstUpdate = getKoreanFieldworkFeatureMeasurementUpdate(
            resource,
            definition,
            2.8,
            'm'
        );
        const updatedResource = { ...resource, ...firstUpdate };
        const cleared = getKoreanFieldworkFeatureMeasurementUpdate(
            updatedResource,
            definition,
            undefined,
            'm'
        );

        const measurement = (firstUpdate.dimensionLength as Measurement[])[0];
        expect(measurement.inputUnit).toBe('m');
        expect(measurement.inputValue).toBe(2.8);
        expect(measurement.value).toBe(2800000);
        expect(cleared).toEqual({ dimensionLength: [] });
    });
});


function getDefinition(
        category: CategoryForm,
        resource: Resource,
        id: string
): KoreanFieldworkFeatureMeasurementDefinition {

    const definition = getKoreanFieldworkFeatureMeasurementGroups(category, resource)
        .flatMap(group => group.measurements)
        .find(candidate => candidate.id === id);

    if (!definition) throw new Error(`Missing measurement definition: ${id}`);

    return definition;
}


function createCategoryForm(fieldNames: string[]): CategoryForm {

    return {
        groups: [{
            name: 'fieldwork',
            fields: fieldNames.map(name => ({ name }))
        }]
    } as CategoryForm;
}


function createResource(
        extraResource: Record<string, unknown> = {}
): Resource {

    return {
        id: 'feature-1',
        identifier: '유구 1',
        category: 'Feature',
        relations: {},
        ...extraResource
    } as unknown as Resource;
}
