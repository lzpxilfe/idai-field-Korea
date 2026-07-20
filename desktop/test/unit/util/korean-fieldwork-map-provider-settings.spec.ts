import {
    getKoreanFieldworkDefaultMapProviderSettings,
    normalizeKoreanFieldworkMapProviderSettings
} from '../../../src/app/util/korean-fieldwork-map-provider-settings';


describe('korean-fieldwork-map-provider-settings', () => {

    it('clears legacy map provider keys', () => {

        expect(normalizeKoreanFieldworkMapProviderSettings(undefined)).toEqual(
            getKoreanFieldworkDefaultMapProviderSettings()
        );
        expect(normalizeKoreanFieldworkMapProviderSettings({
            kakaoLocalRestApiKey: 'rest-key',
            kakaoMapJavaScriptKey: 'js-key',
            kakaoNativeAppKey: 'native-key'
        })).toEqual(getKoreanFieldworkDefaultMapProviderSettings());
    });
});
