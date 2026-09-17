import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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

  companies: defineTable({
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    careersUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    xUrl: v.optional(v.string()),
    industry: v.optional(v.string()),
    country: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
    tier: v.union(
      v.literal("top100_us_tech"),
      v.literal("notable"),
      v.literal("other"),
    ),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    lastSearchedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_domain", ["domain"])
    .index("by_tier", ["tier"])
    .index("by_name", ["name"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["tier", "country"],
    }),

  opportunities: defineTable({
    companyId: v.id("companies"),
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
    location: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("unknown"),
    ),
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
