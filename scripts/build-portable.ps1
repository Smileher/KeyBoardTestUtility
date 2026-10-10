[CmdletBinding()]
param([ValidateSet('x64','arm64')][string]$Architecture = 'x64')
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Push-Location $repository
try {
    $version = (Get-Content -LiteralPath 'package.json' -Raw -Encoding UTF8 | ConvertFrom-Json).version
    $target = if ($Architecture -eq 'arm64') { 'aarch64-pc-windows-msvc' } else { 'x86_64-pc-windows-msvc' }
    & pnpm exec tauri build --target $target --no-bundle --ci '--' '--locked'
    if ($LASTEXITCODE -ne 0) { throw 'Portable build failed.' }
    $output = Join-Path $repository "artifacts\$version"
    New-Item -ItemType Directory -Path $output -Force | Out-Null
    $executable = Join-Path $output "KeyBoardTestUtility_${version}_${Architecture}.exe"
    Copy-Item -LiteralPath "src-tauri\target\$target\release\keyboard-test-utility.exe" -Destination $executable -Force
    $archive = Join-Path $output "KeyBoardTestUtility_${version}_${Architecture}_portable.zip"
    Compress-Archive -LiteralPath $executable -DestinationPath $archive -CompressionLevel Optimal -Force
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($archive)
    try { $hash = [System.BitConverter]::ToString($sha256.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $sha256.Dispose() }
    [System.IO.File]::WriteAllText("$archive.sha256", "$hash`n", [System.Text.Encoding]::UTF8)
    Write-Host "EXE: $executable"
    Write-Host "ZIP: $archive"
} finally { Pop-Location }
