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
    } catch(e) {e}
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

function TypeBadge({ type }) {
  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  const map = {
    BookingCreated: "bg-blue-100 text-blue-700",
    BookingUpdated: "bg-amber-100 text-amber-700",
    BookingCancelled: "bg-rose-100 text-rose-700", // ✅ mới
    PartnerOffline: "bg-red-100 text-red-700",
    Notification: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`${base} ${map[type] || map.Notification}`}>{type}</span>
  );
}

function BookingCard({ ev }) {
  const p = ev.raw || {};
  const stay = p.stay || {};
  const customer = p.customer || {};
  const prices = p.prices || {};
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-700">{ev.message}</div>
      <div className="grid md:grid-cols-3 gap-2 text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Khách</div>
          <div className="font-medium">{customer?.name || "—"}</div>
          <div className="text-gray-500">{customer?.phone || ""}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Lưu trú</div>
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
            SL phòng: <span className="font-medium">{stay?.quantity ?? "—"}</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Giá</div>
          <div>
            Đ/đêm:{" "}
            <span className="font-medium">{fmtVND(prices?.pricePerNight)}₫</span>
          </div>
          <div>
            Tổng: <span className="font-semibold">{fmtVND(prices?.total)}₫</span>
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

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) setEvents(cached);
    } catch(e) {e}

    (async () => {
      try {
        const token = getJwt();
        const res = await fetch(
          `${API_BASE}/partner/notifications?take=50&unreadOnly=false`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const normalized = (Array.isArray(data) ? data : []).map(normalizeEvent);
          setEvents((prev) => mergeAndLimit(normalized, prev));
        }
      } catch (e) {
        console.warn("Load notifications failed", e);
      }
    })();
  }, []);

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
    connection.on("BookingCancelled", push); // ✅ mới
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

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(events.slice(0, 100)));
    } catch (e){e}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Kênh thông báo (Hotel):</span>
          {connecting ? (
            <span className="text-amber-600">Đang kết nối…</span>
          ) : (
            <span className={connected ? "text-green-600" : "text-red-600"}>
              {connected ? "Đã kết nối" : "Mất kết nối"}
            </span>
          )}
        </div>

        <button
          className={`px-3 py-1.5 rounded-lg border text-sm ${
            unreadCount === 0 || actBusy
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-gray-50"
          }`}
          disabled={unreadCount === 0 || actBusy}
          onClick={markAllRead}
          title="Đánh dấu tất cả đã đọc"
        >
          Đã đọc hết {unreadCount > 0 ? `(${unreadCount})` : ""}
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-3 border-b font-semibold text-center">
          Thông báo gần đây
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Chưa có thông báo nào.
          </div>
        ) : (
          <ul className="divide-y">
            {events.map((ev, idx) => (
              <li key={ev.id ?? idx} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {!ev.isRead && (
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-emerald-500"
                        title="Chưa đọc"
                      />
                    )}
                    <TypeBadge type={ev.type} />
                    <div className="font-medium">{ev.title || ev.type}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                      {new Date(ev.at).toLocaleString("vi-VN")}
                    </div>
                    {!ev.isRead && (
                      <button
                        className={`px-2 py-1 text-xs rounded border hover:bg-gray-50 ${
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
                  {["BookingCreated", "BookingUpdated", "BookingCancelled"].includes(ev.type) ? (
                    <BookingCard ev={ev} />
                  ) : ev.type === "PartnerOffline" ? (
                    <div className="text-sm text-gray-700">{ev.message}</div>
                  ) : (
                    <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(ev.raw || {}, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
