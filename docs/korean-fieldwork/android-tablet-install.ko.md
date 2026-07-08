# Android 태블릿 설치 안내

현장 기록은 Google Play 스토어 배포를 전제로 하지 않는다. GitHub에서 APK를 내려받아 직접 설치하는 방식으로 운영한다. 현장 장비가 기관마다 다르고 네트워크가 불안정할 수 있으므로, “완전히 모든 기종”을 보장하기보다는 Android APK를 설치할 수 있는 태블릿 전반을 목표로 한다.

## 지원 범위

- Android 6.0 이상을 기본 대상으로 한다. 현재 Android 설정의 `minSdkVersion`은 23이다.
- ARM64, ARMv7, x86, x86_64 ABI를 함께 빌드한다.
- Samsung Galaxy Tab A9에서 USB 설치와 실행을 확인했다.
- iPad/iOS는 APK를 설치할 수 없으므로 별도 배포 체계가 필요하다.

## 일반 사용자 설치

1. GitHub 저장소의 Actions 또는 Releases에서 `idai-field-mobile-release.apk`를 내려받는다.
2. 태블릿으로 APK 파일을 옮긴다. USB 케이블, 메신저, 클라우드 드라이브 중 현장에서 가능한 방법을 쓰면 된다.
3. Android가 “알 수 없는 앱 설치” 권한을 묻는 경우, APK를 여는 앱에 한해 허용한다.
4. 설치가 끝나면 앱 목록에서 `현장 기록`을 실행한다.

보안상 APK는 저장소의 GitHub Releases 또는 Actions 산출물에서만 내려받는 것을 권장한다. 다른 경로로 전달받은 APK는 만든 사람과 출처를 확인해야 한다.

## Windows에서 최신 APK 받기

Windows PC에서 GitHub CLI가 로그인되어 있으면, 가장 최근에 성공한 Mobile Actions 산출물에서 APK를 직접 받을 수 있다.

USB로 연결된 태블릿에 바로 설치:

명령어 대신 저장소 루트의 `INSTALL_LATEST_TABLET_APK.cmd`를 더블클릭해도 된다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools
```

코드를 수정해 `master`에 푸시한 직후 그 커밋의 APK를 새로 만들어 설치하려면 `BUILD_AND_INSTALL_TABLET_APK.cmd`를 더블클릭하거나 다음 명령을 실행한다. 이 명령은 Mobile GitHub Actions를 수동 실행하고, APK 빌드가 끝날 때까지 기다린 뒤 그 산출물을 설치한다.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools
```

이 fresh build 명령은 실행 전에 로컬 작업트리가 깨끗한지, 현재 로컬 커밋이 GitHub의 빌드 대상 `master`와 같은지 확인한다. 아직 커밋하지 않은 수정이나 푸시하지 않은 커밋이 있으면 태블릿 설치를 멈춘다. 의도적으로 원격 `master`만 빌드하려면 `-AllowRefMismatch`를 추가한다.

C드라이브 용량이 부족하면 APK와 Android 도구를 저장할 작업 폴더를 다른 드라이브로 지정한다. 아래 예시는 APK를 `G:\idai-field-android\apk`, platform-tools를 `G:\idai-field-android\platform-tools` 아래에 둔다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android
```

수정 직후 빌드와 설치도 같은 작업 폴더를 쓸 수 있다. 명령어 대신 `BUILD_AND_INSTALL_TABLET_APK_TO_OTHER_DRIVE.cmd`를 더블클릭해도 된다.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android
```

명령어 대신 `INSTALL_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd`를 더블클릭하면 작업 폴더를 입력한 뒤 같은 설치 흐름을 실행한다. 항상 같은 위치를 쓰려면 `IDAI_FIELD_ANDROID_WORKDIR` 환경변수를 지정해 둔 뒤 기존 `INSTALL_LATEST_TABLET_APK.cmd`를 실행해도 된다.

APK 파일만 내려받아 태블릿으로 직접 옮기기:

명령어 대신 `DOWNLOAD_LATEST_TABLET_APK.cmd`를 더블클릭해도 된다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly
```

APK 파일만 다른 드라이브에 받으려면 `DOWNLOAD_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd`를 더블클릭하거나 다음처럼 실행한다.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly -WorkDirectory G:\idai-field-android
```

수정 직후 APK 파일만 새로 만들어 받아야 하면 `BUILD_AND_DOWNLOAD_TABLET_APK.cmd` 또는 `BUILD_AND_DOWNLOAD_TABLET_APK_TO_OTHER_DRIVE.cmd`를 사용한다.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadOnly -WorkDirectory G:\idai-field-android
```

이 명령은 `idai-field-mobile-android-apk` 산출물을 찾는다. 작업 폴더를 지정하지 않으면 `dist/android/run-<Actions 실행 번호>` 아래에 내려받고, `-WorkDirectory`를 지정하면 `<작업 폴더>/apk/run-<Actions 실행 번호>` 아래에 내려받는다.

## Windows에서 USB로 설치

태블릿을 USB로 연결할 수 있으면 스크립트로 설치할 수 있다.

1. 태블릿에서 `설정 > 태블릿 정보 > 소프트웨어 정보`로 들어가 `빌드번호`를 여러 번 눌러 개발자 옵션을 연다.
2. `개발자 옵션 > USB 디버깅`을 켠다.
3. PC에 USB로 연결한 뒤 태블릿에 뜨는 USB 디버깅 승인 팝업을 허용한다.
4. 저장소 루트에서 다음 명령을 실행한다.

```powershell
.\install-idai-field-android-apk.ps1 -ApkPath .\idai-field-mobile-release.apk -DownloadPlatformTools
```

빌드 산출물이 저장소 안의 `dist/android`에 있다면 다음처럼 실행한다.

```powershell
.\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk
```

연결된 태블릿이 여러 대라면 `-DeviceSerial` 옵션으로 대상을 지정한다.

```powershell
.\install-idai-field-android-apk.ps1 -DeviceSerial R83Y70CADYP
```

## 개발자가 APK 만들기

필요한 도구는 Node.js 20 이상, JDK 17 이상, Android SDK(platform-tools 포함)이다. Android Studio를 설치했다면 SDK는 보통 `%LOCALAPPDATA%\Android\Sdk`에 있다.

릴리스 APK:

```powershell
.\build-idai-field-android-apk.ps1 -Variant release
```

개발용 APK를 빌드하고 연결된 태블릿에 바로 설치:

```powershell
.\build-idai-field-android-apk.ps1 -Variant debug -Install
```

개발 중 Metro 서버까지 함께 실행:

```powershell
.\run-idai-field-tablet-ko.ps1 -InstallDebug
.\run-idai-field-tablet-ko.ps1
```

## 왜 Expo Go를 쓰지 않는가

현장 기록 모바일 앱은 저장소, 파일, 지도, 암호화 등 네이티브 모듈을 사용한다. Expo Go는 이런 네이티브 모듈 조합을 그대로 담고 있지 않아서 실제 태블릿에서는 개발 빌드나 APK로 실행해야 한다.

## GitHub 배포 흐름

`.github/workflows/mobile.yml`은 Android APK를 빌드하고 `idai-field-mobile-android-apk` 산출물로 업로드한다. 태그를 푸시하면 같은 APK를 GitHub Release에도 첨부한다.

권장 태그 예시는 다음과 같다.

```powershell
git tag android-0.1.0
git push origin android-0.1.0
```
