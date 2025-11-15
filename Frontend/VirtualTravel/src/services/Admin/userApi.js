import axiosClient from "../axiosClient";
import {toQuery} from "../../services/Admin/httpHelpers"

const prefix = "/admin/users";

const userApi = {
  async getAll({ keyword, page = 1, pageSize = 20 } = {}) {
    return axiosClient.get(`${prefix}${toQuery({ keyword, page, pageSize })}`);
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
  async bulkDelete(ids = []) {
    return axiosClient.post(`${prefix}/bulk-delete`, { ids });
  },
  async resetPassword(userId, newPassword) {
    return axiosClient.post(`${prefix}/reset-password`, { userId, newPassword });
  },
  async restore(id) {
    return axiosClient.post(`${prefix}/${id}/restore`);
  },
};

export default userApi;
