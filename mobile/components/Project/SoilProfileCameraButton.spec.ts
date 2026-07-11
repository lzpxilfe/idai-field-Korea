import * as FileSystem from 'expo-file-system';
import {
  clearFieldworkImageUploadAudit,
  createFieldworkPhotoCaptureData,
  createSoilProfileCaptureData,
  persistFieldworkCaptureFile,
} from './SoilProfileCameraButton';
import jpeg from 'jpeg-js';
import {
  SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
  SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
} from './Map/korean-fieldwork-drafts';

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///app/documents/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

describe('fieldwork camera capture data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps regular photo captures to reusable image fields', () => {
    const capturedAt = new Date('2026-06-23T01:02:03.000Z');

    expect(createFieldworkPhotoCaptureData(
      'file:///storage/emulated/0/DCIM/field%20photo.jpg?cache=1',
      capturedAt,
      undefined,
      undefined,
      { width: 4032, height: 3024 }
    )).toEqual({
      imageUri: 'file:///storage/emulated/0/DCIM/field%20photo.jpg?cache=1',
      originalFilename: 'field photo.jpg',
      width: 4032,
      height: 3024,
      fieldworkPhotoUri: 'file:///storage/emulated/0/DCIM/field%20photo.jpg?cache=1',
      fieldworkPhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
      fieldworkPhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
      fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
    });
  });

  it('keeps soil profile captures in the dedicated soil profile fields', () => {
    const capturedAt = new Date('2026-06-23T01:02:03.000Z');

    expect(createSoilProfileCaptureData(
      'file:///storage/emulated/0/DCIM/profile.jpg',
      capturedAt,
      undefined,
      undefined,
      { width: 3000, height: 4000 }
    )).toEqual({
      soilProfilePhotoUri: 'file:///storage/emulated/0/DCIM/profile.jpg',
      originalFilename: 'profile.jpg',
      width: 3000,
      height: 4000,
      soilProfilePhotoSizeHintKb: SOIL_PROFILE_PHOTO_SIZE_HINT_KB_DEFAULT,
      soilProfilePhotoQuality: SOIL_PROFILE_PHOTO_QUALITY_DEFAULT,
      soilProfilePhotoCapturedAt: '2026-06-23T01:02:03.000Z',
    });
  });

  it('adds fieldworker authorship metadata when a username is available', () => {
    const capturedAt = new Date('2026-06-23T01:02:03.000Z');
    const expectedMetadata = {
      draughtsmen: ['fieldworker'],
      imageRights: {
        de: 'fieldworker',
        en: 'fieldworker',
        ko: 'fieldworker',
      },
    };

    expect(createFieldworkPhotoCaptureData(
      'file:///storage/emulated/0/DCIM/photo.jpg',
      capturedAt,
      undefined,
      { username: ' fieldworker ' }
    )).toMatchObject(expectedMetadata);
    expect(createSoilProfileCaptureData(
      'file:///storage/emulated/0/DCIM/profile.jpg',
      capturedAt,
      undefined,
      { username: 'fieldworker' }
    )).toMatchObject(expectedMetadata);
  });

  it('adds photo-derived Munsell candidates for soil profile captures when image data is available', () => {
    const capturedAt = new Date('2026-06-23T01:02:03.000Z');
    const data = createSoilProfileCaptureData(
      'file:///storage/emulated/0/DCIM/profile.jpg',
      capturedAt,
      createSolidJpegBase64({ red: 111, green: 87, blue: 61 })
    );

    expect(data.soilColorAssistStatus).toBe('candidatesAvailable');
    expect(data.soilColorAssistCandidates).toContain('1: 10YR 3/4');
  });

  it('copies camera output into persistent document storage before recording the capture', async () => {
    const persistedUri = await persistFieldworkCaptureFile(
      'file:///cache/Camera/field%20photo.JPG?cache=1',
      new Date('2026-06-23T01:02:03.000Z')
    );

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      'file:///app/documents/fieldwork-captures',
      { intermediates: true }
    );
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///cache/Camera/field%20photo.JPG?cache=1',
      to: 'file:///app/documents/fieldwork-captures/fieldwork-photo-2026-06-23T01-02-03-000Z-field-photo.jpg',
    });
    expect(persistedUri).toBe(
      'file:///app/documents/fieldwork-captures/fieldwork-photo-2026-06-23T01-02-03-000Z-field-photo.jpg'
    );
  });

  it('uses the fieldwork record name for persisted capture filenames when available', async () => {
    const persistedUri = await persistFieldworkCaptureFile(
      'file:///cache/Camera/IMG_0001.JPG',
      new Date('2026-06-23T01:02:03.000Z'),
      '1호 수혈 사진 1'
    );

    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///cache/Camera/IMG_0001.JPG',
      to: 'file:///app/documents/fieldwork-captures/fieldwork-photo-2026-06-23T01-02-03-000Z-1호-수혈-사진-1.jpg',
    });
    expect(persistedUri).toBe(
      'file:///app/documents/fieldwork-captures/fieldwork-photo-2026-06-23T01-02-03-000Z-1호-수혈-사진-1.jpg'
    );
  });

  it('does not reuse a previous capture filename when retaking the same record photo', async () => {
    const firstUri = await persistFieldworkCaptureFile(
      'file:///cache/Camera/IMG_0001.JPG',
      new Date('2026-06-23T01:02:03.000Z'),
      '1호 수혈 사진 1'
    );
    const secondUri = await persistFieldworkCaptureFile(
      'file:///cache/Camera/IMG_0002.JPG',
      new Date('2026-06-23T01:03:04.000Z'),
      '1호 수혈 사진 1'
    );

    expect(firstUri).not.toBe(secondUri);
    expect(secondUri).toBe(
      'file:///app/documents/fieldwork-captures/fieldwork-photo-2026-06-23T01-03-04-000Z-1호-수혈-사진-1.jpg'
    );
  });

  it('clears previous upload audit fields before storing a replacement capture', () => {
    expect(clearFieldworkImageUploadAudit({
      id: 'photo-1',
      category: 'Photo',
      fieldworkImageUploadStatus: 'uploaded',
      fieldworkImageUploadedAt: '2026-06-23T01:02:03.000Z',
      fieldworkImageUploadedUri: 'file:///tablet/old.jpg',
      fieldworkImageUploadTarget: 'https://field.example/files/project/photo-1?type=original_image',
      fieldworkImageUploadedProject: 'project',
      fieldworkImageUploadedSizeBytes: 10,
      fieldworkImageUploadedMd5: 'old-md5',
      fieldworkImageStoredSizeBytes: 10,
      fieldworkImageStoredMd5: 'old-md5',
      fieldworkImageStoredSha256: 'old-sha256',
      digitalSourcePreservation: [
        'originalPhoto',
        'originalImage',
        'webOrServerBackup',
        'backupVerified',
      ],
    })).toEqual({
      id: 'photo-1',
      category: 'Photo',
      digitalSourcePreservation: [
        'originalPhoto',
        'originalImage',
      ],
    });
  });
});

const createSolidJpegBase64 = (rgb: {
  blue: number;
  green: number;
  red: number;
}): string => {
  const width = 12;
  const height = 12;
  const data = new Uint8Array(width * height * 4);

  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = rgb.red;
    data[offset + 1] = rgb.green;
    data[offset + 2] = rgb.blue;
    data[offset + 3] = 255;
  }

  return Buffer.from(jpeg.encode({ data, width, height }, 90).data)
    .toString('base64');
};
