use serde::Serialize;
use std::{cell::RefCell, collections::HashSet, sync::{atomic::{AtomicBool, AtomicU32, Ordering}, mpsc}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};
use tauri::Emitter;
use windows_sys::Win32::{
    System::{LibraryLoader::GetModuleHandleW, Threading::GetCurrentThreadId},
    UI::{Input::KeyboardAndMouse::GetAsyncKeyState, WindowsAndMessaging::*},
};

static ACTIVE: AtomicBool = AtomicBool::new(false);
static GENERATION: AtomicU32 = AtomicU32::new(0);
static THREAD: AtomicU32 = AtomicU32::new(0);
struct Context { events: mpsc::Sender<KeyInput>, hwnd: usize, started: Instant, pressed: HashSet<String>, generation: u32 }
thread_local! { static CONTEXT: RefCell<Option<Context>> = const { RefCell::new(None) }; }

#[derive(Clone, Serialize)]
struct KeyInput {
    code: String, raw: String, down: bool, repeat: bool, at: f64, monotonic: f64,
    source: &'static str,
    #[serde(rename = "dispatchDelayMs")]
    dispatch_delay_ms: f64,
    #[serde(skip)]
    captured: Instant,
}

pub fn set_active(active: bool) {
    if ACTIVE.swap(active, Ordering::AcqRel) != active { GENERATION.fetch_add(1, Ordering::AcqRel); }
}

pub fn start(app: tauri::AppHandle, hwnd: usize) -> Result<(), String> {
    let (sender, receiver) = mpsc::channel();
    let (events, inputs) = mpsc::channel::<KeyInput>();
    // 低级钩子必须迅速返回；WebView 事件发送独立执行，避免系统因超时移除钩子。
    std::thread::spawn(move || {
        for mut input in inputs {
            // 同一原生时钟内测量钩子到转发的时间，不与 JS performance.now 混算。
            input.dispatch_delay_ms = input.captured.elapsed().as_secs_f64() * 1000.0;
            if app.emit("keyboard-input", input).is_err() { set_active(false); break; }
        }
    });
    std::thread::spawn(move || unsafe {
        CONTEXT.with(|context| *context.borrow_mut() = Some(Context { events, hwnd, started: Instant::now(), pressed: HashSet::new(), generation: 0 }));
        // 钩子回调运行在此线程的消息循环中，避免阻塞 WebView/UI 线程。
        let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(callback), GetModuleHandleW(std::ptr::null()), 0);
        if hook.is_null() { let _ = sender.send(Err(std::io::Error::last_os_error().to_string())); return; }
        THREAD.store(GetCurrentThreadId(), Ordering::Release);
        let mut message: MSG = std::mem::zeroed();
        PeekMessageW(&mut message, std::ptr::null_mut(), 0, 0, PM_NOREMOVE);
        if sender.send(Ok(())).is_err() { UnhookWindowsHookEx(hook); return; }
        while GetMessageW(&mut message, std::ptr::null_mut(), 0, 0) > 0 { TranslateMessage(&message); DispatchMessageW(&message); }
        UnhookWindowsHookEx(hook);
        THREAD.store(0, Ordering::Release);
    });
    receiver.recv_timeout(Duration::from_secs(3)).map_err(|error| error.to_string())?
}

pub fn stop() {
    set_active(false);
    let thread = THREAD.load(Ordering::Acquire);
    if thread != 0 { unsafe { PostThreadMessageW(thread, WM_QUIT, 0, 0); } }
}

