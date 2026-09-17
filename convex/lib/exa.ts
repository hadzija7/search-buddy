import { getEnv } from "./env";

export type ExaSearchHit = {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
};

type ExaApiResult = {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
};

type ExaSearchResponse = {
  results?: ExaApiResult[];
};

export async function searchExa(args: {
  query: string;
  numResults: number;
  includeDomains?: string[];
}): Promise<{ hits: ExaSearchHit[]; note: string }> {
  const apiKey = getEnv("EXA_API_KEY");
  if (!apiKey) {
    return {
      hits: [],
      note: "EXA_API_KEY is not set. Run: npx convex env set EXA_API_KEY <key>",
    };
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: args.query,
      type: "auto",
      numResults: args.numResults,
      includeDomains: args.includeDomains,
      contents: {
        text: { maxCharacters: 1600 },
        highlights: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      hits: [],
      note: `Exa search failed with HTTP ${response.status}: ${detail.slice(0, 180)}`,
    };
  }

  const payload = (await response.json()) as ExaSearchResponse;
  const hits = (payload.results ?? [])
    .filter((result): result is ExaApiResult & { url: string } => {
      return typeof result.url === "string" && result.url.length > 0;
    })
    .map((result) => ({
      title: result.title ?? result.url,
      url: result.url,
      text:
        result.text ??
        (result.highlights ?? []).join("\n") ??
        "",
      publishedDate: result.publishedDate,
    }));

  return { hits, note: `Exa returned ${hits.length} hits` };
}
