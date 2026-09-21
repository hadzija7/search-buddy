import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { agentMutation, agentQuery } from "./lib/functions";
import { STARTER_US_TECH_COMPANIES } from "./lib/starterCompanies";
import { companyTierValidator, companyValidator } from "./lib/validators";

/** Host only: lovable.dev — no https://, no www. */
export function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.split("/")[0] ?? s;
  s = s.split("?")[0] ?? s;
  s = s.replace(/\.$/, "");
  return s;
}

export function websiteFromDomain(domain: string): string {
  return `https://${normalizeDomain(domain)}`;
}

type NormalizedCompany = {
  _id: Id<"companies">;
  _creationTime: number;
  name: string;
  domain: string;
  website?: string;
  careersUrl?: string;
  linkedinUrl?: string;
  source?: string;
  notes?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  xUrl?: string;
  industry?: string;
  country?: string;
  hqLocation?: string;
  tier?: "top100_us_tech" | "notable" | "other";
  tags?: string[];
  lastSearchedAt?: number;
};

/**
 * Map stored company rows (Job Scout or legacy SearchBuddy) to the Job Scout
 * API shape. Legacy used createdAt/updatedAt instead of firstSeenAt/lastSeenAt.
 */
export function asJobScoutCompany(doc: Doc<"companies">): NormalizedCompany {
  const firstSeenAt =
    doc.firstSeenAt ?? doc.createdAt ?? doc._creationTime;
  const lastSeenAt = doc.lastSeenAt ?? doc.updatedAt ?? firstSeenAt;
  let domain = doc.domain?.trim() ?? "";
  if (!domain && doc.website) {
    domain = normalizeDomain(doc.website);
  }
  if (!domain) {
    throw new Error(`Company ${doc._id} is missing domain`);
  }

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    name: doc.name,
    domain,
    website: doc.website,
    careersUrl: doc.careersUrl,
    linkedinUrl: doc.linkedinUrl,
    source: doc.source,
    notes: doc.notes,
    firstSeenAt,
    lastSeenAt,
    xUrl: doc.xUrl,
    industry: doc.industry,
    country: doc.country,
    hqLocation: doc.hqLocation,
    tier: doc.tier,
    tags: doc.tags,
    lastSearchedAt: doc.lastSearchedAt,
  };
}

function needsLegacyMigration(doc: Doc<"companies">): boolean {
  return (
    doc.firstSeenAt === undefined ||
    doc.lastSeenAt === undefined ||
    doc.createdAt !== undefined ||
    doc.updatedAt !== undefined
  );
}

function jobScoutCompanyFields(doc: Doc<"companies">): Omit<
  NormalizedCompany,
  "_id" | "_creationTime"
> {
  const normalized = asJobScoutCompany(doc);
  return {
    name: normalized.name,
    domain: normalized.domain,
    website: normalized.website,
    careersUrl: normalized.careersUrl,
    linkedinUrl: normalized.linkedinUrl,
    source: normalized.source,
    notes: normalized.notes,
    firstSeenAt: normalized.firstSeenAt,
    lastSeenAt: normalized.lastSeenAt,
    xUrl: normalized.xUrl,
    industry: normalized.industry,
    country: normalized.country,
    hqLocation: normalized.hqLocation,
    tier: normalized.tier,
    tags: normalized.tags,
    lastSearchedAt: normalized.lastSearchedAt,
  };
}

const companyInput = {
  name: v.string(),
  domain: v.string(),
  website: v.optional(v.string()),
  careersUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  source: v.optional(v.string()),
  notes: v.optional(v.string()),
};

const companyDoc = v.object({
  _id: v.id("companies"),
  _creationTime: v.number(),
  name: v.string(),
  domain: v.string(),
  website: v.optional(v.string()),
  careersUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  source: v.optional(v.string()),
  notes: v.optional(v.string()),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  xUrl: v.optional(v.string()),
  industry: v.optional(v.string()),
  country: v.optional(v.string()),
  hqLocation: v.optional(v.string()),
  tier: v.optional(companyTierValidator),
  tags: v.optional(v.array(v.string())),
  lastSearchedAt: v.optional(v.number()),
});

/** Job Scout–compatible public API */

export const list = query({
  args: {},
  returns: v.array(companyDoc),
  handler: async (ctx) => {
    const rows = await ctx.db.query("companies").collect();
    return rows.map(asJobScoutCompany);
  },
});

export const getByDomain = query({
  args: { domain: v.string() },
  returns: v.union(companyDoc, v.null()),
  handler: async (ctx, args) => {
    const domain = normalizeDomain(args.domain);
    const row = await ctx.db
      .query("companies")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .unique();
    return row ? asJobScoutCompany(row) : null;
  },
});

export const upsert = mutation({
  args: companyInput,
  returns: v.object({
    id: v.id("companies"),
    created: v.boolean(),
    domain: v.string(),
  }),
  handler: async (ctx, args) => {
    const domain = normalizeDomain(args.domain);
    if (!domain) {
      throw new Error("domain required");
    }
    const website = args.website?.trim() || websiteFromDomain(domain);
    const now = Date.now();
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .unique();

    const patch = {
      name: args.name.trim(),
      domain,
      website,
      careersUrl: args.careersUrl,
      linkedinUrl: args.linkedinUrl,
      source: args.source,
      notes: args.notes,
      lastSeenAt: now,
    };

    if (existing) {
      await ctx.db.replace("companies", existing._id, {
        ...jobScoutCompanyFields(existing),
        ...patch,
        firstSeenAt:
          existing.firstSeenAt ?? existing.createdAt ?? existing._creationTime,
        lastSeenAt: now,
      });
      return { id: existing._id, created: false, domain };
    }

    const id = await ctx.db.insert("companies", {
      ...patch,
      firstSeenAt: now,
    });
    return { id, created: true, domain };
  },
});

