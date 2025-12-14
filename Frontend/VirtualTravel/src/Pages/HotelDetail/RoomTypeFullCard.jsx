// src/Pages/HotelDetail/RoomTypeFullCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { MdOutlineAdsClick } from "react-icons/md";

export default function RoomTypeFullCard({ rt, onSelect }) {
  const name = rt.Name ?? rt.name ?? "Loại phòng";
  const desc = rt.Description ?? rt.description ?? "";
  const basePrice = rt.BasePrice ?? null;
  const dailyPrice = rt.Price ?? null;
  const finalPrice = rt.FinalPrice ?? rt.Price ?? basePrice;
  const voucher = rt.Voucher ?? null;

  // ============================
  // FORMAT HIỂN THỊ GIÁ
  // ============================
  function renderPriceBlock() {
    // Có giảm giá (FinalPrice < BasePrice)
    const hasDiscount =
      basePrice &&
      finalPrice &&
      Number(finalPrice) < Number(basePrice);

    // Có dailyPrice khác basePrice (vd: giá theo ngày)
    const hasDailyPriceDifference =
      dailyPrice && basePrice && Number(dailyPrice) !== Number(basePrice);

    // ===== CASE 1 – Có giảm giá (OTA style) =====
    if (hasDiscount) {
      return (
        <div className="flex flex-col items-end text-right leading-tight">
          <span className="line-through text-slate-400 text-xs">
            {Number(basePrice).toLocaleString("vi-VN")} ₫
          </span>

          <span className="text-yellow-300 font-extrabold text-xl drop-shadow">
            {Number(finalPrice).toLocaleString("vi-VN")} ₫ / đêm
          </span>

          {voucher && (
            <span className="mt-1 px-2 py-0.5 bg-red-600/80 text-white text-[11px] rounded-md shadow">
              🔥 {voucher}
            </span>
          )}
        </div>
      );
    }

    // ===== CASE 2 – Không giảm giá nhưng dailyPrice khác basePrice =====
    if (hasDailyPriceDifference) {
      return (
        <div className="flex flex-col items-end text-right leading-tight">
          <span className="line-through text-slate-400 text-xs">
            {Number(basePrice).toLocaleString("vi-VN")} ₫
          </span>

          <span className="text-yellow-300 font-bold text-lg">
            {Number(dailyPrice).toLocaleString("vi-VN")} ₫ / đêm
          </span>
        </div>
      );
    }

    // ===== CASE 3 – Chỉ có finalPrice =====
    if (finalPrice) {
      return (
        <span className="text-yellow-300 font-bold text-lg">
          {Number(finalPrice).toLocaleString("vi-VN")} ₫ / đêm
        </span>
      );
    }

    return <span className="text-gray-300">Giá liên hệ</span>;
  }

  // ============================
  // IMAGE PROCESSING
  // ============================
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7059";

  function resolveRoomImg(rawUrl) {
    if (!rawUrl) return "/images/default-room.jpg";
    rawUrl = String(rawUrl).trim().replace(/\\/g, "/");
    if (/^(https?:|data:|blob:)/i.test(rawUrl)) return rawUrl;
    return API_BASE + (rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl);
  }

  const img = resolveRoomImg(rt.Images?.[0]?.ImageUrl);

  return (
    <motion.div
      className="group relative rounded-3xl p-[1px] 
                 bg-gradient-to-br from-yellow-400/40 via-blue-500/30 to-transparent 
                 hover:from-yellow-300/80 hover:via-blue-400/70 hover:to-transparent
                 transition-all duration-500"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
    >
      <div
        className="bg-neutral-950/85 backdrop-blur-xl rounded-3xl border border-white/10 
                   px-4 py-4 md:px-6 md:py-5
                   flex flex-col md:flex-row gap-5 md:gap-7"
      >

        {/* IMAGE */}
        <div className="w-full md:w-[34%] relative overflow-hidden rounded-2xl">
          <motion.img
            src={img}
            alt={name}
            className="w-full h-44 md:h-48 object-cover rounded-2xl
                       group-hover:scale-[1.06] transition-transform duration-500"
            onError={(e) => (e.currentTarget.src = "/images/default-room.jpg")}
          />

          {/* Nhãn voucher gắn góc ảnh */}
          {voucher && (
            <div className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded-md text-[11px] text-white shadow">
              🔥 {voucher}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h3
                className="text-xl md:text-2xl font-black 
                           bg-gradient-to-r from-white via-white to-white/70
                           bg-clip-text text-transparent"
              >
                {name}
              </h3>

              <div className="min-w-[120px] text-right">
                {renderPriceBlock()}
              </div>
            </div>

            {desc && (
              <p className="mt-2 text-sm text-neutral-300">{desc}</p>
            )}
          </div>
          {rt.AvailableRooms === 0 && (
              <p className="text-red-400 text-sm mt-2">❌ Hết phòng cho ngày đã chọn</p>
            )}

            {rt.AvailableRooms > 0 && (
              <p className="text-green-400 text-sm mt-2">✔ Còn {rt.AvailableRooms} phòng</p>
            )}
          <div className="flex justify-end mt-4">
            <motion.button
              whileHover={{ y: -1, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect && onSelect(rt)}
              className="inline-flex items-center gap-2 px-5 py-2.5
                         rounded-2xl bg-gradient-to-r from-blue-500 via-blue-400 to-sky-400
                         text-white font-semibold text-sm"
            >
              <MdOutlineAdsClick className="text-lg" />
              Chọn phòng
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
