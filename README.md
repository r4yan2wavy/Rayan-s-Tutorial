# Rayan's Tutorial

The existing SHSAT practice platform, prepared for Next.js 16, Supabase Auth/PostgreSQL, and free Vercel hosting. Its current design, adaptive diagnostic, practice, timed mocks, explanations, mistake bank, progress, and content studio are preserved.

The live site is [rayan-s-tutorial.vercel.app](https://rayan-s-tutorial.vercel.app). Google signup/login is configured and tested in production. Start with [the complete setup guide](docs/deployment.md) for setup and recovery details.

The diagnostic contains exactly **100 questions: 50 ELA and 50 Math**. ELA includes 40 reading questions in complete passage sets and 10 revising/editing questions. There are 50 original passages at each of five levels. Reading level changes between passage sets; Math generates validated questions and changes difficulty after answers. Progress saves throughout, and all 100 answers are required before completion. Active older diagnostics upgrade while preserving saved work; completed older results remain intact.

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

For an already seeded database, run `pnpm db:seed-editing` before deploying this diagnostic update. It adds the 200 versioned revising/editing questions without rewriting existing answers or question records.

See [diagnostic behavior and verification](docs/diagnostic-update.md) for the section breakdown, saved-session handling, and content limits.
