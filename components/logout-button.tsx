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
      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:text-foreground md:hover:bg-muted md:hover:text-foreground"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut />
      {t.nav.logout}
    </Button>
  );
}
