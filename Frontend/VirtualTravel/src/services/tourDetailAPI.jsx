// src/services/tourDetailAPI.jsx
import axios from "axios";
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5059";

const tourDetailAPI = {
  async getById(id) {
    const res = await axios.get(`${BASE}/api/tour/${id}`);
    return res.data;
  },
  async getReviews(id) {
    const res = await axios.get(`${BASE}/api/tour/${id}/reviews`);
    return res.data;
  },
  async createReview({ TourId, UserName, Rating, Comment, Files }) {
    const fd = new FormData();
    fd.append("TourId", TourId);
    if (UserName) fd.append("UserName", UserName);
    fd.append("Rating", Rating ?? 5);
    fd.append("Comment", Comment ?? "");
    (Files || []).forEach((f) => fd.append("Images", f));
    const res = await axios.post(`${BASE}/api/tour/reviews`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });
    return res.data;
  },
};

export default tourDetailAPI;
