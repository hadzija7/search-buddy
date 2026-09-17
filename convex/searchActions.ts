import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { getEnv } from "./lib/env";
import {
  scrapeCareersPage,
  searchFirecrawl,
  type FirecrawlSearchHit,
} from "./lib/firecrawl";
import {
  mentionsCompany,
  parseSearchIntent,
  roleSearchText,
} from "./lib/queryIntent";
import { inferRoleFamily, matchesRoles, sourceFromUrl } from "./lib/roles";

type ProfileSummary = {
  _id: Id<"profiles">;
  handle: string;
  targetRoles: string[];
  locations: string[];
  companyFocus?: string;
  skills: string[];
};

type LoadedOpportunity = {
  opportunity: {
    _id: Id<"opportunities">;
    title: string;
    roleFamily?: string;
    description: string;
    source: string;
    sourceUrl: string;
    location?: string;
    companyId: Id<"companies">;
  };
  companyName: string;
};

const SOCIAL_DOMAINS = ["linkedin.com", "x.com", "twitter.com"];

function uniqueIds(ids: Id<"opportunities">[]): Id<"opportunities">[] {
  return [...new Set(ids)];
}

function matchHitToCompany(
  hit: FirecrawlSearchHit,
  companies: Doc<"companies">[],
): Doc<"companies"> | null {
  const blob = `${hit.title} ${hit.url} ${hit.snippet}`;
  for (const company of companies) {
    if (company.domain && hit.url.toLowerCase().includes(company.domain)) {
      return company;
    }
    if (mentionsCompany(blob, company.name)) {
      return company;
    }
  }
  return null;
}

