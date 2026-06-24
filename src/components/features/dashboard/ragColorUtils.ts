/** Budget status renk yardımcıları — backend'den gelen status string'ini render eder, hesap yapılmaz */
export function ragStatusClass(status: 'GREEN' | 'AMBER' | 'RED'): string {
  if (status === 'GREEN') return 'bg-emerald-500';
  if (status === 'AMBER') return 'bg-amber-400';
  return 'bg-red-500';
}

export function ragTextClass(status: 'GREEN' | 'AMBER' | 'RED'): string {
  if (status === 'GREEN') return 'text-emerald-700';
  if (status === 'AMBER') return 'text-amber-700';
  return 'text-red-700';
}
