import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { agentMutation, agentQuery } from "./lib/functions";
import {
  buildSearchBuddyOpportunitiesView,
  opportunityToSearchBuddyItem,
} from "./lib/searchBuddyView";
import {
  opportunityApplicationStatusValidator,
  opportunitySourceValidator,
  opportunityStatusValidator,
  opportunityValidator,
  searchBuddyOpportunitiesViewValidator,
} from "./lib/validators";

const applicationStatusArg = v.optional(
  v.union(opportunityApplicationStatusValidator, v.null()),
);

async function resolveCompanyName(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  provided?: string,
): Promise<string> {
  if (provided?.trim()) {
    return provided.trim();
  }
  const company = await ctx.db.get("companies", companyId);
  if (!company) {
    throw new Error("Company not found");
  }
  return company.name;
}

/**
 * Upsert by sourceUrl. Omitted optionals are preserved on patch;
 * pass null for applicationStatus to clear back to UI "none".
 */
async function upsertOpportunityCore(
  ctx: MutationCtx,
  args: {
    companyId: Id<"companies">;
    companyName?: string;
    title: string;
    roleFamily?: string;
    description: string;
    source: Doc<"opportunities">["source"];
    sourceUrl: string;
    sourceSnippet?: string;
    why?: string;
    location?: string;
    remote?: boolean;
    status?: Doc<"opportunities">["status"];
    applicationStatus?: Doc<"opportunities">["applicationStatus"] | null;
    rank?: number;
    searchRunId?: Id<"searchRuns">;
    discoveredAt: number;
  },
): Promise<Id<"opportunities">> {
  const companyName = await resolveCompanyName(
    ctx,
    args.companyId,
    args.companyName,
  );

  const existing = await ctx.db
    .query("opportunities")
    .withIndex("by_source_url", (q) => q.eq("sourceUrl", args.sourceUrl))
    .first();

  if (existing) {
    const clearApplication =
      args.applicationStatus === null || args.applicationStatus === "none";

    await ctx.db.patch("opportunities", existing._id, {
      companyId: args.companyId,
      companyName,
      title: args.title,
      description: args.description,
      source: args.source,
      // Omitted optionals keep prior values (search scrape must not wipe scout fields).
      roleFamily: args.roleFamily ?? existing.roleFamily,
      sourceSnippet: args.sourceSnippet ?? existing.sourceSnippet,
      why: args.why ?? existing.why,
      location: args.location ?? existing.location,
      remote: args.remote ?? existing.remote,
      status: args.status ?? existing.status,
      rank: args.rank ?? existing.rank,
      searchRunId: args.searchRunId ?? existing.searchRunId,
      applicationStatus: clearApplication
        ? undefined
        : (args.applicationStatus ?? existing.applicationStatus),
      updatedAt: args.discoveredAt,
    });
    return existing._id;
  }

  const applicationStatus =
    args.applicationStatus === null || args.applicationStatus === "none"
      ? undefined
      : args.applicationStatus;

  return await ctx.db.insert("opportunities", {
    companyId: args.companyId,
    companyName,
    title: args.title,
    roleFamily: args.roleFamily,
    description: args.description,
    source: args.source,
    sourceUrl: args.sourceUrl,
    sourceSnippet: args.sourceSnippet,
    why: args.why,
    location: args.location,
    remote: args.remote,
    status: args.status ?? "open",
    applicationStatus,
    rank: args.rank,
    discoveredAt: args.discoveredAt,
    updatedAt: args.discoveredAt,
    searchRunId: args.searchRunId,
  });
}

export const get = agentQuery({
  args: { opportunityId: v.id("opportunities") },
  returns: v.union(opportunityValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get("opportunities", args.opportunityId);
  },
});

