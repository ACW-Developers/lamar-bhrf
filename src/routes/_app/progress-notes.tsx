import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StickyNote, Loader2, Plus, Search, ShieldAlert, Heart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { RowActions, useCanManage } from "@/components/row-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/progress-notes")({
  head: () => ({ meta: [{ title: "Progress Notes - Lamar BHRF" }] }),
  component: ProgressNotesPage,
});

type Soap = { s?: string; o?: string; a?: string; p?: string };

type NoteRow = {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  updated_at: string | null;
  signed_at: string | null;
  author_id: string | null;
  author_role: AppRole | null;
  mood_rating: number | null;
  risk_level: string | null;
  interventions: string | null;
  soap: Soap | null;
  resident_id: string;
  resident: { first_name?: string; last_name?: string } | null;
};

const NOTE_TYPES = [
  { value: "shift_note", label: "Shift Note" },
  { value: "clinical_note", label: "Clinical (SOAP)" },
  { value: "intervention", label: "Intervention" },
  { value: "incident_followup", label: "Incident Follow-up" },
  { value: "medication_note", label: "Medication" },
  { value: "family_contact", label: "Family Contact" },
];

const RISK_LEVELS = ["none", "low", "moderate", "high", "imminent"];

function riskTone(level?: string | null) {
  if (!level) return "bg-muted text-muted-foreground";
  if (level === "high" || level === "imminent") return "bg-destructive/15 text-destructive";
  if (level === "moderate") return "bg-warning/25 text-warning-foreground";
  return "bg-success/15 text-success";
}

function ProgressNotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoteRow | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [residentFilter, setResidentFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["progress_notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_notes")
        .select("id, content, note_type, created_at, updated_at, signed_at, author_id, author_role, mood_rating, risk_level, interventions, soap, resident_id, resident:residents(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as NoteRow[];
    },
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () =>
      (await supabase.from("residents").select("id, first_name, last_name").order("last_name")).data ?? [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((n) => {
      if (typeFilter !== "all" && n.note_type !== typeFilter) return false;
      if (residentFilter !== "all" && n.resident_id !== residentFilter) return false;
      if (!q) return true;
      const r = n.resident;
      const hay = [
        n.content,
        n.interventions,
        n.soap?.s,
        n.soap?.o,
        n.soap?.a,
        n.soap?.p,
        r?.first_name,
        r?.last_name,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, typeFilter, residentFilter]);

  return (
    <div>
      <PageHeader
        eyebrow="Documentation"
        title="Progress Notes"
        description="Structured, time-stamped clinical documentation with SOAP format, risk, and mood tracking."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New note</Button>
            </DialogTrigger>
            <NoteDialog
              key="new"
              onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["progress_notes"] }); }}
              residents={residents ?? []}
            />
          </Dialog>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, residents, interventions…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {NOTE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={residentFilter} onValueChange={setResidentFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All residents</SelectItem>
                {(residents ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <DataEmpty icon={StickyNote} title="No notes match your filters" />
          ) : (
            filtered.map((n) => (
              <NoteCard key={n.id} note={n} onEdit={() => setEditing(n)} />
            ))
          )}
        </div>
      </div>

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <NoteDialog
            key={editing.id}
            note={editing}
            residents={residents ?? []}
            onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["progress_notes"] }); }}
          />
        </Dialog>
      )}
    </div>
  );
}

function NoteCard({ note, onEdit }: { note: NoteRow; onEdit: () => void }) {
  const r = note.resident;
  const typeLabel = NOTE_TYPES.find((t) => t.value === note.note_type)?.label ?? note.note_type;
  const { canEdit } = useCanManage(note.author_id);

  return (
    <div className="surface-elevated rounded-xl p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r?.first_name} {r?.last_name}</span>
            <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
            {note.author_role && <Badge variant="outline" className="text-[10px] uppercase">{note.author_role}</Badge>}
            {note.risk_level && note.risk_level !== "none" && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", riskTone(note.risk_level))}>
                <ShieldAlert className="h-3 w-3" /> {note.risk_level} risk
              </span>
            )}
            {note.mood_rating != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Heart className="h-3 w-3" /> mood {note.mood_rating}/10
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDateTime(note.created_at)} · {relativeTime(note.created_at)}
            {note.updated_at && note.updated_at !== note.created_at && <span> · edited</span>}
          </div>
        </div>
        <RowActions
          table="progress_notes"
          id={note.id}
          queryKey={["progress_notes"]}
          authorId={note.author_id}
          onEdit={canEdit ? onEdit : undefined}
          label="note"
        />
      </div>

      {note.soap && (note.soap.s || note.soap.o || note.soap.a || note.soap.p) ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {note.soap.s && <SoapRow label="S — Subjective" text={note.soap.s} />}
          {note.soap.o && <SoapRow label="O — Objective" text={note.soap.o} />}
          {note.soap.a && <SoapRow label="A — Assessment" text={note.soap.a} />}
          {note.soap.p && <SoapRow label="P — Plan" text={note.soap.p} />}
        </dl>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
      )}

      {note.interventions && (
        <div className="mt-3 rounded-lg bg-muted/50 p-2.5 text-xs">
          <span className="font-semibold text-foreground">Interventions: </span>
          <span className="text-muted-foreground">{note.interventions}</span>
        </div>
      )}
    </div>
  );
}

function SoapRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{text}</dd>
    </div>
  );
}

function NoteDialog({
  note,
  residents,
  onSaved,
}: {
  note?: NoteRow;
  residents: { id: string; first_name: string; last_name: string }[];
  onSaved: () => void;
}) {
  const { user, roles } = useAuth();
  const [form, setForm] = useState({
    resident_id: note?.resident_id ?? "",
    note_type: note?.note_type ?? "clinical_note",
    s: note?.soap?.s ?? "",
    o: note?.soap?.o ?? "",
    a: note?.soap?.a ?? "",
    p: note?.soap?.p ?? "",
    content: note?.content ?? "",
    mood_rating: note?.mood_rating != null ? String(note.mood_rating) : "",
    risk_level: note?.risk_level ?? "none",
    interventions: note?.interventions ?? "",
    sign: !!note?.signed_at,
  });

  const isSoap = form.note_type === "clinical_note" || form.note_type === "intervention";

  const m = useMutation({
    mutationFn: async () => {
      const soap = isSoap ? { s: form.s || null, o: form.o || null, a: form.a || null, p: form.p || null } : null;
      const summary = form.content?.trim()
        ? form.content
        : isSoap
          ? [form.s && `S: ${form.s}`, form.o && `O: ${form.o}`, form.a && `A: ${form.a}`, form.p && `P: ${form.p}`]
              .filter(Boolean).join("\n")
          : "";
      const payload = {
        resident_id: form.resident_id,
        note_type: form.note_type,
        content: summary,
        soap,
        mood_rating: form.mood_rating ? Number(form.mood_rating) : null,
        risk_level: form.risk_level || null,
        interventions: form.interventions || null,
        signed_at: form.sign ? new Date().toISOString() : null,
        author_id: note?.author_id ?? user?.id ?? null,
        author_role: note?.author_role ?? roles[0] ?? null,
      };
      if (note) {
        const { error } = await supabase.from("progress_notes").update(payload).eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("progress_notes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(note ? "Note updated" : "Note saved"); onSaved(); },
    onError: (e) => toast.error("Could not save note", { description: (e as Error).message }),
  });

  const canSubmit =
    form.resident_id &&
    (isSoap ? (form.s || form.o || form.a || form.p || form.content) : form.content);

  return (
    <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{note ? "Edit progress note" : "New progress note"}</DialogTitle>
        <DialogDescription>
          Document objectively, in the resident's own words where possible. Notes are time-stamped and audited.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Resident</Label>
            <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
              <SelectContent>
                {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Note type</Label>
            <Select value={form.note_type} onValueChange={(v) => setForm({ ...form, note_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isSoap ? (
          <div className="space-y-3 rounded-xl border border-border/70 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary/80">SOAP Format</div>
            <div className="space-y-1.5">
              <Label>S — Subjective <span className="text-muted-foreground font-normal">(resident's own report)</span></Label>
              <Textarea rows={2} value={form.s} onChange={(e) => setForm({ ...form, s: e.target.value })} placeholder="Resident stated…" />
            </div>
            <div className="space-y-1.5">
              <Label>O — Objective <span className="text-muted-foreground font-normal">(observed behavior, MSE, vitals)</span></Label>
              <Textarea rows={2} value={form.o} onChange={(e) => setForm({ ...form, o: e.target.value })} placeholder="Observed…" />
            </div>
            <div className="space-y-1.5">
              <Label>A — Assessment <span className="text-muted-foreground font-normal">(clinical impression, progress toward goals)</span></Label>
              <Textarea rows={2} value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} placeholder="Progressing / plateau / regressing on goal…" />
            </div>
            <div className="space-y-1.5">
              <Label>P — Plan <span className="text-muted-foreground font-normal">(next steps, follow-up)</span></Label>
              <Textarea rows={2} value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} placeholder="Continue…, add…, refer to…" />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Narrative</Label>
            <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Document observations, interventions, and outcomes…" />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mood rating <span className="text-muted-foreground font-normal">(1–10)</span></Label>
            <Input type="number" min={1} max={10} value={form.mood_rating} onChange={(e) => setForm({ ...form, mood_rating: e.target.value })} placeholder="e.g. 7" />
          </div>
          <div className="space-y-1.5">
            <Label>Risk level</Label>
            <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Interventions / therapeutic techniques used</Label>
          <Textarea rows={2} value={form.interventions} onChange={(e) => setForm({ ...form, interventions: e.target.value })} placeholder="CBT thought record, DBT distress tolerance, motivational interviewing…" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.sign} onChange={(e) => setForm({ ...form, sign: e.target.checked })} className="h-4 w-4" />
          Sign and lock this note
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !canSubmit}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {note ? "Update note" : "Save note"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
