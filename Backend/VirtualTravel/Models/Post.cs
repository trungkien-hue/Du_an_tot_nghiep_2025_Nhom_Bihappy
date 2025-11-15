using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VirtualTravel.Models
{
    public class Post
    {
        public int PostID { get; set; }

        [MaxLength(240)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(260)]
        public string Slug { get; set; } = string.Empty; // unique, SEO

        [MaxLength(500)]
        public string Summary { get; set; } = string.Empty;

        public string ContentHtml { get; set; } = string.Empty; // sanitized

        [MaxLength(500)]
        public string? CoverImageUrl { get; set; }

        public bool IsPublished { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PublishedAt { get; set; }

        // FK -> User (theo class User bạn đã cung cấp)
        public int AuthorId { get; set; }
        public User Author { get; set; } = null!;
    }
}
