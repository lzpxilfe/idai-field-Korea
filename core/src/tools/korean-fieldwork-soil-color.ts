// Shared Korean fieldwork soil-color candidate engine.
// Image decoding stays platform-specific; RGB-to-Munsell matching is shared by tablet and desktop.

export interface RgbSample {
  blue: number;
  green: number;
  red: number;
}

export interface SoilColorCandidate {
  confidence: SoilColorConfidence;
  deltaE: number;
  munsell: string;
  rgb: RgbSample;
}

export type SoilColorConfidence = 'high' | 'medium' | 'low';
export type SoilColorAssistStatus =
  | 'candidatesAvailable'
  | 'lowConfidence'
  | 'notRun';

export interface LabColor {
  a: number;
  b: number;
  l: number;
}

export interface MunsellReference {
  labC: LabColor;
  munsell: string;
  rgb: RgbSample;
}

export interface SoilProfileColorSamplePoint {
  xPercent: number;
  yPercent: number;
}

export interface SoilProfileColorSampleSummary {
  blue: number;
  green: number;
  label: string;
  point?: SoilProfileColorSamplePoint;
  pointLabel?: string;
  red: number;
}

export interface SoilProfileColorSwatchRow {
  munsell: string;
  note: string;
  number: number;
  sample?: SoilProfileColorSampleSummary;
  value: string;
}

interface XyzColor {
  X: number;
  Y: number;
  Z: number;
}

const HIGH_CONFIDENCE_DELTA_E = 3.5;
const LOW_CONFIDENCE_DELTA_E = 8;
const CANDIDATE_COUNT = 5;
const MUNSELL_VALUE_PATTERN =
  /^(GLEY\s*[12]\s*\d(?:\.\d)?\/N|(?:10|7\.5|5|2\.5)(?:R|YR|Y|GY|G|BG|B|PB|P|RP)\s+\d(?:\.\d)?\/\d+(?:\.\d)?|N\s*\d(?:\.\d)?\/0)\s*(.*)$/i;
const RGB_SAMPLE_PATTERN = /\bRGB\s+(\d{1,3})\/(\d{1,3})\/(\d{1,3})\b/i;
const RGB_SAMPLE_NOTE_PATTERN =
  /\s*\bRGB\s+\d{1,3}\/\d{1,3}\/\d{1,3}(?:\s*@\s*\d{1,3}%\/\d{1,3}%)?/gi;
const SAMPLE_POINT_PATTERN = /(\d{1,3})%\/(\d{1,3})%/;

const WHITE_POINT_C: XyzColor = { X: 0.98074, Y: 1, Z: 1.18232 };
const WHITE_POINT_D65: XyzColor = { X: 0.95047, Y: 1, Z: 1.08883 };
const M_CAT02 = [
  [0.7328, 0.4296, -0.1624],
  [-0.7036, 1.6975, 0.0061],
  [0.003, 0.0136, 0.9834],
] as const;
const M_CAT02_INV = [
  [1.096124, -0.278869, 0.182745],
  [0.454369, 0.473533, 0.072098],
  [-0.009628, -0.005698, 1.015326],
] as const;

type MunsellChipXyY = readonly [
  munsell: string,
  x: number,
  y: number,
  luminance: number,
  hex: string,
];

