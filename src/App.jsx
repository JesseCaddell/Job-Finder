import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";
import { LOCAL_LOGIN_PATH } from "./lib/session.js";
import AppShell from "./components/AppShell.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import LocalLogin from "./pages/LocalLogin.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import SetPassword from "./pages/SetPassword.jsx";
import { JobsProvider } from "./context/JobsContext.jsx";
import Board from "./pages/board/Board.jsx";
import Archive from "./pages/archive/Archive.jsx";
import SettingsLayout from "./pages/settings/SettingsLayout.jsx";
import SearchProfile from "./pages/settings/SearchProfile.jsx";
import FeedPreferences from "./pages/settings/FeedPreferences.jsx";
import KeywordsPage from "./pages/settings/KeywordsPage.jsx";

/* "/" decides where a visitor belongs: signed-in visitors to the board,
   signed-out visitors to the sign-in page for the current mode. */
function Home() {
    const { ready, sharedMode, account } = useApp();
    if (!ready) return null;
    return <Navigate to={account ? "/board" : sharedMode ? "/login" : LOCAL_LOGIN_PATH} replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/local-login" element={<LocalLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<SetPassword variant="reset" />} />
            <Route path="/accept-invite" element={<SetPassword variant="invite" />} />
            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route element={<JobsProvider><Outlet /></JobsProvider>}>
                    <Route path="/board" element={<Board />} />
                    <Route path="/archive" element={<Archive />} />
                </Route>
                <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<SearchProfile />} />
                    <Route path="feed" element={<FeedPreferences />} />
                    <Route path="feed/keywords" element={<KeywordsPage />} />
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
