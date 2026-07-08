$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$desktop = [Environment]::GetFolderPath("Desktop")
$iconPath = Join-Path $repoRoot "desktop\img\logo.ico"

$shell = New-Object -ComObject WScript.Shell

function New-FieldDesktopShortcut {
    param(
        [string]$Name,
        [string]$TargetFile,
        [string]$Description
    )

    $shortcutPath = Join-Path $desktop "$Name.lnk"
    $targetPath = Join-Path $repoRoot $TargetFile
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $repoRoot
    $shortcut.Description = $Description
    if (Test-Path -LiteralPath $iconPath) {
        $shortcut.IconLocation = $iconPath
    }
    $shortcut.Save()

    Write-Host "Created $shortcutPath"
}

New-FieldDesktopShortcut `
    -Name "Field Desktop" `
    -TargetFile "START_FIELD_DESKTOP.cmd" `
    -Description "Open the Korean iDAI Field Desktop app"

New-FieldDesktopShortcut `
    -Name "Field Desktop (other drive cache)" `
    -TargetFile "START_FIELD_DESKTOP_TO_OTHER_DRIVE.cmd" `
    -Description "Open Field Desktop and choose an external runtime/cache directory"
