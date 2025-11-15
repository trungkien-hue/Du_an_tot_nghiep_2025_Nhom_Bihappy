namespace VirtualTravel.DTOs.Chatlog
{
    public class ChatLogDto
    {
        public int ChatID { get; set; }
        public int UserID { get; set; }
        public string Message { get; set; }
        public string Sender { get; set; } // "User" hoặc "Bot"
        public DateTime SentAt { get; set; }
    }

    public class CreateChatLogRequest
    {
        public int UserID { get; set; }
        public string Message { get; set; }
        public string Sender { get; set; } // "User" hoặc "Bot"
    }
    public class ChatRequest
    {
        public int? UserID { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
