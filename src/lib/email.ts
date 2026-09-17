type EmailMessage = { to: string; subject: string; html: string };

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email preview] ${message.to}: ${message.subject}`);
      console.info(message.html);
      return;
    }
    throw new Error("Email delivery is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value && process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  return value || "http://localhost:3000";
}
