// File: src/Pages/Partner/PartnerRatePlans.jsx
import { useEffect, useState } from "react";
import partnerApi from "../../services/partnerApi";

function formatVnd(n) {
  const v = typeof n === "number" ? n : Number(n || 0);
  return v.toLocaleString("vi-VN") + " ₫";
}

const emptyForm = {
  RatePlanID: null,
  RoomTypeID: "",
  Name: "",
  Description: "",
  BasePrice: "",
  Currency: "VND",
  IsActive: true,
};

export default function PartnerRatePlans() {
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // ================================
  // Load Data
  // ================================
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Load rate plans
      const rp = await partnerApi.getRatePlans({});
      setRatePlans(Array.isArray(rp) ? rp : []);

      // Load room types
      let rt = [];
      try {
        rt = await partnerApi.getRoomTypes();
      } catch (e) {
        console.warn("Không load được RoomTypes:", e);
      }
      setRoomTypes(Array.isArray(rt) ? rt : []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Không tải được gói giá.");
    } finally {
      setLoading(false);
    }
  }

  // ================================
  // Open Modal: Create
  // ================================
  const openCreate = () => {
    setEditing(false);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ================================
  // Open Modal: Edit
  // ================================
  const openEdit = (rp) => {
    setEditing(true);
    setForm({
      RatePlanID: rp.RatePlanID ?? rp.ratePlanID,
      RoomTypeID: rp.RoomTypeID ?? rp.roomTypeID ?? "",
      Name: rp.Name ?? rp.name ?? "",
      Description: rp.Description ?? rp.description ?? "",
      BasePrice: rp.BasePrice ?? rp.basePrice ?? "",
      Currency: rp.Currency ?? rp.currency ?? "VND",
      IsActive: rp.IsActive ?? rp.isActive ?? true,
    });
    setModalOpen(true);
  };

const submit = async (e) => {
  e.preventDefault();
  setBusy(true);

  if (!form.RoomTypeID) {
    alert("Vui lòng chọn loại phòng.");
    setBusy(false);
    return;
  }

  const payload = {
    RoomTypeID: Number(form.RoomTypeID),
    Name: form.Name.trim(),
    Description: form.Description,
    BasePrice: Number(form.BasePrice || 0),
    Currency: form.Currency || "VND",
    IsActive: form.IsActive
  };

  try {
    if (editing) {
      await partnerApi.updateRatePlan(form.RatePlanID, payload);
    } else {
      await partnerApi.createRatePlan(payload);
    }

    setModalOpen(false);
    await loadData();
  } catch (err) {
    console.error(err);
    alert("Lưu gói giá thất bại.");
  } finally {
    setBusy(false);
  }
};


  // ================================
  // Delete
  // ================================
  const remove = async (rp) => {
    const id = rp.RatePlanID ?? rp.ratePlanID;
    if (!id) return;

    if (!window.confirm(`Vô hiệu hóa gói giá "${rp.Name ?? rp.name}"?`)) return;

    setBusy(true);
    try {
      await partnerApi.deleteRatePlan(id);
      await loadData();
    } catch (err) {
      alert("Không thể xoá.");
    } finally {
      setBusy(false);
    }
  };

  // ================================
  // Search
  // ================================
  const filtered = ratePlans.filter((rp) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    const name = (rp.Name ?? rp.name ?? "").toLowerCase();
    const rtName = (rp.RoomTypeName ?? rp.roomTypeName ?? "").toLowerCase();
    return name.includes(keyword) || rtName.includes(keyword);
  });

  // ================================
  // RENDER
  // ================================
  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Gói giá (Rate Plan)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý giá cơ bản (BasePrice) cho từng loại phòng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm"
            placeholder="Tìm kiếm gói giá..."
          />
          <button
            onClick={openCreate}
            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700"
          >
            + Thêm gói giá
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border p-3">
        {loading ? (
          <div className="text-center p-6 text-slate-500 text-sm">
            Đang tải dữ liệu...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-6 text-slate-500 text-sm">
            Không có gói giá nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Tên gói</th>
                  <th className="p-2 text-left">Loại phòng</th>
                  <th className="p-2 text-left">Mô tả</th>
                  <th className="p-2 text-right">Giá cơ bản</th>
                  <th className="p-2 text-center">Đơn vị</th>
                  <th className="p-2 text-center">Trạng thái</th>
                  <th className="p-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rp) => {
                  const id = rp.RatePlanID ?? rp.ratePlanID;
                  const rtName =
                    rp.RoomTypeName ??
                    rp.roomTypeName ??
                    roomTypes.find(
                      (r) =>
                        (r.RoomTypeID ?? r.roomTypeID) ===
                        (rp.RoomTypeID ?? rp.roomTypeID)
                    )?.Name ??
                    "—";

                  return (
                    <tr key={id} className="border-t">
                      <td className="p-2">{id}</td>
                      <td className="p-2 font-medium">{rp.Name ?? rp.name}</td>
                      <td className="p-2">{rtName}</td>
                      <td className="p-2 text-slate-600">
                        {(rp.Description ?? rp.description ?? "").slice(0, 80)}
                      </td>
                      <td className="p-2 text-right">
                        {formatVnd(rp.BasePrice ?? rp.basePrice ?? 0)}
                      </td>
                      <td className="p-2 text-center">
                        {rp.Currency ?? rp.currency}
                      </td>
                      <td className="p-2 text-center">
                        {(rp.IsActive ?? rp.isActive) ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang bán
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-300">
                            Ngưng bán
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            className="px-2 py-1 border rounded hover:bg-slate-50"
                            onClick={() => openEdit(rp)}
                          >
                            Sửa
                          </button>
                          <button
                            className="px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                            onClick={() => remove(rp)}
                          >
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-lg text-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">
                {editing ? "Sửa gói giá" : "Thêm gói giá"}
              </h2>
              <button
                className="text-slate-500 text-xl"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block mb-1 font-medium">Tên gói giá *</label>
                <input
                  type="text"
                  value={form.Name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, Name: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Loại phòng *
                </label>
                <select
                  value={form.RoomTypeID}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, RoomTypeID: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Chọn loại phòng</option>
                  {roomTypes.map((rt) => (
                    <option
                      key={rt.RoomTypeID ?? rt.roomTypeID}
                      value={rt.RoomTypeID ?? rt.roomTypeID}
                    >
                      {rt.RoomTypeID ?? rt.roomTypeID} –{" "}
                      {rt.Name ?? rt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">Mô tả</label>
                <textarea
                  value={form.Description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      Description: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">
                    Giá cơ bản (đ/đêm) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.BasePrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        BasePrice: e.target.value,
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Tiền tệ</label>
                  <input
                    type="text"
                    value={form.Currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, Currency: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={form.IsActive}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      IsActive: e.target.checked,
                    }))
                  }
                />
                <label>Đang bán</label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  className="px-3 py-1.5 border rounded-lg hover:bg-slate-50"
                  onClick={() => setModalOpen(false)}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? "Đang lưu..." : "Lưu gói giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
