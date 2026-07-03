import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/auth-forms";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthCard
      subtitle="Sign in with your internal firm account. New users are invited by an administrator."
      title="Sign in"
    >
      <LoginForm error={params?.error} next={params?.next} />
    </AuthCard>
  );
}
