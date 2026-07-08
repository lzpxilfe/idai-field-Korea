# 현장 기록

한국 고고학 발굴 현장에서 태블릿으로 남긴 기록을 원래 iDAI의 **Field Desktop**에서 검수하고, HWP 보고서 작성까지 이어 주기 위한 iDAI.field 기반 작업 저장소입니다. 현장에서는 트렌치, 유구, 토층, 사진, 스케치, 유물, 보완 메모를 빠르게 남기고, 사무실에서는 같은 자료를 큰 화면에서 검토한 뒤 보고서 문장과 표로 옮깁니다.

원본은 독일고고학연구소(DAI)와 GBV가 개발한 [iDAI.field](https://github.com/dainst/idai-field)입니다. 이 저장소는 Apache-2.0 라이선스를 따르는 독립 포크이며, 한국 매장문화재 조사 업무에 맞춘 별도 버전으로 운영합니다.

![Field Desktop 화면](desktop/img/README-1.png)

## 바로 들어가기

Windows에서 저장소를 받은 뒤, 루트 폴더에서 아래 파일을 더블클릭합니다. 기본 입구는 Field Desktop입니다.

| 하고 싶은 일 | 실행 파일 | 결과 |
| --- | --- | --- |
| Field Desktop 열기 | `START_FIELD_DESKTOP.cmd` | 한국어 iDAI Field Desktop 실행 |
| Field Desktop 열기(다른 드라이브 캐시) | `START_FIELD_DESKTOP_TO_OTHER_DRIVE.cmd` | 임시파일과 npm 캐시를 지정한 드라이브에 두고 Field Desktop 실행 |
| 바탕화면 바로가기 만들기 | `INSTALL_FIELD_DESKTOP_SHORTCUT.cmd` | `Field Desktop` 바로가기 생성 |
| 수정 후 태블릿 APK 빌드+설치 | `BUILD_AND_INSTALL_TABLET_APK.cmd` | GitHub Actions에서 현재 `master` APK를 새로 만든 뒤 Android 태블릿에 설치 |
| 수정 후 태블릿 APK 빌드+내려받기 | `BUILD_AND_DOWNLOAD_TABLET_APK.cmd` | 현재 `master` APK를 새로 만들어 파일만 내려받기 |
| 최신 태블릿 APK 설치 | `INSTALL_LATEST_TABLET_APK.cmd` | GitHub Actions APK를 받아 Android 태블릿에 설치 |
| 최신 태블릿 APK 내려받기 | `DOWNLOAD_LATEST_TABLET_APK.cmd` | APK만 내려받아 태블릿으로 직접 전달 |
| 보고서 보조 시제품 확인 | `START_BRIDGEDESK_DESKTOP.cmd` | HWP 복사 흐름 검증용 임시 도구 실행 |

`run-idai-field-ko.ps1`은 같은 실행 흐름을 PowerShell에서 직접 실행할 때 사용합니다. 처음 실행할 때는 Angular 개발 서버를 준비하므로 시간이 걸릴 수 있습니다.

C드라이브 용량이 부족하면 `START_FIELD_DESKTOP_TO_OTHER_DRIVE.cmd`를 더블클릭해 런타임/캐시 폴더를 지정합니다. 예를 들어 `G:\idai-field-desktop-runtime`를 입력하면 Angular 임시파일과 npm 캐시가 그 아래에 저장됩니다. PowerShell에서는 다음처럼 직접 지정할 수도 있습니다.

```powershell
$env:IDAI_FIELD_RUNTIME_DIR='G:\idai-field-desktop-runtime'
.\run-idai-field-ko.ps1
```

## Field Desktop 중심 흐름

이 포크의 본체는 `desktop` 아래의 Electron/Angular 기반 Field Desktop입니다. 태블릿에서 만든 프로젝트와 사진, 도면, 유구 관계, 보완 항목은 Field Desktop에서 열고 검수하는 방향을 유지합니다.

보고서 작성 보조 기능도 최종적으로는 Field Desktop 안에 들어가야 합니다. 현재 `tools\bridgedesk`에 있는 BridgeDesk는 별도 제품이 아니라, HWP 복사 문장과 표 형식을 빠르게 검증하기 위한 임시 시제품입니다. 검증된 로직은 이후 Field Desktop의 한국형 보고서/인계 패널로 옮깁니다.

## 보고서 보조 시제품

BridgeDesk는 태블릿 JSON을 읽고 HWP에 붙여넣기 쉬운 문장과 표를 보여 주는 작은 검증 도구입니다. Field Desktop을 대체하지 않습니다.

- `초안 복사`: 전체 보고서 초안을 클립보드에 복사
- `표 복사`: 전체 현장 기록을 탭 구분 표로 복사
- `기록 복사`: 선택한 기록 하나를 문단 형태로 복사
- `표 행 복사`: 선택한 기록 하나를 HWP 표에 붙여넣기 쉬운 한 줄로 복사

자세한 안내는 [보고서 보조 시제품 문서](docs/korean-fieldwork/bridgedesk-installation.md)에 정리되어 있습니다.

## 자료 흐름

1. 현장에서 태블릿으로 트렌치, 유구, 토층, 사진 번호, 도면 번호, 유물 번호, 보완 메모를 입력합니다.
2. 같은 프로젝트 자료를 Field Desktop에서 열어 관계, 사진, 스케치, 토층 색상, 보완 항목을 검수합니다.
3. Field Desktop의 `보고서/HWP 복사` 패널에서 기록별 요약, 근거 자료, 확인 항목을 한눈에 확인합니다.
4. 필요한 문단은 `복사` 버튼으로 일반 텍스트 클립보드에 넣고, 작성 중인 HWP에 붙여넣습니다.
5. 보고서 보조 시제품이 필요한 경우에만 태블릿 JSON 파일을 `tools\bridgedesk\data\inbox` 폴더에 넣어 별도 검증합니다.

`data\inbox`가 비어 있으면 BridgeDesk는 발굴 현장 예시 데이터인 `tools\bridgedesk\data\tablet_submissions.json`을 읽어 보고서 흐름을 먼저 확인합니다. BridgeDesk에서 확인한 HWP 문장 형식은 Field Desktop 안의 보고서 패널로 옮기는 것을 기준으로 합니다.

## 태블릿 설치

Android 태블릿 앱은 APK로 설치합니다. Google Play 배포를 전제로 하지 않습니다.

GitHub Actions가 만든 최신 APK를 받아 곧바로 USB 연결 태블릿에 설치하려면 다음 명령을 사용합니다.

명령어 대신 루트 폴더의 `INSTALL_LATEST_TABLET_APK.cmd`를 더블클릭해도 됩니다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools
```

코드를 수정해 `master`에 푸시한 직후 그 커밋의 APK를 새로 만들어 설치하려면 `BUILD_AND_INSTALL_TABLET_APK.cmd`를 더블클릭하거나 다음 명령을 사용합니다. 이 명령은 Mobile GitHub Actions를 수동 실행하고, APK 빌드가 끝날 때까지 기다린 뒤 그 산출물을 설치합니다.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools
```

C드라이브 용량을 아끼려면 APK와 Android 도구를 둘 작업 폴더를 다른 드라이브로 지정합니다. 이 경우 APK는 `G:\idai-field-android\apk`, Android platform-tools는 `G:\idai-field-android\platform-tools` 아래에 저장됩니다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android
```

수정 직후 빌드와 설치도 같은 방식으로 다른 드라이브를 사용할 수 있습니다. 더블클릭으로 처리하려면 `BUILD_AND_INSTALL_TABLET_APK_TO_OTHER_DRIVE.cmd`를 사용합니다.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android
```

더블클릭으로 처리하려면 `INSTALL_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd`를 사용하거나, `IDAI_FIELD_ANDROID_WORKDIR` 환경변수를 지정한 뒤 기존 `INSTALL_LATEST_TABLET_APK.cmd`를 실행합니다.

APK만 내려받아 USB, 메신저, 클라우드 드라이브로 직접 옮기려면 다음처럼 받습니다.

명령어 대신 `DOWNLOAD_LATEST_TABLET_APK.cmd`를 더블클릭해도 됩니다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly
```

APK 파일만 다른 드라이브에 받으려면 `DOWNLOAD_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd`를 더블클릭하거나 다음처럼 실행합니다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly -WorkDirectory G:\idai-field-android
```

수정 직후 APK 파일만 새로 만들어 받아야 하면 `BUILD_AND_DOWNLOAD_TABLET_APK.cmd` 또는 `BUILD_AND_DOWNLOAD_TABLET_APK_TO_OTHER_DRIVE.cmd`를 사용합니다.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadOnly -WorkDirectory G:\idai-field-android
```

이미 APK 파일을 받아 둔 경우에는 경로를 직접 지정합니다.

```powershell
.\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk -DownloadPlatformTools
```

연결된 태블릿이 여러 대라면 대상 기기를 지정합니다.

```powershell
.\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk -DeviceSerial R83Y70CADYP
```

자세한 절차는 [Android 태블릿 설치 안내](docs/korean-fieldwork/android-tablet-install.ko.md)를 확인합니다.

## 주요 기능

- 프로젝트 생성 시 조사 방식, 조사 경계 상태, 좌표계, 현장 메모를 함께 기록합니다.
- 표본조사, 시굴조사, 발굴조사 흐름에 맞춰 트렌치와 유구 기록을 시작합니다.
- 지도 화면에서 현재 위치나 위성지도를 보며 조사 경계와 유구 위치를 잡습니다.
- 조사 전, 조사 중, 완료 사진과 토층 사진, 유물 노출 사진, 스케치, 손글씨 메모를 한 기록에 묶습니다.
- 전체 유구 현황, 우선순위, 누락 항목, 보완 메모를 태블릿과 데스크톱에서 확인합니다.
- 사진 내보내기 시 파일뿐 아니라 원기록 연결, 해시, 서버 저장 메타데이터를 manifest로 남깁니다.
- 보고서 작성 보조 기능은 현재 BridgeDesk 시제품에서 검증하고, 최종 구현은 Field Desktop 안으로 옮깁니다.

## 개발 환경

이 저장소는 iDAI.field의 monorepo 구조를 유지합니다.

| 경로 | 역할 |
| --- | --- |
| `core` | 공통 TypeScript 모델, 설정, 동기화 보조 로직 |
| `desktop` | Angular/Electron 기반 데스크톱 앱 |
| `mobile` | React Native/Expo 기반 Android 태블릿 앱 |
| `server` | Field Hub 동기화 서버 |
| `publication` | 공개와 출판 플랫폼 관련 코드 |
| `tools\bridgedesk` | HWP 보고서 보조용 BridgeDesk 도구 |

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

Expo Go는 사용하지 않습니다. 저장소, 파일, 지도, 이미지 처리, 암호화 같은 네이티브 모듈을 쓰므로 개발 빌드나 APK로 실행해야 합니다.

## 검증

한국형 현장 기록 흐름을 한 번에 점검합니다.

```bash
npm run check:korean-fieldwork
```

데스크톱 빌드까지 포함해 넓게 확인하려면 다음 명령을 사용합니다.

```bash
npm run check:korean-fieldwork:full
```

BridgeDesk만 확인할 때는 아래 명령을 사용합니다.

```powershell
cd tools\bridgedesk
python -m unittest discover -s tests
```

## 문서

- [BridgeDesk 설치와 실행 입구](docs/korean-fieldwork/bridgedesk-installation.md)
- [Android 태블릿 설치 안내](docs/korean-fieldwork/android-tablet-install.ko.md)
- [현장 적용 연구 노트](docs/korean-fieldwork/README.md)
- [한국형 야장 구현 요구사항](docs/korean-fieldwork/field-notebook-requirements.md)
- [한국형 야장 기록 워크플로](docs/korean-fieldwork/field-recording-workflows.md)
- [iDAI.field wiki 한국어 번역](docs/wiki/README.md)
- [Hohl et al. 2023 논문 한국어 요약/번역 노트](docs/papers/hohl-et-al-2023-idai-field.ko.md)

## 운영 원칙

이 저장소는 iDAI.field 원본에 병합 요청을 보내는 것을 전제로 하지 않는 독립 포크입니다. 원작자가 이 포크의 변경을 Pull Request로 받을 수 없다고 밝힌 상황을 존중하며, 원본 프로젝트와 원작자에게 리뷰, 병합, 한국형 기능 검토, 사용자 지원 부담을 넘기지 않습니다.

필요한 변경은 이 저장소 안에서 이슈, 커밋, 릴리스로 처리합니다. 원본 프로젝트에는 출처와 라이선스 고지, 공개 문서 링크, 참고한 upstream 변경 기록만 남기며, 사전 합의 없는 PR, 멘션, 지원 요청은 보내지 않는 것을 이 포크의 운영 기준으로 삼습니다.

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

## Development

The original repository uses [lerna](https://github.com/lerna/lerna) to manage sub-package dependencies.

```bash
npm run bootstrap
```

</details>
