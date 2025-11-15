import { useState } from "react";
import { Search, User as UserIcon } from "lucide-react";
import AdminBell from "./AdminBell.jsx";

export default function Topbar({ onSearch }) {
  const [q, setQ] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(q);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* 🔍 Thanh tìm kiếm */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-xl">
        <div className="relative w-full">
          <input
            className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tìm kiếm nhanh (user, hotel, tour...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <button
          type="submit"
          className="hidden md:inline-flex rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
        >
          Tìm
        </button>
      </form>

      {/* 👤 Khu vực chuông + user */}
      <div className="flex items-center gap-3">
        {/* ✅ Chuông thông báo realtime */}
        <AdminBell />

        {/* phân cách */}
        <div className="h-8 w-[1px] bg-gray-200" />

        {/* Thông tin admin */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <UserIcon size={16} />
          </div>
          {/* <div className="text-sm">
            <div className="font-medium">Admin</div>
            <div className="text-gray-500 -mt-1">admin@virtual.travel</div>
          </div> */}
        </div>
      </div>
    </header>
  );
}
