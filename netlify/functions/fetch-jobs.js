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
    "full-stack engineer","full stack engineer","qa engineer","test automation engineer"
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
async function usajobs(){
    const key=process.env.USAJOBS_KEY, email=process.env.USAJOBS_EMAIL;
    if(!key||!email) return [];
    try{
        const kw=encodeURIComponent("project manager product owner analyst");
        const r=await fetch(`https://data.usajobs.gov/api/Search?Keyword=${kw}&LocationName=Washington&ResultsPerPage=25`,
            { headers:{ "Host":"data.usajobs.gov","User-Agent":email,"Authorization-Key":key } });
        if(!r.ok){ console.error("[fetch-jobs] usajobs HTTP "+r.status+":", await r.text()); return []; }
        const d=await r.json();
        const items=(d.SearchResult&&d.SearchResult.SearchResultItems)||[];
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
        const r=await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${id}&app_key=${key}`+
            `&what=project%20manager%20product%20owner%20analyst&where=Seattle&distance=60&results_per_page=25`);
        if(!r.ok){ console.error("[fetch-jobs] adzuna HTTP "+r.status+":", await r.text()); return []; }
        const d=await r.json();
        return (d.results||[]).map(j=>({
            title:j.title, company:(j.company&&j.company.display_name)||"", location:(j.location&&j.location.display_name)||"",
            url:j.redirect_url, source:"Adzuna", postedAt:j.created||null,
            description:decodeEntities(j.description||"").slice(0,DESC_CAP) }));
    }catch(e){ console.error("[fetch-jobs] adzuna failed:", e.message); return []; }
}

export async function handler(event){
    let body = {};
    try{ body = JSON.parse(event?.body || "{}"); }catch(e){ /* ignore, use defaults */ }
    const titleKeywords    = Array.isArray(body.titleKeywords) && body.titleKeywords.length ? body.titleKeywords : DEFAULT_TITLE_KEYWORDS;
    const locationKeywords = Array.isArray(body.locationKeywords) && body.locationKeywords.length ? body.locationKeywords : DEFAULT_LOCATION_KEYWORDS;

    const ghBoards=(process.env.GREENHOUSE_BOARDS||"").split(",").map(s=>s.trim()).filter(Boolean);
    const lvCos=(process.env.LEVER_COMPANIES||"").split(",").map(s=>s.trim()).filter(Boolean);
    const ashbyCos=(process.env.ASHBY_COMPANIES||"").split(",").map(s=>s.trim()).filter(Boolean);

    const batches = await Promise.all([
        ...ghBoards.map(greenhouse),
        ...lvCos.map(lever),
        ...ashbyCos.map(ashby),
        usajobs(),
        adzuna()
    ]);

    const rawCount = batches.reduce((n,b)=>n+b.length, 0);
    let jobs = batches.flat()
        .filter(j => titleMatches(j.title, titleKeywords) && locMatches(j.location, locationKeywords) && withinExperienceCap(j.description));
    console.log(`[fetch-jobs] ${rawCount} raw results from all sources, ${jobs.length} matched title/location keywords`);

    // dedupe by url
    const seen=new Set();
    jobs = jobs.filter(j=>{ const k=j.url||j.title+j.company; if(seen.has(k))return false; seen.add(k); return true; });

    return {
        statusCode:200,
        headers:{ "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
        body: JSON.stringify(jobs.slice(0,80))
    };
}