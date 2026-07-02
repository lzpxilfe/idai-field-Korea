import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Document, PouchdbDatastore, Query } from 'idai-field-core';
import { Observable } from 'rxjs';
import { assoc } from 'tsfun';
import { bu1 } from '../test_data/test_docs/bu1';
import { DocumentRepository } from '../repositories/document-repository';
import useSearch, { useSearchResult } from './use-search';

jest.mock('../repositories/document-repository');
jest.mock('idai-field-core');

describe('useSearch', () => {
  let repository: DocumentRepository;

  beforeEach(async () => {
    repository = await DocumentRepository.init(
      'test',
      [] as any,
      {} as PouchdbDatastore
    );
  });

  it('should trigger empty search when initialized', async () => {
    const query = { categories: [] };
    renderHook(() => useSearch(repository, query));

    await waitFor(() => {
      expect(repository.find).toHaveBeenCalledWith(
        { categories: query.categories },
        undefined
      );
    });
  });

  it('passes datastore find options to the repository', async () => {
    const query = {};
    const options = { includeResourcesWithoutValidParent: true };
    renderHook(() => useSearch(repository, query, options));

    await waitFor(() => {
      expect(repository.find).toHaveBeenCalledWith(query, options);
    });
  });

  it('reports when the first search result has loaded', async () => {
    const query = {};
    const { result } = renderHook(() => useSearchResult(repository, query));

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.documents.length).toBeGreaterThan(0);
  });

  it('should trigger find when q is changed', async () => {
    let query: Query = { categories: [] };
    const { rerender } = renderHook(() =>
      useSearch(repository, query)
    );

    await waitFor(() => expect(repository.find).toHaveBeenCalledTimes(1));

    await act(async () => {
      query = assoc('q', 'test', query);
      rerender(undefined);
    });

    await waitFor(() => {
      expect(repository.find).toHaveBeenLastCalledWith(
        {
          q: 'test',
          categories: query.categories,
        },
        undefined
      );
    });
  });

  it('should trigger find when local changes are received', async () => {
    let triggerChange: () => void = () => undefined;
    repository.changed = jest.fn().mockImplementation(() => {
      return new Observable<Document>((subscriber) => {
        triggerChange = () => subscriber.next(bu1);
      });
    });

    const query = { categories: [] };
    renderHook(() => useSearch(repository, query));

    await waitFor(() => expect(repository.find).toHaveBeenCalledTimes(1));

    await act(async () => {
      triggerChange();
      triggerChange();
    });

    await waitFor(() => expect(repository.find).toHaveBeenCalledTimes(3));
  });

  it('should trigger find when remote changes are received', async () => {
    let triggerChange: () => void = () => undefined;
    repository.remoteChanged = jest.fn().mockImplementation(() => {
      return new Observable<Document>((subscriber) => {
        triggerChange = () => subscriber.next(bu1);
      });
    });

    const query = { categories: [] };
    renderHook(() => useSearch(repository, query));

    await waitFor(() => expect(repository.find).toHaveBeenCalledTimes(1));

    await act(async () => {
      triggerChange();
      triggerChange();
    });

    await waitFor(() => expect(repository.find).toHaveBeenCalledTimes(3));
  });
});
