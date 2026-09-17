import { AgentMail } from "@agentmail/convex";
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";

const agentmail = new AgentMail(components.agentmail);
const http = httpRouter();

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await agentmail.handleWebhook(
      ctx as unknown as Parameters<AgentMail["handleWebhook"]>[0],
      req,
    );
  }),
});

export default http;
