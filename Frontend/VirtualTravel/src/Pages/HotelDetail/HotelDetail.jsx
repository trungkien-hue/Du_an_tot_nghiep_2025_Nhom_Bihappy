// src/Pages/HotelDetail/HotelDetail.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import detailApi from "../../services/detailApi";
import hotelService from "../../services/hotelApi";
import RoomTypeFullCard from "./RoomTypeFullCard";
import FormBooking from "../FormBooking/FormBooking";
import HotelImagesSection from "./HotelImagesSection";

/* ================= Helpers ================= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const API_BASE = import.meta.env.VITE_API_BASE || ASSET_BASE;

// ====== SIMPLE DETAIL CACHE (60 phút) ======
const DETAIL_CACHE = {};
const DETAIL_TTL = 60 * 60 * 1000;

function cacheDetail(id, data) {
  DETAIL_CACHE[id] = { data, ts: Date.now() };
}

function getDetailFromCache(id) {
  const entry = DETAIL_CACHE[id];
  if (!entry) return null;
  if (Date.now() - entry.ts > DETAIL_TTL) {
    delete DETAIL_CACHE[id];
    return null;
  }
  return entry.data;
}

function resolveImageUrl(u) {
  if (!u) return "/images/default-hotel.jpg";
  u = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (!u.startsWith("/")) u = "/" + u;
  return `${ASSET_BASE}${u}`;
}

/* ==== Motion variants ==== */
const EASING = [0.22, 0.61, 0.36, 1];
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASING } },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASING } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* ==== Daily availability helpers ==== */
function* days(ci, co) {
  const start = new Date(ci);
  const end = new Date(co);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}

function normalizeDaily(av) {
  const date = (av?.Date ?? av?.date ?? "").toString().slice(0, 10);
  const checkin = av?.Checkin ?? av?.checkin;

  if (date)
    return {
      date,
      available: Number(av?.AvailableRooms || 0),
      price: Number(av?.Price || 0),
    };

  if (checkin) {
    const d = new Date(checkin).toISOString().slice(0, 10);
    return {
      date: d,
      available: Number(av?.AvailableRooms || 0),
      price: Number(av?.Price || 0),
    };
  }

  return null;
}

function buildDailyMap(rt) {
  const avs = Array.isArray(rt?.Availabilities) ? rt.Availabilities : [];
  const map = new Map();
  for (const a of avs) {
    const n = normalizeDaily(a);
    if (n?.date) map.set(n.date, { available: n.available, price: n.price });
  }
  return map;
}

function minRoomsInRange(rt, checkin, checkout) {
  const map = buildDailyMap(rt);
  let min = Infinity;
  for (const d of days(checkin, checkout)) {
    const v = Number(map.get(d)?.available || 0);
    min = Math.min(min, v);
  }
  return Number.isFinite(min) ? min : 0;
}

function priceForFirstNight(rt, checkin) {
  const map = buildDailyMap(rt);
  const rec = map.get(new Date(checkin).toISOString().slice(0, 10));
  const p = Number(rec?.price ?? rt?.Price ?? 0);
  return Number.isFinite(p) ? p : 0;
}

