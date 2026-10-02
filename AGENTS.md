Originally built on Lovable; now self-hosted (own Supabase project, Claude API for AI). See README.md for setup.

## Architecture
- Built-in crop library lives in code (src/lib/crops.ts); only user data and AI-looked-up varieties live in the database - keeps reference data versioned and free to read.
- Planting windows are stored as weeks relative to zone frost dates (src/lib/zones.ts) so any zone works without per-zone data.
- Signed-in pages live under src/routes/_authenticated and read data with the browser client under RLS; AI lookups go through authenticated server functions in src/lib/ai.functions.ts that call the Claude API (ANTHROPIC_API_KEY); custom icon images use OpenAI (OPENAI_API_KEY, optional).
- Garden photos live in the private `garden-photos` bucket under `{user_id}/` and are shown via short-lived signed URLs; rows in `garden_photos` tag scope (garden/bed/planting) - keeps photos owner-only without a public bucket.
- Daily weather comes from Open-Meteo directly in the browser with the location kept in localStorage - free, keyless, and no server round-trip.
