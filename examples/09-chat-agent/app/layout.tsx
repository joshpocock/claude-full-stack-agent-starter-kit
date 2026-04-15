/**
 * Root layout for the Chat Agent demo.
 *
 * Sets up the dark theme (black background, white text) and
 * applies system fonts. All pages inherit this layout.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Agent - Starter Kit",
  description: "Multi-turn chat with Claude Managed Agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0a0a0a",
          color: "#e0e0e0",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
