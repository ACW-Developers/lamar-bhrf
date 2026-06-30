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

type ServiceKey = "walk" | "gym" | "aana" | "adl";
type Attendance = {
  group_therapy: { g1: boolean; g2: boolean; g3: boolean; staff_initial: string };
  walk: { attended: boolean; time: string; staff_initial: string };
  gym: { attended: boolean; time: string; staff_initial: string };
  aana: { attended: boolean; time: string; staff_initial: string };
  adl: { attended: boolean; time: string; staff_initial: string };
  resident_signature: string;
};

const emptyAttendance = (): Attendance => ({
  group_therapy: { g1: false, g2: false, g3: false, staff_initial: "" },
  walk: { attended: false, time: "", staff_initial: "" },
  gym: { attended: false, time: "", staff_initial: "" },
  aana: { attended: false, time: "", staff_initial: "" },
  adl: { attended: false, time: "", staff_initial: "" },
  resident_signature: "",
});

const SERVICE_LABELS: Record<ServiceKey, string> = {
  walk: "Walk / Hike / Outdoor",
  gym: "Gym",
  aana: "AA / NA",
  adl: "ADL / Indoor",
};

function DailyServicesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["daily_observations"],
    queryFn: async () =>
      (await supabase
        .from("daily_observations")
        .select("id, observation_date, mood, participation, adl_support, wellness_check, notes, attendance, resident:residents(first_name, last_name, date_of_birth)")
        .order("observation_date", { ascending: false })
        .limit(100)).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Daily Operations"
        title="Daily Treatment Services — Attendance"
        description="Group therapy, outdoor, gym, AA/NA and ADL attendance with staff initials and resident sign-off."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log attendance</Button></DialogTrigger>
            <NewObservationDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["daily_observations"] }); }} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={Activity} title="No attendance entries yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Resident (DOB)</TableHead>
                  <TableHead>Group 1/2/3</TableHead>
                  <TableHead>Walk</TableHead>
                  <TableHead>Gym</TableHead>
                  <TableHead>AA/NA</TableHead>
                  <TableHead>ADL</TableHead>
                  <TableHead>Signed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((o) => {
                  const r = o.resident as { first_name?: string; last_name?: string; date_of_birth?: string } | null;
                  const a = (o.attendance ?? null) as Attendance | null;
                  const yn = (b?: boolean) => b ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="text-muted-foreground text-xs">—</span>;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(o.observation_date)}</TableCell>
                      <TableCell className="font-medium">
                        {r?.first_name} {r?.last_name}
                        {r?.date_of_birth && <div className="text-xs text-muted-foreground">DOB {formatDate(r.date_of_birth)}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {a?.group_therapy ? `${a.group_therapy.g1 ? "1" : "·"} / ${a.group_therapy.g2 ? "2" : "·"} / ${a.group_therapy.g3 ? "3" : "·"}` : "—"}
                      </TableCell>
                      <TableCell>{yn(a?.walk?.attended)}</TableCell>
                      <TableCell>{yn(a?.gym?.attended)}</TableCell>
                      <TableCell>{yn(a?.aana?.attended)}</TableCell>
                      <TableCell>{yn(a?.adl?.attended)}</TableCell>
                      <TableCell className="text-xs">{a?.resident_signature || "—"}</TableCell>
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

function ServiceRow({ label, value, onChange }: { label: string; value: Attendance[ServiceKey]; onChange: (v: Attendance[ServiceKey]) => void }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border p-2">
      <label className="col-span-12 sm:col-span-5 flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={value.attended} onCheckedChange={(v) => onChange({ ...value, attended: v === true })} />
        {label}
      </label>
      <Input className="col-span-7 sm:col-span-4" type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} disabled={!value.attended} />
      <Input className="col-span-5 sm:col-span-3" placeholder="Staff init." value={value.staff_initial} onChange={(e) => onChange({ ...value, staff_initial: e.target.value })} disabled={!value.attended} maxLength={6} />
    </div>
  );
}

function NewObservationDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    resident_id: "",
    observation_date: new Date().toISOString().slice(0, 10),
    mood: "stable",
    participation: "engaged",
    adl_support: "",
    wellness_check: true,
    notes: "",
  });
  const [att, setAtt] = useState<Attendance>(emptyAttendance());

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_observations").insert({
        ...form,
        attendance: att,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attendance saved"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  const setService = (k: ServiceKey) => (v: Attendance[ServiceKey]) => setAtt({ ...att, [k]: v });

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Daily Treatment Services — Attendance</DialogTitle></DialogHeader>
      <div className="space-y-4">
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
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="text-sm font-semibold">Group Therapy</div>
          <div className="flex flex-wrap items-center gap-4">
            {(["g1", "g2", "g3"] as const).map((g, i) => (
              <label key={g} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={att.group_therapy[g]}
                  onCheckedChange={(v) => setAtt({ ...att, group_therapy: { ...att.group_therapy, [g]: v === true } })}
                />
                Group {i + 1}
              </label>
            ))}
            <Input
              className="ml-auto w-32"
              placeholder="Staff init."
              maxLength={6}
              value={att.group_therapy.staff_initial}
              onChange={(e) => setAtt({ ...att, group_therapy: { ...att.group_therapy, staff_initial: e.target.value } })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Services</div>
          <ServiceRow label={SERVICE_LABELS.walk} value={att.walk} onChange={setService("walk")} />
          <ServiceRow label={SERVICE_LABELS.gym} value={att.gym} onChange={setService("gym")} />
          <ServiceRow label={SERVICE_LABELS.aana} value={att.aana} onChange={setService("aana")} />
          <ServiceRow label={SERVICE_LABELS.adl} value={att.adl} onChange={setService("adl")} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
            <Label>ADL support detail</Label>
            <Input value={form.adl_support} onChange={(e) => setForm({ ...form, adl_support: e.target.value })} placeholder="Hygiene, dressing…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.wellness_check} onCheckedChange={(v) => setForm({ ...form, wellness_check: v === true })} />
            Wellness check completed
          </label>
          <div className="space-y-1.5">
            <Label>Resident signature</Label>
            <Input placeholder="Typed name as signature" value={att.resident_signature} onChange={(e) => setAtt({ ...att, resident_signature: e.target.value })} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save attendance
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
