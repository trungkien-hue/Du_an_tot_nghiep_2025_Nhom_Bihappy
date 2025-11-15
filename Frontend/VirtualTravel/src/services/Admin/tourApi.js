import axiosClient from "../axiosClient";
import {toQuery} from "../../services/Admin/httpHelpers"

const prefix = "/admin/tours";

const tourApi = {
  async getAll({ keyword, location, category, page = 1, pageSize = 24 } = {}) {
    return axiosClient.get(`${prefix}${toQuery({ keyword, location, category, page, pageSize })}`);
  },
  async getDeleted({ keyword } = {}) {
    return axiosClient.get(`${prefix}/deleted${toQuery({ keyword })}`);
  },
  async getById(id) {
    return axiosClient.get(`${prefix}/${id}`);
  },
  async create(payload) {
    return axiosClient.post(prefix, payload);
  },
  async update(id, payload) {
    return axiosClient.put(`${prefix}/${id}`, payload);
  },
  async remove(id) {
    return axiosClient.delete(`${prefix}/${id}`);
  },
  async restore(id) {
    return axiosClient.post(`${prefix}/${id}/restore`);
  },

  // Availabilities (giữ nguyên nếu dùng)
  async getAvailabilities(tourId) {
    return axiosClient.get(`${prefix}/${tourId}/availabilities`);
  },
  async upsertAvailability(tourId, avail) {
    if (avail.TourAvailabilityID)
      return axiosClient.put(`${prefix}/${tourId}/availabilities/${avail.TourAvailabilityID}`, avail);
    return axiosClient.post(`${prefix}/${tourId}/availabilities`, avail);
  },
  async deleteAvailability(tourId, availabilityId) {
    return axiosClient.delete(`${prefix}/${tourId}/availabilities/${availabilityId}`);
  },
};

export default tourApi;
