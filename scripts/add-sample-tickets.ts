/**
 * افزودن تیکت‌های نمونه در وضعیت‌های مختلف — بدون حذف داده‌های موجود
 * Usage: bun /home/z/my-project/scripts/add-sample-tickets.ts
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const users = await prisma.user.findMany();
  const teams = await prisma.team.findMany();
  const services = await prisma.service.findMany();
  const byEmail = (e: string) => users.find((u) => u.email === e)!;
  const team = (n: string) => teams.find((t) => t.name === n)!;
  const svc = (n: string) => services.find((s) => s.name === n)!;

  // کاربر نمونه جدید برای تنوع
  const user3 =
    (await prisma.user.findUnique({ where: { email: "user3@org.ir" } })) ??
    (await prisma.user.create({
      data: { name: "مریم حیدری", email: "user3@org.ir", passwordHash: hashPassword("user123"), role: "REQUESTER" },
    }));

  const last = await prisma.ticket.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  let n = last?.number ?? 0;
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60 * 1000);

  async function createTicket(data: any) {
    n += 1;
    return prisma.ticket.create({ data: { number: n, ...data } });
  }

  // ---------- ۹: دسترسی — جدید، بدون اولویت و بدون کارشناس (در انتظار برچسب‌گذاری در صف) ----------
  const t9 = await createTicket({
    title: "درخواست ایجاد حساب کاربری برای کارآموز جدید",
    description:
      "کارآموز جدید واحد بازاریابی از فردا شروع می‌کند و به حساب کاربری برای پرتال داخلی و ایمیل سازمانی نیاز دارد. فرم درخواست نیروی انسانی امضاشده نیز پیوست است. لطفاً سطح دسترسی پایه کارمند در نظر گرفته شود.",
    type: "ACCESS",
    serviceId: svc("پرتال مشتریان").id,
    impact: "SINGLE_USER",
    status: "NEW",
    requesterId: user3.id,
    createdAt: ago(25),
    updatedAt: ago(25),
    events: { create: [{ actorId: user3.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(25) }] },
  });

  // ---------- ۱۰: بحرانی P1 — جدید بدون مسئول (فوری در صف) ----------
  const t10 = await createTicket({
    title: "از کار افتادن کامل سامانه منابع انسانی",
    description:
      "سامانه منابع انسانی از حدود ۳۰ دقیقه پیش به‌کلی در دسترس نیست و پیام «Service Unavailable» نمایش داده می‌شود. کل سازمان برای ثبت حضور و مرخصی به این سامانه وابسته‌اند و امروز آخرین مهلت ثبت درخواست‌های ماه است. لطفاً فوراً رسیدگی شود.",
    type: "BUG",
    serviceId: svc("سامانه منابع انسانی").id,
    impact: "ORGANIZATION",
    status: "NEW",
    requesterId: byEmail("user2@org.ir").id,
    createdAt: ago(35),
    updatedAt: ago(35),
    bugDetail: {
      create: {
        environment: "PRODUCTION",
        reproducible: true,
        steps: "۱. ورود به آدرس سامانه منابع انسانی\n۲. مشاهده پیام Service Unavailable در همه صفحات",
        expected: "صفحه ورود سامانه نمایش داده شود.",
        actual: "پیام Service Unavailable نمایش داده می‌شود و سرویس پاسخ نمی‌دهد.",
        occurrenceTime: "امروز ساعت ۱۰:۱۵ صبح",
        relatedRecord: "مانیتورینگ Uptime — هشدار #2214",
      },
    },
    events: { create: [{ actorId: byEmail("user2@org.ir").id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(35) }] },
  });

  // ---------- ۱۱: راهنمایی — در حال بررسی با یادداشت داخلی ----------
  const t11 = await createTicket({
    title: "نحوه استعلام موجودی و ثبت درخواست کالا در انبار",
    description:
      "واحد خرید باید قبل از ثبت سفارش، موجودی کالا را در سامانه استعلام کند. من بخش انبار را پیدا نمی‌کنم و نمی‌دانم گزارش موجودی در کدام منو قرار دارد. لطفاً راهنمایی کنید یا مستندات مربوطه را ارسال نمایید.",
    type: "GUIDANCE",
    serviceId: svc("سامانه فروش").id,
    impact: "SINGLE_USER",
    priority: "P4",
    status: "IN_PROGRESS",
    requesterId: byEmail("user@org.ir").id,
    assigneeId: byEmail("agent@org.ir").id,
    teamId: team("فرانت‌اند").id,
    firstRespondedAt: ago(240),
    createdAt: ago(300),
    updatedAt: ago(60),
    comments: {
      create: [
        {
          authorId: byEmail("agent@org.ir").id,
          body: "سلام، در حال تهیه راهنمای تصویری برای شما هستم. تا امروز پایان کار ارسال می‌شود.",
          createdAt: ago(240),
        },
        {
          authorId: byEmail("agent@org.ir").id,
          body: "کاربر سطح دسترسی انبار را ندارد؛ باید اول از بخش مدیریت دسترسی‌ها مجوز «مشاهده گزارش انبار» فعال شود. منتظر تأیید سرپرست هستیم.",
          isInternal: true,
          createdAt: ago(60),
        },
      ],
    },
    events: {
      create: [
        { actorId: byEmail("user@org.ir").id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(300) },
        { actorId: byEmail("agent@org.ir").id, type: "PRIORITY_CHANGE", field: "priority", newValue: "P4", description: "اولویت تعیین شد", createdAt: ago(250) },
        { actorId: byEmail("agent@org.ir").id, type: "ASSIGNMENT", field: "assignee", description: "تخصیص به علی احمدی", createdAt: ago(245) },
        { actorId: byEmail("agent@org.ir").id, type: "STATUS_CHANGE", field: "status", oldValue: "NEW", newValue: "IN_PROGRESS", description: "در حال تهیه راهنما", createdAt: ago(240) },
        { actorId: byEmail("agent@org.ir").id, type: "INTERNAL_NOTE", description: "یادداشت داخلی ثبت شد", createdAt: ago(60) },
      ],
    },
  });

  // ---------- ۱۲: تغییر — در انتظار تیم محصول ----------
  const t12 = await createTicket({
    title: "افزودن امکان خروجی Excel از گزارش‌های پرتال مشتریان",
    description:
      "چند مشتری سازمانی بزرگ درخواست داده‌اند که گزارش‌های مصرف و صورت‌حساب پرتال مشتریان قابلیت خروجی Excel داشته باشد تا بتوانند آن را در سیستم داخلی خود تحلیل کنند. پیشنهاد می‌شود دکمه خروجی Excel در بالای همه جدول‌های گزارش اضافه شود.",
    type: "CHANGE",
    serviceId: svc("پرتال مشتریان").id,
    impact: "ORGANIZATION",
    priority: "P3",
    status: "WAITING_TEAM",
    requesterId: byEmail("lead@org.ir").id,
    assigneeId: byEmail("agent@org.ir").id,
    teamId: team("محصول").id,
    firstRespondedAt: ago(800),
    createdAt: ago(1000),
    updatedAt: ago(400),
    comments: {
      create: [
        {
          authorId: byEmail("agent@org.ir").id,
          body: "درخواست شما به تیم محصول ارجاع شد و در جلسه فازبندی بعدی بررسی خواهد شد. نتیجه را اطلاع می‌دهیم.",
          createdAt: ago(800),
        },
      ],
    },
    events: {
      create: [
        { actorId: byEmail("lead@org.ir").id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(1000) },
        { actorId: byEmail("agent@org.ir").id, type: "PRIORITY_CHANGE", field: "priority", newValue: "P3", description: "اولویت تعیین شد", createdAt: ago(810) },
        { actorId: byEmail("agent@org.ir").id, type: "ASSIGNMENT", field: "team", description: "ارجاع به تیم محصول", createdAt: ago(800) },
        { actorId: byEmail("agent@org.ir").id, type: "STATUS_CHANGE", field: "status", oldValue: "IN_PROGRESS", newValue: "WAITING_TEAM", description: "در انتظار بررسی تیم محصول در فازبندی بعدی", createdAt: ago(400) },
      ],
    },
  });

  // ---------- ۱۳: دسترسی — در انتظار پاسخ ثبت‌کننده ----------
  const t13 = await createTicket({
    title: "درخواست افزایش سقف نقل‌وانتقال در سامانه مالی",
    description:
      "برای تسویه قراردادهای خرد، سقف فعلی نقل‌وانتقال کاربر من کافی نیست و خطای «مبلغ بیش از سقف مجاز» دریافت می‌کنم. لطفاً سقف کاربر به سطح مورد نیاز واحد مالی ارتقا یابد. مشخصات و مستندات مربوطه را در پاسخ ارسال می‌کنم.",
    type: "ACCESS",
    serviceId: svc("سامانه مالی").id,
    impact: "SINGLE_USER",
    priority: "P3",
    status: "WAITING_REQUESTER",
    requesterId: byEmail("user2@org.ir").id,
    assigneeId: byEmail("agent2@org.ir").id,
    firstRespondedAt: ago(140),
    createdAt: ago(200),
    updatedAt: ago(140),
    comments: {
      create: [
        {
          authorId: byEmail("agent2@org.ir").id,
          body: "سلام، برای بررسی این درخواست لطفاً مبلغ سقف موردنیاز، شماره قراردادها و تأییدیه مدیر واحد مالی را ارسال کنید تا پرونده تشکیل شود.",
          createdAt: ago(140),
        },
      ],
    },
    events: {
      create: [
        { actorId: byEmail("user2@org.ir").id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(200) },
        { actorId: byEmail("agent2@org.ir").id, type: "PRIORITY_CHANGE", field: "priority", newValue: "P3", description: "اولویت تعیین شد", createdAt: ago(150) },
        { actorId: byEmail("agent2@org.ir").id, type: "STATUS_CHANGE", field: "status", oldValue: "NEW", newValue: "WAITING_REQUESTER", description: "در انتظار ارسال مستندات از ثبت‌کننده", createdAt: ago(140) },
      ],
    },
  });

  // ---------- ۱۴: خطا — حل‌شده ----------
  const t14 = await createTicket({
    title: "خطای محاسبه مالیات بر ارزش افزوده در فاکتور",
    description:
      "در صدور فاکتور سامانه فروش، مالیات بر ارزش افزوده برای اقلام تخفیف‌دار اشتباه محاسبه می‌شود؛ مالیات روی مبلغ قبل از تخفیف اعمال می‌شود در حالی که باید روی مبلغ پس از تخفیف محاسبه گردد. این باعث مغایرت حسابداری شده است.",
    type: "BUG",
    serviceId: svc("سامانه فروش").id,
    impact: "DEPARTMENT",
    priority: "P2",
    status: "RESOLVED",
    requesterId: byEmail("user@org.ir").id,
    assigneeId: byEmail("agent2@org.ir").id,
    teamId: team("بک‌اند").id,
    firstRespondedAt: ago(1600),
    resolvedAt: ago(300),
    createdAt: ago(1800),
    updatedAt: ago(300),
    bugDetail: {
      create: {
        environment: "PRODUCTION",
        reproducible: true,
        steps: "۱. صدور فاکتور جدید\n۲. افزودن قلم کالا با تخفیف ۱۰ درصدی\n۳. مشاهده ردیف مالیات ارزش افزوده",
        expected: "مالیات روی مبلغ پس از تخفیف محاسبه شود.",
        actual: "مالیات روی مبلغ قبل از تخفیف محاسبه و فاکتور مغایر صادر می‌شود.",
        occurrenceTime: "هفته گذشته",
        relatedRecord: "فاکتور #7712",
      },
    },
    comments: {
      create: [
        {
          authorId: byEmail("agent2@org.ir").id,
          body: "مشکل در فرمول محاسبه مالیات اقلام تخفیف‌دار شناسایی و اصلاح شد. فاکتورهای مغایر در گزارش پیوست مشخص شده‌اند؛ از امروز همه فاکتورهای جدید صحیح محاسبه می‌شوند. لطفاً تأیید کنید.",
          createdAt: ago(300),
        },
      ],
    },
    events: {
      create: [
        { actorId: byEmail("user@org.ir").id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(1800) },
        { actorId: byEmail("agent2@org.ir").id, type: "PRIORITY_CHANGE", field: "priority", newValue: "P2", description: "اولویت تعیین شد", createdAt: ago(1650) },
        { actorId: byEmail("agent2@org.ir").id, type: "ASSIGNMENT", field: "assignee", description: "ارجاع به تیم بک‌اند", createdAt: ago(1600) },
        { actorId: byEmail("agent2@org.ir").id, type: "STATUS_CHANGE", field: "status", oldValue: "NEW", newValue: "IN_PROGRESS", description: "بررسی فرمول محاسبه آغاز شد", createdAt: ago(1550) },
        { actorId: byEmail("agent2@org.ir").id, type: "RESOLVED", description: "فرمول مالیات اصلاح شد و روی محیط پروداکشن منتشر گردید", createdAt: ago(300) },
      ],
    },
  });

  // ---------- ۱۵: خطا — بازگشایی‌شده (RESOLVED قبلاً → REOPENED → IN_PROGRESS) ----------
  const t15 = await createTicket({
    title: "خطا در ورود دو کاربر همزمان به سامانه فروش",
    description:
      "بعد از رفع مشکل قبلی، وقتی دو کاربر با نقش‌های مختلف همزمان وارد سامانه فروش می‌شوند، جلسه (Session) یکی از آن‌ها بی‌دلیل بسته می‌شود. مشکل قبلی حل شده بود اما این سناریوی جدید در چند روز اخیر مشاهده شده و کار واحد فروش را مختل می‌کند.",
    type: "BUG",
    serviceId: svc("سامانه فروش").id,
    impact: "TEAM",
    priority: "P2",
    status: "IN_PROGRESS",
    requesterId: byEmail("user@org.ir").id,
    assigneeId: byEmail("agent2@org.ir").id,
    teamId: team("بک‌اند").id,
    reopenCount: 1,
    firstRespondedAt: ago(2800),
    createdAt: ago(3000),
    updatedAt: ago(120),
    bugDetail: {
      create: {
        environment: "PRODUCTION",
        reproducible: true,
        steps: "۱. کاربر اول وارد سامانه می‌شود\n۲. کاربر دوم با نقش دیگر وارد می‌شود\n۳. جلسه کاربر اول بسته می‌شود",
        expected: "هر دو جلسه به‌صورت همزمان پایدار بمانند.",
        actual: "جلسه کاربر اول به‌طور خودکار بسته می‌شود و باید دوباره وارد شود.",
        occurrenceTime: "روزهای اخیر به‌صورت متناوب",
        relatedRecord: "تیکت قبلی همین موضوع",
      },
    },
    comments: {
      create: [
        {
          authorId: byEmail("agent2@org.ir").id,
          body: "سلام، گزارش شما بررسی شد. ظاهراً مشکل از تنظیمات مدت عمر Session سرور است؛ در حال بررسی دقیق هستیم و تا فردا نتیجه را اعلام می‌کنیم.",
          createdAt: ago(120),
        },
      ],
    },
    events: {
      create: [
        { actorId: byEmail("user@org.ir").id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(3000) },
        { actorId: byEmail("agent2@org.ir").id, type: "ASSIGNMENT", field: "assignee", description: "ارجاع به تیم بک‌اند", createdAt: ago(2850) },
        { actorId: byEmail("agent2@org.ir").id, type: "RESOLVED", description: "تنظیمات سرور اصلاح شد", createdAt: ago(1500) },
        { actorId: byEmail("user@org.ir").id, type: "REOPENED", description: "مشکل در سناریوی ورود همزمان دو کاربر مجدداً مشاهده شد", createdAt: ago(200) },
        { actorId: byEmail("agent2@org.ir").id, type: "STATUS_CHANGE", field: "status", oldValue: "RESOLVED", newValue: "IN_PROGRESS", description: "بررسی مجدد آغاز شد", createdAt: ago(120) },
      ],
    },
  });

  // ---------- پیوست نمونه برای تیکت ۹ (فرم درخواست نیرو) ----------
  const uploadDir = "/home/z/my-project/uploads";
  fs.mkdirSync(uploadDir, { recursive: true });
  const attContent = `درخواست ایجاد حساب کاربری\n\nنام: نیما رستگار\nواحد: بازاریابی\nنقش شغلی: کارآموز\nتاریخ شروع: ۱۴۰۵/۰۸/۰۸\nسامانه‌های موردنیاز: پرتال داخلی، ایمیل سازمانی\nتأیید سرپرست واحد: بله\n`;
  const storedName = `${crypto.randomBytes(16).toString("hex")}.txt`;
  fs.writeFileSync(path.join(uploadDir, storedName), attContent, "utf8");
  await prisma.ticketAttachment.create({
    data: {
      ticketId: t9.id,
      uploaderId: user3.id,
      fileName: "فرم-درخواست-حساب-کارآموز.txt",
      storedName,
      mimeType: "text/plain",
      size: Buffer.byteLength(attContent, "utf8"),
    },
  });
  await prisma.ticketEvent.create({
    data: { ticketId: t9.id, actorId: user3.id, type: "ATTACHMENT", description: "پیوست «فرم-درخواست-حساب-کارآموز.txt» بارگذاری شد" },
  });

  console.log("✅ تیکت‌های نمونه جدید اضافه شدند:", {
    tickets: [t9.number, t10.number, t11.number, t12.number, t13.number, t14.number, t15.number],
    statuses: {
      [t9.number]: "NEW + پیوست",
      [t10.number]: "NEW بحرانی P1",
      [t11.number]: "IN_PROGRESS + یادداشت داخلی",
      [t12.number]: "WAITING_TEAM",
      [t13.number]: "WAITING_REQUESTER",
      [t14.number]: "RESOLVED",
      [t15.number]: "بازگشایی‌شده (REOPENED)",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
