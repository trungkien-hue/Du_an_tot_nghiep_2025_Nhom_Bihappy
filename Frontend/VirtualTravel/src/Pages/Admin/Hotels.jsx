import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import hotelApi from "../../services/Admin/hotelApi";

// ===== Helpers resolve ảnh cho preview =====
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
function resolveImageUrl(u) {
  if (!u) return "/images/default-hotel.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (url.startsWith("/api/")) url = url.slice(4);
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
}
function cleanUrl(u) {
  if (!u) return "";
  let url = String(u).trim().replace(/\\/g, "/");
  if (url.startsWith("/api/")) url = url.slice(4);
  if (!/^(https?:|data:)/i.test(url)) {
    if (!url.startsWith("/")) url = "/" + url;
  }
  return url;
}

// ================== MAIN COMPONENT ==================
export default function Hotels() {
  const navigate = useNavigate();
  const { globalSearch } = useOutletContext() || {};
 const [searchParams] = useSearchParams(); // không cần setter
  const focusHotelId = searchParams.get("focusHotelId") || "";

  const [rows, setRows] = useState([]);
  const [deletedRows, setDeletedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState({
    Name: "",
    Location: "",
    Description: "",
    PricePerNight: 0,
    Rating: 0,
    ImageURL: "",
  });

  // ==== Cột bảng ====
  const columns = useMemo(
    () => [
      { key: "hotelID", title: "ID" },
      { key: "name", title: "Tên KS" },
      { key: "location", title: "Địa điểm" },
      {
        key: "pricePerNight",
        title: "Giá/đêm",
        render: (r) => (r.pricePerNight || 0).toLocaleString("vi-VN") + "₫",
      },
      { key: "rating", title: "Đánh giá" },
      {
        key: "actions",
        title: "Thao tác",
        render: (r) =>
          !showDeleted ? (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => openEdit(r)}
                className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Sửa
              </button>
              <button
                onClick={() => remove(r)}
                className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
              >
                Xóa
              </button>

              {/* Điều hướng tới trang quản lý chi tiết */}
              <button
                onClick={() => navigate(`/admin/roomtypes?hotelId=${r.hotelID}`)}
                className="px-2 py-1 text-xs rounded bg-slate-600 text-white hover:bg-slate-700"
                title="Xem & quản lý các loại phòng của khách sạn"
              >
                Xem loại phòng
              </button>
              <button
                onClick={() => navigate(`/admin/availabilities?hotelId=${r.hotelID}`)}
                className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                title="Xem & quản lý availability theo loại phòng"
              >
                Xem availability
              </button>
            </div>
          ) : (
            <button
              onClick={() => restore(r)}
              className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
            >
              Khôi phục
            </button>
          ),
      },
    ],
    [showDeleted, navigate]
  );

  const normalize = (raw) =>
    raw.map((h) => ({
      hotelID: h.hotelID ?? h.HotelID,
      name: h.name ?? h.Name,
      location: h.location ?? h.Location,
      description: h.description ?? h.Description,
      pricePerNight: h.pricePerNight ?? h.PricePerNight,
      rating: h.rating ?? h.Rating,
      imageURL: h.imageURL ?? h.ImageURL,
    }));

  const fetchActive = async () => {
    const res = await hotelApi.getAll({ keyword: globalSearch });
    const raw = Array.isArray(res) ? res : res.items || [];
    setRows(normalize(raw));
  };
  const fetchDeleted = async () => {
    const res = await hotelApi.getDeleted({ keyword: globalSearch });
    const raw = Array.isArray(res) ? res : res.items || res;
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

  // ==== Form thêm/sửa ====
  const openCreate = () => {
    setEditing(null);
    setForm({
      Name: "",
      Location: "",
      Description: "",
      PricePerNight: 0,
      Rating: 0,
      ImageURL: "",
    });
  };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      Name: r.name || "",
      Location: r.location || "",
      Description: r.description || "",
      PricePerNight: r.pricePerNight || 0,
      Rating: r.rating || 0,
      ImageURL: r.imageURL || "",
    });
  };

  const save = async () => {
    try {
      const payload = { ...form, ImageURL: cleanUrl(form.ImageURL) };
      if (editing && editing !== null)
        await hotelApi.update(editing.hotelID, payload);
      else await hotelApi.create(payload);
      setEditing(undefined);
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Có lỗi xảy ra");
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Xoá (mềm) khách sạn "${r.name}"?`)) return;
    try {
      await hotelApi.remove(r.hotelID);
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Không thể xoá.");
    }
  };
  const restore = async (r) => {
    try {
      await hotelApi.restore(r.hotelID);
      await fetchDeleted();
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Không thể khôi phục.");
    }
  };

  const tableRows = showDeleted ? deletedRows : rows;

  // ==== Upload file ====
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE || "http://localhost:5059"}/api/admin/hotels/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const url = res?.data?.url || "";
      setForm((prev) => ({ ...prev, ImageURL: url }));
    } catch (err) {
      alert("Upload thất bại: " + (err?.message || "Unknown"));
    }
  };

  // ================== UI ==================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Quản lý khách sạn</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Hiển thị thùng rác
          </label>
          {!showDeleted && (
            <button
              onClick={openCreate}
              className="rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
            >
              + Thêm khách sạn
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 border">
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => {
              const isFocus = String(r.hotelID) === String(focusHotelId);
              return (
                <tr
                  key={r.hotelID}
                  className={`hover:bg-gray-50 ${isFocus ? "bg-yellow-50" : ""}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 border text-center">
                      {col.render ? col.render(r) : r[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-500">Đang tải...</div>}

      {editing !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3">
              {editing ? "Sửa khách sạn" : "Thêm khách sạn"}
            </h3>

            {/* ========== FORM HOTEL ========== */}
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                Tên
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Name}
                  onChange={(e) => setForm({ ...form, Name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Địa điểm
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Location}
                  onChange={(e) =>
                    setForm({ ...form, Location: e.target.value })
                  }
                />
              </label>
              <label className="text-sm md:col-span-2">
                Mô tả
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Description}
                  onChange={(e) =>
                    setForm({ ...form, Description: e.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                Giá/đêm (₫)
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.PricePerNight}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      PricePerNight: Number(e.target.value || 0),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Đánh giá
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.Rating}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      Rating: Number(e.target.value || 0),
                    })
                  }
                />
              </label>
              <label className="text-sm md:col-span-2">
                Ảnh (URL)
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  placeholder="/uploads/hotels/abc.jpg hoặc https://..."
                  value={form.ImageURL}
                  onChange={(e) =>
                    setForm({ ...form, ImageURL: e.target.value })
                  }
                />
              </label>
              <label className="text-sm md:col-span-2">
                Hoặc upload file
                <input type="file" className="mt-1" onChange={handleFileChange} />
              </label>

              {form.ImageURL && (
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">Xem trước:</div>
                  <img
                    src={resolveImageUrl(form.ImageURL)}
                    alt="preview"
                    className="mt-2 w-40 h-28 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(undefined)}
                className="px-3 py-2 rounded-lg border"
              >
                Huỷ
              </button>
              <button
                onClick={save}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white"
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
