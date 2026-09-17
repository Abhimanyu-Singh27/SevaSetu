import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SevaSetu | Har Seva, Ek Setu",
  description: "Find trusted local service professionals near you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
