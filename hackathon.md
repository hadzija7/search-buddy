# Hackathon log

- **Project:** search-buddy
- **Event:** Convex All Gas Hackathon
- **What it does:** Agent-facing Convex backend that remembers a job-search profile, stores companies and opportunities, scrapes career sites with Firecrawl, and drafts AgentMail outreach.
- **Live app:** not deployed
- **Repo:** https://github.com/hadzija7/search-buddy
- **Frontend:** Convex static hosting
- **Convex deployment:** https://kindhearted-lion-490.convex.cloud
- **Components:** none
- **Convex features:** schema, tables, indexes, full-text search, queries, mutations, actions, HTTP actions
- **Auth:** none
- **AI models:** none
- **Started:** 2026-09-16T07:03:24Z
- **Last updated:** 2026-09-16T07:31:00Z

## Log

### 2026-09-16 - working tree
Started from an empty folder, then bootstrapped a Convex-only agent backend: profiles, companies, opportunities, search runs, and outreach drafts. Seeded 24 US tech companies. Search now runs Firecrawl against career pages and skips Exa until that key is added. A live Stripe scrape stored a Community Manager role. AgentMail is registered for cover-letter send (`convex/schema.ts`, `convex/searchActions.ts`, `convex/lib/roles.ts`, `convex/outreach.ts`). Convex features: schema, indexes, full-text search, query, mutation, action, HTTP actions. No frontend.

### 2026-09-16 - SF community manager search
Search now parses location/role intent, prefers SF HQs from the company catalog, keyword-searches stored opportunities, then uses Firecrawl for web + LinkedIn/X and career-page scrapes. Live query `community manager role at SF based tech company` selected Stripe, Notion, Figma, Vercel, Cloudflare, Twilio, Databricks, Airbnb, Uber, OpenAI, Anthropic, and Linear. Stored search + Firecrawl returned Stripe Community Manager as the strong match. Web search returned 8 hits and social search returned 6; none named a catalog company so they were not stored. (`convex/searchActions.ts`, `convex/lib/firecrawl.ts`, `convex/lib/queryIntent.ts`)
