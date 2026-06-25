import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks, Loader2, Plus } from "lucide-react";
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

export const Route = createFileRoute("/_app/treatment-plans")({
  head: () => ({ meta: [{ title: "Treatment Plans — Lamar BHRF" }] }),
  component: TreatmentPlansPage,
});

function TreatmentPlansPage() {
  const { hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(["administrator", "bhp"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["treatment_plans"],
    queryFn: async () =>
      (await supabase
        .from("treatment_plans")
        .select("id, plan_date, review_date, status, problem_summary, resident:residents(first_name, last_name, mrn)")
        .order("plan_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clinical"
        title="Treatment Plans"
        description="Problems, goals, objectives, and interventions with approval and review tracking."
        actions={canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New plan</Button></DialogTrigger>
            <NewPlanDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["treatment_plans"] }); }} />
          </Dialog>
        )}
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={ListChecks} title="No treatment plans" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>Problem summary</TableHead>
                  <TableHead>Plan date</TableHead>
                  <TableHead>Next review</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((p) => {
                  const r = p.resident as { first_name?: string; last_name?: string } | null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{r?.first_name} {r?.last_name}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground line-clamp-1">{p.problem_summary ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.plan_date)}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.review_date)}</TableCell>
                      <TableCell><StatusPill status={p.status} tone={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "warning"} /></TableCell>
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

function NewPlanDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ resident_id: "", problem_summary: "", review_date: "" });
  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name")).data ?? [],
  });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("treatment_plans").insert({
        resident_id: form.resident_id,
        problem_summary: form.problem_summary || null,
        review_date: form.review_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plan created"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New treatment plan</DialogTitle></DialogHeader>
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
        <div className="space-y-1.5">
          <Label>Problem summary</Label>
          <Textarea rows={3} value={form.problem_summary} onChange={(e) => setForm({ ...form, problem_summary: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Next review date</Label>
          <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create plan
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
