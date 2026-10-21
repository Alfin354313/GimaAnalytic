# GIMA Analytics

**People Analytics & HR Survey Platform** by Giandra Maheswara.

GIMA Analytics includes a public consulting website, survey interfaces, organization administration, and a super-admin interface. This repository is a static HTML/CSS/JavaScript application with Supabase SQL migrations and Vercel deployment configuration.

> Some pages and datasets may be demonstrations. Verify authentication, tenant isolation, and privacy controls before handling real employee information.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Public landing page and entry point |
| `login.html` | Login interface |
| `admin.html` | Organization administration interface |
| `super-admin.html` | Platform administration interface |
| `dashboard.html` | Dashboard/demo interface |
| `survey.html` | Survey builder |
| `isi-survei.html` | Public survey response interface |
| `respondent.html` | Respondent interface |
| `assets/` | Stylesheets, JavaScript, images and other static assets |
| `supabase/migrations/` | Database migrations |
| `docs/` | Supporting project documentation |
| `manifest.webmanifest` | PWA metadata |
| `service-worker.js` | PWA service worker |
| `vercel.json` | Vercel routing and security headers |

## Local development

From the repository root, run:

```bash
python -m http.server 3000
```

Then open http://localhost:3000. Note that clean URLs (such as `/login`) may require Vercel's routing behavior; for local static-server testing, open `/login.html`.

## Deployment

The repository uses Vercel. Review the deployment settings, environment variables, Supabase configuration, and preview deployment before promoting changes to production.

## Safe maintenance rules

1. Make changes on a feature or maintenance branch, not directly on `main`.
2. Keep page entry files at the repository root until all routes, imports, links, and PWA cache paths have been audited.
3. Put new styles, scripts and images into appropriately named subfolders under `assets/`.
4. Keep database schema changes in `supabase/migrations/`; do not commit secrets or credentials.
5. Avoid duplicating existing page code and shared utilities.
6. Test public pages, login, admin roles, survey flows, and Vercel Preview before merging.

## Refactoring checklist

- [ ] Inventory all HTML pages and their relative/absolute asset references.
- [ ] Audit cross-page links, redirects, service worker caching, and Vercel clean URLs.
- [ ] Identify duplicated CSS and JavaScript suitable for shared modules.
- [ ] Verify Supabase authentication and role-specific navigation.
- [ ] Validate preview deployment and responsive interfaces.
- [ ] Move entry pages only if route compatibility is explicitly preserved and tested.

## Notes

Documentation and directory organization do not themselves guarantee application security. Validate database policies and permissions independently before using real customer data.
