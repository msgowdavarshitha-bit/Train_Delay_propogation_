import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, TrainFront } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurfaceCard } from "@/components/rail/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RailSense" },
      { name: "description", content: "Sign in to RailSense to save trains and receive delay alerts." },
      { property: "og:title", content: "Sign in — RailSense" },
      { property: "og:description", content: "Access your saved trains and delay alerts." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSentConfirmation(true);
      toast.success("Check your email to confirm your account.");
    }
  }

  async function signInWithGoogle() {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function resetPassword() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  }

  return (
    <div className="ambient-glow flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span
            className="grid size-10 place-items-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <TrainFront className="size-5" />
          </span>
          <span className="text-base font-bold tracking-tight">RailSense</span>
        </Link>

        <SurfaceCard className="animate-rise p-6">
          {sentConfirmation ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-semibold">Confirm your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-medium">{email}</span>. Click it to
                activate your RailSense account.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSentConfirmation(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={signIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl bg-secondary/50"
                    />
                  </div>
                  <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Sign in
                  </Button>
                  <button
                    type="button"
                    onClick={resetPassword}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    Forgot your password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={signUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input
                      id="signup-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 rounded-xl bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl bg-secondary/50"
                    />
                  </div>
                  <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create account
                  </Button>
                </form>
              </TabsContent>

              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="label-meta">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                className="mt-5 h-11 w-full rounded-xl"
                onClick={signInWithGoogle}
                type="button"
              >
                Continue with Google
              </Button>
            </Tabs>
          )}
        </SurfaceCard>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
