import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      subtitle="Choose a new password after opening a valid reset link."
      title="Create a new password"
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
