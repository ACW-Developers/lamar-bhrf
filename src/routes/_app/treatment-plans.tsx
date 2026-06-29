import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks, Loader2, Plus, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { StatusPill } from "@/components/role-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/treatment-plans")({
  head: () => ({ meta: [{ title: "Treatment Plans — Lamar BHRF" }] }),
  component: TreatmentPlansPage,
});

type TemplateData = {
  // Administrative
  dob?: string;
  ahcccs_id?: string;
  admission_datetime?: string;
  case_manager_name?: string;
  case_manager_phone?: string;
  outpatient_team?: string[]; // ART, CFT, TRBHA
  outpatient_engaged_date?: string;
  // Medical Necessity
  risk_factors?: string[];
  functional_impairments?: string[];
  // Guiding Principles
  guiding_framework?: string;
  alignment_evidence?: string;
  // Goals
  goals?: {
    title: string;
    criteria_code: string;
    smart_objective: string;
    target_date: string;
    interventions: string;
    responsible_staff: string[];
  }[];
  // Integrated services
  external_services?: string;
  // Medication
  medications?: string;
  med_assistance_level?: string;
  // Discharge
  discharge_baseline?: string;
  discharge_functional?: string;
  discharge_support?: string;
  discharge_environment?: string;
  estimated_discharge_date?: string;
};

