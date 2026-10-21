// netlify/functions/fetch-jobs.js
// Pulls jobs from sources that ACTUALLY expose data publicly/legally and
// returns the ones matching your target titles + location as JSON.
//
// Your app calls this (Settings → "Pull feed now"), or schedule it (see netlify.toml).
//
// No LinkedIn / Indeed / WTTJ / Handshake here — none offer an open feed you can
// legally pull. Those stay manual via the "Add a job" button.
//
// Configure via Netlify environment variables (Site settings → Environment):
//   GREENHOUSE_BOARDS = comma list of board tokens, e.g. "stripe,airbnb,figma"
//   LEVER_COMPANIES   = comma list of lever slugs, e.g. "netflix,spotify"
//   ASHBY_COMPANIES   = comma list of Ashby job-board slugs, e.g. "linear,notion"
//   USAJOBS_KEY       = your key from developer.usajobs.gov (optional)
//   USAJOBS_EMAIL     = the email you registered with USAJOBS (required if KEY set)
//   ADZUNA_APP_ID + ADZUNA_APP_KEY = free keys from developer.adzuna.com (optional)
//   HN_FEEDS          = "true" to add the Hacker News sources (no key needed):
//                       YC job ads (jobstories) and the monthly "Who is hiring?" thread
//
// Defaults — overridden per-request by whatever the app's Settings →
// "Feed options" sends (see handler below). These only apply when the
// function is hit without a body (manual/legacy calls).
const DEFAULT_TITLE_KEYWORDS = [
    "project manager","technical project manager","product owner","product manager","program manager",
    "release manager","release coordinator",
    "technical operations analyst","techops analyst",
    "technical operations specialist","techops specialist",
    "engineering operations coordinator","engops coordinator",
    "systems analyst","technical systems analyst",
    "implementation consultant","technical consultant",
    "scrum master","agile delivery lead","scrum",
    "devops engineer","solutions engineer","solution architect",
    "junior software engineer","software engineer i","associate software engineer",
    "ai-native","automation engineer","integration engineer",
    "developer experience engineer","dx engineer","internal tools engineer",
    "platform engineer","applied ai engineer","forward deployed engineer",
    "full-stack engineer","full stack engineer","qa engineer","test automation engineer",
    "associate project manager","associate product manager","associate program manager","associate product owner",
    "associate analyst","associate systems analyst","associate technical consultant","associate solutions engineer",
    "junior project manager","junior analyst","entry level","new grad",
    "project management intern","product management intern","program management intern","software engineering intern"
];
const DEFAULT_LOCATION_KEYWORDS = ["washington","new york","california"];

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Word-boundary match instead of naive substring — a keyword like "wa"
// shouldn't match inside "Waterford", and "ny" shouldn't match "company".
const anyKeywordMatches = (text, keywords) => {
    const t = (text||"").toLowerCase();
    return keywords.some(k => new RegExp(`\\b${escapeRegex(k.toLowerCase())}\\b`).test(t));
};

const titleMatches = (title, keywords) => anyKeywordMatches(title, keywords);

// A location is a match if it names one of the allowed states/cities, OR
// it's an unrestricted remote posting (no state tied to it at all). Many
// postings now list state-scoped remote eligibility, e.g.
// "Florida; Remote - Illinois; Remote - New York; Remote - Texas" — that
// should only pass because "New York" is named, not because "remote" is
// present. A state-scoped remote posting naming only disallowed states
// (e.g. "Remote - Texas") should NOT pass just because it says "remote".
const locMatches = (loc, keywords) => {
    if(!loc) return true;
    if(anyKeywordMatches(loc, keywords)) return true;
    const l = loc.toLowerCase();
    const isStateScopedRemote = /remote\s*-\s*[a-z]/i.test(l);
    return /\bremote\b/.test(l) && !isStateScopedRemote;
};

