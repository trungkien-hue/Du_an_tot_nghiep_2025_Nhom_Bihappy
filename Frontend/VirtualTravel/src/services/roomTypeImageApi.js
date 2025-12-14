// src/services/roomTypeImageApi.js
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:7059";

const roomTypeImageApi = {
  getAll: async (roomTypeId) =>
    (await axios.get(`${BASE}/api/roomtypes/${roomTypeId}/images`)).data,

  upload: async (roomTypeId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return (
      await axios.post(`${BASE}/api/roomtypes/${roomTypeId}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },

  delete: async (roomTypeId, imageId) =>
    (
      await axios.delete(
        `${BASE}/api/roomtypes/${roomTypeId}/images/${imageId}`
      )
    ).data,

  setPrimary: async (roomTypeId, imageId) =>
    (
      await axios.patch(
        `${BASE}/api/roomtypes/${roomTypeId}/images/${imageId}/primary`
      )
    ).data,

  reorder: async (roomTypeId, arr) =>
    (
      await axios.patch(
        `${BASE}/api/roomtypes/${roomTypeId}/images/reorder`,
        { order: arr }
      )
    ).data,
};

export default roomTypeImageApi;