// Chip table adapted from lzpxilfe/munsell_archaeology (MIT), using only
// Munsell code, xyY and display swatch values. Korean color names are
// intentionally excluded so investigators keep naming soil color themselves.
const MUNSELL_ARCHAEOLOGY_CHIP_DATA: readonly MunsellChipXyY[] = [
  ['N 1/0', 0.3101, 0.3163, 0.0121, '#1c1c1c'],
  ['N 2/0', 0.3101, 0.3163, 0.04, '#353535'],
  ['N 3/0', 0.3101, 0.3163, 0.09, '#555555'],
  ['N 4/0', 0.3101, 0.3163, 0.16, '#747474'],
  ['N 5/0', 0.3101, 0.3163, 0.1976, '#878787'],
  ['N 6/0', 0.3101, 0.3163, 0.36, '#9f9f9f'],
  ['N 7/0', 0.3101, 0.3163, 0.49, '#b9b9b9'],
  ['N 8/0', 0.3101, 0.3163, 0.64, '#d1d1d1'],
  ['N 9/0', 0.3101, 0.3163, 0.81, '#e8e8e8'],
  ['2.5R 3/2', 0.3776, 0.3155, 0.09, '#5c3a38'],
  ['2.5R 4/2', 0.3776, 0.3155, 0.16, '#7c524f'],
  ['2.5R 4/4', 0.4164, 0.3093, 0.16, '#8c3d3d'],
  ['2.5R 5/2', 0.3776, 0.3155, 0.1976, '#986e6b'],
  ['2.5R 5/4', 0.4164, 0.3093, 0.1976, '#a85655'],
  ['2.5R 5/6', 0.4517, 0.3027, 0.1976, '#bc3c3e'],
  ['2.5R 5/8', 0.4832, 0.2949, 0.1976, '#cd1e25'],
  ['2.5R 6/2', 0.3776, 0.3155, 0.36, '#b58a87'],
  ['2.5R 6/4', 0.4164, 0.3093, 0.36, '#c87470'],
  ['2.5R 6/6', 0.4517, 0.3027, 0.36, '#dc5857'],
  ['2.5R 7/2', 0.3776, 0.3155, 0.49, '#cfa9a5'],
  ['2.5R 7/4', 0.4164, 0.3093, 0.49, '#e39290'],
  ['5R 3/2', 0.387, 0.3175, 0.09, '#5d3a38'],
  ['5R 4/2', 0.387, 0.3175, 0.16, '#7d524e'],
  ['5R 4/4', 0.4321, 0.3134, 0.16, '#8d3c3e'],
  ['5R 5/2', 0.387, 0.3175, 0.1976, '#996b68'],
  ['5R 5/4', 0.4321, 0.3134, 0.1976, '#aa5355'],
  ['5R 5/6', 0.4718, 0.3083, 0.1976, '#bc3840'],
  ['5R 5/8', 0.509, 0.302, 0.1976, '#cc1a28'],
  ['5R 6/2', 0.387, 0.3175, 0.36, '#b58783'],
  ['5R 6/4', 0.4321, 0.3134, 0.36, '#c97170'],
  ['5R 6/6', 0.4718, 0.3083, 0.36, '#dc545a'],
  ['5R 7/4', 0.4321, 0.3134, 0.49, '#e4918f'],
  ['7.5R 3/2', 0.3939, 0.3211, 0.09, '#5d3a36'],
  ['7.5R 4/2', 0.3939, 0.3211, 0.16, '#7e5249'],
  ['7.5R 4/4', 0.4449, 0.318, 0.16, '#8e3b38'],
  ['7.5R 5/2', 0.3939, 0.3211, 0.1976, '#9a6b65'],
  ['7.5R 5/4', 0.4449, 0.318, 0.1976, '#ab504e'],
  ['7.5R 5/6', 0.49, 0.3135, 0.1976, '#be333b'],
  ['7.5R 6/2', 0.3939, 0.3211, 0.36, '#b58782'],
  ['7.5R 6/4', 0.4449, 0.318, 0.36, '#ca6d6b'],
  ['7.5R 6/6', 0.49, 0.3135, 0.36, '#de5053'],
  ['7.5R 7/4', 0.4449, 0.318, 0.49, '#e48f8c'],
  ['10R 3/2', 0.3971, 0.3264, 0.09, '#5e3b33'],
  ['10R 4/2', 0.3971, 0.3264, 0.16, '#7e5345'],
  ['10R 4/4', 0.4506, 0.3256, 0.16, '#8e3c32'],
  ['10R 4/6', 0.496, 0.3226, 0.16, '#9e2718'],
  ['10R 5/2', 0.3971, 0.3264, 0.1976, '#9b6c60'],
  ['10R 5/4', 0.4506, 0.3256, 0.1976, '#ac5048'],
  ['10R 5/6', 0.496, 0.3226, 0.1976, '#be3630'],
  ['10R 6/2', 0.3971, 0.3264, 0.36, '#b7887a'],
  ['10R 6/4', 0.4506, 0.3256, 0.36, '#cb6e63'],
  ['10R 6/6', 0.496, 0.3226, 0.36, '#df524a'],
  ['10R 7/4', 0.4506, 0.3256, 0.49, '#e6908a'],
  ['2.5YR 2/2', 0.3943, 0.3362, 0.04, '#3d2620'],
  ['2.5YR 3/2', 0.3943, 0.3362, 0.09, '#5f3c2e'],
  ['2.5YR 3/4', 0.444, 0.3382, 0.09, '#6e3020'],
  ['2.5YR 4/2', 0.3943, 0.3362, 0.16, '#7f5442'],
  ['2.5YR 4/4', 0.444, 0.3382, 0.16, '#924535'],
  ['2.5YR 4/6', 0.4866, 0.3381, 0.16, '#a43025'],
  ['2.5YR 4/8', 0.5249, 0.3362, 0.16, '#b61a12'],
  ['2.5YR 5/2', 0.3943, 0.3362, 0.1976, '#9c6d5a'],
  ['2.5YR 5/4', 0.444, 0.3382, 0.1976, '#b05a49'],
  ['2.5YR 5/6', 0.4866, 0.3381, 0.1976, '#c44236'],
  ['2.5YR 5/8', 0.5249, 0.3362, 0.1976, '#d62820'],
  ['2.5YR 6/2', 0.3943, 0.3362, 0.36, '#b98d76'],
  ['2.5YR 6/4', 0.444, 0.3382, 0.36, '#cd7864'],
  ['2.5YR 6/6', 0.4866, 0.3381, 0.36, '#e0604f'],
  ['2.5YR 7/2', 0.3943, 0.3362, 0.49, '#d4ae96'],
  ['2.5YR 7/4', 0.444, 0.3382, 0.49, '#e89a84'],
  ['5YR 2/1', 0.3765, 0.3455, 0.04, '#342420'],
  ['5YR 2/2', 0.3977, 0.3526, 0.04, '#3c2618'],
  ['5YR 3/1', 0.3765, 0.3455, 0.09, '#543e38'],
  ['5YR 3/2', 0.3977, 0.3526, 0.09, '#5f3d2c'],
  ['5YR 3/3', 0.4178, 0.3565, 0.09, '#663825'],
  ['5YR 3/4', 0.4387, 0.3577, 0.09, '#6f3020'],
  ['5YR 4/1', 0.3765, 0.3455, 0.16, '#725751'],
  ['5YR 4/2', 0.3977, 0.3526, 0.16, '#7e5441'],
  ['5YR 4/3', 0.4178, 0.3565, 0.16, '#88503a'],
  ['5YR 4/4', 0.4387, 0.3577, 0.16, '#92482e'],
  ['5YR 4/6', 0.4793, 0.3578, 0.16, '#a5311a'],
  ['5YR 5/1', 0.3765, 0.3455, 0.1976, '#8e7169'],
  ['5YR 5/2', 0.3977, 0.3526, 0.1976, '#9b6d59'],
  ['5YR 5/3', 0.4178, 0.3565, 0.1976, '#a7694e'],
  ['5YR 5/4', 0.4387, 0.3577, 0.1976, '#b06242'],
  ['5YR 5/6', 0.4793, 0.3578, 0.1976, '#c44b29'],
  ['5YR 5/8', 0.5143, 0.3562, 0.1976, '#d8330e'],
  ['5YR 6/1', 0.3765, 0.3455, 0.36, '#a99088'],
  ['5YR 6/2', 0.3977, 0.3526, 0.36, '#b88b77'],
  ['5YR 6/3', 0.4178, 0.3565, 0.36, '#c38568'],
  ['5YR 6/4', 0.4387, 0.3577, 0.36, '#cf7e5b'],
  ['5YR 6/6', 0.4793, 0.3578, 0.36, '#e46a40'],
  ['5YR 6/8', 0.5143, 0.3562, 0.36, '#f65424'],
  ['5YR 7/2', 0.3977, 0.3526, 0.49, '#d3a996'],
  ['5YR 7/3', 0.4178, 0.3565, 0.49, '#dfa489'],
  ['5YR 7/4', 0.4387, 0.3577, 0.49, '#e99e7b'],
  ['5YR 7/6', 0.4793, 0.3578, 0.49, '#ff8860'],
  ['5YR 8/2', 0.3977, 0.3526, 0.64, '#ecc9b6'],
  ['5YR 8/3', 0.4178, 0.3565, 0.64, '#f6c4a7'],
  ['5YR 8/4', 0.4387, 0.3577, 0.64, '#ffbe98'],
  ['7.5YR 2/0', 0.3101, 0.3163, 0.04, '#2e2824'],
  ['7.5YR 3/2', 0.3942, 0.3706, 0.09, '#553e2c'],
  ['7.5YR 3/3', 0.409, 0.3738, 0.09, '#5d3c25'],
  ['7.5YR 3/4', 0.4253, 0.3756, 0.09, '#663a1e'],
  ['7.5YR 4/2', 0.3942, 0.3706, 0.16, '#735741'],
  ['7.5YR 4/3', 0.409, 0.3738, 0.16, '#7c5439'],
  ['7.5YR 4/4', 0.4253, 0.3756, 0.16, '#845132'],
  ['7.5YR 4/6', 0.4574, 0.3776, 0.16, '#954a22'],
  ['7.5YR 5/2', 0.3942, 0.3706, 0.1976, '#8e7059'],
  ['7.5YR 5/3', 0.409, 0.3738, 0.1976, '#996d4e'],
  ['7.5YR 5/4', 0.4253, 0.3756, 0.1976, '#a36a45'],
  ['7.5YR 5/6', 0.4574, 0.3776, 0.1976, '#b36333'],
  ['7.5YR 5/8', 0.4865, 0.3782, 0.1976, '#c55b1e'],
  ['7.5YR 6/2', 0.3942, 0.3706, 0.36, '#aa8f74'],
  ['7.5YR 6/3', 0.409, 0.3738, 0.36, '#b58b67'],
  ['7.5YR 6/4', 0.4253, 0.3756, 0.36, '#bf885c'],
  ['7.5YR 6/6', 0.4574, 0.3776, 0.36, '#cf8048'],
  ['7.5YR 6/8', 0.4865, 0.3782, 0.36, '#e07832'],
  ['7.5YR 7/2', 0.3942, 0.3706, 0.49, '#c6ae95'],
  ['7.5YR 7/3', 0.409, 0.3738, 0.49, '#d1aa87'],
  ['7.5YR 7/4', 0.4253, 0.3756, 0.49, '#dba87a'],
  ['7.5YR 7/6', 0.4574, 0.3776, 0.49, '#eca163'],
  ['7.5YR 7/8', 0.4865, 0.3782, 0.49, '#ff9949'],
  ['7.5YR 8/2', 0.3942, 0.3706, 0.64, '#dfd0b8'],
  ['7.5YR 8/3', 0.409, 0.3738, 0.64, '#e9ccaa'],
  ['7.5YR 8/4', 0.4253, 0.3756, 0.64, '#f3c99c'],
  ['7.5YR 8/6', 0.4574, 0.3776, 0.64, '#ffc284'],
  ['10YR 2/1', 0.3498, 0.3681, 0.04, '#2f2820'],
  ['10YR 2/2', 0.3698, 0.3774, 0.04, '#312618'],
  ['10YR 3/1', 0.3498, 0.3681, 0.09, '#4c4030'],
  ['10YR 3/2', 0.3698, 0.3774, 0.09, '#503e28'],
  ['10YR 3/3', 0.3858, 0.3829, 0.09, '#563c22'],
  ['10YR 3/4', 0.4026, 0.3861, 0.09, '#5c3a1c'],
  ['10YR 4/1', 0.3498, 0.3681, 0.16, '#685c4c'],
  ['10YR 4/2', 0.3698, 0.3774, 0.16, '#6c5a3c'],
  ['10YR 4/3', 0.3858, 0.3829, 0.16, '#745834'],
  ['10YR 4/4', 0.4026, 0.3861, 0.16, '#7c562c'],
  ['10YR 4/6', 0.4311, 0.3891, 0.16, '#8c5018'],
  ['10YR 5/1', 0.3498, 0.3681, 0.1976, '#847862'],
  ['10YR 5/2', 0.3698, 0.3774, 0.1976, '#887452'],
  ['10YR 5/3', 0.3858, 0.3829, 0.1976, '#907248'],
  ['10YR 5/4', 0.4026, 0.3861, 0.1976, '#987040'],
  ['10YR 5/6', 0.4311, 0.3891, 0.1976, '#aa6828'],
  ['10YR 5/8', 0.4564, 0.3895, 0.1976, '#bc6010'],
  ['10YR 6/1', 0.3498, 0.3681, 0.36, '#9d9480'],
  ['10YR 6/2', 0.3698, 0.3774, 0.36, '#a29070'],
  ['10YR 6/3', 0.3858, 0.3829, 0.36, '#aa8e62'],
  ['10YR 6/4', 0.4026, 0.3861, 0.36, '#b28c58'],
  ['10YR 6/6', 0.4311, 0.3891, 0.36, '#c28440'],
  ['10YR 6/8', 0.4564, 0.3895, 0.36, '#d07c28'],
  ['10YR 7/1', 0.3498, 0.3681, 0.49, '#b6b09e'],
  ['10YR 7/2', 0.3698, 0.3774, 0.49, '#bcac90'],
  ['10YR 7/3', 0.3858, 0.3829, 0.49, '#c4aa84'],
  ['10YR 7/4', 0.4026, 0.3861, 0.49, '#cca878'],
  ['10YR 7/6', 0.4311, 0.3891, 0.49, '#dca060'],
  ['10YR 7/8', 0.4564, 0.3895, 0.49, '#ec9848'],
  ['10YR 8/1', 0.3498, 0.3681, 0.64, '#d1ccbc'],
  ['10YR 8/2', 0.3698, 0.3774, 0.64, '#d7c8ae'],
  ['10YR 8/3', 0.3858, 0.3829, 0.64, '#dfc6a0'],
  ['10YR 8/4', 0.4026, 0.3861, 0.64, '#e8c494'],
  ['10YR 8/6', 0.4311, 0.3891, 0.64, '#f8bc78'],
  ['2.5Y 2/0', 0.3101, 0.3163, 0.04, '#2e2a24'],
  ['2.5Y 3/2', 0.3617, 0.3946, 0.09, '#4e422c'],
  ['2.5Y 4/2', 0.3617, 0.3946, 0.16, '#6a5c3e'],
  ['2.5Y 4/4', 0.3803, 0.3997, 0.16, '#725c2e'],
  ['2.5Y 5/2', 0.3617, 0.3946, 0.1976, '#867856'],
  ['2.5Y 5/3', 0.3703, 0.3977, 0.1976, '#8c784c'],
  ['2.5Y 5/4', 0.3803, 0.3997, 0.1976, '#927842'],
  ['2.5Y 5/6', 0.4003, 0.4027, 0.1976, '#9e7830'],
  ['2.5Y 6/2', 0.3617, 0.3946, 0.36, '#9f9674'],
  ['2.5Y 6/3', 0.3703, 0.3977, 0.36, '#a69668'],
  ['2.5Y 6/4', 0.3803, 0.3997, 0.36, '#ae945c'],
  ['2.5Y 6/6', 0.4003, 0.4027, 0.36, '#bc9244'],
  ['2.5Y 7/2', 0.3617, 0.3946, 0.49, '#bab594'],
  ['2.5Y 7/3', 0.3703, 0.3977, 0.49, '#c2b488'],
  ['2.5Y 7/4', 0.3803, 0.3997, 0.49, '#cab27c'],
  ['2.5Y 7/6', 0.4003, 0.4027, 0.49, '#d8b064'],
  ['2.5Y 8/2', 0.3617, 0.3946, 0.64, '#d4d0b4'],
  ['2.5Y 8/3', 0.3703, 0.3977, 0.64, '#ddd0a8'],
  ['2.5Y 8/4', 0.3803, 0.3997, 0.64, '#e6ce9c'],
  ['2.5Y 8/6', 0.4003, 0.4027, 0.64, '#f4cc80'],
  ['5Y 3/1', 0.3274, 0.383, 0.09, '#4c4a3a'],
  ['5Y 3/2', 0.338, 0.3906, 0.09, '#4c4830'],
  ['5Y 4/1', 0.3274, 0.383, 0.16, '#686650'],
  ['5Y 4/2', 0.338, 0.3906, 0.16, '#6a6444'],
  ['5Y 4/3', 0.3482, 0.3958, 0.16, '#70623a'],
  ['5Y 4/4', 0.357, 0.3994, 0.16, '#766030'],
  ['5Y 5/1', 0.3274, 0.383, 0.1976, '#828066'],
  ['5Y 5/2', 0.338, 0.3906, 0.1976, '#847e5a'],
  ['5Y 5/3', 0.3482, 0.3958, 0.1976, '#8a7c50'],
  ['5Y 5/4', 0.357, 0.3994, 0.1976, '#907a46'],
  ['5Y 5/6', 0.3696, 0.4049, 0.1976, '#9c7830'],
  ['5Y 6/1', 0.3274, 0.383, 0.36, '#9b9b84'],
  ['5Y 6/2', 0.338, 0.3906, 0.36, '#9e9878'],
  ['5Y 6/3', 0.3482, 0.3958, 0.36, '#a4966c'],
  ['5Y 6/4', 0.357, 0.3994, 0.36, '#aa9460'],
  ['5Y 7/1', 0.3274, 0.383, 0.49, '#b5b6a2'],
  ['5Y 7/2', 0.338, 0.3906, 0.49, '#b8b296'],
  ['5Y 7/3', 0.3482, 0.3958, 0.49, '#c0b08a'],
  ['5Y 7/4', 0.357, 0.3994, 0.49, '#c8ae7e'],
  ['5Y 8/1', 0.3274, 0.383, 0.64, '#d2d4be'],
  ['5Y 8/2', 0.338, 0.3906, 0.64, '#d5d0b4'],
  ['5Y 8/3', 0.3482, 0.3958, 0.64, '#dccea8'],
  ['5Y 8/4', 0.357, 0.3994, 0.64, '#e4cc9c'],
  ['2.5GY 4/2', 0.3101, 0.4016, 0.16, '#636050'],
  ['2.5GY 5/2', 0.3101, 0.4016, 0.1976, '#7c7c66'],
  ['2.5GY 5/4', 0.3102, 0.42, 0.1976, '#7e7e4e'],
  ['2.5GY 6/2', 0.3101, 0.4016, 0.36, '#969685'],
  ['2.5GY 7/2', 0.3101, 0.4016, 0.49, '#b0b19f'],
  ['5GY 4/1', 0.2979, 0.3948, 0.16, '#60625a'],
  ['5GY 5/2', 0.2979, 0.4218, 0.1976, '#787e60'],
  ['5GY 5/4', 0.2979, 0.4497, 0.1976, '#787e46'],
  ['5GY 6/2', 0.2979, 0.4218, 0.36, '#929880'],
  ['5GY 7/2', 0.2979, 0.4218, 0.49, '#acb298'],
];

