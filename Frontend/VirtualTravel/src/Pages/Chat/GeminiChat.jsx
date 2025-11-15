// src/Pages/AI/GeminiChat.jsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { chatTravel } from "../../services/aiClient";

const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const STORAGE_KEY = "vt_ai_chat_history";

/* Helpers */
function resolveImageUrl(u) {
  if (!u) return "/images/default-tour.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
}
function fmtVnd(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Liên hệ";
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
const getTourId = (t) => t?.TourID ?? t?.tourID ?? t?.Id ?? t?.id;
const getHotelId = (h) => h?.HotelID ?? h?.hotelID ?? h?.Id ?? h?.id;

/* ================= Component ================= */
export default function GeminiChat() {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  /* 🔹 Load lịch sử khi mở trang */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e){
        void(e);
      }
    }
  }, []);

  /* 🔹 Lưu lịch sử khi có thay đổi */
  useEffect(() => {
    if (messages.length > 0)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  /* 🔹 Auto scroll xuống cuối */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e?.preventDefault?.();
    const content = prompt.trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: "user", payload: { text: content } }]);
    setPrompt("");
    setLoading(true);

    try {
      const data = await chatTravel(content);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", payload: data || { text: "Không có phản hồi." } },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          payload: {
            text:
              "⚠️ Không thể truy vấn AI. Vui lòng kiểm tra backend hoặc biến môi trường.",
          },
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  /* 🔹 Clear chat */
  function handleClearChat() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?")) {
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 mt-[-80px]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        {/* Nút xóa lịch sử */}
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="ml-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl shadow"
            title="Xóa toàn bộ lịch sử trò chuyện"
          >
            🗑 Xóa
          </button>
        )}
      </div>

      {/* Chat container */}
      <div className="bg-white/70 backdrop-blur rounded-2xl shadow border overflow-hidden">
        <div
          ref={scrollRef}
          className="h-[65vh] max-h-[70vh] overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-6
                     scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {messages.length === 0 && (
            <div className="text-center text-sm text-gray-500">
              Hãy bắt đầu bằng cách nhập yêu cầu ở bên dưới.
              <div className="mt-3 text-gray-600">
                Ví dụ:{" "}
                <span className="italic">
                  “Gợi ý tour Đà Nẵng 3N2Đ khoảng 3-5 triệu”
                </span>
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <MessageBubble key={idx} role={m.role}>
              <AssistantPayloadRenderer payload={m.payload} />
            </MessageBubble>
          ))}

          {loading && (
            <MessageBubble role="assistant">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:150ms]"></span>
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:300ms]"></span>
                <span className="ml-2">Đang tìm...</span>
              </div>
            </MessageBubble>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t p-3 md:p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập nội dung (Shift+Enter để xuống dòng, Enter để gửi)..."
              rows={1}
              className="flex-1 resize-none rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              Gửi
            </button>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Mẹo: hỏi “tour Phú Quốc dưới 4 triệu cho 2 người, đi 3 ngày”.
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============ Bubbles & Payload Renderer ============ */
function MessageBubble({ role, children }) {
  const isUser = role === "user";
  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 shadow
        ${isUser ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-900 border"}`}
      >
        <div className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
          {isUser ? "Bạn" : "VirtualTravel AI"}
        </div>
        <div className="prose max-w-none prose-sm">{children}</div>
      </div>
    </motion.div>
  );
}

function AssistantPayloadRenderer({ payload }) {
  const text = payload?.text || "";
  const fn = payload?.function;
  const data = payload?.data;

  const hasTours =
    fn === "search_tours" && Array.isArray(data?.items) && data.items.length > 0;
  const hasHotels =
    fn === "search_hotels" && Array.isArray(data?.items) && data.items.length > 0;
  const hasSuggest = fn === "suggestions";

  return (
    <div className="space-y-4">
      {text && <div className="whitespace-pre-line leading-relaxed">{text}</div>}
      {hasTours && <TourList items={data.items} showButton />}
      {hasHotels && <HotelList items={data.items} showButton />}
      {hasSuggest && <Suggestions payload={data} />}
    </div>
  );
}

/* ============ Lists ============ */
function TourList({ items, showButton = false }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">🎒 Tour phù hợp</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {items.map((t) => {
          const id = getTourId(t);
          return (
            <div
              key={id ?? t?.Name}
              className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden flex flex-col"
            >
              <img
                src={resolveImageUrl(t.ImageUrl ?? t.ImageURL)}
                alt={t.Name}
                className="w-full h-44 object-cover"
                loading="lazy"
              />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">{t.Name}</h3>
                  <p className="text-gray-500 mb-1">{t.Location}</p>
                  <p className="text-blue-600 font-semibold">{fmtVnd(t.Price)}</p>
                  <p className="text-sm text-gray-600">
                    {t.DurationDays ? `🕒 ${t.DurationDays} ngày` : ""}{" "}
                    {t.Rating ? `| ⭐ ${t.Rating}` : ""}
                  </p>
                </div>
                {showButton && id && (
                  <Link
                    to={`/tours/${id}`}
                    className="mt-3 inline-block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    Xem chi tiết
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HotelList({ items, showButton = false }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">🏨 Khách sạn gợi ý</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {items.map((h) => {
          const id = getHotelId(h);
          const priceToShow = h.MinAvailablePrice ?? h.Price ?? h.PricePerNight; // 🔸 ưu tiên Availability.Price
          return (
            <div
              key={id ?? h?.Name}
              className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden flex flex-col"
            >
              <img
                src={resolveImageUrl(h.ImageURL ?? h.ImageUrl)}
                alt={h.Name}
                className="w-full h-44 object-cover"
                loading="lazy"
              />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">{h.Name}</h3>
                  <p className="text-gray-500 mb-1">{h.Location}</p>
                  <p className="text-blue-600 font-semibold">
                    {fmtVnd(priceToShow)}
                  </p>
                  {h.Rating && <p className="text-sm text-gray-600">⭐ {h.Rating}/5</p>}
                </div>
                {showButton && id && (
                  <Link
                    to={`/hotels/${id}`}
                    className="mt-3 inline-block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    Xem chi tiết
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Suggestions({ payload }) {
  const examples = payload?.examples || [];
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">💡 Gợi ý câu hỏi</h2>
      <ul className="list-disc list-inside text-gray-700 text-sm">
        {examples.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
