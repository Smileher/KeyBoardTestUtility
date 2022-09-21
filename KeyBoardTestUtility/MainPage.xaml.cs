using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using Windows.ApplicationModel.Core;
using Windows.UI;
using Windows.UI.ViewManagement;

namespace KeyBoardTestUtility
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        UISettings uisetting = null;
        public MainPage(Window window)
        {
            this.InitializeComponent();
            window.ExtendsContentIntoTitleBar = true;
            window.SetTitleBar(AppTitleBar);
            uisetting = new UISettings();
        }
        public void KeyUpOp(string vkCode)
        {
            //Debug.WriteLine("键盘抬起了" + vkCode);
            var btn = FindChild<Button>(KeyBoard, "VKCODE_" + vkCode);
            if(btn != null)
            {
                btn.Tag = 2;
                btn.Background = new SolidColorBrush((Color)Resources["SystemAccentColor"]);
            }
        }
        public void KeyDownOp(string vkCode)
        {
            //Debug.WriteLine("键盘按下了" + vkCode);
            var btn = FindChild<Button>(KeyBoard, "VKCODE_" + vkCode);
            if (btn != null)
            {
                btn.Tag = 1;
                btn.Background = new SolidColorBrush((Color)Resources["SystemAccentColorDark2"]);
            }

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

        private void Clear_Click(object sender, RoutedEventArgs e)
        {
            var AllButtons = new List<Button>();
            FindChildren(AllButtons, KeyBoard);
            foreach (var item in AllButtons)
            {
                if (item is Button)
                {
                    item.Background = Templete.Background;
                    //item.Background = new SolidColorBrush(uisetting.GetColorValue(UIColorType.Background));
                    item.Tag = 0;
                }
            }
        }
        internal static void FindChildren<T>(List<T> results, DependencyObject startNode) where T : DependencyObject
        {
            int count = VisualTreeHelper.GetChildrenCount(startNode);
            for (int i = 0; i < count; i++)
            {
                DependencyObject current = VisualTreeHelper.GetChild(startNode, i);
                if ((current.GetType()).Equals(typeof(T)) || (current.GetType().GetTypeInfo().IsSubclassOf(typeof(T))))
                {
                    T asType = (T)current;
                    results.Add(asType);
                }
                FindChildren<T>(results, current);
            }
        }
    }
}
