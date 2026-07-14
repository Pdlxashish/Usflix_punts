/**
 * Clerk session token bridge for the API client.
 * Registered once inside ClerkProvider so fetch calls can send Bearer auth.
 */
let tokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(getter: (() => Promise<string | null>) | null): void {
  tokenGetter = getter;
}

export async function getClerkSessionToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
