using System;
using System.Reflection.Emit;
using System.Runtime.InteropServices;

namespace KeyBoardTestUtility
{
    /// <summary>
    /// 屏蔽所有的系统按键
    /// </summary>
    class KeyboardHock
    {
        private struct KBDLLHOOKSTRUCT
        {
            public int vkCode;
            int scanCode;
            public int flags;
            int time;
            int dwExtraInfo;
        }
        public KeyboardHock()
        {
            IntPtr hModule = GetModuleHandle(IntPtr.Zero);
            hookProc = new LowLevelKeyboardProcDelegate(LowLevelKeyboardProc);
            hHook = SetWindowsHookEx(WH_KEYBOARD_LL, hookProc, hModule, 0);
            if (hHook == IntPtr.Zero)
            {
                Console.WriteLine("Failed to set hook, error = " + Marshal.GetLastWin32Error());
            }
        }
        private int LowLevelKeyboardProc(int nCode, int wParam, ref KBDLLHOOKSTRUCT lParam)
        {
            if (nCode >= 0)
            {
                MainWindow.GetInstance().KeyDown(lParam.vkCode.ToString());
                return 1;
            }
            else
            {
                return CallNextHookEx(0, nCode, wParam, ref lParam);
            }
            //if (nCode >= 0)
            //    switch (wParam)
            //    {
            //        //屏蔽下面的快捷键
            //        case 256: // WM_KEYDOWN
            //        case 257: // WM_KEYUP
            //        case 260: // WM_SYSKEYDOWN
            //        case 261: // M_SYSKEYUP
            //            if (
            //                (lParam.vkCode == 0x09 && lParam.flags == 32) || // Alt+Tab
            //                (lParam.vkCode == 0x1b && lParam.flags == 32) || // Alt+Esc
            //                (lParam.vkCode == 0x20 && lParam.flags == 32) || // Alt+Space
            //                (lParam.vkCode == 0x73 && lParam.flags == 32) || // Alt+F4
            //                (lParam.vkCode == 0x1b && lParam.flags == 0) || // Ctrl+Esc
            //                (lParam.vkCode == 0x5b && lParam.flags == 1) || // Left Windows Key 
            //                (lParam.vkCode == 0x5c && lParam.flags == 1))    // Right Windows Key 
            //            {
            //                return 1;
            //            }
            //            break;
            //    }
            //return CallNextHookEx(0, nCode, wParam, ref lParam);
        }

        private delegate int LowLevelKeyboardProcDelegate(int nCode, int wParam, ref KBDLLHOOKSTRUCT lParam);

        [DllImport("user32.dll")]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProcDelegate lpfn, IntPtr hMod, int dwThreadId);

        [DllImport("user32.dll")]
        private static extern bool UnhookWindowsHookEx(IntPtr hHook);

        [DllImport("user32.dll")]
        private static extern int CallNextHookEx(int hHook, int nCode, int wParam, ref KBDLLHOOKSTRUCT lParam);

        [DllImport("kernel32.dll")]
        private static extern IntPtr GetModuleHandle(IntPtr path);

        private IntPtr hHook;
        LowLevelKeyboardProcDelegate hookProc; // prevent gc
        const int WH_KEYBOARD_LL = 13;
    }
}
