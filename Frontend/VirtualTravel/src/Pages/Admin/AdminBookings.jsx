// src/Pages/Admin/AdminBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  getAdminBookings,
  getAdminBookingStats,
  updateAdminBookingStatus,
  deleteAdminBooking,
} from "../../services/adminBookingsApi";

// ===== Helpers =====
function Money({ value }) {
  const v = Number(value || 0);
  return (
    <span className="font-semibold text-emerald-700">
      {v.toLocaleString("vi-VN")} đ
    </span>
  );
}

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "Pending", label: "Pending" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "bg-slate-50 text-slate-700 ring-slate-200";
  if (s === "pending")
    cls = "bg-amber-50 text-amber-700 ring-amber-200";
  else if (s === "completed")
    cls = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  else if (s === "cancelled")
    cls = "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${cls}`}
    >
      {status || "-"}
    </span>
  );
}

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
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl ring-1 shadow-lg ${tones[tone]}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm whitespace-pre-line">{message}</span>
        <button
          onClick={onClose}
          className="text-xs underline underline-offset-2"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.02, ease: "easeOut" },
  }),
};

function StatCard({ title, value, valueComponent, tone = "slate", subText, loading }) {
  const toneMap = {
    slate: "from-slate-50 to-slate-100 text-slate-800",
    amber: "from-amber-50 to-amber-100 text-amber-800",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-800",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-800",
  };
  const cls = toneMap[tone] || toneMap.slate;

  return (
    <div className={`rounded-2xl px-4 py-3 shadow-sm ring-1 ring-gray-200 bg-gradient-to-br ${cls}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {title}
      </div>
      <div className="mt-2 text-2xl font-extrabold">
        {loading ? (
          <span className="inline-block w-16 h-6 rounded bg-white/60 animate-pulse" />
        ) : (
          valueComponent ?? value
        )}
      </div>
      {subText && (
        <div className="mt-1 text-[11px] text-gray-600">{subText}</div>
      )}
    </div>
  );
}

// ===== Page =====
export default function AdminBookings() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    revenue: 0,
  });

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [busyRow, setBusyRow] = useState({ id: null, action: null });

  const [toast, setToast] = useState({
    show: false,
    tone: "info",
    message: "",
  });

  const filteredCount = items.length;

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await getAdminBookingStats();
      setStats({
        total: res.total ?? res.Total ?? 0,
        pending: res.pending ?? res.Pending ?? 0,
        completed: res.completed ?? res.Completed ?? 0,
        revenue: res.revenue ?? res.Revenue ?? 0,
      });
    } catch (e) {
      console.error(e);
      setToast({
        show: true,
        tone: "error",
        message:
          "Không tải được thống kê.\n" +
          (e?.message || ""),
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAdminBookings({ status, search });
      setItems(res || []);
    } catch (e) {
      console.error(e);
      setToast({
        show: true,
        tone: "error",
        message:
          "Không tải được danh sách đơn hàng.\n" +
          (e?.message || ""),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    loadData();
  };

  const handleChangeStatus = async (bookingId, newStatus) => {
    if (!newStatus) return;
    setBusyRow({ id: bookingId, action: "status" });
    try {
      await updateAdminBookingStatus(bookingId, newStatus);
      setItems((prev) =>
        prev.map((b) =>
          (b.bookingID ?? b.BookingID) === bookingId
            ? { ...b, status: newStatus, Status: newStatus }
            : b
        )
      );
      setToast({
        show: true,
        tone: "success",
        message: `Đã cập nhật trạng thái đơn #${bookingId} thành "${newStatus}".`,
      });
      loadStats();
    } catch (e) {
      console.error(e);
      setToast({
        show: true,
        tone: "error",
        message: e?.message || "Cập nhật trạng thái thất bại.",
      });
    } finally {
      setBusyRow({ id: null, action: null });
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm("Xoá (ẩn) đơn hàng này khỏi hệ thống?")) return;
    setBusyRow({ id: bookingId, action: "delete" });
    try {
      await deleteAdminBooking(bookingId);
      setItems((prev) =>
        prev.filter((b) => (b.bookingID ?? b.BookingID) !== bookingId)
      );
      setToast({
        show: true,
        tone: "info",
        message: `Đã xoá đơn #${bookingId}.`,
      });
      loadStats();
    } catch (e) {
      console.error(e);
      setToast({
        show: true,
        tone: "error",
        message: e?.message || "Xoá đơn thất bại.",
      });
    } finally {
      setBusyRow({ id: null, action: null });
    }
  };

  const rows = useMemo(
    () =>
      (items || []).map((b, idx) => ({
        key: b.bookingID ?? b.BookingID ?? idx,
        bookingId: b.bookingID ?? b.BookingID,
        customerName: b.customerName ?? b.CustomerName,
        phone: b.phone ?? b.Phone,
        serviceName: b.serviceName ?? b.ServiceName,
        date: b.date ?? b.Date,
        price: b.price ?? b.Price,
        status: b.status ?? b.Status,
        isHourly: b.isHourly ?? b.IsHourly,
      })),
    [items]
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 font-sans">
      <Toast
        show={toast.show}
        tone={toast.tone}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-violet-600 to-sky-600 bg-clip-text text-transparent">
              Admin – Quản lý đơn hàng
            </span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-xl">
            Theo dõi tất cả đơn đặt phòng & tour trong hệ thống. Cho phép lọc,
            tìm kiếm, cập nhật trạng thái và ẩn đơn đã xử lý.
          </p>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <StatCard
          title="Tổng tất cả đơn"
          value={stats.total}
          loading={loadingStats}
          subText={`${filteredCount} đơn đang hiển thị`}
        />
        <StatCard
          title="Đơn Pending"
          value={stats.pending}
          tone="amber"
          loading={loadingStats}
        />
        <StatCard
          title="Đơn Completed"
          value={stats.completed}
          tone="emerald"
          loading={loadingStats}
        />
        <StatCard
          title="Doanh thu tháng này"
          valueComponent={<Money value={stats.revenue} />}
          tone="indigo"
          loading={loadingStats}
        />
      </motion.div>

      {/* Filter / search */}
      <motion.form
        onSubmit={handleSearchSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="mt-8 rounded-2xl bg-white/90 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-slate-50 via-sky-50 to-slate-50">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200">
            <span className="w-4 h-4 border border-gray-500 border-t-transparent rounded-full animate-spin-slow" />
          </span>
          <div className="font-semibold text-gray-800">Bộ lọc &amp; tìm kiếm</div>
          <div className="ml-auto text-xs text-gray-500">
            Đang hiển thị:{" "}
            <span className="font-semibold text-gray-700">
              {filteredCount} đơn
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <input
            placeholder="🔎 Tìm tên KH, SĐT, mã đơn…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2 rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-violet-500"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                Trạng thái: {o.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="md:col-span-2 mt-1 md:mt-0 rounded-xl px-6 py-2.5 font-medium text-white bg-gradient-to-r from-violet-600 to-sky-600 hover:opacity-95 shadow-md"
          >
            Áp dụng
          </button>
        </div>
      </motion.form>

      {/* Table */}
      <div className="mt-8 rounded-2xl bg-white ring-1 ring-gray-200 shadow-xl overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-gray-700">
              <tr>
                {[
                  "#",
                  "Mã đơn",
                  "Khách hàng",
                  "Phone",
                  "Dịch vụ",
                  "Ngày",
                  "Giá trị",
                  "Loại",
                  "Trạng thái",
                  "Hành động",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-3 font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length ? (
                rows.map((row, idx) => (
                  <motion.tr
                    key={row.key}
                    variants={rowVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                    custom={idx}
                    className="hover:bg-amber-50/40 transition-colors"
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      #{row.bookingId}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.customerName || "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.phone || "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap min-w-[200px]">
                      {row.serviceName || "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.date
                        ? new Date(row.date).toLocaleDateString("vi-VN")
                        : "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Money value={row.price} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.isHourly ? "Theo giờ" : "Theo đêm"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <select
                          value={row.status || ""}
                          onChange={(e) =>
                            handleChangeStatus(row.bookingId, e.target.value)
                          }
                          disabled={busyRow.id === row.bookingId && busyRow.action === "status"}
                          className="rounded-xl border border-gray-200 bg-white/90 px-2 py-1 text-xs focus:ring-2 focus:ring-violet-500"
                        >
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label || "Tất cả"}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDelete(row.bookingId)}
                          disabled={busyRow.id === row.bookingId && busyRow.action === "delete"}
                          className="text-xs px-3 py-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Xoá
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-3 py-10 text-center text-gray-500"
                    colSpan={10}
                  >
                    Không có đơn nào phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
