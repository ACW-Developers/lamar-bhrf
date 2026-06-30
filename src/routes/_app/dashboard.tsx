import { createFileRoute, Link } from "@tanstack/react-router";
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
  head: () => ({ meta: [{ title: "Dashboard - Lamar BHRF" }] }),
  component: DashboardPage,
});

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [residents, incidents, plans, notes, transport, profiles] = await Promise.all([
        supabase.from("residents").select("id, status, admission_date, discharge_date, first_name, last_name"),
        supabase.from("incidents").select("id, status, severity, incident_date, incident_type, description").order("incident_date", { ascending: false }).limit(40),
        supabase.from("treatment_plans").select("id, review_date, status, resident_id"),
        supabase.from("progress_notes").select("id, created_at, note_type, author_id, resident_id, content").order("created_at", { ascending: false }).limit(10),
        supabase.from("transportation_logs").select("id, departure_time, appointment_type, destination, resident_id").order("departure_time", { ascending: true }).limit(8),
        supabase.from("profiles").select("id, full_name, on_duty"),
      ]);
      return {
        residents: residents.data ?? [],
        incidents: incidents.data ?? [],
        plans: plans.data ?? [],
        notes: notes.data ?? [],
        transport: transport.data ?? [],
        staff: profiles.data ?? [],
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

function DashboardPage() {
  const { profile, roles } = useAuth();
  const { data, isLoading } = useDashboardData();

  const residents = data?.residents ?? [];
  const incidents = data?.incidents ?? [];
  const plans = data?.plans ?? [];
  const notes = data?.notes ?? [];
  const transport = data?.transport ?? [];
  const staff = data?.staff ?? [];

  const activeResidents = residents.filter((r) => r.status === "active").length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newAdmissions = residents.filter((r) => r.admission_date && new Date(r.admission_date) >= startOfMonth).length;
  const discharges = residents.filter((r) => r.discharge_date && new Date(r.discharge_date) >= startOfMonth).length;
  const openIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const plansDue = plans.filter((p) => {
    if (!p.review_date) return false;
    const nrd = new Date(p.review_date);
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
      const key = inc.incident_date.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([d, count]) => ({
      label: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    }));
  })();

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

  const residentStatusBars = (() => {
    const buckets = new Map<string, number>();
    residents.forEach((r) => {
      const k = (r.status ?? "unknown").toString();
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([phase, value]) => ({ phase, value }));
  })();

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
            <Button size="sm" asChild>
              <Link to="/admissions">
                <UserPlus className="mr-2 h-4 w-4" /> New admission
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Link to="/residents" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Active Residents" value={isLoading ? "-" : activeResidents} icon={Users} tone="primary" hint="In care today" />
          </Link>
          <Link to="/admissions" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="New Admissions" value={isLoading ? "-" : newAdmissions} icon={UserPlus} hint="This month" />
          </Link>
          <Link to="/discharges" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Discharges" value={isLoading ? "-" : discharges} icon={UserMinus} hint="This month" />
          </Link>
          <Link to="/incidents" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Open Incidents" value={isLoading ? "-" : openIncidents} icon={AlertTriangle} tone={openIncidents > 0 ? "destructive" : "default"} hint="Needs attention" />
          </Link>
          <Link to="/treatment-plans" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Plans Due" value={isLoading ? "-" : plansDue} icon={ClipboardList} tone="warning" hint="Within 7 days" />
          </Link>
          <Link to="/schedule" className="block transition-transform hover:-translate-y-0.5">
            <KpiCard label="Staff On Duty" value={isLoading ? "-" : onDuty} icon={ShieldCheck} hint={`of ${staff.length} total`} />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Resident Census Trend</div>
                <div className="text-xs text-muted-foreground">Weekly census across the last 8 weeks</div>
              </div>
              <Badge variant="secondary" className="text-[10px]">8 weeks</Badge>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={censusSeries}>
                <defs>
                  <linearGradient id="censusFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="census" stroke="var(--color-primary)" strokeWidth={2} fill="url(#censusFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Admissions vs Discharges</div>
              <div className="text-xs text-muted-foreground">Weekly movement</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
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
              <div className="text-sm font-semibold">Residents by Status</div>
              <div className="text-xs text-muted-foreground">Current distribution</div>
            </div>
            {residentStatusBars.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">No resident data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={residentStatusBars} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="phase" type="category" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={86} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={incidentsBySeverity} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={3}>
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-elevated rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Upcoming Transportation</div>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3">
              {transport.length === 0 && (
                <li className="text-sm text-muted-foreground">No appointments scheduled.</li>
              )}
              {transport.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.appointment_type ?? a.destination ?? "Transport"}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(a.departure_time)}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">Scheduled</Badge>
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
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-medium capitalize">{n.note_type.replaceAll("_", " ")}</span>{" "}
                      <span className="text-muted-foreground">- {n.content.slice(0, 60)}{n.content.length > 60 ? "…" : ""}</span>
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
              {plansDue === 0 && openIncidents === 0 && (
                <li className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <span>All clear - no pending items.</span>
                </li>
              )}
              {plansDue > 0 && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-warning-foreground" />
                  <div>
                    <div className="font-medium">{plansDue} treatment plan review{plansDue === 1 ? "" : "s"} due</div>
                    <div className="text-xs text-muted-foreground">Within the next 7 days</div>
                  </div>
                </li>
              )}
              {openIncidents > 0 && (
                <li className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium">{openIncidents} open incident{openIncidents === 1 ? "" : "s"}</div>
                    <div className="text-xs text-muted-foreground">Awaiting investigation or sign-off</div>
                  </div>
                </li>
              )}
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
