export function Motif({ kind = 'paw', className = '' }: { kind?: 'paw' | 'bone' | 'heart'; className?: string }) {
  return <svg className={`motif ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    {kind === 'paw' ? <g fill="currentColor"><ellipse cx="17" cy="20" rx="7" ry="10" transform="rotate(-25 17 20)" /><ellipse cx="32" cy="14" rx="7" ry="10" /><ellipse cx="47" cy="20" rx="7" ry="10" transform="rotate(25 47 20)" /><ellipse cx="10" cy="35" rx="6" ry="8" transform="rotate(-30 10 35)" /><path d="M18 42c3-7 8-12 14-12s11 5 14 12c9 18-6 16-14 12-8 4-23 6-14-12Z" /></g> : kind === 'bone' ? <path d="M20 24h24c0-14 19-14 17-2 0 5-4 8-7 10 3 2 7 5 7 10 2 12-17 12-17-2H20C20 54 1 54 3 42c0-5 4-8 7-10-3-2-7-5-7-10C1 10 20 10 20 24Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /> : <path d="M32 54 9 31C-8 10 20-3 32 17 44-3 72 10 55 31L32 54Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />}
  </svg>;
}