const EXTRA_MUNSELL_REFERENCES = [
  { munsell: 'GLEY 1 4/N', rgb: { red: 84, green: 88, blue: 86 } },
  { munsell: 'GLEY 1 5/N', rgb: { red: 112, green: 116, blue: 114 } },
] as const;

export const SOIL_COLOR_MUNSELL_REFERENCES: readonly MunsellReference[] = [
  ...MUNSELL_ARCHAEOLOGY_CHIP_DATA.map(
    ([munsell, x, y, luminance, hex]) => ({
      labC: xyzToLab(xyYToXyz(x, y, luminance), WHITE_POINT_C),
      munsell,
      rgb: hexToRgb(hex),
    })
  ),
  ...EXTRA_MUNSELL_REFERENCES.map(({ munsell, rgb }) => ({
    labC: rgbToMunsellLab(rgb),
    munsell,
    rgb,
  })),
];
const MUNSELL_REFERENCES = SOIL_COLOR_MUNSELL_REFERENCES;

export const getNearestMunsellCandidates = (
  rgb: RgbSample
): SoilColorCandidate[] => {
  const sampleLab = rgbToMunsellLab(rgb);

  return MUNSELL_REFERENCES
    .map((reference) => {
      const difference = deltaE2000(sampleLab, reference.labC);

      return {
        confidence: getConfidence(difference),
        deltaE: difference,
        munsell: reference.munsell,
        rgb: reference.rgb,
      };
    })
    .sort((left, right) => left.deltaE - right.deltaE)
    .slice(0, CANDIDATE_COUNT);
};

