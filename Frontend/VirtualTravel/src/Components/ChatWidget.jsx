// src/Components/ChatWidget.jsx (hoặc đường dẫn bạn đang dùng)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatTravel } from "../services/aiClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STORAGE_KEY = "vt_widget_history_v1";
const DRAFT_KEY = "vt_widget_draft_v1";

/* ========== Ảnh & Helpers ========== */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
const DEFAULT_TOUR_IMG = "/images/default-tour.jpg";
const DEFAULT_HOTEL_IMG = "/images/default-hotel.jpg";

function resolveImageUrl(u, fallback = DEFAULT_TOUR_IMG) {
  if (!u) return fallback;
  let url = String(u).trim();
  // đổi backslash -> slash
  url = url.replace(/\\/g, "/");
  // đã là http(s) hoặc data:
  if (/^(https?:|data:)/i.test(url)) return url;
  // đảm bảo bắt đầu bằng /
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
}

const fmtVnd = (n) =>
  (typeof n === "number" ? n : Number(n || 0)).toLocaleString("vi-VN") + " đ";

// helpers tránh cảnh báo "Empty block statement"
const safeLoad = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn("localStorage read error:", err);
    return fallback;
  }
};
const safeSave = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch (err) {
    console.warn("localStorage write error:", err);
  }
};
const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("localStorage remove error:", err);
  }
};

// ID helpers
const getTourId = (t) => t?.TourID ?? t?.tourID ?? t?.Id ?? t?.id;
const getHotelId = (h) => h?.HotelID ?? h?.hotelID ?? h?.Id ?? h?.id;

/* --- Cards nhỏ gọn trong widget --- */
function TourCards({ items = [], onViewDetail }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-400 text-center">Tour gợi ý</div>
      {items.map((t, idx) => {
        const id = getTourId(t) ?? `t-${idx}`;
        const img = resolveImageUrl(t.ImageUrl ?? t.ImageURL, DEFAULT_TOUR_IMG);
        return (
          <div key={id} className="flex gap-2 rounded-xl border bg-white overflow-hidden shadow-sm">
            <img
              src={img}
              alt={t.Name}
              className="w-20 h-20 object-cover flex-none"
              onError={(e) => (e.currentTarget.src = DEFAULT_TOUR_IMG)}
              loading="lazy"
            />
            <div className="p-2 flex-1 min-w-0">
              <div className="text-sm font-semibold line-clamp-2">{t.Name}</div>
              <div className="text-[11px] text-gray-500">{t.Location}</div>
              <div className="text-[12px] font-bold mt-0.5">{fmtVnd(t.Price)}</div>
              {t.Rating != null && (
                <div className="text-[11px] text-amber-600">⭐ {t.Rating}</div>
              )}
            </div>
            <button
              onClick={() => onViewDetail(id)}
              className="m-2 h-8 px-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex-none"
              aria-label={`Xem chi tiết tour ${t.Name}`}
            >
              Chi tiết
            </button>
          </div>
        );
      })}
    </div>
  );
}

