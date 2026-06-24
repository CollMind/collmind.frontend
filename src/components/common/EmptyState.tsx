import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export function EmptyState({
  message = 'No data found',
  description,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileQuestion className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-md">{description}</p>
      )}
    </div>
  );
}
