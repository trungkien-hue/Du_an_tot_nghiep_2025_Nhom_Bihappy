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
      // Nếu chưa có token thì đẩy về trang login
      if (!localStorage.getItem("auth_token")) nav("/partner/login", { replace: true });
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
    loc.pathname === path ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r px-4 py-5 flex flex-col">
        <div className="mb-4">
          <div className="text-lg font-bold">Hotel Portal</div>
          {user?.hotelId && (
            <div className="text-xs text-gray-500">Hotel ID: {user.hotelId}</div>
          )}
        </div>
        <nav className="flex-1 space-y-1">
          <Link to="/partner/dashboard" className={`block px-3 py-2 rounded-lg ${isActive("/partner/dashboard")}`}>
            🏠 Bảng tin
          </Link>
          <Link to="/partner/notifications" className={`block px-3 py-2 rounded-lg ${isActive("/partner/notifications")}`}>
            🔔 Thông báo
          </Link>
          <Link to="/partner/bookings" className={`block px-3 py-2 rounded-lg ${isActive("/partner/bookings")}`}>
            📑 Đơn đặt
          </Link>
        </nav>
        <button onClick={logout} className="mt-4 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black">
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
