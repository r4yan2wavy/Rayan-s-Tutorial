# Rayan's Tutorial

The existing SHSAT practice platform, prepared for Next.js 16, Supabase Auth/PostgreSQL, and free Vercel hosting. Its current design, adaptive diagnostic, practice, timed mocks, explanations, mistake bank, progress, and content studio are preserved.

Start with [the complete setup guide](docs/deployment.md). Production Google login requires the Supabase provider and dashboard configuration described there; it has not yet been tested on your hosted accounts.

## Local development

Use Node.js 22.x and pnpm 11.19.0. Copy .env.example to .env.local and fill your project values privately. Apply supabase/migrations/202610020001_platform.sql in Supabase, then run:

```sh
pnpm install --frozen-lockfile
pnpm db:seed
pnpm dev
```

Open http://localhost:3000. Supabase Auth owns credentials; server routes verify the Auth user before any progress query. RLS runs using transaction-local verified identity. No Supabase service-role key or Google secret belongs in application code.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Tests exercise PostgreSQL policies, atomic saves, profile creation, safe redirects, and assessment generation locally. Real Google/account/production checks remain in the deployment guide. Historical Sites/D1 records can be imported with an explicit trusted UUID mapping; old passwords and auth sessions are never imported.
