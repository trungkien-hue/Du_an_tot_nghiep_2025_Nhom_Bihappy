// src/components/Admin/Sidebar.jsx
import { NavLink } from "react-router-dom";
import {
  Users,
  Hotel,
  Plane,
  BarChart3,
  LayoutDashboard,
  Handshake,
  BedDouble,
  CalendarDays,
  LogOut,
  Clock3,
} from "lucide-react";

const Item = ({ to, icon: IconComponent, color, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        isActive
          ? "bg-blue-100 text-blue-700 font-semibold"
          : "hover:bg-gray-100 text-gray-700"
      }`
    }
  >
    {IconComponent ? (
      <IconComponent size={18} className={`text-${color || "gray"}-500`} />
    ) : null}
    {children}
  </NavLink>
);

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-blue-600">VirtualTravel</h1>
        <p className="text-xs text-gray-500">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Item to="/admin/dashboard" icon={LayoutDashboard} color="blue">
          <span>Dashboard</span>
        </Item>
        <Item to="/admin/users" icon={Users} color="purple">
          <span>Quản lý User</span>
        </Item>
        <Item to="/admin/hotels" icon={Hotel} color="orange">
          <span>Quản lý Hotel</span>
        </Item>
        <Item to="/admin/roomtypes" icon={BedDouble} color="teal">
          <span>Loại phòng</span>
        </Item>
        <Item to="/admin/availabilities" icon={CalendarDays} color="cyan">
          <span>Lịch phòng</span>
        </Item>
        <Item to="/admin/tours" icon={Plane} color="lime">
          <span>Quản lý Tour</span>
        </Item>
        <Item to="/admin/booking" icon={Clock3} color="rose">
          <span>History</span>
        </Item>
        <Item to="/admin/reports" icon={BarChart3} color="rose">
          <span>Báo cáo</span>
        </Item>

        {/* Partner section */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase px-2 tracking-wide">
            Partner
          </p>
          <Item to="/admin/partners" icon={Handshake} color="amber">
            <span>Quản lý Partner</span>
          </Item>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-gray-500 flex items-center justify-between">
        <span>© 2025 VirtualTravel</span>
        <LogOut size={16} className="text-gray-400 hover:text-red-500 cursor-pointer" />
      </div>
    </aside>
  );
}
