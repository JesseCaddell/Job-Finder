export function initials(n) {
    return (n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
}

export function timeAgo(t) {
    const d = (Date.now() - t) / 1000;
    if (d < 3600) return Math.max(1, Math.round(d / 60)) + "m ago";
    if (d < 86400) return Math.round(d / 3600) + "h ago";
    return Math.round(d / 86400) + "d ago";
}

// "20 hours ago" — the long form used on job cards.
export function timeAgoLong(t) {
    const d = (Date.now() - t) / 1000;
    const unit = (n, word) => `${n} ${word}${n === 1 ? "" : "s"} ago`;
    if (d < 3600) return unit(Math.max(1, Math.round(d / 60)), "minute");
    if (d < 86400) return unit(Math.round(d / 3600), "hour");
    return unit(Math.round(d / 86400), "day");
}

export function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
