pub fn position_window(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monitor) = window.current_monitor()? {
        let area = monitor.work_area();
        let scale = monitor.scale_factor();
        // 按逻辑像素适配工作区，为任务栏、标题栏和高 DPI 留出空间。
        window.set_size(tauri::LogicalSize::new(
            1120.0_f64.min((area.size.width as f64 / scale - 32.0).max(1.0)),
            720.0_f64.min((area.size.height as f64 / scale - 64.0).max(1.0)),
        ))?;
    }
    window.center()?;
    Ok(())
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
