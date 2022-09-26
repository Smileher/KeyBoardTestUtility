using System.Diagnostics;
using System.Reflection;
using System.Reflection.Emit;
using KeyBoardTestUtility.Helpers;
using KeyBoardTestUtility.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Windows.UI;

namespace KeyBoardTestUtility.Views;

public sealed partial class KeyPage : Page
{
    public KeyViewModel ViewModel
    {
        get;
    }

    public KeyPage()
    {
        ViewModel = App.GetService<KeyViewModel>();
        InitializeComponent();
        KeyboardHockHelpers.KeyDownEventHandler += OnKeyDown;
        KeyboardHockHelpers.KeyUpEventHandler += OnKeyUp;
    }

    private void Clear_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
    {
        var AllButtons = new List<Button>();
        FindAllChildren(AllButtons, KeyBoard);
        foreach (var item in AllButtons)
        {
            if (item is Button)
            {
                item.Background = Templete.Background;
            }
        }
    }
    private void FindAllChildren<T>(List<T> results, DependencyObject startNode) where T : DependencyObject
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
            FindAllChildren<T>(results, current);
        }
    }
    private void OnKeyUp(object? sender, KeyboardHockHelpers.KeyPressedEventArgs e)
    {
        Debug.WriteLine("键盘抬起了:" + sender);
        var btn = FindChild<Button>(KeyBoard, "VKCODE_" + sender);
        if (btn != null)
        {
            btn.Tag = 2;
            btn.Background = new SolidColorBrush((Color)Resources["SystemAccentColor"]);
        }
    }
    private void OnKeyDown(object? sender, KeyboardHockHelpers.KeyPressedEventArgs e)
    {
        Debug.WriteLine("键盘按下了:" + sender);
        var btn = FindChild<Button>(KeyBoard, "VKCODE_" + sender);
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
    public T? FindChild<T>(DependencyObject obj, string name) where T : FrameworkElement
    {
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(obj); i++)
        {
            var child = VisualTreeHelper.GetChild(obj, i);
            if (child != null && child is T t && (child as T).Name.Equals(name))
            {
                return t;
            }
            else
            {
                T childOfChild = FindChild<T>(child, name);
                if (childOfChild != null)
                {
                    return childOfChild;
                }
            }
        }
        return null;
    }
}
