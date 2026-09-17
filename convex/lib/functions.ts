import {
  customAction,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { getEnv } from "./env";

function assertAgentKey(agentKey: string | undefined): void {
  const expected = getEnv("AGENT_API_KEY");
  if (!expected) {
    return;
  }
  if (agentKey !== expected) {
    throw new Error("Unauthorized: invalid agent key");
  }
}

export const agentQuery = customQuery(query, {
  args: { agentKey: v.optional(v.string()) },
  input: async (ctx, { agentKey }) => {
    assertAgentKey(agentKey);
    return { ctx, args: {} };
  },
});

export const agentMutation = customMutation(mutation, {
  args: { agentKey: v.optional(v.string()) },
  input: async (ctx, { agentKey }) => {
    assertAgentKey(agentKey);
    return { ctx, args: {} };
  },
});

export const agentAction = customAction(action, {
  args: { agentKey: v.optional(v.string()) },
  input: async (ctx, { agentKey }) => {
    assertAgentKey(agentKey);
    return { ctx, args: {} };
  },
});
