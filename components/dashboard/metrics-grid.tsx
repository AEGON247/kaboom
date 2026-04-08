"use client";

import { PanelCard } from "@/components/ui/panel-card";
import { Activity, Server, Cpu, Database } from "lucide-react";
import { motion } from "framer-motion";

function Sparkline({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12 mt-2 opacity-50">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function MetricsGrid({ 
  totalRuns, 
  successRate, 
  avgLatency, 
  status 
}: { 
  totalRuns: number, 
  successRate: string, 
  avgLatency: string, 
  status: string 
}) {

  const cpuData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 40) + 10);
  const memData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 60);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <PanelCard bgColor="base" className="p-6 h-full flex flex-col justify-between" hoverEffect>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="font-space text-xs uppercase opacity-50 tracking-widest mb-1">Status_Monitor</span>
            <div className="flex items-center gap-2">
              <div className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'active' ? 'bg-brand-success' : 'bg-brand-error'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'active' ? 'bg-brand-success' : 'bg-brand-error'}`}></span>
              </div>
              <span className="font-space text-xl font-bold uppercase">{status}</span>
            </div>
          </div>
          <Activity className="w-5 h-5 opacity-30" />
        </div>
        <div className="text-xs uppercase font-space opacity-40 mt-auto">Heartbeat_Active</div>
      </PanelCard>

      <PanelCard bgColor="base" className="p-6 h-full flex flex-col justify-between" hoverEffect>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="font-space text-xs uppercase opacity-50 tracking-widest mb-1">Avg_Latency</span>
            <span className="font-space text-4xl">{avgLatency}</span>
          </div>
          <Cpu className="w-5 h-5 opacity-30 text-brand-cyan" />
        </div>
        <Sparkline data={cpuData} color="var(--color-brand-cyan)" />
      </PanelCard>

      <PanelCard bgColor="base" className="p-6 h-full flex flex-col justify-between" hoverEffect>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="font-space text-xs uppercase opacity-50 tracking-widest mb-1">Requests_Processed</span>
            <span className="font-space text-4xl">{totalRuns}</span>
          </div>
          <Database className="w-5 h-5 opacity-30 text-brand-yellow" />
        </div>
        <div className="text-[10px] font-mono opacity-40 mt-auto">Batch_Buffer: 0.2MB</div>
      </PanelCard>

      <PanelCard bgColor="base" className="p-6 h-full flex flex-col justify-between" hoverEffect>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="font-space text-xs uppercase opacity-50 tracking-widest mb-1">Success_Efficiency</span>
            <span className="font-space text-4xl">{successRate}</span>
          </div>
          <Server className="w-5 h-5 opacity-30 text-brand-magenta" />
        </div>
        <Sparkline data={memData} color="var(--color-brand-magenta)" />
      </PanelCard>
    </div>
  );
}
