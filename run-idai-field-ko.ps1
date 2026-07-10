param(
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

$repoDir = $PSScriptRoot
$appDir = Join-Path $repoDir 'desktop'
$runtimeDir = if ($env:IDAI_FIELD_RUNTIME_DIR) {
    $env:IDAI_FIELD_RUNTIME_DIR
} else {
    Join-Path $repoDir '.runtime'
}
$tempDir = Join-Path $runtimeDir 'tmp'
$npmCacheDir = Join-Path $runtimeDir 'npm-cache'

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
New-Item -ItemType Directory -Path $npmCacheDir -Force | Out-Null
$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:npm_config_cache = $npmCacheDir

$serverUrl = 'http://localhost:4200/dist/'
$serverLog = Join-Path $tempDir 'idai-field-ng-serve-ko.log'

function Resolve-NodeDir {
    $candidateDirs = @()

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    }
    if ($npmCommand) {
        $candidateDirs += Split-Path -Parent $npmCommand.Source
    }

    if ($env:LOCALAPPDATA) {
        $codexRuntimeRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\runtimes'
        if (Test-Path -LiteralPath $codexRuntimeRoot) {
            $runtimeBins = @()
            foreach ($runtimeRoot in (Get-ChildItem -LiteralPath $codexRuntimeRoot -Directory -ErrorAction SilentlyContinue)) {
                $directBin = Join-Path $runtimeRoot.FullName 'bin'
                if (Test-Path -LiteralPath (Join-Path $directBin 'npm.cmd')) {
                    $runtimeBins += [pscustomobject]@{
                        DirectoryName = $directBin
                        LastWriteTime = (Get-Item -LiteralPath (Join-Path $directBin 'npm.cmd')).LastWriteTime
                    }
                }

                foreach ($runtimeVersion in (Get-ChildItem -LiteralPath $runtimeRoot.FullName -Directory -ErrorAction SilentlyContinue)) {
                    $nestedBin = Join-Path $runtimeVersion.FullName 'bin'
                    if (Test-Path -LiteralPath (Join-Path $nestedBin 'npm.cmd')) {
                        $runtimeBins += [pscustomobject]@{
                            DirectoryName = $nestedBin
                            LastWriteTime = (Get-Item -LiteralPath (Join-Path $nestedBin 'npm.cmd')).LastWriteTime
                        }
                    }
                }
            }

            $candidateDirs += $runtimeBins |
                Sort-Object LastWriteTime -Descending |
                ForEach-Object { $_.DirectoryName }
        }
    }

    foreach ($candidateDir in ($candidateDirs | Select-Object -Unique)) {
        if ($candidateDir -and
            (Test-Path -LiteralPath (Join-Path $candidateDir 'node.exe')) -and
            (Test-Path -LiteralPath (Join-Path $candidateDir 'npm.cmd'))) {
            return $candidateDir
        }
    }

    throw 'Node/npm runtime was not found. Install Node.js or launch Codex once to restore its bundled Node runtime.'
}

function Wait-ForEnter {
    Read-Host 'Press Enter to close'
}

