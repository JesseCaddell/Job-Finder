import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <AppProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </AppProvider>
        </BrowserRouter>
    </React.StrictMode>
);
