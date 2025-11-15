// src/utils/url.js
export function toCdn(url) {
  if (!url) return "";
  // Nếu đã là URL đầy đủ (http/https) thì giữ nguyên
  if (/^https?:\/\//i.test(url)) return url;

  // Dùng BASE không /api để ghép ảnh/static
  const base = import.meta.env.VITE_API_BASE_URL; // ví dụ: https://trd1b14g-7059.asse.devtunnels.ms
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}
