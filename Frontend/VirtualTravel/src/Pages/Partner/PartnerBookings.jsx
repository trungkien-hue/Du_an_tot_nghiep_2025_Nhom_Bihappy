import { useEffect, useState } from "react";
import partnerApi from "../../services/partnerApi";

const TRASH_KEY = "partnerBookings.trash";
const TRASHED_IDS_KEY = "partnerBookings.trashedIds";

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

function Toast({ show, tone = "info", message, onClose }) {
  if (!show) return null;

  const toneClass =
    tone === "success"
      ? "bg-green-100 text-green-800 border-green-300"
      : tone === "error"
      ? "bg-red-100 text-red-800 border-red-300"
      : "bg-blue-100 text-blue-800 border-blue-300";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`border px-4 py-3 rounded-lg shadow-sm flex items-center gap-3 ${toneClass}`}
      >
        <div className="flex-1 text-sm">{message}</div>
        <button
          onClick={onClose}
          className="text-xs px-2 py-1 rounded bg-white/40 hover:bg-white/70"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

export default function PartnerBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [rowBusy, setRowBusy] = useState({ id: null, action: null });

  const [toast, setToast] = useState({
    show: false,
    tone: "info",
    message: "",
  });

  const [trash, setTrash] = useState(() => readLS(TRASH_KEY, []));
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashedIds, setTrashedIds] = useState(() => {
    const arr = readLS(TRASHED_IDS_KEY, []);
    return new Set(arr.map(String));
  });

  // Tìm kiếm + lọc trạng thái
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => writeLS(TRASH_KEY, trash), [trash]);
  useEffect(
    () => writeLS(TRASHED_IDS_KEY, Array.from(trashedIds)),
    [trashedIds]
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await partnerApi.getBookings({ take: 100 });
      const data = Array.isArray(res) ? res : res?.items || [];

      const mapped = data.map((b) => ({
        id: b.bookingID ?? b.BookingID,
        fullName: b.fullName ?? b.FullName,
        phone: b.phone ?? b.Phone,
        status: b.status ?? b.Status,
        checkIn: b.checkInDate ?? b.CheckInDate,
        checkOut: b.checkOutDate ?? b.CheckOutDate,
        quantity: b.quantity ?? b.Quantity,
        total: b.totalPrice ?? b.TotalPrice,
        roomTypeID: b.roomTypeID ?? b.RoomTypeID,
        roomTypeName: b.roomTypeName ?? b.RoomTypeName,
        hotelName: b.hotelName ?? b.HotelName,
        location: b.location ?? b.Location,
      }));

      setRows(mapped.filter((x) => !trashedIds.has(String(x.id))));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto refresh 5 phút
  useEffect(() => {
    const interval = setInterval(() => load(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const confirmDialog = (msg) => window.confirm(msg);

  const confirm = async (row) => {
    const id = row.id;
    if (
      !confirmDialog(
        `Xác nhận đơn #${id}?\n\n- Tồn kho sẽ được trừ cho từng đêm.\n- Nếu hủy sau này: chỉ hoàn các đêm tương lai; có thể áp dụng phạt 1 đêm.`
      )
    )
      return;

    setRowBusy({ id, action: "confirm" });
    try {
      await partnerApi.confirmBooking(id);
      setToast({
        show: true,
        tone: "success",
        message: `Đã xác nhận đơn #${id}. Tồn kho từng đêm được trừ.`,
      });
      await load();
    } catch (e) {
      console.error(e);
      setToast({
        show: true,
        tone: "error",
        message: e?.message || "Xác nhận thất bại.",
      });
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const reject = async (id) => {
    const reason = window.prompt("Lý do từ chối?");
    if (!window.confirm("Từ chối đơn này?")) return;

    setRowBusy({ id, action: "reject" });
    try {
      await partnerApi.rejectBooking(id, reason);
      setToast({
        show: true,
        tone: "info",
        message: `Đã từ chối đơn #${id}.`,
      });
      await load();
    } catch (e) {
      console.error(e);
      setToast({
        show: true,
        tone: "error",
        message: e?.message || "Từ chối thất bại.",
      });
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  // Soft delete
  const _softDelete = (id) => {
    const item = rows.find((r) => r.id === id);
    if (!item) return;

    setRows((prev) => prev.filter((r) => r.id !== id));
    setTrash((t) => [{ ...item, _deletedAt: new Date().toISOString() }, ...t]);
    setTrashedIds((s) => new Set(s).add(String(id)));
  };

  const restoreFromTrash = (id) => {
    const item = trash.find((t) => t.id === id);
    if (!item) return;

    setRows((prev) => [item, ...prev]);
    setTrash((t) => t.filter((x) => x.id !== id));
    setTrashedIds((s) => {
      const next = new Set(s);
      next.delete(String(id));
      return next;
    });
  };

  const deleteForever = (id) => {
    setTrash((t) => t.filter((x) => x.id !== id));
    setTrashedIds((s) => new Set(s).add(String(id)));
  };

  const emptyTrash = () => setTrash([]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Canceled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "Rejected":
        return "bg-red-100 text-red-700 border-red-300";
      case "Completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "Modified":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Pending":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "New":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const nightsBetween = (d1, d2) => {
    if (!d1 || !d2) return 0;
    const a = new Date(d1),
      b = new Date(d2);
    a.setHours(12, 0, 0, 0);
    b.setHours(12, 0, 0, 0);
    return Math.max(0, Math.ceil((b - a) / 86400000));
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      !normalizedSearch ||
      String(r.id).toLowerCase().includes(normalizedSearch) ||
      (r.fullName || "").toLowerCase().includes(normalizedSearch) ||
      (r.phone || "").toLowerCase().includes(normalizedSearch) ||
      (r.hotelName || "").toLowerCase().includes(normalizedSearch) ||
      (r.location || "").toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter === "ALL" ? true : r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* ================================
     GIAO DIỆN TRASH
  ================================= */
  if (trashOpen) {
    return (
      <div className="space-y-4">
        <Toast
          show={toast.show}
          tone={toast.tone}
          message={toast.message}
          onClose={() => setToast({ show: false })}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            🗑️ Thùng rác
          </h1>

          <div className="flex gap-2">
            {trash.length > 0 && (
              <button
                onClick={emptyTrash}
                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
              >
                Dọn thùng rác
              </button>
            )}
            <button
              onClick={() => setTrashOpen(false)}
              className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
            >
              ⬅ Quay lại danh sách
            </button>
          </div>
        </div>

        {trash.length === 0 ? (
          <div className="text-sm text-gray-500">Thùng rác trống.</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto rounded-xl border">
            <table className="min-w-[900px] w-full">
              <thead className="bg-gray-50 text-sm sticky top-0 z-10 shadow">
                <tr>
                  <th className="p-3 text-center">Mã</th>
                  <th className="p-3 text-center">Khách</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center">Xóa lúc</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {trash.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-center">{r.id}</td>
                    <td className="p-3 text-center">{r.fullName}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {r._deletedAt
                        ? new Date(r._deletedAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => restoreFromTrash(r.id)}
                          className="px-2 py-1 text-xs rounded-lg border hover:bg-gray-50"
                        >
                          Khôi phục
                        </button>
                        <button
                          onClick={() => deleteForever(r.id)}
                          className="px-2 py-1 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Xóa vĩnh viễn
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
    );
  }

  /* ================================================
      GIAO DIỆN DANH SÁCH ĐƠN — CÓ SCROLL
  ================================================= */
  return (
    <div className="space-y-4">
      <Toast
        show={toast.show}
        tone={toast.tone}
        message={toast.message}
        onClose={() => setToast({ show: false })}
      />

      {/* Header + Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Đơn đặt</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tìm kiếm */}
          <div className="flex items-center border rounded-lg px-2 py-1 bg-white">
            <span className="text-gray-400 mr-1">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã, tên, SĐT, khách sạn..."
              className="text-sm outline-none bg-transparent"
            />
          </div>

          {/* Lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1 bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="New">Mới</option>
            <option value="Pending">Chờ xử lý</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="Completed">Hoàn tất</option>
            <option value="Rejected">Từ chối</option>
            <option value="Canceled">Khách hủy</option>
            <option value="Modified">Đã chỉnh sửa</option>
          </select>

          {/* Thùng rác */}
          <button
            onClick={() => setTrashOpen(true)}
            className="flex items-center gap-1 text-sm border rounded-lg px-2 py-1 bg-white hover:bg-gray-50"
          >
            🗑️ <span>Thùng rác ({trash.length})</span>
          </button>
        </div>
      </div>

      {/* Bảng có scroll */}
      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            Đang tải dữ liệu...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            Không có đơn nào.
          </div>
        ) : (
          <div className="max-h-[80vh] overflow-auto rounded-lg border">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-gray-50 text-sm sticky top-0 z-10 shadow">
                <tr>
                  <th className="p-3 text-center">Mã</th>
                  <th className="p-3 text-center">Khách</th>
                  <th className="p-3 text-center">Liên hệ</th>
                  <th className="p-3 text-center">Lưu trú</th>
                  <th className="p-3 text-center">Loại phòng</th>
                  <th className="p-3 text-center">SL</th>
                  <th className="p-3 text-center">Tổng tiền</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center w-[150px]">Thao tác</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {filteredRows.map((r) => {
                  const nights = nightsBetween(r.checkIn, r.checkOut);

                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 text-center">{r.id}</td>

                      <td className="p-3 text-center">
                        <div className="font-medium">{r.fullName || "-"}</div>
                        <div className="text-xs text-gray-500">{r.hotelName}</div>
                      </td>

                      <td className="p-3 text-center">{r.phone || "-"}</td>

                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div>
                            {r.checkIn
                              ? new Date(r.checkIn).toLocaleDateString()
                              : "-"}{" "}
                            →{" "}
                            {r.checkOut
                              ? new Date(r.checkOut).toLocaleDateString()
                              : "-"}
                          </div>
                          {nights > 0 && (
                            <div className="text-xs text-gray-500">
                              {nights} đêm
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div>{r.roomTypeName || "-"}</div>
                          {r.location && (
                            <div className="text-xs text-gray-500">
                              {r.location}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">{r.quantity || 0}</td>

                      <td className="p-3 text-center">
                        {typeof r.total === "number"
                          ? r.total.toLocaleString("vi-VN") + " ₫"
                          : "-"}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(
                            r.status
                          )}`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {/* Pending / New → Xác nhận + Từ chối */}
                        {(r.status === "Pending" || r.status === "New") && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => confirm(r)}
                              disabled={
                                rowBusy.id === r.id &&
                                rowBusy.action === "confirm"
                              }
                              className="px-2 py-0.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                            >
                              {rowBusy.id === r.id &&
                              rowBusy.action === "confirm"
                                ? "Đang..."
                                : "Xác nhận"}
                            </button>

                            <button
                              onClick={() => reject(r.id)}
                              disabled={
                                rowBusy.id === r.id &&
                                rowBusy.action === "reject"
                              }
                              className="px-2 py-0.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {rowBusy.id === r.id &&
                              rowBusy.action === "reject"
                                ? "Đang..."
                                : "Từ chối"}
                            </button>
                          </div>
                        )}

                        {/* Confirmed → Hoàn tất */}
                        {r.status === "Confirmed" && (
                          <div className="flex items-center justify-center">
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Đánh dấu đơn #${r.id} là hoàn tất?`
                                  )
                                )
                                  return;

                                setRowBusy({ id: r.id, action: "complete" });

                                try {
                                  await partnerApi.completeBooking(r.id);
                                  setToast({
                                    show: true,
                                    tone: "success",
                                    message: `Đơn #${r.id} đã Completed.`,
                                  });
                                  await load();
                                } catch (err) {
                                  console.error(err);
                                  setToast({
                                    show: true,
                                    tone: "error",
                                    message:
                                      err?.message || "Hoàn tất thất bại.",
                                  });
                                } finally {
                                  setRowBusy({ id: null, action: null });
                                }
                              }}
                              disabled={
                                rowBusy.id === r.id &&
                                rowBusy.action === "complete"
                              }
                              className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {rowBusy.id === r.id &&
                              rowBusy.action === "complete"
                                ? "Đang..."
                                : "Hoàn tất"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
