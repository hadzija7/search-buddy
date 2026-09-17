import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const JOBEEFLOW_ROOT = "/Users/aleksandarhadzibabic/Documents/Company/jobeeflow";
const OUTPUT_PATH = path.resolve("data/jobeeflow-public.json");
const COMPANY_LIMIT = 100;
const MAX_DESCRIPTION = 1500;

const require = createRequire(path.join(JOBEEFLOW_ROOT, "package.json"));
const { Client } = require("pg");

function asOptionalString(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function truncate(value) {
  const text = asOptionalString(value);
  if (!text) {
    return "";
  }
  return text.slice(0, MAX_DESCRIPTION);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

const companiesResult = await client.query(
  `
    SELECT
      c.id,
      c.company_name,
      c.career_board_url,
      c.company_website_url,
      c.company_linkedin_url,
      c.domain,
      c.country,
      c.city,
      c.state,
      c.industries,
      c.description,
      COUNT(o.id)::int AS opportunity_count
    FROM tracked_companies c
    LEFT JOIN opportunities o
      ON o.tracked_company_id = c.id
     AND o.is_active = true
    WHERE c.is_active = true
      AND c.moderation_status = 'APPROVED'
      AND c.needs_career_board = false
    GROUP BY c.id
    HAVING COUNT(o.id) > 0
    ORDER BY COUNT(o.id) DESC, c.company_name ASC
    LIMIT $1
  `,
  [COMPANY_LIMIT],
);

const companyIds = companiesResult.rows.map((row) => row.id);
const opportunitiesResult =
  companyIds.length === 0
    ? { rows: [] }
    : await client.query(
        `
          SELECT
            tracked_company_id,
            role_title,
            location,
            work_type,
            description,
            url,
            posted_at
          FROM opportunities
          WHERE is_active = true
            AND tracked_company_id = ANY($1::text[])
          ORDER BY posted_at DESC NULLS LAST, indexed_at DESC
        `,
        [companyIds],
      );

await client.end();

const companies = companiesResult.rows.map((row) => {
  const hq = [row.city, row.state, row.country].filter(Boolean).join(", ");
  return {
    name: row.company_name,
    domain: asOptionalString(row.domain),
    website: asOptionalString(row.company_website_url),
    careersUrl: asOptionalString(row.career_board_url),
    linkedinUrl: asOptionalString(row.company_linkedin_url),
    country: asOptionalString(row.country),
    hqLocation: asOptionalString(hq),
    tags: Array.isArray(row.industries) ? row.industries : [],
    notes: truncate(row.description),
    opportunityCount: row.opportunity_count,
  };
});

const companyNamesById = new Map(
  companiesResult.rows.map((row) => [row.id, row.company_name]),
);

const opportunities = opportunitiesResult.rows.map((row) => ({
  companyName: companyNamesById.get(row.tracked_company_id) ?? "Unknown",
  title: row.role_title,
  description: truncate(row.description),
  sourceUrl: row.url,
  location: asOptionalString(row.location),
  remote: row.work_type === "REMOTE" ? true : undefined,
  postedAt: row.posted_at ? new Date(row.posted_at).getTime() : undefined,
}));

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(
  OUTPUT_PATH,
  JSON.stringify({ companies, opportunities }, null, 2),
);

console.log(
  JSON.stringify(
    {
      companies: companies.length,
      opportunities: opportunities.length,
      sampleCompanies: companies.slice(0, 8).map((company) => ({
        name: company.name,
        opportunityCount: company.opportunityCount,
      })),
    },
    null,
    2,
  ),
);
