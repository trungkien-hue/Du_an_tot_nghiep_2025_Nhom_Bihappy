import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

/* ========= Ảnh tĩnh từ backend (KHÔNG có /api) ========= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const resolveImageUrl = (u) => {
  if (!u) return "/images/default-tour.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(url)) return url; // absolute
  if (!url.startsWith("/")) url = "/" + url;     // relative -> /path
  return `${ASSET_BASE}${url}`;
};

export default function HeroTourSlider({ tours }) {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);
  const SLIDE_INTERVAL = 8000;

  useEffect(() => {
    if (!tours || tours.length === 0) return;
    const next = () => setCurrent((prev) => (prev + 1) % tours.length);
    timeoutRef.current = setTimeout(next, SLIDE_INTERVAL);
    return () => clearTimeout(timeoutRef.current);
  }, [current, tours]);

  if (!tours || tours.length === 0) return null;

  const active = tours[current] || {};
  const nextTour = tours[(current + 1) % tours.length] || {};

  // PascalCase + fallback camelCase
  const activeImg = resolveImageUrl(active.ImageURL ?? active.imageURL);
  const activeName = active.Name ?? active.name ?? "Tour";
  const activeLoc = active.Location ?? active.location ?? "Đang cập nhật";
  const activeDesc =
    active.Description ??
    active.description ??
    "Khám phá hành trình độc đáo và hấp dẫn tại điểm đến nổi bật này.";
  const activeId = active.TourID ?? active.tourID;

  const nextImg = resolveImageUrl(nextTour.ImageURL ?? nextTour.imageURL);
  const nextName = nextTour.Name ?? nextTour.name ?? "";
  const nextId = nextTour.TourID ?? nextTour.tourID;

  return (
    // pt-24: chừa khoảng cho header/nút Đăng nhập
    <section className="relative w-full h-[85vh] overflow-hidden pt-24">
      {/* Ảnh nền */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${activeImg})` }}
      />
      {/* Overlay đậm để chữ nổi */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/55 to-black/20" />
      {/* Tối phần đáy để nội dung dưới cùng dễ đọc */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />

      <div className="relative z-10 flex h-full max-w-7xl mx-auto px-6 lg:px-10">
        {/* Cột trái: tiêu đề + mô tả */}
        <div className="flex flex-col justify-center w-full lg:w-3/4 text-white">
          <p className="text-sm tracking-widest uppercase text-amber-300 mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            Tour cao cấp – {activeLoc}
          </p>
          <h1 className="text-4xl lg:text-6xl font-extrabold mb-4 leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            Khám phá {activeName}
          </h1>
          <p className="max-w-xl text-gray-100 mb-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            {activeDesc}
          </p>

          {activeId != null && (
            <Link
              to={`/tours/${activeId}`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 transition text-white font-semibold px-5 py-3 rounded-lg w-fit drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
            >
              Thông tin chi tiết
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Cột phải: preview slide kế tiếp */}
        <div className="hidden lg:block w-1/4 pl-6 self-start mt-4 translate-y-[-40px] translate-x-[50px]">
          <div
            className="relative h-[70vh] rounded-2xl overflow-hidden cursor-pointer group
                       shadow-2xl shadow-black/40 ring-1 ring-black/10 backdrop-blur-[0.5px]"
            onClick={() => setCurrent((current + 1) % tours.length)}
            title="Xem slide tiếp theo"
          >
            <img
              src={nextImg}
              alt={nextName}
              className="h-full w-full object-cover group-hover:scale-105 transition"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />
            <div className="absolute bottom-4 left-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <span className="block text-sm opacity-90">Tiếp theo</span>
              <h3 className="text-lg font-semibold">{nextName}</h3>
            </div>
            {nextId != null && <Link to={`/tours/${nextId}`} className="absolute inset-0" aria-label="Xem chi tiết tour tiếp theo" />}
          </div>
        </div>
      </div>

      {/* BÓNG ĐỔ phân tách hero với section bên dưới */}
      <div className="absolute inset-x-0 bottom-0 h-16 z-[5] pointer-events-none bg-gradient-to-b from-transparent via-black/30 to-white" />

      {/* Dots chuyển slide */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {tours.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition ${i === current ? "bg-amber-500 scale-110" : "bg-white/70 hover:bg-white"}`}
            aria-label={`Chuyển đến slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
