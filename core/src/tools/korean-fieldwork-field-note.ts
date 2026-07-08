import { Document } from '../model/document/document';
import {
    getKoreanFieldworkCategoryLabel,
    KOREAN_FIELDWORK_CATEGORIES
} from './korean-fieldwork-record-contract';


export type KoreanFieldworkFieldNoteSectionId =
    'observation'|'interpretation'|'nextWork'|'evidenceNumbers';

export interface KoreanFieldworkFieldNoteInput {
    observation?: string;
    interpretation?: string;
    nextWork?: string;
    evidenceNumbers?: string;
}

export interface KoreanFieldworkParsedFieldNote {
    fallbackLines: string[];
    hasHandwritingEvidence: boolean;
    handwritingSummary?: string;
    sections: Record<KoreanFieldworkFieldNoteSectionId, string>;
}

export interface KoreanFieldworkFieldNoteReportPreview {
    title: string;
    sentence: string;
    supportingDetail: string;
    missingParts: string[];
}

export interface KoreanFieldworkFieldNoteParseOptions {
    collectFallbackLines?: boolean;
    omitJsonLines?: boolean;
    stripDailyLogEntryPrefix?: boolean;
}

export const KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS:
Readonly<Record<KoreanFieldworkFieldNoteSectionId, string>> = {
    observation: '\uad00\ucc30 \ub0b4\uc6a9',
    interpretation: '\ud574\uc11d',
    nextWork: '\ub2e4\uc74c \uc791\uc5c5',
    evidenceNumbers: '\uc0ac\uc9c4\u00b7\ub3c4\uba74\u00b7\uc2a4\ucf00\uce58\u00b7\uc720\ubb3c\u00b7\uc2dc\ub8cc \ubc88\ud638'
};

export const KOREAN_FIELDWORK_FIELD_NOTE_SUMMARY_LABELS:
Readonly<Record<KoreanFieldworkFieldNoteSectionId, string>> = {
    observation: '\uad00\ucc30',
    interpretation: '\ud574\uc11d',
    nextWork: '\ub2e4\uc74c \uc791\uc5c5',
    evidenceNumbers: '\uadfc\uac70 \ubc88\ud638'
};

export const KOREAN_FIELDWORK_FIELD_NOTE_SECTION_DEFINITIONS:
ReadonlyArray<{ id: KoreanFieldworkFieldNoteSectionId; label: string }> = [
    { id: 'observation', label: KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.observation },
    { id: 'interpretation', label: KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.interpretation },
    { id: 'nextWork', label: KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.nextWork },
    { id: 'evidenceNumbers', label: KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.evidenceNumbers }
];

export const KOREAN_FIELDWORK_FIELD_NOTE_HANDWRITING_SUMMARY_LABEL =
    '\uc190\uadf8\ub9bc \uba54\ubaa8';

export const KOREAN_FIELDWORK_FIELD_NOTE_HANDWRITING_COORDINATE_LABELS = new Set([
    '\uc190\uadf8\ub9bc \uc88c\ud45c',
    '\uc190\uadf8\ub9bc \uba54\ubaa8 \uc88c\ud45c'
]);

const KOREAN_FIELDWORK_FIELD_NOTE_SECTION_IDS: Readonly<Record<string, KoreanFieldworkFieldNoteSectionId>> = {
    [KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.observation]: 'observation',
    [KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.interpretation]: 'interpretation',
    [KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.nextWork]: 'nextWork',
    [KOREAN_FIELDWORK_FIELD_NOTE_SECTION_LABELS.evidenceNumbers]: 'evidenceNumbers',
    '\uc0ac\uc9c4\u00b7\ub3c4\uba74\u00b7\uc720\ubb3c\u00b7\uc2dc\ub8cc \ubc88\ud638': 'evidenceNumbers',
    '\uc2a4\ucf00\uce58\u00b7\uc57d\uce21/\uadfc\uac70 \ubc88\ud638': 'evidenceNumbers',
    '\uadfc\uac70 \ubc88\ud638': 'evidenceNumbers'
};

const KOREAN_FIELDWORK_FIELD_NOTE_NEXT_WORK_CATEGORIES = new Set<string>([
    KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    KOREAN_FIELDWORK_CATEGORIES.FEATURE_SEGMENT,
    KOREAN_FIELDWORK_CATEGORIES.TRENCH,
    KOREAN_FIELDWORK_CATEGORIES.FIND,
    KOREAN_FIELDWORK_CATEGORIES.SAMPLE
]);

