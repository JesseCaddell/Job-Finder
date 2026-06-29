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
//   USAJOBS_KEY       = your key from developer.usajobs.gov (optional)
//   USAJOBS_EMAIL     = the email you registered with USAJOBS (required if KEY set)
//   ADZUNA_APP_ID + ADZUNA_APP_KEY = free keys from developer.adzuna.com (optional)
//
// Tune these to your search:
const TITLE_KEYWORDS = ["project manager","technical project manager","product owner","product manager","analyst","program manager","scrum"];
const LOCATION_KEYWORDS = ["seattle","tacoma","bellevue","washington","wa","remote","puget"];

const titleMatches = t => { t=(t||"").toLowerCase(); return TITLE_KEYWORDS.some(k=>t.includes(k)); };
const locMatches   = l => { if(!l) return true; l=l.toLowerCase(); return LOCATION_KEYWORDS.some(k=>l.includes(k)); };

async function greenhouse(token){
    try{
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
        const d = await r.json();
        return (d.jobs||[]).map(j=>({
            title:j.title, company:token, location:(j.location&&j.location.name)||"",
            url:j.absolute_url, source:"Greenhouse",
            description:(j.content||"").replace(/<[^>]+>/g," ").slice(0,600)
        }));
    }catch(e){ return []; }
}
async function lever(slug){
    try{
        const r = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        const d = await r.json();
        return (Array.isArray(d)?d:[]).map(j=>({
            title:j.text, company:slug, location:(j.categories&&j.categories.location)||"",
            url:j.hostedUrl, source:"Lever",
            description:(j.descriptionPlain||"").slice(0,600)
        }));
    }catch(e){ return []; }
}
async function usajobs(){
    const key=process.env.USAJOBS_KEY, email=process.env.USAJOBS_EMAIL;
    if(!key||!email) return [];
    try{
        const kw=encodeURIComponent("project manager product owner analyst");
        const r=await fetch(`https://data.usajobs.gov/api/Search?Keyword=${kw}&LocationName=Washington&ResultsPerPage=25`,
            { headers:{ "Host":"data.usajobs.gov","User-Agent":email,"Authorization-Key":key } });
        const d=await r.json();
        const items=(d.SearchResult&&d.SearchResult.SearchResultItems)||[];
        return items.map(it=>{ const f=it.MatchedObjectDescriptor; return {
            title:f.PositionTitle, company:f.OrganizationName,
            location:(f.PositionLocationDisplay||""), url:f.PositionURI, source:"USAJOBS",
            description:(f.UserArea&&f.UserArea.Details&&f.UserArea.Details.JobSummary||"").slice(0,600) };});
    }catch(e){ return []; }
}
async function adzuna(){
    const id=process.env.ADZUNA_APP_ID, key=process.env.ADZUNA_APP_KEY;
    if(!id||!key) return [];
    try{
        const r=await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${id}&app_key=${key}`+
            `&what=project%20manager%20product%20owner%20analyst&where=Seattle&distance=60&results_per_page=25`);
        const d=await r.json();
        return (d.results||[]).map(j=>({
            title:j.title, company:(j.company&&j.company.display_name)||"", location:(j.location&&j.location.display_name)||"",
            url:j.redirect_url, source:"Adzuna", description:(j.description||"").slice(0,600) }));
    }catch(e){ return []; }
}

export async function handler(){
    const ghBoards=(process.env.GREENHOUSE_BOARDS||"").split(",").map(s=>s.trim()).filter(Boolean);
    const lvCos=(process.env.LEVER_COMPANIES||"").split(",").map(s=>s.trim()).filter(Boolean);

    const batches = await Promise.all([
        ...ghBoards.map(greenhouse),
        ...lvCos.map(lever),
        usajobs(),
        adzuna()
    ]);

    let jobs = batches.flat()
        .filter(j => titleMatches(j.title) && locMatches(j.location));

    // dedupe by url
    const seen=new Set();
    jobs = jobs.filter(j=>{ const k=j.url||j.title+j.company; if(seen.has(k))return false; seen.add(k); return true; });

    return {
        statusCode:200,
        headers:{ "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
        body: JSON.stringify(jobs.slice(0,80))
    };
}