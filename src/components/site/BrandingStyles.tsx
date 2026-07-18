/**
 * BrandingStyles — Dynamically applies branding CSS variables and fonts
 * Supports both image and video backgrounds
 */
import { useEffect, useState } from "react";
import { useBranding } from "@/context/branding";
import { useTheme } from "@/components/ui/ThemeToggle";
import { getMediaUrl } from "@/lib/api";

export function BrandingStyles() {
  const { branding } = useBranding();
  const { actualTheme } = useTheme();
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    // Apply color theme
    if (branding.primaryColor) {
      const primary = branding.primaryColor.trim();
      root.style.setProperty("--primary", primary);
      root.style.setProperty("--color-primary", primary);
    }
    if (branding.accentColor) {
      const accent = branding.accentColor.trim();
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--color-accent", accent);
    }
    if (branding.backgroundColor && actualTheme === "dark") {
      const bg = branding.backgroundColor.trim();
      root.style.setProperty("--background", bg);
      root.style.setProperty("--color-background", bg);
    } else {
      root.style.removeProperty("--background");
      root.style.removeProperty("--color-background");
    }

    // Apply fonts
    if (branding.headingFont) {
      root.style.setProperty("--font-display", `"${branding.headingFont}", Georgia, serif`);
      document.body.style.setProperty("--font-display", `"${branding.headingFont}", Georgia, serif`);
    }
    if (branding.bodyFont) {
      root.style.setProperty("--font-sans", `"${branding.bodyFont}", system-ui, sans-serif`);
      document.body.style.setProperty("--font-sans", `"${branding.bodyFont}", system-ui, sans-serif`);
      document.body.style.fontFamily = `"${branding.bodyFont}", system-ui, sans-serif`;
    }

    // Apply background styling (works in both light and dark mode)
    const body = document.body;
    
    // Check if background is a video
    const bgUrl = branding.backgroundImageUrl;
    const isVideoFile = bgUrl && /\.(mp4|mov|webm|ogg)$/i.test(bgUrl);
    setIsVideo(Boolean(isVideoFile));
    
    // Reset background
    body.style.backgroundImage = "";
    body.style.backgroundSize = "";
    body.style.backgroundPosition = "";
    body.style.backgroundAttachment = "";
    body.style.backgroundRepeat = "";
    
    // If it's a video, we'll render it as a video element, not background-image
    if (isVideoFile) {
      // Don't apply video as background-image
      // Video will be rendered as JSX element below
      return;
    }
    
    const layers: string[] = [];

    // Apply gradient overlay
    if (branding.backgroundGradient && branding.backgroundGradient !== "none") {
      layers.push(branding.backgroundGradient);
    }

    // Apply pattern overlay
    if (branding.backgroundPattern && branding.backgroundPattern !== "none") {
      const isDark = actualTheme === "dark";
      const patternOpacity = isDark ? 0.05 : 0.1;
      const patternColor = isDark ? "255,255,255" : "0,0,0";
      
      const patterns: Record<string, string> = {
        dots: `radial-gradient(circle, rgba(${patternColor},${patternOpacity}) 1px, transparent 1px)`,
        grid: `linear-gradient(rgba(${patternColor},${patternOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(${patternColor},${patternOpacity}) 1px, transparent 1px)`,
        "diagonal-lines": `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(${patternColor},${patternOpacity}) 10px, rgba(${patternColor},${patternOpacity}) 20px)`,
        circles: `radial-gradient(circle at 20% 50%, rgba(${patternColor},${patternOpacity}) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(${patternColor},${patternOpacity}) 0%, transparent 50%)`,
        waves: `repeating-radial-gradient(circle at 0 0, transparent 0, rgba(${patternColor},${patternOpacity}) 10px, transparent 20px)`,
      };

      const patternStyle = patterns[branding.backgroundPattern];
      if (patternStyle) {
        if (branding.backgroundPattern === "grid") {
          layers.push(`linear-gradient(rgba(${patternColor},${patternOpacity}) 1px, transparent 1px)`);
          layers.push(`linear-gradient(90deg, rgba(${patternColor},${patternOpacity}) 1px, transparent 1px)`);
        } else {
          layers.push(patternStyle);
        }
      }
    }

    // Apply background image (only if not a video)
    if (bgUrl && !isVideoFile) {
      const imageUrl = bgUrl.startsWith("http") ? bgUrl : getMediaUrl(bgUrl);
      layers.push(`url(${imageUrl})`);
    }

    // Apply all layers
    if (layers.length > 0) {
      body.style.backgroundImage = layers.join(", ");
      body.style.backgroundSize = branding.backgroundPattern === "grid"
        ? "20px 20px, 20px 20px, cover"
        : branding.backgroundPattern === "dots"
          ? "20px 20px, cover"
          : "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundRepeat = branding.backgroundPattern ? "repeat, no-repeat" : "no-repeat";
    }

    // Apply favicon
    if (branding.faviconUrl) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      const faviconUrl = branding.faviconUrl.startsWith('http')
        ? branding.faviconUrl
        : `/api${branding.faviconUrl}`;
      favicon.href = faviconUrl;
    }

    // Apply page title
    if (branding.homePageTitle) {
      document.title = branding.homePageTitle;
    }

    // Load Google Fonts dynamically
    const fontsToLoad = new Set<string>();
    if (branding.headingFont && branding.headingFont !== "Inter") {
      fontsToLoad.add(branding.headingFont);
    }
    if (branding.bodyFont && branding.bodyFont !== "Inter") {
      fontsToLoad.add(branding.bodyFont);
    }

    if (fontsToLoad.size > 0) {
      const fontFamilies = Array.from(fontsToLoad)
        .map((font) => font.replace(/ /g, "+"))
        .join("&family=");
      
      // Check if font link already exists
      const existingFontLink = document.querySelector(`link[href*="fonts.googleapis.com"][href*="${fontFamilies}"]`);
      
      if (!existingFontLink) {
        const fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(fontLink);
      }
    }

    // Cleanup function
    return () => {
      // Don't reset on unmount to maintain branding
    };
  }, [branding, actualTheme]);

  // Render video background if applicable
  const bgUrl = branding.backgroundImageUrl;
  const isVideoFile = bgUrl && /\.(mp4|mov|webm|ogg)$/i.test(bgUrl);
  
  if (isVideoFile) {
    const videoUrl = bgUrl.startsWith("http") ? bgUrl : getMediaUrl(bgUrl);
    const isDark = actualTheme === "dark";
    const patternOpacity = isDark ? 0.05 : 0.1;
    const patternColor = isDark ? "255,255,255" : "0,0,0";
    
    return (
      <>
        {/* Video background */}
        <video
          key={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover -z-50"
          style={{ pointerEvents: 'none' }}
        >
          <source src={videoUrl} type={`video/${bgUrl.split('.').pop()?.toLowerCase()}`} />
        </video>
        
        {/* Pattern overlay on top of video */}
        {branding.backgroundPattern && branding.backgroundPattern !== "none" && (
          <div 
            className="fixed inset-0 -z-40 pointer-events-none"
            style={{
              backgroundImage: branding.backgroundPattern === "dots"
                ? `radial-gradient(circle, rgba(${patternColor},${patternOpacity}) 1px, transparent 1px)`
                : branding.backgroundPattern === "grid"
                  ? `linear-gradient(rgba(${patternColor},${patternOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(${patternColor},${patternOpacity}) 1px, transparent 1px)`
                  : branding.backgroundPattern === "diagonal-lines"
                    ? `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(${patternColor},${patternOpacity}) 10px, rgba(${patternColor},${patternOpacity}) 20px)`
                    : branding.backgroundPattern === "circles"
                      ? `radial-gradient(circle at 20% 50%, rgba(${patternColor},${patternOpacity}) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(${patternColor},${patternOpacity}) 0%, transparent 50%)`
                      : branding.backgroundPattern === "waves"
                        ? `repeating-radial-gradient(circle at 0 0, transparent 0, rgba(${patternColor},${patternOpacity}) 10px, transparent 20px)`
                        : undefined,
              backgroundSize: branding.backgroundPattern === "grid" || branding.backgroundPattern === "dots" 
                ? "20px 20px" 
                : "cover",
            }}
          />
        )}
        
        {/* Gradient overlay on top of video */}
        {branding.backgroundGradient && branding.backgroundGradient !== "none" && (
          <div 
            className="fixed inset-0 -z-30 pointer-events-none"
            style={{
              backgroundImage: branding.backgroundGradient,
            }}
          />
        )}
      </>
    );
  }

  return null; // This component doesn't render anything for image backgrounds
}
