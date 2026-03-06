/**
 * Admin fetch helper for client components.
 *
 * Reads the admin token from localStorage and attaches it as a Bearer token.
 * Used by the editor and admin pages that need write access to /api/blocks.
 */

export function getAdminHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("admin_token") ?? ""
      : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch wrapper that automatically includes admin auth headers.
 */
export async function adminFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = {
    ...getAdminHeaders(),
    ...(init?.headers ?? {}),
  };
  return fetch(url, { ...init, headers });
}
