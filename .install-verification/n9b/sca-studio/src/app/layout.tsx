import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import TopHeader from "@/components/layout/TopHeader";
import SubNavbar from "@/components/layout/SubNavbar";
import KnowledgeBaseSidebar from "@/components/layout/KnowledgeBaseSidebar";
import McpManagerSidebar from "@/components/layout/McpManagerSidebar";
import DashboardMain from "@/components/layout/DashboardMain";
import ClientOnly from "@/components/layout/ClientOnly";
import { SCAProvider } from "@/lib/SCAContext";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCA Studio v3.0 Hybrid",
  description: "SCA Framework Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className={`${jakarta.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen flex flex-col bg-[#090a0f] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200`} suppressHydrationWarning>
        <ClientOnly>
          <SCAProvider>
            <TopHeader />
            <SubNavbar />
            <div className="pt-[100px] flex-1 flex w-full">
              <KnowledgeBaseSidebar />
              <McpManagerSidebar />
              <DashboardMain>
                {children}
              </DashboardMain>
            </div>
          </SCAProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
