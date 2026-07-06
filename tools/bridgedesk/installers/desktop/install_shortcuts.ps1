$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$desktop = [Environment]::GetFolderPath("Desktop")
$shell = New-Object -ComObject WScript.Shell

function New-BridgeDeskShortcut {
    param(
        [string] $Name,
        [string] $Target,
        [string] $Arguments = "",
        [string] $Description = ""
    )

    $shortcutPath = Join-Path $desktop "$Name.lnk"
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $Target
    $shortcut.Arguments = $Arguments
    $shortcut.WorkingDirectory = $root
    $shortcut.Description = $Description
    $shortcut.Save()
    Write-Host "Created $shortcutPath"
}

$exePath = Join-Path $root "dist\BridgeDesk\BridgeDesk.exe"
if (Test-Path $exePath) {
    New-BridgeDeskShortcut `
        -Name "BridgeDesk" `
        -Target $exePath `
        -Description "BridgeDesk desktop report workflow"
} else {
    New-BridgeDeskShortcut `
        -Name "BridgeDesk" `
        -Target (Join-Path $root "START_DESKTOP.cmd") `
        -Description "BridgeDesk desktop report workflow"
}

New-BridgeDeskShortcut `
    -Name "BridgeDesk Tablet Server" `
    -Target (Join-Path $root "START_TABLET_SERVER.cmd") `
    -Description "Open the tablet field input page on the local network"

New-BridgeDeskShortcut `
    -Name "BridgeDesk HWP Export" `
    -Target (Join-Path $root "EXPORT_HWP_REPORT.cmd") `
    -Description "Export HWP-friendly report assets"

Write-Host ""
Write-Host "Desktop shortcuts are ready."
