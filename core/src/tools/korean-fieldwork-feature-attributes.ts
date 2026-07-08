import { CategoryForm } from '../model/configuration/category-form';
import { NewResource } from '../model/document/resource';
import { getKoreanFieldworkFeatureTypeOption } from './korean-fieldwork-feature-types';
import { getKoreanFieldworkRecordValueLabel } from './korean-fieldwork-record-contract';


export interface KoreanFieldworkFeatureAttributeOption {
    label: string;
    value: string;
}

export interface KoreanFieldworkFeatureAttributeGroup {
    fieldName: string;
    title: string;
    options: readonly KoreanFieldworkFeatureAttributeOption[];
}

interface KoreanFieldworkFeatureAttributeGroupDefinition {
    fieldName: string;
    title: string;
    valueIds: readonly string[];
}

const DEFAULT_FEATURE_OBSERVATION_PLACEHOLDER =
    '유구 성격이 미정이면 미정으로 두고, 평면/단면 스케치 번호, 장·단축·깊이, 충전토·중복 관계, 사진·도면 번호';
const FEATURE_OBSERVATION_GROUP_LIMIT = 3;
const FEATURE_OBSERVATION_OPTION_LIMIT = 4;

const FEATURE_ATTRIBUTE_GROUP_DEFINITIONS_BY_TYPE:
        Readonly<Record<string, readonly KoreanFieldworkFeatureAttributeGroupDefinition[]>> = {
    burial: [
        {
            fieldName: 'tombBurialStructureInvestigation',
            title: '매장 구조',
            valueIds: [
                'gravePitShoulderLine',
                'coffinChamberRoomSeparated',
                'floorAndBeddingRecorded',
                'entrancePassageRecorded',
                'robberyDisturbanceSeparated'
            ]
        },
        {
            fieldName: 'tombInteriorRecoveryRecord',
            title: '내부 수습',
            valueIds: [
                'nearFloorFineInvestigation',
                'smallFindLossCaution',
                'organicDiscoloration',
                'uniqueRecoveryNumber',
                'bulkRecovery'
            ]
        },
        {
            fieldName: 'tombPassageClosureSequence',
            title: '폐쇄·연도',
            valueIds: [
                'corridorFrontClosure',
                'corridorInteriorClosure',
                'closureStoneBeforeRemoval',
                'closureSoilRecorded',
                'reopenedOrRepaired'
            ]
        }
    ],
    building: [
        {
            fieldName: 'surfaceBuildingJudgement',
            title: '건물 판단',
            valueIds: [
                'groundLevelBuildingCandidate',
                'raisedFloorBuildingCandidate',
                'regularPostholeArrangement',
                'postholeSizeDirectionRecorded',
                'livingSurfaceConfirmed'
            ]
        },
        {
            fieldName: 'foundationTraceRecord',
            title: '기초 흔적',
            valueIds: [
                'pillarSeatTrace',
                'packingStone',
                'reinforcementSoil',
                'foundationStone',
                'noTraceConfirmed'
            ]
        }
    ],
    dwelling: [
        {
            fieldName: 'pitDwellingExposureBaulk',
            title: '노출·둑',
            valueIds: [
                'initialStratigraphyChecked',
                'shoulderLineRecorded',
                'baulkPlanSet',
                'sectionPhotoImmediate',
                'plasticCoverOrShade'
            ]
        },
        {
            fieldName: 'pitDwellingFloorFacility',
            title: '바닥·시설',
            valueIds: [
                'floorSurfaceIdentified',
                'wallFloorJunctionFollowed',
                'postholesChecked',
                'hearthChecked',
                'wallGrooveChecked',
                'entranceChecked'
            ]
        },
        {
            fieldName: 'pitDwellingFireEvidence',
            title: '소열 흔적',
            valueIds: [
                'charredTimberRecorded',
                'burntSoilRecorded',
                'ashLayerRecorded',
                'heatAlteredFloor',
                'timberDirectionMapped',
                'fireTypeNotAssumed'
            ]
        }
    ],
    kiln: [
        {
            fieldName: 'potteryKilnIdentification',
            title: '가마 판정',
            valueIds: [
                'firingFeature',
                'structuralKilnCandidate',
                'fireboxPresent',
                'firingCombustionSeparated',
                'typeNameDeferred'
            ]
        },
        {
            fieldName: 'potteryKilnPartInvestigation',
            title: '가마 부위',
            valueIds: [
                'fireboxRecorded',
                'combustionPartRecorded',
                'firingPartRecorded',
                'fluePartRecorded',
                'ashDumpRecorded',
                'floorStepChecked',
                'wallFloorSectionCut',
                'stratigraphicCollection'
            ]
        },
        {
            fieldName: 'potteryKilnStructureContext',
            title: '구조·소열',
            valueIds: [
                'planShapeRecorded',
                'scaleRecorded',
                'firingCombustionRatio',
                'flameFlowRecorded',
                'oxidationReductionBoundary',
                'wallCollapseFragment',
                'ceilingFragment',
                'originalGroundCutDepth'
            ]
        }
    ],
    ditch: [
        {
            fieldName: 'firstExposureRecord',
            title: '윤곽·단면',
            valueIds: [
                'firstExposurePhoto',
                'featureLineVisible',
                'shoulderLineRecorded',
                'sectionCrossCheck',
                'confirmedBeforeInternalExcavation'
            ]
        }
    ],
    pit: [
        {
            fieldName: 'firstExposureRecord',
            title: '최초 노출',
            valueIds: [
                'firstExposurePhoto',
                'featureLineVisible',
                'shoulderLineRecorded',
                'sectionCrossCheck',
                'confirmedBeforeInternalExcavation'
            ]
        },
        {
            fieldName: 'pitFeatureFunctionAssessment',
            title: '기능 후보',
            valueIds: [
                'storageCandidate',
                'dumpCandidate',
                'clayExtractionPitCandidate',
                'hearthEvidence',
                'functionNotAssumed'
            ]
        }
    ],
    posthole: [
        {
            fieldName: 'postholeGroupSurvey',
            title: '주혈 배열',
            valueIds: [
                'postholeArrayMapped',
                'bayUnitRecorded',
                'diameterDepthRecorded',
                'fillAndTampingRecorded',
                'centralAxisChecked',
                'baySpacingChecked'
            ]
        },
        {
            fieldName: 'foundationTraceRecord',
            title: '기둥 흔적',
            valueIds: [
                'pillarSeatTrace',
                'packingStone',
                'reinforcementSoil',
                'postholeIndependentFoundationCheck',
                'noTraceConfirmed'
            ]
        }
    ],
    fence: [
        {
            fieldName: 'postholeGroupSurvey',
            title: '목책열 조사',
            valueIds: [
                'postholeArrayMapped',
                'bayUnitRecorded',
                'diameterDepthRecorded',
                'fillAndTampingRecorded',
                'centralAxisChecked',
                'baySpacingChecked'
            ]
        }
    ],
    production: [
        {
            fieldName: 'productionProcessSystem',
            title: '공정 체계',
            valueIds: [
                'rawMaterialProcurement',
                'rawMaterialProcessing',
                'forming',
                'drying',
                'firing',
                'discard',
                'localRepertoireCompared'
            ]
        },
        {
            fieldName: 'productionSiteAssociatedFacility',
            title: '부속시설',
            valueIds: [
                'clayPit',
                'workshop',
                'dryingArea',
                'wasteDeposit'
            ]
        }
    ]
};

