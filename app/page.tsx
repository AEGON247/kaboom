"use client"
import * as React from "react"
import { PanelCard } from "@/components/ui/panel-card"
import { CTAButton } from "@/components/ui/button"
import { CaptionBox } from "@/components/ui/caption-box"
import Editor from '@monaco-editor/react';
import { useRouter } from "next/navigation"
import { GitBranch, AlertTriangle, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const DEFAULT_CODE = `module.exports = async function run(req) {
  return {
    success: true,
    message: 'KABOOM! Serverless, baby.',
    timestamp: new Date().toISOString(),
    envKeys: Object.keys(process.env).filter(k => !k.startsWith('npm_')),
  };
}`;

export default function Workbench() {
  const [activeTab, setActiveTab] = React.useState<"snippet" | "function" | "container">("snippet");
  const [code, setCode] = React.useState(DEFAULT_CODE);
  const [containerTag, setContainerTag] = React.useState("");
  const [containerExposePort, setContainerExposePort] = React.useState("8080");
  const [zipFile, setZipFile] = React.useState<File | null>(null);
  const [envFile, setEnvFile] = React.useState<File | null>(null);
  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const envInputRef = React.useRef<HTMLInputElement>(null);
  const [githubRepo, setGithubRepo] = React.useState("");
  const [envVars, setEnvVars] = React.useState<{ key: string, value: string }[]>([{ key: '', value: '' }]);
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [gitImportError, setGitImportError] = React.useState<string | null>(null);
  const [gitImportedFrom, setGitImportedFrom] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [deployedId, setDeployedId] = React.useState<string | null>(null);
  const [deployedPublicUrl, setDeployedPublicUrl] = React.useState<string | null>(null);

  const router = useRouter();

  const handleGithubImport = async () => {
    if (!githubRepo.trim() || !githubRepo.includes('/')) return;
    setIsFetching(true);
    setGitImportError(null);
    setGitImportedFrom(null);
    try {
      const res = await fetch(`/api/github-import?repo=${encodeURIComponent(githubRepo.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setGitImportError(data.error || 'Failed to import from GitHub');
      } else {
        setCode(data.code);
        setActiveTab("snippet");
        setGitImportedFrom(data.source);
      }
    } catch {
      setGitImportError('Network error — could not reach GitHub');
    }
    setIsFetching(false);
  };

  const handleDeploy = async () => {
    if (activeTab === "function" && !zipFile) {
      alert("Function deployment requires a ZIP file (package.json + entry).");
      return;
    }
    if (activeTab === "container" && !containerTag.trim()) {
      alert("Container deployment requires a Docker image tag.");
      return;
    }

    setIsDeploying(true);
    let payloadCode = code;
    if (activeTab === "container") payloadCode = containerTag.trim();
    if (activeTab === "function") payloadCode = zipFile ? zipFile.name : "";

    try {
      const fd = new FormData();
      fd.append("type", activeTab);
      fd.append("code", payloadCode);
      if (githubRepo.trim()) fd.append("githubRepo", githubRepo.trim());
      fd.append(
        "envVars",
        JSON.stringify(envVars.filter((e) => e.key.trim() !== ""))
      );
      fd.append("containerExposePort", containerExposePort || "8080");
      if (zipFile) fd.append("zip", zipFile);
      if (envFile) fd.append("envFile", envFile);

      const res = await fetch("/api/deploy", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        alert(`Deployment failed: ${errData.error || res.statusText}`);
        setIsDeploying(false);
        return;
      }

      const data = await res.json() as { id?: string; publicUrl?: string };
      if (data.id) {
        setDeployedId(data.id);
        setDeployedPublicUrl(data.publicUrl ?? null);
        setShowModal(true);
      }
    } catch (e) {
      console.error(e);
      alert("Network error during deployment");
    }
    setIsDeploying(false);
  };

  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...envVars];
    next[i][field] = val;
    setEnvVars(next);
  };

  const removeEnvVar = (i: number) => {
    if (envVars.length === 1) { setEnvVars([{ key: '', value: '' }]); return; }
    setEnvVars(envVars.filter((_, idx) => idx !== i));
  };

  const deployBtnLabel = () => {
    if (isDeploying) return "ZAPPING...";
    if (isFetching) return "PULLING...";
    if (githubRepo.trim() && !gitImportedFrom) return "PULL & ZAP";
    return "ZAP IT!";
  };

  const handleZap = async () => {
    if (githubRepo.trim() && !gitImportedFrom) {
      await handleGithubImport();
    }
    await handleDeploy();
  };

  return (
    <div className="max-w-7xl mx-auto p-8 md:p-12 relative">
      <CaptionBox variant="yellow" className="mb-8">THE WORKBENCH</CaptionBox>
      <h1
        className="text-5xl md:text-7xl text-brand-cyan mb-4"
        style={{ WebkitTextStroke: "2px var(--ink-border)" }}
      >
        DEPLOY A GADGET
      </h1>
      <p className="text-xl max-w-2xl mb-12 opacity-90">
        Snippets, Node bundles from ZIP, or Docker images — each gets a real HTTP endpoint on this host.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex gap-3 flex-wrap">
            {(["snippet", "function", "container"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 font-space text-base uppercase border-4 border-ink-border shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-shadow)] transition-all ${activeTab === tab
                  ? `bg-brand-yellow text-black ${tab === 'function' ? 'dark:text-black' : ''}`
                  : 'bg-background-panel text-[var(--ink-text)]'
                  }`}
              >
                {tab === "function" ? "Function (.ZIP)" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {gitImportedFrom && (
            <div 
               className="flex items-center gap-3 border-4 px-5 py-3 shadow-[4px_4px_0px_0px_var(--tooltip-border)]"
               style={{ backgroundColor: 'var(--tooltip-bg)', borderColor: 'var(--tooltip-border)' }}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={2.5} style={{ color: 'var(--tooltip-text)' }} />
              <span className="font-mono text-sm font-bold text-ink-text">
                Imported from <span style={{ color: 'var(--tooltip-text)' }}>{gitImportedFrom.split('githubusercontent.com/')[1]}</span>
              </span>
            </div>
          )}
          {gitImportError && (
            <div className="flex items-center gap-3 border-4 border-brand-error bg-red-50 dark:bg-red-950/20 px-5 py-3 shadow-[4px_4px_0px_0px_var(--color-brand-error)]">
              <AlertTriangle className="w-5 h-5 text-brand-error shrink-0" strokeWidth={2.5} />
              <span className="font-mono text-sm font-bold text-ink-text">{gitImportError}</span>
            </div>
          )}

          <PanelCard bgColor="none" className="p-0 overflow-hidden flex flex-col bg-[#1E1E1E]" style={{ minHeight: '480px' }}>
            {activeTab === "snippet" && (
              <Editor
                height="480px"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onChange={(val) => { setCode(val || ""); setGitImportedFrom(null); }}
                options={{ minimap: { enabled: false }, fontSize: 15, padding: { top: 20 }, scrollBeyondLastLine: false }}
              />
            )}
            {activeTab === "function" && (
              <div className="flex-grow flex flex-col items-center justify-center p-12 border-4 border-dashed border-[#555] m-8 bg-background-base text-ink-text">
                <h3 className="text-3xl mb-2 font-space uppercase">ZIP bundle</h3>
                <p className="opacity-60 font-semibold mb-6 text-sm text-center max-w-md">
                  Upload a zip with <code>package.json</code> and a <code>main</code> entry (e.g. <code>index.js</code>) exporting an async function handler via <code>module.exports</code>.
                  The server runs <code>npm install</code> and invokes your handler with deployment env (like Vercel).
                </p>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setZipFile(f ?? null);
                  }}
                />
                {zipFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 bg-brand-success text-black px-5 py-3 border-2 border-black font-mono font-bold shadow-[4px_4px_0px_0px_#0D0D0D]">
                      <CheckCircle2 className="w-5 h-5" />
                      {zipFile.name}
                    </div>
                    <CTAButton
                      type="button"
                      variant="ghost"
                      onClick={() => { setZipFile(null); if (zipInputRef.current) zipInputRef.current.value = ""; }}
                      className="shadow-[4px_4px_0px_0px_var(--shadow-color)]"
                    >
                      Clear
                    </CTAButton>
                  </div>
                ) : (
                  <CTAButton
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    variant="ghost"
                    className="shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:shadow-[6px_6px_0px_0px_var(--shadow-color)]"
                  >
                    Choose ZIP
                  </CTAButton>
                )}
              </div>
            )}
            {activeTab === "container" && (
              <div className="flex-grow flex flex-col items-center justify-center p-12 bg-background-base" style={{ minHeight: '480px' }}>
                <div className="w-full max-w-md flex flex-col gap-6">
                  <div>
                    <label className="block font-space uppercase mb-4 text-xl text-ink-text">Docker image</label>
                    <input
                      value={containerTag}
                      onChange={(e) => setContainerTag(e.target.value)}
                      className="w-full border-4 border-ink-border bg-background-panel p-4 text-ink-text text-lg font-mono shadow-[6px_6px_0px_0px_var(--color-shadow)] focus:shadow-[8px_8px_0px_0px_var(--color-brand-magenta)] transition-all outline-none focus:-translate-y-1 focus:-translate-x-1"
                      placeholder="e.g. nginx:alpine"
                    />
                  </div>
                  <div>
                    <label className="block font-space uppercase mb-2 text-sm text-ink-text opacity-80">Container listen port</label>
                    <p className="text-xs opacity-60 mb-2 font-outfit">
                      Must match the port your process listens on inside the image (e.g. 80 for nginx, 3000 for many Node apps). We map a host port to this container port.
                    </p>
                    <input
                      value={containerExposePort}
                      onChange={(e) => setContainerExposePort(e.target.value)}
                      className="w-full border-4 border-ink-border bg-background-panel p-3 text-ink-text font-mono shadow-[4px_4px_0px_0px_var(--color-shadow)] outline-none"
                      inputMode="numeric"
                      placeholder="8080"
                    />
                  </div>
                </div>
              </div>
            )}
          </PanelCard>
        </div>

        <div className="flex flex-col gap-6">
          <PanelCard bgColor="magenta" showDots={true}>
            <h3 className="text-2xl mb-5 font-space border-b-4 border-black/20 pb-4 text-ink-text">DEPLOYMENT SYSTEM</h3>
            <ul className="flex flex-col gap-3 font-bold font-outfit text-ink-text">
              {[
                { label: 'Runtime', val: activeTab === 'snippet' ? 'Node (vm handler)' : activeTab === 'container' ? 'Docker' : 'Node (ZIP + npm install)' },
                { label: 'Endpoint', val: 'This app /api/run/…' },
                { label: 'Env', val: 'Deployment-scoped (see Advanced)' },
                { label: 'Source', val: gitImportedFrom ? 'GitHub Import' : activeTab === 'container' ? 'Registry' : activeTab === 'function' ? 'ZIP Upload' : 'Editor' },
              ].map(({ label, val }) => (
                <li key={label} className="flex justify-between items-center border-b-2 border-black/10 pb-2 text-sm">
                  <span className="opacity-70">{label}</span>
                  <span className="bg-white px-2 py-0.5 text-black border-2 border-black text-xs font-space">{val}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CTAButton
                type="button"
                onClick={handleZap}
                disabled={isDeploying || isFetching}
                variant="primary"
                className="w-full text-lg text-[var(--ink-text)]"
              >
                {deployBtnLabel()}
              </CTAButton>
            </div>
          </PanelCard>

          <PanelCard bgColor="base" className="gap-5">
            <h3 className="text-lg font-space uppercase border-b-4 border-ink-border pb-2">Advanced Config</h3>

            <div>
              <label className="flex mt-[10px] items-center gap-2 font-space uppercase text-xs font-bold mb-2">
                <GitBranch className="w-4 h-4" />
                Github Repo
                <span className="opacity-40 font-outfit normal-case">(public only)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={githubRepo}
                  onChange={e => { setGithubRepo(e.target.value); setGitImportedFrom(null); setGitImportError(null); }}
                  onBlur={handleGithubImport}
                  className="flex-1 border-4 border-ink-border bg-background-panel p-2 text-ink-text font-mono text-sm shadow-[4px_4px_0px_0px_var(--color-shadow)] focus:shadow-[6px_6px_0px_0px_var(--color-brand-cyan)] transition-all outline-none"
                  placeholder="owner/repo"
                  disabled={isFetching}
                />
                <button
                  type="button"
                  onClick={handleGithubImport}
                  disabled={isFetching || !githubRepo.trim()}
                  className="border-4 border-ink-border bg-brand-cyan text-black px-3 shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-[6px_6px_0px_0px_var(--color-shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-space text-xs uppercase disabled:opacity-40"
                  title="Import code from GitHub"
                >
                  {isFetching ? '...' : 'PULL'}
                </button>
              </div>
            </div>

            <div>
              <label className="font-space mt-[10px] uppercase text-xs font-bold mb-2 block">Env file (.env)</label>
              <p className="text-xs opacity-60 mb-2 font-outfit">
                Parsed on the server (dotenv). Manual key/value rows below override duplicate keys.
              </p>
              <input
                ref={envInputRef}
                type="file"
                accept=".env,text/plain"
                className="hidden"
                onChange={(e) => setEnvFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex gap-2 flex-wrap">
                <CTAButton
                  type="button"
                  variant="secondary"
                  className="text-sm py-2 px-4"
                  onClick={() => envInputRef.current?.click()}
                >
                  {envFile ? envFile.name : "Upload .env"}
                </CTAButton>
                {envFile && (
                  <button
                    type="button"
                    onClick={() => { setEnvFile(null); if (envInputRef.current) envInputRef.current.value = ""; }}
                    className="font-space text-xs uppercase border-2 border-ink-border px-2"
                  >
                    Clear file
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="flex justify-between items-center font-space uppercase text-xs mt-[10px] font-bold mb-2">
                <span>Env Variables</span>
                <button
                  type="button"
                  onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}
                  className="text-brand-magenta hover:bg-brand-magenta hover:text-black px-2 py-0.5 border-2 border-transparent hover:border-black transition-all font-bold text-sm"
                >
                  + ADD
                </button>
              </label>
              <div className="flex flex-col gap-2">
                {envVars.map((env, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      value={env.key}
                      onChange={e => updateEnvVar(i, 'key', e.target.value)}
                      placeholder="KEY"
                      className="w-[38%] border-4 border-ink-border bg-background-panel p-2 font-mono text-xs shadow-[3px_3px_0px_0px_var(--color-shadow)] outline-none focus:bg-[var(--yellow-tint)] text-ink-text transition-all"
                    />
                    <input
                      value={env.value}
                      onChange={e => updateEnvVar(i, 'value', e.target.value)}
                      placeholder="VALUE"
                      type="text"
                      className="flex-1 border-4 border-ink-border bg-background-panel p-2 font-mono text-xs shadow-[3px_3px_0px_0px_var(--color-shadow)] outline-none text-ink-text"
                    />
                    <button
                      type="button"
                      onClick={() => removeEnvVar(i)}
                      className="border-4 border-ink-border bg-background-panel px-2 text-brand-error hover:bg-brand-error hover:text-black transition-all shadow-[3px_3px_0px_0px_var(--color-shadow)] font-bold"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </PanelCard>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backgroundColor: 'var(--bg-overlay)',
              backgroundImage: 'radial-gradient(var(--ink-border) 12%, transparent 12%)',
              backgroundSize: '14px 14px',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className="bg-background-panel border-4 border-ink-border p-8 md:p-12 max-w-lg w-full shadow-[16px_16px_0px_0px_var(--color-shadow)] relative halftone-bg"
            >
              <div className="absolute inset-0 paper-texture pointer-events-none opacity-20" />
              <div className="relative z-10">
                <h2
                  className="text-5xl md:text-6xl font-space text-brand-success mb-3 italic"
                  style={{ WebkitTextStroke: "1.5px var(--ink-border)" }}
                >
                  BOOM! 💥
                </h2>
                <p className="text-xl font-bold mb-4 text-ink-text uppercase">
                  Gadget successfully Zapped into reality.
                </p>
                {deployedPublicUrl && (
                  <div className="bg-black/5 dark:bg-white/5 border-2 border-dashed border-ink-border/30 p-3 mb-8 rounded-sm">
                    <p className="text-xs font-space uppercase opacity-50 mb-1">Public Endpoint</p>
                    <a
                      href={deployedPublicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-mono break-all text-brand-magenta font-bold hover:underline"
                    >
                      {deployedPublicUrl}
                    </a>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <CTAButton variant="secondary" onClick={() => setShowModal(false)} className="px-8">
                    STAY HERE
                  </CTAButton>
                  <CTAButton variant="primary" onClick={() => router.push(`/dashboard/${deployedId}`)} className="px-8 bg-brand-yellow text-black font-bold">
                    ENTER THE LAIR →
                  </CTAButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
