import { defineConfig } from "vite";

// Backend Python roda em 127.0.0.1:8765.
// Padrao era 8000, mas a porta conflita com outros backends locais
// (ex: engagelens). Manter em 8765 evita briga de listeners.
// Se mudar aqui, atualizar PORT em server-python/.env.local tambem.
const BACKEND_TARGET = "http://127.0.0.1:8765";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
