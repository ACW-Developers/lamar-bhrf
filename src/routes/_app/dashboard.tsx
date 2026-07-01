import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, AlertTriangle, ClipboardList } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Lamar BHRF" }] }),
  component: DashboardPage,
});

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [residents, incidents, plans, notes] = await Promise.all([
        supabase.from("residents").select("id, status, admission_date, discharge_date"),
        supabase.from("incidents").select("id, status, severity, incident_date").order("incident_date", { ascending: false }).limit(60),
        supabase.from("treatment_plans").select("id, review_date"),
        supabase.from("progress_notes").select("id, created_at, note_type, content, resident:residents(first_name, last_name)").order("created_at", { ascending: false }).limit(6),
      ]);
      return {
        residents: residents.data ?? [],
        incidents: incidents.data ?? [],
        plans: plans.data ?? [],
        notes: notes.data ?? [],
      };
    },
  });
}

function buildCensusSeries(residents: { admission_date: string | null; discharge_date: string | null }[]) {
  const weeks: { label: string; census: number; admits: number; discharges: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    const census = residents.filter((r) => {
      const adm = r.admission_date ? new Date(r.admission_date) : null;
      const dis = r.discharge_date ? new Date(r.discharge_date) : null;
      return adm && adm <= end && (!dis || dis > end);
    }).length;
    const admits = residents.filter((r) => {
      const adm = r.admission_date ? new Date(r.admission_date) : null;
      return adm && adm > start && adm <= end;
    }).length;
    const discharges = residents.filter((r) => {
      const dis = r.discharge_date ? new Date(r.discharge_date) : null;
      return dis && dis > start && dis <= end;
    }).length;
    weeks.push({
      label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      census,
      admits,
      discharges,
    });
  }
  return weeks;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function DashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading } = useDashboardData();

  const residents = data?.residents ?? [];
  const incidents = data?.incidents ?? [];
  const plans = data?.plans ?? [];
  const notes = data?.notes ?? [];

  const activeResidents = residents.filter((r) => r.status === "active").length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newAdmissions = residents.filter((r) => r.admission_date && new Date(r.admission_date) >= startOfMonth).length;
  const openIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const plansDue = plans.filter((p) => {
    if (!p.review_date) return false;
    const nrd = new Date(p.review_date);
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    return nrd <= sevenDays;
  }).length;

  const censusSeries = buildCensusSeries(residents);

  const incidentsBySeverity = (() => {
    const buckets = new Map<string, number>();
    incidents.forEach((i) => {
      const k = (i.severity ?? "unspecified").toString();
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    });
    const palette = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
    return Array.from(buckets.entries()).map(([name, value], i) => ({
      name,
      value,
      fill: palette[i % palette.length],
    }));
  })();

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Good ${greeting()}, ${profile?.full_name?.split(" ")[0] ?? "team"}`}
        description="Facility health at a glance — census, clinical load, and risk."
        actions={
          <Button size="sm" asChild>
            <Link to="/admissions">
              <UserPlus className="mr-2 h-4 w-4" /> New admission
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Link to="/residents" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Active Residents" value={isLoading ? "—" : activeResidents} icon={Users} tone="primary" hint="In care today" />
          </Link>
          <Link to="/admissions" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="New Admissions" value={isLoading ? "—" : newAdmissions} icon={UserPlus} hint="This month" />
          </Link>
          <Link to="/incidents" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Open Incidents" value={isLoading ? "—" : openIncidents} icon={AlertTriangle} tone={openIncidents > 0 ? "destructive" : "default"} hint="Needs attention" />
          </Link>
          <Link to="/treatment-plans" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Plans Due" value={isLoading ? "—" : plansDue} icon={ClipboardList} tone="warning" hint="Within 7 days" />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Census Trend</div>
                <div className="text-xs text-muted-foreground">Weekly census · last 8 weeks</div>
              </div>
              <Badge variant="secondary" className="text-[10px]">8 wks</Badge>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={censusSeries}>
                <defs>
                  <linearGradient id="censusFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="census" stroke="var(--color-primary)" strokeWidth={2} fill="url(#censusFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Incidents by Severity</div>
              <div className="text-xs text-muted-foreground">Recent reports</div>
            </div>
            {incidentsBySeverity.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">No incidents reported</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={incidentsBySeverity} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                      {incidentsBySeverity.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  {incidentsBySeverity.map((c) => (
                    <div key={c.name} className="flex items-center gap-1.5 capitalize">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.fill }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Admissions vs Discharges</div>
              <div className="text-xs text-muted-foreground">Weekly movement</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={censusSeries} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={22} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="admits" name="Admits" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="discharges" name="Discharges" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Recent Progress Notes</div>
                <div className="text-xs text-muted-foreground">Last 6 entries</div>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/progress-notes">View all</Link>
              </Button>
            </div>
            <ul className="space-y-3">
              {notes.length === 0 && (
                <li className="text-sm text-muted-foreground">No recent notes.</li>
              )}
              {notes.map((n) => {
                const r = n.resident as { first_name?: string; last_name?: string } | null;
                return (
                  <li key={n.id} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-medium">{r ? `${r.first_name} ${r.last_name}` : "Resident"}</div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(n.created_at)}</div>
                      </div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        <span className="capitalize">{n.note_type.replaceAll("_", " ")}</span> — {n.content?.slice(0, 90) || "—"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
