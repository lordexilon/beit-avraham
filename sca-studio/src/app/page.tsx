"use client";

import React from 'react';
import CycleBanner from '@/components/dashboard/CycleBanner';
import { TelemetryRow, PipelineRow, FinancialRow } from '@/components/dashboard/DashboardSections';
import { DashboardFooter } from '@/components/dashboard/DashboardFooter';
import SwarmDagView from '@/components/dashboard/SwarmDagView';
import HistoryView from '@/components/dashboard/HistoryView';
import BenchmarksView from '@/components/dashboard/BenchmarksView';
import FileViewerModal from '@/components/dashboard/FileViewerModal';
import { useSCA } from '@/lib/SCAContext';
import ManualIntervention from '@/components/dashboard/ManualIntervention';
import ModelsView from '@/components/dashboard/ModelsView';

export default function SCAStudio() {
  const { activeTab,dashboard } = useSCA();

  return (
    <>
      {activeTab === 'metrics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <CycleBanner />
          {dashboard?.measurement.active_cycle && <>
          <TelemetryRow />
          <PipelineRow />
          <FinancialRow />
          <DashboardFooter />
          <ManualIntervention />
          </>}
        </div>
      )}

      {activeTab === 'dag' && (
        <div className="animate-in fade-in duration-200">
          <SwarmDagView />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <CycleBanner />
          <HistoryView />
        </div>
      )}

      {activeTab === 'benchmarks' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <CycleBanner />
          <BenchmarksView />
        </div>
      )}

      {activeTab === 'models' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <CycleBanner />
          <ModelsView />
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal />
    </>
  );
}
