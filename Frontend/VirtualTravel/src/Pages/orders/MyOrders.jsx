import { useEffect, useState } from "react";
import myBookingsApi from "../../services/myBookingsApi";

/* ======================== Helpers ======================== */
const Pill = ({ children, className = "" }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const StatusPill = ({ status }) => {
  const map = {
    Pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    Confirmed: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
    Completed: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    Canceled: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
  };
  return (
    <Pill className={map[status] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200"}>
      {status}
    </Pill>
  );
};

const currency = (n) => (n == null ? "-" : Number(n).toLocaleString("vi-VN"));

/* ===================== Centered Notice ===================== */
const CenterNotice = ({ text, type = "info", onClose }) => {
  if (!text) return null;
  const scheme = {
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    error: "bg-rose-50 text-rose-800 ring-rose-200",
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pointer-events-none">
      <div className="mt-10 pointer-events-auto px-4 w/full max-w-xl">
        <div className={`mx-auto rounded-2xl px-5 py-3 text-center shadow-lg ring-1 ${scheme}`}>
          <div className="font-semibold">{text}</div>
          <button
            onClick={onClose}
            className="mt-2 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm bg-white/70 hover:bg-white transition"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============ Confirm Dialog (ẩn khỏi danh sách) ============ */
const ConfirmDialog = ({ open, title, message, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 text-center">{title}</h3>
        <p className="mt-2 text-gray-600 text-center">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-gray-800 text-white font-semibold hover:opacity-90 transition"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============ NEW: Modal cập nhật đơn ============ */
const UpdateModal = ({ open, booking, onClose, onSaved, showNotice }) => {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(booking?.NumberOfGuests ?? 0);
  const [quantity, setQuantity] = useState(booking?.Quantity ?? 1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setCheckIn(booking.CheckInDate ? booking.CheckInDate.substring(0, 10) : "");
    setCheckOut(booking.CheckOutDate ? booking.CheckOutDate.substring(0, 10) : "");
    setGuests(booking.NumberOfGuests ?? 0);
    setQuantity(booking.Quantity ?? 1);
  }, [booking]);

  if (!open || !booking) return null;

  const canSave =
    (checkIn && checkOut && new Date(checkOut) >= new Date(checkIn)) &&
    quantity >= 1 && guests >= 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await myBookingsApi.update(booking.BookingID, {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: guests,
        quantity: quantity,
      });
      showNotice?.("Cập nhật đơn thành công. Nhân viên sẽ được thông báo.", "success");
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      showNotice?.("Cập nhật không thành công!", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Chỉnh sửa đơn #{booking.BookingID}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Ngày nhận</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Ngày trả</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Khách</label>
              <input
                type="number"
                min={0}
                value={guests}
                onChange={(e) => setGuests(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-gray-300 p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Số lượng</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-gray-300 p-2"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold shadow hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ======================== Component ======================== */
export default function MyOrders() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  // NEW: Update modal state
  const [editTarget, setEditTarget] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Notice (thông báo giữa màn hình)
  const [notice, setNotice] = useState({ text: "", type: "info" });
  const showNotice = (text, type = "info", autoCloseMs = 2200) => {
    setNotice({ text, type });
    if (autoCloseMs) {
      setTimeout(() => setNotice({ text: "", type }), autoCloseMs);
    }
  };

  // Confirm xóa (ẩn khỏi danh sách)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  // Modal hủy tour
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await myBookingsApi.list({ page: 1, pageSize: 20 });
      setItems(res.items || []);
      setTotal(res.total || 0);
      if ((res.items || []).length > 0) setUserName(res.items[0].UserFullName || "");
    } catch (e) {
      console.error(e);
      showNotice("Không tải được đơn hàng!", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Mở dialog xác nhận xóa (khỏi trang cá nhân)
  const deleteOrder = async (id) => {
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ open: false, id: null });
    try {
      await myBookingsApi.remove(id);
      await load();
      showNotice("Đã ẩn đơn khỏi danh sách của bạn.", "success");
    } catch (e) {
      console.error(e);
      showNotice("Không thể ẩn đơn này!", "error");
    }
  };

  const openCancelModal = (b) => {
    if (b.BookingType === "Tour") {
      setCancelTarget(b);
      setShowCancelModal(true);
      setCancelReason("");
      setCustomReason("");
    } else {
      setShowCancelModal(true);
      setCancelTarget(b);
      setCancelReason("");
      setCustomReason("");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const reason =
      cancelReason === "other" ? customReason.trim() : cancelReason || "Không cung cấp";
    try {
      await myBookingsApi.cancel(cancelTarget.BookingID, { reason });
      setShowCancelModal(false);
      setCancelTarget(null);
      setCancelReason("");
      setCustomReason("");
      showNotice("Đã gửi yêu cầu hủy. Nhân viên sẽ được thông báo.", "success");
      await load();
    } catch (e) {
      console.error(e);
      showNotice("Hủy đơn thất bại!", "error");
    }
  };

  const handleCancelModalClose = () => {
    setShowCancelModal(false);
    setCancelTarget(null);
    setCancelReason("");
    setCustomReason("");
  };

  const _formatPrice = (b) => {
    const base = currency(b.Price);
    if (b.BookingType === "Tour") return `${base} / người`;
    if (b.BookingType === "Hotel") return `${base} / đêm`;
    return base;
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-3 w-24 bg-gray-200/70 rounded" />
        </td>
      ))}
    </tr>
  );

  /* =================== Render =================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pt-28">
      <CenterNotice
        text={notice.text}
        type={notice.type}
        onClose={() => setNotice({ text: "", type: notice.type })}
      />

      <ConfirmDialog
        open={deleteModal.open && deleteModal.id != null}
        title="Xóa khỏi danh sách?"
        message="Thao tác này chỉ ẩn đơn khỏi trang cá nhân của bạn (không xóa khỏi hệ thống)."
        onCancel={() => setDeleteModal({ open: false, id: null })}
        onConfirm={confirmDelete}
      />

      <section className="mx-auto px-6 max-w-[1400px] xl:max-w-[1600px]">
        <div className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 shadow-lg p-8 md:p-10 mb-8 bg-[radial-gradient(1200px_400px_at_0%_0%,rgba(255,200,150,.25),transparent_60%)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                Đơn hàng của tôi
              </h1>
              <p className="text-gray-600 mt-2">
                Xin chào{" "}
                <span className="font-semibold text-gray-800">{userName || "—"}</span>. Bạn có{" "}
                <span className="font-semibold">{total}</span> đơn hàng.
              </p>
            </div>
            <button
              onClick={load}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-semibold shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Làm mới
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto px-6 pb-24 max-w-[1400px] xl:max-w-[1600px]">
        <div className="rounded-3xl overflow-hidden bg-white shadow-xl ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-700">
                  <th className="p-4 text-left">Mã</th>
                  <th className="p-4 text-left">Loại</th>
                  <th className="p-4 text-left">Tên tour</th>
                  <th className="p-4 text-left">Khách sạn</th>
                  <th className="p-4 text-left">Địa điểm</th>
                  <th className="p-4 text-left">Ngày</th>
                  <th className="p-4 text-left">Khách</th>
                  <th className="p-4 text-left">SL</th>
                  <th className="p-4 text-left">Giá</th>
                  <th className="p-4 text-left">Thành tiền</th>
                  <th className="p-4 text-left">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="[&>tr:hover]:bg-orange-50/60 transition-colors">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-gray-500">
                      Bạn chưa có đơn nào.
                    </td>
                  </tr>
                ) : (
                  items.map((b) => (
                    <tr key={b.BookingID} className="border-t border-gray-100">
                      <td className="p-4 font-semibold text-gray-800">#{b.BookingID}</td>
                      <td className="p-4">
                        <Pill
                          className={
                            b.BookingType === "Tour"
                              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                              : "bg-green-100 text-green-700 ring-1 ring-green-200"
                          }
                        >
                          {b.BookingType}
                        </Pill>
                      </td>
                      <td className="p-4">{b.TourName || "—"}</td>
                      <td className="p-4">{b.HotelName || "—"}</td>
                      <td className="p-4">{b.Location || "—"}</td>
                      <td className="p-4">
                        {b.CheckInDate
                          ? `${new Date(b.CheckInDate).toLocaleDateString()} → ${
                              b.CheckOutDate ? new Date(b.CheckOutDate).toLocaleDateString() : ""
                            }`
                          : "—"}
                      </td>
                      <td className="p-4">{b.NumberOfGuests ?? 0}</td>
                      <td className="p-4">{b.Quantity ?? 1}</td>
                      <td className="p-4">{currency(b.Price)}</td>
                      <td className="p-4">{currency(b.TotalPrice)}</td>
                      <td className="p-4">
                        <StatusPill status={b.Status} />
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {b.Status !== "Completed" && (
                          <>
                            {(b.Status === "Pending" || b.Status === "Confirmed") && (
                              <>
                                {/* NEW: nút chỉnh sửa */}
                                <button
                                  onClick={() => {
                                    setEditTarget(b);
                                    setShowEditModal(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium shadow hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                                >
                                  Chỉnh sửa
                                </button>

                                <button
                                  onClick={() => openCancelModal(b)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium shadow hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                                >
                                  Hủy đơn
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteOrder(b.BookingID)}
                              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* NEW: Modal chỉnh sửa */}
      <UpdateModal
        open={showEditModal}
        booking={editTarget}
        onClose={() => setShowEditModal(false)}
        onSaved={load}
        showNotice={showNotice}
      />

      {/* MODAL HỦY (tour/hotel) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Lý do bạn muốn hủy {cancelTarget?.BookingType?.toLowerCase()}?
            </h2>
            <div className="space-y-3">
              {[
                "Thay đổi kế hoạch",
                "Bận công việc",
                "Giá quá cao",
                "Tìm được lựa chọn khác tốt hơn",
              ].map((reason) => (
                <label
                  key={reason}
                  className="flex items-center space-x-2 cursor-pointer text-gray-700"
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="accent-rose-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <label className="flex items-start space-x-2 text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="cancelReason"
                  value="other"
                  checked={cancelReason === "other"}
                  onChange={() => setCancelReason("other")}
                  className="mt-1 accent-rose-600"
                />
                <textarea
                  rows={2}
                  placeholder="Nhập lý do khác..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={cancelReason !== "other"}
                  className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-400 disabled:bg-gray-100"
                />
              </label>
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleCancelModalClose}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason && !customReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold shadow hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
