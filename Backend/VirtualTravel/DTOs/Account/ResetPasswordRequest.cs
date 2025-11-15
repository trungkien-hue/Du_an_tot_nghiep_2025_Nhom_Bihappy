namespace VirtualTravel.DTOs.Account
{
    public class ResetPasswordRequest
    {
        public int UserID { get; set; }
        public string NewPassword { get; set; }
    }
}
