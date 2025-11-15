import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  Shield,
  Globe2,
  Cpu,
  Users,
  Mountain,
  Activity,
  Rocket,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

/* ===================================================================
   AboutMystic.jsx — Neo Tech Travel (dark, crisp, mystical travel)
   - Tailwind + Framer Motion + Lucide
   - Chủ đề: Du lịch huyền bí, hiện đại, công nghệ
==================================================================== */

export default function AboutMystic() {
  return (
    <main className="relative overflow-hidden bg-[#0A0B10] text-zinc-200">
      <GridBackdrop />
      <NoiseOverlay />
      <HeroSection />

      {/* Mission */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <NeoCard className="p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-[1.2fr_.8fr]">
            <div>
              <Eyebrow>Travel Mission</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Sứ mệnh của chúng tôi
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Kiến tạo trải nghiệm du lịch mang sắc thái huyền bí nhưng sắc nét — nơi công nghệ
                dẫn đường cho cảm hứng khám phá. Chúng tôi ưu tiên sự an toàn, lịch trình thông minh
                và cảm giác đắm chìm xuyên suốt hành trình.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Chip icon={<Shield size={14} />}>An toàn</Chip>
                <Chip icon={<Activity size={14} />}>Lịch trình thông minh</Chip>
                <Chip icon={<Sparkles size={14} />}>Trải nghiệm đắm chìm</Chip>
                <Chip icon={<Globe2 size={14} />}>Toàn cầu</Chip>
              </div>
            </div>
            <div className="relative">
              <ParallaxOrb className="left-6 top-6 h-44 w-44 from-fuchsia-500/35 to-indigo-600/35" />
              <ParallaxOrb className="right-6 bottom-6 h-28 w-28 from-cyan-500/30 to-violet-600/30" speed={-0.15} />
              <NeoCard className="relative z-10 p-6">
                <h3 className="text-xl font-medium">Tôn chỉ thiết kế</h3>
                <p className="mt-3 text-sm text-zinc-400">
                  Tối giản nhưng rõ ràng. Điểm chạm tinh gọn, dẫn hướng trực quan. Bản đồ đêm, neon chỉ lối
                  và mô-đun gợi ý thông minh cho từng chặng.
                </p>
                <ul className="mt-5 space-y-3 text-sm">
                  {[
                    "Hành trình mạch lạc, không phô diễn.",
                    "Bản đồ đêm + neon tím/xanh lam chỉ lối.",
                    "Ảnh/video sống động, viền sắc nét, nhấn vừa đủ.",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400/80" />
                      <span className="text-zinc-300">{t}</span>
                    </li>
                  ))}
                </ul>
              </NeoCard>
            </div>
          </div>
        </NeoCard>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-8">
        <TechDivider label="Số liệu du lịch" />
        <TechStats />
      </section>

      {/* Values */}
      <section id="values" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <HeaderEyebrow title="Giá trị du lịch cốt lõi" subtitle="Những điều dẫn lối hành trình" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ValueCard icon={<Sparkles />} title="Hành trình cá nhân hoá">
            Gợi ý điểm đến, nhịp độ tham quan, trải nghiệm theo sở thích và ngân sách của bạn.
          </ValueCard>
          <ValueCard icon={<Shield />} title="An toàn & tin cậy">
            Bảo vệ dữ liệu, cảnh báo rủi ro, liên hệ khẩn cấp một chạm — yên tâm suốt chuyến đi.
          </ValueCard>
          <ValueCard icon={<Globe2 />} title="Linh hoạt hành trình">
            Tuỳ biến lộ trình theo thời tiết, thời gian mở cửa, phương tiện; đồng bộ đặt chỗ theo thời gian thực.
          </ValueCard>
          <ValueCard icon={<Users />} title="Trung tâm du khách">
            Điểm chạm rõ ràng, hướng dẫn từng bước, hỗ trợ 24/7 — để bạn chỉ việc tận hưởng.
          </ValueCard>
          <ValueCard icon={<Mountain />} title="Chuẩn mực dịch vụ">
            Đối tác được thẩm định, quy trình chuẩn, phản hồi nhanh và minh bạch.
          </ValueCard>
          <ValueCard icon={<Rocket />} title="Đặt dịch vụ chớp nhoáng">
            Vé điện tử, check‑in tự động, thanh toán tối giản — mọi thứ trong vài chạm.
          </ValueCard>
        </div>
      </section>

      {/* Timeline */}
      <section id="story" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <HeaderEyebrow title="Hành trình" subtitle="Từ ý tưởng đến khám phá" />
        <Timeline />
      </section>

      {/* Team */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <HeaderEyebrow title="Đội ngũ" subtitle="Những kẻ say mê bóng đêm và ánh sáng" />
        <TeamTeaser />
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <HeaderEyebrow title="Câu hỏi thường gặp" subtitle="Nếu vẫn còn băn khoăn" />
        <FAQ />
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <CTA />
      </section>
    </main>
  );
}

/* ------------------------- Backdrops & Utils ------------------------- */
function GridBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* gradient glows */}
      <div className="absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.18),transparent_60%)] blur-3xl" />
      <div className="absolute -bottom-40 right-10 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.16),transparent_60%)] blur-3xl" />
      <div className="absolute -bottom-32 left-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.07),transparent_60%)] blur-3xl" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.60))]" />
    </div>
  );
}