unsafe extern "system" fn callback(ncode: i32, wparam: usize, lparam: isize) -> isize {
    if ncode < 0 { return CallNextHookEx(std::ptr::null_mut(), ncode, wparam, lparam); }
    let message = wparam as u32;
    if !matches!(message, WM_KEYDOWN | WM_KEYUP | WM_SYSKEYDOWN | WM_SYSKEYUP) { return CallNextHookEx(std::ptr::null_mut(), ncode, wparam, lparam); }
    let captured = Instant::now();
    let data = &*(lparam as *const KBDLLHOOKSTRUCT);
    let suppress = CONTEXT.with(|context| {
        let mut context = context.borrow_mut();
        let Some(context) = context.as_mut() else { return false };
        let generation = GENERATION.load(Ordering::Acquire);
        if context.generation != generation { context.pressed.clear(); context.generation = generation; }
        // 即使前端命令尚未到达，失焦窗口也绝不吞掉其他程序的输入。
        if !ACTIVE.load(Ordering::Acquire) || GetForegroundWindow() as usize != context.hwnd { context.pressed.clear(); return false; }
        // Alt 自身透传，因此系统能识别 Alt+Tab；其余组合键的第二个键仍可拦截。
        if data.vkCode == 0x09 && GetAsyncKeyState(0x12) < 0 { return false; }
        let extended = data.flags & LLKHF_EXTENDED != 0;
        let raw = format!("VK 0x{:02X} · SC 0x{:02X}{}", data.vkCode, data.scanCode, if extended { " · E0" } else { "" });
        let mapped = physical_code(data.scanCode, extended, data.vkCode);
        let code = if mapped.is_empty() { raw.clone() } else { mapped.to_owned() };
        let down = matches!(message, WM_KEYDOWN | WM_SYSKEYDOWN);
        let repeat = down && !context.pressed.insert(code.clone());
        if !down { context.pressed.remove(&code); }
        let input = KeyInput { code, raw, down, repeat, at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs_f64() * 1000.0, monotonic: context.started.elapsed().as_secs_f64() * 1000.0, source: "native", dispatch_delay_ms: 0.0, captured };
        if context.events.send(input).is_err() { set_active(false); return false; }
        !matches!(data.vkCode, 0x12 | 0xa4 | 0xa5 | 0x14 | 0x90 | 0x91)
    });
    if suppress { 1 } else { CallNextHookEx(std::ptr::null_mut(), ncode, wparam, lparam) }
}

