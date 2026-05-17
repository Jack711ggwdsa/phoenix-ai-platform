import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/chat-logs")({
  component: ChatLogsPage,
  validateSearch: (s: Record<string, unknown>) => ({ client: (s.client as string) || "" }),
});

function ChatLogsPage() {
  const { client } = Route.useSearch();
  const [logs, setLogs] = useState<any[] | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState(client);

  useEffect(() => {
    supabase.from("clients").select("id,client_name").order("client_name").then(({ data }) => setClients(data ?? []));
  }, []);

  useEffect(() => {
    let q = supabase.from("chat_logs").select("*, clients(client_name)").order("created_at", { ascending: false }).limit(200);
    if (filter) q = q.eq("client_id", filter);
    q.then(({ data }) => setLogs(data ?? []));
  }, [filter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gradient-gold">Chat logs</h1>
          <p className="text-sm text-muted-foreground">Latest AI conversations across all clients.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold">
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.client_name}</option>)}
        </select>
      </div>

      {!logs ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl glass p-12 text-center text-muted-foreground">No chat logs yet.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="rounded-xl glass p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-gold">{l.clients?.client_name ?? "—"}</span>
                <span>·</span><span>{l.channel ?? "unknown"}</span>
                <span>·</span><span>{new Date(l.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-2 text-sm"><span className="text-muted-foreground">User:</span> {l.user_message}</div>
              <div className="mt-1 text-sm"><span className="text-gold">AI:</span> {l.ai_reply}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
