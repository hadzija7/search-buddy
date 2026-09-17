import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { agentMutation, agentQuery } from "./lib/functions";
import { STARTER_US_TECH_COMPANIES } from "./lib/starterCompanies";
import { companyTierValidator, companyValidator } from "./lib/validators";

export const get = agentQuery({
  args: { companyId: v.id("companies") },
  returns: v.union(companyValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get("companies", args.companyId);
  },
});

export const list = agentQuery({
  args: {
    tier: v.optional(companyTierValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(companyValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    if (args.tier) {
      return await ctx.db
        .query("companies")
        .withIndex("by_tier", (q) => q.eq("tier", args.tier!))
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("companies").order("asc").paginate(args.paginationOpts);
  },
});

export const searchByName = agentQuery({
  args: {
    query: v.string(),
    tier: v.optional(companyTierValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(companyValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    return await ctx.db
      .query("companies")
      .withSearchIndex("search_name", (q) => {
        const searched = q.search("name", args.query);
        return args.tier ? searched.eq("tier", args.tier) : searched;
      })
      .take(limit);
  },
});

export const upsert = agentMutation({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    careersUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    xUrl: v.optional(v.string()),
    industry: v.optional(v.string()),
    country: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
    tier: v.optional(companyTierValidator),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  returns: v.id("companies"),
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.domain) {
      const existingByDomain = await ctx.db
        .query("companies")
        .withIndex("by_domain", (q) => q.eq("domain", args.domain))
        .unique();
      if (existingByDomain) {
        await ctx.db.patch("companies", existingByDomain._id, {
          name: args.name,
          website: args.website ?? existingByDomain.website,
          careersUrl: args.careersUrl ?? existingByDomain.careersUrl,
          linkedinUrl: args.linkedinUrl ?? existingByDomain.linkedinUrl,
          xUrl: args.xUrl ?? existingByDomain.xUrl,
          industry: args.industry ?? existingByDomain.industry,
          country: args.country ?? existingByDomain.country,
          hqLocation: args.hqLocation ?? existingByDomain.hqLocation,
          tier: args.tier ?? existingByDomain.tier,
          tags: args.tags ?? existingByDomain.tags,
          notes: args.notes ?? existingByDomain.notes,
          updatedAt: now,
        });
        return existingByDomain._id;
      }
    }

    const existingByName = await ctx.db
      .query("companies")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existingByName) {
      await ctx.db.patch("companies", existingByName._id, {
        domain: args.domain ?? existingByName.domain,
        website: args.website ?? existingByName.website,
        careersUrl: args.careersUrl ?? existingByName.careersUrl,
        linkedinUrl: args.linkedinUrl ?? existingByName.linkedinUrl,
        xUrl: args.xUrl ?? existingByName.xUrl,
        industry: args.industry ?? existingByName.industry,
        country: args.country ?? existingByName.country,
        hqLocation: args.hqLocation ?? existingByName.hqLocation,
        tier: args.tier ?? existingByName.tier,
        tags: args.tags ?? existingByName.tags,
        notes: args.notes ?? existingByName.notes,
        updatedAt: now,
      });
      return existingByName._id;
    }

    return await ctx.db.insert("companies", {
      name: args.name,
      domain: args.domain,
      website: args.website,
      careersUrl: args.careersUrl,
      linkedinUrl: args.linkedinUrl,
      xUrl: args.xUrl,
      industry: args.industry,
      country: args.country ?? "US",
      hqLocation: args.hqLocation,
      tier: args.tier ?? "other",
      tags: args.tags ?? [],
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const seedStarterSet = agentMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    skipped: v.boolean(),
  }),
  handler: async (ctx) => {
    return await seedStarterCompanies(ctx);
  },
});

export const ensureStarterSet = internalMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    skipped: v.boolean(),
  }),
  handler: async (ctx) => {
    return await seedStarterCompanies(ctx);
  },
});

async function seedStarterCompanies(
  ctx: MutationCtx,
): Promise<{ inserted: number; skipped: boolean }> {
  const existing = await ctx.db.query("companies").first();
  if (existing) {
    return { inserted: 0, skipped: true };
  }

  const now = Date.now();
  let inserted = 0;
  for (const company of STARTER_US_TECH_COMPANIES) {
    await ctx.db.insert("companies", {
      name: company.name,
      domain: company.domain,
      website: company.website,
      careersUrl: company.careersUrl,
      linkedinUrl: company.linkedinUrl,
      xUrl: company.xUrl,
      industry: "technology",
      country: "US",
      hqLocation: company.hqLocation,
      tier: "top100_us_tech",
      tags: company.tags,
      createdAt: now,
      updatedAt: now,
    });
    inserted += 1;
  }
  return { inserted, skipped: false };
}

export const markSearched = internalMutation({
  args: { companyId: v.id("companies"), searchedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("companies", args.companyId, {
      lastSearchedAt: args.searchedAt,
      updatedAt: args.searchedAt,
    });
    return null;
  },
});
