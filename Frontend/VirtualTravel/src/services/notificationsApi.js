import axios from "./axiosClient";

const notificationsApi = {
  list: (params = {}) => axios.get("/staff/notifications", { params }),
  markRead: (id) => axios.post(`/staff/notifications/read/${id}`),
  markAllRead: () => axios.post("/staff/notifications/read-all"),
  unreadCount: () => axios.get("/staff/notifications/unread-count"),
};

export default notificationsApi;