export const KOREAN_FIELDWORK_FEATURE_ATTRIBUTE_FIELD_NAMES: readonly string[] =
    Array.from(new Set(
        Object.values(FEATURE_ATTRIBUTE_GROUP_DEFINITIONS_BY_TYPE)
            .flatMap(groups => groups.map(group => group.fieldName))
    ));


export function getKoreanFieldworkFeatureAttributeGroups(
        category: CategoryForm|undefined,
        resource: NewResource
): readonly KoreanFieldworkFeatureAttributeGroup[] {

    const featureType = getKoreanFieldworkFeatureTypeOption(resource.featureType)?.value;
    if (!featureType) return [];

    const fieldNames = getCategoryFieldNames(category);

    return getKoreanFieldworkFeatureAttributeGroupDefinitions(featureType)
        .filter(group => fieldNames.has(group.fieldName))
        .map(toAttributeGroup);
}


export function getKoreanFieldworkFeatureAttributeValues(
        resource: NewResource,
        fieldName: string
): string[] {

    return getStringArrayFieldValues(resource[fieldName]);
}


export function getKoreanFieldworkFeatureAttributeUpdate(
        resource: NewResource,
        fieldName: string,
        value: string
): Record<string, unknown> {

    return {
        [fieldName]: toggleStringArrayFieldValue(resource[fieldName], value)
    };
}


export function getKoreanFieldworkFeatureObservationPlaceholder(
        category: CategoryForm|undefined,
        resource: NewResource
): string {

    const featureTypeLabel = getKoreanFieldworkFeatureTypeOption(resource.featureType)?.label;
    const groups = getKoreanFieldworkFeatureAttributeGroups(category, resource);
    if (!featureTypeLabel || groups.length === 0) return DEFAULT_FEATURE_OBSERVATION_PLACEHOLDER;

    const groupSummaries = groups
        .slice(0, FEATURE_OBSERVATION_GROUP_LIMIT)
        .map(group => {
            const optionLabels = group.options
                .slice(0, FEATURE_OBSERVATION_OPTION_LIMIT)
                .map(option => option.label)
                .join(', ');

            return `${group.title}: ${optionLabels}`;
        })
        .join(' / ');

    return `${featureTypeLabel} 관찰- ${groupSummaries} / 현장 근거: 평면·단면 스케치 번호, 실측값, 사진·도면 번호, 성격 미정/추정 사유`;
}


