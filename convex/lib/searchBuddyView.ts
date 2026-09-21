import type { Doc } from "../_generated/dataModel";
import type { Infer } from "convex/values";
import {
  opportunityApplicationStatusValidator,
  opportunitySourceValidator,
  opportunityStatusValidator,
  searchBuddyOpportunityItemValidator,
  searchBuddyOpportunitiesViewValidator,
} from "./validators";

export type SearchBuddyOpportunityItem = Infer<
  typeof searchBuddyOpportunityItemValidator
>;
export type SearchBuddyOpportunitiesView = Infer<
  typeof searchBuddyOpportunitiesViewValidator
>;

export const SEARCHBUDDY_OPPORTUNITIES_VIEW_ID =
  "job-scout.opportunities" as const;

export const SEARCHBUDDY_OPPORTUNITIES_FIELDS = [
  "title",
  "company",
  "location",
  "status",
  "applicationStatus",
  "source",
  "rank",
  "why",
  "url",
] as const;

export const SEARCHBUDDY_THEME = {
  accent: "#0F766E",
  density: "comfortable",
} as const;

type OpportunityLike = Pick<
  Doc<"opportunities">,
  | "title"
  | "source"
  | "sourceUrl"
  | "sourceSnippet"
  | "status"
  | "location"
  | "why"
  | "rank"
  | "applicationStatus"
  | "companyName"
>;

/**
 * Map a stored opportunity (+ resolved company name) to a flat SearchBuddy item.
 * `id` and `url` are the apply URL (`sourceUrl`).
 * `applicationStatus` null → Swift UI shows "none".
 * `why` prefers explicit why, then sourceSnippet.
 */
export function opportunityToSearchBuddyItem(
  opportunity: OpportunityLike,
  companyName: string,
  rankFallback?: number,
): SearchBuddyOpportunityItem {
  const applicationStatus =
    opportunity.applicationStatus === undefined ||
    opportunity.applicationStatus === "none"
      ? null
      : opportunity.applicationStatus;

  const why = opportunity.why ?? opportunity.sourceSnippet ?? null;
  const rank =
    opportunity.rank !== undefined
      ? opportunity.rank
      : (rankFallback ?? null);

  return {
    id: opportunity.sourceUrl,
    title: opportunity.title,
    company: companyName,
    location: opportunity.location ?? null,
    status: opportunity.status,
    applicationStatus,
    source: opportunity.source,
    rank,
    why,
    url: opportunity.sourceUrl,
  };
}

export function buildSearchBuddyOpportunitiesView(args: {
  title?: string;
  items: SearchBuddyOpportunityItem[];
}): SearchBuddyOpportunitiesView {
  return {
    viewId: SEARCHBUDDY_OPPORTUNITIES_VIEW_ID,
    title: args.title ?? "Opportunities",
    layout: "table",
    theme: { ...SEARCHBUDDY_THEME },
    fields: [...SEARCHBUDDY_OPPORTUNITIES_FIELDS],
    items: args.items,
  };
}

/** Narrow helpers re-exported for callers that validate scout fields. */
export {
  opportunityApplicationStatusValidator,
  opportunitySourceValidator,
  opportunityStatusValidator,
};
