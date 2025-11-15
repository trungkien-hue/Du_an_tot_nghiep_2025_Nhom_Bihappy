import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import hotelService from "../../services/hotelApi";
import FormBooking from "../../Pages/FormBooking/FormBooking";
import "tailwindcss/tailwind.css";
import "../../index.css";
import HeroHotelSlider from "../../Components/Slider/HeroHotelSlider.jsx";

/* ================= Helpers ================= */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const resolveImageUrl = (u) => {
  if (!u) return "/images/default-hotel.jpg";
  u = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(u)) return u;
  if (!u.startsWith("/")) u = "/" + u;
  return `${ASSET_BASE}${u}`;
};
const formatVND = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
};
function getCreatedStamp(hotel) {
  const candidates = [
    hotel.CreatedAt,
    hotel.CreatedDate,
    hotel.CreatedOn,
    hotel.createdAt,
    hotel.created_date,
    hotel.created_on,
    hotel.InsertedAt,
    hotel.insertedAt,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const t = Date.parse(c);
    if (!Number.isNaN(t)) return t;
  }
  const id = Number(hotel.HotelID ?? hotel.hotelID ?? 0);
  return Number.isFinite(id) ? id : 0;
}
function sortByNewest(arr) {
  return [...arr].sort((a, b) => getCreatedStamp(b) - getCreatedStamp(a));
}
/** Giá hiển thị: ưu tiên MinPrice → PricePerNight → Price → rẻ nhất từ RoomTypes/Availabilities */
function getDisplayPrice(h) {
  const direct =
    h.MinPrice ?? h.minPrice ?? h.PricePerNight ?? h.pricePerNight ?? h.Price ?? h.price;
  if (direct != null && Number.isFinite(Number(direct))) return Number(direct);

  const rt = Array.isArray(h.RoomTypes) ? h.RoomTypes : [];
  let best = Number.POSITIVE_INFINITY;
  for (const r of rt) {
    const av = Array.isArray(r.Availabilities) ? r.Availabilities : [];
    if (av.length) {
      for (const a of av) {
        const p = Number(a?.Price);
        if (Number.isFinite(p) && p < best) best = p;
      }
    } else {
      const p = Number(r?.Price);
      if (Number.isFinite(p) && p < best) best = p;
    }
  }
  return Number.isFinite(best) ? best : undefined;
}
/* 🆕 Tính tổng số phòng còn trống (daily): cộng theo mọi bản ghi có Date */
function getTotalAvailableRooms(hotel) {
  const rts = Array.isArray(hotel?.RoomTypes) ? hotel.RoomTypes : [];
  let total = 0;
  for (const rt of rts) {
    const avs = Array.isArray(rt?.Availabilities) ? rt.Availabilities : [];
    if (avs.length > 0) {
      total += avs.reduce((sum, a) => sum + Number(a?.AvailableRooms || 0), 0);
    } else {
      total += Number(rt?.AvailableRooms || 0);
    }
  }
  return total;
}

