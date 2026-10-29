"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2, Settings2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LABELS, ROLES, formatFaDate } from "@/lib/constants";
import type { AdminUser, Me, Meta } from "@/lib/types";

export function AdminView({ me }: { me: Me }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // فرم ایجاد کاربر
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("REQUESTER");
  const [teamId, setTeamId] = useState<string>("none");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([
        fetch("/api/users").then((r) => (r.ok ? r.json() : { users: [] })),
        fetch("/api/meta").then((r) => (r.ok ? r.json() : null)),
      ]);
      setUsers(u.users ?? []);
      setMeta(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUser() {
    setError("");
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("نام، ایمیل و رمز عبور (حداقل ۶ کاراکتر) الزامی است");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          teamId: teamId === "none" ? null : teamId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ایجاد کاربر ناموفق بود");
        return;
      }
      toast({ title: "کاربر ایجاد شد", description: `${data.user.name} با نقش ${LABELS[data.user.role]} اضافه شد` });
      setDialogOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("REQUESTER");
      setTeamId("none");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, active: !user.active }),
    });
    if (res.ok) {
      toast({ title: user.active ? "کاربر غیرفعال شد" : "کاربر فعال شد" });
      await load();
    } else {
      const data = await res.json();
      toast({ title: data.error ?? "عملیات ناموفق بود", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            مدیریت سامانه
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ایجاد کاربران، تخصیص نقش و فعال/غیرفعال‌سازی حساب‌ها (FR-01)
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              کاربر جدید
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ایجاد کاربر جدید</DialogTitle>
              <DialogDescription>کاربر با حساب فعال و نقش انتخابی ایجاد می‌شود.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="u-name">نام و نام خانوادگی *</Label>
                <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="u-email">ایمیل سازمانی *</Label>
                <Input id="u-email" dir="ltr" className="text-left mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@org.ir" />
              </div>
              <div>
                <Label htmlFor="u-pass">رمز عبور * (حداقل ۶ کاراکتر)</Label>
                <Input id="u-pass" type="password" dir="ltr" className="text-left mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>نقش *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>تیم (اختیاری)</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تیم</SelectItem>
                      {(meta?.teams ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button onClick={createUser} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                ایجاد کاربر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            کاربران سامانه ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg mb-2" />)
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">
                      {u.name}
                      {u.id === me.id && <span className="text-xs text-primary font-normal mr-1">(شما)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                      <span dir="ltr">{u.email}</span>
                      <span>{u.team?.name ? `تیم ${u.team.name}` : "بدون تیم"}</span>
                      <span>عضویت: {formatFaDate(u.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary">{LABELS[u.role]}</Badge>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{u.active ? "فعال" : "غیرفعال"}</span>
                      <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} disabled={u.id === me.id} aria-label={`تغییر وضعیت ${u.name}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
