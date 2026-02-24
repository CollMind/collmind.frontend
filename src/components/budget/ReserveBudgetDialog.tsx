import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReserveBudget } from '@/services/budget.service';
import { BudgetEnvelope } from '@/types/budget.types';

interface ReserveBudgetDialogProps {
  envelope: BudgetEnvelope;
  isOpen: boolean;
  onClose: () => void;
}

export function ReserveBudgetDialog({
  envelope,
  isOpen,
  onClose,
}: ReserveBudgetDialogProps) {
  const [amount, setAmount] = useState('');
  const [agreementId, setAgreementId] = useState('');
  const reserveBudget = useReserveBudget();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    if (!agreementId.trim()) {
      return;
    }

    if (amountNum > envelope.availableAmount) {
      // Error will be handled by the hook
      return;
    }

    await reserveBudget.mutateAsync({
      envelopeId: envelope.id,
      agreementId: agreementId.trim(),
      amount: amountNum,
      currency: envelope.currency,
    });

    onClose();
    setAmount('');
    setAgreementId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Budget Rezerve Et</DialogTitle>
          <DialogDescription>
            {envelope.name} - Kalan: {envelope.availableAmount.toLocaleString('tr-TR')}{' '}
            {envelope.currency}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="agreementId">Anlaşma ID *</Label>
            <Input
              id="agreementId"
              value={agreementId}
              onChange={(e) => setAgreementId(e.target.value)}
              placeholder="Anlaşma ID'sini girin"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Tutar *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={envelope.availableAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maksimum: {envelope.availableAmount.toLocaleString('tr-TR')} {envelope.currency}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={
                reserveBudget.isPending ||
                !amount ||
                !agreementId.trim() ||
                parseFloat(amount) <= 0
              }
            >
              {reserveBudget.isPending ? 'Rezerve Ediliyor...' : 'Rezerve Et'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


