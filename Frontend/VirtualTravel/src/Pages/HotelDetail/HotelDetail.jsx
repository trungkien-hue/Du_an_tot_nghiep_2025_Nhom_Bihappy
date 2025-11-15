// src/Pages/HotelDetail/HotelDetail.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import detailApi from "../../services/detailApi";
import hotelService from "../../services/hotelApi";
import FormBooking from "../FormBooking/FormBooking";
import HotelImagesSection from "./HotelImagesSection";

/* ================= Helpers ================= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const API_BASE = ASSET_BASE;
function resolveImageUrl(u) {
  if (!u) return "/images/default-hotel.jpg";
  u = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(u)) return u;
  if (!u.startsWith("/")) u = "/" + u;
  return `${ASSET_BASE}${u}`;
}


/* ==== Motion variants ==== */
const EASING = [0.22, 0.61, 0.36, 1];
const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.6, ease: EASING } } };
const fadeInUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASING } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };

/* ==== ✅ LOGIC MỚI (daily): Availability helpers ==== */
function* days(ci, co) {
  const start = new Date(ci); const end = new Date(co);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}
function normalizeDaily(av) {
  // chấp nhận cả dữ liệu cũ lẫn mới; ưu tiên field Date
  const date = (av?.Date ?? av?.date ?? "").toString().slice(0, 10);
  const checkin = av?.Checkin ?? av?.checkin;
  const _checkout = av?.Checkout ?? av?.checkout;
  if (date) return { date, available: Number(av?.AvailableRooms || 0), price: Number(av?.Price || 0) };
  // fallback nếu backend cũ (range) — coi như một đêm bắt đầu tại Checkin
  if (checkin) {
    const d = new Date(checkin).toISOString().slice(0, 10);
    return { date: d, available: Number(av?.AvailableRooms || 0), price: Number(av?.Price || 0) };
  }
  return null;
}
function buildDailyMap(rt) {
  const avs = Array.isArray(rt?.Availabilities) ? rt.Availabilities : [];
  const map = new Map(); // date -> { available, price }
  for (const a of avs) {
    const n = normalizeDaily(a);
    if (!n || !n.date) continue;
    map.set(n.date, { available: n.available, price: n.price });
  }
  return map;
}
/** Trả về số phòng khả dụng nhỏ nhất trên toàn bộ dải ngày (min per-night) */
function minRoomsInRange(rt, checkin, checkout) {
  const map = buildDailyMap(rt);
  let min = Infinity;
  for (const d of days(checkin, checkout)) {
    const rec = map.get(d);
    const v = Number(rec?.available || 0);
    min = Math.min(min, v);
  }
  return Number.isFinite(min) ? min : 0;
}
/** Giá hiển thị cho dải — lấy giá của ngày đầu tiên nếu có */
function priceForFirstNight(rt, checkin) {
  const map = buildDailyMap(rt);
  const rec = map.get(new Date(checkin).toISOString().slice(0, 10));
  const p = Number(rec?.price ?? rt?.Price ?? 0);
  return Number.isFinite(p) ? p : 0;
}

function Stars({ value = 0, size = 16 }) {
  const count = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex" aria-label={`${count}/5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} className={i < count ? "fill-yellow-400" : "fill-white/20"}>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}
function StarPicker({ value, onChange, size = 24 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button key={n} type="button" aria-label={`Chọn ${n} sao`} onClick={() => onChange(n)}
          whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.95 }} className="transition">
          <svg viewBox="0 0 24 24" width={size} height={size} className={n <= value ? "fill-yellow-400" : "fill-white/20"}>
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </motion.button>
      ))}
    </div>
  );
}

