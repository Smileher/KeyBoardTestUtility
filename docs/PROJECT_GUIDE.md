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

The web task and desktop launcher reuse an existing Vite server on port 1420 after checking the project name and version. A different application on that port causes a clear error and is never terminated automatically. If you started the web task separately, stop that task separately when finished.

`pnpm dev` opens a short product introduction with an online test entry. `#test` opens the tester directly. Desktop-only code is gated at runtime. The same source implements both layouts, themes, mouse feedback and records; the introduction also reuses the keyboard component.

## Input behavior

- Capture is active only on the test page while the application is focused. Esc is a test key and never closes the application.
- Windows uses a low-level keyboard hook with its own message loop. It checks the foreground window on every callback; switching windows immediately restores ordinary input. Alt+Tab remains available. Lock keys continue to update the real system state.
- Native key positions use scan codes and the extended flag, so numpad navigation with NumLock off remains distinct from the navigation block. Media/launcher and unknown keys are also recorded with raw VK/scan codes. The hook forwards events through a queue to avoid blocking its message loop.
- Web and macOS editions use window keyboard events. Browser/OS reserved keys, Fn and Touch ID are not guaranteed to be available. Both modes use the same 104-key layout; Mac mode only changes the six Control, Command and Option legends. Fn is omitted. Apple-specific extra keys still appear in records when received.
- Left, middle and right mouse buttons respond throughout the test window, excluding tool buttons and other interactive controls. Releasing over a tool button still clears a press that started in the test area. Side buttons are recorded too. Mouse and trackpad hardware cannot be reliably distinguished at this layer.
- Hold durations use monotonic clocks. System auto-repeat does not restart the original press time. Focus loss clears pressed states without fabricating releases or hold durations.
- Records are capped at 1,000 per session; the newest rows that fit the panel height are rendered without scrolling. Clear removes records; Reset also clears tested and pressed states.
- Browser actions such as selection, drag/drop, context menus, printing, refresh, zoom gestures and developer shortcuts are suppressed where the browser permits. WebView2 accelerator keys and developer tools are also disabled natively. Webpages cannot override every browser or operating system shortcut.

The desktop window starts centered at up to 1020 × 540 logical pixels and shrinks to fit the monitor work area. Title-bar dragging is enabled; resizing remains disabled. A second launch brings the existing instance to the foreground. Larger keycaps sit above a 100-pixel mouse/record section; the table renders the newest rows that fit. Light keycaps have a raised edge and shadow. Windows/Command positions show Windows/Apple icons. The top bar has a gradient sun/moon switch; the new theme expands from the button center over 900 ms. Reduced motion or unavailable View Transitions apply the theme directly. The default follows the system until a theme is manually selected and saved.

## Build and distribution

```powershell
pnpm portable
./scripts/build-portable.ps1 -Architecture arm64
pnpm store
./scripts/build-store.ps1 -Architecture arm64
./scripts/bundle-store.ps1
```

Portable EXEs, ZIPs and SHA-256 files are written to `artifacts/<version>/`. The EXE embeds the frontend and uses the system WebView2 runtime. WebView2 is not bundled to keep downloads small; machines without it must install it first. `pnpm tauri:build` can also produce a local Windows installer.

Store scripts generate unsigned x64/ARM64 MSIX files under `artifacts/<version>/store/` and combine them into `artifacts/<version>/KeyBoardTestUtility_<version>.0_bundle.msixbundle`. These are Partner Center upload packages; Microsoft signs them after submission. Local installation requires separate trusted signing, which these scripts do not configure. `-SkipBuild` packages an already-built executable and is used after the portable build in Release CI.

On a Mac, run `pnpm tauri build --target aarch64-apple-darwin --bundles app,dmg`. The configured release target is Apple Silicon; Intel Mac and Linux are not claimed as verified targets. macOS release builds currently use ad-hoc signing, not Apple notarization. Distribution signing can be configured separately before public release.

## Release and Pages

Version strings in `package.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json` must match. Add `docs/releases/<version>.md` and push the matching `v<version>` tag to trigger Release. Windows x64/ARM64 portable files, the Store MSIX bundle and an Apple Silicon DMG are built. A failed build leaves a draft; only complete releases are published. Published versions are never overwritten.

Updates are checked manually against the latest stable GitHub Release. The application opens the release downloads; it does not replace its own EXE or install downloaded code. Existing Windows package identity selects the Store-managed update UI and the original Store listing. GitHub releases include an upload bundle; Store submission and certification remain separate.

Enable GitHub Pages with **GitHub Actions** as its source. The Pages workflow builds the same frontend with `/KeyBoardTestUtility/` as its base path. `?lang=en` or `?lang=zh-CN` selects the initial language. Run a Pages build locally with `GITHUB_PAGES=1 pnpm build` using the shell's environment-variable syntax.

The old WinUI implementation remains available in Git history. Its local project files have been removed with the owner's approval. The repository retains its original name `KeyBoardTestUtility`; the software retains the original English name `KeyBoardTestUtility`, Chinese name `键盘测试实用程序`, identity `54317Smileher.KeyBoardTestUtility`, and Store ID `9NKRGTGGQWSD`. Portable builds have no MSIX identity. Store packages preserve publisher `CN=426E8CF5-3861-440D-B400-CDB0323C5FD4` and application ID `App` from the original manifest.
