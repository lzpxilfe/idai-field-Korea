import {
    makeKoreanFieldworkHwpClipboardPayload,
    writeKoreanFieldworkHwpClipboardText
} from '../../../src/app/util/korean-fieldwork-hwp-clipboard';


describe('korean-fieldwork-hwp-clipboard', () => {

    let previousRequire: any;
    let previousClipboard: any;

    beforeEach(() => {
        previousRequire = (global as any).window?.require;
        previousClipboard = (global as any).navigator?.clipboard;
    });


    afterEach(() => {
        if ((global as any).window) {
            (global as any).window.require = previousRequire;
        }
        if ((global as any).navigator) {
            Object.defineProperty((global as any).navigator, 'clipboard', {
                configurable: true,
                value: previousClipboard,
                writable: true
            });
        }
    });


    it('builds a plain text clipboard payload without rich text formats', () => {

        expect(makeKoreanFieldworkHwpClipboardPayload([
            '\u202A[\uc720\uad6c]\tpit-001\u202C',
            '\uc694\uc57d:\u00a0dark\u00ad fill\u0007',
            '',
            '',
            '\u200B\uc138\ubd80:\t\tsoil layer'
        ].join('\n'))).toEqual({
            text: [
                '[\uc720\uad6c] pit-001',
                '\uc694\uc57d: dark fill',
                '',
                '\uc138\ubd80: soil layer'
            ].join('\r\n')
        });
    });


    it('uses Electron clipboard writeText with normalized text for HWP-safe paste', async () => {

        const write = jest.fn();
        const writeText = jest.fn();
        const clear = jest.fn();
        setWindowRequire(jest.fn().mockReturnValue({ clipboard: { clear, write, writeText } }));

        await writeKoreanFieldworkHwpClipboardText('A\tB\nC');

        expect(clear).toHaveBeenCalledTimes(1);
        expect(writeText).toHaveBeenCalledWith('A B\r\nC');
        expect(write).not.toHaveBeenCalled();
    });


    it('falls back to Electron write when writeText fails', async () => {

        const write = jest.fn();
        const writeText = jest.fn(() => {
            throw new Error('clipboard write failed');
        });
        const clear = jest.fn();
        setWindowRequire(jest.fn().mockReturnValue({ clipboard: { clear, write, writeText } }));

        await writeKoreanFieldworkHwpClipboardText('A\tB\nC');

        expect(writeText).toHaveBeenCalledWith('A B\r\nC');
        expect(write).toHaveBeenCalledWith({ text: 'A B\r\nC' });
        expect(clear).toHaveBeenCalledTimes(2);
    });


    it('uses browser writeText fallback with normalized text', async () => {

        const writeText = jest.fn().mockResolvedValue(undefined);
        setNavigatorClipboard({ writeText });

        await writeKoreanFieldworkHwpClipboardText('A\tB\nC');

        expect(writeText).toHaveBeenCalledWith('A B\r\nC');
    });
});


function setWindowRequire(requireMock: jest.Mock) {

    const testWindow = (global as any).window ?? ((global as any).window = {});
    testWindow.require = requireMock;
}


function setNavigatorClipboard(clipboard: { writeText: jest.Mock }) {

    const testNavigator = (global as any).navigator ?? ((global as any).navigator = {});
    Object.defineProperty(testNavigator, 'clipboard', {
        configurable: true,
        value: clipboard,
        writable: true
    });
}
