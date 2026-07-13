jest.mock('src/app/electron/electron', () => ({
    electronFs: { promises: {} },
    electronPath: { sep: '/' },
    electronRemote: { app: undefined }
}), { virtual: true });

import { SettingsProvider } from '../../../../src/app/services/settings/settings-provider';


describe('SettingsProvider LAN synchronization defaults', () => {

    it('keeps LAN synchronization disabled and creates a strong password for existing configs', () => {

        const provider = new SettingsProvider();
        provider.setSettings(createSettings({ hostPassword: undefined, allowLanSync: undefined }));

        const settings = provider.getSettings();

        expect(settings.allowLanSync).toBe(false);
        expect(settings.hostPassword).toMatch(/^[a-f0-9]{48}$/);
    });


    it('preserves an explicit LAN opt-in and existing password', () => {

        const provider = new SettingsProvider();
        provider.setSettings(createSettings({ hostPassword: 'existing-password', allowLanSync: true }));

        const settings = provider.getSettings();

        expect(settings.allowLanSync).toBe(true);
        expect(settings.hostPassword).toBe('existing-password');
    });
});


const createSettings = (overrides: Record<string, unknown>) => ({
    languages: ['en'],
    isAutoUpdateActive: false,
    syncTargets: {},
    username: 'tester',
    dbs: ['fieldwork'],
    selectedProject: '',
    imagestorePath: 'C:/images/',
    backupDirectoryPath: 'C:/backups/',
    keepBackups: { custom: 0, customInterval: 0, daily: 0, weekly: 0, monthly: 0 },
    mapProviderSettings: {},
    ...overrides
} as any);
