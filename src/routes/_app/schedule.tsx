import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
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

export const Route = createFileRoute("/_app/schedule")({
  head: () => ({ meta: [{ title: "Schedule & Handoff — Lamar BHRF" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("administrator");
  const [open, setOpen] = useState(false);

  const { data: shifts } = useQuery({
    queryKey: ["staff-shifts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_shifts")
        .select("*, staff:profiles!staff_shifts_staff_id_fkey(full_name, title)")
        .order("shift_date", { ascending: false })
        .order("start_time")
        .limit(200);
      return data ?? [];
    },
  });

  const updateHandoff = useMutation({
    mutationFn: async ({ id, handoff_notes }: { id: string; handoff_notes: string }) => {
      const { error } = await supabase.from("staff_shifts").update({ handoff_notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Handoff saved"); qc.invalidateQueries({ queryKey: ["staff-shifts"] }); },
    onError: (e) => toast.error("Save failed", { description: (e as Error).message }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Schedule & Shift Handoff"
        description="Plan staff coverage and pass critical context between shifts."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add shift</Button></DialogTrigger>
            <NewShiftDialog onClose={() => setOpen(false)} userId={user?.id} isAdmin={isAdmin} />
          </Dialog>
        }
      />
      <div className="space-y-6 p-6">
        <div className="surface-elevated rounded-2xl overflow-hidden">
          {!shifts?.length ? <DataEmpty icon={CalendarClock} title="No shifts scheduled" /> : (
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Handoff notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {shifts.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{formatDate(s.shift_date)}</TableCell>
                    <TableCell className="text-sm">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</TableCell>
                    <TableCell className="font-medium">{s.staff?.full_name ?? "—"} <span className="text-xs text-muted-foreground">{s.staff?.title}</span></TableCell>
                    <TableCell className="text-sm">{s.shift_role ?? "—"}</TableCell>
                    <TableCell>
                      <HandoffCell shift={s} canEdit={s.staff_id === user?.id || isAdmin} onSave={(v) => updateHandoff.mutate({ id: s.id, handoff_notes: v })} />
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

function HandoffCell({ shift, canEdit, onSave }: { shift: any; canEdit: boolean; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(shift.handoff_notes ?? "");
  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <p className="text-sm text-muted-foreground">{shift.handoff_notes || <em>No handoff notes</em>}</p>
        {canEdit && <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(true)}>Edit</Button>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Textarea rows={3} value={v} onChange={(e) => setV(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { onSave(v); setEditing(false); }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => { setV(shift.handoff_notes ?? ""); setEditing(false); }}>Cancel</Button>
      </div>
    </div>
  );
}

function NewShiftDialog({ onClose, userId, isAdmin }: { onClose: () => void; userId?: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ staff_id: userId ?? "", shift_date: today, start_time: "08:00", end_time: "16:00", shift_role: "BHT", notes: "" });

  const { data: staff } = useQuery({
    queryKey: ["staff-min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_shifts").insert({ ...f, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Shift added"); qc.invalidateQueries({ queryKey: ["staff-shifts"] }); onClose(); },
    onError: (e) => toast.error("Failed", { description: (e as Error).message }),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add shift</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        {isAdmin && (
          <div className="space-y-1.5"><Label>Staff member</Label>
            <Select value={f.staff_id} onValueChange={(v) => setF({ ...f, staff_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>{staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.shift_date} onChange={(e) => setF({ ...f, shift_date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>End</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Shift role</Label><Input value={f.shift_role} onChange={(e) => setF({ ...f, shift_role: e.target.value })} placeholder="BHT / Charge / BHP on-call" /></div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save shift</Button></DialogFooter>
    </DialogContent>
  );
}