function TreatmentPlansPage() {
  const { hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(["administrator", "bhp"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["treatment_plans"],
    queryFn: async () =>
      (await supabase
        .from("treatment_plans")
        .select("id, plan_date, review_date, status, problem_summary, template_data, resident:residents(first_name, last_name, mrn)")
        .order("plan_date", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clinical"
        title="Treatment Plans"
        description="AZ DHS & AHCCCS (AMPM 320-V) compliant master treatment plans with the golden thread of goals, objectives, and interventions."
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
                  <TableHead className="w-12"></TableHead>
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
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => setViewing(p.id)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ViewPlanDialog
        plan={((data ?? []).find((p) => p.id === viewing) ?? null) as PlanRow | null}
        onClose={() => setViewing(null)}
      />
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      <Link to="/residents" className="hidden" />
    </div>
  );
}

const RISK_OPTIONS = [
  "Suicidal / aggressive / self-harm / homicidal ideation or behaviors",
  "Severe impulsivity with critically poor judgment, insight, or cognitive processing",
  "Maladaptive physical, behavioral, or sexualized behaviors risking self/others",
  "Inability to maintain safe baseline within home environment despite outpatient supports",
];

const FUNCTIONAL_OPTIONS = [
  "Inability to complete developmentally appropriate self-care, self-regulation, or ADLs",
  "Neglect or severe disruption of basic needs (hygiene, nutrition, safety)",
  "Pattern of frequent psychiatric hospitalizations, ER use, or acute legal involvement",
  "Chronic substance withdrawal / detoxification cycles requiring stable milieu",
  "Inability to independently self-administer or adhere to psychotropic medications",
];

const STAFF_OPTIONS = ["BHP (Professional)", "BHT (Technician)", "BHPP (Paraprofessional)", "Outpatient Liaison"];
const TEAM_OPTIONS = ["ART (Adult Recovery Team)", "CFT (Child and Family Team)", "TRBHA / ALTCS"];

function emptyGoal() {
  return {
    title: "",
    criteria_code: "",
    smart_objective: "",
    target_date: "",
    interventions: "",
    responsible_staff: [] as string[],
  };
}

function NewPlanDialog({ onCreated }: { onCreated: () => void }) {
  const [resident_id, setResidentId] = useState("");
  const [problem_summary, setProblemSummary] = useState("");
  const [review_date, setReviewDate] = useState("");
  const [t, setT] = useState<TemplateData>({
    outpatient_team: [],
    risk_factors: [],
    functional_impairments: [],
    goals: [
      { ...emptyGoal(), title: "Safety / Risk Reduction" },
      { ...emptyGoal(), title: "Functional Independence / ADL" },
    ],
  });

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name")).data ?? [],
  });

  const toggleArr = (key: keyof TemplateData, value: string) => {
    setT((prev) => {
      const arr = (prev[key] as string[] | undefined) ?? [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const updateGoal = (i: number, patch: Partial<NonNullable<TemplateData["goals"]>[number]>) => {
    setT((prev) => ({
      ...prev,
      goals: (prev.goals ?? []).map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    }));
  };

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("treatment_plans").insert({
        resident_id,
        problem_summary: problem_summary || null,
        review_date: review_date || null,
        template_data: t as never,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Treatment plan created"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>New BHRF Master Treatment Plan</DialogTitle>
        <p className="text-xs text-muted-foreground">AZ DHS &amp; AHCCCS (AMPM 320-V) compliant</p>
      </DialogHeader>

      <Tabs defaultValue="admin" className="mt-2">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="necessity">Necessity</TabsTrigger>
          <TabsTrigger value="principles">Principles</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="discharge">Discharge</TabsTrigger>
        </TabsList>

        {/* 1 Admin */}
        <TabsContent value="admin" className="space-y-3 pt-4">
          <Field label="Resident">
            <Select value={resident_id} onValueChange={setResidentId}>
              <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
              <SelectContent>
                {(residents ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name} {r.mrn ? `· ${r.mrn}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of Birth"><Input type="date" value={t.dob ?? ""} onChange={(e) => setT({ ...t, dob: e.target.value })} /></Field>
            <Field label="AHCCCS ID"><Input value={t.ahcccs_id ?? ""} onChange={(e) => setT({ ...t, ahcccs_id: e.target.value })} /></Field>
            <Field label="Admission Date & Time"><Input type="datetime-local" value={t.admission_datetime ?? ""} onChange={(e) => setT({ ...t, admission_datetime: e.target.value })} /></Field>
            <Field label="Next Monthly Review Due"><Input type="date" value={review_date} onChange={(e) => setReviewDate(e.target.value)} /></Field>
            <Field label="Case Manager Name"><Input value={t.case_manager_name ?? ""} onChange={(e) => setT({ ...t, case_manager_name: e.target.value })} /></Field>
            <Field label="Case Manager Phone"><Input value={t.case_manager_phone ?? ""} onChange={(e) => setT({ ...t, case_manager_phone: e.target.value })} /></Field>
            <Field label="Outpatient Team Engaged (within 48 hrs)"><Input type="date" value={t.outpatient_engaged_date ?? ""} onChange={(e) => setT({ ...t, outpatient_engaged_date: e.target.value })} /></Field>
          </div>
          <Field label="Assigned Outpatient Team">
            <div className="grid gap-2 sm:grid-cols-3">
              {TEAM_OPTIONS.map((opt) => (
                <CheckRow key={opt} label={opt} checked={t.outpatient_team?.includes(opt) ?? false} onChange={() => toggleArr("outpatient_team", opt)} />
              ))}
            </div>
          </Field>
        </TabsContent>

        {/* 2 Medical Necessity */}
        <TabsContent value="necessity" className="space-y-4 pt-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Significant Risk of Harm (past 3 months)</h4>
            <div className="space-y-2">
              {RISK_OPTIONS.map((opt) => (
                <CheckRow key={opt} label={opt} checked={t.risk_factors?.includes(opt) ?? false} onChange={() => toggleArr("risk_factors", opt)} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Serious Functional Impairment</h4>
            <div className="space-y-2">
              {FUNCTIONAL_OPTIONS.map((opt) => (
                <CheckRow key={opt} label={opt} checked={t.functional_impairments?.includes(opt) ?? false} onChange={() => toggleArr("functional_impairments", opt)} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 3 Guiding Principles */}
        <TabsContent value="principles" className="space-y-3 pt-4">
          <Field label="System Framework">
            <Select value={t.guiding_framework ?? ""} onValueChange={(v) => setT({ ...t, guiding_framework: v })}>
              <SelectTrigger><SelectValue placeholder="Select framework" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adult-9">Nine Guiding Principles — Adult Behavioral Health</SelectItem>
                <SelectItem value="child-12">Arizona Vision 12 Principles — Children's Behavioral Health</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Evidence of Active Alignment (resident choice, family, cultural elements)">
            <Textarea rows={4} value={t.alignment_evidence ?? ""} onChange={(e) => setT({ ...t, alignment_evidence: e.target.value })} />
          </Field>
          <Field label="Problem Summary">
            <Textarea rows={3} value={problem_summary} onChange={(e) => setProblemSummary(e.target.value)} />
          </Field>
        </TabsContent>

        {/* 4 Goals */}
        <TabsContent value="goals" className="space-y-4 pt-4">
          {(t.goals ?? []).map((g, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Core Goal {i + 1}</h4>
                {(t.goals ?? []).length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => setT({ ...t, goals: (t.goals ?? []).filter((_, idx) => idx !== i) })}>Remove</Button>
                )}
              </div>
              <Field label="Goal Title"><Input value={g.title} onChange={(e) => updateGoal(i, { title: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Target Medical Necessity Criteria Code"><Input value={g.criteria_code} onChange={(e) => updateGoal(i, { criteria_code: e.target.value })} /></Field>
                <Field label="Target Date"><Input type="date" value={g.target_date} onChange={(e) => updateGoal(i, { target_date: e.target.value })} /></Field>
              </div>
              <Field label="SMART Objective">
                <Textarea rows={3} value={g.smart_objective} onChange={(e) => updateGoal(i, { smart_objective: e.target.value })} placeholder="Resident will utilize [2 skills] to manage impulses, reducing outbursts from X to <Y per week, for 30 consecutive days." />
              </Field>
              <Field label="BHRF Interventions & Modalities (service / frequency / duration)">
                <Textarea rows={2} value={g.interventions} onChange={(e) => updateGoal(i, { interventions: e.target.value })} />
              </Field>
              <Field label="Responsible Staff">
                <div className="grid gap-2 sm:grid-cols-2">
                  {STAFF_OPTIONS.map((opt) => (
                    <CheckRow
                      key={opt}
                      label={opt}
                      checked={g.responsible_staff.includes(opt)}
                      onChange={() => updateGoal(i, {
                        responsible_staff: g.responsible_staff.includes(opt)
                          ? g.responsible_staff.filter((s) => s !== opt)
                          : [...g.responsible_staff, opt],
                      })}
                    />
                  ))}
                </div>
              </Field>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setT({ ...t, goals: [...(t.goals ?? []), emptyGoal()] })}>
            <Plus className="mr-2 h-4 w-4" /> Add another goal
          </Button>
        </TabsContent>

        {/* 5 Services / Medication */}
        <TabsContent value="services" className="space-y-3 pt-4">
          <Field label="Integrated Medically Necessary Services (outside BHRF scope)">
            <Textarea rows={3} value={t.external_services ?? ""} onChange={(e) => setT({ ...t, external_services: e.target.value })} placeholder="Service · Frequency · External Provider · Coordination strategy" />
          </Field>
          <Field label="Psychotropic & Somatic Medications">
            <Textarea rows={3} value={t.medications ?? ""} onChange={(e) => setT({ ...t, medications: e.target.value })} />
          </Field>
          <Field label="Level of Assistance Required (ADHS A.A.C. R9-10-702)">
            <Select value={t.med_assistance_level ?? ""} onValueChange={(v) => setT({ ...t, med_assistance_level: v })}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assistance">Assistance in Self-Administration (facility secures, staff verifies)</SelectItem>
                <SelectItem value="independent">Independent Administration / Self-Carry (BHP rationale required)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </TabsContent>

        {/* 6 Discharge */}
        <TabsContent value="discharge" className="space-y-3 pt-4">
          <Field label="Behavioral/Symptomatic Reduction Baseline">
            <Textarea rows={2} value={t.discharge_baseline ?? ""} onChange={(e) => setT({ ...t, discharge_baseline: e.target.value })} />
          </Field>
          <Field label="Functional Living Profile Achieved">
            <Textarea rows={2} value={t.discharge_functional ?? ""} onChange={(e) => setT({ ...t, discharge_functional: e.target.value })} />
          </Field>
          <Field label="Community/Caregiver Support Network">
            <Textarea rows={2} value={t.discharge_support ?? ""} onChange={(e) => setT({ ...t, discharge_support: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Target Discharge Environment">
              <Select value={t.discharge_environment ?? ""} onValueChange={(v) => setT({ ...t, discharge_environment: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independent Living</SelectItem>
                  <SelectItem value="hctc">Adult Behavioral Health Therapeutic Home (HCTC)</SelectItem>
                  <SelectItem value="supported">Supported Housing</SelectItem>
                  <SelectItem value="outpatient">Outpatient Care Continuity (PHP / IOP)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estimated Discharge Date">
              <Input type="date" value={t.estimated_discharge_date ?? ""} onChange={(e) => setT({ ...t, estimated_discharge_date: e.target.value })} />
            </Field>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-4">
        <Button onClick={() => m.mutate()} disabled={m.isPending || !resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create plan
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

type PlanRow = {
  id: string;
  plan_date: string | null;
  review_date: string | null;
  status: string;
  problem_summary: string | null;
  template_data: TemplateData | null;
  resident: { first_name?: string; last_name?: string } | null;
};

function ViewPlanDialog({ plan, onClose }: { plan: PlanRow | null; onClose: () => void }) {
  if (!plan) return null;
  const t = (plan.template_data ?? {}) as TemplateData;
  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan.resident?.first_name} {plan.resident?.last_name} — Treatment Plan</DialogTitle>
          <p className="text-xs text-muted-foreground">Plan {formatDate(plan.plan_date)} · Review {formatDate(plan.review_date)}</p>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {plan.problem_summary && <Section title="Problem Summary"><p>{plan.problem_summary}</p></Section>}
          {(t.risk_factors?.length || t.functional_impairments?.length) ? (
            <Section title="Medical Necessity">
              {t.risk_factors?.length ? <List items={t.risk_factors} label="Risk of Harm" /> : null}
              {t.functional_impairments?.length ? <List items={t.functional_impairments} label="Functional Impairment" /> : null}
            </Section>
          ) : null}
          {t.goals?.length ? (
            <Section title="Goals">
              {t.goals.map((g, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <div className="font-medium">{i + 1}. {g.title || "Untitled goal"}</div>
                  {g.smart_objective && <p className="mt-1 text-muted-foreground">{g.smart_objective}</p>}
                  {g.target_date && <p className="mt-1 text-xs text-muted-foreground">Target: {formatDate(g.target_date)}</p>}
                  {g.responsible_staff?.length ? <p className="mt-1 text-xs text-muted-foreground">Staff: {g.responsible_staff.join(", ")}</p> : null}
                </div>
              ))}
            </Section>
          ) : null}
          {(t.discharge_environment || t.estimated_discharge_date) && (
            <Section title="Discharge Plan">
              {t.discharge_environment && <p>Environment: <span className="text-muted-foreground">{t.discharge_environment}</span></p>}
              {t.estimated_discharge_date && <p>Estimated date: <span className="text-muted-foreground">{formatDate(t.estimated_discharge_date)}</span></p>}
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function List({ items, label }: { items: string[]; label: string }) {
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <ul className="ml-4 list-disc text-muted-foreground">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
