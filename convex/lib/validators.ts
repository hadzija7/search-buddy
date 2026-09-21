import { v } from "convex/values";

export const companyTierValidator = v.union(
  v.literal("top100_us_tech"),
  v.literal("notable"),
  v.literal("other"),
);

export const opportunitySourceValidator = v.union(
  v.literal("website"),
  v.literal("x"),
  v.literal("linkedin"),
  v.literal("exa"),
  v.literal("other"),
);

export const opportunityStatusValidator = v.union(
  v.literal("open"),
  v.literal("closed"),
  v.literal("unknown"),
);

/** SearchBuddy application-status chips; omit/null → UI "none". */
export const opportunityApplicationStatusValidator = v.union(
  v.literal("none"),
  v.literal("saved"),
  v.literal("applied"),
  v.literal("waiting"),
  v.literal("interview"),
  v.literal("rejected"),
  v.literal("offer"),
  v.literal("withdrawn"),
);

export const searchRunStatusValidator = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

export const outreachStatusValidator = v.union(
  v.literal("draft"),
  v.literal("queued"),
  v.literal("sent"),
  v.literal("failed"),
);

export const profileValidator = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
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
});

export const companyValidator = v.object({
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

export const opportunityValidator = v.object({
  _id: v.id("opportunities"),
  _creationTime: v.number(),
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
  status: opportunityStatusValidator,
  applicationStatus: v.optional(opportunityApplicationStatusValidator),
  rank: v.optional(v.number()),
  discoveredAt: v.number(),
  postedAt: v.optional(v.number()),
  updatedAt: v.number(),
  searchRunId: v.optional(v.id("searchRuns")),
});

/** Flat SearchBuddy `job-scout.opportunities` item (never nest under `fields`). */
export const searchBuddyOpportunityItemValidator = v.object({
  id: v.string(),
  title: v.string(),
  company: v.string(),
  location: v.union(v.string(), v.null()),
  status: opportunityStatusValidator,
  applicationStatus: v.union(opportunityApplicationStatusValidator, v.null()),
  source: opportunitySourceValidator,
  rank: v.union(v.number(), v.null()),
  why: v.union(v.string(), v.null()),
  url: v.string(),
});

export const searchBuddyOpportunitiesViewValidator = v.object({
  viewId: v.literal("job-scout.opportunities"),
  title: v.string(),
  layout: v.literal("table"),
  theme: v.object({
    accent: v.literal("#0F766E"),
    density: v.literal("comfortable"),
  }),
  /** Must stay a string array — never `[{key,label}]`. */
  fields: v.array(v.string()),
  items: v.array(searchBuddyOpportunityItemValidator),
});

export const searchRunValidator = v.object({
  _id: v.id("searchRuns"),
  _creationTime: v.number(),
  profileId: v.id("profiles"),
  query: v.string(),
  roleFilters: v.array(v.string()),
  companyScope: v.optional(v.string()),
  status: searchRunStatusValidator,
  resultCount: v.number(),
  providerNotes: v.array(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

export const outreachValidator = v.object({
  _id: v.id("outreach"),
  _creationTime: v.number(),
  profileId: v.id("profiles"),
  opportunityId: v.id("opportunities"),
  companyId: v.id("companies"),
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  status: outreachStatusValidator,
  agentMailOutboundId: v.optional(v.string()),
  agentMailInboxId: v.optional(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});
