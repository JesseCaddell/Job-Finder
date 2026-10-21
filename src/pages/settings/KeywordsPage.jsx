import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import KeywordManager from "./KeywordManager.jsx";
import useFeedSettings from "./useFeedSettings.js";

/* The full allowlist, reached from "Manage full allowlist" on Feed preferences. */
export default function KeywordsPage() {
    const { loaded, titleKw, changeTitleKw } = useFeedSettings();
    if (!loaded) return null;

    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h1>Your full allowlist.</h1>
                <p>Every title keyword Pull feed now matches against. Changes save automatically.</p>
            </div>
            <section className="card">
                <div className="card-intro kw-intro">
                    <div>
                        <h2>Title keyword allowlist</h2>
                        <p>Pull feed now only imports postings with a title that matches one of these.</p>
                    </div>
                    <Link to="/settings/feed" className="btn btn-outline btn-sm"><ArrowLeft size={16} /> Back to feed preferences</Link>
                </div>
                <KeywordManager keywords={titleKw} onChange={changeTitleKw} />
            </section>
        </>
    );
}
