"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Loader2, LogIn, ShieldCheck, History, BarChart3 } from "lucide-react";
import type { Me } from "@/lib/types";

const DEMO_ACCOUNTS = [
  { label: "ثبت‌کننده", email: "user@org.ir", password: "user123" },
  { label: "کارشناس پشتیبانی", email: "agent@org.ir", password: "agent123" },
  { label: "سرپرست پشتیبانی", email: "lead@org.ir", password: "lead123" },
  { label: "مدیر سامانه", email: "admin@org.ir", password: "admin123" },
];

export function LoginView({ onLogin }: { onLogin: (me: Me) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("ایمیل و رمز عبور الزامی است");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ورود ناموفق بود");
        return;
      }
      // ذخیره توکن نشست — پشتیبان کوکی برای بستر iframe/پروکسی
      if (data.token) {
        try { localStorage.setItem("its_session_token", data.token); } catch {}
      }
      onLogin(data.user);
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(email: string, password: string) {
    setEmail(email);
    setPassword(password);
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-bl from-secondary via-background to-background">
      {/* پنل معرفی */}
      <div className="lg:w-1/2 flex flex-col justify-center p-8 lg:p-16 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">سامانه تیکتینگ سازمانی</h1>
              <p className="text-sm text-muted-foreground">مدیریت متمرکز درخواست‌های پشتیبانی فنی</p>
            </div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold leading-relaxed text-foreground mb-4">
            یک مسیر واحد برای ثبت، ارجاع و پیگیری
            <span className="text-primary"> درخواست‌های سازمانی</span>
          </h2>
          <p className="text-muted-foreground leading-8 mb-10">
            درخواست‌ها را استاندارد ثبت کنید، وضعیت و تاریخچه هر مورد را شفاف ببینید و عملکرد
            تیم پشتیبانی را با داده‌های واقعی اندازه‌گیری کنید.
          </p>

          <div className="space-y-4">
            {[
              { icon: ShieldCheck, title: "ثبت استاندارد با فرم شرطی", desc: "اطلاعات لازم برای بررسی سریع، از همان ابتدا" },
              { icon: History, title: "سابقه متمرکز هر درخواست", desc: "تمام مکاتبات، اقدامات و تغییرات در یک نگاه" },
              { icon: BarChart3, title: "گزارش عملکرد پشتیبانی", desc: "زمان اولین پاسخ، زمان حل و نرخ بازگشایی" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-card border shadow-sm flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* فرم ورود */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md shadow-xl border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-extrabold">ورود به سامانه</CardTitle>
            <CardDescription>با حساب کاربری سازمانی خود وارد شوید</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل سازمانی</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  className="text-left placeholder:text-right"
                  placeholder="name@org.ir"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  className="text-left placeholder:text-right"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full h-11 text-base font-bold" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                ورود به سامانه
              </Button>
            </form>

            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">
                حساب‌های نمونه برای آزمایش (کلیک کنید تا پر شود)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quickFill(acc.email, acc.password)}
                    className="text-right border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <span className="block text-sm font-semibold text-foreground">{acc.label}</span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {acc.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