export const normalizeKoreanFieldworkFieldNoteText = (text: string): string =>
    text.replace(/\r\n/g, '\n').trim();


export function buildKoreanFieldworkFieldNoteText(input: KoreanFieldworkFieldNoteInput): string {

    return KOREAN_FIELDWORK_FIELD_NOTE_SECTION_DEFINITIONS
        .map(section => formatKoreanFieldworkFieldNoteSection(section.label, input[section.id]))
        .filter((section): section is string => !!section)
        .join('\n');
}


export function extractKoreanFieldworkFieldNoteInput(text: string): KoreanFieldworkFieldNoteInput {

    return trimKoreanFieldworkFieldNoteInput(parseKoreanFieldworkFieldNote(text).sections);
}


export function parseKoreanFieldworkFieldNote(
        value: unknown,
        options: KoreanFieldworkFieldNoteParseOptions = {}
): KoreanFieldworkParsedFieldNote {

    const result: KoreanFieldworkParsedFieldNote = {
        fallbackLines: [],
        hasHandwritingEvidence: false,
        handwritingSummary: undefined,
        sections: createEmptyKoreanFieldworkFieldNoteInput()
    };
    let currentSection: KoreanFieldworkFieldNoteSectionId|undefined;

    getKoreanFieldworkFieldNoteTextLines(value).forEach(rawLine => {
        const line = normalizeKoreanFieldworkFieldNoteLine(rawLine, options);
        if (!line) return;

        const headingMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (headingMatch) {
            const heading = headingMatch[1].trim();
            const text = headingMatch[2].trim();
            const sectionId = getKoreanFieldworkFieldNoteSectionId(heading);

            currentSection = sectionId;
            if (sectionId) {
                appendKoreanFieldworkFieldNoteInputLine(result.sections, sectionId, text, options);
            } else {
                handleKoreanFieldworkFieldNoteSpecialLine(result, heading, text, options);
            }
            return;
        }

        if (currentSection) {
            appendKoreanFieldworkFieldNoteInputLine(result.sections, currentSection, line, options);
        } else if (options.collectFallbackLines !== false && !isLikelyJsonText(line)) {
            result.fallbackLines.push(line);
        }
    });

    return result;
}


export function trimKoreanFieldworkFieldNoteInput(
        input: KoreanFieldworkFieldNoteInput
): KoreanFieldworkFieldNoteInput {

    return {
        observation: normalizeKoreanFieldworkFieldNoteText(input.observation ?? ''),
        interpretation: normalizeKoreanFieldworkFieldNoteText(input.interpretation ?? ''),
        nextWork: normalizeKoreanFieldworkFieldNoteText(input.nextWork ?? ''),
        evidenceNumbers: normalizeKoreanFieldworkFieldNoteText(input.evidenceNumbers ?? '')
    };
}


export function removeEmptyKoreanFieldworkFieldNoteInputValues(
        input: KoreanFieldworkFieldNoteInput
): KoreanFieldworkFieldNoteInput {

    return Object.fromEntries(
        Object.entries(input).filter(([, value]) =>
            typeof value === 'string' && value.length > 0
        )
    ) as KoreanFieldworkFieldNoteInput;
}


export function hasAnyKoreanFieldworkFieldNoteInput(input: KoreanFieldworkFieldNoteInput): boolean {

    return KOREAN_FIELDWORK_FIELD_NOTE_SECTION_DEFINITIONS.some(section =>
        normalizeKoreanFieldworkFieldNoteText(input[section.id] ?? '').length > 0
    );
}


export function hasMeaningfulKoreanFieldworkFieldNoteText(text: string): boolean {

    const noteText = normalizeKoreanFieldworkFieldNoteText(text);
    if (!noteText) return false;

    if (hasAnyKoreanFieldworkFieldNoteInput(extractKoreanFieldworkFieldNoteInput(noteText))) return true;

    return noteText.split('\n').some(rawLine => {
        const line = stripKoreanFieldworkDailyLogEntryPrefix(rawLine.trim());
        return line.length > 0 && !isKoreanFieldworkFieldNoteSectionHeadingOnly(line);
    });
}


