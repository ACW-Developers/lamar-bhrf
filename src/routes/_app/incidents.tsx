import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { StatusPill } from "@/components/role-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/incidents")({
  head: () => ({ meta: [{ title: "Incidents - Lamar BHRF" }] }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () =>
      (await supabase
        .from("incidents")
        .select("id, incident_date, incident_type, description, severity, status, resident:residents(first_name, last_name)")
        .order("incident_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Oversight"
        title="Incident Management"
        description="Report, investigate, and resolve incidents with full audit history."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Report incident</Button></DialogTrigger>
            <NewIncidentDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["incidents"] }); }} reporterId={user?.id} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={AlertTriangle} title="No incidents reported" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((i) => {
                  const r = i.resident as { first_name?: string; last_name?: string } | null;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(i.incident_date)}</TableCell>
                      <TableCell className="font-medium">{r ? `${r.first_name} ${r.last_name}` : "-"}</TableCell>
                      <TableCell className="text-sm capitalize">{i.incident_type}</TableCell>
                      <TableCell><StatusPill status={i.severity} tone={i.severity === "critical" || i.severity === "high" ? "destructive" : i.severity === "medium" ? "warning" : "default"} /></TableCell>
                      <TableCell><StatusPill status={i.status} tone={i.status === "resolved" || i.status === "closed" ? "success" : i.status === "investigating" ? "warning" : "destructive"} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function NewIncidentDialog({ onCreated, reporterId }: { onCreated: () => void; reporterId?: string }) {
  const [form, setForm] = useState({
    resident_id: "",
    incident_type: "behavioral",
    severity: "low" as "low" | "medium" | "high" | "critical",
    description: "",
    actions_taken: "",
    incident_date: new Date().toISOString().slice(0, 10),
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("incidents").insert({
        resident_id: form.resident_id || null,
        incident_type: form.incident_type,
        severity: form.severity,
        description: form.description,
        actions_taken: form.actions_taken || null,
        incident_date: form.incident_date,
        reported_by: reporterId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Incident reported"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Report incident</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Resident (optional)</Label>
            <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(residents ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="medication_error">Medication error</SelectItem>
                <SelectItem value="elopement">Elopement</SelectItem>
                <SelectItem value="injury">Injury</SelectItem>
                <SelectItem value="property">Property</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as typeof form.severity })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Immediate actions taken</Label>
          <Textarea rows={2} value={form.actions_taken} onChange={(e) => setForm({ ...form, actions_taken: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.description}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
