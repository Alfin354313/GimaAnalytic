# Phase 14 — Preview deployment verification

Target branch: `preview/gima-phase14-commercial-readiness`
Latest application change before this deployment trigger: `e9e979d9a78f56da8a7afc50a34e8d7d0a9eb16d`.

This documentation commit is intentionally used to trigger a fresh Vercel Preview build after the project was upgraded to Pro. It does not change application behavior.

## Validate
1. Vercel Deployments: filter by this branch; find the newest deployment created from this commit, not "Redeploy of" an old deployment.
2. Confirm Preview / Ready, open deployment URL + `/admin`.
3. Sign in as organization owner/admin. Confirm sidebar card **Kontrak & Tagihan** under **Kesiapan Layanan**.
4. Confirm migration `20261010_009_client_billing.sql` was applied. Create test contract, invoice, and manual payment.
5. Verify analyst cannot view billing; verify owner-only payment verification. Do not use real client payment data until security tests pass.

**Never merge without explicit user approval.**
