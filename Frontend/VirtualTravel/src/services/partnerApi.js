// src/services/partnerApi.js
// API dành riêng cho Partner Hotel (role = "Hotel")

import axiosClient from "./axiosClient";

/* ============================================================
   AUTH (PARTNER)
============================================================ */

/**
 * Đăng nhập tài khoản khách sạn
 */
async function login(payload) {
  const res = await axiosClient.post("/partner/auth/login", payload);

  try {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        token: res.token,
        user: { role: res.role, hotelId: res.hotelId , hotelName: res.hotelName },
      })
    );
    localStorage.setItem("auth_token", res.token);
  } catch {}

  return res;
}

/* ============================================================
   NOTIFICATIONS
============================================================ */

function getNotifications(params = {}) {
  return axiosClient.get("/partner/notifications", { params });
}

function markNotificationRead(notificationId) {
  return axiosClient.put(`/partner/notifications/${notificationId}/read`);
}

function markAllNotificationsRead() {
  return axiosClient.put("/partner/notifications/read-all");
}

/* ============================================================
   BOOKINGS
============================================================ */

function getBookings(params = {}) {
  return axiosClient.get("/partner/bookings", { params });
}

function getBookingById(bookingId) {
  return axiosClient.get(`/partner/bookings/${bookingId}`);
}

function confirmBooking(bookingId) {
  return axiosClient.post(`/partner/bookings/${bookingId}/confirm`);
}

function rejectBooking(bookingId, reason = "") {
  return axiosClient.post(`/partner/bookings/${bookingId}/reject`, reason, {
    headers: { "Content-Type": "application/json" },
  });
}

// ⭐ NEW: đánh dấu đơn đã hoàn tất (Confirmed -> Completed)
function completeBooking(bookingId) {
  return axiosClient.post(`/partner/bookings/${bookingId}/complete`);
}

/* ============================================================
   ROOM TYPES
============================================================ */

function getRoomTypes(params = {}) {
  return axiosClient.get("/partner/roomtypes", { params });
}

function getRoomTypeById(id) {
  return axiosClient.get(`/partner/roomtypes/${id}`);
}

function createRoomType(payload) {
  return axiosClient.post("/partner/roomtypes", payload);
}

function updateRoomType(id, payload) {
  return axiosClient.put(`/partner/roomtypes/${id}`, payload);
}

function deleteRoomType(id) {
  return axiosClient.delete(`/partner/roomtypes/${id}`);
}

/* ============================================================
   RATE PLANS
============================================================ */

function getRatePlans(params = {}) {
  return axiosClient.get("/partner/rateplans", { params });
}

function getRatePlanById(id) {
  return axiosClient.get(`/partner/rateplans/${id}`);
}

function createRatePlan(payload) {
  return axiosClient.post(`/partner/rateplans`, {
    RoomTypeID: Number(payload.RoomTypeID),
    Name: payload.Name,
    Description: payload.Description,
    BasePrice: Number(payload.BasePrice),
    Currency: payload.Currency,
    IsActive: payload.IsActive,
  });
}

function updateRatePlan(id, payload) {
  return axiosClient.put(`/partner/rateplans/${id}`, {
    RoomTypeID: Number(payload.RoomTypeID),
    Name: payload.Name,
    Description: payload.Description,
    BasePrice: Number(payload.BasePrice),
    Currency: payload.Currency,
    IsActive: payload.IsActive,
  });
}

function deleteRatePlan(id) {
  return axiosClient.delete(`/partner/rateplans/${id}`);
}

/* ============================================================
   AVAILABILITY CALENDAR
============================================================ */

function getAvailability(roomTypeId, year, month) {
  return axiosClient.get("/partner/availability", {
    params: {
      roomTypeId,
      year,
      month,
    },
  });
}

function updateAvailabilityRange(payload) {
  return axiosClient.post("/partner/availability/bulk-update", payload);
}

/* ============================================================
   VOUCHERS (NEW)
   — Dành riêng cho từng RoomType
============================================================ */

function getVouchersByRoomType(roomTypeId) {
  return axiosClient.get(`/partner/vouchers/${roomTypeId}`);
}

function createVoucher(payload) {
  return axiosClient.post("/partner/vouchers", {
    RoomTypeID: Number(payload.RoomTypeID),
    Title: payload.Title,
    Code: payload.Code,
    DiscountPercent: payload.DiscountPercent
      ? Number(payload.DiscountPercent)
      : null,
    DiscountAmount: payload.DiscountAmount
      ? Number(payload.DiscountAmount)
      : null,
    FromDate: payload.FromDate,
    ToDate: payload.ToDate || null,
    IsActive: payload.IsActive,
  });
}

function updateVoucher(id, payload) {
  return axiosClient.put(`/partner/vouchers/${id}`, {
    RoomTypeID: Number(payload.RoomTypeID),
    Title: payload.Title,
    Code: payload.Code,
    DiscountPercent: payload.DiscountPercent
      ? Number(payload.DiscountPercent)
      : null,
    DiscountAmount: payload.DiscountAmount
      ? Number(payload.DiscountAmount)
      : null,
    FromDate: payload.FromDate,
    ToDate: payload.ToDate || null,
    IsActive: payload.IsActive,
  });
}

function deleteVoucher(id) {
  return axiosClient.delete(`/partner/vouchers/${id}`);
}

/* ============================================================
   EXPORT
============================================================ */

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
  completeBooking, // ⭐ vừa thêm vào đây

  // room types
  getRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,

  // rate plans
  getRatePlans,
  getRatePlanById,
  createRatePlan,
  updateRatePlan,
  deleteRatePlan,

  // availability
  getAvailability,
  updateAvailabilityRange,

  // vouchers
  getVouchersByRoomType,
  createVoucher,
  updateVoucher,
  deleteVoucher,
};

export default partnerApi;
