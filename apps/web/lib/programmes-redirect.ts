export type ProgrammesRedirectSearchParams = Record<
  string,
  string | string[] | undefined
>;

/**
 * Builds the canonical `/academy#programmes` redirect target for legacy
 * `/programmes` URLs while preserving all query and campaign parameters.
 */
export function buildProgrammesRedirectTarget(
  searchParams: ProgrammesRedirectSearchParams = {},
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    } else if (typeof value === "string") {
      params.append(key, value);
    }
  }

  const query = params.toString();
  return query ? `/academy?${query}#programmes` : "/academy#programmes";
}
