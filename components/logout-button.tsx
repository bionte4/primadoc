"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function LogoutButton() {
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="touch-target text-foreground"
      aria-label={t.nav.logout}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut />
      <span className="hidden sm:inline">{t.nav.logout}</span>
    </Button>
  );
}
