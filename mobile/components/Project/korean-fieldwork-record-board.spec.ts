import { Document } from 'idai-field-core';
import { KOREAN_FIELDWORK_CATEGORIES as C } from './korean-fieldwork-categories';
import { getKoreanFieldworkRecordBoardDocuments } from './korean-fieldwork-record-board';

describe('Korean fieldwork record board', () => {
  it('lists investigation units without repeating their supporting records', () => {
    const operation = createDocument('operation-1', C.OPERATION);
    const feature = createDocument('feature-1', C.FEATURE);
    const documents = [
      operation,
      feature,
      createDocument('pit-1', C.FEATURE_SEGMENT),
      createDocument('find-1', C.FIND),
      createDocument('sample-1', C.SAMPLE),
      createDocument('photo-1', C.PHOTO),
      createDocument('drawing-1', C.DRAWING),
      createDocument('memo-1', C.PEN_MEMO),
    ];

    expect(getKoreanFieldworkRecordBoardDocuments(documents, 'excavation'))
      .toEqual([operation, feature]);
  });

  it('keeps trench records on the board only for the trench workflow', () => {
    const trench = createDocument('trench-1', C.TRENCH);

    expect(getKoreanFieldworkRecordBoardDocuments([trench], 'trialTrench'))
      .toEqual([trench]);
    expect(getKoreanFieldworkRecordBoardDocuments([trench], 'excavation'))
      .toEqual([]);
  });
});

const createDocument = (id: string, category: string): Document => ({
  _id: id,
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
  },
  created: { user: 'tester', date: new Date(0) },
  modified: [],
});
