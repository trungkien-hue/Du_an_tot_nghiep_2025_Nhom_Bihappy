import { useEffect, useState } from "react";
import reportApi from "../../services/Admin/reportApi";
import StatCard from "../../components/Admin/StatCard";
import { Users, Hotel, Plane } from "lucide-react";

export default function Dashboard() {
  const [sum, setSum] = useState({ hotelCount: 0, tourCount: 0, userCount: 0 });

  useEffect(() => {
    reportApi.getSummary().then((x) => setSum(x));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Tổng quan</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Người dùng" value={sum.userCount} icon={<Users size={20} />} color="purple" />
        <StatCard title="Khách sạn" value={sum.hotelCount} icon={<Hotel size={20} />} color="blue" />
        <StatCard title="Tour" value={sum.tourCount} icon={<Plane size={20} />} color="green" />
      </div>
      <div className="text-sm text-gray-500">Thêm widget biểu đồ/Top 5 gần đây… tuỳ bạn mở rộng.</div>
    </div>
  );
}
