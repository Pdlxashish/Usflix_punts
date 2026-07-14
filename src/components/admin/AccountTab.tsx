/**
 * Account tab — partner invite, password security + profile activity monitoring.
 */
import { ChangePasswordTab } from "@/components/admin/ChangePasswordTab";
import { PartnerInviteTab } from "@/components/admin/PartnerInviteTab";
import { ProfileActivitySection } from "@/components/admin/ProfileActivitySection";

export function AccountTab() {
  return (
    <div className="space-y-8">
      <PartnerInviteTab />
      <ChangePasswordTab />
      <ProfileActivitySection />
    </div>
  );
}
