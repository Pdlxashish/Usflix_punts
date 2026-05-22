/**
 * Admin panel — Req 1 (Branding), Req 6 (Collections), Req 7 (Metadata), Req 8 (Deletion), Req 9 (Auth)
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  CheckCircle, AlertCircle, ArrowLeft, Settings, LogOut,
  Plus, Pencil, Trash2, FolderTree, Film, Image, X, Upload, ImagePlus,
  Loader2, RotateCcw, Users, Shield, Heart,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useContent } from "@/context/content";
import { CustomizationTab } from "@/components/admin/CustomizationTab";
import { ProfilesTab } from "@/components/admin/ProfilesTab";
import { AdminUploadTab } from "@/components/admin/AdminUploadTab";
import { AccountTab } from "@/components/admin/AccountTab";
import { AdminSubNavLayout, type AdminNavSection } from "@/components/admin/AdminSubNavLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LivePreview } from "@/components/admin/LivePreview";
import { useToast } from "@/components/ui/Toast";
import { getMediaUrl } from "@/lib/api";
import { uploadAdminFile } from "@/lib/admin-upload";
import { LoveLettersAdmin } from "@/components/admin/LoveLettersAdmin";
import { LoveJarAdmin } from "@/components/admin/LoveJarAdmin";
import { MoodBoardAdmin } from "@/components/admin/MoodBoardAdmin";
import { MilestonesAdmin } from "@/components/admin/MilestonesAdmin";
import { QuizAdmin } from "@/components/admin/QuizAdmin";
import { BucketListAdmin } from "@/components/admin/BucketListAdmin";
import { MoodOfDayAdmin } from "@/components/admin/MoodOfDayAdmin";
import { GreetingsAdmin } from "@/components/admin/GreetingsAdmin";
import { PlaylistAdmin } from "@/components/admin/PlaylistAdmin";
import { WeatherAdmin } from "@/components/admin/WeatherAdmin";
import { CanvasAdmin } from "@/components/admin/CanvasAdmin";

type AlbumSection = "create" | "manage" | "media";

const ALBUM_SECTIONS: AdminNavSection<AlbumSection>[] = [
  { id: "create", label: "Create Album", shortLabel: "Create", icon: Plus, description: "Add a new album or sub-album" },
  { id: "manage", label: "Manage Albums", shortLabel: "Albums", icon: FolderTree, description: "Rename, edit, or delete albums" },
  { id: "media", label: "All Media", shortLabel: "Media", icon: Film, description: "Edit, feature, or delete photos and videos" },
];

export const Route = createFileRoute("/admin/")(  {
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin — USFLIX" }] }),
});

// ─── Main component ───────────────────────────────────────────────────────────
function AdminPanel() {
  const { isAuthenticated, username, logout, loading } = useAuth();
  const navigate = useNavigate();
  const { collections, mediaItems, createCollection, updateCollection, deleteCollection, updateMediaItem, deleteMediaItem, refreshData } = useContent();
  const toast = useToast();

  // Auth guard — Req 9 AC1
  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/admin/login" });
  }, [isAuthenticated, loading, navigate]);

  // Tabs
  const [tab, setTab] = useState<"customization" | "profiles" | "albums" | "upload" | "romance" | "account">("customization");
  const [albumSection, setAlbumSection] = useState<AlbumSection>("create");

  // ── Bulk selection state ──
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);

  // ── Collection state ──
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [newColParent, setNewColParent] = useState("");
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editColName, setEditColName] = useState("");
  const [editColDesc, setEditColDesc] = useState("");
  const [colError, setColError] = useState<string | null>(null);
  const [deleteColTarget, setDeleteColTarget] = useState<string | null>(null);

  // ── Media state ──
  const [editingMedia, setEditingMedia] = useState<string | null>(null);
  const [editMediaTitle, setEditMediaTitle] = useState("");
  const [editMediaDesc, setEditMediaDesc] = useState("");
  const [editMediaTagline, setEditMediaTagline] = useState("");
  const [editMediaRank, setEditMediaRank] = useState(1);
  const [editMediaThumbnail, setEditMediaThumbnail] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [deleteMediaTarget, setDeleteMediaTarget] = useState<string | null>(null);
  const [uploadingMediaFile, setUploadingMediaFile] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  // ── Undo state ──
  const [lastDeleted, setLastDeleted] = useState<{ type: "media" | "collection"; id: string; name: string } | null>(null);

  if (!isAuthenticated) return null;

  const tabs = [
    { id: "customization" as const, label: "Style", icon: Settings },
    { id: "profiles" as const, label: "Profiles", icon: Users },
    { id: "albums" as const, label: "Albums", icon: FolderTree },
    { id: "upload" as const, label: "Upload", icon: Upload },
    { id: "romance" as const, label: "Romance", icon: Heart },
    { id: "account" as const, label: "Account", icon: Shield },
  ];

  const deleteColItem = collections.find((c) => c.id === deleteColTarget);
  const deleteMediaItemData = mediaItems.find((m) => m.id === deleteMediaTarget);
  const rootCollections = collections.filter((c) => !c.parentId);

  // Handle media file replacement
  const handleMediaFileUpload = async (mediaId: string, file: File) => {
    setUploadingMediaFile(true);
    setMediaError(null);
    try {
      const uploadData = await uploadAdminFile(file);
      
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      if (!mediaItem) throw new Error("Media item not found");
      
      // Determine if it's a photo or video based on file type
      const isVideo = file.type.startsWith("video/");
      const isPhoto = file.type.startsWith("image/");
      
      // Update the media item with new file
      const updatePayload: any = {
        thumbnail: uploadData.thumbnailUrl || uploadData.url,
      };
      
      if (isVideo) {
        updatePayload.videoUrl = uploadData.url;
        if (uploadData.duration) {
          updatePayload.duration = uploadData.duration;
        }
      } else if (isPhoto) {
        // For photos, update the photos array
        updatePayload.photos = [uploadData.url];
      }
      
      // Update via backend
      const updateRes = await fetch(`/api/media/${mediaId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      
      if (!updateRes.ok) throw new Error("Failed to update media item");
      
      await refreshData();
      setMediaError(null);
    } catch (err: any) {
      setMediaError(err.message || "Failed to upload file");
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingMediaFile(false);
    }
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (mediaId: string, file: File) => {
    setUploadingThumbnail(true);
    setMediaError(null);
    try {
      const uploadData = await uploadAdminFile(file);
      
      // Update only the thumbnail
      const updateRes = await fetch(`/api/media/${mediaId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnail: uploadData.url }),
      });
      
      if (!updateRes.ok) throw new Error("Failed to update thumbnail");
      
      setEditMediaThumbnail(uploadData.url);
      await refreshData();
      setMediaError(null);
      toast.success("Thumbnail updated!");
    } catch (err: any) {
      setMediaError(err.message || "Failed to upload thumbnail");
      toast.error(err.message || "Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  return (
    <div className="pt-20 sm:pt-24 pb-20 sm:pb-24 px-3 sm:px-6 lg:px-12 max-w-6xl mx-auto min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to site
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <span className="text-xs text-muted-foreground">Signed in as <span className="text-foreground">{username}</span></span>
            <button onClick={async () => { await logout(); navigate({ to: "/admin/login" }); }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-3 w-3" /> Logout
            </button>
          </div>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl">Admin Panel</h1>
      </div>

      {/* Tabs — scrollable on mobile, no flex-1 so overflow-x-auto works */}
      <div
        className="flex gap-1 bg-card/50 border border-border/60 rounded-lg p-1 mb-6 sm:mb-8 overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label="Admin sections"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-[11px] sm:text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ Customization Tab ═══ */}
      {tab === "customization" && <CustomizationTab />}

      {tab === "account" && <AccountTab />}

      {/* ═══ Romance Tab ═══ */}
      {tab === "romance" && (
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-2xl mb-1">Romance Features</h2>
            <p className="text-sm text-muted-foreground">Manage the love letters, jar, mood board, and milestones shown on the homepage.</p>
          </div>

          {/* Sub-sections */}
          <RomanceSubTabs />
        </div>
      )}

      {/* ═══ Albums Tab ═══ */}
      {tab === "albums" && (
        <AdminSubNavLayout
          sections={ALBUM_SECTIONS}
          active={albumSection}
          onSelect={setAlbumSection}
          navLabel="Albums"
        >
          {albumSection === "create" && (
          <div className="bg-card/50 border border-border/60 rounded-xl p-4 sm:p-6 min-w-0">
            {colError && <p className="text-sm text-destructive mb-3 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {colError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <input value={newColName} onChange={(e) => setNewColName(e.target.value)} placeholder="Album name *" maxLength={200}
                className="bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newColDesc} onChange={(e) => setNewColDesc(e.target.value)} placeholder="Description (optional)" maxLength={2000}
                className="bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <select value={newColParent} onChange={(e) => setNewColParent(e.target.value)}
                className="bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No parent (root)</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={async () => {
              if (!newColName.trim()) {
                setColError("Album name is required");
                return;
              }
              const r = await createCollection({ name: newColName, description: newColDesc || undefined, parentId: newColParent || undefined });
              if (r.ok) { 
                setNewColName(""); 
                setNewColDesc(""); 
                setNewColParent(""); 
                setColError(null);
                await refreshData();
                toast.success(`Album "${newColName}" created!`);
              }
              else { setColError(r.error ?? "Failed to create."); toast.error(r.error ?? "Failed to create album"); }
            }} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Add Album
            </button>
          </div>
          )}

          {albumSection === "manage" && (
          <div className="bg-card/50 border border-border/60 rounded-xl p-4 sm:p-6 min-w-0">
            <p className="text-sm text-muted-foreground mb-4">{collections.length} album{collections.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2">
              {collections.map((col) => {
                const childCount = mediaItems.filter((m) => m.category.toLowerCase() === col.name.toLowerCase()).length;
                const isEditing = editingCol === col.id;
                return (
                  <div key={col.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-input/50 border border-border/40 rounded-lg px-3 sm:px-4 py-3 min-w-0">
                    {col.parentId && <span className="text-muted-foreground text-xs sm:mr-0">↳</span>}
                    {isEditing ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 min-w-0 w-full">
                        <input value={editColName} onChange={(e) => setEditColName(e.target.value)} className="flex-1 min-w-0 bg-input border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                        <input value={editColDesc} onChange={(e) => setEditColDesc(e.target.value)} placeholder="Description" className="flex-1 min-w-0 bg-input border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                        <div className="flex gap-2 shrink-0">
                        <button onClick={async () => { 
                          await updateCollection(col.id, { name: editColName, description: editColDesc }); 
                          setEditingCol(null); 
                          await refreshData(); 
                          toast.success("Album updated!");
                        }}
                          className="text-primary hover:text-primary/80 text-sm font-medium">Save</button>
                        <button onClick={() => setEditingCol(null)} className="text-muted-foreground hover:text-foreground text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FolderTree className="h-4 w-4 text-primary shrink-0 hidden sm:block" />
                        <span className="flex-1 text-sm font-medium truncate min-w-0">{col.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{childCount} items</span>
                        <button onClick={() => { setEditingCol(col.id); setEditColName(col.name); setEditColDesc(col.description ?? ""); }}
                          className="text-muted-foreground hover:text-primary transition-colors" aria-label={`Edit ${col.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteColTarget(col.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors" aria-label={`Delete ${col.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {albumSection === "media" && (
          <div className="bg-card/50 border border-border/60 rounded-xl p-4 sm:p-6 min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 min-w-0">
              <p className="text-sm text-muted-foreground">{mediaItems.length} item{mediaItems.length !== 1 ? "s" : ""}</p>
              <div className="flex flex-wrap gap-2 min-w-0">
                {selectedMedia.size > 0 ? (
                  <>
                    <span className="text-sm text-muted-foreground self-center">
                      {selectedMedia.size} selected
                    </span>
                    <button 
                      onClick={() => {
                        setBulkDeleteMode(true);
                      }}
                      className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors">
                      <Trash2 className="h-4 w-4" /> Delete Selected
                    </button>
                    <button 
                      onClick={() => setSelectedMedia(new Set())}
                      className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-card transition-colors">
                      Clear Selection
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      if (selectedMedia.size === mediaItems.length) {
                        setSelectedMedia(new Set());
                      } else {
                        setSelectedMedia(new Set(mediaItems.map(m => m.id)));
                      }
                    }}
                    className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-card transition-colors">
                    Select All
                  </button>
                )}
              </div>
            </div>
            {mediaError && <p className="text-sm text-destructive mb-3 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {mediaError}</p>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaItems.map((item) => {
                const isEditing = editingMedia === item.id;
                const isSelected = selectedMedia.has(item.id);
                return (
                  <div key={item.id} className={`bg-input/30 border rounded-lg overflow-hidden hover:border-primary/40 transition-colors ${isSelected ? 'border-primary border-2' : 'border-border/40'}`}>
                    {/* Preview Thumbnail */}
                    <div className="relative aspect-video bg-muted">
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelection = new Set(selectedMedia);
                            if (e.target.checked) {
                              newSelection.add(item.id);
                            } else {
                              newSelection.delete(item.id);
                            }
                            setSelectedMedia(newSelection);
                          }}
                          className="w-5 h-5 rounded border-2 border-white/60 bg-black/40 backdrop-blur-sm cursor-pointer accent-primary"
                        />
                      </div>
                      {item.thumbnail ? (
                        <img 
                          src={getMediaUrl(item.thumbnail)} 
                          alt={item.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center ${item.thumbnail ? 'hidden' : ''}`}>
                        {item.type === "video" ? 
                          <Film className="h-12 w-12 text-muted-foreground/40" /> : 
                          <Image className="h-12 w-12 text-muted-foreground/40" />
                        }
                      </div>
                      {/* Type Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/20">
                          {item.type === "video" ? "VIDEO" : "PHOTO"}
                        </span>
                      </div>
                      {/* Status Badge */}
                      <div className="absolute bottom-2 right-2">
                        <span className={`text-[10px] px-2 py-1 rounded-full backdrop-blur-sm border ${
                          item.status === "ready" 
                            ? "bg-primary/20 border-primary/30 text-primary" 
                            : "bg-destructive/20 border-destructive/30 text-destructive"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Title *</label>
                            <input value={editMediaTitle} onChange={(e) => setEditMediaTitle(e.target.value)} maxLength={200}
                              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring mt-1" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Tagline</label>
                            <input value={editMediaTagline} onChange={(e) => setEditMediaTagline(e.target.value)}
                              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring mt-1" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Description</label>
                            <textarea value={editMediaDesc} onChange={(e) => setEditMediaDesc(e.target.value)} rows={2} maxLength={2000}
                              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none mt-1" />
                          </div>
                          
                          {/* Thumbnail Upload - especially for videos */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Thumbnail Image {item.type === "video" && <span className="text-primary">*</span>}
                            </label>
                            <label className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded text-sm hover:bg-card hover:border-primary/40 transition-colors cursor-pointer w-full justify-center">
                              <ImagePlus className="h-3.5 w-3.5" />
                              {uploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleThumbnailUpload(item.id, file);
                                }}
                                disabled={uploadingThumbnail}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.type === "video" 
                                ? "Upload a custom thumbnail to show before video preview" 
                                : "Upload a new thumbnail image"}
                            </p>
                            {editMediaThumbnail && (
                              <div className="mt-2">
                                <img src={getMediaUrl(editMediaThumbnail)} alt="Thumbnail preview" className="w-full h-20 object-cover rounded" />
                              </div>
                            )}
                          </div>

                          {/* Change Media File Button */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Change {item.type === "video" ? "Video" : "Photo"}</label>
                            <label className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded text-sm hover:bg-card hover:border-primary/40 transition-colors cursor-pointer w-full justify-center">
                              <Upload className="h-3.5 w-3.5" />
                              {uploadingMediaFile ? "Uploading..." : `Upload New ${item.type === "video" ? "Video" : "Photo"}`}
                              <input 
                                type="file" 
                                accept={item.type === "video" ? "video/*" : "image/*"}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleMediaFileUpload(item.id, file);
                                }}
                                disabled={uploadingMediaFile}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload a new file to replace the current {item.type === "video" ? "video" : "photo"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={async () => {
                              const r = await updateMediaItem(item.id, { title: editMediaTitle, description: editMediaDesc, tagline: editMediaTagline, sortRank: editMediaRank, thumbnail: editMediaThumbnail || undefined });
                              if (r.ok) { 
                                setEditingMedia(null); 
                                setMediaError(null); 
                                await refreshData(); 
                                toast.success("Changes saved!");
                              } else { 
                                setMediaError(r.error ?? "Failed."); 
                                toast.error(r.error ?? "Failed to save changes");
                              }
                            }} className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors">
                              Save
                            </button>
                            <button onClick={() => setEditingMedia(null)} className="flex-1 border border-border px-3 py-2 rounded text-sm hover:bg-card transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Featured Star Badge */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-sm truncate">{item.title}</h3>
                            {item.featured && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                ⭐ Featured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{item.category}</p>
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">{item.tagline}</p>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={async () => {
                                // Toggle featured status
                                const newFeaturedStatus = !item.featured;
                                const r = await updateMediaItem(item.id, { featured: newFeaturedStatus });
                                if (r.ok) {
                                  await refreshData();
                                  toast.success(newFeaturedStatus ? "Added to featured!" : "Removed from featured");
                                } else {
                                  toast.error("Failed to update featured status");
                                }
                              }}
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 rounded text-xs transition-colors ${
                                item.featured 
                                  ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20' 
                                  : 'border-border hover:bg-card hover:border-primary/40'
                              }`}
                              title={item.featured ? "Remove from featured" : "Mark as featured"}
                            >
                              ⭐ {item.featured ? "Featured" : "Feature"}
                            </button>
                            <button 
                              onClick={() => { 
                                setEditingMedia(item.id); 
                                setEditMediaTitle(item.title); 
                                setEditMediaDesc(item.description); 
                                setEditMediaTagline(item.tagline); 
                                setEditMediaRank(item.sortRank);
                                setEditMediaThumbnail(item.thumbnail || "");
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-border px-3 py-1.5 rounded text-xs hover:bg-card hover:border-primary/40 transition-colors">
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button 
                              onClick={() => setDeleteMediaTarget(item.id)}
                              className="inline-flex items-center justify-center gap-1.5 border border-border px-3 py-1.5 rounded text-xs hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {mediaItems.length === 0 && (
              <div className="text-center py-12">
                <Film className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No media items yet</p>
                <button 
                  onClick={() => { setTab("upload"); setAlbumSection("create"); }}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" /> Upload Your First Media
                </button>
              </div>
            )}
          </div>
          )}
        </AdminSubNavLayout>
      )}

      {tab === "upload" && <AdminUploadTab />}

      {tab === "profiles" && <ProfilesTab />}

      {/* ── Delete collection dialog — Req 8 AC5 ── */}
      {deleteColTarget && deleteColItem && (
        <ConfirmDialog
          title={`Delete "${deleteColItem.name}"?`}
          message={`This album contains ${mediaItems.filter((m) => m.category.toLowerCase() === deleteColItem.name.toLowerCase()).length} items.`}
          options={[
            { label: deleteColItem.parentId ? "Move items to parent album" : "Move items to Uncategorized", value: "move-to-parent" },
            { label: "Delete all contained items", value: "delete-items" },
          ]}
          onConfirm={async (option) => { 
            const name = deleteColItem.name;
            await deleteCollection(deleteColTarget, option as "delete-items" | "move-to-parent"); 
            setDeleteColTarget(null); 
            toast.success(`Album "${name}" deleted`);
          }}
          onCancel={() => setDeleteColTarget(null)}
        />
      )}

      {/* ── Delete media dialog — Req 8 AC1/2 ── */}
      {deleteMediaTarget && deleteMediaItemData && (
        <ConfirmDialog
          title={`Delete "${deleteMediaItemData.title}"?`}
          message="This will permanently remove this item and all associated files."
          onConfirm={async () => { 
            const name = deleteMediaItemData.title;
            const id = deleteMediaTarget;
            await deleteMediaItem(deleteMediaTarget); 
            setDeleteMediaTarget(null);
            setLastDeleted({ type: "media", id, name });
            toast.success(`"${name}" deleted`);
          }}
          onCancel={() => setDeleteMediaTarget(null)}
        />
      )}

      {/* ── Bulk Delete Dialog ── */}
      {bulkDeleteMode && selectedMedia.size > 0 && (
        <ConfirmDialog
          title={`Delete ${selectedMedia.size} items?`}
          message={`You are about to permanently delete ${selectedMedia.size} ${selectedMedia.size === 1 ? 'item' : 'items'} and all associated files.`}
          onConfirm={async () => { 
            const count = selectedMedia.size;
            const promises = Array.from(selectedMedia).map(id => deleteMediaItem(id));
            await Promise.all(promises);
            setBulkDeleteMode(false);
            setSelectedMedia(new Set());
            await refreshData();
            toast.success(`${count} ${count === 1 ? 'item' : 'items'} deleted`);
          }}
          onCancel={() => setBulkDeleteMode(false)}
        />
      )}

      {/* ── Undo banner ── */}
      {lastDeleted && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 bg-card border border-border rounded-lg px-5 py-3 shadow-[var(--shadow-card)] animate-in slide-in-from-bottom duration-300">
          <span className="text-sm text-muted-foreground">"{lastDeleted.name}" was deleted</span>
          <button
            onClick={() => { setLastDeleted(null); toast.info("Undo is not available for permanent deletions"); }}
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Dismiss
          </button>
          <button onClick={() => setLastDeleted(null)} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Live Preview Widget */}
      <LivePreview mediaItems={mediaItems} />
    </div>
  );
}

// ─── Romance Sub-Tabs ─────────────────────────────────────────────────────────
type RomanceSection = "letters" | "jar" | "moodboard" | "milestones" | "quiz" | "bucket" | "mood" | "greetings" | "playlist" | "weather" | "canvas";

function RomanceSubTabs() {
  const [section, setSection] = useState<RomanceSection>("letters");

  const sections: { id: RomanceSection; label: string; emoji: string; desc: string }[] = [
    { id: "letters",    label: "Love Letters",  emoji: "💌", desc: "Flip cards with handwritten notes" },
    { id: "jar",        label: "Love Jar",       emoji: "🫙", desc: "Reasons why you love her" },
    { id: "moodboard",  label: "Mood Board",     emoji: "🖼️", desc: "Aesthetic photo grid" },
    { id: "milestones", label: "First Times",    emoji: "✨", desc: "Relationship milestone timeline" },
    { id: "quiz",       label: "Quiz",           emoji: "🧠", desc: "How well do you know us? quiz questions" },
    { id: "bucket",     label: "Bucket List",    emoji: "🎯", desc: "Dreams and adventures to do together" },
    { id: "mood",       label: "Daily Mood",     emoji: "😊", desc: "Set today's mood and message" },
    { id: "greetings",  label: "Time Greetings", emoji: "🌙", desc: "Good morning/evening messages based on time" },
    { id: "playlist",   label: "Our Playlist",   emoji: "🎵", desc: "Songs that remind you of each other" },
    { id: "weather",    label: "Weather Widget", emoji: "🌤️", desc: "Show weather at your locations" },
    { id: "canvas",     label: "Shared Canvas",  emoji: "🎨", desc: "Draw together on a shared board" },
  ];

  return (
    <div>
      {/* Sub-nav */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              section === s.id
                ? "bg-primary/10 border-primary/50 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span>{s.emoji}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-6">
        {sections.find((s) => s.id === section)?.desc}
      </p>

      {section === "letters"    && <LoveLettersAdmin />}
      {section === "jar"        && <LoveJarAdmin />}
      {section === "moodboard"  && <MoodBoardAdmin />}
      {section === "milestones" && <MilestonesAdmin />}
      {section === "quiz"       && <QuizAdmin />}
      {section === "bucket"     && <BucketListAdmin />}
      {section === "mood"       && <MoodOfDayAdmin />}
      {section === "greetings"  && <GreetingsAdmin />}
      {section === "playlist"   && <PlaylistAdmin />}
      {section === "weather"    && <WeatherAdmin />}
      {section === "canvas"     && <CanvasAdmin />}
    </div>
  );
}
