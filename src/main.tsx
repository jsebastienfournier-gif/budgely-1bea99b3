import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations
      .filter((registration) => registration.active?.scriptURL.includes("/sw.js"))
      .forEach((registration) => registration.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
