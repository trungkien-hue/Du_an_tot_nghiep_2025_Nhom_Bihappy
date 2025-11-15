// src/Pages/Staff/StaffReportHotels.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getHotelAggregates, getHotelSummary } from "../../services/staffOrdersApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ========= Helpers ========= */
function Money({ value }) {
  const v = Number(value || 0);
  return <>{v.toLocaleString("vi-VN")} đ</>;
}
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

export default function StaffReportHotels() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // bật animation biểu đồ khi vào viewport
  const [chartInView1, setChartInView1] = useState(false);
  const [chartInView2, setChartInView2] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [report, summary] = await Promise.all([
        getHotelAggregates({ month, year, pageSize: 100 }),
        getHotelSummary(year),
      ]);
      const data = report.items || [];
      setItems(data);
      setMonthly(summary || []);
      // ✅ dùng Revenue (fallback TotalRevenue)
      setTotalRevenue(
        data.reduce((sum, x) => sum + (x.Revenue || x.TotalRevenue || 0), 0)
      );
    } catch (e) {
      console.error(e);
      alert("Không thể tải dữ liệu báo cáo Khách sạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // ✅ Dữ liệu cho chart 12 tháng (summary API trả Month, Revenue)
  const monthlyData = months.map((m) => {
    const found = monthly.find((x) => x.Month === m);
    return {
      Month: `T${m}`,
      Total: found ? (found.Revenue || found.Total) : 0,
    };
  });

  // ✅ Dữ liệu cho chart “Doanh thu theo khách sạn”
  const chartItems = (items || []).map((it) => ({
    Name: it.Name || it.HotelName || "Khách sạn",
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
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Báo cáo doanh thu Khách sạn
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Thống kê doanh thu theo khách sạn, tháng và 12 tháng trong năm.
          </p>
        </div>

        {/* Bộ chọn tháng/năm */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
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
        className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 ring-1 ring-black/5 shadow-xl"
      >
        <div className="text-sm md:text-base opacity-95">
          Tổng doanh thu tháng {pad2(month)}/{year}
        </div>
        <div className="text-3xl md:text-4xl font-extrabold mt-1">
          <Money value={totalRevenue} />
        </div>
      </motion.div>

      {/* ===== Chart: Doanh thu từng khách sạn trong tháng ===== */}
      <motion.div
        onViewportEnter={() => setChartInView1(true)}
        viewport={{ once: true, amount: 0.35 }}
        className="mt-6 rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-gray-200 shadow-lg p-6"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Doanh thu theo khách sạn (tháng {pad2(month)}/{year})
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
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              isAnimationActive={chartInView1}
              animationBegin={120}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ===== Bảng danh sách khách sạn ===== */}
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
                {["#", "Khách sạn", "Địa điểm", "Đánh giá", "Tháng", "Doanh thu"].map((h) => (
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
                    <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-10 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                  </tr>
                ))
              ) : items.length ? (
                items.map((it, idx) => (
                  <tr
                    key={it.HotelID ?? idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors"}
                  >
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {it.Name || it.HotelName}
                    </td>
                    <td className="px-4 py-3">{it.Location || "-"}</td>
                    <td className="px-4 py-3">{Number(it.Rating || 0).toFixed(1)}</td>
                    <td className="px-4 py-3">{pad2(month)}/{year}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      <Money value={it.Revenue || it.TotalRevenue} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
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
              fill="#34d399"
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
