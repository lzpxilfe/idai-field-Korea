const writeFile = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../src/app/services/get-asynchronous-fs', () => ({
    getAsynchronousFs: () => ({ writeFile })
}));

jest.mock('src/app/electron/electron', () => ({
    electronRemote: { getGlobal: () => 'C:/app/config.json' }
}), { virtual: true });

import { SettingsSerializer } from '../../../../src/app/services/settings/settings-serializer';


describe('SettingsSerializer LAN synchronization setting', () => {

    beforeEach(() => jest.clearAllMocks());


    it('persists the explicit LAN opt-in setting', async () => {

        await new SettingsSerializer().store({
            languages: ['en'],
            isAutoUpdateActive: false,
            hostPassword: 'password',
            allowLanSync: true,
            syncTargets: {},
            username: 'tester',
            dbs: ['fieldwork'],
            selectedProject: 'fieldwork',
            imagestorePath: 'C:/images/',
            backupDirectoryPath: 'C:/backups/',
            keepBackups: { custom: 0, customInterval: 0, daily: 0, weekly: 0, monthly: 0 },
            mapProviderSettings: {
                kakaoLocalRestApiKey: '',
                kakaoMapJavaScriptKey: '',
                kakaoNativeAppKey: ''
            }
        });

        expect(writeFile).toHaveBeenCalledTimes(1);
        expect(JSON.parse(writeFile.mock.calls[0][1])).toMatchObject({
            allowLanSync: true,
            hostPassword: 'password'
        });
    });
});
