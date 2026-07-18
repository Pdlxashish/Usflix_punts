/**
 * LinkStatusContext
 * Manages partner link status throughout the application.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/tanstack-react-start";

interface PartnerInfo {
  userId: number;
  name: string;
  email: string;
  profilePictureUrl: string | null;
}

interface LinkStatus {
  isLinked: boolean;
  coupleId: string | null;
  partner: PartnerInfo | null;
  isLoading: boolean;
  error: string | null;
}

interface LinkStatusContextValue extends LinkStatus {
  refreshLinkStatus: () => Promise<void>;
  setLinkStatus: (status: Partial<LinkStatus>) => void;
}

const LinkStatusContext = createContext<LinkStatusContextValue | undefined>(undefined);

export function LinkStatusProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [status, setStatus] = useState<LinkStatus>({
    isLinked: false,
    coupleId: null,
    partner: null,
    isLoading: true,
    error: null,
  });

  const fetchLinkStatus = useCallback(async () => {
    if (!isSignedIn) {
      setStatus({
        isLinked: false,
        coupleId: null,
        partner: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/partner/link/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch link status");
      }

      const data = await response.json();

      if (data.ok && data.linked) {
        setStatus({
          isLinked: true,
          coupleId: data.coupleId,
          partner: data.partner,
          isLoading: false,
          error: null,
        });
      } else {
        setStatus({
          isLinked: false,
          coupleId: null,
          partner: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error fetching link status:", error);
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [isSignedIn, getToken]);

  // Fetch link status on mount and when sign-in status changes
  useEffect(() => {
    fetchLinkStatus();
  }, [fetchLinkStatus]);

  const setLinkStatusPartial = useCallback((partial: Partial<LinkStatus>) => {
    setStatus((prev) => ({ ...prev, ...partial }));
  }, []);

  const value: LinkStatusContextValue = {
    ...status,
    refreshLinkStatus: fetchLinkStatus,
    setLinkStatus: setLinkStatusPartial,
  };

  return <LinkStatusContext.Provider value={value}>{children}</LinkStatusContext.Provider>;
}

/**
 * Hook to access link status
 */
export function useLinkStatus() {
  const context = useContext(LinkStatusContext);
  if (context === undefined) {
    throw new Error("useLinkStatus must be used within a LinkStatusProvider");
  }
  return context;
}
