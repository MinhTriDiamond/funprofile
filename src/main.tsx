// Force rebuild 2026-03-08
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.info(`[FUN Profile] Build: ${import.meta.env.VITE_BUILD_ID || "dev"} | ${new Date().toISOString()}`);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
