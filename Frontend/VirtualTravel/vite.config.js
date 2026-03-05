import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Thêm dòng này để xác định rõ thư mục chứa file tĩnh là public
  publicDir: 'public', 
  server: {
    port: 5173,
    open: true,
    strictPort: true,
    cors: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  // Thêm phần này để đảm bảo Vite không cố gắng xử lý các file trong thư mục js và css
  build: {
    assetsInlineLimit: 0, 
    rollupOptions: {
      external: [
        /^js\/.*/,
        /^css\/.*/,
        /^images\/.*/
      ]
    }
  }
});