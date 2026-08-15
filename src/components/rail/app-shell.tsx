import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Route as RouteIcon,
  Search,
  Settings,
  Trophy,
  TrainFront,
  User as UserIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getApiBase } from "@/lib/rail/api";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/search", label: "Search Trains", icon: Search },
  { to: "/live", label: "Live Tracking", icon: Activity },
  { to: "/predict", label: "Delay Prediction", icon: Brain },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/rankings", label: "Train Rankings", icon: Trophy },
  { to: "/alternatives", label: "Alternatives", icon: RouteIcon },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[7]];

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="RailSense home">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <TrainFront className="size-4.5" />
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold tracking-tight">RailSense</span>
          <span className="label-meta block truncate text-[10px]">Karnataka Rail AI</span>
        </span>
      ) : null}
    </Link>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Tooltip key={to}>
          <TooltipTrigger asChild>
            <Link
              to={to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 h-6 w-0.5 rounded-r-full bg-primary transition-all duration-200",
                      isActive ? "opacity-100" : "scale-y-0 opacity-0",
                    )}
                  />
                  <Icon className={cn("size-4.5 shrink-0", isActive && "text-primary")} />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                </>
              )}
            </Link>
          </TooltipTrigger>
          {collapsed ? <TooltipContent side="right">{label}</TooltipContent> : null}
        </Tooltip>
      ))}
    </nav>
  );
}

function SystemStatus() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const base = getApiBase();
      if (!base) return { label: "System online", tone: "success" as const };
      try {
        const res = await fetch(`${base}/api/health`);
        if (!res.ok) throw new Error("bad");
        return { label: "Flask backend live", tone: "success" as const };
      } catch {
        return { label: "Backend unreachable", tone: "danger" as const };
      }
    },
    refetchInterval: 60_000,
  });

  const tone = data?.tone ?? "success";
  return (
    <span className="hidden items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 lg:inline-flex">
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-2 rounded-full opacity-75",
            tone === "success" ? "bg-success" : "bg-destructive",
          )}
          style={{ animation: "pulse-ring 2s ease-out infinite" }}
        />
        <span
          className={cn("relative inline-flex size-2 rounded-full", tone === "success" ? "bg-success" : "bg-destructive")}
        />
      </span>
      <span className="font-mono text-[11px] tracking-wide uppercase">{data?.label ?? "Connecting"}</span>
    </span>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  return (
    <span className="hidden font-mono text-xs text-muted-foreground md:inline">
      {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ·{" "}
      {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST
    </span>
  );
}

function UserMenu() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (loading) return <div className="size-9 animate-pulse rounded-full bg-secondary" />;

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/auth">Sign in</Link>
      </Button>
    );
  }

  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid size-9 place-items-center rounded-full border border-border bg-secondary font-mono text-xs font-bold"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <UserIcon className="size-4" /> Profile & settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/notifications">
            <Bell className="size-4" /> Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => pathname.startsWith(n.to));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen w-full bg-background">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-300 lg:flex",
            collapsed ? "w-[76px]" : "w-64",
          )}
        >
          <div className={cn("flex items-center justify-between px-1 py-2", collapsed && "justify-center")}>
            <Brand collapsed={collapsed} />
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">
            <NavList collapsed={collapsed} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            className="mt-2 justify-center text-muted-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("size-4 transition-transform duration-300", collapsed && "rotate-180")} />
            {!collapsed ? <span className="ml-1 text-xs">Collapse</span> : null}
          </Button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <div className="mb-6">
                      <Brand />
                    </div>
                    <NavList onNavigate={() => setMobileOpen(false)} />
                  </SheetContent>
                </Sheet>
                <div className="lg:hidden">
                  <Brand collapsed />
                </div>
                <p className="hidden min-w-0 truncate text-sm font-semibold lg:block">
                  {current?.label ?? "RailSense"}
                </p>
              </div>

              <div className="flex justify-center">
                <SystemStatus />
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <Clock />
                <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Link to="/notifications">
                    <Bell className="size-4.5" />
                  </Link>
                </Button>
                <UserMenu />
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
          aria-label="Primary mobile"
        >
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" />
              <span className="truncate px-1">{label.split(" ")[0]}</span>
            </Link>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}
