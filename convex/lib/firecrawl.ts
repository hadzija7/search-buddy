import { getEnv } from "./env";

export type ExtractedJob = {
  title: string;
  url?: string;
  location?: string;
  snippet?: string;
};

export type FirecrawlScrapeResult = {
  markdown?: string;
  jobs: ExtractedJob[];
  note: string;
};

type FirecrawlJson = {
  jobs?: Array<{
    title?: string;
    url?: string;
    location?: string;
    snippet?: string;
  }>;
};

type FirecrawlScrapeResponse = {
  data?: {
    markdown?: string;
    json?: FirecrawlJson;
  };
  markdown?: string;
  json?: FirecrawlJson;
};

export type FirecrawlSearchHit = {
  title: string;
  url: string;
  snippet: string;
};

type FirecrawlSearchResponse = {
  data?: {
    web?: Array<{
      title?: string;
      url?: string;
      description?: string;
      markdown?: string;
    }>;
  };
  web?: Array<{
    title?: string;
    url?: string;
    description?: string;
    markdown?: string;
  }>;
};

export async function searchFirecrawl(args: {
  query: string;
  limit: number;
  includeDomains?: string[];
  location?: string;
}): Promise<{ hits: FirecrawlSearchHit[]; note: string }> {
  const apiKey = getEnv("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return {
      hits: [],
      note: "FIRECRAWL_API_KEY is not set. Run: npx convex env set FIRECRAWL_API_KEY <key>",
    };
  }

  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: args.query,
      limit: args.limit,
      includeDomains: args.includeDomains,
      location: args.location,
      country: "US",
      sources: [{ type: "web" }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      hits: [],
      note: `Firecrawl search failed with HTTP ${response.status}: ${detail.slice(0, 180)}`,
    };
  }

  const payload = (await response.json()) as FirecrawlSearchResponse;
  const rows = payload.data?.web ?? payload.web ?? [];
  const hits = rows
    .filter((row): row is { url: string; title?: string; description?: string; markdown?: string } => {
      return typeof row.url === "string" && row.url.length > 0;
    })
    .map((row) => ({
      title: row.title ?? row.url,
      url: row.url,
      snippet: (row.description ?? row.markdown ?? "").slice(0, 400),
    }));

  return {
    hits,
    note: `Firecrawl search returned ${hits.length} results`,
  };
}

export async function scrapeCareersPage(args: {
  url: string;
  roleText: string;
}): Promise<FirecrawlScrapeResult> {
  const apiKey = getEnv("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return {
      jobs: [],
      note: "FIRECRAWL_API_KEY is not set. Run: npx convex env set FIRECRAWL_API_KEY <key>",
    };
  }

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: args.url,
      onlyMainContent: true,
      maxAge: 3_600_000,
      formats: [
        "markdown",
        {
          type: "json",
          prompt: `Extract open jobs related to: ${args.roleText}. Ignore unrelated roles.`,
          schema: {
            type: "object",
            properties: {
              jobs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    location: { type: "string" },
                    snippet: { type: "string" },
                  },
                },
              },
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      jobs: [],
      note: `Firecrawl scrape failed with HTTP ${response.status}: ${detail.slice(0, 180)}`,
    };
  }

  const payload = (await response.json()) as FirecrawlScrapeResponse;
  const markdown = payload.data?.markdown ?? payload.markdown;
  const extracted = payload.data?.json ?? payload.json;
  const jobs = (extracted?.jobs ?? [])
    .filter((job): job is { title: string; url?: string; location?: string; snippet?: string } => {
      return typeof job.title === "string" && job.title.length > 0;
    })
    .map((job) => ({
      title: job.title,
      url: job.url,
      location: job.location,
      snippet: job.snippet,
    }));

  return {
    markdown,
    jobs,
    note:
      jobs.length === 0
        ? "Firecrawl scraped the careers page but extracted 0 matching jobs"
        : `Firecrawl extracted ${jobs.length} jobs from the careers page`,
  };
}
