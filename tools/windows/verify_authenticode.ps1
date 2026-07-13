[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedPublisher,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedCertificateSha256
)

$ErrorActionPreference = 'Stop'

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
    throw "Authenticode target is not a file: $resolvedPath"
}

$signTool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signTool) {
    $windowsKits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'
    $signTool = Get-ChildItem -LiteralPath $windowsKits -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '[\\/]x64[\\/]signtool\.exe$' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
}
if (-not $signTool) {
    throw 'signtool.exe was not found. Install the Windows SDK signing tools.'
}

$signToolPath = if ($signTool.Source) { $signTool.Source } else { $signTool.FullName }
& $signToolPath verify /pa /all /v $resolvedPath
if ($LASTEXITCODE -ne 0) {
    throw "signtool verification failed for '$resolvedPath' with exit code $LASTEXITCODE."
}

$signature = Get-AuthenticodeSignature -LiteralPath $resolvedPath
if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
    throw "Authenticode signature is not valid for '$resolvedPath': $($signature.StatusMessage)"
}
if (-not $signature.SignerCertificate) {
    throw "No Authenticode signer certificate found for '$resolvedPath'."
}
if (-not $signature.TimeStamperCertificate) {
    throw "No trusted timestamp found for '$resolvedPath'."
}

$publisher = $signature.SignerCertificate.GetNameInfo(
    [System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName,
    $false
)
if ($publisher -cne $ExpectedPublisher.Trim()) {
    throw "Unexpected Authenticode publisher '$publisher'; expected '$ExpectedPublisher'."
}

$expectedSha256 = $ExpectedCertificateSha256 -replace '[^0-9A-Fa-f]', ''
$actualSha256 = $signature.SignerCertificate.GetCertHashString(
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
)
if ($actualSha256 -ine $expectedSha256) {
    throw "Unexpected signing certificate SHA-256 '$actualSha256'; expected '$expectedSha256'."
}

Write-Host "Verified Authenticode signature: $resolvedPath"
Write-Host "Publisher: $publisher"
Write-Host "Certificate SHA-256: $actualSha256"
