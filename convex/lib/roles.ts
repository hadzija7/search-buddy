export function inferRoleFamily(text: string): string {
  const haystack = text.toLowerCase();
  if (
    /\bdev\s*rel\b|\bdeveloper relations\b|\bdeveloper advocate\b|\bdeveloper advocacy\b|\bdevrel\b/.test(
      haystack,
    )
  ) {
    return "devrel";
  }
  if (
    /\bcommunity manager\b|\bcommunity management\b|\bcommunity lead\b|\bcommunity advocate\b/.test(
      haystack,
    )
  ) {
    return "community";
  }
  if (/\bdeveloper marketing\b|\bdev marketing\b/.test(haystack)) {
    return "developer_marketing";
  }
  if (/\bdeveloper education\b|\bdeveloper experience\b|\bdx \b/.test(haystack)) {
    return "developer_education";
  }
  return "other";
}

const ROLE_ALIASES: Record<string, string[]> = {
  devrel: [
    "devrel",
    "dev rel",
    "developer relations",
    "developer advocate",
    "developer advocacy",
    "developer educator",
    "developer education",
  ],
  "dev rel": [
    "devrel",
    "developer relations",
    "developer advocate",
    "developer advocacy",
  ],
  "developer relations": [
    "developer relations",
    "developer advocate",
    "devrel",
  ],
  community: [
    "community manager",
    "community management",
    "community lead",
    "community advocate",
  ],
  "community management": [
    "community manager",
    "community management",
    "community lead",
    "community advocate",
  ],
  "community manager": [
    "community manager",
    "community management",
    "community lead",
  ],
};

export function aliasesForRole(role: string): string[] {
  const normalized = role.toLowerCase().trim();
  return ROLE_ALIASES[normalized] ?? [normalized];
}

export function matchesRoles(text: string, roles: string[]): boolean {
  if (roles.length === 0) {
    return true;
  }
  const haystack = text.toLowerCase();
  const family = inferRoleFamily(haystack);
  return roles.some((role) => {
    const aliases = aliasesForRole(role);
    if (aliases.some((alias) => haystack.includes(alias))) {
      return true;
    }
    if (family !== "other" && aliases.includes(family)) {
      return true;
    }
    if (family === "community" && aliases.some((alias) => alias.includes("community"))) {
      return true;
    }
    if (family === "devrel" && aliases.some((alias) => alias.includes("devrel") || alias.includes("developer"))) {
      return true;
    }
    return false;
  });
}

export function sourceFromUrl(
  url: string,
): "website" | "x" | "linkedin" | "exa" | "other" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("linkedin.com")) {
      return "linkedin";
    }
    if (host.includes("x.com") || host.includes("twitter.com")) {
      return "x";
    }
    return "website";
  } catch {
    return "other";
  }
}

export function wantsTopUsTech(text: string | undefined): boolean {
  if (!text) {
    return false;
  }
  return /top\s*100|us tech|united states tech|american tech/.test(
    text.toLowerCase(),
  );
}
