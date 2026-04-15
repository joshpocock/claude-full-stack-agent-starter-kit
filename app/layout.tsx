import type { Metadata } from "next";
import TabNav from "@/components/TabNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Managed Agents Dashboard",
  description: "Control panel for Anthropic Managed Agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TabNav />
        <main style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
