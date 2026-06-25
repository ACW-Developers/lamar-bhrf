import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HeartPulse, Loader2, Plus } from "lucide-react";
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

export const Route = createFileRoute("/_app/therapy")({
  head: () => ({ meta: [{ title: "Therapy — Lamar BHRF" }] }),
  component: TherapyPage,
});

function TherapyPage() {
  const { user, hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(["administrator", "bhp"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["therapy_sessions"],
    queryFn: async () =>
      (await supabase
        .from("therapy_sessions")
        .select("id, session_date, duration_minutes, objectives_addressed, recommendations, follow_up_plan, clinical_notes, resident:residents(first_name, last_name), therapist:profiles(full_name)")
        .order("session_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clinical"
        title="Individual Therapy"
        description="One-on-one therapy sessions with objectives, recommendations, and follow-up."
        actions={canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New session</Button></DialogTrigger>
            <NewTherapyDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["therapy_sessions"] }); }} therapistId={user?.id} />
          </Dialog>
        )}
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={HeartPulse} title="No therapy sessions logged" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Therapist</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Objectives</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((s) => {
                  const r = s.resident as { first_name?: string; last_name?: string } | null;
                  const t = s.therapist as { full_name?: string } | null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(s.session_date)}</TableCell>
                      <TableCell className="font-medium">{r?.first_name} {r?.last_name}</TableCell>
                      <TableCell className="text-sm">{t?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.duration_minutes ? `${s.duration_minutes} min` : "—"}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground line-clamp-1">{s.objectives_addressed ?? "—"}</TableCell>
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

function NewTherapyDialog({ onCreated, therapistId }: { onCreated: () => void; therapistId?: string }) {
  const [form, setForm] = useState({
    resident_id: "",
    session_date: new Date().toISOString().slice(0, 10),
    duration_minutes: 50,
    objectives_addressed: "",
    recommendations: "",
    follow_up_plan: "",
    clinical_notes: "",
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("therapy_sessions").insert({
        ...form,
        therapist_id: therapistId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session saved"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New therapy session</DialogTitle></DialogHeader>
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
            <Label>Date</Label>
            <Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (min)</Label>
            <Input type="number" min={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Objectives addressed</Label>
          <Textarea rows={2} value={form.objectives_addressed} onChange={(e) => setForm({ ...form, objectives_addressed: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Clinical notes</Label>
          <Textarea rows={3} value={form.clinical_notes} onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Recommendations / follow-up</Label>
          <Textarea rows={2} value={form.follow_up_plan} onChange={(e) => setForm({ ...form, follow_up_plan: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
