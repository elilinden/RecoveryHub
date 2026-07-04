import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { InviteSessionBridge } from "@/components/auth/invite-session-bridge";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      subtitle="Choose a new password after opening a valid reset or invitation link."
      title="Create a new password"
    >
      <div className="mb-4">
        <InviteSessionBridge />
      </div>
      <ResetPasswordForm />
    </AuthCard>
  );
}
