# Project guide

KeyBoardTestUtility 2.0 uses one Vue frontend for the online and Tauri desktop editions. Input records and tested keys exist only in memory. Only language, theme and accent preferences are persisted in WebView/browser local storage.

## Develop

Use Node.js 24 LTS, pnpm 11.19 and Rust stable. Windows desktop builds need the MSVC C++ build tools, Windows SDK and WebView2. macOS builds need Xcode Command Line Tools.

```sh
pnpm install
pnpm dev
pnpm tauri:dev
pnpm test
pnpm build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

In VS Code, press **F5** and select **键盘测试实用程序：桌面开发运行（热更新）**. The built-in JavaScript debug terminal runs `pnpm tauri:dev`; no extra debug extension is needed to launch the app. This is a development launch with frontend hot reload, not Rust breakpoint debugging. Stop it with **Shift+F5**. **Ctrl+Shift+B** builds the Windows portable EXE.

`pnpm dev` runs the actual online edition, not a separate marketing preview. Desktop-only code is gated at runtime. The same source implements both layouts, themes, mouse feedback and records.

## Input behavior

- Capture is active only on the test page while the application is focused. Esc is a test key and never closes the application.
- Windows uses a low-level keyboard hook with its own message loop. It checks the foreground window on every callback; switching windows immediately restores ordinary input. Alt+Tab remains available. Lock keys continue to update the real system state.
- Native key positions use scan codes and the extended flag, so numpad navigation with NumLock off remains distinct from the navigation block. Media/launcher and unknown keys are also recorded with raw VK/scan codes. The hook forwards events through a queue to avoid blocking its message loop.
- Web and macOS editions use window keyboard events. Browser/OS reserved keys, Fn and Touch ID are not guaranteed to be available. Fn is displayed but excluded from test progress. Layouts are full-size ANSI Windows and Apple layouts.
- Left, middle and right mouse buttons respond throughout the focused test window. Side buttons are recorded too. Mouse and trackpad hardware cannot be reliably distinguished at this layer.
- Hold durations use monotonic clocks. System auto-repeat does not restart the original press time. Focus loss clears pressed states without fabricating releases or hold durations.
- Records are capped at 1,000 per session; the newest rows that fit the panel height are rendered without scrolling. Clear removes records; Reset also clears tested and pressed states.
- Browser actions such as selection, drag/drop, context menus, printing, refresh, zoom gestures and developer shortcuts are suppressed where the browser permits. WebView2 accelerator keys and developer tools are also disabled natively. Webpages cannot override every browser or operating system shortcut.

The desktop window starts centered at up to 1160 × 660 logical pixels and shrinks to fit the monitor work area. Title-bar dragging and resizing are disabled on Windows and macOS. A second launch brings the existing instance to the foreground. Theme controls are in the top bar; the default follows the system.

## Build and distribution

```powershell
pnpm portable
./scripts/build-portable.ps1 -Architecture arm64
```

Portable EXEs, ZIPs and SHA-256 files are written to `artifacts/<version>/`. The EXE embeds the frontend and uses the system WebView2 runtime. WebView2 is not bundled to keep downloads small; machines without it must install it first. `pnpm tauri:build` can also produce a local Windows installer.

On a Mac, run `pnpm tauri build --target aarch64-apple-darwin --bundles app,dmg`. The configured release target is Apple Silicon; Intel Mac and Linux are not claimed as verified targets. macOS release builds currently use ad-hoc signing, not Apple notarization. Distribution signing can be configured separately before public release.

## Release and Pages

Version strings in `package.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json` must match. Add `docs/releases/<version>.md` and push the matching `v<version>` tag to trigger Release. Windows x64/ARM64 ZIPs and an Apple Silicon DMG are built. A failed build leaves a draft; only complete releases are published. Published versions are never overwritten.

Updates are checked manually against the latest stable GitHub Release. The application opens the release downloads; it does not replace its own EXE or install downloaded code. Existing Windows package identity selects the Store-managed update UI and the original Store listing. This does not create or publish a new Store package.

Enable GitHub Pages with **GitHub Actions** as its source. The Pages workflow builds the same frontend with `/KeyBoardTestUtility/` as its base path. `?lang=en` or `?lang=zh-CN` selects the initial language. Run a Pages build locally with `GITHUB_PAGES=1 pnpm build` using the shell's environment-variable syntax.

The old WinUI implementation remains available in Git history. Its local project files have been removed with the owner's approval. The repository retains its original name `KeyBoardTestUtility`; the software retains the original English name `KeyBoardTestUtility`, Chinese name `键盘测试实用程序`, identity `54317Smileher.KeyBoardTestUtility`, and Store ID `9NKRGTGGQWSD`. Portable builds have no MSIX identity. The original MSIX publisher is `CN=426E8CF5-3861-440D-B400-CDB0323C5FD4` for any future Store packaging work.
