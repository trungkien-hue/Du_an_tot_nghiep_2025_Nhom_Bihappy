// src/services/hotelImageApi.js
import axios from "./axiosClient";

const hotelImageApi = {
  // Trả về MẢNG dữ liệu, chịu được cả 2 kiểu axiosClient (trả response.data hoặc response)
  getAll(hotelId) {
    return axios.get(`/hotels/${hotelId}/images`).then((r) => r?.data ?? r);
  },

  upload(hotelId, files, tag = null) {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    if (tag) form.append("tag", tag);
    return axios.post(`/hotels/${hotelId}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  setPrimary(hotelId, imageId) {
    return axios.patch(`/hotels/${hotelId}/images/${imageId}/primary`);
  },

  reorder(hotelId, payload) {
    return axios.patch(`/hotels/${hotelId}/images/reorder`, payload);
  },

  delete(hotelId, imageId) {
    return axios.delete(`/hotels/${hotelId}/images/${imageId}`);
  },
};

export default hotelImageApi;
