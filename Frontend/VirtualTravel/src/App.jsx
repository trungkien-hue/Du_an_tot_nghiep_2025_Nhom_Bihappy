import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import Layout from "./Layout.jsx";
import Home from "./Pages/Home/Home.jsx";
import Hotel from "./Pages/Hotel/Hotel.jsx";
import Tour from "./Pages/Tour/Tour.jsx";
import FormBooking from "./Pages/FormBooking/FormBooking.jsx";
import HotelDetail from "./Pages/HotelDetail/HotelDetail.jsx";
import ScrollToTop from "./services/ScrollToTop.jsx";
import TourDetail from "./Pages/TourDetail/TourDetail.jsx";
import Login from "./Pages/Login/Login.jsx";
import GeminiChat from "./Pages/Chat/GeminiChat.jsx";
import ChatWidget from "./Components/ChatWidget.jsx";
import Register from "./Pages/Login/Register.jsx";
import Account from "./Pages/Login/Account.jsx";

import AdminLayout from "./Pages/Admin/AdminLayout.jsx";
import Dashboard from "./Pages/Admin/Dashboard.jsx";
import Users from "./Pages/Admin/Users.jsx";
import Hotels from "./Pages/Admin/Hotels.jsx";
import Tours from "./Pages/Admin/Tours.jsx";
import Reports from "./Pages/Admin/Reports.jsx";

// 👇👇 THÊM 2 TRANG QUẢN LÝ MỚI
import RoomTypes from "./Pages/Admin/RoomTypes.jsx";
import HotelAvailabilities from "./Pages/Admin/HotelAvailabilities.jsx";

import StaffLayout from "./Pages/Staff/StaffLayout.jsx";
import Orders from "./Pages/Staff/Orders.jsx";
import StaffReportHotels from "./Pages/Staff/StaffReportHotels.jsx";
import StaffReportTours from "./Pages/Staff/StaffReportTours.jsx";

import AboutMystic from "./Pages/AboutMystic.jsx";
import { RouteErrorBoundary } from "./Pages/RouteErrorBoundary.jsx";
import MyOrders from "./Pages/orders/MyOrders.jsx";

/* ====== PARTNER (Cổng khách sạn) - IMPORT MỚI ====== */
import PartnerLayout from "./Pages/Partner/PartnerLayout.jsx";
import PartnerLogin from "./Pages/Partner/PartnerLogin.jsx";
import PartnerDashboard from "./Pages/Partner/PartnerDashboard.jsx";
import PartnerNotifications from "./Pages/Partner/PartnerNotifications.jsx";
import PartnerBookings from "./Pages/Partner/PartnerBookings.jsx";
import AdminPartners from "./Pages/Admin/AdminPartners.jsx";

/* ======================= HÀM ĐỌC AUTH ======================= */
function getAuth() {
  try {
    const packed = localStorage.getItem("auth");
    if (packed) {
      const obj = JSON.parse(packed);
      if (obj?.user && (obj?.token || localStorage.getItem("auth_token"))) {
        // hợp nhất token nếu thiếu
        obj.token = obj.token || localStorage.getItem("auth_token");
        return obj;
      }
    }
    // các key cũ
    const token =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("vt_auth_token");
    const userRaw = localStorage.getItem("user") || localStorage.getItem("vt_user");
    if (token && userRaw) {
      const user = JSON.parse(userRaw);
      return { token, user };
    }
  } catch (err) {
    console.warn("Lỗi đọc auth:", err);
  }
  return null;
}

/* ======================= CHUẨN HÓA ROLE ======================= */
function normalizeRole(roleValue) {
  if (!roleValue) return [];
  if (Array.isArray(roleValue)) return roleValue.map((r) => String(r).toLowerCase());
  if (typeof roleValue === "number") {
    const map = { 1: "admin", 2: "staff", 3: "user" /* có thể thêm 'hotel' nếu bạn dùng số */ };
    return [map[roleValue] || String(roleValue).toLowerCase()];
  }
  return [String(roleValue).toLowerCase()];
}
function hasRequiredRole(auth, allowed = []) {
  if (!auth?.user) return false;
  const raw = auth.user.Role ?? auth.user.role ?? auth.user.roles ?? null;
  const userRoles = normalizeRole(raw);
  const allowedLc = allowed.map((r) => String(r).toLowerCase());
  return userRoles.some((r) => allowedLc.includes(r));
}

/* ======================= COMPONENT FORBIDDEN ======================= */
function Forbidden() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>403 – Forbidden</h1>
      <p>Bạn không có quyền truy cập trang này.</p>
    </div>
  );
}

/* ======================= ROUTE BẢO VỆ ROLE (có redirect tuỳ biến) ======================= */
function RoleRoute({ allowed, redirectTo = "/login" }) {
  const auth = getAuth();
  if (!auth) return <Navigate to={redirectTo} replace />;
  if (!hasRequiredRole(auth, allowed)) return <Forbidden />;
  return <Outlet />;
}

/* ======================= LAYOUT GỐC ======================= */
function Root() {
  return (
    <>
      <ScrollToTop />
      <Layout />
      <ChatWidget />
    </>
  );
}

/* ======================= ROUTER ======================= */
const router = createBrowserRouter([
  // ========= PUBLIC =========
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: "hotels", element: <Hotel /> },
      { path: "tour", element: <Tour /> },
      { path: "formbooking", element: <FormBooking /> },
      { path: "hotels/:id", element: <HotelDetail /> },
      { path: "tours/:id", element: <TourDetail /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "chat", element: <GeminiChat /> },
      { path: "account", element: <Account /> },
      { path: "myorder", element: <MyOrders /> },
      { path: "about", element: <AboutMystic />, errorElement: <RouteErrorBoundary /> },
    ],
  },

  // ========= ADMIN (Admin only) =========
  {
    path: "/admin",
    element: <RoleRoute allowed={["Admin"]} />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "users", element: <Users /> },
          { path: "hotels", element: <Hotels /> },
          { path: "tours", element: <Tours /> },
          { path: "reports", element: <Reports /> },
          { path: "partners", element: <AdminPartners /> },
          { path: "roomtypes", element: <RoomTypes /> },
          { path: "availabilities", element: <HotelAvailabilities /> },
        ],
      },
    ],
  },

  // ========= STAFF (Admin + Staff) =========
  {
    path: "/staff",
    element: <RoleRoute allowed={["Staff", "Admin"]} />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          { path: "orders", element: <Orders /> },
          { path: "reports/tours", element: <StaffReportTours /> },
          { path: "reports/hotels", element: <StaffReportHotels /> },
        ],
      },
    ],
  },

  // ========= PARTNER (Hotel Portal) =========
  // login riêng cho portal
  { path: "/partner/login", element: <PartnerLogin /> },

  // khu vực dành cho role = Hotel
  {
    path: "/partner",
    element: <RoleRoute allowed={["Hotel"]} redirectTo="/partner/login" />,
    children: [
      {
        element: <PartnerLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <PartnerDashboard /> },
          { path: "notifications", element: <PartnerNotifications /> },
          { path: "bookings", element: <PartnerBookings /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
