import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export type AdmissionIntakeForm = {
  general_consent: {
    acknowledged: boolean;
    resident_signature: string;
    resident_signed_date: string;
    bht_name: string;
    bht_signature: string;
    bht_signed_date: string;
  };
  rights_acknowledgment: {
    acknowledged: boolean;
    resident_signature: string;
    witness_signature: string;
    signed_date: string;
  };
  release_of_information: {
    info_all_records: boolean;
    info_treatment_plans: boolean;
    info_progress_notes: boolean;
    info_medication_records: boolean;
    info_discharge_summaries: boolean;
    info_psych_assessments: boolean;
    info_psychiatric_evals: boolean;
    info_billing: boolean;
    info_hiv: boolean;
    info_sud_42cfr: boolean;
    info_mental_health: boolean;
    info_std: boolean;
    info_genetic: boolean;
    info_other: string;
    purpose_coordination: boolean;
    purpose_case_mgmt: boolean;
    purpose_billing: boolean;
    purpose_family: boolean;
    purpose_legal: boolean;
    purpose_continuing_care: boolean;
    purpose_other: string;
    disclose_to: string;
    duration: "one_year" | "duration_of_treatment" | "specific_date" | "other";
    duration_specific_date: string;
    duration_other: string;
    signed_date: string;
  };
  medication_consent: {
    medication_name: string;
    diagnosis_target_symptoms: string;
    purpose: string;
    benefits: string;
    risks_side_effects: string;
    alternatives_discussed: string;
    prescribing_clinician: string;
    signed_date: string;
  };
  treatment_consent: {
    acknowledged: boolean;
    signed_date: string;
  };
  policies_acknowledgment: {
    acknowledged: boolean;
    signed_date: string;
  };
  emergency_contacts: {
    primary_name: string;
    primary_relationship: string;
    primary_phone: string;
    primary_address: string;
    secondary_name: string;
    secondary_relationship: string;
    secondary_phone: string;
    pcp_name: string;
    pcp_clinic: string;
    pcp_phone: string;
    insurance_company: string;
    insurance_policy: string;
    insurance_group: string;
    insurance_phone: string;
    allergies: string;
    medical_conditions: string;
  };
  power_of_attorney: {
    has_poa: boolean;
    poa_type:
      | "none"
      | "healthcare_poa"
      | "general_durable_poa"
      | "court_guardianship_person"
      | "court_conservatorship_estate"
      | "parental_poa_minor"
      | "other";
    agent_name: string;
    date_issued: string;
    court_case_number: string;
    effective_from: string;
    effective_to: string;
    notes: string;
  };
  house_rules: {
    acknowledged: boolean;
    signed_date: string;
  };
};

export const emptyAdmissionIntake: AdmissionIntakeForm = {
  general_consent: { acknowledged: false, resident_signature: "", resident_signed_date: "", bht_name: "", bht_signature: "", bht_signed_date: "" },
  rights_acknowledgment: { acknowledged: false, resident_signature: "", witness_signature: "", signed_date: "" },
  release_of_information: {
    info_all_records: false, info_treatment_plans: false, info_progress_notes: false, info_medication_records: false,
    info_discharge_summaries: false, info_psych_assessments: false, info_psychiatric_evals: false, info_billing: false,
    info_hiv: false, info_sud_42cfr: false, info_mental_health: false, info_std: false, info_genetic: false, info_other: "",
    purpose_coordination: false, purpose_case_mgmt: false, purpose_billing: false, purpose_family: false,
    purpose_legal: false, purpose_continuing_care: false, purpose_other: "",
    disclose_to: "", duration: "duration_of_treatment", duration_specific_date: "", duration_other: "", signed_date: "",
  },
  medication_consent: { medication_name: "", diagnosis_target_symptoms: "", purpose: "", benefits: "", risks_side_effects: "", alternatives_discussed: "", prescribing_clinician: "", signed_date: "" },
  treatment_consent: { acknowledged: false, signed_date: "" },
  policies_acknowledgment: { acknowledged: false, signed_date: "" },
  emergency_contacts: {
    primary_name: "", primary_relationship: "", primary_phone: "", primary_address: "",
    secondary_name: "", secondary_relationship: "", secondary_phone: "",
    pcp_name: "", pcp_clinic: "", pcp_phone: "",
    insurance_company: "", insurance_policy: "", insurance_group: "", insurance_phone: "",
    allergies: "", medical_conditions: "",
  },
  power_of_attorney: { has_poa: false, poa_type: "none", agent_name: "", date_issued: "", court_case_number: "", effective_from: "", effective_to: "", notes: "" },
  house_rules: { acknowledged: false, signed_date: "" },
};

