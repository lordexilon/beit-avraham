"use client";

import React from 'react';
import { useSCA } from "@/lib/SCAContext";

export default function DashboardMain({ children }: { children: React.ReactNode }) {
  const { leftOpen, rightOpen } = useSCA();

  return (
    <main className={`flex-1 min-w-0 transition-all duration-300 ${leftOpen ? 'lg:ml-64' : 'lg:ml-12'} ${rightOpen ? 'xl:mr-64' : 'xl:mr-12'} p-4 md:p-6 space-y-6`}>
      {children}
    </main>
  );
}
