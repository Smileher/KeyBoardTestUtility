pub fn lock_position(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monitor) = window.current_monitor()? {
        let area = monitor.work_area();
        let scale = monitor.scale_factor();
        // 按逻辑像素适配工作区，为任务栏、标题栏和高 DPI 留出空间。
        window.set_size(tauri::LogicalSize::new(
            1160.0_f64.min((area.size.width as f64 / scale - 32.0).max(1.0)),
            660.0_f64.min((area.size.height as f64 / scale - 64.0).max(1.0)),
        ))?;
    }
    window.center()?;
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::UI::Shell::SetWindowSubclass;
        if SetWindowSubclass(window.hwnd()?.0 as _, Some(fixed_window), 1, 0) == 0 {
            return Err(std::io::Error::last_os_error().into());
        }
    }
    #[cfg(target_os = "macos")]
    unsafe {
        let native = &*(window.ns_window()? as *const objc2::runtime::AnyObject);
        let _: () = objc2::msg_send![native, setMovable: false];
        let _: () = objc2::msg_send![native, setMovableByWindowBackground: false];
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    let _ = window;
    Ok(())
}

#[cfg(windows)]
unsafe extern "system" fn fixed_window(hwnd: windows_sys::Win32::Foundation::HWND, message: u32, wparam: usize, lparam: isize, id: usize, _: usize) -> isize {
    use windows_sys::Win32::UI::{Shell::{DefSubclassProc, RemoveWindowSubclass}, WindowsAndMessaging::*};
    // 同时阻止标题栏拖动和系统菜单的移动命令，保留最小化与关闭。
    if message == WM_SYSCOMMAND && (wparam as u32 & 0xfff0) == SC_MOVE { return 0; }
    if message == WM_NCLBUTTONDOWN && wparam as i32 == HTCAPTION as i32 { return 0; }
    if message == WM_NCDESTROY { RemoveWindowSubclass(hwnd, Some(fixed_window), id); }
    DefSubclassProc(hwnd, message, wparam, lparam)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let builder = tauri::plugin::Builder::new("browser-policy");
    // WebView2 的 F12、打印等快捷键先于 DOM 处理，必须在原生设置中关闭。
    #[cfg(windows)]
    let builder = builder.on_webview_ready(|webview| {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
        use windows_core::Interface;
        if let Err(error) = webview.with_webview(|platform| {
            let configure = || -> windows_core::Result<()> {
                unsafe {
                    let settings = platform.controller().CoreWebView2()?.Settings()?;
                    settings.SetAreDefaultContextMenusEnabled(false)?;
                    settings.SetAreDevToolsEnabled(false)?;
                    settings.cast::<ICoreWebView2Settings3>()?.SetAreBrowserAcceleratorKeysEnabled(false)?;
                }
                Ok(())
            };
            if let Err(error) = configure() { eprintln!("Browser policy: {error}"); }
        }) { eprintln!("Browser initialization: {error}"); }
    });
    builder.build()
}
