import { useEffect, useState } from "react";
import reportApi from "../../services/Admin/reportApi"
import StatCard from "../../components/Admin/StatCard";
import { Users, Hotel, Plane } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Reports() {
  const [summary, setSummary] = useState({ hotelCount: 0, tourCount: 0, userCount: 0, bookings: [] });

  useEffect(() => {
    reportApi.getSummary().then((res) => setSummary(res));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Báo cáo & Thống kê</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Người dùng" value={summary.userCount} icon={<Users size={20}/>} color="purple" />
        <StatCard title="Khách sạn" value={summary.hotelCount} icon={<Hotel size={20}/>} color="blue" />
        <StatCard title="Tour" value={summary.tourCount} icon={<Plane size={20}/>} color="green" />
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3">Lượt đặt theo tháng</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={summary.bookings || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hotelBookings" fill="#3b82f6" name="Khách sạn" />
            <Bar dataKey="tourBookings" fill="#f97316" name="Tour" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
