import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "../../lib/data.js";
import { DEFAULT_LOCATION_KEYWORDS, DEFAULT_TITLE_KEYWORDS } from "../../lib/defaults.js";

/* Title and location keyword lists for "Pull feed now". Until something is
   saved the defaults are shown (and used by the feed); every change saves the
   whole list straight away, as the legacy Feed options panel did. */
export default function useFeedSettings() {
    const [titleKw, setTitleKw] = useState(null);
    const [locationKw, setLocationKw] = useState(null);

    useEffect(() => {
        let alive = true;
        loadSettings().then(s => {
            if (!alive) return;
            setTitleKw([...(s.title_keywords?.length ? s.title_keywords : DEFAULT_TITLE_KEYWORDS)]);
            setLocationKw([...(s.location_keywords?.length ? s.location_keywords : DEFAULT_LOCATION_KEYWORDS)]);
        });
        return () => { alive = false; };
    }, []);

    const changeTitleKw = useCallback(next => { setTitleKw(next); return saveSettings({ title_keywords: next }); }, []);
    const changeLocationKw = useCallback(next => { setLocationKw(next); return saveSettings({ location_keywords: next }); }, []);

    return { titleKw, locationKw, changeTitleKw, changeLocationKw, loaded: titleKw !== null };
}
