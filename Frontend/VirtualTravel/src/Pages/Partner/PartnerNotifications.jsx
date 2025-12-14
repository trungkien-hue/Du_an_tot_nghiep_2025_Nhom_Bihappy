// File: src/pages/PartnerNotifications.jsx
import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";

/** ===== BASE URL ===== */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://localhost:7059/api";
const HUB_BASE = API_BASE.replace(/\/api\/?$/i, "");
const CACHE_KEY = "partner_notifications_cache_v1";

function getJwt() {
  const pick = (k) => localStorage.getItem(k) || "";
  let raw = pick("auth_token") || pick("access_token");
  if (!raw) {
    try {
      const packed = pick("auth");
      raw = packed ? JSON.parse(packed)?.token || "" : "";
    } catch (e) {
      void e;
      // ignore
    }
  }
  return raw.replace(/^Bearer\s+/i, "");
}

const fmtVND = (n) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN")
    : (parseFloat(n || 0) || 0).toLocaleString("vi-VN");

/** Chuẩn hoá item từ API hoặc Realtime */
function normalizeEvent(src) {
  // 🔹 Từ API (có NotificationID và Extra)
  if (src.NotificationID) {
    const extra = src.Extra || {};
    const raw = {
      ...src,
      customer: extra.Customer
        ? { name: extra.Customer.Name, phone: extra.Customer.Phone }
        : undefined,
      stay: extra.Stay
        ? {
            checkIn: extra.Stay.CheckIn,
            checkOut: extra.Stay.CheckOut,
            quantity: extra.Stay.Quantity,
          }
        : undefined,
      prices: extra.Prices
        ? {
            pricePerNight: extra.Prices.PricePerNight,
            total: extra.Prices.Total,
          }
        : undefined,
      roomTypeId: extra.RoomTypeId,
    };

    return {
      id: src.NotificationID,
      type: src.Type || "Notification",
      title: src.Title || "",
      message: src.Message || "",
      at: src.CreatedAt || new Date().toISOString(),
      hotelId: src.HotelID ?? src.TargetHotelId ?? null,
      bookingId: src.BookingID ?? null,
      isRead: !!src.IsRead,
      raw,
    };
  }

  // 🔹 Từ Realtime (SignalR)
  return {
    id: src.notiId || `${src.type}-${src.bookingId}-${src.createdAt}`,
    type: src.type || "Notification",
    title: src.title || "",
    message: src.message || "",
    at: src.createdAt || new Date().toISOString(),
    hotelId: src.hotelId ?? null,
    bookingId: src.bookingId ?? null,
    isRead: false,
    raw: src,
  };
}

/** Badge loại thông báo – mới, cập nhật, hủy… */
function TypeBadge({ type }) {
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium";
  const map = {
    BookingCreated: {
      cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      label: "Đơn mới",
      icon: "🆕",
    },
    BookingUpdated: {
      cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      label: "Đơn cập nhật",
      icon: "✏️",
    },
    BookingCancelled: {
      cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      label: "Đơn hủy",
      icon: "❌",
    },
    PartnerOffline: {
      cls: "bg-red-50 text-red-700 ring-1 ring-red-100",
      label: "Kênh offline",
      icon: "⚠️",
    },
    Notification: {
      cls: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
      label: "Thông báo",
      icon: "🔔",
    },
  };

  const conf = map[type] || map.Notification;
  return (
    <span className={`${base} ${conf.cls}`}>
      <span className="text-xs">{conf.icon}</span>
      <span>{conf.label}</span>
    </span>
  );
}

