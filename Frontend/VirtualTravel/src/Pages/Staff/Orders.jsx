// src/Pages/Staff/Orders.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getBookingsPaged, confirmBooking, cancelBooking } from "../../services/staffOrdersApi";
import StaffBell from "./StaffBell";

/* ================== Helpers ================== */
function Money({ value }) {
  const v = Number(value || 0);
  return (
    <span className="font-semibold text-blue-700">
      {v.toLocaleString("vi-VN")} đ
    </span>
  );
}
function nightsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1);
  const b = new Date(d2);
  // so sánh theo ngày (tránh lệch múi giờ)
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  const diff = Math.ceil((b - a) / 86400000);
  return Math.max(0, diff);
}
function isSameDate(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.03, ease: "easeOut" },
  }),
};

const StatusPill = ({ s }) => {
  const cls =
    s === "Completed"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : s === "Pending"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : s === "Cancelled"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${cls}`}>
      {s || "-"}
    </span>
  );
};

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconX = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconFilter = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
  </svg>
);

/* --- Tiny toast --- */
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

/* ================== Component ================== */
export default function Orders() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("Pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [kw, setKw] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rowBusy, setRowBusy] = useState({ id: null, action: null }); // {id, action: 'confirm'|'cancel'}
  const [toast, setToast] = useState({ show: false, tone: "info", message: "" });

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getBookingsPaged({
        page: p,
        pageSize,
        status,
        keyword: kw,
        type: typeFilter,
        startDate,
        endDate,
      });

      // ổn định sort
      const sorted = (res.items || []).slice().sort((a, b) => {
        const ta = new Date(a?.BookingDate || 0).getTime() || 0;
        const tb = new Date(b?.BookingDate || 0).getTime() || 0;
        if (tb !== ta) return tb - ta;
        return (b?.BookingID || 0) - (a?.BookingID || 0);
      });

      setItems(sorted);
      setTotal(res.total || 0);
      setPage(res.page || p);
    } catch (e) {
      console.error(e);
      setToast({ show: true, tone: "error", message: "Tải danh sách đơn thất bại." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, typeFilter]);

  const onSearch = (e) => {
    e?.preventDefault?.();
    load(1);
  };

  const onConfirm = async (id, row) => {
    if (!confirm("Xác nhận hoàn tất đơn này? Sau khi xác nhận sẽ trừ tồn theo từng đêm (day-use giữ 1 đêm).")) return;
    setRowBusy({ id, action: "confirm" });
    try {
      await confirmBooking(id);
      // thông điệp khớp BE
      const isDayUse = isSameDate(row?.CheckInDate, row?.CheckOutDate);
      const nights = Math.max(1, nightsBetween(row?.CheckInDate, row?.CheckOutDate));
      setToast({
        show: true,
        tone: "success",
        message:
          `Đã xác nhận đơn #${id}. ` +
          (isDayUse
            ? "Đặt theo giờ: giữ 1 đêm (ngày check-in). "
            : `Giữ ${nights} đêm theo khoảng ngày. `) +
          "Hủy sau này: chỉ hoàn các đêm chưa ở, có thể phạt 1 đêm theo chính sách.",
      });
      await load(page);
    } catch (e) {
      console.error(e);
      setToast({ show: true, tone: "error", message: e?.message || "Xác nhận thất bại." });
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const onCancel = async (id) => {
    if (!confirm("Hủy đơn này? BE sẽ tự động: giữ nguyên các đêm đã qua (Consumed), trả tồn các đêm tương lai và có thể phạt 1 đêm theo policy.")) return;
    setRowBusy({ id, action: "cancel" });
    try {
      await cancelBooking(id);
      setToast({
        show: true,
        tone: "info",
        message: `Đã hủy đơn #${id}. Các đêm tương lai đã được trả tồn; có thể áp dụng phạt 1 đêm theo chính sách.`,
      });
      await load(page);
    } catch (e) {
      console.error(e);
      setToast({ show: true, tone: "error", message: e?.message || "Hủy đơn thất bại." });
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const isRowBusy = (id, action) => rowBusy.id === id && rowBusy.action === action;

  /* ================== Render ================== */
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">
      <Toast show={toast.show} tone={toast.tone} message={toast.message} onClose={() => setToast({ show: false })} />

      {/* ====== Heading ====== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              Quản lý Đơn hàng
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi & xác nhận đơn từ khách. Sau khi xác nhận, hệ thống trừ tồn theo từng đêm (day-use giữ 1 đêm).
          </p>
        </div>
        <div className="shrink-0">
          <StaffBell />
        </div>
      </motion.div>

      {/* ====== Filter Card ====== */}
      <motion.form
        onSubmit={onSearch}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-6 rounded-2xl bg-white/90 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg overflow-hidden"
      >
        {/* Filter header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-amber-50/60 to-sky-50/60">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200">
            <IconFilter className="w-4.5 h-4.5 text-gray-700" />
          </span>
          <div className="font-semibold text-gray-800">Bộ lọc</div>
          <div className="ml-auto text-xs text-gray-500">
            Tổng: <span className="font-semibold text-gray-700">{total}</span>
          </div>
        </div>

        {/* Filter body */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            placeholder="🔎 Tìm tên KH, SĐT, tour/hotel…"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            className="md:col-span-2 rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Tất cả loại</option>
            <option value="Tour">Tour</option>
            <option value="Hotel">Hotel</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500"
          />

          <button
            type="submit"
            className="md:col-span-6 mt-1 rounded-xl px-6 py-2.5 font-medium text-white bg-gradient-to-r from-indigo-600 to-sky-600 hover:opacity-95 shadow-md"
          >
            Lọc
          </button>
        </div>
      </motion.form>

      {/* ====== Table ====== */}
      <div className="mt-8 rounded-2xl bg-white ring-1 ring-gray-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13.5px]">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-gray-700">
              <tr>
                {[
                  "#",
                  "Type",
                  "Name",
                  "Customer",
                  "Phone",
                  "Booking Date",
                  "Stay",            // ⬅️ đổi label: hiển thị CI/CO + nights + day-use
                  "Guests",
                  "Total (đã tính tất cả)",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h} className="text-left px-3 py-3 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Skeleton rows
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-3 w-6 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-12 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-40 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-28 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-40 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-10 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-6 w-20 bg-gray-200 rounded-full" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-8 w-28 ml-auto bg-gray-200 rounded-xl" /></td>
                  </tr>
                ))
              ) : items?.length ? (
                items.map((b, idx) => {
                  const nights = Math.max(1, nightsBetween(b.CheckInDate, b.CheckOutDate));
                  const dayUse = isSameDate(b.CheckInDate, b.CheckOutDate);
                  return (
                    <motion.tr
                      key={b.BookingID ?? idx}
                      variants={rowVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.2 }}
                      custom={idx}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{b.Type}</td>
                      <td className="px-3 py-3 font-medium text-gray-900 min-w-[220px]">
                        {b.Name}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{b.FullName}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{b.Phone}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>
                            {b.CheckInDate ? new Date(b.CheckInDate).toLocaleDateString("vi-VN") : "-"} / {b.CheckOutDate ? new Date(b.CheckOutDate).toLocaleDateString("vi-VN") : "-"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full ring-1 ring-gray-200 text-gray-600 bg-gray-50">
                            {dayUse ? "Day-use: 1 đêm" : `${nights} đêm`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {b.NumberOfGuests ?? "-"}
                      </td>

                      {/* ✅ Hiển thị TotalPrice cuối cùng */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Money value={b.TotalPrice} />
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusPill s={b.Status} />
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {b.Status === "Pending" && (
                            <button
                              onClick={() => onConfirm(b.BookingID, b)}
                              disabled={isRowBusy(b.BookingID, "confirm")}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[13px] font-medium disabled:opacity-60"
                            >
                              {isRowBusy(b.BookingID, "confirm")
                                ? <span className="animate-spin inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                                : <IconCheck className="w-4 h-4" />
                              }
                              Xác nhận
                            </button>
                          )}
                          {b.Status !== "Cancelled" && (
                            <button
                              onClick={() => onCancel(b.BookingID)}
                              disabled={isRowBusy(b.BookingID, "cancel")}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] font-medium disabled:opacity-60"
                            >
                              {isRowBusy(b.BookingID, "cancel")
                                ? <span className="animate-spin inline-block w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full" />
                                : <IconX className="w-4 h-4" />
                              }
                              Hủy
                            </button>
                          )}
                        </div>
                        {/* Gợi ý chính sách ngay dưới action */}
                        <div className="mt-1 text-[11px] text-gray-500">
                          Sau khi xác nhận: trừ tồn theo từng đêm. Hủy sau đó chỉ hoàn đêm chưa ở; có thể phạt 1 đêm.
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-10 text-center text-gray-500" colSpan={11}>
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== Pagination ====== */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <div>
          Tổng: {total} • Trang {page}/{pages}
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 disabled:opacity-50 hover:bg-amber-50"
          >
            ← Trước
          </button>
          <button
            disabled={page >= pages}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 disabled:opacity-50 hover:bg-amber-50"
          >
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}