// Excludes postings whose description states a minimum experience
// requirement above this many years. A posting that doesn't mention
// years of experience at all is left in — silence isn't evidence it's
// senior. This is a text heuristic, not exact: it looks for the
// standard phrasings ("6+ years", "6-8 years of experience", "8 years
// of experience") and takes the lowest minimum it finds.
const MAX_YEARS_EXPERIENCE = 6;
const YEARS_RE = /(\d{1,2})\+\s*years?|(\d{1,2})\s*(?:-|to)\s*\d{1,2}\s*years?(?:\s+[a-z]+){0,3}?\s+experience|(\d{1,2})\s*years?(?:\s+[a-z]+){0,3}?\s+experience/gi;
function minYearsRequired(description){
    if(!description) return null;
    let min = null, m;
    YEARS_RE.lastIndex = 0;
    while((m = YEARS_RE.exec(description))){
        const n = parseInt(m[1] ?? m[2] ?? m[3], 10);
        if(!isNaN(n) && (min===null || n<min)) min = n;
    }
    return min;
}
const withinExperienceCap = description => {
    const min = minYearsRequired(description);
    return min===null || min<=MAX_YEARS_EXPERIENCE;
};

// Which of the user's resumes should score this job: "pm", "dev", or "unsure"
// (title looks like both — the app then picks whichever resume has more
// keyword overlap with the posting). A title matching neither defaults to
// "pm". Kept in sync with classifyTrack() in src/lib/tracks.js, which tags
// manually added jobs the same way.
const DEV_TITLE_RE = /\b(software|developer|devops|sre|site reliability|full[- ]?stack|front[- ]?end|back[- ]?end|engineer|programmer|sdet|qa|automation|platform|architect)\b/i;
const PM_TITLE_RE  = /\b(project|product|program|scrum|agile|delivery|release|coordinator|analyst|consultant|operations|techops|owner|manager|implementation)\b/i;
function classifyTrack(title){
    const dev = DEV_TITLE_RE.test(title||""), pm = PM_TITLE_RE.test(title||"");
    if(dev && pm) return "unsure";
    return dev ? "dev" : "pm";
}

const DESC_CAP = 10000;
const NAMED_ENTITIES = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:" ",
    rsquo:"’", lsquo:"‘", rdquo:"”", ldquo:"“", ndash:"–", mdash:"—", hellip:"…" };
