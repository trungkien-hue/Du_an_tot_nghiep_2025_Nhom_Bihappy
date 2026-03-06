import { Outlet } from "react-router-dom";
import Sidebar from "../../Components/Admin/Sidebar";
import Topbar from "../../Components/Admin/Topbar";
import { useState } from "react";

export default function AdminLayout() {
  const [globalSearch, setGlobalSearch] = useState("");

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar onSearch={setGlobalSearch} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ globalSearch }} />
        </main>
      </div>
    </div>
  );
}
