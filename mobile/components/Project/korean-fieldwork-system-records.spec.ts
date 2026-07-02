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

  it('keeps project setup records out of field record counts', () => {
    const project = createDoc('project', 'Project');
    const boundarySetupOperation = createDoc('boundary-setup', 'Operation', {}, {
      projectBoundarySetupState: 'draftBoundary',
      projectBoundarySummary: '지도에서 그린 조사경계 7점',
    });
    const boundary = createDoc('boundary-1', 'SurveyBoundary', {
      isRecordedIn: ['boundary-setup'],
    });
    const feature = createDoc('feature-1', 'Feature');

    expect(getKoreanFieldworkUserVisibleDocuments([
      project,
      boundarySetupOperation,
      boundary,
      feature,
    ]).map((document) => document.resource.id)).toEqual([
      'feature-1',
    ]);
  });
});

const createDoc = (
  id: string,
  category: string,
  relations: Record<string, string[]> = {},
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  resource: {
    id,
    identifier: id,
    category,
    relations,
    ...extraResource,
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
