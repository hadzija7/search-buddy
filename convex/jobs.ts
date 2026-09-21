import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const statusV = v.union(
  v.literal("confirmed"),
  v.literal("signal"),
  v.literal("stale"),
  v.literal("closed"),
  v.literal("adjacent"),
);

const applicationStatusV = v.union(
  v.literal("none"),
  v.literal("applied"),
  v.literal("waiting"),
  v.literal("interview"),
  v.literal("rejected"),
  v.literal("offer"),
  v.literal("withdrawn"),
);

const jobDoc = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  title: v.string(),
  company: v.string(),
  location: v.optional(v.string()),
  url: v.string(),
  why: v.optional(v.string()),
  source: v.string(),
  status: statusV,
  applicationStatus: v.optional(applicationStatusV),
  appliedAt: v.optional(v.number()),
  outreachNote: v.optional(v.string()),
  query: v.optional(v.string()),
  rank: v.optional(v.number()),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
});

/** Job Scout–compatible public API: list / getByUrl / upsert / upsertMany / markApplied / listApplied */

export const list = query({
  args: {
    status: v.optional(statusV),
    query: v.optional(v.string()),
  },
  returns: v.array(jobDoc),
  handler: async (ctx, args) => {
    if (args.status) {
      const jobs = await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      if (args.query) {
        return jobs.filter((job) => job.query === args.query);
      }
      return jobs;
    }
    if (args.query) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_query", (q) => q.eq("query", args.query!))
        .collect();
    }
    return await ctx.db.query("jobs").collect();
  },
});

export const getByUrl = query({
  args: { url: v.string() },
  returns: v.union(jobDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    location: v.optional(v.string()),
    url: v.string(),
    why: v.optional(v.string()),
    source: v.string(),
    status: statusV,
    query: v.optional(v.string()),
    rank: v.optional(v.number()),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    if (existing) {
      await ctx.db.patch("jobs", existing._id, {
        title: args.title,
        company: args.company,
        location: args.location ?? existing.location,
        why: args.why ?? existing.why,
        source: args.source,
        status: args.status,
        query: args.query ?? existing.query,
        rank: args.rank ?? existing.rank,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobs", {
      title: args.title,
      company: args.company,
      location: args.location,
      url: args.url,
      why: args.why,
      source: args.source,
      status: args.status,
      query: args.query,
      rank: args.rank,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  },
});

export const upsertMany = mutation({
  args: {
    jobs: v.array(
      v.object({
        title: v.string(),
        company: v.string(),
        location: v.optional(v.string()),
        url: v.string(),
        why: v.optional(v.string()),
        source: v.string(),
        status: statusV,
        query: v.optional(v.string()),
        rank: v.optional(v.number()),
      }),
    ),
  },
  returns: v.array(v.id("jobs")),
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const job of args.jobs) {
      const existing = await ctx.db
        .query("jobs")
        .withIndex("by_url", (q) => q.eq("url", job.url))
        .unique();
      if (existing) {
        await ctx.db.patch("jobs", existing._id, {
          title: job.title,
          company: job.company,
          location: job.location ?? existing.location,
          why: job.why ?? existing.why,
          source: job.source,
          status: job.status,
          query: job.query ?? existing.query,
          rank: job.rank ?? existing.rank,
          lastSeenAt: now,
        });
        ids.push(existing._id);
      } else {
        ids.push(
          await ctx.db.insert("jobs", {
            ...job,
            firstSeenAt: now,
            lastSeenAt: now,
          }),
        );
      }
    }
    return ids;
  },
});

export const markApplied = mutation({
  args: {
    url: v.string(),
    applicationStatus: v.optional(applicationStatusV),
    outreachNote: v.optional(v.string()),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const status = args.applicationStatus ?? "waiting";
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    if (existing) {
      await ctx.db.patch("jobs", existing._id, {
        applicationStatus: status,
        appliedAt: existing.appliedAt ?? now,
        outreachNote: args.outreachNote ?? existing.outreachNote,
        lastSeenAt: now,
      });
      return existing._id;
    }

    if (!args.title || !args.company) {
      throw new Error("Job not found; pass title and company to create");
    }

    return await ctx.db.insert("jobs", {
      title: args.title,
      company: args.company,
      location: args.location,
      url: args.url,
      source: args.source ?? "outreach",
      status: "confirmed",
      applicationStatus: status,
      appliedAt: now,
      outreachNote: args.outreachNote,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  },
});

export const listApplied = query({
  args: {},
  returns: v.array(jobDoc),
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("jobs")
      .withIndex("by_applicationStatus", (q) =>
        q.eq("applicationStatus", "waiting"),
      )
      .collect();
    const applied = await ctx.db
      .query("jobs")
      .withIndex("by_applicationStatus", (q) =>
        q.eq("applicationStatus", "applied"),
      )
      .collect();
    return [...waiting, ...applied].sort(
      (a, b) => (b.appliedAt ?? 0) - (a.appliedAt ?? 0),
    );
  },
});
