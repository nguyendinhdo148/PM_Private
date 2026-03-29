import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  prerender: ["/"], // Ép nó phải tạo file index.html cho trang chủ
} satisfies Config;