import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/daily-services")({
  head: () => ({ meta: [{ title: "Daily Services — Lamar BHRF" }] }),
  component: DailyServicesPage,
});

function DailyServicesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["daily_observations"],
    queryFn: async () =>
      (await supabase
        .from("daily_observations")
        .select("id, observation_date, mood, behavior, participation, adl_support, wellness_check, notes, resident:residents(first_name, last_name)")
        .order("observation_date", { ascending: false })
        .limit(100)).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Daily Operations"
        title="Daily Services"
        description="Wellness checks, ADL support, mood and participation observations."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log observation</Button></DialogTrigger>
            <NewObservationDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["daily_observations"] }); }} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={Activity} title="No observations yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Participation</TableHead>
                  <TableHead>ADL Support</TableHead>
                  <TableHead>Wellness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((o) => {
                  const r = o.resident as { first_name?: string; last_name?: string } | null;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(o.observation_date)}</TableCell>
                      <TableCell className="font-medium">{r?.first_name} {r?.last_name}</TableCell>
                      <TableCell className="text-sm capitalize">{o.mood ?? "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{o.participation ?? "—"}</TableCell>
                      <TableCell className="text-sm">{o.adl_support ?? "—"}</TableCell>
                      <TableCell>{o.wellness_check ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="text-muted-foreground text-xs">Not done</span>}</TableCell>
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

function NewObservationDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    resident_id: "",
    observation_date: new Date().toISOString().slice(0, 10),
    mood: "stable",
    behavior: "",
    participation: "engaged",
    adl_support: "",
    wellness_check: true,
    notes: "",
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_observations").insert({
        ...form,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Observation saved"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Log observation</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Resident</Label>
            <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(residents ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={form.observation_date} onChange={(e) => setForm({ ...form, observation_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Mood</Label>
            <Select value={form.mood} onValueChange={(v) => setForm({ ...form, mood: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="anxious">Anxious</SelectItem>
                <SelectItem value="agitated">Agitated</SelectItem>
                <SelectItem value="depressed">Depressed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Participation</Label>
            <Select value={form.participation} onValueChange={(v) => setForm({ ...form, participation: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="engaged">Engaged</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="refused">Refused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ADL support</Label>
            <Input value={form.adl_support} onChange={(e) => setForm({ ...form, adl_support: e.target.value })} placeholder="Hygiene, dressing…" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Behavior / notes</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.wellness_check} onCheckedChange={(v) => setForm({ ...form, wellness_check: v === true })} />
          Wellness check completed
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save observation
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
