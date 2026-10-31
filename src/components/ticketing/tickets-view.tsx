"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronRight, ChevronLeft, Inbox, Loader2 } from "lucide-react";
import { LABELS, STATUSES, PRIORITIES, TICKET_TYPES, formatFaDate, isOpen } from "@/lib/constants";
import type { Me, Meta, TicketListItem, TicketListResponse } from "@/lib/types";
import { StatusBadge, PriorityBadge, TypeBadge, EmptyState, MetaLine, faNum } from "./shared";

type Scope = "mine" | "queue";

export function TicketsView({
  me,
  scope,
  onOpenTicket,
  refreshKey,
}: {
  me: Me;
  scope: Scope;
  onOpenTicket: (id: string) => void;
  refreshKey: number;
}) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [openCount, setOpenCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  // فیلترها
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");
  const [serviceId, setServiceId] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [assigneeId, setAssigneeId] = useState("all");
  const [sort, setSort] = useState("updatedAt");
  const [dir, setDir] = useState("desc");
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageSize = 10;
  const isQueue = scope === "queue";

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta(d))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        dir,
      });
      if (scope === "mine") params.set("mine", "1");
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      if (priority !== "all") params.set("priority", priority);
      if (type !== "all") params.set("type", type);
      if (serviceId !== "all") params.set("serviceId", serviceId);
      if (isQueue && teamId !== "all") params.set("teamId", teamId);
      if (isQueue && assigneeId !== "all") params.set("assigneeId", assigneeId);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const data: TicketListResponse = await res.json();
        setTickets(data.tickets);
        setTotal(data.total);
        setOpenCount(data.openCount);
        setNewCount(data.newCount);
        setError(false);
        if (data.tickets.length === 0 && page > 1) setPage(1);
      } else {
        // خطای سرور یا احراز هویت — حالت خالی را با «یافت نشد» اشتباه نگیریم
        setTickets([]);
        setTotal(0);
        setError(true);
      }
    } catch {
      setTickets([]);
      setTotal(0);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, q, status, priority, type, serviceId, teamId, assigneeId, sort, dir, scope, isQueue]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // جست‌وجوی زنده با تأخیر
  function onSearchChange(v: string) {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQ(v);
      setPage(1);
    }, 400);
  }

  function toggleSort(field: string) {
    if (sort === field) {
      setDir(dir === "desc" ? "asc" : "desc");
    } else {
      setSort(field);
      setDir("desc");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function resetFilters() {
    setStatus("all");
    setPriority("all");
    setType("all");
    setServiceId("all");
    setTeamId("all");
    setAssigneeId("all");
    setSearchInput("");
    setQ("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">{isQueue ? "صف درخواست‌های پشتیبانی" : "درخواست‌های من"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="num font-bold text-foreground">{faNum(openCount)}</span> درخواست باز
            {isQueue && newCount > 0 && (
              <> — <span className="num font-bold text-rose-600">{faNum(newCount)}</span> جدید بدون بررسی</>
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جست‌وجوی شماره یا عنوان تیکت…"
            className="pr-9"
            aria-label="جست‌وجوی تیکت"
          />
        </div>
      </div>

      {/* فیلترها */}
      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <FilterSelect label="وضعیت" value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="همه وضعیت‌ها" options={STATUSES.map((s) => ({ value: s, label: LABELS[s] }))} />
            <FilterSelect label="اولویت" value={priority} onChange={(v) => { setPriority(v); setPage(1); }} placeholder="همه اولویت‌ها" options={PRIORITIES.map((p) => ({ value: p, label: LABELS[p] }))} />
            <FilterSelect label="نوع" value={type} onChange={(v) => { setType(v); setPage(1); }} placeholder="همه انواع" options={TICKET_TYPES.map((t) => ({ value: t, label: LABELS[t] }))} />
            <FilterSelect label="سامانه" value={serviceId} onChange={(v) => { setServiceId(v); setPage(1); }} placeholder="همه سامانه‌ها" options={(meta?.services ?? []).map((s) => ({ value: s.id, label: s.name }))} />
            {isQueue && (
              <FilterSelect label="تیم" value={teamId} onChange={(v) => { setTeamId(v); setPage(1); }} placeholder="همه تیم‌ها" options={(meta?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} />
            )}
            {isQueue && (
              <FilterSelect label="کارشناس" value={assigneeId} onChange={(v) => { setAssigneeId(v); setPage(1); }} placeholder="همه کارشناسان" options={(meta?.agents ?? []).map((a) => ({ value: a.id, label: a.name }))} />
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>مرتب‌سازی:</span>
              {[
                { key: "createdAt", label: "تاریخ ثبت" },
                { key: "updatedAt", label: "آخرین تغییر" },
                { key: "priority", label: "اولویت" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => toggleSort(s.key)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    sort === s.key ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"
                  }`}
                >
                  {s.label} {sort === s.key ? (dir === "desc" ? "↓" : "↑") : ""}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              حذف فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* لیست تیکت‌ها */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <EmptyState
              title="خطا در بارگذاری درخواست‌ها"
              subtitle="ارتباط با سرور برقرار نشد؛ احتمالاً نشست شما منقضی شده است."
            />
            <div className="flex justify-center gap-2 -mt-2">
              <Button size="sm" onClick={() => load()}>
                تلاش مجدد
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                بارگذاری مجدد صفحه
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="درخواستی با این مشخصات یافت نشد"
              subtitle="فیلترها را تغییر دهید یا درخواست جدیدی ثبت کنید"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTicket(t.id)}
              className={`w-full text-right rounded-xl border bg-card p-4 hover:bg-accent/40 hover:border-primary/30 transition-all ${
                isOpen(t.status) ? "" : "opacity-75"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">
                    <span className="text-primary num ml-1.5" dir="ltr">
                      TKT-{String(t.number).padStart(4, "0")}
                    </span>
                    {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{t.serviceName}</span>
                    <span>ثبت‌کننده: {t.requester.name}</span>
                    <span>مسئول: {t.assignee?.name ?? (t.team ? `تیم ${t.team.name}` : "—")}</span>
                    <span>آخرین تغییر: {formatFaDate(t.updatedAt)}</span>
                    <MetaLine comments={t.commentCount} attachments={t.attachmentCount} />
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <TypeBadge type={t.type} />
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground num">
            صفحه {faNum(page)} از {faNum(totalPages)} — مجموع {faNum(total)} درخواست
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight className="h-4 w-4" />
              قبلی
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              بعدی
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs" aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
