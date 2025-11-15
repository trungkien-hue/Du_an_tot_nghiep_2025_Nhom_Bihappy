// src/services/Admin/partnerAdminApi.js
// API cho quản trị tài khoản partner (Hotel)
import axiosClient from "../axiosClient";

// Lấy danh sách user role=Hotel.
// Backend: tận dụng AdminUsersController (giả định có filter role), hoặc bạn có thể
// tạo endpoint riêng. Ở đây mình gọi /api/admin/users?role=Hotel&deleted=true|false
async function getHotelUsers({ keyword = "", deleted = false, page = 1, pageSize = 50 } = {}) {
  const params = { keyword, role: "Hotel", deleted, page, pageSize };
  const res = await axiosClient.get("/admin/users", { params });
  return res;
}

// Tạo tài khoản Hotel mới
function createHotelUser(payload) {
  // POST /api/admin/hotel-users
  // payload: { HotelID, FullName, Email, Password, Phone }
  return axiosClient.post("/admin/hotel-users", payload);
}

// Gán/đổi HotelID cho user Hotel
function setHotelForUser(userId, payload) {
  // PUT /api/admin/hotel-users/{userId}/set-hotel
  return axiosClient.put(`/admin/hotel-users/${userId}/set-hotel`, payload);
}

// Xoá/khôi phục user (tận dụng User admin API hiện có)
function removeUser(userId) {
  return axiosClient.delete(`/admin/users/${userId}`);
}
function restoreUser(userId) {
  return axiosClient.put(`/admin/users/${userId}/restore`);
}

const partnerAdminApi = {
  getHotelUsers,
  createHotelUser,
  setHotelForUser,
  removeUser,
  restoreUser,
};
export default partnerAdminApi;
