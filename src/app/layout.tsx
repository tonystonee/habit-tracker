import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSansHeading = DM_Sans({subsets:['latin'],variable:'--font-heading'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Daily habit tracking dashboard powered by Notion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", outfit.variable, dmSansHeading.variable)}>
      <body className={mono.variable} suppressHydrationWarning>{children}</body>
    </html>
  );
}
