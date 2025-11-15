// src/services/partnerApi.js
// API dành riêng cho Cổng Khách Sạn (role = "Hotel")
// Dựa trên axiosClient (đã tự gắn baseURL + Bearer token)

import axiosClient from "./axiosClient";

/* ================== AUTH (PARTNER) ================== */

/**
 * Đăng nhập tài khoản khách sạn
 * @param {{ Email: string, Password: string }} payload
 * @returns {{ token: string, role: string, hotelId: number }}
 */
async function login(payload) {
  // /api/partner/auth/login
  const res = await axiosClient.post("/partner/auth/login", payload);
  // Lưu token tiện dụng (tuỳ bạn)
  try {
    localStorage.setItem("auth", JSON.stringify({ token: res.token, user: { role: res.role, hotelId: res.hotelId } }));
    localStorage.setItem("auth_token", res.token);
  } catch { /* ignore */ }
  return res;
}

/* ================== NOTIFICATIONS ================== */

/**
 * Lấy danh sách thông báo của khách sạn hiện tại
 * @param {{ unreadOnly?: boolean, take?: number }} params
 */
function getNotifications(params = {}) {
  // /api/partner/notifications?unreadOnly=&take=
  return axiosClient.get("/partner/notifications", { params });
}

/**
 * Đánh dấu 1 thông báo đã đọc
 * @param {number} notificationId
 */
function markNotificationRead(notificationId) {
  return axiosClient.put(`/partner/notifications/${notificationId}/read`);
}

/**
 * Đánh dấu tất cả thông báo đã đọc
 */
function markAllNotificationsRead() {
  return axiosClient.put("/partner/notifications/read-all");
}

/* ================== BOOKINGS (ĐƠN ĐẶT) ================== */

/**
 * Lấy danh sách đơn của khách sạn (mặc định lấy 50 mới nhất)
 * @param {{ take?: number }} params
 */
function getBookings(params = {}) {
  // /api/partner/bookings?take=
  return axiosClient.get("/partner/bookings", { params });
}

/**
 * Chi tiết 1 đơn
 * @param {number} bookingId
 */
function getBookingById(bookingId) {
  return axiosClient.get(`/partner/bookings/${bookingId}`);
}

/**
 * Khách sạn xác nhận đơn
 * @param {number} bookingId
 */
function confirmBooking(bookingId) {
  return axiosClient.put(`/partner/bookings/${bookingId}/confirm`);
}

/**
 * Khách sạn từ chối đơn (lý do tuỳ chọn, backend sẽ lưu vào Note nếu bạn đã thêm cột Note)
 * @param {number} bookingId
 * @param {string} reason
 */
function rejectBooking(bookingId, reason = "") {
  return axiosClient.put(`/partner/bookings/${bookingId}/reject`, reason, {
    headers: { "Content-Type": "application/json" },
  });
}

/* ================== PUBLIC EXPORT ================== */

const partnerApi = {
  // auth
  login,
  // notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  // bookings
  getBookings,
  getBookingById,
  confirmBooking,
  rejectBooking,
};

export default partnerApi;
