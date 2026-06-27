import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export type SubstanceUseRow = {
  drug: string;
  age_first_used: string;
  quantity: string;
  method: string;
  type_of_alcohol: string;
  last_used: string;
};

export type IntakeAssessmentData = {
  demographics: {
    ahcccs_number: string;
    gender: "male" | "female" | "other" | "";
    ethnicity: string;
    native_american_tribe: string;
    highest_education: string;
    treatment_on_reservation: "yes" | "no" | "";
    has_case_manager: boolean;
    case_manager_name: string;
    case_manager_email: string;
    case_manager_phone: string;
  };
  presenting_problem: string;
  family_of_origin: {
    where_grew_up: string;
    raised_by: string;
    past_relationship_quality: string;
    current_relationship_quality: string;
    age_left_home: string;
  };
  relationships: {
    current_status: string;
    current_type: string;
    duration: string;
    past_relationships: string;
    strained_relationships: string;
    children: string;
    dcs_involvement: string;
  };
  cultural_spiritual: {
    cultural_values: string;
    believes_higher_power: "yes" | "no" | "";
    religious_identity: string;
    spiritual: "yes" | "no" | "";
  };
  behavioral_health_history: {
    diagnoses: {
      anxiety: boolean; depression: boolean; bipolar: boolean; ptsd: boolean;
      schizophrenia: boolean; adhd: boolean; other: string;
    };
    diagnosis_dates: string;
    prescribed_medications: string;
    hallucinations: string;
    delusions: string;
    psychiatric_hospitalizations: string;
  };
  risk_assessment: {
    suicidal_ideation_history: string;
    self_harm_history: string;
    homicidal_ideation_history: string;
    safety_plan_completed: boolean;
  };
  trauma_history: {
    abuse_history: string;
    witnessed_violence: string;
  };
  treatment_history: {
    previous_therapy: string;
    effectiveness: string;
  };
  substance_use: SubstanceUseRow[];
  legal_history: {
    arrests_charges: string;
    incarceration: string;
  };
  support_system: string;
  living_arrangements: string;
  family_bh_history: string;
  medical_history: {
    chronic_conditions: string;
    prescribed_medications: string;
    allergies: string;
    hospitalizations: string;
  };
  mental_status_exam: {
    appearance: string;
    attitude: string;
    behavior: string;
    mood: string;
    affect: string;
    speech: string;
    thought_process: string;
    thought_content: string;
    perception: string;
    orientation: string;
    memory_concentration: string;
    insight_judgement: string;
    other_observations: string;
  };
  symptoms: Record<string, boolean>;
  strengths: string[];
  goals: string[];
  additional_info: string;
  asam_score: string;
  staff_name: string;
  staff_signature: string;
  staff_date: string;
  bhp_name: string;
  bhp_signature: string;
  bhp_date: string;
};

const DRUGS = [
  "Alcohol — Liquor (vodka, whiskey, etc.)",
  "Alcohol — Beer",
  "Methamphetamines",
  "Cannabis / Marijuana Flower",
  "Cannabis / Marijuana Vape",
  "Cocaine",
  "Fentanyl / Blues",
  "Cigarettes",
  "Tobacco Vape",
  "Heroin",
  "Opioids — pain pills",
];

export const SYMPTOMS = [
  "Depressed mood", "Easily startled", "Sleep pattern disturbance",
  "Loss of interest in activities", "Difficulty concentrating", "Forgetfulness",
  "Guilt", "Fatigue", "Racing thoughts",
  "Shame", "Decreased need for sleep", "Increased need for sleep",
  "Risky behavior", "Impulsiveness", "Increased irritability",
  "Crying spells", "Excessive energy", "Lack of energy",
  "Anxiety attacks", "Panic attacks", "Avoidance", "Excessive worry",
  "Auditory hallucinations", "Visual hallucinations", "Suspiciousness / paranoia",
  "Easily agitated", "Lack of motivation", "Restlessness",
  "Nightmares", "Vivid dreams", "Isolation", "Anger outbursts", "Hypervigilance",
];

