import { cn } from '@/lib/utils';

const BADGE_TONE_CLASSES = {
  sta: 'bg-emerald-100 text-emerald-800',
  lta: 'bg-indigo-100 text-indigo-800',
  approval: 'bg-amber-100 text-amber-800',
  submitted: 'bg-indigo-100 text-indigo-800',
  invoice: 'bg-red-100 text-red-700',
  claim: 'bg-blue-100 text-blue-800',
  success: 'bg-emerald-100 text-emerald-800',
  neutral: 'bg-gray-100 text-gray-700',
} as const;

type BadgeTone = keyof typeof BADGE_TONE_CLASSES;

export function AgreementTypeBadge({ type }: { type: string }) {
  const normalized = type === 'LTA' ? 'lta' : 'sta';
  const toneClass = BADGE_TONE_CLASSES[normalized];
  const icon = normalized === 'sta' ? '◔' : '▭';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
        toneClass
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {type}
    </span>
  );
}

export function StatusBadge({ text, tone }: { text: string; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium',
        BADGE_TONE_CLASSES[tone]
      )}
    >
      {text}
    </span>
  );
}

export function StepDot({ value }: { value: string }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
      {value}
    </span>
  );
}
