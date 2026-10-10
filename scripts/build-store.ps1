[CmdletBinding()]
param(
    [ValidateSet('x64','arm64')][string]$Architecture = 'x64',
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Push-Location $repository
try {
    $version = (Get-Content -LiteralPath 'package.json' -Raw -Encoding UTF8 | ConvertFrom-Json).version
    $config = Get-Content -LiteralPath 'src-tauri/tauri.conf.json' -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($version -notmatch '^\d+\.\d+\.\d+$' -or $version -ne $config.version) { throw 'Application versions must match.' }
    $packageVersion = "$version.0"
    foreach ($part in $packageVersion.Split('.')) {
        $number = [uint16]0
        if (-not [uint16]::TryParse($part, [ref]$number)) { throw 'MSIX version components must be between 0 and 65535.' }
    }
    $target = if ($Architecture -eq 'arm64') { 'aarch64-pc-windows-msvc' } else { 'x86_64-pc-windows-msvc' }
    if (-not $SkipBuild) {
        & pnpm exec tauri build --target $target --no-bundle --ci -- --locked
        if ($LASTEXITCODE -ne 0) { throw 'Store executable build failed.' }
    }
    $executable = Join-Path $repository "src-tauri/target/$target/release/keyboard-test-utility.exe"
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw "Missing Store executable: $executable" }
    $sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'
    $makeAppx = Get-ChildItem -LiteralPath $sdkRoot -Directory | Where-Object Name -Match '^\d+\.\d+\.\d+\.\d+$' |
        Sort-Object { [version]$_.Name } -Descending | ForEach-Object { Join-Path $_.FullName 'x64/makeappx.exe' } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $makeAppx) { throw 'Install Windows SDK MakeAppx.exe before packaging.' }
    $output = Join-Path $repository "artifacts/$version/store"
    # 使用独立暂存目录，避免旧构建文件混入上传包。
    $stage = Join-Path $repository "src-tauri/target/store/$packageVersion/$Architecture/$([guid]::NewGuid())"
    New-Item -ItemType Directory -Path (Join-Path $stage 'Assets') -Force | Out-Null
    Copy-Item -LiteralPath $executable -Destination (Join-Path $stage 'KeyBoardTestUtility.exe')
    Add-Type -AssemblyName System.Drawing
    $icon = [Drawing.Bitmap]::new((Join-Path $repository 'src-tauri/icons/icon.png'))
    try {
        foreach ($item in @(@{ Name='StoreLogo'; Size=50 }, @{ Name='Square44x44Logo'; Size=44 }, @{ Name='Square150x150Logo'; Size=150 })) {
            $bitmap = [Drawing.Bitmap]::new($item.Size, $item.Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $graphics = [Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([Drawing.Color]::Transparent)
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($icon, 0, 0, $item.Size, $item.Size)
                $bitmap.Save((Join-Path $stage "Assets/$($item.Name).png"), [Drawing.Imaging.ImageFormat]::Png)
            } finally { $graphics.Dispose(); $bitmap.Dispose() }
        }
    } finally { $icon.Dispose() }
    # 沿用旧 Store 的 Identity、Publisher 和 Application Id，保留应用身份。
    $manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10" xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10" xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities" IgnorableNamespaces="uap rescap">
  <Identity Name="54317Smileher.KeyBoardTestUtility" Publisher="CN=426E8CF5-3861-440D-B400-CDB0323C5FD4" Version="$packageVersion" ProcessorArchitecture="$Architecture" />
  <Properties><DisplayName>KeyBoardTestUtility</DisplayName><PublisherDisplayName>Smileher</PublisherDisplayName><Description>Keyboard and mouse input tester</Description><Logo>Assets\StoreLogo.png</Logo></Properties>
  <Dependencies><TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" /></Dependencies>
  <Resources><Resource Language="zh-CN" /><Resource Language="en-US" /></Resources>
  <Applications><Application Id="App" Executable="KeyBoardTestUtility.exe" EntryPoint="Windows.FullTrustApplication"><uap:VisualElements DisplayName="KeyBoardTestUtility" Description="Keyboard and mouse input tester" BackgroundColor="transparent" Square44x44Logo="Assets\Square44x44Logo.png" Square150x150Logo="Assets\Square150x150Logo.png" /></Application></Applications>
  <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
"@
    [IO.File]::WriteAllText((Join-Path $stage 'AppxManifest.xml'), $manifest, [Text.UTF8Encoding]::new($false))
    New-Item -ItemType Directory -Path $output -Force | Out-Null
    $package = Join-Path $output "KeyBoardTestUtility_${packageVersion}_${Architecture}.msix"
    & $makeAppx pack /d $stage /p $package /o
    if ($LASTEXITCODE -ne 0) { throw 'MSIX packaging failed.' }
    Write-Host "Store upload package: $package"
} finally { Pop-Location }
