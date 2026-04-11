import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { i18nReady } from "@/i18n/config";

const root = createRoot(document.getElementById("root")!);

void i18nReady.finally(() => {
  root.render(<App />);
});
