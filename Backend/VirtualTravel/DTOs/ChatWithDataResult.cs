namespace VirtualTravel.Models;

public class ChatWithDataResult
{
    public string Text { get; set; } = "";
    /// <summary> "search_tours" hoặc "search_hotels" </summary>
    public string Function { get; set; } = "";
    /// <summary> Chính là object DB result của tool: { total, items } hoặc hotel detail </summary>
    public object? Data { get; set; }
}
