// src/services/axiosClient.jsx
import axios from "axios";

// Lấy URL backend từ biến môi trường Vite
// LƯU Ý: baseURL đã có '/api' ở cuối -> các service chỉ cần prefix kiểu '/Auth', '/Bookings', ...
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5059/api",
  headers: { "Content-Type": "application/json" },
});

// === REQUEST: gắn Bearer token vào mọi request ===
axiosClient.interceptors.request.use(
  (config) => {
    try {
      // Ưu tiên object 'auth' { token, user } nếu có
      const packed = localStorage.getItem("auth");
      let token = null;
      if (packed) {
        try {
          token = JSON.parse(packed)?.token || null;
        } catch {
          token = null;
        }
      }
      // fallback các key cũ
      token = token || localStorage.getItem("token") || localStorage.getItem("vt_auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // bỏ qua nếu localStorage lỗi
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === RESPONSE: luôn trả về response.data, ném error message chuẩn hóa ===
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    throw error.response?.data || error.message;
  }
);

export default axiosClient;
