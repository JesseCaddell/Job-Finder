# Session State

Last updated: 2026-10-22. Latest commit on `master`: `da53eed` (PR #12 merged).

## Done this session: Figma redesign, migrated to Vite + React

The single-file `index.html` app was replaced by a Vite 5 + React 18 + React Router app (plain JS), built page by page from the Figma file `5jZcNS6G9q8midRJa0I3Q0`. Six stacked PRs, all merged (#7 to #12):

| PR | Contents |
|---|---|
| #7 | Vite + React scaffold, data layer as modules in `src/lib/` |
| #8 | Sign-in, forgot password, set password, accept invite; "Stay signed in" fix |
| #9 | App shell, Settings: Search profile & resumes |
| #10 | Settings: Feed preferences and the full allowlist page |
| #11 | Board page |
| #12 | Archive, React local-mode sign-in, `legacy.html` removed |

Follow-up tweaks after review (also merged):
- Board, Archive and Settings sit in a centered 1200px column (`.page-centered` in `src/components/shell.css`).
- The selected stage on the Board uses the orange highlight (`--accent-tint` fill, `--accent` border), matching the active nav and Settings links.
- The "More filters" button and its top-12 tag popover are gone. A job's own tags show on the Board and Archive cards (orange, like the Details dialog) and in Details (PRs #17, #18).
- Fit scores are colored by strength (green 75+, orange 50-74, muted below), and the selected stage tab has dark text on the orange fill (PR #15).
- A trial of the old Fraunces font on the Board was reverted; the app stays on Lora.
- Archive search placeholder, "Date added", Restore to New, and delete-archived-only behave as decided with the user.
- `CLAUDE.md` was updated for the new stack (the file is local and untracked on purpose).

Verified: local mode end to end (headless Edge and Chrome), the Board, Archive and Settings against real Supabase data, and in-app password reset (worked).

Not verified: Pull feed and scoring through the Netlify functions, realtime between two sessions, resume upload to Storage, and the invite email. These code paths were ported unchanged.

## Post-MVP to-do (in the order to take them)

1. **Board sharing and invites.** Settings: Board sharing page (Figma frame `5:8271`). One primary user, everyone else a guest. Needs a Netlify function that invites by email with the Supabase service key, new SQL for roles (put it in `docs/user_commands.md`), the Invite email template change (also in `docs/user_commands.md`), and the "Shared board" chip.
2. **Account menu.** Account management behind the avatar dropdown (it only has Sign out today). Needs a design first.
3. **Local-mode redesign.** New local login and local settings variants. Local "Clear all data" stays local-only.
4. **Designs for the undesigned screens.** Add/Edit job, Details, and confirm dialogs (all keep the old look via `lg-` CSS in `src/components/legacy/`), plus forgot password, set password, accept invite and local sign-in.
5. **Mobile layouts.** No mock exists yet; none of the pages are tuned below desktop width.

## Still open

- **Job posting quality and scoring** (user's top priority, in the untracked `docs/fix_list.md`): descriptions look cut off or arrive as escaped HTML, so the AI says the posting is incomplete and scores unreliably. Check what `fetch-jobs.js` stores in `notes`.
- **Database column.** `alter table jobs add column if not exists track text;` was flagged earlier but never confirmed as run in Supabase.
- **Earlier resume uploads may be untagged.** Tag each PM or Dev in Settings, then Search profile & resumes.
- **Unconfirmed choices I made** (change if you disagree): keyword groups are derived from the PM/Dev word lists; "Needs review" means an unscored job with an empty description; Feed preferences autosaves with no Save button; the Board's checkboxes select jobs but have no bulk action; Archive sort says "Newest added" (no archived-date column, and none is wanted for now).
- **Supabase dashboard steps** for the invite flow are in `docs/user_commands.md`. Only the reset-password redirect URL has been confirmed in use.

## Notes for the next session

- Run locally: `npm run dev` (netlify dev, uses the linked site `jobfinderpipeline`) for shared mode with the functions; `npm run dev:vite` for local mode only. `netlify link` state is git-ignored in `.netlify/`.
- Figma MCP needs the account `jcaddell.tech@gmail.com`; the other account is view-only.
- Where things live: pages in `src/pages/`, data and logic in `src/lib/`, jobs state in `src/context/JobsContext.jsx`, functions in `netlify/functions/`.
- Classification of PM vs Dev tracks is in `src/lib/tracks.js` and mirrored in `netlify/functions/fetch-jobs.js`; keep the two word lists in sync.
- Known limits: `MAX_YEARS_EXPERIENCE = 6` in `fetch-jobs.js` drops postings asking for more than 6 years; state-scoped Remote postings outside your locations are dropped; the feed only covers companies in the Netlify env vars `GREENHOUSE_BOARDS`, `LEVER_COMPANIES` and `ASHBY_COMPANIES`.
