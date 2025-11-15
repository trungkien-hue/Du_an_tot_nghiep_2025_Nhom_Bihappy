namespace VirtualTravel.Dtos.Posts
{
    public record PostCreateDto(
        string Title,
        string Summary,
        string ContentHtml,
        bool IsPublished,
        string? CoverImageUrl
    );
}
