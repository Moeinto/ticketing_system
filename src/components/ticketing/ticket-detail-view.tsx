"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Send,
  Paperclip,
  Loader2,
  Lock,
  History,
  UserCircle2,
  FileText,
  RotateCcw,
  CheckCheck,
  Download,
} from "lucide-react";
import { LABELS, PRIORITIES, STATUSES, formatFaDate, formatDuration } from "@/lib/constants";
import type {
  CommentItem,
  Me,
  Meta,
  TicketDetailData,
  TicketPermissions,
} from "@/lib/types";
import {
  StatusBadge,
  PriorityBadge,
  TypeBadge,
  PersonAvatar,
  formatFileSize,
  faNum,
} from "./shared";

export function TicketDetailView({
  me,
  ticketId,
  onBack,
}: {
  me: Me;
  ticketId: string;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [permissions, setPermissions] = useState<TicketPermissions | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [commentBody, setCommentBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [patching, setPatching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [actionError, setActionError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSupport = me.role !== "REQUESTER";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setTicket(data.ticket);
      setPermissions(data.permissions);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta(d))
      .catch(() => {});
  }, [load]);

  async function sendComment() {
    if (!commentBody.trim()) return;
    setSending(true);
    setActionError("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim(), isInternal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "ارسال پیام ناموفق بود");
        return;
      }
      setCommentBody("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function patch(payload: Record<string, unknown>) {
    setPatching(true);
    setActionError("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "اعمال تغییر ناموفق بود");
        return false;
      }
      await load();
      return true;
    } finally {
      setPatching(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setActionError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "بارگذاری فایل ناموفق بود");
        return;
      }
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function reopen() {
    const ok = await patch({ status: "IN_PROGRESS", reopenReason: reopenReason.trim() || undefined });
    if (ok) {
      setReopenOpen(false);
      setReopenReason("");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !ticket || !permissions) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="font-bold mb-2">تیکت یافت نشد یا دسترسی به آن مجاز نیست</p>
          <Button variant="outline" onClick={onBack}>
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canManage = permissions.canManage;
  const isRequester = permissions.isRequester;
  const showInternal = permissions.showInternal;
  const canReopen = isRequester && ticket.status === "RESOLVED";
  const canRespond = canManage || (isRequester && ticket.status !== "CLOSED");

  return (
    <div className="space-y-4">
      {/* هدر */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowRight className="h-4 w-4" />
          بازگشت
        </Button>
        {canReopen && (
          <Button size="sm" variant="outline" onClick={() => setReopenOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            بازگشایی تیکت
          </Button>
        )}
      </div>

      {/* کارت عنوان تیکت */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-primary font-bold num mb-1" dir="ltr">
                TKT-{String(ticket.number).padStart(4, "0")}
              </p>
              <h1 className="text-lg lg:text-xl font-extrabold leading-relaxed">{ticket.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <TypeBadge type={ticket.type} />
                <span className="text-xs text-muted-foreground">
                  {ticket.service?.name} — تأثیر: {LABELS[ticket.impact]}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 lg:text-left shrink-0">
              <p>ثبت‌کننده: <span className="font-bold text-foreground">{ticket.requester.name}</span></p>
              <p>مسئول رسیدگی: <span className="font-bold text-foreground">{ticket.assignee?.name ?? (ticket.team ? `تیم ${ticket.team.name}` : "—")}</span></p>
              <p>ثبت: {formatFaDate(ticket.createdAt)}</p>
              {ticket.resolvedAt && <p>حل: {formatFaDate(ticket.resolvedAt)}</p>}
              {ticket.closedAt && <p>بستن: {formatFaDate(ticket.closedAt)}</p>}
              {ticket.firstRespondedAt && (
                <p>
                  اولین پاسخ: {formatDuration(
                    (new Date(ticket.firstRespondedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000
                  )}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <p className="text-sm leading-7 whitespace-pre-wrap text-foreground/90">{ticket.description}</p>

          {/* جزئیات خطا */}
          {ticket.bugDetail && (
            <div className="mt-4 rounded-xl border bg-secondary/40 p-4 space-y-3 text-sm">
              <p className="font-extrabold text-xs text-muted-foreground">جزئیات گزارش خطا</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoBox label="محیط وقوع" value={LABELS[ticket.bugDetail.environment] ?? ticket.bugDetail.environment} />
                <InfoBox
                  label="قابل بازتولید"
                  value={ticket.bugDetail.reproducible ? "بله" : "خیر"}
                />
                <InfoBox label={ticket.bugDetail.reproducible ? "مراحل بازتولید" : "شرایط وقوع"} value={ticket.bugDetail.steps ?? "—"} multiline />
                <InfoBox label="نتیجه مورد انتظار" value={ticket.bugDetail.expected} multiline />
                <InfoBox label="نتیجه واقعی / پیام خطا" value={ticket.bugDetail.actual} multiline />
                {ticket.bugDetail.occurrenceTime && <InfoBox label="زمان تقریبی وقوع" value={ticket.bugDetail.occurrenceTime} />}
                {ticket.bugDetail.relatedRecord && <InfoBox label="رکورد مرتبط" value={ticket.bugDetail.relatedRecord} />}
              </div>
            </div>
          )}

          {/* پیوست‌ها */}
          {ticket.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ticket.attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/files/${a.id}`}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs hover:bg-accent transition-colors"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-bold">{a.fileName}</span>
                  <span className="text-muted-foreground">({formatFileSize(a.size)})</span>
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* پنل مدیریت (فقط نقش‌های پشتیبانی) */}
      {canManage && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-primary" />
              مدیریت درخواست
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">وضعیت</label>
                <Select
                  value={ticket.status}
                  onValueChange={(v) => patch({ status: v })}
                  disabled={patching}
                >
                  <SelectTrigger aria-label="تغییر وضعیت"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} disabled={s === "CLOSED" && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED"}>
                        {LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اولویت</label>
                <Select
                  value={ticket.priority ?? ""}
                  onValueChange={(v) => patch({ priority: v })}
                  disabled={patching}
                >
                  <SelectTrigger aria-label="تغییر اولویت">
                    <SelectValue placeholder="تعیین اولویت…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">تیم مسئول</label>
                <Select
                  value={ticket.team?.id ?? ""}
                  onValueChange={(v) => patch({ teamId: v, assignReason: "تغییر تیم مسئول" })}
                  disabled={patching}
                >
                  <SelectTrigger aria-label="تغییر تیم"><SelectValue placeholder="بدون تیم" /></SelectTrigger>
                  <SelectContent>
                    {(meta?.teams ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">کارشناس مسئول</label>
                <Select
                  value={ticket.assignee?.id ?? ""}
                  onValueChange={(v) => patch({ assigneeId: v, assignReason: "تخصیص کارشناس مسئول" })}
                  disabled={patching}
                >
                  <SelectTrigger aria-label="تغییر کارشناس"><SelectValue placeholder="بدون مسئول" /></SelectTrigger>
                  <SelectContent>
                    {(meta?.agents ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {patching && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> در حال اعمال تغییر…</p>}
            {ticket.reopenCount > 0 && (
              <p className="text-xs text-amber-700 mt-2 num">
                این تیکت {faNum(ticket.reopenCount)} بار بازگشایی شده است.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {actionError && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}

      {/* مکاتبات */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">مکاتبات و اقدامات</CardTitle>
          {isSupport && !showInternal && null}
        </CardHeader>
        <CardContent>
          {showInternal && ticket.comments.some((c: CommentItem) => c.isInternal) ? (
            <Tabs defaultValue="all" className="mb-4">
              <TabsList>
                <TabsTrigger value="all">همه پیام‌ها</TabsTrigger>
                <TabsTrigger value="internal">یادداشت‌های داخلی</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          <div className="space-y-3 max-h-[32rem] overflow-y-auto pl-1">
            {ticket.comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">هنوز پیامی ثبت نشده است</p>
            )}
            {ticket.comments.map((c: CommentItem) => {
              const mine = c.author.id === me.id;
              return (
                <div key={c.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  <PersonAvatar name={c.author.name} />
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    c.isInternal
                      ? "bg-amber-50 border border-amber-200"
                      : mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border"
                  }`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-xs">{c.author.name}</span>
                      {c.isInternal ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                          <Lock className="h-2.5 w-2.5" />
                          یادداشت داخلی
                        </span>
                      ) : null}
                      <span className={`text-[10px] ${c.isInternal ? "text-amber-600" : mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatFaDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="leading-6 whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* فرم پاسخ */}
          {canRespond ? (
            <div className="mt-4 pt-4 border-t space-y-3">
              <Textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="پیام خود را بنویسید…"
                className="min-h-20"
                aria-label="متن پیام"
              />
              {isSupport && (
                <div className="flex items-center justify-between rounded-lg border bg-amber-50/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <label htmlFor="internal-note" className="text-xs font-bold text-amber-800">
                      ثبت به‌عنوان یادداشت داخلی
                    </label>
                  </div>
                  <Switch id="internal-note" checked={isInternal} onCheckedChange={setIsInternal} />
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                  accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,.xlsx,.docx,.zip"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  پیوست فایل
                </Button>
                <Button onClick={sendComment} disabled={sending || !commentBody.trim()} className="min-w-28">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ارسال
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                حداکثر حجم فایل ۵ مگابایت — فرمت‌های مجاز: تصویر، PDF، متن، Excel، Word و ZIP
              </p>
            </div>
          ) : (
            <p className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-1">
              <CheckCheck className="h-4 w-4" />
              این تیکت بسته شده است و امکان ارسال پیام وجود ندارد.
            </p>
          )}
        </CardContent>
      </Card>

      {/* تاریخچه رویدادها */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            تاریخچه تغییرات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-r pr-5 space-y-4">
            {ticket.events.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -right-[1.42rem] top-1.5 w-2.5 h-2.5 rounded-full bg-primary/40 border-2 border-background" aria-hidden="true" />
                <p className="text-sm font-bold">
                  {LABELS[ev.type] ?? ev.type}
                  {ev.oldValue && ev.newValue && (
                    <span className="font-normal text-muted-foreground">
                      {" "}از «{ev.oldValue}» به «{ev.newValue}»
                    </span>
                  )}
                </p>
                {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ev.actor.name} — {formatFaDate(ev.createdAt)}
                </p>
              </li>
            ))}
          </ol>

          {/* سابقه ارجاع‌ها */}
          {ticket.assignments.length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="text-xs font-extrabold text-muted-foreground mb-2">سابقه ارجاع</p>
              <div className="space-y-2">
                {ticket.assignments.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-secondary/40 p-3 text-xs">
                    <p className="font-bold">
                      {a.team ? `تیم ${a.team.name}` : ""}
                      {a.assignee ? (a.team ? ` — ${a.assignee.name}` : a.assignee.name) : ""}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      علت: {a.reason} — توسط {a.by.name} در {formatFaDate(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* دیالوگ بازگشایی */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بازگشایی تیکت</DialogTitle>
            <DialogDescription>
              اگر مشکل شما ادامه دارد، علت بازگشایی را توضیح دهید. این اقدام در تاریخچه ثبت می‌شود.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="مثلاً: مشکل دوباره رخ داده و هنوز برطرف نشده است"
            className="min-h-20"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>انصراف</Button>
            <Button onClick={reopen} disabled={patching}>تأیید بازگشایی</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBox({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <p className="text-[11px] font-bold text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm leading-6 whitespace-pre-wrap ${multiline ? "" : "font-bold"}`}>{value}</p>
    </div>
  );
}
