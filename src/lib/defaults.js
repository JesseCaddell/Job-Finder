export const DEFAULT_PROFILE = "Targeting Project Manager, Technical Project Manager, Product Owner, and Analyst roles in the Seattle / South Puget Sound area (open to remote). Mid-level. Strengths: stakeholder coordination, roadmaps, cross-functional delivery, data analysis.";

// Kept in sync with netlify/functions/fetch-jobs.js DEFAULT_TITLE_KEYWORDS —
// used as the Settings default and as a fallback if none are saved yet.
export const DEFAULT_TITLE_KEYWORDS = [
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
export const DEFAULT_LOCATION_KEYWORDS = ["washington", "new york", "california"];
export const DEFAULT_LOW_SCORE_THRESHOLD = 50;
export const DEFAULT_PURGE_THRESHOLD = 45;

export function freshLocalState() {
    return {
        members: ["Me", "Partner"],
        code: "",
        profile: DEFAULT_PROFILE,
        resume: "",
        jobs: seedJobs()
    };
}

function seedJobs() {
    const now = Date.now();
    const mk = (o, i) => ({
        id: "seed" + i, added: now - i * 36e5, by: "Me", status: "new", fit: null, why: "",
        history: [{ s: "new", t: now - i * 36e5, by: "Me" }], ...o
    });
    return [
        mk({ title: "Technical Project Manager", company: "Northwest Logistics", loc: "Tacoma, WA (Hybrid)", src: "Company site", url: "", tags: ["hybrid", "technical pm"], notes: "Coordinating engineering + ops rollouts. Example seed — delete anytime." }, 0),
        mk({ title: "Product Owner, Platform", company: "Cascade Health", loc: "Remote (US)", src: "LinkedIn", url: "", tags: ["remote", "product owner"], notes: "Owns backlog for an internal platform team. Example seed." }, 1),
        mk({ title: "Business Analyst II", company: "Puget Systems", loc: "Seattle, WA", src: "Welcome to the Jungle", url: "", tags: ["analyst", "onsite"], notes: "Requirements + reporting. Example seed." }, 2)
    ];
}
