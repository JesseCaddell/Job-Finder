import { useCallback, useEffect, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { useApp } from "../../context/AppContext.jsx";
import { useToast } from "../../components/Toast.jsx";
import { loadSettings, saveSettings, clearLocalState, getLocalState, saveLocalState } from "../../lib/data.js";
import { DEFAULT_LOW_SCORE_THRESHOLD } from "../../lib/defaults.js";
import { signOutEverywhere } from "../../lib/auth.js";
import { LEGACY_URL } from "../../lib/session.js";
import ProfileCard from "./ProfileCard.jsx";
import ResumesCard from "./ResumesCard.jsx";
import LocalTeamCard from "./LocalTeamCard.jsx";

export default function SearchProfile() {
    const { sharedMode } = useApp();
    const toast = useToast();
    const [settings, setSettings] = useState(null);
    const [threshold, setThreshold] = useState("");
    const [passcode, setPasscode] = useState("");   // local mode only

    useEffect(() => {
        let alive = true;
        loadSettings().then(s => {
            if (!alive) return;
            setSettings({ ...s });
            setThreshold(String(s.low_score_threshold ?? DEFAULT_LOW_SCORE_THRESHOLD));
        });
        return () => { alive = false; };
    }, []);

    // Writes to the data layer, then mirrors the change into page state.
    const persist = useCallback(async patch => {
        await saveSettings(patch);
        setSettings(s => ({ ...s, ...patch }));
    }, []);

    const saveAll = async () => {
        const low_score_threshold = Math.max(0, Math.min(100, parseInt(threshold) || DEFAULT_LOW_SCORE_THRESHOLD));
        await persist({ low_score_threshold });
        setThreshold(String(low_score_threshold));
        if (!sharedMode && passcode.trim()) {
            getLocalState().code = passcode.trim();
            saveLocalState();
            setPasscode("");
        }
        toast("Settings saved");
    };

    const dangerAction = async () => {
        if (sharedMode) {
            if (!window.confirm("Sign out on all devices? Your data stays in Supabase.")) return;
            await signOutEverywhere();   // the auth listener then routes to /login
        } else {
            if (!window.confirm("Erase all jobs, settings, and sign-in on this device?")) return;
            clearLocalState();
            window.location.replace(LEGACY_URL);
        }
    };

    if (!settings) return null;

    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h1>A clearer picture of you.</h1>
                <p>Give AI the right context to find a more useful fit.</p>
            </div>

            <div className="notice">
                <Sparkles size={18} />
                <p>
                    Each job is scored against your search background and its matching resume: PM for product roles,
                    Dev for engineering roles. Scores explain the fit; they don’t make the decision for you.
                </p>
            </div>

            <ProfileCard profile={settings.profile} onSave={profile => persist({ profile })} onSaved={() => toast("Profile saved")} />
            <ResumesCard settings={settings} persist={persist} toast={toast} />

            <section className="card">
                <div className="card-intro">
                    <h2>Low score threshold</h2>
                    <p>A cleanup rule, not an automatic rejection.</p>
                </div>
                <div className="threshold">
                    <div className="field">
                        <label htmlFor="threshold">Below this score</label>
                        <div className="input">
                            <input
                                id="threshold" type="number" min="0" max="100"
                                value={threshold} onChange={e => setThreshold(e.target.value)}
                            />
                        </div>
                    </div>
                    <p>
                        Jobs scoring under {parseInt(threshold) || DEFAULT_LOW_SCORE_THRESHOLD} are eligible for “Remove low scores” in
                        Feed tools. They move to Archive only when you choose to remove them.
                    </p>
                </div>
            </section>

            {!sharedMode && <LocalTeamCard passcode={passcode} onPasscode={setPasscode} />}

            <div className="save-row">
                <span>Changes apply to future scoring. Rescore jobs from Feed tools.</span>
                <button type="button" className="btn btn-primary" onClick={saveAll}>Save settings</button>
            </div>

            <section className="danger-zone">
                <div className="danger-zone-copy">
                    <strong>Danger zone</strong>
                    <p>
                        {sharedMode
                            ? "Sign out everywhere. Your board, search background, and resumes stay in Supabase."
                            : "Wipe all local data on this device."}
                    </p>
                </div>
                <button type="button" className="btn btn-danger" onClick={dangerAction}>
                    {sharedMode ? <><LogOut size={16} /> Sign out everywhere</> : "Clear all data"}
                </button>
            </section>
        </>
    );
}
