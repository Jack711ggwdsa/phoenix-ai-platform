import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Send,
  Paperclip,
  Mic,
  Sparkles,
  Phone,
  Tag,
  UserCircle2,
  Bot,
  MessageSquare,
  Smartphone,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/inbox/$slot")({ component: InboxPage });

type Contact = {
  id: string;
  name: string;
  phone: string;
  preview: string;
  time: string;
  unread: number;
  tags: string[];
  assigned: string;
  lead: number;
  online: boolean;
};

type Msg = {
  id: string;
  from: "them" | "me" | "ai";
  text: string;
  time: string;
};

const MOCK_CONTACTS: Contact[] = [
  { id: "1", name: "Sarah Chen", phone: "+65 9123 4567", preview: "Yes, please send me the package details 📦", time: "2m", unread: 2, tags: ["Hot Lead"], assigned: "Sales", lead: 92, online: true },
  { id: "2", name: "Daniel Lim", phone: "+60 12 345 6789", preview: "Thanks! I'll review and get back to you", time: "12m", unread: 0, tags: ["Follow-up"], assigned: "Sales", lead: 74, online: false },
  { id: "3", name: "Mei Ling", phone: "+65 8888 1234", preview: "Voice message", time: "1h", unread: 1, tags: ["VIP"], assigned: "Support", lead: 88, online: true },
  { id: "4", name: "Ahmad Rizal", phone: "+60 19 888 7654", preview: "Can you confirm the pricing?", time: "3h", unread: 0, tags: ["New"], assigned: "Sales", lead: 60, online: false },
  { id: "5", name: "Jessie Wong", phone: "+65 9988 0011", preview: "Perfect, see you tomorrow!", time: "Yesterday", unread: 0, tags: ["Closed"], assigned: "Marketing", lead: 95, online: false },
];

const MOCK_MESSAGES: Record<string, Msg[]> = {
  "1": [
    { id: "m1", from: "them", text: "Hi! I saw your ad about the AI auto-reply system.", time: "10:21" },
    { id: "m2", from: "me", text: "Hi Sarah! Glad you reached out. Phoenix AI handles all your customer replies 24/7 automatically.", time: "10:22" },
    { id: "m3", from: "them", text: "Sounds great. What are the pricing tiers?", time: "10:23" },
    { id: "m4", from: "ai", text: "Suggested: We offer 3 plans — Starter ($99), Pro ($249), and Enterprise (custom). Want me to send the full breakdown?", time: "10:23" },
    { id: "m5", from: "them", text: "Yes, please send me the package details 📦", time: "10:24" },
  ],
};

function InboxPage() {
  const { slot } = Route.useParams();
  return <InboxWorkspace slot={slot} />;
}

