import {
  CategoryForm,
  NewResource,
} from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import { getKoreanFieldworkDraftPresets } from './korean-fieldwork-draft-presets';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork draft presets', () => {
  it('keeps feature status presets from claiming photo evidence', () => {
    const presets = getKoreanFieldworkDraftPresets(
      createCategoryForm([
        'featureRecordingStatus',
        'featureInvestigationChecklist',
      ]),
      createResource(C.FEATURE)
    );

    const candidatePreset = presets.find((preset) =>
      preset.id === 'feature-candidate'
    );

    expect(candidatePreset?.updates).toEqual({
      featureRecordingStatus: 'candidate',
    });
    expect(candidatePreset?.fieldNames).toEqual([
      'featureRecordingStatus',
    ]);
    expect(presets.every((preset) =>
      preset.updates.featureInvestigationChecklist === undefined
    )).toBe(true);
  });

  it('keeps feature presets away from operation records', () => {
    const presets = getKoreanFieldworkDraftPresets(
      createCategoryForm([
        'recordCreationTiming',
        'fieldRecordQuality',
      ]),
      createResource(C.OPERATION)
    );

    expect(presets.map((preset) => preset.id)).toEqual([
      'field-start',
      'needs-review',
    ]);
  });

  it('hides presets when no preset field exists on the category form', () => {
    expect(getKoreanFieldworkDraftPresets(
      createCategoryForm(['shortDescription']),
      createResource(C.TRENCH)
    )).toEqual([]);
  });
});

const createCategoryForm = (fieldNames: string[]): CategoryForm => ({
  groups: [
    {
      name: 'fieldwork',
      fields: fieldNames.map((name) => ({ name })),
    },
  ],
} as CategoryForm);

const createResource = (category: string): NewResource => ({
  identifier: `${category}-1`,
  category,
  relations: {},
});
