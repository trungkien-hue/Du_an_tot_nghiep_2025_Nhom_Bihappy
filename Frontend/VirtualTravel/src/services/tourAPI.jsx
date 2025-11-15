// src/api/tourAPI.jsx
import axiosClient from "./axiosClient"

const tourAPI = {
  // Lấy tất cả tour
  getAll: async () => {
    return await axiosClient.get("/tours");
  },

  // Lấy tour theo ID
  getById: async (id) => {
    return await axiosClient.get(`/tours/${id}`);
  },

  // Tìm kiếm tour có availability
  searchAvailability: async (params) => {
    return await axiosClient.post("/tours/search-availability", params);
  },
};

export default tourAPI;
