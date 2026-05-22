/**
 * Site customization — organized sub-sections for easier navigation.
 */
import { useState, useEffect, useRef } from "react";
import {
  Save, CheckCircle, AlertCircle, RotateCcw, Upload, X, ImagePlus, Loader2,
  Type, Palette, Image, CaseSensitive, Sparkles, LayoutGrid, Wallpaper, Film,
} from "lucide-react";
import { useBranding, type BrandingConfig, DEFAULT_BRANDING } from "@/context/branding";
import { HeroBannersTab } from "@/components/admin/HeroBannersTab";
import { AdminSubNavLayout, AdminSectionCard, AdminFormActions, type AdminNavSection } from "@/components/admin/AdminSubNavLayout";
import { useToast } from "@/components/ui/Toast";
import { getMediaUrl } from "@/lib/api";
import { uploadAdminFile } from "@/lib/admin-upload";

type SectionId = "text" | "colors" | "assets" | "typography" | "hero" | "sections" | "background";

const SECTIONS: AdminNavSection<SectionId>[] = [
  { id: "text", label: "Text & Branding", shortLabel: "Text", icon: Type, description: "Site name, titles, footer, and dates" },
  { id: "colors", label: "Color Theme", shortLabel: "Colors", icon: Palette, description: "Primary, accent, and background colors" },
  { id: "assets", label: "Logo & Assets", shortLabel: "Assets", icon: Image, description: "Logo and browser favicon" },
  { id: "typography", label: "Typography", shortLabel: "Fonts", icon: CaseSensitive, description: "Heading and body fonts" },
  { id: "hero", label: "Hero Banners", shortLabel: "Hero", icon: Film, description: "Default hero copy, animation, and banner slides" },
  { id: "sections", label: "Page Sections", shortLabel: "Sections", icon: LayoutGrid, description: "Show or hide homepage blocks" },
  { id: "background", label: "Background", shortLabel: "BG", icon: Wallpaper, description: "Background image, pattern, and gradient" },
];

const TEXT_FIELDS: { key: keyof BrandingConfig; label: string; maxLength: number; multiline?: boolean; type?: string; hint: string }[] = [
  { key: "platformName", label: "Platform name", maxLength: 100, hint: "Shown in the header logo and browser tab." },
  { key: "homePageTitle", label: "Home page title", maxLength: 100, hint: "Used in the <title> tag." },
  { key: "homePageDescription", label: "Home page description", maxLength: 200, hint: "Meta description for search engines." },
  { key: "footerText", label: "Footer text", maxLength: 500, multiline: true, hint: "Tagline shown in the footer." },
  { key: "relationshipStartDate", label: "Relationship start date", maxLength: 50, type: "date", hint: "Used in the Time Together section." },
];

const HERO_TEXT_FIELDS: typeof TEXT_FIELDS = [
  { key: "heroTagline", label: "Default hero tagline", maxLength: 200, hint: "Shown when no custom hero banners are active." },
  { key: "heroSubtitle", label: "Default hero subtitle", maxLength: 200, hint: "Smaller text below the hero tagline." },
];

const COLOR_FIELDS: { key: keyof BrandingConfig; label: string; hint: string }[] = [
  { key: "primaryColor", label: "Primary color", hint: "Buttons, links, and accents" },
  { key: "accentColor", label: "Accent color", hint: "Hover states and highlights" },
  { key: "backgroundColor", label: "Background color", hint: "Main page background" },
];

const FONT_OPTIONS = [
  "Bebas Neue", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Playfair Display", "Raleway", "Poppins", "Oswald",
];

const HERO_ANIMATIONS = [
  { value: "kenburns", label: "Ken Burns (Classic Zoom & Pan)" },
  { value: "zoomIn", label: "Zoom In" },
  { value: "zoomOut", label: "Zoom Out" },
  { value: "panLeft", label: "Pan Left" },
  { value: "panRight", label: "Pan Right" },
  { value: "panUp", label: "Pan Up" },
  { value: "panDown", label: "Pan Down" },
  { value: "rotate", label: "Rotate" },
  { value: "pulse", label: "Pulse" },
  { value: "fadeInOut", label: "Fade In/Out" },
  { value: "slideLeft", label: "Slide Left" },
  { value: "slideRight", label: "Slide Right" },
  { value: "none", label: "None (Static)" },
];

