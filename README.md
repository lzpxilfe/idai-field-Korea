# 현장 기록

한국 고고학 발굴 현장에서 태블릿으로 남긴 기록을 원래 iDAI의 **Field Desktop**에서 검수하고, HWP 보고서 작성까지 이어 주기 위한 iDAI.field 기반 작업 저장소입니다.

현장에서는 태블릿으로 유구, 피트, 토층사진, 사진, 도면, 유물, 시료, 야장 메모를 빠르게 남기고, 사무실에서는 같은 자료를 Field Desktop에서 한눈에 확인한 뒤 HWP로 옮길 문장과 표 내용을 복사합니다.

원본은 독일고고학연구소(DAI)와 GBV가 개발한 [iDAI.field](https://github.com/dainst/idai-field)입니다. 이 저장소는 Apache-2.0 라이선스를 따르는 포크이며, 한국 현장조사 업무 흐름에 맞춘 별도 버전으로 운영합니다.

![한국 현장기록 Field Desktop과 HWP 복사 흐름](docs/korean-fieldwork/images/readme-field-desktop-hwp-copy.png)

## 먼저 설치하기

Git에 익숙하지 않다면 GitHub의 초록색 `Code` 버튼을 누르고 `Download ZIP`을 선택합니다. ZIP 압축을 푼 뒤 아래 파일을 더블클릭하면 됩니다.

### 데스크톱

기본 데스크톱 프로그램은 별도 시제품이 아니라 원래 iDAI의 **Field Desktop**입니다.

| 하고 싶은 일 | 더블클릭할 파일 | 결과 |
| --- | --- | --- |
| Field Desktop 열기 | `START_FIELD_DESKTOP.cmd` | 한국어 Field Desktop 실행 |
| C드라이브를 아끼며 Field Desktop 열기 | `START_FIELD_DESKTOP_TO_OTHER_DRIVE.cmd` | 임시 파일과 npm 캐시를 다른 드라이브에 두고 실행 |
| 바탕화면 바로가기 만들기 | `INSTALL_FIELD_DESKTOP_SHORTCUT.cmd` | Field Desktop 바로가기 생성 |

처음 실행할 때는 필요한 개발 의존성을 설치하고 Angular 화면을 준비하므로 1-3분 정도 걸릴 수 있습니다. C드라이브 용량이 부족하면 다른 드라이브 캐시용 실행 파일을 사용하고, 예를 들어 `G:\idai-field-desktop-runtime` 같은 폴더를 지정합니다.

자세한 안내는 [Field Desktop 설치와 실행 안내](docs/korean-fieldwork/field-desktop-install.ko.md)에 있습니다.

### 태블릿

Android 태블릿 앱은 APK로 설치합니다. Google Play 배포를 전제로 하지 않으므로, USB로 태블릿을 연결한 뒤 아래 파일 중 하나를 실행합니다.

| 하고 싶은 일 | 더블클릭할 파일 | 결과 |
| --- | --- | --- |
| 이미 빌드된 최신 APK 설치 | `INSTALL_LATEST_TABLET_APK.cmd` | GitHub Actions 산출물을 내려받아 태블릿에 설치 |
| 방금 수정한 코드를 새 APK로 빌드하고 설치 | `BUILD_AND_INSTALL_TABLET_APK.cmd` | 현재 `master`를 GitHub Actions에서 빌드한 뒤 태블릿에 설치 |
| APK 파일만 내려받기 | `DOWNLOAD_LATEST_TABLET_APK.cmd` | 설치하지 않고 APK만 저장 |
| 방금 수정한 코드의 APK 파일만 만들기 | `BUILD_AND_DOWNLOAD_TABLET_APK.cmd` | 현재 `master`를 빌드하고 APK만 저장 |

C드라이브가 부족하면 `_TO_OTHER_DRIVE.cmd`가 붙은 파일을 사용합니다. 기본 작업 폴더는 `G:\idai-field-android`이며, APK와 Android platform-tools가 그 아래에 저장됩니다.

자세한 안내는 [Android 태블릿 설치 안내](docs/korean-fieldwork/android-tablet-install.ko.md)에 있습니다.

## 태블릿과 데스크톱 흐름

이 저장소의 목표는 태블릿과 데스크톱을 따로 노는 프로그램으로 만들지 않는 것입니다. 태블릿에서 적은 현장 정보가 최종적으로 Field Desktop에서 검수되고, HWP 보고서 작성에 도움이 되는 형태로 도착해야 합니다.

기본 흐름은 다음과 같습니다.

1. 태블릿에서 프로젝트를 열고 조사 경계와 유구를 기록합니다.
2. 유구별로 사진, 토층사진, 도면, 펜 메모, 유물, 시료를 추가합니다.
3. 유물과 시료는 유구 안 위치를 점으로 남기고, 토층사진은 스포이드로 찍은 위치를 사진 위에 저장합니다.
4. Field Hub 동기화를 통해 기록 JSON과 사진 원본을 같은 프로젝트 자료로 올립니다.
5. Field Desktop에서 같은 프로젝트를 열어 누락, 관계, 사진 원본, 스포이드 위치, 야장 메모를 검수합니다.
6. Field Desktop의 `보고서/HWP 복사` 패널에서 필요한 문장이나 표 행을 복사해 HWP에 붙여넣습니다.

HWP에 붙여넣을 때 문서 양식이 흐트러지지 않도록 복사 내용은 기본적으로 일반 텍스트에 가깝게 다룹니다. 서식까지 강하게 들고 가는 대신, 작성 중인 HWP 양식 안에 안정적으로 들어가는 것을 우선합니다.

## Field Desktop 중심 원칙

데스크톱 본체는 `desktop` 아래의 Electron/Angular 기반 Field Desktop입니다. 한국어 현장기록 기능도 최종적으로는 Field Desktop 안에서 검토하고 쓰는 것을 기준으로 합니다.

`tools\bridgedesk`의 BridgeDesk는 별도 제품이 아닙니다. HWP 복사 문장과 표 형식을 빠르게 검증하기 위한 보조 시제품입니다. 실제 운영 입구는 Field Desktop이며, BridgeDesk에서 검증한 좋은 흐름은 Field Desktop 안으로 옮기는 것을 목표로 합니다.

## 보고서/HWP 복사

Field Desktop의 보고서 보조 화면은 HWP 옆에 띄워두고 쓰는 작업대를 목표로 합니다.

- `본문 복사`: 보고서 본문에 바로 넣기 좋은 짧은 문장 복사
- `복사`: 요약, 근거 자료, 확인 항목을 함께 복사
- `근거 복사`: 사진, 도면, 스포이드 위치, 야장 메모 같은 근거만 복사
- `확인 복사`: 마감 전에 확인할 누락 항목만 복사
- `표 행 복사`: 선택한 기록 하나를 HWP 표에 붙여넣기 쉬운 한 줄로 복사

보고서 작성은 조사 완료 뒤의 일입니다. 그래서 태블릿 입력 중에는 HWP 안내를 과하게 띄우지 않고, 데스크톱 검수 단계에서 보고서 보조 기능을 쓰는 방향을 유지합니다.

## 주요 기능

- 발굴조사, 시굴조사, 표본조사 방식에 맞춘 프로젝트 시작 흐름
- 지도 위 조사 경계와 유구 점 연결 기록
- 유구별 사진, 토층사진, 도면, 펜 메모, 유물, 시료 추가
- 유물과 시료의 유구 내 위치 기록
- 토층사진 색상 스포이드와 사진 위 위치 표시
- 피트 기록의 직선 입력
- 유구 자료가 많아져도 목록, 요약, 우선순위로 훑는 현장 작업대
- Field Desktop에서 태블릿 자료 검수와 HWP 복사 지원
- APK 설치와 데스크톱 실행을 위한 Windows 더블클릭 입구

## 개발자가 수정한 뒤 태블릿에 바로 설치하기

코드를 고친 뒤 태블릿에 바로 넣을 때는 이 순서를 지킵니다.

1. 수정 내용을 테스트합니다.
2. `master`에 커밋하고 `origin/master`로 푸시합니다.
3. `BUILD_AND_INSTALL_TABLET_APK.cmd`를 실행합니다.
4. GitHub Actions가 새 APK를 빌드하면 연결된 Android 태블릿에 설치됩니다.

이 명령은 로컬 작업트리와 GitHub의 `master`가 맞는지 확인합니다. 커밋하지 않은 수정이나 푸시하지 않은 커밋이 있으면 설치를 멈추도록 되어 있습니다.

## 개발 구조

| 경로 | 역할 |
| --- | --- |
| `core` | 공통 TypeScript 모델, 설정, 동기화 보조 로직 |
| `desktop` | Angular/Electron 기반 Field Desktop |
| `mobile` | React Native/Expo 기반 Android 태블릿 앱 |
| `server` | Field Hub 동기화 서버 |
| `publication` | 공개/출판 관련 코드 |
| `tools\bridgedesk` | HWP 보고서 문장 검증용 보조 도구 |

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

한국 현장기록 흐름을 한 번에 확인합니다.

```bash
npm run check:korean-fieldwork
```

데스크톱 빌드까지 포함해 넓게 확인하려면 다음 명령을 사용합니다.

```bash
npm run check:korean-fieldwork:full
```

모바일 테스트만 직접 돌릴 때는 다음 명령을 사용합니다.

```powershell
npm --prefix mobile run test:ci -- --silent
```

## 문서

- [Field Desktop 설치와 실행 안내](docs/korean-fieldwork/field-desktop-install.ko.md)
- [Android 태블릿 설치 안내](docs/korean-fieldwork/android-tablet-install.ko.md)
- [BridgeDesk 설치와 실행 입구](docs/korean-fieldwork/bridgedesk-installation.md)
- [현장 적용 연구 노트](docs/korean-fieldwork/README.md)
- [한국형 야장 구현 요구사항](docs/korean-fieldwork/field-notebook-requirements.md)
- [한국형 야장 기록 워크플로](docs/korean-fieldwork/field-recording-workflows.md)
- [iDAI.field wiki 한국어 번역](docs/wiki/README.md)

## 운영 원칙

이 저장소는 원본 iDAI.field에 부담을 넘기기 위한 Pull Request 작업장이 아니라, 한국 현장조사 흐름을 이 포크 안에서 검증하고 운영하기 위한 저장소입니다.

필요한 변경은 이 저장소 안에서 커밋, 빌드, APK, 문서로 처리합니다. 원본 프로젝트와 원작자에게 사전 합의 없는 PR, 멘션, 한국형 기능 검토 요청, 사용자 지원 부담을 보내지 않는 것을 운영 기준으로 삼습니다.

## 출처와 라이선스

- 원본 저장소: [dainst/idai-field](https://github.com/dainst/idai-field)
- 원본 프로젝트 사이트: [field.idai.world](https://field.idai.world/)
- 원본 문서: [iDAI.field wiki](https://github.com/dainst/idai-field/wiki)
- 라이선스: Apache License 2.0
- 출처 고지: [NOTICE.md](NOTICE.md)
- 참고 논문: S. Hohl, T. Kleinke, F. Riebschläger, J. Watson, **iDAI.field: developing software for the documentation of archaeological fieldwork**, *Archeologia e Calcolatori* 34.1, 2023, 85-94. DOI: [10.19282/ac.34.1.2023.10](https://doi.org/10.19282/ac.34.1.2023.10)
