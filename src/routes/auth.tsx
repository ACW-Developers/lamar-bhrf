import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Loader2, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import heroImg from "@/assets/auth-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Lamar BHRF" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created", { description: "You may now sign in." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error("Sign-in error", { description: message });
    } finally {
      setSubmitting(false);
      void remember;
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Left: hero */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={heroImg}
          alt="Lamar BHRF facility"
          className="absolute inset-0 h-full w-full object-cover"
          width={1280}
          height={1600}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/85 via-emerald-900/55 to-emerald-700/20" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">Lamar BHRF</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-white/70">
                Arizona Residential Care
              </div>
            </div>
          </div>

          <div className="max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              HIPAA-aligned clinical workflows
            </div>
            <h2 className="font-serif text-5xl leading-[1.05] tracking-tight">
              Compassionate care, organized with clinical precision.
            </h2>
            <p className="text-white/80 leading-relaxed">
              Manage residents, treatment plans, daily observations, and staff compliance from a single
              calm, modern workspace built for behavioral health teams.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-white/60">
            <span>© {new Date().getFullYear()} Lamar Residential BHRF</span>
            <span>Phoenix, Arizona</span>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div className="font-semibold tracking-tight">Lamar BHRF</div>
          </div>

          <div className="surface-elevated rounded-2xl p-8">
            <div className="mb-6">
              <h1 className="font-serif text-3xl tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to continue caring for your residents."
                  : "Set up an account to join your facility's care team."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Jordan Rivera"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.org"
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        toast.info("Contact your administrator to reset your password.")
                      }
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </div>
              </div>

              {mode === "signin" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                  />
                  Remember me on this device
                </label>
              )}

              <Button type="submit" disabled={submitting} className="h-11 w-full text-sm font-medium">
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  New to Lamar?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="font-medium text-primary hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("signin")}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to follow your facility's HIPAA and{" "}
            <Link to="/auth" className="underline underline-offset-2">
              acceptable use
            </Link>{" "}
            policies.
          </p>
        </div>
      </div>
    </div>
  );
}
