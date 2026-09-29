"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

export function SettingsNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const links = [
    { href: "/settings", label: t.settings.profile },
    { href: "/settings/users", label: t.settings.users },
    { href: "/settings/roles", label: t.settings.roles },
    { href: "/settings/organization", label: t.settings.organization },
    { href: "/settings/integrations", label: t.settings.integrations },
  ] as const;

  return (
    <nav aria-label={t.settings.nav} className="flex flex-wrap gap-1">
      {links.map((link) => {
        const active = link.href === "/settings" ? pathname === "/settings" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-foreground/10 hover:bg-muted",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
