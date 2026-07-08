param(
    [string]$ApkPath = '.\dist\android\idai-field-mobile-release.apk',
    [string]$DeviceSerial,
    [switch]$FromLatestArtifact,
    [string]$Repo = 'lzpxilfe/idai-field',
    [string]$ArtifactName = 'idai-field-mobile-android-apk',
    [string]$DownloadDirectory = '.\dist\android',
    [switch]$DownloadOnly,
    [switch]$DownloadPlatformTools,
    [switch]$NoLaunch,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = $OutputEncoding

$repoDir = $PSScriptRoot
$packageName = 'kr.idai.fieldmobile'

function Show-Usage {
    Write-Host '현장 기록 Android APK installer'
    Write-Host ''
    Write-Host 'Usage:'
    Write-Host '  .\install-idai-field-android-apk.ps1 -ApkPath .\dist\android\idai-field-mobile-release.apk'
    Write-Host '  .\install-idai-field-android-apk.ps1 -ApkPath .\idai-field-mobile-release.apk -DownloadPlatformTools'
    Write-Host '  .\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools'
    Write-Host '  .\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly'
    Write-Host '  .\install-idai-field-android-apk.ps1 -DeviceSerial R83Y70CADYP'
    Write-Host ''
    Write-Host 'Enable Developer options and USB debugging on the tablet, then approve the USB debugging prompt.'
    Write-Host 'Use -FromLatestArtifact to download the newest APK artifact from GitHub Actions before installing.'
}

function Resolve-FullPath {
    param([string]$Path)

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $repoDir $Path))
}

function Assert-ChildPath {
    param(
        [string]$ChildPath,
        [string]$ParentPath
    )

    $resolvedParent = (Resolve-Path -LiteralPath $ParentPath).Path
    $resolvedChild = [System.IO.Path]::GetFullPath($ChildPath)

    if (-not $resolvedChild.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside the expected directory: $resolvedChild"
    }
}

function Install-PlatformTools {
    $toolsDir = Join-Path $repoDir '.tools\android'
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

    $zipPath = Join-Path $toolsDir 'platform-tools-latest-windows.zip'
    $platformToolsDir = Join-Path $toolsDir 'platform-tools'
    $downloadUrl = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

    Write-Host 'Downloading Android platform-tools.'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

    if (Test-Path -LiteralPath $platformToolsDir) {
        Assert-ChildPath -ChildPath $platformToolsDir -ParentPath $toolsDir
        Remove-Item -LiteralPath $platformToolsDir -Recurse -Force
    }

    Expand-Archive -LiteralPath $zipPath -DestinationPath $toolsDir -Force
    return Join-Path $platformToolsDir 'adb.exe'
}

