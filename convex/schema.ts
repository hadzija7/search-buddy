import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Core `jobs` + `companies` match Job Scout’s Convex DB so SearchBuddy can
 * point CONVEX_URL at the same deployment. Extra tables below are SearchBuddy
 * agent extensions and stay additive.
 */
export default defineSchema({
  // --- Job Scout (canonical) ---
  jobs: defineTable({
    title: v.string(),
    company: v.string(),
    location: v.optional(v.string()),
    url: v.string(),
    why: v.optional(v.string()),
    source: v.string(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("signal"),
      v.literal("stale"),
      v.literal("closed"),
      v.literal("adjacent"),
    ),
    applicationStatus: v.optional(
      v.union(
        v.literal("none"),
        v.literal("applied"),
        v.literal("waiting"),
        v.literal("interview"),
        v.literal("rejected"),
        v.literal("offer"),
        v.literal("withdrawn"),
      ),
    ),
    appliedAt: v.optional(v.number()),
    outreachNote: v.optional(v.string()),
    query: v.optional(v.string()),
    rank: v.optional(v.number()),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_url", ["url"])
    .index("by_company", ["company"])
    .index("by_status", ["status"])
    .index("by_query", ["query"])
    .index("by_applicationStatus", ["applicationStatus"]),

  companies: defineTable({
    name: v.string(),
    /** Host only, no scheme/www — dedupe key + Clearbit logo host */
    domain: v.string(),
    website: v.optional(v.string()),
    careersUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    /**
     * Job Scout timestamps. Optional only while legacy SearchBuddy rows
     * (`createdAt`/`updatedAt`) are migrated — see companies:migrateLegacyTimestamps.
     */
    firstSeenAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    /** @deprecated Legacy SearchBuddy fields — removed by migrateLegacyTimestamps */
    createdAt: v.optional(v.number()),
    /** @deprecated Legacy SearchBuddy fields — removed by migrateLegacyTimestamps */
    updatedAt: v.optional(v.number()),
    // Optional SearchBuddy catalog extensions (absent on plain Job Scout rows)
    xUrl: v.optional(v.string()),
    industry: v.optional(v.string()),
    country: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
    tier: v.optional(
      v.union(
        v.literal("top100_us_tech"),
        v.literal("notable"),
        v.literal("other"),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    lastSearchedAt: v.optional(v.number()),
  })
    .index("by_domain", ["domain"])
    .index("by_name", ["name"])
    .index("by_tier", ["tier"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["tier", "country"],
    }),

  // --- SearchBuddy agent extensions ---
  profiles: defineTable({
    handle: v.string(),
    displayName: v.optional(v.string()),
    headline: v.optional(v.string()),
    targetRoles: v.array(v.string()),
    locations: v.array(v.string()),
    companyFocus: v.optional(v.string()),
    seniority: v.optional(v.string()),
    skills: v.array(v.string()),
    notes: v.optional(v.string()),
    outreachTone: v.optional(v.string()),
    agentMailInboxId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_handle", ["handle"]),

  /**
   * Scouting openings store. SearchBuddy’s `job-scout.opportunities` view is
   * driven from this table (not `jobs`). `jobs` remains Job Scout–compatible.
   */
  opportunities: defineTable({
    companyId: v.id("companies"),
    /** Denormalized for SearchBuddy export; refreshed on upsert when omitted. */
    companyName: v.optional(v.string()),
    title: v.string(),
    roleFamily: v.optional(v.string()),
    description: v.string(),
    source: v.union(
      v.literal("website"),
      v.literal("x"),
      v.literal("linkedin"),
      v.literal("exa"),
      v.literal("other"),
    ),
    sourceUrl: v.string(),
    sourceSnippet: v.optional(v.string()),
    /** Scout rationale for SearchBuddy `why` popover; falls back to sourceSnippet. */
    why: v.optional(v.string()),
    location: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("unknown"),
    ),
    /** null / omitted → SearchBuddy UI shows "none". */
    applicationStatus: v.optional(
      v.union(
        v.literal("none"),
        v.literal("saved"),
        v.literal("applied"),
        v.literal("waiting"),
        v.literal("interview"),
        v.literal("rejected"),
        v.literal("offer"),
        v.literal("withdrawn"),
      ),
    ),
    rank: v.optional(v.number()),
    discoveredAt: v.number(),
    postedAt: v.optional(v.number()),
    updatedAt: v.number(),
    searchRunId: v.optional(v.id("searchRuns")),
  })
    .index("by_company", ["companyId"])
    .index("by_company_and_status", ["companyId", "status"])
    .index("by_source_url", ["sourceUrl"])
    .index("by_status", ["status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "roleFamily"],
    }),

  searchRuns: defineTable({
    profileId: v.id("profiles"),
    query: v.string(),
    roleFilters: v.array(v.string()),
    companyScope: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    resultCount: v.number(),
    providerNotes: v.array(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_and_created", ["profileId", "createdAt"]),

  outreach: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    companyId: v.id("companies"),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    agentMailOutboundId: v.optional(v.string()),
    agentMailInboxId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_profile_and_status", ["profileId", "status"]),
});
