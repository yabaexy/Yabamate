# Yabamate + Neon + Vercel bundle

This bundle contains:
- `server.ts.patch` — minimal patch for the existing Express server
- `api/[...path].ts` — Vercel catch-all API entrypoint
- `vercel.json` — build/output config for Vercel
- `.env.example` — environment variable template

Apply the patch to the repository root, then add the new files.