function InboxWorkspace({ slot }: { slot: string }) {
  const [selected, setSelected] = useState<string>(MOCK_CONTACTS[0].id);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [autoReply, setAutoReply] = useState(true);

  const contact = useMemo(
    () => MOCK_CONTACTS.find((c) => c.id === selected) ?? MOCK_CONTACTS[0],
    [selected],
  );
  const messages = MOCK_MESSAGES[selected] ?? [
    { id: "x", from: "them" as const, text: "👋 Hello!", time: "now" },
  ];

  const filtered = MOCK_CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.preview.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    document.title = `Inbox · Device ${slot} · Phoenix AI`;
  }, [slot]);

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-3 lg:grid-cols-[320px_1fr_320px]">
      {/* LEFT: Contacts */}
      <aside className="flex flex-col overflow-hidden rounded-2xl border border-primary/15 bg-card/40 backdrop-blur-xl">
        <div className="border-b border-primary/10 p-3">
          <div className="mb-3 flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Link to="/client/devices">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Devices
              </Link>
            </Button>
            <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Smartphone className="h-3 w-3" /> Slot {slot}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer…"
              className="h-9 border-primary/20 bg-background/60 pl-8 text-sm"
            />
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1 text-[11px]">
            {["All", "Unread", "Hot Lead", "VIP", "Follow-up"].map((f) => (
              <button
                key={f}
                className="whitespace-nowrap rounded-full border border-primary/15 bg-background/40 px-2.5 py-0.5 text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-primary/5 px-3 py-3 text-left transition hover:bg-primary/5",
                selected === c.id && "bg-primary/10",
              )}
            >
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 text-sm font-semibold text-foreground">
                  {c.name.charAt(0)}
                </div>
                {c.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <span className="text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
                <div className="mt-1 flex items-center gap-1">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0 text-[9px] font-medium text-primary"
                    >
                      {t}
                    </span>
                  ))}
                  {c.unread > 0 && (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-neon px-1 text-[10px] font-bold text-primary-foreground shadow-neon">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* CENTER: Chat */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-primary/15 bg-card/40 backdrop-blur-xl">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-primary/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 text-sm font-semibold">
              {contact.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold">{contact.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {contact.online ? "● online" : "last seen recently"} · {contact.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-[11px]">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">AI Auto-Reply</span>
              <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.06),transparent_60%)] p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.from === "me" || m.from === "ai" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  m.from === "them" && "border border-primary/15 bg-background/70 text-foreground",
                  m.from === "me" && "bg-gradient-neon text-primary-foreground shadow-neon",
                  m.from === "ai" &&
                    "border border-purple-400/30 bg-purple-500/10 text-purple-100",
                )}
              >
                {m.from === "ai" && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                    <Sparkles className="h-3 w-3" /> AI Suggestion
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-right text-[10px] opacity-60">{m.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick replies */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-primary/10 px-3 py-2">
          {["Send pricing", "Book a call", "Thanks!", "Follow up tomorrow"].map((q) => (
            <button
              key={q}
              onClick={() => setDraft(q)}
              className="whitespace-nowrap rounded-full border border-primary/20 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="flex items-end gap-2 border-t border-primary/10 p-3">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="min-h-9 flex-1 resize-none border-primary/20 bg-background/60"
            rows={1}
          />
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground">
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-9 bg-gradient-neon px-4 text-primary-foreground shadow-neon"
            disabled={!draft.trim()}
          >
            <Send className="mr-1.5 h-4 w-4" /> Send
          </Button>
        </div>
      </section>

      {/* RIGHT: Customer profile */}
      <aside className="hidden flex-col overflow-hidden rounded-2xl border border-primary/15 bg-card/40 backdrop-blur-xl lg:flex">
        <div className="flex flex-col items-center gap-2 border-b border-primary/10 p-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 to-purple-500/50 text-xl font-semibold">
            {contact.name.charAt(0)}
          </div>
          <p className="text-base font-semibold">{contact.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {contact.phone}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Lead score */}
          <div className="rounded-xl border border-primary/15 bg-background/40 p-3">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Star className="h-3 w-3" /> AI Lead Score
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-bold text-gradient-ai">{contact.lead}</p>
              <Badge className="bg-emerald-500/15 text-emerald-300">
                {contact.lead >= 80 ? "Hot" : contact.lead >= 50 ? "Warm" : "Cold"}
              </Badge>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full bg-gradient-to-r from-primary via-purple-500 to-cyan-400"
                style={{ width: `${contact.lead}%` }}
              />
            </div>
          </div>

          <Field icon={Tag} label="Tags">
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((t) => (
                <Badge key={t} variant="outline" className="border-primary/30 text-primary">
                  {t}
                </Badge>
              ))}
            </div>
          </Field>

          <Field icon={UserCircle2} label="Assigned Staff">
            <p className="text-sm font-medium">{contact.assigned} Team</p>
          </Field>

          <Field icon={MessageSquare} label="AI Analysis">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Customer shows strong purchase intent. Mentioned budget and timeline. Recommend
              following up within 24h with pricing breakdown and demo offer.
            </p>
          </Field>

          <Field icon={Sparkles} label="Notes">
            <Textarea
              placeholder="Add a private note…"
              className="min-h-20 border-primary/20 bg-background/60 text-xs"
            />
          </Field>
        </div>
      </aside>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      {children}
    </div>
  );
}
