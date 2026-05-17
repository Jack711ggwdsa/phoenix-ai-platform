import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoenixLogo } from "@/components/PhoenixLogo";
import { AIMascot } from "@/components/AIMascot";
import { ChatPopup } from "@/components/ChatPopup";
import { CyberBackground } from "@/components/CyberBackground";
import {
  ArrowRight,
  Bot,
  MessageSquare,
  Sparkles,
  Zap,
  Mic,
  Globe2,
  Workflow,
  Users,
  PhoneCall,
  CheckCircle2,
  Languages,
  Cpu,
  Network,
  ShieldCheck,
  Clock,
  CalendarCheck,
  BarChart3,
  Instagram,
  Send,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Phoenix AI — AI Auto Closing System Platform" },
      {
        name: "description",
        content:
          "Phoenix AI replies, follows up, qualifies and converts leads automatically across WhatsApp, Messenger, Instagram, Telegram and Voice AI.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* Ambient cinematic background */}
      <CyberBackground />

      <Nav />
      <Hero />
      <ChatStream />
      <LogoStrip />
      <CapabilitiesSection />
      <PlatformsSection />
      <LanguageSection />
      <VoiceSection />
      <WorkflowSection />
      <CtaSection />
      <Footer />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── NAV */
function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <PhoenixLogo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#capabilities" className="hover:text-foreground transition">Capabilities</a>
          <a href="#platforms" className="hover:text-foreground transition">Platforms</a>
          <a href="#languages" className="hover:text-foreground transition">Languages</a>
          <a href="#voice" className="hover:text-foreground transition">Voice AI</a>
        </nav>
        <Link
          to="/login"
          className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-primary hover:text-foreground hover:shadow-neon"
        >
          <span className="live-dot" />
          Launch console
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────── HERO */
function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
            <Sparkles size={12} /> AI Auto Closing System Platform
          </span>

          <h1 className="mt-5 font-display text-6xl font-semibold leading-[0.95] sm:text-7xl lg:text-[5.5rem]">
            <span className="text-gradient-ai drop-shadow-[0_0_30px_oklch(0.78_0.18_250/0.4)]">PHOENIX&nbsp;AI</span>
          </h1>

          <h2 className="mt-5 font-display text-2xl leading-tight text-foreground/95 sm:text-3xl">
            AI that automatically <span className="text-gradient-neon">closes your customers.</span>
          </h2>

          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Phoenix AI replies, follows up, qualifies, and converts leads automatically across
            <span className="text-foreground/90"> WhatsApp, Messenger, Instagram, Telegram</span> and
            <span className="text-foreground/90"> Voice AI</span>.
          </p>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-neon px-6 py-3 text-sm font-semibold text-primary-foreground shadow-neon transition glow-pulse hover:opacity-95"
            >
              Activate AI system
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#capabilities"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/40 px-6 py-3 text-sm font-medium text-foreground/80 transition hover:border-primary hover:text-foreground"
            >
              <Cpu size={14} /> Explore the platform
            </a>
          </div>

          {/* Floating capability mini-cards */}
          <div className="mt-10 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { i: MessageSquare, t: "WhatsApp Auto Reply" },
              { i: Instagram, t: "Instagram Lead Convert" },
              { i: Send, t: "Messenger Follow-up" },
              { i: Mic, t: "Voice AI Calling" },
              { i: BarChart3, t: "AI Analytics" },
              { i: CalendarCheck, t: "AI Booking" },
            ].map(({ i: Icon, t }, k) => (
              <div
                key={t}
                className="holo-card neon-border animate-float flex items-center gap-2 px-2.5 py-2 text-[11px]"
                style={{ animationDelay: `${k * 0.4}s` }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Icon size={12} />
                </span>
                <span className="font-medium text-foreground/90">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative h-[560px]">
      <div className="absolute inset-0 flex items-center justify-center">
        <AIMascot size={420} />
      </div>

      <div className="absolute -left-2 top-2">
        <ChatPopup
          platform="whatsapp" avatar="A" name="Aiman"
          customer="Hi, masih ada stock?"
          reply="Ada! Saya hantar link tempahan sekarang ✨" delay={0}
        />
      </div>
      <div className="absolute right-0 top-16">
        <ChatPopup
          platform="instagram" avatar="L" name="lily.kl"
          customer="Berapa harga?"
          reply="RM199 — limited promo this week 🎁" delay={0.3}
        />
      </div>
      <div className="absolute -left-4 bottom-6 hidden md:block">
        <ChatPopup
          platform="messenger" avatar="M" name="May"
          customer="Can book today?"
          reply="Yes! I've reserved 3pm for you. Confirm?" delay={0.6}
        />
      </div>
      <div className="absolute -right-2 bottom-2">
        <ChatPopup
          platform="telegram" avatar="陈" name="陈先生"
          customer="Location 在哪里？"
          reply="我们在 Mid Valley, 我发地图给您 📍" delay={0.9}
        />
      </div>

      <div className="absolute left-1/2 top-2 -translate-x-1/2">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary backdrop-blur">
          <Activity size={10} className="animate-pulse" /> Phoenix AI · Online
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── CHAT STREAM */
function ChatStream() {
  const popups: Array<{
    platform: "whatsapp" | "instagram" | "messenger" | "telegram";
    avatar: string; name: string; customer: string; reply: string;
  }> = [
    { platform: "whatsapp",  avatar: "S",  name: "Siti",    customer: "Do you have promotion?", reply: "Yes! 20% off this weekend — secure yours?" },
    { platform: "messenger", avatar: "J",  name: "Jamal",   customer: "I want appointment.",     reply: "Sure! Tomorrow 11am or 3pm — which works?" },
    { platform: "instagram", avatar: "P",  name: "puteri",  customer: "Can I pay installment?",  reply: "Yes — 0% 3-month plan available 💳" },
    { platform: "whatsapp",  avatar: "李", name: "李小姐",   customer: "你们今天还开吗？",         reply: "开的！营业到晚上 9 点，欢迎过来 🌟" },
    { platform: "telegram",  avatar: "R",  name: "Ravi",    customer: "Can WhatsApp me?",        reply: "Of course — sending you the link right now 📲" },
    { platform: "instagram", avatar: "N",  name: "nadia.x", customer: "Free delivery?",          reply: "Free shipping above RM150 🚚" },
  ];
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
          <MessageSquare size={12} /> Live AI conversations
        </span>
        <h2 className="mt-3 font-display text-3xl text-foreground/95 sm:text-4xl">
          Real customers. <span className="text-gradient-neon">AI replies in seconds.</span>
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {popups.map((p, i) => (
          <ChatPopup key={p.name + i} {...p} className="w-full" delay={i * 0.12} />
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── LOGO STRIP */
function LogoStrip() {
  const items = ["WhatsApp", "Messenger", "Instagram", "Facebook", "TikTok", "XiaoHongShu"];
  return (
    <section className="border-y border-border/40 bg-background/30 py-6 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
        <span className="text-foreground/70">Integrates with</span>
        {items.map((i) => (
          <span key={i} className="opacity-70 hover:opacity-100 transition">{i}</span>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── CAPABILITIES */
function CapabilitiesSection() {
  const items = [
    { icon: MessageSquare, title: "AI Auto Reply", desc: "Sub-second responses on every channel, on-brand and on-message." },
    { icon: Clock, title: "AI Auto Follow Up", desc: "Never lose a lead — AI re-engages prospects at the perfect moment." },
    { icon: Users, title: "AI Customer Qualification", desc: "Smart scoring filters tire-kickers from buyer-ready conversations." },
    { icon: CheckCircle2, title: "AI Auto Closing", desc: "From first hello to confirmed order — fully automated conversion." },
    { icon: Workflow, title: "AI Automation Workflow", desc: "Visual workflows orchestrate replies, hand-offs and triggers." },
    { icon: Network, title: "AI CRM Automation", desc: "Every conversation, contact and outcome — synced and structured." },
  ];
  return (
    <section id="capabilities" className="relative mx-auto max-w-6xl px-4 py-24">
      <SectionHeader
        eyebrow="Core capabilities"
        title={<>An end-to-end <span className="text-gradient-neon">AI conversion engine</span></>}
        subtitle="Six intelligent systems work in concert — so customers get answers in seconds and you get closed deals on autopilot."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-2xl glass-strong p-6 transition hover:-translate-y-1 hover:shadow-neon"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-neon">
              <Icon size={20} />
            </div>
            <h3 className="mt-5 font-display text-lg">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── PLATFORMS */
function PlatformsSection() {
  const live = ["Facebook", "Instagram", "WhatsApp", "Messenger"];
  const soon = ["TikTok", "XiaoHongShu"];
  return (
    <section id="platforms" className="relative mx-auto max-w-6xl px-4 py-24">
      <SectionHeader
        eyebrow="Multi-platform"
        title={<>One AI brain. <span className="text-gradient-neon">Every channel.</span></>}
        subtitle="Connect Phoenix AI once and let it operate across every customer surface in parallel."
      />

      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {live.map((name) => (
          <PlatformCard key={name} name={name} status="live" />
        ))}
        {soon.map((name) => (
          <PlatformCard key={name} name={name} status="soon" />
        ))}
      </div>

      {/* Connection diagram */}
      <div className="mt-12 overflow-hidden rounded-2xl glass-strong p-6">
        <svg viewBox="0 0 800 160" className="h-40 w-full">
          <defs>
            <linearGradient id="line" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.18 250)" />
              <stop offset="100%" stopColor="oklch(0.72 0.22 305)" />
            </linearGradient>
          </defs>
          {[80, 200, 320, 480, 600, 720].map((x, i) => (
            <g key={i}>
              <path d={`M${x},20 C${x},80 400,80 400,140`} stroke="url(#line)" strokeWidth="1.5" fill="none" className="dash-flow" opacity="0.7" />
              <circle cx={x} cy={20} r="6" fill="oklch(0.78 0.18 250)" />
            </g>
          ))}
          <circle cx="400" cy="140" r="14" fill="url(#line)" />
        </svg>
        <div className="mt-2 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Unified AI orchestration layer
        </div>
      </div>
    </section>
  );
}

function PlatformCard({ name, status }: { name: string; status: "live" | "soon" }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-strong p-5 transition hover:-translate-y-1 hover:shadow-neon">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-neon text-primary-foreground shadow-neon">
            <MessageSquare size={18} />
          </div>
          <div className="font-display text-base">{name}</div>
        </div>
        {status === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            Live
          </span>
        ) : (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-primary">
            Coming soon
          </span>
        )}
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Zap size={12} className="text-primary" /> Auto reply · Follow-up · Closing
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── LANGUAGES */
function LanguageSection() {
  const langs = ["Chinese", "English", "Bahasa Melayu", "Tamil", "Cantonese", "+ More"];
  return (
    <section id="languages" className="relative mx-auto max-w-6xl px-4 py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
            <Languages size={12} /> AI Language Recognition
          </span>
          <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
            Speak any language.{" "}
            <span className="text-gradient-neon">AI replies in theirs.</span>
          </h2>
          <p className="mt-5 text-muted-foreground">
            Phoenix AI auto-detects the language of every incoming message and responds
            natively — no scripts, no translation lag, no awkward phrasing.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {langs.map((l) => (
              <span key={l} className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-foreground/80">
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Animated chat */}
        <div className="relative">
          <div className="absolute -inset-6 -z-10 glow-dot opacity-50" />
          <div className="space-y-3 rounded-2xl glass-strong p-5">
            <ChatBubble side="in" label="EN" text="Hi, do you ship to Penang?" />
            <ChatBubble side="out" label="AI" text="Yes! Free shipping above RM150 — want me to lock in the order?" />
            <ChatBubble side="in" label="ZH" text="你们有现货吗？" />
            <ChatBubble side="out" label="AI" text="有的，现货充足。我马上把购买链接发给您 ✨" />
            <ChatBubble side="in" label="MS" text="Boleh COD tak?" />
            <ChatBubble side="out" label="AI" text="Boleh! Saya buka order COD sekarang untuk awak 🚚" />
            <div className="pt-2 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Real-time multilingual AI
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ side, label, text }: { side: "in" | "out"; label: string; text: string }) {
  const isOut = side === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${isOut ? "bg-gradient-neon text-primary-foreground shadow-neon" : "bg-secondary/70 text-foreground"}`}>
        <div className={`mb-0.5 text-[10px] uppercase tracking-widest ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</div>
        {text}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── VOICE */
function VoiceSection() {
  const features = [
    { icon: Mic, title: "AI Voice Reply" },
    { icon: Bot, title: "AI Voice Assistant" },
    { icon: PhoneCall, title: "AI Voice Call" },
    { icon: Sparkles, title: "Human-like Voice" },
    { icon: Globe2, title: "Multi-language Voice" },
    { icon: ShieldCheck, title: "Secure & Private" },
  ];
  return (
    <section id="voice" className="relative mx-auto max-w-6xl px-4 py-24">
      <SectionHeader
        eyebrow="AI Voice System"
        title={<>Conversations that <span className="text-gradient-neon">sound human.</span></>}
        subtitle="Lifelike voice agents that call, qualify and close — in the language your customer prefers."
      />

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Waveform */}
        <div className="relative overflow-hidden rounded-3xl glass-strong p-8">
          <div className="absolute inset-0 -z-10 opacity-50">
            <div className="absolute -left-20 top-0 h-72 w-72 glow-dot" />
            <div className="absolute -right-20 bottom-0 h-72 w-72 glow-dot" style={{ background: "radial-gradient(circle, var(--neon-2) 0%, transparent 70%)" }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-neon shadow-neon">
                <Mic className="text-primary-foreground" size={20} />
              </div>
              <div>
                <div className="font-display text-base">Phoenix Voice · Aria</div>
                <div className="text-xs text-muted-foreground">Outbound qualification call</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" /> Live
            </span>
          </div>

          {/* Waveform bars */}
          <div className="mt-8 flex h-28 items-center justify-center gap-1.5">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="wave-bar w-1.5 rounded-full bg-gradient-neon"
                style={{
                  height: `${20 + ((i * 13) % 80)}%`,
                  animationDelay: `${(i % 12) * 0.08}s`,
                }}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>00:42</span>
            <span>EN · ZH · MS · TA</span>
            <span>02:18</span>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title }) => (
            <div key={title} className="rounded-xl glass-strong p-4 transition hover:shadow-neon">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-neon">
                <Icon size={16} />
              </div>
              <div className="mt-3 text-sm font-medium">{title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── WORKFLOW */
function WorkflowSection() {
  const steps = [
    { n: "01", title: "Customer messages", desc: "Across WhatsApp, IG, FB or Messenger." },
    { n: "02", title: "AI detects + replies", desc: "Language, intent and sentiment understood instantly." },
    { n: "03", title: "AI qualifies + follows up", desc: "Lead scoring and re-engagement on autopilot." },
    { n: "04", title: "AI closes the deal", desc: "Order link, payment or booking — sealed." },
  ];
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24">
      <SectionHeader
        eyebrow="Automation workflow"
        title={<>From first message to <span className="text-gradient-neon">closed sale.</span></>}
        subtitle="A continuous AI loop that turns conversations into revenue without human intervention."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="relative overflow-hidden rounded-2xl glass-strong p-6">
            <div className="font-display text-4xl text-gradient-neon">{s.n}</div>
            <div className="mt-3 font-display text-base">{s.title}</div>
            <div className="mt-1.5 text-sm text-muted-foreground">{s.desc}</div>
            <div className="absolute -bottom-px left-0 right-0 h-px shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── CTA */
function CtaSection() {
  return (
    <section className="relative mx-auto max-w-5xl px-4 py-24">
      <div className="relative overflow-hidden rounded-3xl glass-strong p-10 text-center sm:p-16">
        <div className="absolute inset-0 -z-10 opacity-70 aurora" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 glow-dot opacity-60" />
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
          <Sparkles size={12} /> Ready when you are
        </span>
        <h2 className="mt-6 font-display text-4xl leading-tight sm:text-6xl">
          Let AI close your<br />
          <span className="text-gradient-neon">next 1,000 customers.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Activate Phoenix AI and put your customer conversion on autopilot — across every channel, in every language, every hour of the day.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-neon px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-neon transition hover:opacity-95"
          >
            Activate AI system
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </Link>
          <a href="#capabilities" className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground/80 hover:border-primary/50 hover:text-foreground">
            <Cpu size={14} /> Talk to a strategist
          </a>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── FOOTER */
function Footer() {
  return (
    <footer className="border-t border-border/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <PhoenixLogo size={20} />
        </div>
        <div>© {new Date().getFullYear()} Phoenix AI Platform · Built by Phoenix Advertisement & Design.</div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────────── SHARED */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
        <Sparkles size={12} /> {eyebrow}
      </span>
      <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">{title}</h2>
      <p className="mt-4 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
