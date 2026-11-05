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
};

/** Provider switch: EMAIL_PROVIDER=resend | ses (default ses). */
export async function sendEmail(a: SendArgs): Promise<string> {
  if ((process.env.EMAIL_PROVIDER ?? "ses") === "resend") {
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
