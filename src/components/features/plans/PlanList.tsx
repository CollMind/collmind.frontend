import { Plan } from '@/api/endpoints/plans.endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toNumberOrZero } from '@/utils/numberUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Edit, Copy, Trash2, Calendar } from 'lucide-react';

interface PlanListProps {
  plans: Plan[];
  onPlanClick: (plan: Plan) => void;
  onEdit?: (plan: Plan) => void;
  onCopy?: (plan: Plan) => void;
  onDelete?: (plan: Plan) => void;
}

const getStatusBadge = (status: Plan['status']) => {
  const statusMap: Record<string, { text: string; className: string }> = {
    DRAFT: { text: 'TASLAK', className: 'bg-gray-100 text-gray-800' },
    PENDING_APPROVAL: {
      text: 'ONAY BEKLEYEN',
      className: 'bg-orange-100 text-orange-800',
    },
    APPROVED: { text: 'ONAYLANDI', className: 'bg-blue-100 text-blue-800' },
    REJECTED: { text: 'REDDEDİLDİ', className: 'bg-red-100 text-red-800' },
  };

  const statusInfo = statusMap[status] || {
    text: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}
    >
      {statusInfo.text}
    </span>
  );
};

const getRagStatus = (ragStatus?: string) => {
  if (!ragStatus) return null;

  if (ragStatus === 'RED') {
    return <span className="text-red-600 font-medium">• KRİTİK</span>;
  }
  if (ragStatus === 'GREEN') {
    return <span className="text-green-600 font-medium">• İYİ</span>;
  }
  if (ragStatus === 'AMBER') {
    return <span className="text-yellow-600 font-medium">• RİSKLİ</span>;
  }
  return null;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPeriod = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 'N/A';

  const start = new Date(startDate);

  // Q1-2026 formatı
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  let quarter = 'Q1';
  if (month >= 4 && month <= 6) quarter = 'Q2';
  else if (month >= 7 && month <= 9) quarter = 'Q3';
  else if (month >= 10) quarter = 'Q4';

  return `${quarter}-${year}`;
};

export function PlanList({
  plans,
  onPlanClick,
  onEdit,
  onCopy,
  onDelete,
}: PlanListProps) {
  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">Henüz plan bulunmuyor.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>PLAN ADI</TableHead>
                <TableHead>CPL / KANAL</TableHead>
                <TableHead>KATEGORİ</TableHead>
                <TableHead>DÖNEM</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">GP ROI</TableHead>
                <TableHead className="text-right">SPEND</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead className="text-center w-[120px]">AKSİYON</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">
                    {plan.planCode}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onPlanClick(plan)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                    >
                      {plan.planName}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {plan.cpl?.name || 'N/A'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {plan.channel?.name || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {plan.category?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      {formatPeriod(plan.startDate, plan.endDate)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell className="text-right text-sm">
                    {plan.overallRoi !== null && plan.overallRoi !== undefined
                      ? `${plan.overallRoi.toFixed(1)}%`
                      : '0.0%'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(toNumberOrZero(plan.totalSpend))}
                  </TableCell>
                  <TableCell>{getRagStatus(plan.ragStatus)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onPlanClick(plan)}
                        title="Görüntüle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {plan.status === 'DRAFT' && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEdit(plan)}
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onCopy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onCopy(plan)}
                          title="Kopyala"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {plan.status === 'DRAFT' && onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(plan)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
