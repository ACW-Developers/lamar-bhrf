import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { RowActions } from "@/components/row-actions";

export const Route = createFileRoute("/_app/supervision")({
  head: () => ({ meta: [{ title: "Supervision - Lamar BHRF" }] }),
  component: SupervisionPage,
});

function SupervisionPage() {
  const { user, hasAnyRole } = useAuth();
  const canLog = hasAnyRole(["administrator", "bhp"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["supervision_logs"],
    queryFn: async () =>
      (await supabase
        .from("supervision_logs")
        .select("id, session_date, topics_discussed, feedback, action_items, signed_off_at, supervisor:profiles!supervision_logs_supervisor_id_fkey(full_name), supervisee:profiles!supervision_logs_supervisee_id_fkey(full_name)")
        .order("session_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Oversight"
        title="Clinical Supervision"
        description="BHP oversight of BHTs and BHPPs with sign-off and action items."
        actions={canLog && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log supervision</Button></DialogTrigger>
            <NewSupervisionDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["supervision_logs"] }); }} supervisorId={user?.id} />
          </Dialog>
        )}
      />
      <div className="space-y-3 p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (data ?? []).length === 0 ? (
          <DataEmpty icon={ShieldCheck} title="No supervision logs yet" />
        ) : (
          (data ?? []).map((s) => {
            const sup = s.supervisor as { full_name?: string } | null;
            const see = s.supervisee as { full_name?: string } | null;
            return (
              <div key={s.id} className="surface-elevated rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      <span className="text-foreground">{sup?.full_name ?? "Supervisor"}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="text-foreground">{see?.full_name ?? "Supervisee"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(s.session_date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.signed_off_at && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" /> Signed off
                      </span>
                    )}
                    <RowActions table="supervision_logs" id={s.id} queryKey={["supervision_logs"]} label="supervision log" />
                  </div>
                </div>
                {s.topics_discussed && <p className="mt-3 text-sm"><span className="font-medium">Topics:</span> {s.topics_discussed}</p>}
                {s.feedback && <p className="mt-1 text-sm"><span className="font-medium">Feedback:</span> {s.feedback}</p>}
                {s.action_items && <p className="mt-1 text-sm"><span className="font-medium">Action items:</span> {s.action_items}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NewSupervisionDialog({ onCreated, supervisorId }: { onCreated: () => void; supervisorId?: string }) {
  const [form, setForm] = useState({
    supervisee_id: "",
    session_date: new Date().toISOString().slice(0, 10),
    topics_discussed: "",
    feedback: "",
    action_items: "",
    sign_off: false,
  });

  const { data: staff } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").order("full_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("supervision_logs").insert({
        supervisor_id: supervisorId ?? null,
        supervisee_id: form.supervisee_id || null,
        session_date: form.session_date,
        topics_discussed: form.topics_discussed || null,
        feedback: form.feedback || null,
        action_items: form.action_items || null,
        signed_off_at: form.sign_off ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supervision logged"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Log supervision</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Supervisee</Label>
          <Select value={form.supervisee_id} onValueChange={(v) => setForm({ ...form, supervisee_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>
              {(staff ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Topics discussed</Label>
          <Textarea rows={2} value={form.topics_discussed} onChange={(e) => setForm({ ...form, topics_discussed: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Feedback</Label>
          <Textarea rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Action items</Label>
          <Textarea rows={2} value={form.action_items} onChange={(e) => setForm({ ...form, action_items: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.sign_off} onChange={(e) => setForm({ ...form, sign_off: e.target.checked })} className="h-4 w-4" />
          Sign off now
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.supervisee_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
