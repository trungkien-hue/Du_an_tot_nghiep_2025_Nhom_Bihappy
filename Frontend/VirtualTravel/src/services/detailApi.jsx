// src/services/detailApi.js
import axios from "axios";
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5059";

export default {
  async getBasic(id) {
    const res = await axios.get(`${BASE}/api/hoteltourdetail/basic/${id}`);
    return res.data;
  },

  async getGallery(id) {
    const res = await axios.get(`${BASE}/api/hoteltourdetail/gallery/${id}`);
    return res.data;
  },

  async getRoomTypes(id) {
    const res = await axios.get(`${BASE}/api/hoteltourdetail/roomtypes/${id}`);
    return res.data;
  },

  async getReviews(id) {
    const res = await axios.get(`${BASE}/api/hoteltourdetail/reviews/${id}`);
    return res.data;
  },

  async createReview({ hotelId, userName, rating, comment, files }) {
    const fd = new FormData();
    fd.append("HotelId", hotelId);
    if (userName) fd.append("UserName", userName);
    fd.append("Rating", rating ?? 5);
    fd.append("Comment", comment ?? "");
    (files || []).forEach((f) => fd.append("Images", f));
    const res = await axios.post(`${BASE}/api/hoteltourdetail/reviews`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });
    return res.data;
  },
};
