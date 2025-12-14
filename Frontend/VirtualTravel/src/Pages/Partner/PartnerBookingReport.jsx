import { useEffect, useMemo, useState } from "react";
import partnerApi from "../../services/partnerApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

// Màu cho các trạng thái trong biểu đồ tròn
const STATUS_COLORS = {
  New: "#7c3aed",
  Pending: "#f97316",
  Confirmed: "#3b82f6",
  Completed: "#22c55e",
  Rejected: "#ef4444",
  Canceled: "#6b7280",
  Modified: "#eab308",
  Other: "#9ca3af",
};

const MONTH_LABELS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

// Thứ tự hiển thị các trạng thái trong phần bảng
const STATUS_ORDER = [
  "New",
  "Pending",
  "Confirmed",
  "Completed",
  "Rejected",
  "Canceled",
  "Modified",
  "Other",
];

function normalizeBooking(raw) {
  const id = raw.bookingID ?? raw.BookingID;
  const status = raw.status ?? raw.Status;
  const checkInRaw = raw.checkInDate ?? raw.CheckInDate;
  const checkOutRaw = raw.checkOutDate ?? raw.CheckOutDate;

  const checkIn = checkInRaw ? new Date(checkInRaw) : null;
  const checkOut = checkOutRaw ? new Date(checkOutRaw) : null;

  return {
    id,
    status,
    fullName: raw.fullName ?? raw.FullName,
    phone: raw.phone ?? raw.Phone,
    checkIn,
    checkOut,
    quantity: raw.quantity ?? raw.Quantity,
    total: raw.totalPrice ?? raw.TotalPrice,
    roomTypeName: raw.roomTypeName ?? raw.RoomTypeName,
    hotelName: raw.hotelName ?? raw.HotelName,
    location: raw.location ?? raw.Location,
  };
}

function getEffectiveDate(b) {
  // Dùng checkIn làm chuẩn, nếu không có thì fallback sang checkOut
  return b.checkIn || b.checkOut || null;
}

function formatVnd(n) {
  const v = typeof n === "number" ? n : Number(n || 0);
  return v.toLocaleString("vi-VN") + " đ";
}

