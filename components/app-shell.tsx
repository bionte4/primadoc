"use client";

import {
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListTree,
  Menu,
  MessageSquareText,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitch } from "@/components/language-switch";
import { DocumentSearch } from "@/components/shell/document-search";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n/labels";
import { canAccessApprovalQueue, canManageUsers, type SessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavItem({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground lg:shadow-[inset_2px_0_0_0_var(--sidebar-primary)]"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")}
      />
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 px-2.5 pb-1 text-[10px] font-medium tracking-[0.16em] text-sidebar-foreground/40 uppercase first:mt-1">
      {children}
    </p>
  );
}

function ShellNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useI18n();
  const type = params.get("type");
  const scope = params.get("scope");
  const onPolicies = pathname.startsWith("/policies");
  const onApproval = pathname.startsWith("/approval");
  const showQueue = canAccessApprovalQueue(user.role);
  const showAdmin = canManageUsers(user.role);

  return (
    <>
      <SectionLabel>{t.nav.work}</SectionLabel>
      <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={LayoutDashboard}>
        {t.nav.home}
      </NavItem>
      <NavItem href="/policies?scope=mine" active={onPolicies && scope === "mine"} icon={FolderOpen}>
        {t.nav.mine}
      </NavItem>
      <NavItem href="/policies?type=POLICY" active={onPolicies && type === "POLICY" && scope !== "mine"} icon={FileText}>
        {t.nav.policy}
      </NavItem>
      <NavItem
        href="/policies?type=PROCEDURE"
        active={onPolicies && type === "PROCEDURE" && scope !== "mine"}
        icon={ListTree}
      >
        {t.nav.procedure}
      </NavItem>
      <NavItem
        href="/policies?type=TECHNICAL_GUIDE"
        active={onPolicies && type === "TECHNICAL_GUIDE" && scope !== "mine"}
        icon={BookOpen}
      >
        {t.nav.guide}
      </NavItem>
      {showQueue && (
        <>
          <SectionLabel>{t.nav.review}</SectionLabel>
          <NavItem href="/approval" active={onApproval && params.get("mine") !== "1"} icon={ClipboardCheck}>
            {t.nav.awaiting}
          </NavItem>
          <NavItem href="/approval?mine=1" active={onApproval && params.get("mine") === "1"} icon={MessageSquareText}>
            {t.nav.myReviews}
          </NavItem>
        </>
      )}
      <SectionLabel>{t.nav.account}</SectionLabel>
      <NavItem href="/settings" active={pathname === "/settings"} icon={Settings}>
        {t.nav.settings}
      </NavItem>
      {showAdmin && (
        <>
          <SectionLabel>{t.nav.admin}</SectionLabel>
          <NavItem href="/settings/users" active={pathname.startsWith("/settings/users") || pathname.startsWith("/users")} icon={Users}>
            {t.nav.users}
          </NavItem>
          <NavItem href="/admin/audit-logs" active={pathname.startsWith("/admin/audit-logs")} icon={ScrollText}>
            {t.nav.audit}
          </NavItem>
        </>
      )}
    </>
  );
}

export function AppShell({
  user,
  unreadReminders = 0,
  children,
}: {
  user: SessionUser;
  unreadReminders?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const displayName = user.name?.trim() || t.common.userFallback;
  const roleName = t.role[user.role];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:min-h-screen lg:border-r">
        <div className="flex items-center gap-2.5 px-3.5 py-3.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-none font-semibold tracking-tight">PrismaDoc</p>
            <p className="mt-1 truncate text-[11px] text-sidebar-foreground/55">{t.nav.product}</p>
          </div>
        </div>
        <nav
          aria-label={t.nav.main}
          className="flex flex-1 flex-col gap-0.5 px-2 pb-3"
        >
          <Suspense fallback={<p className="px-2.5 text-xs text-sidebar-foreground/50">{t.common.loadingMenu}</p>}>
            <ShellNav user={user} />
          </Suspense>
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-sidebar-border px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-medium text-sidebar-primary">
            {initials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{displayName}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">{roleName}</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b bg-card px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
          <button
            type="button"
            className="touch-target hidden h-8 items-center gap-1.5 rounded-md px-2 text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:inline-flex lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" />
            {t.nav.openMenu}
          </button>
          <DocumentSearch />
          <div className="flex items-center justify-end gap-1">
            <LanguageSwitch />
            <Link
              href="/notifications"
              aria-label={unreadReminders > 0 ? fill(t.nav.remindersUnread, { count: unreadReminders }) : t.nav.reminders}
              className="relative inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Bell className="size-3.5" />
              <span className="hidden sm:inline">{t.nav.reminders}</span>
              {unreadReminders > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {unreadReminders}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              aria-label={fill(t.nav.profile, { name: displayName, role: roleName })}
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className="inline-flex h-8 items-center gap-2 rounded-lg px-1.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary dark:bg-primary/20">
                {initials(displayName)}
              </span>
              <span className="hidden max-w-32 truncate text-xs font-medium lg:inline">{displayName}</span>
              <Badge variant="secondary">{roleName}</Badge>
            </Link>
            <LogoutButton />
          </div>
        </header>
        <main className="w-full min-w-0 flex-1 px-3 pt-3 pb-20 sm:px-5 sm:py-4">{children}</main>
      </div>
      <PhoneBar user={user} onMore={() => setMenuOpen(true)} />
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label={t.nav.closeMenu} onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-16 max-h-[70dvh] overflow-auto bg-sidebar text-sidebar-foreground shadow-lg sm:inset-y-0 sm:bottom-0 sm:left-0 sm:w-72 sm:max-h-none sm:border-r sm:border-sidebar-border">
            <nav aria-label={t.nav.main} className="flex flex-col gap-0.5 p-3" onClick={() => setMenuOpen(false)}>
              <Suspense fallback={<p className="px-2.5 text-xs text-sidebar-foreground/50">{t.common.loadingMenu}</p>}>
                <ShellNav user={user} />
              </Suspense>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneBar({ user, onMore }: { user: SessionUser; onMore: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const showQueue = canAccessApprovalQueue(user.role);
  const onPolicies = pathname.startsWith("/policies");
  const onApproval = pathname.startsWith("/approval");

  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <PhoneLink href="/dashboard" active={pathname === "/dashboard"} icon={LayoutDashboard}>
        {t.nav.home}
      </PhoneLink>
      <PhoneLink href="/policies" active={onPolicies} icon={FileText}>
        {t.nav.documents}
      </PhoneLink>
      {showQueue ? (
        <PhoneLink href="/approval" active={onApproval} icon={ClipboardCheck}>
          {t.nav.review}
        </PhoneLink>
      ) : (
        <PhoneLink href="/settings" active={pathname.startsWith("/settings")} icon={Settings}>
          {t.nav.settings}
        </PhoneLink>
      )}
      <button
        type="button"
        onClick={onMore}
        className="touch-target flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] text-muted-foreground"
      >
        <Menu className="size-4" />
        {t.nav.more}
      </button>
    </nav>
  );
}

function PhoneLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "touch-target flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
        active ? "font-medium text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
