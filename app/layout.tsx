import type { Metadata } from "next";
import { Cinzel, DM_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MessengerRoot } from "@/components/messenger/MessengerRoot";

const display = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Treasure Atlas — Global Metal Detecting Platform",
    template: "%s | Treasure Atlas",
  },
  description:
    "Log GPS finds, research historical sites worldwide, connect with detectorists, and document your treasure hunting adventures.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${display.variable} ${sans.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-screen flex flex-col overflow-x-hidden`}
      >
        <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />
        <Navbar />
        <main className="relative flex-1 min-w-0 overflow-x-hidden">{children}</main>
        <Footer />
        <MessengerRoot />
      </body>
    </html>
  );
}
