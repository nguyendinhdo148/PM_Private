import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({ 
  base: "/",
  plugins: [
    tailwindcss(), 
    reactRouter(), // reactRouter đã bao gồm React, không dùng thêm plugin react() nữa
    tsconfigPaths()
  ],
  build: {
    outDir: "build/client",
    sourcemap: false,
    copyPublicDir: true,
  },
});