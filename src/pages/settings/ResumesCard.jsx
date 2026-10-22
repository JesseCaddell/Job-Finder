import { useRef, useState } from "react";
import { Clipboard, FileText, Info, Upload } from "lucide-react";
import Modal from "../../components/Modal.jsx";
import { SB } from "../../lib/config.js";
import { useApp } from "../../context/AppContext.jsx";
import { activeResume, TRACK_LABEL } from "../../lib/tracks.js";
import { extractResumeText, pastedResumeVersion, uploadResumeVersion, viewResumeFile } from "../../lib/resumes.js";

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function TrackSelect({ value, onChange, label }) {
    return (
        <select className="select" value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
            <option value="pm">PM</option>
            <option value="dev">Dev</option>
        </select>
    );
}

export default function ResumesCard({ settings, persist, toast }) {
    const { account } = useApp();
    const [track, setTrack] = useState("pm");
    const [status, setStatus] = useState({ text: "", ok: false });
    const [dragging, setDragging] = useState(false);
    const [pasting, setPasting] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [pasteTrack, setPasteTrack] = useState("pm");
    const fileInput = useRef(null);

    const versions = settings.resume_versions || [];

    // Each upload also refreshes settings.resume / resume_text, which scoring
    // falls back to when a track has no tagged resume.
    const addVersion = async (version, text) => {
        await persist({ resume: text, resume_text: text, resume_versions: [...versions, version] });
        toast(`${TRACK_LABEL[version.track]} resume added — it will score ${TRACK_LABEL[version.track]} roles`);
    };

    const handleFile = async file => {
        if (!file) return;
        setStatus({ text: "Reading file…", ok: false });
        try {
            const text = await extractResumeText(file);
            if (!text.trim()) throw new Error("No text found in file");
            setStatus({ text: "Uploading file…", ok: false });
            const version = await uploadResumeVersion(file, text, track, account?.id);
            await addVersion(version, text);
            setStatus({ text: `✓ ${file.name} — ${Math.round(text.length / 4)} tokens extracted`, ok: true });
        } catch (e) {
            console.warn(e);
            setStatus({ text: "Could not read file: " + e.message, ok: false });
        }
    };

    const savePasted = async () => {
        const text = pasteText.trim();
        if (!text) return;
        await addVersion(pastedResumeVersion(text, pasteTrack, TRACK_LABEL[pasteTrack]), text);
        setPasting(false);
        setPasteText("");
    };

    const retag = async (id, value) => {
        await persist({ resume_versions: versions.map(v => v.id === id ? { ...v, track: value || null } : v) });
    };

    const view = async path => {
        try { await viewResumeFile(path); } catch (e) { toast(e.message); }
    };

    const untagged = versions.filter(v => !v.track).length;

    return (
        <section className="card">
            <div className="card-intro">
                <h2>Resumes</h2>
                <p>Keep a focused resume for each track. Each job is scored with the matching active resume.</p>
            </div>

            <div className="resume-import">
                <div
                    className={"resume-drop" + (dragging ? " drag" : "")}
                    onClick={e => { if (!e.target.closest(".classify")) fileInput.current.click(); }}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                >
                    <input
                        ref={fileInput} type="file" accept={ACCEPT}
                        onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }}
                    />
                    <Upload size={22} />
                    <strong>Drop a resume here, or browse</strong>
                    <small>PDF or Word (.doc, .docx)</small>
                    <div className="classify">
                        <span>Classify as</span>
                        <TrackSelect value={track} onChange={setTrack} label="Classify upload as" />
                    </div>
                </div>
                <div className="resume-paste">
                    <strong>Prefer plain text?</strong>
                    <p>Paste resume text and choose a PM or Dev track.</p>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setPasting(true)}>
                        <Clipboard size={16} /> Paste resume text
                    </button>
                </div>
            </div>
            {status.text && <p className={"upload-status" + (status.ok ? " ok" : "")}>{status.text}</p>}

            {versions.length > 0 && (
                <div className="resume-list">
                    {versions.slice().reverse().map(v => {
                        const active = v.track && activeResume(settings, v.track)?.id === v.id;
                        return (
                            <div className="resume-row" key={v.id}>
                                <FileText size={19} />
                                <div className="resume-identity">
                                    <span className="name">{v.filename}</span>
                                    {active && <span className="tag tag-green">Active for scoring</span>}
                                </div>
                                <select className="select" value={v.track || ""} onChange={e => retag(v.id, e.target.value)} aria-label={`Track for ${v.filename}`}>
                                    <option value="">Untagged</option>
                                    <option value="pm">PM</option>
                                    <option value="dev">Dev</option>
                                </select>
                                {v.path && SB && <button type="button" className="text-link" onClick={() => view(v.path)}>View</button>}
                            </div>
                        );
                    })}
                </div>
            )}

            {untagged > 0 && (
                <p className="hint">
                    <Info size={16} />
                    {untagged} upload{untagged === 1 ? " is" : "s are"} untagged. Choose PM or Dev so scoring knows which resume to use.
                </p>
            )}

            {pasting && (
                <Modal
                    title="Paste resume text"
                    onClose={() => setPasting(false)}
                    footer={<>
                        <button type="button" className="btn btn-outline" onClick={() => setPasting(false)}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={savePasted} disabled={!pasteText.trim()}>Save resume</button>
                    </>}
                >
                    <div className="classify">
                        <span>Classify as</span>
                        <TrackSelect value={pasteTrack} onChange={setPasteTrack} label="Classify pasted resume as" />
                    </div>
                    <textarea
                        className="textarea" rows={14} autoFocus value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder="Paste your resume text here…" aria-label="Resume text"
                    />
                </Modal>
            )}
        </section>
    );
}