function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] mix-blend-soft-light"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
      }}
    />
  );
}

function ParallaxOrb({ className = "", speed = 0.15 }) {
  const ref = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1200], [0, 100 * speed]);
  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={`pointer-events-none absolute rounded-full bg-gradient-to-br ${className}`}
    />
  );
}

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-widest text-fuchsia-300/90">
      <Cpu size={12} /> {children}
    </span>
  );
}

/* ------------------------------ Hero ------------------------------ */
function HeroSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px", once: true });
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1200], [0, -60]);
  const y2 = useTransform(scrollY, [0, 1200], [0, 80]);

  return (
    <header ref={ref} className="relative z-10 pt-28 pb-24">
      {/* parallax glows */}
      <motion.div style={{ y: y1 }} className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-16 h-44 w-44 rounded-full bg-gradient-to-br from-fuchsia-600/30 to-indigo-600/30 blur-2xl" />
      </motion.div>
      <motion.div style={{ y: y2 }} className="pointer-events-none absolute inset-0">
        <div className="absolute right-6 top-24 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-400/25 to-blue-700/25 blur-2xl" />
      </motion.div>

      <MouseSpotlight>
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs tracking-wide text-zinc-300 backdrop-blur-md">
              <Sparkles size={14} /> ABOUT US
            </span>
            <h1 className="mt-5 text-4xl leading-tight sm:text-5xl md:text-6xl font-semibold">
              <span className="bg-gradient-to-br from-zinc-50 to-zinc-300 bg-clip-text text-transparent">
                Khám phá thế giới
              </span>
              <br />
              <span className="bg-gradient-to-r from-fuchsia-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                trong sắc tím huyền bí
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
              Hành trình được cá nhân hoá với cảm hứng đêm huyền bí: gợi ý điểm đến, lộ trình mượt,
              đặt dịch vụ nhanh chóng — tất cả trong một trải nghiệm.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href="#values"
                className="group inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-5 py-2.5 text-sm font-medium text-zinc-100 backdrop-blur-md transition hover:shadow-[0_0_20px_rgba(217,70,239,0.25)]"
              >
                Khám phá giá trị
                <ArrowRight className="transition group-hover:translate-x-0.5" size={16} />
              </a>
              <a
                href="#story"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-300 backdrop-blur-md hover:bg-white/10"
              >
                Câu chuyện
              </a>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 1.0, duration: 2.4 }}
              className="mx-auto mt-12 h-[1px] w-52 bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent"
            />
          </motion.div>
        </div>
      </MouseSpotlight>
    </header>
  );
}

