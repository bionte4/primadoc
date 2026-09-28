"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_PASSWORD, ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.email("Masukkan email yang valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS: { role: Role; email: string; name: string }[] = [
  { role: "STAFF", name: "Anita Putri", email: "staff@prismadoc.local" },
  { role: "REVIEWER", name: "Budi Santoso", email: "reviewer@prismadoc.local" },
  { role: "APPROVER", name: "Citra Wijaya", email: "approver@prismadoc.local" },
  { role: "ADMIN", name: "Dimas Hartono", email: "admin@prismadoc.local" },
];

export function LoginForm({
  callbackUrl = "/policies",
  workplaceProviders = [],
  workplaceError = null,
}: {
  callbackUrl?: string;
  workplaceProviders?: { id: string; label: string }[];
  workplaceError?: string | null;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
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
      setFormError("Email atau kata sandi tidak sesuai.");
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
                {pendingProvider === provider.id ? "Mengalihkan..." : provider.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            atau akun lokal
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
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
        <Label htmlFor="password">Kata sandi</Label>
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
        {form.formState.isSubmitting ? "Memeriksa..." : "Masuk"}
      </Button>
      <div className="rounded-lg border bg-muted/40 p-2">
        <p className="px-2 text-[11px] font-medium text-muted-foreground">
          Akun percobaan · kata sandi {DEMO_PASSWORD}
        </p>
        <ul className="mt-1">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[13px] hover:bg-background"
                onClick={() => {
                  form.setValue("email", account.email, { shouldValidate: true });
                  form.setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                }}
              >
                <span>{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABEL[account.role]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
    </div>
  );
}
