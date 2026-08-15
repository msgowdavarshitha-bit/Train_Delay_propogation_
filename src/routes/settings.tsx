import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Loader2, Save, ServerCog, UserCog } from "lucide-react";

import { AppShell } from "@/components/rail/app-shell";
import { StationSelect } from "@/components/rail/station-select";
import { LoadingSkeleton, PageHeader, StatusBadge, SurfaceCard } from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getApiBase, railApi, setApiBase } from "@/lib/rail/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RailSense" },
      { name: "description", content: "Manage your profile, alert preferences and rail data source." },
      { property: "og:title", content: "Settings — RailSense" },
      { property: "og:description", content: "Profile, alerts and data source configuration." },
    ],
  }),
  component: SettingsPage,
});

const ALERT_FIELDS = [
  { key: "delay_alerts", label: "Delay alerts", hint: "When a followed train slips behind schedule" },
  { key: "departure_alerts", label: "Departure alerts", hint: "Shortly before departure from origin" },
  { key: "arrival_alerts", label: "Arrival alerts", hint: "As the train approaches your destination" },
  { key: "prediction_alerts", label: "Prediction alerts", hint: "When the AI forecast changes significantly" },
  { key: "email_notifications", label: "Email notifications", hint: "Also send alerts by email" },
] as const;

function DataSourceCard() {
  const [base, setBase] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setBase(getApiBase());
    setSaved(getApiBase());
  }, []);

  return (
    <SurfaceCard className="p-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan/12 text-cyan">
          <Database className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Rail data source</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            By default RailSense runs its built-in prediction engine. Point it at your local Flask
            backend to use the trained model and live CSV data instead.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge tone={saved ? "violet" : "success"} dot>
          {saved ? "External backend" : "Built-in engine"}
        </StatusBadge>
        {saved ? <span className="font-mono text-xs text-muted-foreground">{saved}</span> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="http://localhost:5000"
          className="h-11 rounded-xl bg-secondary/50 font-mono text-sm"
          aria-label="Backend base URL"
        />
        <div className="flex gap-2">
          <Button
            className="h-11 rounded-xl"
            onClick={() => {
              setApiBase(base);
              setSaved(base.trim().replace(/\/$/, ""));
              toast.success(base ? "Connected to your backend" : "Using the built-in engine");
            }}
          >
            <ServerCog className="size-4" /> Save
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => {
              setApiBase("");
              setBase("");
              setSaved("");
              toast.success("Reverted to the built-in engine");
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function SettingsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => railApi.stations() });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["notification_settings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [defaultStation, setDefaultStation] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setDefaultStation(profile.default_station ?? "");
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: fullName, default_station: defaultStation || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not save your profile"),
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("notification_settings")
        .upsert({ user_id: user.id, ...(settings ?? {}), [key]: value });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification_settings"] }),
    onError: () => toast.error("Could not update alert preferences"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Configuration"
          title="Settings"
          description="Your profile, alert routing and where RailSense reads train data from."
        />

        <DataSourceCard />

        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : !user ? (
          <SurfaceCard className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Sign in to personalise RailSense</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Save your home station, follow trains and configure delay alerts.
              </p>
            </div>
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </SurfaceCard>
        ) : (
          <>
            <SurfaceCard className="p-5">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <UserCog className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Profile</h2>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 rounded-xl bg-secondary/50"
                  />
                </div>
                <StationSelect
                  label="Home station"
                  stations={stations}
                  value={defaultStation}
                  onChange={setDefaultStation}
                  placeholder="Pick a station"
                />
              </div>

              <Button
                className="mt-4 h-11 rounded-xl"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
              >
                {saveProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save profile
              </Button>
            </SurfaceCard>

            <SurfaceCard className="p-5">
              <h2 className="text-sm font-semibold">Alert preferences</h2>
              <ul className="mt-4 divide-y divide-border">
                {ALERT_FIELDS.map((field) => (
                  <li key={field.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{field.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{field.hint}</p>
                    </div>
                    <Switch
                      checked={settings?.[field.key] ?? true}
                      onCheckedChange={(value) => toggleAlert.mutate({ key: field.key, value })}
                      aria-label={field.label}
                    />
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
