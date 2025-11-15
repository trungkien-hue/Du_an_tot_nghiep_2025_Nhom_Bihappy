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
  } catch (e) { e }
};

/* Tiny Toast */
function Toast({ show, tone = "info", message, onClose }) {
  if (!show) return null;
  const tones = {
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    error: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl ring-1 shadow ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="text-xs underline">Đóng</button>
      </div>
    </div>
  );
}

export default function PartnerBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rowBusy, setRowBusy] = useState({ id: null, action: null });
  const [toast, setToast] = useState({ show: false, tone: "info", message: "" });

  const [trash, setTrash] = useState(() => readLS(TRASH_KEY, []));
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashedIds, setTrashedIds] = useState(() => {
    const arr = readLS(TRASHED_IDS_KEY, []);
    return new Set(arr.map(String));
  });

  useEffect(() => writeLS(TRASH_KEY, trash), [trash]);
  useEffect(() => writeLS(TRASHED_IDS_KEY, Array.from(trashedIds)), [trashedIds]);

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
        hotelName: b.hotelName ?? b.HotelName,
        location: b.location ?? b.Location,
      }));
      setRows(mapped.filter((x) => !trashedIds.has(String(x.id))));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const confirm = async (row) => {
    const id = row.id;
    if (!confirmDialog("Xác nhận đơn này? Hệ thống sẽ trừ tồn theo từng đêm (day-use giữ 1 đêm).")) return;
    setRowBusy({ id, action: "confirm" });
    try {
      await partnerApi.confirmBooking(id);
      setToast({
        show: true,
        tone: "success",
        message:
          `Đã xác nhận đơn #${id}. Tồn kho từng đêm đã được trừ. Hủy sau này: chỉ hoàn đêm tương lai; có thể phạt 1 đêm.`,
      });
      await load();
    } catch (e) {
      console.error(e);
      setToast({ show: true, tone: "error", message: e?.message || "Xác nhận thất bại." });
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const reject = async (id) => {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") || "";
    if (!confirmDialog("Từ chối đơn này? Các đêm tương lai sẽ được trả tồn; có thể áp dụng phạt 1 đêm theo policy.")) return;
    setRowBusy({ id, action: "reject" });
    try {
      await partnerApi.rejectBooking(id, reason);
      setToast({
        show: true,
        tone: "info",
        message: `Đã từ chối đơn #${id}. Các đêm tương lai đã trả tồn; có thể phạt 1 đêm theo policy.`,
      });
      await load();
    } catch (e) {
      console.error(e);
      setToast({ show: true, tone: "error", message: e?.message || "Từ chối thất bại." });
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const confirmDialog = (msg) => window.confirm(msg);

  const softDelete = (id) => {
    const item = rows.find((r) => r.id === id);
    if (!item) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTrash((t) => [{ ...item, _deletedAt: new Date().toISOString() }, ...t]);
    setTrashedIds((s) => new Set(s).add(String(id)));
  };

  const restoreFromTrash = (id) => {
    const item = trash.find((t) => t.id === id);
    if (!item) return;
    setRows((r) => [item, ...r]);
    setTrash((t) => t.filter((x) => x.id !== id));
    setTrashedIds((s) => {
      const clone = new Set(s);
      clone.delete(String(id));
      return clone;
    });
  };

  const deleteForever = (id) => {
    setTrash((t) => t.filter((x) => x.id !== id));
    setTrashedIds((s) => new Set(s).add(String(id)));
  };

  const emptyTrash = () => setTrash([]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed": return "bg-blue-100 text-blue-700 border-blue-300";
      case "Canceled": return "bg-gray-100 text-gray-700 border-gray-300";
      case "Rejected": return "bg-red-100 text-red-700 border-red-300";
      case "Completed": return "bg-green-100 text-green-700 border-green-300";
      case "Modified": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Pending":  return "bg-orange-100 text-orange-700 border-orange-300";
      case "New":      return "bg-purple-100 text-purple-700 border-purple-300";
      default:         return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const isLockedStatus = (status) => ["Confirmed", "Completed"].includes(status);
  const isSameDate = (d1, d2) => {
    if (!d1 || !d2) return false;
    const a = new Date(d1), b = new Date(d2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };
  const nightsBetween = (d1, d2) => {
    if (!d1 || !d2) return 0;
    const a = new Date(d1), b = new Date(d2);
    a.setHours(12, 0, 0, 0); b.setHours(12, 0, 0, 0);
    return Math.max(0, Math.ceil((b - a) / 86400000));
  };

  /* ==========================================
     GIAO DIỆN CHÍNH
  ========================================== */
  if (trashOpen) {
    return (
      <div className="space-y-4">
        <Toast show={toast.show} tone={toast.tone} message={toast.message} onClose={() => setToast({ show: false })} />
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
              className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1"
            >
              ⬅ Quay lại danh sách
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          {trash.length === 0 ? (
            <div className="p-6 text-gray-500 text-center">Thùng rác trống.</div>
          ) : (
            <table className="min-w-[900px] w-full">
              <thead className="bg-gray-50 text-left text-sm">
                <tr>
                  <th className="p-3">Mã</th>
                  <th className="p-3">Khách</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Xóa lúc</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {trash.map((t) => (
                  <tr key={`trash-${t.id}`} className="border-t">
                    <td className="p-3">{t.id}</td>
                    <td className="p-3">
                      <div className="font-medium">{t.fullName || "-"}</div>
                      <div className="text-xs text-gray-500">{t.hotelName || ""}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(t._deletedAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => restoreFromTrash(t.id)}
                        className="px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Khôi phục
                      </button>
                      <button
                        onClick={() => deleteForever(t.id)}
                        className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                      >
                        Xóa vĩnh viễn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ==========================================
     GIAO DIỆN DANH SÁCH ĐƠN
  ========================================== */
  return (
    <div className="space-y-4">
      <Toast show={toast.show} tone={toast.tone} message={toast.message} onClose={() => setToast({ show: false })} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Đơn đặt</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            Tải lại
          </button>
          <button
            onClick={() => setTrashOpen(true)}
            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"
          >
            <span>🗑️ Thùng rác</span>
            {trash.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-900 text-white">
                {trash.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        {loading ? (
          <div className="p-4 text-gray-500">Đang tải...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-gray-500">Chưa có đơn đặt.</div>
        ) : (
          <table className="min-w-[1100px] w-full">
            <thead className="bg-gray-50 text-left text-sm">
              <tr>
                <th className="p-3">Mã</th>
                <th className="p-3">Khách</th>
                <th className="p-3">Liên hệ</th>
                <th className="p-3">Lưu trú</th>
                <th className="p-3">SL</th>
                <th className="p-3">Tổng tiền</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((r) => {
                const locked = isLockedStatus(r.status);
                const dayUse = isSameDate(r.checkIn, r.checkOut);
                const nights = Math.max(1, nightsBetween(r.checkIn, r.checkOut));
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.id}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.fullName || "-"}</div>
                      <div className="text-xs text-gray-500">{r.hotelName || ""}</div>
                    </td>
                    <td className="p-3">{r.phone || "-"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div>{r.checkIn ? new Date(r.checkIn).toLocaleDateString("vi-VN") : "-"}</div>
                          <div className="text-xs text-gray-500">
                            {r.checkOut ? new Date(r.checkOut).toLocaleDateString("vi-VN") : "-"}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full ring-1 ring-gray-200 text-gray-600 bg-gray-50">
                          {dayUse ? "Day-use: 1 đêm" : `${nights} đêm`}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">{r.quantity || 1}</td>
                    <td className="p-3">{(r.total || 0).toLocaleString("vi-VN")}₫</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 space-x-2">
                      {!locked && (
                        <>
                          {(r.status === "New" || r.status === "Pending") && (
                            <>
                              <button
                                onClick={() => confirm(r)}
                                disabled={rowBusy.id === r.id && rowBusy.action === "confirm"}
                                className="px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                              >
                                {rowBusy.id === r.id && rowBusy.action === "confirm"
                                  ? "Đang xác nhận..."
                                  : "Xác nhận"}
                              </button>
                              <button
                                onClick={() => reject(r.id)}
                                disabled={rowBusy.id === r.id && rowBusy.action === "reject"}
                                className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                {rowBusy.id === r.id && rowBusy.action === "reject"
                                  ? "Đang từ chối..."
                                  : "Từ chối"}
                              </button>
                            </>
                          )}
                          {(r.status === "Canceled" || r.status === "Rejected") && (
                            <button
                              onClick={() => softDelete(r.id)}
                              className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                            >
                              Xóa
                            </button>
                          )}
                        </>
                      )}
                      {/* hint chính sách */}
                      <div className="text-[11px] text-gray-500 mt-1">
                        Xác nhận: trừ tồn theo đêm. Hủy: trả đêm tương lai, có thể phạt 1 đêm.
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
