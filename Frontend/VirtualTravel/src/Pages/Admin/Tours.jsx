// src/Pages/Admin/Tours.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Table from "../../Components/Admin/Table";
import tourApi from "../../services/Admin/tourApi";

// ===== Helpers resolve/clean ảnh =====
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "http://localhost:5059";
function resolveImageUrl(u) {
  if (!u) return "/images/default-tour.jpg";
  let url = String(u).trim().replace(/\\/g, "/");
  if (url.startsWith("/api/")) url = url.slice(4);
  if (/^(https?:|data:)/i.test(url)) return url;
  if (!url.startsWith("/")) url = "/" + url;
  return `${ASSET_BASE}${url}`;
}
function cleanUrl(u) {
  if (!u) return "";
  let url = String(u).trim().replace(/\\/g, "/");
  if (url.startsWith("/api/")) url = url.slice(4);
  if (!/^(https?:|data:)/i.test(url)) {
    if (!url.startsWith("/")) url = "/" + url;
  }
  return url;
}

export default function Tours() {
  const { globalSearch } = useOutletContext() || {};
  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [deletedRows, setDeletedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal state: undefined = đóng, null = tạo mới, object = sửa
  const [editing, setEditing] = useState(undefined);

  // ====== FORM ======
  const emptyForm = {
    // Tổng quan
    Name: "", Location: "", Category: "", Description: "", Rating: 0,
    // Hành trình & dịch vụ
    Itinerary: "", Includes: "", Excludes: "", Notes: "", Highlights: "",
    // Thông số
    StartLocation: "", EndLocation: "", DurationDays: 0, MaxGroupSize: 0,
    TransportType: "", GuideIncluded: false,
    // Giá & Chính sách
    Price: 0, PriceAdult: "", PriceChild: "", Currency: "VND",
    CancellationPolicy: "", DepositPercent: "",
    // Ảnh
    ImageURL: ""
  };
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("overview"); // overview | itinerary | spec | price | media

  const columns = useMemo(() => [
    { key: "tourID", title: "ID" },
    { key: "name", title: "Tên tour" },
    { key: "location", title: "Địa điểm" },
    { key: "price", title: "Giá", render: r => (r.price || 0).toLocaleString("vi-VN") + "₫" },
    { key: "rating", title: "Đánh giá" },
    { key: "category", title: "Danh mục" },
  ], []);

  const normalize = (raw) => raw.map(t => ({
    tourID: t.tourID ?? t.TourID,
    name: t.name ?? t.Name,
    location: t.location ?? t.Location,
    description: t.description ?? t.Description,
    price: t.price ?? t.Price,
    rating: t.rating ?? t.Rating,
    imageURL: t.imageURL ?? t.ImageURL,
    category: t.category ?? t.Category,
  }));

  const fetchActive = async () => {
    const res = await tourApi.getAll({ keyword: globalSearch });
    const raw = Array.isArray(res) ? res : res.items || [];
    setRows(normalize(raw));
  };
  const fetchDeleted = async () => {
    const res = await tourApi.getDeleted({ keyword: globalSearch });
    const raw = Array.isArray(res) ? res : res.items || res;
    setDeletedRows(normalize(raw));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchActive();
        if (showDeleted) await fetchDeleted();
      } finally { setLoading(false); }
    })();
  }, [globalSearch, showDeleted]);

  // ====== OPEN MODALS ======
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setActiveTab("overview");
  };
  const openEdit = (r) => {
    setEditing(r);
    setActiveTab("overview");
    // Map cơ bản; nếu cần full detail có thể gọi API theo id để fill thêm
    setForm({
      ...emptyForm,
      Name: r.name || "",
      Location: r.location || "",
      Description: r.description || "",
      Category: r.category || "",
      Price: r.price || 0,
      Rating: r.rating || 0,
      ImageURL: r.imageURL || ""
    });
  };

  // ====== SAVE ======
  const save = async () => {
    try {
      const payload = {
        ...form,
        ImageURL: cleanUrl(form.ImageURL),
        DurationDays: Number(form.DurationDays || 0),
        MaxGroupSize: Number(form.MaxGroupSize || 0),
        GuideIncluded: Boolean(form.GuideIncluded),
        Price: Number(form.Price || 0),
        PriceAdult: form.PriceAdult === "" ? null : Number(form.PriceAdult),
        PriceChild: form.PriceChild === "" ? null : Number(form.PriceChild),
        DepositPercent: form.DepositPercent === "" ? null : Number(form.DepositPercent),
        Rating: Number(form.Rating || 0),
      };

      if (editing && editing !== null) await tourApi.update(editing.tourID, payload);
      else await tourApi.create(payload);

      clearDraft();
      setEditing(undefined);
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Có lỗi xảy ra");
    }
  };

  // ====== DELETE & RESTORE ======
  const remove = async (r) => {
    if (!window.confirm(`Xoá (mềm) tour "${r.name}"?`)) return;
    try {
      await tourApi.remove(r.tourID);
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Không thể xoá.");
    }
  };
  const restore = async (r) => {
    try {
      await tourApi.restore(r.tourID);
      await fetchDeleted();
      await fetchActive();
    } catch (err) {
      alert(err?.message || "Không thể khôi phục.");
    }
  };

  const tableRows = showDeleted ? deletedRows : rows;

  // ====== UPLOAD ẢNH ======
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5059";
      const res = await axios.post(`${apiBase}/api/admin/tours/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res?.data?.url || "";
      setForm(prev => ({ ...prev, ImageURL: url }));
    } catch (err) {
      alert("Upload thất bại.");
      void err;
      /* ignore: lỗi upload đã báo cho người dùng */
    }
  };

  // ====== ĐỒNG BỘ VỚI TourDetail: ?create=1|?editId=|?deleteId= ======
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const createFlag = sp.get("create");
    const editId = sp.get("editId");
    const deleteId = sp.get("deleteId");

    if (createFlag === "1") {
      openCreate();
      sp.delete("create");
      navigate({ search: sp.toString() }, { replace: true });
      return;
    }

    if (editId) {
      const idNum = Number(editId);
      const tryOpen = () => {
        const r = tableRows.find(x => Number(x.tourID) === idNum);
        if (r) {
          openEdit(r);
          sp.delete("editId");
          navigate({ search: sp.toString() }, { replace: true });
        }
      };
      tryOpen();
      const timer = setTimeout(tryOpen, 300);
      return () => clearTimeout(timer);
    }

    if (deleteId) {
      const idNum = Number(deleteId);
      const r = tableRows.find(x => Number(x.tourID) === idNum);
      const runDelete = async () => {
        let target = r;
        if (!target) {
          try {
            const detail = await tourApi.getById(idNum);
            const d = detail?.data ?? detail;
            target = normalize([d])[0];
          } catch (e) {
            void e;
          }
        }
        const name = target?.name ? ` "${target.name}"` : "";
        if (window.confirm(`Xoá (mềm) tour${name}?`)) {
          try {
            await tourApi.remove(idNum);
            await fetchActive();
          } catch (err) {
            alert(err?.message || "Không thể xoá.");
          }
        }
        sp.delete("deleteId");
        navigate({ search: sp.toString() }, { replace: true });
      };
      runDelete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, tableRows]);

  // ====== AUTOSAVE NHÁP ======
  const DRAFT_KEY = "admin_tour_form_draft";
 useEffect(() => {
   if (editing === null) {
     try {
       const raw = localStorage.getItem(DRAFT_KEY);
       if (raw) setForm(f => ({ ...f, ...JSON.parse(raw) }));
     } catch {
       /* ignore: JSON draft lỗi */
     }
   }
 }, [editing]);

  useEffect(() => {
   if (editing === undefined) return;
   const id = setTimeout(() => {
     try {
       localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
     } catch {
       /* ignore: quota/localStorage lỗi */
     }
   }, 300);
   return () => clearTimeout(id);
 }, [form, editing]);

   const clearDraft = () => {
   try {
     localStorage.removeItem(DRAFT_KEY);
   } catch {
     /* ignore */
   }
 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Quản lý Tour</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showDeleted} onChange={(e)=>setShowDeleted(e.target.checked)} />
            Hiển thị thùng rác
          </label>
          {!showDeleted && (
            <button onClick={openCreate} className="rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700">
              + Thêm tour
            </button>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        rows={tableRows}
        onEdit={!showDeleted ? openEdit : undefined}
        onDelete={!showDeleted ? remove : undefined}
        onRestore={showDeleted ? restore : undefined}
      />

      {loading && <div className="text-sm text-gray-500">Đang tải...</div>}

      {/* ========= MODAL ========= */}
      {editing !== undefined && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div
            className="w-full max-w-4xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-3 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{editing ? "Sửa tour" : "Thêm tour"}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(undefined); clearDraft(); }}
                    className="px-3 py-2 rounded-lg border"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={save}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                  >
                    Lưu
                  </button>
                </div>
              </div>

              {/* TABs */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["overview", "Tổng quan"],
                  ["itinerary", "Hành trình & Dịch vụ"],
                  ["spec", "Thông số"],
                  ["price", "Giá & Chính sách"],
                  ["media", "Ảnh"]
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      activeTab === key ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body: scrollable */}
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* TAB: Tổng quan */}
              {activeTab === "overview" && (
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">Tên
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.Name} onChange={(e)=>setForm({...form, Name: e.target.value})}/>
                  </label>
                  <label className="text-sm">Địa điểm
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.Location} onChange={(e)=>setForm({...form, Location: e.target.value})}/>
                  </label>
                  <label className="text-sm">Danh mục
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.Category} onChange={(e)=>setForm({...form, Category: e.target.value})}/>
                  </label>
                  <label className="text-sm">Đánh giá
                    <input type="number" step="0.1" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.Rating} onChange={(e)=>setForm({...form, Rating: Number(e.target.value||0)})}/>
                  </label>
                  <label className="text-sm md:col-span-2">Mô tả
                    <textarea className="mt-1 w-full border rounded-lg px-3 py-2 resize-y min-h-24"
                      rows={3}
                      value={form.Description}
                      onChange={(e)=>setForm({...form, Description: e.target.value})}/>
                  </label>
                </div>
              )}

              {/* TAB: Hành trình & Dịch vụ */}
              {activeTab === "itinerary" && (
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm md:col-span-2">Hành trình (mỗi dòng = 1 ngày/mục)
                    <textarea className="mt-1 w-full border rounded-lg px-3 py-2 resize-y min-h-24"
                      placeholder={"Ngày 1: ...\nNgày 2: ..."}
                      value={form.Itinerary} onChange={(e)=>setForm({...form, Itinerary: e.target.value})}/>
                  </label>
                  <label className="text-sm">Bao gồm (ngăn cách bằng xuống dòng, “;”, “,”)
                    <textarea className="mt-1 w-full border rounded-lg px-3 py-2 resize-y min-h-24"
                      value={form.Includes} onChange={(e)=>setForm({...form, Includes: e.target.value})}/>
                  </label>
                  <label className="text-sm">Không bao gồm
                    <textarea className="mt-1 w-full border rounded-lg px-3 py-2 resize-y min-h-24"
                      value={form.Excludes} onChange={(e)=>setForm({...form, Excludes: e.target.value})}/>
                  </label>
                  <label className="text-sm md:col-span-2">Ghi chú
                    <textarea className="mt-1 w-full border rounded-lg px-3 py-2 resize-y min-h-20"
                      value={form.Notes} onChange={(e)=>setForm({...form, Notes: e.target.value})}/>
                  </label>
                  <label className="text-sm md:col-span-2">Điểm nhấn (Highlights)
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      placeholder="VD: chèo kayak; ngắm hoàng hôn; ..."
                      value={form.Highlights} onChange={(e)=>setForm({...form, Highlights: e.target.value})}/>
                  </label>
                </div>
              )}

              {/* TAB: Thông số */}
              {activeTab === "spec" && (
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">Khởi hành từ
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.StartLocation} onChange={(e)=>setForm({...form, StartLocation: e.target.value})}/>
                  </label>
                  <label className="text-sm">Kết thúc tại
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.EndLocation} onChange={(e)=>setForm({...form, EndLocation: e.target.value})}/>
                  </label>
                  <label className="text-sm">Số ngày
                    <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.DurationDays} onChange={(e)=>setForm({...form, DurationDays: Number(e.target.value||0)})}/>
                  </label>
                  <label className="text-sm">Số khách tối đa
                    <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.MaxGroupSize} onChange={(e)=>setForm({...form, MaxGroupSize: Number(e.target.value||0)})}/>
                  </label>
                  <label className="text-sm">Phương tiện
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.TransportType} onChange={(e)=>setForm({...form, TransportType: e.target.value})}/>
                  </label>
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox"
                      checked={form.GuideIncluded}
                      onChange={(e)=>setForm({...form, GuideIncluded: e.target.checked})}/>
                    Bao gồm HDV
                  </label>
                </div>
              )}

              {/* TAB: Giá & Chính sách */}
              {activeTab === "price" && (
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">Giá cơ bản (₫)
                    <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.Price} onChange={(e)=>setForm({...form, Price: Number(e.target.value||0)})}/>
                  </label>
                  <label className="text-sm">Giá người lớn (₫)
                    <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.PriceAdult} onChange={(e)=>setForm({...form, PriceAdult: e.target.value})}/>
                  </label>
                  <label className="text-sm">Giá trẻ em (₫)
                    <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.PriceChild} onChange={(e)=>setForm({...form, PriceChild: e.target.value})}/>
                  </label>
                  <label className="text-sm">Tiền tệ
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.Currency} onChange={(e)=>setForm({...form, Currency: e.target.value})}/>
                  </label>
                  <label className="text-sm md:col-span-2">Chính sách huỷ
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.CancellationPolicy} onChange={(e)=>setForm({...form, CancellationPolicy: e.target.value})}/>
                  </label>
                  <label className="text-sm">% Đặt cọc
                    <input type="number" step="0.1" className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={form.DepositPercent} onChange={(e)=>setForm({...form, DepositPercent: e.target.value})}/>
                  </label>
                </div>
              )}

              {/* TAB: Ảnh */}
              {activeTab === "media" && (
                <div className="grid gap-3">
                  <label className="text-sm">Ảnh (URL)
                    <input className="mt-1 w-full border rounded-lg px-3 py-2"
                      placeholder="/uploads/tours/abc.jpg hoặc https://..."
                      value={form.ImageURL}
                      onChange={(e)=>setForm({...form, ImageURL: e.target.value})}/>
                  </label>
                  <label className="text-sm">Hoặc upload file
                    <input type="file" className="mt-1" onChange={handleFileChange}/>
                  </label>
                  {form.ImageURL && (
                    <div>
                      <div className="text-xs text-gray-500">Xem trước:</div>
                      <img
                        src={resolveImageUrl(form.ImageURL)}
                        alt="preview"
                        className="mt-2 w-60 h-40 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
