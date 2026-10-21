/* Where the Supabase session lives depends on the "Stay signed in" checkbox:
   checked   → localStorage   (survives closing the browser)
   unchecked → sessionStorage (gone when the tab closes)
   The choice is remembered under one key and read on every write, so token
   refreshes keep landing in the store the user picked. */
const KEY = "pipeline_remember";

const safe = fn => { try { return fn(); } catch (e) { return null; } };

export const getRemember = () => safe(() => localStorage.getItem(KEY)) !== "0";
export const setRemember = v => safe(() => localStorage.setItem(KEY, v ? "1" : "0"));

export const authStorage = {
    getItem: k => safe(() => sessionStorage.getItem(k)) ?? safe(() => localStorage.getItem(k)),
    setItem: (k, v) => {
        const [keep, drop] = getRemember() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
        safe(() => keep.setItem(k, v));
        safe(() => drop.removeItem(k));
    },
    removeItem: k => {
        safe(() => localStorage.removeItem(k));
        safe(() => sessionStorage.removeItem(k));
    }
};
