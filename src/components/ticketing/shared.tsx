"use client";

import { Badge } from "@/components/ui/badge";
import { LABELS } from "@/lib/constants";
import { AlertCircle, ShieldCheck, Paperclip, MessageSquare } from "lucide-react";

export const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  WAITING_REQUESTER: "bg-orange-100 text-orange-800 border-orange-200",
  WAITING_TEAM: "bg-violet-100 text-violet-800 border-violet-200",
  RESOLVED: "bg-teal-100 text-teal-800 border-teal-200",
  CLOSED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export const PRIORITY_STYLES: Record<string, string> = {
  P1: "bg-rose-100 text-rose-700 border-rose-200",
  P2: "bg-orange-100 text-orange-700 border-orange-200",
  P3: "bg-amber-100 text-amber-700 border-amber-200",
  P4: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`border font-medium ${STATUS_STYLES[status] ?? ""}`}>
      {LABELS[status] ?? status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) {
    return (
      <Badge variant="outline" className="border-dashed text-muted-foreground">
        بدون اولویت
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`border font-semibold ${PRIORITY_STYLES[priority] ?? ""}`}>
      {LABELS[priority] ?? priority}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {LABELS[type] ?? type}
    </Badge>
  );
}

export function ErrorField({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <ShieldCheck className="h-8 w-8 text-primary/60" />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export function MetaLine({
  comments,
  attachments,
}: {
  comments: number;
  attachments: number;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      {comments > 0 && (
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {faNum(comments)}
        </span>
      )}
      {attachments > 0 && (
        <span className="inline-flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          {faNum(attachments)}
        </span>
      )}
    </span>
  );
}

export function PersonAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name?.trim()?.[0] ?? "؟";
  return (
    <div
      className={`w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${faNum(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${faNum(Math.round(bytes / 1024))} کیلوبایت`;
  return `${faNum(Math.round((bytes / 1024 / 1024) * 10) / 10)} مگابایت`;
}

export const faNum = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
