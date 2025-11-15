import axiosClient from "../axiosClient";
import { toQuery } from "./httpHelpers";

const prefix = "/admin/hotels";

const hotelApi = {
  // ==================== HOTEL ====================
  async getAll({ keyword, location, page = 1, pageSize = 24 } = {}) {
    return axiosClient.get(
      `${prefix}${toQuery({ keyword, location, page, pageSize })}`
    );
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

  // ==================== ROOM TYPE ====================
  async getRoomTypes(hotelId) {
    return axiosClient.get(`${prefix}/${hotelId}/roomtypes`);
  },
  async upsertRoomType(hotelId, roomType) {
    if (roomType.RoomTypeID)
      return axiosClient.put(`${prefix}/${hotelId}/roomtypes/${roomType.RoomTypeID}`, roomType);
    return axiosClient.post(`${prefix}/${hotelId}/roomtypes`, roomType);
  },
  async deleteRoomType(hotelId, roomTypeId) {
    return axiosClient.delete(`${prefix}/${hotelId}/roomtypes/${roomTypeId}`);
  },

  // ==================== AVAILABILITY ====================
  async getAvailabilities(hotelId, roomTypeId) {
    return axiosClient.get(`${prefix}/${hotelId}/roomtypes/${roomTypeId}/availabilities`);
  },
  async upsertAvailability(hotelId, roomTypeId, avail) {
    if (avail.HotelAvailabilityID)
      return axiosClient.put(
        `${prefix}/${hotelId}/roomtypes/${roomTypeId}/availabilities/${avail.HotelAvailabilityID}`,
        avail
      );
    return axiosClient.post(
      `${prefix}/${hotelId}/roomtypes/${roomTypeId}/availabilities`,
      avail
    );
  },
  async deleteAvailability(hotelId, roomTypeId, id) {
    return axiosClient.delete(`${prefix}/${hotelId}/roomtypes/${roomTypeId}/availabilities/${id}`);
  },
};

export default hotelApi;
