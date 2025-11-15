// src/Pages/Staff/StaffReportTours.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTourAggregates, getTourSummary } from "../../services/staffOrdersApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ========= Helpers ========= */
function Money({ value }) {
  const v = Number(value || 0);
  return <>{v.toLocaleString("vi-VN")} đ</>;
}
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

export default function StaffReportTours() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // bật animation khi chart vào viewport
  const [chartInView1, setChartInView1] = useState(false);
  const [chartInView2, setChartInView2] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [report, summary] = await Promise.all([
        getTourAggregates({ month, year, pageSize: 100 }),
        getTourSummary(year),
      ]);
      const data = report.items || [];
      setItems(data);
      setMonthly(summary || []);
      // ✅ tổng doanh thu
      setTotalRevenue(
        data.reduce((sum, x) => sum + (x.Revenue || x.TotalRevenue || 0), 0)
      );
    } catch (e) {
      console.error(e);
      alert("Không thể tải dữ liệu báo cáo Tour.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const monthlyData = months.map((m) => {
    const found = monthly.find((x) => x.Month === m);
    return {
      Month: `T${m}`,
      Total: found ? (found.Revenue || found.Total) : 0,
    };
  });

  // ✅ dữ liệu cho chart theo tour
  const chartItems = (items || []).map((it) => ({
    Name: it.Name || it.TourName || "Tour",
    Revenue: Number(it.Revenue || it.TotalRevenue || 0),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-[1200px] mx-auto px-4 md:px-6 py-8"
    >
      {/* ===== Header ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              Báo cáo doanh thu Tour
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Thống kê doanh thu theo tour, tháng và 12 tháng trong năm.
          </p>
        </div>

        {/* Bộ chọn tháng/năm */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== Tổng doanh thu tháng ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white p-6 ring-1 ring-black/5 shadow-xl"
      >
        <div className="text-sm md:text-base opacity-90">
          Tổng doanh thu tháng {pad2(month)}/{year}
        </div>
        <div className="text-3xl md:text-4xl font-extrabold mt-1">
          <Money value={totalRevenue} />
        </div>
      </motion.div>

      {/* ===== Chart: Doanh thu từng tour trong tháng ===== */}
      <motion.div
        onViewportEnter={() => setChartInView1(true)}
        viewport={{ once: true, amount: 0.35 }}
        className="mt-6 rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Doanh thu theo tour (tháng {pad2(month)}/{year})
        </h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartItems}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="Name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => `${Number(v).toLocaleString("vi-VN")} đ`}
              contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
            />
            <Bar
              dataKey="Revenue"
              fill="#4f46e5"
              radius={[6, 6, 0, 0]}
              isAnimationActive={chartInView1}
              animationBegin={120}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ===== Bảng chi tiết ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 shadow-xl overflow-hidden"
      >
        <div className="max-h-[52vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 text-gray-700 z-10">
              <tr>
                {["#", "Tên Tour", "Đánh giá", "Tháng", "Doanh thu"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3 w-6 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-64 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-10 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                  </tr>
                ))
              ) : items.length ? (
                items.map((it, idx) => (
                  <tr
                    key={it.TourID ?? idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-amber-50/20 hover:bg-amber-50/40 transition-colors"}
                  >
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {it.Name || it.TourName}
                    </td>
                    <td className="px-4 py-3">{Number(it.Rating || 0).toFixed(1)}</td>
                    <td className="px-4 py-3">{pad2(month)}/{year}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">
                      <Money value={it.Revenue || it.TotalRevenue} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ===== Chart: Doanh thu 12 tháng ===== */}
      <motion.div
        onViewportEnter={() => setChartInView2(true)}
        viewport={{ once: true, amount: 0.35 }}
        className="mt-6 rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Doanh thu 12 tháng năm {year}
        </h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="Month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => `${Number(v).toLocaleString("vi-VN")} đ`}
              contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
            />
            <Bar
              dataKey="Total"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              isAnimationActive={chartInView2}
              animationBegin={120}
              animationDuration={1100}
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
