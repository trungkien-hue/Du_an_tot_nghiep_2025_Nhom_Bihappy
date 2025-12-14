// src/components/Staff/StaffBell.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import notificationsApi from "../../services/notificationsApi";
import { getNotificationConnection } from "../../services/signalr";

const API_BASE = (import.meta.env.VITE_API_URL || "https://localhost:7059/api").replace(/\/$/, "");
const PANEL_WIDTH = Number.parseInt(import.meta.env.VITE_STAFF_BELL_WIDTH || "560", 10);

export default function StaffBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const handlersAttachedRef = useRef(false);

  // ⭐ Normalize field từ BE
  const normalize = (n) => ({
    id: n.NotificationID ?? n.id,
    title: n.Title ?? n.title ?? "",
    message: n.Message ?? n.message ?? "",
    type: n.Type ?? n.type ?? "NewNotification",
    isRead: n.IsRead ?? n.isRead ?? false,
    createdAt: n.CreatedAt ?? n.createdAt ?? new Date().toISOString(),
  });

  // load danh sách ban đầu
  const refresh = useCallback(async () => {
    const list = await notificationsApi.list({ unreadOnly: false, take: 50 });
    const norm = list.map(normalize);
    setItems(norm);

    const uc = await notificationsApi.unreadCount().catch(() => ({ data: { count: 0 } }));
    setUnread(uc?.data?.count ?? norm.filter((x) => !x.isRead).length);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);

    const conn = getNotificationConnection((payload) => {
      console.log("%c[SignalR] STAFF RECEIVED:", "color:green", payload);
      const n = normalize(payload);

      // Thêm vào danh sách
      setItems((prev) => [n, ...prev]);

      // Tăng số lượng chưa đọc
      setUnread((c) => c + 1);
    });

    if (!handlersAttachedRef.current) {
      handlersAttachedRef.current = true;
      conn.startSafely?.();
    }

    return () => {
      conn.stop?.();
      handlersAttachedRef.current = false;
    };
  }, [refresh]);

  const markAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const markRead = async (id) => {
    await notificationsApi.markRead(id).catch(() => {});
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
  };

  const fmtTime = (v) => new Date(v).toLocaleString("vi-VN");

  return (
    <div className="relative">
      {/* Nút chuông */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 hover:bg-gray-100"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            {unread}
          </span>
        )}
      </button>

      {/* Panel thông báo */}
      {open && (
        <div
          className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border overflow-hidden z-50"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-emerald-50 to-blue-50">
            <span className="font-semibold text-gray-800">Thông báo</span>
            <button className="text-xs text-blue-600 flex items-center gap-1" onClick={markAllRead}>
              <Check size={14} /> Đánh dấu đã đọc
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Không có thông báo</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id + n.createdAt}
                  className={`px-4 py-3 border-b ${
                    n.isRead ? "bg-white" : "bg-amber-50"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {n.title} {!n.isRead && <span className="text-red-600">•</span>}
                      </p>

                      <p className="text-sm text-gray-800 mt-1">{n.message}</p>

                      <p className="text-xs text-gray-400 mt-1">{fmtTime(n.createdAt)}</p>
                    </div>

                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        Đọc
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
