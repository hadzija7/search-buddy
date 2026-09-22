# Job Scout

A Grok Bot that finds real job openings on the web (via Firecrawl), stores them in Convex, and drives an on-demand generative UI in the SearchBuddy Swift app through a watched JSON view. No auto-apply spam — you browse and decide.

## 1. Convex

Schema and functions live in `convex/`.

```bash
npm install
cp .env.example .env.local   # set CONVEX_URL (and optional CONVEX_DEPLOYMENT)
npx convex dev               # deploys schema to Convex Cloud
```

Keep secrets out of the repo — only `.env.example` is checked in.

## 2. Grok Bot

1. Copy the [Job Scout Grok Bot template](https://x.ai/bot/ULxKLXULUm0Fg8ZCbHHyt).
2. Connect the **Firecrawl** and **Convex** plugins.

The bot scrapes openings, upserts them into Convex, and can emit SearchBuddy view payloads for the macOS app.

## 3. SwiftUI renderer

SearchBuddyViews paints whatever JSON agents write — no LLM inside the app.

1. Open `macos/SearchBuddyViews.xcodeproj` and run the **SearchBuddy Views** scheme.
2. Agents write to `~/Library/Application Support/SearchBuddy/views/current.json`.
3. The window reloads on write.

Full details (fixtures, view kinds, tests): [`macos/README.md`](https://github.com/hadzija7/search-buddy/blob/main/macos/README.md).
