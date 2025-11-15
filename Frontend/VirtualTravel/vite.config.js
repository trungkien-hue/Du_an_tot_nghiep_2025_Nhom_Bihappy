import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,        // cổng frontend
    open: true,        // tự mở trình duyệt khi chạy
    strictPort: true,  // nếu port 5173 bận thì báo lỗi thay vì đổi port
    cors: true,        // cho phép gọi API cross-origin (khi backend là domain khác)
  },
  preview: {
    port: 4173,        // cổng khi build preview
    strictPort: true,
  },
});