/* =============== Centered Notice (popup giữa màn hình) =============== */
const CenterNotice = ({ text, type = "info", onClose }) => {
  if (!text) return null;
  const scheme = {
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    error: "bg-rose-50 text-rose-800 ring-rose-200",
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pointer-events-none">
      <div className="mt-10 pointer-events-auto px-4 w-full max-w-xl">
        <div className={`mx-auto rounded-2xl px-5 py-3 text-center shadow-lg ring-1 ${scheme}`}>
          <div className="font-semibold">{text}</div>
          <button
            onClick={onClose}
            className="mt-2 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm bg-white/70 hover:bg-white transition"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Hotel() {
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    name: "",
    location: "",
    checkin: "",
    checkout: "",
    priceLimit: 0,
  });
  const [, setSearched] = useState(false);
  const [, setHasFilter] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);

  const [bookingData, setBookingData] = useState({
    fullName: "",
    phone: "",
    checkin: "",
    checkout: "",
    requests: "",
    roomTypeID: "",
    price: 0,
    quantity: 1,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const today = new Date().toISOString().split("T")[0];

  /* 🆕 state thông báo giữa màn hình */
  const [notice, setNotice] = useState({ text: "", type: "info" });
  const showNotice = (text, type = "info", autoCloseMs = 2200) => {
    setNotice({ text, type });
    if (autoCloseMs) {
      setTimeout(() => setNotice({ text: "", type }), autoCloseMs);
    }
  };

  useEffect(() => {
    hotelService
      .getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.$values ?? [];
        const hotelsWithAvailability = list.map((hotel) => ({
          ...hotel,
          isAvailableForSearch: true,
          _precalcTotalRooms: getTotalAvailableRooms(hotel),
        }));
        const sorted = sortByNewest(hotelsWithAvailability);
        setHotels(sorted);
        setFilteredHotels(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu khách sạn:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const v = type === "range" ? Number(value) : value;
    setSearchParams((prev) => ({ ...prev, [name]: v }));
  };

  const clearFilters = () => {
    setSearchParams({ name: "", location: "", checkin: "", checkout: "", priceLimit: 0 });
    setSearched(false);
    setHasFilter(false);
    const reset = hotels.map((h) => ({ ...h, isAvailableForSearch: true }));
    setFilteredHotels(reset);
    setCurrentPage(1);
  };

  /* ================== SEARCH ================== */
  const handleSearch = (e) => {
    e.preventDefault();
    setSearched(true);

    // ⛔ BẮT BUỘC: nếu thiếu 1 trong 2 ngày thì chỉ show popup, KHÔNG gọi API
    if (!searchParams.checkin || !searchParams.checkout) {
      showNotice(
        "Vui lòng chọn đầy đủ ngày nhận phòng và trả phòng trước khi tìm kiếm.",
        "info"
      );
      return;
    }

    // Kiểm tra logic ngày nếu đã có đủ
    if (
      searchParams.checkin &&
      searchParams.checkout &&
      new Date(searchParams.checkout) <= new Date(searchParams.checkin)
    ) {
      showNotice("Ngày trả phòng phải sau ngày nhận phòng!", "error");
      return;
    }

    const hasAnyFilter =
      searchParams.name.trim() !== "" ||
      searchParams.location.trim() !== "" ||
      searchParams.checkin !== "" ||
      searchParams.checkout !== "" ||
      Number(searchParams.priceLimit) > 0;
    setHasFilter(hasAnyFilter);

    if (!hasAnyFilter) {
      const back = hotels.map((h) => ({ ...h, isAvailableForSearch: true }));
      setFilteredHotels(back);
      setCurrentPage(1);
      return;
    }

    const payload = {
      name: searchParams.name || "",
      location: searchParams.location || "",
      checkin: searchParams.checkin || null,
      checkout: searchParams.checkout || null,
    };

    hotelService
      .searchAvailability(payload)
      .then((data) => {
        if (!data || data.length === 0) {
          showNotice("Không tìm thấy khách sạn phù hợp!", "info");
          const back = hotels.map((h) => ({ ...h, isAvailableForSearch: true }));
          setFilteredHotels(back);
          setCurrentPage(1);
          return;
        }

        const afterPrice =
          Number(searchParams.priceLimit) > 0
            ? data.filter((hotel) => {
                const minPrice = getDisplayPrice(hotel);
                return (
                  minPrice != null &&
                  Number(minPrice) <= Number(searchParams.priceLimit) * 1000
                );
              })
            : data;

        const marked = afterPrice.map((hotel) => {
          const totalRooms = getTotalAvailableRooms(hotel);
          const isAvailable = totalRooms > 0 || (hotel.RoomTypes || []).length > 0;
          return { ...hotel, isAvailableForSearch: isAvailable, _searchTotalRooms: totalRooms };
        });

        const sorted = sortByNewest(marked);
        setFilteredHotels(sorted);
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Lỗi tìm kiếm khách sạn:", err);
        const back = hotels.map((h) => ({ ...h, isAvailableForSearch: true }));
        setFilteredHotels(back);
        showNotice("Lỗi khi tìm kiếm khách sạn. Vui lòng thử lại!", "error");
      });
  };

  const openBookingForm = (hotel) => {
    const hotelWithRoomTypes = {
      ...hotel,
      RoomTypes: (hotel.RoomTypes || []).map((rt) => {
        const avs = Array.isArray(rt.Availabilities) ? rt.Availabilities : [];
        // daily model: tổng khả dụng = tổng theo ngày (để hiển thị khái quát)
        const totalRooms = avs.reduce((s, a) => s + Number(a?.AvailableRooms || 0), 0);
        // giá hiển thị lấy min theo ngày
        const minPrice = avs.reduce((m, a) => {
          const p = Number(a?.Price);
          return Number.isFinite(p) ? Math.min(m, p) : m;
        }, Number.POSITIVE_INFINITY);
        return {
          RoomTypeID: rt.RoomTypeID,
          Name: rt.Name,
          Capacity: rt.Capacity,
          Price: Number.isFinite(minPrice) ? minPrice : Number(rt.Price) || 0,
          AvailableRooms: totalRooms || Number(rt.AvailableRooms || 0) || 0,
        };
      }),
    };

    setSelectedHotel(hotelWithRoomTypes);
    setBookingData({
      fullName: "",
      phone: "",
      checkin: searchParams.checkin || today,
      checkout: searchParams.checkout || searchParams.checkin || today,
      requests: "",
      roomTypeID: "",
      price: 0,
      quantity: 1,
    });
    setShowBookingForm(true);
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (payload) => {
    if (!selectedHotel || !payload?.roomTypeID) {
      showNotice("Bạn phải chọn khách sạn và loại phòng.", "error");
      return { success: false };
    }
    try {
      const body = {
        ...payload,
        hotelID: payload.hotelID ?? (selectedHotel.HotelID ?? selectedHotel.hotelID),
        hotelName: payload.hotelName ?? (selectedHotel.Name ?? selectedHotel.name),
        location: payload.location ?? (selectedHotel.Location ?? selectedHotel.location),
      };
      await hotelService.book(body);
      showNotice("Đặt phòng thành công!", "success");
      setShowBookingForm(false);
      return { success: true };
    } catch (err) {
      console.error("Lỗi khi đặt phòng:", err);
      showNotice("Đặt phòng thất bại. Vui lòng thử lại.", "error");
      return { success: false };
    }
  };

  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);
  const currentItems = useMemo(
    () =>
      filteredHotels.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredHotels, currentPage]
  );

  const renderAvailabilityPill = (hotel) => {
    const hasDate = Boolean(searchParams.checkin && searchParams.checkout);
    if (!hasDate) return null;
    const total =
      typeof hotel._searchTotalRooms === "number"
        ? hotel._searchTotalRooms
        : getTotalAvailableRooms(hotel);
    const available =
      typeof hotel.isAvailableForSearch === "boolean"
        ? hotel.isAvailableForSearch
        : total > 0;
    const cls = available
      ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
      : "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
        {available ? "Còn phòng" : "Hết phòng"}
      </span>
    );
  };

  return (
    <div className="bg-white text-gray-900">
      {/* 🆕 Thông báo giữa màn hình */}
      <CenterNotice
        text={notice.text}
        type={notice.type}
        onClose={() => setNotice({ text: "", type: notice.type })}
      />

      <HeroHotelSlider hotels={hotels} />

      <section className="bg-gradient-to-b from-white to-amber-50/30 py-14">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28 h-fit self-start">
            <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-gray-200 p-6">
              <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent [background:linear-gradient(#fff_0_0)_padding-box,linear-gradient(120deg,rgba(251,191,36,.8),rgba(59,130,246,.8))_border-box] [border:2px_solid_transparent]" />
              <h2 className="text-lg font-semibold text-amber-700 mb-4 relative z-10">
                🔍 Bộ lọc khách sạn
              </h2>
              <form onSubmit={handleSearch} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tên khách sạn</label>
                  <input
                    type="text"
                    name="name"
                    value={searchParams.name}
                    onChange={handleChange}
                    placeholder="Nhập tên khách sạn"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    name="location"
                    value={searchParams.location}
                    onChange={handleChange}
                    placeholder="Tỉnh/Thành phố"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Nhận phòng</label>
                    <input
                      type="date"
                      name="checkin"
                      value={searchParams.checkin}
                      onChange={handleChange}
                      min={today}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Trả phòng</label>
                    <input
                      type="date"
                      name="checkout"
                      value={searchParams.checkout}
                      onChange={handleChange}
                      min={searchParams.checkin || today}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-sm text-gray-700">Giới hạn giá</label>
                    <span className="text-xs text-gray-500">
                      {searchParams.priceLimit > 0
                        ? `${formatVND(searchParams.priceLimit * 1000)}`
                        : "Không giới hạn"}
                    </span>
                  </div>
                  <input
                    type="range"
                    name="priceLimit"
                    min={0}
                    max={30000}
                    step={50}
                    value={searchParams.priceLimit}
                    onChange={handleChange}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                    <span>0</span>
                    <span>500k</span>
                    <span>1.000k</span>
                    <span>2.000k</span>
                    <span>10.000k</span>
                    <span>20.000k</span>
                    <span>30.000k</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-amber-600 text-white py-2 font-medium hover:bg-amber-700 transition"
                  >
                    Tìm kiếm
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    aria-label="Xóa bộ lọc"
                    title="Xóa bộ lọc"
                    className="rounded-lg bg-white text-gray-700 px-3 py-2 ring-1 ring-gray-300 hover:bg-gray-50 transition inline-flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h3.25a.75.75 0 0 1 0 1.5h-.572l-1.05 12.148A2.75 2.75 0 0 1 13.887 21H10.11a2.75 2.75 0 0 1-2.74-2.352L6.322 6.5H5.75a.75.75 0 0 1 0-1.5H9V3.75ZM10.5 5h3V3.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V5Zm-.61 4.5a.75.75 0 0 1 .82.68l.5 7.5a.75.75 0 0 1-1.5.1l-.5-7.5a.75.75 0 0 1 .68-.78Zm4.4.68a.75.75 0 0 0-1.5-.1l-.5 7.5a.75.75 0 0 0 1.5.1l.5-7.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </aside>

          {/* Hotel list */}
          <div>
            {loading && (
              <p className="text-center text-gray-500 mb-6">
                Đang tải dữ liệu khách sạn...
              </p>
            )}
            {error && (
              <p className="text-red-500 text-center">Lỗi: {String(error)}</p>
            )}

            <AnimatePresence>
              <motion.div
                layout
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {currentItems.map((hotel) => {
                  const price = getDisplayPrice(hotel);
                  return (
                    <motion.article
                      key={hotel.HotelID ?? hotel.hotelID}
                      whileHover={{ scale: 1.02 }}
                      className="group rounded-2xl bg-white shadow-md hover:shadow-xl transition overflow-hidden ring-1 ring-gray-100 flex flex-col"
                    >
                      <Link
                        to={`/hotels/${hotel.HotelID ?? hotel.hotelID}`}
                        className="block"
                      >
                        <div className="relative overflow-hidden">
                          <motion.img
                            src={resolveImageUrl(
                              hotel.ImageURL ?? hotel.imageURL
                            )}
                            alt={hotel.Name ?? hotel.name}
                            className="h-52 w-full object-cover group-hover:scale-105 transition-all duration-700"
                            onError={(e) => {
                              e.currentTarget.src = "/images/default-hotel.jpg";
                            }}
                          />
                          <div className="absolute top-3 left-3 rounded-full bg-white/90 text-gray-900 text-sm font-semibold px-3 py-1 shadow">
                            {price != null
                              ? `${formatVND(price)}/đêm`
                              : "Liên hệ"}
                          </div>
                          <div className="absolute top-3 right-3">
                            {renderAvailabilityPill(hotel)}
                          </div>
                        </div>
                      </Link>

                      <div className="p-4 flex flex-col h-full">
                        <p className="mb-1 text-amber-500 text-sm">
                          {"★".repeat(
                            Math.round(
                              hotel.Rating ?? hotel.rating ?? 0
                            )
                          )}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
                          {hotel.Name ?? hotel.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          📍 {hotel.Location ?? hotel.location}
                        </p>
                        <div className="mt-auto pt-4">
                          <button
                            onClick={() => openBookingForm(hotel)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 text-white px-4 py-2.5 font-medium hover:bg-amber-700 active:scale-[.99] transition"
                          >
                            Đặt phòng
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {totalPages > 0 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-full bg-white ring-1 ring-gray-300 hover:bg-gray-100 disabled:opacity-40"
                >
                  « Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-full text-sm ${
                      currentPage === i + 1
                        ? "bg-amber-500 text-white"
                        : "bg-white ring-1 ring-gray-200 hover:bg-amber-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-full bg-white ring-1 ring-gray-300 hover:bg-gray-100 disabled:opacity-40"
                >
                  Sau »
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

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
    </div>
  );
}