fn physical_code(scan: u32, extended: bool, vk: u32) -> &'static str {
    // 媒体键和启动键的扫描码可能与普通键重叠，先按 VK 区分。
    match vk {
        0xad => return "AudioVolumeMute", 0xae => return "AudioVolumeDown", 0xaf => return "AudioVolumeUp",
        0xb0 => return "MediaTrackNext", 0xb1 => return "MediaTrackPrevious", 0xb2 => return "MediaStop", 0xb3 => return "MediaPlayPause",
        0xb4 => return "LaunchMail", 0xb5 => return "MediaSelect", 0xb6 => return "LaunchApp1", 0xb7 => return "LaunchApp2",
        0xa6 => return "BrowserBack", 0xa7 => return "BrowserForward", 0xa8 => return "BrowserRefresh", 0xa9 => return "BrowserStop", 0xaa => return "BrowserSearch", 0xab => return "BrowserFavorites", 0xac => return "BrowserHome",
        0x7c..=0x87 => return ["F13","F14","F15","F16","F17","F18","F19","F20","F21","F22","F23","F24"][(vk - 0x7c) as usize],
        _ => {}
    }
    match vk { 0x13 => return "Pause", 0x2c => return "PrintScreen", 0x90 => return "NumLock", 0x91 => return "ScrollLock", 0x5b => return "MetaLeft", 0x5c => return "MetaRight", 0x5d => return "ContextMenu", _ => {} }
    if extended {
        return match scan { 0x1c => "NumpadEnter", 0x1d => "ControlRight", 0x35 => "NumpadDivide", 0x38 => "AltRight", 0x47 => "Home", 0x48 => "ArrowUp", 0x49 => "PageUp", 0x4b => "ArrowLeft", 0x4d => "ArrowRight", 0x4f => "End", 0x50 => "ArrowDown", 0x51 => "PageDown", 0x52 => "Insert", 0x53 => "Delete", _ => "" };
    }
    match scan {
        0x01 => "Escape", 0x02 => "Digit1", 0x03 => "Digit2", 0x04 => "Digit3", 0x05 => "Digit4", 0x06 => "Digit5", 0x07 => "Digit6", 0x08 => "Digit7", 0x09 => "Digit8", 0x0a => "Digit9", 0x0b => "Digit0", 0x0c => "Minus", 0x0d => "Equal", 0x0e => "Backspace", 0x0f => "Tab",
        0x10 => "KeyQ", 0x11 => "KeyW", 0x12 => "KeyE", 0x13 => "KeyR", 0x14 => "KeyT", 0x15 => "KeyY", 0x16 => "KeyU", 0x17 => "KeyI", 0x18 => "KeyO", 0x19 => "KeyP", 0x1a => "BracketLeft", 0x1b => "BracketRight", 0x1c => "Enter", 0x1d => "ControlLeft",
        0x1e => "KeyA", 0x1f => "KeyS", 0x20 => "KeyD", 0x21 => "KeyF", 0x22 => "KeyG", 0x23 => "KeyH", 0x24 => "KeyJ", 0x25 => "KeyK", 0x26 => "KeyL", 0x27 => "Semicolon", 0x28 => "Quote", 0x29 => "Backquote", 0x2a => "ShiftLeft", 0x2b => "Backslash",
        0x2c => "KeyZ", 0x2d => "KeyX", 0x2e => "KeyC", 0x2f => "KeyV", 0x30 => "KeyB", 0x31 => "KeyN", 0x32 => "KeyM", 0x33 => "Comma", 0x34 => "Period", 0x35 => "Slash", 0x36 => "ShiftRight", 0x37 => "NumpadMultiply", 0x38 => "AltLeft", 0x39 => "Space", 0x3a => "CapsLock",
        0x3b => "F1", 0x3c => "F2", 0x3d => "F3", 0x3e => "F4", 0x3f => "F5", 0x40 => "F6", 0x41 => "F7", 0x42 => "F8", 0x43 => "F9", 0x44 => "F10", 0x47 => "Numpad7", 0x48 => "Numpad8", 0x49 => "Numpad9", 0x4a => "NumpadSubtract", 0x4b => "Numpad4", 0x4c => "Numpad5", 0x4d => "Numpad6", 0x4e => "NumpadAdd", 0x4f => "Numpad1", 0x50 => "Numpad2", 0x51 => "Numpad3", 0x52 => "Numpad0", 0x53 => "NumpadDecimal", 0x56 => "IntlBackslash", 0x57 => "F11", 0x58 => "F12",
        0x70 => "KanaMode", 0x73 => "IntlRo", 0x79 => "Convert", 0x7b => "NonConvert", 0x7d => "IntlYen", _ => "",
    }
}

#[cfg(test)]
mod tests {
    use super::physical_code;
    #[test]
    fn jis_keys_keep_their_physical_identity() {
        for (scan, expected) in [(0x70, "KanaMode"), (0x73, "IntlRo"), (0x79, "Convert"), (0x7b, "NonConvert"), (0x7d, "IntlYen")] {
            assert_eq!(physical_code(scan, false, 0), expected);
        }
    }
    #[test]
    fn separates_numpad_and_navigation_with_numlock_off() {
        assert_eq!(physical_code(0x47, false, 0x24), "Numpad7");
        assert_eq!(physical_code(0x47, true, 0x24), "Home");
        assert_eq!(physical_code(0x1c, false, 0x0d), "Enter");
        assert_eq!(physical_code(0x1c, true, 0x0d), "NumpadEnter");
    }
    #[test]
    fn pause_and_numlock_share_scan_but_not_identity() {
        assert_eq!(physical_code(0x45, false, 0x13), "Pause");
        assert_eq!(physical_code(0x45, true, 0x90), "NumLock");
        assert_eq!(physical_code(0x38, true, 0xa5), "AltRight");
    }
    #[test]
    fn media_and_launch_keys_do_not_collide_with_scan_codes() {
        assert_eq!(physical_code(0x30, true, 0xaf), "AudioVolumeUp");
        assert_eq!(physical_code(0x21, true, 0xb7), "LaunchApp2");
        assert_eq!(physical_code(0x64, false, 0x7c), "F13");
        assert_eq!(physical_code(0xff, true, 0xff), "");
    }
}
