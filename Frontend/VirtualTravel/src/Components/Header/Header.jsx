import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { onAuthChanged, emitAuthChanged } from "../../services/authBus";

function readAuth() {
  try {
    const packed = localStorage.getItem("auth");
    if (packed) {
      const obj = JSON.parse(packed);
      if (obj?.token && obj?.user) return { token: obj.token, user: obj.user };
    }
  } catch (err) {
    console.warn("Không thể đọc dữ liệu 'auth' từ localStorage:", err);
  }

  const token =
    localStorage.getItem("token") || localStorage.getItem("vt_auth_token");
  const userRaw =
    localStorage.getItem("user") || localStorage.getItem("vt_user");

  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (token && user) return { token, user };
  } catch (err) {
    console.warn("Không thể parse 'user' JSON:", err);
  }

  return { token: null, user: null };
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [{ token, user }, setAuth] = useState(readAuth());
  const isLoggedIn = !!token && !!user;
  const navigate = useNavigate();
  const location = useLocation();

  // 👇 phát hiện các trang đặc biệt
  const isProfilePage = location.pathname.startsWith("/account");
  const isMyOrdersPage = location.pathname.startsWith("/myorder");
  const isAboutPage = location.pathname.startsWith("/about");
  const isPaymentPage = location.pathname.startsWith("/checkout");
  const isRegisterPage = location.pathname.startsWith("/register");


  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const refresh = () => setAuth(readAuth());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    const off = onAuthChanged(refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      off();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("vt_auth_token");
    localStorage.removeItem("vt_user");

    emitAuthChanged();
    setAuth({ token: null, user: null });

    const menu = document.getElementById("mobile-menu");
    if (menu) menu.classList.add("hidden");
    navigate("/login");
  };

  // ✅ Đã xóa "Chat Bot"
  const NavItems = [
    ["Home", "/"],
    ["Khách Sạn", "/hotels"],
    ["Tour", "/tour"],
    ["About", "/about"],
    ["Profile", "/account"],
  ];

  // 👇 điều kiện header nền trắng (chữ đen)
  const isLightHeader =
  (scrolled ||
    isProfilePage ||
    isMyOrdersPage ||
    isPaymentPage ||
    isRegisterPage) &&
  !isAboutPage;


  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 border-b transition-colors duration-500 ease-in-out ${
        isLightHeader
          ? "bg-white/90 border-gray-200 text-gray-900 shadow-md"
          : "bg-transparent border-transparent text-white"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 h-20 transition-colors duration-500">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/images/icon.jpg"
            alt="Logo"
            className="h-10 w-10 rounded-full object-cover"
          />
          <Link
            to="/"
            className={`font-semibold text-base md:text-lg transition-colors duration-500 ${
              isLightHeader ? "text-gray-900" : "text-white"
            }`}
          >
            Bihappy{" "}
            <span
              className={`font-bold transition-colors duration-500 ${
                isLightHeader ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <br />
              Virtual Travel
            </span>
          </Link>
        </div>

        {/* Navigation menu (desktop) */}
        <nav
          className={`hidden md:flex items-center gap-8 text-sm transition-colors duration-500 ${
            isLightHeader ? "text-gray-700" : "text-white/80"
          }`}
        >
          {NavItems.map(([label, link]) => (
            <NavLink
              key={label}
              to={link}
              className={({ isActive }) =>
                `hover:text-yellow-500 transition-colors duration-300 ${
                  isActive ? "text-yellow-500 font-semibold" : ""
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions (desktop) */}
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className={`hidden md:inline-block rounded-lg px-5 py-2 text-sm font-semibold transition-colors duration-500 ${
              isLightHeader
                ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                : "bg-white/90 text-gray-900 hover:bg-white"
            }`}
          >
            Đăng xuất
          </button>
        ) : (
          <Link
            to="/login"
            className={`hidden md:inline-block rounded-lg px-5 py-2 text-sm font-semibold transition-colors duration-500 ${
              isLightHeader
                ? "bg-yellow-400 text-neutral-900 hover:bg-yellow-300"
                : "bg-yellow-400/90 text-neutral-900 hover:bg-yellow-300"
            }`}
          >
            Đăng nhập
          </Link>
        )}

        {/* Mobile toggle button */}
        <button
          className={`md:hidden p-2 transition-colors duration-500 ${
            isLightHeader
              ? "text-gray-800 hover:text-yellow-500"
              : "text-white hover:text-yellow-400"
          }`}
          onClick={() =>
            document.getElementById("mobile-menu").classList.toggle("hidden")
          }
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`md:hidden hidden ${
          isLightHeader
            ? "bg-white text-gray-800"
            : "bg-neutral-900 text-white/90"
        } border-t border-gray-200 transition-colors duration-500`}
      >
        <nav className="flex flex-col p-4 space-y-3 text-sm">
          {NavItems.map(([label, link]) => (
            <NavLink
              key={label}
              to={link}
              className={({ isActive }) =>
                `hover:text-yellow-500 transition-colors duration-300 ${
                  isActive ? "text-yellow-500 font-semibold" : ""
                }`
              }
              onClick={() =>
                document.getElementById("mobile-menu").classList.add("hidden")
              }
            >
              {label}
            </NavLink>
          ))}

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-200 text-neutral-900 px-4 py-2 text-sm font-semibold hover:bg-gray-300 transition mt-2 text-left"
            >
              Đăng xuất
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-yellow-400 text-neutral-900 px-4 py-2 text-sm font-semibold hover:bg-yellow-300 transition mt-2"
              onClick={() =>
                document.getElementById("mobile-menu").classList.add("hidden")
              }
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
