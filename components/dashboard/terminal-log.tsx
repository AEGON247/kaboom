"use client";

import * as React from "react";
import { Terminal, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LogEntry = {
  id: string;
  status: number;
  durationMs: number;
  output: string | null;
  timestamp: string;
};

export function TerminalLog({ logs }: { logs: LogEntry[] }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full min-h-[400px] bg-[#0D0D0D] border-4 border-ink-border shadow-[8px_8px_0px_0px_var(--color-shadow)] overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-cyan" />
          <span className="font-space text-xs uppercase tracking-widest text-white/60">Execution_Stream.log</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="flex-grow p-6 font-mono text-sm overflow-y-auto custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
            <span className="animate-pulse font-space uppercase">Waiting for first strike...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {logs.slice().reverse().map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col gap-1 pb-3 border-b border-white/5 ${i === 0 ? 'bg-white/5 -mx-2 px-2 py-2 rounded-sm border-l-2 border-l-brand-cyan' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-[10px] w-16 shrink-0 font-space">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {log.status === 200 ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-brand-success/10 text-brand-success text-[10px] font-bold border border-brand-success/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>200 OK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-brand-error/10 text-brand-error text-[10px] font-bold border border-brand-error/20">
                          <XCircle className="w-3 h-3" />
                          <span>{log.status} ERR</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-white/50 text-[10px] font-space uppercase">
                      <Clock className="w-3 h-3" />
                      {log.durationMs}ms
                    </div>
                  </div>

                  {log.output && (
                    <div className="pl-[88px] text-brand-cyan/70 break-all leading-tight text-[12px]">
                      {log.output}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="flex items-center gap-2 text-white/20 pt-2 italic">
               <span className="animate-pulse">_</span>
               <span className="text-[10px] font-space uppercase tracking-tighter">end of stream</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
