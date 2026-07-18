param(
    [string]$ApkPath = '.\dist\android\idai-field-mobile-release.apk',
    [string]$DeviceSerial,
    [switch]$FromLatestArtifact,
    [switch]$BuildLatestArtifact,
    [string]$Repo = 'lzpxilfe/idai-field-Korea',
    [string]$ArtifactName = 'idai-field-mobile-android-apk',
    [string]$ArtifactRef = 'master',
    [int]$ArtifactTimeoutMinutes = 90,
    [int]$ArtifactPollSeconds = 20,
    [switch]$AllowRefMismatch,
    [string]$DownloadDirectory,
    [string]$WorkDirectory = $env:IDAI_FIELD_ANDROID_WORKDIR,
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
    Write-Host '  .\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android'
    Write-Host '  .\install-idai-field-android-apk.ps1 -BuildLatestArtifact -DownloadPlatformTools -WorkDirectory G:\idai-field-android'
    Write-Host '  .\install-idai-field-android-apk.ps1 -BuildLatestArtifact -AllowRefMismatch'
    Write-Host '  .\install-idai-field-android-apk.ps1 -FromLatestArtifact -DownloadOnly'
    Write-Host '  .\install-idai-field-android-apk.ps1 -DeviceSerial R83Y70CADYP'
    Write-Host ''
    Write-Host 'Enable Developer options and USB debugging on the tablet, then approve the USB debugging prompt.'
    Write-Host 'Use -FromLatestArtifact to download the newest APK artifact from GitHub Actions before installing.'
    Write-Host 'Use -BuildLatestArtifact after code changes to start the Mobile APK build, wait for it, then install that exact artifact.'
    Write-Host 'Before -BuildLatestArtifact starts, the script verifies that local HEAD matches the GitHub ref being built.'
    Write-Host 'Use -AllowRefMismatch only when you intentionally want to build the remote ref even if local files differ.'
    Write-Host 'Use -WorkDirectory or IDAI_FIELD_ANDROID_WORKDIR to keep APK and Android tool downloads off the repository drive.'
}

function Resolve-FullPath {
    param([string]$Path)

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $repoDir $Path))
}

function Resolve-AndroidWorkDirectory {
    if ([string]::IsNullOrWhiteSpace($WorkDirectory)) {
        return $null
    }

    return Resolve-FullPath -Path $WorkDirectory
}

function Resolve-ApkDownloadDirectory {
    if (-not [string]::IsNullOrWhiteSpace($DownloadDirectory)) {
        return Resolve-FullPath -Path $DownloadDirectory
    }

    $workDir = Resolve-AndroidWorkDirectory
    if ($workDir) {
        return Join-Path $workDir 'apk'
    }

    return Resolve-FullPath -Path '.\dist\android'
}

