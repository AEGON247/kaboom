'use client';
import * as React from 'react';
import Link from 'next/link';
import { PanelCard } from '@/components/ui/panel-card';
import { CTAButton } from '@/components/ui/button';
import { CaptionBox } from '@/components/ui/caption-box';
import { CheckCircle, XCircle, Clock, ExternalLink, Zap, Activity, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';

type LogEntry = {
  id: string;
  status: number;
  durationMs: number;
  output: string | null;
  timestamp: string;
};

type FunctionDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  endpoint: string | null;
  publicUrl: string | null;
  code: string;
  githubRepo: string | null;
  envVars: string | null;
  logs: LogEntry[];
};

type BarrageResult = {
  total: number;
  success: number;
  failed: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
};

import { TerminalLog } from '@/components/dashboard/terminal-log';
import { MetricsGrid } from '@/components/dashboard/metrics-grid';

export default function FunctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [fn, setFn] = React.useState<FunctionDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [barrageRunning, setBarrageRunning] = React.useState(false);
  const [barrageResult, setBarrageResult] = React.useState<BarrageResult | null>(null);
  const [barrageProgress, setBarrageProgress] = React.useState(0);
  const [testOutput, setTestOutput] = React.useState<string | null>(null);
  const [testStatus, setTestStatus] = React.useState<number | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const [showSecrets, setShowSecrets] = React.useState<Record<number, boolean>>({});
  
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [isUpdatingName, setIsUpdatingName] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");

  React.useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const loadFn = React.useCallback(async () => {
    const res = await fetch(`/api/logs/${id}`);
    if (res.ok) {
      const data = await res.json();
      setFn(data);
      if (!isEditingName) setNewName(data.name);
    }
    setLoading(false);
  }, [id, isEditingName]);

  React.useEffect(() => {
    loadFn();
    const interval = setInterval(loadFn, 4000); // Auto refresh
    return () => clearInterval(interval);
  }, [loadFn]);

  const handleDelete = async () => {
    if (deleteConfirm !== fn?.name) return;
    try {
      const res = await fetch(`/api/functions/${id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        alert("Failed to delete gadget");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting gadget");
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === fn?.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdatingName(true);
    try {
      const res = await fetch(`/api/functions/${id}/rename`, {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        await loadFn();
        setIsEditingName(false);
      } else {
        alert("Failed to rename gadget");
      }
    } catch (e) {
      console.error(e);
      alert("Error renaming gadget");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleTest = async () => {
    if (!fn?.endpoint) return;
    setIsTesting(true);
    setTestOutput(null);
    try {
      const res = await fetch(fn.endpoint);
      const text = await res.text();
      setTestStatus(res.status);
      setTestOutput(text);
    } catch (e: unknown) {
      setTestStatus(500);
      setTestOutput(e instanceof Error ? e.message : 'error');
    }
    setIsTesting(false);
    await loadFn();
  };

  const handleBarrage = async () => {
    if (!fn?.endpoint) return;
    setBarrageRunning(true);
    setBarrageResult(null);
    setBarrageProgress(0);

    const TOTAL = 50;
    const results: { ok: boolean; ms: number }[] = [];

    const runOne = async () => {
      const t = Date.now();
      try {
        const res = await fetch(fn.endpoint!);
        results.push({ ok: res.ok, ms: Date.now() - t });
      } catch {
        results.push({ ok: false, ms: Date.now() - t });
      }
      setBarrageProgress(Math.round((results.length / TOTAL) * 100));
    };

    for (let i = 0; i < TOTAL; i += 10) {
      await Promise.all(Array.from({ length: 10 }, runOne));
    }

    const success = results.filter((r) => r.ok).length;
    const times = results.map((r) => r.ms);
    setBarrageResult({
      total: TOTAL,
      success,
      failed: TOTAL - success,
      avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
    });
    setBarrageRunning(false);
    await loadFn();
  };

  if (loading)
    return (
      <div className="max-w-7xl mx-auto p-12 flex items-center justify-center h-64">
        <p className="font-space text-3xl animate-pulse opacity-50 uppercase">Accessing_Lair...</p>
      </div>
    );

  if (!fn)
    return (
      <div className="max-w-7xl mx-auto p-12">
        <PanelCard bgColor="error" className="items-center text-center">
          <h2 className="text-4xl text-black uppercase font-space">Gadget_Offline</h2>
          <Link href="/dashboard">
            <CTAButton variant="ghost" className="mt-6 border-black text-black">Back to Dashboard</CTAButton>
          </Link>
        </PanelCard>
      </div>
    );

  const successLogs = fn.logs.filter((l) => l.status === 200).length;
  const avgDuration =
    fn.logs.length > 0
      ? Math.round(fn.logs.reduce((a, l) => a + l.durationMs, 0) / fn.logs.length)
      : 0;

  const liveUrl =
    fn.publicUrl ||
    (origin && fn.endpoint ? `${origin}${fn.endpoint}` : (fn.endpoint ?? ""));

  return (
    <div className="max-w-7xl mx-auto p-8 md:p-12">
      <div className="mb-4">
        <Link href="/dashboard" className="font-space uppercase text-sm opacity-60 hover:opacity-100 transition-opacity">
          ← Back to Lair
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex flex-col gap-2 group relative">
          <CaptionBox variant="yellow" className="self-start">
            GADGET DETAIL
          </CaptionBox>
          <div className="flex items-center gap-4">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="text-4xl md:text-6xl uppercase tabular-nums bg-transparent border-b-4 border-brand-cyan outline-none text-brand-cyan font-space min-w-[300px]"
                />
                <button 
                  onClick={handleRename} 
                  disabled={isUpdatingName}
                  className="p-2 bg-brand-success text-black border-4 border-ink-border shadow-[4px_4px_0px_0px_var(--color-shadow)]"
                >
                  <Check className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => { setIsEditingName(false); setNewName(fn.name); }}
                  className="p-2 bg-brand-error text-black border-4 border-ink-border shadow-[4px_4px_0px_0px_var(--color-shadow)]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <h1
                  className="text-5xl md:text-7xl uppercase tabular-nums"
                  style={{ WebkitTextStroke: '2px var(--ink-border)', color: 'var(--color-brand-cyan)' }}
                >
                  {fn.name}
                </h1>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="opacity-20 group-hover:opacity-100 transition-opacity p-2 hover:bg-brand-cyan/10 rounded-sm"
                  title="Rename Gadget"
                >
                  <Pencil className="w-6 h-6 text-brand-cyan" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-brand-yellow text-black dark:text-white font-space uppercase border-4 border-ink-border px-6 py-3 shadow-[6px_6px_0px_0px_var(--color-shadow)]">
          <CheckCircle className="w-5 h-5" />
          <span>{fn.type}</span>
        </div>
      </div>

      <MetricsGrid 
        totalRuns={fn.logs.length}
        successRate={fn.logs.length ? `${Math.round((successLogs / fn.logs.length) * 100)}%` : '0%'}
        avgLatency={fn.logs.length ? `${avgDuration}ms` : '—'}
        status={fn.status}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: code + endpoint */}
        <div className="lg:col-span-3 flex flex-col gap-8">
          {/* Endpoint URL and Testing */}
          <PanelCard bgColor="base" className="gap-6" hoverEffect>
            <div className="flex justify-between items-center bg-black/5 p-4 border-l-4 border-l-brand-cyan">
              <div className="flex flex-col">
                 <span className="font-space uppercase text-xs opacity-50 tracking-tighter mb-1">Live_Endpoint</span>
                 <code className="font-mono text-sm break-all text-brand-magenta font-bold">
                    {liveUrl}
                 </code>
              </div>
              <a
                href={(liveUrl || fn.endpoint) || '#'}
                target="_blank"
                rel="noreferrer"
                className="p-3 border-4 border-ink-border bg-brand-cyan text-black shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-shadow)] transition-all"
              >
                <ExternalLink className="w-5 h-5" strokeWidth={2.5} />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-2.5">
              <CTAButton variant="primary" onClick={handleTest} disabled={isTesting} className="flex-1 text-lg">
                <Zap className="w-5 h-5" strokeWidth={3} />
                {isTesting ? 'FIRING...' : 'TRIGGER GADGET'}
              </CTAButton>
              <CTAButton variant="secondary" onClick={handleBarrage} disabled={barrageRunning} className="flex-1">
                <Activity className="w-5 h-5" />
                STRESS TEST
              </CTAButton>
            </div>

            {testOutput && (
              <div className={`border-4 border-ink-border p-4 shadow-[4px_4px_0px_0px_var(--color-shadow)] font-mono text-xs break-all ${testStatus === 200 ? 'bg-brand-success/10 border-brand-success/50' : 'bg-brand-error/10 border-brand-error/50'}`}>
                <div className="flex justify-between items-center mb-2">
                   <span className="font-space font-bold uppercase block px-1.5 py-0.5 bg-black/10 text-ink-text">HTTP {testStatus}</span>
                   <span className="text-[10px] opacity-40 uppercase">Gadget_Response</span>
                </div>
                <div className="text-ink-text opacity-80 max-h-40 overflow-auto p-2 bg-black/5">
                   {testOutput}
                </div>
              </div>
            )}
          </PanelCard>

          {/* Code Preview */}
          <PanelCard bgColor="none" className="p-0 bg-[#0D0D0D] overflow-hidden" hoverEffect>
             <div className="flex items-center justify-between px-6 py-3 border-b-4 border-ink-border bg-[#1A1A1A]">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-brand-cyan opacity-50" />
                   <span className="font-space text-xs uppercase tracking-widest text-white/40">Source_Module</span>
                </div>
                {fn.githubRepo && (
                  <span className="font-mono text-[10px] text-brand-cyan/60">github: {fn.githubRepo}</span>
                )}
             </div>
             <pre className="p-8 text-[13px] font-mono text-cyan-200/80 overflow-auto max-h-[300px] leading-relaxed custom-scrollbar bg-black/40">
               {fn.code}
             </pre>
          </PanelCard>

          {/* Config Preview */}
          <PanelCard bgColor="base" className="border-4 border-ink-border border-dashed gap-4" hoverEffect>
            <h3 className="text-xl font-space uppercase border-b-4 border-ink-border pb-2 text-ink-text">Deployment_Env</h3>
            <div className="flex flex-col gap-6 mt-2">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-space uppercase text-[10px] opacity-40 block font-bold">Environment_Variables</span>
                  <button 
                    onClick={() => setShowSecrets(prev => ({ ...prev, [999]: !prev[999] }))}
                    className="text-[10px] font-space uppercase opacity-40 hover:opacity-100 flex items-center gap-1 transition-opacity"
                  >
                    {showSecrets[999] ? <><EyeOff className="w-3 h-3" /> Hide All</> : <><Eye className="w-3 h-3" /> Reveal All</>}
                  </button>
                </div>
                {fn.envVars && JSON.parse(fn.envVars).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {JSON.parse(fn.envVars).map((env: {key: string, value: string}, i: number) => (
                      <div key={i} className="flex flex-col border-2 border-ink-border/20 p-3 bg-black/5 hover:bg-black/10 transition-colors group">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-[10px] uppercase opacity-40">{env.key}</span>
                          <button 
                            onClick={() => setShowSecrets(prev => ({ ...prev, [i]: !prev[i] }))}
                            className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                          >
                            { (showSecrets[i] || showSecrets[999]) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" /> }
                          </button>
                        </div>
                        <span className="font-mono text-sm font-bold text-ink-text truncate">
                          {(showSecrets[i] || showSecrets[999]) ? env.value : '••••••••••••'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-black/5 p-4 text-center font-space text-xs uppercase opacity-30 italic">No Environment Variables</div>
                )}
              </div>
            </div>
          </PanelCard>
        </div>

        {/* Right: Barrage + logs */}
        <div className="lg:col-span-2 flex flex-col gap-8">
           {/* Terminal Stream */}
          <div className="h-full">
            <TerminalLog logs={fn.logs} />
          </div>

          {/* Barrage Result Result Panel */}
          {barrageResult && !barrageRunning && (
            <PanelCard bgColor="magenta" className="gap-6 animate-in slide-in-from-right duration-500" showDots={true}>
               <h3 className="text-2xl text-black font-space uppercase">Stress_Test_Report</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col border-2 border-black/10 p-3">
                     <span className="text-[10px] uppercase opacity-50">Throughput</span>
                     <span className="text-2xl font-space">{barrageResult.success}/{barrageResult.total}</span>
                  </div>
                  <div className="flex flex-col border-2 border-black/10 p-3">
                     <span className="text-[10px] uppercase opacity-50">Efficiency</span>
                     <span className="text-2xl font-space">{Math.round((barrageResult.success / barrageResult.total) * 100)}%</span>
                  </div>
               </div>
               <div className="w-full border-4 border-black h-8 mt-2 overflow-hidden flex bg-black/10">
                  <div
                    className="h-full bg-brand-success shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                    style={{ width: `${(barrageResult.success / barrageResult.total) * 100}%` }}
                  />
                  <div className="h-full bg-brand-error flex-grow" />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-black/60 font-bold">
                   <span>min {barrageResult.minMs}ms</span>
                   <span>avg {barrageResult.avgMs}ms</span>
                   <span>max {barrageResult.maxMs}ms</span>
                </div>
            </PanelCard>
          )}

          {/* Quick Actions Card */}
          <PanelCard bgColor="base" className="gap-4">
             <span className="font-space text-xs uppercase opacity-50">Quick_Commands</span>
             <div className="grid grid-cols-2 gap-3">
                <CTAButton variant="ghost" className="text-xs py-2 shadow-[2px_2px_0px_0px_var(--shadow-color)]" disabled>PAUSE</CTAButton>
                <CTAButton variant="ghost" className="text-xs py-2 shadow-[2px_2px_0px_0px_var(--shadow-color)]" disabled>SCALE</CTAButton>
                <CTAButton 
                  variant="primary" 
                  className="text-xs py-2 col-span-2 shadow-[2px_2px_0px_0px_var(--shadow-color)] bg-brand-error text-black border-black hover:bg-brand-error/90" 
                  onClick={() => setIsDeleting(true)}
                >
                  DELETE GADGET
                </CTAButton>
             </div>
          </PanelCard>
        </div>
      </div>

      {/* Deletion Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <PanelCard bgColor="base" className="max-w-md w-full gap-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-space uppercase text-brand-error">Destroy Gadget?</h3>
              <button onClick={() => setIsDeleting(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="font-space text-sm opacity-60 leading-relaxed">
              This action is <span className="text-brand-error font-bold underline">permanent</span>.
              To confirm destruction, please type the full name of the gadget below:
            </p>
            
            <div className="bg-black/5 p-3 border-2 border-dashed border-ink-border/20 text-center select-none">
              <span className="font-mono font-bold text-lg text-ink-text">{fn.name}</span>
            </div>

            <input
              autoFocus
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type name here..."
              className="w-full bg-transparent border-b-4 border-brand-error outline-none p-2 font-mono text-xl text-brand-error placeholder:opacity-20"
            />

            <div className="flex gap-4">
              <CTAButton variant="ghost" className="flex-1" onClick={() => setIsDeleting(false)}>Cancel</CTAButton>
              <CTAButton 
                variant="primary" 
                className="flex-3 bg-brand-error text-black border-black disabled:opacity-30" 
                disabled={deleteConfirm !== fn.name}
                onClick={handleDelete}
              >
                PROCEED WITH DELETION
              </CTAButton>
            </div>
          </PanelCard>
        </div>
      )}
    </div>
  );
}
