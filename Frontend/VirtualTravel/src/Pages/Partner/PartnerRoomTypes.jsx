// File: src/Pages/Partner/PartnerRoomTypes.jsx
import { useEffect, useState } from "react";
import partnerApi from "../../services/partnerApi";

const emptyForm = {
  RoomTypeID: null,
  Name: "",
  Description: "",
  Capacity: 2,
  Price: 0,
  IsActive: true,
};

const emptyVoucherForm = {
  RoomTypeVoucherID: null,
  RoomTypeID: null,
  Title: "",
  Code: "",
  DiscountPercent: "",
  DiscountAmount: "",
  FromDate: "",
  ToDate: "",
  IsActive: true,
};

export default function PartnerRoomTypes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");

  /* ========== ROOMTYPE MODAL ========== */
  const [rtModalOpen, setRtModalOpen] = useState(false);
  const [rtForm, setRtForm] = useState(emptyForm);
  const [rtEditing, setRtEditing] = useState(false);

  /* ========== VOUCHER MODAL ========== */
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [voucherList, setVoucherList] = useState([]);
  const [voucherRoomType, setVoucherRoomType] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  /* ======================================================
     LOAD ROOM TYPES
  ====================================================== */
  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerApi.getRoomTypes();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert("Không tải được danh sách loại phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ======================================================
     CREATE / EDIT ROOMTYPE
  ====================================================== */
  const openCreate = () => {
    setRtForm(emptyForm);
    setRtEditing(false);
    setRtModalOpen(true);
  };

  const openEdit = (rt) => {
    setRtForm({
      RoomTypeID: rt.RoomTypeID ?? rt.roomTypeID,
      Name: rt.Name ?? rt.name ?? "",
      Description: rt.Description ?? rt.description ?? "",
      Capacity: rt.Capacity ?? rt.capacity ?? 2,
      Price: 0,
      IsActive:
        typeof rt.IsActive === "boolean"
          ? rt.IsActive
          : !(rt.isDeleted ?? false),
    });
    setRtEditing(true);
    setRtModalOpen(true);
  };

  const submitRoomType = async (e) => {
    e.preventDefault();
    setBusy(true);

    const payload = {
      name: rtForm.Name,
      description: rtForm.Description,
      capacity: Number(rtForm.Capacity),
      price: 0,
      isActive: rtForm.IsActive,
    };

    try {
      if (rtEditing && rtForm.RoomTypeID) {
        await partnerApi.updateRoomType(rtForm.RoomTypeID, payload);
      } else {
        await partnerApi.createRoomType(payload);
      }

      setRtModalOpen(false);
      load();
    } catch (err) {
      console.error(err);
      alert("Lưu loại phòng thất bại.");
    } finally {
      setBusy(false);
    }
  };

  /* ======================================================
     DELETE ROOMTYPE
  ====================================================== */
  const removeRoomType = async (rt) => {
    const id = rt.RoomTypeID ?? rt.roomTypeID;
    if (!id) return;

    if (!window.confirm(`Xoá loại phòng "${rt.Name ?? rt.name}" ?`)) return;

    setBusy(true);
    try {
      await partnerApi.deleteRoomType(id);
      load();
    } catch (err) {
      console.error(err);
      alert("Xoá thất bại.");
    } finally {
      setBusy(false);
    }
  };

  /* ======================================================
     VOUCHER: OPEN MODAL + LOAD DATA
  ====================================================== */
  async function openVouchers(rt) {
    const roomTypeId = rt.RoomTypeID ?? rt.roomTypeID;

    setVoucherRoomType(rt);
    setVoucherModalOpen(true);
    setVoucherLoading(true);

    try {
      const list = await partnerApi.getVouchersByRoomType(roomTypeId);
      setVoucherList(list || []);
    } catch (err) {
      console.error(err);
      alert("Không tải được voucher.");
    } finally {
      setVoucherLoading(false);
    }

    setVoucherForm({
      ...emptyVoucherForm,
      RoomTypeID: roomTypeId,
    });
  }

  /* ======================================================
     SUBMIT VOUCHER (CREATE / UPDATE)
  ====================================================== */
  async function submitVoucher(e) {
    e.preventDefault();
    setBusy(true);

    const payload = {
      RoomTypeID: voucherForm.RoomTypeID,
      Title: voucherForm.Title,
      Code: voucherForm.Code || null,
      DiscountPercent: voucherForm.DiscountPercent || null,
      DiscountAmount: voucherForm.DiscountAmount || null,
      FromDate: voucherForm.FromDate,
      ToDate: voucherForm.ToDate || null,
      IsActive: voucherForm.IsActive,
    };

    try {
      if (voucherForm.RoomTypeVoucherID) {
        await partnerApi.updateVoucher(voucherForm.RoomTypeVoucherID, payload);
      } else {
        await partnerApi.createVoucher(payload);
      }

      const list = await partnerApi.getVouchersByRoomType(
        voucherForm.RoomTypeID
      );
      setVoucherList(list);
      setVoucherForm({
        ...emptyVoucherForm,
        RoomTypeID: voucherForm.RoomTypeID,
      });
    } catch (err) {
      console.error(err);
      alert("Không lưu được voucher.");
    } finally {
      setBusy(false);
    }
  }

  /* ======================================================
     DELETE VOUCHER
  ====================================================== */
  async function removeVoucher(id) {
    if (!window.confirm("Xoá voucher này?")) return;

    await partnerApi.deleteVoucher(id);
    const list = await partnerApi.getVouchersByRoomType(
      voucherForm.RoomTypeID
    );
    setVoucherList(list);
  }

  /* ======================================================
     SEARCH
  ====================================================== */
  const keyword = search.toLowerCase().trim();
  const filteredRows = rows.filter((r) => {
    if (!keyword) return true;
    return (
      (r.Name ?? r.name ?? "").toLowerCase().includes(keyword) ||
      (r.Description ?? r.description ?? "").toLowerCase().includes(keyword) ||
      String(r.RoomTypeID ?? r.roomTypeID).includes(keyword)
    );
  });

  /* ======================================================
     RENDER UI
  ====================================================== */
  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <h1 className="text-xl font-semibold">Quản lý loại phòng</h1>

        <div className="flex gap-2">
          <input
            className="border rounded-lg px-2 py-1 text-sm"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={openCreate}
            className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-emerald-700"
          >
            + Thêm loại phòng
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        {loading ? (
          <div className="text-center py-5 text-gray-500 text-sm">
            Đang tải...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-5 text-gray-500 text-sm">
            Chưa có loại phòng.
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Mã</th>
                <th className="p-2 text-left">Tên phòng</th>
                <th className="p-2 text-left">Mô tả</th>
                <th className="p-2 text-center">Sức chứa</th>
                <th className="p-2 text-center">Trạng thái</th>
                <th className="p-2 text-center w-[220px]">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((rt) => {
                const id = rt.RoomTypeID ?? rt.roomTypeID;

                return (
                  <tr key={id} className="border-t">
                    <td className="p-2">{id}</td>
                    <td className="p-2 font-medium">{rt.Name ?? rt.name}</td>
                    <td className="p-2 text-gray-600 text-xs max-w-[240px]">
                      <div className="line-clamp-2">
                        {rt.Description ?? rt.description}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {rt.Capacity ?? rt.capacity} khách
                    </td>

                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full border ${
                          rt.IsActive ?? true
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-gray-100 border-gray-300 text-gray-500"
                        }`}
                      >
                        {rt.IsActive ? "Hoạt động" : "Ngưng bán"}
                      </span>
                    </td>

                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEdit(rt)}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                        >
                          Sửa
                        </button>

                        <button
                          onClick={() => openVouchers(rt)}
                          className="px-2 py-1 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                        >
                          Voucher
                        </button>

                        <button
                          onClick={() => removeRoomType(rt)}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
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
        )}
      </div>

      {/* ======================== MODAL VOUCHER ======================== */}
      {voucherModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Voucher loại phòng</h2>

              <button
                onClick={() => setVoucherModalOpen(false)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            {/* ROOMTYPE NAME */}
            {voucherRoomType && (
              <div className="text-sm text-gray-500 mb-3">
                Áp dụng cho:{" "}
                <span className="font-medium">
                  {voucherRoomType.Name ?? voucherRoomType.name}
                </span>
              </div>
            )}

            {/* VOUCHER LIST */}
            <div className="border rounded-lg p-3 max-h-[260px] overflow-y-auto mb-4">
              {voucherLoading ? (
                <div className="text-center text-gray-500 text-sm">
                  Đang tải voucher...
                </div>
              ) : voucherList.length === 0 ? (
                <div className="text-center text-gray-500 text-sm">
                  Chưa có voucher.
                </div>
              ) : (
                voucherList.map((v) => (
                  <div
                    key={v.RoomTypeVoucherID}
                    className="border-b py-2 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{v.Title}</div>
                      <div className="text-xs text-gray-600">
                        {v.DiscountPercent
                          ? `-${v.DiscountPercent}%`
                          : v.DiscountAmount
                          ? `-${Number(v.DiscountAmount).toLocaleString(
                              "vi-VN"
                            )} đ`
                          : ""}
                      </div>
                      <div className="text-xs text-gray-400">
                        {v.FromDate?.slice(0, 10)} →{" "}
                        {v.ToDate ? v.ToDate.slice(0, 10) : "Không giới hạn"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 text-xs border rounded"
                        onClick={() =>
                          setVoucherForm({
                            RoomTypeVoucherID: v.RoomTypeVoucherID,
                            RoomTypeID: v.RoomTypeID,
                            Title: v.Title,
                            Code: v.Code,
                            DiscountPercent: v.DiscountPercent ?? "",
                            DiscountAmount: v.DiscountAmount ?? "",
                            FromDate: v.FromDate?.slice(0, 10),
                            ToDate: v.ToDate?.slice(0, 10) ?? "",
                            IsActive: v.IsActive,
                          })
                        }
                      >
                        Sửa
                      </button>

                      <button
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded"
                        onClick={() => removeVoucher(v.RoomTypeVoucherID)}
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* VOUCHER FORM */}
            <form onSubmit={submitVoucher} className="space-y-3 text-sm">
              <input
                type="text"
                placeholder="Tên voucher"
                className="w-full border rounded-lg px-3 py-2"
                value={voucherForm.Title}
                onChange={(e) =>
                  setVoucherForm((f) => ({ ...f, Title: e.target.value }))
                }
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="% giảm"
                  className="border rounded-lg px-3 py-2"
                  value={voucherForm.DiscountPercent}
                  onChange={(e) =>
                    setVoucherForm((f) => ({
                      ...f,
                      DiscountPercent: e.target.value,
                    }))
                  }
                />

                <input
                  type="number"
                  placeholder="Giảm tiền"
                  className="border rounded-lg px-3 py-2"
                  value={voucherForm.DiscountAmount}
                  onChange={(e) =>
                    setVoucherForm((f) => ({
                      ...f,
                      DiscountAmount: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2"
                  value={voucherForm.FromDate}
                  onChange={(e) =>
                    setVoucherForm((f) => ({ ...f, FromDate: e.target.value }))
                  }
                  required
                />

                <input
                  type="date"
                  className="border rounded-lg px-3 py-2"
                  value={voucherForm.ToDate}
                  onChange={(e) =>
                    setVoucherForm((f) => ({ ...f, ToDate: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={voucherForm.IsActive}
                  onChange={(e) =>
                    setVoucherForm((f) => ({
                      ...f,
                      IsActive: e.target.checked,
                    }))
                  }
                />
                <label>Đang áp dụng</label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Lưu voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL ROOMTYPE ======================== */}
      {rtModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-5 max-w-lg w-full">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">
                {rtEditing ? "Sửa loại phòng" : "Thêm loại phòng"}
              </h2>
              <button
                onClick={() => setRtModalOpen(false)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitRoomType} className="space-y-3 text-sm">
              <input
                type="text"
                placeholder="Tên loại phòng"
                className="w-full border rounded-lg px-3 py-2"
                value={rtForm.Name}
                onChange={(e) =>
                  setRtForm((f) => ({ ...f, Name: e.target.value }))
                }
                required
              />

              <textarea
                placeholder="Mô tả"
                className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
                value={rtForm.Description}
                onChange={(e) =>
                  setRtForm((f) => ({ ...f, Description: e.target.value }))
                }
              />

              <input
                type="number"
                min="1"
                placeholder="Sức chứa"
                className="w-full border rounded-lg px-3 py-2"
                value={rtForm.Capacity}
                onChange={(e) =>
                  setRtForm((f) => ({
                    ...f,
                    Capacity: Number(e.target.value),
                  }))
                }
              />

              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={rtForm.IsActive}
                  onChange={(e) =>
                    setRtForm((f) => ({
                      ...f,
                      IsActive: e.target.checked,
                    }))
                  }
                />
                <label>Đang bán</label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  type="submit"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
