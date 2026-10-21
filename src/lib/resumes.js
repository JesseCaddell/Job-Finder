import { SB, SHARED_MODE } from "./config.js";
import { newId } from "./format.js";

/* Resume text extraction and storage, ported from the legacy script. pdf.js
   and mammoth are loaded from the CDN on first use so they stay out of the
   main bundle. */

function loadScript(src, isModule = false) {
    return new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = src;
        if (isModule) s.type = "module";
        s.onload = () => setTimeout(res, 80);   // small delay for module init
        s.onerror = () => rej(new Error("Failed to load " + src));
        document.head.appendChild(s);
    });
}

async function extractPdf(file) {
    if (!window.pdfjsLib) {
        await loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs", true);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
    }
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(it => it.str).join(" "));
    }
    return pages.join("\n");
}

async function extractDocx(file) {
    if (!window.mammoth) {
        await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
    }
    const buf = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
}

export async function extractResumeText(file) {
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    return isPdf ? extractPdf(file) : extractDocx(file);
}

/* Shared mode also keeps the raw file in Storage under {userId}/...; local mode
   has no backend for it, so the version holds extracted text only (path null).
   Returns the resume_versions entry. */
export async function uploadResumeVersion(file, text, track, userId) {
    let path = null;
    if (SHARED_MODE) {
        path = `${userId}/${Date.now()}-${file.name}`;
        const { error } = await SB.storage.from("resumes").upload(path, file, { upsert: true });
        if (error) throw new Error("Storage upload failed: " + error.message);
    }
    return { id: newId(), filename: file.name, path, text, track, uploadedAt: new Date().toISOString() };
}

/* A resume pasted as plain text becomes a version like any upload (no file,
   so no View link), which is what lets scoring pick it by track. */
export function pastedResumeVersion(text, track, label) {
    return { id: newId(), filename: `Pasted resume — ${label}`, path: null, text, track, uploadedAt: new Date().toISOString() };
}

export async function viewResumeFile(path) {
    const { data, error } = await SB.storage.from("resumes").createSignedUrl(path, 3600);
    if (error) throw new Error("Couldn't open resume file");
    window.open(data.signedUrl, "_blank");
}