export const extractMunsellCandidateOptions = (text: unknown): string[] => {
  if (typeof text !== 'string') return [];

  const matches = text.toUpperCase().match(
    /\b(?:GLEY\s*[12]\s*\d(?:\.\d)?\/N|(?:10|7\.5|5|2\.5)(?:R|YR|Y|GY|G|BG|B|PB|P|RP)\s+\d(?:\.\d)?\/\d+(?:\.\d)?|N\s*\d(?:\.\d)?\/0)\b/g
  ) ?? [];

  return Array.from(new Set(
    matches.map((match) => match.replace(/\s+/g, ' ').trim())
  ));
};

export const hasMunsellCandidateOptions = (text: unknown): boolean =>
  extractMunsellCandidateOptions(text).length > 0;

export const parseSoilProfileColorSwatchRows = (
  currentValue: unknown
): SoilProfileColorSwatchRow[] => {
  const lines = getSoilProfileColorTextLines(currentValue)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [createSoilProfileColorSwatchRow(1, '')];

  return lines.map((line, index) => {
    const match = line.match(/^\s*(\d+)\s*:?\s*(.*)$/);

    if (!match) return createSoilProfileColorSwatchRow(index + 1, line.trim());

    return createSoilProfileColorSwatchRow(
      Number.parseInt(match[1], 10),
      match[2] ?? ''
    );
  });
};

