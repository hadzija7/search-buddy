# SearchBuddy

Agent-facing Convex backend plus a native macOS SwiftUI renderer for Job Scout–style views.

## Convex backend

The Convex code lives at the **repo root** in `convex/`.

| Table | Role |
| --- | --- |
| `jobs` | Job Scout–compatible listings (url-keyed upserts, application status) |
| `companies` | Companies keyed by normalized domain (shared by Job Scout + catalog) |
| `opportunities` | **Scouting openings store** — drives SearchBuddy’s `job-scout.opportunities` view |
| `profiles`, `searchRuns`, `outreach` | SearchBuddy agent extensions (additive) |

**Opportunities are jobs for scouting.** Prefer `opportunities` APIs for the SearchBuddy openings table. Keep `jobs` for Job Scout compatibility; do not force the Swift UI onto `jobs`.

### Job Scout–compatible public functions

- `api.companies.list` / `getByDomain` / `upsert` / `upsertMany`
- `api.jobs.list` / `getByUrl` / `upsert` / `upsertMany` / `markApplied` / `listApplied`

### Opportunities (scouting / SearchBuddy UI)

- `api.opportunities.get` / `listByCompany` / `searchStored`
- `api.opportunities.upsert` — write openings with optional `applicationStatus`, `why`, `rank`, `companyName` (omitted optionals are preserved on update; `applicationStatus: null` clears to UI “none”)
- `api.opportunities.searchBuddyView` — returns a ready-to-write SearchBuddy view envelope for `job-scout.opportunities`

Agent catalog helpers that must not collide with Job Scout names live as `listCatalog` / `upsertCatalog` on `api.companies`.

### Writing `current.json` for SearchBuddyViews

On macOS, the Swift UI atomically reads:

`~/Library/Application Support/SearchBuddy/views/current.json`

1. Call `api.opportunities.searchBuddyView` with either `opportunityIds` or a title `query` (optional `title` for the window heading).
2. Write the returned JSON object as `current.json` (overwrite).

Critical format rules the query already satisfies:

- `fields` is a **string array** of property names (never `[{key,label}]`)
- Item properties are **flat** on each item (never nested under `item.fields`)
- `viewId`: `job-scout.opportunities`, `layout`: `table`, theme accent `#0F766E`, density `comfortable`
- Item `id` and `url` = apply URL (`sourceUrl`); `applicationStatus` null → UI “none”; `why` is the popover

See `Fixtures/job-scout.opportunities.json` and [`macos/README.md`](macos/README.md).

### Companies migration (done on kindhearted-lion-490)

PR #1 renamed company timestamps to Job Scout’s `firstSeenAt`/`lastSeenAt`. Live catalog rows used SearchBuddy `createdAt`/`updatedAt`.

`companies:migrateLegacyTimestamps` rewrites those rows (`createdAt`→`firstSeenAt`, `updatedAt`→`lastSeenAt`, drops legacy fields). Already run on `kindhearted-lion-490` (24 companies, `legacy: 0`).

To re-check or run on another deployment:

```bash
npx convex run companies:migrateLegacyTimestamps '{"paginationOpts":{"numItems":100,"cursor":null}}'
npx convex run companies:countLegacyTimestampRows '{}'
# expect { "legacy": 0 }
```

### Connect a deployment

Do **not** commit deploy keys or `.env` files. When you have the Convex deployment URL:

1. Copy `.env.example` → `.env.local` (gitignored).
2. Set `CONVEX_URL` (and optionally `CONVEX_DEPLOYMENT`) to the deployment the team provides.
3. Run:

```bash
npm install
npx convex dev
```

Use `npx convex deploy` only for production.

## macOS renderer

See [`macos/README.md`](macos/README.md) for the SwiftUI views app, fixtures, and tests.
