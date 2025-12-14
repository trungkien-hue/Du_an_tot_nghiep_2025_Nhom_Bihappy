// src/Pages/HotelDetail/HotelImagesSection.jsx
import { useState, useEffect, useRef } from "react";
import hotelImageApi from "../../services/hotelImageApi";

export default function HotelImagesSection({ hotelId }) {
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  /* =======================================================
        FIX ẢNH BỊ ĐEN — chuẩn hóa URL ảnh
     ======================================================= */
  function resolveImg(url) {
    if (!url) return "/images/default-hotel.jpg";

    if (url.startsWith("http")) return url;

    const base = import.meta.env.VITE_API_BASE || "http://localhost:7059";
    return base + url; // kết nối đúng backend host
  }

  /* =======================================================
        LOAD IMAGE LIST
     ======================================================= */
  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await hotelImageApi.getAll(hotelId);
      setImages(data); // backend trả PascalCase → giữ nguyên
    } catch (err) {
      console.error("LOAD IMG ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelId) loadImages();
  }, [hotelId]);

  /* =======================================================
        SELECT FILES
     ======================================================= */
  const handleSelectFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  /* =======================================================
        UPLOAD IMAGE
     ======================================================= */
  const handleUpload = async () => {
    if (!files.length) {
      alert("Chưa chọn ảnh");
      return;
    }

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      await hotelImageApi.upload(hotelId, fd);

      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";

      await loadImages();
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload thất bại.");
    }
  };

  /* =======================================================
        DELETE IMAGE — FIX imageId undefined
     ======================================================= */
  const handleDelete = async (id) => {
    if (!confirm("Xóa ảnh này?")) return;

    try {
      await hotelImageApi.delete(hotelId, id);
      loadImages();
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  /* =======================================================
        SET PRIMARY
     ======================================================= */
  const handleSetPrimary = async (id) => {
    try {
      await hotelImageApi.setPrimary(hotelId, id);
      loadImages();
    } catch (err) {
      console.error("PRIMARY ERROR:", err);
    }
  };

  /* =======================================================
        MOVE ORDER — FIX HotelImageID
     ======================================================= */
  const moveImage = async (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= images.length) return;

    const list = [...images];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    setImages(list);

    try {
      await hotelImageApi.reorder(
        hotelId,
        list.map((x) => x.HotelImageID)
      );
    } catch (err) {
      console.error("REORDER ERROR:", err);
    }
  };

  /* =======================================================
        RENDER
     ======================================================= */
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">

      {/* Upload */}
      <div className="flex gap-3 mb-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelectFiles}
        />
        <button
          onClick={handleUpload}
          className="bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg"
        >
          Upload
        </button>
      </div>

      {/* Image list */}
      {loading ? (
        <p className="opacity-70">Đang tải...</p>
      ) : images.length === 0 ? (
        <p className="opacity-70">Chưa có ảnh nào.</p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {images.map((img, i) => (
            <div
              key={img.HotelImageID ?? `img-${i}`}
              className="relative group"
            >
              <img
                src={resolveImg(img.ImageUrl ?? img.imageUrl)}
                alt="hotel-img"
                className="w-full h-24 object-cover rounded-lg ring-1 ring-white/20"
              />

              {/* DELETE */}
              <button
                onClick={() => handleDelete(img.HotelImageID)}
                className="absolute top-1 right-1 bg-red-500 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100"
              >
                X
              </button>

              {/* SET PRIMARY */}
              <button
                onClick={() => handleSetPrimary(img.HotelImageID)}
                className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
              >
                Cover
              </button>

              {/* REORDER */}
              <div className="absolute left-1 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => moveImage(i, -1)}
                  className="bg-white/40 text-black text-xs px-1 rounded"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveImage(i, 1)}
                  className="bg-white/40 text-black text-xs px-1 rounded"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