/* ================= Stars ================= */
function Stars({ value = 0, size = 16 }) {
  const count = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex" aria-label={`${count}/5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={i < count ? "fill-yellow-400" : "fill-white/20"}
        >
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
        <motion.button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={n <= value ? "fill-yellow-400" : "fill-white/20"}
          >
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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let startX = 0, dx = 0;

    const onStart = (e) =>
      (startX = e.touches ? e.touches[0].clientX : e.clientX);

    const onMove = (e) =>
      (dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX);

    const onEnd = () => {
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      dx = 0;
    };

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
    <motion.div
      ref={wrapRef}
      className="relative rounded-2xl overflow-hidden group shadow-[0_30px_80px_-30px_rgba(0,0,0,.45)]"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={fadeIn}
    >
      <div className="relative h-[84vh] md:h-[84vh] w-full overflow-hidden">
        {/* Ảnh nền */}
        {images.map((src, i) => {
          const offset = (i - idx) * 100;
          const active = i === idx;

          return (
            <motion.img
              key={i}
              src={src}
              className={`absolute inset-0 h-full w-full object-cover ${
                active ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transform: `translateX(${offset}%) scale(${active ? 1.06 : 1.02})`,
              }}
              transition={{ duration: 0.9, ease: EASING }}
              onError={(e) =>
                (e.currentTarget.src = "/images/default-hotel.jpg")
              }
            />
          );
        })}

        {/* OVERLAY LÀM TỐI + MỜ 4 VIỀN */}
        {/* nền tối chung */}
        <div className="pointer-events-none absolute inset-0 bg-black/30" />
        {/* gradient trái -> phải để chữ bên trái rõ hơn */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
        {/* vignette mờ 4 cạnh */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.8))]" />
        {/* gradient sát đáy cho thanh info phía dưới */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-black/40 to-black" />

        {/* Nút điều hướng */}
        {total > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/40 rounded-xl px-3 py-2 text-white backdrop-blur-lg"
            >
              ‹
            </button>

            <button
              onClick={() => go(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/40 rounded-xl px-3 py-2 text-white backdrop-blur-lg"
            >
              ›
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}


/* ================= Lightbox ================= */
function Lightbox({ open, images = [], index = 0, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;

  const src = images[index] ?? "/images/default-hotel.jpg";

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative h-full flex items-center justify-center p-4">
        <img
          src={src}
          className="max-h-[88vh] max-w-[92vw] object-contain rounded-xl shadow-xl"
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/10 text-white rounded-full w-10 h-10 grid place-items-center"
        >
          ✕
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 text-white rounded-full w-12 h-12"
            >
              ‹
            </button>

            <button
              onClick={onNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 text-white rounded-full w-12 h-12"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= BookingCard ================= */
function BookingCard({
  hotel,
  checkin,
  checkout,
  guests,
  setCheckin,
  setCheckout,
  setGuests,
  onCheck,
  onBook,
  availResult,
  isChecking,
}) {
  const pricePerNight = hotel?.PricePerNight ?? hotel?.pricePerNight;

  return (
    <motion.aside
      className="sticky top-24 bg-white/5 border border-white/10 rounded-2xl p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,.4)]"
      variants={fadeInUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="flex items-baseline gap-2">
        {pricePerNight != null ? (
          <>
            <span className="text-2xl font-extrabold text-yellow-400">
              {Number(pricePerNight).toLocaleString()}₫
            </span>
            <span className="opacity-70">/ đêm</span>
          </>
        ) : (
          <span className="text-lg font-semibold text-yellow-400">
            Giá liên hệ
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs opacity-70 mb-1">Nhận phòng</label>
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs opacity-70 mb-1">Trả phòng</label>
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs opacity-70 mb-1">Số khách</label>
        <input
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2"
        />
      </div>

      <button
        onClick={onCheck}
        className="mt-4 w-full rounded-xl bg-yellow-400 text-black font-semibold px-4 py-3 hover:bg-yellow-300"
        disabled={!checkin || !checkout || isChecking}
      >
        {isChecking ? "Đang kiểm tra..." : "Kiểm tra phòng trống"}
      </button>

      {availResult && (
        <p
          className={`mt-2 text-sm ${
            availResult === "ok" ? "text-green-400" : "text-red-400"
          }`}
        >
          {availResult === "ok"
            ? "Còn phòng cho khoảng ngày đã chọn."
            : "Hết phòng cho khoảng ngày đã chọn."}
        </p>
      )}

      <button
        onClick={onBook}
        className="mt-3 w-full rounded-xl bg-blue-500 text-white font-semibold px-4 py-3 hover:bg-blue-400 disabled:bg-gray-600"
        disabled={!checkin || !checkout || availResult === "no"}
      >
        Đặt phòng
      </button>

      <p className="mt-3 text-xs opacity-70">
        * Bạn cần chọn ngày để kiểm tra/đặt phòng.
      </p>
    </motion.aside>
  );
}

/* ================= Skeleton ================= */
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
  const cacheKey = String(id);

  const imagesRef = useRef(null);
  const [imagesSectionVisible, setImagesSectionVisible] = useState(false);

  /* ====== DATA STATE ====== */
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  /* ====== REVIEW STATE ====== */
  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [revFiles, setRevFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* ====== BOOKING STATE ====== */
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);

  const [isChecking, setIsChecking] = useState(false);
  const [availResult, setAvailResult] = useState(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);

  const [bookingData, setBookingData] = useState({
    fullName: "",
    phone: "",
    checkin: "",
    checkout: "",
    requests: "",
    roomTypeID: undefined,
    price: undefined,
  });
  const [preselectedRoom, setPreselectedRoom] = useState(null);
  // Danh sách tồn kho theo ngày lấy từ API search-availability
  const [availabilityByRoomType, setAvailabilityByRoomType] = useState([]);



  /* ====== POPUP CHỌN NGÀY ====== */
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [tempDates, setTempDates] = useState({
    checkin: "",
    checkout: "",
  });

  /* ====== RATING STATE ====== */
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsList, setReviewsList] = useState([]);

  /* ====== LIGHTBOX ====== */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  /* ================= APPLY API DATA ================= */
  const applyDetailData = (data) => {
    if (!data) {
      setHotel(null);
      setAvgRating(0);
      setReviewCount(0);
      setReviewsList([]);
      return;
    }

    setHotel(data);

    const r = Number(data?.Rating ?? 0);
    setAvgRating(r);

    const c = Number(data?.ReviewCount ?? 0);
    setReviewCount(c);

    const base = Array.isArray(data?.Reviews) ? data.Reviews : [];
    setReviewsList(base);
  };

  /* ================= LOAD 4 API NHANH ================= */
  const fetchHotelDetail = async () => {
    try {
      const cached = getDetailFromCache(cacheKey);
      if (cached) {
        applyDetailData(cached);
        return;
      }

      const basic = await detailApi.getBasic(id);
      const gallery = await detailApi.getGallery(id);
      const roomTypes = await detailApi.getRoomTypes(id);
      const reviews = await detailApi.getReviews(id);

      const galleryImages = [
        basic.ImageURL ? resolveImageUrl(basic.ImageURL) : "/images/default-hotel.jpg",
        ...gallery.map((g) => resolveImageUrl(g.ImageUrl)),
      ];

      const merged = {
        ...basic,
        RoomTypes: roomTypes ?? [],
        Reviews: reviews ?? [],
        Gallery: galleryImages,
      };

      cacheDetail(cacheKey, merged);
      applyDetailData(merged);
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu khách sạn.");
    }
  };

  /* ================= OBSERVER FOR IMAGES SECTION ================= */
  useEffect(() => {
    if (!imagesRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setImagesSectionVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(imagesRef.current);
    return () => observer.disconnect();
  }, []);

  /* ================= LOAD DETAIL ================= */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchHotelDetail();
      setLoading(false);
    })();
  }, [id]);

  // Khi đã có hotel + ngày checkin/checkout → gọi API để lấy tồn kho theo ngày
useEffect(() => {
  if (!hotel || !checkin || !checkout) return;

  (async () => {
    try {
      const res = await hotelService.searchAvailability({
        hotelId: hotel.HotelID,
        checkin,
        checkout,
        roomsNeeded: 1,
      });

      const list = res?.data ?? res;
      const h = list?.find(
        (x) => Number(x.HotelID) === Number(hotel.HotelID)
      );

      // Lưu RoomTypes từ API search-availability (đã có AvailableRooms + Availabilities)
      setAvailabilityByRoomType(h?.RoomTypes ?? []);
    } catch (err) {
      console.error("Lỗi khi load tồn kho theo ngày:", err);
      setAvailabilityByRoomType([]);
    }
  })();
}, [hotel, checkin, checkout]);

const handleSelectRoomType = (rt) => {
  // Nếu chưa chọn ngày → bắt buộc bật popup chọn ngày
  if (!checkin || !checkout) {
    setShowDatePopup(true);
    return;
  }

  // Lấy tồn kho từ dữ liệu search-availability
  const match = availabilityByRoomType.find(
    (x) => Number(x.RoomTypeID) === Number(rt.RoomTypeID)
  );
  const available = match?.AvailableRooms ?? 0;

  // Nếu hết phòng → không mở form, chỉ báo
  if (available <= 0) {
    alert(
      `❌ Loại phòng "${rt.Name ?? rt.name}" đã hết phòng cho ngày bạn chọn.`
    );
    return;
  }

  // Giá: ưu tiên từ search-availability nếu có, fallback về detail
  const price =
    match?.FinalPrice ??
    match?.Price ??
    rt.FinalPrice ??
    rt.Price ??
    rt.BasePrice ??
    0;

  // set booking data
  setBookingData({
    fullName: "",
    phone: "",
    requests: "",
    checkin,
    checkout,
    roomTypeID: rt.RoomTypeID ?? rt.roomTypeID,
    price,
    availableRooms: available,
  });

  // Chỉ giữ 1 roomtype trong selectedHotel để FormBooking dùng
  setSelectedHotel({
    ...hotel,
    RoomTypes: [rt],
  });

  // Gửi roomtype sang FormBooking (prefill)
  setPreselectedRoom(rt);
  setShowBookingForm(true);
};


  /* ================= CONFIRM POPUP DATES ================= */
  const confirmPopupDates = () => {
    if (!tempDates.checkin || !tempDates.checkout) {
      alert("Vui lòng chọn đầy đủ ngày!");
      return;
    }

    setCheckin(tempDates.checkin);
    setCheckout(tempDates.checkout);

    setShowDatePopup(false);
  };

  /* ================= CHECK AVAILABILITY ================= */
  const handleCheckAvailability = async () => {
    if (!checkin || !checkout) return;

    setIsChecking(true);
    try {
      const data = await hotelService.searchAvailability({
        hotelId: hotel?.HotelID,
        checkin,
        checkout,
        roomsNeeded: 1,
      });

      const thisHotel = data?.find((h) => String(h.HotelID) === String(hotel.HotelID));

      const okRemote = thisHotel && (thisHotel.RoomTypes?.length ?? 0) > 0;

      setAvailResult(okRemote ? "ok" : "no");
    } catch {
      setAvailResult("no");
    } finally {
      setIsChecking(false);
    }
  };

  /* ================= OPEN BOOKING FORM ================= */
  const openBookingForm = () => {
    if (!checkin || !checkout) {
      alert("Vui lòng chọn ngày trước!");
      return;
    }

    const src = hotel.RoomTypes ?? [];

    const mapped = src.map((rt, index) => {
      const availableRooms = minRoomsInRange(rt, checkin, checkout);
      const price = priceForFirstNight(rt, checkin);

      return {
        RoomTypeID: rt.RoomTypeID ?? index + 1,
        Name: rt.Name ?? "Không tên",
        Capacity: rt.Capacity ?? 1,
        Price: price,
        AvailableRooms: availableRooms,
      };
    });

    setSelectedHotel({
      ...hotel,
      RoomTypes: mapped,
    });

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

  /* ================= BOOK SUBMIT ================= */
  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({ ...prev, [name]: value }));
  };

const handleBookingSubmit = async (payload) => {
  if (!selectedHotel || !bookingData.roomTypeID) {
    alert("Bạn phải chọn loại phòng.");
    return;
  }

  try {
    await hotelService.book(payload);
    alert("Đặt phòng thành công!");
    setShowBookingForm(false);
  } catch (err) {
    console.error("Lỗi khi đặt phòng:", err);
    alert("Đặt phòng thất bại!");
  }
};

  /* ================= REVIEW IMAGE SELECT ================= */
  const onSelectReviewFiles = (e) => {
    const imgs = Array.from(e.target.files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 6);

    setRevFiles(imgs);
  };

  /* ================= LIGHTBOX OPEN ================= */
  const openLightbox = (imgs, startIndex = 0) => {
    const normalized = imgs.map((im) => resolveImageUrl(im));
    if (!normalized.length) return;

    setLightboxImages(normalized);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };
  /* ================= SUBMIT REVIEW ================= */
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!revComment.trim()) return;

    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("HotelId", String(id));
      if (revName.trim()) fd.append("UserName", revName.trim());
      fd.append("Rating", String(revRating));
      fd.append("Comment", revComment.trim());

      revFiles.forEach((f) => fd.append("Images", f));

      const resp = await fetch(`${API_BASE}/api/hoteltourdetail/reviews`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (!resp.ok) throw new Error("Gửi đánh giá thất bại.");

      /* ====== REVIEW LOCAL CHO HIỂN THỊ NGAY ====== */
      const newReview = {
        ReviewID: Date.now(),
        UserName: revName || "Ẩn danh",
        Rating: revRating,
        Comment: revComment,
        Images: revFiles.map((f) => URL.createObjectURL(f)),
        CreatedAt: new Date().toISOString(),
      };

      setReviewsList((prev) => [newReview, ...prev]);

      setReviewCount((prevCount) => {
        const newCount = prevCount + 1;
        setAvgRating((prevAvg) => {
          const total = prevAvg * prevCount;
          return (total + revRating) / newCount;
        });
        return newCount;
      });

      /* ====== UPDATE CACHE ====== */
      const cached = getDetailFromCache(cacheKey);
      if (cached) {
        const reviews = [...(cached.Reviews ?? [])];
        reviews.unshift(newReview);

        const updated = {
          ...cached,
          Reviews: reviews,
          ReviewCount: (cached.ReviewCount ?? 0) + 1,
          Rating: avgRating,
        };

        cacheDetail(cacheKey, updated);
      }

      /* RESET FORM */
      setRevName("");
      setRevRating(5);
      setRevComment("");
      setRevFiles([]);

    } catch (err) {
      console.error(err);
      alert("Gửi đánh giá thất bại! Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================== DATE POPUP COMPONENT ================== */
  const DatePopup = () => {
    if (!showDatePopup) return null;

    return (
      <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-md flex items-center justify-center">
        <div className="bg-white text-black p-6 rounded-2xl w-full max-w-md shadow-xl">
          <h2 className="text-xl font-bold text-center mb-4">
            Chọn ngày trước khi chọn phòng
          </h2>

          <div className="space-y-4">

            {/* NHẬN PHÒNG */}
            <div>
              <label className="font-semibold block mb-1">Ngày nhận phòng</label>
              <input
                type="date"
                className="w-full rounded-lg border p-2"
                value={tempDates.checkin}
                onChange={(e) =>
                  setTempDates((p) => ({ ...p, checkin: e.target.value }))
                }
              />
            </div>

            {/* TRẢ PHÒNG */}
            <div>
              <label className="font-semibold block mb-1">Ngày trả phòng</label>
              <input
                type="date"
                className="w-full rounded-lg border p-2"
                value={tempDates.checkout}
                onChange={(e) =>
                  setTempDates((p) => ({ ...p, checkout: e.target.value }))
                }
              />
            </div>

            {/* BUTTON */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded-lg"
                onClick={() => setShowDatePopup(false)}
              >
                Hủy
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                onClick={confirmPopupDates}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* RENDER POPUP TẠI ĐÂY — ĐÚNG VỊ TRÍ */
  const popupRender = <DatePopup />;

  /* ================== BẮT ĐẦU RETURN UI ================== */
  const hotelName = hotel?.Name ?? "";
  const hotelLoc = hotel?.Location ?? "";
  const hotelDesc = hotel?.Description ?? "";
  const pricePerNight = hotel?.PricePerNight ?? null;
// ========== FIX: MAIN IMAGE + GALLERY ==========
const mainImage = resolveImageUrl(hotel?.ImageURL ?? hotel?.imageURL);

const images = useMemo(() => {
  if (!hotel?.Gallery) return [mainImage];
  return hotel.Gallery.length ? hotel.Gallery : [mainImage];
}, [hotel, mainImage]);

// Room types list
const roomTypes = hotel?.RoomTypes ?? [];

  const reviews = reviewsList ?? [];
  return (
    <main className="min-h-screen bg-neutral-900 text-white">

      {/* Render popup chọn ngày */}
      {popupRender}

      {/* ================= HEADER + GALLERY ================= */}
      <section className="relative">
        <Gallery images={images} />

        <div className="relative -mt-24 md:-mt-16">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <motion.div
              className="grid md:grid-cols-3 gap-8"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {/* HOTEL INFO */}
              <motion.div className="md:col-span-2" variants={fadeInUp}>
                <h1 className="text-4xl md:text-5xl font-black leading-tight drop-shadow text-white">
                  {hotelName}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-3">

                  {/* Rating */}
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-yellow-400">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {avgRating.toFixed(1)} ({reviewCount})
                  </span>

                  {/* Location */}
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/80">
                      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
                    </svg>
                    {hotelLoc}
                  </span>

                  {/* Price */}
                  {pricePerNight !== null && (
                    <span className="px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 text-sm">
                      {Number(pricePerNight).toLocaleString()}₫ / đêm
                    </span>
                  )}
                </div>

                {/* Description */}
                {hotelDesc && (
                  <p className="mt-4 text-neutral-300 text-lg leading-relaxed">
                    {hotelDesc}
                  </p>
                )}
              </motion.div>

              {/* BOOKING SIDEBAR */}
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

      {/* ================== ROOM TYPES ================== */}
      <section className="mt-12 bg-neutral-950 py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl font-extrabold mb-6 text-yellow-500">Danh sách phòng & giá</h2>
{roomTypes.length === 0 ? (
  <p className="text-neutral-400">Khách sạn chưa có dữ liệu phòng.</p>
) : (
  roomTypes.map((rt, idx) => {
    // Nếu chưa chọn ngày → chưa biết tồn kho
    if (!checkin || !checkout) {
      return (
        <RoomTypeFullCard
          key={idx}
          rt={{ ...rt, AvailableRooms: null }}
          onSelect={handleSelectRoomType}
        />
      );
    }

    // Tìm tồn kho theo ngày từ API search-availability
    const match = availabilityByRoomType.find(
      (x) => Number(x.RoomTypeID) === Number(rt.RoomTypeID)
    );

    // Nếu không có trong API → xem như 0
    const available = match?.AvailableRooms ?? 0;

    return (
      <RoomTypeFullCard
        key={idx}
        rt={{ ...rt, AvailableRooms: available }}
        onSelect={handleSelectRoomType}
      />
    );
  })
)}
        </div>
      </section>

      {/* ================== GALLERY SECTION ================== */}
      <section className="mt-12" ref={imagesRef}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl font-extrabold mb-4 text-yellow-500">Hình ảnh thực tế</h2>
          <HotelImagesSection hotelId={Number(id)} />
        </div>
      </section> <br />

      {/* ================== REVIEWS ================== */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-extrabold text-yellow-500">Đánh giá</h2>
          <div className="flex items-center gap-2 text-neutral-300">
            <Stars value={avgRating} />
            <span>{avgRating.toFixed(1)} ({reviewCount})</span>
          </div>
        </div>

        {/* REVIEW FORM */}
        <form onSubmit={handleSubmitReview}
          className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-8">

          {/* Name + Rating */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-neutral-300 text-sm">Tên (không bắt buộc)</label>
              <input
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 mt-1"
                placeholder="Nhập tên của bạn"
              />
            </div>

            <div>
              <label className="text-neutral-300 text-sm ">Đánh giá</label>
              <StarPicker value={revRating} onChange={setRevRating} />
            </div>
          </div>

          {/* Images */}
          <div className="mt-4">
            <label className="text-neutral-300 text-sm">Ảnh (tối đa 6)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onSelectReviewFiles}
              className="mt-1 text-sm"
            />
          </div>

          {/* Selected images preview */}
          {revFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
              {revFiles.map((f, i) => {
                const url = URL.createObjectURL(f);
                return (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden">
                    <img src={url} className="object-cover w-full h-full" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment */}
          <div className="mt-4">
            <label className="text-neutral-300 text-sm">Nội dung đánh giá</label>
            <textarea
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 mt-1"
              rows={4}
              required
            />
          </div>

          <button
            disabled={submitting}
            className="mt-4 px-5 py-2 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-300"
          >
            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </form>

        {/* REVIEW LIST */}
        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rv, idx) => {
              const imgs = rv.Images ?? [];
              const normalized = imgs.map(resolveImageUrl);

              return (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  className="bg-white/5 border border-white/10 p-5 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="font-bold">
                        {(rv.UserName || "A").charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <p className="font-semibold">{rv.UserName || "Ẩn danh"}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(rv.CreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={Math.round(rv.Rating)} />
                    <span className="text-sm opacity-70">{rv.Rating}/5</span>
                  </div>

                  <p className="mt-3 text-neutral-200 text-sm">{rv.Comment}</p>

                  {normalized.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {normalized.map((src, imgIdx) => (
                        <button
                          key={imgIdx}
                          className="rounded-lg overflow-hidden aspect-square"
                          onClick={() => openLightbox(normalized, imgIdx)}
                        >
                          <img src={src} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-400">Chưa có đánh giá nào.</p>
        )}
      </section>

      {/* ================== LIGHTBOX ================== */}
      <Lightbox
        open={lightboxOpen}
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() =>
          setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)
        }
        onNext={() =>
          setLightboxIndex((i) => (i + 1) % lightboxImages.length)
        }
      />

      {/* ================== BOOKING FORM ================== */}
      {showBookingForm && selectedHotel && (
      <FormBooking
        hotel={selectedHotel}
        bookingData={bookingData}
        onChange={handleBookingChange}
        onSubmit={handleBookingSubmit}
        onClose={() => setShowBookingForm(false)}
        today={today}
        preselectedRoom={preselectedRoom}   // ⭐ Thêm dòng này
      />
    )}
    </main>
  );
}
