// src/Pages/Admin/AdminPartners.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import partnerAdminApi from "../../services/Admin/partnerAdminApi";
import hotelApi from "../../services/Admin/hotelApi";
import Table from "../../Components/Admin/Table";

function normalizeUsers(raw) {
  return (raw || []).map(u => ({
    userID: u.userID ?? u.UserID,
    fullName: u.fullName ?? u.FullName,
    email: u.email ?? u.Email,
    phone: u.phone ?? u.Phone,
    role: u.role ?? u.Role,
    hotelID: u.hotelID ?? u.HotelID ?? null,
    createdAt: u.createdAt ?? u.CreatedAt,
    isDeleted: u.isDeleted ?? u.IsDeleted,
  }));
}
function normalizeHotels(raw) {
  return (raw || []).map(h => ({
    hotelID: h.hotelID ?? h.HotelID,
    name: h.name ?? h.Name,
  }));
}

export default function AdminPartners() {
  const { globalSearch } = useOutletContext() || {};
  const [rows, setRows] = useState([]);
  const [deletedRows, setDeletedRows] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal: undefined=đóng, null=tạo mới, object=sửa (gán/đổi KS)
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState({ HotelID: "", FullName: "", Email: "", Phone: "", Password: "" });

  const [hotels, setHotels] = useState([]);
  useEffect(() => {
    (async () => {
      const hs = await hotelApi.getAll({ pageSize: 9999 });
      setHotels(normalizeHotels(Array.isArray(hs) ? hs : hs.items || hs));
    })();
  }, []);

  const columns = useMemo(() => ([
    { key: "userID", title: "ID" },
    { key: "fullName", title: "Họ tên" },
    { key: "email", title: "Email" },
    { key: "phone", title: "SĐT" },
    { key: "hotelID", title: "HotelID", render: r => r.hotelID ?? "-" },
    { key: "createdAt", title: "Ngày tạo", render: r => new Date(r.createdAt).toLocaleDateString("vi-VN") },
  ]), []);

  const fetchActive = async () => {
    const res = await partnerAdminApi.getHotelUsers({ keyword: globalSearch });
    const raw = Array.isArray(res) ? res : res.items || res;
    setRows(normalizeUsers(raw));
  };
  const fetchDeleted = async () => {
    const res = await partnerAdminApi.getHotelUsers({ keyword: globalSearch, deleted: true });
    const raw = Array.isArray(res) ? res : res.items || res;
    setDeletedRows(normalizeUsers(raw));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchActive();
        if (showDeleted) await fetchDeleted();
      } finally { setLoading(false); }
    })();
  }, [globalSearch, showDeleted]);

  const openCreate = () => {
    setEditing(null);
    setForm({ HotelID: "", FullName: "", Email: "", Phone: "", Password: "" });
  };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      HotelID: r.hotelID || "",
      FullName: r.fullName || "",
      Email: r.email || "",
      Phone: r.phone || "",
      Password: "",
    });
  };

  const save = async () => {
    try {
      if (editing && editing !== null) {
        // chỉ set hotel cho user đã có
        await partnerAdminApi.setHotelForUser(editing.userID, { HotelID: Number(form.HotelID) || 0 });
      } else {
        // tạo tài khoản Hotel mới
        const payload = {
          HotelID: Number(form.HotelID) || 0,
          FullName: String(form.FullName || ""),
          Email: String(form.Email || ""),
          Phone: form.Phone || "",
          Password: String(form.Password || ""),
        };
        await partnerAdminApi.createHotelUser(payload);
      }
      setEditing(undefined);
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Không thể lưu.");
    }
  };

  const remove = async (r) => {
    if (!confirm(`Xoá (mềm) tài khoản: ${r.fullName}?`)) return;
    try {
      await partnerAdminApi.removeUser(r.userID);
      await fetchActive();
    } catch (err) { alert(err?.message || "Không thể xoá."); }
  };

  const restore = async (r) => {
    try {
      await partnerAdminApi.restoreUser(r.userID);
      await fetchDeleted();
      await fetchActive();
    } catch (err) { alert(err?.message || "Không thể khôi phục."); }
  };

  const tableRows = showDeleted ? deletedRows : rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Quản lý tài khoản Partner (Hotel)</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showDeleted} onChange={(e)=>setShowDeleted(e.target.checked)} />
            Hiển thị thùng rác
          </label>
          {!showDeleted && (
            <button onClick={openCreate} className="rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700">
              + Thêm tài khoản Hotel
            </button>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        rows={tableRows}
        onEdit={!showDeleted ? openEdit : undefined}
        onDelete={!showDeleted ? remove : undefined}
        onRestore={showDeleted ? restore : undefined}
      />

      {loading && <div className="text-sm text-gray-500">Đang tải...</div>}

      {editing !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3">
              {editing ? "Gán/đổi khách sạn cho tài khoản" : "Tạo tài khoản Hotel"}
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                Khách sạn (HotelID)
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.HotelID}
                  onChange={(e)=>setForm({ ...form, HotelID: e.target.value })}
                >
                  <option value="">-- Chọn --</option>
                  {hotels.map(h => <option key={h.hotelID} value={h.hotelID}>{h.hotelID} — {h.name}</option>)}
                </select>
              </label>

              <label className="text-sm">Họ tên
                <input className="mt-1 w-full border rounded-lg px-3 py-2"
                       value={form.FullName}
                       onChange={(e)=>setForm({ ...form, FullName: e.target.value })} />
              </label>
              <label className="text-sm">SĐT
                <input className="mt-1 w-full border rounded-lg px-3 py-2"
                       value={form.Phone}
                       onChange={(e)=>setForm({ ...form, Phone: e.target.value })} />
              </label>
              <label className="text-sm md:col-span-2">Email
                <input type="email" className="mt-1 w-full border rounded-lg px-3 py-2"
                       value={form.Email}
                       onChange={(e)=>setForm({ ...form, Email: e.target.value })} />
              </label>
              {!editing && (
                <label className="text-sm md:col-span-2">Mật khẩu (tạo mới)
                  <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2"
                         value={form.Password}
                         onChange={(e)=>setForm({ ...form, Password: e.target.value })} />
                </label>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setEditing(undefined)} className="px-3 py-2 rounded-lg border">Huỷ</button>
              <button onClick={save} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
