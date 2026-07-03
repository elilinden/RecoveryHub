import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      subtitle="Enter your internal account email and Recovery Hub will send a reset link when the account exists."
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
