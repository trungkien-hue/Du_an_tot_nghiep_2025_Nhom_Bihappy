// src/Pages/Admin/HotelAvailabilities.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import hotelApi from "../../services/Admin/hotelApi";

/* ================= Helpers ================= */
function normalizeHotels(raw) {
  return (raw || []).map(h => ({
    hotelID: h.hotelID ?? h.HotelID,
    name: h.name ?? h.Name,
  }));
}
function normalizeRoomTypes(raw) {
  return (raw || []).map(rt => ({
    roomTypeID: rt.roomTypeID ?? rt.RoomTypeID,
    name: rt.name ?? rt.Name,
  }));
}
function normalizeAvails(raw) {
  return (raw || []).map(a => {
    const date = (a.Date ?? a.date ?? a.Checkin ?? a.checkin ?? "").toString().slice(0, 10);
    return {
      id: a.hotelAvailabilityID ?? a.HotelAvailabilityID,
      date,
      availableRooms: a.availableRooms ?? a.AvailableRooms ?? 0,
      price: a.price ?? a.Price ?? 0,
    };
  });
}
const vnd = (n) => (Number(n || 0)).toLocaleString("vi-VN") + "₫";

/* ================= Component ================= */
export default function HotelAvailabilities() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHotelId = searchParams.get("hotelId") || "";

  const [hotels, setHotels] = useState([]);
  const [hotelId, setHotelId] = useState("");
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null); // null=create, object=edit, undefined=close
  const [form, setForm] = useState({
    Date: "",
    AvailableRooms: 1,
    Price: 0,
  });

  const columns = useMemo(
    () => [
      { key: "id", title: "ID", width: "w-16" },
      { key: "date", title: "Ngày" },
      { key: "availableRooms", title: "Số phòng", align: "text-center", width: "w-24" },
      { key: "price", title: "Giá", align: "text-right", render: (r) => vnd(r.price), width: "w-40" },
      { key: "__actions", title: "Thao tác", width: "w-40" },
    ],
    []
  );

  /* ====== Load hotels first ====== */
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
  useEffect(() => {
    if (hotelId) setSearchParams({ hotelId });
    (async () => {
      setRoomTypes([]);
      setRoomTypeId("");
      setItems([]);
      if (!hotelId) return;
      const res = await hotelApi.getRoomTypes(hotelId);
      setRoomTypes(normalizeRoomTypes(Array.isArray(res) ? res : res.items || res));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const load = async () => {
    if (!hotelId || !roomTypeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await hotelApi.getAvailabilities(hotelId, roomTypeId);
      setItems(normalizeAvails(Array.isArray(res) ? res : res.items || res));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [roomTypeId]);

  /* ====== CRUD handlers ====== */
  const openCreate = () => {
    setEditing(null);
    setForm({
      Date: "",
      AvailableRooms: 1,
      Price: 0,
    });
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      Date: row.date,
      AvailableRooms: Number(row.availableRooms || 0),
      Price: Number(row.price || 0),
    });
  };

  const save = async () => {
    if (!hotelId || !roomTypeId) return alert("Hãy chọn đủ khách sạn & loại phòng.");
    const payload = { ...form }; // { Date, AvailableRooms, Price }
    if (editing && editing !== null) {
      payload.HotelAvailabilityID = editing.id;
    }
    await hotelApi.upsertAvailability(hotelId, roomTypeId, payload);
    setEditing(undefined);
    await load();
  };

  const remove = async (row) => {
    if (!confirm("Xoá availability ngày này?")) return;
    await hotelApi.deleteAvailability(hotelId, roomTypeId, row.id);
    await load();
  };

  /* ====== UI ====== */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý Availability (daily)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Thiết lập số phòng & giá theo từng ngày cho từng loại phòng.
          </p>
        </div>

        <button
          onClick={() => navigate(`/admin/hotels?focusHotelId=${hotelId || ""}`)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-800 text-white px-4 py-2 hover:bg-gray-900 disabled:opacity-50"
          disabled={!hotelId}
          title="Quay lại chi tiết khách sạn"
        >
          <span className="inline-block -ml-1">←</span> Quay lại khách sạn
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Chọn khách sạn</label>
            <select
              className="mt-1 border rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
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

          <div>
            <label className="block text-sm text-gray-600">Chọn loại phòng</label>
            <select
              className="mt-1 border rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              disabled={!hotelId}
            >
              <option value="">-- Chọn --</option>
              {roomTypes.map((rt) => (
                <option key={rt.roomTypeID} value={rt.roomTypeID}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-end gap-2">
            <button
              onClick={load}
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
              disabled={!hotelId || !roomTypeId || loading}
            >
              Làm mới
            </button>
            <button
              onClick={openCreate}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
              disabled={!hotelId || !roomTypeId}
            >
              + Thêm availability
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Danh sách availability</div>
          {items?.length > 0 && (
            <div className="text-sm text-gray-500">
              Tổng: <b>{items.length}</b> dòng
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có dữ liệu. Hãy chọn khách sạn & loại phòng, sau đó nhấn
            <span className="mx-1 font-medium">“+ Thêm availability”</span> để tạo mới.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  {columns.map((c) => (
                    <th key={c.key} className={`px-4 py-3 font-semibold text-gray-700 ${c.width || ""} ${c.align || ""}`}>
                      {c.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((row, idx) => (
                  <tr key={row.id} className={`hover:bg-gray-50 ${idx % 2 === 1 ? "bg-white" : "bg-gray-50/30"}`}>
                    <td className="px-4 py-3">{row.id}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium">
                        {row.availableRooms}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{vnd(row.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                          Sửa
                        </button>
                        <button onClick={() => remove(row)} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700">
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {editing !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? "Sửa availability" : "Thêm availability"}</h3>
              <button onClick={() => setEditing(undefined)} className="rounded-lg border px-2.5 py-1 hover:bg-gray-50" aria-label="Đóng">✕</button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="text-sm">
                Ngày
                <input
                  type="date"
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={form.Date}
                  onChange={(e) => setForm({ ...form, Date: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Số phòng
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={form.AvailableRooms}
                  onChange={(e) =>
                    setForm({ ...form, AvailableRooms: Number(e.target.value || 0) })
                  }
                />
              </label>
              <label className="text-sm">
                Giá (₫)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={form.Price}
                  onChange={(e) => setForm({ ...form, Price: Number(e.target.value || 0) })}
                />
              </label>
            </div>

            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setEditing(undefined)} className="px-4 py-2 rounded-xl border hover:bg-gray-50">Huỷ</button>
              <button onClick={save} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
