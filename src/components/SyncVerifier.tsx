import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VerifyState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "no-extension" }
  | { status: "error"; message: string }
  | {
      status: "done";
      chromeCount: number;
      backendCount: number;
      missingInBackend: string[];
      missingInChrome: string[];
    };

const VERIFY_TIMEOUT_MS = 5000;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname + u.search;
  } catch {
    return url;
  }
}

async function requestChromeSnapshot(): Promise<{ urls: string[]; count: number }> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("EXTENSION_TIMEOUT"));
    }, VERIFY_TIMEOUT_MS);

    function handler(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type !== "SMARTTAB_VERIFY_RESPONSE" || data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", handler);
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve({ urls: data.urls || [], count: data.count || 0 });
      }
    }

    window.addEventListener("message", handler);
    window.postMessage(
      { type: "SMARTTAB_VERIFY_REQUEST", requestId },
      window.location.origin,
    );
  });
}

export const SyncVerifier = () => {
  const [state, setState] = useState<VerifyState>({ status: "idle" });

  const runVerification = async () => {
    setState({ status: "running" });

    let snapshot: { urls: string[]; count: number };
    try {
      snapshot = await requestChromeSnapshot();
    } catch (e: any) {
      if (e.message === "EXTENSION_TIMEOUT") {
        setState({ status: "no-extension" });
      } else {
        setState({ status: "error", message: e.message || "Failed to reach extension" });
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ status: "error", message: "Not signed in" });
        return;
      }

      const { data, error } = await supabase
        .from("tab_activity")
        .select("url")
        .eq("user_id", user.id)
        .eq("is_archived", false);

      if (error) throw error;

      const chromeSet = new Set(snapshot.urls.map(normalizeUrl));
      const backendSet = new Set((data || []).map((r) => normalizeUrl(r.url)));

      const missingInBackend = [...chromeSet].filter((u) => !backendSet.has(u));
      const missingInChrome = [...backendSet].filter((u) => !chromeSet.has(u));

      setState({
        status: "done",
        chromeCount: chromeSet.size,
        backendCount: backendSet.size,
        missingInBackend,
        missingInChrome,
      });
    } catch (e: any) {
      setState({ status: "error", message: e.message || "Failed to query backend" });
    }
  };

  const inSync =
    state.status === "done" &&
    state.missingInBackend.length === 0 &&
    state.missingInChrome.length === 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Sync Verifier
        </CardTitle>
        <CardDescription>
          Compare your Chrome tabs against what the backend has stored.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runVerification} disabled={state.status === "running"}>
          {state.status === "running" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify Sync
            </>
          )}
        </Button>

        {state.status === "no-extension" && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertTitle>Extension not detected</AlertTitle>
            <AlertDescription>
              The SmartTab extension didn't respond within {VERIFY_TIMEOUT_MS / 1000}s.
              Open this dashboard on the published site
              (<code>tab-mind-ai.lovable.app</code>) with the extension installed
              and signed in, then try again.
            </AlertDescription>
          </Alert>
        )}

        {state.status === "error" && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state.status === "done" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">Chrome (syncable)</p>
                <p className="text-2xl font-bold">{state.chromeCount}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">Backend (active)</p>
                <p className="text-2xl font-bold">{state.backendCount}</p>
              </div>
            </div>

            {inSync ? (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>In sync</AlertTitle>
                <AlertDescription>
                  All {state.chromeCount} Chrome tabs match what's stored in the backend.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Mismatch detected</AlertTitle>
                <AlertDescription>
                  {state.missingInBackend.length} tab(s) in Chrome are missing from the backend.{" "}
                  {state.missingInChrome.length} tab(s) in the backend aren't open in Chrome.
                </AlertDescription>
              </Alert>
            )}

            {state.missingInBackend.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">Missing in backend</Badge>
                  <span className="text-xs text-muted-foreground">
                    {state.missingInBackend.length}
                  </span>
                </div>
                <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
                  {state.missingInBackend.slice(0, 50).map((u) => (
                    <li key={u} className="truncate text-muted-foreground">{u}</li>
                  ))}
                </ul>
              </div>
            )}

            {state.missingInChrome.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Not open in Chrome</Badge>
                  <span className="text-xs text-muted-foreground">
                    {state.missingInChrome.length}
                  </span>
                </div>
                <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
                  {state.missingInChrome.slice(0, 50).map((u) => (
                    <li key={u} className="truncate text-muted-foreground">{u}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};