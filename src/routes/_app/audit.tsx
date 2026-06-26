import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollText, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataEmpty } from "@/components/data-empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Log — Lamar BHRF" }] }),
  component: AuditPage,
});

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  INSERT: "default", UPDATE: "secondary", DELETE: "destructive",
};

function AuditPage() {
  const [q, setQ] = useState("");
  const [table, setTable] = useState("");

  const { data } = useQuery({
    queryKey: ["audit-logs", table],
    queryFn: async () => {
      let qb = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (table) qb = qb.eq("table_name", table);
      const { data } = await qb;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((r: any) =>
    !q || [r.actor_email, r.table_name, r.action].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader eyebrow="Compliance" title="Audit Log" description="Every clinical record change is captured here for HIPAA compliance and incident review." />
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
          <Input placeholder="Search by user, table, or action…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Input placeholder="Filter table (e.g. residents)" value={table} onChange={(e) => setTable(e.target.value)} className="max-w-xs" />
        </div>
        <div className="surface-elevated rounded-2xl overflow-hidden">
          {!filtered.length ? <DataEmpty icon={ScrollText} title="No audit events" /> : (
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Table</TableHead><TableHead>Record</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell className="text-sm">{r.actor_email ?? "—"}</TableCell>
                    <TableCell><Badge variant={ACTION_VARIANT[r.action] ?? "secondary"}>{r.action}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.record_id?.slice(0, 8)}…</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" /> Showing the most recent 500 events. Logs are append-only.</p>
      </div>
    </div>
  );
}
