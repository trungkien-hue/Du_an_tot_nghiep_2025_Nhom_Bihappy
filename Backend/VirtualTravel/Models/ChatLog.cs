using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    public class ChatLog
    {
        [Key]
        public int ChatID { get; set; }

  
        [ForeignKey("User")]
        public int? UserID { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Sender { get; set; } = "User"; // "User" hoặc "Bot"

        public DateTime SentAt { get; set; } = DateTime.Now;

        public User? User { get; set; }
    }
}
