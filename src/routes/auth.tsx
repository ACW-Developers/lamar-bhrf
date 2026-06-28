import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import heroAsset from "@/assets/lamar-hero.png.asset.json";
import logoAsset from "@/assets/lamar-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
        toast.success("Welcome");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error("Sign-in error", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Left: hero image, natural state with subtle bottom darken */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={heroAsset.url}
          alt="Lamar BHRF entrance"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="surface-elevated rounded-2xl p-6 sm:p-8">
            {/* Logo top center */}
            <div className="mb-6 flex justify-center">
              <img src={logoAsset.url} alt="Lamar BHRF" className="h-16 w-auto object-contain" />
            </div>

            {/* Mode toggle */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium transition-colors",
                    mode === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
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

              <Button type="submit" disabled={submitting} className="h-11 w-full text-sm font-medium">
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