type Props = {
  value: AdmissionIntakeForm;
  onChange: (v: AdmissionIntakeForm) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Check({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2 text-sm leading-snug cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

export function AdmissionIntakeFormFields({ value, onChange }: Props) {
  const [tab, setTab] = useState("consent");
  const set = <K extends keyof AdmissionIntakeForm>(k: K, patch: Partial<AdmissionIntakeForm[K]>) =>
    onChange({ ...value, [k]: { ...value[k], ...patch } });

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="consent">Consent</TabsTrigger>
        <TabsTrigger value="rights">Rights</TabsTrigger>
        <TabsTrigger value="roi">ROI</TabsTrigger>
        <TabsTrigger value="meds">Meds</TabsTrigger>
        <TabsTrigger value="treatment">Treatment</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="poa">POA</TabsTrigger>
      </TabsList>

      <TabsContent value="consent" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">General consent to receive behavioral health residential services from Lamar Residential Home.</p>
        <Check label="Resident acknowledges and agrees to general consent for services" checked={value.general_consent.acknowledged} onCheckedChange={(v) => set("general_consent", { acknowledged: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Resident signature (typed)"><Input value={value.general_consent.resident_signature} onChange={(e) => set("general_consent", { resident_signature: e.target.value })} /></Field>
          <Field label="Date signed"><Input type="date" value={value.general_consent.resident_signed_date} onChange={(e) => set("general_consent", { resident_signed_date: e.target.value })} /></Field>
          <Field label="BHT name"><Input value={value.general_consent.bht_name} onChange={(e) => set("general_consent", { bht_name: e.target.value })} /></Field>
          <Field label="BHT signature"><Input value={value.general_consent.bht_signature} onChange={(e) => set("general_consent", { bht_signature: e.target.value })} /></Field>
          <Field label="BHT date"><Input type="date" value={value.general_consent.bht_signed_date} onChange={(e) => set("general_consent", { bht_signed_date: e.target.value })} /></Field>
        </div>
      </TabsContent>

      <TabsContent value="rights" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">Resident Rights Acknowledgment — dignity, privacy, participation in care, freedom from abuse, access to records, grievance.</p>
        <Check label="Resident received, read, and understands the Statement of Resident Rights" checked={value.rights_acknowledgment.acknowledged} onCheckedChange={(v) => set("rights_acknowledgment", { acknowledged: v })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Resident signature"><Input value={value.rights_acknowledgment.resident_signature} onChange={(e) => set("rights_acknowledgment", { resident_signature: e.target.value })} /></Field>
          <Field label="Witness signature"><Input value={value.rights_acknowledgment.witness_signature} onChange={(e) => set("rights_acknowledgment", { witness_signature: e.target.value })} /></Field>
          <Field label="Date signed"><Input type="date" value={value.rights_acknowledgment.signed_date} onChange={(e) => set("rights_acknowledgment", { signed_date: e.target.value })} /></Field>
        </div>
      </TabsContent>

      <TabsContent value="roi" className="mt-4 space-y-4">
        <p className="text-sm font-medium">Information to be released</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Check label="All medical & behavioral health records" checked={value.release_of_information.info_all_records} onCheckedChange={(v) => set("release_of_information", { info_all_records: v })} />
          <Check label="Treatment plan summaries" checked={value.release_of_information.info_treatment_plans} onCheckedChange={(v) => set("release_of_information", { info_treatment_plans: v })} />
          <Check label="Progress notes" checked={value.release_of_information.info_progress_notes} onCheckedChange={(v) => set("release_of_information", { info_progress_notes: v })} />
          <Check label="Medication records" checked={value.release_of_information.info_medication_records} onCheckedChange={(v) => set("release_of_information", { info_medication_records: v })} />
          <Check label="Discharge summaries" checked={value.release_of_information.info_discharge_summaries} onCheckedChange={(v) => set("release_of_information", { info_discharge_summaries: v })} />
          <Check label="Psychological assessments" checked={value.release_of_information.info_psych_assessments} onCheckedChange={(v) => set("release_of_information", { info_psych_assessments: v })} />
          <Check label="Psychiatric evaluations" checked={value.release_of_information.info_psychiatric_evals} onCheckedChange={(v) => set("release_of_information", { info_psychiatric_evals: v })} />
          <Check label="Billing & payment information" checked={value.release_of_information.info_billing} onCheckedChange={(v) => set("release_of_information", { info_billing: v })} />
          <Check label="HIV/AIDS information" checked={value.release_of_information.info_hiv} onCheckedChange={(v) => set("release_of_information", { info_hiv: v })} />
          <Check label="Substance use (42 CFR Part 2)" checked={value.release_of_information.info_sud_42cfr} onCheckedChange={(v) => set("release_of_information", { info_sud_42cfr: v })} />
          <Check label="Mental health (highly confidential)" checked={value.release_of_information.info_mental_health} onCheckedChange={(v) => set("release_of_information", { info_mental_health: v })} />
          <Check label="STDs" checked={value.release_of_information.info_std} onCheckedChange={(v) => set("release_of_information", { info_std: v })} />
          <Check label="Genetic information" checked={value.release_of_information.info_genetic} onCheckedChange={(v) => set("release_of_information", { info_genetic: v })} />
        </div>
        <Field label="Other information to release"><Input value={value.release_of_information.info_other} onChange={(e) => set("release_of_information", { info_other: e.target.value })} /></Field>

        <Separator />
        <p className="text-sm font-medium">Purpose of disclosure</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Check label="Coordination of care/treatment" checked={value.release_of_information.purpose_coordination} onCheckedChange={(v) => set("release_of_information", { purpose_coordination: v })} />
          <Check label="Case management" checked={value.release_of_information.purpose_case_mgmt} onCheckedChange={(v) => set("release_of_information", { purpose_case_mgmt: v })} />
          <Check label="Insurance/billing" checked={value.release_of_information.purpose_billing} onCheckedChange={(v) => set("release_of_information", { purpose_billing: v })} />
          <Check label="Family communication/support" checked={value.release_of_information.purpose_family} onCheckedChange={(v) => set("release_of_information", { purpose_family: v })} />
          <Check label="Legal proceedings" checked={value.release_of_information.purpose_legal} onCheckedChange={(v) => set("release_of_information", { purpose_legal: v })} />
          <Check label="Continuing care planning" checked={value.release_of_information.purpose_continuing_care} onCheckedChange={(v) => set("release_of_information", { purpose_continuing_care: v })} />
        </div>
        <Field label="Other purpose"><Input value={value.release_of_information.purpose_other} onChange={(e) => set("release_of_information", { purpose_other: e.target.value })} /></Field>

        <Separator />
        <Field label="Person(s) or entity(ies) to whom information may be disclosed">
          <Textarea rows={2} value={value.release_of_information.disclose_to} onChange={(e) => set("release_of_information", { disclose_to: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Duration">
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value.release_of_information.duration} onChange={(e) => set("release_of_information", { duration: e.target.value as AdmissionIntakeForm["release_of_information"]["duration"] })}>
              <option value="one_year">One year from date signed</option>
              <option value="duration_of_treatment">Duration of treatment</option>
              <option value="specific_date">Until specific date</option>
              <option value="other">Other</option>
            </select>
          </Field>
          {value.release_of_information.duration === "specific_date" && (
            <Field label="Specific end date"><Input type="date" value={value.release_of_information.duration_specific_date} onChange={(e) => set("release_of_information", { duration_specific_date: e.target.value })} /></Field>
          )}
          {value.release_of_information.duration === "other" && (
            <Field label="Other duration"><Input value={value.release_of_information.duration_other} onChange={(e) => set("release_of_information", { duration_other: e.target.value })} /></Field>
          )}
          <Field label="Date signed"><Input type="date" value={value.release_of_information.signed_date} onChange={(e) => set("release_of_information", { signed_date: e.target.value })} /></Field>
        </div>
      </TabsContent>

      <TabsContent value="meds" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">Informed consent for psychotropic medication treatment.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Medication name"><Input value={value.medication_consent.medication_name} onChange={(e) => set("medication_consent", { medication_name: e.target.value })} /></Field>
          <Field label="Prescribing clinician"><Input value={value.medication_consent.prescribing_clinician} onChange={(e) => set("medication_consent", { prescribing_clinician: e.target.value })} /></Field>
        </div>
        <Field label="Diagnosis / target symptoms"><Textarea rows={2} value={value.medication_consent.diagnosis_target_symptoms} onChange={(e) => set("medication_consent", { diagnosis_target_symptoms: e.target.value })} /></Field>
        <Field label="Purpose of medication"><Textarea rows={2} value={value.medication_consent.purpose} onChange={(e) => set("medication_consent", { purpose: e.target.value })} /></Field>
        <Field label="Potential benefits"><Textarea rows={2} value={value.medication_consent.benefits} onChange={(e) => set("medication_consent", { benefits: e.target.value })} /></Field>
        <Field label="Risks & side effects"><Textarea rows={2} value={value.medication_consent.risks_side_effects} onChange={(e) => set("medication_consent", { risks_side_effects: e.target.value })} /></Field>
        <Field label="Alternatives discussed"><Textarea rows={2} value={value.medication_consent.alternatives_discussed} onChange={(e) => set("medication_consent", { alternatives_discussed: e.target.value })} /></Field>
        <Field label="Date signed"><Input type="date" value={value.medication_consent.signed_date} onChange={(e) => set("medication_consent", { signed_date: e.target.value })} /></Field>
      </TabsContent>

      <TabsContent value="treatment" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Consent to fully participate in the intensive, time-limited treatment program.</p>
        <Check label="Resident agrees to participate in treatment" checked={value.treatment_consent.acknowledged} onCheckedChange={(v) => set("treatment_consent", { acknowledged: v })} />
        <Field label="Date signed"><Input type="date" value={value.treatment_consent.signed_date} onChange={(e) => set("treatment_consent", { signed_date: e.target.value })} /></Field>
      </TabsContent>

      <TabsContent value="policies" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Acknowledgment of receipt and understanding of facility policies, procedures, and house rules.</p>
        <Check label="Policies & procedures reviewed and understood" checked={value.policies_acknowledgment.acknowledged} onCheckedChange={(v) => set("policies_acknowledgment", { acknowledged: v })} />
        <Check label="House rules acknowledged" checked={value.house_rules.acknowledged} onCheckedChange={(v) => set("house_rules", { acknowledged: v, signed_date: value.house_rules.signed_date })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Policies date signed"><Input type="date" value={value.policies_acknowledgment.signed_date} onChange={(e) => set("policies_acknowledgment", { signed_date: e.target.value })} /></Field>
          <Field label="House rules date signed"><Input type="date" value={value.house_rules.signed_date} onChange={(e) => set("house_rules", { signed_date: e.target.value })} /></Field>
        </div>
      </TabsContent>

      <TabsContent value="contacts" className="mt-4 space-y-4">
        <p className="text-sm font-medium">Primary emergency contact</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input value={value.emergency_contacts.primary_name} onChange={(e) => set("emergency_contacts", { primary_name: e.target.value })} /></Field>
          <Field label="Relationship"><Input value={value.emergency_contacts.primary_relationship} onChange={(e) => set("emergency_contacts", { primary_relationship: e.target.value })} /></Field>
          <Field label="Phone"><Input value={value.emergency_contacts.primary_phone} onChange={(e) => set("emergency_contacts", { primary_phone: e.target.value })} /></Field>
          <Field label="Address"><Input value={value.emergency_contacts.primary_address} onChange={(e) => set("emergency_contacts", { primary_address: e.target.value })} /></Field>
        </div>
        <Separator />
        <p className="text-sm font-medium">Secondary contact</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name"><Input value={value.emergency_contacts.secondary_name} onChange={(e) => set("emergency_contacts", { secondary_name: e.target.value })} /></Field>
          <Field label="Relationship"><Input value={value.emergency_contacts.secondary_relationship} onChange={(e) => set("emergency_contacts", { secondary_relationship: e.target.value })} /></Field>
          <Field label="Phone"><Input value={value.emergency_contacts.secondary_phone} onChange={(e) => set("emergency_contacts", { secondary_phone: e.target.value })} /></Field>
        </div>
        <Separator />
        <p className="text-sm font-medium">Primary care provider</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="PCP name"><Input value={value.emergency_contacts.pcp_name} onChange={(e) => set("emergency_contacts", { pcp_name: e.target.value })} /></Field>
          <Field label="Clinic / practice"><Input value={value.emergency_contacts.pcp_clinic} onChange={(e) => set("emergency_contacts", { pcp_clinic: e.target.value })} /></Field>
          <Field label="Phone"><Input value={value.emergency_contacts.pcp_phone} onChange={(e) => set("emergency_contacts", { pcp_phone: e.target.value })} /></Field>
        </div>
        <Separator />
        <p className="text-sm font-medium">Insurance (primary)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company"><Input value={value.emergency_contacts.insurance_company} onChange={(e) => set("emergency_contacts", { insurance_company: e.target.value })} /></Field>
          <Field label="Policy number"><Input value={value.emergency_contacts.insurance_policy} onChange={(e) => set("emergency_contacts", { insurance_policy: e.target.value })} /></Field>
          <Field label="Group number"><Input value={value.emergency_contacts.insurance_group} onChange={(e) => set("emergency_contacts", { insurance_group: e.target.value })} /></Field>
          <Field label="Customer service phone"><Input value={value.emergency_contacts.insurance_phone} onChange={(e) => set("emergency_contacts", { insurance_phone: e.target.value })} /></Field>
        </div>
        <Field label="Known allergies"><Textarea rows={2} value={value.emergency_contacts.allergies} onChange={(e) => set("emergency_contacts", { allergies: e.target.value })} /></Field>
        <Field label="Significant medical conditions"><Textarea rows={2} value={value.emergency_contacts.medical_conditions} onChange={(e) => set("emergency_contacts", { medical_conditions: e.target.value })} /></Field>
      </TabsContent>

      <TabsContent value="poa" className="mt-4 space-y-4">
        <Check label="Resident has Power of Attorney or guardianship documentation on file" checked={value.power_of_attorney.has_poa} onCheckedChange={(v) => set("power_of_attorney", { has_poa: v })} />
        {value.power_of_attorney.has_poa && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value.power_of_attorney.poa_type} onChange={(e) => set("power_of_attorney", { poa_type: e.target.value as AdmissionIntakeForm["power_of_attorney"]["poa_type"] })}>
                <option value="none">—</option>
                <option value="healthcare_poa">Healthcare POA</option>
                <option value="general_durable_poa">General durable POA</option>
                <option value="court_guardianship_person">Court guardianship of person</option>
                <option value="court_conservatorship_estate">Court conservatorship / estate</option>
                <option value="parental_poa_minor">Parental POA for minor</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Agent / guardian name"><Input value={value.power_of_attorney.agent_name} onChange={(e) => set("power_of_attorney", { agent_name: e.target.value })} /></Field>
            <Field label="Date issued"><Input type="date" value={value.power_of_attorney.date_issued} onChange={(e) => set("power_of_attorney", { date_issued: e.target.value })} /></Field>
            <Field label="Court case #"><Input value={value.power_of_attorney.court_case_number} onChange={(e) => set("power_of_attorney", { court_case_number: e.target.value })} /></Field>
            <Field label="Effective from"><Input type="date" value={value.power_of_attorney.effective_from} onChange={(e) => set("power_of_attorney", { effective_from: e.target.value })} /></Field>
            <Field label="Effective to"><Input type="date" value={value.power_of_attorney.effective_to} onChange={(e) => set("power_of_attorney", { effective_to: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={2} value={value.power_of_attorney.notes} onChange={(e) => set("power_of_attorney", { notes: e.target.value })} /></Field></div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
