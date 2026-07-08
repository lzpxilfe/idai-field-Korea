This package contains the mobile client for Field. The app is developed in [React Native](https://reactnative.dev/) and the [Expo CLI](https://expo.dev/).

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Build the shared core package from the repository root:

   ```bash
   cd ../core
   npm install
   npm run build
   ```

2. Install mobile dependencies:

   ```bash
   cd ../mobile
   npm install
   ```

The async storage adapter is pinned to a public GitHub commit in `package.json`.
No local `yalc` package is required.

3. Start the development build

   ```bash
   npx expo start --dev-client --host localhost
   ```

Expo Go is not supported for this app because the project uses native modules.
Use a development build or a standalone Android APK.

## Android tablet APK

From the repository root on Windows:

```powershell
.\build-idai-field-android-apk.ps1 -Variant release
.\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk
```

To install the newest APK produced by the Mobile GitHub Actions workflow:

Double-click `INSTALL_LATEST_TABLET_APK.cmd` from the repository root, or run:

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools
```

After changing tablet code and pushing `master`, build and install an APK from that exact commit:

Double-click `BUILD_AND_INSTALL_TABLET_APK.cmd` from the repository root, or run:

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools
```

To keep APK downloads and Android platform-tools off the C drive, choose a work directory on another drive. The APK is stored under `G:\idai-field-android\apk`, and platform-tools are stored under `G:\idai-field-android\platform-tools`.

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android
```

Double-click `INSTALL_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd` for the same flow, or set `IDAI_FIELD_ANDROID_WORKDIR` before using the regular shortcut. For a fresh post-change APK on another drive, use `BUILD_AND_INSTALL_TABLET_APK_TO_OTHER_DRIVE.cmd` or:

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android
```

To only download that APK for manual transfer to a tablet:

Double-click `DOWNLOAD_LATEST_TABLET_APK.cmd` from the repository root, or run:

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly
```

To only download to another drive:

```powershell
.\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly -WorkDirectory G:\idai-field-android
```

You can also double-click `DOWNLOAD_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd`.

To build a fresh APK and only download it, use `BUILD_AND_DOWNLOAD_TABLET_APK.cmd` or `BUILD_AND_DOWNLOAD_TABLET_APK_TO_OTHER_DRIVE.cmd`.

```powershell
.\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadOnly -WorkDirectory G:\idai-field-android
```

For USB development on an installed development build:

```powershell
.\run-idai-field-tablet-ko.ps1 -InstallDebug
.\run-idai-field-tablet-ko.ps1
```

Korean installation notes for field users are in
[`docs/korean-fieldwork/android-tablet-install.ko.md`](../docs/korean-fieldwork/android-tablet-install.ko.md).

## Run iOS

   ```bash
   npm run ios
   ```
In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)

You can start developing by editing the files inside the **mobile** directory.

This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Development notes

### Linting

Run eslint with

```bash
npm run lint
```
