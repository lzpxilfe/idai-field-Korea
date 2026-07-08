const MUNSELL_CANDIDATE_PATTERN =
    /\b(?:GLEY\s*[12]\s*\d\/N|(?:10|7\.5|5|2\.5)(?:YR|Y|R)\s+\d(?:\.\d)?\/\d(?:\.\d)?)\b/g;
const SOIL_COLOR_SAMPLE_SOURCE_PATTERN =
    /^사진 (?:중앙부|선택 지점 \d+%\/\d+%) 평균 RGB \d+\/\d+\/\d+$/;
const RGB_SAMPLE_LOCATION_PATTERN = /RGB\s+(\d{1,3})\/(\d{1,3})\/(\d{1,3})\s+@\s*(\d{1,3})%\/(\d{1,3})%/i;
const SOIL_COLOR_ROW_NUMBER_PATTERN = /^\s*(\d+)\s*:/;


export function extractMunsellCandidateOptions(value: unknown): string[] {

    if (typeof value !== 'string') return [];

    const matches = value.toUpperCase().match(MUNSELL_CANDIDATE_PATTERN) ?? [];

    return Array.from(new Set(
        matches.map(match => match.replace(/\s+/g, ' ').trim())
    ));
}


export function getMunsellCandidateSummaryLabel(value: unknown,
                                                maxCandidates: number = 3): string {

    const candidates = extractMunsellCandidateOptions(value).slice(0, maxCandidates);

    return candidates.length > 0
        ? `먼셀 후보 ${candidates.join(', ')}`
        : '';
}


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

    const locations = getTextLines(value)
        .map(line => line.trim())
        .map(line => {
            const sampleMatch = line.match(RGB_SAMPLE_LOCATION_PATTERN);
            if (!sampleMatch) return undefined;

            const rowMatch = line.match(SOIL_COLOR_ROW_NUMBER_PATTERN);
            const rowLabel = rowMatch ? `${rowMatch[1]}층: ` : '';

            return `${rowLabel}RGB ${sampleMatch[1]}/${sampleMatch[2]}/${sampleMatch[3]} @ `
                + `${sampleMatch[4]}%/${sampleMatch[5]}%`;
        })
        .filter((location): location is string => !!location);

    return locations.length > 0 ? locations.join(', ') : '';
}


function getTextLines(value: unknown): string[] {

    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.flatMap(getTextLines);

    if (typeof value === 'object') {
        const record = value as { inputValue?: unknown; value?: unknown };
        if (typeof record.inputValue === 'string') return record.inputValue.split(/\r?\n/);
        if (typeof record.value === 'string') return record.value.split(/\r?\n/);
        return [];
    }

    return String(value).split(/\r?\n/);
}
