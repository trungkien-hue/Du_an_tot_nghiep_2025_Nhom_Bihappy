// src/Pages/Staff/StaffLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function StaffLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("vt_auth_token");

    navigate("/login"); // điều hướng về trang login
  };

  return (
    <div className="min-h-screen grid grid-cols-12 bg-gradient-to-br from-sky-50 to-blue-100">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r bg-white/70 backdrop-blur-lg p-4 shadow-lg space-y-6 flex flex-col">
        <h2 className="text-2xl font-bold text-blue-600 tracking-wide">Staff Portal</h2>

        <nav className="flex flex-col gap-2 flex-grow">
          {[
            { to: "/staff/orders", label: "📦 Orders" },
            { to: "/staff/reports/tours", label: "🗺️ Reports - Tours" },
            { to: "/staff/reports/hotels", label: "🏨 Reports - Hotels" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "hover:bg-blue-50 hover:text-blue-700"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* 🔥 NÚT ĐĂNG XUẤT — đặt dưới cùng */}
        <button
          onClick={logout}
          className="mt-auto px-4 py-2 rounded-xl bg-red-500 text-white font-semibold 
                     hover:bg-red-600 transition-all duration-300 shadow flex items-center gap-2"
        >
          🚪 Đăng xuất
        </button>
      </aside>

      {/* Content */}
      <main className="col-span-12 md:col-span-9 lg:col-span-10 p-4 md:p-8 ">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
