import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { LOCAL_LOGIN_PATH } from "../lib/session.js";

/* Gate for signed-in pages: signed-out visitors go to the sign-in page for the
   current mode (Supabase accounts, or the local passcode gate). */
export default function RequireAuth({ children }) {
    const { ready, sharedMode, account } = useApp();
    if (!ready) return null;
    if (!account) return <Navigate to={sharedMode ? "/login" : LOCAL_LOGIN_PATH} replace />;
    return children;
}