function Resolve-Adb {
    $candidateFiles = @()

    if ($env:ANDROID_HOME) { $candidateFiles += Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe' }
    if ($env:ANDROID_SDK_ROOT) { $candidateFiles += Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe' }
    if ($env:LOCALAPPDATA) { $candidateFiles += Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe' }
    $candidateFiles += Join-Path $repoDir '.tools\android\platform-tools\adb.exe'

    $adbCommand = Get-Command adb.exe -ErrorAction SilentlyContinue
    if (-not $adbCommand) {
        $adbCommand = Get-Command adb -ErrorAction SilentlyContinue
    }
    if ($adbCommand) {
        $candidateFiles += $adbCommand.Source
    }

    foreach ($candidateFile in $candidateFiles) {
        if ($candidateFile -and (Test-Path -LiteralPath $candidateFile)) {
            return (Resolve-Path -LiteralPath $candidateFile).Path
        }
    }

    if ($DownloadPlatformTools) {
        return Install-PlatformTools
    }

    throw 'adb was not found. Install Android SDK platform-tools or rerun with -DownloadPlatformTools.'
}

function Resolve-GitHubCli {
    $ghCommand = Get-Command gh.exe -ErrorAction SilentlyContinue
    if (-not $ghCommand) {
        $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
    }
    if ($ghCommand) {
        return $ghCommand.Source
    }

    throw 'GitHub CLI (gh) was not found. Install GitHub CLI or pass -ApkPath to a downloaded APK.'
}

function Get-LatestArtifactRun {
    param(
        [string]$Gh,
        [string]$Repository,
        [string]$ExpectedArtifactName
    )

    $runsJson = & $Gh run list `
        --repo $Repository `
        --workflow Mobile `
        --status success `
        --json databaseId,displayTitle,createdAt,headSha,event `
        --limit 50
    if ($LASTEXITCODE -ne 0) { throw 'Could not list successful Mobile workflow runs.' }

    $runs = $runsJson | ConvertFrom-Json
    foreach ($run in $runs) {
        $artifactsJson = & $Gh api "repos/$Repository/actions/runs/$($run.databaseId)/artifacts"
        if ($LASTEXITCODE -ne 0) { continue }

        $artifacts = ($artifactsJson | ConvertFrom-Json).artifacts
        $artifact = $artifacts | Where-Object { $_.name -eq $ExpectedArtifactName } | Select-Object -First 1
        if ($artifact) {
            return [pscustomobject]@{
                Run = $run
                Artifact = $artifact
            }
        }
    }

    throw "No successful Mobile workflow run with artifact '$ExpectedArtifactName' was found. Run the Mobile workflow manually or push an android-* tag first."
}

function Get-ApkFromLatestArtifact {
    param(
        [string]$Repository,
        [string]$ExpectedArtifactName,
        [string]$TargetDirectory
    )

    $gh = Resolve-GitHubCli
    $downloadDir = Resolve-FullPath -Path $TargetDirectory
    New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null

    $artifactRun = Get-LatestArtifactRun `
        -Gh $gh `
        -Repository $Repository `
        -ExpectedArtifactName $ExpectedArtifactName

    $runDownloadDir = Join-Path $downloadDir "run-$($artifactRun.Run.databaseId)"
    New-Item -ItemType Directory -Force -Path $runDownloadDir | Out-Null

    Write-Host "Downloading APK artifact from Mobile run $($artifactRun.Run.databaseId): $($artifactRun.Run.displayTitle)"
    & $gh run download $artifactRun.Run.databaseId `
        --repo $Repository `
        --name $ExpectedArtifactName `
        --dir $runDownloadDir
    if ($LASTEXITCODE -ne 0) { throw 'GitHub Actions artifact download failed.' }

    $apk = Get-ChildItem -LiteralPath $runDownloadDir -Recurse -Filter '*.apk' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $apk) {
        throw "Downloaded artifact did not contain an APK file: $runDownloadDir"
    }

    return $apk.FullName
}

function Get-ConnectedDevices {
    param([string]$Adb)

    $devices = @()
    $problemRows = @()
    $lines = & $Adb devices -l
    foreach ($line in ($lines | Select-Object -Skip 1)) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }

        if ($line -match '^(\S+)\s+device\s*(.*)$') {
            $devices += [pscustomobject]@{
                Serial = $Matches[1]
                Details = $Matches[2]
            }
        } elseif ($line -match '^(\S+)\s+(unauthorized|offline)\s*(.*)$') {
            $problemRows += $line
        }
    }

    if ($devices.Count -eq 0) {
        if ($problemRows.Count -gt 0) {
            Write-Host 'A device is visible but unauthorized or offline:'
            $problemRows | ForEach-Object { Write-Host "  $_" }
        }
        throw 'No installable Android device was found. Approve the USB debugging prompt and try again.'
    }

    return $devices
}

function Select-Device {
    param(
        [array]$Devices,
        [string]$Serial
    )

    if ($Serial) {
        $selected = $Devices | Where-Object { $_.Serial -eq $Serial } | Select-Object -First 1
        if (-not $selected) {
            throw "The requested device was not found: $Serial"
        }
        return $selected.Serial
    }

    if ($Devices.Count -gt 1) {
        Write-Host 'Multiple devices are connected. Select one with -DeviceSerial.'
        $Devices | ForEach-Object { Write-Host "  $($_.Serial) $($_.Details)" }
        throw 'An install target device must be selected.'
    }

    return $Devices[0].Serial
}

if ($Help) {
    Show-Usage
    exit 0
}

try {
    $fullApkPath = if ($FromLatestArtifact) {
        Get-ApkFromLatestArtifact `
            -Repository $Repo `
            -ExpectedArtifactName $ArtifactName `
            -TargetDirectory $DownloadDirectory
    } else {
        Resolve-FullPath -Path $ApkPath
    }
    if (-not (Test-Path -LiteralPath $fullApkPath)) {
        throw "APK file was not found: $fullApkPath"
    }
    if ($DownloadOnly) {
        Write-Host "APK ready: $fullApkPath"
        exit 0
    }

    $adb = Resolve-Adb
    $devices = Get-ConnectedDevices -Adb $adb
    $serial = Select-Device -Devices $devices -Serial $DeviceSerial

    Write-Host "Install target: $serial"
    & $adb -s $serial install -r -d $fullApkPath
    if ($LASTEXITCODE -ne 0) { throw 'adb install failed' }

    Write-Host ''
    Write-Host 'APK installation completed.'

    if (-not $NoLaunch) {
        Write-Host 'Launching the app.'
        & $adb -s $serial shell monkey -p $packageName -c android.intent.category.LAUNCHER 1 | Out-Null
    }
} catch {
    Write-Host ''
    Write-Host "Android APK installation failed: $($_.Exception.Message)"
    exit 1
}