const BACKGROUND_PATTERNS = ["none", "dots", "grid", "diagonal-lines", "circles", "waves"];

const BACKGROUND_GRADIENTS = [
  "none",
  "linear-gradient(to bottom, #000000, #1a1a1a)",
  "linear-gradient(to bottom right, #1a1a1a, #000000)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(to right, #434343 0%, black 100%)",
];

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: (typeof TEXT_FIELDS)[0];
  value: string;
  error?: string;
  onChange: (key: keyof BrandingConfig, value: string | boolean) => void;
}) {
  const { key, label, maxLength, multiline, type, hint } = field;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={key} className="text-sm font-medium text-foreground/80">
          {label} <span className="text-primary">*</span>
        </label>
        <span className={`text-xs ${value.length > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
          {value.length}/{maxLength}
        </span>
      </div>
      {multiline ? (
        <textarea
          id={key}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          maxLength={maxLength}
          rows={3}
          className={`w-full bg-input border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none text-sm ${error ? "border-destructive" : "border-border"}`}
        />
      ) : type === "date" ? (
        <input
          id={key}
          type="date"
          value={value.split("T")[0]}
          onChange={(e) => onChange(key, e.target.value ? new Date(e.target.value).toISOString() : "")}
          className={`w-full bg-input border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-sm ${error ? "border-destructive" : "border-border"}`}
        />
      ) : (
        <input
          id={key}
          type="text"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          maxLength={maxLength}
          className={`w-full bg-input border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-sm ${error ? "border-destructive" : "border-border"}`}
        />
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
      {error && (
        <p role="alert" className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

export function CustomizationTab() {
  const { branding, saveBranding } = useBranding();
  const toast = useToast();

  const [section, setSection] = useState<SectionId>("text");
  const [form, setForm] = useState<BrandingConfig>({ ...branding });
  const [errors, setErrors] = useState<Partial<Record<keyof BrandingConfig, string>>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm({ ...branding }); }, [branding]);

  const handleChange = (key: keyof BrandingConfig, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof BrandingConfig]) setErrors((e) => ({ ...e, [key]: undefined }));
    setSaveStatus("idle");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      const result = await saveBranding({ ...form, [key]: value });
      if (result.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    }, 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("saving");
    const result = await saveBranding(form);
    if (result.ok) {
      setErrors({});
      setSaveStatus("success");
      toast.success("Changes saved!");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setErrors(result.errors ?? {});
      setSaveStatus("error");
      toast.error("Failed to save. Check the fields.");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form]);

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const data = await uploadAdminFile(file);
      handleChange("logoUrl", data.url);
      toast.success("Logo uploaded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const data = await uploadAdminFile(file);
      handleChange("faviconUrl", data.url);
      toast.success("Favicon uploaded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    setUploadingBackground(true);
    try {
      const data = await uploadAdminFile(file);
      handleChange("backgroundImageUrl", data.url);
      toast.success("Background uploaded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingBackground(false);
    }
  };

  const saveFooter = (
    <AdminFormActions>
      <button
        type="submit"
        form="customization-form"
        disabled={saveStatus === "saving"}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 shadow-[var(--shadow-glow)] disabled:opacity-60"
      >
        <Save className="h-4 w-4 shrink-0" />
        {saveStatus === "saving" ? "Saving…" : "Save changes"}
      </button>
      <button
        type="button"
        onClick={() => {
          setForm({ ...DEFAULT_BRANDING });
          setErrors({});
          setSaveStatus("idle");
          toast.success("Reset to default — save to apply.");
        }}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card hover:border-primary/40"
      >
        <RotateCcw className="h-4 w-4 shrink-0" /> Default style
      </button>
      <button
        type="button"
        onClick={() => { setForm({ ...branding }); setErrors({}); setSaveStatus("idle"); }}
        className="w-full sm:w-auto text-sm text-muted-foreground hover:text-foreground px-2 py-2.5"
      >
        Discard unsaved
      </button>
      <span className="sm:ml-auto text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-right">
        {saveStatus === "saving" ? "Auto-saving…" : "Ctrl+S to save"}
      </span>
    </AdminFormActions>
  );

  return (
    <div className="space-y-4 min-w-0">
      {saveStatus === "success" && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-primary">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Saved. Changes are live.</p>
        </div>
      )}
      {saveStatus === "error" && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Could not save. Check fields.</p>
        </div>
      )}

      <AdminSubNavLayout sections={SECTIONS} active={section} onSelect={setSection} navLabel="Customize" footer={saveFooter}>
          <form id="customization-form" onSubmit={handleSubmit} noValidate className="space-y-4 min-w-0">
            {section === "text" && (
              <AdminSectionCard title="Site copy" description="Names and text across the site (not hero slideshow).">
                {TEXT_FIELDS.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={String(form[field.key] || "")}
                    error={errors[field.key]}
                    onChange={handleChange}
                  />
                ))}
              </AdminSectionCard>
            )}

            {section === "colors" && (
              <AdminSectionCard title="Color theme" description="Buttons, links, and page background.">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COLOR_FIELDS.map(({ key, label, hint }) => (
                    <div key={key} className="space-y-1.5">
                      <label htmlFor={key} className="text-sm font-medium text-foreground/80">{label}</label>
                      <div className="flex gap-2">
                        <input
                          id={key}
                          type="color"
                          value={form[key] as string}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="h-12 w-16 rounded border border-border cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={form[key] as string}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder="#000000"
                          maxLength={20}
                          className="flex-1 bg-input border border-border rounded-md px-4 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </div>
              </AdminSectionCard>
            )}

            {section === "assets" && (
              <AdminSectionCard title="Logo & favicon" description="Upload or paste URLs for brand images.">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground/80">Logo</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={form.logoUrl}
                        onChange={(e) => handleChange("logoUrl", e.target.value)}
                        placeholder="URL or upload below"
                        maxLength={500}
                        className="flex-1 bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                      <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                        className="inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card disabled:opacity-50 whitespace-nowrap">
                        {uploadingLogo ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload</>}
                      </button>
                    </div>
                    {form.logoUrl && (
                      <div className="flex items-center gap-3 p-3 bg-input/30 border border-border/40 rounded-lg">
                        <img src={getMediaUrl(form.logoUrl)} alt="Logo" className="h-12 w-auto object-contain rounded" />
                        <p className="flex-1 text-xs text-muted-foreground truncate">{form.logoUrl}</p>
                        <button type="button" onClick={() => handleChange("logoUrl", "")} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Header logo (PNG, SVG, or JPG)</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground/80">Favicon</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={form.faviconUrl}
                        onChange={(e) => handleChange("faviconUrl", e.target.value)}
                        placeholder="URL or upload below"
                        maxLength={500}
                        className="flex-1 bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input ref={faviconInputRef} type="file" accept="image/*,.ico" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); }} />
                      <button type="button" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}
                        className="inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card disabled:opacity-50 whitespace-nowrap">
                        {uploadingFavicon ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload</>}
                      </button>
                    </div>
                    {form.faviconUrl && (
                      <div className="flex items-center gap-3 p-3 bg-input/30 border border-border/40 rounded-lg">
                        <img src={getMediaUrl(form.faviconUrl)} alt="Favicon" className="h-8 w-8 object-contain rounded" />
                        <p className="flex-1 text-xs text-muted-foreground truncate">{form.faviconUrl}</p>
                        <button type="button" onClick={() => handleChange("faviconUrl", "")} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Browser tab icon (16×16 or 32×32)</p>
                  </div>
                </div>
              </AdminSectionCard>
            )}

            {section === "typography" && (
              <AdminSectionCard title="Fonts" description="Heading and body fonts.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(["headingFont", "bodyFont"] as const).map((fontKey) => {
                    const isHeading = fontKey === "headingFont";
                    return (
                      <div key={fontKey} className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">{isHeading ? "Heading font" : "Body font"}</label>
                        <select
                          value={form[fontKey]}
                          onChange={(e) => handleChange(fontKey, e.target.value)}
                          className="w-full bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                          ))}
                        </select>
                        <div className="p-4 bg-input/30 border border-border/40 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">Preview</p>
                          {isHeading ? (
                            <p className="text-2xl font-bold" style={{ fontFamily: form.headingFont }}>The Quick Brown Fox</p>
                          ) : (
                            <p className="text-base" style={{ fontFamily: form.bodyFont }}>The quick brown fox jumps over the lazy dog.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminSectionCard>
            )}

            {section === "hero" && (
              <div className="space-y-4 min-w-0">
                <AdminSectionCard title="Default hero text" description="Shown when no banner slides are active.">
                  {HERO_TEXT_FIELDS.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={String(form[field.key] || "")}
                      error={errors[field.key]}
                      onChange={handleChange}
                    />
                  ))}
                </AdminSectionCard>

                <AdminSectionCard title="Banner animation" description="Hero image motion (videos unchanged).">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Animation style</label>
                    <select
                      value={form.heroAnimation}
                      onChange={(e) => handleChange("heroAnimation", e.target.value)}
                      className="w-full bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {HERO_ANIMATIONS.map((anim) => (
                        <option key={anim.value} value={anim.value}>{anim.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Selected: {HERO_ANIMATIONS.find((a) => a.value === form.heroAnimation)?.label}
                    </p>
                  </div>
                </AdminSectionCard>

                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-3 min-w-0">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">Banner slides</span> below override the default hero text when at least one is active.
                  </p>
                </div>

                <HeroBannersTab />
              </div>
            )}

            {section === "sections" && (
              <AdminSectionCard title="Homepage sections" description="Show or hide blocks without deleting content.">
                <div className="space-y-4">
                  {[
                    { key: "showTimeTogetherSection" as const, title: 'Time Together', desc: "Relationship duration counter" },
                    { key: "showStoryContinuesSection" as const, title: "Story Continues", desc: "Romantic message section" },
                    { key: "showFeaturedSection" as const, title: "Featured", desc: "Featured albums on the homepage" },
                  ].map(({ key, title, desc }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => handleChange(key, e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded accent-primary shrink-0"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">{title}</span>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </AdminSectionCard>
            )}

            {section === "background" && (
              <AdminSectionCard title="Background" description="Site-wide background behind content.">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Background image or video</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={form.backgroundImageUrl}
                        onChange={(e) => handleChange("backgroundImageUrl", e.target.value)}
                        placeholder="URL or upload"
                        maxLength={500}
                        className="flex-1 bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input ref={backgroundInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBackgroundUpload(f); }} />
                      <button type="button" onClick={() => backgroundInputRef.current?.click()} disabled={uploadingBackground}
                        className="inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card disabled:opacity-50 whitespace-nowrap">
                        {uploadingBackground ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><ImagePlus className="h-4 w-4" /> Upload</>}
                      </button>
                    </div>
                    {form.backgroundImageUrl && (
                      <div className="flex items-center gap-3 p-3 bg-input/30 border border-border/40 rounded-lg">
                        <div className="h-16 w-24 rounded bg-muted overflow-hidden shrink-0">
                          {/\.(mp4|mov|webm)$/i.test(form.backgroundImageUrl) ? (
                            <video src={getMediaUrl(form.backgroundImageUrl)} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={getMediaUrl(form.backgroundImageUrl)} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <button type="button" onClick={() => handleChange("backgroundImageUrl", "")} className="ml-auto text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">Pattern overlay</label>
                      <select value={form.backgroundPattern} onChange={(e) => handleChange("backgroundPattern", e.target.value)}
                        className="w-full bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {BACKGROUND_PATTERNS.map((p) => (
                          <option key={p} value={p}>{p === "none" ? "None" : p.charAt(0).toUpperCase() + p.slice(1).replace("-", " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">Gradient</label>
                      <select value={form.backgroundGradient} onChange={(e) => handleChange("backgroundGradient", e.target.value)}
                        className="w-full bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {BACKGROUND_GRADIENTS.map((g, i) => (
                          <option key={i} value={g}>{g === "none" ? "None" : `Gradient ${i}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </AdminSectionCard>
            )}
          </form>
      </AdminSubNavLayout>
    </div>
  );
}
