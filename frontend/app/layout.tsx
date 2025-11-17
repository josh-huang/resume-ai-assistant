import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Assistant",
  description: "Ask natural-language questions about Jiashu's resume.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
