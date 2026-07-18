import { Document, FieldGeometry, Query } from 'idai-field-core';
import { useCallback, useEffect, useState } from 'react';
import { LayoutRectangle } from 'react-native';
import { Matrix4 } from 'react-native-redash';
import {
  defineWorldCoordinateSystem,
  GeometryBoundings,
  getDocumentToWorldTransform,
  getDocumentToWorldTransformMatrix,
  getGeometryBoundings,
  getLayerCoordinates,
  getMinMaxGeometryCoords,
  getScreenToWorldTransformationMatrix,
  processTransform2d,
  Transformation,
} from '../components/Project/Map/GLMap/cs-transform';
import { DocumentRepository } from '@/repositories/document-repository';
import {
  viewBoxPaddingX,
  viewBoxPaddingY,
} from '../components/Project/Map/GLMap/constants';

const geoDocSearchQuery: Query = {
  q: '*',
  constraints: { 'geometry:exist': 'KNOWN' },
};

const layerDocSearchQuery: Query = {
  q: '*',
  constraints: { 'isMapLayerOf:exist': 'KNOWN' },
};

export type UpdatedDocument = {
  document: Document;
  status: 'updated' | 'deleted';
};

type mapDataReturn = [
  Document[],
  Document[],
  Matrix4 | undefined,
  Matrix4 | undefined,
  Transformation | undefined,
  (docId: string) => void,
  UpdatedDocument | undefined
];

type MapFocusMode = 'selectedDocuments' | 'siteOverview';

interface UseMapDataOptions {
  focusMode?: MapFocusMode;
}

