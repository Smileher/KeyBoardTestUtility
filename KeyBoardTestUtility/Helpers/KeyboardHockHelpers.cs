using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;

namespace KeyBoardTestUtility.Helpers;
internal class KeyboardHockHelpers
{

    private static KeyboardHockHelpers? s_Instance;
    public static KeyboardHockHelpers GetInstance()
    {
        s_Instance ??= new KeyboardHockHelpers();
        return s_Instance;
    }
    //定义变量
    public delegate int HookProc(int nCode, Int32 wParam, IntPtr lParam);
    private static int hKeyboardHook = 0;
    private HookProc? KeyboardHookProcedure;
    /*************************
     * 声明API函数
     * ***********************/
    // 安装钩子 （using System.Runtime.InteropServices;）
    [DllImport("user32.dll")]
    public static extern int SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hInstance, int threadId);
    // 卸载钩子,,
    [DllImport("user32.dll")]
    public static extern bool UnhookWindowsHookEx(int idHook);
    // 继续下一个钩子
    [DllImport("user32.dll")]
    public static extern int CallNextHookEx(int idHook, int nCode, Int32 wParam, IntPtr lParam);
    // 取得当前线程编号（线程钩子需要用到）
    [DllImport("kernel32.dll")]
    static extern int GetCurrentThreadId();
    public static EventHandler<KeyPressedEventArgs>? KeyDownEventHandler;
    public static EventHandler<KeyPressedEventArgs>? KeyUpEventHandler;

    //钩子子程：就是钩子所要做的事情
    private int KeyboardHookProc(int nCode, Int32 wParam, IntPtr lParam)
    {

        if (nCode >= 0)
        {
            KeyMSG m = (KeyMSG)Marshal.PtrToStructure(lParam, typeof(KeyMSG));
            int[] a = { 44, 45, 36, 33, 46, 35, 34, 38, 40, 37, 39, 13 };//功能区，方向键，Enter键
            string vkCode = a.Contains(m.vkCode) && (m.flags == 1 || m.flags == 129) ? m.vkCode + "_EX" : m.vkCode.ToString();
            int[] b = { 44, 45, 36, 33, 46, 35, 34, 38, 40, 37, 39, 12 };//功能区，方向键 数字5
            vkCode = b.Contains(m.vkCode) && vkCode.IndexOf("_EX") == -1 ? NumberKeyRibbon(m.vkCode).ToString() : vkCode;
            if (wParam == 0x100 || wParam == 0x104)
            {
                // 键盘按下
                //Debug.WriteLine("键盘按下-flag:" + m.flags + "---m_vkCode:" + m.vkCode + "---vkCode:" + vkCode);
                //App.GetMainPageInstance().KeyDownOp(vkCode);
                KeyDownEventHandler?.Invoke(vkCode, new KeyPressedEventArgs());
            }
            else if (wParam == 0x101)
            {
                // 键盘抬起
                //Debug.WriteLine("键盘抬起-flag:" + m.flags + "---m_vkCode:" + m.vkCode + "---vkCode:" + vkCode);
                //App.GetMainPageInstance().KeyUpOp(vkCode);
                KeyUpEventHandler?.Invoke(vkCode, new KeyPressedEventArgs());
            }
            //Debug.WriteLine(wParam);
            /****************
             //线程键盘钩子判断是否按下键
             Keys keyData = (Keys)wParam;
             if(lParam.ToInt32() > 0)
             {
              // 键盘按下
             }
             if(lParam.ToInt32() < 0)
             {
              // 键盘抬起
             }
            ****************/
            /****************
             //全局键盘钩子判断是否按下键
             wParam = = 0x100 // 键盘按下
             wParam = = 0x101 // 键盘抬起
            ****************/
            //KeyMSG m = (KeyMSG)Marshal.PtrToStructure(lParam, typeof(KeyMSG));//键盘
            // 在这里添加你想要做是事情(比如把键盘nCode记录下来,搞个邮件发送程序发到自己的邮箱去)
            return 1;//如果返回1，则结束消息，这个消息到此为止，不再传递。如果返回0或调用CallNextHookEx函数则消息出了这个钩子继续往下传递，也就是传给消息真正的接受者
        }
        return CallNextHookEx(hKeyboardHook, nCode, wParam, lParam);
    }
    /// <summary>
    /// 数字按键锁定时，小数字区的按键所代表的功能区对应的数字
    /// </summary>
    /// <param name="vkCode"></param>
    /// <returns></returns>
    private int NumberKeyRibbon(int vkCode)
    {
        switch (vkCode)
        {
            case 36: return 103;  //7
            case 38: return 104;  //8
            case 33: return 105;  //9

            case 37: return 100;  //4
            case 12: return 101;  //5
            case 39: return 102;  //6

            case 35: return 97;  //1
            case 40: return 98;  //2
            case 34: return 99; //3

            case 45: return 96; //0
            case 46: return 110; //.
            default:
                return -1;
        }
    }

    //键盘结构
    public struct KeyMSG
    {
        public int vkCode; //键值
        public int scanCode;
        public int flags;
        public int time;
        public int dwExtraInfo;
    }
    // 安装钩子
    public void HookStart()
    {
        if (hKeyboardHook == 0)
        {
            // 创建HookProc实例
            KeyboardHookProcedure = new HookProc(KeyboardHookProc);
            // 设置线程钩子

            hKeyboardHook = SetWindowsHookEx(13, KeyboardHookProcedure, Marshal.GetHINSTANCE(Assembly.GetExecutingAssembly().GetModules()[0]), 0);

            //************************************
            //键盘线程钩子
            //SetWindowsHookEx( 2,KeyboardHookProcedure, IntPtr.Zero, GetCurrentThreadId()); //GetCurrentThreadId()为要监视的线程ID,你完全可以自己写个方法获取QQ的线程哦
            //键盘全局钩子,需要引用空间(using System.Reflection;)
            //SetWindowsHookEx( 13,KeyboardHookProcedure,Marshal.GetHINSTANCE(Assembly.GetExecutingAssembly().GetModules()[0]),0);
            //
            //关于SetWindowsHookEx (int idHook, HookProc lpfn, IntPtr hInstance, int threadId)函数将钩子加入到钩子链表中，说明一下四个参数：
            //idHook 钩子类型，即确定钩子监听何种消息，上面的代码中设为2，即监听键盘消息并且是线程钩子，如果是全局钩子监听键盘消息应设为13，
            //线程钩子监听鼠标消息设为7，全局钩子监听鼠标消息设为14。
            //
            //lpfn 钩子子程的地址指针。如果dwThreadId参数为0 或是一个由别的进程创建的线程的标识，lpfn必须指向DLL中的钩子子程。 除此以外，lpfn可
            //以指向当前进程的一段钩子子程代码。钩子函数的入口地址，当钩子钩到任何消息后便调用这个函数。
            //
            //hInstance应用程序实例的句柄。标识包含lpfn所指的子程的DLL。如果threadId 标识当前进程创建的一个线程，而且子程代码位于当前
            //进程，hInstance必须为NULL。可以很简单的设定其为本应用程序的实例句柄。
            //
            //threadedId 与安装的钩子子程相关联的线程的标识符。如果为0，钩子子程与所有的线程关联，即为全局钩子。
            //************************************

            // 如果设置钩子失败
            if (hKeyboardHook == 0)
            {
                HookStop();
                throw new Exception("SetWindowsHookEx failed.");
            }
        }
    }
    // 卸载钩子
    public void HookStop()
    {
        bool retKeyboard = true;
        if (hKeyboardHook != 0)
        {
            retKeyboard = UnhookWindowsHookEx(hKeyboardHook);
            hKeyboardHook = 0;
        }
        if (!(retKeyboard))
            throw new Exception("UnhookWindowsHookEx failed.");
    }

    public class KeyPressedEventArgs
    {
    }
}