using KeyBoardTestUtility.Helpers;
using KeyBoardTestUtility.ViewModels;

using Microsoft.UI.Xaml.Controls;

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
    }

    private void Clear_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
    {

    }
}
