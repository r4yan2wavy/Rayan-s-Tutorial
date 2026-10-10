# Vercel deployment readiness

This source snapshot is the Queens Scholars Tutorial portal. It is stored on
the `queens-scholars-tutorial` branch of `r4yan2wavy/Rayan-s-Tutorial`; the
repository's existing `main` application is a separate project.

## Current status

No working Vercel deployment of this portal has been completed. The connected
Vercel account is recognized, but its project workspace rejects access with
HTTP 403 and requests authentication with access to that workspace. No account
upgrade, paid integration, or database migration has been performed.

The connected account reports the Hobby plan. Vercel's fair-use rules require
a Pro or Enterprise plan for commercial deployments, including sites that
advertise paid services. This tutoring service needs an eligible workspace.
See https://vercel.com/docs/limits/fair-use-guidelines .

## Application requirements

The existing build uses Vinext with a Cloudflare Worker and a D1 database
binding. It is not yet a native Vercel/Next.js deployment. Uploading these
files or exporting the public pages alone does not deploy the full portal.

Before deploying on Vercel:

1. Restore access to the intended eligible Vercel workspace.
2. Select and provision a real shared persistent database, then prepare and
   verify the server adapter and migrations. The current schema uses SQLite
   semantics; a compatible remote SQLite/libSQL provider avoids a wholesale
   PostgreSQL schema rewrite. An existing D1 database needs a supported secure
   runtime access path. Cloudflare's management REST API is not the preferred
   high-volume application query path.
3. Use a native Next.js build for Vercel, retain custom account authentication,
   and verify durable saved progress, transaction rollback, role restrictions,
   administrator setup, and server-authoritative deadlines against that backend.
4. Store connection credentials and a fresh administrator setup token as
   server-only environment variables. Never commit them or use shared default
   administrator credentials. Apply migrations before accepting real enrollments.
5. Link the correct GitHub branch and commit to a separate Vercel project. Do
   not promote this branch over the existing tutorial site's production project.
6. Verify the resulting deployment end to end before reporting a live URL.

The local commands in the main README remain supported. Existing verification
reports describe local Cloudflare-compatible checks, not successful Vercel
runtime or database verification. The source includes no live database, private
setup token, account records, dependency folder, or checkout hosting identity.

Automatic Git deployment of this branch is paused in `vercel.json` while these
requirements are unresolved. This prevents an unrelated preview on the existing
tutorial Vercel project. Enable the branch only after the intended Vercel
project, native build, and persistent backend are ready.
