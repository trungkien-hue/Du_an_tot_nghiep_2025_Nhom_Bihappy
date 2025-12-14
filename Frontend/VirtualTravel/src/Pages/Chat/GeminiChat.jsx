// src/Pages/AI/GeminiChat.jsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { chatTravel, saveCustomerInfo } from "../../services/aiClient";

const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const STORAGE_KEY = "vt_ai_chat_history";
const CUSTOMER_INFO_KEY = "vt_ai_customer_info";

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

  /* 🔹 Load lịch sử khi mở trang + chèn form thông tin nếu chưa đăng nhập */
  useEffect(() => {
    let initial = [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        initial = JSON.parse(saved) || [];
      } catch (e) {
        void e;
        initial = [];
      }
    }

    // Nếu KHÔNG có auth_token (khách chưa đăng nhập) thì chèn message kêu điền thông tin
    const hasToken = !!localStorage.getItem("auth_token");
    if (!hasToken) {
      const alreadyHasForm = initial.some(
        (m) => m?.payload?.kind === "customer-info"
      );
      if (!alreadyHasForm) {
        initial.unshift({
          role: "assistant",
          payload: {
            kind: "customer-info",
            text:
              "Chào bạn 👋 Trước khi tư vấn chi tiết, bạn giúp mình điền nhanh một số thông tin liên hệ nhé. " +
              "Nếu bạn đã có tài khoản, bạn có thể đăng nhập để bỏ qua bước này.",
          },
        });
      }
    }

    setMessages(initial);
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

    setMessages((prev) => [
      ...prev,
      { role: "user", payload: { text: content } },
    ]);
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
  const kind = payload?.kind;

  const hasTours =
    fn === "search_tours" && Array.isArray(data?.items) && data.items.length > 0;
  const hasHotels =
    fn === "search_hotels" && Array.isArray(data?.items) && data.items.length > 0;
  const hasSuggest = fn === "suggestions";
  const showCustomerForm = kind === "customer-info";

  return (
    <div className="space-y-4">
      {text && <div className="whitespace-pre-line leading-relaxed">{text}</div>}
      {showCustomerForm && <CustomerInfoForm />}
      {hasTours && <TourList items={data.items} showButton />}
      {hasHotels && <HotelList items={data.items} showButton />}
      {hasSuggest && <Suggestions payload={data} />}
    </div>
  );
}

/* ============ Form thông tin khách hàng ============ */
function CustomerInfoForm() {
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_INFO_KEY);
      if (saved) {
        return (
          JSON.parse(saved) || {
            fullName: "",
            phone: "",
            email: "",
            people: "",
            note: "",
          }
        );
      }
    } catch {
      /* ignore */
    }
    return {
      fullName: "",
      phone: "",
      email: "",
      people: "",
      note: "",
    };
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      alert("Vui lòng nhập tối thiểu Họ tên và Số điện thoại.");
      return;
    }

    // Lưu localStorage để autofill form đặt phòng
    try {
      localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }

    // Gửi lên BE lưu vào bảng Users (Role = Lead)
    setSaving(true);
    try {
      await saveCustomerInfo({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        people: form.people ? Number(form.people) : undefined,
        note: form.note,
        source: "AI_CHAT_FULLPAGE",
      });
      setSubmitted(true);
    } catch (err) {
      console.warn("saveCustomerInfo error:", err);
      // vẫn cho submitted để user không phải nhập lại
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
        ✅ Cảm ơn bạn, mình đã lưu thông tin liên hệ. Bạn cứ tiếp tục đặt câu hỏi
        để mình tư vấn nhé.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-3 text-sm bg-white rounded-xl border px-3 py-3"
    >
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ví dụ: Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            Số điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ví dụ: 09xx xxx xxx"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="(Không bắt buộc)"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            Số khách (dự kiến)
          </label>
          <input
            name="people"
            type="number"
            min="1"
            value={form.people}
            onChange={handleChange}
            className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ví dụ: 2"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          Ghi chú thêm (thời gian đi, ngân sách, yêu cầu đặc biệt…)
        </label>
        <textarea
          name="note"
          rows={2}
          value={form.note}
          onChange={handleChange}
          className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          placeholder="Ví dụ: Đi vào dịp lễ, ưu tiên gần biển, ngân sách ~5 triệu/2 người…"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu thông tin"}
        </button>
      </div>
    </form>
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
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                    {t.Name}
                  </h3>
                  <p className="text-gray-500 mb-1">{t.Location}</p>
                  <p className="text-blue-600 font-semibold">
                    {fmtVnd(t.Price)}
                  </p>
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
          const priceToShow =
            h.MinAvailablePrice ?? h.Price ?? h.PricePerNight; // 🔸 ưu tiên Availability.Price
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
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                    {h.Name}
                  </h3>
                  <p className="text-gray-500 mb-1">{h.Location}</p>
                  <p className="text-blue-600 font-semibold">
                    {fmtVnd(priceToShow)}
                  </p>
                  {h.Rating && (
                    <p className="text-sm text-gray-600">⭐ {h.Rating}/5</p>
                  )}
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
