import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Virtual Office — Live Workspace",
  description: "A live virtual office for teams, staff, rooms, tasks and day-to-day operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}