const useMapData = (
  repository: DocumentRepository,
  selectedDocumentIds: string[],
  screen?: LayoutRectangle,
  options: UseMapDataOptions = {}
): mapDataReturn => {
  const [geoDocuments, setGeoDocuments] = useState<Document[]>([]);
  const [layerDocuments, setLayerDocuments] = useState<Document[]>([]);
  const [geometryBoundings, setGeometryBoundings] =
    useState<GeometryBoundings | null>(null);
  const [documentToWorldMatrix, setDocumentToWorldMatrix] = useState<Matrix4>();
  const [screenToWorldMatrix, setScreenToWorldMatrix] = useState<Matrix4>();
  const [viewBox, setViewBox] = useState<Transformation>();
  const [updateDoc, setUpdateDoc] = useState<UpdatedDocument>();

  const focusMapOnGeometryBoundings = useCallback(
    (bounds: GeometryBoundings | null) => {
      if (!documentToWorldMatrix) return;
      if (!bounds) return;

      try {
        const { minX, minY, maxX, maxY } = bounds;
        const [left, bottom] = processTransform2d(documentToWorldMatrix, [
          minX,
          minY,
        ]);
        const [right, top] = processTransform2d(documentToWorldMatrix, [
          maxX,
          maxY,
        ]);
        setViewBox(
          getDocumentToWorldTransform(
            {
              minX: left,
              minY: bottom,
              height: Math.max(top - bottom, right - left) + viewBoxPaddingY,
              width: Math.max(top - bottom, right - left) + viewBoxPaddingX,
            },
            defineWorldCoordinateSystem()
          )
        );
      } catch (error) {
        console.warn('Unable to focus map on geometry bounds', error);
      }
    },
    [documentToWorldMatrix]
  );

  const focusMapOnDocumentIds = useCallback(
    async (docIds: string[]) => {
      if (!docIds.length) return;

      try {
        const docs = await repository.getMultiple(docIds);
        focusMapOnGeometryBoundings(getDocumentsGeometryBoundings(docs));
      } catch (error) {
        console.warn('Unable to focus map on selected documents', error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repository, focusMapOnGeometryBoundings]
  );

  const focusMapOnDocumentId = (docId: string) =>
    focusMapOnDocumentIds([docId]);

  const upsertGeoDocument = useCallback((document: Document) => {
    if (!isUsableDocument(document) || !Document.hasGeometry(document)) return;

    setGeoDocuments((currentDocuments) => {
      const documentIndex = currentDocuments.findIndex(
        (currentDocument) => currentDocument.resource.id === document.resource.id
      );

      if (documentIndex < 0) return [...currentDocuments, document];

      return currentDocuments.map((currentDocument, index) =>
        index === documentIndex ? document : currentDocument
      );
    });
    setUpdateDoc({ document, status: 'updated' });
  }, []);

  const upsertLayerDocument = useCallback((document: Document) => {
    if (!isUsableDocument(document)) return;

    setLayerDocuments((currentDocuments) => {
      const documentIndex = currentDocuments.findIndex(
        (currentDocument) => currentDocument.resource.id === document.resource.id
      );

      if (!isMapLayerDocument(document)) {
        return documentIndex < 0
          ? currentDocuments
          : currentDocuments.filter((_, index) => index !== documentIndex);
      }

      if (documentIndex < 0) return [...currentDocuments, document];

      return currentDocuments.map((currentDocument, index) =>
        index === documentIndex ? document : currentDocument
      );
    });
  }, []);

  const removeGeoDocument = useCallback((document: Document) => {
    if (!isUsableDocument(document)) return;

    setGeoDocuments((currentDocuments) =>
      currentDocuments.filter(
        (currentDocument) => currentDocument.resource.id !== document.resource.id
      )
    );
    setUpdateDoc({ document, status: 'deleted' });
  }, []);

  const removeLayerDocument = useCallback((document: Document) => {
    if (!isUsableDocument(document)) return;

    setLayerDocuments((currentDocuments) =>
      currentDocuments.filter(
        (currentDocument) => currentDocument.resource.id !== document.resource.id
      )
    );
  }, []);

  const getDocumentsGeometryBoundings = (
    docs: Document[]
  ): GeometryBoundings | null => {
    const usableDocs = docs.filter(isUsableDocument);
    if (!usableDocs.length) return null;

    try {
      let geometryBoundings: GeometryBoundings | null;
      if (isDocumentLayer(usableDocs)) {
        const georeference = usableDocs[0].resource.georeference;
        if (!georeference) return null;
        const layerVertices = getLayerCoordinates(georeference);
        geometryBoundings = {
          minX: Math.min(
            layerVertices.bottomLeftCoordinates[0],
            layerVertices.topLeftCoordinates[0]
          ),
          maxX: Math.max(
            layerVertices.bottomRightCoordinates[0],
            layerVertices.topRightCoordinates[0]
          ),
          minY: Math.min(
            layerVertices.bottomLeftCoordinates[1],
            layerVertices.bottomRightCoordinates[1]
          ),
          maxY: Math.max(
            layerVertices.topLeftCoordinates[1],
            layerVertices.topRightCoordinates[1]
          ),
        };
      } else {
        const geoDocs = usableDocs
          .map((doc) => doc.resource.geometry || null)
          .filter((doc) => doc !== null) as FieldGeometry[];
        geometryBoundings = getMinMaxGeometryCoords(geoDocs);
      }

      return geometryBoundings;
    } catch (error) {
      console.warn('Unable to read map geometry bounds', error);
      return null;
    }
  };

  const isDocumentLayer = (documents: Document[]) => {
    if (documents.length > 1) return false;
    if (documents[0].resource.georeference) return true;
    else return false;
  };

  useEffect(() => {

    repository
      .find(geoDocSearchQuery)
      .then((result) => setGeoDocuments(result.documents))
      .catch((err) => console.log('Document not found. Error:', err));

    repository
      .find(layerDocSearchQuery)
      .then((result) =>
        setLayerDocuments(result.documents.filter(hasGeoreference))
      )
      .catch((err) => console.log('Document not found. Error:', err));

    const handleChangedDocument = (document: Document) => {
      upsertGeoDocument(document);
      upsertLayerDocument(document);
    };

    const localChangedSubscription = repository
      .changed()
      .subscribe(handleChangedDocument);

    const remoteChangedSubscription = repository
      .remoteChanged()
      .subscribe((changeInfo) => handleChangedDocument(changeInfo.document));

    return () => {
      localChangedSubscription.unsubscribe();
      remoteChangedSubscription.unsubscribe();
    };
  }, [repository, upsertGeoDocument, upsertLayerDocument]);

  useEffect(
    () => {
      try {
        setGeometryBoundings(getGeometryBoundings(geoDocuments, layerDocuments));
      } catch (error) {
        console.warn('Unable to calculate map bounds', error);
        setGeometryBoundings(null);
      }
    },
    [geoDocuments, layerDocuments]
  );

  useEffect(() => {
    const deletedSubscription = repository
      .deleted()
      .subscribe((document) => {
        removeGeoDocument(document);
        removeLayerDocument(document);
      });
    return () => deletedSubscription.unsubscribe();
  }, [repository, removeGeoDocument, removeLayerDocument]);

  useEffect(
    () =>
      setDocumentToWorldMatrix(
        getDocumentToWorldTransformMatrix(geometryBoundings)
      ),
    [geometryBoundings]
  );

  useEffect(() => {
    if (options.focusMode === 'siteOverview') {
      focusMapOnGeometryBoundings(geometryBoundings);
      return;
    }

    focusMapOnDocumentIds(selectedDocumentIds);
  }, [
    selectedDocumentIds,
    focusMapOnDocumentIds,
    focusMapOnGeometryBoundings,
    geometryBoundings,
    options.focusMode,
  ]);

  useEffect(() => {
    if (!screen) return;
    setScreenToWorldMatrix(getScreenToWorldTransformationMatrix(screen));
  }, [screen]);

  return [
    geoDocuments,
    layerDocuments,
    documentToWorldMatrix,
    screenToWorldMatrix,
    viewBox,
    focusMapOnDocumentId,
    updateDoc,
  ];
};

export default useMapData;

const hasGeoreference = (document: Document | null | undefined): document is Document =>
  isUsableDocument(document) && !!document.resource.georeference;

const isMapLayerDocument = (
  document: Document | null | undefined
): document is Document => {
  if (!hasGeoreference(document)) return false;

  const relations = document.resource.relations as Record<string, unknown> | undefined;
  return document.resource.category === 'AerialMapLayer'
    || !!relations?.isMapLayerOf;
};

const isUsableDocument = (document: Document | null | undefined): document is Document =>
  !!document?.resource;
