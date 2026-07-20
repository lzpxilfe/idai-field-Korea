export interface KoreanFieldworkMapProviderSettings {
    kakaoLocalRestApiKey: string;
    kakaoMapJavaScriptKey: string;
    kakaoNativeAppKey: string;
}

export const KOREAN_FIELDWORK_MAP_PROVIDER_FIELDS = [
    'kakaoLocalRestApiKey',
    'kakaoMapJavaScriptKey',
    'kakaoNativeAppKey'
] as const;

export function getKoreanFieldworkDefaultMapProviderSettings(): KoreanFieldworkMapProviderSettings {

    return {
        kakaoLocalRestApiKey: '',
        kakaoMapJavaScriptKey: '',
        kakaoNativeAppKey: ''
    };
}

export function normalizeKoreanFieldworkMapProviderSettings(
    _settings: unknown
): KoreanFieldworkMapProviderSettings {

    return getKoreanFieldworkDefaultMapProviderSettings();
}
