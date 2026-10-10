import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./styles/tokens.css";
import "./styles/base.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root not found.");
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary label="Smart Respiratory Lung Analysis System">
      <App />
    </ErrorBoundary>
  </StrictMode>
);
