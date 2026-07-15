param(
    [switch]$InstallDebug,
    [string]$DeviceSerial,
    [int]$Port = 8081,
    [switch]$NoLaunch,
    [switch]$ClearCache,
    [switch]$CheckOnly,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = $OutputEncoding

$repoDir = $PSScriptRoot
$coreDir = Join-Path $repoDir 'core'
$mobileDir = Join-Path $repoDir 'mobile'
$androidDir = Join-Path $mobileDir 'android'
$packageName = 'kr.idai.fieldmobile'
$script:devRoot = $null

function Show-Usage {
    Write-Host '현장 기록 Android tablet launcher'
    Write-Host ''
    Write-Host 'Usage:'
    Write-Host '  .\run-idai-field-tablet-ko.ps1                 # Run an installed development build over USB'
    Write-Host '  .\run-idai-field-tablet-ko.ps1 -InstallDebug   # Build and install the debug APK, then run Metro'
    Write-Host '  .\run-idai-field-tablet-ko.ps1 -NoLaunch       # Start Metro only'
    Write-Host '  .\run-idai-field-tablet-ko.ps1 -ClearCache     # Rebuild the Metro cache when it is stale'
    Write-Host '  .\run-idai-field-tablet-ko.ps1 -CheckOnly      # Check local runtime'
    Write-Host ''
    Write-Host 'Expo Go is not used. This app needs a development build or APK because it uses native modules.'
}

function Resolve-DevRoot {
    $candidates = @()
    if ($env:IDAI_FIELD_DEV_ROOT) { $candidates += $env:IDAI_FIELD_DEV_ROOT }
    if (Test-Path 'G:\') { $candidates += 'G:\idai-field-dev' }
    if (Test-Path 'H:\') { $candidates += 'H:\idai-field-dev' }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        try {
            New-Item -ItemType Directory -Force -Path $candidate | Out-Null
            return (Resolve-Path -LiteralPath $candidate).Path
        } catch {}
    }

    throw 'G: or H: development storage is required. Connect a project drive and try again.'
}

function Ensure-DirectoryJunction {
    param(
        [string]$LinkPath,
        [string]$TargetPath
    )

    if (Test-Path -LiteralPath $LinkPath) { return }
    New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
    New-Item -ItemType Junction -Path $LinkPath -Target $TargetPath | Out-Null
}

function Initialize-DevStorage {
    param([string]$DevRoot)

    $cacheDir = Join-Path $DevRoot 'npm-cache'
    $gradleDir = Join-Path $DevRoot 'gradle'
    $tempDir = Join-Path $DevRoot 'temp'
    foreach ($path in @($cacheDir, $gradleDir, $tempDir)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }

    $env:IDAI_FIELD_DEV_ROOT = $DevRoot
    $env:IDAI_FIELD_ANDROID_WORKDIR = if (Test-Path 'G:\') {
        'G:\idai-field-android'
    } else {
        'H:\idai-field-android'
    }
    $env:npm_config_cache = $cacheDir
    $env:GRADLE_USER_HOME = $gradleDir
    $env:TEMP = $tempDir
    $env:TMP = $tempDir

    Ensure-DirectoryJunction `
        -LinkPath (Join-Path $mobileDir 'node_modules') `
        -TargetPath (Join-Path $DevRoot 'deps\mobile-node_modules')
    Ensure-DirectoryJunction `
        -LinkPath (Join-Path $androidDir '.gradle') `
        -TargetPath (Join-Path $DevRoot 'android\project-gradle')
    Ensure-DirectoryJunction `
        -LinkPath (Join-Path $androidDir 'build') `
        -TargetPath (Join-Path $DevRoot 'android\root-build')
    Ensure-DirectoryJunction `
        -LinkPath (Join-Path $androidDir 'app\build') `
        -TargetPath (Join-Path $DevRoot 'android\app-build')
    Ensure-DirectoryJunction `
        -LinkPath (Join-Path $androidDir 'app\.cxx') `
        -TargetPath (Join-Path $DevRoot 'android\app-cxx')
    Ensure-DirectoryJunction `
        -LinkPath (Join-Path $repoDir 'dist') `
        -TargetPath (Join-Path $DevRoot 'android\dist')
}

function Resolve-NodeDir {
    $candidateDirs = @()

    $requiredNodeVersion = (Get-Content -LiteralPath (Join-Path $mobileDir '.nvmrc') -Raw).Trim()
    $runtimeDirectoryName = "node-v$requiredNodeVersion-win-x64"
    $directRuntimeRoots = @()
    if ($script:devRoot) {
        $directRuntimeRoots += Join-Path $script:devRoot 'runtimes\codex'
    }
    if ($env:USERPROFILE) {
        $directRuntimeRoots += Join-Path $env:USERPROFILE '.codex\runtimes'
    }
    if ($env:CODEX_HOME) {
        $directRuntimeRoots += Join-Path $env:CODEX_HOME 'runtimes'
    }
    foreach ($runtimeRoot in ($directRuntimeRoots | Select-Object -Unique)) {
        $directCandidate = Join-Path $runtimeRoot $runtimeDirectoryName
        if ((Test-Path -LiteralPath (Join-Path $directCandidate 'node.exe')) -and
            (Test-Path -LiteralPath (Join-Path $directCandidate 'npm.cmd'))) {
            return $directCandidate
        }
    }

    if ($script:devRoot) {
        $devRuntimeRoot = Join-Path $script:devRoot 'runtimes'
        if (Test-Path -LiteralPath $devRuntimeRoot) {
            $candidateDirs += Get-ChildItem -LiteralPath $devRuntimeRoot -Recurse -Filter npm.cmd -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                ForEach-Object { $_.DirectoryName }
        }
    }

    if ($env:USERPROFILE) {
        $userCodexRuntimeRoot = Join-Path $env:USERPROFILE '.codex\runtimes'
        if (Test-Path -LiteralPath $userCodexRuntimeRoot) {
            $candidateDirs += Get-ChildItem -LiteralPath $userCodexRuntimeRoot -Recurse -Filter npm.cmd -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                ForEach-Object { $_.DirectoryName }
        }
    }

    if ($env:CODEX_HOME) {
        $codexHomeRuntimeRoot = Join-Path $env:CODEX_HOME 'runtimes'
        if (Test-Path -LiteralPath $codexHomeRuntimeRoot) {
            $candidateDirs += Get-ChildItem -LiteralPath $codexHomeRuntimeRoot -Recurse -Filter npm.cmd -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                ForEach-Object { $_.DirectoryName }
        }
    }

    if ($env:LOCALAPPDATA) {
        $codexRuntimeRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\runtimes'
        if (Test-Path -LiteralPath $codexRuntimeRoot) {
            $candidateDirs += Get-ChildItem -LiteralPath $codexRuntimeRoot -Recurse -Filter npm.cmd -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                ForEach-Object { $_.DirectoryName }
        }
    }

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    }
    if ($npmCommand) {
        $candidateDirs += Split-Path -Parent $npmCommand.Source
    }

    foreach ($candidateDir in $candidateDirs) {
        if ($candidateDir -and
            (Test-Path -LiteralPath (Join-Path $candidateDir 'node.exe')) -and
            (Test-Path -LiteralPath (Join-Path $candidateDir 'npm.cmd'))) {
            return $candidateDir
        }
    }

    throw 'Node/npm runtime was not found. Install Node.js or launch Codex once to restore its bundled Node runtime.'
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

    throw 'adb was not found. Prepare platform-tools with install-idai-field-android-apk.ps1 -DownloadPlatformTools.'
}

