import { CategoryForm } from '../../src/model/configuration/category-form';
import { Resource } from '../../src/model/document/resource';
import {
    getKoreanFieldworkFeatureAttributeGroups,
    getKoreanFieldworkFeatureAttributeSummaries,
    getKoreanFieldworkFeatureAttributeUpdate,
    getKoreanFieldworkFeatureAttributeValueLabel,
    getKoreanFieldworkFeatureObservationPlaceholder
} from '../../src/tools/korean-fieldwork-feature-attributes';
import { KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS } from '../../src/tools/korean-fieldwork-feature-types';


describe('Korean fieldwork feature attributes', () => {

    it('keeps every concrete tablet feature type connected to shared attribute groups', () => {

        const category = createCategoryForm([
            'firstExposureRecord',
            'foundationTraceRecord',
            'pitDwellingExposureBaulk',
            'pitDwellingFireEvidence',
            'pitDwellingFloorFacility',
            'pitFeatureFunctionAssessment',
            'postholeGroupSurvey',
            'potteryKilnIdentification',
            'potteryKilnPartInvestigation',
            'potteryKilnStructureContext',
            'productionProcessSystem',
            'productionSiteAssociatedFacility',
            'surfaceBuildingJudgement',
            'tombBurialStructureInvestigation',
            'tombInteriorRecoveryRecord',
            'tombPassageClosureSequence'
        ]);

        const concreteFeatureTypes = KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS
            .filter(option => option.value !== 'unknown');

        for (const option of concreteFeatureTypes) {
            const groups = getKoreanFieldworkFeatureAttributeGroups(
                category,
                createResource({ featureType: option.value })
            );

            expect(groups.length).toBeGreaterThan(0);
        }
    });


    it('uses configured Korean valuelist labels for shared tablet attribute groups', () => {

        const groups = getKoreanFieldworkFeatureAttributeGroups(
            createCategoryForm([
                'potteryKilnPartInvestigation',
                'potteryKilnStructureContext'
            ]),
            createResource({ featureType: 'kiln' })
        );

        expect(groups.map(group => group.title)).toEqual(['가마 부위', '구조·소열']);
        expect(groups[0].options.slice(0, 4).map(option => option.label)).toEqual([
            '화구 기록',
            '연소부 기록',
            '소성부 기록',
            '연도부 기록'
        ]);
        expect(getKoreanFieldworkFeatureAttributeValueLabel('combustionPartRecorded'))
            .toBe('연소부 기록');
        expect(getKoreanFieldworkFeatureAttributeValueLabel('unknownValue'))
            .toBe('unknownValue');
    });


    it('builds HWP-ready summaries from tablet feature-specific attributes', () => {

        expect(getKoreanFieldworkFeatureAttributeSummaries(createResource({
            featureType: 'kiln',
            potteryKilnPartInvestigation: ['combustionPartRecorded', 'firingPartRecorded'],
            potteryKilnStructureContext: ['planShapeRecorded']
        }))).toEqual([
            '가마 부위: 연소부 기록 · 소성부 기록',
            '구조·소열: 평면형 기록'
        ]);
    });


    it('keeps imported tablet attributes visible even when the feature type is missing', () => {

        expect(getKoreanFieldworkFeatureAttributeSummaries(createResource({
            foundationTraceRecord: ['postholeIndependentFoundationCheck']
        }))).toEqual([
            '기초 흔적: 굴립주·독립기초 구분'
        ]);
    });


    it('keeps feature observation placeholders tied to sketches, measurements, and media numbers', () => {

        expect(getKoreanFieldworkFeatureObservationPlaceholder(
            createCategoryForm([
                'potteryKilnPartInvestigation',
                'potteryKilnStructureContext'
            ]),
            createResource({ featureType: 'kiln' })
        )).toContain('현장 근거: 평면·단면 스케치 번호, 실측값, 사진·도면 번호');

        expect(getKoreanFieldworkFeatureObservationPlaceholder(
            createCategoryForm([]),
            createResource()
        )).toContain('평면/단면 스케치 번호');
    });


    it('toggles tablet attribute values without depending on mobile-only helpers', () => {

        const resource = createResource({
            featureType: 'pit',
            firstExposureRecord: ['firstExposurePhoto']
        });

        expect(getKoreanFieldworkFeatureAttributeUpdate(
            resource,
            'firstExposureRecord',
            'featureLineVisible'
        )).toEqual({
            firstExposureRecord: ['firstExposurePhoto', 'featureLineVisible']
        });
        expect(getKoreanFieldworkFeatureAttributeUpdate(
            resource,
            'firstExposureRecord',
            'firstExposurePhoto'
        )).toEqual({
            firstExposureRecord: []
        });
    });
});


const createCategoryForm = (fieldNames: string[]): CategoryForm => ({
    groups: [{
        name: 'fieldwork',
        fields: fieldNames.map(name => ({ name }))
    }]
} as CategoryForm);


const createResource = (
        extraResource: Record<string, unknown> = {}
): Resource => ({
    id: 'resource-1',
    identifier: '유구 1',
    category: 'Feature',
    relations: {},
    ...extraResource
} as unknown as Resource);
