import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardPlus, Loader2, Plus, Eye } from "lucide-react";
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
import { AdmissionIntakeFormFields, emptyAdmissionIntake, type AdmissionIntakeForm } from "@/components/admission-intake-form";

export const Route = createFileRoute("/_app/admissions")({
  head: () => ({ meta: [{ title: "Admissions - Lamar BHRF" }] }),
  component: AdmissionsPage,
});

type AdmissionRow = {
  id: string;
  intake_date: string;
  status: string;
  referral_source: string | null;
  presenting_problem: string | null;
  intake_form: AdmissionIntakeForm | null;
  resident: { first_name?: string; last_name?: string; mrn?: string } | null;
};

function AdmissionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AdmissionRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("id, intake_date, status, referral_source, presenting_problem, intake_form, resident:residents(first_name, last_name, mrn)")
        .order("intake_date", { ascending: false });
      return (data ?? []) as unknown as AdmissionRow[];
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Intake"
        title="Admissions"
        description="Capture all 10 admission consents, rights acknowledgment, ROI, emergency contacts, and POA documentation."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New intake</Button>
            </DialogTrigger>
            <NewAdmissionDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admissions"] }); }} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (data ?? []).length === 0 ? (
            <DataEmpty icon={ClipboardPlus} title="No admissions yet" description="Create an intake record for an incoming resident." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Intake date</TableHead>
                  <TableHead>Referral</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.resident?.first_name} {a.resident?.last_name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.resident?.mrn}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.intake_date)}</TableCell>
                    <TableCell className="text-sm">{a.referral_source ?? "-"}</TableCell>
                    <TableCell><StatusPill status={a.status} tone={a.status === "approved" || a.status === "completed" ? "success" : a.status === "rejected" ? "destructive" : "warning"} /></TableCell>
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
          <DialogHeader><DialogTitle>Admission - {viewing?.resident?.first_name} {viewing?.resident?.last_name}</DialogTitle></DialogHeader>
          {viewing && <ScrollArea className="max-h-[70vh] pr-4"><AdmissionSummary row={viewing} /></ScrollArea>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdmissionSummary({ row }: { row: AdmissionRow }) {
  const f = row.intake_form;
  const Section = ({ title, ok, children }: { title: string; ok?: boolean; children?: React.ReactNode }) => (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">{title}</h4>{ok !== undefined && <StatusPill status={ok ? "Signed" : "Pending"} tone={ok ? "success" : "warning"} />}</div>
      {children && <div className="text-sm text-muted-foreground space-y-0.5">{children}</div>}
    </div>
  );
  if (!f) return <p className="text-sm text-muted-foreground">No intake form data captured.</p>;
  return (
    <div className="space-y-3">
      <Section title="1. General consent for services" ok={f.general_consent?.acknowledged}>
        <div>Signed by: {f.general_consent?.resident_signature || "-"} on {f.general_consent?.resident_signed_date || "-"}</div>
        <div>BHT: {f.general_consent?.bht_name || "-"}</div>
      </Section>
      <Section title="2. Resident rights acknowledgment" ok={f.rights_acknowledgment?.acknowledged}>
        <div>Witness: {f.rights_acknowledgment?.witness_signature || "-"}</div>
      </Section>
      <Section title="3. Release of information">
        <div>Disclose to: {f.release_of_information?.disclose_to || "-"}</div>
        <div>Duration: {f.release_of_information?.duration}</div>
      </Section>
      <Section title="4. Psychotropic medication consent">
        <div>Medication: {f.medication_consent?.medication_name || "-"}</div>
        <div>Clinician: {f.medication_consent?.prescribing_clinician || "-"}</div>
      </Section>
      <Section title="5. Treatment consent" ok={f.treatment_consent?.acknowledged} />
      <Section title="6. Policies & procedures" ok={f.policies_acknowledgment?.acknowledged} />
      <Section title="7. Emergency contacts">
        <div>Primary: {f.emergency_contacts?.primary_name || "-"} ({f.emergency_contacts?.primary_relationship}) - {f.emergency_contacts?.primary_phone}</div>
        <div>PCP: {f.emergency_contacts?.pcp_name || "-"} @ {f.emergency_contacts?.pcp_clinic}</div>
        <div>Insurance: {f.emergency_contacts?.insurance_company || "-"} #{f.emergency_contacts?.insurance_policy}</div>
        <div>Allergies: {f.emergency_contacts?.allergies || "-"}</div>
      </Section>
      <Section title="8. Power of attorney / guardianship">
        <div>{f.power_of_attorney?.has_poa ? `${f.power_of_attorney?.poa_type} - ${f.power_of_attorney?.agent_name || "agent TBD"}` : "None on file"}</div>
      </Section>
      <Section title="9. House rules acknowledgment" ok={f.house_rules?.acknowledged} />
    </div>
  );
}

function NewAdmissionDialog({ onCreated }: { onCreated: () => void }) {
  const [resident_id, setResidentId] = useState("");
  const [referral_source, setReferral] = useState("");
  const [presenting_problem, setPresenting] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "completed">("pending");
  const [intake, setIntake] = useState<AdmissionIntakeForm>(emptyAdmissionIntake);

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => (await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name")).data ?? [],
  });

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admissions").insert({
        resident_id,
        referral_source: referral_source || null,
        presenting_problem: presenting_problem || null,
        status,
        intake_form: intake as unknown as never,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Intake recorded"); onCreated(); },
    onError: (e) => toast.error("Could not save", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader><DialogTitle>New admission intake</DialogTitle></DialogHeader>
      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Resident</Label>
              <Select value={resident_id} onValueChange={setResidentId}>
                <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                <SelectContent>
                  {(residents ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name} - {r.mrn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Referral source</Label>
              <Input value={referral_source} onChange={(e) => setReferral(e.target.value)} placeholder="e.g. Banner Health" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Presenting problem</Label>
              <Textarea value={presenting_problem} onChange={(e) => setPresenting(e.target.value)} rows={2} />
            </div>
          </div>
          <AdmissionIntakeFormFields value={intake} onChange={setIntake} />
        </div>
      </ScrollArea>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !resident_id}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save intake
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
