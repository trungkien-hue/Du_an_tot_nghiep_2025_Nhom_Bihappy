// src/services/adminBookingsApi.js
import axiosClient from "./axiosClient";

export function getAdminBookings({ status, search } = {}) {
  const params = {};
  if (status !== undefined && status !== null && status !== "") {
    params.status = status;
  }
  if (search !== undefined && search !== null && search !== "") {
    params.search = search;
  }

  // GET /api/admin/bookings
  return axiosClient.get("/admin/bookings", { params });
}

// Lấy thống kê dashboard
export function getAdminBookingStats() {
  // GET /api/admin/bookings/stats
  return axiosClient.get("/admin/bookings/stats");
}

// Cập nhật trạng thái 1 booking
export function updateAdminBookingStatus(id, status) {
  return axiosClient.put(`/admin/bookings/${id}/status`, { status });
}

// Xoá (soft delete) 1 booking
export function deleteAdminBooking(id) {
  return axiosClient.delete(`/admin/bookings/${id}`);
}
