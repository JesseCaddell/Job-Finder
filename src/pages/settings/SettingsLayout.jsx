import { NavLink, Outlet } from "react-router-dom";
import { LockKeyhole, SlidersHorizontal, UserRound } from "lucide-react";
import "./settings.css";

/* Sections shown in the sidebar. Each later settings page adds itself here. */
const SECTIONS = [
    { to: "/settings/profile", label: "Search profile & resumes", icon: UserRound },
    { to: "/settings/feed", label: "Feed preferences", icon: SlidersHorizontal }
];

export default function SettingsLayout() {
    return (
        <div className="settings page-centered">
            <aside className="settings-nav">
                <div className="settings-nav-heading">
                    <h2 className="serif">Settings</h2>
                    <p>Make the feed work for you.</p>
                </div>
                <nav className="settings-sections" aria-label="Settings sections">
                    {SECTIONS.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => "settings-link" + (isActive ? " active" : "")}>
                            <Icon size={17} /> <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
                <hr className="settings-rule" />
                <div className="settings-privacy">
                    <LockKeyhole size={18} />
                    <p>Your profile and resumes guide AI scoring. Your board keeps the search organized.</p>
                </div>
            </aside>
            <div className="settings-content">
                <Outlet />
            </div>
        </div>
    );
}
