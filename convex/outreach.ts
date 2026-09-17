import { AgentMail } from "@agentmail/convex";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { getEnv } from "./lib/env";
import { agentMutation, agentQuery } from "./lib/functions";
import { requireProfile } from "./lib/profiles";
import { outreachValidator } from "./lib/validators";

const agentmail = new AgentMail(components.agentmail);

export const list = agentQuery({
  args: {
    handle: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(outreachValidator),
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.handle);
    const limit = Math.min(args.limit ?? 20, 50);
    return await ctx.db
      .query("outreach")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(limit);
  },
});

export const draftCoverLetter = agentMutation({
  args: {
    handle: v.string(),
    opportunityId: v.id("opportunities"),
    recipient: v.string(),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  returns: v.id("outreach"),
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.handle);
    const opportunity = await ctx.db.get("opportunities", args.opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }
    const company = await ctx.db.get("companies", opportunity.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const now = Date.now();
    const subject =
      args.subject ??
      `${opportunity.title} at ${company.name} — introduction`;
    const body =
      args.body ??
      [
        `Hi ${company.name} team,`,
        "",
        `I'm reaching out about the ${opportunity.title} role.`,
        profile.headline ? `About me: ${profile.headline}` : undefined,
        profile.targetRoles.length > 0
          ? `I'm focused on ${profile.targetRoles.join(", ")}.`
          : undefined,
        profile.notes,
        "",
        "I can share a fuller note or jump on a quick call if useful.",
        "",
        `Thanks,\n${profile.displayName ?? profile.handle}`,
      ]
        .filter((line): line is string => line !== undefined)
        .join("\n");

    return await ctx.db.insert("outreach", {
      profileId: profile._id,
      opportunityId: opportunity._id,
      companyId: company._id,
      recipient: args.recipient,
      subject,
      body,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const sendCoverLetter = agentMutation({
  args: {
    handle: v.string(),
    outreachId: v.id("outreach"),
    inboxId: v.optional(v.string()),
  },
  returns: v.object({
    outreachId: v.id("outreach"),
    status: v.string(),
    agentMailOutboundId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.handle);
    const outreach = await ctx.db.get("outreach", args.outreachId);
    if (!outreach) {
      throw new Error("Outreach draft not found");
    }
    if (outreach.profileId !== profile._id) {
      throw new Error("Unauthorized: this draft belongs to another profile");
    }

    const inboxId =
      args.inboxId ?? profile.agentMailInboxId ?? getEnv("AGENTMAIL_INBOX_ID");
    if (!inboxId) {
      throw new Error(
        "No AgentMail inbox configured. Set AGENTMAIL_INBOX_ID or pass inboxId.",
      );
    }

    try {
      const outboundId = await agentmail.sendMessage(ctx, inboxId, {
        to: outreach.recipient,
        subject: outreach.subject,
        text: outreach.body,
        labels: ["search-buddy", "cover-letter"],
      });
      const now = Date.now();
      await ctx.db.patch("outreach", outreach._id, {
        status: "queued",
        agentMailInboxId: inboxId,
        agentMailOutboundId: outboundId,
        updatedAt: now,
      });
      return {
        outreachId: outreach._id,
        status: "queued",
        agentMailOutboundId: outboundId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AgentMail send failed";
      await ctx.db.patch("outreach", outreach._id, {
        status: "failed",
        error: message,
        updatedAt: Date.now(),
      });
      throw new Error(message);
    }
  },
});