export function getKoreanFieldworkFieldNoteReportPreview(
        input: KoreanFieldworkFieldNoteInput,
        document: Document
): KoreanFieldworkFieldNoteReportPreview|undefined {

    const observation = normalizeKoreanFieldworkFieldNoteText(input.observation ?? '');
    if (!observation) return undefined;

    const interpretation = normalizeKoreanFieldworkFieldNoteText(input.interpretation ?? '');
    const nextWork = normalizeKoreanFieldworkFieldNoteText(input.nextWork ?? '');
    const evidenceNumbers = normalizeKoreanFieldworkFieldNoteText(input.evidenceNumbers ?? '');
    const recordLabel = document.resource.identifier || document.resource.id;
    const categoryLabel = getKoreanFieldworkCategoryLabel(document.resource.category);
    const missingParts = [
        !interpretation ? '\uad00\ucc30\uacfc \uad6c\ubd84\ud55c \ud574\uc11d' : undefined,
        !evidenceNumbers ? '\uc0ac\uc9c4\u00b7\ub3c4\uba74\u00b7\uc2a4\ucf00\uce58\u00b7\uc720\ubb3c\u00b7\uc2dc\ub8cc \ubc88\ud638' : undefined,
        !nextWork && shouldPromptKoreanFieldworkFieldNoteNextWork(document) ? '\ub2e4\uc74c \uc791\uc5c5' : undefined
    ].filter((part): part is string => !!part);

    return {
        title: `${recordLabel} \ubcf4\uace0\uc11c \uc815\ub9ac \ubb38\uc7a5`,
        sentence: [
            `${formatKoreanFieldworkFieldNoteReportSubject(categoryLabel, recordLabel)} `
                + `${trimKoreanFieldworkFieldNoteSentenceEnd(observation)}.`,
            interpretation
                ? ` ${trimKoreanFieldworkFieldNoteSentenceEnd(interpretation)}.`
                : undefined
        ].join(''),
        supportingDetail: [
            evidenceNumbers ? `\uadfc\uac70 \ubc88\ud638: ${evidenceNumbers}` : undefined,
            nextWork ? `\ub2e4\uc74c \uc791\uc5c5: ${nextWork}` : undefined
        ].filter((value): value is string => !!value).join(' \u00b7 '),
        missingParts
    };
}


export function shouldPromptKoreanFieldworkFieldNoteNextWork(document: Document): boolean {

    return KOREAN_FIELDWORK_FIELD_NOTE_NEXT_WORK_CATEGORIES.has(document.resource.category);
}


export function getKoreanFieldworkFieldNoteSectionId(
        label: string
): KoreanFieldworkFieldNoteSectionId|undefined {

    return KOREAN_FIELDWORK_FIELD_NOTE_SECTION_IDS[label];
}


export function stripKoreanFieldworkDailyLogEntryPrefix(line: string): string {

    return line.replace(/^\d{2}:\d{2}\s+.+?\s-\s+/, '');
}


export function stripKoreanFieldworkFieldNoteSectionLabel(line: string): string {

    return line.replace(/^\[[^\]]+\]\s*/, '');
}


export function formatKoreanFieldworkFieldNoteSection(label: string, value?: string): string|undefined {

    const text = normalizeKoreanFieldworkFieldNoteText(value ?? '');

    return text ? `[${label}] ${text}` : undefined;
}


function trimKoreanFieldworkFieldNoteSentenceEnd(text: string): string {

    return normalizeKoreanFieldworkFieldNoteText(text).replace(/[.\u3002\uff0e\s]+$/g, '');
}


function formatKoreanFieldworkFieldNoteReportSubject(
        categoryLabel: string,
        recordLabel: string
): string {

    const subjectLabel = recordLabel.startsWith(categoryLabel)
        ? recordLabel
        : `${categoryLabel} ${recordLabel}`;

    return `${subjectLabel}${getKoreanFieldworkSubjectParticle(recordLabel)}`;
}


