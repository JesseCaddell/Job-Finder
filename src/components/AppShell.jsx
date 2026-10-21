import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Archive, ChevronDown, LayoutDashboard, LogOut, Settings2 } from "lucide-react";
import Brand from "./Brand.jsx";
import { useApp } from "../context/AppContext.jsx";
import { initials } from "../lib/format.js";
import { LEGACY_URL } from "../lib/session.js";
import "./shell.css";

/* Top navigation shared by every signed-in page. Board and Archive still live
   in the original app until their pages are migrated, so they are plain links;
   Settings is a React route. */
function AccountMenu() {
    const { account, signOut } = useApp();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div className="account" ref={ref}>
            <button type="button" className="account-btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu">
                <span className="avatar">{initials(account.name)}</span>
                <span className="account-name">{account.name}</span>
                <ChevronDown size={14} />
            </button>
            {open && (
                <div className="account-menu" role="menu">
                    <button type="button" role="menuitem" onClick={signOut}><LogOut size={15} /> Sign out</button>
                </div>
            )}
        </div>
    );
}

export default function AppShell() {
    return (
        <div className="shell">
            <header className="nav">
                <Brand />
                <nav className="nav-items" aria-label="Workspace">
                    <a className="nav-item" href={LEGACY_URL}><LayoutDashboard size={17} /> Board</a>
                    <a className="nav-item" href={LEGACY_URL + "#archived"}><Archive size={17} /> Archive</a>
                    <NavLink className={({ isActive }) => "nav-item" + (isActive ? " active" : "")} to="/settings">
                        <Settings2 size={17} /> Settings
                    </NavLink>
                </nav>
                <AccountMenu />
            </header>
            <Outlet />
        </div>
    );
}
