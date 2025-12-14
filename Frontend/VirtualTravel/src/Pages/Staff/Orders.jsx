// src/Pages/Staff/Orders.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  getBookingsPaged,
  confirmBooking,
  cancelBooking,
} from "../../services/staffOrdersApi";
import StaffBell from "./StaffBell";
import { getNotificationConnection } from "../../services/signalr"; // ⭐ RT UPDATE

/* ================== Helpers ================== */
function Money({ value }) {
  const v = Number(value || 0);
  return <span className="font-semibold text-blue-700">{v.toLocaleString("vi-VN")} đ</span>;
}

function nightsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1), b = new Date(d2);
  a.setHours(12,0,0,0); b.setHours(12,0,0,0);
  return Math.max(0, Math.ceil((b - a) / 86400000));
}

function isSameDate(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function getBookingType(b) {
  if (b?.TourID) return "Tour";
  if (b?.HotelName || b?.Hotel || b?.RoomType) return "Hotel";
  return "-";
}

function getBookingName(b) {
  if (b?.TourID) return b?.TourName || "Tour";
  if (b?.HotelName || b?.Hotel || b?.RoomType)
    return [b.HotelName || b.Hotel, b.RoomType].filter(Boolean).join(" – ");
  return "-";
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

  return <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${cls}`}>{s}</span>;
};

function Toast({ show, tone = "info", message, onClose }) {
  if (!show) return null;
  const tones = {
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    error: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl ring-1 shadow ${tones[tone]}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm">{message}</span>
        <button className="text-xs underline" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}

/* ================== Component ================== */
export default function Orders() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("Pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [kw, setKw] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rowBusy, setRowBusy] = useState({ id: null, action: null });
  const [toast, setToast] = useState({ show: false, tone: "info", message: "" });

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  /* ========================= LOAD LIST ========================= */
  const load = useCallback(async (p = 1) => {
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

      const sorted = (res.items || []).slice().sort((a, b) => {
        const ta = new Date(a?.BookingDate || 0).getTime();
        const tb = new Date(b?.BookingDate || 0).getTime();
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
  }, [status, typeFilter, kw, startDate, endDate]);

  /* ========================= REALTIME UPDATE ========================= */
  useEffect(() => {
    const conn = getNotificationConnection((payload) => {
      const t = payload?.Type || payload?.type;
      if (["BookingCreated", "BookingConfirmed", "BookingCancelled"].includes(t)) {
        console.log("🔄 Realtime update — reload list");
        load(1);
      }
    });

    conn.startSafely?.();

    return () => conn.stop?.();
  }, [load]);

  /* ========================= FILTER CHANGE ========================= */
  useEffect(() => {
    load(1);
  }, [status, typeFilter]);

  const onSearch = (e) => {
    e.preventDefault();
    load(1);
  };

  /* ========================= ACTIONS ========================= */
  const onConfirm = async (id, row) => {
    if (!confirm("Xác nhận hoàn tất đơn này?")) return;

    setRowBusy({ id, action: "confirm" });

    try {
      await confirmBooking(id);
      setToast({ show: true, tone: "success", message: `Đã xác nhận đơn #${id}` });
      load(page);
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const onCancel = async (id) => {
    if (!confirm("Bạn có chắc muốn hủy đơn này?")) return;

    setRowBusy({ id, action: "cancel" });

    try {
      await cancelBooking(id);
      setToast({ show: true, tone: "info", message: `Đã hủy đơn #${id}` });
      load(page);
    } finally {
      setRowBusy({ id: null, action: null });
    }
  };

  const isRowBusy = (id, action) => rowBusy.id === id && rowBusy.action === action;

  /* ========================= RENDER ========================= */
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 font-sans">

      <Toast
        show={toast.show}
        tone={toast.tone}
        message={toast.message}
        onClose={() => setToast({ show: false })}
      />

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              Quản lý Đơn hàng
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi & xử lý đơn đặt từ khách.
          </p>
        </div>
        <StaffBell />
      </motion.div>

      {/* Filters */}
      <motion.form
        onSubmit={onSearch}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-2xl bg-white shadow ring-1 ring-gray-200 overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-sky-50">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded bg-white ring-1 ring-gray-200">
            <svg width="18" height="18"><path d="M3 4h12M6 9h6m-3 5h0" stroke="#333" strokeWidth="2" /></svg>
          </span>
          <span className="font-semibold">Bộ lọc</span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="🔎 Tên khách / SĐT / Tour / Hotel..."
            className="md:col-span-2 border rounded px-3 py-2"
          />

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Tất cả</option>
            <option value="Tour">Tour</option>
            <option value="Hotel">Hotel</option>
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Tất cả</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="border rounded px-3 py-2" />
          <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="border rounded px-3 py-2" />

          <button className="md:col-span-6 bg-indigo-600 text-white rounded py-2 hover:bg-indigo-500">
            Lọc
          </button>
        </div>
      </motion.form>

      {/* TABLE */}
      <div className="mt-8 rounded-2xl bg-white shadow ring-1 ring-gray-200 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                {[
                  "#",
                  "Type",
                  "Name",
                  "Customer",
                  "Phone",
                  "Booking Date",
                  "Stay",
                  "Guests",
                  "Total",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse opacity-50">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-3 py-4">
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((b, idx) => {
                  const nights = Math.max(1, nightsBetween(b.CheckInDate, b.CheckOutDate));
                  const dayUse = isSameDate(b.CheckInDate, b.CheckOutDate);

                  return (
                    <motion.tr
                      key={b.BookingID}
                      variants={rowVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      custom={idx}
                      className="hover:bg-amber-50/40"
                    >
                      <td className="px-3 py-3">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-3 py-3">{getBookingType(b)}</td>
                      <td className="px-3 py-3 font-medium min-w-[240px]">{getBookingName(b)}</td>
                      <td className="px-3 py-3">{b.FullName}</td>
                      <td className="px-3 py-3">{b.Phone}</td>
                      <td className="px-3 py-3">
                        {b.BookingDate ? new Date(b.BookingDate).toLocaleDateString("vi-VN") : "-"}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span>
                            {new Date(b.CheckInDate).toLocaleDateString("vi-VN")} /{" "}
                            {new Date(b.CheckOutDate).toLocaleDateString("vi-VN")}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full ring-1 ring-gray-200 bg-gray-50">
                            {dayUse ? "1 đêm (Day-use)" : `${nights} đêm`}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {b.NumberOfGuests ? `${b.NumberOfGuests} khách` : `${b.Quantity} phòng`}
                      </td>

                      <td className="px-3 py-3"><Money value={b.TotalPrice} /></td>
                      <td className="px-3 py-3"><StatusPill s={b.Status} /></td>

                      <td className="px-3 py-3">
                        {b.Status === "Pending" && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => onConfirm(b.BookingID, b)}
                              disabled={isRowBusy(b.BookingID, "confirm")}
                              className="px-3 py-1 text-emerald-700 border border-emerald-300 rounded hover:bg-emerald-50"
                            >
                              Xác nhận
                            </button>
                            <button
                              onClick={() => onCancel(b.BookingID)}
                              disabled={isRowBusy(b.BookingID, "cancel")}
                              className="px-3 py-1 text-rose-700 border border-rose-300 rounded hover:bg-rose-50"
                            >
                              Hủy
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between text-sm">
        <div>
          Tổng: {total} • Trang {page}/{pages}
        </div>

        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50"
          >
            ← Trước
          </button>
          <button
            disabled={page >= pages}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}
