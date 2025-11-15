import { useState } from "react";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GeminiChat from "../Chat/GeminiChat.jsx";

export default function Home() {
  const [activeTab, setActiveTab] = useState("tour");
  const navigate = useNavigate();

  const tours = [
    { id: 1, title: "Vịnh Hạ Long", price: "550$/người", days: "8 Ngày", image: "images/halong.jpg", location: "Quảng Ninh", features: ["2 Người", "3 Người", "Gần Biển"] },
    { id: 2, title: "Phố Cổ Hội An", price: "600$/người", days: "10 Ngày", image: "images/hoian.png", location: "Quảng Nam", features: ["2 Người", "3 Người", "Gần Sông"] },
    { id: 3, title: "Sa Pa",        price: "500$/người", days: "7 Ngày", image: "images/sapa.jpg",   location: "Lào Cai",   features: ["2 Người", "3 Người", "Gần Núi"] },
    { id: 4, title: "Đà Nẵng",      price: "550$/người", days: "8 Ngày", image: "images/danang.jpg", location: "Đà Nẵng",  features: ["2 Người", "3 Người", "Gần Biển"] },
    { id: 6, title: "Huế",          price: "650$/người", days: "10 Ngày", image: "images/hue.jpg",    location: "Thừa Thiên Huế", features: ["2 Người", "3 Người", "Gần Sông"] },
    { id: 5, title: "Phú Quốc",     price: "500$/người", days: "7 Ngày", image: "images/phuquoc.jpg", location: "Kiên Giang", features: ["2 Người", "3 Người", "Gần Biển"] },
  ];

  const hotels = [
    { id: 1, title: "Luxury Saigon",     date: "15/09/2025", image: "images/khachsan1.jpg" },
    { id: 2, title: "Hội An Riverside",  date: "20/09/2025", image: "images/khachsan2.jpg" },
    { id: 3, title: "Đà Lạt View Đẹp",   date: "25/09/2025", image: "images/khachsan3.jpg" },
  ];

  return (
    <div className="bg-white text-gray-900 min-h-screen">
      {/* HERO (video background) */}
      <section className="relative h-[730px] flex items-center overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/video/video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50 pointer-events-none" />

        <div className="relative z-10 w-full max-w-full px-8 md:px-16 pb-32 text-left">
          <div
            className="
              mb-6 inline-block px-6 py-2 bg-white/20 text-white rounded-full text-xs md:text-sm
              font-semibold border border-white/30 backdrop-blur hover:bg-white/30 transition-all duration-300
              relative md:top-[20px] md:left-[40px]
            "
          >
            ✨ Chào mừng đến với BiHappy
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-white group cursor-default max-w-4xl">
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Khám</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Phá</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Địa</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Điểm</span>
            <br />
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Yêu</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Thích</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Cùng</span>
            <br />
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Chúng</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Tôi</span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-10 leading-relaxed max-w-2xl transition-all duration-300 origin-left group cursor-default">
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Du</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">lịch</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">đến</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">bất</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">kỳ</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">nơi</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">nào</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">trên</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">đất</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">nước</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Việt</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">Nam,</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">mà</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">không</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">phải</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">đi</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">lòng</span>{" "}
            <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-orange-300">vòng</span>
          </p>

          <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-base hover:shadow-2xl hover:scale-105 transition-all duration-300">
            Bắt Đầu Ngay →
          </button>
        </div>
      </section>

      {/* Search Section */}
      <section className="relative -mt-32 z-20 px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white shadow-2xl border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("tour")}
                className={`flex-1 py-5 font-bold text-lg transition-all ${
                  activeTab === "tour"
                    ? "bg-orange-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Tìm Tour
              </button>
              <button
                onClick={() => setActiveTab("hotel")}
                className={`flex-1 py-5 font-bold text-lg transition-all ${
                  activeTab === "hotel"
                    ? "bg-orange-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Khách Sạn
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-5 gap-5">
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700 hover:text-orange-600 transition-colors">
                  Điểm Đến
                </label>
                <input
                  type="text"
                  placeholder="Tìm địa điểm..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700 hover:text-orange-600 transition-colors">
                  Nhận Phòng
                </label>
                <input
                  type="date"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700 hover:text-orange-600 transition-colors">
                  Trả Phòng
                </label>
                <input
                  type="date"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700 hover:text-orange-600 transition-colors">
                  Giới Hạn Giá
                </label>
                <select className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all">
                  <option>$100 - $500</option>
                  <option>$500 - $1000</option>
                  <option>$1000+</option>
                </select>
              </div>
              <div className="flex items-end pt-6">
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-3 font-bold hover:shadow-lg transition-all duration-300">
                  Tìm Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Services */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <span className="inline-block text-orange-600 text-sm font-bold uppercase tracking-wide mb-4">
                Chào mừng đến với Pacific
              </span>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">
                Đã đến lúc bắt đầu chuyến phiêu lưu của bạn
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                Một con sông nhỏ tên Duden chảy qua nơi đây, cung cấp cho nó
                những thứ cần thiết. Đây là một vùng đất như thiên đường,
                nơi những câu văn được nướng thơm bay vào miệng bạn.
              </p>
              <p className="text-gray-600 text-base leading-relaxed mb-6">
                Xa xa, phía sau những ngọn núi từ ngôn từ, cách các quốc gia
                Vokalia và Consonantia, sống những văn bản mù. Họ sống riêng
                rẽ tại Bookmarksgrove ngay bên bờ đại dương Ngôn Ngữ rộng
                lớn. Một con sông nhỏ tên Duden chảy qua nơi đây, cung cấp
                cho nó những thứ cần thiết.
              </p>
              <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all duration-300">
                Tìm Điểm Đến
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div
                className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-cover bg-center"
                style={{ backgroundImage: "url(images/services-1.jpg)", paddingTop: "100%" }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <div className="text-4xl mb-3">🪂</div>
                  <h3 className="text-lg font-bold mb-2">Hoạt động</h3>
                  <p className="text-sm opacity-90">Một con sông nhỏ tên Duden chảy qua nơi đây, cung cấp cho nó những thứ cần thiết</p>
                </div>
              </div>

              <div
                className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-cover bg-center"
                style={{ backgroundImage: "url(images/services-2.jpg)", paddingTop: "100%" }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <div className="text-4xl mb-3">🗺️</div>
                  <h3 className="text-lg font-bold mb-2">Sắp xếp Du Lịch</h3>
                  <p className="text-sm opacity-90">Một con sông nhỏ tên Duden chảy qua nơi đây, cung cấp cho nó những thứ cần thiết</p>
                </div>
              </div>

              <div
                className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-cover bg-center"
                style={{ backgroundImage: "url(images/services-3.jpg)", paddingTop: "100%" }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <div className="text-4xl mb-3">👤</div>
                  <h3 className="text-lg font-bold mb-2">Hướng dẫn viên riêng</h3>
                  <p className="text-sm opacity-90">Một con sông nhỏ tên Duden chảy qua nơi đây, cung cấp cho nó những thứ cần thiết</p>
                </div>
              </div>

              <div
                className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-cover bg-center"
                style={{ backgroundImage: "url(images/services-4.jpg)", paddingTop: "100%" }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <div className="text-4xl mb-3">📍</div>
                  <h3 className="text-lg font-bold mb-2">Quản lý địa điểm</h3>
                  <p className="text-sm opacity-90">Một con sông nhỏ tên Duden chảy qua nơi đây, cung cấp cho nó những thứ cần thiết</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔹 AI Assistant Section – Đặt TRƯỚC “Tour Du Lịch Việt Nam” */}
      <section className="py-20 px-6 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4 border border-blue-200">
              TRỢ LÝ AI
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">
              Hỏi Bihappy về hành trình của bạn
            </h2>
            <p className="text-gray-600 mt-3">
              Gợi ý tour/khách sạn, so sánh giá, đề xuất lịch trình thông minh.
            </p>
          </div>

          {/* Embed trực tiếp component GeminiChat */}
          <div className="mx-auto max-w-5xl">
            {/* Lưu ý: GeminiChat có mt-[80px] ở phần root. 
                Nếu muốn gọn hơn, mở file src/Pages/AI/GeminiChat.jsx và xóa class mt-[80px]. */}
            <GeminiChat />
          </div>
        </div>
      </section>

      {/* Tours Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-orange-200 text-orange-700 rounded-full text-sm font-bold mb-4 border border-orange-300">
              ĐỊA ĐIỂM NỔI BẬT
            </span>
            <h2 className="text-5xl md:text-6xl font-black mb-4 text-gray-900">Tour Du Lịch Việt Nam</h2>
            <p className="text-gray-600 text-lg">Những điểm đến không thể bỏ qua</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tours.map((tour) => (
              <div
                key={tour.id}
                onClick={() => navigate(`/tours/${tour.id}`)}
                className="group rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-orange-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-4 cursor-pointer"
              >
                <div
                  className="relative h-56 bg-cover bg-center overflow-hidden flex items-end"
                  style={{ backgroundImage: `url(${tour.image})` }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                  <div className="absolute top-5 right-5 bg-red-500 px-4 py-2 rounded-lg font-bold text-sm text-white">{tour.price}</div>
                </div>
                <div className="p-7">
                  <div className="text-orange-600 text-xs font-bold mb-3 uppercase tracking-wider">{tour.days}</div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-orange-600 transition-colors">{tour.title}</h3>
                  <div className="flex items-center text-gray-600 text-sm mb-5">
                    <MapPin size={16} className="mr-2 text-orange-500" /> {tour.location}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tour.features.map((feature, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full border border-gray-300 group-hover:border-orange-500 group-hover:bg-orange-50 transition-colors hover:text-orange-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tours/${tour.id}`);
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-3 font-bold hover:shadow-lg transition-all duration-300"
                  >
                    Xem Chi Tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hotels Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-orange-200 text-orange-700 rounded-full text-sm font-bold mb-4 border border-orange-300">
              CHỖ LƯU TRÚ
            </span>
            <h2 className="text-5xl md:text-6xl font-black mb-4 text-gray-900">Khách Sạn Mới Nhất</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {hotels.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => navigate(`/hotels/${hotel.id}`)}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-orange-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-4 cursor-pointer"
              >
                <div className="h-48 bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${hotel.image})` }}></div>
                <div className="p-7">
                  <div className="text-orange-600 text-xs font-bold mb-3 uppercase tracking-wider">📅 {hotel.date}</div>
                  <h3 className="text-xl font-bold mb-6 text-gray-900 group-hover:text-orange-600 transition-colors">{hotel.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/hotels/${hotel.id}`);
                    }}
                    className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold hover:shadow-lg transition-all duration-300"
                  >
                    Xem Chi Tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[url('/images/bg_2.jpg')] from-orange-500 to-red-500">
        <div className="max-w-4xl mx-auto text-center rounded-3xl p-16">
          <h2 className="text-5xl font-black mb-5 text-white">BiHappy - Du Lịch Thông Minh</h2>
          <p className="text-xl mb-10 text-white/95 leading-relaxed">
            Khám phá Việt Nam với công nghệ AI tiên tiến. Mỗi chuyến đi là một câu chuyện mới!
          </p>
          <button
            onClick={() => navigate(`/hotels`)}
            className="px-10 py-4 bg-white text-orange-600 rounded-lg font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Khám phá khách sạn →
          </button>
        </div>
      </section>
    </div>
  );
}
