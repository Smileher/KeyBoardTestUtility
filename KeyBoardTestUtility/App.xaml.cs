using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.UI.ViewManagement;

namespace KeyBoardTestUtility
{
    /// <summary>
    /// Provides application-specific behavior to supplement the default Application class.
    /// </summary>
    public partial class App : Application
    {
        KeyboardHock keyboardHock;
        /// <summary>
        /// Initializes the singleton application object.  This is the first line of authored code
        /// executed, and as such is the logical equivalent of main() or WinMain().
        /// </summary>
        public App()
        {
            this.InitializeComponent();
        }
        /// <summary>
        /// Invoked when the application is launched normally by the end user.  Other entry points
        /// will be used such as when the application is launched to open a specific file.
        /// </summary>
        /// <param name="args">Details about the launch request and process.</param>
        protected override void OnLaunched(LaunchActivatedEventArgs args)
        {
            m_window = new Window();
            m_window.Content = GetMainPageInstance();
            m_window.Activated += M_window_Activated;
            m_window.Closed += M_window_Closed;
            keyboardHock = new KeyboardHock();
            keyboardHock.HookStart();
            m_window.Activate();
        }
        private void M_window_Closed(object sender, WindowEventArgs args)
        {
            keyboardHock.HookStop();
        }

        private void M_window_Activated(object sender, WindowActivatedEventArgs args)
        {
            if (args.WindowActivationState == WindowActivationState.Deactivated)//窗口后台
            {
                keyboardHock.HookStop();
            }
            else
            {
                keyboardHock.HookStart();
            }
        }
        private static Window m_window;
        private static MainPage s_Instance = null;
        public static MainPage GetMainPageInstance()
        {
            if (s_Instance == null)
            {
                s_Instance = new MainPage(m_window);
            }
            return s_Instance;
        }
    }
}