function Get-ConnectedDevices {
    param([string]$Adb)

    $devices = @()
    $lines = & $Adb devices -l
    foreach ($line in ($lines | Select-Object -Skip 1)) {
        if ($line -match '^(\S+)\s+device\s*(.*)$') {
            $devices += [pscustomobject]@{
                Serial = $Matches[1]
                Details = $Matches[2]
            }
        }
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

    if ($Devices.Count -eq 0) {
        throw 'No Android device is connected. Enable USB debugging and approve the prompt.'
    }

    if ($Devices.Count -gt 1) {
        Write-Host 'Multiple devices are connected. Select one with -DeviceSerial.'
        $Devices | ForEach-Object { Write-Host "  $($_.Serial) $($_.Details)" }
        throw 'A target device must be selected.'
    }

    return $Devices[0].Serial
}

function Invoke-NpmInstallIfNeeded {
    param(
        [string]$PackageDir,
        [string]$PackageName
    )

    if (-not (Test-Path -LiteralPath (Join-Path $PackageDir 'node_modules'))) {
        Write-Host "Installing $PackageName dependencies."
        Push-Location -LiteralPath $PackageDir
        try {
            & npm install --legacy-peer-deps
            if ($LASTEXITCODE -ne 0) { throw "$PackageName npm install failed" }
        } finally {
            Pop-Location
        }
    }
}

function Test-MetroServerReady {
    param([int]$MetroPort)

    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$MetroPort/status" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Stop-ExistingMetroServer {
    param([int]$MetroPort)

    $listeners = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($listenerPid in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$listenerPid" -ErrorAction SilentlyContinue
        if (-not $process) { continue }

        $commandLine = [string]$process.CommandLine
        $isExpectedDevServer = $commandLine.Contains($mobileDir) -or
            $commandLine.Contains($repoDir) -or
            $commandLine -match 'expo[\\/]bin[\\/]cli' -or
            $commandLine -match 'expo(\.cmd)?\s+start' -or
            $commandLine -match 'metro'

        if (-not $isExpectedDevServer) {
            throw "Port $MetroPort is already in use by PID $listenerPid. Stop that process or choose another -Port."
        }

        Write-Host "Stopping existing Metro server on port $MetroPort (PID $listenerPid)."
        & taskkill.exe /PID $listenerPid /T /F | Out-Null
    }
}

function Assert-CoreDistAssetsReady {
    $coreDistDir = Join-Path $coreDir 'dist'
    $requiredFiles = @(
        'config\Config-KoreanFieldwork.json',
        'config\Config-Meninx.json',
        'config\Core\Language.ko.json',
        'config\Library\Templates\Templates.json',
        'config\Library\Valuelists\Valuelists.json'
    )

    foreach ($requiredFile in $requiredFiles) {
        $fullPath = Join-Path $coreDistDir $requiredFile
        if (-not (Test-Path -LiteralPath $fullPath)) {
            throw "Built core asset is missing: $fullPath"
        }
    }
}

function Start-TabletLaunchWhenMetroReady {
    param(
        [string]$Adb,
        [string]$Serial,
        [int]$MetroPort
    )

    $statusUrl = "http://127.0.0.1:$MetroPort/status"
    $manifestUrl = "http://127.0.0.1:$MetroPort"
    $devClientBundleUrl = [System.Uri]::EscapeDataString($manifestUrl)
    $devClientUrl = "exp+idai-field-mobile://expo-development-client/?url=$devClientBundleUrl"
    $launchCommand = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$deadline = (Get-Date).AddMinutes(4)
do {
    try {
        `$response = Invoke-WebRequest -Uri '$statusUrl' -UseBasicParsing -TimeoutSec 5
        if (`$response.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep -Seconds 2
} while ((Get-Date) -lt `$deadline)

`$bundleReady = `$false
`$bundleDeadline = (Get-Date).AddMinutes(6)
do {
    try {
        `$manifest = Invoke-WebRequest -Uri '$manifestUrl' -UseBasicParsing -TimeoutSec 45 -Headers @{
            'Expo-Platform' = 'android'
            'Expo-API-Version' = '0'
        }
        `$manifestText = if (`$manifest.Content -is [byte[]]) {
            [System.Text.Encoding]::UTF8.GetString(`$manifest.Content)
        } else {
            [string]`$manifest.Content
        }
        `$bundleAssetUrl = (`$manifestText | ConvertFrom-Json).launchAsset.url
        if (`$bundleAssetUrl) {
            Invoke-WebRequest -Uri `$bundleAssetUrl -UseBasicParsing -TimeoutSec 240 | Out-Null
            `$bundleReady = `$true
            break
        }
    } catch {}
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt `$bundleDeadline)

if (-not `$bundleReady) { exit 1 }

& '$Adb' -s '$Serial' reverse 'tcp:$MetroPort' 'tcp:$MetroPort' | Out-Null
& '$Adb' -s '$Serial' shell am force-stop '$packageName' | Out-Null
Start-Sleep -Milliseconds 500
& '$Adb' -s '$Serial' shell am start -a android.intent.action.VIEW -d '$devClientUrl' '$packageName' | Out-Null
"@

    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-Command', $launchCommand) `
        -WindowStyle Hidden | Out-Null
}

if ($Help) {
    Show-Usage
    exit 0
}

try {
    $script:devRoot = Resolve-DevRoot
    Initialize-DevStorage -DevRoot $script:devRoot
    $nodeDir = Resolve-NodeDir

    if (-not (Test-Path -LiteralPath (Join-Path $mobileDir 'package.json'))) {
        throw "Mobile package was not found: $mobileDir"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $androidDir 'gradlew.bat'))) {
        throw "Android project was not found: $androidDir"
    }

    if ($CheckOnly) {
        $adb = Resolve-Adb
        $devices = @(Get-ConnectedDevices -Adb $adb)
        Write-Host 'Tablet launcher check passed.'
        Write-Host "Node/npm runtime: $nodeDir"
        Write-Host "Development storage: $script:devRoot"
        Write-Host "npm cache: $env:npm_config_cache"
        Write-Host "Gradle home: $env:GRADLE_USER_HOME"
        Write-Host "Mobile app: $mobileDir"
        Write-Host "adb: $adb"
        if ($devices.Count -gt 0) {
            Write-Host 'Connected devices:'
            $devices | ForEach-Object { Write-Host "  $($_.Serial) $($_.Details)" }
        }
        exit 0
    }

    $env:Path = "$nodeDir;$env:Path"
    Stop-ExistingMetroServer -MetroPort $Port

    if ($InstallDebug) {
        $buildScript = Join-Path $repoDir 'build-idai-field-android-apk.ps1'
        $buildArgs = @{ Variant = 'debug'; Install = $true }
        if ($DeviceSerial) { $buildArgs.DeviceSerial = $DeviceSerial }
        & $buildScript @buildArgs
        if ($LASTEXITCODE -ne 0) { throw 'Debug APK installation failed' }
    }

    Invoke-NpmInstallIfNeeded -PackageDir $coreDir -PackageName 'core'
    Invoke-NpmInstallIfNeeded -PackageDir $mobileDir -PackageName 'mobile'

    Write-Host 'Building core package.'
    Push-Location -LiteralPath $coreDir
    try {
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw 'core build failed' }
    } finally {
        Pop-Location
    }
    Assert-CoreDistAssetsReady

    $adb = Resolve-Adb
    $devices = @(Get-ConnectedDevices -Adb $adb)
    $serial = Select-Device -Devices $devices -Serial $DeviceSerial

    Write-Host "Configuring USB port forwarding: tcp:$Port"
    & $adb -s $serial reverse "tcp:$Port" "tcp:$Port"
    if ($LASTEXITCODE -ne 0) { throw 'adb reverse failed' }

    if (-not $NoLaunch) {
        Write-Host 'The tablet app will open the USB development bundle when Metro is ready.'
        Start-TabletLaunchWhenMetroReady -Adb $adb -Serial $serial -MetroPort $Port
    }

    Write-Host 'Starting the Metro development server.'
    Set-Location -LiteralPath $mobileDir
    $expoArgs = @('expo', 'start', '--dev-client', '--host', 'localhost', '--port', $Port)
    if ($ClearCache) { $expoArgs += '--clear' }
    & npx @expoArgs
} catch {
    Write-Host ''
    Write-Host "Tablet startup failed: $($_.Exception.Message)"
    exit 1
}
