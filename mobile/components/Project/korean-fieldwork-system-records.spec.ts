import { Document } from 'idai-field-core';
import { getKoreanFieldworkUserVisibleDocuments } from './korean-fieldwork-system-records';

describe('korean-fieldwork-system-records', () => {
  it('hides legacy feature groups while keeping their feature records visible', () => {
    const operation = createDoc('operation-1', 'Operation');
    const featureGroup = createDoc('feature-group-1', 'FeatureGroup', {
      liesWithin: ['operation-1'],
    });
    const feature = createDoc('feature-1', 'Feature', {
      liesWithin: ['feature-group-1'],
    });

    expect(getKoreanFieldworkUserVisibleDocuments([
      operation,
      featureGroup,
      feature,
    ]).map((document) => document.resource.id)).toEqual([
      'operation-1',
      'feature-1',
    ]);
  });
});

const createDoc = (
  id: string,
  category: string,
  relations: Record<string, string[]> = {}
): Document => ({
  _id: id,
  resource: {
    id,
    identifier: id,
    category,
    relations,
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
