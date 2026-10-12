# KeyBoardTestUtility 3.0 · 键盘测试实用程序

A compact keyboard and mouse tester, rebuilt with Vue 3 and Tauri 2. The website has a short introduction and an online tester that shares the desktop frontend.

[在线体验（中文）](https://smileher.github.io/KeyBoardTestUtility/?lang=zh-CN) · [Try online (English)](https://smileher.github.io/KeyBoardTestUtility/?lang=en) · [Desktop downloads](https://github.com/Smileher/KeyBoardTestUtility/releases/latest)

## Features

- Seven focused categories: keys, chatter, rollover, dropouts, event delay, typing and mouse, each with a short explanation.
- US ANSI, UK ISO, German QWERTZ, French AZERTY and Japanese JIS layouts, with distinct Windows and Mac geometry. Mac modifiers show both symbols and English names.
- Live pressed, released and tested states, timestamps and hold durations; repeat events retain the original press time.
- Five mouse buttons show feedback in a dedicated test area; tool buttons are excluded. Event records are collapsed by default and scroll when expanded.
- Simplified Chinese, Traditional Chinese, English, German, French, Japanese, Korean and Spanish. Interface language is independent of the physical keyboard layout.
- The original gradient sun/moon switch, circular theme reveal and eight accents with fades. Native Windows/macOS title bars follow the theme preference.
- A centered, resizable desktop window; launching again focuses the existing instance. Smaller windows can scroll the keyboard without shrinking key legends beyond readability.
- Extra media/launcher keys are recorded with their raw key codes, even when absent from the keyboard layout.
- Manual update checks, project links and author support.
- No saved input history. Only appearance, language, platform and layout preferences are persisted.

Chatter and dropout reports indicate suspected short release–press gaps, not a definitive hardware diagnosis. Event delay measures browser event handling or native hook forwarding, with separate clocks and statistics; it is not total keyboard hardware latency. Typing supports normal editing and input methods, and does not add typed text to event records.

## Desktop and web

| Edition | Input support | Distribution |
| --- | --- | --- |
| Windows 10 / 11 | Native foreground capture, including Win and Menu; Alt+Tab remains available | Portable x64 / ARM64 EXE and ZIP |
| macOS | Window keyboard events; OS-reserved shortcuts and Fn may be unavailable | Apple Silicon DMG |
| Online | Browser keyboard and mouse events; reserved system keys depend on the browser | GitHub Pages |

Esc is a test key and never closes the app. Switching away from the test page or losing focus pauses capture and clears held states. The Windows portable EXE uses the system **WebView2 Runtime**, which is not bundled. macOS releases currently use ad-hoc signing without Apple notarization; Mac hardware validation is still required. The Pages site becomes available after the workflow is deployed.

Store upload packages preserve the original [Microsoft Store listing](https://apps.microsoft.com/detail/9NKRGTGGQWSD) identity. Uploading the generated MSIX bundle through Partner Center is a separate step.

## Development

Requires Node.js 24, pnpm 11.19 and Rust stable; desktop builds also need the platform build tools.

```sh
pnpm install
pnpm dev
pnpm tauri:dev
pnpm test
pnpm build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

```powershell
pnpm portable
./scripts/build-portable.ps1 -Architecture arm64
```

Open the repository in VS Code and press **F5** using **键盘测试实用程序：桌面开发运行（热更新）** to launch the desktop app. This uses VS Code's built-in JavaScript debug terminal; Rust breakpoint debugging is not enabled. Run `pnpm install` once before first launch. **Ctrl+Shift+B** builds the Windows portable edition.

See the [project guide](docs/PROJECT_GUIDE.md) for input behavior, build prerequisites, Pages deployment and release workflows. Portable output is written to `artifacts/<version>/`.

## Release

Keep all version declarations in sync, add `docs/releases/<version>.md`, then push a `v<version>` tag. GitHub Actions builds Windows x64 / ARM64 portable files, a Store MSIX bundle and an Apple Silicon DMG, creates checksums, and publishes only after all builds succeed. Enable Pages with **GitHub Actions** as its source to deploy the shared frontend from `main`.

## Author and references

Created by **Smileher / ChenHe**. Keyboard visuals draw inspiration from [keyboardtest.cn](https://www.keyboardtest.cn/), event records from [便民查询网](https://keyboard.bmcx.com/), and settings / About interactions from [RemindOn](https://github.com/Smileher/RemindOn).

[Privacy policy](PrivacyPolicy.md) · [3.0.0 release notes](docs/releases/3.0.0.md)

The former WinUI implementation remains in Git history; the current source tree contains only the rewrite. The repository name `KeyBoardTestUtility`, application names, identity `54317Smileher.KeyBoardTestUtility`, and Store ID `9NKRGTGGQWSD` are preserved. A portable EXE has no MSIX package identity; publishing a Store package remains a separate step.