/** Card chi tiết đơn đặt trong thông báo */
function BookingCard({ ev }) {
  const p = ev.raw || {};
  const stay = p.stay || {};
  const customer = p.customer || {};
  const prices = p.prices || {};

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-3 text-xs md:text-sm">
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          Khách
        </div>
        <div className="font-semibold text-slate-900">
          {customer?.name || "—"}
        </div>
        <div className="text-slate-500 mt-0.5">{customer?.phone || ""}</div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          Lưu trú
        </div>
        <div className="space-y-0.5">
          <div>
            Nhận phòng:{" "}
            <span className="font-medium">
              {stay?.checkIn
                ? new Date(stay.checkIn).toLocaleDateString("vi-VN")
                : "—"}
            </span>
          </div>
          <div>
            Trả phòng:{" "}
            <span className="font-medium">
              {stay?.checkOut
                ? new Date(stay.checkOut).toLocaleDateString("vi-VN")
                : "—"}
            </span>
          </div>
          <div>
            SL phòng:{" "}
            <span className="font-medium">{stay?.quantity ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          Giá & tổng tiền
        </div>
        <div className="space-y-0.5">
          <div>
            Đ/đêm:{" "}
            <span className="font-medium">
              {fmtVND(prices?.pricePerNight)}₫
            </span>
          </div>
          <div>
            Tổng:{" "}
            <span className="font-semibold text-emerald-700">
              {fmtVND(prices?.total)}₫
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerNotifications() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [events, setEvents] = useState([]);
  const [actBusy, setActBusy] = useState(false);
  const connRef = useRef(null);

  // Load cache + load API lần đầu
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) setEvents(cached);
    } catch (e) {
      void e;
      // ignore
    }

    (async () => {
      try {
        const token = getJwt();
        const res = await fetch(
          `${API_BASE}/partner/notifications?take=50&unreadOnly=false`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const normalized = (Array.isArray(data) ? data : []).map(
            normalizeEvent
          );
          setEvents((prev) => mergeAndLimit(normalized, prev));
        }
      } catch (e) {
        console.warn("Load notifications failed", e);
      }
    })();
  }, []);

  // Kết nối SignalR
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_BASE}/hubs/partner-notifications`, {
        accessTokenFactory: () => getJwt(),
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) => {
          const delays = [0, 2000, 5000, 10000, 30000];
          return delays[Math.min(ctx.previousRetryCount, delays.length - 1)];
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    const push = (payload) => {
      const ev = normalizeEvent(payload);
      setEvents((prev) => [ev, ...prev].slice(0, 100));
    };

    connection.on("BookingCreated", push);
    connection.on("BookingUpdated", push);
    connection.on("BookingCancelled", push);
    connection.on("PartnerOffline", push);

    (async () => {
      try {
        await connection.start();
        setConnected(true);
      } catch (err) {
        if (!/stopped during negotiation/i.test(String(err))) {
          console.error("SignalR connect failed", err);
        }
        setConnected(false);
      } finally {
        setConnecting(false);
      }
    })();

    connection.onreconnecting(() => {
      setConnected(false);
      setConnecting(true);
    });
    connection.onreconnected(() => {
      setConnected(true);
      setConnecting(false);
    });
    connection.onclose(() => {
      setConnected(false);
      setConnecting(false);
    });

    connRef.current = connection;
    return () => {
      connection.stop().catch(() => {});
      connRef.current = null;
    };
  }, []);

  // Cache ra localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(events.slice(0, 100)));
    } catch (e) {
      void e;
      // ignore
    }
  }, [events]);

  const markRead = async (id) => {
    setEvents((prev) =>
      prev.map((x) => (x.id === id ? { ...x, isRead: true } : x))
    );
    try {
      setActBusy(true);
      const token = getJwt();
      await fetch(`${API_BASE}/partner/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      // rollback
      void e;
      setEvents((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isRead: false } : x))
      );
    } finally {
      setActBusy(false);
    }
  };

  const markAllRead = async () => {
    const hadUnread = events.some((e) => !e.isRead);
    if (!hadUnread) return;
    const snapshot = events;
    setEvents((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      setActBusy(true);
      const token = getJwt();
      await fetch(`${API_BASE}/partner/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      void e;
      setEvents(snapshot);
    } finally {
      setActBusy(false);
    }
  };

  const unreadCount = events.filter((e) => !e.isRead).length;

  return (
    <div className="space-y-4 text-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Thông báo khách sạn
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhận thông tin đơn đặt mới, thay đổi & cảnh báo theo thời gian
            thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status connect */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
              connecting
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connecting
                  ? "bg-amber-400"
                  : connected
                  ? "bg-emerald-500"
                  : "bg-rose-500"
              }`}
            />
            <span>
              {connecting
                ? "Đang kết nối…"
                : connected
                ? "Đã kết nối"
                : "Mất kết nối"}
            </span>
          </div>

          {/* Nút đã đọc hết */}
          <button
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              unreadCount === 0 || actBusy
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-slate-50"
            }`}
            disabled={unreadCount === 0 || actBusy}
            onClick={markAllRead}
            title="Đánh dấu tất cả đã đọc"
          >
            <span>Đã đọc hết</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-900 text-sm">
            Thông báo gần đây
          </span>
          {events.length > 0 && (
            <span className="text-xs text-slate-500">
              Tổng: {events.length} thông báo (lưu tối đa 100)
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Chưa có thông báo nào. Khi có đơn mới hoặc cập nhật, thông báo sẽ
            xuất hiện ở đây.
          </div>
        ) : (
          <div className="max-h-[640px] overflow-y-auto">
            <ul className="divide-y divide-slate-100">
              {events.map((ev, idx) => (
                <li
                  key={ev.id ?? idx}
                  className={`px-4 py-3 transition-colors ${
                    !ev.isRead
                      ? "bg-slate-50/60 hover:bg-slate-50"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!ev.isRead && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-emerald-500"
                            title="Chưa đọc"
                          />
                        )}
                        <TypeBadge type={ev.type} />
                        <div className="font-medium text-slate-900 text-sm truncate">
                          {ev.title || ev.type}
                        </div>
                      </div>
                      {ev.message && (
                        <div className="text-xs md:text-sm text-slate-700">
                          {ev.message}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-[11px] text-slate-500 text-right">
                        {new Date(ev.at).toLocaleString("vi-VN")}
                      </div>
                      {!ev.isRead && (
                        <button
                          className={`px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 ${
                            actBusy ? "opacity-60 cursor-not-allowed" : ""
                          }`}
                          onClick={() => markRead(ev.id)}
                          disabled={actBusy}
                          title="Đánh dấu đã đọc"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    {["BookingCreated", "BookingUpdated", "BookingCancelled"].includes(
                      ev.type
                    ) ? (
                      <BookingCard ev={ev} />
                    ) : ev.type === "PartnerOffline" ? (
                      <div className="mt-2 text-xs md:text-sm text-slate-700 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-2">
                        {ev.message}
                      </div>
                    ) : (
                      <pre className="mt-2 text-[11px] bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-x-auto text-slate-700">
                        {JSON.stringify(ev.raw || {}, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** Hợp nhất và giới hạn tối đa 100 thông báo */
function mergeAndLimit(a = [], b = []) {
  const merged = [...a, ...b];
  const uniq = [];
  const seen = new Set();
  for (const it of merged) {
    const key = it.id ?? `${it.type}-${it.at}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(it);
    }
  }
  return uniq.slice(0, 100);
}
