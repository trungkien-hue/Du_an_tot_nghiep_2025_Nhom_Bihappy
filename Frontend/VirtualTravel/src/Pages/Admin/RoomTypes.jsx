// src/Pages/Admin/RoomTypes.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import hotelApi from "../../services/Admin/hotelApi";
import Table from "../../components/Admin/Table";

/* ================= Helpers ================= */
function normalizeHotels(raw) {
  return (raw || []).map((h) => ({
    hotelID: h.hotelID ?? h.HotelID,
    name: h.name ?? h.Name,
  }));
}
function normalizeRoomTypes(raw) {
  return (raw || []).map((rt) => ({
    roomTypeID: rt.roomTypeID ?? rt.RoomTypeID,
    name: rt.name ?? rt.Name,
    description: rt.description ?? rt.Description,
    capacity: rt.capacity ?? rt.Capacity,
  }));
}

/* ================= Component ================= */
export default function RoomTypes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHotelId = searchParams.get("hotelId") || "";

  const [hotels, setHotels] = useState([]);
  const [hotelId, setHotelId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null); // null = create, object = edit, undefined = close
  const [form, setForm] = useState({ Name: "", Description: "", Capacity: 2 });

  const columns = useMemo(
    () => [
      { key: "roomTypeID", title: "ID" },
      { key: "name", title: "Tên loại phòng" },
      { key: "capacity", title: "Sức chứa" },
      { key: "description", title: "Mô tả" },
    ],
    []
  );

  /* ====== Load hotels ====== */
  useEffect(() => {
    (async () => {
      const res = await hotelApi.getAll({ pageSize: 9999 });
      const list = normalizeHotels(Array.isArray(res) ? res : res.items || res);
      setHotels(list);
      if (urlHotelId) setHotelId(urlHotelId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ====== Load room types when hotel changes ====== */
  const load = async (hid) => {
    if (!hid) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await hotelApi.getRoomTypes(hid);
      setItems(normalizeRoomTypes(Array.isArray(res) ? res : res.items || res));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelId) setSearchParams({ hotelId });
    load(hotelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  /* ====== CRUD ====== */
  const openCreate = () => {
    setEditing(null);
    setForm({ Name: "", Description: "", Capacity: 2 });
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      Name: row.name || "",
      Description: row.description || "",
      Capacity: Number(row.capacity || 2),
    });
  };

  const save = async () => {
    if (!hotelId) return alert("Hãy chọn khách sạn.");
    const payload = { ...form };
    if (editing && editing !== null) {
      payload.RoomTypeID = editing.roomTypeID;
    }
    await hotelApi.upsertRoomType(hotelId, payload);
    setEditing(undefined);
    await load(hotelId);
  };

  const remove = async (row) => {
    if (!confirm(`Xoá loại phòng "${row.name}"?`)) return;
    await hotelApi.deleteRoomType(hotelId, row.roomTypeID);
    await load(hotelId);
  };

  /* ====== UI ====== */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loại phòng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tên, sức chứa và mô tả theo từng khách sạn.
          </p>
        </div>

        <button
          onClick={() => navigate(`/admin/hotels?focusHotelId=${hotelId || ""}`)}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          disabled={!hotelId}
          title="Quay lại chi tiết khách sạn"
        >
          <span className="-ml-1">←</span> Quay lại khách sạn
        </button>
      </div>

      {/* Filters card */}
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600">Chọn khách sạn</label>
            <select
              className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
            >
              <option value="">-- Chọn --</option>
              {hotels.map((h) => (
                <option key={h.hotelID} value={h.hotelID}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-end gap-2">
            <button
              onClick={openCreate}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
              disabled={!hotelId}
            >
              + Thêm loại phòng
            </button>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Danh sách loại phòng</div>
          {items?.length > 0 && (
            <div className="text-sm text-gray-500">
              Tổng: <b>{items.length}</b> dòng
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có loại phòng. Nhấn <span className="font-medium">“+ Thêm loại phòng”</span> để tạo mới.
          </div>
        ) : (
          <div className="p-2">
            {/* Giữ nguyên component Table của bạn */}
            <Table columns={columns} rows={items} onEdit={openEdit} onDelete={remove} />
          </div>
        )}
      </div>

      {/* Modal */}
      {editing !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editing ? "Sửa loại phòng" : "Thêm loại phòng"}
              </h3>
              <button
                onClick={() => setEditing(undefined)}
                className="rounded-lg border px-2.5 py-1 hover:bg-gray-50"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="p-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Tên loại phòng
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={form.Name}
                  onChange={(e) => setForm({ ...form, Name: e.target.value })}
                />
              </label>

              <label className="text-sm">
                Sức chứa
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={form.Capacity}
                  onChange={(e) => setForm({ ...form, Capacity: Number(e.target.value || 0) })}
                />
              </label>

              <label className="text-sm md:col-span-2">
                Mô tả
                <textarea
                  rows={4}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={form.Description}
                  onChange={(e) => setForm({ ...form, Description: e.target.value })}
                />
              </label>
            </div>

            <div className="px-5 pb-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(undefined)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
