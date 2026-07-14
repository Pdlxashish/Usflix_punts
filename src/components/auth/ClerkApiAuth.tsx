import { useLayoutEffect } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { setClerkTokenGetter } from "@/lib/clerk-token";

/**
 * Registers Clerk getToken with the API client before child effects run.
 * Must render inside ClerkProvider.
 */
export function ClerkApiAuth() {
  const { getToken, isLoaded } = useAuth();

  useLayoutEffect(() => {
    if (!isLoaded) {
      setClerkTokenGetter(null);
      return;
    }
    setClerkTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => setClerkTokenGetter(null);
  }, [getToken, isLoaded]);

  return null;
}
