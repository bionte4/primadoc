"use client";

import { ClipboardCheck, FileText, LayoutDashboard, ScrollText, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/constants";
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
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground md:shadow-[inset_2px_0_0_0_var(--sidebar-primary)]"
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
    <p className="mt-4 hidden px-2.5 pb-1 text-[10px] font-medium tracking-[0.16em] text-sidebar-foreground/40 uppercase first:mt-1 md:block">
      {children}
    </p>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dashboardActive = pathname === "/dashboard";
  const policiesActive = pathname.startsWith("/policies");
  const approvalActive = pathname.startsWith("/approval");
  const usersActive = pathname.startsWith("/users");
  const auditActive = pathname.startsWith("/admin/audit-logs");
  const showAdmin = canManageUsers(user.role);

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:min-h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-3.5 py-3.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-none font-semibold tracking-tight">PrismaDoc</p>
            <p className="mt-1 truncate text-[11px] text-sidebar-foreground/55">Kebijakan perusahaan</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 px-2 pb-2 md:flex-1 md:flex-col md:flex-nowrap md:gap-0.5 md:px-2 md:pb-3">
          <SectionLabel>Kerja</SectionLabel>
          <NavItem href="/dashboard" active={dashboardActive} icon={LayoutDashboard}>
            Dashboard
          </NavItem>
          <NavItem href="/policies" active={policiesActive} icon={FileText}>
            Daftar kebijakan
          </NavItem>
          {canAccessApprovalQueue(user.role) && (
            <NavItem href="/approval" active={approvalActive} icon={ClipboardCheck}>
              Persetujuan
            </NavItem>
          )}
          {showAdmin && (
            <>
              <SectionLabel>Administrasi</SectionLabel>
              <NavItem href="/users" active={usersActive} icon={Users}>
                Pengguna
              </NavItem>
              <NavItem href="/admin/audit-logs" active={auditActive} icon={ScrollText}>
                Audit log
              </NavItem>
            </>
          )}
        </nav>
        <div className="mt-auto hidden items-center gap-2.5 border-t border-sidebar-border px-3 py-3 md:flex">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-medium text-sidebar-primary">
            {initials(user.name || "?")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 items-center justify-between border-b bg-card px-4 md:px-5">
          <p className="text-xs text-muted-foreground">Manajemen kebijakan</p>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs sm:inline">
              {user.name}
              <span className="text-muted-foreground"> · {ROLE_LABEL[user.role]}</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-3 py-3 md:px-5 md:py-4">{children}</main>
      </div>
    </div>
  );
}
