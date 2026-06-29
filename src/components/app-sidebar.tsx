import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardPlus,
  FileText,
  ListChecks,
  StickyNote,
  Activity,
  Pill,
  UsersRound,
  HeartPulse,
  ShieldCheck,
  AlertTriangle,
  Car,
  Settings,
  LogOut,
  Users2,
  CalendarClock,
  FileLock2,
  ScrollText,
  FileBarChart2,
} from "lucide-react";
import logoAsset from "@/assets/lamar-logo-v2.png.asset.json";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/lib/auth";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
};

const clinical: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Residents", url: "/residents", icon: Users },
  { title: "Admissions", url: "/admissions", icon: ClipboardPlus },
  { title: "Assessments", url: "/assessments", icon: FileText, roles: ["administrator", "bhp"] },
  { title: "Treatment Plans", url: "/treatment-plans", icon: ListChecks, roles: ["administrator", "bhp"] },
  { title: "Progress Notes", url: "/progress-notes", icon: StickyNote },
  { title: "Discharges", url: "/discharges", icon: LogOut },
];

const daily: NavItem[] = [
  { title: "Daily Services", url: "/daily-services", icon: Activity },
  { title: "Medication", url: "/medication", icon: Pill },
  { title: "Group Sessions", url: "/group-sessions", icon: UsersRound },
  { title: "Individual Therapy", url: "/therapy", icon: HeartPulse, roles: ["administrator", "bhp"] },
  { title: "Transportation", url: "/transportation", icon: Car },
  { title: "Contacts & Visits", url: "/contacts", icon: Users2 },
  { title: "Documents", url: "/documents", icon: FileLock2 },
];

const oversight: NavItem[] = [
  { title: "Supervision", url: "/supervision", icon: ShieldCheck, roles: ["administrator", "bhp"] },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle },
  { title: "Schedule & Handoff", url: "/schedule", icon: CalendarClock },
  { title: "Reports", url: "/reports", icon: FileBarChart2 },
  { title: "Audit Log", url: "/audit", icon: ScrollText, roles: ["administrator"] },
];

const system: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];


function filterByRole(items: NavItem[], roles: AppRole[]): NavItem[] {
  return items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r)));
}

export function AppSidebar() {
  const { roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string) =>
    pathname === url || (url !== "/dashboard" && pathname.startsWith(url));

  const Section = ({ label, items }: { label: string; items: NavItem[] }) => {
    const visible = filterByRole(items, roles);
    if (!visible.length) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.url)}
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                >
                  <Link to={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center justify-center px-2 py-3">
          <img
            src={logoAsset.url}
            alt="Lamar BHRF"
            className="h-10 w-auto object-contain group-data-[collapsible=icon]:h-7"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <Section label="Clinical" items={clinical} />
        <Section label="Daily Operations" items={daily} />
        <Section label="Oversight" items={oversight} />
        <Section label="System" items={system} />
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          HIPAA-aligned • v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