function Test-FieldServer {
    try {
        $response = Invoke-WebRequest -Uri $serverUrl -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-IsCurrentRepoServerCommandLine {
    param([string] $CommandLine)

    if ([string]::IsNullOrWhiteSpace($CommandLine)) {
        return $false
    }

    return $CommandLine.IndexOf($repoDir, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
        $CommandLine.IndexOf($appDir, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Get-Port4200ListenerProcesses {
    $listeners = Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($listenerPid in $listeners) {
        Get-CimInstance Win32_Process -Filter "ProcessId=$listenerPid" -ErrorAction SilentlyContinue
    }
}

function Stop-StaleFieldServer {
    try {
        foreach ($process in (Get-Port4200ListenerProcesses)) {
            $commandLine = [string]$process.CommandLine
            $isCurrentRepoServer = Test-IsCurrentRepoServerCommandLine -CommandLine $commandLine

            if ($isCurrentRepoServer) {
                Write-Host "Stopping stale development server on port 4200 (PID $($process.ProcessId))."
                & taskkill.exe /PID $process.ProcessId /T /F | Out-Null
            }
        }
    } catch {
        Write-Host "Could not check for stale development server: $($_.Exception.Message)"
    }
}

function Assert-Port4200AvailableForField {
    $otherListeners = @(Get-Port4200ListenerProcesses | Where-Object {
        -not (Test-IsCurrentRepoServerCommandLine -CommandLine ([string]$_.CommandLine))
    })

    if ($otherListeners.Count -eq 0) {
        return
    }

    $listenerSummary = ($otherListeners | ForEach-Object {
        "$($_.Name) PID $($_.ProcessId)"
    }) -join ', '
    throw "Port 4200 is already used by another process ($listenerSummary). This launcher will not stop processes outside $repoDir."
}

function Stop-ProcessTree {
    param([System.Diagnostics.Process] $Process)

    if ($Process -and -not $Process.HasExited) {
        & taskkill.exe /PID $Process.Id /T /F | Out-Null
    }
}

function Ensure-DesktopDependencies {
    param([string] $NodeDir)

    $electronExe = Join-Path $appDir 'node_modules\electron\dist\electron.exe'
    if (Test-Path -LiteralPath $electronExe) {
        return
    }

    if ($CheckOnly) {
        throw "Electron runtime was not found: $electronExe"
    }

    Write-Host 'Field Desktop dependencies are not installed yet.'
    Write-Host 'Running npm run bootstrap. The first run can take several minutes.'

    $previousPath = $env:Path
    $env:Path = "$NodeDir;$env:Path"
    Push-Location -LiteralPath $repoDir
    try {
        & npm.cmd run bootstrap
        if ($LASTEXITCODE -ne 0) {
            throw "npm run bootstrap failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
        $env:Path = $previousPath
    }
}

$serverProcess = $null
$startedServer = $false

try {
    $nodeDir = Resolve-NodeDir

    if (-not (Test-Path -LiteralPath (Join-Path $appDir 'package.json'))) {
        throw "Desktop package was not found: $appDir"
    }

    Ensure-DesktopDependencies -NodeDir $nodeDir

    $electronExe = Join-Path $appDir 'node_modules\electron\dist\electron.exe'
    if (-not (Test-Path -LiteralPath $electronExe)) {
        throw "Electron runtime was not found: $electronExe"
    }

    if ($CheckOnly) {
        Write-Host "Launcher check passed."
        Write-Host "Node/npm runtime: $nodeDir"
        Write-Host "Desktop app: $appDir"
        Write-Host "Electron: $electronExe"
        exit 0
    }

    $env:Path = "$nodeDir;$env:Path"
    Set-Location -LiteralPath $appDir

    Write-Host 'Starting iDAI Field in Korean.'
    Stop-StaleFieldServer
    Assert-Port4200AvailableForField

    if (Test-FieldServer) {
        Write-Host 'Development server is already ready.'
    } else {
        Remove-Item -LiteralPath $serverLog -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath (Join-Path $appDir '.angular\cache') -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host 'Building the Korean development bundle. The first run can take 1-3 minutes.'
        Write-Host 'If Angular appears to pause at "Generating browser application bundles", keep waiting.'

        $command = "/c npm run ng:serve:ko > `"$serverLog`" 2>&1"
        $serverProcess = Start-Process -FilePath 'cmd.exe' `
            -ArgumentList $command `
            -WorkingDirectory $appDir `
            -WindowStyle Hidden `
            -PassThru
        $startedServer = $true

        $deadline = (Get-Date).AddMinutes(10)
        while (-not (Test-FieldServer)) {
            if ($serverProcess.HasExited) {
                Write-Host ''
                if (Test-Path -LiteralPath $serverLog) {
                    Get-Content -LiteralPath $serverLog -Tail 80
                }
                throw 'Angular development server exited before it was ready.'
            }

            if ((Get-Date) -gt $deadline) {
                Write-Host ''
                if (Test-Path -LiteralPath $serverLog) {
                    Get-Content -LiteralPath $serverLog -Tail 80
                }
                throw 'Timed out while waiting for the Angular development server.'
            }

            Write-Host -NoNewline '.'
            Start-Sleep -Seconds 5
        }

        Write-Host ''
        Write-Host 'Development server is ready.'
    }

    Write-Host 'Opening the app window.'
    $electronProcess = Start-Process -FilePath $electronExe `
        -ArgumentList '.', 'dev' `
        -WorkingDirectory $appDir `
        -PassThru

    Wait-Process -Id $electronProcess.Id
} catch {
    Write-Host ''
    Write-Host "Startup failed: $($_.Exception.Message)"
    Wait-ForEnter
    exit 1
} finally {
    if ($startedServer) {
        Stop-ProcessTree -Process $serverProcess
    }
}
