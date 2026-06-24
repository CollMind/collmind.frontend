import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PeriodSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}

export function PeriodSelect({ value, onValueChange, options }: PeriodSelectProps) {
  if (options.length === 0) {
    return (
      <span className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-gray-800">
        {value || '—'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Donem</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Donem sec" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
