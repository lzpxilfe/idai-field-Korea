const MUNSELL_CANDIDATE_PATTERN =
    /\b(?:GLEY\s*[12]\s*\d\/N|(?:10|7\.5|5|2\.5)(?:YR|Y|R)\s+\d(?:\.\d)?\/\d(?:\.\d)?)\b/g;
const SOIL_COLOR_SAMPLE_SOURCE_PATTERN =
    /^사진 (?:중앙부|선택 지점 \d+%\/\d+%) 평균 RGB \d+\/\d+\/\d+$/;


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


export function getSoilColorSampleSourceLabel(value: unknown): string {

    if (typeof value !== 'string') return '';

    return value
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(line => SOIL_COLOR_SAMPLE_SOURCE_PATTERN.test(line))
        ?? '';
}
