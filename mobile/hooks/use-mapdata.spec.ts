import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Document, Query } from 'idai-field-core';
import { Subject } from 'rxjs';
import { DocumentRepository } from '@/repositories/document-repository';
import useMapData from './use-mapdata';

jest.mock('react-native-redash', () => ({}));
jest.mock('../components/Project/Map/GLMap/cs-transform', () => ({
  defineWorldCoordinateSystem: jest.fn(),
  getDocumentToWorldTransform: jest.fn(),
  getDocumentToWorldTransformMatrix: jest.fn(() => undefined),
  getGeometryBoundings: jest.fn(() => null),
  getLayerCoordinates: jest.fn(),
  getMinMaxGeometryCoords: jest.fn(() => null),
  getScreenToWorldTransformationMatrix: jest.fn(),
  processTransform2d: jest.fn((_, coordinates) => coordinates),
}));

describe('useMapData map layer subscriptions', () => {
  it('replaces and removes an open aerial layer after remote changes', async () => {
    const initialLayer = createAerialLayer('1-initial', 'old-md5');
    const updatedLayer = createAerialLayer('2-remote', 'new-md5');
    const localChanges = new Subject<Document>();
    const remoteChanges = new Subject<{ document: Document; new: boolean }>();
    const deletions = new Subject<Document>();
    const repository = {
      changed: jest.fn(() => localChanges.asObservable()),
      deleted: jest.fn(() => deletions.asObservable()),
      find: jest.fn(async (query: Query) => ({
        documents: query.constraints?.['isMapLayerOf:exist']
          ? [initialLayer]
          : [],
      })),
      getMultiple: jest.fn(async () => []),
      remoteChanged: jest.fn(() => remoteChanges.asObservable()),
    };

    const { result } = renderHook(() => useMapData(
      repository as unknown as DocumentRepository,
      [],
      undefined,
      { focusMode: 'siteOverview' }
    ));

    await waitFor(() => {
      expect(result.current[1]).toHaveLength(1);
    });
    expect(result.current[1][0]._rev).toBe('1-initial');

    act(() => {
      remoteChanges.next({ document: updatedLayer, new: false });
    });

    await waitFor(() => {
      expect(result.current[1][0]._rev).toBe('2-remote');
    });
    expect(result.current[1][0].resource.fieldworkImageStoredMd5)
      .toBe('new-md5');

    act(() => {
      deletions.next(updatedLayer);
    });

    await waitFor(() => {
      expect(result.current[1]).toEqual([]);
    });
  });

  it('removes a layer when a remote update drops its georeference', async () => {
    const initialLayer = createAerialLayer('1-initial', 'old-md5');
    const remoteChanges = new Subject<{ document: Document; new: boolean }>();
    const repository = {
      changed: jest.fn(() => new Subject<Document>().asObservable()),
      deleted: jest.fn(() => new Subject<Document>().asObservable()),
      find: jest.fn(async (query: Query) => ({
        documents: query.constraints?.['isMapLayerOf:exist']
          ? [initialLayer]
          : [],
      })),
      getMultiple: jest.fn(async () => []),
      remoteChanged: jest.fn(() => remoteChanges.asObservable()),
    };
    const withoutGeoreference = {
      ...initialLayer,
      _rev: '2-remote',
      resource: {
        ...initialLayer.resource,
        georeference: undefined,
      },
    } as Document;

    const { result } = renderHook(() => useMapData(
      repository as unknown as DocumentRepository,
      []
    ));
    await waitFor(() => expect(result.current[1]).toHaveLength(1));

    act(() => {
      remoteChanges.next({ document: withoutGeoreference, new: false });
    });

    await waitFor(() => expect(result.current[1]).toEqual([]));
  });
});

const createAerialLayer = (revision: string, storedMd5: string): Document => ({
  _id: 'aerial-layer-1',
  _rev: revision,
  created: { user: 'test', date: new Date(0) },
  modified: [],
  resource: {
    category: 'AerialMapLayer',
    fieldworkImageStoredMd5: storedMd5,
    georeference: {},
    id: 'aerial-layer-1',
    identifier: 'Site orthomosaic',
    relations: { isMapLayerOf: ['project-1'] },
  },
} as unknown as Document);
