import jpeg, { RawImageData } from 'jpeg-js';
import {
  extractMunsellCandidateOptions as extractCoreMunsellCandidateOptions,
  getNearestMunsellCandidates as getCoreNearestMunsellCandidates,
  hasMunsellCandidateOptions as hasCoreMunsellCandidateOptions,
  SOIL_COLOR_MUNSELL_REFERENCES as CORE_SOIL_COLOR_MUNSELL_REFERENCES,
} from 'idai-field-core';
import type {
  MunsellReference,
  RgbSample,
  SoilColorAssistStatus,
  SoilColorCandidate,
  SoilColorConfidence,
} from 'idai-field-core';

export type {
  MunsellReference,
  RgbSample,
  SoilColorAssistStatus,
  SoilColorCandidate,
  SoilColorConfidence,
} from 'idai-field-core';

export interface SoilColorPhotoAssistResult {
  averageRgb?: RgbSample;
  candidates: SoilColorCandidate[];
  formattedCandidates: string;
  status: SoilColorAssistStatus;
}

export interface SoilColorSamplePoint {
  x: number;
  y: number;
}

export interface SoilColorAssistResourceUpdates {
  soilColorAssistCandidates?: string;
  soilColorAssistStatus?: SoilColorAssistStatus;
}

const MAX_SAMPLE_COUNT = 6000;
const MAX_DECODE_MEMORY_MB = 96;

export const SOIL_COLOR_MUNSELL_REFERENCES: readonly MunsellReference[] =
  CORE_SOIL_COLOR_MUNSELL_REFERENCES;
export const getNearestMunsellCandidates = getCoreNearestMunsellCandidates;
export const extractMunsellCandidateOptions = extractCoreMunsellCandidateOptions;
export const hasMunsellCandidateOptions = hasCoreMunsellCandidateOptions;

export const createSoilColorAssistUpdatesFromPhotoBase64 = (
  base64?: string
): SoilColorAssistResourceUpdates => {
  if (!base64) return {};

  const result = getSoilColorPhotoAssistFromJpegBase64(base64);

  return {
    soilColorAssistCandidates: result.formattedCandidates,
    soilColorAssistStatus: result.status,
  };
};

export const createSoilColorAssistUpdatesFromPhotoBase64AtPoint = (
  base64: string | undefined,
  point: SoilColorSamplePoint
): SoilColorAssistResourceUpdates => {
  if (!base64) return {};

  const result = getSoilColorPhotoAssistFromJpegBase64AtPoint(base64, point);

  return {
    soilColorAssistCandidates: result.formattedCandidates,
    soilColorAssistStatus: result.status,
  };
};

export const createSoilColorAssistUpdatesFromRgbSampleAtPoint = (
  rgb: RgbSample | undefined,
  point: SoilColorSamplePoint
): SoilColorAssistResourceUpdates => {
  if (!rgb) {
    return {
      soilColorAssistCandidates: formatSampleUnavailable(point),
      soilColorAssistStatus: 'lowConfidence',
    };
  }

  const averageRgb = normalizeRgbSample(rgb);
  const candidates = getNearestMunsellCandidates(averageRgb);
  const status = getAssistStatus(candidates[0]);

  return {
    soilColorAssistCandidates: formatCandidates(
      averageRgb,
      candidates,
      getPointSampleLabel(point)
    ),
    soilColorAssistStatus: status,
  };
};

export const getSoilColorPhotoAssistFromJpegBase64 = (
  base64: string
): SoilColorPhotoAssistResult => {
  try {
    const decoded = jpeg.decode(decodeBase64(base64), {
      maxMemoryUsageInMB: MAX_DECODE_MEMORY_MB,
      tolerantDecoding: true,
      useTArray: true,
    });
    const averageRgb = getCentralAverageRgb(decoded);
    const candidates = getNearestMunsellCandidates(averageRgb);
    const status = getAssistStatus(candidates[0]);

    return {
      averageRgb,
      candidates,
      formattedCandidates: formatCandidates(
        averageRgb,
        candidates,
        '사진 중앙부 평균 RGB'
      ),
      status,
    };
  } catch {
    return {
      candidates: [],
      formattedCandidates: '사진 색상 샘플을 읽지 못했습니다. 먼셀값을 직접 확인하세요.',
      status: 'lowConfidence',
    };
  }
};

export const getSoilColorPhotoAssistFromJpegBase64AtPoint = (
  base64: string,
  point: SoilColorSamplePoint
): SoilColorPhotoAssistResult => {
  try {
    const decoded = jpeg.decode(decodeBase64(base64), {
      maxMemoryUsageInMB: MAX_DECODE_MEMORY_MB,
      tolerantDecoding: true,
      useTArray: true,
    });
    const averageRgb = getPointAverageRgb(decoded, point);
    const candidates = getNearestMunsellCandidates(averageRgb);
    const status = getAssistStatus(candidates[0]);

    return {
      averageRgb,
      candidates,
      formattedCandidates: formatCandidates(
        averageRgb,
        candidates,
        getPointSampleLabel(point)
      ),
      status,
    };
  } catch {
    return {
      candidates: [],
      formattedCandidates: '선택한 사진 지점의 색상 샘플을 읽지 못했습니다. 먼셀값을 직접 확인하세요.',
      status: 'lowConfidence',
    };
  }
};

