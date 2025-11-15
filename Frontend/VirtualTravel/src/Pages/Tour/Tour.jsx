import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import tourAPI from "../../services/tourAPI";
import HeroTourSlider from "../../Components/Slider/HeroTourSlider.jsx";

/* ================= Helpers ================= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const resolveImageUrl = (u) => {
  if (!u) return "/images/default-tour.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
};
const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return "Liên hệ";
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};
const normalizeVi = (s = "") =>
  String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const PAGE_SIZE = 9;

/* ================= UI bits ================= */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm overflow-hidden">
      <div className="h-48 w-full bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

function TourCard({ tour, onClick }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const id = tour.TourID ?? tour.tourID;
  const name = tour.Name ?? tour.name;
  const location = tour.Location ?? tour.location;
  const duration = tour.DurationDays ?? tour.durationDays;
  const image = resolveImageUrl(tour.ImageURL ?? tour.imageURL);
  const price = tour.Price ?? tour.price;

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="group rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
      onClick={() => onClick(id)}
    >
      <div className="relative overflow-hidden">
        <motion.img
          src={image}
          alt={name}
          className="h-48 w-full object-cover"
          loading="lazy"
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.4 }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3 rounded-full bg-white/95 text-gray-900 text-sm font-semibold px-3 py-1 shadow">
          {formatPrice(price)}/người
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
          {name}
        </h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {location} • {duration} ngày
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            featured
          </span>
          <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200">
            best price
          </span>
        </div>
      </div>
    </motion.article>
  );
}