function decodeEntities(s){
    return (s||"")
        .replace(/&#x([0-9a-f]+);/gi, (_,h)=>String.fromCodePoint(parseInt(h,16)))
        .replace(/&#(\d+);/g, (_,d)=>String.fromCodePoint(parseInt(d,10)))
        .replace(/&([a-zA-Z]+);/g, (m,name)=> NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

async function greenhouse(token){
    try{
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
        const d = await r.json();
        return (d.jobs||[]).map(j=>({
            title:j.title, company:token, location:(j.location&&j.location.name)||"",
            url:j.absolute_url, source:"Greenhouse", postedAt:j.updated_at||null,
            description:decodeEntities(j.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,DESC_CAP)
        }));
    }catch(e){ console.error("[fetch-jobs] greenhouse("+token+") failed:", e.message); return []; }
}
async function lever(slug){
    try{
        const r = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        const d = await r.json();
        return (Array.isArray(d)?d:[]).map(j=>({
            title:j.text, company:slug, location:(j.categories&&j.categories.location)||"",
            url:j.hostedUrl, source:"Lever",
            postedAt:j.createdAt?new Date(j.createdAt).toISOString():null,
            description:decodeEntities(j.descriptionPlain||"").slice(0,DESC_CAP)
        }));
    }catch(e){ console.error("[fetch-jobs] lever("+slug+") failed:", e.message); return []; }
}
async function ashby(slug){
    try{
        const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        const d = await r.json();
        return (d.jobs||[]).filter(j=>j.isListed!==false).map(j=>({
            title:j.title, company:slug, location:j.location||"",
            url:j.jobUrl, source:"Ashby", postedAt:j.publishedAt||null,
            description:decodeEntities(j.descriptionHtml||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,DESC_CAP)
        }));
    }catch(e){ console.error("[fetch-jobs] ashby("+slug+") failed:", e.message); return []; }
}
// Search terms for the keyword-search sources (USAJOBS, Adzuna). One request
// per query, since these APIs do poorly with long OR-style strings. Results
// are still filtered by the title keywords afterwards.
const SEARCH_QUERIES = ["project manager","product owner","systems analyst","software engineer","software developer","devops engineer"];

async function usajobs(){
    const key=process.env.USAJOBS_KEY, email=process.env.USAJOBS_EMAIL;
    if(!key||!email) return [];
    try{
        const pages = await Promise.all(SEARCH_QUERIES.map(async q=>{
            const r=await fetch(`https://data.usajobs.gov/api/Search?Keyword=${encodeURIComponent(q)}&LocationName=Washington&ResultsPerPage=25`,
                { headers:{ "Host":"data.usajobs.gov","User-Agent":email,"Authorization-Key":key } });
            if(!r.ok){ console.error("[fetch-jobs] usajobs HTTP "+r.status+":", await r.text()); return []; }
            const d=await r.json();
            return (d.SearchResult&&d.SearchResult.SearchResultItems)||[];
        }));
        const items=pages.flat();
        return items.map(it=>{ const f=it.MatchedObjectDescriptor; return {
            title:f.PositionTitle, company:f.OrganizationName,
            location:(f.PositionLocationDisplay||""), url:f.PositionURI, source:"USAJOBS",
            postedAt:f.PublicationStartDate||null,
            description:decodeEntities(f.UserArea&&f.UserArea.Details&&f.UserArea.Details.JobSummary||"").slice(0,DESC_CAP) };});
    }catch(e){ console.error("[fetch-jobs] usajobs failed:", e.message); return []; }
}
async function adzuna(){
    const id=process.env.ADZUNA_APP_ID, key=process.env.ADZUNA_APP_KEY;
    if(!id||!key) return [];
    try{
        const pages = await Promise.all(SEARCH_QUERIES.map(async q=>{
            const r=await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${id}&app_key=${key}`+
                `&what=${encodeURIComponent(q)}&where=Seattle&distance=60&results_per_page=25`);
            if(!r.ok){ console.error("[fetch-jobs] adzuna HTTP "+r.status+":", await r.text()); return []; }
            const d=await r.json();
            return d.results||[];
        }));
        return pages.flat().map(j=>({
            title:j.title, company:(j.company&&j.company.display_name)||"", location:(j.location&&j.location.display_name)||"",
            url:j.redirect_url, source:"Adzuna", postedAt:j.created||null,
            description:decodeEntities(j.description||"").slice(0,DESC_CAP) }));
    }catch(e){ console.error("[fetch-jobs] adzuna failed:", e.message); return []; }
}

// ─── Hacker News sources (HN_FEEDS=true) ───
const HN_TIMEOUT_MS = 4000;
const HN_FETCH_CONCURRENCY = 8;
const HN_YC_MAX_ITEMS = 60;
const hnEnabled = () => /^(1|true|yes|on)$/i.test((process.env.HN_FEEDS||"").trim());
const hnFetch = url => fetch(url, { signal: AbortSignal.timeout(HN_TIMEOUT_MS) });

// Runs fn over items with at most `limit` in flight; keeps result order.
async function mapLimit(items, limit, fn){
    const out = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async ()=>{
        while(next < items.length){ const i = next++; out[i] = await fn(items[i]); }
    }));
    return out;
}

// YC-company job ads from the official HN API (jobstories). Only the API is
// called: YC's Terms of Use prohibit scraping, so the linked job pages are
// never fetched. The role is read from the HN title ("<Co> (YC W24) Is Hiring
// <role>") or, for ycombinator.com job links, from the URL slug
// (/jobs/<id>-full-stack-engineer). Items naming no role are dropped, since
// there's nothing to screen. Location and description aren't available, so
// these are tagged "required reading" - open the link to read the real posting.
const YC_JOB_SLUG_RE = /^https:\/\/www\.ycombinator\.com\/companies\/[^/]+\/jobs\/[^/-]+-([^/?#]+)/;
async function hnYcJobs(){
    try{
        const ids = (await (await hnFetch("https://hacker-news.firebaseio.com/v0/jobstories.json")).json()).slice(0, HN_YC_MAX_ITEMS);
        const items = await mapLimit(ids, HN_FETCH_CONCURRENCY, async id=>{
            try{ return await (await hnFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)).json(); }
            catch(e){ return null; }
        });
        return items.filter(it=>it && it.title && it.url).map(it=>{
            const slug = (it.url.match(YC_JOB_SLUG_RE)||[])[1];
            const title = slug
                ? slug.replace(/-/g," ")
                : it.title.replace(/^.*?is hiring\s*(?:an?\s+)?/i,"").trim();
            if(!title || title===it.title) return null;
            return {
                title, company:it.title.replace(/\s*\(YC [^)]*\).*$/i,"").replace(/\s+is hiring.*$/i,"").trim(),
                location:"", url:it.url, source:"YC (HN)",
                postedAt:it.time ? new Date(it.time*1000).toISOString() : null,
                tags:[HN_REQUIRED_READING_TAG],
                description:`${it.title}
Posting: ${it.url}
No job details were fetched (YC's terms prohibit scraping their pages) - open the link to read the full posting.`
            };
        }).filter(Boolean);
    }catch(e){ console.error("[fetch-jobs] hn yc jobs failed:", e.message); return []; }
}

// Newest "Ask HN: Who is hiring?" thread via Algolia; each top-level comment
// is one company's post. Comments are free text, so only the first line
// ("Company | role | location | ...") is parsed. It's used as the title/location
// for filtering, so a role named only in the body is missed — hence the
// "required reading" tag: the full post is in the notes but wasn't screened.
const HN_REQUIRED_READING_TAG = "required reading";
const hnHtmlToText = html => decodeEntities((html||"").replace(/<[^>]+>/g," ")).replace(/[ \t]+/g," ").replace(/ ?\n ?/g,"\n").trim();
async function hnWhoIsHiring(){
    try{
        const found = await (await hnFetch("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5")).json();
        const thread = (found.hits||[]).find(h=>/^Ask HN: Who is hiring\?/i.test(h.title||""));
        if(!thread) return [];
        // Comment search, not /items: the thread endpoint is 3-10s, this is ~1s.
        // parent_id filter = top-level posts only (replies excluded).
        const data = await (await hnFetch(`https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_${thread.objectID}`+
            `&numericFilters=parent_id=${thread.objectID}&hitsPerPage=1000&attributesToRetrieve=objectID,comment_text,created_at&attributesToHighlight=none`)).json();
        return (data.hits||[]).filter(c=>c.comment_text).map(c=>{
            const header = hnHtmlToText(c.comment_text.split(/<p>/i)[0]);
            const parts = header.split(/\s*[|—–]\s*/).map(s=>s.trim()).filter(Boolean);
            return {
                title:(parts.length>1 ? parts.slice(1).join(" | ") : header).slice(0,200),
                company:(parts[0]||"").slice(0,80),
                location:header,
                url:`https://news.ycombinator.com/item?id=${c.objectID}`, source:"HN Who's Hiring",
                postedAt:c.created_at||null,
                tags:[HN_REQUIRED_READING_TAG],
                description:hnHtmlToText(c.comment_text.replace(/<p>/gi,"\n")).slice(0,DESC_CAP)
            };
        }).filter(j=>j.title);
    }catch(e){ console.error("[fetch-jobs] hn who-is-hiring failed:", e.message); return []; }
}

// Per-call limits keep the response well under Netlify's ~6 MB cap
// (descriptions run up to DESC_CAP chars each).
const BOARD_CHUNK = 10;
const CHUNK_RESULT_CAP = 150;
const LEGACY_RESULT_CAP = 80;

export async function handler(event){
    let body = {};
    try{ body = JSON.parse(event?.body || "{}"); }catch(e){ /* ignore, use defaults */ }
    const titleKeywords    = Array.isArray(body.titleKeywords) && body.titleKeywords.length ? body.titleKeywords : DEFAULT_TITLE_KEYWORDS;
    const locationKeywords = Array.isArray(body.locationKeywords) && body.locationKeywords.length ? body.locationKeywords : DEFAULT_LOCATION_KEYWORDS;

    const ghBoards=(process.env.GREENHOUSE_BOARDS||"").split(",").map(s=>s.trim()).filter(Boolean);
    const lvCos=(process.env.LEVER_COMPANIES||"").split(",").map(s=>s.trim()).filter(Boolean);
    const ashbyCos=(process.env.ASHBY_COMPANIES||"").split(",").map(s=>s.trim()).filter(Boolean);

    // Chunked mode (the app's pull): body.sources picks source groups and, for
    // the board-list groups, body.offset picks a BOARD_CHUNK-sized slice of boards;
    // meta.next tells the app where to continue. With no body.sources, every
    // source runs in one call, as before.
    const wanted = Array.isArray(body.sources) && body.sources.length ? body.sources : null;
    const offset = Number.isInteger(body.offset) && body.offset > 0 ? body.offset : 0;
    const want = g => !wanted || wanted.includes(g);
    const pick = list => wanted ? list.slice(offset, offset + BOARD_CHUNK) : list;
    const lists = { greenhouse:ghBoards, lever:lvCos, ashby:ashbyCos };
    const nextGroup = wanted && Object.keys(lists).find(g=>wanted.includes(g));
    const next = nextGroup && offset + BOARD_CHUNK < lists[nextGroup].length ? offset + BOARD_CHUNK : null;

    const batches = await Promise.all([
        ...(want("greenhouse") ? pick(ghBoards).map(greenhouse) : []),
        ...(want("lever") ? pick(lvCos).map(lever) : []),
        ...(want("ashby") ? pick(ashbyCos).map(ashby) : []),
        ...(want("usajobs") ? [usajobs()] : []),
        ...(want("adzuna") ? [adzuna()] : []),
        ...(want("hn") && hnEnabled() ? [hnYcJobs(), hnWhoIsHiring()] : [])
    ]);

    const rawCount = batches.reduce((n,b)=>n+b.length, 0);
    const matched = batches.map(b=>b.filter(j => titleMatches(j.title, titleKeywords) && locMatches(j.location, locationKeywords) && withinExperienceCap(j.description)));
    // Round-robin across sources: the response is capped at 80, so a plain flat()
    // would let the first sources fill it and starve the later ones (HN, Adzuna).
    let jobs = [];
    for(let i=0; matched.some(b=>i<b.length); i++) matched.forEach(b=>{ if(i<b.length) jobs.push(b[i]); });
    const bySource = {}; jobs.forEach(j=>{ bySource[j.source] = (bySource[j.source]||0)+1; });
    console.log(`[fetch-jobs] ${rawCount} raw results from all sources, ${jobs.length} matched title/location keywords`, JSON.stringify(bySource));

    jobs.forEach(j=>{ j.track = classifyTrack(j.title); });

    // dedupe by url
    const seen=new Set();
    jobs = jobs.filter(j=>{ const k=j.url||j.title+j.company; if(seen.has(k))return false; seen.add(k); return true; });

    const cap = wanted ? CHUNK_RESULT_CAP : LEGACY_RESULT_CAP;
    const headers = { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" };
    if(!wanted) return { statusCode:200, headers, body: JSON.stringify(jobs.slice(0,cap)) };
    return {
        statusCode:200, headers,
        body: JSON.stringify({ jobs: jobs.slice(0,cap), meta:{ next, truncated: Math.max(0, jobs.length-cap) } })
    };
}