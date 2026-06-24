import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  isLoading?: boolean;
  /** Eğer true ise, onay dialog'unda not alanı gösterilir */
  showNote?: boolean;
  notePlaceholder?: string;
  noteLabel?: string;
  /** İkon veya özel başlık bileşeni */
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  variant = 'default',
  isLoading = false,
  showNote = false,
  notePlaceholder = 'Not ekleyin...',
  noteLabel = 'Not',
  icon,
}: ConfirmDialogProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNote('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(showNote ? note : undefined);
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const getIconBgClass = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-100';
      case 'warning':
        return 'bg-amber-100';
      default:
        return 'bg-blue-100';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={`w-10 h-10 rounded-full ${getIconBgClass()} flex items-center justify-center flex-shrink-0`}
              >
                {icon}
              </div>
            )}
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-sm text-gray-500">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {showNote && (
          <div className="py-2">
            <Label htmlFor="confirm-note">{noteLabel}</Label>
            <Textarea
              id="confirm-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={getConfirmButtonClass()}
          >
            {isLoading ? 'İşleniyor...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
