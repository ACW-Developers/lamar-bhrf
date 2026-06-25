import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardPlus, Loader2, Plus } from "lucide-react";
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

export const Route = createFileRoute("/_app/admissions")({
  head: () => ({ meta: [{ title: "Admissions — Lamar BHRF" }] }),
  component: AdmissionsPage,
});

function AdmissionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("id, intake_date, status, referral_source, presenting_problem, resident:residents(first_name, last_name, mrn)")
        .order("intake_date", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Intake"
        title="Admissions"
        description="Track intake workflow, approvals, and onboarding for incoming residents."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New intake</Button>
            </DialogTrigger>
            <NewAdmissionDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admissions"] }); }} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={ClipboardPlus} title="No admissions yet" description="Create an intake record for an incoming resident." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Intake date</TableHead>
                  <TableHead>Referral</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((a) => {
                  const res = a.resident as { first_name?: string; last_name?: string; mrn?: string } | null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{res?.first_name} {res?.last_name}</TableCell>
                      <TableCell className="font-mono text-xs">{res?.mrn}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(a.intake_date)}</TableCell>
                      <TableCell className="text-sm">{a.referral_source ?? "—"}</TableCell>
                      <TableCell><StatusPill status={a.status} tone={a.status === "approved" || a.status === "completed" ? "success" : a.status === "rejected" ? "destructive" : "warning"} /></TableCell>
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

function NewAdmissionDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ resident_id: "", referral_source: "", presenting_problem: "", status: "pending" as "pending" | "approved" | "rejected" | "completed" });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admissions").insert({
        resident_id: form.resident_id,
        referral_source: form.referral_source || null,
        presenting_problem: form.presenting_problem || null,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Intake recorded"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New admission intake</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Resident</Label>
          <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
            <SelectContent>
              {(residents ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name} — {r.mrn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Referral source</Label>
          <Input value={form.referral_source} onChange={(e) => setForm({ ...form, referral_source: e.target.value })} placeholder="e.g. Banner Health, Maricopa County Crisis" />
        </div>
        <div className="space-y-1.5">
          <Label>Presenting problem</Label>
          <Textarea value={form.presenting_problem} onChange={(e) => setForm({ ...form, presenting_problem: e.target.value })} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save intake
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