export const createSoilProfileColorSwatchRow = (
  number: number,
  value: string
): SoilProfileColorSwatchRow => {
  const { munsell, note: rawNote } = splitSoilProfileColorSwatchValue(value);
  const sample = getSoilProfileColorSampleSummary(rawNote);
  const note = removeSoilProfileColorSampleSummary(rawNote);

  return {
    munsell,
    note,
    number,
    ...(sample ? { sample } : {}),
    value: formatSoilProfileColorSwatchValue(munsell, note, sample?.label),
  };
};

export const splitSoilProfileColorSwatchValue = (value: string): {
  munsell: string;
  note: string;
} => {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(MUNSELL_VALUE_PATTERN);
  if (!match) {
    return {
      munsell: '',
      note: normalizedValue,
    };
  }

  return {
    munsell: normalizeSoilProfileColorMunsellText(match[1]),
    note: (match[2] ?? '').trim(),
  };
};

export const normalizeSoilProfileColorMunsellText = (value: string): string =>
  value.toUpperCase().replace(/\s+/g, ' ').trim();

export const getSoilProfileColorSampleSummary = (
  value: string
): SoilProfileColorSampleSummary | undefined => {
  const rgbMatch = value.match(RGB_SAMPLE_PATTERN);
  if (!rgbMatch) return undefined;

  const red = Number.parseInt(rgbMatch[1], 10);
  const green = Number.parseInt(rgbMatch[2], 10);
  const blue = Number.parseInt(rgbMatch[3], 10);
  if (![red, green, blue].every(isValidRgbChannel)) return undefined;

  const pointMatch = value.match(SAMPLE_POINT_PATTERN);
  const point = pointMatch
    ? {
      xPercent: clampSamplePercent(Number.parseInt(pointMatch[1], 10)),
      yPercent: clampSamplePercent(Number.parseInt(pointMatch[2], 10)),
    }
    : undefined;
  const pointLabel = point
    ? `${point.xPercent}%/${point.yPercent}%`
    : undefined;

  return {
    blue,
    green,
    label: formatSoilProfileColorSampleLabel(red, green, blue, pointLabel),
    point,
    pointLabel,
    red,
  };
};