const getAssistStatus = (
  candidate: SoilColorCandidate | undefined
): SoilColorAssistStatus =>
  candidate?.confidence === 'low'
    ? 'lowConfidence'
    : 'candidatesAvailable';

const getCentralAverageRgb = (
  image: RawImageData<Uint8Array>
): RgbSample => {
  const xStart = Math.floor(image.width * 0.35);
  const xEnd = Math.ceil(image.width * 0.65);
  const yStart = Math.floor(image.height * 0.35);
  const yEnd = Math.ceil(image.height * 0.65);
  const pixelCount = Math.max(1, (xEnd - xStart) * (yEnd - yStart));
  const step = Math.max(1, Math.floor(Math.sqrt(pixelCount / MAX_SAMPLE_COUNT)));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = yStart; y < yEnd; y += step) {
    for (let x = xStart; x < xEnd; x += step) {
      const offset = ((y * image.width) + x) * 4;
      red += image.data[offset] ?? 0;
      green += image.data[offset + 1] ?? 0;
      blue += image.data[offset + 2] ?? 0;
      count++;
    }
  }

  return {
    blue: Math.round(blue / count),
    green: Math.round(green / count),
    red: Math.round(red / count),
  };
};

const getPointAverageRgb = (
  image: RawImageData<Uint8Array>,
  point: SoilColorSamplePoint
): RgbSample => {
  const centerX = clamp(
    Math.round((normalizeSampleCoordinate(point.x) / 10000) * (image.width - 1)),
    0,
    image.width - 1
  );
  const centerY = clamp(
    Math.round((normalizeSampleCoordinate(point.y) / 10000) * (image.height - 1)),
    0,
    image.height - 1
  );
  const radius = Math.max(2, Math.round(Math.min(image.width, image.height) * 0.025));
  const xStart = Math.max(0, centerX - radius);
  const xEnd = Math.min(image.width - 1, centerX + radius);
  const yStart = Math.max(0, centerY - radius);
  const yEnd = Math.min(image.height - 1, centerY + radius);
  const pixelCount = Math.max(1, (xEnd - xStart + 1) * (yEnd - yStart + 1));
  const step = Math.max(1, Math.floor(Math.sqrt(pixelCount / MAX_SAMPLE_COUNT)));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = yStart; y <= yEnd; y += step) {
    for (let x = xStart; x <= xEnd; x += step) {
      const offset = ((y * image.width) + x) * 4;
      red += image.data[offset] ?? 0;
      green += image.data[offset + 1] ?? 0;
      blue += image.data[offset + 2] ?? 0;
      count++;
    }
  }

  return {
    blue: Math.round(blue / count),
    green: Math.round(green / count),
    red: Math.round(red / count),
  };
};

const formatCandidates = (
  averageRgb: RgbSample,
  candidates: SoilColorCandidate[],
  label: string
): string => [
  `${label} ${averageRgb.red}/${averageRgb.green}/${averageRgb.blue}`,
  ...candidates.map((candidate, index) =>
    `${index + 1}: ${candidate.munsell} (${getConfidenceLabel(candidate.confidence)}, 차이 ${candidate.deltaE.toFixed(1)})`
  ),
].join('\n');

const formatSampleUnavailable = (point: SoilColorSamplePoint): string =>
  `${getPointSampleLabel(point)}: RGB를 읽지 못했습니다. 사진을 다시 열거나 다른 지점을 선택하세요.`;

const getPointSampleLabel = (point: SoilColorSamplePoint): string =>
  `사진 선택 지점 ${Math.round(normalizeSampleCoordinate(point.x) / 100)}%/${Math.round(normalizeSampleCoordinate(point.y) / 100)}% 평균 RGB`;

const normalizeSampleCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? clamp(Math.round(value), 0, 10000)
    : 0;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizeRgbSample = (rgb: RgbSample): RgbSample => ({
  blue: clamp(Math.round(rgb.blue), 0, 255),
  green: clamp(Math.round(rgb.green), 0, 255),
  red: clamp(Math.round(rgb.red), 0, 255),
});

const decodeBase64 = (base64: string): Uint8Array => {
  const sanitized = base64
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
    .replace(/\s/g, '');

  if (typeof atob === 'function') {
    const binary = atob(sanitized);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  return decodeBase64Fallback(sanitized);
};

const decodeBase64Fallback = (base64: string): Uint8Array => {
  const lookup = createBase64Lookup();
  const placeholders = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(((base64.length * 3) / 4) - placeholders);
  let byteIndex = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const first = lookup[base64.charAt(i)] ?? 0;
    const second = lookup[base64.charAt(i + 1)] ?? 0;
    const third = base64.charAt(i + 2) === '=' ? 0 : lookup[base64.charAt(i + 2)] ?? 0;
    const fourth = base64.charAt(i + 3) === '=' ? 0 : lookup[base64.charAt(i + 3)] ?? 0;
    const chunk = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 16) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 8) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = chunk & 255;
  }

  return bytes;
};

const createBase64Lookup = (): Record<string, number> => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  return alphabet.split('').reduce<Record<string, number>>((lookup, char, index) => {
    lookup[char] = index;
    return lookup;
  }, {});
};

const getConfidenceLabel = (confidence: SoilColorConfidence): string => {
  if (confidence === 'high') return '높음';
  if (confidence === 'medium') return '보통';
  return '낮음';
};
