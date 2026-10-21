/* "+ Calendar" on Interview cards: opens a Google Calendar draft and downloads
   an .ics file. Returns a message for the toast, or null if cancelled. */
export function addToCalendar(j) {
    const when = window.prompt("Interview date & time (e.g. 2026-07-10 14:00):", "");
    if (!when) return null;
    const dt = new Date(when.replace(" ", "T"));
    if (isNaN(dt)) return "Couldn't read that date";
    const end = new Date(dt.getTime() + 45 * 60000);
    const fmt = d => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const text = encodeURIComponent(`Interview — ${j.title} @ ${j.company}`);
    const details = encodeURIComponent((j.url ? `Posting: ${j.url}\n` : "") + `Source: ${j.src || ""}`);
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(dt)}/${fmt(end)}&details=${details}&location=${encodeURIComponent(j.loc || "")}`, "_blank");
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${fmt(dt)}\nDTEND:${fmt(end)}\nSUMMARY:Interview — ${j.title} @ ${j.company}\nLOCATION:${j.loc || ""}\nDESCRIPTION:${j.url || ""}\nEND:VEVENT\nEND:VCALENDAR`;
    const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })),
        download: `interview-${j.company || "role"}.ics`
    });
    a.click();
    return "Opened Google Calendar + downloaded .ics";
}
