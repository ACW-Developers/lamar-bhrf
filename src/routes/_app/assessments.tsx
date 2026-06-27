import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Loader2, Plus, Eye } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { IntakeAssessmentFormFields, emptyIntakeAssessment, type IntakeAssessmentData, SYMPTOMS } from "@/components/intake-assessment-form";

export const Route = createFileRoute("/_app/assessments")({
  head: () => ({ meta: [{ title: "Assessments — Lamar BHRF" }] }),
  component: AssessmentsPage,
});

type AssessmentRow = {
  id: string;
  assessment_date: string;
  assessment_type: string;
  status: string;
  risk_level: string | null;
  findings: string | null;
  recommendations: string | null;
  intake_data: IntakeAssessmentData | null;
  resident: { first_name?: string; last_name?: string; mrn?: string } | null;
};

function AssessmentsPage() {
  const { hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(["administrator", "bhp"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AssessmentRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () =>
      ((await supabase
        .from("assessments")
        .select("id, assessment_date, assessment_type, status, risk_level, findings, recommendations, intake_data, resident:residents(first_name, last_name, mrn)")
        .order("assessment_date", { ascending: false })).data ?? []) as unknown as AssessmentRow[],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clinical"
        title="Assessments"
        description="Comprehensive BHRF intake assessment plus behavioral, diagnostic, risk, and substance use assessments."
        actions={canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New assessment</Button></DialogTrigger>
            <NewAssessmentDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["assessments"] }); }} />
          </Dialog>
        )}
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={FileText} title="No assessments recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.resident?.first_name} {a.resident?.last_name}</TableCell>
                    <TableCell className="text-sm capitalize">{a.assessment_type.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.assessment_date)}</TableCell>
                    <TableCell><StatusPill status={a.risk_level ?? "—"} tone={a.risk_level === "high" || a.risk_level === "critical" ? "destructive" : a.risk_level === "moderate" ? "warning" : "success"} /></TableCell>
                    <TableCell><StatusPill status={a.status} tone={a.status === "approved" ? "success" : a.status === "rejected" ? "destructive" : "warning"} /></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setViewing(a)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{viewing?.assessment_type === "intake" ? "Intake assessment" : "Assessment"} — {viewing?.resident?.first_name} {viewing?.resident?.last_name}</DialogTitle></DialogHeader>
          {viewing && <ScrollArea className="max-h-[70vh] pr-4"><AssessmentSummary row={viewing} /></ScrollArea>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssessmentSummary({ row }: { row: AssessmentRow }) {
  const d = row.intake_data;
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg border p-3"><h4 className="font-semibold text-sm mb-1">{title}</h4><div className="text-sm text-muted-foreground space-y-0.5">{children}</div></div>
  );
  if (row.assessment_type !== "intake" || !d || !d.demographics) {
    return (
      <div className="space-y-3">
        <Section title="Findings">{row.findings || "—"}</Section>
        <Section title="Recommendations">{row.recommendations || "—"}</Section>
      </div>
    );
  }
  const checked = Object.entries(d.symptoms ?? {}).filter(([, v]) => v).map(([k]) => k);
  return (
    <div className="space-y-3">
      <Section title="Demographics">
        <div>AHCCCS #: {d.demographics.ahcccs_number || "—"} · Gender: {d.demographics.gender || "—"}</div>
        <div>Ethnicity: {d.demographics.ethnicity || "—"} · Tribe: {d.demographics.native_american_tribe || "—"}</div>
        <div>Education: {d.demographics.highest_education || "—"}</div>
        {d.demographics.has_case_manager && <div>Case manager: {d.demographics.case_manager_name} ({d.demographics.case_manager_phone})</div>}
      </Section>
      <Section title="Presenting problem">{d.presenting_problem || "—"}</Section>
      <Section title="Family of origin">{d.family_of_origin.where_grew_up || "—"}</Section>
      <Section title="Behavioral health history">
        <div>Diagnoses: {Object.entries(d.behavioral_health_history.diagnoses).filter(([k, v]) => k !== "other" && v).map(([k]) => k).join(", ") || "—"}{d.behavioral_health_history.diagnoses.other ? `, ${d.behavioral_health_history.diagnoses.other}` : ""}</div>
        <div>Hospitalizations: {d.behavioral_health_history.psychiatric_hospitalizations || "—"}</div>
      </Section>
      <Section title="Risk">
        <div>Suicidal: {d.risk_assessment.suicidal_ideation_history || "—"}</div>
        <div>Self-harm: {d.risk_assessment.self_harm_history || "—"}</div>
        <div>Safety plan: {d.risk_assessment.safety_plan_completed ? "Yes" : "No"}</div>
      </Section>
      <Section title="Substance use">
        {d.substance_use.filter((s) => s.age_first_used || s.last_used || s.quantity).map((s, i) => (
          <div key={i}>{s.drug}: first {s.age_first_used || "?"}, last {s.last_used || "?"}, qty {s.quantity || "?"}</div>
        )) || "—"}
        {d.substance_use.every((s) => !s.age_first_used && !s.last_used && !s.quantity) && "—"}
      </Section>
      <Section title={`Symptoms (${checked.length}/${SYMPTOMS.length})`}>{checked.join(", ") || "None checked"}</Section>
      <Section title="Strengths">{d.strengths.filter(Boolean).join(" · ") || "—"}</Section>
      <Section title="Goals">{d.goals.filter(Boolean).join(" · ") || "—"}</Section>
      <Section title="ASAM">{d.asam_score || "—"}</Section>
      <Section title="Signatures">
        <div>Staff: {d.staff_name || "—"} ({d.staff_date || "—"})</div>
        <div>BHP: {d.bhp_name || "—"} ({d.bhp_date || "—"})</div>
      </Section>
    </div>
  );
}

function NewAssessmentDialog({ onCreated }: { onCreated: () => void }) {
  const [resident_id, setResidentId] = useState("");
  const [assessment_type, setType] = useState("intake");
  const [risk_level, setRisk] = useState("low");
  const [findings, setFindings] = useState("");
  const [recommendations, setRecs] = useState("");
  const [intake, setIntake] = useState<IntakeAssessmentData>(emptyIntakeAssessment);

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assessments").insert({
        resident_id,
        assessment_type,
        risk_level,
        findings: findings || null,
        recommendations: recommendations || null,
        intake_data: (assessment_type === "intake" ? (intake as unknown as never) : ({} as unknown as never)),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assessment created"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader><DialogTitle>New assessment</DialogTitle></DialogHeader>
      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Resident</Label>
              <Select value={resident_id} onValueChange={setResidentId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(residents ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={assessment_type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">BHRF Client Intake Assessment</SelectItem>
                  <SelectItem value="behavioral_health">Behavioral health</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="substance_use">Substance use</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Risk level</Label>
              <Select value={risk_level} onValueChange={setRisk}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {assessment_type === "intake" ? (
            <IntakeAssessmentFormFields value={intake} onChange={setIntake} />
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Findings</Label>
                <Textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Recommendations</Label>
                <Textarea rows={3} value={recommendations} onChange={(e) => setRecs(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save assessment
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
