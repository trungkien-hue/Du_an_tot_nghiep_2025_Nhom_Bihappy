// src/Pages/Staff/ReportDemo.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  getHotelAggregates,
  getHotelSummary,
  getTourAggregates,
  getTourSummary,
  getBookingsPaged,
} from "../../services/staffOrdersApi";

/* ========= Helpers ========= */
function Money({ value }) {
  const v = Number(value || 0);
  return <>{v.toLocaleString("vi-VN")} đ</>;
}

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

// màu cho hotel/tour + status
const PRODUCT_COLORS = {
  Hotel: "#10b981",
  Tour: "#6366f1",
};

const STATUS_COLORS = {
  Pending: "#f59e0b",
  Completed: "#22c55e",
  Cancelled: "#ef4444",
  Confirmed: "#3b82f6",
  Rejected: "#b91c1c",
  New: "#6366f1",
  Other: "#6b7280",
};

const STATUS_ORDER = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
  "Rejected",
  "New",
  "Other",
];

const monthsArray = Array.from({ length: 12 }, (_, i) => i + 1);

/* ========= Component ========= */
export default function ReportDemo() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // hotel/tour báo cáo theo tháng & theo 12 tháng
  const [hotelMonthItems, setHotelMonthItems] = useState([]);
  const [tourMonthItems, setTourMonthItems] = useState([]);
  const [hotelYearSummary, setHotelYearSummary] = useState([]);
  const [tourYearSummary, setTourYearSummary] = useState([]);

  // tất cả booking (dùng để thống kê trạng thái)
  const [allOrders, setAllOrders] = useState([]);

  const [_loadingRevenue, setLoadingRevenue] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // animation flags
  const [inViewBarYear, setInViewBarYear] = useState(false);
  const [inViewLine, setInViewLine] = useState(false);
  const [inViewStatusCharts, setInViewStatusCharts] = useState(false);

  /* ====== Load revenue (hotel + tour) cho tháng/năm ====== */
  const loadRevenue = async () => {
    setLoadingRevenue(true);
    try {
      const [hotelAgg, hotelSummary, tourAgg, tourSummary] = await Promise.all([
        getHotelAggregates({ month, year, pageSize: 200 }),
        getHotelSummary(year),
        getTourAggregates({ month, year, pageSize: 200 }),
        getTourSummary(year),
      ]);

      setHotelMonthItems(hotelAgg.items || []);
      setTourMonthItems(tourAgg.items || []);
      setHotelYearSummary(hotelSummary || []);
      setTourYearSummary(tourSummary || []);
    } catch (e) {
      console.error(e);
      alert("Không thể tải dữ liệu báo cáo tổng hợp (hotel/tour).");
    } finally {
      setLoadingRevenue(false);
    }
  };

  useEffect(() => {
    loadRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  /* ====== Load tất cả đơn để thống kê trạng thái ====== */
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await getBookingsPaged({
        page: 1,
        pageSize: 2000, // đủ to cho project này
        status: "All",  // ✅ LẤY TẤT CẢ TRẠNG THÁI
        keyword: "",
        type: "",
        startDate: "",
        endDate: "",
      });
      setAllOrders(res.items || []);
    } catch (e) {
      console.error(e);
      alert("Không thể tải danh sách đơn để thống kê trạng thái.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* ====== Tính toán số liệu tổng ====== */

  // Doanh thu tháng (chỉ tính booking đã Completed – theo BE aggregates)
  const totalHotelRevenueMonth = useMemo(
    () =>
      hotelMonthItems.reduce(
        (sum, x) => sum + Number(x.Revenue || x.TotalRevenue || 0),
        0
      ),
    [hotelMonthItems]
  );
  const totalTourRevenueMonth = useMemo(
    () =>
      tourMonthItems.reduce(
        (sum, x) => sum + Number(x.Revenue || x.TotalRevenue || 0),
        0
      ),
    [tourMonthItems]
  );
  const totalRevenueMonth = totalHotelRevenueMonth + totalTourRevenueMonth;

  const _totalCompletedOrdersMonth = useMemo(() => {
    const hotelBk = hotelMonthItems.reduce(
      (s, x) => s + (x.TotalBookings || x.BookingCount || 0),
      0
    );
    const tourBk = tourMonthItems.reduce(
      (s, x) => s + (x.TotalBookings || x.BookingCount || 0),
      0
    );
    return hotelBk + tourBk;
  }, [hotelMonthItems, tourMonthItems]);

  // Tất cả đơn trong tháng (mọi trạng thái) – dùng allOrders
  const ordersInMonth = useMemo(() => {
    return (allOrders || []).filter((b) => {
      const raw =
        b.CheckInDate ||
        b.BookingDate ||
        b.CreatedAt ||
        b.CheckOutDate ||
        null;
      if (!raw) return false;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [allOrders, year, month]);

  const totalOrdersMonthAllStatus = ordersInMonth.length;

  // Thống kê theo trạng thái (bao gồm đầy đủ trạng thái)
  const statusStats = useMemo(() => {
    const map = new Map();

    ordersInMonth.forEach((b) => {
      const status = b.Status || "Other";
      const price = Number(b.TotalPrice || 0);

      const existing = map.get(status) || {
        status,
        count: 0,
        revenue: 0,
      };
      existing.count += 1;
      existing.revenue += price;
      map.set(status, existing);
    });

    const arr = Array.from(map.values());

    // sort theo thứ tự ưu tiên STATUS_ORDER, sau đó theo số đơn
    arr.sort((a, b) => {
      const ia = STATUS_ORDER.indexOf(a.status);
      const ib = STATUS_ORDER.indexOf(b.status);

      if (ia === -1 && ib === -1) return b.count - a.count;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      if (ia !== ib) return ia - ib;
      return b.count - a.count;
    });

    return arr;
  }, [ordersInMonth]);

  const totalOrdersForPercent = statusStats.reduce((s, x) => s + x.count, 0);

  const completedStat =
    statusStats.find((x) => x.status === "Completed") || null;

  // ====== Dữ liệu cho biểu đồ 12 tháng (hotel + tour) ======
  const monthlyCompanyData = useMemo(() => {
    return monthsArray.map((m) => {
      const h = hotelYearSummary.find((x) => x.Month === m);
      const t = tourYearSummary.find((x) => x.Month === m);

      const hotelRev = h ? Number(h.Revenue || h.Total || 0) : 0;
      const tourRev = t ? Number(t.Revenue || t.Total || 0) : 0;

      return {
        MonthLabel: `2025-${pad2(m)}`,
        Month: m,
        HotelRevenue: hotelRev,
        TourRevenue: tourRev,
        TotalRevenue: hotelRev + tourRev,
      };
    });
  }, [hotelYearSummary, tourYearSummary]);

  // pie doanh thu tháng theo loại sản phẩm
  const pieProductData = useMemo(
    () => [
      { name: "Hotel", value: totalHotelRevenueMonth },
      { name: "Tour", value: totalTourRevenueMonth },
    ],
    [totalHotelRevenueMonth, totalTourRevenueMonth]
  );

  // pie trạng thái (số đơn)
  const pieStatusData = useMemo(
    () =>
      statusStats.map((s) => ({
        name: s.status,
        value: s.count,
      })),
    [statusStats]
  );

  // line chart: 12 tháng, 3 series (Hotel, Tour, Total)
  const lineData = useMemo(
    () =>
      monthlyCompanyData.map((row) => ({
        MonthLabel: row.MonthLabel,
        Hotel: row.HotelRevenue,
        Tour: row.TourRevenue,
        Total: row.TotalRevenue,
      })),
    [monthlyCompanyData]
  );

  /* ========= Render ========= */
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 font-sans"
    >
      {/* ===== Header ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500 bg-clip-text text-transparent">
              Báo cáo tổng hợp công ty
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng hợp doanh thu & tình trạng đơn của{" "}
            <span className="font-semibold">Hotel + Tour</span> theo tháng / năm.
          </p>
        </div>

        {/* Bộ chọn tháng/năm */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {monthsArray.map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== Thẻ tổng quan ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.5 }}
        className="mt-6 grid gap-4 md:grid-cols-4"
      >
        {/* Tổng doanh thu tháng */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 text-white p-5 ring-1 ring-black/5 shadow-xl">
          <div className="text-xs uppercase opacity-80 tracking-wide">
            Doanh thu tháng
          </div>
          <div className="text-sm opacity-95">
            {pad2(month)}/{year}
          </div>
          <div className="mt-3 text-3xl font-extrabold">
            <Money value={totalRevenueMonth} />
          </div>
          <div className="mt-2 text-xs opacity-90">
            Chỉ tính các đơn đã{" "}
            <span className="font-semibold">Completed</span> (hotel + tour).
          </div>
        </div>

        {/* Tổng số đơn tháng (mọi trạng thái) */}
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Tổng số đơn tháng
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {loadingOrders ? "..." : totalOrdersMonthAllStatus}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Bao gồm tất cả trạng thái & loại sản phẩm.
          </div>
        </div>

        {/* Chia theo loại sản phẩm */}
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Doanh thu theo loại
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Hotel
              </span>
              <span className="font-semibold text-emerald-600">
                <Money value={totalHotelRevenueMonth} />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                Tour
              </span>
              <span className="font-semibold text-indigo-600">
                <Money value={totalTourRevenueMonth} />
              </span>
            </div>
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Chỉ tính đơn đã Completed trong tháng.
          </div>
        </div>

        {/* Tỉ lệ hoàn tất */}
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Tỉ lệ đơn hoàn tất
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {totalOrdersMonthAllStatus === 0
              ? "0%"
              : `${(
                  (Number(completedStat?.count || 0) /
                    totalOrdersMonthAllStatus) *
                  100
                ).toFixed(1)}%`}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {completedStat
              ? `${completedStat.count} đơn Completed trên ${totalOrdersMonthAllStatus} đơn.`
              : "Chưa có đơn Completed trong tháng."}
          </div>
        </div>
      </motion.div>

      {/* ===== Hàng chart: cột 12 tháng + line ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Bar chart 12 tháng */}
        <motion.div
          onViewportEnter={() => setInViewBarYear(true)}
          viewport={{ once: true, amount: 0.35 }}
          className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Doanh thu 12 tháng – Hotel vs Tour (năm {year})
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyCompanyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MonthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => `${Number(v).toLocaleString("vi-VN")} đ`}
              />
              <Legend />
              <Bar
                dataKey="HotelRevenue"
                name="Hotel"
                fill={PRODUCT_COLORS.Hotel}
                radius={[4, 4, 0, 0]}
                isAnimationActive={inViewBarYear}
              />
              <Bar
                dataKey="TourRevenue"
                name="Tour"
                fill={PRODUCT_COLORS.Tour}
                radius={[4, 4, 0, 0]}
                isAnimationActive={inViewBarYear}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Line chart tổng doanh thu */}
        <motion.div
          onViewportEnter={() => setInViewLine(true)}
          viewport={{ once: true, amount: 0.35 }}
          className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Diễn biến doanh thu 12 tháng
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Mỗi đường là một loại sản phẩm; đường{" "}
            <span className="font-semibold">Total</span> là tổng Hotel + Tour.
          </p>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MonthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => `${Number(v).toLocaleString("vi-VN")} đ`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Hotel"
                stroke={PRODUCT_COLORS.Hotel}
                strokeWidth={2}
                dot={false}
                isAnimationActive={inViewLine}
              />
              <Line
                type="monotone"
                dataKey="Tour"
                stroke={PRODUCT_COLORS.Tour}
                strokeWidth={2}
                dot={false}
                isAnimationActive={inViewLine}
              />
              <Line
                type="monotone"
                dataKey="Total"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 2"
                isAnimationActive={inViewLine}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ===== Hàng chart: pie doanh thu theo loại + pie trạng thái ===== */}
      <motion.div
        onViewportEnter={() => setInViewStatusCharts(true)}
        viewport={{ once: true, amount: 0.35 }}
        className="mt-6 grid gap-6 lg:grid-cols-2"
      >
        {/* Pie: cơ cấu doanh thu theo loại trong tháng */}
        <div className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Cơ cấu doanh thu theo sản phẩm
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Tháng {pad2(month)}/{year} – chỉ tính đơn Completed.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieProductData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(1)}%)`
                }
                isAnimationActive={inViewStatusCharts}
              >
                {pieProductData.map((entry, idx) => (
                  <Cell
                    key={`product-${idx}`}
                    fill={PRODUCT_COLORS[entry.name] || "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => `${Number(v).toLocaleString("vi-VN")} đ`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: phân bổ trạng thái (đủ trạng thái) */}
        <div className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Phân bổ trạng thái đơn hàng
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Tháng {pad2(month)}/{year} – TẤT CẢ trạng thái (hotel + tour).
          </p>
          {loadingOrders ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
              Đang tải dữ liệu...
            </div>
          ) : pieStatusData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
              Không có đơn trong tháng này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(1)}%)`
                  }
                  isAnimationActive={inViewStatusCharts}
                >
                  {pieStatusData.map((entry, idx) => (
                    <Cell
                      key={`status-${idx}`}
                      fill={
                        STATUS_COLORS[entry.name] || STATUS_COLORS.Other
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ===== Bảng: thống kê theo trạng thái ===== */}
      <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 shadow-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Bảng trạng thái đơn hàng tháng {pad2(month)}/{year}
          </h2>
          <div className="text-xs text-gray-500">
            Tổng: {totalOrdersMonthAllStatus} đơn
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Trạng thái</th>
                <th className="px-3 py-2 text-right">Số đơn</th>
                <th className="px-3 py-2 text-right">% trên tổng</th>
                <th className="px-3 py-2 text-right">
                  Doanh thu (theo TotalPrice)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statusStats.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                statusStats.map((s, idx) => (
                  <tr
                    key={s.status}
                    className={
                      idx === 0
                        ? "bg-emerald-50/40"
                        : idx % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50/40"
                    }
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-xs font-medium"
                        style={{
                          borderColor:
                            STATUS_COLORS[s.status] || STATUS_COLORS.Other,
                          color:
                            STATUS_COLORS[s.status] || STATUS_COLORS.Other,
                        }}
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[s.status] ||
                              STATUS_COLORS.Other,
                          }}
                        />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s.count}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {totalOrdersForPercent === 0
                        ? "0%"
                        : `${(
                            (s.count / totalOrdersForPercent) *
                            100
                          ).toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">
                      <Money value={s.revenue} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