export function getKoreanFieldworkFeatureAttributeSummaries(
        resource: NewResource
): string[] {

    const definitions = getKoreanFieldworkActiveFeatureAttributeGroupDefinitions(resource);

    return definitions.flatMap(definition => {
        const values = getKoreanFieldworkFeatureAttributeValues(resource, definition.fieldName)
            .filter(value => definition.valueIds.includes(value));
        if (values.length === 0) return [];

        const labels = values.map(value =>
            getKoreanFieldworkRecordValueLabel(definition.fieldName, value)
        );

        return [`${definition.title}: ${labels.join(' · ')}`];
    });
}


export function getKoreanFieldworkFeatureAttributeValueLabel(valueId: string): string {

    const definition = getAllKoreanFieldworkFeatureAttributeGroupDefinitions()
        .find(group => group.valueIds.includes(valueId));

    return definition
        ? getKoreanFieldworkRecordValueLabel(definition.fieldName, valueId)
        : valueId;
}


function getKoreanFieldworkActiveFeatureAttributeGroupDefinitions(
        resource: NewResource
): readonly KoreanFieldworkFeatureAttributeGroupDefinition[] {

    const featureType = getKoreanFieldworkFeatureTypeOption(resource.featureType)?.value;
    const definitions = featureType
        ? getKoreanFieldworkFeatureAttributeGroupDefinitions(featureType)
        : [];

    if (definitions.length > 0) return definitions;

    return getKoreanFieldworkFallbackFeatureAttributeGroupDefinitions(resource);
}


function getKoreanFieldworkFeatureAttributeGroupDefinitions(
        featureType: string
): readonly KoreanFieldworkFeatureAttributeGroupDefinition[] {

    return FEATURE_ATTRIBUTE_GROUP_DEFINITIONS_BY_TYPE[featureType] ?? [];
}


function getAllKoreanFieldworkFeatureAttributeGroupDefinitions():
        readonly KoreanFieldworkFeatureAttributeGroupDefinition[] {

    return Object.values(FEATURE_ATTRIBUTE_GROUP_DEFINITIONS_BY_TYPE).flat();
}


function getKoreanFieldworkFallbackFeatureAttributeGroupDefinitions(
        resource: NewResource
): readonly KoreanFieldworkFeatureAttributeGroupDefinition[] {

    const definitionsByFieldName = new Map<string, KoreanFieldworkFeatureAttributeGroupDefinition>();

    getAllKoreanFieldworkFeatureAttributeGroupDefinitions()
        .filter(definition =>
            getKoreanFieldworkFeatureAttributeValues(resource, definition.fieldName).length > 0
        )
        .forEach(definition => {
            const currentDefinition = definitionsByFieldName.get(definition.fieldName);

            definitionsByFieldName.set(definition.fieldName, {
                fieldName: definition.fieldName,
                title: currentDefinition?.title ?? definition.title,
                valueIds: getUniqueStrings([
                    ...(currentDefinition?.valueIds ?? []),
                    ...definition.valueIds
                ])
            });
        });

    return Array.from(definitionsByFieldName.values());
}


function toAttributeGroup(
        definition: KoreanFieldworkFeatureAttributeGroupDefinition
): KoreanFieldworkFeatureAttributeGroup {

    return {
        fieldName: definition.fieldName,
        title: definition.title,
        options: definition.valueIds.map(value => ({
            value,
            label: getKoreanFieldworkRecordValueLabel(definition.fieldName, value)
        }))
    };
}


function getCategoryFieldNames(category: CategoryForm|undefined): Set<string> {

    return new Set(
        category?.groups.flatMap(group =>
            group.fields.map(field => field.name)
        ) ?? []
    );
}


function getStringArrayFieldValues(value: unknown): string[] {

    if (value === undefined || value === null) return [];

    if (Array.isArray(value)) {
        return value
            .filter(item => typeof item === 'string')
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }

    if (typeof value !== 'string') return [];

    const trimmedValue = value.trim();
    if (!trimmedValue) return [];

    try {
        const parsedValue = JSON.parse(trimmedValue);
        return getStringArrayFieldValues(parsedValue);
    } catch {
        return [trimmedValue];
    }
}


function getUniqueStrings(values: readonly string[]): string[] {

    return values.filter((value, index) => values.indexOf(value) === index);
}


function toggleStringArrayFieldValue(value: unknown, selectedValue: string): string[] {

    const values = getStringArrayFieldValues(value);

    return values.includes(selectedValue)
        ? values.filter(value => value !== selectedValue)
        : [...values, selectedValue];
}