/* ================= Gallery ================= */
function Gallery({ images }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;
  const wrapRef = useRef(null);
  const go = (n) => setIdx((p) => (p + n + total) % total);
  const goTo = (i) => setIdx(i);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    let startX = 0, dx = 0;
    const onStart = (e) => (startX = e.touches ? e.touches[0].clientX : e.clientX);
    const onMove = (e) => (dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX);
    const onEnd = () => { if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); startX = 0; dx = 0; };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [total]);

  return (
    <motion.div ref={wrapRef} className="relative rounded-2xl overflow-hidden group shadow-[0_30px_80px_-30px_rgba(0,0,0,.45)]"
      initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fadeIn}>
      <div className="relative h-[84vh] md:h-[84vh] w-full overflow-hidden">
        {images.map((src, i) => {
          const offset = (i - idx) * 100; const active = i === idx;
          return (
            <motion.img key={i} src={src} alt={`slide-${i + 1}`}
              className={`absolute inset-0 h-full w-full object-cover ${active ? "opacity-100" : "opacity-0"}`}
              style={{ transform: `translateX(${offset}%) scale(${active ? 1.06 : 1.02})` }}
              transition={{ duration: 0.9, ease: EASING }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/default-hotel.jpg"; }}
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/45 to-black/80 pointer-events-none" />
        {total > 1 && (
          <>
            <motion.button onClick={() => go(-1)} aria-label="Trước" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              className="opacity-0 group-hover:opacity-100 transition absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-xl bg-black/35 backdrop-blur-lg text-white grid place-items-center hover:bg-black/55">‹</motion.button>
            <motion.button onClick={() => go(1)} aria-label="Sau" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              className="opacity-0 group-hover:opacity-100 transition absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-xl bg-black/35 backdrop-blur-lg text-white grid place-items-center hover:bg-black/55">›</motion.button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute left-0 right-0 -bottom-3 md:bottom-4 px-4 md:px-6">
          <div className="mx-auto max-w-6xl flex gap-2 md:gap-3 justify-center">
            {images.map((src, i) => (
              <motion.button key={i} onClick={() => goTo(i)} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`h-12 w-16 md:h-16 md:w-24 rounded-lg overflow-hidden ring-2 transition ${
                  i === idx ? "ring-yellow-400" : "ring-white/10 hover:ring-white/30"}`}>
                <img src={src} className="h-full w-full object-cover" alt={`thumb-${i + 1}`} />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ================= RoomType Card ================= */
function RoomTypeCard({ name, description, capacity, price }) {
  const priceText = price != null ? `${Number(price).toLocaleString()}₫ / đêm` : "Giá liên hệ";
  return (
    <motion.div className="rounded-2xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent"
      variants={fadeInUp} whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.3, ease: EASING }}>
      <div className="rounded-2xl h-full bg-white/5 border border-white/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-extrabold !text-white">{name}</h3>
          <span className="shrink-0 rounded-full bg-yellow-400/15 text-yellow-300 px-3 py-1 text-xs font-semibold">
            {priceText}
          </span>
        </div>
        {description && <p className="mt-2 text-sm text-white/80 leading-relaxed">{description}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {capacity != null && <span className="rounded-full bg-white/10 px-3 py-1 text-white/85">Sức chứa {capacity}</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= Lightbox ================= */
function Lightbox({ open, images = [], index = 0, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); if (e.key === "ArrowLeft") onPrev?.(); if (e.key === "ArrowRight") onNext?.(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;
  const src = images[index] ?? "/images/default-hotel.jpg";
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <img src={src} alt={`review-${index + 1}`} className="max-h-[88vh] max-w-[92vw] object-contain rounded-xl shadow-xl ring-1 ring-white/10" />
        <button aria-label="Đóng" onClick={onClose} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center ring-1 ring-white/20">✕</button>
        {images.length > 1 && (
          <>
            <button aria-label="Ảnh trước" onClick={onPrev} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center ring-1 ring-white/20">‹</button>
            <button aria-label="Ảnh sau" onClick={onNext} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center ring-1 ring-white/20">›</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Booking card (sticky) ================= */
function BookingCard({
  hotel, checkin, checkout, guests,
  setCheckin, setCheckout, setGuests, onCheck, onBook, availResult, isChecking,
}) {
  const pricePerNight = hotel?.PricePerNight ?? hotel?.pricePerNight;
  return (
    <motion.aside className="sticky top-24 bg-white/5 border border-white/10 rounded-2xl p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,.4)]"
      variants={fadeInUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      <div className="flex items-baseline gap-2">
        {pricePerNight != null ? (
          <>
            <span className="text-2xl font-extrabold text-yellow-400">{Number(pricePerNight).toLocaleString()}₫</span>
            <span className="opacity-70">/ đêm</span>
          </>
        ) : (
          <span className="text-lg font-semibold text-yellow-400">Giá liên hệ</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs opacity-70 mb-1">Nhận phòng</label>
          <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 outline-none focus:border-yellow-400" />
        </div>
        <div>
          <label className="block text-xs opacity-70 mb-1">Trả phòng</label>
          <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 outline-none focus:border-yellow-400" />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs opacity-70 mb-1">Số khách</label>
        <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 outline-none focus:border-yellow-400" />
      </div>

      <motion.button onClick={onCheck} whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }}
        className="mt-4 w-full rounded-xl bg-yellow-400 text-black font-semibold px-4 py-3 hover:bg-yellow-300 disabled:opacity-60"
        disabled={!checkin || !checkout || isChecking}>
        {isChecking ? "Đang kiểm tra..." : "Kiểm tra phòng trống"}
      </motion.button>

      <AnimatePresence mode="wait">
        {availResult && (
          <motion.p key={availResult} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
            className={`mt-2 text-sm ${availResult === "ok" ? "text-green-400" : "text-red-400"}`}>
            {availResult === "ok" ? "Còn phòng cho khoảng ngày đã chọn." : "Hết phòng cho khoảng ngày đã chọn."}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button onClick={onBook} whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }}
        className="mt-3 w-full rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 py-3 disabled:bg-gray-600 disabled:cursor-not-allowed"
        disabled={!checkin || !checkout || availResult === "no"}>
        Đặt phòng
      </motion.button>

      <p className="mt-3 text-xs opacity-70">* Bạn cần chọn ngày để kiểm tra/đặt phòng.</p>
    </motion.aside>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="h-[60vh] w-full bg-neutral-800 animate-pulse" />
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-10 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="h-10 bg-neutral-800 rounded animate-pulse" />
          <div className="h-36 bg-neutral-800 rounded animate-pulse" />
          <div className="h-72 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="h-80 bg-neutral-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

/* ================= MAIN ================= */
export default function HotelDetail() {
  const { id } = useParams();
  const imagesRef = useRef(null);


  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revFiles, setRevFiles] = useState([]);

  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);
  const [isChecking, setIsChecking] = useState(false);
  const [availResult, setAvailResult] = useState(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingData, setBookingData] = useState({
    fullName: "", phone: "", checkin: "", checkout: "", requests: "", roomTypeID: undefined, price: undefined,
  });

  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsList, setReviewsList] = useState([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchHotelDetail = async () => {
      try {
        const data = await detailApi.getHotelDetail(id);
        setHotel(data || null);
        setAvgRating(Number(data?.Rating || 0));
        setReviewCount(Number(data?.ReviewCount || 0));
        const base = Array.isArray(data?.Reviews ?? data?.reviews) ? data.Reviews ?? data.reviews : [];
        setReviewsList(base);
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu khách sạn.");
      } finally {
        setLoading(false);
      }
    };
    fetchHotelDetail();
  }, [id]);

  const mainImage = resolveImageUrl(hotel?.ImageURL ?? hotel?.imageURL);
  const images = useMemo(() => {
    const srcs = [];
    const imgs = hotel?.Images ?? hotel?.images;
    const gallery = hotel?.Gallery ?? hotel?.gallery;
    const photos = hotel?.Photos ?? hotel?.photos;
    if (Array.isArray(imgs)) srcs.push(...imgs.map(resolveImageUrl));
    if (Array.isArray(gallery)) srcs.push(...gallery.map(resolveImageUrl));
    if (Array.isArray(photos)) srcs.push(...photos.map(resolveImageUrl));
    if (mainImage) srcs.unshift(mainImage);
    const unique = Array.from(new Set(srcs));
    return unique.length ? unique : ["/images/default-hotel.jpg"];
  }, [hotel, mainImage]);

  const roomTypes = (hotel?.RoomTypes ?? hotel?.roomTypes) || [];

  // ✅ Kiểm tra phòng trống bằng daily model
  const handleCheckAvailability = async () => {
    if (!checkin || !checkout) return;
    setIsChecking(true);
    try {
      const data = await hotelService.searchAvailability({
        name: hotel?.Name ?? hotel?.name ?? "",
        location: hotel?.Location ?? hotel?.location ?? "",
        checkin, checkout,
      });
      const thisHotel = (data || []).find((h) =>
        String(h.HotelID ?? h.hotelID) === String(hotel.HotelID ?? hotel.hotelID)
      );
      const okRemote =
        thisHotel && (thisHotel.RoomTypes ?? thisHotel.roomTypes ?? []).length > 0;
      setAvailResult(okRemote ? "ok" : "no");
    } catch {
      setAvailResult("no");
    } finally {
      setIsChecking(false);
    }
  };

  const openBookingForm = () => {
    if (!checkin) return alert("Vui lòng chọn ngày nhận phòng!");
    if (!checkout) return alert("Vui lòng chọn ngày trả phòng!");

    const srcRoomTypes = hotel.RoomTypes ?? hotel.roomTypes ?? [];
    const hotelWithRoomTypes = {
      ...(hotel || {}),
      RoomTypes: srcRoomTypes.map((rt, index) => {
        const availableRooms = minRoomsInRange(rt, checkin, checkout); // ⭐ min theo từng đêm
        const price = priceForFirstNight(rt, checkin); // ⭐ giá đêm đầu
        return {
          RoomTypeID: rt.RoomTypeID ?? rt.roomTypeID ?? index + 1,
          Name: rt.Name ?? rt.name ?? rt.roomTypeName ?? "Không tên",
          Capacity: rt.Capacity ?? rt.capacity ?? rt.maxPeople ?? 1,
          Price: price,
          AvailableRooms: availableRooms,
        };
      }),
    };

    setSelectedHotel(hotelWithRoomTypes);
    setBookingData({
      fullName: "",
      phone: "",
      checkin,
      checkout,
      requests: "",
      roomTypeID: undefined,
      price: undefined,
    });
    setShowBookingForm(true);
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHotel || !bookingData.roomTypeID) {
      alert("Bạn phải chọn loại phòng.");
      return;
    }
    const payload = {
      hotelID: selectedHotel.HotelID ?? selectedHotel.hotelID,
      roomTypeID: bookingData.roomTypeID,
      hotelName: selectedHotel.Name ?? selectedHotel.name,
      checkInDate: bookingData.checkin,
      checkOutDate: bookingData.checkout,
      fullName: bookingData.fullName,
      phone: bookingData.phone,
      location: selectedHotel.Location ?? selectedHotel.location,
      requests: bookingData.requests,
      price: bookingData.price,
    };
    try {
      await hotelService.book(payload);
      alert("Đặt phòng thành công!");
      setShowBookingForm(false);
    } catch (err) {
      console.error("Lỗi khi đặt phòng:", err);
      alert("Đặt phòng thất bại. Vui lòng thử lại.");
    }
  };

  // ===== Review images =====
  function onSelectReviewFiles(e) {
    const imgs = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/")).slice(0, 6);
    setRevFiles(imgs);
  }
  const openLightbox = (imgs, startIndex = 0) => {
    const normalized = (imgs || []).map((im) => resolveImageUrl(im));
    if (!normalized.length) return;
    setLightboxImages(normalized);
    setLightboxIndex(Math.max(0, Math.min(startIndex, normalized.length - 1)));
    setLightboxOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!revComment.trim()) return;
    let optimistic = null;
    try {
      setSubmitting(true);
      const tempImages = revFiles.map((f) => URL.createObjectURL(f));
      optimistic = {
        ReviewID: `temp-${Date.now()}`,
        UserName: revName?.trim() || "Bạn",
        Rating: revRating,
        Comment: revComment.trim(),
        CreatedAt: new Date().toISOString(),
        Images: tempImages,
        __temp: true,
      };
      setReviewsList((prev) => {
        const next = [optimistic, ...prev];
        setReviewCount((c) => c + 1);
        const sum = next.reduce((s, r) => s + Number(r.Rating ?? r.rating ?? 0), 0);
        setAvgRating(next.length ? sum / next.length : 0);
        return next;
      });

      const fd = new FormData();
      fd.append("HotelId", String(id));
      if (revName?.trim()) fd.append("UserName", revName.trim());
      fd.append("Rating", String(revRating));
      fd.append("Comment", revComment.trim());
      revFiles.forEach((f) => fd.append("Images", f));

      const resp = await fetch(`${API_BASE}/api/hoteltourdetail/reviews`, { method: "POST", body: fd, credentials: "include" });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(msg || `HTTP ${resp.status}`);
      }
      const [reviewList, refreshed] = await Promise.all([detailApi.getReviews(id), detailApi.getHotelDetail(id)]);
      const finalList = Array.isArray(reviewList) ? reviewList : reviewList?.data || [];
      setReviewsList(finalList);
      setAvgRating(Number(refreshed?.Rating || 0));
      setReviewCount(Number(refreshed?.ReviewCount || 0));

      try { optimistic.Images?.forEach((u) => URL.revokeObjectURL(u)); } catch (e) {e}
      setRevName(""); setRevRating(5); setRevComment(""); setRevFiles([]);
    } catch (err) {
      console.error(err);
      alert("Gửi đánh giá thất bại.");
      try {
        const reviewList = await detailApi.getReviews(id);
        const finalList = Array.isArray(reviewList) ? reviewList : reviewList?.data || [];
        setReviewsList(finalList);
      } catch (e) {e}
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Skeleton />;
  if (error) return <div className="min-h-screen grid place-items-center text-red-400">{error}</div>;
  if (!hotel) return <div className="min-h-screen grid place-items-center text-white">Không tìm thấy khách sạn.</div>;

  const hotelName = hotel?.Name ?? hotel?.name;
  const hotelLoc = hotel?.Location ?? hotel?.location;
  const hotelDesc = hotel?.Description ?? hotel?.description;
  const pricePerNight = hotel?.PricePerNight ?? hotel?.pricePerNight;
  const reviews = reviewsList || [];

  return (
    <main className="min-h-screen bg-neutral-900 text-white">
      <section className="relative">
        <Gallery images={images} />
        <div className="relative -mt-24 md:-mt-16">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <motion.div className="grid md:grid-cols-3 gap-8" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              <motion.div className="md:col-span-2" variants={fadeInUp}>
                <h1 className="text-4xl md:text-5xl font-black leading-[1.05] !text-white drop-shadow-[0_8px_32px_rgba(0,0,0,.6)]">
                  {hotelName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-yellow-400">
                      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    {avgRating.toFixed(1)} {reviewCount ? `(${reviewCount})` : ""}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white/80">
                      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" />
                    </svg>
                    {hotelLoc}
                  </span>
                  {pricePerNight != null && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-yellow-400/10 text-yellow-300 px-3 py-1 text-sm">
                      {Number(pricePerNight).toLocaleString()}₫ / đêm
                    </span>
                  )}
                </div>
                {hotelDesc && <p className="mt-4 max-w-3xl text-base md:text-lg opacity-90 leading-relaxed">{hotelDesc}</p>}
              </motion.div>

              <BookingCard
                hotel={hotel}
                checkin={checkin}
                checkout={checkout}
                guests={guests}
                setCheckin={setCheckin}
                setCheckout={setCheckout}
                setGuests={setGuests}
                onCheck={handleCheckAvailability}
                onBook={openBookingForm}
                availResult={availResult}
                isChecking={isChecking}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hình ảnh thực tế */}
      <section className="mt-10">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="relative">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl md:text-3xl font-extrabold !text-white">Hình ảnh thực tế</h2>
            </div>
            <HotelImagesSection ref={imagesRef} hotelId={Number(id)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
      </section>

      {/* Hạng phòng */}
      <section className="bg-neutral-950 mt-12">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-12 space-y-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-bold tracking-wide text-yellow-300/90 bg-yellow-400/10 px-2.5 py-1 rounded-full">
                Hạng phòng
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-extrabold !text-white">Tiện nghi & hạng phòng</h2>
              <p className="mt-2 text-white/70 text-sm">Chọn hạng phòng phù hợp nhu cầu của bạn. Giá hiển thị là giá tham khảo cho đêm đầu.</p>
            </div>
          </div>

          {(roomTypes || []).length > 0 ? (
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              {roomTypes.map((rt, i) => {
                const firstAvail = (rt.Availabilities ?? rt.availabilities ?? [])[0] || null;
                return (
                  <RoomTypeCard
                    key={rt.RoomTypeID ?? rt.roomTypeID ?? i}
                    name={rt.Name ?? rt.name}
                    description={rt.Description ?? rt.description ?? "Phòng tiêu chuẩn, tiện nghi cơ bản."}
                    capacity={rt.Capacity ?? rt.capacity}
                    price={firstAvail?.Price ?? firstAvail?.price}
                  />
                );
              })}
            </motion.div>
          ) : (
            <motion.div className="rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-white/5 to-transparent"
              variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <ul className="grid sm:grid-cols-2 gap-3 text-white/85 text-sm">
                  {[
                    "Standard — phòng tiêu chuẩn, 2 khách",
                    "Superior — rộng rãi hơn, 3 khách",
                    "Deluxe — nội thất sang, 3 khách",
                    "Suite — có phòng khách riêng, 4 khách",
                    "Family Room — phù hợp gia đình, 4–6 khách",
                    "Villa — biệt thự riêng tư, hồ bơi riêng",
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-yellow-300" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-6 md:px-10 pb-20">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl md:text-3xl font-extrabold !text-white">Đánh giá</h2>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Stars value={avgRating || 0} />
            <span>{avgRating.toFixed(1)}/5{reviewCount ? ` • ${reviewCount} lượt` : ""}</span>
          </div>
        </div>

        <form onSubmit={handleSubmitReview} className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm opacity-80 mb-1">Tên (không bắt buộc)</label>
              <input value={revName} onChange={(e) => setRevName(e.target.value)}
                placeholder="Nhập tên của bạn (tuỳ chọn)"
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="block text-sm opacity-80 mb-1">Đánh giá</label>
              <StarPicker value={revRating} onChange={setRevRating} />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm opacity-80 mb-1">Ảnh (tối đa 6)</label>
            <input type="file" accept="image/*" multiple onChange={onSelectReviewFiles}
              className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-white/20 file:bg-white/10 hover:file:border-white/40" />
          </div>

          {revFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
              {revFiles.map((f, i) => {
                const url = URL.createObjectURL(f);
                return (
                  <button type="button" key={i} onClick={() => openLightbox([url], 0)}
                    className="aspect-square rounded-lg overflow-hidden ring-1 ring-white/15" title="Xem ảnh lớn">
                    <img src={url} className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm opacity-80 mb-1">Nội dung đánh giá</label>
            <textarea value={revComment} onChange={(e) => setRevComment(e.target.value)} placeholder="Chia sẻ trải nghiệm của bạn..."
              rows={4} className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 outline-none focus:border-yellow-400" required />
          </div>

          <motion.button type="submit" disabled={submitting} whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-yellow-400 text-black font-semibold px-4 py-2 hover:bg-yellow-300 disabled:opacity-60">
            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
          </motion.button>
        </form>

        {reviews.length > 0 ? (
          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            {reviews.map((rv, idx) => {
              const imgs = Array.isArray(rv.Images) ? rv.Images : [];
              const normalized = imgs.map((im) => resolveImageUrl(im));
              return (
                <motion.div key={rv.ReviewID ?? rv.reviewID ?? `rv-${idx}`} variants={fadeInUp} whileHover={{ y: -3 }}
                  className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center">
                      <span className="text-sm font-bold">
                        {((rv.UserName ?? rv.userName) || "Ẩn danh").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{(rv.UserName ?? rv.userName) || "Ẩn danh"}</p>
                      <p className="text-xs opacity-70">
                        {rv.CreatedAt ?? rv.createdAt
                          ? new Date(rv.CreatedAt ?? rv.createdAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={Math.round(rv.Rating ?? rv.rating ?? 0)} />
                    <span className="text-sm opacity-80">
                      {(rv.Rating ?? rv.rating)?.toFixed ? (rv.Rating ?? rv.rating).toFixed(1) : rv.Rating ?? rv.rating}/5
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white/90">
                    {rv.Comment ?? rv.comment ?? "Không có nội dung đánh giá."}
                  </p>
                  {normalized.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                      {normalized.map((src, i2) => (
                        <button key={i2} type="button" onClick={() => openLightbox(normalized, i2)}
                          className="block aspect-square rounded-lg overflow-hidden ring-1 ring-white/15 hover:ring-white/30" title="Xem ảnh lớn">
                          <img src={src} className="h-full w-full object-cover" alt={`review-img-${i2 + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <p className="opacity-70 text-sm">Khách sạn này chưa có đánh giá nào.</p>
        )}
      </section>

      <Lightbox
        open={lightboxOpen}
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)}
        onNext={() => setLightboxIndex((i) => (i + 1) % lightboxImages.length)}
      />

      {showBookingForm && selectedHotel && (
        <FormBooking
          hotel={selectedHotel}
          bookingData={bookingData}
          onChange={handleBookingChange}
          onSubmit={handleBookingSubmit}
          onClose={() => setShowBookingForm(false)}
          today={today}
        />
      )}
    </main>
  );
}
