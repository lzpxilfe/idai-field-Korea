import { validateKakaoMapJavaScriptKey } from './kakao-map-javascript-key-validation';

describe('validateKakaoMapJavaScriptKey', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects empty keys without calling Kakao', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(validateKakaoMapJavaScriptKey('   ')).resolves.toEqual({
      ok: false,
      message: '카카오 지도 JavaScript 키가 비어 있습니다.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks the Kakao JavaScript SDK endpoint with the encoded key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;

    await expect(validateKakaoMapJavaScriptKey('js key/with spaces')).resolves.toEqual({
      ok: true,
      status: 200,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dapi.kakao.com/v2/maps/sdk.js?appkey=js%20key%2Fwith%20spaces&autoload=false'
    );
  });

  it('explains likely wrong-key failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    await expect(validateKakaoMapJavaScriptKey('rest-key')).resolves.toMatchObject({
      ok: false,
      status: 401,
      message: expect.stringContaining('JavaScript 키'),
    });
  });

  it('explains likely WebView domain failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

    await expect(validateKakaoMapJavaScriptKey('js-key')).resolves.toMatchObject({
      ok: false,
      status: 403,
      message: expect.stringContaining('http://localhost:8080'),
    });
  });
});
