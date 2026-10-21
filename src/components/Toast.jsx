import { createContext, useCallback, useContext, useRef, useState } from "react";
import "./toast.css";

const ToastContext = createContext(() => {});

/* One message at a time, auto-dismissed — same behaviour as the legacy
   toast() helper. */
export function ToastProvider({ children }) {
    const [message, setMessage] = useState("");
    const timer = useRef(null);

    const toast = useCallback(msg => {
        setMessage(msg);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setMessage(""), 2400);
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className={"toast" + (message ? " show" : "")} role="status" aria-live="polite">{message}</div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
