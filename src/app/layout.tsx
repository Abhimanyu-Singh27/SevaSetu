import type { Metadata } from "next";
import "./globals.css";
import { GlobalBackButton } from "@/components/GlobalBackButton";

export const metadata: Metadata = {
  title: "SevaSetu | Har Seva, Ek Setu",
  description: "Find trusted local service professionals near you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><GlobalBackButton />{children}</body>
    </html>
  );
}
