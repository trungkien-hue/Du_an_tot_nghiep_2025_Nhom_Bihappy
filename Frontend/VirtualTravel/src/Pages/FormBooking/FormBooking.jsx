import React, { useMemo, useState } from "react";
import hotelService from "../../services/hotelApi";

/* ===== Helpers ===== */
function nightsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1);
  const b = new Date(d2);
  const ms = b.setHours(12, 0, 0, 0) - a.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
function VND(n) {
  const num = Number(n || 0);
  return num.toLocaleString("vi-VN") + "₫";
}
function* days(ci, co) {
  const start = new Date(ci),
    end = new Date(co);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}
function normalizeDaily(a) {
  const date = (a?.Date ?? a?.date ?? "").toString().slice(0, 10);
  const checkin = a?.Checkin ?? a?.checkin;
  if (date)
    return {
      date,
      available: Number(a?.AvailableRooms || 0),
      price: Number(a?.Price || 0),
    };
  if (checkin) {
    const d = new Date(checkin).toISOString().slice(0, 10);
    return {
      date: d,
      available: Number(a?.AvailableRooms || 0),
      price: Number(a?.Price || 0),
    };
  }
  return null;
}
function buildMap(avs) {
  const m = new Map();
  for (const a of avs || []) {
    const n = normalizeDaily(a);
    if (!n?.date) continue;
    m.set(n.date, { available: n.available, price: n.price });
  }
  return m;
}
function minAvailableForRange(avs, checkin, checkout) {
  const map = buildMap(avs);
  let min = Infinity;
  for (const d of days(checkin, checkout)) {
    const rec = map.get(d);
    const v = Number(rec?.available || 0);
    min = Math.min(min, v);
  }
  return Number.isFinite(min) ? min : 0;
}
function priceOfFirstNight(avs, checkin) {
  const map = buildMap(avs);
  const rec = map.get(new Date(checkin).toISOString().slice(0, 10));
  const p = Number(rec?.price || 0);
  return Number.isFinite(p) ? p : 0;
}

