import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export const ses = new SESv2Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" });

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  unsubscribeUrl?: string;
  tags?: Record<string, string>;
  /** Override the default provider for this send. */
  provider?: Provider | null;
};

export type Provider = "resend" | "ses";
let cached: { v: Provider; at: number } | null = null;
/** Default provider: settings.email_provider (set in the app), falling back to EMAIL_PROVIDER env. */
export async function defaultProvider(): Promise<Provider> {
  if (cached && Date.now() - cached.at < 60_000) return cached.v;
  let v: string | null = null;
  try { const { getSetting } = await import("@/lib/settings"); v = await getSetting("email_provider"); } catch {}
  const p: Provider = (v ?? process.env.EMAIL_PROVIDER ?? "ses") === "resend" ? "resend" : "ses";
  cached = { v: p, at: Date.now() }; return p;
}
/** Campaign "Send via" values: null (default), "resend", "ses", or a warm-up split "ses10" / "ses25" / "ses50" (= that % via Amazon SES, rest via Resend). */
export const PROVIDER_CHOICES = ["resend", "ses", "ses10", "ses25", "ses50"];
/** Which provider this recipient gets. The split is by contact id, so the same person always lands on the same side. */
export function resolveProvider(setting: string | null | undefined, contactId: number | string): Provider | null {
  if (setting === "ses" || setting === "resend") return setting;
  const m = /^ses(\d+)$/.exec(setting ?? ""); if (!m) return null;
  return Number(contactId) % 100 < Number(m[1]) ? "ses" : "resend";
}
/** For test sends: only a fixed choice overrides the default (a split has no single answer). */
export const fixedProvider = (setting: string | null | undefined): Provider | undefined => (setting === "ses" || setting === "resend" ? setting : undefined);
export const providerLabel = (p: string | null | undefined) => (p === "ses" ? "Amazon SES" : p === "resend" ? "Resend" : "Default");

/** Sends via a.provider, else the app default (Resend and SES both live). */
export async function sendEmail(a: SendArgs): Promise<string> {
  const p = a.provider ?? (await defaultProvider());
  if (p === "resend") {
    const { resendSend } = await import("@/lib/resend");
    return resendSend(a);
  }
  return sesSend(a);
}

async function sesSend(a: SendArgs) {
  const fromEmail = a.fromEmail ?? process.env.SES_FROM_EMAIL!;
  const fromName = a.fromName ?? "Bluebells Cakery";
  const headers = a.unsubscribeUrl
    ? [
        { Name: "List-Unsubscribe", Value: `<${a.unsubscribeUrl}>` },
        { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
      ]
    : [];
  const res = await ses.send(
    new SendEmailCommand({
      FromEmailAddress: `${fromName} <${fromEmail}>`,
      Destination: { ToAddresses: [a.to] },
      ReplyToAddresses: a.replyTo ? [a.replyTo] : undefined,
      ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
      EmailTags: a.tags ? Object.entries(a.tags).map(([Name, Value]) => ({ Name, Value })) : undefined,
      Content: {
        Simple: {
          Subject: { Data: a.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: a.html, Charset: "UTF-8" },
            Text: a.text ? { Data: a.text, Charset: "UTF-8" } : undefined,
          },
          Headers: headers,
        },
      },
    }),
  );
  return res.MessageId!;
}
