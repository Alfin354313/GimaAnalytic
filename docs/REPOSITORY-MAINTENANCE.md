# Repository maintenance and route audit

Last reviewed: 2026-10-21. This is a source-level audit, not a deployed end-to-end test.

## Why page files remain at the root

Vercel currently uses `cleanUrls: true` and `trailingSlash: false` in `vercel.json`. The existing site links to paths such as `/login`, `/admin`, `/survey`, `/respondent`, and `/dashboard`. Moving entry HTML files into a `pages/` directory without explicit routing would break these URLs. **Keep entry HTML files at the root until compatible rewrites and preview tests exist.**

## Source-level dependency inventory

| Entry point | Styles | Scripts / dependencies |
| --- | --- | --- |
| `index.html` | `/assets/css/base.css`, `sections.css`, `contact.css` | Public landing scripts (inspect before refactor) |
| `login.html` | `base.css`, `auth.css` | Supabase UMD, `supabase-config.js`, `auth-client.js`, `login.js`, `install-app.js` |
| `admin.html` | `base.css`, `admin-workspace.css`, `admin-dashboard.css` | Supabase, auth client, admin workspace/navigation/dashboard, employees, surveys, respondents, analysis, reports, team, settings and billing modules |
| `super-admin.html` | `base.css`, `admin-workspace.css`, `super-admin-design.css` | Supabase, auth client, super-admin modules |
| `dashboard.html` | `base.css`, `sections.css`, `dashboard.css` | `demo-data.js`, `dashboard.js` |
| `survey.html` | `base.css`, `survey.css` | `survey-template.js`, `survey-builder.js` |
| `respondent.html` | `base.css`, `respondent.css` | `survey-template.js`, `respondent.js` |
| `isi-survei.html` | `public-survey-design.css` | Supabase, `supabase-config.js`, `auth-client.js`, `public-survey.js` |

Asset paths in these HTML pages are root-absolute (`/assets/...`), so moving assets or pages requires careful validation. Several script and stylesheet URLs use explicit version query strings for cache busting; preserve them until their cache behavior is tested.

## Recommended layout for new code

- `assets/css/`: shared base styles and page-specific CSS
- `assets/js/`: shared auth/config helpers and page-specific JavaScript
- `assets/`: images, logos, and icons
- `docs/`: architecture, maintenance and deployment notes
- `supabase/migrations/`: SQL schema migrations

Prefer small, cohesive modules over a single very large script. **Do not split code solely to increase the number of files.** Reuse shared code only when behavior is genuinely common across pages.

## Pre-merge test checklist

- [ ] Vercel Preview builds successfully and all existing clean URLs load.
- [ ] Public homepage, login, dashboard demo and survey builder work.
- [ ] Organization login redirects to the correct organization dashboard.
- [ ] Super-admin login and permissions remain isolated.
- [ ] Public survey submission and respondent flow work.
- [ ] Supabase RLS policies and migration compatibility are verified separately.
- [ ] Mobile navigation, images, CSS, PWA manifest and service worker work.
- [ ] Browser console and network panel show no new errors.
- [ ] No secrets or real employee data are committed.

## Safe refactor sequence

1. Inventory all files and cross-file imports.
2. Establish basic smoke tests for critical routes.
3. Refactor only duplicated code that can be tested independently.
4. Keep existing page paths and public URLs stable.
5. Review Vercel Preview, then merge only with explicit approval.

No deployment or runtime verification is implied by this document.
