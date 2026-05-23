import { useState } from "react";
import { Upload, FileImage } from "lucide-react";
import { QuickUploadTab } from "@/components/admin/QuickUploadTab";
import { UploadTab } from "@/components/admin/UploadTab";
import { AdminSubNavLayout, type AdminNavSection } from "@/components/admin/AdminSubNavLayout";

type UploadSection = "quick" | "detailed";

const SECTIONS: AdminNavSection<UploadSection>[] = [
  {
    id: "quick",
    label: "Quick Upload",
    shortLabel: "Quick",
    icon: Upload,
    description: "Drop files — auto titles and album placement",
  },
  {
    id: "detailed",
    label: "Detailed Upload",
    shortLabel: "Detail",
    icon: FileImage,
    description: "Full metadata: title, tagline, album, and more",
  },
];

export function AdminUploadTab() {
  const [mode, setMode] = useState<UploadSection>("quick");

  return (
    <AdminSubNavLayout sections={SECTIONS} active={mode} onSelect={setMode} navLabel="Upload">
      <div className="min-w-0 overflow-hidden">
        {mode === "quick" ? <QuickUploadTab /> : <UploadTab />}
      </div>
    </AdminSubNavLayout>
  );
}
