export interface KoreanFieldworkPitLinePoint {
    x: number;
    y: number;
}

export interface KoreanFieldworkFeaturePitLineSummary {
    end: KoreanFieldworkPitLinePoint;
    label: string;
    start: KoreanFieldworkPitLinePoint;
    text: string;
}

export function getKoreanFieldworkFeaturePitLineSummaries(
        resource: Record<string, any>|undefined
): KoreanFieldworkFeaturePitLineSummary[] {

    if (!resource) return [];

    const lines = normalizeFeaturePitLines(
        resource.featureSoilPitLines,
        resource.featureSoilPitLine
    );

    return lines.map((line, index) => {
        const label = line.label || `${index + 1}`;

        return {
            ...line,
            label,
            text: getPitLineText(label, line.start, line.end)
        };
    });
}

export function getKoreanFieldworkFeaturePitLineSummaryLabel(
        resource: Record<string, any>|undefined
): string|undefined {

    const count = getKoreanFieldworkFeaturePitLineSummaries(resource).length;

    return count > 0 ? `\ud53c\ud2b8\uc120 ${count}` : undefined;
}

function normalizeFeaturePitLines(value: any, legacyValue: any): KoreanFieldworkFeaturePitLineSummary[] {

    const lines = getRawFeaturePitLineItems(value)
        .map((line, index) => normalizeFeaturePitLine(line, index))
        .filter((line): line is KoreanFieldworkFeaturePitLineSummary => !!line);

    if (lines.length > 0) return lines;

    const legacyLine = normalizeFeaturePitLine(legacyValue, 0);

    return legacyLine ? [legacyLine] : [];
}

function getRawFeaturePitLineItems(value: any): any[] {

    const rawValue = parseMaybeJson(value);
    if (Array.isArray(rawValue)) return rawValue;
    if (!isRecord(rawValue)) return [];

    if (Array.isArray(rawValue.lines)) return rawValue.lines;
    if (Array.isArray(rawValue.items)) return rawValue.items;

    return rawValue.start || rawValue.end || rawValue.points ? [rawValue] : [];
}

function normalizeFeaturePitLine(value: any, index: number): KoreanFieldworkFeaturePitLineSummary|undefined {

    const rawValue = parseMaybeJson(value);
    if (!isRecord(rawValue)) return undefined;

    const points = Array.isArray(rawValue.points)
        ? rawValue.points
            .map(normalizePoint)
            .filter((point): point is KoreanFieldworkPitLinePoint => !!point)
        : [];
    const start = points[0] ?? normalizePoint(rawValue.start);
    const end = points.length >= 2
        ? points[points.length - 1]
        : normalizePoint(rawValue.end);

    if (!start || !end) return undefined;

    const label = typeof rawValue.label === 'string' && rawValue.label.trim()
        ? rawValue.label.trim()
        : `${index + 1}`;

    return {
        end,
        label,
        start,
        text: getPitLineText(label, start, end)
    };
}

function normalizePoint(value: any): KoreanFieldworkPitLinePoint|undefined {

    const rawValue = parseMaybeJson(value);
    if (!isRecord(rawValue)) return undefined;

    const x = normalizeCoordinate(rawValue.x);
    const y = normalizeCoordinate(rawValue.y);

    return x === undefined || y === undefined ? undefined : { x, y };
}

function normalizeCoordinate(value: any): number|undefined {

    const numberValue = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value)
            : NaN;

    if (!Number.isFinite(numberValue)) return undefined;

    return Math.max(0, Math.min(100, numberValue));
}

function getPitLineText(label: string,
                        start: KoreanFieldworkPitLinePoint,
                        end: KoreanFieldworkPitLinePoint): string {

    return `\ud53c\ud2b8\uc120 ${label}: \uc2dc\uc791 ${formatPoint(start)}, \ub05d ${formatPoint(end)}`;
}

function formatPoint(point: KoreanFieldworkPitLinePoint): string {

    return `${formatPercent(point.x)}%/${formatPercent(point.y)}%`;
}

function formatPercent(value: number): string {

    const rounded = Math.round(value * 10) / 10;

    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function parseMaybeJson(value: any): any {

    if (typeof value !== 'string') return value;

    const text = value.trim();
    if (!text) return undefined;

    if (!['[', '{'].includes(text[0])) return value;

    try {
        return JSON.parse(text);
    } catch (_) {
        return value;
    }
}

function isRecord(value: any): value is Record<string, any> {

    return !!value && typeof value === 'object' && !Array.isArray(value);
}
