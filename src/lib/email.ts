type EmailMessage = { to: string; subject: string; html: string };

export async function sendEmail(message: EmailMessage) {
  const from = process.env.EMAIL_FROM;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  if ((!brevoApiKey && !resendApiKey) || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email preview] ${message.to}: ${message.subject}`);
      console.info(message.html);
      return;
    }
    throw new Error("Email delivery is not configured");
  }

  if (brevoApiKey) {
    const senderMatch = from.match(/^(.*)\s+<([^>]+)>$/);
    const sender = senderMatch ? { name: senderMatch[1].trim(), email: senderMatch[2] } : { email: from };
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender, to: [{ email: message.to }], subject: message.subject, htmlContent: message.html }),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("Brevo email delivery failed", response.status, details);
      throw new Error(`Brevo email delivery failed (${response.status})`);
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value && process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  return value || "http://localhost:3000";
}
