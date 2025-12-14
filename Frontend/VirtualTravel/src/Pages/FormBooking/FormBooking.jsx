import React, { useState, useEffect, useMemo } from "react";
import hotelService from "../../services/hotelApi";

/* ================= Helpers ================= */
function nightsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1);
  const b = new Date(d2);
  const ms = b.setHours(12, 0, 0, 0) - a.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil(ms / 86400000));
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
  if (!a) return null;
  const date = a?.Date?.slice(0, 10) ?? a?.date?.slice(0, 10);
  return date
    ? {
        date,
        available: Number(a?.AvailableRooms || 0),
        price: Number(a?.Price || 0),
      }
    : null;
}
function buildMap(avs) {
  const m = new Map();
  for (const a of avs || []) {
    const n = normalizeDaily(a);
    if (n) m.set(n.date, { available: n.available, price: n.price });
  }
  return m;
}
function minAvailableForRange(avs, ci, co) {
  const map = buildMap(avs);
  let min = Infinity;
  for (const d of days(ci, co)) {
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

/* ================= Component ================= */
export default function FormBooking({
  hotel,
  bookingData,
  onChange,
  onSubmit,
  onClose,
  today,
  preselectedRoom,        // ⭐ NHẬN ROOMTYPE ĐÃ CHỌN
}) {
  const [availableRoomTypes, setAvailableRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityColor, setAvailabilityColor] = useState("green");
  const [submitting, setSubmitting] = useState(false);

  const [paymentTiming, setPaymentTiming] = useState("on_arrival");
  const [paymentProvider, setPaymentProvider] = useState("momo");

  /* =====================================================
     ⭐ Khi mở form → tự fill loại phòng nếu có preselectedRoom
  ===================================================== */
  useEffect(() => {
    if (!preselectedRoom) return;

    const rt = preselectedRoom;

    setSelectedRoomType({
      RoomTypeID: rt.RoomTypeID,
      Name: rt.Name,
      Price: rt.Price,
      FinalPrice: rt.FinalPrice ?? rt.Price,
      Voucher: rt.Voucher,
      AvailableRooms: rt.AvailableRooms ?? 999,
    });

    onChange({ target: { name: "roomTypeID", value: rt.RoomTypeID } });
    onChange({ target: { name: "originalPrice", value: rt.Price } });
    onChange({
      target: { name: "finalPrice", value: rt.FinalPrice ?? rt.Price },
    });
    onChange({
      target: { name: "voucherApplied", value: rt.Voucher ?? null },
    });
    onChange({
      target: { name: "availableRooms", value: rt.AvailableRooms ?? 999 },
    });

    setAvailabilityMessage("Có phòng trống.");
    setAvailabilityColor("green");
  }, [preselectedRoom]);

  /* =====================================================
     Tải availability theo ngày
  ===================================================== */
  async function fetchAvailability(ci, co, qty) {
    try {
      const res = await hotelService.searchAvailability({
        hotelId: hotel.HotelID,
        checkin: ci,
        checkout: co,
        roomsNeeded: qty ?? 1,
      });

      const list = res?.data ?? res;
      const h = list.find((x) => Number(x.HotelID) === Number(hotel.HotelID));

      if (!h?.RoomTypes) return;

      const mapped = h.RoomTypes.map((rt) => {
        const avs = Array.isArray(rt.Availabilities) ? rt.Availabilities : [];
        const raw =
          priceOfFirstNight(avs, ci) ||
          Number(rt.Price) ||
          Number(rt.BasePrice) ||
          0;

        const final = Number(rt.FinalPrice ?? raw);

        return {
          RoomTypeID: rt.RoomTypeID,
          Name: rt.Name,
          Price: raw,
          FinalPrice: final,
          Voucher: rt.Voucher ?? null,
          AvailableRooms: minAvailableForRange(avs, ci, co),
        };
      });

      setAvailableRoomTypes(mapped);

      // Nếu có preselectedRoom → tự sync giá trị vào form
      if (preselectedRoom) {
        const m = mapped.find((x) => x.RoomTypeID === preselectedRoom.RoomTypeID);
        if (m) {
          setSelectedRoomType(m);
          onChange({ target: { name: "roomTypeID", value: m.RoomTypeID } });
          onChange({ target: { name: "originalPrice", value: m.Price } });
          onChange({ target: { name: "finalPrice", value: m.FinalPrice } });
          onChange({
            target: { name: "availableRooms", value: m.AvailableRooms },
          });
        }
      }

      setAvailabilityMessage("Có phòng trống.");
      setAvailabilityColor("green");
    } catch (err) {
      console.error(err);
      setAvailabilityMessage("Lỗi khi tải dữ liệu phòng!");
      setAvailabilityColor("red");
    }
  }

  /* =====================================================
     Khi đổi ngày
  ===================================================== */
  const handleDateChange = async (e) => {
    const { name, value } = e.target;
    onChange({ target: { name, value } });

    const ci = name === "checkin" ? value : bookingData.checkin;
    const co = name === "checkout" ? value : bookingData.checkout;

    if (!ci || !co) return;

    if (new Date(co) <= new Date(ci)) {
      setAvailabilityMessage("⚠️ Ngày trả phòng phải sau ngày nhận phòng.");
      setAvailabilityColor("red");
      return;
    }

    await fetchAvailability(ci, co, bookingData.quantity);
  };

  /* =====================================================
     Khi đổi số phòng
  ===================================================== */
  useEffect(() => {
    if (bookingData.checkin && bookingData.checkout) {
      fetchAvailability(
        bookingData.checkin,
        bookingData.checkout,
        bookingData.quantity
      );
    }
  }, [bookingData.quantity]);

  /* =====================================================
     Khi người dùng chọn loại phòng từ dropdown
  ===================================================== */
  const handleRoomTypeChange = (e) => {
    const id = Number(e.target.value);
    const room = availableRoomTypes.find((x) => x.RoomTypeID === id) || null;

    setSelectedRoomType(room);

    if (room) {
      onChange({ target: { name: "roomTypeID", value: room.RoomTypeID } });
      onChange({ target: { name: "originalPrice", value: room.Price } });
      onChange({ target: { name: "finalPrice", value: room.FinalPrice } });
      onChange({
        target: { name: "voucherApplied", value: room.Voucher ?? null },
      });
      onChange({
        target: { name: "availableRooms", value: room.AvailableRooms },
      });

      setAvailabilityMessage(
        room.AvailableRooms > 0 ? "Còn phòng" : "Hết phòng"
      );
      setAvailabilityColor(room.AvailableRooms > 0 ? "green" : "red");
    }
  };

  /* ================= Price / Nights ================= */
  const price = selectedRoomType?.FinalPrice ?? selectedRoomType?.Price ?? 0;
  const originalPrice =
    selectedRoomType?.Price ?? selectedRoomType?.OriginalPrice ?? 0;

  const voucherApplied = selectedRoomType?.Voucher ?? null;
  const availableRooms = selectedRoomType?.AvailableRooms ?? 0;

  const quantity = Number(bookingData.quantity || 1);

  const nightsAuto = useMemo(
    () => nightsBetween(bookingData.checkin, bookingData.checkout),
    [bookingData.checkin, bookingData.checkout]
  );

  const nights = Math.max(1, nightsAuto);
  const total = useMemo(
    () => price * nights * quantity,
    [price, nights, quantity]
  );

  /* =====================================================
     SUBMIT
  ===================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRoomType) return alert("Vui lòng chọn loại phòng.");

    if (availableRooms <= 0)
      return alert("Loại phòng này đã hết trong ngày bạn chọn.");

    if (availableRooms < quantity)
      return alert(`Chỉ còn ${availableRooms} phòng khả dụng.`);

    setSubmitting(true);

    try {
      const payload = {
        hotelID: hotel.HotelID,
        hotelName: hotel.Name,
        location: hotel.Location,
        roomTypeID: selectedRoomType.RoomTypeID,

        checkInDate: bookingData.checkin,
        checkOutDate: bookingData.checkout,

        fullName: bookingData.fullName,
        phone: bookingData.phone,
        requests: bookingData.requests,

        originalPrice,
        finalPrice: price,
        totalOriginal: originalPrice * nights * quantity,
        totalFinal: total,
        voucherApplied,

        nights,
        quantity,

        paymentTiming,
        paymentProvider,
      };

      const result = await onSubmit(payload);

      if (result?.success === false) {
        setAvailabilityMessage("Đặt phòng thất bại.");
        setAvailabilityColor("red");
        return;
      }

      setAvailabilityMessage("Đặt phòng thành công!");
      setAvailabilityColor("green");

      setTimeout(() => onClose(), 1200);
    } catch (error) {
      console.error(error);
      setAvailabilityMessage("Đặt phòng thất bại.");
      setAvailabilityColor("red");
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     UI giữ nguyên
  ===================================================== */
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl shadow-xl">
        {/* HEADER */}
        <div className="p-6 sm:p-7 bg-gradient-to-tr from-sky-700 via-cyan-600 to-indigo-700 text-white">
          <div className="flex justify-between">
            <div>
              <p className="text-xs uppercase opacity-80">Đặt phòng khách sạn</p>
              <h2 className="text-2xl font-bold">{hotel.Name}</h2>
              <p className="text-sm opacity-90">{hotel.Location}</p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/30 bg-white/10 px-3 py-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto max-h-[calc(92vh-120px)] px-6 py-6 text-black">
          <form className="grid md:grid-cols-5 gap-6" onSubmit={handleSubmit}>
            {/* LEFT */}
            <div className="md:col-span-3 space-y-5">
              {/* Room Type */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Loại phòng
                </label>

                <select
                  className="w-full border rounded-lg p-2"
                  value={selectedRoomType?.RoomTypeID ?? ""}
                  onChange={handleRoomTypeChange}
                >
                  <option value="">-- Chọn loại phòng --</option>

                  {availableRoomTypes.map((rt) => (
                    <option key={rt.RoomTypeID} value={rt.RoomTypeID}>
                      {rt.Name} — {VND(rt.FinalPrice ?? rt.Price)} — Còn{" "}
                      {rt.AvailableRooms}
                    </option>
                  ))}
                </select>

                {availabilityMessage && (
                  <p
                    className="mt-1 text-sm font-semibold"
                    style={{ color: availabilityColor }}
                  >
                    {availabilityMessage}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Nhận phòng
                  </label>
                  <input
                    type="date"
                    name="checkin"
                    min={today}
                    value={bookingData.checkin}
                    onChange={handleDateChange}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Trả phòng
                  </label>
                  <input
                    type="date"
                    name="checkout"
                    min={bookingData.checkin || today}
                    value={bookingData.checkout}
                    onChange={handleDateChange}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Guest info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Họ tên
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={bookingData.fullName}
                    onChange={onChange}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={bookingData.phone}
                    onChange={onChange}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Số phòng muốn đặt
                </label>
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  value={bookingData.quantity || 1}
                  onChange={onChange}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              {/* Requests */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Yêu cầu thêm
                </label>
                <textarea
                  name="requests"
                  rows={3}
                  value={bookingData.requests}
                  onChange={onChange}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-white border rounded-xl hover:bg-gray-100"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={!selectedRoomType || submitting}
                  className="px-6 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Đặt phòng"}
                </button>
              </div>
            </div>

            {/* RIGHT SUMMARY */}
            <aside className="md:col-span-2 bg-white/80 border rounded-2xl p-5">
              <h3 className="font-semibold mb-3">Tổng quan giá</h3>

              <div className="text-sm space-y-2 mb-3">
                <div className="flex justify-between">
                  <span>Giá gốc / đêm</span>
                  <span className="line-through text-gray-400">
                    {VND(originalPrice)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Giá sau giảm</span>
                  <span className="text-red-600 font-semibold">
                    {VND(price)}
                  </span>
                </div>

                {voucherApplied && (
                  <div className="text-xs text-green-700 text-right">
                    Áp dụng voucher: {voucherApplied}
                  </div>
                )}

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

              <div className="flex justify-between font-bold text-lg text-sky-600">
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
