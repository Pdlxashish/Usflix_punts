/**
 * Branding context — uses backend API for persistence.
 * Falls back to defaults if API is unreachable.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@/lib/api";

export interface BrandingConfig {
  platformName: string;
  heroTagline: string;
  heroSubtitle: string;
  footerText: string;
  homePageTitle: string;
  homePageDescription: string;
  relationshipStartDate: string;
  // Color Theme
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  // Logo
  logoUrl: string;
  faviconUrl: string;
  // Fonts
  headingFont: string;
  bodyFont: string;
  // Visual Sections Toggle
  showTimeTogetherSection: boolean;
  showStoryContinuesSection: boolean;
  showFeaturedSection: boolean;
  // Background Options
  backgroundImageUrl: string;
  backgroundPattern: string;
  backgroundGradient: string;
  // Hero Animation
  heroAnimation: string;
  // Profile Picture Settings
  profilePictureUrl: string;
  profilePictureShape: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  platformName: "USFLIX",
  heroTagline: "The Sunset We Watched Forever",
  heroSubtitle: "Every story we've written together, in one place. Press play and let's remember.",
  footerText: "Our Story, Streaming Always",
  homePageTitle: "USFLIX — Our Story",
  homePageDescription: "Every memory we've made, in one cinematic place.",
  relationshipStartDate: "2021-09-15T00:00:00",
  // Color Theme
  primaryColor: "#e50914",
  accentColor: "#b20710",
  backgroundColor: "#000000",
  // Logo
  logoUrl: "",
  faviconUrl: "",
  // Fonts
  headingFont: "Bebas Neue",
  bodyFont: "Inter",
  // Visual Sections Toggle
  showTimeTogetherSection: true,
  showStoryContinuesSection: true,
  showFeaturedSection: true,
  // Background Options
  backgroundImageUrl: "",
  backgroundPattern: "none",
  backgroundGradient: "none",
  // Hero Animation
  heroAnimation: "kenburns",
  // Profile Picture Settings
  profilePictureUrl: "",
  profilePictureShape: "circle",
};

interface BrandingContextValue {
  branding: BrandingConfig;
  saveBranding: (next: BrandingConfig) => Promise<{ ok: boolean; errors?: Partial<Record<keyof BrandingConfig, string>> }>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    api.get<BrandingConfig>("/branding")
      .then((data) => setBranding(data))
      .catch(() => {
        // Fall back to defaults if API unavailable
      });
  }, [isLoaded, isSignedIn]);

  const saveBranding = async (next: BrandingConfig) => {
    // Client-side validation
    const errors: Partial<Record<keyof BrandingConfig, string>> = {};
    const limits: Record<string, number> = {
      platformName: 100, heroTagline: 200, heroSubtitle: 200,
      footerText: 500, homePageTitle: 100, homePageDescription: 200,
      relationshipStartDate: 50, primaryColor: 20, accentColor: 20,
      backgroundColor: 20, logoUrl: 500, faviconUrl: 500,
      headingFont: 100, bodyFont: 100, backgroundImageUrl: 500,
      backgroundPattern: 50, backgroundGradient: 200, heroAnimation: 50,
      profilePictureUrl: 500, profilePictureShape: 50,
    };
    const labels: Record<string, string> = {
      platformName: "Platform name", heroTagline: "Hero tagline",
      heroSubtitle: "Hero subtitle", footerText: "Footer text",
      homePageTitle: "Home page title", homePageDescription: "Home page description",
      relationshipStartDate: "Relationship start date",
      primaryColor: "Primary color", accentColor: "Accent color",
      backgroundColor: "Background color", logoUrl: "Logo URL",
      faviconUrl: "Favicon URL", headingFont: "Heading font",
      bodyFont: "Body font", backgroundImageUrl: "Background image URL",
      backgroundPattern: "Background pattern", backgroundGradient: "Background gradient",
      heroAnimation: "Hero animation", profilePictureUrl: "Profile picture URL",
      profilePictureShape: "Profile picture shape",
    };

    for (const key of Object.keys(next) as (keyof BrandingConfig)[]) {
      const val = next[key];
      // Skip validation for boolean fields
      if (typeof val === 'boolean') continue;
      
      if (!val.trim() && key !== 'logoUrl' && key !== 'faviconUrl' && key !== 'backgroundImageUrl' && key !== 'profilePictureUrl') {
        errors[key] = `${labels[key]} cannot be empty.`;
      } else if (limits[key] && val.length > limits[key]) {
        errors[key] = `${labels[key]} must be ${limits[key]} characters or fewer.`;
      }
    }

    if (Object.keys(errors).length > 0) return { ok: false, errors };

    try {
      await api.put("/branding", next);
      setBranding(next);
      return { ok: true };
    } catch {
      return { ok: false, errors: { platformName: "Save failed. Please try again." } };
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, saveBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used inside BrandingProvider");
  return ctx;
}
