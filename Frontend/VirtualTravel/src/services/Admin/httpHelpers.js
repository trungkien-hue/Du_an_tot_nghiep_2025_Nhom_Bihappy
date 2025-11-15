// Nhỏ gọn tiện build query string (pagination, filter...)
export function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}
