/* Local storage shim — falls back to memory when storage is blocked
   (private windows, strict cookie settings). */
const mem = {};

export const store = {
    get(k) {
        try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); }
        catch (e) { return k in mem ? mem[k] : null; }
    },
    set(k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); }
        catch (e) { mem[k] = v; }
    },
    del(k) {
        try { localStorage.removeItem(k); }
        catch (e) { delete mem[k]; }
    }
};