/* ================= Page ================= */
export default function Tour() {
  const [tours, setTours] = useState([]);
  const [filteredTours, setFilteredTours] = useState([]);
  const [loading, setLoading] = useState(true);

  // search theo tên (trên thanh search)
  const [searchName, setSearchName] = useState("");
  const searchTimer = useRef(null);

  // === Bộ lọc: Địa điểm + Thanh kéo Giá ===
  const [locations, setLocations] = useState([]); // danh sách unique từ data
  const [selectedLocations, setSelectedLocations] = useState(new Set());

  const [priceDomain, setPriceDomain] = useState({ min: 0, max: 0 }); // all-data
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);

  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // load tours
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const data = await tourAPI.getAll();
        const arr = Array.isArray(data) ? data : [];
        setTours(arr);
        setFilteredTours(arr);

        // build location list
        const locs = Array.from(
          new Set(
            arr
              .map((t) => t.Location ?? t.location)
              .filter(Boolean)
              .map((s) => String(s).trim())
          )
        ).sort((a, b) => a.localeCompare(b, "vi"));
        setLocations(locs);

        // compute price domain
        const prices = arr
          .map((t) => Number(t.Price ?? t.price))
          .filter((n) => Number.isFinite(n));
        const min = prices.length ? Math.min(...prices) : 0;
        const max = prices.length ? Math.max(...prices) : 0;

        setPriceDomain({ min, max });
        setPriceMin(min);
        setPriceMax(max);
      } catch (error) {
        console.error("Lỗi khi tải danh sách tour:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTours();
  }, []);

  // search by name (debounce)
  const handleSearch = (e) => {
    const raw = e.target.value;
    setSearchName(raw);
    const value = normalizeVi(raw);

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters({ nameValue: value });
    }, 150);
  };

  // toggle location
  const toggleLocation = (loc) => {
    const next = new Set(selectedLocations);
    if (next.has(loc)) next.delete(loc);
    else next.add(loc);
    setSelectedLocations(next);
    applyFilters({ selectedLocations: next });
  };

  // change price sliders
  const onMinChange = (e) => {
    const val = Math.min(Number(e.target.value), priceMax); // không vượt quá max
    setPriceMin(val);
    applyFilters({ priceMin: val });
  };
  const onMaxChange = (e) => {
    const val = Math.max(Number(e.target.value), priceMin); // không thấp hơn min
    setPriceMax(val);
    applyFilters({ priceMax: val });
  };

  // áp dụng filters
  const applyFilters = ({
    priceMin: minArg,
    priceMax: maxArg,
    selectedLocations: locArg,
    nameValue,
  } = {}) => {
    const min = Number(minArg ?? priceMin);
    const max = Number(maxArg ?? priceMax);
    const name = (nameValue ?? normalizeVi(searchName)).trim();
    const locSet = locArg ?? selectedLocations;

    const filtered = tours.filter((t) => {
      // name
      const nm = normalizeVi(t.Name ?? t.name ?? "");
      if (name && !nm.includes(name)) return false;

      // location
      const loc = String(t.Location ?? t.location ?? "").trim();
      if (locSet.size > 0 && !locSet.has(loc)) return false;

      // price
      const p = Number(t.Price ?? t.price);
      if (!Number.isFinite(p)) return false;
      if (p < min || p > max) return false;

      return true;
    });

    setFilteredTours(filtered);
    setPage(1);
  };

  const resetFilters = () => {
    const { min, max } = priceDomain;
    setSelectedLocations(new Set());
    setPriceMin(min);
    setPriceMax(max);
    applyFilters({ selectedLocations: new Set(), priceMin: min, priceMax: max });
  };

  // phân trang
  const totalPages = Math.max(1, Math.ceil(filteredTours.length / PAGE_SIZE));
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTours.slice(start, start + PAGE_SIZE);
  }, [filteredTours, page]);

  const goTo = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    const el = document.getElementById("tour-list");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // tính phần trăm để vẽ progress giữa 2 nút slider
  const percent = (v) =>
    priceDomain.max === priceDomain.min
      ? 0
      : ((v - priceDomain.min) * 100) / (priceDomain.max - priceDomain.min);

  return (
    <>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <HeroTourSlider tours={tours} />
      </motion.div>

      {/* Thanh tìm kiếm */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="py-6 bg-white/80 backdrop-blur-md sticky top-16 z-20 shadow-sm"
      >
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4">
          <div className="relative w-full md:w-2/3">
            <input
              type="text"
              placeholder="Tìm tour (không dấu cũng được)…"
              value={searchName}
              onChange={handleSearch}
              className="w-full pl-11 pr-4 py-2.5 border rounded-xl bg-white/90 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Hiển thị</span>
            <span className="font-semibold text-gray-800">{pageData.length}</span>/<span>{filteredTours.length}</span>
          </div>
        </div>
      </motion.section>

      {/* Layout: Sidebar + List */}
      <section className="bg-gradient-to-b from-white to-amber-50/40 py-10" id="tour-list">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <div className="rounded-2xl border border-amber-100 bg-white/90 shadow-sm p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Bộ lọc</h3>

                <div className="space-y-6">
                  {/* Địa điểm */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Địa điểm</label>
                      {selectedLocations.size > 0 && (
                        <button
                          onClick={() => {
                            setSelectedLocations(new Set());
                            applyFilters({ selectedLocations: new Set() });
                          }}
                          className="text-xs text-amber-600 hover:underline"
                        >
                          Bỏ chọn
                        </button>
                      )}
                    </div>
                    {locations.length === 0 ? (
                      <p className="text-sm text-gray-400">Không có dữ liệu địa điểm</p>
                    ) : (
                      <ul className="max-h-52 overflow-auto space-y-1 pr-1">
                        {locations.map((loc) => {
                          const checked = selectedLocations.has(loc);
                          return (
                            <li key={loc} className="flex items-center gap-2">
                              <input
                                id={`loc-${loc}`}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLocation(loc)}
                                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <label
                                htmlFor={`loc-${loc}`}
                                className="text-sm text-gray-700 cursor-pointer select-none"
                              >
                                {loc}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Khoảng giá - dual range slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khoảng giá ({formatPrice(priceMin)} — {formatPrice(priceMax)})
                    </label>

                    {/* Track */}
                    <div className="relative h-10">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200" />
                      {/* Progress giữa 2 nút */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-amber-400"
                        style={{
                          left: `${percent(priceMin)}%`,
                          right: `${100 - percent(priceMax)}%`,
                        }}
                      />

                      {/* Two overlapped range inputs */}
                      <input
                        type="range"
                        min={priceDomain.min}
                        max={priceDomain.max}
                        value={priceMin}
                        onChange={onMinChange}
                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
                      />
                      <input
                        type="range"
                        min={priceDomain.min}
                        max={priceDomain.max}
                        value={priceMax}
                        onChange={onMaxChange}
                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
                      />
                    </div>

                    {/* Custom thumb styles (Tailwind can't style native thumb, dùng CSS inline) */}
                    <style>{`
                      input[type="range"] {
                        -webkit-appearance: none;
                        appearance: none;
                        height: 0;
                        outline: none;
                      }
                      input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 18px; height: 18px; border-radius: 9999px;
                        background: white; border: 2px solid #f59e0b; /* amber-500 */
                        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
                        cursor: pointer; position: relative; z-index: 10;
                      }
                      input[type="range"]::-moz-range-thumb {
                        width: 18px; height: 18px; border-radius: 9999px;
                        background: white; border: 2px solid #f59e0b;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
                        cursor: pointer; position: relative; z-index: 10;
                      }
                    `}</style>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{formatPrice(priceDomain.min)}</span>
                      <button
                        onClick={() => {
                          setPriceMin(priceDomain.min);
                          setPriceMax(priceDomain.max);
                          applyFilters({ priceMin: priceDomain.min, priceMax: priceDomain.max });
                        }}
                        className="px-2 py-1 rounded border border-gray-200 bg-white hover:border-amber-300"
                      >
                        Reset giá
                      </button>
                      <span>{formatPrice(priceDomain.max)}</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => applyFilters()}
                      className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
                    >
                      Áp dụng
                    </button>
                    <button
                      onClick={resetFilters}
                      className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-amber-300 transition"
                    >
                      Xóa lọc
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Danh sách Tour */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : filteredTours.length === 0 ? (
              <div className="text-center text-gray-500">Không có tour nào</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pageData.map((tour) => (
                    <TourCard
                      key={tour.TourID ?? tour.tourID}
                      tour={tour}
                      onClick={(id) => navigate(`/tours/${id}`)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="mt-10 flex items-center justify-center gap-2"
                >
                  <button
                    onClick={() => goTo(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50 hover:border-amber-400 hover:shadow-sm transition"
                  >
                    Trước
                  </button>
                  {Array.from({ length: Math.max(1, Math.ceil(filteredTours.length / PAGE_SIZE)) }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === Math.ceil(filteredTours.length / PAGE_SIZE))
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push("dots-" + p);
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item) =>
                      typeof item === "string" ? (
                        <span key={item} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => goTo(item)}
                          className={`px-3 py-2 rounded-lg text-sm border transition ${
                            item === page
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                              : "bg-white border-gray-200 hover:border-amber-400 hover:shadow-sm"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => goTo(page + 1)}
                    disabled={page === Math.max(1, Math.ceil(filteredTours.length / PAGE_SIZE))}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50 hover:border-amber-400 hover:shadow-sm transition"
                  >
                    Sau
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
