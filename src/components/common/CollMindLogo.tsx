import { cn } from '@/lib/utils';

interface CollMindLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CollMindLogo({
  className,
  showText = true,
  size = 'md',
}: CollMindLogoProps) {
  const sizeClasses = {
    sm: {
      circleSize: 20,
      text: 'text-lg',
      container: 'space-x-2',
    },
    md: {
      circleSize: 28,
      text: 'text-xl',
      container: 'space-x-3',
    },
    lg: {
      circleSize: 36,
      text: 'text-2xl',
      container: 'space-x-3',
    },
  };

  const currentSize = sizeClasses[size];
  const overlap = currentSize.circleSize * 0.4; // 40% overlap
  const totalWidth = currentSize.circleSize + overlap * 2;

  return (
    <div className={cn('flex items-center', currentSize.container, className)}>
      {/* Three overlapping circles using SVG for better rendering */}
      <svg
        width={totalWidth}
        height={currentSize.circleSize}
        viewBox={`0 0 ${totalWidth} ${currentSize.circleSize}`}
        className="flex-shrink-0"
      >
        {/* Left circle - dark blue */}
        <circle
          cx={currentSize.circleSize / 2}
          cy={currentSize.circleSize / 2}
          r={currentSize.circleSize / 2}
          fill="#1e40af"
        />
        {/* Middle circle - medium blue */}
        <circle
          cx={currentSize.circleSize / 2 + overlap}
          cy={currentSize.circleSize / 2}
          r={currentSize.circleSize / 2}
          fill="#2563eb"
        />
        {/* Right circle - light blue/cyan */}
        <circle
          cx={currentSize.circleSize / 2 + overlap * 2}
          cy={currentSize.circleSize / 2}
          r={currentSize.circleSize / 2}
          fill="#60a5fa"
        />
      </svg>

      {/* CollMind text */}
      {showText && (
        <span
          className={cn(
            'font-sans font-semibold tracking-tight',
            currentSize.text,
            'text-gray-900 dark:text-white'
          )}
        >
          CollMind
        </span>
      )}
    </div>
  );
}
