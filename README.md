# SearchBuddy

Agent-facing Convex backend plus a native macOS SwiftUI renderer for Job Scout–style views.

## Convex backend (Job Scout–compatible)

The Convex code lives at the **repo root** in `convex/`. It mirrors Job Scout’s `jobs` and `companies` tables and public APIs so SearchBuddy can share the same deployment once you point it at that URL.

| Table | Role |
| --- | --- |
| `jobs` | Job Scout listings (url-keyed upserts, application status) |
| `companies` | Companies keyed by normalized domain (Job Scout shape) |
| `profiles`, `opportunities`, `searchRuns`, `outreach` | SearchBuddy agent extensions (additive) |

Public Job Scout–compatible functions:

- `api.companies.list` / `getByDomain` / `upsert` / `upsertMany`
- `api.jobs.list` / `getByUrl` / `upsert` / `upsertMany` / `markApplied` / `listApplied`

### Connect a deployment

Do **not** commit deploy keys or `.env` files. When you have the Convex deployment URL:

1. Copy `.env.example` → `.env.local` (gitignored).
2. Set `CONVEX_URL` (and optionally `CONVEX_DEPLOYMENT`) to the Job Scout deployment the team provides.
3. Run:

```bash
npm install
npx convex dev
```

Use `npx convex deploy` only for production. After the client is configured with that `CONVEX_URL`, the SearchBuddy macOS UI can read jobs/companies from this DB once wired to the Convex client.

Agent catalog helpers that must not collide with Job Scout names live as `listCatalog` / `upsertCatalog` on `api.companies`.

## macOS renderer

See [`macos/README.md`](macos/README.md) for the SwiftUI views app, fixtures, and tests.
