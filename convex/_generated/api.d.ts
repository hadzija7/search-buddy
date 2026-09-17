/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as companies from "../companies.js";
import type * as http from "../http.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_exa from "../lib/exa.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_profiles from "../lib/profiles.js";
import type * as lib_queryIntent from "../lib/queryIntent.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_starterCompanies from "../lib/starterCompanies.js";
import type * as lib_validators from "../lib/validators.js";
import type * as opportunities from "../opportunities.js";
import type * as outreach from "../outreach.js";
import type * as profiles from "../profiles.js";
import type * as search from "../search.js";
import type * as searchActions from "../searchActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  companies: typeof companies;
  http: typeof http;
  "lib/env": typeof lib_env;
  "lib/exa": typeof lib_exa;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/functions": typeof lib_functions;
  "lib/profiles": typeof lib_profiles;
  "lib/queryIntent": typeof lib_queryIntent;
  "lib/roles": typeof lib_roles;
  "lib/starterCompanies": typeof lib_starterCompanies;
  "lib/validators": typeof lib_validators;
  opportunities: typeof opportunities;
  outreach: typeof outreach;
  profiles: typeof profiles;
  search: typeof search;
  searchActions: typeof searchActions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agentmail: import("@agentmail/convex/_generated/component.js").ComponentApi<"agentmail">;
};