function Resolve-PlatformToolsCacheDirectory {
    $workDir = Resolve-AndroidWorkDirectory
    if ($workDir) {
        return $workDir
    }

    return Join-Path $repoDir '.tools\android'
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
    $toolsDir = Resolve-PlatformToolsCacheDirectory
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

    $zipPath = Join-Path $toolsDir 'platform-tools-latest-windows.zip'
    $platformToolsDir = Join-Path $toolsDir 'platform-tools'
    $downloadUrl = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

    Write-Host "Downloading Android platform-tools to: $toolsDir"
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
    $candidateFiles += Join-Path (Resolve-PlatformToolsCacheDirectory) 'platform-tools\adb.exe'

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

function Resolve-GitCommand {
    $gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
    if (-not $gitCommand) {
        $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    }
    if ($gitCommand) {
        return $gitCommand.Source
    }

    return $null
}

function Get-GitHubRefSha {
    param(
        [string]$Gh,
        [string]$Repository,
        [string]$Ref
    )

    $commitJson = & $Gh api "repos/$Repository/commits/$Ref"
    if ($LASTEXITCODE -ne 0) { return $null }

    return ($commitJson | ConvertFrom-Json).sha
}

function Assert-ArtifactRefMatchesLocalWorktree {
    param(
        [string]$Gh,
        [string]$Repository,
        [string]$Ref,
        [switch]$AllowMismatch
    )

    if ($AllowMismatch) {
        Write-Host "Skipping local/ref freshness check because -AllowRefMismatch was passed."
        return
    }

    $git = Resolve-GitCommand
    if (-not $git) {
        throw 'Git was not found. Install Git or rerun with -AllowRefMismatch if you intentionally want to build the remote ref.'
    }

    $gitMetadataPath = Join-Path $repoDir '.git'
    if (-not (Test-Path -LiteralPath $gitMetadataPath)) {
        throw 'This folder has no .git metadata. Use -FromLatestArtifact for regular installs, or rerun with -AllowRefMismatch to build the remote ref anyway.'
    }

    $status = @(& $git -C $repoDir status --porcelain)
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not inspect local git status before starting the APK build.'
    }
    if ($status.Count -gt 0) {
        $statusPreview = ($status | Select-Object -First 8) -join '; '
        throw "Local changes are not committed: $statusPreview. Commit and push them before building a tablet APK, or rerun with -AllowRefMismatch to build remote '$Ref' anyway."
    }

    $localHeadOutput = @(& $git -C $repoDir rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $localHeadOutput.Count -eq 0 -or [string]::IsNullOrWhiteSpace($localHeadOutput[0])) {
        throw 'Could not inspect local git HEAD before starting the APK build.'
    }
    $localHead = $localHeadOutput[0].Trim()

    $remoteHead = Get-GitHubRefSha -Gh $Gh -Repository $Repository -Ref $Ref
    if ([string]::IsNullOrWhiteSpace($remoteHead)) {
        throw "Could not resolve GitHub ref '$Ref' in $Repository before starting the APK build."
    }
    $remoteHead = $remoteHead.Trim()

    if ($localHead -ne $remoteHead) {
        throw "Local HEAD $($localHead.Substring(0, 12)) does not match $Repository@$Ref $($remoteHead.Substring(0, 12)). Commit and push the local code before installing it on the tablet, or rerun with -AllowRefMismatch to build the remote ref anyway."
    }

    Write-Host "Local HEAD matches $Repository@$Ref ($($localHead.Substring(0, 12)))."
}

function Get-RunArtifact {
    param(
        [string]$Gh,
        [string]$Repository,
        [string]$ExpectedArtifactName,
        [long]$RunId
    )

    $artifactsJson = & $Gh api "repos/$Repository/actions/runs/$RunId/artifacts"
    if ($LASTEXITCODE -ne 0) { return $null }

    $artifacts = @((($artifactsJson | ConvertFrom-Json).artifacts))
    return $artifacts |
        Where-Object { $_.name -eq $ExpectedArtifactName } |
        Select-Object -First 1
}

function Wait-RunArtifact {
    param(
        [string]$Gh,
        [string]$Repository,
        [string]$ExpectedArtifactName,
        [long]$RunId
    )

    $deadline = [DateTime]::UtcNow.AddMinutes(5)
    while ([DateTime]::UtcNow -lt $deadline) {
        $artifact = Get-RunArtifact `
            -Gh $Gh `
            -Repository $Repository `
            -ExpectedArtifactName $ExpectedArtifactName `
            -RunId $RunId
        if ($artifact) { return $artifact }

        Start-Sleep -Seconds 10
    }

    throw "Mobile workflow run $RunId completed but artifact '$ExpectedArtifactName' was not found."
}

