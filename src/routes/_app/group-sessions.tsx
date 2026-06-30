import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UsersRound, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/group-sessions")({
  head: () => ({ meta: [{ title: "Group Sessions - Lamar BHRF" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["group_sessions"],
    queryFn: async () =>
      (await supabase
        .from("group_sessions")
        .select("id, topic, location, session_date, notes, facilitator:profiles(full_name), attendance:group_attendance(id)")
        .order("session_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Daily Operations"
        title="Group Sessions"
        description="Plan, run, and document group therapy sessions with attendance tracking."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New session</Button></DialogTrigger>
            <NewGroupDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["group_sessions"] }); }} />
          </Dialog>
        }
      />
      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (data ?? []).length === 0 ? (
          <div className="col-span-full"><DataEmpty icon={UsersRound} title="No group sessions yet" /></div>
        ) : (
          (data ?? []).map((g) => {
            const f = g.facilitator as { full_name?: string } | null;
            const attendees = Array.isArray(g.attendance) ? g.attendance.length : 0;
            return (
              <div key={g.id} className="surface-elevated rounded-2xl p-5">
                <div className="mb-2 text-xs text-muted-foreground">{formatDateTime(g.session_date)}</div>
                <h3 className="font-serif text-xl">{g.topic}</h3>
                <div className="mt-2 text-sm text-muted-foreground">{g.location ?? "Location TBD"}</div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Facilitator: {f?.full_name ?? "Unassigned"}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{attendees} attended</span>
                </div>
                {g.notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{g.notes}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NewGroupDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ topic: "", location: "", session_date: new Date().toISOString().slice(0, 16), notes: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("group_sessions").insert({
        topic: form.topic,
        location: form.location || null,
        session_date: form.session_date,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session created"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New group session</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Topic</Label>
          <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Relapse prevention" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date & time</Label>
            <Input type="datetime-local" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Group room A" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.topic}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
