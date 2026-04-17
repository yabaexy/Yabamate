# Yabamate Vercel Fix Set

Includes:
- `src/hooks/useMuseAI.ts` safe browser fallback
- `api/[...path].ts` Neon/Postgres API handler for Vercel

Set this in Vercel:
- `DATABASE_URL` for Neon
- `VITE_GEMINI_API_KEY` only if you want AI features enabled in the browser build
