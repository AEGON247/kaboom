'use client';
import Link from 'next/link'
import { Zap, Moon, Sun } from 'lucide-react'
import * as React from 'react'

export function ComicHeader() {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === 'dark') {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  }

  return (
    <nav className="flex items-center justify-between border-b-4 border-[var(--ink-border)] h-20 bg-[var(--bg-panel)] sticky top-0 z-50">
      <div className="px-8 font-space text-3xl flex items-center gap-2 m-0 whitespace-nowrap tracking-tighter">
        <Zap className="fill-[var(--brand-yellow)] text-[var(--ink-border)] w-8 h-8" strokeWidth={3} />
        KABOOM!
      </div>
      <div className="flex h-full flex-grow justify-end overflow-x-auto items-center">
        <Link href="/" className="flex items-center px-4 md:px-8 border-l-4 border-l-[var(--ink-border)] h-full text-inherit uppercase font-space font-bold transition-all hover:bg-brand-cyan hover:text-black whitespace-nowrap">
          Workbench
        </Link>
        <Link href="/dashboard" className="flex items-center px-4 md:px-8 border-l-4 border-l-[var(--ink-border)] h-full text-inherit uppercase font-space font-bold transition-all hover:bg-brand-cyan hover:text-black whitespace-nowrap">
          Lair
        </Link>
        <div className="flex items-center justify-center px-4 md:px-8 border-l-4 border-l-[var(--ink-border)] h-full">
          <button 
            onClick={toggleTheme}
            className="p-2 border-2 border-[var(--ink-border)] bg-[var(--bg-base)] shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all text-[var(--ink-text)]"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </nav>
  )
}
