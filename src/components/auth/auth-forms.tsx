"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = { status: "idle" };

type LoginFormProps = {
  next?: string;
  error?: string;
};

export function LoginForm({ next, error }: LoginFormProps) {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const message = error === "inactive" ? "Your account is inactive. Contact an administrator." : state.message;

  return (
    <form action={action} className="space-y-4">
      <input name="next" type="hidden" value={next ?? "/dashboard"} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Email
        </label>
        <Input autoComplete="email" id="email" name="email" placeholder="eli@example.com" required type="email" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          Password
        </label>
        <PasswordField />
      </div>
      {message ? (
        <p className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]">
          {message}
        </p>
      ) : null}
      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <Link className="block text-center text-sm font-medium text-primary hover:underline" href="/forgot-password">
        Forgot password?
      </Link>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Email
        </label>
        <Input autoComplete="email" id="email" name="email" placeholder="eli@example.com" required type="email" />
      </div>
      {state.message ? (
        <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">{state.message}</p>
      ) : null}
      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
      <Link className="block text-center text-sm font-medium text-primary hover:underline" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          New password
        </label>
        <PasswordField placeholder="New password" />
      </div>
      {state.message ? (
        <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">{state.message}</p>
      ) : null}
      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "Updating..." : "Update password"}
      </Button>
      <Link className="block text-center text-sm font-medium text-primary hover:underline" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
