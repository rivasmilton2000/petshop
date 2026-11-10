export function ServiceIcon({ kind }: { kind: 'store' | 'delivery' | 'subscription' }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === 'store' ? <><path d="M12 27v28h40V27M8 27l6-17h36l6 17M8 27c0 9 12 9 12 0 0 9 12 9 12 0 0 9 12 9 12 0 0 9 12 9 12 0H8ZM26 55V39h12v16M22 10l-2 17M42 10l2 17M32 10v17" /></> : kind === 'delivery' ? <><path d="M6 14h32v33H6V14ZM38 26h11l9 12v9H38M44 26v12h14M11 25h17M11 33h11" /><circle cx="18" cy="48" r="6" /><circle cx="48" cy="48" r="6" /></> : <><path d="M18 25 32 18l14 7v17l-14 7-14-7V25ZM18 25l14 7 14-7M32 32v17M10 25a23 23 0 0 1 40-11M50 6v8H40M54 39a23 23 0 0 1-40 11M14 58v-8h10" /></>}
  </svg>;
}
