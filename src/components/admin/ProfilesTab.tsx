import { useState, useEffect, useRef } from "react";
import {
  Save, CheckCircle, AlertCircle, Users, ImagePlus, Loader2, X, UserCircle, Paintbrush, Cake,
} from "lucide-react";
import { useProfile } from "@/context/profile";
import { useToast } from "@/components/ui/Toast";
import { getMediaUrl } from "@/lib/api";
import { uploadAdminFile } from "@/lib/admin-upload";
import { AdminSubNavLayout, AdminSectionCard, AdminFormActions, type AdminNavSection } from "@/components/admin/AdminSubNavLayout";

const PROFILE_PICTURE_SHAPES = [
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "rounded", label: "Rounded" },
];

const PROFILE_COLOR_PRESETS = [
  { value: "bg-blue-500", label: "Ocean Blue" },
  { value: "bg-rose-500", label: "Romantic Rose" },
  { value: "bg-purple-500", label: "Lavender Purple" },
  { value: "bg-emerald-500", label: "Emerald Green" },
  { value: "bg-amber-500", label: "Warm Amber" },
  { value: "bg-indigo-500", label: "Royal Indigo" },
  { value: "bg-pink-500", label: "Blush Pink" },
  { value: "bg-cyan-500", label: "Bright Cyan" },
  { value: "bg-red-500", label: "Classic Red" },
];

type ProfileSection = "pick" | "edit";

const SECTIONS: AdminNavSection<ProfileSection>[] = [
  { id: "pick", label: "Choose Profile", shortLabel: "Pick", icon: Users, description: "Select You, Me, or Us to customize" },
  { id: "edit", label: "Edit Details", shortLabel: "Edit", icon: Paintbrush, description: "Name, color, photo, and icon shape" },
];

