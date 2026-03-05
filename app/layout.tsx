import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WYDA Patron Escrow",
  description: "Patreon-style subscription DApp for WYDA on BSC.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