export const emptyIntakeAssessment: IntakeAssessmentData = {
  demographics: { ahcccs_number: "", gender: "", ethnicity: "", native_american_tribe: "", highest_education: "", treatment_on_reservation: "", has_case_manager: false, case_manager_name: "", case_manager_email: "", case_manager_phone: "" },
  presenting_problem: "",
  family_of_origin: { where_grew_up: "", raised_by: "", past_relationship_quality: "", current_relationship_quality: "", age_left_home: "" },
  relationships: { current_status: "", current_type: "", duration: "", past_relationships: "", strained_relationships: "", children: "", dcs_involvement: "" },
  cultural_spiritual: { cultural_values: "", believes_higher_power: "", religious_identity: "", spiritual: "" },
  behavioral_health_history: { diagnoses: { anxiety: false, depression: false, bipolar: false, ptsd: false, schizophrenia: false, adhd: false, other: "" }, diagnosis_dates: "", prescribed_medications: "", hallucinations: "", delusions: "", psychiatric_hospitalizations: "" },
  risk_assessment: { suicidal_ideation_history: "", self_harm_history: "", homicidal_ideation_history: "", safety_plan_completed: false },
  trauma_history: { abuse_history: "", witnessed_violence: "" },
  treatment_history: { previous_therapy: "", effectiveness: "" },
  substance_use: DRUGS.map((d) => ({ drug: d, age_first_used: "", quantity: "", method: "", type_of_alcohol: "", last_used: "" })),
  legal_history: { arrests_charges: "", incarceration: "" },
  support_system: "",
  living_arrangements: "",
  family_bh_history: "",
  medical_history: { chronic_conditions: "", prescribed_medications: "", allergies: "", hospitalizations: "" },
  mental_status_exam: { appearance: "", attitude: "", behavior: "", mood: "", affect: "", speech: "", thought_process: "", thought_content: "", perception: "", orientation: "", memory_concentration: "", insight_judgement: "", other_observations: "" },
  symptoms: {},
  strengths: ["", "", ""],
  goals: ["", "", ""],
  additional_info: "",
  asam_score: "",
  staff_name: "", staff_signature: "", staff_date: "",
  bhp_name: "", bhp_signature: "", bhp_date: "",
};

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function IntakeAssessmentFormFields({ value, onChange }: { value: IntakeAssessmentData; onChange: (v: IntakeAssessmentData) => void }) {
  const [tab, setTab] = useState("demo");
  const set = <K extends keyof IntakeAssessmentData>(k: K, patch: Partial<IntakeAssessmentData[K]>) =>
    onChange({ ...value, [k]: typeof value[k] === "object" && !Array.isArray(value[k]) ? { ...(value[k] as object), ...(patch as object) } as IntakeAssessmentData[K] : patch as IntakeAssessmentData[K] });

  const updateSubstance = (i: number, patch: Partial<SubstanceUseRow>) => {
    const next = [...value.substance_use];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, substance_use: next });
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="demo">Demo</TabsTrigger>
        <TabsTrigger value="family">Family</TabsTrigger>
        <TabsTrigger value="bh">BH Hx</TabsTrigger>
        <TabsTrigger value="risk">Risk</TabsTrigger>
        <TabsTrigger value="sud">Substance</TabsTrigger>
        <TabsTrigger value="med">Medical</TabsTrigger>
        <TabsTrigger value="mse">MSE</TabsTrigger>
        <TabsTrigger value="goals">Goals</TabsTrigger>
      </TabsList>

      <TabsContent value="demo" className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="AHCCCS #"><Input value={value.demographics.ahcccs_number} onChange={(e) => set("demographics", { ahcccs_number: e.target.value })} /></F>
          <F label="Gender">
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value.demographics.gender} onChange={(e) => set("demographics", { gender: e.target.value as IntakeAssessmentData["demographics"]["gender"] })}>
              <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </F>
          <F label="Ethnicity"><Input value={value.demographics.ethnicity} onChange={(e) => set("demographics", { ethnicity: e.target.value })} /></F>
          <F label="Native American tribe (if applicable)"><Input value={value.demographics.native_american_tribe} onChange={(e) => set("demographics", { native_american_tribe: e.target.value })} /></F>
          <F label="Highest level of education"><Input value={value.demographics.highest_education} onChange={(e) => set("demographics", { highest_education: e.target.value })} /></F>
          <F label="Treatment on reservation?">
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value.demographics.treatment_on_reservation} onChange={(e) => set("demographics", { treatment_on_reservation: e.target.value as IntakeAssessmentData["demographics"]["treatment_on_reservation"] })}>
              <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </F>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.demographics.has_case_manager} onCheckedChange={(v) => set("demographics", { has_case_manager: !!v })} />
          Has a case manager
        </label>
        {value.demographics.has_case_manager && (
          <div className="grid gap-3 sm:grid-cols-3">
            <F label="Case manager name"><Input value={value.demographics.case_manager_name} onChange={(e) => set("demographics", { case_manager_name: e.target.value })} /></F>
            <F label="Email"><Input value={value.demographics.case_manager_email} onChange={(e) => set("demographics", { case_manager_email: e.target.value })} /></F>
            <F label="Phone"><Input value={value.demographics.case_manager_phone} onChange={(e) => set("demographics", { case_manager_phone: e.target.value })} /></F>
          </div>
        )}
        <Separator />
        <F label="Presenting problem"><Textarea rows={4} value={value.presenting_problem} onChange={(e) => onChange({ ...value, presenting_problem: e.target.value })} /></F>
      </TabsContent>

      <TabsContent value="family" className="mt-4 space-y-4">
        <p className="text-sm font-medium">Family of origin</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Where & with whom did you grow up?"><Textarea rows={2} value={value.family_of_origin.where_grew_up} onChange={(e) => set("family_of_origin", { where_grew_up: e.target.value })} /></F>
          <F label="Who raised you?"><Input value={value.family_of_origin.raised_by} onChange={(e) => set("family_of_origin", { raised_by: e.target.value })} /></F>
          <F label="What was the relationship like?"><Textarea rows={2} value={value.family_of_origin.past_relationship_quality} onChange={(e) => set("family_of_origin", { past_relationship_quality: e.target.value })} /></F>
          <F label="How is it now?"><Textarea rows={2} value={value.family_of_origin.current_relationship_quality} onChange={(e) => set("family_of_origin", { current_relationship_quality: e.target.value })} /></F>
          <F label="Age left home"><Input value={value.family_of_origin.age_left_home} onChange={(e) => set("family_of_origin", { age_left_home: e.target.value })} /></F>
        </div>
        <Separator />
        <p className="text-sm font-medium">Relationships</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Current status"><Input value={value.relationships.current_status} onChange={(e) => set("relationships", { current_status: e.target.value })} /></F>
          <F label="Type"><Input value={value.relationships.current_type} onChange={(e) => set("relationships", { current_type: e.target.value })} /></F>
          <F label="Duration"><Input value={value.relationships.duration} onChange={(e) => set("relationships", { duration: e.target.value })} /></F>
          <F label="Past marriage / relationship (when ended)"><Input value={value.relationships.past_relationships} onChange={(e) => set("relationships", { past_relationships: e.target.value })} /></F>
          <F label="Strained relationships"><Input value={value.relationships.strained_relationships} onChange={(e) => set("relationships", { strained_relationships: e.target.value })} /></F>
          <F label="Children (ages, gender, custody)"><Textarea rows={2} value={value.relationships.children} onChange={(e) => set("relationships", { children: e.target.value })} /></F>
          <F label="DCS involvement"><Input value={value.relationships.dcs_involvement} onChange={(e) => set("relationships", { dcs_involvement: e.target.value })} /></F>
        </div>
        <Separator />
        <p className="text-sm font-medium">Cultural / spiritual worldview</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Cultural values"><Textarea rows={2} value={value.cultural_spiritual.cultural_values} onChange={(e) => set("cultural_spiritual", { cultural_values: e.target.value })} /></F>
          <F label="Believes in God / higher power">
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value.cultural_spiritual.believes_higher_power} onChange={(e) => set("cultural_spiritual", { believes_higher_power: e.target.value as "yes" | "no" | "" })}>
              <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </F>
          <F label="Religious identity"><Input value={value.cultural_spiritual.religious_identity} onChange={(e) => set("cultural_spiritual", { religious_identity: e.target.value })} /></F>
          <F label="Spiritual">
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value.cultural_spiritual.spiritual} onChange={(e) => set("cultural_spiritual", { spiritual: e.target.value as "yes" | "no" | "" })}>
              <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </F>
        </div>
        <Separator />
        <p className="text-sm font-medium">Support, living, legal, family BH</p>
        <F label="Support system (family, friends, church, etc.)"><Textarea rows={2} value={value.support_system} onChange={(e) => onChange({ ...value, support_system: e.target.value })} /></F>
        <F label="Living arrangements (homeless? how long?)"><Textarea rows={2} value={value.living_arrangements} onChange={(e) => onChange({ ...value, living_arrangements: e.target.value })} /></F>
        <F label="Family behavioral health history"><Textarea rows={2} value={value.family_bh_history} onChange={(e) => onChange({ ...value, family_bh_history: e.target.value })} /></F>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Arrests / charges"><Textarea rows={2} value={value.legal_history.arrests_charges} onChange={(e) => set("legal_history", { arrests_charges: e.target.value })} /></F>
          <F label="Incarceration"><Textarea rows={2} value={value.legal_history.incarceration} onChange={(e) => set("legal_history", { incarceration: e.target.value })} /></F>
        </div>
      </TabsContent>

      <TabsContent value="bh" className="mt-4 space-y-4">
        <p className="text-sm font-medium">Diagnoses</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["anxiety", "depression", "bipolar", "ptsd", "schizophrenia", "adhd"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm capitalize">
              <Checkbox checked={value.behavioral_health_history.diagnoses[k]} onCheckedChange={(v) => set("behavioral_health_history", { diagnoses: { ...value.behavioral_health_history.diagnoses, [k]: !!v } })} />
              {k === "ptsd" ? "PTSD" : k === "adhd" ? "ADHD" : k}
            </label>
          ))}
        </div>
        <F label="Other diagnoses"><Input value={value.behavioral_health_history.diagnoses.other} onChange={(e) => set("behavioral_health_history", { diagnoses: { ...value.behavioral_health_history.diagnoses, other: e.target.value } })} /></F>
        <F label="Diagnosis dates / context"><Textarea rows={2} value={value.behavioral_health_history.diagnosis_dates} onChange={(e) => set("behavioral_health_history", { diagnosis_dates: e.target.value })} /></F>
        <F label="Prescribed medications (past or present)"><Textarea rows={2} value={value.behavioral_health_history.prescribed_medications} onChange={(e) => set("behavioral_health_history", { prescribed_medications: e.target.value })} /></F>
        <F label="Hallucinations (type, frequency)"><Textarea rows={2} value={value.behavioral_health_history.hallucinations} onChange={(e) => set("behavioral_health_history", { hallucinations: e.target.value })} /></F>
        <F label="Delusions (description, duration)"><Textarea rows={2} value={value.behavioral_health_history.delusions} onChange={(e) => set("behavioral_health_history", { delusions: e.target.value })} /></F>
        <F label="Psychiatric hospitalizations (when & why)"><Textarea rows={2} value={value.behavioral_health_history.psychiatric_hospitalizations} onChange={(e) => set("behavioral_health_history", { psychiatric_hospitalizations: e.target.value })} /></F>
        <Separator />
        <p className="text-sm font-medium">Treatment history</p>
        <F label="Previous therapy (individual / group, when, how long)"><Textarea rows={2} value={value.treatment_history.previous_therapy} onChange={(e) => set("treatment_history", { previous_therapy: e.target.value })} /></F>
        <F label="Did it work? Why or why not?"><Textarea rows={2} value={value.treatment_history.effectiveness} onChange={(e) => set("treatment_history", { effectiveness: e.target.value })} /></F>
      </TabsContent>

      <TabsContent value="risk" className="mt-4 space-y-4">
        <F label="Suicidal ideation / attempts history (age, last time)"><Textarea rows={2} value={value.risk_assessment.suicidal_ideation_history} onChange={(e) => set("risk_assessment", { suicidal_ideation_history: e.target.value })} /></F>
        <F label="Self-harm history (cutting, overdose, hospitalizations, ages)"><Textarea rows={2} value={value.risk_assessment.self_harm_history} onChange={(e) => set("risk_assessment", { self_harm_history: e.target.value })} /></F>
        <F label="Homicidal ideation history (plan, intent, date)"><Textarea rows={2} value={value.risk_assessment.homicidal_ideation_history} onChange={(e) => set("risk_assessment", { homicidal_ideation_history: e.target.value })} /></F>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.risk_assessment.safety_plan_completed} onCheckedChange={(v) => set("risk_assessment", { safety_plan_completed: !!v })} />
          Safety plan completed (required if self-harm or suicide attempt within the last year)
        </label>
        <Separator />
        <p className="text-sm font-medium">History of traumatic events</p>
        <F label="Physical / sexual / emotional / verbal abuse, and/or neglect"><Textarea rows={3} value={value.trauma_history.abuse_history} onChange={(e) => set("trauma_history", { abuse_history: e.target.value })} /></F>
        <F label="Witnessed violence (death, stabbing, shooting, accident, suicide, DV, etc.)"><Textarea rows={3} value={value.trauma_history.witnessed_violence} onChange={(e) => set("trauma_history", { witnessed_violence: e.target.value })} /></F>
      </TabsContent>

      <TabsContent value="sud" className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Substance use history — fill what applies. Leave blank for substances never used.</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">Drug of choice</th>
                <th className="p-2">Age first used</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Method</th>
                <th className="p-2">Type (alcohol)</th>
                <th className="p-2">Last used</th>
              </tr>
            </thead>
            <tbody>
              {value.substance_use.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{row.drug.startsWith("Other") ? <Input value={row.drug} onChange={(e) => updateSubstance(i, { drug: e.target.value })} /> : <span className="font-medium">{row.drug}</span>}</td>
                  <td className="p-2"><Input value={row.age_first_used} onChange={(e) => updateSubstance(i, { age_first_used: e.target.value })} /></td>
                  <td className="p-2"><Input value={row.quantity} onChange={(e) => updateSubstance(i, { quantity: e.target.value })} /></td>
                  <td className="p-2"><Input value={row.method} onChange={(e) => updateSubstance(i, { method: e.target.value })} placeholder="Smoke / Snort / IV" /></td>
                  <td className="p-2"><Input value={row.type_of_alcohol} onChange={(e) => updateSubstance(i, { type_of_alcohol: e.target.value })} /></td>
                  <td className="p-2"><Input value={row.last_used} onChange={(e) => updateSubstance(i, { last_used: e.target.value })} placeholder="Month Year" /></td>
                </tr>
              ))}
              {value.substance_use.slice(DRUGS.length).length === 0 && null}
            </tbody>
          </table>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, substance_use: [...value.substance_use, { drug: "Other: ", age_first_used: "", quantity: "", method: "", type_of_alcohol: "", last_used: "" }] })}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Add other substance
        </Button>
      </TabsContent>

      <TabsContent value="med" className="mt-4 space-y-3">
        <F label="Chronic conditions / serious health concerns"><Textarea rows={2} value={value.medical_history.chronic_conditions} onChange={(e) => set("medical_history", { chronic_conditions: e.target.value })} /></F>
        <F label="Prescribed medications (medical)"><Textarea rows={2} value={value.medical_history.prescribed_medications} onChange={(e) => set("medical_history", { prescribed_medications: e.target.value })} /></F>
        <F label="Allergies"><Textarea rows={2} value={value.medical_history.allergies} onChange={(e) => set("medical_history", { allergies: e.target.value })} /></F>
        <F label="Hospitalizations (alcohol poisoning, surgeries, etc.)"><Textarea rows={2} value={value.medical_history.hospitalizations} onChange={(e) => set("medical_history", { hospitalizations: e.target.value })} /></F>
      </TabsContent>

      <TabsContent value="mse" className="mt-4 space-y-3">
        <p className="text-sm font-medium">Mental Status Exam</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(value.mental_status_exam) as Array<keyof IntakeAssessmentData["mental_status_exam"]>).map((k) => (
            <F key={k} label={k.replaceAll("_", " ")}>
              <Input value={value.mental_status_exam[k]} onChange={(e) => set("mental_status_exam", { [k]: e.target.value } as Partial<IntakeAssessmentData["mental_status_exam"]>)} />
            </F>
          ))}
        </div>
        <Separator />
        <p className="text-sm font-medium">Symptom checklist</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SYMPTOMS.map((s) => (
            <label key={s} className="flex items-start gap-2 text-sm leading-snug">
              <Checkbox checked={!!value.symptoms[s]} onCheckedChange={(v) => onChange({ ...value, symptoms: { ...value.symptoms, [s]: !!v } })} className="mt-0.5" />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="goals" className="mt-4 space-y-4">
        <p className="text-sm font-medium">Strengths (at least 3)</p>
        {value.strengths.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input value={s} onChange={(e) => { const next = [...value.strengths]; next[i] = e.target.value; onChange({ ...value, strengths: next }); }} placeholder={`Strength ${i + 1}`} />
            {value.strengths.length > 3 && (
              <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...value, strengths: value.strengths.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, strengths: [...value.strengths, ""] })}><Plus className="mr-2 h-3.5 w-3.5" /> Add strength</Button>

        <Separator />
        <p className="text-sm font-medium">Goals (at least 3)</p>
        {value.goals.map((g, i) => (
          <div key={i} className="flex gap-2">
            <Input value={g} onChange={(e) => { const next = [...value.goals]; next[i] = e.target.value; onChange({ ...value, goals: next }); }} placeholder={`Goal ${i + 1}`} />
            {value.goals.length > 3 && (
              <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...value, goals: value.goals.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, goals: [...value.goals, ""] })}><Plus className="mr-2 h-3.5 w-3.5" /> Add goal</Button>

        <Separator />
        <F label="Anything else important we have not discussed?"><Textarea rows={3} value={value.additional_info} onChange={(e) => onChange({ ...value, additional_info: e.target.value })} /></F>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="ASAM score"><Input value={value.asam_score} onChange={(e) => onChange({ ...value, asam_score: e.target.value })} /></F>
        </div>
        <Separator />
        <p className="text-sm font-medium">Signatures</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <F label="Staff name"><Input value={value.staff_name} onChange={(e) => onChange({ ...value, staff_name: e.target.value })} /></F>
          <F label="Staff signature"><Input value={value.staff_signature} onChange={(e) => onChange({ ...value, staff_signature: e.target.value })} /></F>
          <F label="Staff date"><Input type="date" value={value.staff_date} onChange={(e) => onChange({ ...value, staff_date: e.target.value })} /></F>
          <F label="BHP name"><Input value={value.bhp_name} onChange={(e) => onChange({ ...value, bhp_name: e.target.value })} /></F>
          <F label="BHP signature"><Input value={value.bhp_signature} onChange={(e) => onChange({ ...value, bhp_signature: e.target.value })} /></F>
          <F label="BHP date"><Input type="date" value={value.bhp_date} onChange={(e) => onChange({ ...value, bhp_date: e.target.value })} /></F>
        </div>
      </TabsContent>
    </Tabs>
  );
}
