/**
 * Branding routes — GET/PUT for platform branding config.
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/branding — Get current branding config */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM branding WHERE id = 1");

    if (rows.length === 0) {
      // Return defaults if no branding config exists
      res.json({
        platformName: "USFLIX",
        heroTagline: "The Sunset We Watched Forever",
        heroSubtitle: "Every story we've written together, in one place. Press play and let's remember.",
        footerText: "Our Story, Streaming Always",
        homePageTitle: "USFLIX — Our Story",
        homePageDescription: "Every memory we've made, in one cinematic place.",
        relationshipStartDate: "2021-09-15T00:00:00",
        primaryColor: "#e50914",
        accentColor: "#b20710",
        backgroundColor: "#000000",
        logoUrl: "",
        faviconUrl: "",
        headingFont: "Bebas Neue",
        bodyFont: "Inter",
        showTimeTogetherSection: true,
        showStoryContinuesSection: true,
        showFeaturedSection: true,
        backgroundImageUrl: "",
        backgroundPattern: "none",
        backgroundGradient: "none",
        heroAnimation: "kenburns",
        profilePictureUrl: "",
        profilePictureShape: "circle",
      });
      return;
    }

    const r = rows[0];
    res.json({
      platformName: r.platform_name,
      heroTagline: r.hero_tagline,
      heroSubtitle: r.hero_subtitle,
      footerText: r.footer_text,
      homePageTitle: r.home_page_title,
      homePageDescription: r.home_page_description,
      relationshipStartDate: r.relationship_start_date,
      primaryColor: r.primary_color,
      accentColor: r.accent_color,
      backgroundColor: r.background_color,
      logoUrl: r.logo_url,
      faviconUrl: r.favicon_url,
      headingFont: r.heading_font,
      bodyFont: r.body_font,
      showTimeTogetherSection: r.show_time_together_section,
      showStoryContinuesSection: r.show_story_continues_section,
      showFeaturedSection: r.show_featured_section,
      backgroundImageUrl: r.background_image_url,
      backgroundPattern: r.background_pattern,
      backgroundGradient: r.background_gradient,
      heroAnimation: r.hero_animation || "kenburns",
      profilePictureUrl: r.profile_picture_url || "",
      profilePictureShape: r.profile_picture_shape || "circle",
    });
  } catch (error) {
    console.error("Get branding error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch branding" });
  }
});

/** PUT /api/branding — Update branding config (admin only) */
router.put("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      platformName, heroTagline, heroSubtitle, footerText,
      homePageTitle, homePageDescription, relationshipStartDate,
      primaryColor, accentColor, backgroundColor,
      logoUrl, faviconUrl, headingFont, bodyFont,
      showTimeTogetherSection, showStoryContinuesSection, showFeaturedSection,
      backgroundImageUrl, backgroundPattern, backgroundGradient, heroAnimation,
      profilePictureUrl, profilePictureShape,
    } = req.body;

    // Validate
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

    const errors: Record<string, string> = {};
    const fields = {
      platformName, heroTagline, heroSubtitle, footerText, homePageTitle,
      homePageDescription, relationshipStartDate, primaryColor, accentColor,
      backgroundColor, headingFont, bodyFont, backgroundPattern, heroAnimation,
      profilePictureShape,
    };

    for (const [key, val] of Object.entries(fields)) {
      if (!val || !String(val).trim()) {
        errors[key] = `${labels[key]} cannot be empty.`;
      } else if (String(val).length > limits[key]) {
        errors[key] = `${labels[key]} must be ${limits[key]} characters or fewer.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ ok: false, errors });
      return;
    }

    // Upsert — insert or update
    await pool.query(
      `INSERT INTO branding (
        id, platform_name, hero_tagline, hero_subtitle, footer_text,
        home_page_title, home_page_description, relationship_start_date,
        primary_color, accent_color, background_color,
        logo_url, favicon_url, heading_font, body_font,
        show_time_together_section, show_story_continues_section, show_featured_section,
        background_image_url, background_pattern, background_gradient, hero_animation,
        profile_picture_url, profile_picture_shape, updated_at
      )
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())
       ON CONFLICT (id) DO UPDATE SET
         platform_name = $1, hero_tagline = $2, hero_subtitle = $3,
         footer_text = $4, home_page_title = $5, home_page_description = $6,
         relationship_start_date = $7, primary_color = $8, accent_color = $9,
         background_color = $10, logo_url = $11, favicon_url = $12,
         heading_font = $13, body_font = $14, show_time_together_section = $15,
         show_story_continues_section = $16, show_featured_section = $17,
         background_image_url = $18, background_pattern = $19, background_gradient = $20,
         hero_animation = $21, profile_picture_url = $22, profile_picture_shape = $23,
         updated_at = NOW()`,
      [
        platformName, heroTagline, heroSubtitle, footerText, homePageTitle,
        homePageDescription, relationshipStartDate, primaryColor, accentColor,
        backgroundColor, logoUrl, faviconUrl, headingFont, bodyFont,
        showTimeTogetherSection, showStoryContinuesSection, showFeaturedSection,
        backgroundImageUrl, backgroundPattern, backgroundGradient, heroAnimation || "kenburns",
        profilePictureUrl || "", profilePictureShape || "circle",
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Update branding error:", error);
    res.status(500).json({ ok: false, error: "Failed to update branding" });
  }
});

export default router;
