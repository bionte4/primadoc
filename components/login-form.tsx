"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginFailureHint } from "@/actions/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n/labels";
import type { Role } from "@prisma/client";

type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

function loginSchema(email: string, password: string) {
  return z.object({
    email: z.email(email),
    password: z.string().min(1, password),
  });
}

export function LoginForm({
  callbackUrl = "/policies",
  workplaceProviders = [],
  workplaceError = null,
  demoPassword = null,
  demoAccounts = null,
}: {
  callbackUrl?: string;
  workplaceProviders?: { id: string; label: string }[];
  workplaceError?: string | null;
  demoPassword?: string | null;
  demoAccounts?: { role: Role; email: string; name: string }[] | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const schema = useMemo(
    () => loginSchema(t.validation.email, t.validation.passwordRequired),
    [t],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      const hint = await loginFailureHint(values.email);
      setFormError(hint === "locked" ? t.login.locked : t.login.mismatch);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {workplaceError && <p className="text-sm text-destructive">{workplaceError}</p>}
      {workplaceProviders.length > 0 && (
        <>
          <div className="space-y-2">
            {workplaceProviders.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="w-full"
                disabled={pendingProvider !== null}
                onClick={() => {
                  setPendingProvider(provider.id);
                  void signIn(provider.id, { callbackUrl });
                }}
              >
                {pendingProvider === provider.id ? t.login.redirecting : provider.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t.login.orLocal}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">{t.login.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-9"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.login.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-9"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? t.login.checking : t.login.submit}
      </Button>
      {demoPassword && demoAccounts ? (
      <div className="rounded-lg border bg-muted/40 p-2">
        <p className="px-2 text-[11px] font-medium text-muted-foreground">
          {fill(t.login.demo, { password: demoPassword })}
        </p>
        <ul className="mt-1">
          {demoAccounts.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[13px] hover:bg-background"
                onClick={() => {
                  form.setValue("email", account.email, { shouldValidate: true });
                  form.setValue("password", demoPassword, { shouldValidate: true });
                }}
              >
                <span>{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.role[account.role]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      ) : null}
    </form>
    </div>
  );
}
