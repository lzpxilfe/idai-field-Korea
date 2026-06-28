# 현장 기록

한국 고고학 현장에서 태블릿과 데스크톱을 함께 쓰기 위한 디지털 야장입니다. 현장에서는 조사 경계를 잡고, 트렌치와 유구를 빠르게 만들고, 사진·스케치·손글씨 메모·약측값을 바로 붙입니다. 사무실에서는 같은 프로젝트를 데스크톱에서 열어 위치, 사진, 도면, 토층, 유물, 시료, 보완 항목, 보고서 인계 자료를 정리합니다.

원본은 독일고고학연구소(DAI)와 GBV가 개발한 [iDAI.field](https://github.com/dainst/idai-field)입니다. 이 저장소는 Apache-2.0 라이선스를 따르는 독립 포크이며, 한국 매장문화재 조사 현장에 맞춘 별도 버전으로 운영합니다.

## 빠른 시작

### 태블릿에 바로 설치

일반 사용자는 Android APK를 내려받아 태블릿에 직접 설치합니다. Google Play 배포를 전제로 하지 않습니다.

1. GitHub Releases 또는 Actions 산출물에서 `idai-field-mobile-release.apk`를 받습니다.
2. APK를 태블릿으로 옮깁니다.
3. Android가 "알 수 없는 앱 설치" 권한을 묻는 경우, APK를 여는 앱에 한해 허용합니다.
4. 앱 목록에서 `현장 기록`을 실행합니다.

Windows PC에서 USB로 설치할 수도 있습니다.

```powershell
.\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk -DownloadPlatformTools
```

연결된 태블릿이 여러 대라면 대상 기기를 지정합니다.

```powershell
.\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk -DeviceSerial R83Y70CADYP
```

자세한 태블릿 설치 절차는 [Android 태블릿 설치 안내](docs/korean-fieldwork/android-tablet-install.ko.md)에 있습니다.

### 데스크톱에서 실행

Windows 개발/현장 PC에서 한국어 데스크톱 앱을 바로 띄우려면 저장소 루트에서 실행합니다.

```powershell
.\run-idai-field-ko.ps1
```

이 스크립트는 한국어 Angular 개발 서버를 준비하고 Electron 앱 창을 엽니다. 처음 실행할 때는 의존성 설치와 번들 생성 때문에 시간이 걸릴 수 있습니다.

생산용 데스크톱 빌드를 만들려면 다음 흐름을 사용합니다.

```powershell
npm run bootstrap
npm --prefix core run build
npm --prefix desktop run build
npm --prefix desktop run package:win
```

Windows 패키지는 `desktop/release` 아래에 만들어집니다. 인증서나 Windows 권한 설정에 따라 NSIS 설치 파일 생성이 실패할 수 있으며, 그 경우 `desktop/release/win-unpacked/Field Desktop.exe`를 직접 실행할 수 있습니다.

## 주요 기능

### 태블릿 현장 기록

- 프로젝트 생성 시 조사 방식, 조사 경계 상태, 좌표계, 현장 메모를 함께 잡습니다.
- 표본조사·시굴조사·발굴조사 흐름에 맞춰 트렌치와 유구 기록을 시작합니다.
- 지도 화면에서 현재 GPS 위치를 기준으로 조사 경계 초안을 만들 수 있습니다.
- 카카오 JavaScript 키가 있으면 위성지도를 보며 경계 위치를 찍을 수 있습니다.
- 지도에서 유구를 추가하고 바로 기록 입력 화면으로 이어갈 수 있습니다.
- 조사 전·중·완료 사진, 토층 사진, 유물 노출 사진, 약측, 장축 방위, 손글씨 메모, 스케치를 한 기록에 묶습니다.
- 오늘 작업판, 우선순위, 누락 항목, 전체 유구 현황을 태블릿에서 확인합니다.
- Munsell(먼셀) 토색 후보와 토층 사진 보조 기록을 남길 수 있습니다.

### 데스크톱 정리와 보고서 인계

- 태블릿에서 만든 프로젝트를 열어 위치, 경계, 기록 관계를 큰 화면에서 검토합니다.
- 전체 유구 현황, 작업 패널, 보완 목록, 기록 근거 연결을 한꺼번에 확인합니다.
- SHP/DXF/GeoJSON 같은 기존 경계·도면 자료를 가져와 현장 기록과 맞춥니다.
- 이미지 내보내기 시 사진 파일뿐 아니라 `fieldwork-image-export-manifest.json`, `fieldwork-image-export-manifest.csv`, `fieldwork-image-export-readme.txt`를 함께 만듭니다.
- 이미지 manifest에는 프로젝트 맥락, 관련 유구/트렌치, 태블릿 원본 URI, 서버 저장 크기, MD5/SHA-256, 내보낸 파일 해시, 데스크톱 앱 버전이 들어갑니다.
- CSV manifest는 스프레드시트 수식 실행을 막도록 값이 중립화되어 보고서 인계용으로 열기 쉽습니다.

### 동기화와 원본 보존

- 태블릿과 데스크톱은 같은 프로젝트 문서와 이미지 기록을 공유하도록 설계되어 있습니다.
- 태블릿에서 촬영한 원본 이미지는 `original_image`로 업로드하고, 서버 응답의 `size_bytes`, `md5`, `sha256` 값을 기록에 남깁니다.
- 이전에 서버 저장 메타데이터가 빠졌던 이미지도 동기화 과정에서 보강할 수 있게 했습니다.
- 완료 점검은 단순히 이미지 문서가 있다는 것만 보지 않고, 태블릿 업로드와 서버 저장 메타데이터가 남아 있는지도 확인합니다.
- 1년 뒤 보고서 작성자가 사진 파일과 원기록의 연결을 다시 확인할 수 있도록, 내보낸 이미지와 manifest에 증거 흐름을 남깁니다.

## 현장 사용 흐름

새 프로젝트를 만들 때는 먼저 조사 방식과 조사 경계를 정합니다. 경계는 태블릿에서 GPS와 지도를 보며 찍거나, 데스크톱에서 기존 공간 자료를 가져와 정리할 수 있습니다.

| 조사 성격 | 주로 남기는 기록 |
| --- | --- |
| 표본조사 | 조사구역, 트렌치, 토층 정리 여부, 유구 확인 여부, 피트, 사진 |
| 시굴조사 | 조사구역, 트렌치 번호, 기준 토층, 유구 사진, 피트 토층, 트렌치 완료 사진 |
| 발굴조사 | 제토 중 확인된 유구, 조사 전/중/완료 사진, 토층, 유물 수습, 실측, 보완 메모 |

표본조사와 시굴조사는 트렌치 단위로 시작합니다. 트렌치를 판 순서대로 번호를 붙이고, 토층 정리 여부, 유구 확인 여부, 피트 조사 여부, 피트 토층 기록 여부, 정방향·사선·기준 토층·유구 사진을 남깁니다.

발굴조사는 유구 단위로 기록합니다. 제토 중 확인된 유구의 위치를 먼저 찍고, 조사 전 사진을 남긴 뒤 조사 중 사진, 토층 사진, 유물 노출 사진, 유물 수습, 완료 사진, 실측 여부를 이어서 기록합니다. 처음에는 `미상`이나 `추정`으로 두었다가 조사하면서 유구 성격과 시기를 고쳐 갈 수 있습니다.

## 지도 API와 토큰

지도 키와 토큰은 코드에 직접 넣지 않고 설정이나 로컬 환경변수로 지정합니다.

- 카카오 JavaScript 키: 태블릿 위성지도와 경계 위치 선택에 사용합니다.
- 카카오 REST API 키: 지도 표시용이 아니라 로컬 API 연동용으로 구분합니다.
- 카카오 Native App 키: 네이티브 지도 연동을 위해 별도로 보관합니다.
- Mapbox 토큰: 필요한 경우 로컬 환경변수로만 지정합니다.

```powershell
$env:REACT_APP_MAPBOX_ACCESS_TOKEN = "your-token"
$env:REACT_APP_MAPBOX_STYLE_ID = "user/style-id"
```

토큰과 키는 저장소에 커밋하지 않습니다. 공개 이력에 노출된 값은 지도 서비스 콘솔에서 폐기하고 새로 발급해야 합니다.

## 개발 환경

이 저장소는 iDAI.field의 monorepo 구조를 유지합니다.

- [core](core): 공통 TypeScript 모델, 설정, 동기화 보조 로직
- [desktop](desktop): Angular/Electron 기반 데스크톱 앱
- [mobile](mobile): React Native/Expo 기반 Android 태블릿 앱
- [server](server): Field Hub 동기화 서버
- [publication](publication): 공개/출판 플랫폼 관련 코드
- [web](web): 웹 관련 코드

처음 개발 환경을 준비할 때는 의존성을 설치합니다.

```bash
npm run bootstrap
```

Android APK를 직접 만들려면 Node.js 20 이상, JDK 17 이상, Android SDK(platform-tools 포함)가 필요합니다.

```powershell
.\build-idai-field-android-apk.ps1 -Variant release
```

개발 중 태블릿에 바로 설치하고 Metro 서버를 띄우려면 다음 흐름을 사용합니다.

```powershell
.\run-idai-field-tablet-ko.ps1 -InstallDebug
.\run-idai-field-tablet-ko.ps1
```

Expo Go는 사용하지 않습니다. 이 앱은 저장소, 파일, 지도, 이미지 처리, 암호화 같은 네이티브 모듈을 쓰므로 개발 빌드나 APK로 실행해야 합니다.

## 검증

한국형 현장 기록 흐름을 한 번에 점검하는 루트 스크립트가 있습니다.

```bash
npm run check:korean-fieldwork
```

데스크톱 빌드까지 포함해 더 넓게 확인하려면 다음 명령을 사용합니다.

```bash
npm run check:korean-fieldwork:full
```

서버 테스트는 Elixir/Mix/Erlang이 설치된 환경에서 별도로 실행해야 합니다.

## 문서

- [현장 적용 연구 노트](docs/korean-fieldwork/README.md)
- [Android 태블릿 설치 안내](docs/korean-fieldwork/android-tablet-install.ko.md)
- [한국형 야장 구현 요구사항](docs/korean-fieldwork/field-notebook-requirements.md)
- [한국형 야장 기록 워크플로](docs/korean-fieldwork/field-recording-workflows.md)
- [iDAI.field wiki 한국어 번역](docs/wiki/README.md)
- [Hohl et al. 2023 논문 한국어 요약/번역 노트](docs/papers/hohl-et-al-2023-idai-field.ko.md)

## 운영 원칙

이 저장소는 iDAI.field 원본에 병합 요청을 보내는 것을 전제로 하지 않는 독립 포크입니다. 원작자가 이 포크의 변경을 Pull Request로 받을 수 없다고 밝힌 상황을 존중하며, 원본 프로젝트와 원작자에게 리뷰, 병합, 한국형 기능 검토, 사용자 지원 부담을 넘기지 않습니다.

필요한 변경은 이 저장소 안에서 이슈, 커밋, 릴리스로 처리합니다. 원본 프로젝트에는 출처와 라이선스 고지, 공개 문서 링크, 참고한 upstream 변경 기록만 남기며, 사전 합의 없는 PR·멘션·지원 요청은 보내지 않는 것을 이 포크의 운영 헌장으로 삼습니다. 자세한 기준은 [CONTRIBUTING.md](CONTRIBUTING.md)에 둡니다.

## 출처와 라이선스

- 원본 저장소: [dainst/idai-field](https://github.com/dainst/idai-field)
- 원본 프로젝트 사이트: [field.idai.world](https://field.idai.world/)
- 원본 문서: [iDAI.field wiki](https://github.com/dainst/idai-field/wiki)
- 라이선스: Apache License 2.0
- 출처 고지: [NOTICE.md](NOTICE.md)
- 참고 논문: S. Hohl, T. Kleinke, F. Riebschläger, J. Watson, **iDAI.field: developing software for the documentation of archaeological fieldwork**, *Archeologia e Calcolatori* 34.1, 2023, 85-94. DOI: [10.19282/ac.34.1.2023.10](https://doi.org/10.19282/ac.34.1.2023.10)

<details>
<summary>Original iDAI.field README excerpt</summary>

# iDAI.field | Field

Field is a modern take on flexible field and find recording for archaeological excavations. It is developed as a cooperation between the German Archaeological Institute ([DAI](https://www.dainst.org)) and the Head Office of the GBV Common Library Network ([GBV](https://en.gbv.de/)). Field is completely Open Source and free to use.

## About Field

For an overview of the genesis and the idea behind Field, see:

S. Hohl - T. Kleinke - F. Riebschläger - J. Watson, **iDAI.field: developing software for the documentation of archaeological fieldwork**, AeC 34, 1, 2023, 85-94, doi: [10.19282/ac.34.1.2023.10](https://doi.org/10.19282/ac.34.1.2023.10).

Using Field, archaeologists can:

- record, share and store all data and images produced on the excavation
- customize their own data model on top of a minimal shared model as defined by Field
- locate all of their records on a map
- manage types and inventories
- sync and publish their excavation data

## Information for users and interested projects

The original project invites users to join the [Field users mailing list](https://lists.fu-berlin.de/listinfo/idaifield2-user) and the [GitHub Discussions](https://github.com/dainst/idai-field/discussions).

## Development

The original repository uses [lerna](https://github.com/lerna/lerna) to manage sub-package dependencies.

```bash
npm run bootstrap
```

</details>
