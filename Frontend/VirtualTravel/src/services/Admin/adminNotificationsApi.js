const BASE = import.meta.env.VITE_API_URL || "http://localhost:5059";

function authHeaders() {
  const token =
    JSON.parse(localStorage.getItem("auth") || "{}")?.token ||
    localStorage.getItem("vt_auth_token") ||
    "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export default {
  async list({ unreadOnly = false, take = 50 } = {}) {
    const url = `${BASE}/admin/AdminNotifications?unreadOnly=${unreadOnly}&take=${take}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load notifications");
    return res.json();
  },

  async markRead(id) {
    const res = await fetch(`${BASE}/admin/AdminNotifications/${id}/read`, {
      method: "PUT",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to mark read");
    return res.json();
  },

  async remove(id) {
    const res = await fetch(`${BASE}/admin/AdminNotifications/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete notification");
    return true;
  },

  async sendTest({ title = "Test", message = "Hello Admin" } = {}) {
    const u = new URL(`${BASE}/admin/AdminNotifications/test`);
    u.searchParams.set("title", title);
    u.searchParams.set("message", message);
    const res = await fetch(u, { method: "POST", headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to send test notification");
    return res.json();
  },
};
