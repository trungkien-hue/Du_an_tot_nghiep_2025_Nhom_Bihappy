import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Table from "../../components/Admin/Table";
import userApi from "../../services/Admin/userApi";

export default function Users() {
  const { globalSearch } = useOutletContext() || {};
  const [rows, setRows] = useState([]);
  const [deletedRows, setDeletedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const [editing, setEditing] = useState(undefined); // undefined=đóng, null=tạo
  const [form, setForm] = useState({ FullName:"", Email:"", Phone:"", Role:"User", Password:"" });

  const columns = useMemo(() => ([
    { key: "userID", title: "ID" },
    { key: "fullName", title: "Họ tên" },
    { key: "email", title: "Email" },
    { key: "phone", title: "SĐT" },
    { key: "role", title: "Vai trò" },
    { key: "createdAt", title: "Ngày tạo", render: (r) => new Date(r.createdAt).toLocaleDateString("vi-VN") },
  ]), []);

  const normalize = (raw) => raw.map(u => ({
    userID: u.userID ?? u.UserID,
    fullName: u.fullName ?? u.FullName,
    email: u.email ?? u.Email,
    phone: u.phone ?? u.Phone,
    role: u.role ?? u.Role,
    createdAt: u.createdAt ?? u.CreatedAt,
  }));

  const fetchActive = async () => {
    const res = await userApi.getAll({ keyword: globalSearch, page: 1, pageSize: 20 });
    const raw = Array.isArray(res) ? res : res.items || [];
    setRows(normalize(raw));
  };
  const fetchDeleted = async () => {
    const res = await userApi.getDeleted({ keyword: globalSearch });
    const raw = Array.isArray(res) ? res : res.items || res; // controller trả mảng
    setDeletedRows(normalize(raw));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchActive();
        if (showDeleted) await fetchDeleted();
      } finally {
        setLoading(false);
      }
    })();
  }, [globalSearch, showDeleted]);

  const openCreate = () => {
    setEditing(null);
    setForm({ FullName:"", Email:"", Phone:"", Role:"User", Password:"" });
  };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      FullName: r.fullName || "",
      Email: r.email || "",
      Phone: r.phone || "",
      Role: r.role || "User",
      Password: "",
    });
  };
  const save = async () => {
    try {
      if (editing && editing !== null) await userApi.update(editing.userID, form);
      else await userApi.create(form);
      setEditing(undefined);
      await fetchActive();
    } catch (err) { alert(err?.message || "Có lỗi xảy ra"); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Xoá (mềm) user "${r.fullName}"?`)) return;
    try {
      await userApi.remove(r.userID);
      await fetchActive();
    } catch (err) { alert(err?.message || "Không thể xoá."); }
  };
  const restore = async (r) => {
    try {
      await userApi.restore(r.userID);
      await fetchDeleted();
      await fetchActive();
    } catch (err) { alert(err?.message || "Không thể khôi phục."); }
  };

  const tableRows = showDeleted ? deletedRows : rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Quản lý người dùng</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showDeleted} onChange={(e)=>setShowDeleted(e.target.checked)} />
            Hiển thị thùng rác
          </label>
          {!showDeleted && (
            <button onClick={openCreate} className="rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700">
              + Thêm user
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
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3">{editing ? "Sửa user" : "Thêm user"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Họ tên
                <input className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.FullName} onChange={(e)=>setForm({...form, FullName: e.target.value})}/>
              </label>
              <label className="text-sm">Email
                <input type="email" className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Email} onChange={(e)=>setForm({...form, Email: e.target.value})}/>
              </label>
              <label className="text-sm">SĐT
                <input className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Phone} onChange={(e)=>setForm({...form, Phone: e.target.value})}/>
              </label>
              <label className="text-sm">Vai trò
                <select className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Role} onChange={(e)=>setForm({...form, Role: e.target.value})}>
                  <option>User</option><option>Admin</option>
                </select>
              </label>
              {!editing && (
                <label className="text-sm col-span-2">Mật khẩu (tuỳ chọn)
                  <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={form.Password} onChange={(e)=>setForm({...form, Password: e.target.value})}/>
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
