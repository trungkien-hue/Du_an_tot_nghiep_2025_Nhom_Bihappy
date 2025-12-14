// src/Pages/TourDetail/TourDetail.jsx
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import tourDetailAPI from "../../services/tourDetailAPI.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "https://localhost:7059";
const ASSET_BASE = API_BASE; // nếu ảnh cũng nằm cùng domain

function resolveImageUrl(u) {
  if (!u) return "/images/default-tour.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (url.startsWith("/api/")) url = url.slice(4);
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
}

function readAuthRole() {
  try {
    const packed = localStorage.getItem("auth");
    if (packed) {
      const obj = JSON.parse(packed);
      const role = obj?.user?.Role ?? obj?.user?.role ?? null;
      if (!role) return null;
      return String(Array.isArray(role) ? role[0] : role).toLowerCase();
    }
    const userRaw =
      localStorage.getItem("user") || localStorage.getItem("vt_user");
    if (userRaw) {
      const u = JSON.parse(userRaw);
      const role = u?.Role ?? u?.role ?? null;
      if (!role) return null;
      return String(Array.isArray(role) ? role[0] : role).toLowerCase();
    }
  } catch (e) {
    console.warn("readAuthRole(): lỗi đọc/parse localStorage", e);
  }
  return null;
}

/* =============== Lightbox overlay =============== */
function Lightbox({ open, images = [], index = 0, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;
  const src = images[index] ?? "/images/default-tour.jpg";
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <img
          src={src}
          alt={`preview-${index + 1}`}
          className="max-h-[88vh] max-w-[92vw] object-contain rounded-xl shadow-xl ring-1 ring-black/20 bg-white"
        />
        <button
          aria-label="Đóng"
          onClick={onClose}
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/90 hover:bg-white text-neutral-900 grid place-items-center shadow"
        >
          ✕
        </button>
        {images.length > 1 && (
          <>
            <button
              aria-label="Ảnh trước"
              onClick={onPrev}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 hover:bg-white text-neutral-900 grid place-items-center shadow"
            >
              ‹
            </button>
            <button
              aria-label="Ảnh sau"
              onClick={onNext}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 hover:bg-white text-neutral-900 grid place-items-center shadow"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}
/* ================================================= */

export default function ChiTietTour() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tour, setTour] = useState(null);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({
    name: "",
    rating: 5,
    text: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Ảnh review
  const [files, setFiles] = useState([]);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Booking form
  const [startDate, setStartDate] = useState("");
  const [guestCounts, setGuestCounts] = useState({ adult: 2, child: 0 });

  // Người đặt
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const _isAdmin = readAuthRole() === "admin";

  const money2 = (n) => Number(n || 0).toFixed(2);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

  /* ===== Load tour detail ===== */
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const res = await tourDetailAPI.getById(id);
        const data = res?.data ?? res;
        if (!mounted) return;
        setTour(data);
        setAvgRating(Number(data?.Rating || 0));
        setReviewCount(Number(data?.ReviewCount || 0));
      } catch (e) {
        if (!mounted) return;
        setErr(
          typeof e === "string" ? e : "Không tải được chi tiết tour"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  /* ===== Load reviews ===== */
  useEffect(() => {
    let mounted = true;
    async function loadReviews() {
      try {
        const res = await tourDetailAPI.getReviews(id);
        const list = res?.data ?? res;
        if (mounted) setReviews(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setReviews([]);
      }
    }
    loadReviews();
    return () => {
      mounted = false;
    };
  }, [id]);

  /* ===== Derived data from tour ===== */
  const includes = useMemo(
    () => tachDanhSach(tour?.Includes),
    [tour?.Includes]
  );
  const excludes = useMemo(
    () => tachDanhSach(tour?.Excludes),
    [tour?.Excludes]
  );
  const highlights = useMemo(
    () => tachDanhSach(tour?.Highlights),
    [tour?.Highlights]
  );
  const itineraryDays = useMemo(
    () => tachHanhTrinh(tour?.Itinerary),
    [tour?.Itinerary]
  );

  const currency = tour?.Currency ?? "VND";
  const basePrice = Number(tour?.Price ?? 0);
  const priceAdult = Number(tour?.PriceAdult ?? basePrice);
  const priceChild = Number(tour?.PriceChild ?? basePrice);
  const depositPercent = Number(tour?.DepositPercent ?? 30);

  const totalPrice = useMemo(() => {
    const a = clamp(guestCounts.adult, 0, 99) * priceAdult;
    const c = clamp(guestCounts.child, 0, 99) * priceChild;
    return a + c;
  }, [guestCounts, priceAdult, priceChild]);

  const depositDue = useMemo(
    () => (totalPrice * depositPercent) / 100,
    [totalPrice, depositPercent]
  );

  // ID tour hiện tại, dùng cho đặt tour / thanh toán
  const currentTourId = tour?.TourID ?? tour?.id ?? Number(id);

  /* ===== Đặt tour -> chuyển sang trang thanh toán ===== */
  function handleBook() {
    if (!startDate) return alert("Vui lòng chọn ngày khởi hành.");
    if (!fullName.trim()) return alert("Vui lòng nhập họ tên người đặt.");
    if (!phone.trim()) return alert("Vui lòng nhập số điện thoại.");

    if (!currentTourId) {
      alert(
        "Không tìm được TourID, vui lòng tải lại trang hoặc chọn lại tour."
      );
      return;
    }

    const payload = {
      type: "tour",

      // gửi đủ cả 2 key để PaymentPage/BE dùng
      TourID: currentTourId,
      tourId: currentTourId,

      productName: tour?.Name ?? tour?.Title ?? "Tour du lịch",
      startDate,
      guestCounts,
      totalPrice,
      depositDue,
      fullName: fullName.trim(),
      phone: phone.trim(),

      // thêm info nếu sau này cần
      priceAdult,
      priceChild,
      currency,
      depositPercent,
    };

    // route tới trang thanh toán
    navigate("/checkout", { state: payload });
  }

  /* ===== chọn ảnh review ===== */
  const handleSelectFiles = (e) => {
    const list = Array.from(e.target.files || []);
    const images = list.filter((f) => f.type.startsWith("image/")).slice(0, 6);
    setFiles(images);
  };

  /* ===== mở Lightbox ===== */
  const openLightbox = (imgs, startIndex = 0) => {
    const normalized = (imgs || []).map((im) => resolveImageUrl(im));
    if (!normalized.length) return;
    setLightboxImages(normalized);
    setLightboxIndex(
      Math.max(0, Math.min(startIndex, normalized.length - 1))
    );
    setLightboxOpen(true);
  };

  /* ===== gửi review ===== */
  async function handleSubmitReview(e) {
    e.preventDefault();
    const name = newReview.name.trim();
    const text = newReview.text.trim();
    const rating = gioiHan(Number(newReview.rating), 1, 5);
    if (!name || !text) return;

    try {
      setSubmitting(true);

      // Optimistic update
      const tempImgs = files.map((f) => URL.createObjectURL(f));
      const optimistic = {
        ReviewID: `temp-${Date.now()}`,
        UserName: name,
        Rating: rating,
        Comment: text,
        CreatedAt: new Date().toISOString(),
        Images: tempImgs,
      };
      setReviews((prev) => [optimistic, ...prev]);
      setReviewCount((c) => c + 1);
      setAvgRating((prevAvg) => {
        const list = [optimistic, ...reviews];
        const sum = list.reduce(
          (s, r) => s + Number(r.Rating ?? r.rating ?? 0),
          0
        );
        return list.length ? sum / list.length : prevAvg;
      });

      // Gửi multipart lên server
      const fd = new FormData();
      fd.append("TourId", String(id));
      fd.append("UserName", name);
      fd.append("Rating", String(rating));
      fd.append("Comment", text);
      files.forEach((f) => fd.append("Images", f));

      const resp = await fetch(`${API_BASE}/api/tour/reviews`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(msg || `HTTP ${resp.status}`);
      }

      // Đồng bộ lại từ server
      const [rvRes, tourRes] = await Promise.all([
        tourDetailAPI.getReviews(id),
        tourDetailAPI.getById(id),
      ]);
      setReviews(rvRes?.data ?? rvRes ?? []);
      const tdata = tourRes?.data ?? tourRes ?? {};
      setAvgRating(Number(tdata?.Rating || 0));
      setReviewCount(Number(tdata?.ReviewCount || 0));

      setNewReview({ name: "", rating: 5, text: "" });
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert("Gửi đánh giá thất bại!");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===== Guard render ===== */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-neutral-600">
        Đang tải chi tiết tour...
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center text-red-600">
        {err}
      </div>
    );
  }
  if (!tour) {
    return (
      <div className="min-h-screen grid place-items-center text-neutral-600">
        Không có dữ liệu tour.
      </div>
    );
  }

  const tourId = tour.TourID ?? tour.id;

  /* ===== JSX ===== */
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={resolveImageUrl(tour.ImageURL)}
            alt={tour.Name}
            className="h-[70vh] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-[70vh] grid content-end pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-white drop-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl lg:text-6xl font-extrabold mb-4 leading-tight !text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]">
                    {tour.Name}
                  </h1>
                  <p className="max-w-xl mb-6 !text-white/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    {tour.Location} • {tour.Category} • ⭐
                    {avgRating?.toFixed?.(1) ?? avgRating} ({reviewCount})
                  </p>
                </div>

                {_isAdmin && (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => navigate(`/admin/tours?create=1`)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
                    >
                      + Thêm tour
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/admin/tours?editId=${tourId}`)
                        }
                        className="rounded-lg bg-yellow-500 px-3 py-2 text-white hover:bg-yellow-600"
                      >
                        Sửa tour này
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/admin/tours?deleteId=${tourId}`)
                        }
                        className="rounded-lg bg-rose-600 px-3 py-2 text-white hover:bg-rose-700"
                      >
                        Xoá tour này
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {highlights.map((h) => (
                  <span
                    key={h}
                    className="text-xs bg-white/20 border border-white/30 px-2 py-1 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Nội dung */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 lg:grid-cols-3">
        {/* Trái */}
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold">Tổng quan</h2>
            <p className="mt-3 text-neutral-700 leading-relaxed">
              {tour.Description}
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <ThongTin label="Điểm khởi hành" value={tour.StartLocation} />
              <ThongTin label="Điểm kết thúc" value={tour.EndLocation} />
              <ThongTin
                label="Thời lượng"
                value={`${tour.DurationDays ?? ""} ngày`}
              />
              <ThongTin
                label="Số lượng tối đa"
                value={`${tour.MaxGroupSize ?? ""} người`}
              />
              <ThongTin label="Phương tiện" value={tour.TransportType} />
              <ThongTin
                label="Bao gồm HDV"
                value={tour.GuideIncluded ? "Có" : "Không"}
              />
            </dl>
          </section>

          <section className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold">Hành trình</h2>
            <ol className="mt-4 space-y-4 list-decimal list-inside">
              {itineraryDays.map((d, i) => (
                <li key={i} className="leading-relaxed text-neutral-700">
                  {d}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold">Bao gồm</h3>
                <ul className="mt-3 space-y-2">
                  {includes.map((x, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-neutral-700"
                    >
                      <span aria-hidden>✔️</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Không bao gồm</h3>
                <ul className="mt-3 space-y-2">
                  {excludes.map((x, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-neutral-700"
                    >
                      <span aria-hidden>⛔</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {tour.Notes && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">Ghi chú</h3>
                <p className="mt-2 text-neutral-700 leading-relaxed">
                  {tour.Notes}
                </p>
              </div>
            )}
          </section>

          {/* Đánh giá */}
          <section className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold">Đánh giá</h2>

            <form
              onSubmit={handleSubmitReview}
              className="mt-4 grid gap-3 sm:grid-cols-3"
            >
              <input
                className="rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Tên của bạn"
                value={newReview.name}
                onChange={(e) =>
                  setNewReview((r) => ({ ...r, name: e.target.value }))
                }
                required
              />
              <select
                className="rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                value={newReview.rating}
                onChange={(e) =>
                  setNewReview((r) => ({
                    ...r,
                    rating: Number(e.target.value),
                  }))
                }
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-sm text-neutral-600 mb-1">
                  Ảnh (tối đa 6)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSelectFiles}
                  className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-neutral-300 file:bg-white hover:file:border-neutral-400"
                />
              </div>

              <textarea
                className="sm:col-span-3 rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Chia sẻ trải nghiệm của bạn..."
                value={newReview.text}
                onChange={(e) =>
                  setNewReview((r) => ({ ...r, text: e.target.value }))
                }
                rows={3}
                required
              />

              {files.length > 0 && (
                <div className="sm:col-span-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                  {files.map((f, i) => {
                    const url = URL.createObjectURL(f);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox([url], 0)}
                        className="aspect-square rounded-lg overflow-hidden ring-1 ring-neutral-200 hover:ring-neutral-300"
                        title="Xem ảnh lớn"
                      >
                        <img
                          src={url}
                          alt={`preview-${i}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 disabled:opacity-60"
              >
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>

            <ul className="mt-6 space-y-4">
              {reviews.map((rv, idx) => {
                const imgs = Array.isArray(rv.Images) ? rv.Images : [];
                const normalized = imgs.map((im) => resolveImageUrl(im));
                return (
                  <li
                    key={rv.ReviewID ?? rv.id ?? `rv-${idx}`}
                    className="border border-neutral-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify_between">
                      <div className="font-medium">
                        {rv.UserName ?? rv.name ?? "Ẩn danh"}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {(rv.CreatedAt ?? rv.date)
                          ? String(rv.CreatedAt ?? rv.date)
                              .toString()
                              .slice(0, 10)
                          : ""}
                      </div>
                    </div>
                    <div
                      className="mt-1 text-amber-600"
                      aria-label={`${rv.Rating ?? rv.rating} trên 5 sao`}
                    >
                      {"★".repeat(rv.Rating ?? rv.rating ?? 0)}
                      {"☆".repeat(5 - (rv.Rating ?? rv.rating ?? 0))}
                    </div>
                    <p className="mt-2 text-neutral-700 leading-relaxed">
                      {rv.Comment ?? rv.text}
                    </p>

                    {normalized.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                        {normalized.map((src, i2) => (
                          <button
                            key={i2}
                            type="button"
                            onClick={() => openLightbox(normalized, i2)}
                            className="block aspect-square rounded-lg overflow-hidden ring-1 ring-neutral-200 hover:ring-neutral-300"
                            title="Xem ảnh lớn"
                          >
                            <img
                              src={src}
                              alt={`rv-${i2}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Phải: Giá & Đặt tour */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl bg-white border border-neutral-200 shadow-sm p-6">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                Tên tour
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-neutral-50 text-neutral-700"
                value={tour?.Name ?? ""}
                readOnly
              />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {currency} {money2(priceAdult)}
                </div>
                <div className="text-sm text-neutral-600">
                  Giá cơ bản / người lớn
                </div>
              </div>
              <div className="text-sm text-neutral-700">
                Cọc {depositPercent}%
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <p className="text-center text-neutral-800 font-medium">
                Chọn ngày khởi hành
              </p>
              <input
                type="date"
                className="rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3 mt-2">
                <NumberInput
                  label="Người lớn"
                  value={guestCounts.adult}
                  min={1}
                  onChange={(v) =>
                    setGuestCounts((s) => ({ ...s, adult: clamp(v, 1, 99) }))
                  }
                />
                <NumberInput
                  label="Trẻ em"
                  value={guestCounts.child}
                  min={0}
                  onChange={(v) =>
                    setGuestCounts((s) => ({ ...s, child: clamp(v, 0, 99) }))
                  }
                />
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    Họ tên người đặt
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <hr className="my-4 border-neutral-200" />

              <div className="text-sm">
                <Row
                  label="Người lớn"
                  value={`${guestCounts.adult} × ${currency} ${money2(
                    priceAdult
                  )}`}
                />
                <Row
                  label="Trẻ em"
                  value={`${guestCounts.child} × ${currency} ${money2(
                    priceChild
                  )}`}
                />
                <Row
                  label="Tổng"
                  value={`${currency} ${money2(totalPrice)}`}
                  bold
                />
                <Row
                  label={`Tiền cọc ${depositPercent}%`}
                  value={`${currency} ${money2(depositDue)}`}
                />
              </div>

              <button
                onClick={handleBook}
                className="mt-4 w-full rounded-xl bg-neutral-900 text-white px-4 py-3 hover:bg-neutral-800"
              >
                Đặt tour ngay
              </button>
              <p className="text-xs text-neutral-500 mt-2">
                {tour.CancellationPolicy}
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* Lightbox Overlay */}
      <Lightbox
        open={lightboxOpen}
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() =>
          setLightboxIndex(
            (i) => (i - 1 + lightboxImages.length) % lightboxImages.length
          )
        }
        onNext={() =>
          setLightboxIndex((i) => (i + 1) % lightboxImages.length)
        }
      />
    </div>
  );
}

/* ===== Small helpers ===== */

function ThongTin({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={`text-neutral-600 ${
          bold ? "font-semibold text-neutral-800" : ""
        }`}
      >
        {label}
      </span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function NumberInput({ label, value, min = 0, onChange }) {
  const clamp = (n, mi, ma) => Math.max(mi, Math.min(ma, Number(n) || 0));
  const set = (v) => onChange(clamp(v, min, 99));
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1 flex items-center rounded-xl border border-neutral-300 overflow-hidden">
        <button
          type="button"
          className="px-3 py-2 text-lg"
          onClick={() => set((value || 0) - 1)}
          aria-label={`Giảm ${label}`}
        >
          –
        </button>
        <input
          type="number"
          className="w-full px-3 py-2 text-center focus:outline-none"
          min={min}
          max={99}
          value={value ?? min}
          onChange={(e) => set(e.target.value)}
        />
        <button
          type="button"
          className="px-3 py-2 text-lg"
          onClick={() => set((value || 0) + 1)}
          aria-label={`Tăng ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function tachDanhSach(str) {
  if (!str) return [];
  return String(str)
    .split(/\n|;|•|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tachHanhTrinh(str) {
  if (!str) return [];
  return String(str)
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map((s) => s.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean);
}

function gioiHan(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