export default function FormBooking({
  hotel,
  bookingData,
  onChange,
  onSubmit,
  onClose,
  today,
}) {
  const [availableRoomTypes, setAvailableRoomTypes] = useState(
    hotel.RoomTypes || []
  );
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityColor, setAvailabilityColor] = useState("green");
  const [submitting, setSubmitting] = useState(false);

  const price = selectedRoomType ? Number(selectedRoomType.Price) : 0;
  const availableRooms = selectedRoomType
    ? Number(selectedRoomType.AvailableRooms)
    : 0;

  const nightsAuto = useMemo(
    () => nightsBetween(bookingData.checkin, bookingData.checkout),
    [bookingData.checkin, bookingData.checkout]
  );
  const nights = useMemo(
    () => Math.max(0, Number(bookingData.nights ?? nightsAuto)),
    [bookingData.nights, nightsAuto]
  );

  const quantity = Number(bookingData.quantity || 1);
  const total = useMemo(
    () => price * nights * quantity,
    [price, nights, quantity]
  );

  const handleRoomTypeChange = (e) => {
    const roomTypeId = parseInt(e.target.value);
    const room =
      availableRoomTypes.find((rt) => rt.RoomTypeID === roomTypeId) || null;
    setSelectedRoomType(room);

    if (room) {
      onChange({ target: { name: "roomTypeID", value: room.RoomTypeID } });
      onChange({ target: { name: "price", value: room.Price } });
      onChange({ target: { name: "availableRooms", value: room.AvailableRooms } });
      setAvailabilityMessage(
        room.AvailableRooms > 0 ? "Còn phòng" : "Hết phòng"
      );
      setAvailabilityColor(room.AvailableRooms > 0 ? "green" : "red");
    } else {
      onChange({ target: { name: "roomTypeID", value: "" } });
      onChange({ target: { name: "price", value: 0 } });
      onChange({ target: { name: "availableRooms", value: 0 } });
      setAvailabilityMessage("");
    }
  };

  const handleDateChange = async (e) => {
    const { name, value } = e.target;
    onChange({ target: { name, value } });

    const newCheckin = name === "checkin" ? value : bookingData.checkin;
    const newCheckout = name === "checkout" ? value : bookingData.checkout;

    if (!newCheckin || !newCheckout) return;

    // ✅ FIX: kiểm tra ngày trước khi gọi API
    if (new Date(newCheckout) <= new Date(newCheckin)) {
      setAvailableRoomTypes([]);
      setSelectedRoomType(null);
      setAvailabilityMessage("⚠️ Ngày trả phòng phải sau ngày nhận phòng.");
      setAvailabilityColor("red");
      return;
    }

    try {
      const payload = {
        name: hotel.name ?? hotel.Name ?? "",
        location: hotel.location ?? hotel.Location ?? "",
        checkin: newCheckin,
        checkout: newCheckout,
      };

      const response = await hotelService.searchAvailability(payload);
      const list = response?.data ?? response ?? [];
      const hotelData = list.find(
        (h) =>
          String(h.HotelID ?? h.hotelID) ===
          String(hotel.HotelID ?? hotel.hotelID)
      );

      if (hotelData?.RoomTypes?.length) {
        const mapped = hotelData.RoomTypes.map((rt) => {
          const avs = Array.isArray(rt.Availabilities)
            ? rt.Availabilities
            : [];
          const minAvail = minAvailableForRange(avs, newCheckin, newCheckout);
          const firstPrice =
            priceOfFirstNight(avs, newCheckin) || Number(rt.Price) || 0;
          return {
            RoomTypeID: rt.RoomTypeID,
            Name: rt.Name,
            Capacity: rt.Capacity,
            Price: firstPrice,
            AvailableRooms: minAvail,
          };
        });

        setAvailableRoomTypes(mapped);
        setSelectedRoomType(null);
        onChange({ target: { name: "roomTypeID", value: "" } });
        onChange({ target: { name: "price", value: 0 } });
        onChange({ target: { name: "availableRooms", value: 0 } });
        setAvailabilityMessage("Có phòng trống cho khoảng ngày đã chọn.");
        setAvailabilityColor("green");
      } else {
        setAvailableRoomTypes([]);
        setSelectedRoomType(null);
        setAvailabilityMessage("Hết phòng cho khoảng ngày đã chọn.");
        setAvailabilityColor("red");
      }
    } catch (err) {
      console.error(err);
      setAvailabilityMessage("Lỗi kiểm tra phòng khả dụng!");
      setAvailabilityColor("red");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomType) return alert("Vui lòng chọn loại phòng.");
    if (availableRooms <= 0) return alert("Loại phòng này đã hết.");
    if (!nights || nights < 1)
      return alert("Vui lòng nhập số đêm hợp lệ (>= 1).");

    setSubmitting(true);
    try {
      const payload = {
        hotelID: hotel.HotelID,
        hotelName: hotel.Name,
        location: hotel.Location,
        roomTypeID: bookingData.roomTypeID,
        checkInDate: bookingData.checkin,
        checkOutDate: bookingData.checkout,
        fullName: bookingData.fullName,
        phone: bookingData.phone,
        requests: bookingData.requests,
        price,
        nights,
        quantity,
      };
      const result = await onSubmit(payload);
      if (result && result.success === false) {
        setAvailabilityMessage("Đặt phòng thất bại. Vui lòng thử lại.");
        setAvailabilityColor("red");
        return;
      }
      setAvailabilityMessage("Đặt phòng thành công!");
      setAvailabilityColor("green");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setAvailabilityMessage("Đặt phòng thất bại. Vui lòng thử lại.");
      setAvailabilityColor("red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-white/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition">
        {/* Header */}
        <div className="relative p-6 sm:p-7 text-white">
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-sky-700 via-cyan-600 to-indigo-700" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_200px_at_80%_-20%,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/90 drop-shadow">
                Đặt phòng khách sạn
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] truncate">
                {hotel.Name}
              </h2>
              <p className="mt-1 text-sm text-white/95 drop-shadow line-clamp-1">
                {hotel.Location}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="group rounded-xl border border-white/30 bg-white/15 px-3 py-2 backdrop-blur hover:bg-white/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="inline-block transition group-hover:rotate-90">
                ✕
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(92vh-120px)] px-6 sm:px-7 pb-7">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-6 text-gray-900">
            {/* Left column */}
            <div className="md:col-span-3 space-y-5">
              {/* chọn loại phòng */}
              <div className="group">
                <label className="block text-sm font-semibold mb-1.5">Loại phòng</label>
                <select
                  name="roomTypeID"
                  value={bookingData.roomTypeID || ""}
                  onChange={handleRoomTypeChange}
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white p-2"
                >
                  <option value="">-- Chọn loại phòng --</option>
                  {availableRoomTypes.map((rt) => (
                    <option key={rt.RoomTypeID} value={rt.RoomTypeID}>
                      {rt.Name} — {VND(rt.Price)} — Còn {rt.AvailableRooms}
                    </option>
                  ))}
                </select>
                {availabilityMessage && (
                  <p
                    className="mt-2 text-sm font-semibold"
                    style={{ color: availabilityColor }}
                  >
                    {availabilityMessage}
                  </p>
                )}
              </div>

              {/* ngày nhận trả */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Ngày nhận phòng</label>
                  <input
                    type="date"
                    name="checkin"
                    value={bookingData.checkin}
                    onChange={handleDateChange}
                    className="w-full rounded-2xl border border-gray-200 p-2"
                    min={today}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Ngày trả phòng</label>
                  <input
                    type="date"
                    name="checkout"
                    value={bookingData.checkout}
                    onChange={handleDateChange}
                    className="w-full rounded-2xl border border-gray-200 p-2"
                    min={bookingData.checkin || today}
                  />
                </div>
              </div>

              {/* Họ tên & SĐT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Họ tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={bookingData.fullName}
                    onChange={onChange}
                    className="w-full rounded-2xl border border-gray-200 p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={bookingData.phone}
                    onChange={onChange}
                    className="w-full rounded-2xl border border-gray-200 p-2"
                    required
                  />
                </div>
              </div>

              {/* Số phòng */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Số phòng muốn đặt</label>
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  value={bookingData.quantity || 1}
                  onChange={onChange}
                  className="w-full rounded-2xl border border-gray-200 p-2"
                />
              </div>

              {/* Yêu cầu thêm */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Yêu cầu thêm</label>
                <textarea
                  name="requests"
                  value={bookingData.requests}
                  onChange={onChange}
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 p-2"
                  placeholder="VD: tầng cao, gần hồ bơi..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-gray-300 bg-white px-5 py-2 hover:bg-gray-100"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!selectedRoomType || submitting}
                  className="rounded-2xl bg-sky-600 text-white px-6 py-2 font-semibold hover:bg-sky-700 disabled:opacity-60"
                >
                  {submitting ? "Đang xử lý..." : "Đặt phòng"}
                </button>
              </div>
            </div>

            {/* Right column - tổng giá */}
            <aside className="md:col-span-2 bg-white/80 backdrop-blur rounded-3xl border border-gray-200 p-5">
              <h3 className="font-semibold mb-3 text-gray-900">Tổng quan giá</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Giá/đêm</span>
                  <span>{VND(price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số đêm</span>
                  <span>{nights}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số phòng</span>
                  <span>{quantity}</span>
                </div>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between font-bold text-lg text-sky-700">
                <span>Tổng tiền</span>
                <span>{VND(total)}</span>
              </div>
            </aside>
          </form>
        </div>
      </div>
    </div>
  );
}
