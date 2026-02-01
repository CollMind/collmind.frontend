import React from 'react';
import { BudgetEnvelope, BudgetEnvelopeStatus } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BudgetEnvelopeCardProps {
  envelope: BudgetEnvelope;
  onClick?: () => void;
}

const getStatusColor = (status: BudgetEnvelopeStatus): string => {
  const colors: Record<BudgetEnvelopeStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: BudgetEnvelopeStatus): string => {
  const labels: Record<BudgetEnvelopeStatus, string> = {
    DRAFT: 'Taslak',
    ACTIVE: 'Aktif',
    CLOSED: 'Kapatıldı',
    ARCHIVED: 'Arşivlendi',
  };
  return labels[status] || status;
};

export function BudgetEnvelopeCard({ envelope, onClick }: BudgetEnvelopeCardProps) {
  const consumptionPercent = envelope.allocatedAmount > 0
    ? (envelope.consumedAmount / envelope.allocatedAmount) * 100
    : 0;

  const isNearLimit = consumptionPercent >= 80;
  const isOverLimit = consumptionPercent >= 100;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isOverLimit ? 'border-red-300' : isNearLimit ? 'border-yellow-300' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{envelope.name}</CardTitle>
          <Badge className={getStatusColor(envelope.status)}>
            {getStatusLabel(envelope.status)}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">{envelope.code}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Kullanım</span>
              <span className="font-medium">
                {consumptionPercent.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={consumptionPercent}
              className={isOverLimit ? 'bg-red-200' : isNearLimit ? 'bg-yellow-200' : ''}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Ayrılan</p>
              <p className="font-semibold">
                {envelope.allocatedAmount.toLocaleString('tr-TR')} {envelope.currency}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Kullanılan</p>
              <p className="font-semibold">
                {envelope.consumedAmount.toLocaleString('tr-TR')} {envelope.currency}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Kalan</p>
              <p className={`font-semibold ${envelope.availableAmount < 0 ? 'text-red-600' : ''}`}>
                {envelope.availableAmount.toLocaleString('tr-TR')} {envelope.currency}
              </p>
            </div>
          </div>

          {envelope.budgetOwnerName && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Sorumlu:</span> {envelope.budgetOwnerName}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


