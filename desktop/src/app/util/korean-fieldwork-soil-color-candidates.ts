import {
    extractMunsellCandidateOptions as extractCoreMunsellCandidateOptions,
    getMunsellCandidateSummaryLabel as getCoreMunsellCandidateSummaryLabel,
    parseSoilProfileColorSwatchRows
} from 'idai-field-core';

const SOIL_COLOR_SAMPLE_SOURCE_PATTERN =
    /^\uc0ac\uc9c4 (?:\uc911\uc559\ubd80|\uc120\ud0dd \uc9c0\uc810 \d+%\/\d+%) \ud3c9\uade0 RGB \d+\/\d+\/\d+$/;


export const extractMunsellCandidateOptions = extractCoreMunsellCandidateOptions;
export const getMunsellCandidateSummaryLabel = getCoreMunsellCandidateSummaryLabel;


export function getSoilColorSampleSourceLabel(value: unknown, swatchValue?: unknown): string {

    const swatchLocationLabel = getSoilColorSampleLocationFromSwatches(swatchValue);
    if (swatchLocationLabel) return swatchLocationLabel;

    if (typeof value !== 'string') return '';

    return value
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(line => SOIL_COLOR_SAMPLE_SOURCE_PATTERN.test(line))
        ?? '';
}


function getSoilColorSampleLocationFromSwatches(value: unknown): string {

    const locations = parseSoilProfileColorSwatchRows(value)
        .map(row => row.sample ? `${row.number}\uce35: ${row.sample.label}` : undefined)
        .filter((location): location is string => !!location);

    return locations.length > 0 ? locations.join(', ') : '';
}
