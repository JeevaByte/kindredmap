// Supabase "Send Email" auth hook.
//
// Why this exists
// ---------------
// Supabase's default Magic Link template renders {{ .ConfirmationURL }}, which
// emails people a clickable link. Meet Map's sign-in screen (src/routes/auth.tsx)
// is a 6-box OTP field, so a link is useless there -- the user has nothing to
// type. This hook takes over auth email delivery entirely and renders
// {{ .Token }}, the 6-digit code, instead.
//
// IMPORTANT: enabling this hook REPLACES Supabase's built-in email sending.
// Once it is on, every auth email goes through this function. If this function
// errors, no auth email is delivered at all and nobody can sign in. Deploy and
// test with `supabase functions serve` before enabling the hook in the
// dashboard.
//
// Required secrets (see supabase/functions/send-email/.env.example):
//   SEND_EMAIL_HOOK_SECRET  v1,whsec_<base64>  from Dashboard > Auth > Hooks
//   RESEND_API_KEY          re_...             from resend.com
//   SEND_EMAIL_FROM         "Meet Map <hello@yourdomain.com>"

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const FROM = Deno.env.get("SEND_EMAIL_FROM") ?? "Meet Map <onboarding@resend.dev>";

/** Payload shape documented at supabase.com/docs/guides/auth/auth-hooks/send-email-hook */
type HookPayload = {
  user: { email: string; new_email?: string | null };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
};

/**
 * Subject lines per action type. The code is placed in the subject as well as
 * the body so it is readable from a notification banner without opening the
 * mail -- which is most of the point of an OTP.
 */
function subjectFor(actionType: string, token: string): string {
  switch (actionType) {
    case "signup":
      return `${token} is your Meet Map code`;
    case "magiclink":
    case "email":
      return `${token} — sign in to Meet Map`;
    case "recovery":
      return `${token} is your Meet Map reset code`;
    case "invite":
      return `${token} — you're invited to Meet Map`;
    case "email_change":
      return `${token} — confirm your new email`;
    case "reauthentication":
      return `${token} is your verification code`;
    default:
      return `${token} is your Meet Map code`;
  }
}

function headlineFor(actionType: string): string {
  switch (actionType) {
    case "signup":
      return "Welcome to the Circle";
    case "recovery":
      return "Reset your password";
    case "invite":
      return "You're invited";
    case "email_change":
      return "Confirm your new email";
    case "reauthentication":
      return "Just checking it's you";
    default:
      return "Your sign-in code";
  }
}

/** Plain-text fallback for clients that will not render HTML. */
function textBody(actionType: string, token: string): string {
  return [
    headlineFor(actionType),
    "",
    `Your Meet Map code is: ${token}`,
    "",
    "Enter it on the sign-in screen. It expires in about an hour and can only be used once.",
    "",
    "If you didn't ask for this, you can safely ignore this email.",
  ].join("\n");
}

/**
 * Branded HTML email. Deliberately table-free and inline-styled: Gmail strips
 * <style> blocks and most clients ignore modern CSS. The digits are spaced out
 * so the code is easy to read off the screen while typing.
 */
function htmlBody(actionType: string, token: string): string {
  const digits = token
    .split("")
    .map(
      (d) =>
        `<span style="display:inline-block;min-width:38px;padding:12px 0;margin:0 3px;background:#fff5f5;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;font-weight:700;color:#1f2933;">${d}</span>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${headlineFor(actionType)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fdf8f3;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Meet Map code is ${token}</div>
    <div style="max-width:520px;margin:0 auto;padding:40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="background:#ffffff;border-radius:28px;padding:40px 32px;box-shadow:0 8px 30px rgba(31,41,51,0.07);text-align:center;">
        <div style="font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ff6b6b;">Meet Map</div>
        <h1 style="margin:14px 0 8px;font-size:26px;line-height:1.25;color:#1f2933;">${headlineFor(actionType)}</h1>
        <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#6b7280;">
          Enter this code on the sign-in screen.
        </p>
        <div style="margin:0 0 24px;">${digits}</div>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#9aa5b1;">
          Expires in about an hour, and only works once.
        </p>
      </div>
      <p style="margin:24px 8px 0;font-size:13px;line-height:1.6;color:#9aa5b1;text-align:center;">
        Didn't ask for this? You can safely ignore this email — nobody can sign in without the code.
      </p>
      <p style="margin:12px 8px 0;font-size:13px;line-height:1.6;color:#c2c9d1;text-align:center;">
        The little map of founders you actually know.
      </p>
    </div>
  </body>
</html>`;
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend rejected the message (${res.status}): ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Fail loudly at request time rather than silently sending nothing.
  if (!HOOK_SECRET || !RESEND_API_KEY) {
    console.error("Missing SEND_EMAIL_HOOK_SECRET or RESEND_API_KEY");
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: "Email hook is not configured" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let user: HookPayload["user"];
  let email_data: HookPayload["email_data"];

  // The hook secret is base64 prefixed with "v1,whsec_"; standardwebhooks wants
  // the bare base64.
  try {
    const wh = new Webhook(HOOK_SECRET.replace("v1,whsec_", ""));
    ({ user, email_data } = wh.verify(payload, headers) as HookPayload);
  } catch (error) {
    // A bad signature means the caller is not GoTrue. Reject without leaking why.
    console.error("Webhook signature verification failed", error);
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: "Invalid signature" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const actionType = email_data.email_action_type;

    // Secure Email Change issues two codes. Per the Supabase docs the naming is
    // reversed for backwards compatibility: `token` belongs to the CURRENT
    // address and `token_new` to the NEW one.
    if (actionType === "email_change" && user.new_email && email_data.token_new) {
      await sendViaResend(
        user.email,
        subjectFor(actionType, email_data.token),
        htmlBody(actionType, email_data.token),
        textBody(actionType, email_data.token),
      );
      await sendViaResend(
        user.new_email,
        subjectFor(actionType, email_data.token_new),
        htmlBody(actionType, email_data.token_new),
        textBody(actionType, email_data.token_new),
      );
    } else {
      await sendViaResend(
        user.email,
        subjectFor(actionType, email_data.token),
        htmlBody(actionType, email_data.token),
        textBody(actionType, email_data.token),
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("Send failed", message);
    // A non-2xx here makes GoTrue surface the failure to the client rather than
    // reporting a success the user will never receive.
    return new Response(JSON.stringify({ error: { http_code: 500, message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
