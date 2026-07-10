export interface KoreanFieldworkFindSpotPoint {
    x: number;
    y: number;
}

export interface KoreanFieldworkFindSpotSummary {
    label?: string;
    number: number;
    point: KoreanFieldworkFindSpotPoint;
    text: string;
}

export function getKoreanFieldworkFindSpotSummaries(value: any): KoreanFieldworkFindSpotSummary[] {

    return getRawFindSpotItems(value)
        .map(normalizeFindSpotItem)
        .filter((item): item is KoreanFieldworkFindSpotSummary => !!item)
        .sort((itemA, itemB) => itemA.number - itemB.number);
}

export function getKoreanFieldworkFindSpotSummaryText(value: any): string|undefined {

    const items = getKoreanFieldworkFindSpotSummaries(value);

    return items.length > 0
        ? items.map(item => item.text).join(', ')
        : undefined;
}

export function getKoreanFieldworkFindSpotCountLabel(value: any,
                                                     label: string = '\uc704\uce58\uc810'): string|undefined {

    const count = getKoreanFieldworkFindSpotSummaries(value).length;

    return count > 0 ? `${label} ${count}` : undefined;
}

function getRawFindSpotItems(value: any): any[] {

    const rawValue = parseMaybeJson(value);
    if (Array.isArray(rawValue)) return rawValue;
    if (!isRecord(rawValue)) return [];

    return Array.isArray(rawValue.items) ? rawValue.items : [];
}

function normalizeFindSpotItem(value: any): KoreanFieldworkFindSpotSummary|undefined {

    const rawValue = parseMaybeJson(value);
    if (!isRecord(rawValue) || !isRecord(rawValue.point)) return undefined;

    const number = normalizePositiveInteger(rawValue.number);
    const x = normalizePercent(rawValue.point.x);
    const y = normalizePercent(rawValue.point.y);
    if (number === undefined || x === undefined || y === undefined) return undefined;

    const label = getTextValue(rawValue.label);
    const point = { x, y };
    const text = getFindSpotItemText(number, point, label);

    return { label, number, point, text };
}

function getFindSpotItemText(number: number,
                             point: KoreanFieldworkFindSpotPoint,
                             label: string|undefined): string {

    const coordinates = `${formatPercent(point.x)}%/${formatPercent(point.y)}%`;
    const prefix = `${number}\ubc88 ${coordinates}`;

    return label ? `${prefix} ${label}` : prefix;
}

function normalizePositiveInteger(value: any): number|undefined {

    const numberValue = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value)
            : NaN;

    return Number.isInteger(numberValue) && numberValue > 0
        ? numberValue
        : undefined;
}

function normalizePercent(value: any): number|undefined {

    const numberValue = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value)
            : NaN;

    return Number.isFinite(numberValue)
        ? Math.min(100, Math.max(0, numberValue))
        : undefined;
}

function formatPercent(value: number): string {

    const rounded = Math.round(value * 10) / 10;

    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getTextValue(value: any): string|undefined {

    if (typeof value !== 'string') return undefined;

    return value.trim() || undefined;
}

function parseMaybeJson(value: any): any {

    if (typeof value !== 'string') return value;

    const text = value.trim();
    if (!text || !['[', '{'].includes(text[0])) return value;

    try {
        return JSON.parse(text);
    } catch (_) {
        return value;
    }
}

function isRecord(value: any): value is Record<string, any> {

    return !!value && typeof value === 'object' && !Array.isArray(value);
}
