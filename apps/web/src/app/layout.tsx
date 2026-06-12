import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Cormorant_Garamond, JetBrains_Mono, Manrope } from "next/font/google";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700", "800"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-heading", weight: ["500", "600", "700"] });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "700"] });
const cinzelDecorative = Cinzel_Decorative({ subsets: ["latin"], variable: "--font-cinzel-decorative", weight: ["400", "700", "900"] });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Cortex | Engineering OS", template: "%s | Cortex Engineering OS" },
  description: "AI-native engineering workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${manrope.variable} ${cormorant.variable} ${jet.variable} ${cinzelDecorative.variable} ${cinzel.variable} font-sans antialiased`}>
        <QueryProvider>
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
