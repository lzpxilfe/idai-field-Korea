import {
  getKoreanFieldworkEvidenceChips,
  getKoreanFieldworkRecordDisplayIdentifier,
} from './korean-fieldwork-record-evidence';
import { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Korean fieldwork record evidence', () => {
  it('summarizes field evidence attached to a feature record', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1');
    const pit = createDoc('pit-1', C.FEATURE_SEGMENT, '피트 1', {
      liesWithin: ['feature-1'],
    });
    const layer = createDoc('layer-1', C.LAYER, '토층 1', {
      liesWithin: ['feature-1'],
    });
    const photo = createDoc('photo-1', C.PHOTO, '사진 1', {
      depicts: ['feature-1'],
    });
    const soilProfilePhoto = createDoc(
      'soil-profile-1',
      C.SOIL_PROFILE_PHOTO,
      '토층사진 1',
      {
        depicts: ['feature-1'],
      }
    );
    const sketch = createDoc('sketch-1', C.PEN_MEMO, '약도 1', {
      depicts: ['feature-1'],
    });
    const findCollection = createDoc('find-collection-1', C.FIND_COLLECTION, '유물군 1', {
      liesWithin: ['feature-1'],
    });
    const sample = createDoc('sample-1', C.SAMPLE, '시료 1', {
      liesWithin: ['feature-1'],
    });
    const chips = getKoreanFieldworkEvidenceChips(feature, [
      feature,
      pit,
      layer,
      photo,
      soilProfilePhoto,
      sketch,
      findCollection,
      sample,
    ]);

    expect(chips.map((chip) => ({
      id: chip.id,
      label: chip.label,
      count: chip.count,
      tone: chip.tone,
      createCategoryName: chip.createCategoryName,
      documentIds: chip.documents.map((document) => document.resource.id),
    }))).toEqual([
      {
        id: 'featureSegments',
        label: '피트',
        count: 1,
        tone: 'filled',
        createCategoryName: C.FEATURE_SEGMENT,
        documentIds: ['pit-1'],
      },
      {
        id: 'layers',
        label: '토색 메모',
        count: 1,
        tone: 'filled',
        createCategoryName: undefined,
        documentIds: ['layer-1'],
      },
      {
        id: 'photos',
        label: '사진',
        count: 1,
        tone: 'filled',
        createCategoryName: C.PHOTO,
        documentIds: ['photo-1'],
      },
      {
        id: 'soilProfilePhotos',
        label: '토층사진',
        count: 1,
        tone: 'filled',
        createCategoryName: C.SOIL_PROFILE_PHOTO,
        documentIds: ['soil-profile-1'],
      },
      {
        id: 'drawings',
        label: '도면',
        count: 0,
        tone: 'empty',
        createCategoryName: C.DRAWING,
        documentIds: [],
      },
      {
        id: 'sketches',
        label: '약도·스케치',
        count: 1,
        tone: 'filled',
        createCategoryName: C.PEN_MEMO,
        documentIds: ['sketch-1'],
      },
      {
        id: 'finds',
        label: '유물',
        count: 1,
        tone: 'filled',
        createCategoryName: C.FIND,
        documentIds: ['find-collection-1'],
      },
      {
        id: 'samples',
        label: '시료',
        count: 1,
        tone: 'filled',
        createCategoryName: C.SAMPLE,
        documentIds: ['sample-1'],
      },
    ]);
  });

  it('keeps non-structural evidence records compact in the record list', () => {
    expect(getKoreanFieldworkEvidenceChips(
      createDoc('photo-1', C.PHOTO, '사진 1'),
      []
    )).toEqual([]);
  });

  it('counts each detailed find and sample point linked with isRecordedIn', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1');
    const find = createDoc('find-1', C.FIND, '수혈 1 유물 1', {
      isRecordedIn: ['feature-1'],
    }, {
      findSpotItems: JSON.stringify({
        items: [
          { number: 1, point: { x: 20, y: 30 } },
          { number: 2, point: { x: 60, y: 70 } },
        ],
        version: 1,
      }),
    });
    const sample = createDoc('sample-1', C.SAMPLE, '수혈 1 시료 1', {
      isRecordedIn: ['feature-1'],
    }, {
      findSpotItems: JSON.stringify({
        items: [
          { number: 1, point: { x: 15, y: 25 } },
          { number: 2, point: { x: 45, y: 55 } },
          { number: 3, point: { x: 75, y: 85 } },
        ],
        version: 1,
      }),
    });
    const chips = getKoreanFieldworkEvidenceChips(feature, [feature, find, sample]);

    expect(chips.find((chip) => chip.id === 'finds')?.count).toBe(2);
    expect(chips.find((chip) => chip.id === 'samples')?.count).toBe(3);
  });

  it('keeps direct tablet photos visible on find, find collection, and sample records', () => {
    const find = createDoc('find-1', C.FIND, '유물 1', {}, {
      fieldworkPhotoUri: 'file:///tablet/photos/find-1.jpg',
    });
    const findCollection = createDoc('find-collection-1', C.FIND_COLLECTION, '유물군 1', {}, {
      fieldworkPhotoUri: 'file:///tablet/photos/find-collection-1.jpg',
    });
    const sample = createDoc('sample-1', C.SAMPLE, '시료 1', {}, {
      fieldworkPhotoUri: 'file:///tablet/photos/sample-1.jpg',
    });

    expect(getKoreanFieldworkEvidenceChips(find, [find])[0]).toMatchObject({
      id: 'photos',
      label: '사진',
      count: 1,
      tone: 'filled',
      createCategoryName: C.PHOTO,
      documents: [find],
    });
    expect(getKoreanFieldworkEvidenceChips(findCollection, [findCollection])[0]).toMatchObject({
      id: 'photos',
      count: 1,
      documents: [findCollection],
    });
    expect(getKoreanFieldworkEvidenceChips(sample, [sample])[0]).toMatchObject({
      id: 'photos',
      count: 1,
      documents: [sample],
    });
  });

  it('replaces legacy machine names with feature-based evidence names', () => {
    const feature = createDoc('feature-1', C.FEATURE, '1호 수혈');
    const photo = createDoc('photo-1', C.PHOTO, 'photo-1700000000001', {
      depicts: ['feature-1'],
    });

    expect(getKoreanFieldworkRecordDisplayIdentifier(
      photo,
      [feature, photo]
    )).toBe('1호 수혈 사진 1');
  });

  it('keeps an existing feature-based evidence name', () => {
    const feature = createDoc('feature-1', C.FEATURE, '1호 수혈');
    const photo = createDoc('photo-1', C.PHOTO, '1호 수혈 북쪽 전경', {
      depicts: ['feature-1'],
    });

    expect(getKoreanFieldworkRecordDisplayIdentifier(
      photo,
      [feature, photo]
    )).toBe('1호 수혈 북쪽 전경');
  });
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  relations: Record<string, string[]> = {},
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  resource: {
    id,
    identifier,
    category,
    relations,
    ...extraResource,
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
