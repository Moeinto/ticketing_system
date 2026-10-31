"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox,
  Clock,
  CheckCircle2,
  PlusCircle,
  ChevronLeft,
  AlertTriangle,
  Ticket as TicketIcon,
} from "lucide-react";
import { LABELS, formatFaDate, isOpen } from "@/lib/constants";
import type { Me, TicketListItem, TicketListResponse, View } from "@/lib/types";
import { StatusBadge, PriorityBadge, TypeBadge, EmptyState, faNum } from "./shared";

export function DashboardView({
  me,
  onNavigate,
  onOpenTicket,
}: {
  me: Me;
  onNavigate: (v: View) => void;
  onOpenTicket: (id: string) => void;
}) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [stats, setStats] = useState<{ openCount: number; newCount: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupport = me.role !== "REQUESTER";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tickets?pageSize=6&sort=updatedAt&dir=desc");
        if (res.ok) {
          const data: TicketListResponse = await res.json();
          setTickets(data.tickets);
          setStats({ openCount: data.openCount, newCount: data.newCount, total: data.total });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openTickets = tickets.filter((t) => isOpen(t.status));
  const urgent = openTickets.filter((t) => t.priority === "P1" || t.priority === "P2");

  const cards = isSupport
    ? [
        { label: "کل درخواست‌ها", value: stats?.total, icon: Inbox, tone: "text-primary bg-primary/10" },
        { label: "درخواست‌های باز", value: stats?.openCount, icon: Clock, tone: "text-amber-600 bg-amber-100" },
        { label: "جدید بدون بررسی", value: stats?.newCount, icon: AlertTriangle, tone: "text-rose-600 bg-rose-100" },
      ]
    : [
        { label: "کل درخواست‌های من", value: stats?.total, icon: TicketIcon, tone: "text-primary bg-primary/10" },
        { label: "در جریان", value: stats?.openCount, icon: Clock, tone: "text-amber-600 bg-amber-100" },
        {
          label: "حل‌شده",
          value: stats ? stats.total - stats.openCount : undefined,
          icon: CheckCircle2,
          tone: "text-teal-600 bg-teal-100",
        },
      ];

  return (
    <div className="space-y-6">
      {/* خوش‌آمد */}
      <div className="rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl font-extrabold mb-1">سلام {me.name.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground">
          {isSupport
            ? "درخواست‌های باز تیم را بررسی کنید و به موارد بحرانی رسیدگی کنید."
            : "درخواست جدید ثبت کنید یا وضعیت درخواست‌های قبلی‌تان را پیگیری کنید."}
        </p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onNavigate("new")} size="sm">
            <PlusCircle className="h-4 w-4" />
            ثبت درخواست جدید
          </Button>
          <Button onClick={() => onNavigate(isSupport ? "queue" : "my-tickets")} size="sm" variant="outline">
            مشاهده {isSupport ? "صف پشتیبانی" : "درخواست‌های من"}
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/70">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.tone}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold num">
                  {c.value === undefined ? <Skeleton className="h-8 w-10" /> : faNum(c.value)}
                </div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* موارد فوری (فقط پشتیبانی) */}
      {isSupport && urgent.length > 0 && (
        <Card className="border-rose-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              درخواست‌های فوری باز (P1 و P2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgent.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTicket(t.id)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-right hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">
                    <span className="text-muted-foreground num ml-1" dir="ltr">TKT-{String(t.number).padStart(4, "0")}</span>
                    {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.serviceName} — {LABELS[t.type]}
                  </p>
                </div>
                <PriorityBadge priority={t.priority} />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* آخرین درخواست‌ها */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">آخرین فعالیت‌ها</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate(isSupport ? "queue" : "my-tickets")}>
            مشاهده همه
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : tickets.length === 0 ? (
            <EmptyState title="هنوز درخواستی ثبت نشده" subtitle="اولین درخواست خود را ثبت کنید" />
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTicket(t.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-right hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">
                    <span className="text-muted-foreground num ml-1" dir="ltr">
                      TKT-{String(t.number).padStart(4, "0")}
                    </span>
                    {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.serviceName} — آخرین تغییر: {formatFaDate(t.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TypeBadge type={t.type} />
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
