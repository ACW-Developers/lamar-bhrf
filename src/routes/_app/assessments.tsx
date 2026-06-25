import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { StatusPill } from "@/components/role-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/assessments")({
  head: () => ({ meta: [{ title: "Assessments — Lamar BHRF" }] }),
  component: AssessmentsPage,
});

function AssessmentsPage() {
  const { hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(["administrator", "bhp"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () =>
      (await supabase
        .from("assessments")
        .select("id, assessment_date, assessment_type, status, risk_level, findings, resident:residents(first_name, last_name, mrn)")
        .order("assessment_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clinical"
        title="Assessments"
        description="Behavioral, diagnostic, risk, and substance use assessments with approval workflow."
        actions={canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New assessment</Button></DialogTrigger>
            <NewAssessmentDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["assessments"] }); }} />
          </Dialog>
        )}
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={FileText} title="No assessments recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((a) => {
                  const r = a.resident as { first_name?: string; last_name?: string; mrn?: string } | null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{r?.first_name} {r?.last_name}</TableCell>
                      <TableCell className="text-sm capitalize">{a.assessment_type.replaceAll("_", " ")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(a.assessment_date)}</TableCell>
                      <TableCell><StatusPill status={a.risk_level ?? "—"} tone={a.risk_level === "high" || a.risk_level === "critical" ? "destructive" : a.risk_level === "moderate" ? "warning" : "success"} /></TableCell>
                      <TableCell><StatusPill status={a.status} tone={a.status === "approved" ? "success" : a.status === "rejected" ? "destructive" : "warning"} /></TableCell>
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

function NewAssessmentDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ resident_id: "", assessment_type: "behavioral_health", risk_level: "low", findings: "", recommendations: "" });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assessments").insert({
        resident_id: form.resident_id,
        assessment_type: form.assessment_type,
        risk_level: form.risk_level,
        findings: form.findings || null,
        recommendations: form.recommendations || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assessment created"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New assessment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Resident</Label>
          <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
            <SelectContent>
              {(residents ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.assessment_type} onValueChange={(v) => setForm({ ...form, assessment_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="behavioral_health">Behavioral health</SelectItem>
                <SelectItem value="diagnostic">Diagnostic</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="substance_use">Substance use</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Risk level</Label>
            <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Findings</Label>
          <Textarea rows={3} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Recommendations</Label>
          <Textarea rows={2} value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save assessment
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
