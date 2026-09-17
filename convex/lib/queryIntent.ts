export type SearchIntent = {
  roles: string[];
  locations: string[];
  locationLabel?: string;
};

const ROLE_PHRASES = [
  "community manager",
  "community management",
  "community lead",
  "community advocate",
  "developer advocate",
  "developer relations",
  "developer advocacy",
  "devrel",
  "dev rel",
];

const LOCATION_ALIASES: Array<{
  match: RegExp;
  label?: string;
  needles: string[];
}> = [
  {
    match: /\b(sf|s\.f\.|san francisco|south san francisco|bay area)\b/i,
    label: "San Francisco,California,United States",
    needles: ["san francisco", "south san francisco", "sf", "bay area"],
  },
  {
    match: /\b(nyc|new york city|new york)\b/i,
    label: "New York,New York,United States",
    needles: ["new york", "nyc"],
  },
  {
    match: /\bremote\b/i,
    needles: ["remote"],
  },
];

export function parseSearchIntent(
  query: string,
  explicitRoles: string[],
): SearchIntent {
  const haystack = query.toLowerCase();
  const roles = new Set<string>(
    explicitRoles.map((role) => role.trim()).filter(Boolean),
  );
  for (const phrase of ROLE_PHRASES) {
    if (haystack.includes(phrase)) {
      roles.add(phrase);
    }
  }

  const locations: string[] = [];
  let locationLabel: string | undefined;
  for (const alias of LOCATION_ALIASES) {
    if (alias.match.test(haystack)) {
      locations.push(...alias.needles);
      if (alias.label) {
        locationLabel = alias.label;
      }
    }
  }

  return {
    roles: [...roles],
    locations: [...new Set(locations)],
    locationLabel,
  };
}

export function matchesLocations(text: string, locations: string[]): boolean {
  if (locations.length === 0) {
    return true;
  }
  const haystack = text.toLowerCase();
  return locations.some((location) => haystack.includes(location.toLowerCase()));
}

export function mentionsCompany(text: string, companyName: string): boolean {
  const haystack = text.toLowerCase();
  const name = companyName.toLowerCase();
  if (name.length < 3) {
    return false;
  }
  return haystack.includes(name);
}

export function roleSearchText(roles: string[], query: string): string {
  return roles[0] ?? query;
}
