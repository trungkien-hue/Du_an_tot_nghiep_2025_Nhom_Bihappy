// src/Pages/HotelDetail/HotelImagesSection.jsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, Reorder } from "framer-motion";
import hotelImageApi from "../../services/hotelImageApi";

/* ================= Helpers ================= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
function resolveImageUrl(u) {
  if (!u) return "/images/default-hotel.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
}

// Đọc role từ localStorage + (fallback) giải mã JWT nếu có
function tryParse(json) { try { return JSON.parse(json); } catch { return null; } }
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}
function readAuthRole() {
  const packed = tryParse(localStorage.getItem("auth"));
  const role1 =
    packed?.user?.Role ?? packed?.user?.role ?? packed?.user?.RoleName ?? packed?.user?.roleName;
  if (role1) return Array.isArray(role1) ? role1[0] : role1;

  const u = tryParse(localStorage.getItem("vt_user")) ?? tryParse(localStorage.getItem("user"));
  const role2 = u?.Role ?? u?.role ?? u?.RoleName ?? u?.roleName;
  if (role2) return Array.isArray(role2) ? role2[0] : role2;

  const jwt = localStorage.getItem("vt_auth_token") || localStorage.getItem("token") || localStorage.getItem("access_token");
  if (jwt) {
    const p = decodeJwtPayload(jwt);
    const r = p?.role || p?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || p?.roles;
    if (r) return Array.isArray(r) ? r[0] : r;
  }
  return null;
}

/* ========== Motion variants ========== */
const EASING = [0.22, 0.61, 0.36, 1];
const fadeIn   = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5, ease: EASING } } };
const fadeInUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASING } } };
const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };

/**
 * HotelImagesSection
 * - Admin: upload / set cover / delete / reorder
 * - Public: chỉ xem
 */
