import { normalizeKoreanFieldworkHwpPlainText } from 'idai-field-core';


export interface KoreanFieldworkHwpClipboardPayload {
    text: string;
}


export function makeKoreanFieldworkHwpClipboardPayload(text: string): KoreanFieldworkHwpClipboardPayload {

    return {
        text: normalizeKoreanFieldworkHwpPlainText(text)
    };
}


export async function writeKoreanFieldworkHwpClipboardText(text: string): Promise<void> {

    const payload = makeKoreanFieldworkHwpClipboardPayload(text);
    const nodeRequire = typeof window !== 'undefined'
        ? (window as any).require
        : undefined;
    const electronClipboard = getElectronClipboard(nodeRequire);

    if (electronClipboard?.writeText && tryElectronClipboardWriteText(electronClipboard, payload.text)) return;
    if (electronClipboard?.write && tryElectronClipboardWrite(electronClipboard, payload)) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
        return;
    }

    throw new Error('Clipboard is not available.');
}


function getElectronClipboard(nodeRequire: any): any|undefined {

    try {
        return nodeRequire?.('electron')?.clipboard;
    } catch (_) {
        return undefined;
    }
}


function tryElectronClipboardWrite(electronClipboard: any,
                                   payload: KoreanFieldworkHwpClipboardPayload): boolean {

    try {
        tryClearElectronClipboard(electronClipboard);
        electronClipboard.write(payload);
        return true;
    } catch (_) {
        return false;
    }
}


function tryElectronClipboardWriteText(electronClipboard: any, text: string): boolean {

    try {
        tryClearElectronClipboard(electronClipboard);
        electronClipboard.writeText(text);
        return true;
    } catch (_) {
        return false;
    }
}


function tryClearElectronClipboard(electronClipboard: any) {

    try {
        electronClipboard.clear?.();
    } catch (_) {}
}
