/**
 * Account tab — password security + profile activity monitoring.
 */
import { ChangePasswordTab } from "@/components/admin/ChangePasswordTab";
import { ProfileActivitySection } from "@/components/admin/ProfileActivitySection";

export function AccountTab() {
  return (
    <div className="space-y-8">
      <ChangePasswordTab />
      <ProfileActivitySection />
    </div>
  );
}
