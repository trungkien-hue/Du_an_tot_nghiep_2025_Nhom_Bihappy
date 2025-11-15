import axiosClient from "./axiosClient";

const myBookingsApi = {
  list: (params = {}) => axiosClient.get("/MyBookings", { params }),
  detail: (id) => axiosClient.get(`/MyBookings/${id}`),
  update: (id, data) => axiosClient.put(`/MyBookings/${id}`, data),    // <— dùng cho UI chỉnh sửa
  cancel: (id, data = undefined) => axiosClient.put(`/MyBookings/${id}/cancel`, data),
  remove: (id) => axiosClient.delete(`/MyBookings/${id}`),
};

export default myBookingsApi;
