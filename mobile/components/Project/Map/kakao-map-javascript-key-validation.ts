export interface KakaoMapJavaScriptKeyValidationResult {
  message?: string;
  ok: boolean;
  status?: number;
}

export const validateKakaoMapJavaScriptKey = async (
  javaScriptKey: string
): Promise<KakaoMapJavaScriptKeyValidationResult> => {
  const trimmedKey = javaScriptKey.trim();
  if (!trimmedKey) {
    return {
      ok: false,
      message: '카카오 지도 JavaScript 키가 비어 있습니다.',
    };
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(trimmedKey)}&autoload=false`
    );

    if (response.ok) return { ok: true, status: response.status };

    return {
      ok: false,
      status: response.status,
      message: getKakaoMapJavaScriptKeyValidationMessage(response.status),
    };
  } catch {
    return {
      ok: false,
      message: '카카오 지도 SDK에 연결하지 못했습니다. 태블릿 인터넷 연결을 확인한 뒤 다시 시도하세요.',
    };
  }
};

const getKakaoMapJavaScriptKeyValidationMessage = (status: number): string => {
  if (status === 401) {
    return '카카오 지도 SDK 요청이 401로 거부되었습니다. 설정에 입력한 값이 REST 키나 Native 키가 아니라 JavaScript 키인지 확인하세요.';
  }

  if (status === 403) {
    return '카카오 지도 SDK 요청이 403으로 거부되었습니다. Kakao Developers의 JavaScript SDK 도메인에 http://localhost:8080 과 https://localhost 를 등록했는지 확인하세요.';
  }

  return `카카오 지도 SDK 요청이 실패했습니다. HTTP ${status} 응답을 받았습니다.`;
};
