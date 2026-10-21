import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` runs this behind `netlify dev` (see [dev] in netlify.toml) so
// /.netlify/functions/* keeps working. Plain `vite` also runs; the app then
// can't reach get-config and falls back to local mode.
export default defineConfig({
    plugins: [react()],
    server: { port: 5173 }
});
