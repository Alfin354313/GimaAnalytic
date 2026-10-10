# GIMA Analytics — Phase 7 (Preview)

## Implemented
- Private `survey_responses` and `survey_answers` tables, with RLS enabled and no direct client policies.
- `gima_survey_summary(uuid)` authenticated RPC, checking organization membership and withholding question-level averages until at least 5 responses.
- Admin dashboard **Laporan** action for each survey, with honest empty/threshold states.

## Not yet implemented
- Public respondent link and one-time access mechanism.
- Consent capture UX, anti-abuse/rate limits, validated atomic submission RPC.
- Real respondent submission and charts/export. Do not use with real participant data yet.

## Setup
1. Run `supabase/migrations/20261010_004_private_responses.sql` in Supabase SQL Editor (after prior migrations).
2. Open the latest Vercel Preview deployment for `preview/gima-phase7-responses`.
3. Log in and click **Laporan** on a survey; with no responses, it should show a minimum-five privacy notice.

Never merge without explicit approval.
