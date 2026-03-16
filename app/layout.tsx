import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Financial Management System",
  description:
    "Multi-tenant SaaS financial management for educational institutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
