import * as FileSystem from 'expo-file-system';
import { Document, base64Encode } from 'idai-field-core';
import {
  buildFieldworkMapLayerDownloadUrl,
  getFieldworkMapLayerCacheDescriptor,
  hydrateFieldworkMapLayerImage,
  hydrateFieldworkMapLayerImages,
} from './use-fieldwork-map-layer-images';

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  deleteAsync: jest.fn(),
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

describe('fieldwork map layer image hydration', () => {
  const connection = {
    password: 'field-secret',
    url: 'https://field.example/db',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.moveAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      headers: {},
      md5: 'server-md5',
      mimeType: 'image/jpeg',
      status: 200,
      uri: 'file:///cache/download',
    });
  });

  it('downloads a desktop original with project authentication into a scoped cache', async () => {
    const document = createAerialLayer('aerial/layer-1', {
      fieldworkImageStoredMd5: 'server-md5',
      originalFilename: 'site orthomosaic.JPG',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork/project',
      'file:///cache/'
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      connection,
      document,
      project: 'fieldwork/project',
    });

    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      'https://field.example/files/fieldwork%2Fproject/aerial%2Flayer-1?type=original_image',
      `${descriptor.fileUri}.download`,
      {
        headers: {
          Authorization: `Basic ${base64Encode('fieldwork/project:field-secret')}`,
        },
        md5: true,
      }
    );
    expect(FileSystem.moveAsync).toHaveBeenCalledWith({
      from: `${descriptor.fileUri}.download`,
      to: descriptor.fileUri,
    });
    expect(hydrated).not.toBe(document);
    expect(hydrated.resource.aerialLayerImageUri).toBe(descriptor.fileUri);
    expect(document.resource.aerialLayerImageUri).toBeUndefined();
  });

  it('uses project-scoped durable document storage by default', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      fieldworkImageStoredMd5: 'server-md5',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork',
      'file:///documents/'
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      connection,
      document,
      project: 'fieldwork',
    });

    expect(descriptor.directoryUri).toContain(
      'file:///documents/fieldwork-map-layers/'
    );
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      descriptor.directoryUri,
      { intermediates: true }
    );
    expect(hydrated.resource.aerialLayerImageUri).toBe(descriptor.fileUri);
  });

  it('reuses a checksum-matching cache without making a network request', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      fieldworkImageStoredMd5: 'server-md5',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork',
      'file:///cache/'
    );
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) =>
      uri === descriptor.fileUri
        ? {
          exists: true,
          isDirectory: false,
          md5: 'server-md5',
        }
        : { exists: false }
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      connection,
      document,
      project: 'fieldwork',
    });

    expect(hydrated.resource.aerialLayerImageUri).toBe(descriptor.fileUri);
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('uses the document revision when no stored checksum exists', () => {
    const firstRevision = createAerialLayer('aerial-layer-1', {}, '1-first');
    const secondRevision = createAerialLayer('aerial-layer-1', {}, '2-second');

    const firstDescriptor = getFieldworkMapLayerCacheDescriptor(
      firstRevision,
      'fieldwork',
      'file:///cache/'
    );
    const secondDescriptor = getFieldworkMapLayerCacheDescriptor(
      secondRevision,
      'fieldwork',
      'file:///cache/'
    );

    expect(firstDescriptor.directoryUri).toBe(secondDescriptor.directoryUri);
    expect(firstDescriptor.resourcePrefix).toBe(secondDescriptor.resourcePrefix);
    expect(firstDescriptor.fileUri).not.toBe(secondDescriptor.fileUri);
  });

  it('keeps the previous cached raster available when an updated download is offline', async () => {
    const previous = createAerialLayer('aerial-layer-1', {}, '1-previous');
    const updated = createAerialLayer('aerial-layer-1', {}, '2-updated');
    const previousDescriptor = getFieldworkMapLayerCacheDescriptor(
      previous,
      'fieldwork',
      'file:///cache/'
    );
    const updatedDescriptor = getFieldworkMapLayerCacheDescriptor(
      updated,
      'fieldwork',
      'file:///cache/'
    );
    (FileSystem.downloadAsync as jest.Mock).mockRejectedValue(
      new Error('network unavailable')
    );
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
      previousDescriptor.fileName,
    ]);
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) =>
      uri === previousDescriptor.fileUri
        ? {
          exists: true,
          isDirectory: false,
          modificationTime: 100,
        }
        : { exists: false }
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      connection,
      document: updated,
      project: 'fieldwork',
    });

    expect(updatedDescriptor.fileUri).not.toBe(previousDescriptor.fileUri);
    expect(hydrated.resource.aerialLayerImageUri)
      .toBe(previousDescriptor.fileUri);
  });

  it('reuses a device-local raster only when it matches the server checksum', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      aerialLayerImageUri: 'file:///tablet/maps/current.jpg',
      fieldworkImageStoredMd5: 'server-md5',
    });
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) =>
      uri === 'file:///tablet/maps/current.jpg'
        ? {
          exists: true,
          isDirectory: false,
          md5: 'server-md5',
        }
        : { exists: false }
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      connection,
      document,
      project: 'fieldwork',
    });

    expect(hydrated).toBe(document);
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('keeps a newly selected local raster before its first server checksum exists', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      aerialLayerImageUri: 'content://tablet/maps/new-orthomosaic.jpg',
    });
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) =>
      uri === 'content://tablet/maps/new-orthomosaic.jpg'
        ? { exists: true, isDirectory: false }
        : { exists: false }
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      connection,
      document,
      project: 'fieldwork',
    });

    expect(hydrated).toBe(document);
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('keeps a locally replaced raster ahead of a matching server cache while offline', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      aerialLayerImageUri: 'content://tablet/maps/replaced-orthomosaic.jpg',
      fieldworkImageUploadedAt: '2026-07-18T01:02:03.000Z',
      fieldworkImageUploadedMd5: 'old-local-md5',
      fieldworkImageStoredMd5: 'server-md5',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork',
      'file:///cache/'
    );
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) => {
      if (uri === 'content://tablet/maps/replaced-orthomosaic.jpg') {
        return {
          exists: true,
          isDirectory: false,
          md5: 'new-local-md5',
          size: 200,
        };
      }
      if (uri === descriptor.fileUri) {
        return {
          exists: true,
          isDirectory: false,
          md5: 'server-md5',
        };
      }
      return { exists: false };
    });

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      document,
      project: 'fieldwork',
    });

    expect(hydrated).toBe(document);
    expect(hydrated.resource.aerialLayerImageUri)
      .toBe('content://tablet/maps/replaced-orthomosaic.jpg');
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('keeps an accessible content source when its provider cannot calculate MD5', async () => {
    const localUri = 'content://tablet/maps/provider-without-md5';
    const document = createAerialLayer('aerial-layer-1', {
      aerialLayerImageUri: localUri,
      fieldworkImageUploadedAt: '2026-07-18T01:02:03.000Z',
      fieldworkImageUploadedSizeBytes: 100,
      fieldworkImageStoredMd5: 'server-md5',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork',
      'file:///cache/'
    );
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(
      async (uri, options) => {
        if (uri === localUri && options?.md5) {
          throw new Error('provider does not support MD5');
        }
        if (uri === localUri) {
          return { exists: true, isDirectory: false, size: 100 };
        }
        if (uri === descriptor.fileUri) {
          return {
            exists: true,
            isDirectory: false,
            md5: 'server-md5',
          };
        }
        return { exists: false };
      }
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      document,
      project: 'fieldwork',
    });

    expect(hydrated).toBe(document);
    expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(localUri);
  });

  it('keeps a newer server cache when the remaining local source is older', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      aerialLayerImageUri: 'file:///tablet/maps/stale-local.jpg',
      fieldworkImageUploadedAt: '2026-07-18T02:00:00.000Z',
      fieldworkImageUploadedMd5: 'previous-upload-md5',
      fieldworkImageStoredMd5: 'server-md5',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork',
      'file:///cache/'
    );
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) => {
      if (uri === 'file:///tablet/maps/stale-local.jpg') {
        return {
          exists: true,
          isDirectory: false,
          md5: 'different-local-md5',
          modificationTime: Date.parse('2026-07-18T01:00:00.000Z') / 1000,
        };
      }
      if (uri === descriptor.fileUri) {
        return {
          exists: true,
          isDirectory: false,
          md5: 'server-md5',
        };
      }
      return { exists: false };
    });

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      document,
      project: 'fieldwork',
    });

    expect(hydrated.resource.aerialLayerImageUri).toBe(descriptor.fileUri);
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('downloads a newer server raster when a present local file has an old checksum', async () => {
    const document = createAerialLayer('aerial-layer-1', {
      aerialLayerImageUri: 'file:///tablet/maps/old.jpg',
      fieldworkImageUploadedAt: '2026-07-18T01:02:03.000Z',
      fieldworkImageUploadedMd5: 'old-md5',
      fieldworkImageStoredMd5: 'server-md5',
    });
    const descriptor = getFieldworkMapLayerCacheDescriptor(
      document,
      'fieldwork',
      'file:///cache/'
    );
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri) =>
      uri === 'file:///tablet/maps/old.jpg'
        ? {
          exists: true,
          isDirectory: false,
          md5: 'old-md5',
        }
        : { exists: false }
    );

    const hydrated = await hydrateFieldworkMapLayerImage({
      cacheDirectory: 'file:///cache/',
      connection,
      document,
      project: 'fieldwork',
    });

    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(1);
    expect(hydrated.resource.aerialLayerImageUri).toBe(descriptor.fileUri);
  });

  it('leaves unrelated layer documents unchanged', async () => {
    const ordinaryLayer = createDocument('layer-1', 'Layer');

    const hydrated = await hydrateFieldworkMapLayerImages({
      cacheDirectory: 'file:///cache/',
      connection,
      documents: [ordinaryLayer],
      project: 'fieldwork',
    });

    expect(hydrated[0]).toBe(ordinaryLayer);
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('uses the shared FieldHub original-image URL builder', () => {
    expect(buildFieldworkMapLayerDownloadUrl(
      'https://field.example/db/fieldwork',
      'fieldwork',
      'aerial-layer-1'
    )).toBe(
      'https://field.example/files/fieldwork/aerial-layer-1?type=original_image'
    );
  });
});

const createAerialLayer = (
  id: string,
  fields: Record<string, unknown> = {},
  revision = '1-aerial'
): Document => createDocument(id, 'AerialMapLayer', fields, revision);

const createDocument = (
  id: string,
  category: string,
  fields: Record<string, unknown> = {},
  revision = '1-test'
): Document => ({
  _id: id,
  _rev: revision,
  created: { user: 'test', date: new Date(0) },
  modified: [],
  resource: {
    category,
    id,
    identifier: id,
    relations: {},
    ...fields,
  },
});
