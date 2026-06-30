import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut, Loader2, Plus, CheckCircle2 } from "lucide-react";
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

export const Route = createFileRoute("/_app/discharges")({
  head: () => ({ meta: [{ title: "Discharge Planning - Lamar BHRF" }] }),
  component: DischargesPage,
});

function DischargesPage() {
  const qc = useQueryClient();
  const { hasAnyRole, user } = useAuth();
  const canEdit = hasAnyRole(["administrator", "bhp"]);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["discharges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("discharges")
        .select("id, planned_date, actual_date, discharge_type, destination, status, follow_up_date, follow_up_completed, resident:residents(first_name, last_name, mrn)")
        .order("planned_date", { ascending: false });
      return data ?? [];
    },
  });

  const completeFollowup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discharges").update({ follow_up_completed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Follow-up marked complete"); qc.invalidateQueries({ queryKey: ["discharges"] }); },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Aftercare"
        title="Discharge Planning"
        description="Plan resident discharges, capture aftercare instructions, and track follow-up."
        actions={canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New discharge plan</Button></DialogTrigger>
            <NewDischargeDialog onClose={() => setOpen(false)} userId={user?.id} />
          </Dialog>
        ) : null}
      />

      <div className="p-6">
        <div className="surface-elevated rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data?.length ? (
            <DataEmpty icon={LogOut} title="No discharges yet" description={canEdit ? "Create a plan to begin." : "Plans created by clinical staff appear here."} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>Planned</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.resident?.first_name} {d.resident?.last_name} <span className="ml-1 text-xs text-muted-foreground">{d.resident?.mrn}</span></TableCell>
                    <TableCell>{d.planned_date ? formatDate(d.planned_date) : "-"}</TableCell>
                    <TableCell>{d.actual_date ? formatDate(d.actual_date) : "-"}</TableCell>
                    <TableCell className="text-sm">{d.discharge_type ?? "-"}</TableCell>
                    <TableCell className="text-sm">{d.destination ?? "-"}</TableCell>
                    <TableCell><StatusPill status={d.status} /></TableCell>
                    <TableCell className="text-sm">
                      {d.follow_up_date ? formatDate(d.follow_up_date) : "-"}
                      {d.follow_up_completed && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-success" />}
                    </TableCell>
                    <TableCell>
                      {canEdit && d.follow_up_date && !d.follow_up_completed && (
                        <Button size="sm" variant="ghost" onClick={() => completeFollowup.mutate(d.id)}>Mark done</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function NewDischargeDialog({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    resident_id: "", planned_date: "", discharge_type: "planned", destination: "",
    aftercare_plan: "", follow_up_date: "", status: "planned",
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => {
      const { data } = await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.resident_id) throw new Error("Select a resident");
      const { error } = await supabase.from("discharges").insert({ ...form, created_by: userId, planned_date: form.planned_date || null, follow_up_date: form.follow_up_date || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Discharge plan created"); qc.invalidateQueries({ queryKey: ["discharges"] }); onClose(); },
    onError: (e) => toast.error("Failed", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>New discharge plan</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label>Resident</Label>
          <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
            <SelectContent>
              {residents?.map((r) => <SelectItem key={r.id} value={r.id}>{r.last_name}, {r.first_name} • {r.mrn}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Planned date</Label><Input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={form.discharge_type} onValueChange={(v) => setForm({ ...form, discharge_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="ama">Against medical advice</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Destination</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Home with family, Sober living" /></div>
        <div className="space-y-1.5"><Label>Aftercare plan</Label><Textarea rows={4} value={form.aftercare_plan} onChange={(e) => setForm({ ...form, aftercare_plan: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Follow-up date</Label><Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create plan
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