function Start-MobileArtifactWorkflow {
    param(
        [string]$Gh,
        [string]$Repository,
        [string]$ExpectedArtifactName,
        [string]$Ref
    )

    $requestedAt = [DateTime]::UtcNow.AddMinutes(-2)
    $expectedHeadSha = Get-GitHubRefSha -Gh $Gh -Repository $Repository -Ref $Ref
    $pollSeconds = [Math]::Max(5, $ArtifactPollSeconds)
    $timeoutMinutes = [Math]::Max(1, $ArtifactTimeoutMinutes)
    $deadline = [DateTime]::UtcNow.AddMinutes($timeoutMinutes)
    $lastReportedRunId = $null

    Write-Host "Starting Mobile workflow on ref '$Ref' to build APK artifact."
    & $Gh workflow run Mobile --repo $Repository --ref $Ref
    if ($LASTEXITCODE -ne 0) { throw 'Could not start the Mobile workflow.' }

    while ([DateTime]::UtcNow -lt $deadline) {
        $runsJson = & $Gh run list `
            --repo $Repository `
            --workflow Mobile `
            --event workflow_dispatch `
            --json databaseId,displayTitle,createdAt,headSha,status,conclusion `
            --limit 30
        if ($LASTEXITCODE -ne 0) { throw 'Could not list Mobile workflow_dispatch runs.' }

        $runs = $runsJson | ConvertFrom-Json
        $candidate = $runs |
            Where-Object {
                $createdAt = ([DateTime]$_.createdAt).ToUniversalTime()
                $createdAt -ge $requestedAt `
                    -and (-not $expectedHeadSha -or $_.headSha -eq $expectedHeadSha)
            } |
            Sort-Object { [DateTime]$_.createdAt } -Descending |
            Select-Object -First 1

        if ($candidate) {
            if ($lastReportedRunId -ne $candidate.databaseId) {
                Write-Host "Waiting for Mobile workflow run $($candidate.databaseId): $($candidate.displayTitle)"
                $lastReportedRunId = $candidate.databaseId
            }

            if ($candidate.status -eq 'completed') {
                if ($candidate.conclusion -ne 'success') {
                    throw "Mobile workflow run $($candidate.databaseId) finished with conclusion '$($candidate.conclusion)'."
                }

                $artifact = Wait-RunArtifact `
                    -Gh $Gh `
                    -Repository $Repository `
                    -ExpectedArtifactName $ExpectedArtifactName `
                    -RunId $candidate.databaseId

                return [pscustomobject]@{
                    Run = $candidate
                    Artifact = $artifact
                }
            }
        } else {
            Write-Host 'Waiting for the dispatched Mobile workflow run to appear.'
        }

        Start-Sleep -Seconds $pollSeconds
    }

    throw "Timed out waiting for Mobile workflow APK build after $timeoutMinutes minutes."
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
        $artifact = Get-RunArtifact `
            -Gh $Gh `
            -Repository $Repository `
            -ExpectedArtifactName $ExpectedArtifactName `
            -RunId $run.databaseId
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
        [string]$TargetDirectory,
        [object]$PreferredArtifactRun
    )

    $gh = Resolve-GitHubCli
    $downloadDir = if ([string]::IsNullOrWhiteSpace($TargetDirectory)) {
        Resolve-ApkDownloadDirectory
    } else {
        Resolve-FullPath -Path $TargetDirectory
    }
    New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
    Write-Host "Using APK download directory: $downloadDir"

    $artifactRun = if ($PreferredArtifactRun) {
        $PreferredArtifactRun
    } else {
        Get-LatestArtifactRun `
            -Gh $gh `
            -Repository $Repository `
            -ExpectedArtifactName $ExpectedArtifactName
    }

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
    $preferredArtifactRun = $null
    if ($BuildLatestArtifact) {
        $gh = Resolve-GitHubCli
        Assert-ArtifactRefMatchesLocalWorktree `
            -Gh $gh `
            -Repository $Repo `
            -Ref $ArtifactRef `
            -AllowMismatch:$AllowRefMismatch
        $preferredArtifactRun = Start-MobileArtifactWorkflow `
            -Gh $gh `
            -Repository $Repo `
            -ExpectedArtifactName $ArtifactName `
            -Ref $ArtifactRef
    }

    $fullApkPath = if ($FromLatestArtifact -or $BuildLatestArtifact) {
        Get-ApkFromLatestArtifact `
            -Repository $Repo `
            -ExpectedArtifactName $ArtifactName `
            -TargetDirectory $DownloadDirectory `
            -PreferredArtifactRun $preferredArtifactRun
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
