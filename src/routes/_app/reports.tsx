import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileBarChart2, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Lamar BHRF" }] }),
  component: ReportsPage,
});

const REPORTS: { key: string; title: string; description: string; table: string; columns: string }[] = [
  { key: "residents", title: "Resident Census", description: "All residents with status and admit date.", table: "residents", columns: "mrn, first_name, last_name, status, admit_date, discharge_date" },
  { key: "admissions", title: "Admissions Log", description: "Intake records and referral sources.", table: "admissions", columns: "intake_date, status, referral_source, presenting_problem" },
  { key: "incidents", title: "Incident Report", description: "All reported incidents with severity.", table: "incidents", columns: "incident_date, incident_type, severity, summary, status" },
  { key: "medication_logs", title: "Medication Adherence", description: "Doses administered, refused, or missed.", table: "medication_logs", columns: "administered_at, medication_name, dose, status, notes" },
  { key: "progress_notes", title: "Progress Notes", description: "All clinical progress notes.", table: "progress_notes", columns: "created_at, note_type, content" },
  { key: "discharges", title: "Discharges & Follow-up", description: "Discharge plans and follow-up status.", table: "discharges", columns: "planned_date, actual_date, discharge_type, destination, status, follow_up_date, follow_up_completed" },
];

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const exportCsv = async (r: typeof REPORTS[number]) => {
    setLoading(r.key);
    try {
      const { data, error } = await supabase.from(r.table as any).select(r.columns).limit(5000);
      if (error) throw error;
      const csv = toCsv(data ?? []);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.key}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data?.length ?? 0} rows`);
    } catch (e) {
      toast.error("Export failed", { description: (e as Error).message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Reports & Exports" description="Generate CSV exports for compliance, billing, and oversight." />
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.key} className="surface-elevated rounded-2xl p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileBarChart2 className="h-4 w-4 text-primary" /> {r.title}</div>
            <p className="mb-4 text-sm text-muted-foreground">{r.description}</p>
            <Button size="sm" variant="outline" onClick={() => exportCsv(r)} disabled={loading === r.key}>
              {loading === r.key ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
              Export CSV
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