function HotelImagesSectionInner({ hotelId, readOnly, className = "" }, ref) {
  const role = useMemo(() => readAuthRole(), []);
  const isAdmin = String(role ?? "").toLowerCase() === "admin";
  const effectiveReadOnly = typeof readOnly === "boolean" ? readOnly : !isAdmin;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tag, setTag] = useState("");

  // input file ẩn để nút bên ngoài kích hoạt
  const fileInputRef = useRef(null);

  // expose cho trang cha
  useImperativeHandle(ref, () => ({
    openPicker: () => fileInputRef.current?.click(),
  }));

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await hotelImageApi.getAll(hotelId);
      let data = Array.isArray(res) ? res : res?.data || res?.items || [];
      data = data.filter((x) => (x.isDeleted ?? x.IsDeleted) !== true);
      data.sort(
        (a, b) =>
          (b.isPrimary ?? b.IsPrimary) - (a.isPrimary ?? a.IsPrimary) ||
          (a.sortOrder ?? a.SortOrder ?? 0) - (b.sortOrder ?? b.SortOrder ?? 0) ||
          (a.hotelImageID ?? a.HotelImageID) - (b.hotelImageID ?? b.HotelImageID)
      );
      setItems(data);
    } catch (e) {
      console.error(e);
      setErr("Không thể tải thư viện ảnh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelId == null) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  /* ===== Admin actions ===== */
  const onUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      await hotelImageApi.upload(hotelId, files, tag?.trim() || null);
      await load();
    } catch (e) {
      console.error(e);
      alert("Tải ảnh thất bại.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const setPrimary = async (imageId) => {
    try {
      await hotelImageApi.setPrimary(hotelId, imageId);
      await load();
    } catch (e) {
      console.error(e);
      alert("Không thể đặt ảnh cover.");
    }
  };

  const remove = async (imageId) => {
    if (!confirm("Xóa ảnh này?")) return;
    try {
      await hotelImageApi.delete(hotelId, imageId);
      await load();
    } catch (e) {
      console.error(e);
      alert("Không thể xóa ảnh.");
    }
  };

  const onReorderCommit = async (newOrder) => {
    setItems(newOrder);
    const payload = newOrder.map((x, idx) => ({
      ImageId: x.hotelImageID ?? x.HotelImageID,
      SortOrder: idx * 10,
    }));
    try {
      await hotelImageApi.reorder(hotelId, payload);
    } catch (e) {
      console.error(e);
      load();
    }
  };

  /* ====== UI ====== */
  const HeaderAdmin = () => (
    <motion.div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3" variants={fadeIn}>
      <h3 className="text-lg font-semibold">Thư viện ảnh khách sạn</h3>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Tag ảnh (tuỳ chọn: room, pool...)"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-white/90 active:scale-[.98] transition"
          disabled={uploading}
          title="Thêm hình ảnh"
        >
          <span className="text-base leading-none">＋</span>
          {uploading ? "Đang tải..." : "Thêm hình ảnh"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />
      </div>
    </motion.div>
  );

  const SkeletonGrid = () => (
    <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" variants={stagger} initial={false} animate="show">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div key={i} variants={fadeInUp} className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-white/10 to-white/5 animate-pulse" />
      ))}
    </motion.div>
  );

  const EmptyState = () => (
    <motion.div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-2xl p-10 text-center" variants={fadeIn} initial={false} animate="show">
      Chưa có ảnh.
    </motion.div>
  );

  const PublicGrid = () => (
    <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" variants={stagger} initial={false} animate="show">
      {items.map((it, idx) => {
        const id = it.hotelImageID ?? it.HotelImageID;
        const imgUrl = resolveImageUrl(it.imageUrl || it.ImageUrl);
        const isCover = (it.isPrimary ?? it.IsPrimary) === true;
        return (
          <motion.figure
            key={id}
            variants={fadeInUp}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.35, ease: EASING }}
            className="relative group rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,.6)]"
          >
            <img
              src={imgUrl}
              alt={it.caption || `hotel-photo-${idx + 1}`}
              className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = "/images/default-hotel.jpg"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {(it.caption || it.tag) && (
              <figcaption className="absolute left-3 right-3 bottom-3 text-xs text-white/95 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition">
                {it.caption && <span>{it.caption}</span>}
                {it.caption && it.tag && <span> • </span>}
                {it.tag && <span className="uppercase">{it.tag}</span>}
              </figcaption>
            )}
            {isCover && (
              <span className="absolute top-2 left-2 rounded-full bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 shadow">COVER</span>
            )}
          </motion.figure>
        );
      })}
    </motion.div>
  );

  const AdminGrid = () => (
    <Reorder.Group axis="y" values={items} onReorder={onReorderCommit} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((it, idx) => {
        const id = it.hotelImageID ?? it.HotelImageID;
        const imgUrl = resolveImageUrl(it.imageUrl || it.ImageUrl);
        const isCover = (it.isPrimary ?? it.IsPrimary) === true;

        return (
          <Reorder.Item
            key={id}
            value={it}
            /* ✅ FIX: KHÔNG dùng as={motion.div} nữa */
            variants={fadeInUp}
            initial={false}
            animate="show"
            whileHover={{ y: -3 }}
            whileDrag={{ scale: 1.02, rotate: 0.2 }}
            transition={{ duration: 0.3, ease: EASING }}
            className="relative group rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,.6)] bg-black/20"
          >
            <img
              src={imgUrl}
              alt={it.caption || `hotel-photo-${idx + 1}`}
              className="h-48 w-full object-cover"
              loading="lazy"
              onError={(e) => (e.currentTarget.src = "/images/default-hotel.jpg")}
            />

            {/* Thanh hành động nhanh: Cover + Trash */}
            <div className="absolute inset-x-2 top-2 flex justify-between items-center pointer-events-none">
              <button
                onClick={() => setPrimary(id)}
                className={`pointer-events-auto px-2 py-1 text-xs rounded-md shadow ${isCover ? "bg-green-600 text-white" : "bg-white/90 text-gray-8 00 hover:bg-white"}`}
                title={isCover ? "Ảnh cover hiện tại" : "Đặt làm cover"}
              >
                {isCover ? "Cover" : "Đặt cover"}
              </button>

              <button
                onClick={() => remove(id)}
                className="pointer-events-auto h-8 w-8 grid place-items-center rounded-md bg-white/90 text-gray-800 hover:bg-white shadow"
                title="Xóa ảnh này"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4V4a1 1 0 0 1 1-1zm1 4H7v12h10V7h-3H10zm1 2h2v8h-2V9zm-4 0h2v8H7V9zm8 0h2v8h-2V9zM10 5v0h4V4h-4v1z" />
                </svg>
              </button>
            </div>

            {(it.caption || it.tag) && (
              <div className="absolute left-3 right-3 bottom-3 text-[11px] text-white/95 bg-black/45 backdrop-blur-sm px-2 py-1 rounded-md">
                {it.caption && <span>{it.caption}</span>}
                {it.caption && it.tag && <span> • </span>}
                {it.tag && <span className="uppercase">{it.tag}</span>}
              </div>
            )}
            {isCover && (
              <span className="absolute top-2 left-2 rounded-full bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 shadow">COVER</span>
            )}
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );

  return (
    <motion.div className={`rounded-2xl p-5 border bg-neutral-900 border-white/10 text-white backdrop-blur-sm ${className}`} variants={fadeIn} initial={false} animate="show">
      {!effectiveReadOnly && <HeaderAdmin />}

      <div className="mt-4">
        {loading ? (
          <SkeletonGrid />
        ) : err ? (
          <div className="text-sm text-red-400">{err}</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : effectiveReadOnly ? (
          <PublicGrid />
        ) : (
          <AdminGrid />
        )}
      </div>
    </motion.div>
  );
}

export default forwardRef(HotelImagesSectionInner);