export const upsertMany = mutation({
  args: {
    companies: v.array(v.object(companyInput)),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    const now = Date.now();
    for (const item of args.companies) {
      const domain = normalizeDomain(item.domain);
      if (!domain) continue;
      const website = item.website?.trim() || websiteFromDomain(domain);
      const existing = await ctx.db
        .query("companies")
        .withIndex("by_domain", (q) => q.eq("domain", domain))
        .unique();
      const patch = {
        name: item.name.trim(),
        domain,
        website,
        careersUrl: item.careersUrl,
        linkedinUrl: item.linkedinUrl,
        source: item.source,
        notes: item.notes,
        lastSeenAt: now,
      };
      if (existing) {
        await ctx.db.replace("companies", existing._id, {
          ...jobScoutCompanyFields(existing),
          ...patch,
          firstSeenAt:
            existing.firstSeenAt ?? existing.createdAt ?? existing._creationTime,
          lastSeenAt: now,
        });
        updated += 1;
      } else {
        await ctx.db.insert("companies", {
          ...patch,
          firstSeenAt: now,
        });
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

/** SearchBuddy agent catalog helpers (distinct names; do not shadow Job Scout API) */

export const get = agentQuery({
  args: { companyId: v.id("companies") },
  returns: v.union(companyValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("companies", args.companyId);
    return row ? asJobScoutCompany(row) : null;
  },
});

export const listCatalog = agentQuery({
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
    const result = args.tier
      ? await ctx.db
          .query("companies")
          .withIndex("by_tier", (q) => q.eq("tier", args.tier!))
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("companies")
          .order("asc")
          .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map(asJobScoutCompany),
    };
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
    const rows = await ctx.db
      .query("companies")
      .withSearchIndex("search_name", (q) => {
        const searched = q.search("name", args.query);
        return args.tier ? searched.eq("tier", args.tier) : searched;
      })
      .take(limit);
    return rows.map(asJobScoutCompany);
  },
});

export const upsertCatalog = agentMutation({
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
    const domainFromArgs = args.domain
      ? normalizeDomain(args.domain)
      : args.website
        ? normalizeDomain(args.website)
        : "";
    if (!domainFromArgs) {
      throw new Error("domain required (pass domain or website)");
    }

    const existingByDomain = await ctx.db
      .query("companies")
      .withIndex("by_domain", (q) => q.eq("domain", domainFromArgs))
      .unique();
    if (existingByDomain) {
      await ctx.db.replace("companies", existingByDomain._id, {
        ...jobScoutCompanyFields(existingByDomain),
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
        lastSeenAt: now,
      });
      return existingByDomain._id;
    }

    const existingByName = await ctx.db
      .query("companies")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existingByName) {
      await ctx.db.replace("companies", existingByName._id, {
        ...jobScoutCompanyFields(existingByName),
        domain: domainFromArgs,
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
        lastSeenAt: now,
      });
      return existingByName._id;
    }

    return await ctx.db.insert("companies", {
      name: args.name,
      domain: domainFromArgs,
      website: args.website ?? websiteFromDomain(domainFromArgs),
      careersUrl: args.careersUrl,
      linkedinUrl: args.linkedinUrl,
      xUrl: args.xUrl,
      industry: args.industry,
      country: args.country ?? "US",
      hqLocation: args.hqLocation,
      tier: args.tier ?? "other",
      tags: args.tags ?? [],
      notes: args.notes,
      firstSeenAt: now,
      lastSeenAt: now,
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
      domain: normalizeDomain(company.domain),
      website: company.website,
      careersUrl: company.careersUrl,
      linkedinUrl: company.linkedinUrl,
      xUrl: company.xUrl,
      industry: "technology",
      country: "US",
      hqLocation: company.hqLocation,
      tier: "top100_us_tech",
      tags: company.tags,
      source: "starter",
      firstSeenAt: now,
      lastSeenAt: now,
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
      lastSeenAt: args.searchedAt,
    });
    return null;
  },
});

/**
 * One-shot / batched migration: SearchBuddy createdAt/updatedAt → Job Scout
 * firstSeenAt/lastSeenAt, and drop legacy fields via replace.
 *
 *   npx convex run companies:migrateLegacyTimestamps '{"paginationOpts":{"numItems":100,"cursor":null}}'
 *
 * Re-run with the returned continueCursor until isDone is true.
 */
export const migrateLegacyTimestamps = mutation({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    scanned: v.number(),
    migrated: v.number(),
    skipped: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("companies")
      .order("asc")
      .paginate(args.paginationOpts);

    let migrated = 0;
    let skipped = 0;

    for (const doc of page.page) {
      if (!needsLegacyMigration(doc)) {
        skipped += 1;
        continue;
      }
      await ctx.db.replace("companies", doc._id, jobScoutCompanyFields(doc));
      migrated += 1;
    }

    return {
      scanned: page.page.length,
      migrated,
      skipped,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/** Count companies still on the legacy timestamp shape (for post-migrate checks). */
export const countLegacyTimestampRows = query({
  args: {},
  returns: v.object({
    total: v.number(),
    legacy: v.number(),
  }),
  handler: async (ctx) => {
    const rows = await ctx.db.query("companies").collect();
    let legacy = 0;
    for (const row of rows) {
      if (needsLegacyMigration(row)) {
        legacy += 1;
      }
    }
    return { total: rows.length, legacy };
  },
});
