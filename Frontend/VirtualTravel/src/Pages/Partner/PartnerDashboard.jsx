import { useEffect, useState } from "react";
import partnerApi from "../../services/partnerApi";

export default function PartnerDashboard() {
  const [stats, setStats] = useState({ bookingCount: 0, unread: 0 });

  useEffect(() => {
    (async () => {
      try {
        const bk = await partnerApi.getBookings({ take: 1 });
        const nf = await partnerApi.getNotifications({ unreadOnly: true });
        setStats({ bookingCount: Array.isArray(bk) ? bk.length : (bk?.length || 0), unread: nf?.length || 0 });
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bảng tin khách sạn</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-sm text-gray-500">Đơn đặt mới (gần đây)</div>
          <div className="text-3xl font-semibold mt-1">{stats.bookingCount}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-sm text-gray-500">Thông báo chưa đọc</div>
          <div className="text-3xl font-semibold mt-1">{stats.unread}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-sm text-gray-500">Trạng thái</div>
          <div className="mt-1">Đã kết nối • <span className="text-green-600 font-medium">OK</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="font-medium mb-2">Hướng dẫn nhanh</div>
        <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
          <li>Xem thông báo mới tại mục <b>🔔 Thông báo</b>.</li>
          <li>Quản lý/duyệt đơn tại mục <b>📑 Đơn đặt</b>.</li>
          <li>Hệ thống sẽ hiện pop-up realtime khi có đơn mới.</li>
        </ol>
      </div>
    </div>
  );
}
