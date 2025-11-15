import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

/* ========= Ảnh tĩnh từ backend (KHÔNG có /api) ========= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const resolveImageUrl = (u) => {
  if (!u) return "/images/default-hotel.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
};

export default function HeroHotelSlider({
  hotels = [],
  // Cho phép tuỳ biến đường dẫn chi tiết: (id) => `/hotels/${id}` hoặc `/hotel/${id}`
  buildHotelLink = (id) => `/hotels/${id}`,
}) {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);
  const SLIDE_INTERVAL = 8000;

  useEffect(() => {
    if (!hotels.length) return;
    const next = () => setCurrent((prev) => (prev + 1) % hotels.length);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(next, SLIDE_INTERVAL);
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, [current, hotels]);

  if (!hotels.length) return null;

  const safeIdx = ((n, len) => (len === 0 ? 0 : ((n % len) + len) % len))(current, hotels.length);
  const active = hotels[safeIdx] || {};
  const nextHotel = hotels[(safeIdx + 1) % hotels.length] || {};

  const activeImg = resolveImageUrl(active.ImageURL ?? active.imageURL);
  const activeName = active.Name ?? active.name ?? "Khách sạn";
  const activeLoc = active.Location ?? active.location ?? "Đang cập nhật";
  const activeDesc =
    active.Description ??
    active.description ??
    "Nghỉ dưỡng thoải mái với dịch vụ chu đáo và vị trí thuận tiện.";
  const activeId = active.HotelID ?? active.hotelID;

  const nextImg = resolveImageUrl(nextHotel.ImageURL ?? nextHotel.imageURL);
  const nextName = nextHotel.Name ?? nextHotel.name ?? "";
  const nextId = nextHotel.HotelID ?? nextHotel.hotelID;

  return (
    <section className="relative w-full h-[85vh] overflow-hidden pt-24 z-[0]">
      {/* Ảnh nền */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${activeImg})` }}
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/55 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-16 z-[1] pointer-events-none bg-gradient-to-b from-transparent via-black/30 to-white" />

      <div className="relative z-[2] flex h-full max-w-7xl mx-auto px-6 lg:px-10">
        {/* Trái: tiêu đề/mô tả */}
        <div className="flex flex-col justify-center w-full lg:w-3/4 text-white">
          <p className="text-sm tracking-widest uppercase text-amber-300 mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            Khách sạn – {activeLoc}
          </p>
          <h1 className="text-4xl lg:text-6xl font-extrabold mb-4 leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            {activeName}
          </h1>
          <p className="max-w-xl text-gray-100 mb-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            {activeDesc}
          </p>

          {activeId != null && (
            <Link
              to={buildHotelLink(activeId)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 transition text-white font-semibold px-5 py-3 rounded-lg w-fit drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
            >
              Xem chi tiết
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Phải: preview slide kế tiếp */}
        <div className="hidden lg:block w-1/4 pl-6 self-start mt-4 translate-y-[-30px] translate-x-[50px]">
          <div
            className="relative h-[70vh] rounded-2xl overflow-hidden cursor-pointer group
                       shadow-2xl shadow-black/40 ring-1 ring-black/10 backdrop-blur-[0.5px]"
            onClick={() => setCurrent((safeIdx + 1) % hotels.length)}
            title="Xem slide tiếp theo"
          >
            <img
              src={nextImg}
              alt={nextName}
              className="h-full w-full object-cover group-hover:scale-105 transition"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />
            <div className="absolute bottom-4 left-4 right-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2">
              <div>
                <span className="block text-sm opacity-90">Tiếp theo</span>
                <h3 className="text-lg font-semibold">{nextName}</h3>
              </div>

              {nextId != null && (
                <Link
                  to={buildHotelLink(nextId)}
                  onClick={(e) => e.stopPropagation()} // bấm nút này thì KHÔNG chuyển slide
                  className="text-sm bg-white/90 hover:bg-white text-gray-900 font-medium px-3 py-1.5 rounded-md"
                  aria-label="Xem chi tiết khách sạn tiếp theo"
                >
                  Chi tiết
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[3]">
        {hotels.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition ${i === safeIdx ? "bg-amber-500 scale-110" : "bg-white/70 hover:bg-white"}`}
            aria-label={`Chuyển đến slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
