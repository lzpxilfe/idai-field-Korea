import { Document, FindOptions, Query } from 'idai-field-core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DocumentRepository } from '@/repositories/document-repository';

export interface SearchResult {
  documents: Document[];
  isLoading: boolean;
  hasLoaded: boolean;
}

export const useSearchResult = (
  repository: DocumentRepository | undefined,
  query: Query,
  options?: FindOptions
): SearchResult => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const searchVersionRef = useRef(0);

  useEffect(() => {
    searchVersionRef.current += 1;
    setDocuments([]);
    setHasLoaded(false);

    if (!repository) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [repository]);

  useEffect(
    () => () => {
      searchVersionRef.current += 1;
    },
    []
  );

  const issueSearch = useCallback(() => {
    if (!repository) return;

    const searchVersion = searchVersionRef.current + 1;
    searchVersionRef.current = searchVersion;
    setIsLoading(true);
    setHasLoaded(false);

    repository
      .find(query, options)
      .then((result) => {
        if (searchVersion !== searchVersionRef.current) return;

        setDocuments(result.documents);
        setHasLoaded(true);
      })
      .catch((err) => {
        if (searchVersion !== searchVersionRef.current) return;

        console.log('Documents not found. Error:', err);
        setHasLoaded(true);
      })
      .finally(() => {
        if (searchVersion === searchVersionRef.current) {
          setIsLoading(false);
        }
      });
  }, [repository, query, options]);

  useEffect(() => {
    issueSearch();
  }, [issueSearch]);

  useEffect(() => {
    const localChanges = repository?.changed().subscribe(() => issueSearch());
    const remoteChanges = repository
      ?.remoteChanged()
      .subscribe(() => issueSearch());

    return () => {
      localChanges?.unsubscribe();
      remoteChanges?.unsubscribe();
    };
  }, [repository, issueSearch]);

  return {
    documents,
    isLoading,
    hasLoaded,
  };
};

const useSearch = (
  repository: DocumentRepository | undefined,
  query: Query,
  options?: FindOptions
): Document[] => {
  const { documents } = useSearchResult(repository, query, options);

  return documents;
};

export default useSearch;
