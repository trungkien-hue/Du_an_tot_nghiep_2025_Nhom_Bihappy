// src/Pages/Staff/StaffReportTours.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  getTourAggregates,
  getTourSummary,
} from "../../services/staffOrdersApi";
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

/* ========= Helpers ========= */
function Money({ value }) {
  const v = Number(value || 0);
  return <>{v.toLocaleString("vi-VN")} đ</>;
}
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#facc15",
  "#64748b",
  "#ef4444",
];

export default function StaffReportTours() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [items, setItems] = useState([]); // tổng hợp theo tour của tháng
  const [monthlySummary, setMonthlySummary] = useState([]); // 12 tháng
  const [seriesByTour, setSeriesByTour] = useState({}); // {tourName: [12 số]}

  const [loading, setLoading] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);

  const [chartInViewBarYear, setChartInViewBarYear] = useState(false);
  const [chartInViewPie, setChartInViewPie] = useState(false);
  const [chartInViewLine, setChartInViewLine] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // ========== Load dữ liệu cho tháng đang chọn ==========
  const loadMonth = async () => {
    setLoading(true);
    try {
      const [report, summary] = await Promise.all([
        getTourAggregates({ month, year, pageSize: 200 }),
        getTourSummary(year),
      ]);

      const data = report.items || [];
      setItems(data);
      setMonthlySummary(summary || []);

      const totalRev = data.reduce(
        (sum, x) => sum + (x.Revenue || x.TotalRevenue || 0),
        0
      );
      const totalBk = data.reduce(
        (sum, x) => sum + (x.TotalBookings || x.BookingCount || 0),
        0
      );
      setTotalRevenue(totalRev);
      setTotalBookings(totalBk);
    } catch (e) {
      console.error(e);
      alert("Không thể tải dữ liệu báo cáo Tour.");
    } finally {
      setLoading(false);
    }
  };

  // ========== Load series 12 tháng cho từng tour (biểu đồ đường) ==========
  const loadYearSeries = async () => {
    setLoadingSeries(true);
    try {
      const allMonths = await Promise.all(
        months.map((m) =>
          getTourAggregates({ month: m, year, pageSize: 200 })
        )
      );

      const map = {};

      allMonths.forEach((res, idx) => {
        const list = res?.items || [];
        list.forEach((it) => {
          const name =
            it.Name || it.TourName || `Tour #${it.TourID || "?"}`;
          const rev = Number(it.Revenue || it.TotalRevenue || 0);

          if (!map[name]) {
            map[name] = Array(12).fill(0);
          }
          map[name][idx] = rev; // idx tương ứng với tháng-1
        });
      });

      setSeriesByTour(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    loadYearSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // ========== Dữ liệu cho các chart ==========

  // Cột: doanh thu 12 tháng (tổng các tour)
  const monthlyBarData = months.map((m) => {
  const found = monthlySummary.find((x) => x.Month === m);

  const total = found
    ? (found.Revenue ?? found.Total ?? 0)
    : 0;

  return {
    MonthLabel: `T${m}`,
    Month: m,
    Total: total,
  };
});
  // Tròn: cơ cấu doanh thu theo tour trong tháng
  const pieData = useMemo(
    () =>
      (items || []).map((it) => ({
        name: it.Name || it.TourName || `Tour #${it.TourID || "?"}`,
        value: Number(it.Revenue || it.TotalRevenue || 0),
      })),
    [items]
  );

  // Đường: doanh thu 12 tháng theo từng tour (top N)
  const lineData = useMemo(() => {
    const entries = Object.entries(seriesByTour);
    if (!entries.length) return [];

    const ranked = entries
      .map(([name, arr]) => ({
        name,
        total: arr.reduce((s, v) => s + (v || 0), 0),
        arr,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // top 5 tour

    return months.map((m, idx) => {
      const row = { MonthLabel: `T${m}` };
      ranked.forEach((r) => {
        row[r.name] = r.arr[idx] || 0;
      });
      return row;
    });
  }, [seriesByTour]);

  const lineSeriesKeys = useMemo(
    () =>
      lineData[0]
        ? Object.keys(lineData[0]).filter((k) => k !== "MonthLabel")
        : [],
    [lineData]
  );

  // Bảng 1: danh sách tour theo doanh thu trong tháng
  const sortedToursByRevenue = useMemo(() => {
    return [...(items || [])].sort(
      (a, b) =>
        (b.Revenue || b.TotalRevenue || 0) -
        (a.Revenue || a.TotalRevenue || 0)
    );
  }, [items]);

  // Bảng 2: top tour nhiều đơn
  const sortedToursByOrders = useMemo(() => {
    return [...(items || [])]
      .map((it) => ({
        ...it,
        orders:
          it.TotalBookings ||
          it.BookingCount ||
          it.TotalOrders ||
          0,
      }))
      .sort((a, b) => b.orders - a.orders);
  }, [items]);

  // ========== Render ==========

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
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              Báo cáo Tour
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng quan doanh thu & số đơn của các tour theo tháng và theo
            năm.
          </p>
        </div>

        {/* Bộ chọn tháng/năm */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {months.map((m) => (
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
        className="mt-6 grid gap-4 md:grid-cols-3"
      >
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white p-5 ring-1 ring-black/5 shadow-xl">
          <div className="text-xs uppercase opacity-80 tracking-wide">
            Doanh thu tháng
          </div>
          <div className="text-sm opacity-95">
            {pad2(month)}/{year}
          </div>
          <div className="text-2xl md:text-3xl font-extrabold mt-1">
            <Money value={totalRevenue} />
          </div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Tổng số đơn tháng
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-800">
            {totalBookings}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Tính trên tất cả tour trong tháng chọn.
          </div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Số tour có đơn
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-800">
            {items.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Chỉ tính booking trạng thái Completed.
          </div>
        </div>
      </motion.div>

      {/* ===== Hàng chart trên: 12 tháng + pie tour/ tháng ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Cột – doanh thu 12 tháng */}
        <motion.div
          onViewportEnter={() => setChartInViewBarYear(true)}
          viewport={{ once: true, amount: 0.35 }}
          className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Doanh thu theo tháng – năm {year}
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MonthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) =>
                  `${Number(v).toLocaleString("vi-VN")} đ`
                }
              />
              <Bar
                dataKey="Total"
                radius={[6, 6, 0, 0]}
                isAnimationActive={chartInViewBarYear}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tròn – cơ cấu doanh thu theo tour trong tháng */}
        <motion.div
          onViewportEnter={() => setChartInViewPie(true)}
          viewport={{ once: true, amount: 0.35 }}
          className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Cơ cấu doanh thu theo tour – tháng {pad2(month)}/{year}
          </h2>
          {pieData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
              Không có dữ liệu.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(1)}%)`
                  }
                  isAnimationActive={chartInViewPie}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) =>
                    `${Number(v).toLocaleString("vi-VN")} đ`
                  }
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* ===== Biểu đồ đường: top tour theo tháng trong năm ===== */}
      <motion.div
        onViewportEnter={() => setChartInViewLine(true)}
        viewport={{ once: true, amount: 0.35 }}
        className="mt-6 rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Diễn biến doanh thu 12 tháng – theo tour (top)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Mỗi đường là một tour, màu khác nhau. Nhìn đỉnh đường để thấy
          tháng nào cao nhất của từng tour.
        </p>

        {loadingSeries ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
            Đang tải dữ liệu biểu đồ đường…
          </div>
        ) : lineData.length === 0 || lineSeriesKeys.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
            Chưa đủ dữ liệu để vẽ biểu đồ.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MonthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) =>
                  `${Number(v).toLocaleString("vi-VN")} đ`
                }
              />
              {lineSeriesKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={chartInViewLine}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ===== Bảng 1: danh sách tour trong tháng ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 shadow-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Danh sách tour – tháng {pad2(month)}/{year}
          </h3>
          <div className="text-xs text-gray-500">
            Tổng: {sortedToursByRevenue.length} tour
          </div>
        </div>
        <div className="max-h-[45vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 text-gray-700 z-10">
              <tr>
                {["#", "Tour", "Số đơn", "Doanh thu tháng"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold whitespace-nowrap"
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
                    <td className="px-4 py-3">
                      <div className="h-3 w-6 bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-64 bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-10 bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : sortedToursByRevenue.length ? (
                sortedToursByRevenue.map((it, idx) => (
                  <tr
                    key={it.TourID ?? idx}
                    className={
                      idx % 2 === 0
                        ? "bg-white"
                        : "bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors"
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {it.Name || it.TourName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {it.TotalBookings ||
                        it.BookingCount ||
                        it.TotalOrders ||
                        0}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600 whitespace-nowrap">
                      <Money value={it.Revenue || it.TotalRevenue} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ===== Bảng 2: top tour nhiều đơn ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 shadow-xl overflow-hidden mb-4"
      >
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Top tour nhiều đơn – tháng {pad2(month)}/{year}
          </h3>
          <div className="text-xs text-gray-500">
            Xếp hạng theo số đơn (Top 1, Top 2, …)
          </div>
        </div>
        <div className="max-h-[40vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 text-gray-700 z-10">
              <tr>
                {["Thứ hạng", "Tour", "Số đơn", "Doanh thu"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedToursByOrders.length ? (
                sortedToursByOrders.map((it, idx) => (
                  <tr key={it.TourID ?? idx}>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-indigo-700">
                      Top {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {it.Name || it.TourName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {it.orders}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Money value={it.Revenue || it.TotalRevenue} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