export const removeSoilProfileColorSampleSummary = (value: string): string =>
  value
    .replace(RGB_SAMPLE_NOTE_PATTERN, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const formatSoilProfileColorSampleLabel = (
  red: number,
  green: number,
  blue: number,
  pointLabel?: string
): string =>
  [`RGB ${red}/${green}/${blue}`, pointLabel ? `@ ${pointLabel}` : '']
    .filter(Boolean)
    .join(' ');

export const formatSoilProfileColorSwatchValue = (
  munsell: string,
  note: string,
  sampleLabel?: string
): string =>
  [munsell.trim(), note.trim(), sampleLabel?.trim() ?? '']
    .filter(Boolean)
    .join(' ');

export const appendEmptySoilProfileColorSwatchRow = (currentValue: unknown): string => {
  const rows = parseSoilProfileColorSwatchRows(currentValue);
  const nextNumber = Math.max(0, ...rows.map((row) => row.number)) + 1;

  return serializeSoilProfileColorSwatchRows(
    rows.concat(createSoilProfileColorSwatchRow(nextNumber, ''))
  );
};

export const renameSoilProfileColorSwatchRowNumber = (
  currentValue: unknown,
  currentRowNumber: number,
  nextRowNumber: number
): string => {
  const rows = parseSoilProfileColorSwatchRows(currentValue);
  if (rows.some((row) =>
    row.number === nextRowNumber && row.number !== currentRowNumber
  )) {
    return serializeSoilProfileColorSwatchRows(rows);
  }

  return serializeSoilProfileColorSwatchRows(rows.map((row) =>
    row.number === currentRowNumber
      ? { ...row, number: nextRowNumber }
      : row
  ));
};

export const updateSoilProfileColorSwatchMunsellValue = (
  currentValue: unknown,
  rowNumber: number,
  nextMunsell: string
): string => {
  const rows = parseSoilProfileColorSwatchRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const nextRows = rowIndex < 0
    ? rows.concat(createSoilProfileColorSwatchRow(rowNumber, nextMunsell))
    : rows.map((row, index) =>
      index === rowIndex
        ? createSoilProfileColorSwatchRow(
          row.number,
          formatSoilProfileColorSwatchValue(nextMunsell, row.note, row.sample?.label)
        )
        : row
    );

  return serializeSoilProfileColorSwatchRows(nextRows);
};

export const updateSoilProfileColorSwatchNoteValue = (
  currentValue: unknown,
  rowNumber: number,
  nextNote: string
): string => {
  const rows = parseSoilProfileColorSwatchRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const nextRows = rowIndex < 0
    ? rows.concat(createSoilProfileColorSwatchRow(rowNumber, nextNote))
    : rows.map((row, index) =>
      index === rowIndex
        ? createSoilProfileColorSwatchRow(
          row.number,
          formatSoilProfileColorSwatchValue(row.munsell, nextNote, row.sample?.label)
        )
        : row
    );

  return serializeSoilProfileColorSwatchRows(nextRows);
};

export const updateSoilProfileColorSwatchSampleValue = (
  currentValue: unknown,
  rowNumber: number,
  nextMunsell: string,
  assistCandidateText: unknown
): string => {
  const rows = parseSoilProfileColorSwatchRows(currentValue);
  const rowIndex = rows.findIndex((row) => row.number === rowNumber);
  const sample = getSoilProfileColorSampleSummary(
    getSoilProfileColorTextLines(assistCandidateText).join('\n')
  );
  const formatSampledValue = (note = '') =>
    formatSoilProfileColorSwatchValue(nextMunsell, note, sample?.label);
  const nextRows = rowIndex < 0
    ? rows.concat(createSoilProfileColorSwatchRow(rowNumber, formatSampledValue()))
    : rows.map((row, index) =>
      index === rowIndex
        ? createSoilProfileColorSwatchRow(row.number, formatSampledValue(row.note))
        : row
    );

  return serializeSoilProfileColorSwatchRows(nextRows);
};

export const serializeSoilProfileColorSwatchRows = (
  rows: SoilProfileColorSwatchRow[]
): string =>
  rows
    .sort((left, right) => left.number - right.number)
    .map((row) => `${row.number}: ${row.value}`)
    .join('\n');

export const getSoilProfileColorTextLines = (value: unknown): string[] => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(getSoilProfileColorTextLines);

  if (typeof value === 'object') {
    const record = value as { inputValue?: unknown; value?: unknown };
    if (record.inputValue !== undefined) return getSoilProfileColorTextLines(record.inputValue);
    if (record.value !== undefined) return getSoilProfileColorTextLines(record.value);
    return [];
  }

  const text = String(value);
  if (text.trim() === '[]') return [];

  return text.split(/\r?\n/);
};

