import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pill, Loader2, Plus } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/medication")({
  head: () => ({ meta: [{ title: "Medication - Lamar BHRF" }] }),
  component: MedicationPage,
});

function MedicationPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["medication_logs"],
    queryFn: async () =>
      (await supabase
        .from("medication_logs")
        .select("id, medication_name, dosage, status, scheduled_time, administered_at, refusal_reason, notes, resident:residents(first_name, last_name)")
        .order("scheduled_time", { ascending: false })
        .limit(100)).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Daily Operations"
        title="Medication Assistance"
        description="Track scheduled doses, administration, refusals, and missed doses."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log dose</Button></DialogTrigger>
            <NewMedDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["medication_logs"] }); }} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={Pill} title="No medication records" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Administered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((m) => {
                  const r = m.resident as { first_name?: string; last_name?: string } | null;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{r?.first_name} {r?.last_name}</TableCell>
                      <TableCell>{m.medication_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.dosage ?? "-"}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(m.scheduled_time)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(m.administered_at)}</TableCell>
                      <TableCell><StatusPill status={m.status} tone={m.status === "administered" ? "success" : m.status === "refused" || m.status === "missed" ? "destructive" : "warning"} /></TableCell>
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

function NewMedDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    resident_id: "",
    medication_name: "",
    dosage: "",
    status: "administered",
    scheduled_time: "",
    refusal_reason: "",
    notes: "",
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("medication_logs").insert({
        resident_id: form.resident_id,
        medication_name: form.medication_name,
        dosage: form.dosage || null,
        status: form.status,
        scheduled_time: form.scheduled_time || null,
        administered_at: form.status === "administered" ? new Date().toISOString() : null,
        refusal_reason: form.status === "refused" ? form.refusal_reason || null : null,
        notes: form.notes || null,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Dose logged"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Log medication</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Resident</Label>
          <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(residents ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Medication</Label>
            <Input value={form.medication_name} onChange={(e) => setForm({ ...form, medication_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Dosage</Label>
            <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 50 mg" />
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled time</Label>
            <Input type="datetime-local" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="administered">Administered</SelectItem>
                <SelectItem value="refused">Refused</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="held">Held</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.status === "refused" && (
          <div className="space-y-1.5">
            <Label>Refusal reason</Label>
            <Input value={form.refusal_reason} onChange={(e) => setForm({ ...form, refusal_reason: e.target.value })} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id || !form.medication_name}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
