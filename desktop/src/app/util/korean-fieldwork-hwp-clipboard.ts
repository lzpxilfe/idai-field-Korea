import { normalizeKoreanFieldworkHwpPlainText } from 'idai-field-core';


export async function writeKoreanFieldworkHwpClipboardText(text: string): Promise<void> {

    const plainText = normalizeKoreanFieldworkHwpPlainText(text);
    const nodeRequire = typeof window !== 'undefined'
        ? (window as any).require
        : undefined;

    try {
        const electronClipboard = nodeRequire?.('electron')?.clipboard;
        if (electronClipboard?.write) {
            try {
                electronClipboard.clear?.();
            } catch (_) {}

            electronClipboard.write({ text: plainText, html: '' });
            return;
        }
        if (electronClipboard?.writeText) {
            try {
                electronClipboard.clear?.();
            } catch (_) {}

            electronClipboard.writeText(plainText);
            return;
        }
    } catch (_) {}

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText);
        return;
    }

    throw new Error('Clipboard is not available.');
}
