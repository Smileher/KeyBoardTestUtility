using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace KeyBoardTestUtility
{
    public sealed partial class MainWindow : Window
    {
        private static MainWindow m_MainWindow = null;
        public static MainWindow GetInstance()
        {
            if (m_MainWindow == null)
            {
                m_MainWindow = new MainWindow();
            }

            return m_MainWindow;
        }
        KeyboardHock keyboardHock;
        public MainWindow()
        {
            this.InitializeComponent();
            keyboardHock = new KeyboardHock();
            this.Activated += MainWindow_Activated;
        }

        private void MainWindow_Activated(object sender, Microsoft.UI.Xaml.WindowActivatedEventArgs args)
        {
            if (args.WindowActivationState == WindowActivationState.Deactivated)//窗口后台
            {
                // do stuff
                System.Console.WriteLine();
            }
            else
            {
                System.Console.WriteLine();
                // do different stuff
            }
        }

        public string a { get; set; } = "请按键！";
        public void KeyDown(string vkCode)
        {
            System.Diagnostics.Debug.WriteLine("按下了" + vkCode.ToString());
            //var btn = FindChild<Button>(Main, vkCode.ToString());
            //if (btn != null)
            //    btn.Background = new SolidColorBrush(Color.FromArgb(255, 123, 210, 111));
        }
        public void KeyUp(int vkCode)
        {
            //var btn = FindChild<Button>(Main, vkCode.ToString());
            //if (btn != null)
            //    btn.Background = (new Button()).Background;
        }
        /// <summary>
        /// 搜索指定名称的子元素
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="obj"></param>
        /// <param name="name"></param>
        /// <returns></returns>
        public T FindChild<T>(DependencyObject obj, string name) where T : FrameworkElement
        {
            for (int i = 0; i < VisualTreeHelper.GetChildrenCount(obj); i++)
            {
                DependencyObject child = VisualTreeHelper.GetChild(obj, i);
                if (child != null && child is T && (child as T).Name.Equals(name))
                    return (T)child;
                else
                {
                    T childOfChild = FindChild<T>(child, name);
                    if (childOfChild != null)
                        return childOfChild;
                }
            }
            return null;
        }
    }
}
