// File: src/Pages/Partner/PartnerLayout.jsx
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PartnerLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth");
      const data = raw ? JSON.parse(raw) : null;
      setUser(data?.user || null);
      if (!localStorage.getItem("auth_token")) {
        nav("/partner/login", { replace: true });
      }
    } catch {
      nav("/partner/login", { replace: true });
    }
  }, [nav]);

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("auth_token");
    nav("/partner/login", { replace: true });
  };

  const isActive = (path) =>
    loc.pathname === path
      ? "bg-gray-900 text-white"
      : "hover:bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r pl-2 pr-4 py-5 flex flex-col">
        <div className="mb-6 pl-2">
          <div className="text-lg font-bold">Hotel Portal</div>
          {user?.hotelId && (
            <div className="text-xs text-gray-500">
              Hotel : {user.hotelName ?? user.hotelId}
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-2">
          <Link
            to="/partner/dashboard"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isActive(
              "/partner/dashboard"
            )}`}
          >
            <span>🏠</span>
            <span>Bảng tin</span>
          </Link>

          <Link
            to="/partner/notifications"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isActive(
              "/partner/notifications"
            )}`}
          >
            <span>🔔</span>
            <span>Thông báo</span>
          </Link>

          <Link
            to="/partner/bookings"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isActive(
              "/partner/bookings"
            )}`}
          >
            <span>📑</span>
            <span>Đơn đặt</span>
          </Link>

          {/* (Nếu bạn đã có) Loại phòng */}
          <Link
            to="/partner/roomtypes"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isActive(
              "/partner/roomtypes"
            )}`}
          >
            <span>🛏️</span>
            <span>Loại phòng</span>
          </Link>

          {/* NEW: Gói giá / Rate Plan */}
          <Link
            to="/partner/rateplans"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isActive(
              "/partner/rateplans"
            )}`}
          >
            <span>💰</span>
            <span>Gói giá</span>
          </Link>
          <Link to="/partner/availability">📅 Giá & tồn kho</Link>
          <Link
            to="/partner/reports/bookings"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isActive(
              "/partner/reports/bookings"
            )}`}
          >
            <span>📊</span>
            <span>Báo cáo đơn</span>
          </Link>
        </nav>
        <button
          onClick={logout}
          className="mt-4 mx-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black text-sm"
        >
          Đăng xuất
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