const isValidRgbChannel = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 255;

const clampSamplePercent = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;

function hexToRgb(hex: string): RgbSample {
  return {
    blue: Number.parseInt(hex.slice(5, 7), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    red: Number.parseInt(hex.slice(1, 3), 16),
  };
}

function rgbToMunsellLab(rgb: RgbSample): LabColor {
  return xyzToLab(adaptD65ToC(rgbToXyzD65(rgb)), WHITE_POINT_C);
}

function rgbToXyzD65(rgb: RgbSample): XyzColor {
  const red = srgbToLinear(rgb.red / 255);
  const green = srgbToLinear(rgb.green / 255);
  const blue = srgbToLinear(rgb.blue / 255);

  return {
    X: (0.4124564 * red) + (0.3575761 * green) + (0.1804375 * blue),
    Y: (0.2126729 * red) + (0.7151522 * green) + (0.072175 * blue),
    Z: (0.0193339 * red) + (0.119192 * green) + (0.9503041 * blue),
  };
}

function adaptD65ToC(xyz: XyzColor): XyzColor {
  const sourceLms = multiplyMatrixVector(M_CAT02, [
    WHITE_POINT_D65.X,
    WHITE_POINT_D65.Y,
    WHITE_POINT_D65.Z,
  ]);
  const targetLms = multiplyMatrixVector(M_CAT02, [
    WHITE_POINT_C.X,
    WHITE_POINT_C.Y,
    WHITE_POINT_C.Z,
  ]);
  const inputLms = multiplyMatrixVector(M_CAT02, [xyz.X, xyz.Y, xyz.Z]);
  const adaptedLms = [
    inputLms[0] * (targetLms[0] / sourceLms[0]),
    inputLms[1] * (targetLms[1] / sourceLms[1]),
    inputLms[2] * (targetLms[2] / sourceLms[2]),
  ];
  const adapted = multiplyMatrixVector(M_CAT02_INV, adaptedLms);

  return {
    X: adapted[0],
    Y: adapted[1],
    Z: adapted[2],
  };
}

function xyYToXyz(x: number, y: number, luminance: number): XyzColor {
  if (y === 0) return { X: 0, Y: 0, Z: 0 };

  return {
    X: (x / y) * luminance,
    Y: luminance,
    Z: ((1 - x - y) / y) * luminance,
  };
}

function xyzToLab(xyz: XyzColor, whitePoint: XyzColor): LabColor {
  const fx = labPivot(xyz.X / whitePoint.X);
  const fy = labPivot(xyz.Y / whitePoint.Y);
  const fz = labPivot(xyz.Z / whitePoint.Z);

  return {
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
    l: (116 * fy) - 16,
  };
}

function multiplyMatrixVector(
  matrix: readonly (readonly number[])[],
  vector: readonly [number, number, number] | readonly number[]
): [number, number, number] {
  return [
    (matrix[0][0] * vector[0]) + (matrix[0][1] * vector[1]) + (matrix[0][2] * vector[2]),
    (matrix[1][0] * vector[0]) + (matrix[1][1] * vector[1]) + (matrix[1][2] * vector[2]),
    (matrix[2][0] * vector[0]) + (matrix[2][1] * vector[1]) + (matrix[2][2] * vector[2]),
  ];
}

function srgbToLinear(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function labPivot(value: number): number {
  return value > 0.008856
    ? Math.cbrt(value)
    : (7.787 * value) + (16 / 116);
}

const degreesToRadians = (degrees: number): number =>
  (degrees * Math.PI) / 180;

const deltaE2000 = (left: LabColor, right: LabColor): number => {
  const kL = 1;
  const kC = 1;
  const kH = 1;
  const c1 = Math.sqrt(Math.pow(left.a, 2) + Math.pow(left.b, 2));
  const c2 = Math.sqrt(Math.pow(right.a, 2) + Math.pow(right.b, 2));
  const cMean = (c1 + c2) / 2;
  const cMean7 = Math.pow(cMean, 7);
  const g = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + Math.pow(25, 7))));
  const a1Prime = left.a * (1 + g);
  const a2Prime = right.a * (1 + g);
  const c1Prime = Math.sqrt(Math.pow(a1Prime, 2) + Math.pow(left.b, 2));
  const c2Prime = Math.sqrt(Math.pow(a2Prime, 2) + Math.pow(right.b, 2));
  const h1Prime = ((Math.atan2(left.b, a1Prime) * 180) / Math.PI + 360) % 360;
  const h2Prime = ((Math.atan2(right.b, a2Prime) * 180) / Math.PI + 360) % 360;
  const deltaLPrime = right.l - left.l;
  const deltaCPrime = c2Prime - c1Prime;
  let deltaHPrime: number;

  if (c1Prime * c2Prime === 0) {
    deltaHPrime = 0;
  } else if (Math.abs(h2Prime - h1Prime) <= 180) {
    deltaHPrime = h2Prime - h1Prime;
  } else if (h2Prime - h1Prime > 180) {
    deltaHPrime = h2Prime - h1Prime - 360;
  } else {
    deltaHPrime = h2Prime - h1Prime + 360;
  }

  const deltaH = 2 * Math.sqrt(c1Prime * c2Prime)
    * Math.sin(degreesToRadians(deltaHPrime / 2));
  const lPrimeMean = (left.l + right.l) / 2;
  const cPrimeMean = (c1Prime + c2Prime) / 2;
  let hPrimeMean: number;

  if (c1Prime * c2Prime === 0) {
    hPrimeMean = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    hPrimeMean = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    hPrimeMean = (h1Prime + h2Prime + 360) / 2;
  } else {
    hPrimeMean = (h1Prime + h2Prime - 360) / 2;
  }

  const t = 1
    - (0.17 * Math.cos(degreesToRadians(hPrimeMean - 30)))
    + (0.24 * Math.cos(degreesToRadians(2 * hPrimeMean)))
    + (0.32 * Math.cos(degreesToRadians((3 * hPrimeMean) + 6)))
    - (0.2 * Math.cos(degreesToRadians((4 * hPrimeMean) - 63)));
  const sL = 1
    + (0.015 * Math.pow(lPrimeMean - 50, 2))
    / Math.sqrt(20 + Math.pow(lPrimeMean - 50, 2));
  const sC = 1 + (0.045 * cPrimeMean);
  const sH = 1 + (0.015 * cPrimeMean * t);
  const cPrimeMean7 = Math.pow(cPrimeMean, 7);
  const rT = -2
    * Math.sqrt(cPrimeMean7 / (cPrimeMean7 + Math.pow(25, 7)))
    * Math.sin(degreesToRadians(
      60 * Math.exp(-Math.pow((hPrimeMean - 275) / 25, 2))
    ));

  return Math.sqrt(
    Math.pow(deltaLPrime / (kL * sL), 2)
    + Math.pow(deltaCPrime / (kC * sC), 2)
    + Math.pow(deltaH / (kH * sH), 2)
    + rT
      * (deltaCPrime / (kC * sC))
      * (deltaH / (kH * sH))
  );
};

const getConfidence = (difference: number): SoilColorConfidence => {
  if (difference <= HIGH_CONFIDENCE_DELTA_E) return 'high';
  if (difference <= LOW_CONFIDENCE_DELTA_E) return 'medium';
  return 'low';
};
