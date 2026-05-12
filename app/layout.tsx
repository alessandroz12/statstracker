import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Austria Wien Stats",
  description: "Dashboard und Statistiken fuer die Austria Wien Saison.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