function getKoreanFieldworkSubjectParticle(text: string): '\uc740'|'\ub294' {

    const lastCharacter = normalizeKoreanFieldworkFieldNoteText(text).slice(-1);
    if (!lastCharacter) return '\ub294';

    const digitSubjectParticles: Record<string, '\uc740'|'\ub294'> = {
        '0': '\uc740',
        '1': '\uc740',
        '2': '\ub294',
        '3': '\uc740',
        '4': '\ub294',
        '5': '\ub294',
        '6': '\uc740',
        '7': '\uc740',
        '8': '\uc740',
        '9': '\ub294'
    };
    if (digitSubjectParticles[lastCharacter]) return digitSubjectParticles[lastCharacter];

    const codePoint = lastCharacter.charCodeAt(0);
    if (codePoint < 0xac00 || codePoint > 0xd7a3) return '\ub294';

    return (codePoint - 0xac00) % 28 === 0 ? '\ub294' : '\uc740';
}


function createEmptyKoreanFieldworkFieldNoteInput(): Record<KoreanFieldworkFieldNoteSectionId, string> {

    return {
        observation: '',
        interpretation: '',
        nextWork: '',
        evidenceNumbers: ''
    };
}


function normalizeKoreanFieldworkFieldNoteLine(
        line: string,
        options: KoreanFieldworkFieldNoteParseOptions
): string {

    const strippedLine = options.stripDailyLogEntryPrefix === false
        ? line
        : stripKoreanFieldworkDailyLogEntryPrefix(line);

    return strippedLine.trim();
}


function appendKoreanFieldworkFieldNoteInputLine(
        input: Record<KoreanFieldworkFieldNoteSectionId, string>,
        sectionId: KoreanFieldworkFieldNoteSectionId,
        value: string,
        options: KoreanFieldworkFieldNoteParseOptions
) {

    if (!value || (options.omitJsonLines && isLikelyJsonText(value))) return;

    input[sectionId] = input[sectionId]
        ? `${input[sectionId]}\n${value}`
        : value;
}


function handleKoreanFieldworkFieldNoteSpecialLine(
        result: KoreanFieldworkParsedFieldNote,
        heading: string,
        text: string,
        options: KoreanFieldworkFieldNoteParseOptions
) {

    if (heading === KOREAN_FIELDWORK_FIELD_NOTE_HANDWRITING_SUMMARY_LABEL) {
        result.handwritingSummary = text || result.handwritingSummary;
        return;
    }

    if (KOREAN_FIELDWORK_FIELD_NOTE_HANDWRITING_COORDINATE_LABELS.has(heading)) {
        result.hasHandwritingEvidence = hasStrokeEvidence(text);
        return;
    }

    if (options.collectFallbackLines !== false && text && !isLikelyJsonText(text)) {
        result.fallbackLines.push(`${heading}: ${text}`);
    }
}


function isKoreanFieldworkFieldNoteSectionHeadingOnly(line: string): boolean {

    const match = line.match(/^\[([^\]]+)\]\s*$/);

    return !!match && !!getKoreanFieldworkFieldNoteSectionId(match[1]);
}


function getKoreanFieldworkFieldNoteTextLines(value: unknown): string[] {

    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.flatMap(getKoreanFieldworkFieldNoteTextLines);

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.inputValue === 'string') return record.inputValue.split(/\r?\n/);
        if (typeof record.value === 'string') return record.value.split(/\r?\n/);
        return [];
    }

    return String(value).split(/\r?\n/);
}


function hasStrokeEvidence(value: unknown): boolean {

    if (value === undefined || value === null) return false;

    if (typeof value === 'string') {
        const text = value.trim();
        if (!text || text === '[]' || text === '{}') return false;

        const parsed = parseJsonValue(text);
        return parsed === undefined ? true : hasStrokeEvidence(parsed);
    }

    if (Array.isArray(value)) return value.some(hasStrokeValue);

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (Array.isArray(record.strokes)) return record.strokes.some(hasStrokeValue);

        return Object.keys(record)
            .filter(key => key !== 'version')
            .some(key => hasStrokeEvidence(record[key]));
    }

    return !!String(value).trim();
}


function hasStrokeValue(value: unknown): boolean {

    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.some(hasStrokeValue);

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (Array.isArray(record.points)) return record.points.length > 0;
        return Object.keys(record).some(key => hasStrokeValue(record[key]));
    }

    return !!String(value).trim();
}


function isLikelyJsonText(value: string): boolean {

    const text = value.trim();
    if (!text) return false;
    if (!['{', '['].includes(text[0])) return false;

    return parseJsonValue(text) !== undefined;
}


function parseJsonValue(value: string): unknown|undefined {

    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}
