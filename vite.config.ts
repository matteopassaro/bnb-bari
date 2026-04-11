import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "path";
import { componentTagger } from "lovable-tagger";

const localesDirectory = path.resolve(__dirname, "./src/i18n/locales");

const getLocaleFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return getLocaleFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });

const localesPlugin = () => ({
  name: "locales-from-src",
  configureServer(server: any) {
    server.middlewares.use("/locales", (req: any, res: any, next: () => void) => {
      const requestPath = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\/+/, "");
      const filePath = path.resolve(localesDirectory, requestPath);

      if (!filePath.startsWith(localesDirectory) || !filePath.endsWith(".json") || !fs.existsSync(filePath)) {
        next();
        return;
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(fs.readFileSync(filePath, "utf8"));
    });
  },
  generateBundle() {
    getLocaleFiles(localesDirectory).forEach((filePath) => {
      const relativePath = path.relative(localesDirectory, filePath).replace(/\\/g, "/");

      this.emitFile({
        type: "asset",
        fileName: `locales/${relativePath}`,
        source: fs.readFileSync(filePath, "utf8"),
      });
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
  },
  plugins: [react(), localesPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
