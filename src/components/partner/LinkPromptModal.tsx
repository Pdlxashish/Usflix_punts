/**
 * LinkPromptModal
 * Modal prompting users to link with their partner.
 * Shows tabs for Search, Enter Code, and Generate Code/QR.
 */
import { useState, useEffect } from "react";
import { X, Search, Key, QrCode } from "lucide-react";
import { useLinkStatus } from "@/context/link-status";
import { PartnerSearch } from "./PartnerSearch";
import { InviteCodeGenerator } from "./InviteCodeGenerator";
import { AcceptInvite } from "./AcceptInvite";

interface LinkPromptModalProps {
  onClose?: () => void;
}

type TabType = "search" | "enter-code" | "generate";

export function LinkPromptModal({ onClose }: LinkPromptModalProps) {
  const { isLinked, isLoading } = useLinkStatus();
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed the modal in this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem("linkPromptDismissed");
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("linkPromptDismissed", "true");
    setDismissed(true);
    onClose?.();
  };

  const handleLinkSuccess = () => {
    // Clear dismissal flag on successful link
    sessionStorage.removeItem("linkPromptDismissed");
    onClose?.();
  };

  // Don't show if loading, already linked, or dismissed
  if (isLoading || isLinked || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-foreground">Link with Your Partner</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect your accounts to share memories, activities, and more
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "search"
                ? "text-foreground border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Search className="h-4 w-4" />
            Search Partner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("enter-code")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "enter-code"
                ? "text-foreground border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Key className="h-4 w-4" />
            Enter Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("generate")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "generate"
                ? "text-foreground border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <QrCode className="h-4 w-4" />
            Generate Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === "search" && <PartnerSearch onSuccess={handleLinkSuccess} />}
          {activeTab === "enter-code" && <AcceptInvite onSuccess={handleLinkSuccess} />}
          {activeTab === "generate" && <InviteCodeGenerator onSuccess={handleLinkSuccess} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
