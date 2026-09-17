import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { agentQuery } from "./lib/functions";
import {
  opportunitySourceValidator,
  opportunityStatusValidator,
  opportunityValidator,
} from "./lib/validators";

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

export const upsertFromSearch = internalMutation({
  args: {
    companyId: v.id("companies"),
    title: v.string(),
    roleFamily: v.optional(v.string()),
    description: v.string(),
    source: opportunitySourceValidator,
    sourceUrl: v.string(),
    sourceSnippet: v.optional(v.string()),
    location: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    searchRunId: v.optional(v.id("searchRuns")),
    discoveredAt: v.number(),
  },
  returns: v.id("opportunities"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("opportunities")
      .withIndex("by_source_url", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();
    if (existing) {
      await ctx.db.patch("opportunities", existing._id, {
        title: args.title,
        roleFamily: args.roleFamily ?? existing.roleFamily,
        description: args.description,
        sourceSnippet: args.sourceSnippet ?? existing.sourceSnippet,
        location: args.location ?? existing.location,
        remote: args.remote ?? existing.remote,
        searchRunId: args.searchRunId ?? existing.searchRunId,
        updatedAt: args.discoveredAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("opportunities", {
      companyId: args.companyId,
      title: args.title,
      roleFamily: args.roleFamily,
      description: args.description,
      source: args.source,
      sourceUrl: args.sourceUrl,
      sourceSnippet: args.sourceSnippet,
      location: args.location,
      remote: args.remote,
      status: "open",
      discoveredAt: args.discoveredAt,
      updatedAt: args.discoveredAt,
      searchRunId: args.searchRunId,
    });
  },
});
