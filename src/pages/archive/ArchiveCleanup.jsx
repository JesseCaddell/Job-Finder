import { useState } from "react";
import { ListFilter, TriangleAlert } from "lucide-react";
import { isProtectedStatus } from "../../lib/stages.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const AGE_OPTIONS = [
    { value: "any", label: "Any date added" },
    { value: "30", label: "Older than 30 days" },
    { value: "90", label: "Older than 90 days" }
];

/* Narrows the archive to a smaller set to review before deleting anything.
   "Review matching jobs" only selects them; nothing is deleted here. Jobs
   categorized past "new" are never matched. */
export default function ArchiveCleanup({ archivedJobs, onReview }) {
    const [under, setUnder] = useState("40");
    const [age, setAge] = useState("30");

    const review = () => {
        const limit = parseInt(under);
        const cutoff = age === "any" ? null : Date.now() - parseInt(age) * DAY_MS;
        const matches = archivedJobs.filter(j =>
            j.fit != null && j.fit < (isNaN(limit) ? 40 : limit) &&
            (cutoff === null || j.added < cutoff) &&
            !isProtectedStatus(j));
        onReview(matches);
    };

    return (
        <aside className="archive-side">
            <section className="card cleanup">
                <div className="card-intro">
                    <h2>Archive cleanup</h2>
                    <p>Review a smaller set before deleting anything.</p>
                </div>
                <div className="field">
                    <label htmlFor="scored-under">Scored under</label>
                    <div className="input">
                        <input id="scored-under" type="number" min="0" max="100" value={under} onChange={e => setUnder(e.target.value)} />
                        <span className="input-suffix">/ 100</span>
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="date-added">Date added</label>
                    <div className="input">
                        <select id="date-added" className="plain-select" value={age} onChange={e => setAge(e.target.value)}>
                            {AGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
                <button type="button" className="btn btn-outline" onClick={review}><ListFilter size={16} /> Review matching jobs</button>
                <hr />
                <p className="cleanup-note">Cleanup only affects Archive. Matching jobs are selected for review, not automatically deleted.</p>
            </section>

            <section className="permanent">
                <TriangleAlert size={18} />
                <strong>Permanent means permanent.</strong>
                <p>Deleting removes a job from this shared board for both members. A confirmation is required.</p>
            </section>
        </aside>
    );
}