export default function PartnerBookingReport() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedYear, setSelectedYear] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL"); // 1-12 hoặc "ALL"

  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Lấy nhiều hơn phía list, để đủ data báo cáo
        const res = await partnerApi.getBookings({ take: 1000 });
        const data = Array.isArray(res) ? res : res?.items || [];
        const mapped = data
          .map(normalizeBooking)
          .filter((b) => getEffectiveDate(b));
        setBookings(mapped);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Không tải được dữ liệu báo cáo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Danh sách năm có dữ liệu
  const availableYears = useMemo(() => {
    const years = new Set();
    bookings.forEach((b) => {
      const d = getEffectiveDate(b);
      if (!d || isNaN(d)) return;
      years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [bookings]);

  // Nếu chưa chọn năm thì mặc định chọn năm mới nhất
  useEffect(() => {
    if (selectedYear === "ALL" && availableYears.length > 0) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  // Lọc theo năm / tháng đang chọn
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = getEffectiveDate(b);
      if (!d || isNaN(d)) return false;

      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      if (selectedYear !== "ALL" && year !== Number(selectedYear)) return false;
      if (selectedMonth !== "ALL" && month !== Number(selectedMonth))
        return false;

      return true;
    });
  }, [bookings, selectedYear, selectedMonth]);

  // 🔹 Thống kê: chỉ tính tiền với trạng thái Completed
  const { completedRevenue, totalInRange } = useMemo(() => {
    let completedRevenue = 0;
    let totalInRange = filteredBookings.length;

    filteredBookings.forEach((b) => {
      if (b.status === "Completed") {
        completedRevenue += Number(b.total || 0);
      }
    });

    return { completedRevenue, totalInRange };
  }, [filteredBookings]);

  // Biểu đồ cột: tổng booking theo tháng trong năm được chọn
  const barData = useMemo(() => {
    if (selectedYear === "ALL") return [];

    const counts = Array(12).fill(0);
    bookings.forEach((b) => {
      const d = getEffectiveDate(b);
      if (!d || isNaN(d)) return;
      const year = d.getFullYear();
      if (year !== Number(selectedYear)) return;
      const monthIndex = d.getMonth(); // 0-11
      counts[monthIndex] += 1;
    });

    return counts.map((value, idx) => ({
      monthLabel: MONTH_LABELS[idx],
      month: idx + 1,
      total: value,
    }));
  }, [bookings, selectedYear]);

  // Biểu đồ tròn: phân bổ trạng thái trong phạm vi lọc (năm + tháng)
  const pieData = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const status = b.status || "Other";
      map.set(status, (map.get(status) || 0) + 1);
    });

    return Array.from(map.entries()).map(([status, value]) => ({
      status,
      value,
    }));
  }, [filteredBookings]);

  // Bảng danh sách: filteredBookings, sort theo ngày (mới nhất trước)
  const tableRows = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const da = getEffectiveDate(a);
      const db = getEffectiveDate(b);
      return (db?.getTime() || 0) - (da?.getTime() || 0);
    });
  }, [filteredBookings]);

  // Group theo trạng thái để chia thành từng ô
  const groupedByStatus = useMemo(() => {
    const grouped = {};
    tableRows.forEach((r) => {
      const key = r.status || "Other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    return grouped;
  }, [tableRows]);

  const getStatusBadgeClass = (status) => {
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

  const periodLabel =
    selectedMonth === "ALL"
      ? `NĂM ${selectedYear}`
      : `${selectedMonth}/${selectedYear}`;

  return (
    <div className="space-y-5">
      {/* Header + filter */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-xl font-semibold">Báo cáo đơn đặt phòng</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Năm */}
          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="text-sm border rounded-lg px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {availableYears.length === 0 ? (
              <option value="ALL">Không có dữ liệu</option>
            ) : (
              <>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </>
            )}
          </select>

          {/* Tháng */}
          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="text-sm border rounded-lg px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="ALL">Cả năm</option>
            {MONTH_LABELS.map((label, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Thông báo lỗi */}
      {error && (
        <motion.div
          className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {/* 🔹 2 ô tổng quan (doanh thu + số đơn) */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-5 shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-xs uppercase tracking-wide opacity-90">
            DOANH THU {selectedMonth === "ALL" ? "NĂM" : "THÁNG"} {periodLabel}
          </div>
          <div className="mt-1 text-2xl md:text-3xl font-extrabold">
            {formatVnd(completedRevenue)}
          </div>
          <div className="mt-1 text-[11px] opacity-90">
            Chỉ tính các đơn ở trạng thái <strong>Completed</strong> trong
            khoảng thời gian đang chọn.
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl bg-white border px-6 py-5 shadow-sm hover:shadow-md transform hover:-translate-y-1 transition-all duration-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="text-xs uppercase tracking-wide text-gray-500">
            TỔNG SỐ ĐƠN{" "}
            {selectedMonth === "ALL" ? "TRONG NĂM" : "TRONG THÁNG"}
          </div>
          <div className="mt-1 text-2xl md:text-3xl font-extrabold text-gray-900">
            {totalInRange}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Tính trên tất cả trạng thái đơn trong khoảng thời gian đang chọn.
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Biểu đồ cột */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">
              Biểu đồ cột – Tổng số đơn theo tháng
            </h2>
            {selectedYear !== "ALL" && (
              <span className="text-xs text-gray-500">Năm {selectedYear}</span>
            )}
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Đang tải dữ liệu...
            </div>
          ) : barData.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Không có dữ liệu cho năm đã chọn.
            </div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Số đơn" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Biểu đồ tròn */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">
              Biểu đồ tròn – Phân bổ trạng thái
            </h2>
            <span className="text-xs text-gray-500">
              {selectedMonth === "ALL"
                ? `Năm ${selectedYear}`
                : `Tháng ${selectedMonth}/${selectedYear}`}
            </span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Đang tải dữ liệu...
            </div>
          ) : pieData.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Không có đơn trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {pieData.map((entry, index) => {
                      const color =
                        STATUS_COLORS[entry.status] ||
                        STATUS_COLORS.Other ||
                        "#9ca3af";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bảng danh sách - chia theo từng trạng thái + scroll riêng từng ô */}
      <motion.div
        className="bg-white rounded-xl shadow-sm border p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Danh sách đơn{" "}
            {selectedMonth === "ALL"
              ? `năm ${selectedYear}`
              : `tháng ${selectedMonth}/${selectedYear}`}
          </h2>
          <div className="text-xs text-gray-500">
            Tổng: {filteredBookings.length} đơn
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-center text-gray-500 text-sm">
            Đang tải dữ liệu...
          </div>
        ) : tableRows.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-sm">
            Không có đơn nào trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STATUS_ORDER.map((statusKey, idx) => {
              const rows = groupedByStatus[statusKey] || [];
              if (!rows.length) return null;

              return (
                <motion.div
                  key={statusKey}
                  className="rounded-lg border bg-gray-50 p-3 flex flex-col hover:bg-white hover:shadow-md transition-all duration-200"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: idx * 0.03 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusBadgeClass(
                          statusKey
                        )}`}
                      >
                        {statusKey}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {rows.length} đơn
                    </span>
                  </div>

                  {/* Table với scroll dọc riêng cho từng ô */}
                  <div
                    className="mt-1 overflow-y-auto rounded-md bg-white/60"
                    style={{ maxHeight: "320px" }}
                  >
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-1 text-center">Mã</th>
                          <th className="p-1 text-center">Khách</th>
                          <th className="p-1 text-center">Lưu trú</th>
                          <th className="p-1 text-center">Tổng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const d = getEffectiveDate(r);
                          const stayLabel =
                            r.checkIn && r.checkOut
                              ? `${r.checkIn.toLocaleDateString()} → ${r.checkOut.toLocaleDateString()}`
                              : d
                              ? d.toLocaleDateString()
                              : "-";

                          return (
                            <tr key={r.id} className="border-t">
                              <td className="p-1 text-center">{r.id}</td>
                              <td className="p-1 text-center">
                                <div className="font-medium truncate max-w-[120px]">
                                  {r.fullName || "-"}
                                </div>
                                {r.phone && (
                                  <div className="text-[10px] text-gray-500">
                                    {r.phone}
                                  </div>
                                )}
                              </td>
                              <td className="p-1 text-center">{stayLabel}</td>
                              <td className="p-1 text-center">
                                {typeof r.total === "number"
                                  ? r.total.toLocaleString("vi-VN") + " ₫"
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