export const listByCompany = agentQuery({
  args: {
    companyId: v.id("companies"),
    status: v.optional(opportunityStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(opportunityValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("opportunities")
        .withIndex("by_company_and_status", (q) =>
          q.eq("companyId", args.companyId).eq("status", args.status!),
        )
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("opportunities")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .paginate(args.paginationOpts);
  },
});

export const searchStored = agentQuery({
  args: {
    query: v.string(),
    roleFamily: v.optional(v.string()),
    status: v.optional(opportunityStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(opportunityValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 25, 50);
    return await ctx.db
      .query("opportunities")
      .withSearchIndex("search_title", (q) => {
        let searched = q.search("title", args.query);
        if (args.status) {
          searched = searched.eq("status", args.status);
        }
        if (args.roleFamily) {
          searched = searched.eq("roleFamily", args.roleFamily);
        }
        return searched;
      })
      .take(limit);
  },
});

/**
 * Internal upsert used by search actions. Omitted scout fields are preserved.
 */
export const upsertFromSearch = internalMutation({
  args: {
    companyId: v.id("companies"),
    companyName: v.optional(v.string()),
    title: v.string(),
    roleFamily: v.optional(v.string()),
    description: v.string(),
    source: opportunitySourceValidator,
    sourceUrl: v.string(),
    sourceSnippet: v.optional(v.string()),
    why: v.optional(v.string()),
    location: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    status: v.optional(opportunityStatusValidator),
    applicationStatus: applicationStatusArg,
    rank: v.optional(v.number()),
    searchRunId: v.optional(v.id("searchRuns")),
    discoveredAt: v.number(),
  },
  returns: v.id("opportunities"),
  handler: async (ctx, args) => {
    return await upsertOpportunityCore(ctx, args);
  },
});

/**
 * Public agent upsert for Job Scout / agents writing scout openings.
 * Same preserve-omitted-optionals behavior as upsertFromSearch.
 */
export const upsert = agentMutation({
  args: {
    companyId: v.id("companies"),
    companyName: v.optional(v.string()),
    title: v.string(),
    roleFamily: v.optional(v.string()),
    description: v.string(),
    source: opportunitySourceValidator,
    sourceUrl: v.string(),
    sourceSnippet: v.optional(v.string()),
    why: v.optional(v.string()),
    location: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    status: v.optional(opportunityStatusValidator),
    applicationStatus: applicationStatusArg,
    rank: v.optional(v.number()),
    searchRunId: v.optional(v.id("searchRuns")),
    discoveredAt: v.optional(v.number()),
  },
  returns: v.id("opportunities"),
  handler: async (ctx, args) => {
    return await upsertOpportunityCore(ctx, {
      ...args,
      discoveredAt: args.discoveredAt ?? Date.now(),
    });
  },
});

/**
 * Build a ready-to-write SearchBuddy view for `job-scout.opportunities`.
 * Pass `opportunityIds` and/or a title search `query` (ids win when both set).
 */
export const searchBuddyView = agentQuery({
  args: {
    opportunityIds: v.optional(v.array(v.id("opportunities"))),
    query: v.optional(v.string()),
    status: v.optional(opportunityStatusValidator),
    roleFamily: v.optional(v.string()),
    limit: v.optional(v.number()),
    title: v.optional(v.string()),
  },
  returns: searchBuddyOpportunitiesViewValidator,
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    let rows: Doc<"opportunities">[] = [];

    if (args.opportunityIds !== undefined) {
      for (const id of args.opportunityIds) {
        const row = await ctx.db.get("opportunities", id);
        if (row) {
          rows.push(row);
        }
      }
    } else if (args.query && args.query.trim().length > 0) {
      rows = await ctx.db
        .query("opportunities")
        .withSearchIndex("search_title", (q) => {
          let searched = q.search("title", args.query!);
          if (args.status) {
            searched = searched.eq("status", args.status);
          }
          if (args.roleFamily) {
            searched = searched.eq("roleFamily", args.roleFamily);
          }
          return searched;
        })
        .take(limit);
    } else {
      const status = args.status ?? "open";
      const byStatus = ctx.db
        .query("opportunities")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc");
      if (args.roleFamily) {
        rows = await byStatus
          .filter((q) => q.eq(q.field("roleFamily"), args.roleFamily!))
          .take(limit);
      } else {
        rows = await byStatus.take(limit);
      }
    }

    const companyCache = new Map<Id<"companies">, string>();
    const items = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      let companyName = row.companyName;
      if (!companyName) {
        const cached = companyCache.get(row.companyId);
        if (cached) {
          companyName = cached;
        } else {
          const company = await ctx.db.get("companies", row.companyId);
          companyName = company?.name ?? "Unknown";
          companyCache.set(row.companyId, companyName);
        }
      } else {
        companyCache.set(row.companyId, companyName);
      }

      items.push(
        opportunityToSearchBuddyItem(row, companyName, i + 1),
      );
    }

    return buildSearchBuddyOpportunitiesView({
      title: args.title,
      items,
    });
  },
});
