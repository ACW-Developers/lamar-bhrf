import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/role-badge";
import { DataEmpty } from "@/components/data-empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/residents/")({
  head: () => ({ meta: [{ title: "Residents — Lamar BHRF" }] }),
  component: ResidentsPage,
});

type Resident = {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  status: string;
  admission_date: string | null;
  primary_diagnosis: string | null;
  assigned_bhp: string | null;
};

function initials(f?: string, l?: string) {
  return `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();
}

const statusTone = (status: string) =>
  status === "active"
    ? "success"
    : status === "discharged"
      ? "default"
      : status === "on_leave"
        ? "warning"
        : "primary";

function ResidentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "pending_admission" | "discharged">("active");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, mrn, first_name, last_name, date_of_birth, gender, status, admission_date, primary_diagnosis, assigned_bhp")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Resident[];
    },
  });

  const filtered = (data ?? []).filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.mrn.toLowerCase().includes(q) ||
      (r.primary_diagnosis ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        eyebrow="Census"
        title="Residents"
        description="Search, manage, and open detailed records for everyone in care."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New Resident
              </Button>
            </DialogTrigger>
            <NewResidentDialog
              onCreated={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["residents"] });
              }}
            />
          </Dialog>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="discharged">Discharged</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, MRN, diagnosis…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="surface-elevated overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <DataEmpty
              icon={Users}
              title="No residents to show"
              description="Try a different filter, or add a new resident to start a record."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Resident</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admitted</TableHead>
                  <TableHead>Primary Diagnosis</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                            {initials(r.first_name, r.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium leading-tight">{r.first_name} {r.last_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.gender ?? "—"} · DOB {formatDate(r.date_of_birth)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.mrn}</TableCell>
                    <TableCell>
                      <StatusPill status={r.status} tone={statusTone(r.status)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.admission_date)}</TableCell>
                    <TableCell className="text-sm">{r.primary_diagnosis ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/residents/$id" params={{ id: r.id }}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function NewResidentDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    status: "pending",
    primary_diagnosis: "",
  });

  const m = useMutation({
    mutationFn: async () => {
      const mrn = `LR-${Math.floor(100000 + Math.random() * 900000)}`;
      const { error } = await supabase.from("residents").insert({
        mrn,
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        status: form.status,
        primary_diagnosis: form.primary_diagnosis || null,
        admission_date: form.status === "active" ? new Date().toISOString().slice(0, 10) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resident created");
      onCreated();
    },
    onError: (e) => toast.error("Could not create resident", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New resident</DialogTitle>
        <DialogDescription>Create a record. You can edit details later from the resident profile.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>First name</Label>
          <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Last name</Label>
          <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Date of birth</Label>
          <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="nonbinary">Non-binary</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending admission</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Primary diagnosis</Label>
          <Input
            value={form.primary_diagnosis}
            onChange={(e) => setForm({ ...form, primary_diagnosis: e.target.value })}
            placeholder="e.g. Substance use disorder — opioid"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || !form.first_name || !form.last_name}>
          {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create resident
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
