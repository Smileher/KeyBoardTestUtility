[CmdletBinding()]
param([string]$InputDirectory, [string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $repository 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
if (-not $InputDirectory) { $InputDirectory = Join-Path $repository "artifacts/$version/store" }
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repository "artifacts/$version" }
$packages = @(Get-ChildItem -LiteralPath $InputDirectory -Filter '*.msix' -File)
if ($packages.Count -ne 2 -or -not ($packages.Name -contains "KeyBoardTestUtility_${version}.0_x64.msix") -or -not ($packages.Name -contains "KeyBoardTestUtility_${version}.0_arm64.msix")) { throw 'Expected this version of x64 and ARM64 Store packages.' }
$sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'
$makeAppx = Get-ChildItem -LiteralPath $sdkRoot -Directory | Where-Object Name -Match '^\d+\.\d+\.\d+\.\d+$' |
    Sort-Object { [version]$_.Name } -Descending | ForEach-Object { Join-Path $_.FullName 'x64/makeappx.exe' } |
    Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $makeAppx) { throw 'Install Windows SDK MakeAppx.exe before bundling.' }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$bundle = Join-Path $OutputDirectory "KeyBoardTestUtility_${version}.0_bundle.msixbundle"
& $makeAppx bundle /d $InputDirectory /p $bundle /bv "$version.0" /o
if ($LASTEXITCODE -ne 0) { throw 'Store bundle packaging failed.' }
$hash = (Get-FileHash -LiteralPath $bundle -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$bundle.sha256", "$hash`n", [Text.UTF8Encoding]::new($false))
Write-Host "Store upload bundle: $bundle"
