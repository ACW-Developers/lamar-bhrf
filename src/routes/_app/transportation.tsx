import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Car, Loader2, Plus } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/transportation")({
  head: () => ({ meta: [{ title: "Transportation — Lamar BHRF" }] }),
  component: TransportationPage,
});

function TransportationPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["transportation_logs"],
    queryFn: async () =>
      (await supabase
        .from("transportation_logs")
        .select("id, appointment_type, destination, vehicle, departure_time, return_time, outcome, resident:residents(first_name, last_name), driver:profiles(full_name)")
        .order("departure_time", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Daily Operations"
        title="Transportation"
        description="Appointments, driver assignment, vehicle logs, and outcomes."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Schedule trip</Button></DialogTrigger>
            <NewTripDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["transportation_logs"] }); }} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={Car} title="No transportation logs" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Departure</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Type / Destination</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((t) => {
                  const r = t.resident as { first_name?: string; last_name?: string } | null;
                  const d = t.driver as { full_name?: string } | null;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{formatDateTime(t.departure_time)}</TableCell>
                      <TableCell className="font-medium">{r?.first_name} {r?.last_name}</TableCell>
                      <TableCell className="text-sm">{t.appointment_type ?? "—"} · {t.destination ?? "—"}</TableCell>
                      <TableCell className="text-sm">{t.vehicle ?? "—"}</TableCell>
                      <TableCell className="text-sm">{d?.full_name ?? "Unassigned"}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(t.return_time)}</TableCell>
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

function NewTripDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    resident_id: "",
    appointment_type: "medical",
    destination: "",
    vehicle: "",
    departure_time: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transportation_logs").insert({
        resident_id: form.resident_id,
        appointment_type: form.appointment_type,
        destination: form.destination || null,
        vehicle: form.vehicle || null,
        departure_time: form.departure_time,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Trip scheduled"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Schedule transportation</DialogTitle></DialogHeader>
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
            <Label>Type</Label>
            <Select value={form.appointment_type} onValueChange={(v) => setForm({ ...form, appointment_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="court">Court</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="discharge">Discharge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Van #1" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Destination</Label>
            <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Departure</Label>
            <Input type="datetime-local" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
