import { useState, useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Calendar, ClipboardList, StickyNote, Pill, AlertTriangle, Activity, Pencil, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/role-badge";
import { formatDate, relativeTime } from "@/lib/format";
import { DataEmpty } from "@/components/data-empty";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/residents/$id")({
  head: () => ({ meta: [{ title: "Resident — Lamar BHRF" }] }),
  component: ResidentDetailPage,
});

function ResidentDetailPage() {
  const { id } = useParams({ from: "/_app/residents/$id" });
  const { hasRole } = useAuth();
  const isAdmin = hasRole("administrator");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: resident } = useQuery({
    queryKey: ["resident", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("residents").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["resident-notes", id],
    queryFn: async () => (await supabase.from("progress_notes").select("id, content, note_type, created_at").eq("resident_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: plans } = useQuery({
    queryKey: ["resident-plans", id],
    queryFn: async () => (await supabase.from("treatment_plans").select("id, problem_summary, status, plan_date, review_date").eq("resident_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: meds } = useQuery({
    queryKey: ["resident-meds", id],
    queryFn: async () => (await supabase.from("medication_logs").select("id, medication_name, dosage, status, administered_at").eq("resident_id", id).order("administered_at", { ascending: false }).limit(20)).data ?? [],
  });

  const { data: incidents } = useQuery({
    queryKey: ["resident-incidents", id],
    queryFn: async () => (await supabase.from("incidents").select("id, incident_type, description, severity, status, incident_date").eq("resident_id", id).order("incident_date", { ascending: false })).data ?? [],
  });

  if (!resident) {
    return <div className="p-10 text-sm text-muted-foreground">Loading resident…</div>;
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;

  return (
    <div>
      <div className="border-b px-6 pt-5">
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link to="/residents"><ArrowLeft className="mr-1 h-4 w-4" /> All residents</Link>
        </Button>
        <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                {resident.first_name?.[0]}{resident.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-3xl tracking-tight">{fullName}</h1>
                <StatusPill status={resident.status} tone={resident.status === "active" ? "success" : "default"} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">{resident.mrn}</span>
                <span>DOB {formatDate(resident.date_of_birth)}</span>
                <span>Admitted {formatDate(resident.admission_date)}</span>
                {resident.primary_diagnosis && <span>Dx: {resident.primary_diagnosis}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm"><Phone className="mr-2 h-4 w-4" /> Emergency contact</Button>
            <Button size="sm"><StickyNote className="mr-2 h-4 w-4" /> Add note</Button>
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {isAdmin && resident && (
        <>
          <EditResidentDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            resident={resident}
            onSaved={() => {
              setEditOpen(false);
              qc.invalidateQueries({ queryKey: ["resident", id] });
              qc.invalidateQueries({ queryKey: ["residents"] });
            }}
          />
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete resident?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes {fullName} and all associated records. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const { error } = await supabase.from("residents").delete().eq("id", id);
                    if (error) return toast.error("Delete failed", { description: error.message });
                    toast.success("Resident deleted");
                    qc.invalidateQueries({ queryKey: ["residents"] });
                    navigate({ to: "/residents" });
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <div className="p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Progress notes</TabsTrigger>
            <TabsTrigger value="plans">Treatment plans</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard icon={Calendar} label="Length of stay" value={lengthOfStay(resident.admission_date)} />
              <InfoCard icon={ClipboardList} label="Active plans" value={String((plans ?? []).filter((p) => p.status === "approved").length)} />
              <InfoCard icon={Activity} label="Notes (30d)" value={String((notes ?? []).filter((n) => Date.now() - new Date(n.created_at).getTime() < 30 * 86_400_000).length)} />
            </div>
            <div className="surface-elevated rounded-2xl p-6">
              <h3 className="mb-3 text-sm font-semibold">Demographics & contact</h3>
              <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                <Field label="Phone" value={resident.phone} />
                <Field label="Email" value={resident.email} />
                <Field label="Address" value={resident.address} />
                <Field label="Room" value={resident.room_number} />
                <Field label="Emergency contact" value={resident.emergency_contact_name} />
                <Field label="Emergency phone" value={resident.emergency_contact_phone} />
                <Field label="Substance history" value={resident.substance_history} />
                <Field label="Internal notes" value={resident.notes} />
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6 space-y-3">
            {(notes ?? []).length === 0 ? (
              <DataEmpty icon={StickyNote} title="No progress notes yet" />
            ) : (
              (notes ?? []).map((n) => (
                <div key={n.id} className="surface-elevated rounded-xl p-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium capitalize text-primary">{n.note_type.replaceAll("_", " ")}</span>
                    <span>{relativeTime(n.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{n.content}</p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-6 space-y-3">
            {(plans ?? []).length === 0 ? (
              <DataEmpty icon={ClipboardList} title="No treatment plans" />
            ) : (
              (plans ?? []).map((p) => (
                <div key={p.id} className="surface-elevated flex items-center justify-between rounded-xl p-4">
                  <div>
                    <div className="font-medium">{p.problem_summary ?? "Treatment plan"}</div>
                    <div className="text-xs text-muted-foreground">
                      Plan date {formatDate(p.plan_date)} · Next review {formatDate(p.review_date)}
                    </div>
                  </div>
                  <StatusPill status={p.status} tone={p.status === "approved" ? "success" : "warning"} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="medications" className="mt-6 space-y-3">
            {(meds ?? []).length === 0 ? (
              <DataEmpty icon={Pill} title="No medication records" />
            ) : (
              (meds ?? []).map((m) => (
                <div key={m.id} className="surface-elevated flex items-center justify-between rounded-xl p-4">
                  <div>
                    <div className="font-medium">{m.medication_name}</div>
                    <div className="text-xs text-muted-foreground">{m.dosage ?? ""} · {relativeTime(m.administered_at)}</div>
                  </div>
                  <StatusPill status={m.status} tone={m.status === "administered" ? "success" : m.status === "refused" ? "destructive" : "warning"} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="incidents" className="mt-6 space-y-3">
            {(incidents ?? []).length === 0 ? (
              <DataEmpty icon={AlertTriangle} title="No incidents on file" />
            ) : (
              (incidents ?? []).map((inc) => (
                <div key={inc.id} className="surface-elevated flex items-center justify-between rounded-xl p-4">
                  <div>
                    <div className="font-medium capitalize">{inc.incident_type}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      Severity: {inc.severity ?? "—"} · {relativeTime(inc.incident_date)} · {inc.description.slice(0, 80)}
                    </div>
                  </div>
                  <StatusPill status={inc.status} tone={inc.status === "resolved" ? "success" : "destructive"} />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="surface-elevated rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 font-serif text-2xl">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? "—"}</dd>
    </div>
  );
}

function lengthOfStay(adm: string | null) {
  if (!adm) return "—";
  const d = Math.max(1, Math.floor((Date.now() - new Date(adm).getTime()) / 86_400_000));
  return `${d} day${d === 1 ? "" : "s"}`;
}
