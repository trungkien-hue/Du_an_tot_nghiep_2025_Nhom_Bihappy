// src/services/authApi.js
import axiosClient from "./axiosClient";

// Route gốc bên backend là [Route("api/[controller]")]
// => cần prefix đúng là "/api/Auth"
const prefix = "/auth";

const authApi = {
  // ==== Đăng ký ====
  async register({ fullName, email, password, phone }) {
    // Backend yêu cầu key chữ cái đầu viết hoa (DTO): FullName, Email, Password, Phone
    return axiosClient.post(`${prefix}/register`, {
      FullName: fullName,
      Email: email,
      Password: password,
      Phone: phone || null, // Cho phép có hoặc không
    });
  },

  // ==== Đăng nhập ====
  async login({ loginIdentifier, password }) {
    return axiosClient.post(`${prefix}/login`, {
      LoginIdentifier: loginIdentifier,
      Password: password,
    });
  },

  // ==== Đổi mật khẩu ====
  async changePassword({ oldPassword, newPassword }, token) {
    return axiosClient.post(
      `${prefix}/change-password`,
      {
        OldPassword: oldPassword,
        NewPassword: newPassword,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  // ==== Reset mật khẩu (Admin) ====
  async resetPassword({ userId, newPassword }, token) {
    return axiosClient.post(
      `${prefix}/reset-password`,
      {
        UserID: userId,
        NewPassword: newPassword,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};

export default authApi;
