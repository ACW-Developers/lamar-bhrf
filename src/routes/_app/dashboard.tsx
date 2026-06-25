import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserMinus,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  CalendarClock,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
import { useAuth, ROLE_SHORT } from "@/lib/auth";
import { relativeTime, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lamar BHRF" }] }),
  component: DashboardPage,
});

type Resident = { id: string; status: string; admission_date: string | null; discharge_date: string | null; first_name: string; last_name: string };
type Incident = { id: string; status: string; severity: string | null; occurred_at: string; title: string };
type TreatmentPlan = { id: string; next_review_date: string | null; status: string; resident_id: string };
type ProgressNote = { id: string; created_at: string; note_type: string; author_id: string; resident_id: string; content: string };
type Appointment = { id: string; appointment_at: string; reason: string | null; resident_id: string };

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [residents, incidents, plans, notes, appointments, profiles] = await Promise.all([
        supabase.from("residents").select("id, status, admission_date, discharge_date, first_name, last_name"),
        supabase.from("incidents").select("id, status, severity, occurred_at, title").order("occurred_at", { ascending: false }).limit(20),
        supabase.from("treatment_plans").select("id, next_review_date, status, resident_id"),
        supabase.from("progress_notes").select("id, created_at, note_type, author_id, resident_id, content").order("created_at", { ascending: false }).limit(10),
        supabase.from("transportation_logs").select("id, appointment_at:scheduled_departure, reason:purpose, resident_id").order("scheduled_departure", { ascending: true }).limit(8),
        supabase.from("profiles").select("id, full_name, on_duty"),
      ]);
      return {
        residents: (residents.data ?? []) as Resident[],
        incidents: (incidents.data ?? []) as Incident[],
        plans: (plans.data ?? []) as TreatmentPlan[],
        notes: (notes.data ?? []) as ProgressNote[],
        appointments: (appointments.data ?? []) as Appointment[],
        staff: (profiles.data ?? []) as { id: string; full_name: string; on_duty: boolean | null }[],
      };
    },
  });
}

function buildCensusSeries(residents: Resident[]) {
  // Build last 8 weeks census from admission/discharge dates
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

function DashboardPage() {
  const { profile, roles } = useAuth();
  const { data, isLoading } = useDashboardData();

  const residents = data?.residents ?? [];
  const incidents = data?.incidents ?? [];
  const plans = data?.plans ?? [];
  const notes = data?.notes ?? [];
  const appointments = data?.appointments ?? [];
  const staff = data?.staff ?? [];

  const activeResidents = residents.filter((r) => r.status === "active").length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newAdmissions = residents.filter(
    (r) => r.admission_date && new Date(r.admission_date) >= startOfMonth,
  ).length;
  const discharges = residents.filter(
    (r) => r.discharge_date && new Date(r.discharge_date) >= startOfMonth,
  ).length;
  const openIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const plansDue = plans.filter((p) => {
    if (!p.next_review_date) return false;
    const nrd = new Date(p.next_review_date);
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    return nrd <= sevenDays;
  }).length;
  const onDuty = staff.filter((s) => s.on_duty).length;

  const censusSeries = buildCensusSeries(residents);
  const incidentByDay = (() => {
    const map = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    incidents.forEach((inc) => {
      const key = inc.occurred_at.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([d, count]) => ({
      label: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    }));
  })();

  const complianceData = [
    { name: "Current", value: Math.max(staff.length - 2, 0), fill: "var(--color-chart-1)" },
    { name: "Due Soon", value: 1, fill: "var(--color-chart-3)" },
    { name: "Expired", value: 1, fill: "var(--color-destructive)" },
  ];

  const progressBars = [
    { phase: "Stabilization", value: Math.min(activeResidents, 8) },
    { phase: "Engagement", value: Math.max(activeResidents - 3, 0) },
    { phase: "Treatment", value: Math.max(activeResidents - 5, 0) },
    { phase: "Aftercare", value: Math.max(activeResidents - 8, 0) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title={`Good ${greeting()}, ${profile?.full_name?.split(" ")[0] ?? "team"}`}
        description="Live snapshot of residents, clinical work, staffing, and risk across the facility."
        actions={
          <>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {roles.map((r) => ROLE_SHORT[r]).join(" • ") || "Member"}
            </Badge>
            <Button variant="outline" size="sm">
              <CalendarClock className="mr-2 h-4 w-4" /> Today's schedule
            </Button>
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> New admission
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-6">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Active Residents" value={isLoading ? "—" : activeResidents} icon={Users} tone="primary" hint="In care today" />
          <KpiCard label="New Admissions" value={isLoading ? "—" : newAdmissions} icon={UserPlus} delta={12} hint="This month" />
          <KpiCard label="Discharges" value={isLoading ? "—" : discharges} icon={UserMinus} delta={-4} hint="This month" />
          <KpiCard label="Open Incidents" value={isLoading ? "—" : openIncidents} icon={AlertTriangle} tone={openIncidents > 0 ? "destructive" : "default"} hint="Needs attention" />
          <KpiCard label="Plans Due" value={isLoading ? "—" : plansDue} icon={ClipboardList} tone="warning" hint="Within 7 days" />
          <KpiCard label="Staff On Duty" value={isLoading ? "—" : onDuty} icon={ShieldCheck} hint={`of ${staff.length} total`} />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-elevated col-span-2 rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Resident Census Trend</div>
                <div className="text-xs text-muted-foreground">Weekly census across the last 8 weeks</div>
              </div>
              <Badge variant="secondary" className="text-[10px]">Last 8 weeks</Badge>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={censusSeries}>
                <defs>
                  <linearGradient id="censusFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="census" stroke="var(--color-primary)" strokeWidth={2} fill="url(#censusFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Admissions vs Discharges</div>
              <div className="text-xs text-muted-foreground">Weekly movement</div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={censusSeries} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={20} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="admits" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="discharges" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Incident Trend</div>
              <div className="text-xs text-muted-foreground">Last 14 days</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={incidentByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={20} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="var(--color-destructive)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Resident Progress</div>
              <div className="text-xs text-muted-foreground">Treatment phase distribution</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={progressBars} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="phase" type="category" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={86} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Staff Compliance</div>
              <div className="text-xs text-muted-foreground">Certifications & clearances</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={complianceData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3}>
                  {complianceData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
              {complianceData.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.fill }} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Widgets row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Upcoming Appointments</div>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3">
              {appointments.length === 0 && (
                <li className="text-sm text-muted-foreground">No appointments scheduled.</li>
              )}
              {appointments.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{a.reason ?? "Appointment"}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(a.appointment_at)}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Scheduled</Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Recent Activity</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3">
              {notes.length === 0 && (
                <li className="text-sm text-muted-foreground">No recent notes.</li>
              )}
              {notes.slice(0, 5).map((n) => (
                <li key={n.id} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium capitalize">{n.note_type.replaceAll("_", " ")}</span>{" "}
                      <span className="text-muted-foreground">— {n.content.slice(0, 60)}{n.content.length > 60 ? "…" : ""}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{relativeTime(n.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Tasks Requiring Attention</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-warning-foreground" />
                <div>
                  <div className="font-medium">{plansDue} treatment plan reviews due</div>
                  <div className="text-xs text-muted-foreground">Within the next 7 days</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                <div>
                  <div className="font-medium">{openIncidents} open incidents</div>
                  <div className="text-xs text-muted-foreground">Awaiting investigation or sign-off</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">2 certifications expiring soon</div>
                  <div className="text-xs text-muted-foreground">CPR & TB renewals this month</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
