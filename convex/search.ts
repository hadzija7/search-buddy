import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { agentQuery } from "./lib/functions";
import { requireProfile } from "./lib/profiles";
import { matchesLocations, roleSearchText } from "./lib/queryIntent";
import { matchesRoles, wantsTopUsTech } from "./lib/roles";
import { companyValidator, searchRunValidator } from "./lib/validators";

export const listRuns = agentQuery({
  args: {
    handle: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchRunValidator),
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.handle);
    const limit = Math.min(args.limit ?? 10, 25);
    return await ctx.db
      .query("searchRuns")
      .withIndex("by_profile_and_created", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(limit);
  },
});

export const startRun = internalMutation({
  args: {
    profileId: v.id("profiles"),
    query: v.string(),
    roleFilters: v.array(v.string()),
    companyScope: v.optional(v.string()),
    createdAt: v.number(),
  },
  returns: v.id("searchRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("searchRuns", {
      profileId: args.profileId,
      query: args.query,
      roleFilters: args.roleFilters,
      companyScope: args.companyScope,
      status: "running",
      resultCount: 0,
      providerNotes: [],
      createdAt: args.createdAt,
    });
  },
});

export const finishRun = internalMutation({
  args: {
    searchRunId: v.id("searchRuns"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    resultCount: v.number(),
    providerNotes: v.array(v.string()),
    error: v.optional(v.string()),
    completedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("searchRuns", args.searchRunId, {
      status: args.status,
      resultCount: args.resultCount,
      providerNotes: args.providerNotes,
      error: args.error,
      completedAt: args.completedAt,
    });
    return null;
  },
});

export const getProfileForSearch = internalQuery({
  args: { handle: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("profiles"),
      handle: v.string(),
      targetRoles: v.array(v.string()),
      locations: v.array(v.string()),
      companyFocus: v.optional(v.string()),
      skills: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_handle", (q) => q.eq("handle", args.handle))
      .unique();
    if (!profile) {
      return null;
    }
    return {
      _id: profile._id,
      handle: profile.handle,
      targetRoles: profile.targetRoles,
      locations: profile.locations,
      companyFocus: profile.companyFocus,
      skills: profile.skills,
    };
  },
});

export const selectCompanies = internalQuery({
  args: {
    query: v.string(),
    companyFocus: v.optional(v.string()),
    locations: v.optional(v.array(v.string())),
    limit: v.number(),
  },
  returns: v.array(companyValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 12);
    const scope = `${args.query} ${args.companyFocus ?? ""}`;
    const preferTop = wantsTopUsTech(scope);
    const locations = args.locations ?? [];
    const catalog = await ctx.db
      .query("companies")
      .withIndex("by_tier", (q) => q.eq("tier", "top100_us_tech"))
      .take(40);
    const local = catalog.filter((company) =>
      matchesLocations(
        `${company.hqLocation ?? ""} ${company.country ?? ""} ${company.name}`,
        locations,
      ),
    );
    if (local.length > 0) {
      return local.slice(0, limit);
    }

    if (preferTop) {
      return catalog.slice(0, limit);
    }

    const named = await ctx.db
      .query("companies")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(limit);
    if (named.length > 0) {
      return named;
    }

    return catalog.slice(0, limit);
  },
});

export const storedForCompanies = internalQuery({
  args: {
    companyIds: v.array(v.id("companies")),
    query: v.string(),
    roles: v.array(v.string()),
  },
  returns: v.array(v.id("opportunities")),
  handler: async (ctx, args) => {
    const matched: Id<"opportunities">[] = [];
    for (const companyId of args.companyIds) {
      const rows = await ctx.db
        .query("opportunities")
        .withIndex("by_company_and_status", (q) =>
          q.eq("companyId", companyId).eq("status", "open"),
        )
        .take(20);
      for (const row of rows) {
        const blob = `${row.title} ${row.description} ${row.roleFamily ?? ""}`;
        if (matchesRoles(blob, args.roles) || matchesRoles(blob, [args.query])) {
          matched.push(row._id);
        }
      }
    }
    return matched;
  },
});

export const searchStoredKeywords = internalQuery({
  args: {
    query: v.string(),
    roles: v.array(v.string()),
    locations: v.array(v.string()),
    limit: v.number(),
  },
  returns: v.array(v.id("opportunities")),
  handler: async (ctx, args) => {
    const searchText = roleSearchText(args.roles, args.query);
    const rows = await ctx.db
      .query("opportunities")
      .withSearchIndex("search_title", (q) =>
        q.search("title", searchText).eq("status", "open"),
      )
      .take(Math.min(args.limit, 40));

    const matched: Id<"opportunities">[] = [];
    for (const row of rows) {
      const company = await ctx.db.get("companies", row.companyId);
      if (!company) {
        continue;
      }
      const blob = `${row.title} ${row.description} ${row.roleFamily ?? ""} ${row.location ?? ""}`;
      if (args.roles.length > 0 && !matchesRoles(blob, args.roles)) {
        continue;
      }
      if (
        !matchesLocations(
          `${row.location ?? ""} ${company.hqLocation ?? ""} ${company.name}`,
          args.locations,
        )
      ) {
        continue;
      }
      matched.push(row._id);
    }
    return matched;
  },
});

export const loadOpportunities = internalQuery({
  args: { opportunityIds: v.array(v.id("opportunities")) },
  returns: v.array(
    v.object({
      opportunity: v.object({
        _id: v.id("opportunities"),
        title: v.string(),
        roleFamily: v.optional(v.string()),
        description: v.string(),
        source: v.string(),
        sourceUrl: v.string(),
        location: v.optional(v.string()),
        companyId: v.id("companies"),
      }),
      companyName: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const results: Array<{
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
    }> = [];

    for (const opportunityId of args.opportunityIds) {
      const opportunity = await ctx.db.get("opportunities", opportunityId);
      if (!opportunity) {
        continue;
      }
      const company = await ctx.db.get("companies", opportunity.companyId);
      if (!company) {
        continue;
      }
      results.push({
        opportunity: {
          _id: opportunity._id,
          title: opportunity.title,
          roleFamily: opportunity.roleFamily,
          description: opportunity.description,
          source: opportunity.source,
          sourceUrl: opportunity.sourceUrl,
          location: opportunity.location,
          companyId: opportunity.companyId,
        },
        companyName: company.name,
      });
    }
    return results;
  },
});
