// src/components/Admin/AdminBell.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import notificationsApi from "../../services/notificationsApi";
import { getNotificationConnection } from "../../services/signalr";

// Giữ nguyên ENV: VITE_API_URL có /api
const API_BASE = (import.meta.env.VITE_API_URL || "https://localhost:7059/api").replace(/\/$/, "");
const HUB_BASE = API_BASE.replace(/\/api$/i, "");

// Cho phép cấu hình độ rộng panel qua ENV (px), mặc định 560
const PANEL_WIDTH = Number.parseInt(import.meta.env.VITE_BELL_WIDTH || "560", 10);

export default function AdminBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const handlersAttachedRef = useRef(false);

  const normalize = (n) => ({
    id: n.NotificationID ?? n.id ?? n.notificationID,
    title: n.Title ?? n.title ?? "",
    message: n.Message ?? n.message ?? "",
    type: n.Type ?? n.type ?? "Info",
    isRead: n.IsRead ?? n.isRead ?? false,
    createdAt: n.CreatedAt ?? n.createdAt ?? new Date().toISOString(),
  });

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
      // payload từ backend: gồm cả webhook khách sạn gốc
      console.log("%c[SignalR] New notification:", "color:#3b82f6", payload);
      const n = normalize(payload);
      setItems((prev) => [n, ...prev]);
      setUnread((c) => c + 1);
    });

    if (!handlersAttachedRef.current) {
      handlersAttachedRef.current = true;
      conn.startSafely?.();
    }

    return () => {
      conn.stop?.().catch(() => {});
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

  const fmtTime = (v) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleString("vi-VN");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 hover:bg-gray-100"
        title="Thông báo"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 flex items-center justify-center
                       bg-red-500 text-white text-xs rounded-full shadow"
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-w-[90vw]"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-sky-50 to-amber-50">
            <span className="font-semibold text-gray-800">Thông báo</span>
            <button className="text-xs text-blue-600 flex items-center gap-1" onClick={markAllRead}>
              <Check size={14} /> Đánh dấu đã đọc
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Không có thông báo</div>
            ) : (
              items.map((n) => {
                const isPartner = n.type?.startsWith("Partner") || n.type === "PartnerHotel";
                return (
                  <div
                    key={n.id + n.createdAt}
                    className={`px-4 py-3 border-b last:border-0 ${
                      n.isRead ? "bg-white" : isPartner ? "bg-blue-50/60" : "bg-amber-50/70"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        {/* TIÊU ĐỀ: cho phép xuống dòng */}
                        <p className="font-medium text-gray-900 break-words">
                          {isPartner ? "🏨 " : ""}
                          {n.title || "(Không có tiêu đề)"}{" "}
                          {!n.isRead && <span className="ml-1 text-amber-600">•</span>}
                        </p>

                        {/* NỘI DUNG: bỏ line-clamp, cho phép wrap & xuống dòng giữ nguyên */}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mt-1">
                          {n.message}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">{fmtTime(n.createdAt)}</p>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="shrink-0 h-7 px-2 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Đánh dấu đã đọc"
                        >
                          Đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
