'use client';
import * as React from 'react';
import Link from 'next/link';
import { PanelCard } from '@/components/ui/panel-card';
import { CTAButton } from '@/components/ui/button';
import { CaptionBox } from '@/components/ui/caption-box';
import { Zap, Box, FileCode, Container } from 'lucide-react';

type FunctionItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  endpoint: string | null;
  _count: { logs: number };
};

const typeIcon: Record<string, React.ReactNode> = {
  snippet: <FileCode className="w-5 h-5" strokeWidth={2.5} />,
  function: <Box className="w-5 h-5" strokeWidth={2.5} />,
  container: <Container className="w-5 h-5" strokeWidth={2.5} />,
};

const typeColor: Record<string, string> = {
  snippet: 'bg-[var(--brand-cyan)] text-black',
  function: 'bg-[var(--brand-yellow)] text-black',
  container: 'bg-[var(--brand-magenta)] text-black',
};

export default function DashboardPage() {
  const [functions, setFunctions] = React.useState<FunctionItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/functions')
      .then((r) => r.json())
      .then((d) => {
        setFunctions(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-8 md:p-12">
      <CaptionBox variant="magenta" className="mb-8">
        THE LAIR
      </CaptionBox>

      <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
        <h1
          className="text-5xl md:text-7xl"
          style={{ WebkitTextStroke: '2px var(--ink-border)', color: 'var(--brand-yellow)' }}
        >
          ALL GADGETS
        </h1>
        <Link href="/">
          <CTAButton variant="secondary">
            <Zap className="w-5 h-5" strokeWidth={3} />
            Deploy New
          </CTAButton>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="font-space text-3xl animate-pulse opacity-50">LOADING GADGETS...</p>
        </div>
      )}

      {!loading && functions.length === 0 && (
        <PanelCard
          bgColor="none"
          className="border-dashed border-4 border-[var(--ink-border)] items-center text-center py-24 shadow-none"
        >
          <h2 className="text-4xl mb-4 opacity-40">NOTHING DEPLOYED YET</h2>
          <p className="opacity-40 text-lg font-semibold mb-8">
            This sector is empty. Send in the first gadget.
          </p>
          <Link href="/">
            <CTAButton variant="primary">Launch Workbench</CTAButton>
          </Link>
        </PanelCard>
      )}

      {!loading && functions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {functions.map((fn) => (
            <Link key={fn.id} href={`/dashboard/${fn.id}`} className="block group">
              <PanelCard
                hoverEffect
                bgColor="base"
                className="h-full gap-4 cursor-pointer"
              >
                 {/* Type badge */}
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-space font-bold uppercase border-2 border-[var(--ink-border)] ${typeColor[fn.type] || 'bg-[var(--bg-base)]'} text-black dark:text-white`}
                  >
                    {typeIcon[fn.type]}
                    {fn.type}
                  </span>
                  <span
                    className={`ml-auto px-3 py-1 text-xs font-space font-bold uppercase border-2 border-[var(--ink-border)] ${fn.status === 'active' ? 'bg-[var(--brand-success)]' : 'bg-[var(--brand-error)]'} text-black dark:text-white`}
                  >
                    {fn.status}
                  </span>
                </div>

                <h3 className="text-2xl break-all">{fn.name}</h3>
                <p className="text-sm font-semibold opacity-50 font-mono break-all">
                  {fn.endpoint ?? '—'}
                </p>

                <div className="mt-auto pt-4 border-t-4 border-[var(--ink-border)] flex justify-between items-center">
                  <span className="font-space text-sm uppercase opacity-60">
                    {fn._count.logs} executions
                  </span>
                  <span className="font-space text-sm uppercase opacity-60">
                    {new Date(fn.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </PanelCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