function MouseSpotlight({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      className="relative"
      style={{
        background:
          `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Cards ------------------------------- */
function NeoCard({ className = "", children }) {
  return (
    <div className={`relative rounded-2xl p-px shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ${className}`}>
      {/* Outer gradient ring */}
      <div className="absolute inset-0 -z-10 rounded-2xl bg-[conic-gradient(from_140deg_at_50%_50%,rgba(217,70,239,0.25),rgba(99,102,241,0.25),rgba(34,211,238,0.2),rgba(217,70,239,0.25))] opacity-40 blur-[6px]" />
      {/* Card surface with inner border */}
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" />
        {children}
      </div>
    </div>
  );
}

function Chip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
      {icon}
      {children}
    </span>
  );
}

function HeaderEyebrow({ title, subtitle }) {
  return (
    <div className="text-center">
      <span className="inline-block text-[11px] tracking-widest text-fuchsia-300/90">{subtitle}</span>
      <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-zinc-100">{title}</h2>
    </div>
  );
}

/* ------------------------------ Values ------------------------------ */
function ValueCard({ icon, title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 1.0 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl will-change-transform"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-cyan-400/10 blur-2xl transition group-hover:scale-110" />
      <div className="relative z-10">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 ring-1 ring-inset ring-white/5">
          {icon}
        </div>
        <h3 className="text-lg font-medium text-zinc-100">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{children}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Stats ------------------------------ */
function TechStats() {
  const stats = [
    { label: "Hành trình đã tổ chức", value: "120+" },
    { label: "Điểm đến toàn cầu", value: "60+" },
    { label: "Mức hài lòng", value: "4.9/5" },
    { label: "Thời gian phản hồi", value: "< 5 phút" },
  ];
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: i * 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-xl"
        >
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="text-2xl font-semibold text-zinc-100">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-zinc-400">{s.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TechDivider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" />
      <span className="text-[11px] tracking-widest text-zinc-400">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" />
    </div>
  );
}

/* ----------------------------- Timeline ----------------------------- */
function Timeline() {
  const items = [
    { year: "2022", title: "Khởi đầu hành trình", text: "Thai nghén nền tảng du lịch huyền bí, gợi mở cách khám phá mới." },
    { year: "2023", title: "Mở rộng điểm đến", text: "Thêm bản đồ đêm, tuyến điểm đặc sắc và gợi ý theo mùa." },
    { year: "2024", title: "Nâng tầm trải nghiệm", text: "Cá nhân hoá sâu, đặt dịch vụ đa kênh, đồng bộ thời gian thực." },
    { year: "2025", title: "Cộng đồng lữ khách", text: "Kết nối chuyên gia địa phương, chia sẻ lộ trình và cảm hứng." },
  ];

  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-700/60 to-transparent" />
      <div className="space-y-8">
        {items.map((it, idx) => (
          <motion.div
            key={it.year}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1.0, delay: idx * 0.1 }}
            className="relative pl-10"
          >
            <div className="absolute left-0 top-1.5 h-2 w-2 -translate-x-[3px] rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.6)]" />
            <div className="text-xs text-fuchsia-300/90">{it.year}</div>
            <div className="text-lg font-medium text-zinc-100">{it.title}</div>
            <div className="mt-1 text-sm text-zinc-400">{it.text}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Team ------------------------------ */
function TeamTeaser() {
  const members = [
    { name: "Lý Trung Kiên", role: "Team Leader", img: "/images/avatars/a1.jpg" },
    { name: "Phạm Thị Huệ", role: "Backend + Designer", img: "/images/avatars/a2.jpg" },
    { name: "Phan Anh Khoa", role: "System Analyst", img: "/images/avatars/a3.jpg" },
    { name: "Đặng Thuyền Ngọc", role: "Frontend + Designer", img: "/images/avatars/a4.jpg" },
  ];
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {members.map((m, i) => (
        <motion.div
          key={m.name}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: i * 0.1 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-fuchsia-500/20 to-indigo-500/20 blur-xl" />
              <img src={m.img} alt={m.name} className="relative z-10 h-24 w-24 rounded-full object-cover ring-2 ring-white/15" />
            </div>
            <div className="mt-4 text-center">
              <div className="font-medium text-zinc-100">{m.name}</div>
              <div className="text-xs text-zinc-400">{m.role}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------- FAQ ------------------------------- */
function FAQ() {
  const faqs = [
    { q: "Phong cách huyền bí có ảnh hưởng đến khả năng đọc?", a: "Tone tối tương phản cao, chữ rõ nét; bản đồ đêm vẫn đọc tốt và an toàn khi di chuyển ban đêm." },
    { q: "Hiệu ứng có làm trang chậm?", a: "Hiệu ứng được tối ưu; dữ liệu bản đồ và lịch trình được cache thông minh, mượt ngay cả khi mạng yếu." },
    { q: "Có hỗ trợ tuỳ biến hành trình/hoàn huỷ?", a: "Có. Tuỳ biến theo sở thích, ngân sách; chính sách hoàn huỷ minh bạch theo gói và đối tác." },
  ];
  return (
    <NeoCard>
      <div className="divide-y divide-white/10">
        {faqs.map((f, i) => (
          <Accordion key={i} question={f.q} answer={f.a} />
        ))}
      </div>
    </NeoCard>
  );
}

function Accordion({ question, answer }) {
  const ref = useRef(null);
  const open = useInView(ref, { amount: 0.6, once: true });
  return (
    <details ref={ref} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm text-zinc-200">
        <span>{question}</span>
        <ChevronDown className="transition group-open:rotate-180" size={16} />
      </summary>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={open ? { opacity: 1, height: "auto" } : {}}
        transition={{ duration: 0.7 }}
        className="px-5 pb-5 text-sm text-zinc-400"
      >
        {answer}
      </motion.div>
    </details>
  );
}

/* -------------------------------- CTA -------------------------------- */
function CTA() {
  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div className="absolute inset-0 -z-10 rounded-3xl bg-[conic-gradient(from_140deg_at_50%_50%,rgba(217,70,239,0.3),rgba(99,102,241,0.25),rgba(34,211,238,0.25),rgba(217,70,239,0.3))] opacity-40 blur-[8px]" />
      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/10 to-cyan-500/10 p-10 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 blur-2xl" />
        <div className="relative z-10 grid gap-6 md:grid-cols-[1.4fr_.6fr] md:items-center">
          <div>
            <h3 className="text-2xl md:text-3xl font-semibold text-zinc-100">Sẵn sàng khai mở hành trình huyền bí?</h3>
            <p className="mt-2 max-w-xl text-sm text-zinc-300">Khởi hành với lộ trình cá nhân hoá, điểm đến kỳ bí và trải nghiệm đắm chìm — tất cả trong một ứng dụng.</p>
          </div>
          <div className="flex gap-3 md:justify-end">
            <a href="#" className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-200 backdrop-blur-md hover:bg-white/10">Xem hành trình mẫu</a>
            <a href="#" className="group inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-5 py-2.5 text-sm font-medium text-zinc-100 backdrop-blur-md hover:shadow-[0_0_24px_rgba(217,70,239,0.35)]">Tư vấn ngay <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></a>
          </div>
        </div>
      </div>
    </div>
  );
}
