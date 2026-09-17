import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { agentMutation, agentQuery } from "./lib/functions";
import { getProfileByHandle } from "./lib/profiles";
import { profileValidator } from "./lib/validators";

export const get = agentQuery({
  args: { handle: v.string() },
  returns: v.union(profileValidator, v.null()),
  handler: async (ctx, args) => {
    return await getProfileByHandle(ctx, args.handle);
  },
});

export const upsert = agentMutation({
  args: {
    handle: v.string(),
    displayName: v.optional(v.string()),
    headline: v.optional(v.string()),
    targetRoles: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
    companyFocus: v.optional(v.string()),
    seniority: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    outreachTone: v.optional(v.string()),
    agentMailInboxId: v.optional(v.string()),
  },
  returns: v.id("profiles"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await getProfileByHandle(ctx, args.handle);
    if (existing) {
      await ctx.db.patch("profiles", existing._id, {
        displayName: args.displayName ?? existing.displayName,
        headline: args.headline ?? existing.headline,
        targetRoles: args.targetRoles ?? existing.targetRoles,
        locations: args.locations ?? existing.locations,
        companyFocus: args.companyFocus ?? existing.companyFocus,
        seniority: args.seniority ?? existing.seniority,
        skills: args.skills ?? existing.skills,
        notes: args.notes ?? existing.notes,
        outreachTone: args.outreachTone ?? existing.outreachTone,
        agentMailInboxId: args.agentMailInboxId ?? existing.agentMailInboxId,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      handle: args.handle,
      displayName: args.displayName,
      headline: args.headline,
      targetRoles: args.targetRoles ?? [],
      locations: args.locations ?? [],
      companyFocus: args.companyFocus,
      seniority: args.seniority,
      skills: args.skills ?? [],
      notes: args.notes,
      outreachTone: args.outreachTone,
      agentMailInboxId: args.agentMailInboxId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const ensureFromSearch = internalMutation({
  args: {
    handle: v.string(),
    targetRoles: v.array(v.string()),
    locations: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  returns: v.id("profiles"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await getProfileByHandle(ctx, args.handle);
    if (existing) {
      const nextRoles =
        existing.targetRoles.length === 0 && args.targetRoles.length > 0
          ? args.targetRoles
          : existing.targetRoles;
      const nextLocations =
        existing.locations.length === 0 &&
        args.locations &&
        args.locations.length > 0
          ? args.locations
          : existing.locations;
      const nextNotes = existing.notes ?? args.notes;
      if (
        nextRoles !== existing.targetRoles ||
        nextLocations !== existing.locations ||
        nextNotes !== existing.notes
      ) {
        await ctx.db.patch("profiles", existing._id, {
          targetRoles: nextRoles,
          locations: nextLocations,
          notes: nextNotes,
          updatedAt: now,
        });
      }
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      handle: args.handle,
      targetRoles: args.targetRoles,
      locations: args.locations ?? [],
      skills: [],
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});
