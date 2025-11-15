// src/services/bookingTourAPI.jsx
import axiosClient from "./axiosClient";

const bookingTourAPI = {
  create: (data) => axiosClient.post("/tourbookings", data),
  getAll: () => axiosClient.get("/tourbookings"),
  getById: (id) => axiosClient.get(`/tourbookings/${id}`),
  update: (id, data) => axiosClient.put(`/tourbookings/${id}`, data),
  delete: (id) => axiosClient.delete(`/tourbookings/${id}`),
};

export default bookingTourAPI;
