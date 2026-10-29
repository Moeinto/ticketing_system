"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  Inbox,
  PlusCircle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  LifeBuoy,
} from "lucide-react";
import { LABELS } from "@/lib/constants";
import type { Me, View } from "@/lib/types";
import { LoginView } from "./login-view";
import { DashboardView } from "./dashboard-view";
import { TicketsView } from "./tickets-view";
import { NewTicketView } from "./new-ticket-view";
import { TicketDetailView } from "./ticket-detail-view";
import { ReportsView } from "./reports-view";
import { AdminView } from "./admin-view";

const NAV: { view: View; label: string; icon: typeof LayoutDashboard; roles: string[] }[] = [
  { view: "dashboard", label: "داشبورد", icon: LayoutDashboard, roles: ["REQUESTER", "AGENT", "LEAD", "ADMIN"] },
  { view: "my-tickets", label: "درخواست‌های من", icon: TicketIcon, roles: ["REQUESTER", "AGENT", "LEAD", "ADMIN"] },
  { view: "queue", label: "صف پشتیبانی", icon: Inbox, roles: ["AGENT", "LEAD", "ADMIN"] },
  { view: "new", label: "ثبت درخواست جدید", icon: PlusCircle, roles: ["REQUESTER", "AGENT", "LEAD", "ADMIN"] },
  { view: "reports", label: "گزارش‌ها", icon: BarChart3, roles: ["AGENT", "LEAD", "ADMIN"] },
  { view: "admin", label: "مدیریت سامانه", icon: Settings, roles: ["ADMIN"] },
];

export function TicketingApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setMe(data.user);
      } else {
        setMe(null);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // پشتیبانی از توکن نشست در هدر — وقتی مرورگر در بستر iframe/پروکسی
    // کوکی را ذخیره نمی‌کند، توکن از localStorage به همه درخواست‌های /api/
    // اضافه می‌شود تا احراز هویت همیشه کار کند.
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.startsWith("/api/")) {
        let token: string | null = null;
        try { token = localStorage.getItem("its_session_token"); } catch {}
        if (token) {
          const headers: Record<string, string> = {};
          const prev = init?.headers;
          if (prev) {
            if (typeof Headers !== "undefined" && prev instanceof Headers) {
              prev.forEach((v, k) => { headers[k] = v; });
            } else {
              Object.assign(headers, prev as Record<string, string>);
            }
          }
          headers["x-session-token"] = token;
          init = { ...init, headers };
        }
      }
      return origFetch(input, init);
    };
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  async function logout() {
    try { localStorage.removeItem("its_session_token"); } catch {}
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    setView("dashboard");
    setSelectedTicketId(null);
  }

  function openTicket(id: string) {
    setSelectedTicketId(id);
    setView("ticket");
    setMobileOpen(false);
  }

  function navigate(v: View) {
    setView(v);
    setMobileOpen(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">در حال بارگذاری سامانه…</p>
        </div>
      </div>
    );
  }

  if (!me) return <LoginView onLogin={(u) => setMe(u)} />;

  const isSupport = me.role === "AGENT" || me.role === "LEAD" || me.role === "ADMIN";
  const navItems = NAV.filter((n) => n.roles.includes(me.role));

  const navList = (
    <nav className="flex flex-col gap-1" aria-label="منوی اصلی">
      {navItems.map((item) => {
        const active =
          view === item.view ||
          (item.view === "my-tickets" && view === "ticket" && selectedTicketId && !isSupport);
        return (
          <button
            key={item.view}
            onClick={() => navigate(item.view)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-right ${
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  const currentLabel = view === "ticket" ? "جزئیات درخواست" : NAV.find((n) => n.view === view)?.label ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* نوار بالایی */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* منوی موبایل */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="باز کردن منو">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-4">
                <SheetTitle className="sr-only">منوی سامانه</SheetTitle>
                <div className="flex items-center gap-2 mb-6 mt-2">
                  <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <span className="font-extrabold">سامانه تیکتینگ</span>
                </div>
                {navList}
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground items-center justify-center hidden lg:flex">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="font-extrabold text-foreground">سامانه تیکتینگ سازمانی</p>
                <p className="text-[11px] text-muted-foreground">{currentLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSupport && (
              <Button onClick={() => navigate("new")} className="hidden sm:inline-flex" size="sm">
                <PlusCircle className="h-4 w-4" />
                درخواست جدید
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 pl-2 hover:bg-accent transition-colors" aria-label="منوی کاربر">
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold leading-tight">{me.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{LABELS[me.role]}</p>
                  </div>
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {me.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-bold">{me.name}</p>
                  <p className="text-xs text-muted-foreground font-normal" dir="ltr">{me.email}</p>
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    {LABELS[me.role]}
                    {me.teamName ? ` — تیم ${me.teamName}` : ""}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  خروج از حساب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* سایدبار دسکتاپ */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l bg-sidebar p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          {navList}
          <Separator className="my-4" />
          <div className="mt-auto rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground leading-6">
            <p className="font-bold text-foreground mb-1">پشتیبانی فنی داخلی</p>
            برای ثبت درخواست، از فرم استاندارد «ثبت درخواست جدید» استفاده کنید.
          </div>
        </aside>

        {/* محتوای اصلی */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <div className="max-w-6xl mx-auto w-full">
            {view === "dashboard" && <DashboardView me={me} onNavigate={navigate} onOpenTicket={openTicket} />}
            {view === "my-tickets" && <TicketsView me={me} scope="mine" onOpenTicket={openTicket} refreshKey={0} />}
            {view === "queue" && <TicketsView me={me} scope="queue" onOpenTicket={openTicket} refreshKey={0} />}
            {view === "new" && <NewTicketView me={me} onCreated={(id) => openTicket(id)} />}
            {view === "ticket" && selectedTicketId && (
              <TicketDetailView
                me={me}
                ticketId={selectedTicketId}
                onBack={() => navigate(isSupport ? "queue" : "my-tickets")}
              />
            )}
            {view === "reports" && <ReportsView />}
            {view === "admin" && <AdminView me={me} />}
          </div>
        </main>
      </div>

      {/* فوتر چسبیده به پایین */}
      <footer className="mt-auto border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>سامانه مدیریت درخواست و تیکتینگ سازمانی — نسخه ۱.۰ (MVP)</p>
          <p>فاز نخست: پشتیبانی فنی داخلی سازمان</p>
        </div>
      </footer>
    </div>
  );
}
