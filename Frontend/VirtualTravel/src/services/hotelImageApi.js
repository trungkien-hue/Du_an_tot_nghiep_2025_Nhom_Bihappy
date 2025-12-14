// src/services/hotelImageApi.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7059";

const api = axios.create({
  baseURL: `${API_BASE}/api/hotels`,
  withCredentials: true,
});

// GET: /api/hotels/{hotelId}/images
async function getAll(hotelId) {
  const res = await api.get(`/${hotelId}/images`);
  return res.data;
}

// POST: /api/hotels/{hotelId}/images
async function upload(hotelId, formData) {
  const res = await api.post(`/${hotelId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// DELETE: /api/hotels/{hotelId}/images/{imageId}
async function deleteImage(hotelId, imageId) {
  const res = await api.delete(`/${hotelId}/images/${imageId}`);
  return res.data;
}

// PATCH: /api/hotels/{hotelId}/images/{imageId}/primary
async function setPrimary(hotelId, imageId) {
  const res = await api.patch(`/${hotelId}/images/${imageId}/primary`);
  return res.data;
}

// PATCH: /api/hotels/{hotelId}/images/reorder
async function reorder(hotelId, imageIds) {
  const body = { order: imageIds };
  const res = await api.patch(`/${hotelId}/images/reorder`, body);
  return res.data;
}

export default {
  getAll,
  upload,
  delete: deleteImage,
  setPrimary,
  reorder,
};
