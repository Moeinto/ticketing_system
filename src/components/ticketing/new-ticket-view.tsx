"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Bug, KeyRound, HelpCircle, Wrench, CheckCircle2 } from "lucide-react";
import { TICKET_TYPES, IMPACTS, ENVIRONMENTS, LABELS, formatTicketNumber } from "@/lib/constants";
import type { Me, Meta } from "@/lib/types";
import { ErrorField } from "./shared";

type FieldErrors = Record<string, string>;

export function NewTicketView({
  me,
  onCreated,
}: {
  me: Me;
  onCreated: (ticketId: string) => void;
}) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ number: number; id: string } | null>(null);

  // فیلدهای اصلی
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<string>("SINGLE_USER");

  // فیلدهای شرطی گزارش خطا (FR-03)
  const [environment, setEnvironment] = useState<string>("");
  const [reproducible, setReproducible] = useState(true);
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [occurrenceTime, setOccurrenceTime] = useState("");
  const [relatedRecord, setRelatedRecord] = useState("");

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta(d))
      .catch(() => {});
  }, []);

  const isBug = type === "BUG";

  const typeIcons: Record<string, typeof Bug> = {
    BUG: Bug,
    ACCESS: KeyRound,
    GUIDANCE: HelpCircle,
    CHANGE: Wrench,
  };

  // اعتبارسنجی سمت کلاینت — برای تجربه کاربری؛ مرجع نهایی سرور است (بخش ۸ PRD)
  const clientErrors = useMemo<FieldErrors>(() => {
    const e: FieldErrors = {};
    if (title.trim().length > 0 && (title.trim().length < 5 || title.trim().length > 200)) {
      e.title = "عنوان باید بین ۵ تا ۲۰۰ کاراکتر باشد";
    }
    if (description.trim().length > 0 && description.trim().length < 20) {
      e.description = `شرح باید حداقل ۲۰ کاراکتر باشد (فعلاً ${description.trim().length} کاراکتر)`;
    }
    if (isBug) {
      if (!environment) e["bug.environment"] = "محیط وقوع خطا برای گزارش خطا الزامی است";
      if (!expected.trim()) e["bug.expected"] = "نتیجه مورد انتظار الزامی است";
      if (!actual.trim()) e["bug.actual"] = "نتیجه واقعی الزامی است";
      if (!steps.trim()) {
        e["bug.steps"] = reproducible
          ? "مراحل بازتولید برای خطای قابل تکرار الزامی است"
          : "برای خطای غیرقابل تکرار، شرایط وقوع را توضیح دهید";
      }
    }
    return e;
  }, [title, description, isBug, environment, expected, actual, steps, reproducible]);

  function showErrorsIfTouched(): FieldErrors {
    const e: FieldErrors = {};
    if (title.trim().length < 5 || title.trim().length > 200)
      e.title = title.trim().length === 0 ? "عنوان الزامی است" : "عنوان باید بین ۵ تا ۲۰۰ کاراکتر باشد";
    if (!type) e.type = "نوع درخواست الزامی است";
    if (!serviceId) e.serviceId = "سامانه مرتبط الزامی است";
    if (description.trim().length < 20 || description.trim().length > 5000)
      e.description =
        description.trim().length === 0
          ? "شرح درخواست الزامی است"
          : `شرح باید بین ۲۰ تا ۵۰۰۰ کاراکتر باشد (فعلاً ${description.trim().length} کاراکتر)`;
    if (isBug) {
      if (!environment) e["bug.environment"] = "محیط وقوع خطا الزامی است";
      if (!expected.trim()) e["bug.expected"] = "نتیجه مورد انتظار الزامی است";
      if (!actual.trim()) e["bug.actual"] = "نتیجه واقعی الزامی است";
      if (!steps.trim()) {
        e["bug.steps"] = reproducible
          ? "مراحل بازتولید برای خطای قابل تکرار الزامی است"
          : "برای خطای غیرقابل تکرار، شرایط وقوع را توضیح دهید";
      }
    }
    setErrors(e);
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    const errs = showErrorsIfTouched();
    if (Object.keys(errs).length > 0) {
      setGlobalError("لطفاً خطاهای مشخص‌شده را برطرف کنید");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        type,
        serviceId,
        description: description.trim(),
        impact,
      };
      if (isBug) {
        payload.bug = {
          environment,
          reproducible,
          steps: steps.trim(),
          expected: expected.trim(),
          actual: actual.trim(),
          occurrenceTime: occurrenceTime.trim() || undefined,
          relatedRecord: relatedRecord.trim() || undefined,
        };
      }
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setGlobalError(data.error ?? "ثبت درخواست ناموفق بود");
        return;
      }
      setSuccessInfo({ number: data.ticket.number, id: data.ticket.id });
    } catch {
      setGlobalError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  if (successInfo) {
    return (
      <Card className="max-w-xl mx-auto border-teal-200">
        <CardContent className="p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-extrabold">درخواست شما با موفقیت ثبت شد</h2>
          <p className="text-muted-foreground leading-7">
            شماره تیکت شما: <span className="num font-extrabold text-foreground" dir="ltr">{formatTicketNumber(successInfo.number)}</span>
            <br />
            وضعیت اولیه: <span className="font-bold">جدید</span> — درخواست شما در صف پشتیبانی قرار گرفت و توسط
            کارشناسان بررسی می‌شود.
          </p>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => onCreated(successInfo.id)}>مشاهده درخواست</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold">ثبت درخواست جدید</h1>
        <p className="text-sm text-muted-foreground mt-1">
          اطلاعات دقیق‌تر، رسیدگی سریع‌تر. فیلدهای ستاره‌دار الزامی هستند.
        </p>
      </div>

      <form onSubmit={submit} noValidate>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">اطلاعات اصلی درخواست</CardTitle>
            <CardDescription>این اطلاعات به کارشناس برای اولویت‌بندی و ارجاع کمک می‌کند</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* عنوان */}
            <div>
              <Label htmlFor="title">عنوان درخواست *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="خلاصه کوتاه و گویا از مشکل یا نیاز (۵ تا ۲۰۰ کاراکتر)"
                className="mt-1.5"
              />
              <ErrorField message={errors.title} />
            </div>

            {/* نوع درخواست */}
            <div>
              <Label>نوع درخواست *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                {TICKET_TYPES.map((t) => {
                  const Icon = typeIcons[t];
                  const active = type === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                        active
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {LABELS[t]}
                    </button>
                  );
                })}
              </div>
              <ErrorField message={errors.type} />
            </div>

            {/* سامانه و دامنه تأثیر */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>سامانه مرتبط *</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="mt-1.5" aria-label="سامانه مرتبط">
                    <SelectValue placeholder="انتخاب کنید…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(meta?.services ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorField message={errors.serviceId} />
              </div>
              <div>
                <Label>دامنه تأثیر *</Label>
                <Select value={impact} onValueChange={setImpact}>
                  <SelectTrigger className="mt-1.5" aria-label="دامنه تأثیر">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPACTS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {LABELS[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  چند کاربر یا واحد متأثر شده‌اند؟ این داده مبنای تعیین اولویت نهایی است.
                </p>
              </div>
            </div>

            {/* شرح */}
            <div>
              <Label htmlFor="description">شرح درخواست *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کامل مشکل یا نیاز خود را بنویسید (۲۰ تا ۵۰۰۰ کاراکتر)"
                className="mt-1.5 min-h-32"
              />
              <div className="flex justify-between items-start">
                <ErrorField message={errors.description} />
                <p className="text-xs text-muted-foreground num mt-1">
                  {faNum(description.trim().length)} / ۵۰۰۰
                </p>
              </div>
            </div>

            {/* فیلدهای شرطی گزارش خطا — FR-03 */}
            {isBug && (
              <>
                <Separator />
                <div className="space-y-5 rounded-xl bg-secondary/50 border p-4">
                  <div>
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <Bug className="h-4 w-4 text-primary" />
                      اطلاعات تخصصی گزارش خطا
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      این فیلدها فقط برای نوع «گزارش خطا» نمایش داده می‌شوند و رسیدگی سریع‌تر را ممکن می‌کنند.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>محیط وقوع خطا *</Label>
                      <Select value={environment} onValueChange={setEnvironment}>
                        <SelectTrigger className="mt-1.5" aria-label="محیط وقوع خطا">
                          <SelectValue placeholder="انتخاب محیط…" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENVIRONMENTS.map((env) => (
                            <SelectItem key={env} value={env}>
                              {LABELS[env]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ErrorField message={errors["bug.environment"]} />
                    </div>
                    <div>
                      <Label>زمان تقریبی وقوع (اختیاری)</Label>
                      <Input
                        value={occurrenceTime}
                        onChange={(e) => setOccurrenceTime(e.target.value)}
                        placeholder="مثلاً: امروز ساعت ۱۰ صبح"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div>
                      <Label htmlFor="reproducible">آیا خطا قابل بازتولید است؟</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reproducible
                          ? "بله — مراحل بازتولید را دقیق بنویسید"
                          : "خیر — شرایط وقوع را توضیح دهید"}
                      </p>
                    </div>
                    <Switch id="reproducible" checked={reproducible} onCheckedChange={setReproducible} />
                  </div>

                  <div>
                    <Label htmlFor="steps">
                      {reproducible ? "مراحل بازتولید خطا *" : "شرایط وقوع خطا *"}
                    </Label>
                    <Textarea
                      id="steps"
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      placeholder={
                        reproducible
                          ? "۱. ورود به سامانه…\n۲. کلیک روی…\n۳. …"
                          : "توضیح دهید در چه شرایطی این خطا رخ می‌دهد"
                      }
                      className="mt-1.5 min-h-24"
                    />
                    <ErrorField message={errors["bug.steps"]} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expected">نتیجه مورد انتظار *</Label>
                      <Textarea
                        id="expected"
                        value={expected}
                        onChange={(e) => setExpected(e.target.value)}
                        placeholder="به‌درستی چه اتفاقی باید بیفتد؟"
                        className="mt-1.5 min-h-20"
                      />
                      <ErrorField message={errors["bug.expected"]} />
                    </div>
                    <div>
                      <Label htmlFor="actual">نتیجه واقعی / پیام خطا *</Label>
                      <Textarea
                        id="actual"
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        placeholder="چه اتفاقی افتاد؟ متن پیام خطا را هم بنویسید"
                        className="mt-1.5 min-h-20"
                      />
                      <ErrorField message={errors["bug.actual"]} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="relatedRecord">شناسه رکورد مرتبط (اختیاری)</Label>
                    <Input
                      id="relatedRecord"
                      value={relatedRecord}
                      onChange={(e) => setRelatedRecord(e.target.value)}
                      placeholder="مثلاً: شماره سفارش، رزرو یا کاربر مرتبط"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </>
            )}

            {globalError && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {globalError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={loading} className="min-w-36">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                ثبت درخواست
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

const faNum = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
