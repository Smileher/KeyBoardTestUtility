#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod browser;
#[cfg(windows)]
mod keyboard;

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

static NATIVE_READY: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo { native_keyboard: bool, store: bool, locks: Option<LockState> }

#[derive(Serialize)]
struct LockState { num: bool, caps: bool, scroll: bool }

#[tauri::command]
fn runtime_info() -> RuntimeInfo {
    #[cfg(windows)]
    let store = {
        use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFullName;
        let mut length = 0;
        unsafe { GetCurrentPackageFullName(&mut length, std::ptr::null_mut()) == 122 }
    };
    #[cfg(not(windows))]
    let store = false;
    #[cfg(windows)]
    let locks = Some(unsafe {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetKeyState;
        LockState { num: GetKeyState(0x90) & 1 != 0, caps: GetKeyState(0x14) & 1 != 0, scroll: GetKeyState(0x91) & 1 != 0 }
    });
    #[cfg(not(windows))]
    let locks = None;
    RuntimeInfo { native_keyboard: NATIVE_READY.load(Ordering::Acquire), store, locks }
}

#[tauri::command]
fn set_capture(active: bool) {
    #[cfg(windows)]
    keyboard::set_active(active);
    #[cfg(not(windows))]
    let _ = active;
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(browser::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![runtime_info, set_capture])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                browser::position_window(&window)?;
            }
            #[cfg(windows)]
            if let Some(window) = app.get_webview_window("main") {
                match keyboard::start(app.handle().clone(), window.hwnd()?.0 as usize) {
                    Ok(()) => NATIVE_READY.store(true, Ordering::Release),
                    Err(error) => eprintln!("Native keyboard unavailable: {error}"),
                }
            }
            Ok(())
        })
        .on_window_event(|_, event| {
            #[cfg(windows)]
            // 捕获请求由测试页控制；前台 HWND 检查负责失焦保护，避免两处焦点状态互相覆盖。
            if matches!(event, tauri::WindowEvent::Destroyed) { keyboard::set_active(false); }
            #[cfg(not(windows))]
            let _ = event;
        })
        .build(tauri::generate_context!())
        .expect("Failed to initialize Keyboard Test Utility");
    app.run(|_, event| {
        #[cfg(windows)]
        if matches!(event, tauri::RunEvent::Exit) { keyboard::stop(); }
        #[cfg(not(windows))]
        let _ = event;
    });
}
