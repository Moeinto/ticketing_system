"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, CheckCircle2, RotateCcw, UserX, BarChart3 } from "lucide-react";
import { LABELS, STATUSES, TICKET_TYPES, formatDuration } from "@/lib/constants";
import type { ReportsData } from "@/lib/types";
import { STATUS_STYLES, faNum } from "./shared";

export function ReportsView() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reports/overview");
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-muted-foreground py-10">گزارشی برای نمایش وجود ندارد</p>;
  }

  const maxStatus = Math.max(1, ...Object.values(data.byStatus));
  const maxType = Math.max(1, ...Object.values(data.byType));
  const teamEntries = Object.entries(data.byTeam).sort((a, b) => b[1] - a[1]);
  const maxTeam = Math.max(1, ...teamEntries.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold">گزارش‌های عملیاتی</h1>
        <p className="text-sm text-muted-foreground mt-1">
          گزارش‌های پایه نسخه اول — تمام شاخص‌ها از رویدادهای ثبت‌شده در سامانه محاسبه می‌شوند.
        </p>
      </div>

      {/* شاخص‌های کلیدی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Timer}
          label="میانگین زمان اولین پاسخ"
          value={formatDuration(data.avgFirstResponseMinutes)}
        />
        <KpiCard
          icon={CheckCircle2}
          label="میانگین زمان حل"
          value={formatDuration(data.avgResolutionMinutes)}
        />
        <KpiCard
          icon={RotateCcw}
          label="نرخ بازگشایی"
          value={data.reopenRate == null ? "—" : `٪${faNum(Math.round(data.reopenRate * 100))}`}
        />
        <KpiCard
          icon={UserX}
          label="باز بدون مسئول"
          value={faNum(data.unassignedOpen)}
          highlight={data.unassignedOpen > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* بر اساس وضعیت */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تعداد تیکت بر اساس وضعیت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUSES.map((s) => (
              <div key={s}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{LABELS[s]}</span>
                  <span className="num text-muted-foreground">{faNum(data.byStatus[s] ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STATUS_STYLES[s]?.split(" ")[0] ?? "bg-zinc-200"}`}
                    style={{ width: `${((data.byStatus[s] ?? 0) / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* بر اساس نوع */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تعداد تیکت بر اساس نوع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TICKET_TYPES.map((t) => (
              <div key={t}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{LABELS[t]}</span>
                  <span className="num text-muted-foreground">{faNum(data.byType[t] ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${((data.byType[t] ?? 0) / maxType) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* بر اساس تیم */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تعداد تیکت بر اساس تیم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamEntries.length === 0 && <p className="text-sm text-muted-foreground">داده‌ای موجود نیست</p>}
            {teamEntries.map(([team, count]) => (
              <div key={team}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{team}</span>
                  <span className="num text-muted-foreground">{faNum(count)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500/70"
                    style={{ width: `${(count / maxTeam) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* بر اساس کارشناس */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تعداد تیکت بر اساس کارشناس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.byAgent).sort((a, b) => b[1] - a[1]).map(([agent, count]) => (
              <div key={agent} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{agent}</span>
                <span className="num text-sm font-extrabold text-primary">{faNum(count)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-rose-300 bg-rose-50/50" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className={`h-4 w-4 ${highlight ? "text-rose-600" : "text-primary"}`} />
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-xl font-extrabold">{value}</p>
      </CardContent>
    </Card>
  );
}
