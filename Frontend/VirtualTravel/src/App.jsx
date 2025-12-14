// File: App.jsx
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

// Admin portal
import AdminLayout from "./Pages/Admin/AdminLayout.jsx";
import Dashboard from "./Pages/Admin/Dashboard.jsx";
import Users from "./Pages/Admin/Users.jsx";
import Hotels from "./Pages/Admin/Hotels.jsx";
import Tours from "./Pages/Admin/Tours.jsx";
import Reports from "./Pages/Admin/Reports.jsx";
import RoomTypes from "./Pages/Admin/RoomTypes.jsx";
import HotelAvailabilities from "./Pages/Admin/HotelAvailabilities.jsx";

// Staff
import StaffLayout from "./Pages/Staff/StaffLayout.jsx";
import Orders from "./Pages/Staff/Orders.jsx";
import StaffReportHotels from "./Pages/Staff/StaffReportHotels.jsx";
import StaffReportTours from "./Pages/Staff/StaffReportTours.jsx";

// Others
import AboutMystic from "./Pages/AboutMystic.jsx";
import { RouteErrorBoundary } from "./Pages/RouteErrorBoundary.jsx";
import MyOrders from "./Pages/orders/MyOrders.jsx";
import PaymentPage from "./Pages/Payment/PaymentPage.jsx";

// ========== PARTNER PORTAL ==========
import PartnerLayout from "./Pages/Partner/PartnerLayout.jsx";
import PartnerLogin from "./Pages/Partner/PartnerLogin.jsx";
import PartnerDashboard from "./Pages/Partner/PartnerDashboard.jsx";
import PartnerNotifications from "./Pages/Partner/PartnerNotifications.jsx";
import PartnerBookings from "./Pages/Partner/PartnerBookings.jsx";
import PartnerBookingReport from "./Pages/Partner/PartnerBookingReport.jsx";

// === NEW: QUẢN LÝ LOẠI PHÒNG (PARTNER) ===
import PartnerRoomTypes from "./Pages/Partner/PartnerRoomTypes.jsx";
import PartnerRatePlans from "./Pages/Partner/PartnerRatePlans.jsx";
import PartnerAvailability from "./Pages/Partner/PartnerAvailability.jsx";
import AdminBookings from "./Pages/Admin/AdminBookings.jsx";


// ================= AUTH HELPERS =================
function getAuth() {
  try {
    const packed = localStorage.getItem("auth");
    if (packed) {
      const obj = JSON.parse(packed);
      if (obj?.user && (obj?.token || localStorage.getItem("auth_token"))) {
        obj.token = obj.token || localStorage.getItem("auth_token");
        return obj;
      }
    }
  } catch {}
  return null;
}

function normalizeRole(roleValue) {
  if (!roleValue) return [];
  return [String(roleValue).toLowerCase()];
}

function hasRequiredRole(auth, allowed = []) {
  if (!auth?.user) return false;
  const userRole =
    auth.user.Role ?? auth.user.role ?? auth.user.roles ?? null;
  const roles = normalizeRole(userRole);
  const allowedLower = allowed.map((x) => x.toLowerCase());
  return roles.some((x) => allowedLower.includes(x));
}

function RoleRoute({ allowed, redirectTo = "/login" }) {
  const auth = getAuth();
  if (!auth) return <Navigate to={redirectTo} replace />;
  if (!hasRequiredRole(auth, allowed)) return <div style={{ padding: 24 }}>403 – Forbidden</div>;
  return <Outlet />;
}

// Root layout
function Root() {
  return (
    <>
      <ScrollToTop />
      <Layout />
      <ChatWidget />
    </>
  );
}


// ================== ROUTER CONFIG ==================
const router = createBrowserRouter([
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
      { path: "checkout", element: <PaymentPage /> },
      { path: "about", element: <AboutMystic />, errorElement: <RouteErrorBoundary /> },
    ],
  },

  // ADMIN
  {
    path: "/admin",
    element: <RoleRoute allowed={["Admin"]} />,
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
          { path: "roomtypes", element: <RoomTypes /> },
          {path: "booking", element: <AdminBookings />},
          { path: "availabilities", element: <HotelAvailabilities /> },
        ],
      },
    ],
  },

  // STAFF
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

  // PARTNER LOGIN
  { path: "/partner/login", element: <PartnerLogin /> },

  // PARTNER SECURE AREA
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
          { path: "availability", element: <PartnerAvailability /> },
          // === NEW FEATURE HERE ===
          { path: "roomtypes", element: <PartnerRoomTypes /> },
          { path: "rateplans", element: <PartnerRatePlans /> },
          { path: "reports/bookings", element: <PartnerBookingReport /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
