# Midtrans Sandbox — GIMA Analytics (Preview only)

## Prerequisites
- Apply SQL migration `20261010_010_automatic_invoice_payment_channels.sql` **first**, then `20261010_011_midtrans_sandbox.sql`. SQL 010 has NOT been confirmed executed.
- Configure Supabase Edge Function secrets: `MIDTRANS_SERVER_KEY` (Midtrans **sandbox** server key). Supabase URL, anon and service-role credentials must remain server-side. Never commit them to GitHub.
- Deploy `gima-midtrans-checkout` with JWT verification **enabled**. Deploy `gima-midtrans-webhook` with JWT verification **disabled** because Midtrans calls it without a Supabase session; signature verification and Midtrans API recheck are performed in code.
- Configure Midtrans Sandbox Payment Notification URL:
  `https://blfhaxwexvuoldxwsjfq.supabase.co/functions/v1/gima-midtrans-webhook`
- Configure checkout's finish callback to a Preview-safe URL before client testing; current fallback is production admin URL and should be changed before production.
- The checkout function is **not yet connected to a browser checkout button**. No automated payment method is live.
- QRIS/VA availability and credentials depend on Midtrans merchant activation and provider configuration.

## Safeguards and limitations
- All transaction creation uses the server-side service role after user authentication and owner/admin membership validation.
- Webhook checks Midtrans SHA-512 signature and queries provider status server-to-server before updating the transaction ledger.
- Existing transactions are reused by invoice ID to avoid duplicate orders. A failed setup needs an operator recovery path; do not delete ledger entries manually.
- Payment status is kept in `midtrans_transactions` and must be combined with verified manual payments for a unified paid/outstanding calculation.
- Current schema allows invoice payment method preference to be changed by owner/admin; this must not be presented as an active QRIS/VA option before sandbox and production integration pass.
- Payment deadlines are invoice issue date + five calendar days, but provider checkout expiry is not yet configured to match. Add Midtrans transaction expiry before production use.
- A full security audit and concurrency/idempotency test is still required.

**No merge to main without explicit user permission.**
