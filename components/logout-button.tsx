"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:text-foreground md:hover:bg-muted md:hover:text-foreground"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut />
      Keluar
    </Button>
  );
}