export const findOpportunities = action({
  args: {
    handle: v.string(),
    query: v.string(),
    roles: v.optional(v.array(v.string())),
    companyLimit: v.optional(v.number()),
    includeSocial: v.optional(v.boolean()),
    includeWebsites: v.optional(v.boolean()),
    agentKey: v.optional(v.string()),
  },
  returns: v.object({
    searchRunId: v.id("searchRuns"),
    query: v.string(),
    roles: v.array(v.string()),
    companiesSearched: v.array(v.string()),
    opportunities: v.array(
      v.object({
        _id: v.id("opportunities"),
        title: v.string(),
        roleFamily: v.optional(v.string()),
        description: v.string(),
        source: v.string(),
        sourceUrl: v.string(),
        location: v.optional(v.string()),
        companyId: v.id("companies"),
        companyName: v.string(),
      }),
    ),
    providerNotes: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const expectedKey = getEnv("AGENT_API_KEY");
    if (expectedKey && args.agentKey !== expectedKey) {
      throw new Error("Unauthorized: invalid agent key");
    }
    const firecrawlConfigured = Boolean(getEnv("FIRECRAWL_API_KEY"));
    const includeSocial = args.includeSocial ?? firecrawlConfigured;
    const includeWebsites = args.includeWebsites ?? true;
    const now = Date.now();
    const intent = parseSearchIntent(args.query, args.roles ?? []);

    await ctx.runMutation(internal.companies.ensureStarterSet, {});

    let profile: ProfileSummary | null = await ctx.runQuery(
      internal.search.getProfileForSearch,
      {
        handle: args.handle,
      },
    );
    const inferredRoles =
      intent.roles.length > 0
        ? intent.roles
        : args.roles && args.roles.length > 0
          ? args.roles
          : profile?.targetRoles ?? [];
    const inferredLocations =
      intent.locations.length > 0
        ? intent.locations
        : profile?.locations ?? [];

    if (!profile) {
      await ctx.runMutation(internal.profiles.ensureFromSearch, {
        handle: args.handle,
        targetRoles: inferredRoles,
        locations: inferredLocations,
        notes: args.query,
      });
      profile = await ctx.runQuery(internal.search.getProfileForSearch, {
        handle: args.handle,
      });
    } else {
      await ctx.runMutation(internal.profiles.ensureFromSearch, {
        handle: args.handle,
        targetRoles: inferredRoles,
        locations: inferredLocations,
        notes: args.query,
      });
      profile = await ctx.runQuery(internal.search.getProfileForSearch, {
        handle: args.handle,
      });
    }
    if (!profile) {
      throw new Error("Unable to create or load the search profile");
    }

    const roles: string[] =
      inferredRoles.length > 0 ? inferredRoles : profile.targetRoles;
    const locations: string[] =
      inferredLocations.length > 0 ? inferredLocations : profile.locations;
    const searchRunId: Id<"searchRuns"> = await ctx.runMutation(
      internal.search.startRun,
      {
        profileId: profile._id,
        query: args.query,
        roleFilters: roles,
        companyScope: profile.companyFocus,
        createdAt: now,
      },
    );

    const matchPool: Doc<"companies">[] = await ctx.runQuery(
      internal.search.selectCompanies,
      {
        query: args.query,
        companyFocus: profile.companyFocus,
        locations,
        limit: 12,
      },
    );
    const scrapeLimit = Math.min(args.companyLimit ?? 4, matchPool.length);
    const scrapeTargets = matchPool.slice(0, scrapeLimit);
    const roleText = roleSearchText(roles, args.query);
    const providerNotes: string[] = [];
    const opportunityIds: Id<"opportunities">[] = [];

    const keywordIds = await ctx.runQuery(internal.search.searchStoredKeywords, {
      query: args.query,
      roles,
      locations,
      limit: 20,
    });
    opportunityIds.push(...keywordIds);
    providerNotes.push(
      `Stored keyword search matched ${keywordIds.length} open roles`,
    );

    const storedIds = await ctx.runQuery(internal.search.storedForCompanies, {
      companyIds: matchPool.map((company) => company._id),
      query: args.query,
      roles,
    });
    opportunityIds.push(...storedIds);

    if (includeWebsites && firecrawlConfigured) {
      const web = await searchFirecrawl({
        query: `${roleText} hiring ${locations[0] ?? ""} tech company`,
        limit: 8,
        location: intent.locationLabel,
      });
      providerNotes.push(`Web: ${web.note}`);
      for (const hit of web.hits) {
        const blob = `${hit.title} ${hit.snippet}`;
        if (roles.length > 0 && !matchesRoles(blob, roles)) {
          continue;
        }
        const company = matchHitToCompany(hit, matchPool);
        if (!company) {
          continue;
        }
        const opportunityId = await ctx.runMutation(
          internal.opportunities.upsertFromSearch,
          {
            companyId: company._id,
            title: hit.title,
            roleFamily: inferRoleFamily(blob),
            description: hit.snippet.slice(0, 1200) || hit.title,
            source: sourceFromUrl(hit.url),
            sourceUrl: hit.url,
            sourceSnippet: hit.snippet.slice(0, 280),
            location: locations[0],
            searchRunId,
            discoveredAt: now,
          },
        );
        opportunityIds.push(opportunityId);
      }
    } else if (includeWebsites && !firecrawlConfigured) {
      providerNotes.push(
        "Firecrawl web search skipped. Set FIRECRAWL_API_KEY to search the open web.",
      );
    }

    if (includeSocial && firecrawlConfigured) {
      const social = await searchFirecrawl({
        query: `${roleText} hiring ${locations[0] ?? ""}`,
        limit: 6,
        includeDomains: SOCIAL_DOMAINS,
        location: intent.locationLabel,
      });
      providerNotes.push(`Social: ${social.note}`);
      for (const hit of social.hits) {
        const blob = `${hit.title} ${hit.snippet}`;
        if (roles.length > 0 && !matchesRoles(blob, roles)) {
          continue;
        }
        const company = matchHitToCompany(hit, matchPool);
        if (!company) {
          continue;
        }
        const opportunityId = await ctx.runMutation(
          internal.opportunities.upsertFromSearch,
          {
            companyId: company._id,
            title: hit.title,
            roleFamily: inferRoleFamily(blob),
            description: hit.snippet.slice(0, 1200) || hit.title,
            source: sourceFromUrl(hit.url),
            sourceUrl: hit.url,
            sourceSnippet: hit.snippet.slice(0, 280),
            location: locations[0],
            searchRunId,
            discoveredAt: now,
          },
        );
        opportunityIds.push(opportunityId);
      }
    } else if (includeSocial && !firecrawlConfigured) {
      providerNotes.push(
        "Firecrawl social search skipped. Set FIRECRAWL_API_KEY to search LinkedIn and X.",
      );
    }

    for (const company of scrapeTargets) {
      if (includeWebsites && company.careersUrl) {
        const page = await scrapeCareersPage({
          url: company.careersUrl,
          roleText,
        });
        providerNotes.push(`${company.name}: ${page.note}`);
        for (const job of page.jobs) {
          const blob = `${job.title} ${job.snippet ?? ""}`;
          if (roles.length > 0 && !matchesRoles(blob, roles)) {
            continue;
          }
          const sourceUrl = job.url ?? company.careersUrl;
          const opportunityId = await ctx.runMutation(
            internal.opportunities.upsertFromSearch,
            {
              companyId: company._id,
              title: job.title,
              roleFamily: inferRoleFamily(blob),
              description: (job.snippet ?? page.markdown ?? job.title).slice(
                0,
                1200,
              ),
              source: "website",
              sourceUrl,
              sourceSnippet: (job.snippet ?? job.title).slice(0, 280),
              location: job.location,
              searchRunId,
              discoveredAt: now,
            },
          );
          opportunityIds.push(opportunityId);
        }
      }

      await ctx.runMutation(internal.companies.markSearched, {
        companyId: company._id,
        searchedAt: now,
      });
    }

    const unique = uniqueIds(opportunityIds);
    const loaded: LoadedOpportunity[] = await ctx.runQuery(
      internal.search.loadOpportunities,
      {
        opportunityIds: unique,
      },
    );

    await ctx.runMutation(internal.search.finishRun, {
      searchRunId,
      status: "completed",
      resultCount: loaded.length,
      providerNotes,
      completedAt: Date.now(),
    });

    return {
      searchRunId,
      query: args.query,
      roles,
      companiesSearched: matchPool.map((company) => company.name),
      opportunities: loaded.map((row) => ({
        ...row.opportunity,
        companyName: row.companyName,
      })),
      providerNotes,
    };
  },
});
