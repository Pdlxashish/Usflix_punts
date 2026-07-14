/**
 * Account tab — partner invite and profile activity monitoring.
 * Authentication is handled by Clerk, including password management.
 */
import { PartnerInviteTab } from "@/components/admin/PartnerInviteTab";
import { ProfileActivitySection } from "@/components/admin/ProfileActivitySection";

export function AccountTab() {
  return (
    <div className="space-y-8">
      <PartnerInviteTab />
      <ProfileActivitySection />
    </div>
  );
}
