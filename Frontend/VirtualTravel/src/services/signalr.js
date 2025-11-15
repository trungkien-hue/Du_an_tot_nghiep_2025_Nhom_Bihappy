// src/services/signalr.js
import * as signalR from "@microsoft/signalr";

let singletonConn = null;
let started = false;

/**
 * Tạo hoặc lấy kết nối SignalR singleton tới NotificationHub
 * - FE vẫn dùng VITE_API_URL=https://localhost:7059/api (giữ nguyên)
 * - Hàm này tự động gọt "/api" khỏi URL khi nối Hub.
 */
export function getNotificationConnection(onNewNotification) {
  if (singletonConn) return singletonConn;

  // FE có thể đang đặt VITE_API_URL=https://localhost:7059/api
  // → ta cần bỏ đuôi "/api" khi nối SignalR
  const base = import.meta.env.VITE_API_URL || "https://localhost:7059/api";
  const hubUrl = base.replace(/\/api\/?$/, "").replace(/\/$/, "") + "/hubs/notifications";

  console.log("%c[SignalR] HUB URL:", "color:#4ade80", hubUrl);

  const tokenGetter = () => {
    try {
      const packed = localStorage.getItem("auth");
      if (packed) {
        const parsed = JSON.parse(packed);
        return parsed?.token || parsed?.accessToken || "";
      }
      return localStorage.getItem("token") || localStorage.getItem("vt_auth_token") || "";
    } catch {
      return "";
    }
  };

  singletonConn = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => tokenGetter(),
      // ⚠️ KHÔNG ép WebSockets khi dev nếu backend HTTPS, để SignalR tự negotiate
      // Nếu backend và FE cùng chạy HTTP (dev), có thể bật 2 dòng dưới để giảm lỗi:
      // transport: signalR.HttpTransportType.WebSockets,
      // skipNegotiation: true,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    .build();

  // Khi nhận thông báo mới từ backend
  singletonConn.on("NewNotification", (payload) => {
    console.log("%c[SignalR] New notification:", "color:#3b82f6", payload);
    if (typeof onNewNotification === "function") {
      onNewNotification(payload);
    }
  });

  // Helper: đảm bảo chỉ start 1 lần, auto retry
  singletonConn.startSafely = async () => {
    if (started) return;
    started = true;
    try {
      await singletonConn.start();
      console.log("%c[SignalR] Connected ✅", "color:#10b981");
    } catch (err) {
      started = false; // cho phép thử lại
      console.warn("[SignalR] Start error:", err);
      // auto retry sau 5s nếu lỗi
      setTimeout(() => singletonConn.startSafely().catch(() => {}), 5000);
    }
  };

  // Khi mất kết nối → log + tự retry
  singletonConn.onclose((err) => {
    console.warn("[SignalR] Disconnected:", err);
    started = false;
    setTimeout(() => singletonConn.startSafely().catch(() => {}), 3000);
  });

  return singletonConn;
}

/**
 * Ngắt kết nối (nếu cần dọn dẹp)
 */
export async function stopNotificationConnection() {
  if (singletonConn) {
    try {
      await singletonConn.stop();
    } catch (e){e}
    singletonConn = null;
    started = false;
  }
}
