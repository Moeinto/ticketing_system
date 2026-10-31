import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 شروع داده‌های اولیه...");

  await prisma.ticketEvent.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticketBugDetail.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.service.deleteMany();

  // ---------- تیم‌ها ----------
  const teamFE = await prisma.team.create({ data: { name: "فرانت‌اند", description: "تیم توسعه رابط کاربری" } });
  const teamBE = await prisma.team.create({ data: { name: "بک‌اند", description: "تیم توسعه سرویس‌های سمت سرور" } });
  const teamInfra = await prisma.team.create({ data: { name: "زیرساخت", description: "تیم شبکه، سرور و دواپس" } });
  const teamProduct = await prisma.team.create({ data: { name: "محصول", description: "تیم محصول و تحلیل" } });

  // ---------- کاربران ----------
  const admin = await prisma.user.create({
    data: { name: "مهدی رضایی", email: "admin@org.ir", passwordHash: hashPassword("admin123"), role: "ADMIN" },
  });
  const lead = await prisma.user.create({
    data: { name: "زهرا کریمی", email: "lead@org.ir", passwordHash: hashPassword("lead123"), role: "LEAD" },
  });
  const agent1 = await prisma.user.create({
    data: { name: "علی احمدی", email: "agent@org.ir", passwordHash: hashPassword("agent123"), role: "AGENT", teamId: teamFE.id },
  });
  const agent2 = await prisma.user.create({
    data: { name: "فاطمه موسوی", email: "agent2@org.ir", passwordHash: hashPassword("agent123"), role: "AGENT", teamId: teamBE.id },
  });
  const agent3 = await prisma.user.create({
    data: { name: "حسین نوری", email: "agent3@org.ir", passwordHash: hashPassword("agent123"), role: "AGENT", teamId: teamInfra.id },
  });
  const user1 = await prisma.user.create({
    data: { name: "سارا محمدی", email: "user@org.ir", passwordHash: hashPassword("user123"), role: "REQUESTER" },
  });
  const user2 = await prisma.user.create({
    data: { name: "رضا شریفی", email: "user2@org.ir", passwordHash: hashPassword("user123"), role: "REQUESTER" },
  });

  // ---------- سرویس‌ها ----------
  const svcSales = await prisma.service.create({ data: { name: "سامانه فروش", description: "سامانه ثبت سفارش و فروش" } });
  const svcPortal = await prisma.service.create({ data: { name: "پرتال مشتریان", description: "پرتال الکترونیک مشتریان" } });
  const svcHR = await prisma.service.create({ data: { name: "سامانه منابع انسانی", description: "سامانه حضور و غیاب و مرخصی" } });
  const svcNetwork = await prisma.service.create({ data: { name: "زیرساخت شبکه", description: "شبکه، VPN و ایمیل سازمانی" } });
  const svcFinance = await prisma.service.create({ data: { name: "سامانه مالی", description: "سامانه حسابداری و خزانه" } });

  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60 * 1000);

  // ---------- تیکت‌های نمونه ----------
  const t1 = await prisma.ticket.create({
    data: {
      number: 1,
      title: "خطا در ثبت سفارش در سامانه فروش",
      description:
        "هنگام ثبت سفارش جدید در سامانه فروش، پس از زدن دکمه «ثبت نهایی» پیام خطای 500 نمایش داده می‌شود و سفارش ثبت نمی‌شود. این مشکل از امروز صبح برای چند کاربر پیش آمده و نیاز به بررسی فوری دارد.",
      type: "BUG",
      serviceId: svcSales.id,
      impact: "DEPARTMENT",
      priority: "P1",
      status: "IN_PROGRESS",
      requesterId: user1.id,
      assigneeId: agent2.id,
      teamId: teamBE.id,
      firstRespondedAt: ago(90),
      createdAt: ago(180),
      updatedAt: ago(30),
      bugDetail: {
        create: {
          environment: "PRODUCTION",
          reproducible: true,
          steps: "۱. ورود به سامانه فروش\n۲. ایجاد سفارش جدید\n۳. انتخاب مشتری و افزودن کالا\n۴. کلیک روی دکمه «ثبت نهایی»",
          expected: "سفارش با موفقیت ثبت شود و شماره سفارش نمایش داده شود.",
          actual: "پیام خطای «Internal Server Error 500» نمایش داده شده و سفارش ثبت نمی‌شود.",
          occurrenceTime: "امروز ساعت ۸:۳۰ صبح",
          relatedRecord: "سفارش آزمایشی #4451",
        },
      },
      comments: {
        create: [
          {
            authorId: agent2.id,
            body: "سلام، ممنون از گزارش کامل. مشکل را در لاگ سرور بررسی می‌کنم و نتیجه را اطلاع می‌دهم. در صورت امکان لاگ مرورگر خود را نیز ارسال کنید.",
            createdAt: ago(90),
          },
          {
            authorId: user1.id,
            body: "اسکرین‌شات پیام خطا را پیوست کردم. منتظر بررسی شما هستیم چون واحد فروش عملاً متوقف شده.",
            createdAt: ago(70),
          },
          {
            authorId: agent2.id,
            body: "تیم بک‌اند در حال بررسی تراکنش دیتابیس است. ظاهراً مشکل از قفل شدن یکی از جداول است.",
            isInternal: true,
            createdAt: ago(30),
          },
        ],
      },
      events: {
        create: [
          { actorId: user1.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(180) },
          { actorId: agent2.id, type: "PRIORITY_CHANGE", field: "priority", oldValue: "P3", newValue: "P1", description: "اولویت بر اساس اختلال گسترده به بحرانی تغییر یافت", createdAt: ago(100) },
          { actorId: agent2.id, type: "ASSIGNMENT", field: "assignee", description: "ارجاع به تیم بک‌اند و تخصیص به فاطمه موسوی", createdAt: ago(95) },
          { actorId: agent2.id, type: "STATUS_CHANGE", field: "status", oldValue: "NEW", newValue: "IN_PROGRESS", description: "بررسی آغاز شد", createdAt: ago(90) },
          { actorId: agent2.id, type: "INTERNAL_NOTE", description: "یادداشت داخلی ثبت شد", createdAt: ago(30) },
        ],
      },
    },
  });

  const t2 = await prisma.ticket.create({
    data: {
      number: 2,
      title: "درخواست دسترسی به گزارش‌های سامانه مالی",
      description:
        "برای انجام پروژه تسویه پایان ماه، به گزارش «تراز حساب‌ها» و «گردش چک» در سامانه مالی نیاز دارم. لطفاً سطح دسترسی کاربر من را ارتقا دهید. تأییدیه سرپرست واحد مالی نیز دریافت شده است.",
      type: "ACCESS",
      serviceId: svcFinance.id,
      impact: "SINGLE_USER",
      priority: "P3",
      status: "WAITING_REQUESTER",
      requesterId: user2.id,
      assigneeId: agent1.id,
      firstRespondedAt: ago(1200),
      createdAt: ago(1400),
      updatedAt: ago(1100),
      comments: {
        create: [
          {
            authorId: agent1.id,
            body: "سلام، برای پیگیری درخواست دسترسی لطفاً فرم تأییدیه سرپرست را با امضای دیجیتال بارگذاری کنید.",
            createdAt: ago(1200),
          },
        ],
      },
      events: {
        create: [
          { actorId: user2.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(1400) },
          { actorId: agent1.id, type: "PRIORITY_CHANGE", field: "priority", newValue: "P3", description: "اولویت تعیین شد", createdAt: ago(1210) },
          { actorId: agent1.id, type: "STATUS_CHANGE", field: "status", oldValue: "NEW", newValue: "WAITING_REQUESTER", description: "در انتظار بارگذاری فرم تأییدیه", createdAt: ago(1200) },
        ],
      },
    },
  });

  const t3 = await prisma.ticket.create({
    data: {
      number: 3,
      title: "کندی پرتال مشتریان در ساعات اوج",
      description:
        "پرتال مشتریان بین ساعت ۱۰ تا ۱۲ ظهر به‌شدت کند می‌شود و بارگذاری صفحات تا ۱۵ ثانیه طول می‌کشد. چند مشتری در این باره تماس گرفتند و نیاز است علت بررسی شود.",
      type: "BUG",
      serviceId: svcPortal.id,
      impact: "ORGANIZATION",
      priority: "P2",
      status: "WAITING_TEAM",
      requesterId: user1.id,
      assigneeId: agent3.id,
      teamId: teamInfra.id,
      firstRespondedAt: ago(2000),
      createdAt: ago(2200),
      updatedAt: ago(600),
      bugDetail: {
        create: {
          environment: "PRODUCTION",
          reproducible: false,
          steps: "مشکل در بازه زمانی مشخص روزانه تکرار می‌شود اما مراحل دقیق بازتولید ثابتی ندارد.",
          expected: "بارگذاری صفحات زیر ۳ ثانیه باشد.",
          actual: "بارگذاری صفحات تا ۱۵ ثانیه طول می‌کشد.",
          occurrenceTime: "۱۰ تا ۱۲ ظهر",
        },
      },
      comments: {
        create: [
          {
            authorId: agent3.id,
            body: "بررسی اولیه نشان می‌دهد بار سرور دیتابیس در ساعات اوج بالاست. موضوع به تیم زیرساخت ارجاع شد تا منابع سرور ارتقا یابد.",
            createdAt: ago(2000),
          },
        ],
      },
      events: {
        create: [
          { actorId: user1.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(2200) },
          { actorId: agent3.id, type: "ASSIGNMENT", field: "team", description: "ارجاع به تیم زیرساخت", createdAt: ago(2100) },
          { actorId: agent3.id, type: "STATUS_CHANGE", field: "status", oldValue: "IN_PROGRESS", newValue: "WAITING_TEAM", description: "در انتظار ارتقای منابع سرور", createdAt: ago(600) },
        ],
      },
    },
  });

  const t4 = await prisma.ticket.create({
    data: {
      number: 4,
      title: "راهنمای ثبت مرخصی در سامانه منابع انسانی",
      description:
        "در سامانه منابع انسانی گزینه «مرخصی ساعتی» را پیدا نمی‌کنم. لطفاً راهنمایی کنید چگونه مرخصی ساعتی ثبت کنم و آیا نیاز به تأیید سرپرست دارد؟",
      type: "GUIDANCE",
      serviceId: svcHR.id,
      impact: "SINGLE_USER",
      priority: "P4",
      status: "RESOLVED",
      requesterId: user2.id,
      assigneeId: agent1.id,
      firstRespondedAt: ago(3400),
      resolvedAt: ago(3200),
      createdAt: ago(3600),
      updatedAt: ago(3200),
      comments: {
        create: [
          {
            authorId: agent1.id,
            body: "سلام، برای ثبت مرخصی ساعتی از منوی «درخواست‌های من» بخش «مرخصی» گزینه «نوع مرخصی» را روی «ساعتی» قرار دهید. تأیید نهایی با سرپرست شماست. راهنمای تصویری در پایگاه دانش نیز بارگذاری شده است.",
            createdAt: ago(3400),
          },
          {
            authorId: user2.id,
            body: "ممنون، مشکل حل شد و مرخصی را ثبت کردم.",
            createdAt: ago(3300),
          },
        ],
      },
      events: {
        create: [
          { actorId: user2.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(3600) },
          { actorId: agent1.id, type: "PRIORITY_CHANGE", field: "priority", newValue: "P4", description: "اولویت تعیین شد", createdAt: ago(3500) },
          { actorId: agent1.id, type: "RESOLVED", description: "راهنمایی کامل ارائه شد", createdAt: ago(3200) },
        ],
      },
    },
  });

  const t5 = await prisma.ticket.create({
    data: {
      number: 5,
      title: "قطعی اتصال VPN سازمانی",
      description:
        "از دیشب اتصال VPN در منزل وصل نمی‌شود و پیام «Authentication Failed» نمایش داده می‌شود. رمز عبور را نیز ریست کردم اما مشکل برطرف نشد. برای دورکاری فردا به اتصال پایدار نیاز دارم.",
      type: "BUG",
      serviceId: svcNetwork.id,
      impact: "TEAM",
      priority: "P2",
      status: "NEW",
      requesterId: user1.id,
      createdAt: ago(90),
      updatedAt: ago(90),
      bugDetail: {
        create: {
          environment: "PRODUCTION",
          reproducible: true,
          steps: "۱. اتصال به VPN با کلاینت Cisco\n۲. وارد کردن نام کاربری و رمز\n۳. کلیک دکمه Connect",
          expected: "اتصال برقرار شود.",
          actual: "پیام Authentication Failed نمایش داده می‌شود.",
          occurrenceTime: "دیشب ساعت ۲۱",
        },
      },
      events: {
        create: [{ actorId: user1.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(90) }],
      },
    },
  });

  const t6 = await prisma.ticket.create({
    data: {
      number: 6,
      title: "درخواست تغییر فیلد «کد پستی» در فرم مشتریان",
      description:
        "در فرم ثبت مشتریان، فیلد کد پستی اختیاری است و باعث می‌شود سوپاپ اکسترس بدون کد پستی ثبت شود. پیشنهاد می‌کنیم این فیلد برای مشتریان سازمانی اجباری شود یا اعتبارسنجی ۱۰ رقمی بودن اضافه گردد.",
      type: "CHANGE",
      serviceId: svcSales.id,
      impact: "DEPARTMENT",
      status: "NEW",
      requesterId: user2.id,
      createdAt: ago(400),
      updatedAt: ago(400),
      events: {
        create: [{ actorId: user2.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(400) }],
      },
    },
  });

  const t7 = await prisma.ticket.create({
    data: {
      number: 7,
      title: "ایمیل سازمانی ارسال نمی‌شود",
      description:
        "ایمیل‌های خروجی صندوق من در Outlook در صف مانده و ارسال نمی‌شود. ایمیل داخلی ارسال می‌شود اما ایمیل بیرونی با پیام «Delivery Delayed» برگشت می‌خورد.",
      type: "BUG",
      serviceId: svcNetwork.id,
      impact: "TEAM",
      priority: "P3",
      status: "CLOSED",
      requesterId: user2.id,
      assigneeId: agent3.id,
      teamId: teamInfra.id,
      firstRespondedAt: ago(5000),
      resolvedAt: ago(4800),
      closedAt: ago(4500),
      createdAt: ago(5200),
      updatedAt: ago(4500),
      bugDetail: {
        create: {
          environment: "PRODUCTION",
          reproducible: true,
          steps: "۱. نوشتن ایمیل جدید\n۲. افزودن گیرنده بیرونی\n۳. کلیک Send",
          expected: "ایمیل حداکثر تا چند دقیقه بعد ارسال شود.",
          actual: "ایمیل در صف Outbox می‌ماند و برگشت Delivery Delayed دریافت می‌شود.",
        },
      },
      comments: {
        create: [
          {
            authorId: agent3.id,
            body: "مشکل از لیست سیاه شدن IP سرور ایمیل بود. با مرجع مربوطه مکاتبه شد و IP آزاد گردید. لطفاً بررسی کنید.",
            createdAt: ago(4900),
          },
          {
            authorId: user2.id,
            body: "بررسی کردم، ارسال ایمیل درست شد. ممنون.",
            createdAt: ago(4810),
          },
        ],
      },
      events: {
        create: [
          { actorId: user2.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(5200) },
          { actorId: agent3.id, type: "ASSIGNMENT", field: "assignee", description: "تخصیص به حسین نوری", createdAt: ago(5010) },
          { actorId: agent3.id, type: "RESOLVED", description: "مشکل IP سرور ایمیل رفع شد", createdAt: ago(4800) },
          { actorId: agent3.id, type: "CLOSED", description: "تیکت پس از تأیید ثبت‌کننده بسته شد", createdAt: ago(4500) },
        ],
      },
    },
  });

  const t8 = await prisma.ticket.create({
    data: {
      number: 8,
      title: "خطا در نمایش نمودار داشبورد پرتال",
      description:
        "نمودار «روند فروش ماهانه» در داشبورد پرتال مشتریان خالی نمایش داده می‌شود و فقط محورها دیده می‌شوند. در مرورگر Chrome و Firefox هر دو تست شد و مشکل دارد.",
      type: "BUG",
      serviceId: svcPortal.id,
      impact: "TEAM",
      priority: "P3",
      status: "IN_PROGRESS",
      requesterId: user1.id,
      assigneeId: agent1.id,
      teamId: teamFE.id,
      firstRespondedAt: ago(150),
      createdAt: ago(200),
      updatedAt: ago(100),
      bugDetail: {
        create: {
          environment: "PRODUCTION",
          reproducible: true,
          steps: "۱. ورود به پرتال مشتریان\n۲. رفتن به صفحه داشبورد\n۳. مشاهده نمودار روند فروش ماهانه",
          expected: "نمودار با داده‌های ماه جاری نمایش داده شود.",
          actual: "نمودار خالی است و فقط محورها نمایش داده می‌شوند.",
          relatedRecord: "داشبورد پرتال > تب فروش",
        },
      },
      comments: {
        create: [
          {
            authorId: agent1.id,
            body: "ممنون از گزارش. ظاهراً API داده‌های نمودار خطای 404 برمی‌گرداند؛ در حال بررسی هستم.",
            createdAt: ago(150),
          },
        ],
      },
      events: {
        create: [
          { actorId: user1.id, type: "CREATED", description: "تیکت ایجاد شد", createdAt: ago(200) },
          { actorId: agent1.id, type: "ASSIGNMENT", field: "assignee", description: "تخصیص به علی احمدی (فرانت‌اند)", createdAt: ago(160) },
          { actorId: agent1.id, type: "STATUS_CHANGE", field: "status", oldValue: "NEW", newValue: "IN_PROGRESS", description: "بررسی آغاز شد", createdAt: ago(150) },
        ],
      },
    },
  });

  console.log("✅ داده‌های اولیه ثبت شد:", {
    tickets: [t1.number, t2.number, t3.number, t4.number, t5.number, t6.number, t7.number, t8.number],
    users: 7,
    teams: 4,
    services: 5,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
