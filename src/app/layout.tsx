import type { Metadata } from "next";
import "./globals.css";
import { GlobalBackButton } from "@/components/GlobalBackButton";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getPortalLanguage } from "@/lib/portal-language";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "SevaSetu | Har Seva, Ek Setu",
  description: "Find trusted local service professionals near you.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const account = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { preferredLanguage: true } }) : null;
  const language = await getPortalLanguage(account?.preferredLanguage);
  return (
    <html lang={language}>
      <body><LanguageProvider initialLanguage={language} authenticated={Boolean(session)}><GlobalBackButton />{children}</LanguageProvider></body>
    </html>
  );
}
