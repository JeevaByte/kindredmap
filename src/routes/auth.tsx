import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

import { OtpInput } from "@/components/OtpInput";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Meet Map" },
      {
        name: "description",
        content: "Sign in to Meet Map with a 6-digit code sent to your email or mobile.",
      },
      { property: "og:title", content: "Sign in — Meet Map" },
      { property: "og:description", content: "A 6-digit code is all you need." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  // Mobile OTP is hidden until account linking exists (email-only sign-in for now).
  const method: "email" | "sms" = "email";
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  const destination = email.trim();
  const validDestination = /\S+@\S+\.\S+/.test(destination);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Already signed in? Home is always reachable — go there.
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) void navigate({ to: "/map", replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function sendCode() {
    if (cooldown > 0) return;
    setBusy(true);
    try {
      // Whether the member receives a 6-digit code or a clickable link is NOT
      // decided here -- Supabase always generates both a token and a
      // confirmation URL. It is decided by the email templates, which must
      // render {{ .Token }}. See supabase/templates/ and supabase/config.toml.
      //
      // Note there are two templates in play: a brand new account gets
      // "confirmation", an existing one gets "magic_link". Both must use the
      // token or half of your members still receive a link they cannot type.
      const { error } =
        method === "email"
          ? await supabase.auth.signInWithOtp({
              email: destination,
              options: { shouldCreateUser: true },
            })
          : await supabase.auth.signInWithOtp({
              phone: destination,
              options: { shouldCreateUser: true, channel: "sms" },
            });
      if (error) throw error;
      setOtpSent(true);
      setCode("");
      setCooldown(45);
      toast.success(method === "email" ? "Check your inbox" : "Check your messages", {
        description: `We sent a 6-digit code to ${destination}.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error("Couldn't send the code", {
        description: /rate|limit|seconds/i.test(msg)
          ? "Too many requests. Please wait a moment and try again."
          : msg || "Try again",
      });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    try {
      const { data, error } =
        method === "email"
          ? await supabase.auth.verifyOtp({ email: destination, token: code.trim(), type: "email" })
          : await supabase.auth.verifyOtp({ phone: destination, token: code.trim(), type: "sms" });
      if (error) throw error;
      if (!data.user) throw new Error("Verification failed");
      // Registration state is decided by the backend once we're on Home.
      void navigate({ to: "/map", replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const expired = /expired/i.test(msg);
      toast.error(expired ? "That code has expired" : "That code didn't work", {
        description: expired
          ? "Codes are valid for a short time — tap Resend to get a new one."
          : "Double-check the 6 digits, or tap Resend for a new code.",
      });
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center map-dots">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col justify-center map-dots px-6 pb-10 pt-8">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          PMF Circle only
        </p>

        <div key={String(otpSent)} className="pop-in mt-4">
          <h1 className="font-display text-3xl leading-tight">
            {otpSent
              ? "Enter your 6-digit code"
              : method === "email"
                ? "What's your email?"
                : "What's your mobile number?"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {otpSent
              ? `Sent to ${destination}. Enter the 6-digit code to continue.`
              : method === "email"
                ? "We'll email you a 6-digit code to sign in."
                : "We'll text you a 6-digit code to sign in."}
          </p>

          {otpSent ? (
            <>
              <OtpInput
                autoFocus
                value={code}
                onChange={setCode}
                onComplete={() => void verifyCode()}
              />
              <button
                onClick={() => void sendCode()}
                disabled={busy || cooldown > 0}
                className="mt-4 w-full text-sm font-bold text-accent-deep disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button
                onClick={() => {
                  setOtpSent(false);
                  setCode("");
                }}
                className="mt-1 w-full text-sm font-bold text-muted-foreground"
              >
                {method === "email" ? "Change email" : "Change number"}
              </button>
            </>
          ) : (
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-4 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg outline-none focus:border-primary"
            />
          )}
        </div>

        <button
          disabled={busy || (otpSent ? code.trim().length < 6 : !validDestination)}
          onClick={() => void (otpSent ? verifyCode() : sendCode())}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-display text-base font-bold text-primary-foreground shadow-pop transition active:translate-y-1 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {otpSent ? "Verify" : method === "email" ? "Email me a code" : "Text me a code"}
          {!busy ? <ArrowRight className="h-5 w-5" /> : null}
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          No passwords, no magic links. Just a code.
        </p>
      </div>
    </main>
  );
}
