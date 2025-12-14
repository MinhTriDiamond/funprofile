import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  // Remove initial loader AFTER React mounts
  const removeLoader = () => {
    const loader = rootElement.querySelector('.initial-loader');
    if (loader) {
      loader.remove();
    }
  };

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Remove loader after first paint
  requestAnimationFrame(() => {
    requestAnimationFrame(removeLoader);
  });
}
