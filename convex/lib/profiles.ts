import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getProfileByHandle(
  ctx: QueryCtx | MutationCtx,
  handle: string,
): Promise<Doc<"profiles"> | null> {
  return await ctx.db
    .query("profiles")
    .withIndex("by_handle", (q) => q.eq("handle", handle))
    .unique();
}

export async function requireProfile(
  ctx: QueryCtx | MutationCtx,
  handle: string,
): Promise<Doc<"profiles">> {
  const profile = await getProfileByHandle(ctx, handle);
  if (!profile) {
    throw new Error(`Profile not found for handle: ${handle}`);
  }
  return profile;
}
