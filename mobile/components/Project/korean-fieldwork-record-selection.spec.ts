import { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import { getKoreanFieldworkExpandedRecordIds } from './korean-fieldwork-record-selection';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('korean-fieldwork-record-selection', () => {
  it('keeps the parent feature expanded when a soil profile photo is selected', () => {
    const feature = createDoc('feature-1', C.FEATURE, 'Feature 1');
    const soilProfilePhoto = createDoc(
      'soil-profile-1',
      C.SOIL_PROFILE_PHOTO,
      'Soil profile photo 1',
      { depicts: ['feature-1'] }
    );
    const documentsById = new Map([
      [feature.resource.id, feature],
      [soilProfilePhoto.resource.id, soilProfilePhoto],
    ]);

    expect(Array.from(
      getKoreanFieldworkExpandedRecordIds(soilProfilePhoto, documentsById)
    ).sort()).toEqual(['feature-1', 'soil-profile-1']);
  });

  it('does not expand a parent scope when a primary feature is selected directly', () => {
    const operation = createDoc('operation-1', C.OPERATION, 'Operation 1');
    const feature = createDoc(
      'feature-1',
      C.FEATURE,
      'Feature 1',
      { liesWithin: ['operation-1'] }
    );
    const documentsById = new Map([
      [operation.resource.id, operation],
      [feature.resource.id, feature],
    ]);

    expect(Array.from(
      getKoreanFieldworkExpandedRecordIds(feature, documentsById)
    )).toEqual(['feature-1']);
  });

  it('keeps the feature chain open for nested pit and layer detail records', () => {
    const feature = createDoc('feature-1', C.FEATURE, 'Feature 1');
    const pit = createDoc(
      'pit-1',
      C.FEATURE_SEGMENT,
      'Pit 1',
      { liesWithin: ['feature-1'] }
    );
    const layer = createDoc(
      'layer-1',
      C.LAYER,
      'Layer 1',
      { liesWithin: ['pit-1'] }
    );
    const documentsById = new Map([
      [feature.resource.id, feature],
      [pit.resource.id, pit],
      [layer.resource.id, layer],
    ]);

    expect(Array.from(
      getKoreanFieldworkExpandedRecordIds(layer, documentsById)
    ).sort()).toEqual(['feature-1', 'layer-1', 'pit-1']);
  });
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  relations: Record<string, string[]> = {}
): Document => ({
  _id: id,
  created: { user: 'test', date: new Date('2026-07-03T00:00:00.000Z') },
  modified: [],
  resource: {
    id,
    identifier,
    category,
    relations,
  },
});
