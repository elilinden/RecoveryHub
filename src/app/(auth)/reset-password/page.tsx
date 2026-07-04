import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { ConfirmAuthLinkForm } from "@/components/auth/confirm-auth-link-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{ token_hash?: string; type?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const tokenHash = params.token_hash;
  const type = params.type === "invite" ? "invite" : params.type === "recovery" ? "recovery" : null;

  if (tokenHash && type) {
    return (
      <AuthCard
        subtitle={type === "invite" ? "Accept your invitation to Recovery Hub." : "Confirm your password reset request."}
        title={type === "invite" ? "You're invited" : "Reset your password"}
      >
        <ConfirmAuthLinkForm tokenHash={tokenHash} type={type} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      subtitle="Choose a new password after opening a valid reset or invitation link."
      title="Create a new password"
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
