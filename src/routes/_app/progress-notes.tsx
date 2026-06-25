import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StickyNote, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/progress-notes")({
  head: () => ({ meta: [{ title: "Progress Notes — Lamar BHRF" }] }),
  component: ProgressNotesPage,
});

function ProgressNotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["progress_notes"],
    queryFn: async () =>
      (await supabase
        .from("progress_notes")
        .select("id, content, note_type, created_at, author_role, resident:residents(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(100)).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Documentation"
        title="Progress Notes"
        description="A unified, time-stamped feed of all BHPP, BHT, and BHP notes."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New note</Button></DialogTrigger>
            <NewNoteDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["progress_notes"] }); }} />
          </Dialog>
        }
      />
      <div className="space-y-3 p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (data ?? []).length === 0 ? (
          <DataEmpty icon={StickyNote} title="No notes yet" />
        ) : (
          (data ?? []).map((n) => {
            const r = n.resident as { first_name?: string; last_name?: string } | null;
            return (
              <div key={n.id} className="surface-elevated rounded-xl p-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r?.first_name} {r?.last_name}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">{n.note_type.replaceAll("_", " ")}</Badge>
                    {n.author_role && <Badge variant="outline" className="text-[10px] uppercase">{n.author_role}</Badge>}
                  </div>
                  <span className="text-muted-foreground">{relativeTime(n.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed">{n.content}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NewNoteDialog({ onCreated }: { onCreated: () => void }) {
  const { user, roles } = useAuth();
  const [form, setForm] = useState({ resident_id: "", note_type: "shift_note", content: "" });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("progress_notes").insert({
        resident_id: form.resident_id,
        note_type: form.note_type,
        content: form.content,
        author_id: user?.id ?? null,
        author_role: roles[0] ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Note saved"); onCreated(); },
    onError: (e) => toast.error("Could not save note", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New progress note</DialogTitle></DialogHeader>
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
          <Label>Note type</Label>
          <Select value={form.note_type} onValueChange={(v) => setForm({ ...form, note_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shift_note">Shift note</SelectItem>
              <SelectItem value="clinical_note">Clinical note</SelectItem>
              <SelectItem value="intervention">Intervention</SelectItem>
              <SelectItem value="incident_followup">Incident follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Content</Label>
          <Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Document observations, interventions, and outcomes…" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.resident_id || !form.content}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save note
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
