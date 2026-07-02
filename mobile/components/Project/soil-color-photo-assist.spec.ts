import jpeg from 'jpeg-js';
import {
  createSoilColorAssistUpdatesFromPhotoBase64,
  createSoilColorAssistUpdatesFromPhotoBase64AtPoint,
  createSoilColorAssistUpdatesFromRgbSampleAtPoint,
  extractMunsellCandidateOptions,
  getNearestMunsellCandidates,
} from './soil-color-photo-assist';

describe('soil color photo assist', () => {
  it('estimates Munsell candidates from a JPEG color sample', () => {
    const updates = createSoilColorAssistUpdatesFromPhotoBase64(
      createSolidJpegBase64({ red: 111, green: 87, blue: 61 })
    );

    expect(updates.soilColorAssistStatus).toBe('candidatesAvailable');
    expect(updates.soilColorAssistCandidates).toContain('1: 10YR 4/3');
    expect(updates.soilColorAssistCandidates).toContain('사진 중앙부 평균 RGB');
  });

  it('returns nearest candidates for direct RGB samples', () => {
    const candidates = getNearestMunsellCandidates({
      red: 139,
      green: 128,
      blue: 88,
    });

    expect(candidates[0].munsell).toBe('2.5Y 5/3');
    expect(candidates[0].confidence).toBe('high');
  });

  it('extracts unique Munsell options from candidate text', () => {
    expect(extractMunsellCandidateOptions(
      '1: 10YR 4/3 (보통)\n2: 10YR 4/3\n3: GLEY 1 4/N\n4: 2.5GY 2.5/10\n5: N 4/0'
    )).toEqual(['10YR 4/3', 'GLEY 1 4/N', '2.5GY 2.5/10', 'N 4/0']);
  });

  it('uses Korean field wording when photo color sampling fails', () => {
    const updates = createSoilColorAssistUpdatesFromPhotoBase64('not-a-jpeg');

    expect(updates.soilColorAssistStatus).toBe('lowConfidence');
    expect(updates.soilColorAssistCandidates).toContain('먼셀값');
    expect(updates.soilColorAssistCandidates).not.toContain('Munsell 값');
  });

  it('samples Munsell candidates from a selected photo point', () => {
    const base64 = createSplitJpegBase64(
      { red: 111, green: 87, blue: 61 },
      { red: 139, green: 128, blue: 88 }
    );

    const leftUpdates = createSoilColorAssistUpdatesFromPhotoBase64AtPoint(
      base64,
      { x: 2000, y: 5000 }
    );
    const rightUpdates = createSoilColorAssistUpdatesFromPhotoBase64AtPoint(
      base64,
      { x: 8000, y: 5000 }
    );

    expect(leftUpdates.soilColorAssistCandidates).toContain('사진 선택 지점 20%/50%');
    expect(leftUpdates.soilColorAssistCandidates).toContain('1: 10YR 4/3');
    expect(rightUpdates.soilColorAssistCandidates).toContain('사진 선택 지점 80%/50%');
    expect(rightUpdates.soilColorAssistCandidates).toContain('1: 2.5Y 5/3');
  });

  it('uses RGB sampled directly from the photo canvas', () => {
    const updates = createSoilColorAssistUpdatesFromRgbSampleAtPoint(
      { red: 139, green: 128, blue: 88 },
      { x: 8000, y: 5000 }
    );

    expect(updates.soilColorAssistStatus).toBe('candidatesAvailable');
    expect(updates.soilColorAssistCandidates).toContain('80%/50%');
    expect(updates.soilColorAssistCandidates).toContain('RGB 139/128/88');
    expect(updates.soilColorAssistCandidates).toContain('1: 2.5Y 5/3');
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

const createSplitJpegBase64 = (
  leftRgb: { blue: number; green: number; red: number },
  rightRgb: { blue: number; green: number; red: number }
): string => {
  const width = 24;
  const height = 12;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = x < width / 2 ? leftRgb : rightRgb;
      const offset = ((y * width) + x) * 4;
      data[offset] = rgb.red;
      data[offset + 1] = rgb.green;
      data[offset + 2] = rgb.blue;
      data[offset + 3] = 255;
    }
  }

  return Buffer.from(jpeg.encode({ data, width, height }, 95).data)
    .toString('base64');
};
