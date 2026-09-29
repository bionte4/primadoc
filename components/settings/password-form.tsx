"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, startTransition } from "react";
import { changePassword, type PasswordState } from "@/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const { t } = useI18n();
  const router = useRouter();
  const nextPassword = useRef("");
  const signingIn = useRef(false);

  useEffect(() => {
    if (!state.ok || signingIn.current) return;
    const password = nextPassword.current;
    if (!password) return;
    signingIn.current = true;
    void (async () => {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    })();
  }, [email, router, state.ok]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        nextPassword.current = String(data.get("password") ?? "");
        startTransition(() => {
          action(data);
        });
      }}
      className="grid gap-3"
    >
      <div className="space-y-1">
        <Label htmlFor="current">{t.settings.currentPassword}</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required className="h-9" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">{t.settings.newPassword}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="h-9"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm">{t.settings.confirmPassword}</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="h-9" />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending || state.ok}>
        {pending || state.ok ? t.common.saving : t.settings.changePassword}
      </Button>
    </form>
  );
}
