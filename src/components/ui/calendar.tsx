import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DayPickerProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export interface CalendarProps extends Omit<DayPickerProps, 'selected' | 'onSelect'> {
  selected?: { from?: Date; to?: Date } | Date | undefined;
  onSelect?: (range: { from?: Date; to?: Date } | undefined) => void;
  mode?: 'single' | 'range';
  numberOfMonths?: number;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  mode = 'range',
  numberOfMonths = 1,
  ...props
}: CalendarProps) {
  // Convert our custom format to react-day-picker v9 format
  const selectedValue = React.useMemo(() => {
    if (!selected) return undefined;
    
    if (mode === 'range') {
      if (selected && 'from' in selected) {
        return selected.from && selected.to
          ? { from: selected.from, to: selected.to }
          : selected.from
            ? { from: selected.from, to: undefined }
            : undefined;
      }
      return undefined;
    } else {
      // Single mode
      if (selected instanceof Date) {
        return selected;
      }
      if (selected && 'from' in selected && selected.from) {
        return selected.from;
      }
      return undefined;
    }
  }, [selected, mode]);

  const handleSelect = (range: { from?: Date; to?: Date } | Date | undefined) => {
    if (!onSelect) return;

    if (mode === 'range') {
      if (range && typeof range === 'object' && 'from' in range) {
        onSelect(range);
      } else if (range instanceof Date) {
        onSelect({ from: range, to: undefined });
      } else {
        onSelect(undefined);
      }
    } else {
      // Single mode
      if (range instanceof Date) {
        onSelect({ from: range, to: range });
      } else {
        onSelect(undefined);
      }
    }
  };

  const commonProps = {
    numberOfMonths,
    showOutsideDays,
    selected: selectedValue,
    onSelect: handleSelect,
    className: cn('p-3', className),
    classNames: {
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-gray-900 text-gray-50 hover:bg-gray-900 hover:text-gray-50 focus:bg-gray-900 focus:text-gray-50',
        day_today: 'bg-gray-100 text-gray-900',
        day_outside:
          'day-outside text-gray-500 opacity-50 aria-selected:bg-gray-100/50 aria-selected:text-gray-500 aria-selected:opacity-30',
        day_disabled: 'text-gray-500 opacity-50',
        day_range_middle:
          'aria-selected:bg-gray-100 aria-selected:text-gray-900',
        day_hidden: 'invisible',
        ...classNames,
    },
    components: {
      Chevron: (props: { orientation?: 'left' | 'right' | 'up' | 'down' }) => {
        if (props.orientation === 'left') {
          return <ChevronLeft className="h-4 w-4" />;
        }
        return <ChevronRight className="h-4 w-4" />;
      },
    },
  };

  return mode === 'range' ? (
    <DayPicker mode="range" {...(commonProps as any)} />
  ) : (
    <DayPicker mode="single" {...(commonProps as any)} />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
