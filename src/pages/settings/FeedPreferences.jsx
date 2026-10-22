import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useToast } from "../../components/Toast.jsx";
import { loadJobs } from "../../lib/data.js";
import { feedConfigured, feedSummary, NO_FEED_MSG, pullFeed } from "../../lib/feed.js";
import KeywordManager from "./KeywordManager.jsx";
import LocationsCard from "./LocationsCard.jsx";
import useFeedSettings from "./useFeedSettings.js";

const PREVIEW_COUNT = 6;
const SOURCES = ["Ashby", "YC (HN)", "HN Who’s Hiring"];

export default function FeedPreferences() {
    const toast = useToast();
    const { loaded, titleKw, locationKw, changeTitleKw, changeLocationKw } = useFeedSettings();
    const [pulling, setPulling] = useState(false);

    const pull = async () => {
        if (!feedConfigured()) { toast(NO_FEED_MSG); return; }
        setPulling(true); toast("Pulling feed…");
        try {
            toast(feedSummary(await pullFeed(await loadJobs())));
        } catch (e) {
            console.warn(e);
            toast("Couldn't reach the feed endpoint");
        }
        setPulling(false);
    };

    if (!loaded) return null;

    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h1>Less noise. More possibility.</h1>
                <p>Decide which titles and locations make it into your feed.</p>
            </div>

            <section className="card">
                <div className="card-intro">
                    <h2>Title keyword allowlist</h2>
                    <p>Pull feed now only imports postings with a title that matches your saved allowlist.</p>
                </div>
                <KeywordManager keywords={titleKw} onChange={changeTitleKw} limit={PREVIEW_COUNT} fullPath="/settings/feed/keywords" />
            </section>

            <LocationsCard locations={locationKw} onChange={changeLocationKw} />

            <section className="card">
                <div className="card-intro">
                    <h2>Sources &amp; feed refresh</h2>
                    <p>One feed from 70+ companies and other sources.</p>
                </div>
                <div className="feed-refresh">
                    <div className="feed-sources">
                        <div className="source-tags">
                            {SOURCES.map(s => <span className="tag tag-neutral" key={s}>{s}</span>)}
                        </div>
                        <p>Pull feed now checks sources for titles matching your allowlist and applies your location preferences.</p>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={pull} disabled={pulling}>
                        <RefreshCw size={16} /> {pulling ? "Pulling…" : "Pull feed now"}
                    </button>
                </div>
            </section>

            <p className="autosave-note">Changes to keywords and locations save automatically.</p>
        </>
    );
}