function HotelCards({ list = [], onViewDetail }) {
  if (!list.length) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-400 text-center">Khách sạn gợi ý</div>
      {list.map((h, idx) => {
        const id = getHotelId(h) ?? `h-${idx}`;
        const img = resolveImageUrl(h.ImageUrl ?? h.ImageURL, DEFAULT_HOTEL_IMG);
        return (
          <div key={id} className="flex gap-2 rounded-xl border bg-white overflow-hidden shadow-sm">
            <img
              src={img}
              alt={h.Name}
              className="w-20 h-20 object-cover flex-none"
              onError={(e) => (e.currentTarget.src = DEFAULT_HOTEL_IMG)}
              loading="lazy"
            />
            <div className="p-2 flex-1 min-w-0">
              <div className="text-sm font-semibold line-clamp-2">{h.Name}</div>
              <div className="text-[11px] text-gray-500">{h.Location}</div>
              <div className="text-[12px] font-bold mt-0.5">
                {fmtVnd(h.MinAvailablePrice ?? h.PricePerNight)}
              </div>
              {h.Rating != null && (
                <div className="text-[11px] text-amber-600">⭐ {h.Rating}</div>
              )}
            </div>
            <button
              onClick={() => onViewDetail(id)}
              className="m-2 h-8 px-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex-none"
              aria-label={`Xem chi tiết khách sạn ${h.Name}`}
            >
              Chi tiết
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ====================== Widget ====================== */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() =>
    safeLoad(STORAGE_KEY, [
      {
        role: "bot",
        text: "Xin chào! Mình có thể giúp bạn tìm tour/khách sạn theo yêu cầu.",
        fn: "",
        data: null,
        ts: Date.now(),
      },
    ])
  );
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // khôi phục draft
  useEffect(() => {
    const draft = safeLoad(DRAFT_KEY, "");
    if (draft) setQ(draft);
  }, []);

  // lưu lịch sử & draft
  useEffect(() => {
    safeSave(STORAGE_KEY, messages);
  }, [messages]);
  useEffect(() => {
    safeSave(DRAFT_KEY, q);
  }, [q]);

  // auto scroll (mượt)
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  const clearHistory = () => {
    const init = [
      {
        role: "bot",
        text: "Xin chào! Mình có thể giúp bạn tìm tour/khách sạn theo yêu cầu.",
        fn: "",
        data: null,
        ts: Date.now(),
      },
    ];
    setMessages(init);
    // nếu muốn giữ lại câu chào trong localStorage thì lưu init; nếu muốn xoá sạch thì remove
    safeRemove(STORAGE_KEY);
    safeRemove(DRAFT_KEY);
  };

  const send = async () => {
    if (!q.trim() || loading) return;
    const userMsg = { role: "user", text: q.trim(), ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setQ("");
    setLoading(true);

    try {
      const res = await chatTravel(userMsg.text);
      const botMsg = {
        role: "bot",
        text: res?.text,
        fn: res?.function,
        data: res?.data,
        ts: Date.now(),
      };
      setMessages((m) => [...m, botMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [
        ...m,
        { role: "bot", text: `❌ Lỗi khi trả lời: ${msg}`, ts: Date.now() },
      ]);
      console.warn("chatTravel error:", err);
    } finally {
      setLoading(false);
    }
  };

  const extractCards = (m) => {
    if (!m?.data) return { tours: [], hotels: [] };
    if (m.fn === "search_tours") {
      return { tours: Array.isArray(m.data?.items) ? m.data.items : [], hotels: [] };
    }
    if (m.fn === "search_hotels") {
      const list = Array.isArray(m.data?.items)
        ? m.data.items
        : m.data?.HotelID || m.data?.hotelID
        ? [m.data]
        : [];
      return { tours: [], hotels: list };
    }
    return { tours: [], hotels: [] };
  };

  const goTourDetail = (id) => navigate(`/tours/${id}`);
  const goHotelDetail = (id) => navigate(`/hotels/${id}`);

  return (
    <>
      {/* Nút tròn mở/đóng chat */}
      <button
        aria-label="Mở chat Gemini"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[1000] h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center text-sm font-semibold"
      >
        {!open ? "Chat" : "×"}
      </button>

      {/* Hộp chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[999] w-[360px] max-w-[92vw] rounded-2xl shadow-2xl border bg-white overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">Trợ lý Du lịch</div>
              <div className="text-white/80 text-xs">Trực tuyến</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                className="bg-white/20 hover:bg-white/30 text-sm px-2 py-1 rounded"
                title="Xoá lịch sử hội thoại"
              >
                🗑
              </button>
              <button
                onClick={() => setOpen(false)}
                className="bg-white/20 hover:bg-white/30 text-sm px-2 py-1 rounded"
                title="Đóng chat"
              >
                ×
              </button>
            </div>
          </div>

          {/* Nội dung */}
          <div
            ref={boxRef}
            className="p-3 space-y-3 max-h-[480px] overflow-y-auto bg-gray-50"
          >
            {messages.map((m) => {
              const key = m.ts ?? Math.random();
              const { tours, hotels } = extractCards(m);
              return (
                <div key={key} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border rounded-bl-none"
                    }`}
                  >
                    {m.role === "bot" ? (
                      <>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.text || (loading ? "Đang gõ…" : "")}
                          </ReactMarkdown>
                        </div>

                        {!!tours.length && (
                          <TourCards items={tours} onViewDetail={goTourDetail} />
                        )}
                        {!!hotels.length && (
                          <HotelCards list={hotels} onViewDetail={goHotelDetail} />
                        )}
                      </>
                    ) : (
                      <span>{m.text}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ô nhập */}
          <div className="p-3 flex gap-2 border-top bg-white border-t">
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
                if (e.key === "Escape") setOpen(false);
              }}
              disabled={loading}
              rows={1}
              placeholder="Nhập câu hỏi…"
              className="flex-1 resize-none rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
            />
            <button
              onClick={send}
              disabled={loading || !q.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
