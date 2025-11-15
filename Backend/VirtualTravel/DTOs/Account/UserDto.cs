namespace VirtualTravel.DTOs.Account
{
    public class UserDto
    {
        public int UserID { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Role { get; set; }
    }

    public class RegisterRequest
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string? Phone { get; set; }
    }

    public class LoginRequest
    {
        public string LoginIdentifier { get; set; }
        public string Password { get; set; }
    }
}
