// src/Pages/Partner/PartnerAvailability.jsx
import { useEffect, useState } from "react";
import partnerApi from "../../services/partnerApi";

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function PartnerAvailability() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypeID, setRoomTypeID] = useState(null);

  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [pattern, setPattern] = useState("all");
  const [form, setForm] = useState({
    from: "",
    to: "",
    price: "",
    rooms: "",
  });

  // ====== Load room types ======
  useEffect(() => {
    (async () => {
      try {
        const rt = await partnerApi.getRoomTypes();
        setRoomTypes(rt ?? []);
        const first = rt?.[0];
        if (first) {
          const id = first.roomTypeID ?? first.RoomTypeID;
          setRoomTypeID(id);
        }
      } catch (e) {
        console.error(e);
        setError("Không tải được danh sách loại phòng.");
      }
    })();
  }, []);

  // ====== Load calendar ======
  useEffect(() => {
    if (!roomTypeID) return;
    loadCalendar();
  }, [roomTypeID, year, month]);

  async function loadCalendar() {
    setLoading(true);
    setError("");
    try {
      const data = await partnerApi.getAvailability(roomTypeID, year, month);
      setCalendar(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Không tải được lịch giá & tồn kho.");
    } finally {
      setLoading(false);
    }
  }

  // ====== Điều hướng tháng ======
  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m <= 0) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  // ====== Click chỉnh 1 ngày ======
  async function handleCellClick(day) {
    if (!roomTypeID) return;

    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;

    const existing = calendar.find((c) => {
      const d = new Date(c.Date);
      return (
        d.getFullYear() === year &&
        d.getMonth() + 1 === month &&
        d.getDate() === day
      );
    });

    const priceInput = prompt(
      "Giá mới (để trống nếu không đổi):",
      existing?.Price != null ? String(existing.Price) : ""
    );
    if (priceInput === null) return;

    const roomsInput = prompt(
      "Số phòng còn (để trống nếu không đổi):",
      existing?.AvailableRooms != null ? String(existing.AvailableRooms) : ""
    );
    if (roomsInput === null) return;

    const payload = {
      RoomTypeID: roomTypeID,
      From: dateStr,
      To: dateStr,
    };

    if (priceInput.trim() !== "") payload.Price = Number(priceInput);
    if (roomsInput.trim() !== "") payload.AvailableRooms = Number(roomsInput);

    if (payload.Price == null && payload.AvailableRooms == null) return;

    try {
      await partnerApi.updateAvailabilityRange(payload);
      await loadCalendar();
    } catch (e) {
      console.error(e);
      alert("Cập nhật thất bại.");
    }
  }

  // ====== Mở modal cập nhật nhiều ngày ======
  function openBulk() {
    const defaultFrom = `${year}-${pad2(month)}-01`;
    const defaultTo = `${year}-${pad2(month)}-${pad2(
      new Date(year, month, 0).getDate()
    )}`;
    setForm({
      from: defaultFrom,
      to: defaultTo,
      price: "",
      rooms: "",
    });
    setPattern("all");
    setModalOpen(true);
  }

  // ====== Submit cập nhật nhiều ngày ======
  async function submitBulk(e) {
    e.preventDefault();
    if (!roomTypeID) return;

    if (!form.from || !form.to) {
      alert("Vui lòng chọn khoảng ngày.");
      return;
    }

    if (!form.price && !form.rooms) {
      alert("Nhập ít nhất Giá hoặc Số phòng.");
      return;
    }

    const start = new Date(form.from);
    const end = new Date(form.to);
    if (isNaN(start) || isNaN(end) || start > end) {
      alert("Khoảng ngày không hợp lệ.");
      return;
    }

    const selected = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (pattern === "weekends" && dow !== 0 && dow !== 6) continue;
      if (pattern === "weekdays" && (dow === 0 || dow === 6)) continue;
      selected.push(new Date(d));
    }

    if (selected.length === 0) {
      alert("Không có ngày nào khớp pattern.");
      return;
    }

    const ranges = [];
    let startR = selected[0];
    let prev = selected[0];

    for (let i = 1; i < selected.length; i++) {
      const cur = selected[i];
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);

      if (cur.toDateString() === next.toDateString()) {
        prev = cur;
      } else {
        ranges.push({ from: startR, to: prev });
        startR = cur;
        prev = cur;
      }
    }
    ranges.push({ from: startR, to: prev });

    try {
      for (const r of ranges) {
        await partnerApi.updateAvailabilityRange({
          RoomTypeID: roomTypeID,
          From: toDateStr(r.from),
          To: toDateStr(r.to),
          Price: form.price ? Number(form.price) : null,
          AvailableRooms: form.rooms ? Number(form.rooms) : null,
        });
      }
      setModalOpen(false);
      await loadCalendar();
    } catch (e) {
      console.error(e);
      alert("Cập nhật nhiều ngày thất bại.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Lịch giá & tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý giá bán và số phòng trống theo từng ngày.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Loại phòng:</span>
          <select
            value={roomTypeID || ""}
            onChange={(e) => setRoomTypeID(Number(e.target.value))}
            className="border rounded-lg px-2 py-1 text-sm"
          >
            {roomTypes.map((rt) => {
              const id = rt.roomTypeID ?? rt.RoomTypeID;
              const name = rt.name ?? rt.Name;
              return (
                <option key={id} value={id}>
                  {id} – {name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="px-2 py-1 rounded-lg border text-xs"
          >
            ◀
          </button>
          <span className="font-medium">
            Tháng {month}/{year}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="px-2 py-1 rounded-lg border text-xs"
          >
            ▶
          </button>
        </div>

        <button
          onClick={openBulk}
          className="ml-auto rounded-lg bg-emerald-600 text-white text-xs px-3 py-1.5 hover:bg-emerald-700"
        >
          ⚙ Cập nhật nhiều ngày
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Đang tải dữ liệu...
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-600 text-sm">{error}</div>
        ) : (
          <div className="grid grid-cols-7 gap-2 text-xs">
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;

              const entry = calendar.find((c) => {
                const d = new Date(c.Date);
                return (
                  d.getFullYear() === year &&
                  d.getMonth() + 1 === month &&
                  d.getDate() === day
                );
              });

              const price =
                entry?.Price != null
                  ? entry.Price.toLocaleString("vi-VN")
                  : "-";

              const rooms =
                entry?.AvailableRooms != null
                  ? entry.AvailableRooms
                  : "-";

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleCellClick(day)}
                  className="border rounded-lg p-2 text-left hover:border-emerald-500 hover:bg-emerald-50 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{day}</span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    Giá: <span className="font-medium">{price}</span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    Phòng: <span className="font-medium">{rooms}</span>
                  </div>

                  <div className="mt-1 text-[10px] text-emerald-600">
                    Click để chỉnh
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal cập nhật nhiều ngày */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-5 text-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Cập nhật nhiều ngày
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitBulk} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium text-xs">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={form.from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, from: e.target.value }))
                    }
                    className="w-full border rounded-lg px-2 py-1"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={form.to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, to: e.target.value }))
                    }
                    className="w-full border rounded-lg px-2 py-1"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium text-xs">
                  Pattern áp dụng
                </label>
                <select
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1"
                >
                  <option value="all">Tất cả ngày</option>
                  <option value="weekdays">Ngày thường (T2–T6)</option>
                  <option value="weekends">Cuối tuần (T7, CN)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium text-xs">
                    Giá (đ/đêm)
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    min={0}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="w-full border rounded-lg px-2 py-1"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">
                    Số phòng còn
                  </label>
                  <input
                    type="number"
                    value={form.rooms}
                    min={0}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rooms: e.target.value }))
                    }
                    className="w-full border rounded-lg px-2 py-1"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Gợi ý: Chọn 01–31 và pattern “Cuối tuần” để cài giá cuối tuần cho cả tháng.
              </p>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border hover:bg-slate-50"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