export function ProfilesTab() {
  const { profiles, updateProfile } = useProfile();
  const toast = useToast();

  const [section, setSection] = useState<ProfileSection>("pick");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    color: "bg-blue-500",
    profilePictureUrl: "",
    avatarShape: "square",
    birthday: "",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    const selected = profiles.find((p) => p.id === selectedProfileId);
    if (selected) {
      const bday = selected.birthday;
      setProfileForm({
        name: selected.name,
        color: selected.color,
        profilePictureUrl: selected.profile_picture_url || "",
        avatarShape: selected.avatar_shape || "square",
        birthday: bday ? String(bday).slice(0, 10) : "",
      });
      setSaveStatus("idle");
    }
  }, [selectedProfileId, profiles]);

  const handlePicUpload = async (file: File) => {
    setUploadingPic(true);
    try {
      const data = await uploadAdminFile(file);
      setProfileForm((prev) => ({ ...prev, profilePictureUrl: data.url }));
      toast.success("Photo uploaded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProfileId) return;
    setSaveStatus("saving");
    const result = await updateProfile(
      selectedProfileId,
      profileForm.name,
      profileForm.color,
      profileForm.profilePictureUrl || null,
      profileForm.avatarShape,
      profileForm.birthday.trim() || null
    );
    setSaveStatus(result.ok ? "success" : "error");
    if (result.ok) {
      toast.success("Profile saved!");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      toast.error(result.error || "Failed to save profile");
    }
  };

  const saveFooter = section === "edit" && selectedProfileId ? (
    <AdminFormActions>
      <button
        type="button"
        disabled={saveStatus === "saving"}
        onClick={handleSave}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4 shrink-0" />
        {saveStatus === "saving" ? "Saving…" : "Save profile"}
      </button>
      {saveStatus === "success" && (
        <span className="text-sm text-emerald-400 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" /> Saved
        </span>
      )}
      {saveStatus === "error" && (
        <span className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> Save failed
        </span>
      )}
    </AdminFormActions>
  ) : undefined;

  if (profiles.length === 0) {
    return (
      <AdminSectionCard title="No profiles found" description="Start the backend and run database seed, then refresh.">
        <p className="text-sm text-muted-foreground">Expected profiles: You, Me, Us.</p>
      </AdminSectionCard>
    );
  }

  return (
    <AdminSubNavLayout
      sections={SECTIONS}
      active={section}
      onSelect={(id) => {
        if (id === "edit" && !selectedProfileId) {
          toast.error("Pick a profile first");
          return;
        }
        setSection(id);
      }}
      navLabel="Profiles"
      footer={saveFooter}
    >
      {section === "pick" && (
        <AdminSectionCard title="Who are you editing?" description="Tap a profile, then open Edit Details.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {profiles.map((profile) => {
              const shapeClass =
                profile.avatar_shape === "circle" ? "rounded-full" :
                profile.avatar_shape === "rounded" ? "rounded-2xl" : "rounded-md";
              const active = selectedProfileId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfileId(profile.id);
                    setSection("edit");
                  }}
                  className={`flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl border-2 transition-all min-w-0 ${
                    active
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border/60 hover:border-primary/40 hover:bg-card/80"
                  }`}
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${shapeClass} ${profile.color} flex items-center justify-center text-xl sm:text-2xl font-display text-white overflow-hidden shrink-0`}>
                    {profile.profile_picture_url ? (
                      <img src={getMediaUrl(profile.profile_picture_url)} alt="" className={`w-full h-full object-cover ${shapeClass}`} />
                    ) : (
                      profile.name.charAt(0)
                    )}
                  </div>
                  <span className={`text-sm font-semibold truncate max-w-full ${active ? "text-primary" : ""}`}>
                    {profile.name}
                  </span>
                </button>
              );
            })}
          </div>
        </AdminSectionCard>
      )}

      {section === "edit" && selectedProfileId && (
        <AdminSectionCard
          title={`Editing: ${profiles.find((p) => p.id === selectedProfileId)?.name ?? ""}`}
          description="Changes appear on the profile picker and in comments."
        >
          <div className="space-y-5 min-w-0">
            <div className="space-y-2">
              <label htmlFor="profile-name" className="text-sm font-medium">Display name</label>
              <input
                id="profile-name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={50}
                className="w-full min-w-0 bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar color</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PROFILE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setProfileForm((f) => ({ ...f, color: preset.value }))}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 min-w-0 ${
                      profileForm.color === preset.value ? "border-white/60" : "border-transparent hover:border-white/20"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${preset.value} shrink-0`} />
                    <span className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight break-words">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Profile picture</label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-0">
                <input
                  type="text"
                  value={profileForm.profilePictureUrl}
                  onChange={(e) => setProfileForm((f) => ({ ...f, profilePictureUrl: e.target.value }))}
                  placeholder="URL or upload"
                  className="flex-1 min-w-0 bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePicUpload(f); }} />
                <button type="button" onClick={() => picInputRef.current?.click()} disabled={uploadingPic}
                  className="shrink-0 inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-card disabled:opacity-50">
                  {uploadingPic ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Upload
                </button>
              </div>
              {profileForm.profilePictureUrl && (
                <div className="flex items-center gap-3 p-3 bg-input/30 border border-border/40 rounded-lg min-w-0">
                  <img src={getMediaUrl(profileForm.profilePictureUrl)} alt="" className="h-12 w-12 object-cover rounded-lg shrink-0" />
                  <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">{profileForm.profilePictureUrl}</p>
                  <button type="button" onClick={() => setProfileForm((f) => ({ ...f, profilePictureUrl: "" }))} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-birthday" className="text-sm font-medium flex items-center gap-2">
                <Cake className="h-4 w-4 text-primary" />
                Birthday
              </label>
              <input
                id="profile-birthday"
                type="date"
                value={profileForm.birthday}
                onChange={(e) => setProfileForm((f) => ({ ...f, birthday: e.target.value }))}
                className="w-full min-w-0 bg-input border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Shown on the home page with countdown and reminders. Clear the date to hide.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Icon shape</label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {PROFILE_PICTURE_SHAPES.map((shape) => (
                  <button
                    key={shape.value}
                    type="button"
                    onClick={() => setProfileForm((f) => ({ ...f, avatarShape: shape.value }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 min-w-0 ${
                      profileForm.avatarShape === shape.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    <div className={`w-8 h-8 bg-primary/40 shrink-0 ${
                      shape.value === "circle" ? "rounded-full" : shape.value === "rounded" ? "rounded-xl" : "rounded-none"
                    }`} />
                    <span className="text-xs font-medium">{shape.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSection("pick")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm hover:bg-card"
            >
              <UserCircle className="h-4 w-4" /> Switch profile
            </button>
          </div>
        </AdminSectionCard>
      )}
    </AdminSubNavLayout>
  );
}
